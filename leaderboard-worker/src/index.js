const encoder=new TextEncoder();
const MAX_AGE_SECONDS=24*60*60;
const MIN_MATCH_SECONDS=5;
const MAX_MATCH_SECONDS=60*60;
const START_COOLDOWN_SECONDS=8;

function json(data,status=200,headers={}){
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}
async function hmac(key,message){
 const cryptoKey=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return new Uint8Array(await crypto.subtle.sign("HMAC",cryptoKey,encoder.encode(message)));
}
function hex(bytes){return Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("");}
function safeName(user){
 const first=typeof user.first_name==="string"?user.first_name:"";
 const last=typeof user.last_name==="string"?user.last_name:"";
 // Avoid displaying public Telegram handles or complete surnames on the ranking.
 const combined=[first,last.trim()?last.trim()[0]+".":""].filter(Boolean).join(" ")
  .replace(/[\u0000-\u001f\u007f-\u009f<>]/g,"").trim().slice(0,40);
 return combined||"Telegram player";
}

/** Always validate raw Telegram initData against the server-only bot secret. */
export async function validateTelegramInitData(raw,botToken,now=Math.floor(Date.now()/1000)){
 if(typeof raw!=="string"||!raw||raw.length>8192||typeof botToken!=="string"||!botToken)return null;
 const params=new URLSearchParams(raw);
 const seen=new Set();
 for(const [key] of params){if(seen.has(key))return null;seen.add(key);}
 const signature=params.get("hash");
 if(!signature||!/^[a-fA-F0-9]{64}$/.test(signature))return null;
 const authDate=Number(params.get("auth_date"));
 if(!Number.isSafeInteger(authDate)||authDate>now+60||authDate<now-MAX_AGE_SECONDS)return null;
 const dataCheck=[...params.entries()].filter(([key])=>key!=="hash"&&key!=="signature")
  .sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>key+"="+value).join("\n");
 const secret=await hmac(encoder.encode("WebAppData"),botToken);
 const expected=hex(await hmac(secret,dataCheck));
 // Same-length comparison without an early-exit on a different byte.
 let mismatch=0;
 for(let i=0;i<64;i++)mismatch|=expected.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);
 if(mismatch!==0)return null;
 let user;
 try{user=JSON.parse(params.get("user")??"null");}catch{return null;}
 if(!user||typeof user!=="object"||!Number.isSafeInteger(user.id)||user.id<=0||user.is_bot===true)return null;
 return{id:String(user.id),displayName:safeName(user)};
}
async function readPayload(request){
 const size=Number(request.headers.get("Content-Length")??0);
 if(size>1024)return null;
 let text;
 try{text=await request.text();}catch{return null;}
 if(text.length>1024)return null;
 try{return JSON.parse(text);}catch{return null;}
}
async function upsertPlayer(db,user,now){
 await db.prepare("INSERT INTO players (id,display_name,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at")
  .bind(user.id,user.displayName,now).run();
}
async function playerSummary(db,user){
 const current=await db.prepare("SELECT COUNT(*) AS wins FROM matches WHERE player_id=? AND outcome='win' AND finished_at IS NOT NULL").bind(user.id).first();
 return{id:user.id,displayName:user.displayName,wins:Number(current?.wins??0)};
}
async function leaderboard(db){
 const {results}=await db.prepare("SELECT p.id,p.display_name AS displayName,COUNT(m.id) AS wins FROM players p LEFT JOIN matches m ON m.player_id=p.id AND m.outcome='win' AND m.finished_at IS NOT NULL GROUP BY p.id ORDER BY wins DESC,p.updated_at ASC,p.id ASC LIMIT 20").all();
 return results.map((entry,index)=>({rank:index+1,displayName:entry.displayName,wins:Number(entry.wins),isUserId:entry.id}));
}
export async function handleRequest(request,env,now=Math.floor(Date.now()/1000)){
 const url=new URL(request.url);
 const origin=request.headers.get("Origin");
 const allowed=env.ALLOWED_ORIGIN??"https://abolfazl260.github.io";
 const cors={"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"};
 if(origin&&origin!==allowed)return json({error:"Forbidden origin"},403);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 const respond=(body,status=200)=>json(body,status,cors);
 if(url.pathname==="/health"&&request.method==="GET")return respond({ok:true,service:"telegram-leaderboard"});
 if(!url.pathname.startsWith("/api/"))return respond({error:"Not found"},404);
 if(!env.DB||!env.TELEGRAM_BOT_TOKEN)return respond({error:"Service not configured"},503);
 const authorization=request.headers.get("Authorization")??"";
 if(!authorization.startsWith("tma "))return respond({error:"Telegram authorization required"},401);
 const user=await validateTelegramInitData(authorization.slice(4),env.TELEGRAM_BOT_TOKEN,now);
 if(!user)return respond({error:"Invalid or expired Telegram authorization"},401);
 if(request.method==="GET"&&(url.pathname==="/api/me"||url.pathname==="/api/leaderboard")){
  if(url.pathname==="/api/me"){
   await upsertPlayer(env.DB,user,now);
   return respond({ok:true,player:await playerSummary(env.DB,user)});
  }
  const rows=await leaderboard(env.DB);
  return respond({ok:true,leaders:rows.map(({isUserId,...rest})=>rest),
   me:await playerSummary(env.DB,user),myRank:rows.findIndex(row=>row.isUserId===user.id)+1||null});
 }
 if(request.method==="POST"&&url.pathname==="/api/matches/start"){
  await upsertPlayer(env.DB,user,now);
  const recent=await env.DB.prepare("SELECT started_at FROM matches WHERE player_id=? ORDER BY started_at DESC LIMIT 1").bind(user.id).first();
  if(recent&&now-Number(recent.started_at)<START_COOLDOWN_SECONDS)return respond({error:"Wait before starting another ranked match"},429);
  const matchId=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO matches(id,player_id,started_at,outcome) VALUES(?,?,?,'pending')").bind(matchId,user.id,now).run();
  return respond({ok:true,matchId,minimumSeconds:MIN_MATCH_SECONDS});
 }
 if(request.method==="POST"&&url.pathname==="/api/matches/finish"){
  const payload=await readPayload(request);
  const matchId=payload?.matchId,outcome=payload?.outcome;
  if(typeof matchId!=="string"||!/^[a-f0-9-]{36}$/i.test(matchId)||!["win","loss","draw"].includes(outcome))
   return respond({error:"Invalid match result"},400);
  const update=await env.DB.prepare("UPDATE matches SET outcome=?,finished_at=? WHERE id=? AND player_id=? AND finished_at IS NULL AND started_at<=? AND started_at>=?")
   .bind(outcome,now,matchId,user.id,now-MIN_MATCH_SECONDS,now-MAX_MATCH_SECONDS).run();
  if(update.meta.changes!==1)return respond({error:"Result already recorded or match outside valid time window"},409);
  return respond({ok:true,player:await playerSummary(env.DB,user)});
 }
 return respond({error:"Not found"},404);
}
export default {fetch(request,env){return handleRequest(request,env);}};
