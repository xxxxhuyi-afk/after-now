import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(compile(source)).toString("base64")}`;
const streamUrl = moduleUrl(await readFile(new URL("app/api/image-canvas/batch-response.ts", root), "utf8"));
const { streamImageBatch } = await import(streamUrl);
const { readImageBatch } = await import(moduleUrl(await readFile(new URL("app/lab/image-canvas/image-batch.ts", root), "utf8")));
const routeSource = (await readFile(new URL("app/api/image-canvas/route.ts", root), "utf8"))
  .replace(/import \{ authConfig[^\n]+/, "const { authConfig, canvasQuota, getCanvasUser, sameOrigin } = globalThis.__canvasBatchTest;")
  .replace('"./batch-response"', JSON.stringify(streamUrl));
const image = "data:image/png;base64,aGVsbG8=";

for (const count of [1, 2, 3, 4]) test(`${count} providers start together and return independent streamed results`, async () => {
  let active = 0, peak = 0, calls = 0;
  const response = streamImageBatch(count, async () => { calls++; active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 15)); active--; return image; });
  const results = [];
  const summary = await readImageBatch(response, count, { onResult: (src, index) => results.push({ src, index }), onProgress: () => {} });
  assert.equal(peak, count); assert.equal(calls, count); assert.equal(summary.completed, count);
  assert.deepEqual(summary.errors, []); assert.equal(new Set(results.map(result => result.index)).size, count);
});

test("one failure does not cancel the other results", async () => {
  let calls = 0;
  const response = streamImageBatch(3, async () => { const index = calls++; if (index === 1) throw new Error("provider busy"); return image; });
  const results = [];
  const summary = await readImageBatch(response, 3, { onResult: (_, index) => results.push(index), onProgress: () => {} });
  assert.equal(summary.completed, 2); assert.equal(summary.errors.length, 1); assert.deepEqual(results.sort(), [0, 2]);
});

test("split chunks, out-of-order completion, and UTF-8 errors parse correctly", async () => {
  const raw = JSON.stringify({index:2,src:image})+'\n'+JSON.stringify({index:0,error:"额度不足"})+'\n'+JSON.stringify({index:1,src:image});
  const bytes = new TextEncoder().encode(raw);
  const body = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
  const summary = await readImageBatch(new Response(body,{headers:{'Content-Type':'application/x-ndjson'}}),3,{onResult:()=>{},onProgress:()=>{}});
  assert.equal(summary.completed,2); assert.match(summary.errors[0],/额度不足/);
});

test("incomplete batch preserves returned results", async () => {
  const summary = await readImageBatch(new Response(JSON.stringify({index:0,src:image})+'\n',{headers:{'Content-Type':'application/x-ndjson'}}),3,{onResult:()=>{},onProgress:()=>{}});
  assert.equal(summary.completed,1); assert.match(summary.errors[0],/2 张结果未返回/);
});

for (const events of [[{index:0,src:image},{index:0,src:image}], [{index:3,src:image}], [{index:0,src:'javascript:alert(1)'}]]) test(`invalid stream rejected: ${JSON.stringify(events)}`, async () => {
  await assert.rejects(readImageBatch(new Response(events.map(JSON.stringify).join('\n'),{headers:{'Content-Type':'application/x-ndjson'}}),3,{onResult:()=>{},onProgress:()=>{}}));
});

test("old server returning one binary image for count 3 is rejected", async () => {
  await assert.rejects(readImageBatch(new Response('image',{headers:{'Content-Type':'image/png'}}),3,{onResult:()=>assert.fail(),onProgress:()=>{}}),/服务器尚未更新/);
});

async function apiCase({count=3,allowed=true,user=true,failAt=-1,reserved=count,model='flux-klein'}={}) {
  const originalFetch=globalThis.fetch;
  const oldAccount=process.env.CLOUDFLARE_ACCOUNT_ID, oldToken=process.env.CLOUDFLARE_API_TOKEN, oldLocal=process.env.IMAGE_CANVAS_PROVIDER;
  process.env.CLOUDFLARE_ACCOUNT_ID='test-only';process.env.CLOUDFLARE_API_TOKEN='test-only';process.env.IMAGE_CANVAS_PROVIDER='';
  const quotaCalls=[];let active=0,peak=0,calls=0;const forms=[];
  globalThis.__canvasBatchTest={authConfig:()=>true,sameOrigin:()=>true,getCanvasUser:async()=>user?{id:'test-user'}:null,canvasQuota:async(...args)=>{quotaCalls.push(args);return{allowed,reason:'user',reserved,remaining:100-count,globalRemaining:100-count};}};
  globalThis.fetch=async(url,options)=>{assert.match(url,/^https:\/\/api.cloudflare.com/);forms.push(options.body);const index=calls++;active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,15));active--;return index===failAt?new Response('{}',{status:429}):new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}});};
  try {
    const {POST}=await import(moduleUrl(routeSource)+`#case=${Math.random()}`);
    const response=await POST(new Request('http://localhost/api/image-canvas',{method:'POST',body:JSON.stringify({prompt:'中文 test',ratio:'16:9',style:'original',model,count})}));
    let summary;
    if(response.ok&&count>1) summary=await readImageBatch(response,count,{onResult:()=>{},onProgress:()=>{}});
    else if(response.ok) assert.equal(response.headers.get('Content-Type'),'image/png');
    return{status:response.status,summary,quotaCalls,calls,peak,forms};
  } finally {
    globalThis.fetch=originalFetch;delete globalThis.__canvasBatchTest;
    for(const [key,value] of [['CLOUDFLARE_ACCOUNT_ID',oldAccount],['CLOUDFLARE_API_TOKEN',oldToken],['IMAGE_CANVAS_PROVIDER',oldLocal]]) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
}

test("actual POST reserves three credits once before three concurrent calls",async()=>{
  const result=await apiCase();assert.equal(result.status,200);assert.equal(result.summary.completed,3);assert.deepEqual(result.quotaCalls,[['test-user',true,3]]);assert.equal(result.calls,3);assert.equal(result.peak,3);assert.equal(new Set(result.forms).size,3);
});
test("actual POST maintains single-image binary compatibility",async()=>{const result=await apiCase({count:1});assert.equal(result.status,200);assert.equal(result.calls,1);});
test("actual POST retains two results when one provider fails",async()=>{const result=await apiCase({failAt:1});assert.equal(result.summary.completed,2);assert.equal(result.summary.errors.length,1);assert.equal(result.peak,3);});
test("insufficient quota starts zero providers",async()=>{const result=await apiCase({allowed:false});assert.equal(result.status,429);assert.equal(result.calls,0);});
test("missing batch reservation fails closed",async()=>{const result=await apiCase({reserved:1});assert.equal(result.status,503);assert.equal(result.calls,0);});
test("anonymous request starts zero providers",async()=>{const result=await apiCase({user:false});assert.equal(result.status,401);assert.equal(result.calls,0);});
test("invalid count is rejected before quota reservation",async()=>{const result=await apiCase({count:5});assert.equal(result.status,400);assert.equal(result.calls,0);assert.equal(result.quotaCalls.length,0);});
test("invalid model is rejected before quota reservation",async()=>{const result=await apiCase({model:'invalid'});assert.equal(result.status,400);assert.equal(result.quotaCalls.length,0);});
