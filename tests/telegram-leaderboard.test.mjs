import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {validateTelegramInitData,handleRequest} from "../leaderboard-worker/src/index.js";

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const TOKEN="123456:TEST_DO_NOT_USE_AS_A_REAL_TOKEN";
const NOW=1771000000;
async function sign(fields){
 const params=new URLSearchParams(fields);
 const encoder=new TextEncoder();
 const sign=async(key,text)=>{
  const imported=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",imported,encoder.encode(text)));
 };
 const key=await sign(encoder.encode("WebAppData"),TOKEN);
 const str=[...params].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n");
 const hash=await sign(key,str);
 params.set("hash",Buffer.from(hash).toString("hex"));
 return params.toString();
}
const sample=()=>({
 auth_date:String(NOW),
 user:JSON.stringify({id:123456789,first_name:"Abolfazl",last_name:"Tester",username:"do_not_show"})
});
test("valid Telegram hash yields only safe server-derived identity",async()=>{
 const raw=await sign(sample());
 const user=await validateTelegramInitData(raw,TOKEN,NOW+3);
 assert.deepEqual(user,{id:"123456789",displayName:"Abolfazl T."});
 assert.equal(user.displayName.includes("do_not_show"),false);
});
test("rejects tampering, stale, missing user, duplicate keys and wrong bot",async()=>{
 const good=await sign(sample());
 assert.equal(await validateTelegramInitData(good.replace("Abolfazl","Intruder"),TOKEN,NOW),null);
 assert.equal(await validateTelegramInitData(good,TOKEN,NOW+86401),null);
 assert.equal(await validateTelegramInitData(good,TOKEN+"changed",NOW),null);
 assert.equal(await validateTelegramInitData(good+"&user=123",TOKEN,NOW),null);
 const noUser=await sign({auth_date:String(NOW)});
 assert.equal(await validateTelegramInitData(noUser,TOKEN,NOW),null);
});
test("refuses unsigned API requests before touching DB",async()=>{
 const api="https://leaderboard.example.workers.dev/api/me";
 const env={ALLOWED_ORIGIN:"https://abolfazl260.github.io",TELEGRAM_BOT_TOKEN:TOKEN,
  DB:{prepare(){throw Error("DB should not be accessed");}}};
 const unauth=await handleRequest(new Request(api,{headers:{Origin:env.ALLOWED_ORIGIN}}),env,NOW);
 assert.equal(unauth.status,401);
 const bogus=await handleRequest(new Request(api,{headers:{Origin:env.ALLOWED_ORIGIN,Authorization:"tma forged"}}),env,NOW);
 assert.equal(bogus.status,401);
 const origin=await handleRequest(new Request(api,{headers:{Origin:"https://evil.example"}}),env,NOW);
 assert.equal(origin.status,403);
 const preflight=await handleRequest(new Request(api,{method:"OPTIONS",headers:{Origin:env.ALLOWED_ORIGIN}}),env,NOW);
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get("Access-Control-Allow-Origin"),env.ALLOWED_ORIGIN);
});
