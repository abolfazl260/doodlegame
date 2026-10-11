import test from "node:test";
import assert from "node:assert/strict";
import {PlayerNames,PLAYER_NAMES_STORAGE_KEY,normalizeCharacterName} from "../.test-build/profile/PlayerNames.js";

const createStorage=()=>{
 const data=new Map();
 return {data,get:key=>data.get(key)??null,set:(key,value)=>data.set(key,value),remove:key=>data.delete(key),has:key=>data.has(key)};
};
test("stores two independent optional character names locally and restores them",()=>{
 const storage=createStorage(),names=new PlayerNames(storage);
 assert.equal(names.get(1),"");assert.equal(names.get(2),"");
 names.set(1,"  علی  ");names.set(2,"سارا");
 assert.deepEqual(storage.data.get(PLAYER_NAMES_STORAGE_KEY),{player1:"علی",player2:"سارا"});
 const restored=new PlayerNames(storage);
 assert.equal(restored.get(1),"علی");assert.equal(restored.get(2),"سارا");
 restored.set(1,"");assert.equal(restored.get(1),"");assert.equal(restored.get(2),"سارا");
});
test("normalizes untrusted saved and entered character names",()=>{
 assert.equal(normalizeCharacterName({}),"");
 assert.equal(normalizeCharacterName(" A \n B\u202e  "),"A B");
 assert.equal(normalizeCharacterName("x".repeat(100)),"x".repeat(18));
 const storage=createStorage();
 storage.set(PLAYER_NAMES_STORAGE_KEY,{player1:42,player2:"  Eve "});
 const names=new PlayerNames(storage);
 assert.equal(names.get(1),"");assert.equal(names.get(2),"Eve");
});
test("character names remain usable when persistent storage is unavailable",()=>{
 const storage={get(){throw Error("blocked");},set(){throw Error("blocked");}};
 const old=console.warn;console.warn=()=>{};
 try{const names=new PlayerNames(storage);names.set(1,"Kian");assert.equal(names.get(1),"Kian");}
 finally{console.warn=old;}
});
