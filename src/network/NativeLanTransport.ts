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
  private generation=0;
  constructor(private readonly native:NativeLan=plugin,private readonly supported=lanSupported){}
  private listeners=new Set<(event:TransportEvent)=>void>();
  private async init(generation:number){
    if(!this.supported())throw new Error('unsupported');
    if(!this.handle){
      const handle=await this.native.addListener('lanEvent',event=>{
        try{if(generation===this.generation)for(const listener of this.listeners)listener(event);}
        finally{if(event.type==='message'&&event.connection!==undefined)void this.native.acknowledge({connection:event.connection}).catch(()=>{});}
      });
      if(generation!==this.generation){await handle.remove();throw new Error('cancelled');}
      this.handle=handle;
    }
    if(generation!==this.generation)throw new Error('cancelled');
  }
  async listen(){const generation=this.generation;await this.init(generation);return this.native.listen();}
  async connect(address:string,port:number){
    if(!isLanAddress(address)||!Number.isInteger(port)||port<1024||port>65535)throw new Error('address');
    const generation=this.generation;await this.init(generation);await this.native.connect({address,port});
  }
  async send(data:string){if(new TextEncoder().encode(data).length>MAX_PACKET_BYTES)throw new Error('packet');await this.native.send({data});}
  async dropPeer(){await this.native.dropPeer();}
  async close(){
    this.generation++;const handle=this.handle;this.handle=null;
    try{await this.native.close();}finally{await handle?.remove();}
  }
  subscribe(listener:(event:TransportEvent)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}
