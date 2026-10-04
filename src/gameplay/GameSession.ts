import type {InputSource} from "../input/Input";

export interface Platform {
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
}

export interface GameRenderState {
  readonly playerX:number;
  readonly playerY:number;
  readonly playerVelocityX:number;
  readonly playerVelocityY:number;
  readonly grounded:boolean;
  readonly facing:number;
  readonly animationTime:number;
  readonly platforms:readonly Platform[];
}

const PLATFORMS:readonly Platform[]=[
  {x:-7,y:-0.25,width:34,height:0.5},
  {x:3,y:1.5,width:4,height:0.35},
  {x:10,y:3.4,width:4.5,height:0.35}
];

const PLAYER_WIDTH=0.8;
const PLAYER_HEIGHT=1.8;
const GRAVITY=-22;
const MOVE_ACCELERATION=32;
const MAX_SPEED=8;
const GROUND_FRICTION=26;
const AIR_FRICTION=5;
const JUMP_VELOCITY=9.2;

export class GameSession {
  private elapsed=0;
  private playerX=0;
  private playerY=0.9;
  private velocityX=0;
  private velocityY=0;
  private grounded=true;
  private facing=1;

  constructor(private readonly input:InputSource){}

  reset(){
    this.elapsed=0;
    this.playerX=0;
    this.playerY=PLAYER_HEIGHT/2;
    this.velocityX=0;
    this.velocityY=0;
    this.grounded=true;
    this.facing=1;
  }

  update(dt:number){
    const input=this.input.getState();
    this.elapsed+=dt;

    const targetDirection=Math.abs(input.moveX)>0.01?Math.sign(input.moveX):0;
    if(targetDirection!==0){
      this.velocityX+=targetDirection*MOVE_ACCELERATION*dt;
      this.facing=targetDirection;
    }else{
      const friction=this.grounded?GROUND_FRICTION:AIR_FRICTION;
      const amount=friction*dt;
      this.velocityX=Math.abs(this.velocityX)<=amount?0:this.velocityX-Math.sign(this.velocityX)*amount;
    }
    this.velocityX=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,this.velocityX));

    if(input.jumpPressed&&this.grounded){
      this.velocityY=JUMP_VELOCITY;
      this.grounded=false;
    }

    const previousBottom=this.playerY-PLAYER_HEIGHT/2;
    this.velocityY+=GRAVITY*dt;
    this.playerX+=this.velocityX*dt;
    this.playerY+=this.velocityY*dt;
    this.grounded=false;

    const halfWidth=PLAYER_WIDTH/2;
    const bottom=this.playerY-PLAYER_HEIGHT/2;
    if(this.velocityY<=0){
      for(const platform of PLATFORMS){
        const overlapsX=this.playerX+halfWidth>platform.x&&this.playerX-halfWidth<platform.x+platform.width;
        const crossedTop=previousBottom>=platform.y+platform.height&&bottom<=platform.y+platform.height;
        if(overlapsX&&crossedTop){
          this.playerY=platform.y+platform.height+PLAYER_HEIGHT/2;
          this.velocityY=0;
          this.grounded=true;
          break;
        }
      }
    }

    if(this.playerY<-12)this.reset();
    this.input.endFrame();
  }

  getRenderState():GameRenderState{
    return {
      playerX:this.playerX,
      playerY:this.playerY,
      playerVelocityX:this.velocityX,
      playerVelocityY:this.velocityY,
      grounded:this.grounded,
      facing:this.facing,
      animationTime:this.elapsed,
      platforms:PLATFORMS
    };
  }

  dispose(){}
}
