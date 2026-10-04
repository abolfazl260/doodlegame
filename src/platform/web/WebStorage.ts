import type {Storage} from "../../storage/Storage";
export class WebStorage implements Storage {
 constructor(private readonly storage:globalThis.Storage=window.localStorage){}
 get<T>(key:string){const raw=this.storage.getItem(key);if(raw===null)return null;try{return JSON.parse(raw) as T;}catch{throw new Error(`Failed to parse stored value for key "${key}".`);}}
 set<T>(key:string,value:T){this.storage.setItem(key,JSON.stringify(value));}
 remove(key:string){this.storage.removeItem(key);}
 has(key:string){return this.storage.getItem(key)!==null;}
}
