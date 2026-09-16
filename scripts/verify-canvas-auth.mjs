// Integration checks against a production build and a local Supabase stub.
// Does not call Cloudflare or use real credentials. SQL concurrency is verified separately after setup.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

let reserves = 0;
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com', email_confirmed_at: '2026-01-01' };
const mock = createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== 'Bearer test-session') { res.statusCode = 401; res.end('{}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (req.url.startsWith('/auth/v1/token')) {
    if (body.password !== 'test-password') { res.statusCode = 400; res.end('{}'); return; }
    res.end(JSON.stringify({ access_token: 'test-session', expires_in: 3600, user })); return;
  }
  if (req.url === '/auth/v1/signup') { res.end('{}'); return; }
  if (req.url === '/rest/v1/rpc/canvas_quota') {
    assert.equal(req.headers.apikey, 'test-service');
    assert.equal(body.p_user_limit, 3); assert.equal(body.p_global_limit, 30);
    if (body.p_reserve) reserves++;
    res.end(JSON.stringify({ allowed: !body.p_reserve, reason: body.p_reserve ? 'user' : '', remaining: 0, globalRemaining: 25, userLimit: 3, globalLimit: 30, resetsAt: '2026-01-02' })); return;
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(resolve => mock.listen(3099, '127.0.0.1', resolve));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
  env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:3099', SUPABASE_ANON_KEY: 'test-public', SUPABASE_SERVICE_ROLE_KEY: 'test-service', CLOUDFLARE_ACCOUNT_ID: 'test', CLOUDFLARE_API_TOKEN: 'test', IMAGE_CANVAS_USER_DAILY_LIMIT: '3', IMAGE_CANVAS_GLOBAL_DAILY_LIMIT: '30' }, stdio: 'pipe',
});
let logs = ''; child.stdout.on('data', b => logs += b); child.stderr.on('data', b => logs += b);
const base = 'http://127.0.0.1:3100';
const post = (path, body, cookie = '', origin = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: JSON.stringify(body) });
try {
  let ready = false;
  for (let i=0;i<80;i++) { try { await fetch(base); ready = true; break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  assert.ok(ready, logs);
  const unauth = await post('/api/image-canvas', { prompt: 'cat' }); assert.equal(unauth.status, 401); assert.equal(reserves, 0);
  const cross = await post('/api/canvas-auth', { action: 'login' }, '', 'https://other.example'); assert.equal(cross.status, 403);
  const invalid = await post('/api/canvas-auth', { action: 'login', email: user.email, password: 'bad-password' }); assert.equal(invalid.status, 400);
  const signup = await post('/api/canvas-auth', { action: 'signup', email: user.email, password: 'test-password' }); assert.equal(signup.status, 200); assert.equal(signup.headers.get('set-cookie'), null);
  const login = await post('/api/canvas-auth', { action: 'login', email: user.email, password: 'test-password' }); assert.equal(login.status, 200);
  const cookieHeader = login.headers.get('set-cookie'); assert.match(cookieHeader, /HttpOnly/i); assert.match(cookieHeader, /SameSite=strict/i); assert.match(cookieHeader, /Secure/i);
  const cookie = cookieHeader.split(';')[0];
  const session = await fetch(base + '/api/canvas-auth', { headers: { Cookie: cookie } }); assert.equal((await session.json()).user.email, user.email);
  const empty = await post('/api/image-canvas', { prompt: '' }, cookie); assert.equal(empty.status, 400); assert.equal(reserves, 0);
  const exhausted = await post('/api/image-canvas', { prompt: 'cat' }, cookie); assert.equal(exhausted.status, 429); assert.equal((await exhausted.json()).quota.remaining, 0); assert.equal(reserves, 1);
  const logout = await post('/api/canvas-auth', { action: 'logout' }, cookie); assert.match(logout.headers.get('set-cookie'), /Max-Age=0/i);
  console.log('PASS: login, signup confirmation, session cookie, logout, origin checks, anonymous blocking, validation, and quota blocking. No image-provider calls.');
} finally { child.kill(); await new Promise(resolve => mock.close(resolve)); }
