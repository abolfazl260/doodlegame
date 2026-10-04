import type {FrameScheduler} from "./FrameScheduler";
export class GameLoop {
  private running=false; private frameHandle:number|null=null; private previousTime:number|null=null;
  constructor(private readonly scheduler:FrameScheduler,private readonly update:(dt:number)=>void,private readonly render:()=>void,private readonly onError:(error:unknown)=>void,private readonly maxDeltaSeconds=0.1){}
  start(){if(this.running)return;this.running=true;this.previousTime=null;this.schedule();}
  stop(){if(!this.running)return;this.running=false;this.previousTime=null;if(this.frameHandle!==null)this.scheduler.cancel(this.frameHandle);this.frameHandle=null;}
  dispose(){this.stop();}
  private schedule(){this.frameHandle=this.scheduler.request(t=>this.tick(t));}
  private tick(time:number){this.frameHandle=null;if(!this.running)return;try{const previous=this.previousTime??time;const dt=Math.min(Math.max(0,(time-previous)/1000),this.maxDeltaSeconds);this.previousTime=time;this.update(dt);this.render();if(this.running)this.schedule();}catch(error){this.stop();this.onError(error);}}
}
