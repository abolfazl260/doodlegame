import {GameState} from "../core/GameState";
import type {ArenaId,GameModeId,HillState} from "../gameplay/GameSession";
import type {I18n} from "../i18n/I18n";
import type {WeaponId} from "../input/Input";

type HudState={
 playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;weapon:WeaponId;winner:"player"|"opponent"|null;arena:ArenaId;mode:GameModeId;hill:HillState;
 bowCharge:number;missileAngle:number;missilePower:number;upgradePoints:number;upgradedWeapons:readonly WeaponId[];
};
type Actions={
 start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void;weaponNext:()=>void;weaponPrevious:()=>void;
 weaponSelect:(id:WeaponId)=>void;selectStartingWeapon:(id:WeaponId)=>void;upgradeWeapon:(id:WeaponId)=>void;arenaSelect:(id:ArenaId)=>void;modeSelect:(id:GameModeId)=>void;
 setMissileAngle:(angle:number)=>void;setMissilePower:(power:number)=>void;fireWeapon:()=>void;
 setTouchMove:(x:number,y:number)=>void;touchAttackStart:()=>void;touchAttackEnd:()=>void;touchAttackCancel:()=>void;toggleCombatSound:()=>void;toggleCameraShake:()=>void;updateData:()=>Promise<void>;
};
type UiAction="start"|"pause"|"resume"|"restart";

const ARENA_IDS:readonly ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const WEAPON_IDS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const MODE_IDS:readonly GameModeId[]=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill"];
const PRIVACY_POLICY_URL="https://abolfazl260.github.io/doodlegame/privacy.html";

export class GameUI{
 private root=document.createElement("section");
 private mobileControls=document.createElement("div");
 private joystick=document.createElement("div");
 private joystickThumb=document.createElement("div");
 private mobileAttackButton=document.createElement("button");
 private missileAimGuide=document.createElement("div");
 private missileAimValues=document.createElement("div");
 private missileAimPath:SVGPathElement|null=null;
 private cancelTouchControls:()=>void=()=>{};
 private removeTouchLifecycle:()=>void=()=>{};
 private mobileWeaponSwitcher=document.createElement("div");
 private previousWeaponButton=document.createElement("button");
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
 private menuSettings=document.createElement("div");
 private menuLinks=document.createElement("div");
 private combatSoundButton=document.createElement("button");
 private combatShakeButton=document.createElement("button");
 private updateButton=document.createElement("button");
 private combatSoundEnabled=true;private combatShakeEnabled=true;
 private menuResult=document.createElement("div");
 private modeField=document.createElement("label");
 private arenaField=document.createElement("label");
 private weaponField=document.createElement("label");
 private modeSelect=document.createElement("select");
 private arenaSelect=document.createElement("select");
 private startingWeaponSelect=document.createElement("select");
 private startingWeaponTitle=document.createElement("div");
 private title=document.createElement("h1");
 private status=document.createElement("p");
 private details=document.createElement("p");
 private playerHealth=document.createElement("div");
 private opponentHealth=document.createElement("div");
 private buttons=document.createElement("div");
 private weaponList=document.createElement("div");
 private arenaTitle=document.createElement("div");
 private modeTitle=document.createElement("div");
 private rotateHint=document.createElement("div");
 private upgradePanel=document.createElement("div");
 private upgradeTitle=document.createElement("strong");
 private upgradeChoices=document.createElement("div");
 private upgradeSelect=document.createElement("select");
 private upgradeButton=document.createElement("button");
 private upgradeSummary=document.createElement("span");
 private upgradePointsLabel=document.createElement("span");
 private upgradeHint=document.createElement("span");
 private playerHealthLabel=document.createElement("span");
 private opponentHealthLabel=document.createElement("span");
 private playerHealthCurrent=document.createElement("span");
 private opponentHealthCurrent=document.createElement("span");
 private missilePanel=document.createElement("div");
 private missileTitle=document.createElement("strong");
 private angleInput=document.createElement("input");
 private powerInput=document.createElement("input");
 private angleName=document.createElement("span");
 private powerName=document.createElement("span");
 private angleLabel=document.createElement("span");
 private powerLabel=document.createElement("span");
 private fireButton=document.createElement("button");
 private languageControl=document.createElement("div");
 private languageLabel=document.createElement("span");
 private languageButton=document.createElement("button");
 private unsubscribe:(()=>void)|null=null;
 private unsubscribeLocale:(()=>void)|null=null;
 private readHud:(()=>HudState)|null=null;
 private hudFrame:number|null=null;
 private currentState=GameState.MENU;

