import {ARENA_CATEGORY_IDS,arenaCategories,arenaPreviewUrl,type ArenaCategory} from "./ArenaPreviews";
import {MobileOnboarding,type TutorialSignals} from "./MobileOnboarding";
import type {Storage} from "../storage/Storage";
import {GameState} from "../core/GameState";


import {getArenaTheme} from "../themes/ArenaThemes";
import type {ArenaId,BuiltInArenaId,GameModeId,HillState,CharacterId} from "../gameplay/GameSession";
import {getDownloadedArena,installedArenas,arenaImageDataUrl,type ArenaListing,type DownloadedArenaId} from "../gameplay/DownloadableArenas.js";
import type {I18n} from "../i18n/I18n";
import type {WeaponId} from "../input/Input";
import type {ProgressionView} from "../progression/Progression";

type HudState={
 tutorial?:TutorialSignals;lanPlayer?:1|2;
 playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;weapon:WeaponId;winner:"player"|"opponent"|"draw"|null;arena:ArenaId;mode:GameModeId;hill:HillState;
 bowCharge:number;playerFacing:number;upgradePoints:number;upgradedWeapons:readonly WeaponId[];
 progression?:ProgressionView|null;inRun?:boolean;secondWeapon?:WeaponId;secondBowCharge?:number;
 characterId?:CharacterId;opponentCharacterId?:CharacterId;characterChosen?:boolean;weaponChosen?:boolean;secondCharacterChosen?:boolean;secondWeaponChosen?:boolean;weaponAimAngle?:number|null;secondAimAngle?:number|null;playerName?:string;secondPlayerName?:string;localPvP?:boolean;pvpSeries?:Readonly<{round:number;playerWins:number;opponentWins:number;complete:boolean;countdown:number;swapped:boolean}>;
};
type Actions={
 quickPlay?:()=>void;touchDash?:()=>void;
 newRun?:()=>void;continueRun?:()=>void;leaveRun?:()=>void;
 start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void;nextPvpRound?:()=>void;changePvpLoadout?:()=>void;stopToMenu?:()=>void;weaponNext:()=>void;weaponPrevious:()=>void;
 weaponSelect:(id:WeaponId)=>void;selectStartingWeapon:(id:WeaponId)=>void;player2StartingWeapon?:(id:WeaponId)=>void;randomStartingWeapon?:(player:1|2)=>void;player2CharacterSelect?:(id:CharacterId)=>void;upgradeWeapon:(id:WeaponId)=>void;arenaSelect:(id:ArenaId)=>void;modeSelect:(id:GameModeId)=>void;
 playerCountSelect?:(count:1|2)=>void;setWeaponAim?:(player:1|2,x:number,y:number)=>void;player2WeaponSelect?:(id:WeaponId)=>void;
 setCharacterName?:(player:1|2,name:string)=>void;characterSelect?:(id:CharacterId)=>void;
 setTouchMove:(x:number,y:number)=>void;touchGrab:()=>void;touchAttackStart:()=>void;touchAttackEnd:()=>void;touchAttackCancel:()=>void;
 setPlayer2TouchMove?:(x:number,y:number)=>void;player2Grab?:()=>void;player2AttackStart?:()=>void;player2AttackEnd?:()=>void;player2AttackCancel?:()=>void;player2WeaponNext?:()=>void;player2WeaponPrevious?:()=>void;
 toggleCombatSound:()=>void;toggleCameraShake:()=>void;updateData:()=>Promise<void>;
 fetchArenaCatalog?:()=>Promise<ArenaListing[]>;installArena?:(listing:ArenaListing)=>Promise<void>;deleteArena?:(id:DownloadedArenaId)=>void;
};
/* Keep UI touch conversion self-contained for standalone GameUI test fixtures. */
const isRotatedGame=()=>Boolean(document.documentElement?.classList?.contains("software-landscape"));
const toGamePointerDelta=(dx:number,dy:number)=>isRotatedGame()?{x:dy,y:-dx}:{x:dx,y:dy};
const gamePointerInElement=(element:HTMLElement,event:{clientX:number;clientY:number})=>{
 const rect=element.getBoundingClientRect(),rotated=isRotatedGame();
 const width=element.clientWidth||(rotated?rect.height:rect.width);
 const height=element.clientHeight||(rotated?rect.width:rect.height);
 return rotated
  ?{x:(event.clientY-rect.top)/Math.max(1,rect.height)*width,
    y:((rect.right??rect.left+rect.width)-event.clientX)/Math.max(1,rect.width)*height}
  :{x:(event.clientX-rect.left)/Math.max(1,rect.width)*width,
    y:(event.clientY-rect.top)/Math.max(1,rect.height)*height};
};

/** UI-local to preserve standalone GameUI test harness; matches GrabCombat rules. */
const grabGesture=(startX:number,startY:number,x:number,y:number,elapsedMs:number)=>{
 const delta=toGamePointerDelta(x-startX,y-startY),dx=delta.x,up=-delta.y;
 return elapsedMs>=0&&elapsedMs<=380&&up>=52&&Math.abs(dx)<=Math.max(30,up*.5);
};
type UiAction="start"|"pause"|"resume"|"restart"|"menu";
type MenuStep="mode"|"arena"|"loadout";
// Append another step here and give it a page in syncWizard to extend the setup.
const MENU_STEPS:readonly MenuStep[]=["mode","arena","loadout"];

const ARENA_IDS:readonly ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const WEAPON_IDS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear","grapple"];
const MODE_IDS:readonly GameModeId[]=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const CHARACTER_IDS:readonly CharacterId[]=["soldier","ninja","viking","ranger","pharaoh","knight","mummy","archer"];
const CHARACTER_TEXT={
 en:{soldier:{name:"SOLDIER"},ninja:{name:"NINJA"},viking:{name:"VIKING"},ranger:{name:"RANGER"},pharaoh:{name:"PHARAOH"},knight:{name:"KNIGHT"},mummy:{name:"MUMMY"},archer:{name:"ARCHER"}},
 fa:{soldier:{name:"سرباز"},ninja:{name:"نینجا"},viking:{name:"وایکینگ"},ranger:{name:"تکاور"},pharaoh:{name:"فرعون"},knight:{name:"شوالیه"},mummy:{name:"مومیایی"},archer:{name:"کماندار"}}
} as const;
// Skin previews deliberately contain no weapons: equipment is selected independently.
const CHARACTER_PORTRAITS:Record<CharacterId,string>={
 soldier:'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 84H82" stroke="#718497" stroke-width="3"/><path d="M48 48L48 66 31 83M48 66L65 83M47 51L30 63 24 73M49 51L66 63 72 73" fill="none" stroke="#0b1422" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="48" cy="27" r="17" fill="#f9fcff" stroke="#080f19" stroke-width="4"/><path d="M34 25H65" stroke="#1679d9" stroke-width="7"/><path d="M33 25 22 19 11 22 23 28 10 37" fill="none" stroke="#0c1119" stroke-width="8" stroke-linejoin="round"/><path d="M33 25 22 19 11 22 23 28 10 37" fill="none" stroke="#1788ee" stroke-width="5" stroke-linejoin="round"/></svg>',
 ninja:'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 84H82" stroke="#6b5671" stroke-width="3"/><path d="M48 48L48 66 31 83M48 66L65 83M47 51L30 63 24 73M49 51L66 63 72 73" fill="none" stroke="#05070c" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="48" cy="27" r="17" fill="#13151d" stroke="#03060b" stroke-width="4"/><path d="M34 25H64" stroke="#e4223b" stroke-width="7"/><path d="M33 24 20 16 9 20 23 29 8 37" fill="none" stroke="#07080d" stroke-width="9" stroke-linejoin="round"/><path d="M33 24 20 16 9 20 23 29 8 37" fill="none" stroke="#e4223b" stroke-width="5" stroke-linejoin="round"/></svg>',
 viking:'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 87H83" stroke="#645242" stroke-width="3"/><path d="M48 48L48 65 31 83M48 65L65 83M44 52L28 64 22 73M53 52L68 64 75 73" stroke="#070b13" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 79L28 84M62 79L68 84" stroke="#9a6236" stroke-width="7"/><path d="M35 46L25 51M61 46L71 51" stroke="#95643e" stroke-width="8" stroke-linecap="round"/><path d="M38 65H59" stroke="#d5a345" stroke-width="5"/><circle cx="49" cy="27" r="18" fill="#10141b" stroke="#06080d" stroke-width="4"/><path d="M31 20L21 17 17 5Q11 22 23 31L32 32M66 20L77 17 81 5Q87 22 74 31L66 32" fill="#f1e4c8" stroke="#0b0d10" stroke-width="3" stroke-linejoin="round"/><path d="M32 19Q48 8 66 19L66 28H32Z" fill="#3b4653" stroke="#05080d" stroke-width="3"/><path d="M49 12V43M32 26H66" stroke="#d5a345" stroke-width="7"/><circle cx="49" cy="18" r="2" fill="#8a5e23"/><circle cx="49" cy="34" r="2" fill="#8a5e23"/></svg>',
 ranger:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 112\" aria-hidden=\"true\">\n<ellipse cx=\"48\" cy=\"107\" rx=\"33\" ry=\"4\" fill=\"#071624\" opacity=\".54\"/>\n<path d=\"M30 48 18 61 11 93 30 90 41 77 62 84 80 89 78 65 65 46Z\" fill=\"#143d58\" stroke=\"#06131e\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"M32 73 25 101 41 105 48 87 55 104 73 102 64 73Z\" fill=\"#1b3249\" stroke=\"#08131f\" stroke-width=\"5\"/>\n<path d=\"M26 97 22 106 40 106 43 97m16 0 2 9 17 0-7-9\" stroke=\"#a2c2d5\" stroke-width=\"6\" fill=\"none\" stroke-linejoin=\"round\"/>\n<path d=\"M29 81 39 81m18 0 12 0\" stroke=\"#43e5f0\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n<path d=\"M29 49 22 65 28 80 68 80 75 64 65 49Z\" fill=\"#18445f\" stroke=\"#06131e\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"M31 52 47 58 47 75 33 73ZM63 52 49 58 49 75 63 72Z\" fill=\"#25617f\" stroke=\"#081e2c\" stroke-width=\"2\"/>\n<path d=\"M47 59V74\" stroke=\"#65f6ed\" stroke-width=\"3\"/>\n<path d=\"M25 54 14 63 7 80 18 85 31 67m39-13 12 9 7 17-11 6-13-18\" stroke=\"#263d54\" stroke-width=\"9\" fill=\"none\" stroke-linejoin=\"round\"/>\n<path d=\"M12 76 22 80m63-4-11 4\" stroke=\"#a2c2d5\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n<path d=\"M19 53 31 45 41 59 30 65 16 62Zm58 0-13-8-9 14 10 6 14-3Z\" fill=\"#1596b4\" stroke=\"#081622\" stroke-width=\"3\" stroke-linejoin=\"round\"/>\n<path d=\"M21 55 29 53m38 1 8 2\" stroke=\"#65f6ed\" stroke-width=\"3\"/>\n<path d=\"M26 77H70\" stroke=\"#263d54\" stroke-width=\"8\"/><rect x=\"42\" y=\"73\" width=\"12\" height=\"9\" rx=\"2\" fill=\"#ff9c58\" stroke=\"#0a1928\" stroke-width=\"3\"/>\n<path d=\"M19 39 15 25 15 13\" stroke=\"#a2c2d5\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M10 12H20\" stroke=\"#ff9c58\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n<path d=\"M27 20 40 10 57 11 72 22 77 43 67 53 27 53 19 40Z\" fill=\"#455f77\" stroke=\"#05121f\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"M27 28 39 18 57 18 70 27 70 39 26 39Z\" fill=\"#263f58\" stroke=\"#081d2d\" stroke-width=\"2\"/>\n<path d=\"M27 39 32 32 62 31 70 39 63 46 32 46Z\" fill=\"#09263b\" stroke=\"#051624\" stroke-width=\"3\" stroke-linejoin=\"round\"/>\n<path d=\"M29 39 36 36 59 36 67 39 61 43 36 43Z\" fill=\"#43e5f0\" stroke=\"#0a2938\" stroke-width=\"2\"/>\n<path d=\"M35 37 52 37\" stroke=\"#eefcff\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n<path d=\"M31 48 41 53 56 53 66 47\" fill=\"none\" stroke=\"#b6d0df\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n<path d=\"M23 33 18 35 21 48\" fill=\"none\" stroke=\"#b6d0df\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n</svg>",
 pharaoh:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 112\" aria-hidden=\"true\">\n<ellipse cx=\"48\" cy=\"106\" rx=\"32\" ry=\"4\" fill=\"#1c140c\" opacity=\".55\"/>\n<path d=\"M30 77 23 103 43 104 48 87 54 104 74 103 65 77Z\" fill=\"#080e17\" stroke=\"#080c12\" stroke-width=\"4\"/>\n<path d=\"m24 99 22 0m9 0 19 0\" stroke=\"#eab23d\" stroke-width=\"7\"/>\n<path d=\"M31 47 24 68 25 82 71 82 72 68 65 47Z\" fill=\"#171c22\" stroke=\"#080b11\" stroke-width=\"4\"/>\n<path d=\"m21 53-13 23 11 8 14-22m42-9 13 23-11 8-14-22\" fill=\"#171d24\" stroke=\"#080c12\" stroke-width=\"7\" stroke-linecap=\"round\"/>\n<path d=\"M11 69 24 75m61-6-13 6\" stroke=\"#e9b03f\" stroke-width=\"8\"/><path d=\"M15 66 27 70m55-4-12 4\" stroke=\"#1458ae\" stroke-width=\"4\"/>\n<path d=\"M35 75 31 96 43 101 48 93 53 101 65 96 61 75Z\" fill=\"#fff8e9\" stroke=\"#080f19\" stroke-width=\"3\"/>\n<path d=\"m45 76-4 21 7 4 7-4-4-21\" fill=\"#1555a1\" stroke=\"#e9b344\" stroke-width=\"3\"/>\n<path d=\"M25 73H72\" stroke=\"#d8a139\" stroke-width=\"7\"/><circle cx=\"48\" cy=\"73\" r=\"5\" fill=\"#25dcf2\" stroke=\"#e9bb4f\" stroke-width=\"3\"/>\n<path d=\"M26 54Q48 69 70 54\" fill=\"none\" stroke=\"#dbb453\" stroke-width=\"8\"/>\n<path d=\"M30 54Q48 62 66 54\" fill=\"none\" stroke=\"#0856a5\" stroke-width=\"4\"/><circle cx=\"48\" cy=\"58\" r=\"6\" fill=\"#37dded\" stroke=\"#e7b846\" stroke-width=\"3\"/>\n<path d=\"M31 12Q48-1 65 12L80 36 69 57 62 41H34L27 57 16 36Z\" fill=\"#e6b74a\" stroke=\"#050c18\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"m24 23 11 8m-16-1 13 9m-9 5 8 6m49-27-12 8m17-1-13 9m9 5-8 6\" fill=\"none\" stroke=\"#1556a0\" stroke-width=\"8\"/>\n<path d=\"M32 20Q48 10 64 20L64 45Q48 54 32 45Z\" fill=\"#090d14\" stroke=\"#0b0d15\" stroke-width=\"4\"/>\n<path d=\"M28 17Q48 4 69 18\" stroke=\"#eacb65\" stroke-width=\"8\" fill=\"none\"/>\n<path d=\"M48 10 48 37\" stroke=\"#d4a037\" stroke-width=\"9\"/><path d=\"M42 23H54\" stroke=\"#1559b3\" stroke-width=\"4\"/>\n<circle cx=\"48\" cy=\"24\" r=\"5\" fill=\"#27dced\" stroke=\"#d4a33a\" stroke-width=\"3\"/>\n</svg>",
 knight:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 112\" aria-hidden=\"true\">\n<ellipse cx=\"48\" cy=\"106\" rx=\"31\" ry=\"4\" fill=\"#11101e\" opacity=\".55\"/>\n<path d=\"M26 49 19 63 12 98 37 93 48 78 65 95 83 100 79 62 67 48Z\" fill=\"#b51c31\" stroke=\"#090b11\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"M33 73 25 100 39 105 51 87 57 104 73 103 64 72Z\" fill=\"#1b222c\" stroke=\"#080c12\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"m26 96-5 9 18 0 4-9m17 0 3 9 17 0-9-10\" fill=\"#b1bac6\" stroke=\"#080c12\" stroke-width=\"3\"/>\n<path d=\"M30 43 23 58 30 79 65 79 73 58 66 44Z\" fill=\"#909cab\" stroke=\"#080d13\" stroke-width=\"4\"/>\n<path d=\"m33 49 15 5 15-5-4 21H37Z\" fill=\"#d8dde4\" stroke=\"#0b1119\" stroke-width=\"3\"/>\n<path d=\"m48 55 0 15\" stroke=\"#687484\" stroke-width=\"3\"/>\n<path d=\"m26 49-13 4-9 21 9 8 15-22m40-11 13 4 10 21-10 8-15-22\" fill=\"#aeb9c5\" stroke=\"#080d13\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"m8 71 6 8m68-8-5 8\" stroke=\"#e7ae38\" stroke-width=\"6\"/>\n<path d=\"m27 75 42 0\" stroke=\"#3a2628\" stroke-width=\"7\"/><circle cx=\"48\" cy=\"75\" r=\"6\" fill=\"#edb648\" stroke=\"#0a0d13\" stroke-width=\"3\"/>\n<path d=\"m41 79-6 23 12-8 10 8-5-23\" fill=\"#b31e30\" stroke=\"#0b0d12\" stroke-width=\"3\"/>\n<path d=\"M29 36Q20 20 31 13L52 7Q70 10 69 28L70 49 26 49Z\" fill=\"#acb4be\" stroke=\"#090c12\" stroke-width=\"5\"/>\n<path d=\"M33 27 49 14 66 27 64 46 48 52 31 45Z\" fill=\"#dbe2e7\" stroke=\"#10131a\" stroke-width=\"3\"/>\n<path d=\"M32 30 63 30 60 47 49 52 35 46Z\" fill=\"#29323e\" stroke=\"#0c1119\" stroke-width=\"3\"/>\n<path d=\"M38 34v9m10-9v11m10-11v9\" stroke=\"#93a0ac\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n<path d=\"M28 21Q13 24 11 17 16 7 35 7 48 0 55 8\" fill=\"#cb2635\" stroke=\"#0b0e14\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"M30 21Q17 21 15 17\" fill=\"none\" stroke=\"#f34d4a\" stroke-width=\"3\"/>\n<path d=\"M29 52Q47 65 68 52\" stroke=\"#ca2532\" stroke-width=\"8\" fill=\"none\"/><circle cx=\"68\" cy=\"52\" r=\"4\" fill=\"#e6ba50\" stroke=\"#0d0f14\" stroke-width=\"2\"/>\n<path d=\"m32 50 14 4 15-4\" fill=\"none\" stroke=\"#e9bf59\" stroke-width=\"3\"/>\n</svg>",
 mummy:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 112\" aria-hidden=\"true\">\n<ellipse cx=\"48\" cy=\"107\" rx=\"33\" ry=\"4\" fill=\"#140e25\" opacity=\".45\"/>\n<path d=\"M29 71 19 96 32 106 47 84 59 106 78 104 65 73Z\" fill=\"#121923\" stroke=\"#0a0c12\" stroke-width=\"5\"/>\n<path d=\"M22 96 31 104 40 94m19-1 10 11 7-8\" fill=\"none\" stroke=\"#f0e6d1\" stroke-width=\"9\" stroke-linejoin=\"round\"/>\n<path d=\"M26 92 37 97m-8 2 8 3m24-5 12 0m-10-7 10 3\" stroke=\"#a6a09b\" stroke-width=\"3\"/>\n<path d=\"M28 46 19 61 25 81 70 81 78 61 64 47Z\" fill=\"#eee5d5\" stroke=\"#10111a\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"M27 53 42 62 33 72 57 78m10-23-32 22m26-29-23 14\" stroke=\"#c8beae\" stroke-width=\"7\" fill=\"none\"/>\n<path d=\"M25 51 12 64 9 81 20 88 33 68m38-17 14 13 4 17-11 7-14-20\" stroke=\"#141923\" stroke-width=\"9\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M14 63 30 72m52-9-15 9m-53 5 9 4m59-4-9 4\" fill=\"none\" stroke=\"#f0e6d1\" stroke-width=\"8\"/>\n<path d=\"M10 72 24 77m56-5-12 5m-38-10 14 6\" stroke=\"#c3b6a5\" stroke-width=\"3\"/>\n<path d=\"M27 76H69\" stroke=\"#b78b40\" stroke-width=\"9\"/><circle cx=\"48\" cy=\"76\" r=\"7\" fill=\"#eabb57\" stroke=\"#0b0c15\" stroke-width=\"3\"/>\n<circle cx=\"48\" cy=\"76\" r=\"3.5\" fill=\"#23d9f0\"/><path d=\"m45 82-5 16 8 9 8-9-5-16\" fill=\"#f1e9db\" stroke=\"#11131a\" stroke-width=\"3\"/>\n<path d=\"M19 35Q16 14 38 10L60 10Q84 15 78 38L70 51 28 51Z\" fill=\"#ebe1cb\" stroke=\"#0c0f14\" stroke-width=\"5\"/>\n<path d=\"M25 25 57 11 71 19 34 40M25 38 56 25 74 34M36 48 64 38\" stroke=\"#c8bbab\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M29 22 48 13m-23 23 37-19m-32 29 36-20\" stroke=\"#fff8e7\" stroke-width=\"4\" fill=\"none\"/>\n<path d=\"M31 27 20 42 11 51 10 62 21 58 27 47\" fill=\"#f4ebd9\" stroke=\"#10121a\" stroke-width=\"4\"/>\n<path d=\"M30 35 40 39 65 33 70 38 56 46 36 45Z\" fill=\"#060c14\" stroke=\"#0b0e16\" stroke-width=\"3\"/>\n<path d=\"M48 40 59 39 64 41 55 44 46 43Z\" fill=\"#2beeff\" stroke=\"#0a1820\" stroke-width=\"2\"/>\n<path d=\"M26 46 66 29\" stroke=\"#f3e7d0\" stroke-width=\"5\"/>\n<path d=\"M10 62 21 57m18 42-13-5m33 5 13-5\" stroke=\"#e2d7c6\" stroke-width=\"3\"/>\n</svg>",
 archer:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 112\" aria-hidden=\"true\">\n<ellipse cx=\"48\" cy=\"107\" rx=\"33\" ry=\"4\" fill=\"#071a16\" opacity=\".5\"/>\n<path d=\"M31 51 17 67 9 98 36 86 48 78 62 91 83 99 78 65 67 50Z\" fill=\"#2a5f37\" stroke=\"#08140e\" stroke-width=\"4\" stroke-linejoin=\"round\"/>\n<path d=\"M28 75 22 101 39 106 48 87 57 104 76 104 68 75Z\" fill=\"#172a24\" stroke=\"#07100e\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"M25 96 21 106 39 106 43 98m16 0 2 8 18 0-6-10\" fill=\"#84502b\" stroke=\"#080f0d\" stroke-width=\"4\"/>\n<path d=\"M31 82 43 83m13 0 14-1\" stroke=\"#61933d\" stroke-width=\"8\"/>\n<path d=\"M27 48 19 65 27 82 68 82 76 65 66 50Z\" fill=\"#183b28\" stroke=\"#0c1511\" stroke-width=\"5\"/>\n<path d=\"M28 52 11 64 8 83 20 89 35 67m35-15 17 12 4 19-12 6-18-22\" fill=\"#1b2821\" stroke=\"#0a1410\" stroke-width=\"8\" stroke-linejoin=\"round\"/>\n<path d=\"M13 70 24 78m71-8-17 8\" stroke=\"#a77845\" stroke-width=\"9\"/><path d=\"M11 75 23 83m68-8-13 8\" stroke=\"#644023\" stroke-width=\"4\"/>\n<path d=\"M16 50 21 24 34 18 46 25 38 56Z\" fill=\"#634128\" stroke=\"#111810\" stroke-width=\"3\"/>\n<path d=\"M17 27 12 11m10 16-1-20m7 19 7-17\" stroke=\"#92c83e\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n<path d=\"m8 12 4-9 4 9m1-4 4-8 4 8m2 3 8-7\" stroke=\"#c8eb64\" stroke-width=\"3\" fill=\"none\"/>\n<path d=\"M29 53 68 77\" fill=\"none\" stroke=\"#8d5932\" stroke-width=\"9\"/><path d=\"M65 54 30 82\" fill=\"none\" stroke=\"#b68142\" stroke-width=\"5\"/>\n<path d=\"M25 79H71\" stroke=\"#6b4324\" stroke-width=\"8\"/><circle cx=\"48\" cy=\"79\" r=\"7\" fill=\"#dcae54\" stroke=\"#0b1310\" stroke-width=\"3\"/>\n<circle cx=\"48\" cy=\"79\" r=\"3\" fill=\"#5a3d22\"/>\n<path d=\"M21 38Q20 23 48 8L73 25 85 47 68 59 28 58 13 49Z\" fill=\"#365d39\" stroke=\"#0a140d\" stroke-width=\"5\" stroke-linejoin=\"round\"/>\n<path d=\"M27 44 46 19 63 18 76 38 68 52 30 52Z\" fill=\"#07130e\" stroke=\"#070e0b\" stroke-width=\"3\"/>\n<path d=\"M20 44Q30 25 48 15 66 23 76 40\" stroke=\"#d8b450\" stroke-width=\"5\" fill=\"none\"/>\n<path d=\"M32 45 44 42 60 43 69 47 53 50 38 50Z\" fill=\"#fffdf1\" stroke=\"#06120e\" stroke-width=\"3\"/>\n<path d=\"M23 58 33 54 43 65 29 71m41-13-12-4-7 11 13 6\" fill=\"#668e3f\" stroke=\"#0c170f\" stroke-width=\"3\"/>\n<path d=\"m19 92 11-8m47 8-11-8\" stroke=\"#6ca34d\" stroke-width=\"4\"/>\n<path d=\"M18 91 10 99 32 91\" fill=\"#3c7e42\" stroke=\"#111b12\" stroke-width=\"3\"/>\n</svg>"
};
const PRIVACY_POLICY_URL="https://abolfazl260.github.io/doodlegame/privacy.html";

