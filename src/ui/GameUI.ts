import {GameState} from "../core/GameState";
import type {ArenaId,GameModeId,HillState} from "../gameplay/GameSession";
import type {I18n,Locale} from "../i18n/I18n";
import type {WeaponId} from "../input/Input";

type HudState={
 playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;weapon:WeaponId;winner:"player"|"opponent"|null;arena:ArenaId;mode:GameModeId;hill:HillState;
 bowCharge:number;missileAngle:number;missilePower:number;upgradePoints:number;upgradedWeapons:readonly WeaponId[];
};
type Actions={
 start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void;weaponNext:()=>void;weaponPrevious:()=>void;
 weaponSelect:(id:WeaponId)=>void;upgradeWeapon:(id:WeaponId)=>void;arenaSelect:(id:ArenaId)=>void;modeSelect:(id:GameModeId)=>void;
 setMissileAngle:(angle:number)=>void;setMissilePower:(power:number)=>void;fireWeapon:()=>void;
 setTouchMove:(x:number,y:number)=>void;touchJump:()=>void;touchAttackStart:()=>void;touchAttackEnd:()=>void;
};
type UiAction="start"|"pause"|"resume"|"restart";

const ARENA_IDS:readonly ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins"];
const WEAPON_IDS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const MODE_IDS:readonly GameModeId[]=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const PRIVACY_POLICY_URL="https://abolfazl260.github.io/doodlegame/privacy.html";

export class GameUI{
 private root=document.createElement("section");
 private mobileControls=document.createElement("div");
 private joystick=document.createElement("div");
 private joystickThumb=document.createElement("div");
 private jumpButton=document.createElement("button");
 private mobileAttackButton=document.createElement("button");
 private bowPanel=document.createElement("div");
 private bowTitle=document.createElement("strong");
 private bowMeter=document.createElement("div");
 private bowValue=document.createElement("span");
 private help=document.createElement("div");
 private helpButton=document.createElement("button");
 private privacy=document.createElement("div");
 private privacyButton=document.createElement("button");
 private privacyTitle=document.createElement("strong");
 private privacyContent=document.createElement("div");
 private privacyLink=document.createElement("a");
 private privacyNetworkNote=document.createElement("small");
 private privacyCloseButton=document.createElement("button");
 private title=document.createElement("h1");
 private status=document.createElement("p");
 private details=document.createElement("p");
 private playerHealth=document.createElement("div");
 private opponentHealth=document.createElement("div");
 private buttons=document.createElement("div");
 private weaponList=document.createElement("div");
 private arenaTitle=document.createElement("div");
 private arenaList=document.createElement("div");
 private modeTitle=document.createElement("div");
 private modeList=document.createElement("div");
 private rotateHint=document.createElement("div");
 private upgradePanel=document.createElement("div");
 private upgradeTitle=document.createElement("strong");
 private upgradeGrid=document.createElement("div");
 private upgradePointsLabel=document.createElement("span");
 private upgradeHint=document.createElement("span");
 private playerHealthLabel=document.createElement("span");
 private opponentHealthLabel=document.createElement("span");
 private missilePanel=document.createElement("div");
 private missileTitle=document.createElement("strong");
 private angleInput=document.createElement("input");
 private powerInput=document.createElement("input");
 private angleName=document.createElement("span");
 private powerName=document.createElement("span");
 private angleLabel=document.createElement("span");
 private powerLabel=document.createElement("span");
 private fireButton=document.createElement("button");
 private languageControl=document.createElement("label");
 private languageLabel=document.createElement("span");
 private languageSelect=document.createElement("select");
 private unsubscribe:(()=>void)|null=null;
 private unsubscribeLocale:(()=>void)|null=null;
 private readHud:(()=>HudState)|null=null;
 private hudFrame:number|null=null;
 private currentState=GameState.MENU;

