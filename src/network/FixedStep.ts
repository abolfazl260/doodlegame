/** LAN-only simulation clock. Cap catch-up work; pause/resume discards accumulated time. */
export class FixedStep {
 private accumulator=0;
 constructor(readonly step=1/60,readonly maxSteps=6){}
 advance(dt:number,update:(dt:number)=>void){
  this.accumulator+=Math.max(0,Math.min(dt,this.step*this.maxSteps));
  let count=0;
  while(this.accumulator+1e-9>=this.step&&count<this.maxSteps){this.accumulator-=this.step;update(this.step);count++;}
  return count;
 }
 reset(){this.accumulator=0;}
}
