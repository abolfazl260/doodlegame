/** No WebSocket/web fallback: only the Android Wi-Fi socket implementation. */
export type TransportEvent = {type:'connected'|'disconnected'|'background'|'foreground'; reason?:string} | {type:'message'; data:string};
export interface LanTransport {
  listen(): Promise<{address:string; port:number}>;
  connect(address:string, port:number): Promise<void>;
  send(data:string): Promise<void>;
  dropPeer(): Promise<void>;
  close(): Promise<void>;
  subscribe(listener:(event:TransportEvent)=>void):()=>void;
}
export const MAX_PACKET_BYTES = 65536;
export function isLanAddress(value:string):boolean {
  if(!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
  const parts=value.split('.').map(Number);
  if(parts.some((n,i)=>n>255 || String(n)!==value.split('.')[i])) return false;
  const [a,b]=parts;
  // Only native knows the attached Wi-Fi prefix and can reject subnet network/broadcast hosts.
  return a===10 || a===172&&b>=16&&b<=31 || a===192&&b===168;
}
