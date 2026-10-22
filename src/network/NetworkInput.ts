import type {InputSource,InputState,WeaponId} from '../input/Input';
export const IDLE:InputState={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,grabPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
export const EDGE_KEYS=['pointerPressed','pointerReleased','attackCancelled','jumpPressed','dashPressed','grabPressed','attackPressed','weaponNextPressed','weaponPreviousPressed'] as const;
export type InputSample={input:InputState;aim:[number,number]|null;weapon:WeaponId|null};
export type InputEdge=InputSample&{id:number};
export function heldOnly(input:InputState):InputState {
  const held={...input};for(const key of EDGE_KEYS)held[key]=false;
  return held;
}
/** Acknowledge only after bounded enqueue. Apply each edge once, in order, at 60 Hz. */
export class RemoteInput {
  private queue:InputEdge[]=[];
  private held:InputSample={input:IDLE,aim:null,weapon:null};
  ack=0;
  accept(held:InputSample,edges:InputEdge[]){
    for(const edge of edges){
      if(edge.id<=this.ack)continue;
      if(edge.id!==this.ack+1||this.queue.length>=64)throw new Error('input-overflow');
      this.queue.push(edge);this.ack=edge.id;
    }
    this.held=held;
  }
  next():InputSample{return this.queue.shift()??{...this.held,input:heldOnly(this.held.input),weapon:null};}
  clear(){this.queue=[];this.held={input:IDLE,aim:null,weapon:null};this.ack=0;}
}
export class HostInput implements InputSource {
  second:InputState=IDLE;
  constructor(private local:InputSource){}
  start(){} stop(){} dispose(){}
  getState(){return this.local.getState();}
  getPlayer2State(){return this.second;}
  // The phone keeps its single-player input layout even though simulation has two humans.
  setLocalPvPEnabled(_enabled:boolean){}
  endFrame(){this.local.endFrame();this.second=IDLE;}
}
/** Edge journal is resent until acknowledged; taps between 30 Hz sends survive. */
export class InputJournal {
  private nextId=0;
  private events:InputEdge[]=[];
  held:InputSample={input:IDLE,aim:null,weapon:null};
  capture(sample:InputSample){
    this.held={...sample,input:{...sample.input}};
    if(EDGE_KEYS.some(key=>sample.input[key])||sample.weapon){
      if(this.events.length>=64)throw new Error('input-overflow');
      this.events.push({...this.held,id:++this.nextId});
    }
  }
  acknowledge(ack:number){this.events=this.events.filter(e=>e.id>ack);}
  pending(){return this.events;}
  clear(){this.nextId=0;this.events=[];this.held={input:IDLE,aim:null,weapon:null};}
}