const LANDING_ROUTE_ICONS={
 custom:'<path d="M5 5l14 14m-3-14L5 16m1-11 3 3m6-3 4 4M5 19l4-4m6 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
 local:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 19v-2c0-3 2.2-5 5.5-5s5.5 2 5.5 5v2zm12 0v-2.4c0-1.7-.5-3-1.5-4 3.7-.2 6.5 2 6.5 5V19z" stroke-linejoin="round"/>',
 arenas:'<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16" stroke-linecap="round" stroke-linejoin="round"/>',
 progression:'<rect x="4" y="13" width="4" height="8" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/>',
 settings:'<path d="M10 2h4l.7 2.5 2 .8 2.3-1.2 2.9 2.9-1.2 2.3.8 2L24 12v4l-2.5.7-.8 2 1.2 2.3-2.9 2.9-2.3-1.2-2 .8L14 26h-4l-.7-2.5-2-.8L5 23.9l-2.9-2.9 1.2-2.3-.8-2L0 16v-4l2.5-.7.8-2-1.2-2.3L5 4.1l2.3 1.2 2-.8L10 2z" transform="translate(2 0) scale(.83)"/><circle cx="12" cy="12" r="3.5"/>'
} as const;
function landingRouteIcon(route:keyof typeof LANDING_ROUTE_ICONS):HTMLElement{
 const icon=document.createElement("span");
 icon.className="game-ui__landing-icon";
 icon.setAttribute("aria-hidden","true");
 icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">'+LANDING_ROUTE_ICONS[route]+'</svg>';
 return icon;
}

export class GameUI{
 private onboarding:MobileOnboarding;
 private coach=document.createElement("aside");
 private coachText=document.createElement("p");
 private coachSkip=document.createElement("button");
 private tutorialReplay=document.createElement("button");
 private coachReadyUntil=0;
 private tutorialView="";
 private root=document.createElement("section");
 private mobileControls=document.createElement("div");
 private lanDash=document.createElement("button");
 private p2Controls=document.createElement("div");
 private p2Joystick=document.createElement("div");
 private p2Thumb=document.createElement("div");
 private p2Attack=document.createElement("button");
 private p2WeaponControls=document.createElement("div");
 private p2WeaponName=document.createElement("span");
 private p2Next=document.createElement("button");
 private cancelP2TouchControls:()=>void=()=>{};
 private cancelP2Attack:()=>void=()=>{};
 private joystick=document.createElement("div");
 private joystickThumb=document.createElement("div");
 private mobileAttackButton=document.createElement("button");
 private mobilePauseButton=document.createElement("button");
 private cancelPauseHold:()=>void=()=>{};
 private cancelTouchControls:()=>void=()=>{};
 private cancelActiveTouchAttack:()=>void=()=>{};
 private removeTouchLifecycle:()=>void=()=>{};
 private mobileWeaponSwitcher=document.createElement("div");
 private mobileWeaponName=document.createElement("span");
 private mobileWeaponIndex=document.createElement("small");
 private nextWeaponButton=document.createElement("button");
 private bowPanel=document.createElement("div");
 private bowTitle=document.createElement("strong");
 private bowMeter=document.createElement("div");
 private bowValue=document.createElement("span");
 private help=document.createElement("div");
 private helpContent=document.createElement("div");
 private helpCloseButton=document.createElement("button");
 private helpButton=document.createElement("button");
 private privacy=document.createElement("div");
 private privacyButton=document.createElement("button");
 private privacyTitle=document.createElement("strong");
 private privacyContent=document.createElement("div");
 private privacyLink=document.createElement("a");
 private privacyCloseButton=document.createElement("button");
 private menu=document.createElement("div");
 private menuHeader=document.createElement("div");
 private pauseScrim=document.createElement("div");
 private pauseHeader=document.createElement("header");
 private pauseHeading=document.createElement("div");
 private pauseTitle=document.createElement("h2");
 private pauseSubtitle=document.createElement("p");
 private pauseLanguageButton=document.createElement("button");
 private pauseFooter=document.createElement("div");
 private pauseSettingsButton=document.createElement("button");
 private menuSetupSection=document.createElement("section");
 private menuLead=document.createElement("div");
 private menuSetupTitle=document.createElement("h2");
 private quickModes=document.createElement("div");
 private quickDuelButton=document.createElement("button");
 private quickPvpButton=document.createElement("button");
 private modeDescription=document.createElement("p");
 private matchSummary=document.createElement("p");
 private menuExtras=document.createElement("details");
 private menuProgressDetails=document.createElement("details");
 private menuProgressTitle=document.createElement("summary");
 private menuProgressTabs=document.createElement("div");
 private menuRunTab=document.createElement("button");
 private menuUpgradeTab=document.createElement("button");
 private menuProgressView:"run"|"upgrades"="run";
 private menuExtrasTitle=document.createElement("summary");
 private menuSettings=document.createElement("div");
 private onlineModeButton=document.createElement("button");
 private onlineModeName=document.createElement("span");
 private onlineModeBadge=document.createElement("span");
 private menuStepIndex=0;
 private menuView:"landing"|"setup"|"progression"|"settings"="setup";
 private pendingRunStart:"new"|"continue"|null=null;
 private landing=document.createElement("section");
 private landingDefaults=document.createElement("p");
 private landingQuick=document.createElement("button");
 private landingQuickLabel=document.createElement("strong");
 private landingQuickCopy=document.createElement("span");
 private landingRouteLabels=new Map<string,HTMLElement>();
 private landingLocalHint=document.createElement("small");
 private landingContinue=document.createElement("button");
 private landingRoutes=document.createElement("div");
 private menuHome=document.createElement("button");

 private menuProgress=document.createElement("div");
 private menuModePanel=document.createElement("section");
 private menuArenaPanel=document.createElement("section");
 private menuLoadoutPanel=document.createElement("section");
 private loadoutPlayer:1|2=1;
 private loadoutPlayerTabs=document.createElement("div");
 private loadoutP1Button=document.createElement("button");
 private loadoutP2Button=document.createElement("button");
 private loadoutStatus=document.createElement("p");
 private randomWeaponButton=document.createElement("button");
 private arenaFilter:ArenaCategory="all";
 private arenaFilters=document.createElement("div");
 private arenaEmpty=document.createElement("p");
 private arenaFeatures=new Map<BuiltInArenaId,HTMLElement>();
 private arenaCards=document.createElement("div");
 private extraArenaSection=document.createElement("section");
 private extraArenaHeading=document.createElement("h3");
 private extraArenaRefresh=document.createElement("button");
 private extraArenaList=document.createElement("div");
 private extraArenaFeedback=document.createElement("p");
 private extraCatalog:ArenaListing[]=[];
 private extraBusy=false;
 private extraStatus="";
 private extraActions:Actions;
 private arenaShortcut=document.createElement("button");
 private arenaSelectionSummary=document.createElement("p");
 private characterNames=document.createElement("div");
 private characterPicker=document.createElement("section");
 private characterPickerTitle=document.createElement("h3");
 private characterCards=document.createElement("div");
 private characterLabels=new Map<CharacterId,HTMLElement>();
 private playerNameLabel=document.createElement("label");
 private secondNameLabel=document.createElement("label");
 private playerNameCaption=document.createElement("span");
 private secondNameCaption=document.createElement("span");
 private playerNameInput=document.createElement("input");
 private secondNameInput=document.createElement("input");
 private weaponDetails=document.createElement("details");
 private weaponDetailsTitle=document.createElement("summary");
 private weaponCards=document.createElement("div");
 private stepNextButton=document.createElement("button");
 private stepBackButton=document.createElement("button");
 private pvpHint=document.createElement("div");
 private menuLinks=document.createElement("div");
 private combatSoundButton=document.createElement("button");
 private combatShakeButton=document.createElement("button");
 private updateButton=document.createElement("button");
 private combatSoundEnabled=true;private combatShakeEnabled=true;
 private menuResult=document.createElement("div");
 private pvpResultPanel=document.createElement("div");
 private pvpResultTitle=document.createElement("strong");
 private pvpResultMeta=document.createElement("div");
 private pvpResultScore=document.createElement("div");
 private pvpResultP1=document.createElement("span");
 private pvpResultCenter=document.createElement("span");
 private pvpResultP2=document.createElement("span");
 private pvpScoreHud=document.createElement("div");
 private pvpCountdownLabel=document.createElement("div");
 private pvpNextRoundButton=document.createElement("button");
 private pvpLoadoutButton=document.createElement("button");
 private runPanel=document.createElement("div");
 private runHeading=document.createElement("strong");
 private runProgress=document.createElement("div");
 private runMessage=document.createElement("div");
 private runMedals=document.createElement("div");
 private runControls=document.createElement("div");
 private runNewButton=document.createElement("button");
 private runContinueButton=document.createElement("button");
 private runLeaveButton=document.createElement("button");
 private selectedUpgrade:WeaponId|null=null;
 private startingWeaponTitle=document.createElement("div");
 private title=document.createElement("h1");
 private topHud=document.createElement("div");
 private status=document.createElement("p");
 private playerHealth=document.createElement("div");
 private opponentHealth=document.createElement("div");
 private buttons=document.createElement("div");
 private weaponList=document.createElement("div");
 private weaponPickerPlayer:1|2=1;
 private weaponPickerOpen=false;
 private aimPads=[document.createElement("div"),document.createElement("div")];
 private lastAimDirections:(number|null|undefined)[]=[];
 private cancelAimPointers:(()=>void)[]=[];
 private closeWeaponPicker(){
  this.weaponPickerOpen=false;this.setHidden(this.weaponList,true);
  this.nextWeaponButton.setAttribute("aria-expanded","false");this.p2Next.setAttribute("aria-expanded","false");
 }
 private toggleWeaponPicker(_player:1|2){this.closeWeaponPicker();}
 
