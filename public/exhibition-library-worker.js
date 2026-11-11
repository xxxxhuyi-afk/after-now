/* Protect only /exhibition-library/. Other After Now features pass through unchanged. */
let session = null, manifestPromise = null;
const BASE = '/exhibition-vault/';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  const data=event.data;
  if(data?.type==='exhibition-unlock' && data.key && data.expires>Date.now()) {
    session={key:data.key,expires:Math.min(data.expires,Date.now()+8*60*60*1000)};
    event.ports[0]?.postMessage({ok:true});
  }
  if(data?.type==='exhibition-lock'){session=null;event.ports[0]?.postMessage({ok:true});}
});
function manifest(refresh=false){if(refresh||!manifestPromise){manifestPromise=fetch(BASE+'manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Vault manifest unavailable');return r.json()});}return manifestPromise;}
async function getSession(){
  if(session&&session.expires>Date.now())return session;
  session=null;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
    if(!new URL(client.url).pathname.startsWith('/lab/exhibitions'))continue;
    const result=await new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(null)},800);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};client.postMessage({type:'exhibition-request-key'},[channel.port2]);});
    if(result?.key&&result.expires>Date.now()){session=result;return session;}
  }
  return null;
}
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',webp:'image/webp',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',woff2:'font/woff2',woff:'font/woff',gz:'application/gzip'};
async function serve(request){
  const authorized=await getSession();
  if(!authorized)return request.mode==='navigate'?Response.redirect(new URL('/lab/exhibitions',self.location.origin),302):new Response('Locked',{status:401,headers:{'Cache-Control':'no-store'}});
  let relative;try{relative=decodeURIComponent(new URL(request.url).pathname).slice('/exhibition-library/'.length)||'index.html';}catch{return new Response('Invalid path',{status:400});}
  let index=await manifest(relative==='index.html'),file=index.files[relative];
  if(typeof file!=='string'){
    // The worker may have started before a new batch was published, so its
    // cached manifest does not know the new files yet. Refresh once and
    // re-check before returning 404, so newly published images load
    // without waiting for the worker to restart.
    index=await manifest(true);file=index.files[relative];
  }
  if(typeof file!=='string'||!/^([a-f0-9]{64})\.bin$/.test(file))return new Response('Not found',{status:404});
  const response=await fetch(BASE+file);if(!response.ok)return new Response('Asset unavailable',{status:502});
  const bytes=new Uint8Array(await response.arrayBuffer());
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},authorized.key,bytes.slice(12));
  return new Response(plain,{headers:{'Content-Type':mime[relative.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith('/exhibition-library/'))return;
  event.respondWith(serve(event.request).catch(()=>new Response('Unable to unlock resource',{status:503,headers:{'Cache-Control':'no-store'}})));
});
