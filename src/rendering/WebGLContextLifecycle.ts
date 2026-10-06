type ContextTarget=Pick<HTMLCanvasElement,"addEventListener"|"removeEventListener">;

export class WebGLContextLifecycle{
 private lost=false;
 private disposed=false;

 constructor(private readonly target:ContextTarget,private readonly onRestored:()=>void){
  target.addEventListener("webglcontextlost",this.handleLost);
  target.addEventListener("webglcontextrestored",this.handleRestored);
 }

 canRender(){return !this.lost&&!this.disposed;}

 dispose(){
  if(this.disposed)return;
  this.disposed=true;
  this.target.removeEventListener("webglcontextlost",this.handleLost);
  this.target.removeEventListener("webglcontextrestored",this.handleRestored);
 }

 private readonly handleLost=(event:Event)=>{
  event.preventDefault();
  this.lost=true;
 };

 private readonly handleRestored=()=>{
  if(this.disposed)return;
  this.lost=false;
  this.onRestored();
 };
}
