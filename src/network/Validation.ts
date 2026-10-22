export const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('packet');return v as Record<string,unknown>;};
export const num=(v:unknown,min=-1e5,max=1e5):number=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('packet');return v;};
export const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number=>{const n=num(v,min,max);if(!Number.isSafeInteger(n))throw new Error('packet');return n;};
export const bool=(v:unknown):boolean=>{if(typeof v!=='boolean')throw new Error('packet');return v;};
export const str=(v:unknown,max=128):string=>{if(typeof v!=='string'||v.length>max)throw new Error('packet');return v;};
export const choice=<const T extends string|number|null>(v:unknown,values:readonly T[]):T=>{if(!values.includes(v as T))throw new Error('packet');return v as T;};
export const list=<T>(v:unknown,max:number,decode:(v:unknown)=>T):T[]=>{if(!Array.isArray(v)||v.length>max)throw new Error('packet');return v.map(decode);};
