import {GameState} from "../core/GameState";
import type {WeaponId} from "../input/Input";
import type {ArenaId,GameModeId,HillState} from "../gameplay/GameSession";

const ARENAS:Readonly<Record<ArenaId,string>>={
 classic:"CLASSIC",towers:"TOWERS",pit:"PIT",steps:"STEPS",zigzag:"ZIGZAG",sky:"SKY",
 moving:"MOVING",fortress:"FORTRESS",bridge:"BRIDGE",crater:"CRATER",vertical:"VERTICAL",ruins:"RUINS"
};
const LABELS:Readonly<Record<WeaponId,string>>={
 blade:"BLADE",hammer:"HAMMER",blaster:"BLASTER",uzi:"UZI",boomerang:"BOOMERANG",bow:"BOW",bomb:"BOMB",missile:"MISSILE"
};
const MODES:Readonly<Record<GameModeId,string>>={duel:"DUEL","missile-duel":"MISSILE DUEL","melee-only":"MELEE ONLY","random-weapons":"RANDOM WEAPONS","sudden-death":"SUDDEN DEATH","low-gravity":"LOW GRAVITY","king-of-hill":"KING OF THE HILL"};
const UPGRADES:Readonly<Record<WeaponId,{name:string;description:string}>>={
 blade:{name:"TWIN SLASH",description:"Wider strike with heavier follow-through damage."},
 hammer:{name:"GROUND SLAM",description:"Grounded hits create a short-range shockwave."},
 blaster:{name:"BURST BLASTER",description:"Fires a three-shot vertical burst."},
 uzi:{name:"RICOCHET",description:"Bullets bounce twice from arena surfaces."},
 boomerang:{name:"DOUBLE BOOMERANG",description:"Throws two returning blades at once."},
 bow:{name:"TRIPLE ARROW",description:"A charged shot releases a three-arrow spread."},
 bomb:{name:"STICKY BOMB",description:"Bombs stick to the first platform they land on."},
 missile:{name:"CLUSTER MISSILE",description:"The main blast releases four mini missiles."}
};

type HudState={
 playerHealth:number;opponentHealth:number;weapon:WeaponId;winner:"player"|"opponent"|null;arena:ArenaId;mode:GameModeId;hill:HillState;
 bowCharge:number;missileAngle:number;missilePower:number;upgradePoints:number;upgradedWeapons:readonly WeaponId[];
};
type Actions={
 start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void;weaponNext:()=>void;weaponPrevious:()=>void;
 weaponSelect:(id:WeaponId)=>void;upgradeWeapon:(id:WeaponId)=>void;arenaSelect:(id:ArenaId)=>void;modeSelect:(id:GameModeId)=>void;
 setMissileAngle:(angle:number)=>void;setMissilePower:(power:number)=>void;fireWeapon:()=>void;
 setTouchMove:(x:number,y:number)=>void;touchJump:()=>void;touchAttackStart:()=>void;touchAttackEnd:()=>void;
};

export class GameUI{
 private root=document.createElement("section");
 private mobileControls=document.createElement("div");
 private joystick=document.createElement("div");
 private joystickThumb=document.createElement("div");
 private jumpButton=document.createElement("button");
 private mobileAttackButton=document.createElement("button");
 private bowPanel=document.createElement("div");
 private bowMeter=document.createElement("div");
 private bowValue=document.createElement("span");
 private help=document.createElement("div");
 private title=document.createElement("h1");
 private status=document.createElement("p");
 private details=document.createElement("p");
 private playerHealth=document.createElement("div");
 private opponentHealth=document.createElement("div");
 private buttons=document.createElement("div");
 private weaponList=document.createElement("div");
 private arenaList=document.createElement("div");
 private modeList=document.createElement("div");
 private rotateHint=document.createElement("div");
 private upgradePanel=document.createElement("div");
 private upgradeGrid=document.createElement("div");
 private upgradePointsLabel=document.createElement("span");
 private upgradeHint=document.createElement("span");
 private playerHealthLabel=document.createElement("span");
 private opponentHealthLabel=document.createElement("span");
 private missilePanel=document.createElement("div");
 private angleInput=document.createElement("input");
 private powerInput=document.createElement("input");
 private angleLabel=document.createElement("span");
 private powerLabel=document.createElement("span");
 private fireButton=document.createElement("button");
 private unsubscribe:(()=>void)|null=null;
 private hudFrame=0;
 private currentState=GameState.MENU;

