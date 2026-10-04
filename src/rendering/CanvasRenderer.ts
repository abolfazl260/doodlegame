import type {Renderer} from "./Renderer";
import type {GameRenderState} from "../gameplay/GameSession";

export class CanvasRenderer implements Renderer {
  private readonly context:CanvasRenderingContext2D;
  private width=1;
  private height=1;
  private dpr=1;

  constructor(private readonly canvas:HTMLCanvasElement){
    const context=canvas.getContext("2d");
    if(!context)throw new Error("2D canvas rendering is unavailable.");
    this.context=context;
    this.resize();
  }

  resize(){
    const width=Math.max(1,this.canvas.clientWidth);
    const height=Math.max(1,this.canvas.clientHeight);
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.width=width;
    this.height=height;
    this.canvas.width=Math.max(1,Math.floor(width*this.dpr));
    this.canvas.height=Math.max(1,Math.floor(height*this.dpr));
  }

  render(state:GameRenderState){
    const ctx=this.context;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    ctx.fillStyle="#000";
    ctx.fillRect(0,0,this.width,this.height);

    const viewHeight=10;
    const viewWidth=viewHeight*(this.width/Math.max(1,this.height));
    const cameraY=Math.max(2.5,state.playerY+1.2);
    const scale=this.height/viewHeight;
    const toScreenX=(x:number)=>(x+viewWidth/2)*scale;
    const toScreenY=(y:number)=>(cameraY+viewHeight/2-y)*scale;

    ctx.fillStyle="#777";
    for(const platform of state.platforms){
      ctx.fillRect(toScreenX(platform.x),toScreenY(platform.y+platform.height),platform.width*scale,platform.height*scale);
    }

    const x=toScreenX(state.playerX);
    const y=toScreenY(state.playerY);
    const unit=scale;
    const stride=state.grounded?Math.sin(state.animationTime*Math.min(Math.abs(state.playerVelocityX),6)*1.5)*.16:0;

    ctx.strokeStyle="#fff";
    ctx.fillStyle="#fff";
    ctx.lineWidth=Math.max(2,unit*.06);
    ctx.lineCap="round";

    ctx.beginPath();
    ctx.arc(x,y-.82*unit,.24*unit,0,Math.PI*2);
    ctx.fill();

    const hipY=y+.08*unit;
    const shoulderY=y-.42*unit;
    const footY=y+.9*unit;
    const swing=stride*unit;
    const armSwing=-stride*.9*unit;

    ctx.beginPath();
    ctx.moveTo(x,hipY);ctx.lineTo(x,shoulderY);
    ctx.moveTo(x,hipY);ctx.lineTo(x-.28*unit+swing,footY);
    ctx.moveTo(x,hipY);ctx.lineTo(x+.28*unit-swing,footY);
    ctx.moveTo(x-.22*unit,shoulderY);ctx.lineTo(x-.42*unit+armSwing,y+.42*unit);
    ctx.moveTo(x+.22*unit,shoulderY);ctx.lineTo(x+.42*unit-armSwing,y+.42*unit);
    ctx.stroke();
  }

  dispose(){}
}
