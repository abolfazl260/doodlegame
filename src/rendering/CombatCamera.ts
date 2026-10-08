/** Shared orthographic camera framing for Canvas and Three.js combat renderers. */
export interface CombatCameraFrame{
 readonly x:number;
 readonly y:number;
 readonly height:number;
}
interface FighterPoint{readonly x:number;readonly y:number;}
interface CombatPair{readonly player:FighterPoint;readonly opponent:FighterPoint;}
const MIN_VIEW_HEIGHT=10;
const FIGHTER_X_MARGIN=1.5;
const FIGHTER_Y_MARGIN=1.15;
const safeAspect=(aspect:number)=>Number.isFinite(aspect)&&aspect>0?Math.max(.35,aspect):16/9;

/** Keeps both fighter silhouettes visible, including distant arena spawns and gaps.
 * Zoom-out is immediate to prevent clipping; zoom-in and tracking are smoothed. */
export function combatCameraFrame(pair:CombatPair,aspect:number,previous:CombatCameraFrame|null=null):CombatCameraFrame{
 const ratio=safeAspect(aspect);
 const left=Math.min(pair.player.x,pair.opponent.x)-FIGHTER_X_MARGIN;
 const right=Math.max(pair.player.x,pair.opponent.x)+FIGHTER_X_MARGIN;
 const bottom=Math.min(0,pair.player.y-FIGHTER_Y_MARGIN,pair.opponent.y-FIGHTER_Y_MARGIN);
 const top=Math.max(10,pair.player.y+FIGHTER_Y_MARGIN,pair.opponent.y+FIGHTER_Y_MARGIN);
 const requiredHeight=Math.max(MIN_VIEW_HEIGHT,(right-left)/ratio,top-bottom);
 const height=previous?Math.max(requiredHeight,previous.height+(requiredHeight-previous.height)*.14):requiredHeight;
 const halfWidth=height*ratio/2,halfHeight=height/2;
 const centerX=(left+right)/2,centerY=(bottom+top)/2;
 const followX=previous?previous.x+(centerX-previous.x)*.18:centerX;
 const followY=previous?previous.y+(centerY-previous.y)*.18:centerY;
 // Clamp lagged tracking to the entire visible fighter range; no invisible spawns.
 const x=Math.max(right-halfWidth,Math.min(left+halfWidth,followX));
 const y=Math.max(top-halfHeight,Math.min(bottom+halfHeight,followY));
 return{x,y,height};
}
