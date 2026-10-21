import {Capacitor,registerPlugin,type PluginListenerHandle} from '@capacitor/core';
import {isLanAddress,MAX_PACKET_BYTES,type LanTransport,type TransportEvent} from './LanTransport.js';
interface NativeLan {
  listen():Promise<{address:string;port:number}>;
  connect(options:{address:string;port:number}):Promise<void>;
  send(options:{data:string}):Promise<void>;
  acknowledge(options:{connection:number}):Promise<void>;
  dropPeer():Promise<void>;
  close():Promise<void>;
  addListener(name:'lanEvent',listener:(event:TransportEvent&{connection?:number})=>void):Promise<PluginListenerHandle>;
}
const plugin=registerPlugin<NativeLan>('DoodleLan');
export const lanSupported=()=>Capacitor.getPlatform()==='android'&&Capacitor.isNativePlatform();
export class NativeLanTransport implements LanTransport {
  private handle:PluginListenerHandle|null=null;
  private listeners=new Set<(event:TransportEvent)=>void>();
  private async init(){
    if(!lanSupported())throw new Error('unsupported');
    if(!this.handle)this.handle=await plugin.addListener('lanEvent',event=>{
      try{for(const listener of this.listeners)listener(event);}
      finally{if(event.type==='message'&&event.connection!==undefined)void plugin.acknowledge({connection:event.connection}).catch(()=>{});}
    });
  }
  async listen(){await this.init();return plugin.listen();}
  async connect(address:string,port:number){
    if(!isLanAddress(address)||!Number.isInteger(port)||port<1024||port>65535)throw new Error('address');
    await this.init();await plugin.connect({address,port});
  }
  async send(data:string){if(new TextEncoder().encode(data).length>MAX_PACKET_BYTES)throw new Error('packet');await plugin.send({data});}
  async dropPeer(){await plugin.dropPeer();}
  async close(){await plugin.close();await this.handle?.remove();this.handle=null;}
  subscribe(listener:(event:TransportEvent)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}