 constructor(container:HTMLElement,actions:Actions){
  this.root.className="game-ui";
  this.mobileControls.className="game-ui__mobile-controls";
  this.joystick.className="game-ui__joystick";
  this.joystickThumb.className="game-ui__joystick-thumb";
  this.jumpButton.type="button";
  this.jumpButton.className="game-ui__mobile-button game-ui__mobile-button--jump";
  this.jumpButton.textContent="JUMP";
  this.mobileAttackButton.type="button";
  this.mobileAttackButton.className="game-ui__mobile-button game-ui__mobile-button--attack";
  this.mobileAttackButton.textContent="ATTACK";
  this.joystick.append(this.joystickThumb);
  this.mobileControls.append(this.joystick,this.jumpButton,this.mobileAttackButton);

  this.help.className="game-ui__help";
  this.help.innerHTML="<strong>HOW TO PLAY</strong><br><br><b>MOVE</b>  A / D or ← / →<br><b>JUMP</b>  W / Space / ↑<br><b>ATTACK</b>  Z / X<br><b>PREVIOUS WEAPON</b>  Q / O<br><b>NEXT WEAPON</b>  E / P<br><br><b>PROGRESSION</b><br>Win a duel to earn 1 Upgrade Point. Spend it between fights to permanently upgrade one weapon for this run.<br><br><b>WEAPONS</b><br>BLADE · HAMMER · BLASTER<br>UZI · BOOMERANG · BOW · BOMB · MISSILE";
  this.help.hidden=true;
  this.title.textContent="DOODLEGAME DUEL";

  this.playerHealth.className="health-bar health-bar--player";
  this.opponentHealth.className="health-bar health-bar--opponent";
  this.playerHealthLabel.className="health-label";
  this.opponentHealthLabel.className="health-label";
  this.playerHealth.append(this.playerHealthLabel);
  this.opponentHealth.append(this.opponentHealthLabel);

  this.buttons.className="game-ui__controls";
  this.weaponList.className="game-ui__weapon-list";
  this.arenaList.className="game-ui__arena-list";
  this.modeList.className="game-ui__mode-list";
  this.rotateHint.className="game-ui__rotate-hint";
  this.rotateHint.textContent="ROTATE DEVICE FOR A BETTER VIEW";

  this.upgradePanel.className="game-ui__upgrade-panel";
  this.upgradeGrid.className="game-ui__upgrade-grid";
  this.upgradePointsLabel.className="game-ui__upgrade-points";
  this.upgradeHint.className="game-ui__upgrade-hint";
  const upgradeTitle=document.createElement("strong");
  upgradeTitle.textContent="WEAPON UPGRADES";
  for(const id of Object.keys(UPGRADES) as WeaponId[]){
   const item=document.createElement("button");
   item.type="button";
   item.dataset.upgrade=id;
   const name=document.createElement("span");
   name.className="game-ui__upgrade-name";
   name.textContent=`${LABELS[id]} → ${UPGRADES[id].name}`;
   const description=document.createElement("small");
   description.textContent=UPGRADES[id].description;
   const state=document.createElement("b");
   state.className="game-ui__upgrade-status";
   item.append(name,description,state);
   item.onclick=()=>actions.upgradeWeapon(id);
   this.upgradeGrid.append(item);
  }
  this.upgradePanel.append(upgradeTitle,this.upgradePointsLabel,this.upgradeHint,this.upgradeGrid);

  this.missilePanel.className="game-ui__missile-panel";
  this.bowPanel.className="game-ui__bow-panel";
  this.bowMeter.className="game-ui__bow-meter";
  this.bowValue.className="game-ui__bow-value";

  this.angleInput.type="range";
  this.angleInput.min="12";
  this.angleInput.max="78";
  this.angleInput.step="1";
  this.powerInput.type="range";
  this.powerInput.min="8";
  this.powerInput.max="18";
  this.powerInput.step=".5";
  this.angleLabel.className="game-ui__missile-value";
  this.powerLabel.className="game-ui__missile-value";
  this.angleInput.oninput=()=>actions.setMissileAngle(Number(this.angleInput.value));
  this.powerInput.oninput=()=>actions.setMissilePower(Number(this.powerInput.value));
  this.fireButton.type="button";
  this.fireButton.textContent="FIRE MISSILE";
  this.fireButton.onclick=actions.fireWeapon;

  for(const id of Object.keys(ARENAS) as ArenaId[]){
   const b=document.createElement("button");
   b.type="button";
   b.dataset.arena=id;
   b.textContent=ARENAS[id];
   b.onclick=()=>actions.arenaSelect(id);
   this.arenaList.append(b);
  }
  for(const id of Object.keys(MODES) as GameModeId[]){
   const b=document.createElement("button");
   b.type="button";
   b.dataset.mode=id;
   b.textContent=MODES[id];
   b.onclick=()=>actions.modeSelect(id);
   this.modeList.append(b);
  }
  for(const id of Object.keys(LABELS) as WeaponId[]){
   const item=document.createElement("button");
   item.type="button";
   item.dataset.weapon=id;
   item.textContent=LABELS[id];
   item.onclick=()=>actions.weaponSelect(id);
   this.weaponList.append(item);
  }
  for(const [label,fn] of [["Start",actions.start],["Pause",actions.pause],["Resume",actions.resume],["Restart",actions.restart]] as const){
   const b=document.createElement("button");
   b.textContent=label;
   b.type="button";
   b.dataset.action=label;
   b.onclick=fn;
   this.buttons.append(b);
  }

  const helpButton=document.createElement("button");
  helpButton.type="button";
  helpButton.dataset.help="true";
  helpButton.textContent="HOW TO PLAY";
  helpButton.onclick=()=>{this.help.hidden=!this.help.hidden;};

  this.missilePanel.innerHTML="<strong>MISSILE CONTROL</strong>";
  this.bowPanel.innerHTML="<strong>BOW DRAW</strong>";
  this.bowMeter.innerHTML="<span></span>";
  this.bowPanel.append(this.bowMeter,this.bowValue);
  const angleRow=document.createElement("label");
  angleRow.textContent="ANGLE ";
  angleRow.append(this.angleInput,this.angleLabel);
  const powerRow=document.createElement("label");
  powerRow.textContent="POWER ";
  powerRow.append(this.powerInput,this.powerLabel);
  this.missilePanel.append(angleRow,powerRow,this.fireButton);

  const haptic=(duration=10)=>{if(typeof navigator!=="undefined"&&"vibrate" in navigator)navigator.vibrate(duration);};
  let joystickPointer=-1;
  const updateJoystick=(e:PointerEvent)=>{
   const rect=this.joystick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   let dx=e.clientX-cx,dy=e.clientY-cy;
   const max=Math.max(1,Math.min(rect.width,rect.height)/2-12),distance=Math.hypot(dx,dy);
   if(distance>max){dx=dx/distance*max;dy=dy/distance*max;}
   this.joystickThumb.style.transform="translate(calc(-50% + "+dx+"px), calc(-50% + "+dy+"px))";
   actions.setTouchMove(dx/max,dy/max);
  };
  this.joystick.addEventListener("pointerdown",e=>{e.preventDefault();joystickPointer=e.pointerId;this.joystick.classList.add("active");this.joystick.setPointerCapture(e.pointerId);updateJoystick(e);});
  this.joystick.addEventListener("pointermove",e=>{if(e.pointerId===joystickPointer)updateJoystick(e);});
  const releaseJoystick=(e:PointerEvent)=>{
   if(e.pointerId!==joystickPointer)return;
   joystickPointer=-1;
   this.joystick.classList.remove("active");
   this.joystickThumb.style.transform="translate(-50%,-50%)";
   actions.setTouchMove(0,0);
  };
  this.joystick.addEventListener("pointerup",releaseJoystick);
  this.joystick.addEventListener("pointercancel",releaseJoystick);
  this.jumpButton.addEventListener("pointerdown",e=>{e.preventDefault();haptic(12);actions.touchJump();});
  this.mobileAttackButton.addEventListener("pointerdown",e=>{e.preventDefault();haptic(16);actions.touchAttackStart();});
  this.mobileAttackButton.addEventListener("pointerup",e=>{e.preventDefault();actions.touchAttackEnd();});
  this.mobileAttackButton.addEventListener("pointercancel",e=>{e.preventDefault();actions.touchAttackEnd();});

  this.root.append(this.title,helpButton,this.help,this.status,this.details,this.upgradePanel,this.modeList,this.arenaList,this.playerHealth,this.opponentHealth,this.weaponList,this.missilePanel,this.bowPanel,this.buttons,this.mobileControls,this.rotateHint);
  container.append(this.root);
 }