 constructor(container:HTMLElement,actions:Actions,private readonly i18n:I18n){
  this.root.className="game-ui";

  this.languageControl.className="game-ui__language";
  this.languageSelect.setAttribute("aria-label","Language");
  const english=document.createElement("option");english.value="en";
  const persian=document.createElement("option");persian.value="fa";
  this.languageSelect.append(english,persian);
  this.languageSelect.onchange=()=>this.i18n.setLocale(this.languageSelect.value as Locale);
  this.languageControl.append(this.languageLabel,this.languageSelect);

  this.mobileControls.className="game-ui__mobile-controls";
  this.joystick.className="game-ui__joystick";
  this.joystickThumb.className="game-ui__joystick-thumb";
  this.jumpButton.type="button";
  this.jumpButton.className="game-ui__mobile-button game-ui__mobile-button--jump";
  this.mobileAttackButton.type="button";
  this.mobileAttackButton.className="game-ui__mobile-button game-ui__mobile-button--attack";
  this.joystick.append(this.joystickThumb);
  this.mobileControls.append(this.joystick,this.jumpButton,this.mobileAttackButton);

  this.help.className="game-ui__help";
  this.help.hidden=true;

  this.privacy.className="game-ui__privacy";
  this.privacy.hidden=true;
  this.privacyContent.className="game-ui__privacy-content";
  this.privacyLink.href=PRIVACY_POLICY_URL;
  this.privacyLink.target="_blank";
  this.privacyLink.rel="noopener noreferrer";
  this.privacyNetworkNote.className="game-ui__privacy-network";
  this.privacyCloseButton.type="button";
  this.privacyCloseButton.onclick=()=>{this.privacy.hidden=true;};
  this.privacy.append(this.privacyTitle,this.privacyContent,this.privacyLink,this.privacyNetworkNote,this.privacyCloseButton);

  this.playerHealth.className="health-bar health-bar--player";
  this.opponentHealth.className="health-bar health-bar--opponent";
  this.playerHealthLabel.className="health-label";
  this.opponentHealthLabel.className="health-label";
  this.playerHealth.append(this.playerHealthLabel);
  this.opponentHealth.append(this.opponentHealthLabel);

  this.buttons.className="game-ui__controls";
  this.weaponList.className="game-ui__weapon-list";
  this.arenaTitle.className="game-ui__section-title";
  this.arenaList.className="game-ui__arena-list";
  this.modeTitle.className="game-ui__section-title";
  this.modeList.className="game-ui__mode-list";
  this.rotateHint.className="game-ui__rotate-hint";

  this.upgradePanel.className="game-ui__upgrade-panel";
  this.upgradeGrid.className="game-ui__upgrade-grid";
  this.upgradePointsLabel.className="game-ui__upgrade-points";
  this.upgradeHint.className="game-ui__upgrade-hint";
  for(const id of MODE_IDS){
   const button=document.createElement("button");
   button.type="button";
   button.dataset.mode=id;
   button.onclick=()=>actions.modeSelect(id);
   this.modeList.append(button);
  }
  for(const id of WEAPON_IDS){
   const item=document.createElement("button");
   item.type="button";
   item.dataset.upgrade=id;
   const name=document.createElement("span");
   name.className="game-ui__upgrade-name";
   const description=document.createElement("small");
   const itemState=document.createElement("b");
   itemState.className="game-ui__upgrade-status";
   item.append(name,description,itemState);
   item.onclick=()=>actions.upgradeWeapon(id);
   this.upgradeGrid.append(item);
  }
  this.upgradePanel.append(this.upgradeTitle,this.upgradePointsLabel,this.upgradeHint,this.upgradeGrid);

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
  this.angleName.className="game-ui__missile-name";
  this.powerName.className="game-ui__missile-name";
  this.angleLabel.className="game-ui__missile-value";
  this.powerLabel.className="game-ui__missile-value";
  this.angleInput.oninput=()=>actions.setMissileAngle(Number(this.angleInput.value));
  this.powerInput.oninput=()=>actions.setMissilePower(Number(this.powerInput.value));
  this.fireButton.type="button";
  this.fireButton.onclick=actions.fireWeapon;

  for(const id of ARENA_IDS){
   const button=document.createElement("button");
   button.type="button";
   button.dataset.arena=id;
   button.onclick=()=>actions.arenaSelect(id);
   this.arenaList.append(button);
  }
  for(const id of WEAPON_IDS){
   const item=document.createElement("button");
   item.type="button";
   item.dataset.weapon=id;
   item.onclick=()=>actions.weaponSelect(id);
   this.weaponList.append(item);
  }
  const uiActions:readonly [UiAction,()=>void][]=[["start",actions.start],["pause",actions.pause],["resume",actions.resume],["restart",actions.restart]];
  for(const [action,fn] of uiActions){
   const button=document.createElement("button");
   button.type="button";
   button.dataset.action=action;
   button.onclick=fn;
   this.buttons.append(button);
  }

  this.helpButton.type="button";
  this.helpButton.dataset.help="true";
  this.helpButton.onclick=()=>{this.privacy.hidden=true;this.help.hidden=!this.help.hidden;};

  this.privacyButton.type="button";
  this.privacyButton.dataset.privacy="true";
  this.privacyButton.onclick=()=>{this.help.hidden=true;this.privacy.hidden=!this.privacy.hidden;};

  this.bowMeter.innerHTML="<span></span>";
  this.bowPanel.append(this.bowTitle,this.bowMeter,this.bowValue);
  const angleRow=document.createElement("label");
  angleRow.append(this.angleName,this.angleInput,this.angleLabel);
  const powerRow=document.createElement("label");
  powerRow.append(this.powerName,this.powerInput,this.powerLabel);
  this.missilePanel.append(this.missileTitle,angleRow,powerRow,this.fireButton);

  const haptic=(duration=10)=>{if(typeof navigator!=="undefined"&&"vibrate" in navigator)navigator.vibrate(duration);};
  let joystickPointer=-1;
  const updateJoystick=(event:PointerEvent)=>{
   const rect=this.joystick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   let dx=event.clientX-cx,dy=event.clientY-cy;
   const max=Math.max(1,Math.min(rect.width,rect.height)/2-12),distance=Math.hypot(dx,dy);
   if(distance>max){dx=dx/distance*max;dy=dy/distance*max;}
   this.joystickThumb.style.transform="translate(calc(-50% + "+dx+"px), calc(-50% + "+dy+"px))";
   actions.setTouchMove(dx/max,dy/max);
  };
  this.joystick.addEventListener("pointerdown",event=>{event.preventDefault();joystickPointer=event.pointerId;this.joystick.classList.add("active");this.joystick.setPointerCapture(event.pointerId);updateJoystick(event);});
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
  this.jumpButton.addEventListener("pointerdown",event=>{event.preventDefault();haptic(12);actions.touchJump();});
  this.mobileAttackButton.addEventListener("pointerdown",event=>{event.preventDefault();haptic(16);actions.touchAttackStart();});
  this.mobileAttackButton.addEventListener("pointerup",event=>{event.preventDefault();actions.touchAttackEnd();});
  this.mobileAttackButton.addEventListener("pointercancel",event=>{event.preventDefault();actions.touchAttackEnd();});

  this.root.append(this.languageControl,this.title,this.helpButton,this.privacyButton,this.help,this.privacy,this.status,this.details,this.upgradePanel,this.modeTitle,this.modeList,this.arenaTitle,this.arenaList,this.playerHealth,this.opponentHealth,this.weaponList,this.missilePanel,this.bowPanel,this.buttons,this.mobileControls,this.rotateHint);
  container.append(this.root);
  this.applyLocale();
  this.unsubscribeLocale=this.i18n.subscribe(()=>{
   this.applyLocale();
   if(this.readHud)this.render(this.currentState,this.readHud());
  });
 }

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
  const messages=this.i18n.messages;
  this.root.classList.toggle("playing",state===GameState.PLAYING);
  this.root.classList.toggle("paused",state===GameState.PAUSED);
  this.root.classList.toggle("game-over",state===GameState.GAME_OVER);
  if(state===GameState.PLAYING)this.privacy.hidden=true;
  this.root.dataset.arena=s.arena;
  this.root.dataset.mode=s.mode;