  private arenaTitle=document.createElement("div");
 private modeTitle=document.createElement("div");
 private upgradePanel=document.createElement("div");
 private upgradeTitle=document.createElement("strong");
 private upgradeChoices=document.createElement("div");
 private upgradeCardGrid=document.createElement("div");
 private upgradeButton=document.createElement("button");
 private upgradeSummary=document.createElement("span");
 private upgradePointsLabel=document.createElement("span");
 private upgradeHint=document.createElement("span");
 private playerHealthLabel=document.createElement("span");
 private opponentHealthLabel=document.createElement("span");
 private playerHealthName=document.createElement("span");
 private opponentHealthName=document.createElement("span");
 private playerHealthCurrent=document.createElement("span");
 private opponentHealthCurrent=document.createElement("span");
 private languageControl=document.createElement("div");
 private languageLabel=document.createElement("span");
 private languageButton=document.createElement("button");
 private unsubscribe:(()=>void)|null=null;
 private unsubscribeLocale:(()=>void)|null=null;
 private readHud:(()=>HudState)|null=null;
 private hudFrame:number|null=null;
 private currentState=GameState.MENU;
 private lastView:{selectionKey:string;state:GameState;locale:string;arena:ArenaId;mode:GameModeId;weapon:WeaponId;winner:"player"|"opponent"|"draw"|null;upgradePoints:number;upgradedWeapons:readonly WeaponId[];progressKey:string;inRun:boolean;secondWeapon?:WeaponId;playerName?:string;secondPlayerName?:string;localPvP?:boolean;characterId?:CharacterId;opponentCharacterId?:CharacterId}|null=null;
 private lastHealth:{playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;locale:string}|null=null;
 private lastBowPercent=NaN;
 private lastBowCharging=false;
 private lastHill:{player:number;opponent:number;target:number}|null=null;
 private hpFormatter:Intl.NumberFormat|null=null;
 private hpFormatterLocale="";
 private setText(node:HTMLElement,value:string){if(node.textContent!==value)node.textContent=value;}
 private setHidden(node:HTMLElement,hidden:boolean){if(node.hidden!==hidden)node.hidden=hidden;}