 constructor(container:HTMLElement,actions:Actions,private readonly i18n:I18n){
  this.root.className="game-ui";

  this.languageControl.className="game-ui__language";
  this.languageButton.type="button";
  this.languageButton.onclick=()=>this.i18n.setLocale(this.i18n.locale==="fa"?"en":"fa");
  this.languageControl.append(this.languageLabel,this.languageButton);

  this.mobileControls.className="game-ui__mobile-controls";
  this.joystick.className="game-ui__joystick";
  this.joystickThumb.className="game-ui__joystick-thumb";
  this.mobileAttackButton.type="button";
  this.mobileAttackButton.className="game-ui__mobile-button game-ui__mobile-button--attack";
  this.mobileWeaponSwitcher.className="game-ui__mobile-weapon-switcher";
  this.mobileWeaponSwitcher.setAttribute("role","group");
  this.previousWeaponButton.type="button";
  this.previousWeaponButton.textContent="‹";
  this.mobileWeaponName.className="game-ui__mobile-weapon-name";
  this.mobileWeaponName.dir="auto";
  this.mobileWeaponName.setAttribute("aria-live","polite");
  this.mobileWeaponName.setAttribute("aria-atomic","true");
  this.mobileWeaponIndex.className="game-ui__mobile-weapon-index";
  const weaponDisplay=document.createElement("div");
  weaponDisplay.className="game-ui__mobile-weapon-display";
  weaponDisplay.append(this.mobileWeaponName,this.mobileWeaponIndex);
  this.nextWeaponButton.type="button";
  this.nextWeaponButton.textContent="›";
  this.previousWeaponButton.className="game-ui__mobile-weapon-arrow";
  this.nextWeaponButton.className="game-ui__mobile-weapon-arrow";
  this.mobileWeaponSwitcher.append(weaponDisplay,this.previousWeaponButton,this.nextWeaponButton);
  this.joystick.append(this.joystickThumb);
  this.mobileControls.append(this.mobileWeaponSwitcher,this.joystick,this.mobileAttackButton);
  this.missileAimGuide.className="game-ui__missile-aim-guide";
  this.missileAimGuide.hidden=true;
  this.missileAimGuide.setAttribute("aria-live","off");
  this.missileAimValues.className="game-ui__missile-aim-values";
  this.missileAimGuide.append(this.missileAimValues);
  if(typeof document.createElementNS==="function"){
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
   svg.setAttribute("viewBox","0 0 220 118");
   svg.setAttribute("aria-hidden","true");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");
   path.setAttribute("fill","none");
   path.setAttribute("stroke","currentColor");
   path.setAttribute("stroke-width","2.5");
   path.setAttribute("stroke-dasharray","4 5");
   path.setAttribute("stroke-linecap","round");
   this.missileAimPath=path;
   svg.append(path);
   this.missileAimGuide.append(svg);
  }
  this.mobileControls.append(this.missileAimGuide);

  this.help.className="game-ui__help game-ui__menu-dialog";
  this.help.hidden=true;
  this.help.setAttribute("role","dialog");
  this.help.setAttribute("aria-modal","true");
  this.helpContent.className="game-ui__help-content";
  this.helpCloseButton.type="button";
  this.helpCloseButton.className="game-ui__dialog-close";
  this.help.append(this.helpContent,this.helpCloseButton);

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

  this.playerHealth.className="health-bar health-bar--player";
  this.opponentHealth.className="health-bar health-bar--opponent";
  this.playerHealthLabel.className="health-label";
  this.opponentHealthLabel.className="health-label";
  this.playerHealthCurrent.className="health-label__current";
  this.opponentHealthCurrent.className="health-label__current";
  this.playerHealthLabel.append(this.playerHealthCurrent);
  this.opponentHealthLabel.append(this.opponentHealthCurrent);
  this.playerHealth.append(this.playerHealthLabel);
  this.opponentHealth.append(this.opponentHealthLabel);

  this.buttons.className="game-ui__controls";
  this.weaponList.className="game-ui__weapon-list";
  this.menu.className="game-ui__menu";
  this.menuHeader.className="game-ui__menu-header";
  this.menuSettings.className="game-ui__menu-settings";
  this.menuLinks.className="game-ui__menu-links";
  this.menuResult.className="game-ui__menu-result";
  this.menuResult.hidden=true;
  this.arenaField.className="game-ui__menu-field";
  this.modeField.className="game-ui__menu-field";
  this.weaponField.className="game-ui__menu-field";
  this.startingWeaponTitle.className="game-ui__section-title";
  this.startingWeaponSelect.className="game-ui__menu-select";
  this.startingWeaponSelect.onchange=()=>actions.selectStartingWeapon(this.startingWeaponSelect.value as WeaponId);
  this.arenaTitle.className="game-ui__section-title";
  this.modeTitle.className="game-ui__section-title";
  this.arenaSelect.className="game-ui__menu-select";
  this.modeSelect.className="game-ui__menu-select";
  this.arenaSelect.onchange=()=>actions.arenaSelect(this.arenaSelect.value as ArenaId);
  this.modeSelect.onchange=()=>actions.modeSelect(this.modeSelect.value as GameModeId);
  for(const id of ARENA_IDS){
   const option=document.createElement("option");
   option.value=id;
   this.arenaSelect.append(option);
  }
  for(const id of MODE_IDS){
   const option=document.createElement("option");
   option.value=id;
   this.modeSelect.append(option);
  }
  for(const id of WEAPON_IDS){
   const option=document.createElement("option");
   option.value=id;
   this.startingWeaponSelect.append(option);
  }
  this.arenaField.append(this.arenaTitle,this.arenaSelect);
  this.modeField.append(this.modeTitle,this.modeSelect);
  this.weaponField.append(this.startingWeaponTitle,this.startingWeaponSelect);
  this.menuSettings.append(this.modeField,this.arenaField,this.weaponField);
  this.menuHeader.append(this.title,this.languageControl);
  this.rotateHint.className="game-ui__rotate-hint";

  this.upgradePanel.className="game-ui__upgrade-panel game-ui__upgrade-panel--compact";
  this.upgradeChoices.className="game-ui__upgrade-choices";
  this.upgradePointsLabel.className="game-ui__upgrade-points";
  this.upgradeHint.className="game-ui__upgrade-hint";
  this.upgradeSummary.className="game-ui__upgrade-summary";
  this.upgradeSelect.setAttribute("aria-label",this.i18n.messages.panels.weaponUpgrades);
  this.upgradeButton.type="button";
  this.upgradeButton.onclick=()=>{
   if(!this.upgradeButton.disabled)actions.upgradeWeapon(this.upgradeSelect.value as WeaponId);
  };
  for(const id of WEAPON_IDS){
   const option=document.createElement("option");
   option.value=id;
   this.upgradeSelect.append(option);
  }
  this.upgradeSelect.onchange=()=>{
   const id=this.upgradeSelect.value as WeaponId;
   this.upgradeHint.textContent=this.i18n.messages.upgrades[id].description;
  };
  this.upgradeChoices.append(this.upgradeSelect,this.upgradeButton);
  this.upgradePanel.append(this.upgradeTitle,this.upgradePointsLabel,this.upgradeChoices,this.upgradeHint,this.upgradeSummary);

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
  this.helpButton.onclick=()=>{
   this.privacy.hidden=true;
   this.help.hidden=false;
   this.helpCloseButton.focus();
  };
  this.helpCloseButton.onclick=()=>{this.help.hidden=true;this.helpButton.focus();};

  this.privacyButton.type="button";
  this.privacyButton.dataset.privacy="true";
  this.privacyButton.onclick=()=>{
   this.help.hidden=true;
   this.privacy.hidden=false;
   this.privacyCloseButton.focus();
  };
  this.root.addEventListener("keydown",event=>{
   if(event.key!=="Escape")return;
   if(!this.help.hidden){event.preventDefault();event.stopPropagation();this.helpCloseButton.click();}
   else if(!this.privacy.hidden){event.preventDefault();event.stopPropagation();this.privacyCloseButton.click();}
  });

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
  this.previousWeaponButton.onclick=()=>{haptic(8);actions.weaponPrevious();};
  this.nextWeaponButton.onclick=()=>{haptic(8);actions.weaponNext();};
  // A captured pointer owns ATTACK independently of the movement joystick.
  // Missile gestures fire only on pointerup; cancellation never launches a missile.
  let attackPointer=-1;
  let attackWeapon:WeaponId|null=null;
  let startX=0,startY=0,baseAngle=45,basePower=13;
  const clearAttack=()=>{
   const id=attackPointer;
   attackPointer=-1;
   attackWeapon=null;
   this.missileAimGuide.hidden=true;
   this.mobileAttackButton.classList.remove("aiming");
   if(id!==-1&&this.mobileAttackButton.hasPointerCapture?.(id))this.mobileAttackButton.releasePointerCapture(id);
  };
  const cancelAttack=()=>{
   if(attackPointer===-1)return;
   const weapon=attackWeapon;
   clearAttack();
   if(weapon!=="missile")actions.touchAttackCancel();
  };
  const cancelControls=()=>{
   cancelAttack();
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
  this.mobileAttackButton.addEventListener("pointerdown",event=>{
   if(attackPointer!==-1||this.currentState!==GameState.PLAYING)return;
   const hud=this.readHud?.();
   if(!hud||hud.winner!==null)return;
   event.preventDefault();
   attackPointer=event.pointerId;
   attackWeapon=hud.weapon;
   startX=event.clientX;
   startY=event.clientY;
   baseAngle=hud.missileAngle;
   basePower=hud.missilePower;
   this.mobileAttackButton.setPointerCapture?.(event.pointerId);
   haptic(16);
   if(attackWeapon==="missile"){
    this.mobileAttackButton.classList.add("aiming");
    this.missileAimGuide.hidden=false;
    this.updateMissileAimGuide(baseAngle,basePower);
   }else actions.touchAttackStart();
  });
  this.mobileAttackButton.addEventListener("pointermove",event=>{
   if(attackPointer!==event.pointerId||attackWeapon!=="missile")return;
   const hud=this.readHud?.();
   if(this.currentState!==GameState.PLAYING||!hud||hud.winner!==null||hud.weapon!=="missile"){cancelAttack();return;}
   event.preventDefault();
   const dx=event.clientX-startX,dy=startY-event.clientY;
   const distance=Math.hypot(dx,dy);
   // Short taps fire with the previously selected angle/power.
   const angle=distance<12?baseAngle:Math.max(12,Math.min(78,Math.round(Math.atan2(Math.max(0,dy),Math.max(1,Math.abs(dx)))*180/Math.PI)));
   const power=distance<12?basePower:Math.max(8,Math.min(18,Math.round((8+Math.min(1,distance/160)*10)*2)/2));
   actions.setMissileAngle(angle);
   actions.setMissilePower(power);
   this.updateMissileAimGuide(angle,power);
  });
  this.mobileAttackButton.addEventListener("pointerup",event=>{
   if(attackPointer!==event.pointerId)return;
   event.preventDefault();
   const weapon=attackWeapon,hud=this.readHud?.();
   const mayFire=this.currentState===GameState.PLAYING&&hud?.winner===null&&hud.weapon===weapon;
   clearAttack();
   if(!mayFire){if(weapon!=="missile")actions.touchAttackCancel();return;}
   if(weapon==="missile")actions.fireWeapon();
   else actions.touchAttackEnd();
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
  this.menuLinks.append(this.helpButton,this.privacyButton,this.combatSoundButton,this.combatShakeButton,this.updateButton);
  this.menu.append(this.menuHeader,this.menuResult,this.menuSettings,this.upgradePanel,this.buttons,this.menuLinks);
  this.root.append(this.menu,this.help,this.privacy,this.status,this.details,this.playerHealth,this.opponentHealth,this.weaponList,this.missilePanel,this.bowPanel,this.mobileControls,this.rotateHint);
  container.append(this.root);
  this.applyLocale();
  this.unsubscribeLocale=this.i18n.subscribe(()=>{
   this.applyLocale();
   if(this.readHud)this.render(this.currentState,this.readHud());
  });
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
  const messages=this.i18n.messages;
  this.root.classList.toggle("playing",state===GameState.PLAYING);
  this.root.classList.toggle("paused",state===GameState.PAUSED);
  this.root.classList.toggle("game-over",state===GameState.GAME_OVER);
  if(state===GameState.PLAYING){this.privacy.hidden=true;this.help.hidden=true;}
  this.root.classList.toggle("menu",state===GameState.MENU);
  this.menuResult.hidden=state!==GameState.GAME_OVER;
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

  this.arenaSelect.value=s.arena;
  this.modeSelect.value=s.mode;
  this.menuResult.textContent=this.status.textContent;
  const missileRules=s.mode==="missile-duel"||(s.arena==="fortress"&&s.mode==="duel");
  this.startingWeaponSelect.value=s.weapon;
  this.startingWeaponSelect.disabled=missileRules||s.mode==="random-weapons";
  for(const option of this.startingWeaponSelect.options){
   const id=option.value as WeaponId;
   option.disabled=missileRules?id!=="missile":s.mode==="random-weapons"||(
    s.mode==="melee-only"?id!=="blade"&&id!=="hammer":id==="missile"
   );
  }
  for(const item of this.weaponList.children){
   const button=item as HTMLButtonElement;
   const id=button.dataset.weapon as WeaponId;
   button.classList.toggle("active",id===s.weapon);
   button.textContent=messages.weapons[id]+(upgraded.has(id)?" ★":"");
   button.hidden=missileRules?id!=="missile":s.mode==="melee-only"?(id!=="blade"&&id!=="hammer"):s.mode==="random-weapons"?id!==s.weapon:id==="missile";
   button.disabled=button.hidden||s.mode==="random-weapons";
  }
  const available=WEAPON_IDS.filter(id=>!upgraded.has(id));
  const selected=available.includes(this.upgradeSelect.value as WeaponId)?this.upgradeSelect.value as WeaponId:available[0];
  if(selected)this.upgradeSelect.value=selected;
  for(const option of this.upgradeSelect.options)option.disabled=upgraded.has(option.value as WeaponId);
  this.upgradeSelect.disabled=s.upgradePoints<=0||available.length===0;
  this.upgradeButton.disabled=this.upgradeSelect.disabled;
  this.upgradeChoices.hidden=this.upgradeSelect.disabled;
  this.upgradeSummary.hidden=upgraded.size===0||s.upgradePoints>0;
  this.upgradeSummary.textContent=WEAPON_IDS.filter(id=>upgraded.has(id)).map(id=>messages.upgrades[id].name).join(" · ");

  this.upgradePointsLabel.textContent=messages.upgrade.points+"  "+s.upgradePoints;
  this.upgradeHint.textContent=s.upgradePoints>0&&selected?messages.upgrades[selected].description:messages.upgrade.earn;
  this.upgradePanel.hidden=!((state===GameState.MENU||state===GameState.GAME_OVER)&&(s.upgradePoints>0||upgraded.size>0));

  const hpFormatter=new Intl.NumberFormat(this.i18n.locale==="fa"?"fa-IR":"en-US",{useGrouping:false,maximumFractionDigits:0});
  this.playerHealthCurrent.textContent=hpFormatter.format(Math.ceil(playerHealth));
  this.opponentHealthCurrent.textContent=hpFormatter.format(Math.ceil(opponentHealth));
  this.playerHealth.style.setProperty("--health",player+"%");
  this.opponentHealth.style.setProperty("--health",opponent+"%");

  this.menuSettings.hidden=state!==GameState.MENU&&state!==GameState.GAME_OVER;
  this.weaponList.hidden=state!==GameState.PLAYING||s.winner!==null;
  this.mobileWeaponSwitcher.hidden=state!==GameState.PLAYING||s.winner!==null||missileRules||s.mode==="random-weapons";
  const availableWeapons=WEAPON_IDS.filter(id=>id!=="missile"&&(s.mode!=="melee-only"||id==="blade"||id==="hammer"));
  const mobileWeaponName=messages.weapons[s.weapon]+(upgraded.has(s.weapon)?" ★":"");
  if(this.mobileWeaponName.textContent!==mobileWeaponName)this.mobileWeaponName.textContent=mobileWeaponName;
  this.mobileWeaponName.title=equipped;
  const position=availableWeapons.indexOf(s.weapon);
  const weaponIndex=(position<0?0:position+1)+"/"+availableWeapons.length;
  if(this.mobileWeaponIndex.textContent!==weaponIndex)this.mobileWeaponIndex.textContent=weaponIndex;
  this.missilePanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="missile";
  this.bowPanel.hidden=state!==GameState.PLAYING||s.winner!==null||s.weapon!=="bow";
  this.bowMeter.firstElementChild?.setAttribute("style","width:"+Math.round(s.bowCharge*100)+"%");
  this.bowValue.textContent=s.bowCharge>0?messages.panels.releaseToFire:"";
  this.playerHealth.hidden=state!==GameState.PLAYING;
  this.opponentHealth.hidden=state!==GameState.PLAYING;
  this.mobileControls.hidden=state!==GameState.PLAYING||s.winner!==null;
  if(state!==GameState.PLAYING||s.winner!==null)this.cancelTouchControls();

  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   const action=button.dataset.action as UiAction;
   button.hidden=(action==="start"&&state!==GameState.MENU)||(action==="pause"&&state!==GameState.PLAYING)||(action==="resume"&&state!==GameState.PAUSED)||(action==="restart"&&state===GameState.MENU);
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
 private updateMissileAimGuide(angle:number,power:number){
  const details=this.i18n.messages.details;
  this.missileAimValues.textContent=details.angle+" "+Math.round(angle)+"°  ·  "+details.power+" "+power.toFixed(1);
  if(!this.missileAimPath)return;
  const radians=angle*Math.PI/180,vx=Math.cos(radians)*power,vy=Math.sin(radians)*power;
  const points:string[]=[];
  // Preview uses the game's missile launch speed and -7.8 vertical acceleration.
  for(let i=0;i<=28;i++){
   const t=i*.1,x=8+vx*t*4.6,y=109-(vy*t-3.9*t*t)*4.6;
   if(x>219||y<4||y>117)break;
   points.push((points.length?"L":"M")+x.toFixed(1)+" "+y.toFixed(1));
  }
  this.missileAimPath.setAttribute("d",points.join(" "));
 }
 dispose(){
  this.cancelTouchControls();
  this.removeTouchLifecycle();
  this.unsubscribe?.();
  this.unsubscribeLocale?.();
  this.stopHudLoop();
  this.root.remove();
 }

 private applyLocale(){
  const messages=this.i18n.messages;
  this.refreshCombatLabels();
  this.languageLabel.textContent=messages.language.label;
  const currentLanguage=this.i18n.locale==="fa"?messages.language.persian:messages.language.english;
  this.languageButton.textContent=this.i18n.locale==="fa"?"فا":"EN";
  this.languageButton.setAttribute("aria-label",messages.language.label+": "+currentLanguage);
  this.title.textContent=messages.title;
  this.modeTitle.textContent=messages.sections.gameMode;
  this.arenaTitle.textContent=messages.sections.arena;
  this.startingWeaponTitle.textContent=messages.sections.weapon;
  this.rotateHint.textContent=messages.rotateHint;
  this.updateButton.textContent=messages.buttons.update;
  this.helpButton.textContent=messages.buttons.help;
  this.helpContent.innerHTML=messages.helpHtml;
  this.help.setAttribute("aria-label",messages.buttons.help);
  this.privacy.setAttribute("aria-label",messages.privacy.title);
  this.helpCloseButton.textContent=messages.privacy.close;
  this.privacyButton.textContent=messages.privacy.button;
  this.privacyTitle.textContent=messages.privacy.title;
  this.privacyContent.innerHTML=messages.privacy.html;
  this.privacyLink.textContent=messages.privacy.web;
  this.privacyCloseButton.textContent=messages.privacy.close;
  this.mobileAttackButton.textContent=messages.buttons.attack;
  this.mobileWeaponSwitcher.setAttribute("aria-label",messages.details.equipped);
  this.previousWeaponButton.setAttribute("aria-label",messages.buttons.previousWeapon);
  this.nextWeaponButton.setAttribute("aria-label",messages.buttons.nextWeapon);
  this.upgradeTitle.textContent=messages.panels.weaponUpgrades;
  this.upgradeButton.textContent=messages.upgrade.upgrade;
  this.upgradeSelect.setAttribute("aria-label",messages.panels.weaponUpgrades);
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
  for(const option of this.arenaSelect.options)option.textContent=messages.arenas[option.value as ArenaId];
  for(const option of this.modeSelect.options)option.textContent=messages.modes[option.value as GameModeId];
  for(const option of this.startingWeaponSelect.options)option.textContent=messages.weapons[option.value as WeaponId];
  for(const option of this.upgradeSelect.options){
   const id=option.value as WeaponId;
   option.textContent=messages.weapons[id]+" → "+messages.upgrades[id].name;
  }
  for(const item of this.weaponList.children){
   const button=item as HTMLButtonElement;
   button.textContent=messages.weapons[button.dataset.weapon as WeaponId];
  }
 }
}