  const upgraded=new Set(s.upgradedWeapons);
  const equipped=upgraded.has(s.weapon)?messages.upgrades[s.weapon].name:messages.weapons[s.weapon];
  this.status.textContent=s.winner?(s.winner==="player"?messages.status.win:messages.status.lose):s.mode==="king-of-hill"?messages.status.hill+"  "+s.hill.player.toFixed(1)+" — "+s.hill.opponent.toFixed(1)+" / "+s.hill.target.toFixed(0):messages.modes[s.mode];
  const playerMax=Math.max(1,s.playerMaxHealth),opponentMax=Math.max(1,s.opponentMaxHealth);
  const playerHealth=Math.max(0,Math.min(playerMax,s.playerHealth)),opponentHealth=Math.max(0,Math.min(opponentMax,s.opponentHealth));
  const player=playerHealth/playerMax*100,opponent=opponentHealth/opponentMax*100;
  this.details.textContent=messages.modes[s.mode]+"  •  "+messages.details.equipped+" "+equipped+(s.weapon==="missile"?"  •  "+messages.details.angle+" "+Math.round(s.missileAngle)+"°  •  "+messages.details.power+" "+s.missilePower.toFixed(1):"");

  this.angleInput.value=String(s.missileAngle);
  this.powerInput.value=String(s.missilePower);
  this.angleLabel.textContent=Math.round(s.missileAngle)+"°";
  this.powerLabel.textContent=s.missilePower.toFixed(1);

