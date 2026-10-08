import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {I18n} from "../.test-build/i18n/I18n.js";

const makeStorage=(value)=>{
 const entries=new Map();
 if(value!==undefined)entries.set("doodlegame.locale",value);
 return{
  entries,
  get(key){return entries.get(key)??null;},
  set(key,val){entries.set(key,val);},
  remove(key){entries.delete(key);}
 };
};
const doc={documentElement:{lang:"",dir:""}};
globalThis.document=doc;

test("first launch always defaults to Persian, regardless of browser locale",()=>{
 const storage=makeStorage();
 const i18n=new I18n(storage);
 assert.equal(i18n.locale,"fa");
 assert.equal(doc.documentElement.lang,"fa");
 assert.equal(doc.documentElement.dir,"rtl");
 assert.equal(storage.entries.size,0,"do not create a preference until user switches languages");
});

test("explicit English choice is saved and restored across instances",()=>{
 const storage=makeStorage();
 const i18n=new I18n(storage);
 i18n.setLocale("en");
 assert.equal(storage.get("doodlegame.locale"),"en");
 const next=new I18n(storage);
 assert.equal(next.locale,"en");
 assert.equal(doc.documentElement.dir,"ltr");
 next.setLocale("fa");
 assert.equal(storage.get("doodlegame.locale"),"fa");
 assert.equal(new I18n(storage).locale,"fa");
});

test("invalid saved values fall back safely to Persian",()=>{
 for(const value of ["de","english",true,{},42]){
  assert.equal(new I18n(makeStorage(value)).locale,"fa");
 }
 const broken={get(){throw new Error("storage unavailable")},set(){}};
 const warn=console.warn;
 console.warn=()=>{};
 try{assert.equal(new I18n(broken).locale,"fa");}
 finally{console.warn=warn;}
});

test("privacy wording is short, transparent, and consistently bilingual",()=>{
 const locale=readFileSync("src/i18n/I18n.ts","utf8");
 const policy=readFileSync("public/privacy.html","utf8");
 assert.match(locale,/چه چیزی ذخیره می‌شود/);
 const faPrivacy=new I18n(makeStorage()).messages.privacy.html;
 const english=new I18n(makeStorage());
 english.setLocale("en");
 const enPrivacy=english.messages.privacy.html;
 assert.doesNotMatch(faPrivacy,/دسترسی اینترنت|WebView|GitHub Pages/);
 assert.doesNotMatch(enPrivacy,/<b>Internet:|WebView|GitHub Pages/);
 assert.match(faPrivacy,/چطور پاکش کنیم/);
 assert.match(enPrivacy,/How to delete it/);
 assert.match(locale,/How to delete it/);
 assert.match(locale,/اطلاعات شخصی شما را جمع‌آوری نمی‌کند/);
 assert.match(policy,/DoodleGame does not collect or share personal or sensitive user data/i);
 assert.doesNotMatch(policy,/>[^<]*(GitHub|Capacitor|WebView|INTERNET permission|مجوز اینترنت|دسترسی اینترنت)[^<]*</i);
 assert.match(policy,/https:\/\/abolfazl260\.github\.io\/doodlegame\/privacy\.html/);
 assert.match(policy,/اطلاعات شخصی یا حساس/);
 assert.doesNotMatch(policy,/<script\\b/i);
});

test("bilingual privacy policy omits internet-runtime and hosting disclosures without removing required facts",()=>{
 const html=readFileSync("public/privacy.html","utf8");
 const text=html.replace(/<[^>]+>/g," ");
 assert.doesNotMatch(text,/GitHub|GitHub Pages|GitHub Issues|Capacitor|WebView|INTERNET permission|دسترسی اینترنت|مجوز اینترنت|اینترنت استفاده|میزبانی می‌شود/i);
 assert.match(text,/does not collect or share personal or sensitive user data/i);
 assert.match(text,/اطلاعات شخصی یا حساس/);
 assert.match(text,/Data Safety/);
 const en=new I18n(makeStorage());en.setLocale("en");
 const fa=new I18n(makeStorage());
 for(const copy of [en.messages.privacy,fa.messages.privacy]){
  assert.ok(copy.web.length>0);
  assert.match(copy.html,/\S/);
  assert.equal("networkNote" in copy,false);
  assert.doesNotMatch(copy.html,/GitHub|WebView|INTERNET|دسترسی اینترنت/i);
 }
 const ui=readFileSync("src/ui/GameUI.ts","utf8");
 assert.match(ui,/this\.privacyLink\.href=PRIVACY_POLICY_URL/);
 assert.doesNotMatch(ui,/privacyNetworkNote|privacy\.networkNote/);
});