 constructor(container:HTMLElement,actions:Actions,private readonly i18n:I18n,storage?:Storage){
  this.onboarding=new MobileOnboarding(storage);
  this.coach.className="game-ui__coach";this.coach.hidden=true;
  this.coachText.setAttribute("role","status");this.coachText.setAttribute("aria-live","polite");
  this.coachSkip.type="button";this.coachSkip.onclick=()=>{this.onboarding.skip();this.coach.hidden=true;this.joystick.classList.remove("tutorial-target");this.mobileAttackButton.classList.remove("tutorial-target");};
  this.coach.append(this.coachText,this.coachSkip);
  this.tutorialReplay.type="button";this.tutorialReplay.onclick=()=>{this.onboarding.replay();this.help.hidden=true;this.helpButton.focus();};
  this.help.append(this.tutorialReplay);
  this.extraActions=actions;
  if(actions.quickPlay)this.menuView="landing";
  this.landing.className="game-ui__landing";this.landing.hidden=true;
  this.landingQuick.type="button";this.landingQuick.dataset.route="quick";this.landingQuick.onclick=()=>this.openMenuRoute("custom");
  this.landingQuickLabel.className="game-ui__landing-quick-label";
  this.landingQuickCopy.className="game-ui__landing-quick-copy";
  this.landingDefaults.className="game-ui__landing-defaults";
  this.landingQuickCopy.append(this.landingQuickLabel,this.landingDefaults);
  this.landingQuick.append(this.landingQuickCopy);
  this.landingContinue.type="button";this.landingContinue.dataset.route="continue";this.landingContinue.onclick=()=>this.prepareRunStart("continue");
  this.landingRoutes.className="game-ui__landing-routes";
  for(const route of ["custom","local","arenas","progression","settings"] as const){
   const button=document.createElement("button"),label=document.createElement("span");
   button.type="button";button.dataset.route=route;button.onclick=()=>this.openMenuRoute(route);
   label.className="game-ui__landing-route-label";this.landingRouteLabels.set(route,label);
   if(route==="local"){this.landingLocalHint.className="game-ui__landing-local-hint";label.append(this.landingLocalHint);}
   button.append(landingRouteIcon(route),label);
   this.landingRoutes.append(button);
  }
  this.landing.append(this.landingQuick,this.landingContinue,this.landingRoutes);
  this.menuHome.type="button";this.menuHome.dataset.menuHome="true";this.menuHome.hidden=true;this.menuHome.onclick=()=>this.openMenuRoute("home");
  this.root.className="game-ui";
  // The scrim is a separate sibling of the dialog so backdrop blur/dimming
  // never affects text, focus rings or touch targets inside the pause menu.
  this.pauseScrim.className="game-ui__pause-scrim";
  this.pauseScrim.hidden=true;
  this.pauseScrim.setAttribute("aria-hidden","true");
  this.pauseHeader.className="game-ui__pause-header";
  this.pauseHeader.hidden=true;
  this.pauseHeading.className="game-ui__pause-heading";
  this.pauseTitle.className="game-ui__pause-title";
  this.pauseTitle.id="game-pause-title";
  this.pauseSubtitle.className="game-ui__pause-subtitle";
  this.pauseLanguageButton.type="button";
  this.pauseLanguageButton.className="game-ui__pause-language";
  this.pauseLanguageButton.onclick=()=>this.i18n.setLocale(this.i18n.locale==="fa"?"en":"fa");
  this.pauseHeading.append(this.pauseTitle,this.pauseSubtitle);
  this.pauseHeader.append(this.pauseHeading,this.pauseLanguageButton);
  this.pauseFooter.className="game-ui__pause-footer";
  this.pauseFooter.hidden=true;
  this.pauseSettingsButton.type="button";
  this.pauseSettingsButton.className="game-ui__pause-settings";
  this.pauseSettingsButton.onclick=()=>this.helpButton.click();
  this.pauseFooter.append(this.pauseSettingsButton);

  this.languageControl.className="game-ui__language";
  this.languageButton.type="button";
  this.languageButton.onclick=()=>this.i18n.setLocale(this.i18n.locale==="fa"?"en":"fa");
  this.languageControl.append(this.languageLabel,this.languageButton);

  this.mobileControls.className="game-ui__mobile-controls";
  this.p2Controls.className="game-ui__p2-controls";
  this.p2Joystick.className="game-ui__p2-joystick";
  this.p2Thumb.className="game-ui__p2-thumb";
  this.p2Joystick.append(this.p2Thumb);
  this.p2Attack.className="game-ui__p2-attack";
  this.p2Attack.type="button";
  this.p2WeaponControls.className="game-ui__p2-weapons";
  this.p2Next.type="button";this.p2Next.className="game-ui__weapon-toggle";
  this.p2Next.append(this.p2WeaponName);
  this.p2Next.setAttribute("aria-expanded","false");
  this.p2WeaponControls.append(this.p2Next);
  this.p2Controls.append(this.p2Joystick,this.p2Attack);
  this.p2Controls.hidden=true;
  this.p2Next.onclick=()=>this.toggleWeaponPicker(2);
  this.joystick.className="game-ui__joystick";
  this.joystickThumb.className="game-ui__joystick-thumb";
  this.mobileAttackButton.type="button";
  this.mobileAttackButton.className="game-ui__mobile-button game-ui__mobile-button--attack";
  this.mobilePauseButton.type="button";
  this.mobilePauseButton.className="game-ui__mobile-pause";
  this.mobilePauseButton.textContent="Ⅱ";
  this.mobilePauseButton.hidden=true;
  // A quick tap/click never pauses the match. Both touch and mouse must stay
  // pressed for two seconds; focus/visibility changes cancel the pending hold.
  const pauseHoldMs=2000;
  let pausePointer:number|null=null,pauseKey:string|null=null;
  let pauseStartX=0,pauseStartY=0;
  let pauseTimer:ReturnType<typeof setTimeout>|null=null;
  const clearPauseHold=()=>{
   if(pauseTimer!==null){clearTimeout(pauseTimer);pauseTimer=null;}
   this.mobilePauseButton.classList.remove("holding");
   const pointer=pausePointer;
   pausePointer=null;pauseKey=null;
   if(pointer!==null&&this.mobilePauseButton.hasPointerCapture?.(pointer))
    this.mobilePauseButton.releasePointerCapture(pointer);
  };
  this.cancelPauseHold=clearPauseHold;
  const startPauseHold=()=>{
   if(this.currentState!==GameState.PLAYING||this.mobilePauseButton.hidden)return;
   this.mobilePauseButton.classList.add("holding");
   pauseTimer=setTimeout(()=>{
    if(this.currentState!==GameState.PLAYING){clearPauseHold();return;}
    clearPauseHold();
    actions.pause();
   },pauseHoldMs);
  };
  this.mobilePauseButton.addEventListener("pointerdown",event=>{
   if(pauseTimer!==null||pausePointer!==null||pauseKey!==null||event.button!==0)return;
   event.preventDefault();
   pausePointer=event.pointerId;
   pauseStartX=event.clientX;pauseStartY=event.clientY;
   try{this.mobilePauseButton.setPointerCapture(event.pointerId);}
   catch{clearPauseHold();return;}
   startPauseHold();
  });
  this.mobilePauseButton.addEventListener("pointermove",event=>{
   if(event.pointerId!==pausePointer)return;
   if(Math.hypot(event.clientX-pauseStartX,event.clientY-pauseStartY)>16)clearPauseHold();
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture","pointerleave"] as const)
   this.mobilePauseButton.addEventListener(type,event=>{
    if((event as PointerEvent).pointerId===pausePointer)clearPauseHold();
   });
  this.mobilePauseButton.addEventListener("keydown",event=>{
   if(event.key!=="Enter"&&event.key!==" ")return;
   event.preventDefault();event.stopPropagation();
   if(event.repeat||pauseTimer!==null||pausePointer!==null||pauseKey!==null)return;
   pauseKey=event.key;startPauseHold();
  });
  this.mobilePauseButton.addEventListener("keyup",event=>{
   if(event.key!=="Enter"&&event.key!==" ")return;
   event.preventDefault();event.stopPropagation();
   if(event.key===pauseKey)clearPauseHold();
  });
  this.mobilePauseButton.addEventListener("click",event=>{
   event.preventDefault();event.stopPropagation();
  });
  this.mobilePauseButton.addEventListener("contextmenu",event=>event.preventDefault());
  this.mobileWeaponSwitcher.className="game-ui__mobile-weapon-switcher";
  this.mobileWeaponSwitcher.setAttribute("role","group");
  this.mobileWeaponName.className="game-ui__mobile-weapon-name";
  this.mobileWeaponName.dir="auto";
  this.mobileWeaponName.setAttribute("aria-live","polite");
  this.mobileWeaponName.setAttribute("aria-atomic","true");
  this.mobileWeaponIndex.className="game-ui__mobile-weapon-index";
  const weaponDisplay=document.createElement("div");
  weaponDisplay.className="game-ui__mobile-weapon-display";
  weaponDisplay.append(this.mobileWeaponName,this.mobileWeaponIndex);
  this.nextWeaponButton.type="button";
  this.nextWeaponButton.className="game-ui__weapon-toggle";
  this.nextWeaponButton.setAttribute("aria-expanded","false");
  this.nextWeaponButton.append(weaponDisplay);
  this.mobileWeaponSwitcher.append(this.nextWeaponButton);
  this.joystick.append(this.joystickThumb);
  this.mobileControls.append(this.joystick,this.mobileAttackButton,this.p2Controls);
  this.help.className="game-ui__help game-ui__menu-dialog";
  this.help.hidden=true;
  this.help.setAttribute("role","dialog");
  this.help.setAttribute("aria-modal","true");
  this.help.addEventListener("keydown",event=>{
   if(event.key!=="Tab")return;
   const targets=Array.from(this.help.querySelectorAll<HTMLElement>("summary,button,a[href]")).filter(n=>n.getClientRects().length>0);
   const first=targets[0],last=targets.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  this.helpContent.className="game-ui__help-content";
  this.helpCloseButton.type="button";
  this.helpCloseButton.className="game-ui__dialog-close";
  this.help.append(this.helpContent,this.tutorialReplay,this.helpCloseButton);

  this.privacy.className="game-ui__privacy game-ui__menu-dialog";
  this.privacy.hidden=true;
  this.privacy.setAttribute("role","dialog");
  this.privacy.setAttribute("aria-modal","true");
  this.privacyContent.className="game-ui__privacy-content";
  this.privacyLink.href=PRIVACY_POLICY_URL;
  this.privacyLink.target="_blank";
  this.privacyLink.rel="noopener noreferrer";
  this.privacyCloseButton.type="button";
  this.privacyCloseButton.className="game-ui__dialog-close";
  this.privacyCloseButton.onclick=()=>{this.privacy.hidden=true;this.privacyButton.focus();};
  this.privacy.append(this.privacyTitle,this.privacyContent,this.privacyLink,this.privacyCloseButton);

  this.topHud.className="game-ui__top-hud";
  this.status.className="game-ui__status";
  this.status.setAttribute("aria-live","off");
  this.playerHealth.className="health-bar health-bar--player";
  this.opponentHealth.className="health-bar health-bar--opponent";
  this.playerHealthLabel.className="health-label";
  this.opponentHealthLabel.className="health-label";
  this.playerHealthCurrent.className="health-label__current";
  this.opponentHealthCurrent.className="health-label__current";
  this.playerHealthName.className="health-label__name";
  this.opponentHealthName.className="health-label__name";
  this.playerHealthName.dir="auto";this.opponentHealthName.dir="auto";
  this.playerHealthLabel.append(this.playerHealthName,this.playerHealthCurrent);
  this.opponentHealthLabel.append(this.opponentHealthName,this.opponentHealthCurrent);
  this.playerHealth.append(this.playerHealthLabel);
  this.opponentHealth.append(this.opponentHealthLabel);

  this.buttons.className="game-ui__controls";
  this.weaponList.className="game-ui__weapon-list";
  this.menu.className="game-ui__menu";
  this.menuHeader.className="game-ui__menu-header";
  this.menuSetupSection.className="game-ui__menu-setup";
  this.menuLead.className="game-ui__menu-lead";
  this.menuLead.setAttribute("tabindex","-1");
  this.menuSetupTitle.className="game-ui__menu-setup-title";
  this.quickModes.className="game-ui__quick-modes";
  this.quickModes.setAttribute("role","group");
  this.quickDuelButton.type="button";
  this.quickPvpButton.type="button";
  this.quickDuelButton.className="game-ui__quick-mode";
  this.quickPvpButton.className="game-ui__quick-mode";
  this.quickDuelButton.dataset.quickMode="duel";
  this.quickPvpButton.dataset.quickMode="local-pvp";
  this.quickDuelButton.onclick=()=>actions.playerCountSelect?actions.playerCountSelect(1):actions.modeSelect("duel");
  this.quickPvpButton.onclick=()=>actions.playerCountSelect?actions.playerCountSelect(2):actions.modeSelect("local-pvp");
  this.quickModes.append(this.quickDuelButton,this.quickPvpButton);
  this.modeDescription.className="game-ui__mode-description";
  this.matchSummary.className="game-ui__match-summary";
  this.matchSummary.setAttribute("aria-live","polite");
  this.matchSummary.setAttribute("aria-atomic","true");
  this.menuProgressDetails.className="game-ui__menu-progress-details";
  this.menuProgressTitle.className="game-ui__menu-progress-title";
  this.menuProgressTabs.className="game-ui__menu-progress-tabs";
  this.menuProgressTabs.setAttribute("role","group");
  this.menuRunTab.type="button";
  this.menuRunTab.className="game-ui__menu-progress-tab";
  this.menuRunTab.dataset.view="run";
  this.menuRunTab.onclick=()=>this.selectProgressTab("run");
  this.menuUpgradeTab.type="button";
  this.menuUpgradeTab.className="game-ui__menu-progress-tab";
  this.menuUpgradeTab.dataset.view="upgrades";
  this.menuUpgradeTab.onclick=()=>this.selectProgressTab("upgrades");
  this.menuProgressTabs.append(this.menuRunTab,this.menuUpgradeTab);
  this.menuProgressDetails.append(this.menuProgressTitle,this.menuProgressTabs);
  this.menuExtras.className="game-ui__menu-extras";
  this.menuExtrasTitle.className="game-ui__menu-extras-title";
  this.menuExtras.append(this.menuExtrasTitle);
  this.menuSettings.className="game-ui__menu-settings game-ui__mode-grid";
  this.menuSettings.setAttribute("role","group");
  this.pvpHint.className="game-ui__pvp-hint";this.pvpHint.hidden=true;
  this.menuLinks.className="game-ui__menu-links";
  this.menuResult.className="game-ui__menu-result";this.menuResult.hidden=true;
  this.pvpResultPanel.className="game-ui__pvp-result";
  this.pvpResultTitle.className="game-ui__pvp-result-title";
  this.pvpResultMeta.className="game-ui__pvp-result-meta";
  this.pvpResultScore.className="game-ui__pvp-result-score";
  this.pvpResultP1.className="game-ui__pvp-result-player";
  this.pvpResultCenter.className="game-ui__pvp-result-center";
  this.pvpResultP2.className="game-ui__pvp-result-player";
  this.pvpResultScore.append(this.pvpResultP1,this.pvpResultCenter,this.pvpResultP2);
  this.pvpResultPanel.append(this.pvpResultMeta,this.pvpResultScore,this.pvpResultTitle);
  this.pvpScoreHud.className="game-ui__pvp-score-hud";this.pvpScoreHud.hidden=true;
  this.pvpCountdownLabel.className="game-ui__pvp-countdown";this.pvpCountdownLabel.hidden=true;
  this.pvpCountdownLabel.setAttribute("role","status");
  this.pvpCountdownLabel.setAttribute("aria-live","polite");
  this.modeTitle.className="game-ui__section-title";
  this.arenaTitle.className="game-ui__section-title";
  this.arenaTitle.setAttribute("tabindex","-1");
  this.startingWeaponTitle.className="game-ui__section-title";
  this.menuProgress.className="game-ui__menu-progress";
  this.menuProgress.setAttribute("aria-live","polite");
  this.menuModePanel.className="game-ui__menu-mode-panel";
  this.menuArenaPanel.className="game-ui__menu-arena-panel";this.menuArenaPanel.hidden=true;
  this.menuLoadoutPanel.className="game-ui__menu-loadout-panel";this.menuLoadoutPanel.hidden=true;
  this.loadoutPlayerTabs.className="game-ui__loadout-player-tabs";this.loadoutPlayerTabs.setAttribute("role","group");
  for(const [button,player] of [[this.loadoutP1Button,1],[this.loadoutP2Button,2]] as const){
   button.type="button";button.className="game-ui__loadout-player-tab";
   button.onclick=()=>{this.loadoutPlayer=player;this.syncWizard(this.currentState,this.readHud?.()??null);};
   this.loadoutPlayerTabs.append(button);
  }
  this.loadoutStatus.className="game-ui__loadout-status";this.loadoutStatus.setAttribute("role","status");
  this.arenaCards.className="game-ui__arena-grid";
  this.extraArenaSection.className="game-ui__downloadable-arenas";
  this.extraArenaHeading.className="game-ui__section-title";
  this.extraArenaRefresh.className="game-ui__download-refresh";this.extraArenaRefresh.type="button";
  this.extraArenaRefresh.onclick=()=>{void this.loadExtraCatalog();};
  this.extraArenaList.className="game-ui__download-grid";
  this.extraArenaList.tabIndex=0;
  this.extraArenaList.setAttribute("role","region");
  this.extraArenaList.setAttribute("aria-label","Downloadable arena gallery");
  this.extraArenaFeedback.className="game-ui__download-feedback";
  this.extraArenaFeedback.setAttribute("aria-live","polite");
  this.extraArenaSection.append(this.extraArenaHeading,this.extraArenaRefresh,this.extraArenaFeedback,this.extraArenaList);
  this.arenaShortcut.className="game-ui__arena-shortcut";
  this.arenaShortcut.type="button";
  this.arenaShortcut.onclick=()=>this.changeMenuStep(1);
  this.arenaSelectionSummary.className="game-ui__arena-selection-summary";
  this.arenaSelectionSummary.setAttribute("aria-live","polite");
  this.arenaSelectionSummary.setAttribute("aria-atomic","true");
  this.characterNames.className="game-ui__character-names";
  for(const [label,caption,input,player] of [
   [this.playerNameLabel,this.playerNameCaption,this.playerNameInput,1],
   [this.secondNameLabel,this.secondNameCaption,this.secondNameInput,2]
  ] as const){
   label.className="game-ui__character-name-field";
   caption.className="game-ui__character-name-caption";
   input.className="game-ui__character-name-input";
   input.type="text";input.maxLength=24;input.autocomplete="off";input.spellcheck=false;
   input.dir="auto";
   input.oninput=()=>actions.setCharacterName?.(player,input.value);
   input.onchange=()=>{
    actions.setCharacterName?.(player,input.value);
    const hud=this.readHud?.();
    if(hud)input.value=player===1?hud.playerName??"":hud.secondPlayerName??"";
   };
   label.append(caption,input);this.characterNames.append(label);
  }
  this.secondNameLabel.hidden=true;
  this.characterPicker.className="game-ui__character-picker";
  this.characterPickerTitle.className="game-ui__character-picker-title";
  this.characterCards.className="game-ui__character-cards";
  this.characterCards.setAttribute("role","group");
  for(const id of CHARACTER_IDS){
   const card=document.createElement("button");
   card.type="button";card.className="game-ui__character-card";
   card.dataset.character=id;card.setAttribute("aria-pressed","false");
   const portrait=document.createElement("span");
   portrait.className="game-ui__character-portrait game-ui__character-portrait--"+id;
   portrait.setAttribute("aria-hidden","true");
   // Weapon-free reference-matched portraits with distinct clothing and headgear.
   portrait.innerHTML=CHARACTER_PORTRAITS[id];
   const copy=document.createElement("span");copy.className="game-ui__character-copy";
   const name=document.createElement("strong");name.className="game-ui__character-name";
   copy.append(name);card.append(portrait,copy);
   this.characterLabels.set(id,name);
   card.onclick=()=>{if(this.loadoutPlayer===2)actions.player2CharacterSelect?.(id);else actions.characterSelect?.(id);};
   this.characterCards.append(card);
  }
  this.characterPicker.append(this.characterPickerTitle,this.characterCards);
  this.weaponCards.className="game-ui__weapon-grid";
  this.weaponDetails.className="game-ui__weapon-details";
  this.weaponDetailsTitle.className="game-ui__weapon-details-title";
  this.weaponDetails.append(this.weaponDetailsTitle,this.startingWeaponTitle,this.weaponCards);
  for(const id of MODE_IDS){
   const card=document.createElement("button");
   card.type="button";card.className="game-ui__mode-card";
   card.dataset.mode=id;
   card.setAttribute("aria-pressed","false");
   card.onclick=()=>actions.modeSelect(id);
   this.menuSettings.append(card);
  }
  // This is a UI-only placeholder, not a GameModeId or a playable session.
  this.onlineModeButton.type="button";
  this.onlineModeButton.className="game-ui__mode-card game-ui__mode-card--coming-soon";
  this.onlineModeButton.dataset.mode="online";
  this.onlineModeButton.disabled=true;
  this.onlineModeButton.setAttribute("aria-disabled","true");
  this.onlineModeName.className="game-ui__online-mode-name";
  this.onlineModeBadge.className="game-ui__coming-soon-badge";
  this.onlineModeButton.append(this.onlineModeName,this.onlineModeBadge);
  this.menuSettings.append(this.onlineModeButton);
  for(const [index,id] of ARENA_IDS.entries()){
   const theme=getArenaTheme(id),card=document.createElement("button");
   card.type="button";card.className="game-ui__arena-card";
   card.dataset.arena=id;
   card.setAttribute("aria-pressed","false");
   card.setAttribute("aria-label",id);
   card.style.setProperty("--card-accent",theme.accent);
   card.style.setProperty("--card-secondary",theme.secondary);
   const ordinal=document.createElement("span");
   ordinal.className="game-ui__arena-number";
   ordinal.textContent=String(index+1).padStart(2,"0");
   const label=document.createElement("strong");
   label.className="game-ui__arena-name";
   const preview=document.createElement("img");preview.className="game-ui__arena-preview";preview.alt="";preview.setAttribute("aria-hidden","true");preview.width=240;preview.height=96;preview.src=arenaPreviewUrl(id as BuiltInArenaId);preview.onerror=()=>{preview.hidden=true;};
   const feature=document.createElement("span");feature.className="game-ui__arena-feature";this.arenaFeatures.set(id as BuiltInArenaId,feature);
   card.append(ordinal,label,preview,feature);
   card.onclick=()=>actions.arenaSelect(id);
   this.arenaCards.append(card);
  }
  this.arenaFilters.className="game-ui__arena-filters";this.arenaFilters.setAttribute("role","group");
  this.arenaEmpty.hidden=true;
  for(const category of ARENA_CATEGORY_IDS){
   if(category!=="all"&&!ARENA_IDS.some(id=>arenaCategories(id as BuiltInArenaId).includes(category)))continue;
   const button=document.createElement("button");button.type="button";button.dataset.arenaCategory=category;
   button.onclick=()=>{this.arenaFilter=category;this.filterArenas();};this.arenaFilters.append(button);
  }
  this.filterArenas();
  for(const id of WEAPON_IDS){
   const card=document.createElement("button");
   card.type="button";card.className="game-ui__loadout-card";
   card.dataset.startingWeapon=id;
   card.setAttribute("aria-pressed","false");
   card.onclick=()=>{if(this.loadoutPlayer===2)actions.player2StartingWeapon?.(id);else actions.selectStartingWeapon(id);};
   this.weaponCards.append(card);
  }
  this.randomWeaponButton.type="button";this.randomWeaponButton.className="game-ui__random-loadout";
   this.randomWeaponButton.onclick=()=>actions.randomStartingWeapon?.(this.loadoutPlayer);
   this.weaponCards.append(this.randomWeaponButton);
   // Name inputs belong to player setup, not the map selection screen.
  this.menuModePanel.append(this.menuSetupTitle,this.quickModes,this.characterNames,this.modeTitle,this.menuSettings,this.modeDescription,this.pvpHint,this.arenaShortcut);
  this.menuArenaPanel.append(this.arenaTitle,this.arenaSelectionSummary,this.arenaFilters,this.arenaEmpty,this.arenaCards,this.extraArenaSection);
   this.menuLoadoutPanel.append(this.loadoutPlayerTabs,this.characterPicker,this.weaponDetails,this.loadoutStatus,this.matchSummary);
  this.menuHeader.append(this.title,this.languageControl);

  this.upgradePanel.className="game-ui__upgrade-panel game-ui__upgrade-panel--compact";
  this.upgradeChoices.className="game-ui__upgrade-choices";
  this.upgradePointsLabel.className="game-ui__upgrade-points";
  this.upgradeHint.className="game-ui__upgrade-hint";
  this.upgradeSummary.className="game-ui__upgrade-summary";
  this.upgradeCardGrid.className="game-ui__upgrade-card-grid";
  this.upgradeCardGrid.setAttribute("role","group");
  this.upgradeButton.type="button";
  this.upgradeButton.onclick=()=>{
   if(!this.upgradeButton.disabled&&this.selectedUpgrade)actions.upgradeWeapon(this.selectedUpgrade);
  };
  for(const id of WEAPON_IDS){
   const card=document.createElement("button");
   card.type="button";card.className="game-ui__upgrade-card";
   card.dataset.upgradeWeapon=id;
   card.setAttribute("aria-pressed","false");
   card.onclick=()=>{
    if(card.disabled)return;
    this.selectedUpgrade=id;
    for(const item of this.upgradeCardGrid.children){
     (item as HTMLButtonElement).setAttribute("aria-pressed",String((item as HTMLButtonElement).dataset.upgradeWeapon===id));
    }
    this.setText(this.upgradeHint,(this.i18n.messages.upgrades[id]?.description??""));
   };
   this.upgradeCardGrid.append(card);
  }
  this.upgradeChoices.append(this.upgradeCardGrid,this.upgradeButton);
  this.upgradePanel.append(this.upgradeTitle,this.upgradePointsLabel,this.upgradeChoices,this.upgradeHint,this.upgradeSummary);

  this.bowPanel.className="game-ui__bow-panel";
  this.bowMeter.className="game-ui__bow-meter";
  this.bowValue.className="game-ui__bow-value";

  for(const id of WEAPON_IDS){
   const item=document.createElement("button");
   item.type="button";
   item.dataset.weapon=id;
   item.onclick=()=>{
    if(this.weaponPickerPlayer===2)actions.player2WeaponSelect?.(id);else actions.weaponSelect(id);
    this.closeWeaponPicker();
   };
   this.weaponList.append(item);
  }
  this.stepBackButton.type="button";this.stepNextButton.type="button";
  this.stepBackButton.dataset.action="back";this.stepNextButton.dataset.action="next";
  this.stepBackButton.onclick=()=>this.changeMenuStep(this.menuStepIndex-1);
  this.stepNextButton.onclick=()=>this.changeMenuStep(this.menuStepIndex+1);
  this.buttons.append(this.stepBackButton,this.stepNextButton);
  const uiActions:[UiAction,()=>void][]=[["start",actions.start],["pause",actions.pause],["resume",actions.resume],["restart",actions.restart]];
  if(actions.stopToMenu)uiActions.push(["menu",actions.stopToMenu]);
  this.pvpNextRoundButton.type="button";this.pvpNextRoundButton.className="game-ui__pvp-next-round";
  this.pvpNextRoundButton.dataset.action="next-pvp-round";this.pvpNextRoundButton.hidden=true;
  this.pvpNextRoundButton.onclick=()=>actions.nextPvpRound?.();
  this.pvpLoadoutButton.type="button";this.pvpLoadoutButton.className="game-ui__pvp-loadout";
  this.pvpLoadoutButton.dataset.action="change-pvp-loadout";this.pvpLoadoutButton.hidden=true;
  this.pvpLoadoutButton.onclick=()=>actions.changePvpLoadout?.();
  for(const [action,fn] of uiActions){
   const button=document.createElement("button");
   button.type="button";
   button.dataset.action=action;
   button.onclick=fn;
   this.buttons.append(button);
  }

  this.buttons.append(this.pvpNextRoundButton,this.pvpLoadoutButton);
  this.helpButton.type="button";
  this.helpButton.dataset.help="true";
  this.helpButton.onclick=()=>{
   this.privacy.hidden=true;
   this.help.hidden=false;
   this.helpCloseButton.focus();
  };
  this.helpCloseButton.onclick=()=>{this.help.hidden=true;(this.currentState===GameState.PAUSED?this.pauseSettingsButton:this.helpButton).focus();};

  this.privacyButton.type="button";
  this.privacyButton.dataset.privacy="true";
  this.privacyButton.onclick=()=>{
   this.help.hidden=true;
   this.privacy.hidden=false;
   this.privacyCloseButton.focus();
  };
  this.root.addEventListener("keydown",event=>{
   if(event.key!=="Escape")return;
   if(this.weaponPickerOpen){event.preventDefault();event.stopPropagation();this.closeWeaponPicker();return;}
   if(!this.help.hidden){event.preventDefault();event.stopPropagation();this.helpCloseButton.click();}
   else if(!this.privacy.hidden){event.preventDefault();event.stopPropagation();this.privacyCloseButton.click();}
  });

  this.bowMeter.innerHTML="<span></span>";
  this.bowPanel.append(this.bowTitle,this.bowMeter,this.bowValue);

  const haptic=(duration=10)=>{if(typeof navigator!=="undefined"&&"vibrate" in navigator)navigator.vibrate(duration);};
  let joystickPointer=-1;
  const updateJoystick=(event:PointerEvent)=>{
   const local=gamePointerInElement(this.joystick,event);
   const width=this.joystick.clientWidth||this.joystick.getBoundingClientRect().width;
   const height=this.joystick.clientHeight||this.joystick.getBoundingClientRect().height;
   let dx=local.x-width/2,dy=local.y-height/2;
   const max=Math.max(1,Math.min(width,height)/2-12),distance=Math.hypot(dx,dy);
   if(distance>max){dx=dx/distance*max;dy=dy/distance*max;}
   this.joystickThumb.style.transform="translate(calc(-50% + "+dx+"px), calc(-50% + "+dy+"px))";
   actions.setTouchMove(dx/max,dy/max);
  };
  this.joystick.addEventListener("pointerdown",event=>{if(joystickPointer!==-1)return;event.preventDefault();joystickPointer=event.pointerId;this.joystick.classList.add("active");this.joystick.setPointerCapture(event.pointerId);updateJoystick(event);});
  this.joystick.addEventListener("pointermove",event=>{if(event.pointerId===joystickPointer)updateJoystick(event);});
  const releaseJoystick=(event:PointerEvent)=>{
   if(event.pointerId!==joystickPointer)return;
   joystickPointer=-1;
   this.joystick.classList.remove("active");
   this.joystickThumb.style.transform="translate(-50%,-50%)";
   actions.setTouchMove(0,0);
  };
  this.joystick.addEventListener("pointerup",releaseJoystick);
  this.joystick.addEventListener("pointercancel",releaseJoystick);
  this.joystick.addEventListener("lostpointercapture",releaseJoystick);
  this.nextWeaponButton.disabled=true;this.nextWeaponButton.onclick=()=>{if(this.readHud?.().lanPlayer)actions.weaponNext();};
  // A captured pointer owns ATTACK independently of the movement joystick.
  // Missile gestures fire only on pointerup; cancellation never launches a missile.
  let attackPointer=-1;
  let attackWeapon:WeaponId|null=null;
  let startX=0,startY=0,attackAt=0,attackStarted=false,grabTriggered=false;
  let attackTimer:ReturnType<typeof setTimeout>|null=null;
  const clearAttack=()=>{
   if(attackTimer!==null){clearTimeout(attackTimer);attackTimer=null;}
   const id=attackPointer;
   attackPointer=-1;
   attackWeapon=null;attackStarted=false;grabTriggered=false;
   if(id!==-1&&this.mobileAttackButton.hasPointerCapture?.(id))this.mobileAttackButton.releasePointerCapture(id);
  };
  const cancelAttack=()=>{
   if(attackPointer===-1)return;
   const wasStarted=attackStarted;
   clearAttack();
   if(wasStarted)actions.touchAttackCancel();
  };
  const cancelControls=()=>{
   this.cancelPauseHold();
   cancelAttack();
   this.cancelP2TouchControls();
   for(const cancel of this.cancelAimPointers)cancel();
   if(joystickPointer!==-1){
    const id=joystickPointer;
    joystickPointer=-1;
    this.joystick.classList.remove("active");
    this.joystickThumb.style.transform="translate(-50%,-50%)";
    actions.setTouchMove(0,0);
    if(this.joystick.hasPointerCapture?.(id))this.joystick.releasePointerCapture(id);
   }
  };
  this.cancelTouchControls=cancelControls;
  this.cancelActiveTouchAttack=cancelAttack;
  // Independent pointer ownership: P2 never releases or cancels P1 or the other joystick.
  let p2StickPointer=-1,p2AttackPointer=-1;
  const moveP2=(event:PointerEvent)=>{
   const local=gamePointerInElement(this.p2Joystick,event);
   const width=this.p2Joystick.clientWidth||this.p2Joystick.getBoundingClientRect().width;
   const height=this.p2Joystick.clientHeight||this.p2Joystick.getBoundingClientRect().height;
   let dx=local.x-width/2,dy=local.y-height/2;
   const limit=Math.max(1,Math.min(width,height)/2-12);
   const len=Math.hypot(dx,dy);
   if(len>limit){dx=dx/len*limit;dy=dy/len*limit;}
   this.p2Thumb.style.transform="translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px))";
   actions.setPlayer2TouchMove?.(dx/limit,dy/limit);
  };
  const releaseP2Stick=(event:PointerEvent)=>{
   if(event.pointerId!==p2StickPointer)return;
   p2StickPointer=-1;this.p2Joystick.classList.remove("active");
   this.p2Thumb.style.transform="translate(-50%,-50%)";
   actions.setPlayer2TouchMove?.(0,0);
   if(this.p2Joystick.hasPointerCapture?.(event.pointerId))this.p2Joystick.releasePointerCapture(event.pointerId);
  };
  this.p2Joystick.addEventListener("pointerdown",event=>{
   if(p2StickPointer!==-1||this.currentState!==GameState.PLAYING)return;
   event.preventDefault();
   p2StickPointer=event.pointerId;
   try{this.p2Joystick.setPointerCapture(event.pointerId);}
   catch{p2StickPointer=-1;return;}
   this.p2Joystick.classList.add("active");moveP2(event);
  });
  this.p2Joystick.addEventListener("pointermove",event=>{
   if(event.pointerId===p2StickPointer)moveP2(event);
  });
  for(const kind of ["pointerup","pointercancel","lostpointercapture"])
   this.p2Joystick.addEventListener(kind,event=>releaseP2Stick(event as PointerEvent));
  let p2StartX=0,p2StartY=0,p2StartAt=0,p2Started=false,p2Grabbed=false;
  let p2Timer:ReturnType<typeof setTimeout>|null=null;
  const clearP2Attack=()=>{
   if(p2Timer!==null){clearTimeout(p2Timer);p2Timer=null;}
   const id=p2AttackPointer;p2AttackPointer=-1;
   p2Started=false;p2Grabbed=false;
   if(id!==-1&&this.p2Attack.hasPointerCapture?.(id))this.p2Attack.releasePointerCapture(id);
  };
  const cancelP2Attack=()=>{
   if(p2AttackPointer===-1)return;
   const began=p2Started;clearP2Attack();
   if(began)actions.player2AttackCancel?.();
  };
  this.cancelP2Attack=cancelP2Attack;
  this.p2Attack.addEventListener("pointerdown",event=>{
   if(p2AttackPointer!==-1||this.currentState!==GameState.PLAYING)return;
   if(this.readHud?.().winner!==null)return;
   event.preventDefault();p2AttackPointer=event.pointerId;
   p2StartX=event.clientX;p2StartY=event.clientY;p2StartAt=Date.now();
   try{this.p2Attack.setPointerCapture(event.pointerId);}
   catch{p2AttackPointer=-1;return;}
   if(this.readHud?.().secondWeapon!=="missile")p2Timer=setTimeout(()=>{
    p2Timer=null;
    if(p2AttackPointer===event.pointerId&&!p2Grabbed&&this.currentState===GameState.PLAYING){
     p2Started=true;actions.player2AttackStart?.();
    }
   },155);
  });
  this.p2Attack.addEventListener("pointermove",event=>{
   if(event.pointerId!==p2AttackPointer||p2Started||p2Grabbed)return;
   if(grabGesture(p2StartX,p2StartY,event.clientX,event.clientY,Date.now()-p2StartAt)){
    p2Grabbed=true;
    if(p2Timer!==null){clearTimeout(p2Timer);p2Timer=null;}
    actions.player2Grab?.();haptic(20);
   }
  });
  this.p2Attack.addEventListener("pointerup",event=>{
   if(event.pointerId!==p2AttackPointer)return;
   event.preventDefault();
   const valid=this.currentState===GameState.PLAYING&&this.readHud?.().winner===null;
   const swiped=p2Grabbed||(!p2Started&&grabGesture(p2StartX,p2StartY,event.clientX,event.clientY,Date.now()-p2StartAt));
   const began=p2Started,alreadyGrabbed=p2Grabbed;clearP2Attack();
   if(!valid){if(began)actions.player2AttackCancel?.();}
   else if(swiped){if(!alreadyGrabbed)actions.player2Grab?.();}
   else{if(!began)actions.player2AttackStart?.();actions.player2AttackEnd?.();}
  });
  for(const kind of ["pointercancel","lostpointercapture"])
   this.p2Attack.addEventListener(kind,event=>{
    if((event as PointerEvent).pointerId===p2AttackPointer)cancelP2Attack();
   });
  this.cancelP2TouchControls=()=>{
   cancelP2Attack();
   if(p2StickPointer!==-1)releaseP2Stick({pointerId:p2StickPointer} as PointerEvent);
  };
  this.mobileAttackButton.addEventListener("pointerdown",event=>{
   if(attackPointer!==-1||this.currentState!==GameState.PLAYING)return;
   const hud=this.readHud?.();
   if(!hud||hud.winner!==null)return;
   event.preventDefault();
   attackPointer=event.pointerId;
   attackWeapon=hud.weapon;
   startX=event.clientX;
   startY=event.clientY;
   attackAt=Date.now();attackStarted=false;grabTriggered=false;
   try{this.mobileAttackButton.setPointerCapture?.(event.pointerId);}
   catch{
    // An inactive/uncapturable pointer must never leave ATTACK held.
    attackPointer=-1;
    attackWeapon=null;
    return;
   }
   haptic(16);
   if(attackWeapon!=="missile"){
    attackTimer=setTimeout(()=>{
     attackTimer=null;
     if(attackPointer===event.pointerId&&!grabTriggered&&this.currentState===GameState.PLAYING){
      attackStarted=true;actions.touchAttackStart();
     }
    },155);
   }
  });
  this.mobileAttackButton.addEventListener("pointermove",event=>{
   if(attackPointer!==event.pointerId||grabTriggered)return;
   if(!attackStarted&&grabGesture(startX,startY,event.clientX,event.clientY,Date.now()-attackAt)){
    grabTriggered=true;
    if(attackTimer!==null){clearTimeout(attackTimer);attackTimer=null;}
    actions.touchGrab();haptic(20);return;
   }

  });
  this.mobileAttackButton.addEventListener("pointerup",event=>{
   if(attackPointer!==event.pointerId)return;
   event.preventDefault();
   const weapon=attackWeapon,hud=this.readHud?.();
   const swiped=grabTriggered||(!attackStarted&&grabGesture(startX,startY,event.clientX,event.clientY,Date.now()-attackAt));
   const began=attackStarted,alreadyGrabbed=grabTriggered;
   const mayFire=this.currentState===GameState.PLAYING&&hud?.winner===null&&hud.weapon===weapon;
   clearAttack();
   if(!mayFire){if(began)actions.touchAttackCancel();return;}
   if(swiped){if(!alreadyGrabbed)actions.touchGrab();return;}
   if(!began)actions.touchAttackStart();actions.touchAttackEnd();
  });
  this.mobileAttackButton.addEventListener("pointercancel",event=>{
   if(event.pointerId!==attackPointer)return;
   event.preventDefault();
   cancelAttack();
  });
  this.mobileAttackButton.addEventListener("lostpointercapture",event=>{
   if(event.pointerId===attackPointer)cancelAttack();
  });
  const onVisibility=()=>{if(document.visibilityState==="hidden")cancelControls();};
  if(typeof window!=="undefined"){
   window.addEventListener("blur",cancelControls);
   window.addEventListener("orientationchange",cancelControls);
  }
  if(typeof document.addEventListener==="function")document.addEventListener("visibilitychange",onVisibility);
  this.removeTouchLifecycle=()=>{
   if(typeof window!=="undefined"){
    window.removeEventListener("blur",cancelControls);
    window.removeEventListener("orientationchange",cancelControls);
   }
   if(typeof document.removeEventListener==="function")document.removeEventListener("visibilitychange",onVisibility);
  };

  this.combatSoundButton.type="button";
  this.combatShakeButton.type="button";
  this.combatSoundButton.className="game-ui__combat-toggle";
  this.combatShakeButton.className="game-ui__combat-toggle";
  this.combatSoundButton.onclick=actions.toggleCombatSound;
  this.combatShakeButton.onclick=actions.toggleCameraShake;
  this.updateButton.type="button";
  this.updateButton.className="game-ui__update-button";
  this.updateButton.hidden=true;
  this.updateButton.onclick=async()=>{
   if(this.updateButton.disabled)return;
   this.updateButton.disabled=true;
   this.updateButton.dataset.result="loading";
   this.updateButton.setAttribute("aria-busy","true");
   try{await actions.updateData();}
   catch(error){console.warn("Game data update failed:",error);this.setUpdateOutcome("error");}
   finally{this.updateButton.disabled=false;this.updateButton.removeAttribute("aria-busy");}
  };
  this.runPanel.className="game-ui__run-panel";
  this.runPanel.hidden=true;
  this.runHeading.className="game-ui__run-heading";
  this.runProgress.className="game-ui__run-progress";
  this.runMessage.className="game-ui__run-message";
  this.runMedals.className="game-ui__run-medals";
  this.runControls.className="game-ui__run-controls";
  this.runNewButton.type="button";
  this.runNewButton.className="game-ui__run-new";
  this.runNewButton.onclick=()=>this.prepareRunStart("new");
  this.runContinueButton.type="button";
  this.runContinueButton.className="game-ui__run-continue";
  this.runContinueButton.onclick=()=>{const hud=this.readHud?.();if(hud?.inRun&&hud.characterChosen&&hud.weaponChosen)actions.continueRun?.();else this.prepareRunStart("continue");};
  this.runLeaveButton.type="button";
  this.runLeaveButton.className="game-ui__run-leave";
  this.runLeaveButton.onclick=()=>actions.leaveRun?.();
  this.runControls.append(this.runContinueButton,this.runNewButton,this.runLeaveButton);
  this.runPanel.append(this.runHeading,this.runProgress,this.runMessage,this.runMedals,this.runControls);
  this.menuLinks.append(this.helpButton,this.privacyButton,this.combatSoundButton,this.combatShakeButton,this.updateButton);
  this.menuExtras.append(this.menuLinks);
  this.menuProgressDetails.append(this.upgradePanel,this.runPanel);
  this.menuSetupSection.append(this.menuProgress,this.menuLead,this.menuModePanel,this.menuArenaPanel,this.menuLoadoutPanel);
  this.menuHeader.append(this.menuHome);
  this.menu.append(this.menuHeader,this.pauseHeader,this.landing,this.menuResult,this.menuSetupSection,this.menuProgressDetails,this.menuExtras,this.pauseFooter,this.buttons);
  this.topHud.append(this.playerHealth,this.status,this.opponentHealth,this.pvpScoreHud);
  for(const [index,pad] of this.aimPads.entries()){
   const player=index===0?1:2;
   pad.className="game-ui__aim-pad";pad.dataset.player=String(player);
   pad.setAttribute("role","group");pad.tabIndex=0;
   pad.textContent="⊕";
   let pointer:number|null=null;
   const aim=(event:PointerEvent)=>{
    const local=gamePointerInElement(pad,event),x=local.x-(pad.clientWidth||pad.getBoundingClientRect().width)/2,y=(pad.clientHeight||pad.getBoundingClientRect().height)/2-local.y;
    if(Math.hypot(x,y)<5)return;
    actions.setWeaponAim?.(player,x,y);
    pad.style.setProperty("--aim-angle",(-Math.atan2(y,x)*180/Math.PI)+"deg");
   };
   const release=()=>{const id=pointer;pointer=null;pad.classList.remove("active");if(id!==null&&pad.hasPointerCapture?.(id))pad.releasePointerCapture(id);};
   this.cancelAimPointers.push(release);
   pad.addEventListener("pointerdown",event=>{
    if(pointer!==null||this.currentState!==GameState.PLAYING||this.readHud?.().winner)return;
    event.preventDefault();pointer=event.pointerId;
    try{pad.setPointerCapture(event.pointerId);}catch{pointer=null;return;}
    pad.classList.add("active");aim(event);
   });
   pad.addEventListener("pointermove",event=>{if(pointer===event.pointerId)aim(event);});
   for(const kind of ["pointerup","pointercancel","lostpointercapture"])pad.addEventListener(kind,event=>{if(pointer===(event as PointerEvent).pointerId)release();});
   pad.addEventListener("keydown",event=>{
    const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
    const direction=directions[event.key];if(!direction)return;
    event.preventDefault();event.stopPropagation();actions.setWeaponAim?.(player,...direction);
   });
  }
  this.root.append(this.mobileWeaponSwitcher,this.p2WeaponControls,...this.aimPads);
  this.root.append(this.menu,this.help,this.privacy,this.topHud,this.mobilePauseButton,this.weaponList,this.bowPanel,this.mobileControls);
  this.lanDash.type="button";this.lanDash.className="game-ui__lan-dash";this.lanDash.hidden=true;
  this.lanDash.onclick=()=>{if(this.readHud?.().lanPlayer)actions.touchDash?.();};
  this.root.append(this.coach,this.lanDash,this.pvpCountdownLabel);
  container.append(this.pauseScrim,this.root);
  this.root.addEventListener("keydown",event=>{
   if(event.key!=="Escape")return;
   if(this.weaponPickerOpen){event.preventDefault();event.stopPropagation();this.closeWeaponPicker();return;}
   if(!this.help.hidden){event.preventDefault();event.stopPropagation();this.help.hidden=true;this.helpButton.focus();}
   else if(!this.privacy.hidden){event.preventDefault();event.stopPropagation();this.privacy.hidden=true;this.privacyButton.focus();}
  });
  this.applyLocale();
  this.unsubscribeLocale=this.i18n.subscribe(()=>{
   this.applyLocale();
   if(this.readHud)this.render(this.currentState,this.readHud());
  });
 }

 private prepareRunStart(kind:"new"|"continue"){
  if(this.currentState===GameState.GAME_OVER)this.extraActions.stopToMenu?.();
  if(this.currentState!==GameState.MENU)return;
  this.openMenuRoute("custom");
  this.pendingRunStart=kind;
 }
 consumeRunStart(){const action=this.pendingRunStart;this.pendingRunStart=null;return action;}
 showRunIntermission(){this.menuStepIndex=0;this.openMenuRoute("progression");this.menuProgressDetails.open=true;}
 showPvPLoadout(){
  if(this.currentState!==GameState.MENU)return;
  this.menuView="setup";this.menuStepIndex=MENU_STEPS.length-1;this.loadoutPlayer=1;
  this.menu.scrollTop=0;this.syncWizard(this.currentState,this.readHud?.()??null);
  this.characterPickerTitle.focus?.();
 }
 private openMenuRoute(route:"home"|"custom"|"local"|"arenas"|"progression"|"settings"){
  if(this.currentState!==GameState.MENU)return;
  this.pendingRunStart=null;
  if(route==="local")this.extraActions.playerCountSelect?.(2);
  this.menuView=route==="home"?"landing":route==="progression"||route==="settings"?route:"setup";
  if(route==="custom"||route==="local"){this.menuStepIndex=0;this.loadoutPlayer=1;}
  if(route==="arenas")this.menuStepIndex=1;
  this.menu.scrollTop=0;this.syncWizard(this.currentState,this.readHud?.()??null);
  if(route==="home")this.landingQuick.focus();else this.menuHome.focus();
 }
 private syncMenuView(state:GameState,s:HudState|null){
  if(!this.extraActions.quickPlay)return;
  this.root.dataset.menuView=this.menuView;
  const menu=state===GameState.MENU,setup=menu&&this.menuView==="setup";
  this.setHidden(this.landing,!menu||this.menuView!=="landing");this.setHidden(this.menuHome,!menu||this.menuView==="landing");
  if(!menu){this.setHidden(this.buttons,false);return;}
  this.setHidden(this.menuSetupSection,!setup);this.setHidden(this.buttons,!setup);
  const settings=this.menuView==="settings",progression=this.menuView==="progression";
  this.setHidden(this.menuExtras,!settings);if(settings)this.menuExtras.open=true;
  this.setHidden(this.menuProgressDetails,!progression);
  if(progression){
   this.menuProgressDetails.open=true;
   const upgrades=Boolean(s&&!s.localPvP&&(s.upgradePoints>0||s.upgradedWeapons.length));
   const reward=Boolean(s?.inRun&&s.progression?.run?.status==="victory");
   this.setHidden(this.menuProgressTabs,!upgrades||reward);
   this.setHidden(this.runPanel,!s?.progression||(!reward&&upgrades&&this.menuProgressView!=="run"));
   this.setHidden(this.upgradePanel,!upgrades||Boolean(!reward&&s?.progression&&this.menuProgressView!=="upgrades"));
  }
  const run=s?.progression?.run;this.setHidden(this.landingContinue,!run||run.status==="complete");
  this.setText(this.landingContinue,(this.i18n.messages.run?.continueRun??"Continue Run")+(run?" · "+run.stage+"/4":""));
 }

 private filterArenas(){
  let count=0;
  for(const item of this.arenaCards.children){const card=item as HTMLButtonElement;const show=this.arenaFilter==="all"||arenaCategories(card.dataset.arena as BuiltInArenaId).includes(this.arenaFilter);this.setHidden(card,!show);if(show)count++;}
  this.setHidden(this.arenaEmpty,count>0);
  for(const item of this.arenaFilters.children){const button=item as HTMLButtonElement;button.setAttribute("aria-pressed",String(button.dataset.arenaCategory===this.arenaFilter));}
 }

 private changeMenuStep(index:number){
  const next=Math.max(0,Math.min(MENU_STEPS.length-1,index));
  if(next===this.menuStepIndex)return;
  this.menuStepIndex=next;
  this.menu.scrollTop=0;
  this.syncWizard(this.currentState,this.readHud?.()??null);
  const heading=next===0?this.menuLead:next===1?this.arenaTitle:this.characterPickerTitle;
  heading.focus?.();
 }
 private selectProgressTab(view:"run"|"upgrades"){
  if(this.menuProgressView===view)return;
  this.menuProgressView=view;
  this.syncWizard(this.currentState,this.readHud?.()??null);
 }
 private syncWizard(state:GameState,s:HudState|null){
  const choosing=state===GameState.MENU,results=state===GameState.GAME_OVER;
  const step=MENU_STEPS[this.menuStepIndex],onMode=step==="mode",onArena=step==="arena",onLoadout=step==="loadout";
  const twoPlayers=Boolean(s?.localPvP??s?.mode==="local-pvp");
  if(s)this.setHidden(this.secondNameLabel,!twoPlayers);
  this.setHidden(this.menuSetupSection,!choosing);
  this.setHidden(this.menuModePanel,!choosing||!onMode);
  this.setHidden(this.menuArenaPanel,!choosing||!onArena);
  this.setHidden(this.menuLoadoutPanel,!choosing||!onLoadout);
  this.setHidden(this.stepBackButton,!choosing||onMode);
  this.setHidden(this.stepNextButton,!choosing||onLoadout);
  this.setHidden(this.menuExtras,results||(choosing&&!onMode));
  const complete=Boolean(s?.characterChosen&&s.weaponChosen&&(!twoPlayers||(s.secondCharacterChosen&&s.secondWeaponChosen)));
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   if(button.dataset.action==="start"){this.setHidden(button,!choosing||!onLoadout);button.disabled=!complete;}
  }
  if(s){
   const rewardScreen=results&&Boolean(s.inRun);
   const menuExtras=choosing&&onMode;
   const hasRun=Boolean(s.progression)&&!twoPlayers;
   const hasUpgrades=!twoPlayers&&(s.upgradePoints>0||s.upgradedWeapons.length>0);
   const combined=rewardScreen||(menuExtras&&Boolean(s.inRun));
   const tabs=menuExtras&&!combined&&hasRun&&hasUpgrades;
   this.setHidden(this.menuProgressTabs,!tabs);
   this.menuRunTab.setAttribute("aria-pressed",String(this.menuProgressView==="run"));
   this.menuUpgradeTab.setAttribute("aria-pressed",String(this.menuProgressView==="upgrades"));
   this.setHidden(this.runPanel,!(menuExtras||rewardScreen)||!hasRun||
    (!combined&&hasUpgrades&&this.menuProgressView!=="run"));
   this.setHidden(this.upgradePanel,!(menuExtras||rewardScreen)||!hasUpgrades||
    (!combined&&hasRun&&this.menuProgressView!=="upgrades"));
   this.setHidden(this.menuProgressDetails,!(menuExtras||rewardScreen)||(!hasRun&&!hasUpgrades));
   if(results&&rewardScreen&&this.lastView?.state!==state)this.menuProgressDetails.open=true;
   if(choosing&&s.inRun&&this.lastView?.state!==state)this.menuProgressDetails.open=true;
   if(onLoadout){
    if(!twoPlayers)this.loadoutPlayer=1;
    this.setHidden(this.loadoutP2Button,!twoPlayers);
    const player=this.loadoutPlayer,chosenCharacter=player===1?s.characterChosen:s.secondCharacterChosen;
    const chosenWeapon=player===1?s.weaponChosen:s.secondWeaponChosen;
    this.weaponDetails.open=true;
    for(const item of this.characterCards.children){
     const card=item as HTMLButtonElement;
     card.setAttribute("aria-pressed",String(Boolean(chosenCharacter)&&card.dataset.character===(player===1?s.characterId:s.opponentCharacterId)));
    }
    for(const item of this.weaponCards.children){
     const card=item as HTMLButtonElement,id=card.dataset.startingWeapon as WeaponId;
     if(card===this.randomWeaponButton)continue;
     const random=s.mode==="random-weapons";
     const allowed=!random&&(s.mode!=="missile-duel"||id==="missile")&&(s.mode!=="melee-only"||id==="blade"||id==="hammer");
     this.setHidden(card,random||!allowed);card.disabled=!allowed;
     card.setAttribute("aria-pressed",String(Boolean(chosenWeapon)&&id===(player===1?s.weapon:s.secondWeapon)));
    }
    this.setHidden(this.randomWeaponButton,s.mode!=="random-weapons");
    this.randomWeaponButton.setAttribute("aria-pressed",String(Boolean(chosenWeapon)));
    this.loadoutP1Button.setAttribute("aria-pressed",String(player===1));
    this.loadoutP2Button.setAttribute("aria-pressed",String(player===2));
    const fa=this.i18n.locale==="fa";
    this.loadoutP1Button.textContent=fa?"بازیکن ۱":"PLAYER 1";
    this.loadoutP2Button.textContent=fa?"بازیکن ۲":"PLAYER 2";
    this.setText(this.loadoutStatus,(fa?"شخصیت: ":"Character: ")+(chosenCharacter?(fa?"انتخاب شد":"Selected"):(fa?"انتخاب لازم است":"Required"))+
     "  ·  "+(fa?"اسلحه: ":"Weapon: ")+(chosenWeapon?(fa?"انتخاب شد":"Selected"):(fa?"انتخاب لازم است":"Required"))+
     (twoPlayers&&!complete?" · "+(fa?"هر دو بازیکن باید انتخاب کنند":"Both players must confirm"):""));
   }
  }else this.setHidden(this.menuProgressDetails,true);
  const labels=this.i18n.messages.menu,fa=this.i18n.locale==="fa";
  this.setText(this.menuLead,onLoadout?(fa?"شخصیت و اسلحه را انتخاب کن":"CHOOSE CHARACTER & WEAPON"):
   onArena?(labels?.chooseArena??"CHOOSE ARENA"):(labels?.kickoff??"CHOOSE YOUR FIGHT"));
  this.setText(this.stepNextButton,onArena?(fa?"بعدی · شخصیت و اسلحه":"NEXT · CHARACTER & WEAPON"):
   twoPlayers?(labels?.nextAllArenas??"NEXT · ALL 16 ARENAS"):(labels?.nextArena??"NEXT · CHOOSE ARENA"));
  const stepLabel=onLoadout?(fa?"تجهیزات":"LOADOUT"):onArena?this.i18n.messages.sections.arena:
   (labels?.selectMode??this.i18n.messages.sections.gameMode);
  this.setText(this.menuProgress,(labels?.step??"STEP")+" "+(this.menuStepIndex+1)+" / "+MENU_STEPS.length+" · "+stepLabel);
  this.syncMenuView(state,s);
 }
 advanceMenuStep(){
  if(this.currentState!==GameState.MENU)return;
  if(this.menuView==="landing"){this.openMenuRoute("custom");return;}
  if(this.menuView==="setup")this.changeMenuStep(this.menuStepIndex+1);
 }
 canStartMatch(){
  const s=this.readHud?.();
  return this.currentState===GameState.MENU&&this.menuView==="setup"&&
   this.menuStepIndex===MENU_STEPS.length-1&&Boolean(s?.characterChosen&&s.weaponChosen&&
    (!(s.localPvP??s.mode==="local-pvp")||(s.secondCharacterChosen&&s.secondWeaponChosen)));
 }
 setUpdateVisible(visible:boolean){this.updateButton.hidden=!visible;}
 setUpdateOutcome(result:"success"|"error"){this.updateButton.dataset.result=result;}
 bind(subscribe:(listener:(state:GameState)=>void)=>()=>void,read:()=>HudState){
  this.unsubscribe?.();
  this.stopHudLoop();
  this.readHud=read;
  this.unsubscribe=subscribe(state=>{
   this.currentState=state;
   this.render(state,read());
   if(state===GameState.PLAYING)this.startHudLoop();
   else this.stopHudLoop();
  });
  this.currentState=GameState.MENU;
  this.render(GameState.MENU,read());
 }

 private startHudLoop(){
  if(this.hudFrame!==null)return;
  const frame=()=>{
   this.hudFrame=null;
   if(this.currentState!==GameState.PLAYING||!this.readHud)return;
   this.render(this.currentState,this.readHud());
   this.hudFrame=window.requestAnimationFrame(frame);
  };
  this.hudFrame=window.requestAnimationFrame(frame);
 }

 private stopHudLoop(){
  if(this.hudFrame===null)return;
  window.cancelAnimationFrame(this.hudFrame);
  this.hudFrame=null;
 }

 render(state:GameState,s:HudState){
  this.currentState=state;
  if(s.lanPlayer)this.root.dataset.lanPlayer=String(s.lanPlayer);else delete this.root.dataset.lanPlayer;
  this.renderTutorial(state,s);
  const messages=this.i18n.messages,locale=this.i18n.locale,old=this.lastView;
  const arenaName=(id:ArenaId)=>getDownloadedArena(id)?.names[locale]??messages.arenas[id as BuiltInArenaId]??id;
  const stateChanged=!old||old.state!==state;
  const localeChanged=!old||old.locale!==locale;
  const arenaChanged=!old||old.arena!==s.arena,modeChanged=!old||old.mode!==s.mode||old.localPvP!==s.localPvP;
  const weaponChanged=!old||old.weapon!==s.weapon,winnerChanged=!old||old.winner!==s.winner;
  const secondWeaponChanged=!old||old.secondWeapon!==s.secondWeapon;
  const nameChanged=!old||old.playerName!==s.playerName||old.secondPlayerName!==s.secondPlayerName;
  const characterChanged=!old||old.characterId!==s.characterId||old.opponentCharacterId!==s.opponentCharacterId;
  const progressKey=s.progression?JSON.stringify(s.progression):"";
  const progressChanged=!old||old.progressKey!==progressKey||old.inRun!==Boolean(s.inRun);
  const pointsChanged=!old||old.upgradePoints!==s.upgradePoints;
  const upgradesChanged=!old||old.upgradedWeapons.length!==s.upgradedWeapons.length||
   s.upgradedWeapons.some((id,index)=>id!==old.upgradedWeapons[index]);
  const selectionKey=[s.characterChosen,s.weaponChosen,s.secondCharacterChosen,s.secondWeaponChosen].join(":");
   const selectionChanged=!old||old.selectionKey!==selectionKey;
   const staticChanged=selectionChanged||stateChanged||localeChanged||arenaChanged||modeChanged||weaponChanged||winnerChanged||pointsChanged||upgradesChanged||progressChanged||secondWeaponChanged||nameChanged||characterChanged;
  const missileRules=s.mode==="missile-duel";

  if(staticChanged){
   // A held UZI/Bow touch belongs to the originally selected weapon, not its replacement.
   if(weaponChanged&&state===GameState.PLAYING)this.cancelActiveTouchAttack();
   if(secondWeaponChanged&&state===GameState.PLAYING)this.cancelP2Attack();
   if(stateChanged){
    if(state===GameState.MENU){
     if(this.extraActions.quickPlay)this.menuView=s.inRun&&s.progression?.run?.status==="victory"?"progression":"landing";
     this.menuStepIndex=0;
     this.menuProgressView=s.upgradePoints>0&&!s.inRun?"upgrades":"run";
    }
    if(state===GameState.GAME_OVER)this.menu.scrollTop=0;
    this.root.classList.toggle("playing",state===GameState.PLAYING);
    this.root.classList.toggle("paused",state===GameState.PAUSED);
    this.setHidden(this.pauseScrim,state!==GameState.PAUSED);
    this.setHidden(this.pauseHeader,state!==GameState.PAUSED);
    this.setHidden(this.pauseFooter,state!==GameState.PAUSED);
    if(state===GameState.PAUSED){
     this.root.setAttribute("role","dialog");
     this.root.setAttribute("aria-modal","true");
     this.root.setAttribute("aria-labelledby","game-pause-title");
    }else{
     this.root.removeAttribute?.("role");
     this.root.removeAttribute?.("aria-modal");
     this.root.removeAttribute?.("aria-labelledby");
    }
    this.root.classList.toggle("game-over",state===GameState.GAME_OVER);
    this.root.classList.toggle("menu",state===GameState.MENU);
    if(state===GameState.PLAYING){this.setHidden(this.privacy,true);this.setHidden(this.help,true);}
    this.setHidden(this.menuResult,state!==GameState.GAME_OVER);
    this.setHidden(this.menuSettings,state!==GameState.MENU);
    this.setHidden(this.menuSetupSection,state!==GameState.MENU);
    if(state===GameState.PLAYING){
     this.menuExtras.open=false;
     this.menuStepIndex=0;
     this.weaponDetails.open=false;
    }
    this.setHidden(this.playerHealth,state!==GameState.PLAYING);
    this.setHidden(this.opponentHealth,state!==GameState.PLAYING);
    for(const item of this.buttons.children){
     const button=item as HTMLButtonElement,action=button.dataset.action as UiAction;
     this.setHidden(button,(action==="start"&&state!==GameState.MENU)||
      (action==="pause"&&state!==GameState.PLAYING)||
      (action==="resume"&&state!==GameState.PAUSED)||
      (action==="menu"&&state!==GameState.PAUSED&&state!==GameState.GAME_OVER)||
      (action==="restart"&&(state===GameState.MENU||Boolean(s.inRun))));
    }
   }
   if(arenaChanged){
    const theme=getArenaTheme(s.arena);
    this.root.dataset.arena=s.arena;
    this.root.dataset.visualArena=s.arena;
    this.root.dataset.themeSkin=theme.skin;
    this.root.style.setProperty("--arena-accent",theme.accent);
    this.root.style.setProperty("--arena-secondary",theme.secondary);
    this.root.style.setProperty("--arena-hud-bg",theme.hudBackground);
    this.root.style.setProperty("--arena-platform-edge",theme.platformEdge);
   }
   if(modeChanged){this.root.dataset.mode=s.mode;this.root.dataset.players=(s.localPvP??s.mode==="local-pvp")?"2":"1";}
   if(nameChanged||stateChanged){
    if(document.activeElement!==this.playerNameInput&&this.playerNameInput.value!==(s.playerName??""))
     this.playerNameInput.value=s.playerName??"";
    if(document.activeElement!==this.secondNameInput&&this.secondNameInput.value!==(s.secondPlayerName??""))
     this.secondNameInput.value=s.secondPlayerName??"";
   }
   if(localeChanged||modeChanged||stateChanged){
    // UI captions refer to world positions, not RTL reading order.
    // The existing name-to-fighter and health-to-fighter mapping is unchanged.
    this.setText(this.playerNameCaption,(s.localPvP??s.mode==="local-pvp")?
     messages.characterNames.leftPlayer:messages.characterNames.playerOne);
    this.setText(this.secondNameCaption,(s.localPvP??s.mode==="local-pvp")?
     messages.characterNames.rightPlayer:messages.characterNames.playerTwo);
   }
   if(nameChanged||localeChanged||modeChanged||stateChanged||characterChanged){
    this.setText(this.playerHealthName,s.playerName||CHARACTER_TEXT[locale][s.characterId??"soldier"].name);
    this.setText(this.opponentHealthName,s.lanPlayer?s.secondPlayerName??"":(s.localPvP??s.mode==="local-pvp")?
     (s.secondPlayerName||messages.characterNames.playerTwo):
     CHARACTER_TEXT[locale][s.opponentCharacterId??"soldier"].name);
    this.playerHealthName.title=this.playerHealthName.textContent??"";
    this.opponentHealthName.title=this.opponentHealthName.textContent??"";
   }
   if(characterChanged||localeChanged||stateChanged){
    for(const item of this.characterCards.children){
     const card=item as HTMLButtonElement;
     card.setAttribute("aria-pressed",String(card.dataset.character===(s.characterId??"soldier")));
    }
   }
   if(modeChanged||localeChanged||stateChanged){
    this.setHidden(this.pvpHint,!(s.localPvP??s.mode==="local-pvp")||(state!==GameState.MENU&&state!==GameState.GAME_OVER));
    this.setText(this.pvpHint,messages.pvp?.hint??"");
   }
   if(modeChanged||localeChanged||stateChanged){
    this.quickDuelButton.setAttribute("aria-pressed",String(!(s.localPvP??s.mode==="local-pvp")));
    this.quickPvpButton.setAttribute("aria-pressed",String((s.localPvP??s.mode==="local-pvp")));
    this.setText(this.modeDescription,messages.menu?.modeDescriptions[s.mode]??"");
   }
   if(modeChanged||arenaChanged||localeChanged||stateChanged){
    this.setText(this.arenaShortcut,((s.localPvP??s.mode==="local-pvp")?
     (messages.menu?.allArenas??"ALL 16 ARENAS"):
     (messages.menu?.mapShortcut??"CHOOSE ARENA"))+
     " · "+arenaName(s.arena));
    this.setText(this.arenaSelectionSummary,(messages.menu?.selectedArena??"SELECTED ARENA")+
     ": "+arenaName(s.arena));
   }
   if(modeChanged||arenaChanged||weaponChanged||localeChanged||stateChanged||nameChanged||characterChanged){
     this.setText(this.matchSummary,(messages.menu?.ready??"READY")+": "+
     (s.playerName?s.playerName+" · ":"")+CHARACTER_TEXT[locale][s.characterId??"soldier"].name+" · "+
      messages.modes[s.mode]+" · "+arenaName(s.arena)+" · "+
     messages.weapons[s.weapon]);
   }
   const upgraded=new Set(s.upgradedWeapons);
   const equipped=upgraded.has(s.weapon)?(messages.upgrades[s.weapon]?.name??messages.weapons[s.weapon]):messages.weapons[s.weapon];
   if(state===GameState.MENU||state===GameState.GAME_OVER){
    if(modeChanged||localeChanged||stateChanged){
     for(const item of this.menuSettings.children){
      // Never let the Online placeholder participate in game-mode selection.
      if(item===this.onlineModeButton)continue;
      const card=item as HTMLButtonElement,id=card.dataset.mode as GameModeId;
      const visible=id!=="local-pvp";
      this.setHidden(card,!visible);
      card.setAttribute("aria-pressed",String(id===s.mode));
     }
    }
    if(arenaChanged||localeChanged||stateChanged){
     this.refreshExtraArenaCards(s.arena);
     for(const item of this.arenaCards.children){
      const card=item as HTMLButtonElement;
      card.setAttribute("aria-pressed",String(card.dataset.arena===s.arena));
     }
    }
    if(weaponChanged||modeChanged||arenaChanged||localeChanged||stateChanged){
     const fixed=missileRules||s.mode==="random-weapons";
     // Weapon selection remains required, including restricted modes.
     for(const item of this.weaponCards.children){
      const card=item as HTMLButtonElement,id=card.dataset.startingWeapon as WeaponId;
      if(!id)continue;
      const allowed=!fixed&&(s.mode!=="melee-only"||id==="blade"||id==="hammer");
      this.setHidden(card,!allowed);
      card.disabled=!allowed;
      card.setAttribute("aria-pressed",String(Boolean(s.weaponChosen)&&id===s.weapon));
     }
    }
    const runIntermission=Boolean(s.inRun&&s.progression?.run?.status==="victory");
    const available=runIntermission?s.progression!.choices.filter(id=>!upgraded.has(id)):
     WEAPON_IDS.filter(id=>!upgraded.has(id));
    const selected=this.selectedUpgrade&&available.includes(this.selectedUpgrade)?
     this.selectedUpgrade:available[0]??null;
    this.selectedUpgrade=selected;
    if(upgradesChanged||progressChanged||modeChanged||stateChanged||pointsChanged||localeChanged){
     for(const item of this.upgradeCardGrid.children){
      const card=item as HTMLButtonElement,id=card.dataset.upgradeWeapon as WeaponId;
      const allowed=available.includes(id);
      this.setHidden(card,!allowed);
      card.disabled=!allowed;
      card.setAttribute("aria-pressed",String(id===selected));
     }
    }
    const disabled=(s.localPvP??s.mode==="local-pvp")||s.upgradePoints<=0||available.length===0||
     (Boolean(s.inRun)&&!runIntermission);
    this.upgradeButton.disabled=disabled;
    this.setHidden(this.upgradeChoices,disabled);
    this.setHidden(this.upgradeSummary,upgraded.size===0||s.upgradePoints>0);
    this.setText(this.upgradeSummary,WEAPON_IDS.filter(id=>upgraded.has(id)).map(id=>(messages.upgrades[id]?.name??id)).join(" · "));
    this.setText(this.upgradePointsLabel,messages.upgrade.points+"  "+s.upgradePoints);
    this.setText(this.upgradeHint,s.upgradePoints>0&&selected?(messages.upgrades[selected]?.description??""):messages.upgrade.earn);
   }
   if(progressChanged||stateChanged||localeChanged){
    const availableRun=Boolean(s.progression);
    const menuVisible=state===GameState.MENU||state===GameState.GAME_OVER;
    this.setHidden(this.runPanel,!menuVisible||!availableRun);
    if(availableRun){
     const run=s.progression!.run,copy=messages.run;
     const stage=run?.stage??1;
     const fightTitle=stage===4?copy.boss:copy.wave+" "+stage+"/4";
     this.setText(this.runHeading,copy.title);
     this.setText(this.runProgress,(run?fightTitle+" · ":"")+copy.career+" "+s.progression!.totalWins+
      " · "+copy.points+" "+(run?.points??0));
     const phase=run?.status;
     const message=phase==="victory"?copy.victory+" "+copy.choose:
      phase==="defeat"?copy.defeat:
      phase==="complete"?copy.complete:phase==="ready"?copy.ready:"";
     this.setText(this.runMessage,message);
     const all:["rookie","veteran","champion"]=["rookie","veteran","champion"];
     this.setText(this.runMedals,all.map(id=>(
      s.progression!.medals.includes(id)?"★ "+copy.medals[id]:"◇ "+copy.medals[id])+
      " ("+copy.requirements[id]+")").join("  ·  "));
     const showContinue=Boolean(run)&&phase!=="complete";
     this.setHidden(this.runContinueButton,!showContinue);
     this.runContinueButton.disabled=phase==="victory"&&Boolean(s.inRun)&&s.progression!.choices.length>0&&run!.points>0;
     this.setText(this.runContinueButton,phase==="victory"&&s.inRun?copy.next:
      phase==="defeat"?copy.retry:copy.continueRun);
     this.setText(this.runNewButton,copy.newRun);
     this.setHidden(this.runLeaveButton,!s.inRun);
     this.setText(this.runLeaveButton,copy.leave);
     this.runPanel.dataset.runStatus=phase??"none";
     this.runPanel.dataset.medal=s.progression!.medals.at(-1)??"none";
    }
   }
   // Visibility is controlled by syncWizard after reward/Run state is updated.
   if(localeChanged||weaponChanged||secondWeaponChanged||modeChanged||arenaChanged||upgradesChanged){
    for(const item of this.weaponList.children){
     const button=item as HTMLButtonElement,id=button.dataset.weapon as WeaponId;
     button.classList.toggle("active",id===(this.weaponPickerPlayer===1?s.weapon:s.secondWeapon));
     this.setText(button,messages.weapons[id]+(upgraded.has(id)?" ★":""));
     const hidden=missileRules?id!=="missile":s.mode==="melee-only"?(id!=="blade"&&id!=="hammer"):
      s.mode==="random-weapons"?id!==s.weapon:false;
     this.setHidden(button,hidden);
     button.disabled=hidden||s.mode==="random-weapons";
    }
    const availableWeapons=WEAPON_IDS.filter(id=>s.mode!=="melee-only"||id==="blade"||id==="hammer");
    this.setText(this.mobileWeaponName,((s.localPvP??s.mode==="local-pvp")?messages.pvp.p1+" · ":"")+messages.weapons[s.weapon]+(upgraded.has(s.weapon)?" ★":""));
    this.setText(this.p2WeaponName,messages.pvp?.p2+" · "+messages.weapons[s.secondWeapon??"blade"]);
    if(this.mobileWeaponName.title!==equipped)this.mobileWeaponName.title=equipped;
    const position=availableWeapons.indexOf(s.weapon);
    this.setText(this.mobileWeaponIndex,(position<0?0:position+1)+"/"+availableWeapons.length);
   }
   if(stateChanged||weaponChanged||winnerChanged||modeChanged||arenaChanged){
    const playing=state===GameState.PLAYING&&s.winner===null;
    if(!playing||modeChanged||weaponChanged||secondWeaponChanged)this.closeWeaponPicker();
    this.setHidden(this.weaponList,true);
    this.setHidden(this.p2WeaponControls,true);
    // Missile uses the same directional pad as the other ranged weapons.
    this.setHidden(this.aimPads[0],!playing);
    this.setHidden(this.aimPads[1],!playing||!(s.localPvP??s.mode==="local-pvp"));
    this.setHidden(this.mobileWeaponSwitcher,!playing||!s.lanPlayer);
    this.nextWeaponButton.disabled=!playing||!s.lanPlayer;
    this.setHidden(this.lanDash,!playing||!s.lanPlayer);
    this.setText(this.lanDash,locale==="fa"?"جهش سریع":"DASH");
    this.setHidden(this.bowPanel,!playing||s.weapon!=="bow");
    this.setHidden(this.mobileControls,!playing);
    this.setHidden(this.mobilePauseButton,!playing);
    if(!playing)this.cancelPauseHold();
    this.setHidden(this.p2Controls,!playing||!(s.localPvP??s.mode==="local-pvp"));
    if(!playing&&(stateChanged||winnerChanged))this.cancelTouchControls();
   }
   this.syncWizard(state,s);
   this.lastView={selectionKey,state,locale,arena:s.arena,mode:s.mode,weapon:s.weapon,winner:s.winner,
    upgradePoints:s.upgradePoints,upgradedWeapons:[...s.upgradedWeapons],progressKey,inRun:Boolean(s.inRun),secondWeapon:s.secondWeapon,
    playerName:s.playerName,secondPlayerName:s.secondPlayerName,localPvP:s.localPvP,
     characterId:s.characterId,opponentCharacterId:s.opponentCharacterId};
  }

  if(!this.hpFormatter||this.hpFormatterLocale!==locale){
   this.hpFormatter=new Intl.NumberFormat(locale==="fa"?"fa-IR":"en-US",{useGrouping:false,maximumFractionDigits:0});
   this.hpFormatterLocale=locale;
  }
  const hp=this.lastHealth;
  if(!hp||hp.locale!==locale||hp.playerHealth!==s.playerHealth||hp.playerMaxHealth!==s.playerMaxHealth||
   hp.opponentHealth!==s.opponentHealth||hp.opponentMaxHealth!==s.opponentMaxHealth){
   const playerMax=Math.max(1,s.playerMaxHealth),opponentMax=Math.max(1,s.opponentMaxHealth);
   const playerHealth=Math.max(0,Math.min(playerMax,s.playerHealth));
   const opponentHealth=Math.max(0,Math.min(opponentMax,s.opponentHealth));
   this.setText(this.playerHealthCurrent,this.hpFormatter.format(Math.ceil(playerHealth)));
   this.setText(this.opponentHealthCurrent,this.hpFormatter.format(Math.ceil(opponentHealth)));
   this.playerHealth.style.setProperty("--health",playerHealth/playerMax*100+"%");
   this.opponentHealth.style.setProperty("--health",opponentHealth/opponentMax*100+"%");
   this.lastHealth={playerHealth:s.playerHealth,playerMaxHealth:s.playerMaxHealth,
    opponentHealth:s.opponentHealth,opponentMaxHealth:s.opponentMaxHealth,locale};
  }

  for(const [index,angle] of [s.weaponAimAngle,s.secondAimAngle].entries()){
   if(this.lastAimDirections[index]===angle)continue;
   this.aimPads[index].style.setProperty("--aim-angle",(-(angle??(index===0?0:Math.PI))*180/Math.PI)+"deg");
   this.lastAimDirections[index]=angle;
  }
  const hillChanged=!this.lastHill||this.lastHill.player!==s.hill.player||
   this.lastHill.opponent!==s.hill.opponent||this.lastHill.target!==s.hill.target;
  if(staticChanged||(s.mode==="king-of-hill"&&hillChanged)){
   const status=s.winner?(s.winner==="player"?messages.status.win:messages.status.lose):
    s.mode==="king-of-hill"?messages.status.hill+"  "+s.hill.player.toFixed(1)+" — "+
     s.hill.opponent.toFixed(1)+" / "+s.hill.target.toFixed(0):"";
   // No winner while a match is active. Avoid evaluating result labels on every HUD update.
   let pvpResult="";
   if((s.localPvP??s.mode==="local-pvp")){
    if(s.winner==="draw")pvpResult=messages.pvp.draw;
    else if(s.winner==="player")pvpResult=s.playerName?
     s.playerName+" "+messages.characterNames.wins:messages.pvp.winner1;
    else if(s.winner==="opponent")pvpResult=s.secondPlayerName?
     s.secondPlayerName+" "+messages.characterNames.wins:messages.pvp.winner2;
   }
   this.setHidden(this.status,!s.winner&&s.mode!=="king-of-hill");
   this.setText(this.status,(s.localPvP??s.mode==="local-pvp")&&s.winner?pvpResult:status);
   if(state===GameState.GAME_OVER){
    const series=s.pvpSeries;
    if((s.localPvP??s.mode==="local-pvp")&&series){
     if(this.menuResult.firstChild!==this.pvpResultPanel)this.menuResult.replaceChildren(this.pvpResultPanel);
     const copy=messages.pvp.series;
     this.setText(this.pvpResultMeta,(series.complete?copy.champion:copy.roundComplete)+" · "+copy.round+" "+series.round);
     this.setText(this.pvpResultP1,(s.playerName||messages.pvp.p1)+"\n"+series.playerWins);
     this.setText(this.pvpResultCenter,copy.bestOfThree);
     this.setText(this.pvpResultP2,(s.secondPlayerName||messages.pvp.p2)+"\n"+series.opponentWins);
     this.setText(this.pvpResultTitle,pvpResult);
    }else this.setText(this.menuResult,(s.localPvP??s.mode==="local-pvp")?pvpResult:status);
   }
  }
  if(s.mode==="king-of-hill"&&hillChanged)
   this.lastHill={player:s.hill.player,opponent:s.hill.opponent,target:s.hill.target};

  const series=s.pvpSeries,pvp=Boolean((s.localPvP??s.mode==="local-pvp")&&!s.lanPlayer&&series);
  this.setHidden(this.pvpNextRoundButton,!(pvp&&state===GameState.GAME_OVER&&!series!.complete));
  this.setHidden(this.pvpLoadoutButton,!(pvp&&state===GameState.GAME_OVER&&series!.complete));
  this.setText(this.pvpNextRoundButton,messages.pvp.series.nextRound);
  this.setText(this.pvpLoadoutButton,messages.pvp.series.changeLoadout);
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   if(button.dataset.action==="restart"){
    this.setHidden(button,Boolean(pvp&&state===GameState.GAME_OVER&&!series!.complete));
    this.setText(button,pvp&&state===GameState.GAME_OVER?messages.pvp.series.rematch:messages.buttons.restart);
   }
  }
  this.setHidden(this.pvpScoreHud,!(pvp&&state===GameState.PLAYING));
  this.setHidden(this.pvpCountdownLabel,!(pvp&&state===GameState.PLAYING&&series!.countdown>0));
  if(pvp){
   const copy=messages.pvp.series;
   this.setText(this.pvpScoreHud,messages.pvp.p1+" "+series!.playerWins+
    "  —  "+series!.opponentWins+" "+messages.pvp.p2+"  ·  "+copy.round+" "+series!.round+"  ·  "+copy.bestOfThree);
   if(series!.countdown>0)this.setText(this.pvpCountdownLabel,copy.countdown+"  "+Math.ceil(series!.countdown));
  }

  const bowPercent=Math.round(s.bowCharge*100),bowCharging=s.bowCharge>0;
  if(bowPercent!==this.lastBowPercent){
   this.bowMeter.firstElementChild?.setAttribute("style","width:"+bowPercent+"%");
   this.lastBowPercent=bowPercent;
  }
  if(this.lastBowCharging!==bowCharging||localeChanged){
   this.setText(this.bowValue,bowCharging?messages.panels.releaseToFire:"");
   this.lastBowCharging=bowCharging;
  }
 }

 setCombatPreferences(sound:boolean,shake:boolean){
  this.combatSoundEnabled=sound;this.combatShakeEnabled=shake;this.refreshCombatLabels();
 }
 private refreshCombatLabels(){
  const fa=this.i18n.locale==="fa";
  this.combatSoundButton.textContent=fa?(this.combatSoundEnabled?"صدا: روشن":"صدا: خاموش"):(this.combatSoundEnabled?"SOUND: ON":"SOUND: OFF");
  this.combatShakeButton.textContent=fa?(this.combatShakeEnabled?"لرزش: روشن":"لرزش: خاموش"):(this.combatShakeEnabled?"SHAKE: ON":"SHAKE: OFF");
  this.combatSoundButton.setAttribute("aria-pressed",String(this.combatSoundEnabled));
  this.combatShakeButton.setAttribute("aria-pressed",String(this.combatShakeEnabled));
 }
 private async loadExtraCatalog(){
  if(this.extraBusy||!this.extraActions.fetchArenaCatalog)return;
  this.extraBusy=true;this.extraStatus=this.i18n.locale==="fa"?"در حال بررسی زمین‌ها…":"Checking arenas…";
  this.refreshExtraArenaCards(this.readHud?.().arena);
  try{
   this.extraCatalog=await this.extraActions.fetchArenaCatalog();
   this.extraStatus=this.i18n.locale==="fa"?"زمین‌های جدید آماده دانلود هستند.":"New arenas are available to download.";
  }catch{
   this.extraStatus=this.i18n.locale==="fa"?"دسترسی به گیت‌هاب ممکن نیست؛ زمین‌های ذخیره‌شده همچنان قابل بازی هستند.":"GitHub is unavailable. Saved arenas still work offline.";
  }finally{this.extraBusy=false;this.refreshExtraArenaCards(this.readHud?.().arena);}
 }
 private async installExtraArena(listing:ArenaListing){
  if(this.extraBusy||!this.extraActions.installArena)return;
  this.extraBusy=true;this.extraStatus=this.i18n.locale==="fa"?"در حال دانلود و ذخیره زمین…":"Downloading and saving arena…";
  this.refreshExtraArenaCards(this.readHud?.().arena);
  try{
   await this.extraActions.installArena(listing);
   this.extraStatus=this.i18n.locale==="fa"?"دانلود شد؛ اکنون بدون اینترنت قابل بازی است.":"Downloaded. This arena now works offline.";
  }catch{
   this.extraStatus=this.i18n.locale==="fa"?"دانلود ناموفق بود؛ اتصال اینترنت یا فضای ذخیره‌سازی را بررسی کن.":"Download failed. Check your connection and storage.";
  }finally{this.extraBusy=false;this.refreshExtraArenaCards(this.readHud?.().arena);}
 }
 private refreshExtraArenaCards(selected?:ArenaId){
  const fa=this.i18n.locale==="fa";
  this.extraArenaHeading.textContent=fa?"زمین‌های قابل دانلود از گیت‌هاب":"DOWNLOADABLE ARENAS · GITHUB";
  this.extraArenaRefresh.textContent=fa?"بررسی زمین‌های جدید":"CHECK NEW ARENAS";
  this.extraArenaRefresh.disabled=this.extraBusy||!this.extraActions.fetchArenaCatalog;
  this.extraArenaFeedback.textContent=this.extraStatus||(fa?
   "۱۶ زمین اصلی همیشه آفلاین هستند. زمین‌های جدید را یک بار دانلود کن.":"The 16 built-in arenas always work offline. Download extras once.");
  const galleryScrollTop=this.extraArenaList.scrollTop;
  this.extraArenaList.replaceChildren();
  const installed=installedArenas();
  const entries=new Map<string,ArenaListing>();
  for(const item of this.extraCatalog)entries.set(item.id,item);
  for(const pack of installed)if(!entries.has(pack.id))entries.set(pack.id,{id:pack.id,version:pack.version,names:pack.names,path:""});
  for(const entry of entries.values()){
   const owned=installed.find(p=>p.id===entry.id);
   const card=document.createElement("div");card.className="game-ui__download-card";
   const title=document.createElement("strong");title.textContent=owned?.names[this.i18n.locale]??entry.names[this.i18n.locale];
   const picture=document.createElement("div");picture.className="game-ui__download-preview";
   const titleText=owned?.names[this.i18n.locale]??entry.names[this.i18n.locale];
   picture.setAttribute("role","img");
   picture.setAttribute("aria-label",titleText);
   if(owned)picture.style.backgroundImage="url("+JSON.stringify(arenaImageDataUrl(owned))+")";
   else if(/^[a-z0-9-]{2,32}\/arena\.json$/.test(entry.path)){
    // Public preview before downloading. The offline placeholder remains usable.
    const preview="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/"+
     entry.path.replace(/arena\.json$/,"background.svg");
    picture.style.backgroundImage="url("+JSON.stringify(preview)+")";
   }
   const badge=document.createElement("span");badge.className="game-ui__download-badge";
   badge.dataset.owned=String(Boolean(owned));
   badge.textContent=owned?(fa?"دانلودشده":"SAVED"):(fa?"جدید":"NEW");
   const row=document.createElement("div");row.className="game-ui__download-actions";
   if(owned){
    const choose=document.createElement("button");choose.type="button";choose.dataset.arena=owned.id;
    choose.className="game-ui__download-play";
    choose.textContent=fa?"انتخاب زمین":"PLAY";
    choose.setAttribute("aria-pressed",String(selected===owned.id));
    choose.onclick=()=>this.extraActions.arenaSelect(owned.id);
    row.append(choose);
    const remove=document.createElement("button");remove.type="button";remove.className="game-ui__download-delete";
    remove.textContent=fa?"حذف":"DELETE";remove.disabled=this.extraBusy;
    remove.onclick=()=>{
     try{this.extraActions.deleteArena?.(owned.id);this.extraStatus=fa?"زمین حذف شد.":"Arena deleted.";}
     catch{this.extraStatus=fa?"حذف ناموفق بود.":"Could not delete arena.";}
     this.refreshExtraArenaCards(this.readHud?.().arena);
    };
    row.append(remove);
   }
   if(!owned||entry.version>owned.version){
    const button=document.createElement("button");button.type="button";button.className="game-ui__download-install";
    button.textContent=owned?(fa?"بروزرسانی":"UPDATE"):(fa?"دانلود":"DOWNLOAD");
    button.disabled=this.extraBusy;button.onclick=()=>{void this.installExtraArena(entry);};
    row.append(button);
   }
   card.append(picture,badge,title,row);this.extraArenaList.append(card);
  }
  // Selecting a map, installing, or refreshing must not jump the gallery to its top.
  this.extraArenaList.scrollTop=galleryScrollTop;
 }

  dispose(){
  this.cancelTouchControls();
  this.removeTouchLifecycle();
  this.unsubscribe?.();
  this.unsubscribeLocale?.();
  this.stopHudLoop();
  this.root.remove();
  this.pauseScrim.remove();
 }

 private renderTutorial(state:GameState,s:HudState){
  if(!s.tutorial)return;
  const mobile=typeof window.matchMedia==="function"&&window.matchMedia("(pointer: coarse)").matches;
  if(state===GameState.MENU||state===GameState.GAME_OVER){this.onboarding.dismiss();}
  const eligible=mobile&&state===GameState.PLAYING&&!s.lanPlayer&&!s.localPvP&&!s.winner&&!document.hidden;
  const step=s.tutorial?this.onboarding.update(s.tutorial,eligible,s.weapon==="missile"):null;
  if(step==="ready")this.coachReadyUntil=performance.now()+1800;
  const ready=eligible&&this.coachReadyUntil>performance.now();
  const view=[step,ready,eligible,this.i18n.locale,s.weapon].join("|");
  if(view===this.tutorialView)return;this.tutorialView=view;
  this.setHidden(this.coach,!eligible||(!step&&!ready));
  this.coach.dataset.target=step==="move"||step==="jump"||step==="double"?"stick":"attack";
  const copy=this.i18n.messages.tutorial;
  this.setText(this.coachText,ready?copy.ready:step?step==="attack"&&s.weapon==="missile"?copy.missile:copy[step]:"");
  this.coach.dir=this.i18n.locale==="fa"?"rtl":"ltr";
  this.joystick.classList.toggle("tutorial-target",Boolean(eligible&&step&&!ready&&this.coach.dataset.target==="stick"));
  this.mobileAttackButton.classList.toggle("tutorial-target",Boolean(eligible&&step&&!ready&&this.coach.dataset.target==="attack"));
 }

 private renderGuide(){
  const messages=this.i18n.messages,guide=messages.guide;
  // Lightweight DOM test fixtures may supply only legacy localization fields.
  if(!guide){this.helpContent.innerHTML="";return;}
  this.helpContent.replaceChildren();
  const title=document.createElement("h2");title.textContent=messages.buttons.help;this.helpContent.append(title);
  const entries=(section:HTMLElement,list:readonly {title:string;body:string;keys?:string}[])=>{
   for(const entry of list){const article=document.createElement("article"),heading=document.createElement("h3"),body=document.createElement("p");heading.textContent=entry.title;body.textContent=entry.body;article.append(heading,body);
    if(entry.keys){const keys=document.createElement("bdi");keys.dir="ltr";keys.className="game-ui__guide-keys";keys.textContent=entry.keys;article.append(keys);}section.append(article);}
  };
  for(const id of ["controls","advanced","weapons","modes","progression","local"] as const){
   const section=document.createElement("details"),summary=document.createElement("summary");section.dataset.guideSection=id;section.open=id==="controls";summary.textContent=guide.sections[id];section.append(summary);
   if(id==="weapons")entries(section,WEAPON_IDS.map(weapon=>({title:messages.weapons[weapon],body:guide.weapons[weapon]+" "+guide.upgradeLabel+": "+(messages.upgrades[weapon]?.name??weapon)+" — "+(messages.upgrades[weapon]?.description??"")})));
   else if(id==="modes")entries(section,[...MODE_IDS,"local-pvp" as const].map(mode=>({title:messages.modes[mode],body:guide.modes[mode]})));
   else entries(section,guide[id]);this.helpContent.append(section);
  }
 }

 private applyLocale(){
  const messages=this.i18n.messages;
  if(messages.landing){
   this.landingQuickLabel.textContent=this.i18n.locale==="fa"?"شروع · انتخاب شخصیت و اسلحه":"START · CHOOSE CHARACTER & WEAPON";
   this.landingDefaults.textContent=messages.landing.defaults;
   this.menuHome.textContent=messages.landing.home;
   this.landingLocalHint.textContent=messages.landing.localHint;
   for(const item of this.landingRoutes.children){
    const route=(item as HTMLButtonElement).dataset.route as "custom"|"local"|"arenas"|"progression"|"settings";
    const label=this.landingRouteLabels.get(route);
    if(label){
     label.textContent=messages.landing[route];
     if(route==="local")label.append(this.landingLocalHint);
    }
   }
  }
  this.coachSkip.textContent=messages.tutorial?.skip??"Skip tutorial";this.tutorialReplay.textContent=messages.tutorial?.replay??"Replay touch tutorial";
  this.refreshCombatLabels();
  this.languageLabel.textContent=messages.language.label;
  const currentLanguage=this.i18n.locale==="fa"?messages.language.persian:messages.language.english;
  this.languageButton.textContent=this.i18n.locale==="fa"?"فا":"EN";
  this.languageButton.setAttribute("aria-label",messages.language.label+": "+currentLanguage);
  this.title.textContent=messages.title;
  this.pauseTitle.textContent=messages.pause?.title??(this.i18n.locale==="fa"?"بازی متوقف شد":"GAME PAUSED");
  this.pauseSubtitle.textContent=messages.pause?.subtitle??(this.i18n.locale==="fa"?"آمادهٔ ادامهٔ نبرد هستی؟":"Ready to return to the fight?");
  this.pauseSettingsButton.textContent=messages.pause?.settings??(this.i18n.locale==="fa"?"تنظیمات و راهنما":"Settings & Help");
  this.pauseLanguageButton.textContent=this.i18n.locale==="fa"?"فا":"EN";
  this.pauseLanguageButton.setAttribute("aria-label",messages.language.label);
  this.menuLead.textContent=messages.menu?.kickoff??"CHOOSE YOUR FIGHT";
  this.stepNextButton.textContent=messages.menu?.nextArena??"NEXT: CHOOSE ARENA";
  this.stepBackButton.textContent=messages.menu?.back??"BACK";
  this.weaponDetailsTitle.textContent=this.i18n.locale==="fa"?"انتخاب اسلحه · اجباری":"CHOOSE WEAPON · REQUIRED";
  this.menuSetupTitle.textContent=messages.menu?.players??"NUMBER OF PLAYERS";
  this.menuProgressTitle.textContent=messages.menu?.progressOptions??"RUN & UPGRADES";
  this.menuRunTab.textContent=messages.run?.title??"FOUR-FIGHT RUN";
  this.menuUpgradeTab.textContent=messages.panels.weaponUpgrades;
  this.menuProgressTabs.setAttribute("aria-label",messages.menu?.progressOptions??"RUN & UPGRADES");
  this.quickDuelButton.textContent=messages.menu?.quickDuel??"SOLO DUEL";
  this.quickPvpButton.textContent=messages.menu?.quickPvp??"2 PLAYERS · LOCAL";
  this.quickModes.setAttribute("aria-label",messages.menu?.players??"PLAYERS");
  this.menuSettings.setAttribute("aria-label",messages.menu?.selectMode??messages.sections.gameMode);
  this.arenaCards.setAttribute("role","group");
  this.arenaCards.setAttribute("aria-label",messages.sections.arena);
  this.menuExtrasTitle.textContent=messages.menu?.options??"SETTINGS & HELP";
  this.modeTitle.textContent=messages.sections.gameMode;
  this.arenaTitle.textContent=messages.sections.arena;
  this.refreshExtraArenaCards(this.readHud?.().arena);
  this.startingWeaponTitle.textContent=messages.sections.weapon;
  this.playerNameCaption.textContent=messages.characterNames.playerOne;
  this.secondNameCaption.textContent=messages.characterNames.playerTwo;
  this.characterPickerTitle.textContent=this.i18n.locale==="fa"?"انتخاب شخصیت · اجباری":"CHOOSE CHARACTER · REQUIRED";
  this.characterCards.setAttribute("aria-label",this.characterPickerTitle.textContent);
  for(const item of this.characterCards.children){
   const card=item as HTMLButtonElement,id=card.dataset.character as CharacterId;
   const name=this.characterLabels.get(id);
   if(name)name.textContent=CHARACTER_TEXT[this.i18n.locale][id].name;
   card.setAttribute("aria-label",CHARACTER_TEXT[this.i18n.locale][id].name);
  }
  this.playerNameInput.placeholder=messages.characterNames.optional;
  this.secondNameInput.placeholder=messages.characterNames.optional;
  this.updateButton.textContent=messages.buttons.update;
  this.helpButton.textContent=messages.buttons.help;
  this.renderGuide();
  this.help.setAttribute("aria-label",messages.buttons.help);
  this.privacy.setAttribute("aria-label",messages.privacy.title);
  this.helpCloseButton.textContent=messages.privacy.close;
  this.privacyButton.textContent=messages.privacy.button;
  this.privacyTitle.textContent=messages.privacy.title;
  this.privacyContent.innerHTML=messages.privacy.html;
  this.privacyLink.textContent=messages.privacy.web;
  this.privacyCloseButton.textContent=messages.privacy.close;
  this.mobileAttackButton.textContent=messages.buttons.attack;
  this.mobileAttackButton.setAttribute("aria-label",messages.buttons.attack+" · "+(this.i18n.locale==="fa"?"کشیدن به بالا: گرفتن":"Swipe up: Grab"));
  this.p2Attack.textContent=messages.buttons.attack;
  this.p2Attack.setAttribute("aria-label",messages.pvp?.p2+" · "+messages.buttons.attack+" · "+(this.i18n.locale==="fa"?"کشیدن به بالا: گرفتن":"Swipe up: Grab"));
  this.p2Joystick.setAttribute("aria-label",messages.pvp?.p2);
  this.p2Next.setAttribute("aria-label",messages.pvp?.p2+" · "+messages.sections.weapon);
  const pauseHint=messages.buttons.pause+(this.i18n.locale==="fa"?" · ۲ ثانیه نگه دارید":" · Hold for 2 seconds");
  this.mobilePauseButton.setAttribute("aria-label",pauseHint);
  this.mobilePauseButton.title=pauseHint;
  this.mobileWeaponSwitcher.setAttribute("aria-label",messages.details.equipped);
  this.nextWeaponButton.setAttribute("aria-label",messages.sections.weapon);
  for(const pad of this.aimPads){const label=(pad.dataset.player==="2"?messages.pvp?.p2??"P2":messages.pvp?.p1??"P1")+" · "+(this.i18n.locale==="fa"?"جهت سلاح؛ برای نشانه‌گیری بکش":"Weapon direction; drag to aim");pad.setAttribute("aria-label",label);pad.title=label;}
  this.upgradeTitle.textContent=messages.panels.weaponUpgrades;
  this.upgradeButton.textContent=messages.upgrade.upgrade;
  this.upgradeCardGrid.setAttribute("aria-label",messages.panels.weaponUpgrades);
  this.bowTitle.textContent=messages.panels.bowDraw;

  const actionLabels:Readonly<Record<UiAction,string>>={start:messages.buttons.start,pause:messages.buttons.pause,resume:messages.buttons.resume,restart:messages.buttons.restart,menu:messages.buttons.menu};
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement,action=button.dataset.action;
   if(action&&action in actionLabels)this.setText(button,actionLabels[action as UiAction]);
  }
  // The wizard's navigation buttons are not gameplay actions: never overwrite
  // their labels with undefined when locale changes.
  this.setText(this.stepNextButton,messages.menu?.nextArena??"NEXT · CHOOSE ARENA");
  this.setText(this.stepBackButton,messages.menu?.back??"BACK");
  this.onlineModeName.textContent=messages.menu?.onlineMode??"ONLINE";
  this.onlineModeBadge.textContent=messages.menu?.comingSoon??"COMING SOON";
  this.onlineModeButton.setAttribute("aria-label",this.onlineModeName.textContent+" · "+this.onlineModeBadge.textContent);
  this.onlineModeButton.title=this.onlineModeBadge.textContent;
  for(const item of this.menuSettings.children){
   if(item===this.onlineModeButton)continue;
   const card=item as HTMLButtonElement,id=card.dataset.mode as GameModeId;
   card.textContent=messages.modes[id];
   card.title=messages.menu?.modeDescriptions[id]??"";
  }
  for(const item of this.arenaCards.children){
   const card=item as HTMLButtonElement;
   const label=card.children[1] as HTMLElement;
   label.textContent=messages.arenas[card.dataset.arena as BuiltInArenaId];
   const id=card.dataset.arena as BuiltInArenaId,categories=arenaCategories(id),labels=categories.map(c=>messages.arenaCategories?.[c]??c);
   this.setText(this.arenaFeatures.get(id)!,labels.join(" · "));
   card.setAttribute("aria-label",messages.arenas[id]+" · "+labels.join(" · "));
  }
  for(const item of this.arenaFilters.children){const button=item as HTMLButtonElement;button.textContent=messages.arenaCategories?.[button.dataset.arenaCategory as ArenaCategory]??button.dataset.arenaCategory??"";}
  this.arenaFilters.setAttribute("aria-label",messages.sections.arena);this.arenaEmpty.textContent=this.i18n.locale==="fa"?"زمینی در این دسته نیست.":"No arenas in this category.";
  for(const item of this.weaponCards.children){
   const card=item as HTMLButtonElement;
   if(card===this.randomWeaponButton)continue;
   card.textContent=messages.weapons[card.dataset.startingWeapon as WeaponId];
  }
  this.randomWeaponButton.textContent=this.i18n.locale==="fa"?"انتخاب اسلحه تصادفی":"CHOOSE RANDOM WEAPON";
  for(const item of this.upgradeCardGrid.children){
   const card=item as HTMLButtonElement,id=card.dataset.upgradeWeapon as WeaponId;
   card.textContent=messages.weapons[id]+" → "+(messages.upgrades[id]?.name??id);
  }
  for(const item of this.weaponList.children){
   const button=item as HTMLButtonElement;
   button.textContent=messages.weapons[button.dataset.weapon as WeaponId];
  }
 }
}