 bind(subscribe:(listener:(state:GameState)=>void)=>()=>void,read:()=>HudState){
  this.unsubscribe?.();
  this.unsubscribe=subscribe(state=>{this.currentState=state;this.render(state,read());});
  this.render(GameState.MENU,read());
  const frame=()=>{
   if(this.currentState===GameState.PLAYING)this.render(this.currentState,read());
   this.hudFrame=window.requestAnimationFrame(frame);
  };
  this.hudFrame=window.requestAnimationFrame(frame);
 }

 render(state:GameState,s:HudState){
  this.root.classList.toggle("playing",state===GameState.PLAYING);
  this.root.classList.toggle("paused",state===GameState.PAUSED);
  this.root.classList.toggle("game-over",state===GameState.GAME_OVER);
  this.root.dataset.arena=s.arena;
  this.root.dataset.mode=s.mode;

  const upgraded=new Set(s.upgradedWeapons);
  const equipped=upgraded.has(s.weapon)?UPGRADES[s.weapon].name:LABELS[s.weapon];
  this.status.textContent=s.winner?(s.winner==="player"?"YOU WIN":"YOU LOSE"):s.mode==="king-of-hill"?`HILL  ${s.hill.player.toFixed(1)} — ${s.hill.opponent.toFixed(1)} / ${s.hill.target.toFixed(0)}`:MODES[s.mode];
  const player=Math.max(0,Math.min(100,s.playerHealth));
  const opponent=Math.max(0,Math.min(100,s.opponentHealth));
  this.details.textContent=`${MODES[s.mode]}  •  EQUIPPED ${equipped}${s.weapon==="missile"?`  •  ANGLE ${Math.round(s.missileAngle)}°  •  POWER ${s.missilePower.toFixed(1)}`:""}`;

  this.angleInput.value=String(s.missileAngle);
  this.powerInput.value=String(s.missilePower);
  this.angleLabel.textContent=Math.round(s.missileAngle)+"°";
  this.powerLabel.textContent=s.missilePower.toFixed(1);

  for(const item of this.arenaList.children){
   const b=item as HTMLButtonElement;
   b.classList.toggle("active",b.dataset.arena===s.arena);
  }
  for(const item of this.modeList.children){
   const b=item as HTMLButtonElement;
   b.classList.toggle("active",b.dataset.mode===s.mode);
  }
  const missileRules=s.mode==="missile-duel"||(s.arena==="fortress"&&s.mode==="duel");
  for(const item of this.weaponList.children){
   const x=item as HTMLButtonElement;
   const id=x.dataset.weapon as WeaponId;
   x.classList.toggle("active",id===s.weapon);
   x.textContent=LABELS[id]+(upgraded.has(id)?" ★":"");
   x.hidden=missileRules?id!=="missile":s.mode==="melee-only"?(id!=="blade"&&id!=="hammer"):s.mode==="random-weapons"?id!==s.weapon:id==="missile";
  }
  for(const item of this.upgradeGrid.children){
   const x=item as HTMLButtonElement;
   const id=x.dataset.upgrade as WeaponId;
   const done=upgraded.has(id);
   x.classList.toggle("upgraded",done);
   x.disabled=done||s.upgradePoints<=0;
   const status=x.querySelector<HTMLElement>(".game-ui__upgrade-status");
   if(status)status.textContent=done?"UPGRADED":s.upgradePoints>0?"UPGRADE":"LOCKED";
  }

  this.upgradePointsLabel.textContent=`UPGRADE POINTS  ${s.upgradePoints}`;
  this.upgradeHint.textContent=s.upgradePoints>0?"Choose a weapon upgrade before the next fight.":"Win a duel to earn another point.";
  this.upgradePanel.hidden=!((state===GameState.MENU||state===GameState.GAME_OVER)&&(s.upgradePoints>0||upgraded.size>0));

  this.playerHealthLabel.textContent=Math.ceil(player)+"/100";
  this.opponentHealthLabel.textContent=Math.ceil(opponent)+"/100";
  this.playerHealth.style.setProperty("--health",`${player}%`);
  this.opponentHealth.style.setProperty("--health",`${opponent}%`);

  this.arenaList.hidden=state!==GameState.MENU&&state!==GameState.GAME_OVER;
  this.modeList.hidden=state!==GameState.MENU&&state!==GameState.GAME_OVER;
  this.weaponList.hidden=state!==GameState.PLAYING||s.winner!==null;
  this.missilePanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="missile";
  this.bowPanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="bow";
  this.bowMeter.firstElementChild?.setAttribute("style",`width:${Math.round(s.bowCharge*100)}%`);
  this.bowValue.textContent=s.bowCharge>0?"RELEASE TO FIRE":"";
  this.playerHealth.hidden=state!==GameState.PLAYING;
  this.opponentHealth.hidden=state!==GameState.PLAYING;
  this.mobileControls.hidden=state!==GameState.PLAYING||s.winner!==null;

  for(const b of this.buttons.children){
   const x=b as HTMLButtonElement;
   const action=x.dataset.action;
   x.hidden=(action==="Start"&&state!==GameState.MENU)||(action==="Pause"&&state!==GameState.PLAYING)||(action==="Resume"&&state!==GameState.PAUSED)||(action==="Restart"&&state===GameState.MENU);
  }
 }

 dispose(){
  this.unsubscribe?.();
  if(this.hudFrame)window.cancelAnimationFrame(this.hudFrame);
  this.root.remove();
 }
}