  for(const item of this.arenaList.children){
   const button=item as HTMLButtonElement;
   const id=button.dataset.arena as ArenaId;
   const selected=id===s.arena;
   button.classList.toggle("active",selected);
   button.setAttribute("aria-pressed",String(selected));
   button.textContent=messages.arenas[id];
  }
  for(const item of this.modeList.children){
   const button=item as HTMLButtonElement;
   const selected=button.dataset.mode===s.mode;
   button.classList.toggle("active",selected);
   button.setAttribute("aria-pressed",String(selected));
  }
  const missileRules=s.mode==="missile-duel"||(s.arena==="fortress"&&s.mode==="duel");
  for(const item of this.weaponList.children){
   const button=item as HTMLButtonElement;
   const id=button.dataset.weapon as WeaponId;
   button.classList.toggle("active",id===s.weapon);
   button.textContent=messages.weapons[id]+(upgraded.has(id)?" ★":"");
   button.hidden=missileRules?id!=="missile":s.mode==="melee-only"?(id!=="blade"&&id!=="hammer"):s.mode==="random-weapons"?id!==s.weapon:id==="missile";
  }
  for(const item of this.upgradeGrid.children){
   const button=item as HTMLButtonElement;
   const id=button.dataset.upgrade as WeaponId;
   const done=upgraded.has(id);
   button.classList.toggle("upgraded",done);
   button.disabled=done||s.upgradePoints<=0;
   const itemState=button.querySelector<HTMLElement>(".game-ui__upgrade-status");
   if(itemState)itemState.textContent=done?messages.upgrade.upgraded:s.upgradePoints>0?messages.upgrade.upgrade:messages.upgrade.locked;
  }

  this.upgradePointsLabel.textContent=messages.upgrade.points+"  "+s.upgradePoints;
  this.upgradeHint.textContent=s.upgradePoints>0?messages.upgrade.choose:messages.upgrade.earn;
  this.upgradePanel.hidden=!((state===GameState.MENU||state===GameState.GAME_OVER)&&(s.upgradePoints>0||upgraded.size>0));

  this.playerHealthLabel.textContent=Math.ceil(playerHealth)+"/"+Math.ceil(playerMax);
  this.opponentHealthLabel.textContent=Math.ceil(opponentHealth)+"/"+Math.ceil(opponentMax);
  this.playerHealth.style.setProperty("--health",player+"%");
  this.opponentHealth.style.setProperty("--health",opponent+"%");

