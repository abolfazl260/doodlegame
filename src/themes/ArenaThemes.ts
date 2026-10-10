import type {ArenaId,PlatformSurface} from "../gameplay/GameSession";
import {paintProfessionalBackdrop} from "./BackgroundArt";

export type ArenaUiSkin = "doodle" | "neon" | "fantasy";
export type ArenaBackdrop = "sketch" | "city" | "clouds" | "mountains" | "cavern" | "industrial";

export interface ArenaTheme {
 readonly skin:ArenaUiSkin;
 readonly backdrop:ArenaBackdrop;
 readonly skyTop:string;
 readonly skyBottom:string;
 readonly silhouette:string;
 readonly platform:string;
 readonly platformEdge:string;
 readonly accent:string;
 readonly secondary:string;
 readonly hudBackground:string;
}

/** Visual data is intentionally separate from physics and arena definitions. */
function theme(skin:ArenaUiSkin,backdrop:ArenaBackdrop,skyTop:string,skyBottom:string,silhouette:string,platform:string,platformEdge:string,accent:string,secondary:string):ArenaTheme{
 return {skin,backdrop,skyTop,skyBottom,silhouette,platform,platformEdge,accent,secondary,hudBackground:"#080d1c"};
}

export const ARENA_THEMES:Readonly<Record<ArenaId,ArenaTheme>>={
 classic:theme("doodle","sketch","#171c29","#080b13","#111b28","#525f70","#d4e0f2","#ffffff","#91c7e7"),
 towers:theme("fantasy","mountains","#242437","#0c111d","#1b2232","#666376","#c9b384","#f1c777","#8dacc8"),
 pit:theme("fantasy","cavern","#26132e","#090713","#24122a","#62455c","#d49cb8","#f18ee4","#b381e6"),
 steps:theme("doodle","mountains","#30202a","#11111a","#27202a","#83625e","#f1bd8e","#ffbd77","#ee6e94"),
 zigzag:theme("neon","city","#120e30","#060818","#161139","#363366","#c578fc","#c16dff","#4a9fff"),
 sky:theme("fantasy","clouds","#17486b","#10243a","#236584","#6cabc2","#d2efff","#c4efff","#7ee1e9"),
 moving:theme("neon","city","#11123e","#04091e","#0b2251","#263f72","#18e7ff","#00d7ff","#f33bd9"),
 fortress:theme("doodle","sketch","#273040","#11141e","#1d2730","#5d6673","#dcde8c","#ffca35","#ff4d71"),
 bridge:theme("fantasy","mountains","#152e40","#0b1525","#112636","#475d6c","#bddbe8","#85cae2","#cfac75"),
 crater:theme("fantasy","cavern","#4a1a21","#190c14","#35141d","#6e3935","#ff9b42","#ff642b","#ffd079"),
 vertical:theme("fantasy","clouds","#153f47","#0c1b2a","#205059","#4e7b80","#b1f4dc","#75e7d9","#b6edb7"),
 ruins:theme("doodle","mountains","#1b3028","#0b1714","#162a22","#586b55","#b9df7d","#b9d16b","#ebc77a"),
 conveyor:theme("neon","industrial","#22202e","#0c111b","#1d2832","#4a5459","#ffcf43","#ffd14a","#54d5e8"),
 collapse:theme("doodle","cavern","#39202a","#140e17","#2b1821","#77565b","#f59e83","#ff9475","#d2af9c"),
 storm:theme("neon","mountains","#122943","#080f24","#112641","#364a67","#82baff","#6fa9ff","#e2edf9"),
 reactor:theme("neon","industrial","#132f2d","#061b22","#102d2e","#2b6865","#93ffae","#76f3ab","#68d9f2")
};

/** The gameplay surface type still communicates its physics in every palette. */
export function platformColors(t:ArenaTheme,surface:PlatformSurface="normal"):{body:string;edge:string}{
 if(surface==="ice")return {body:"#80b7cc",edge:"#d7f6ff"};
 if(surface==="slippery")return {body:"#827b9f",edge:"#d0bee9"};
 if(surface==="oneWay")return {body:t.platform,edge:t.secondary};
 if(surface==="conveyorLeft"||surface==="conveyorRight")return {body:"#4f6069",edge:t.accent};
 return {body:t.platform,edge:t.platformEdge};
}

export function getArenaTheme(arena:ArenaId):ArenaTheme{
 return ARENA_THEMES[arena];
}

/** One cached backdrop implementation for both Canvas2D and WebGL. */
export function paintArenaBackdrop(ctx:CanvasRenderingContext2D,width:number,height:number,t:ArenaTheme):void{
 paintProfessionalBackdrop(ctx,width,height,t);
}