  this.arenaList.hidden=state!==GameState.MENU&&state!==GameState.GAME_OVER;
  this.arenaTitle.hidden=this.arenaList.hidden;
  this.modeList.hidden=state!==GameState.MENU&&state!==GameState.GAME_OVER;
  this.modeTitle.hidden=this.modeList.hidden;
  this.weaponList.hidden=state!==GameState.PLAYING||s.winner!==null;
  this.missilePanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="missile";
  this.bowPanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="bow";
  this.bowMeter.firstElementChild?.setAttribute("style","width:"+Math.round(s.bowCharge*100)+"%");
  this.bowValue.textContent=s.bowCharge>0?messages.panels.releaseToFire:"";
  this.playerHealth.hidden=state!==GameState.PLAYING;
  this.opponentHealth.hidden=state!==GameState.PLAYING;
  this.mobileControls.hidden=state!==GameState.PLAYING||s.winner!==null;

  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   const action=button.dataset.action as UiAction;
   button.hidden=(action==="start"&&state!==GameState.MENU)||(action==="pause"&&state!==GameState.PLAYING)||(action==="resume"&&state!==GameState.PAUSED)||(action==="restart"&&state===GameState.MENU);
  }
 }

 dispose(){
  this.unsubscribe?.();
  this.unsubscribeLocale?.();
  this.stopHudLoop();
  this.root.remove();
 }

 private applyLocale(){
  const messages=this.i18n.messages;
  this.languageLabel.textContent=messages.language.label;
  (this.languageSelect.querySelector('option[value="en"]') as HTMLOptionElement).textContent=messages.language.english;
  (this.languageSelect.querySelector('option[value="fa"]') as HTMLOptionElement).textContent=messages.language.persian;
  this.languageSelect.value=this.i18n.locale;
  this.languageSelect.setAttribute("aria-label",messages.language.label);
  this.title.textContent=messages.title;
  this.modeTitle.textContent=messages.sections.gameMode;
  this.arenaTitle.textContent=messages.sections.arena;
  this.rotateHint.textContent=messages.rotateHint;
  this.helpButton.textContent=messages.buttons.help;
  this.help.innerHTML=messages.helpHtml;
  this.privacyButton.textContent=messages.privacy.button;
  this.privacyTitle.textContent=messages.privacy.title;
  this.privacyContent.innerHTML=messages.privacy.html;
  this.privacyLink.textContent=messages.privacy.web;
  this.privacyNetworkNote.textContent=messages.privacy.networkNote;
  this.privacyCloseButton.textContent=messages.privacy.close;
  this.jumpButton.textContent=messages.buttons.jump;
  this.mobileAttackButton.textContent=messages.buttons.attack;
  this.upgradeTitle.textContent=messages.panels.weaponUpgrades;
  this.missileTitle.textContent=messages.panels.missileControl;
  this.bowTitle.textContent=messages.panels.bowDraw;
  this.angleName.textContent=messages.details.angle;
  this.powerName.textContent=messages.details.power;
  this.fireButton.textContent=messages.buttons.fireMissile;

  const actionLabels:Readonly<Record<UiAction,string>>={start:messages.buttons.start,pause:messages.buttons.pause,resume:messages.buttons.resume,restart:messages.buttons.restart};
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   button.textContent=actionLabels[button.dataset.action as UiAction];
  }
  for(const item of this.arenaList.children){
   const button=item as HTMLButtonElement;
   button.textContent=messages.arenas[button.dataset.arena as ArenaId];
  }
  for(const item of this.modeList.children){
   const button=item as HTMLButtonElement;
   button.textContent=messages.modes[button.dataset.mode as GameModeId];
  }
  for(const item of this.weaponList.children){
   const button=item as HTMLButtonElement;
   button.textContent=messages.weapons[button.dataset.weapon as WeaponId];
  }
  for(const item of this.upgradeGrid.children){
   const button=item as HTMLButtonElement;
   const id=button.dataset.upgrade as WeaponId;
   const name=button.querySelector<HTMLElement>(".game-ui__upgrade-name");
   const description=button.querySelector<HTMLElement>("small");
   if(name)name.textContent=messages.weapons[id]+" → "+messages.upgrades[id].name;
   if(description)description.textContent=messages.upgrades[id].description;
  }
 }
}
