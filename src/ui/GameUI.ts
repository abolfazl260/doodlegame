import {GameState} from "../core/GameState";
import {getArenaTheme} from "../themes/ArenaThemes";
import type {ArenaId,GameModeId,HillState} from "../gameplay/GameSession";
import type {I18n} from "../i18n/I18n";
import type {WeaponId} from "../input/Input";
import type {ProgressionView} from "../progression/Progression";

type HudState={
 playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;weapon:WeaponId;winner:"player"|"opponent"|"draw"|null;arena:ArenaId;mode:GameModeId;hill:HillState;
 bowCharge:number;missileAngle:number;missilePower:number;playerFacing:number;upgradePoints:number;upgradedWeapons:readonly WeaponId[];
 progression?:ProgressionView|null;inRun?:boolean;secondWeapon?:WeaponId;secondBowCharge?:number;
};
type Actions={
 newRun?:()=>void;continueRun?:()=>void;leaveRun?:()=>void;
 start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void;stopToMenu?:()=>void;weaponNext:()=>void;weaponPrevious:()=>void;
 weaponSelect:(id:WeaponId)=>void;selectStartingWeapon:(id:WeaponId)=>void;upgradeWeapon:(id:WeaponId)=>void;arenaSelect:(id:ArenaId)=>void;modeSelect:(id:GameModeId)=>void;
 setMissileAngle:(angle:number)=>void;setMissilePower:(power:number)=>void;fireWeapon:()=>void;
 setTouchMove:(x:number,y:number)=>void;touchAttackStart:()=>void;touchAttackEnd:()=>void;touchAttackCancel:()=>void;
 setPlayer2TouchMove?:(x:number,y:number)=>void;player2AttackStart?:()=>void;player2AttackEnd?:()=>void;player2AttackCancel?:()=>void;player2WeaponNext?:()=>void;player2WeaponPrevious?:()=>void;
 toggleCombatSound:()=>void;toggleCameraShake:()=>void;updateData:()=>Promise<void>;
};
type UiAction="start"|"pause"|"resume"|"restart"|"menu";
type MenuStep="mode"|"arena";
// Append another step here and give it a page in syncWizard to extend the setup.
const MENU_STEPS:readonly MenuStep[]=["mode","arena"];

const ARENA_IDS:readonly ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const WEAPON_IDS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const MODE_IDS:readonly GameModeId[]=["duel","missile-duel","melee-only","random-weapons","sudden-death","low-gravity","king-of-hill","local-pvp"];
const PRIVACY_POLICY_URL="https://abolfazl260.github.io/doodlegame/privacy.html";

export class GameUI{
 private root=document.createElement("section");
 private mobileControls=document.createElement("div");
 private p2Controls=document.createElement("div");
 private p2Joystick=document.createElement("div");
 private p2Thumb=document.createElement("div");
 private p2Attack=document.createElement("button");
 private p2WeaponControls=document.createElement("div");
 private p2WeaponName=document.createElement("span");
 private p2Prev=document.createElement("button");
 private p2Next=document.createElement("button");
 private cancelP2TouchControls:()=>void=()=>{};
 private cancelP2Attack:()=>void=()=>{};
 private joystick=document.createElement("div");
 private joystickThumb=document.createElement("div");
 private mobileAttackButton=document.createElement("button");
 private mobilePauseButton=document.createElement("button");
 private missileAimGuide=document.createElement("div");
 private missileAimValues=document.createElement("div");
 private missileAimPath:SVGPathElement|null=null;
 private lastAimGuide:{angle:number;power:number;facing:number;locale:string}|null=null;
 private cancelTouchControls:()=>void=()=>{};
 private cancelActiveTouchAttack:()=>void=()=>{};
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
 private menuSetupSection=document.createElement("section");
 private menuLead=document.createElement("div");
 private menuSetupTitle=document.createElement("h2");
 private quickModes=document.createElement("div");
 private quickDuelButton=document.createElement("button");
 private quickPvpButton=document.createElement("button");
 private modeDescription=document.createElement("p");
 private matchSummary=document.createElement("p");
 private menuExtras=document.createElement("details");
 private menuExtrasTitle=document.createElement("summary");
 private menuSettings=document.createElement("div");
 private menuStepIndex=0;
 private lastSoloMode:GameModeId="duel";
 private menuProgress=document.createElement("div");
 private menuModePanel=document.createElement("section");
 private menuArenaPanel=document.createElement("section");
 private arenaCards=document.createElement("div");
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
 private lastView:{state:GameState;locale:string;arena:ArenaId;mode:GameModeId;weapon:WeaponId;winner:"player"|"opponent"|"draw"|null;upgradePoints:number;upgradedWeapons:readonly WeaponId[];progressKey:string;inRun:boolean;secondWeapon?:WeaponId}|null=null;
 private lastHealth:{playerHealth:number;playerMaxHealth:number;opponentHealth:number;opponentMaxHealth:number;locale:string}|null=null;
 private lastAim:{angle:number;power:number}|null=null;
 private lastBowPercent=NaN;
 private lastBowCharging=false;
 private lastHill:{player:number;opponent:number;target:number}|null=null;
 private hpFormatter:Intl.NumberFormat|null=null;
 private hpFormatterLocale="";
 private setText(node:HTMLElement,value:string){if(node.textContent!==value)node.textContent=value;}
 private setHidden(node:HTMLElement,hidden:boolean){if(node.hidden!==hidden)node.hidden=hidden;}

 constructor(container:HTMLElement,actions:Actions,private readonly i18n:I18n){
  this.root.className="game-ui";

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
  this.p2Prev.type="button";this.p2Next.type="button";
  this.p2Prev.textContent="‹";this.p2Next.textContent="›";
  this.p2WeaponControls.append(this.p2Prev,this.p2WeaponName,this.p2Next);
  this.p2Controls.append(this.p2Joystick,this.p2Attack,this.p2WeaponControls);
  this.p2Controls.hidden=true;
  this.p2Prev.onclick=()=>actions.player2WeaponPrevious?.();
  this.p2Next.onclick=()=>actions.player2WeaponNext?.();
  this.joystick.className="game-ui__joystick";
  this.joystickThumb.className="game-ui__joystick-thumb";
  this.mobileAttackButton.type="button";
  this.mobileAttackButton.className="game-ui__mobile-button game-ui__mobile-button--attack";
  this.mobilePauseButton.type="button";
  this.mobilePauseButton.className="game-ui__mobile-pause";
  this.mobilePauseButton.textContent="Ⅱ";
  this.mobilePauseButton.onclick=()=>{if(this.currentState===GameState.PLAYING)actions.pause();};
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
  this.mobileControls.append(this.mobileWeaponSwitcher,this.joystick,this.mobileAttackButton,this.mobilePauseButton,this.p2Controls);
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

  this.topHud.className="game-ui__top-hud";
  this.status.className="game-ui__status";
  this.details.className="game-ui__details";
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
  this.menuSetupSection.className="game-ui__menu-setup";
  this.menuLead.className="game-ui__menu-lead";
  this.menuSetupTitle.className="game-ui__menu-setup-title";
  this.quickModes.className="game-ui__quick-modes";
  this.quickModes.setAttribute("role","group");
  this.quickDuelButton.type="button";
  this.quickPvpButton.type="button";
  this.quickDuelButton.className="game-ui__quick-mode";
  this.quickPvpButton.className="game-ui__quick-mode";
  this.quickDuelButton.dataset.quickMode="duel";
  this.quickPvpButton.dataset.quickMode="local-pvp";
  this.quickDuelButton.onclick=()=>actions.modeSelect(this.lastSoloMode);
  this.quickPvpButton.onclick=()=>actions.modeSelect("local-pvp");
  this.quickModes.append(this.quickDuelButton,this.quickPvpButton);
  this.modeDescription.className="game-ui__mode-description";
  this.matchSummary.className="game-ui__match-summary";
  this.matchSummary.setAttribute("aria-live","polite");
  this.matchSummary.setAttribute("aria-atomic","true");
  this.menuExtras.className="game-ui__menu-extras";
  this.menuExtrasTitle.className="game-ui__menu-extras-title";
  this.menuExtras.append(this.menuExtrasTitle);
  this.menuSettings.className="game-ui__menu-settings game-ui__mode-grid";
  this.pvpHint.className="game-ui__pvp-hint";this.pvpHint.hidden=true;
  this.menuLinks.className="game-ui__menu-links";
  this.menuResult.className="game-ui__menu-result";this.menuResult.hidden=true;
  this.modeTitle.className="game-ui__section-title";
  this.arenaTitle.className="game-ui__section-title";
  this.startingWeaponTitle.className="game-ui__section-title";
  this.menuProgress.className="game-ui__menu-progress";
  this.menuProgress.setAttribute("aria-live","polite");
  this.menuModePanel.className="game-ui__menu-mode-panel";
  this.menuArenaPanel.className="game-ui__menu-arena-panel";this.menuArenaPanel.hidden=true;
  this.arenaCards.className="game-ui__arena-grid";
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
  for(const [index,id] of ARENA_IDS.entries()){
   const theme=getArenaTheme(id),card=document.createElement("button");
   card.type="button";card.className="game-ui__arena-card";
   card.dataset.arena=id;
   card.setAttribute("aria-pressed","false");
   card.style.setProperty("--card-accent",theme.accent);
   card.style.setProperty("--card-secondary",theme.secondary);
   const ordinal=document.createElement("span");
   ordinal.className="game-ui__arena-number";
   ordinal.textContent=String(index+1).padStart(2,"0");
   const label=document.createElement("strong");
   label.className="game-ui__arena-name";
   card.append(ordinal,label);
   card.onclick=()=>actions.arenaSelect(id);
   this.arenaCards.append(card);
  }
  for(const id of WEAPON_IDS){
   const card=document.createElement("button");
   card.type="button";card.className="game-ui__loadout-card";
   card.dataset.startingWeapon=id;
   card.setAttribute("aria-pressed","false");
   card.onclick=()=>actions.selectStartingWeapon(id);
   this.weaponCards.append(card);
  }
  this.menuModePanel.append(this.quickModes,this.menuSetupTitle,this.modeTitle,this.menuSettings,this.modeDescription,this.pvpHint);
  this.menuArenaPanel.append(this.arenaTitle,this.arenaCards,this.weaponDetails,this.matchSummary);
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
  this.stepBackButton.type="button";this.stepNextButton.type="button";
  this.stepBackButton.dataset.action="back";this.stepNextButton.dataset.action="next";
  this.stepBackButton.onclick=()=>this.changeMenuStep(this.menuStepIndex-1);
  this.stepNextButton.onclick=()=>this.changeMenuStep(this.menuStepIndex+1);
  this.buttons.append(this.stepBackButton,this.stepNextButton);
  const uiActions:[UiAction,()=>void][]=[["start",actions.start],["pause",actions.pause],["resume",actions.resume],["restart",actions.restart]];
  if(actions.stopToMenu)uiActions.push(["menu",actions.stopToMenu]);
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
   this.cancelP2TouchControls();
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
   const rect=this.p2Joystick.getBoundingClientRect();
   const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   let dx=event.clientX-cx,dy=event.clientY-cy;
   const limit=Math.max(1,Math.min(rect.width,rect.height)/2-12);
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
  const clearP2Attack=()=>{
   const id=p2AttackPointer;p2AttackPointer=-1;
   if(id!==-1&&this.p2Attack.hasPointerCapture?.(id))this.p2Attack.releasePointerCapture(id);
  };
  const cancelP2Attack=()=>{
   if(p2AttackPointer===-1)return;
   clearP2Attack();
   actions.player2AttackCancel?.();
  };
  this.cancelP2Attack=cancelP2Attack;
  this.p2Attack.addEventListener("pointerdown",event=>{
   if(p2AttackPointer!==-1||this.currentState!==GameState.PLAYING)return;
   if(this.readHud?.().winner!==null)return;
   event.preventDefault();p2AttackPointer=event.pointerId;
   try{this.p2Attack.setPointerCapture(event.pointerId);}
   catch{p2AttackPointer=-1;return;}
   actions.player2AttackStart?.();
  });
  this.p2Attack.addEventListener("pointerup",event=>{
   if(event.pointerId!==p2AttackPointer)return;
   event.preventDefault();clearP2Attack();
   if(this.currentState!==GameState.PLAYING||this.readHud?.().winner!==null)actions.player2AttackCancel?.();
   else actions.player2AttackEnd?.();
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
   baseAngle=hud.missileAngle;
   basePower=hud.missilePower;
   try{this.mobileAttackButton.setPointerCapture?.(event.pointerId);}
   catch{
    // An inactive/uncapturable pointer must never leave ATTACK held.
    attackPointer=-1;
    attackWeapon=null;
    return;
   }
   haptic(16);
   if(attackWeapon==="missile"){
    this.mobileAttackButton.classList.add("aiming");
    this.missileAimGuide.hidden=false;
    this.updateMissileAimGuide(baseAngle,basePower,hud.playerFacing);
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
   this.updateMissileAimGuide(angle,power,hud.playerFacing);
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
  this.runPanel.className="game-ui__run-panel";
  this.runPanel.hidden=true;
  this.runHeading.className="game-ui__run-heading";
  this.runProgress.className="game-ui__run-progress";
  this.runMessage.className="game-ui__run-message";
  this.runMedals.className="game-ui__run-medals";
  this.runControls.className="game-ui__run-controls";
  this.runNewButton.type="button";
  this.runNewButton.className="game-ui__run-new";
  this.runNewButton.onclick=()=>actions.newRun?.();
  this.runContinueButton.type="button";
  this.runContinueButton.className="game-ui__run-continue";
  this.runContinueButton.onclick=()=>actions.continueRun?.();
  this.runLeaveButton.type="button";
  this.runLeaveButton.className="game-ui__run-leave";
  this.runLeaveButton.onclick=()=>actions.leaveRun?.();
  this.runControls.append(this.runContinueButton,this.runNewButton,this.runLeaveButton);
  this.runPanel.append(this.runHeading,this.runProgress,this.runMessage,this.runMedals,this.runControls);
  this.menuLinks.append(this.helpButton,this.privacyButton,this.combatSoundButton,this.combatShakeButton,this.updateButton);
  this.menuExtras.append(this.menuLinks);
  this.menuSetupSection.append(this.menuProgress,this.menuLead,this.menuModePanel,this.menuArenaPanel);
  this.menu.append(this.menuHeader,this.menuResult,this.menuSetupSection,this.upgradePanel,this.runPanel,this.menuExtras,this.buttons);
  this.topHud.append(this.playerHealth,this.status,this.opponentHealth,this.details);
  this.root.append(this.menu,this.help,this.privacy,this.topHud,this.weaponList,this.missilePanel,this.bowPanel,this.mobileControls,this.rotateHint);
  container.append(this.root);
  this.root.addEventListener("keydown",event=>{
   if(event.key!=="Escape")return;
   if(!this.help.hidden){event.preventDefault();event.stopPropagation();this.help.hidden=true;this.helpButton.focus();}
   else if(!this.privacy.hidden){event.preventDefault();event.stopPropagation();this.privacy.hidden=true;this.privacyButton.focus();}
  });
  this.applyLocale();
  this.unsubscribeLocale=this.i18n.subscribe(()=>{
   this.applyLocale();
   if(this.readHud)this.render(this.currentState,this.readHud());
  });
 }

 private changeMenuStep(index:number){
  const next=Math.max(0,Math.min(MENU_STEPS.length-1,index));
  if(next===this.menuStepIndex)return;
  this.menuStepIndex=next;
  this.menu.scrollTop=0;
  this.syncWizard(this.currentState,this.readHud?.()??null);
  const heading=next===0?this.menuLead:this.arenaTitle;
  heading.focus?.();
 }
 private syncWizard(state:GameState,s:HudState|null){
  const active=state===GameState.MENU||state===GameState.GAME_OVER;
  const onArena=MENU_STEPS[this.menuStepIndex]==="arena";
  this.setHidden(this.menuModePanel,!active||onArena);
  this.setHidden(this.menuArenaPanel,!active||!onArena);
  this.setHidden(this.stepBackButton,!active||!onArena);
  this.setHidden(this.stepNextButton,!active||onArena);
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   if(button.dataset.action==="start")this.setHidden(button,state!==GameState.MENU||!onArena);
  }
  if(s){
   const shouldShowRun=active&&!onArena&&Boolean(s.progression);
   this.setHidden(this.runPanel,!shouldShowRun);
   this.setHidden(this.upgradePanel,onArena||s.mode==="local-pvp"||!active||
    (s.upgradePoints===0&&s.upgradedWeapons.length===0));
  }
  const labels=this.i18n.messages.menu;
  const stepLabel=onArena?this.i18n.messages.sections.arena:(labels?.selectMode??this.i18n.messages.sections.gameMode);
  this.setText(this.menuProgress,(labels?.step??"STEP")+" "+(this.menuStepIndex+1)+" / "+MENU_STEPS.length+" · "+stepLabel);
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
  const messages=this.i18n.messages,locale=this.i18n.locale,old=this.lastView;
  const stateChanged=!old||old.state!==state;
  const localeChanged=!old||old.locale!==locale;
  const arenaChanged=!old||old.arena!==s.arena,modeChanged=!old||old.mode!==s.mode;
  const weaponChanged=!old||old.weapon!==s.weapon,winnerChanged=!old||old.winner!==s.winner;
  const secondWeaponChanged=!old||old.secondWeapon!==s.secondWeapon;
  const progressKey=s.progression?JSON.stringify(s.progression):"";
  const progressChanged=!old||old.progressKey!==progressKey||old.inRun!==Boolean(s.inRun);
  const pointsChanged=!old||old.upgradePoints!==s.upgradePoints;
  const upgradesChanged=!old||old.upgradedWeapons.length!==s.upgradedWeapons.length||
   s.upgradedWeapons.some((id,index)=>id!==old.upgradedWeapons[index]);
  const staticChanged=stateChanged||localeChanged||arenaChanged||modeChanged||weaponChanged||winnerChanged||pointsChanged||upgradesChanged||progressChanged||secondWeaponChanged;
  const aimChanged=!this.lastAim||this.lastAim.angle!==s.missileAngle||this.lastAim.power!==s.missilePower;
  const missileRules=s.mode==="missile-duel"||(s.arena==="fortress"&&s.mode==="duel");

  if(staticChanged){
   // A held UZI/Bow touch belongs to the originally selected weapon, not its replacement.
   if(weaponChanged&&state===GameState.PLAYING)this.cancelActiveTouchAttack();
   if(secondWeaponChanged&&state===GameState.PLAYING)this.cancelP2Attack();
   if(stateChanged){
    this.root.classList.toggle("playing",state===GameState.PLAYING);
    this.root.classList.toggle("paused",state===GameState.PAUSED);
    this.root.classList.toggle("game-over",state===GameState.GAME_OVER);
    this.root.classList.toggle("menu",state===GameState.MENU);
    if(state===GameState.PLAYING){this.setHidden(this.privacy,true);this.setHidden(this.help,true);}
    this.setHidden(this.menuResult,state!==GameState.GAME_OVER);
    this.setHidden(this.menuSettings,state!==GameState.MENU&&state!==GameState.GAME_OVER);
    this.setHidden(this.menuSetupSection,state!==GameState.MENU&&state!==GameState.GAME_OVER);
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
   if(modeChanged)this.root.dataset.mode=s.mode;
   if(modeChanged||localeChanged||stateChanged){
    this.setHidden(this.pvpHint,s.mode!=="local-pvp"||(state!==GameState.MENU&&state!==GameState.GAME_OVER));
    this.setText(this.pvpHint,messages.pvp?.hint??"");
   }
   if(modeChanged||localeChanged||stateChanged){
    if(s.mode!=="local-pvp")this.lastSoloMode=s.mode;
    this.quickDuelButton.setAttribute("aria-pressed",String(s.mode!=="local-pvp"));
    this.quickPvpButton.setAttribute("aria-pressed",String(s.mode==="local-pvp"));
    this.setText(this.modeDescription,messages.menu?.modeDescriptions[s.mode]??"");
   }
   if(modeChanged||arenaChanged||weaponChanged||localeChanged||stateChanged){
    this.setText(this.matchSummary,(messages.menu?.ready??"READY")+": "+
     messages.modes[s.mode]+" · "+messages.arenas[s.arena]+" · "+
     messages.weapons[s.weapon]);
   }
   const upgraded=new Set(s.upgradedWeapons);
   const equipped=upgraded.has(s.weapon)?messages.upgrades[s.weapon].name:messages.weapons[s.weapon];
   if(state===GameState.MENU||state===GameState.GAME_OVER){
    if(modeChanged||localeChanged||stateChanged){
     for(const item of this.menuSettings.children){
      const card=item as HTMLButtonElement,id=card.dataset.mode as GameModeId;
      const visible=s.mode==="local-pvp"?id==="local-pvp":id!=="local-pvp";
      this.setHidden(card,!visible);
      card.setAttribute("aria-pressed",String(id===s.mode));
     }
    }
    if(arenaChanged||localeChanged||stateChanged){
     for(const item of this.arenaCards.children){
      const card=item as HTMLButtonElement;
      card.setAttribute("aria-pressed",String(card.dataset.arena===s.arena));
     }
    }
    if(weaponChanged||modeChanged||arenaChanged||localeChanged||stateChanged){
     const fixed=missileRules||s.mode==="random-weapons";
     this.setHidden(this.weaponDetails,fixed);
     for(const item of this.weaponCards.children){
      const card=item as HTMLButtonElement,id=card.dataset.startingWeapon as WeaponId;
      const allowed=!fixed&&id!=="missile"&&(s.mode!=="melee-only"||id==="blade"||id==="hammer");
      this.setHidden(card,!allowed);
      card.disabled=!allowed;
      card.setAttribute("aria-pressed",String(id===s.weapon));
     }
    }
    const runIntermission=Boolean(s.inRun&&s.progression?.run?.status==="victory");
    const available=runIntermission?s.progression!.choices.filter(id=>!upgraded.has(id)):
     WEAPON_IDS.filter(id=>!upgraded.has(id));
    const selected=available.includes(this.upgradeSelect.value as WeaponId)?
     this.upgradeSelect.value as WeaponId:available[0];
    if(selected&&this.upgradeSelect.value!==selected)this.upgradeSelect.value=selected;
    if(upgradesChanged||progressChanged){
     for(const option of this.upgradeSelect.options){
      const disabled=upgraded.has(option.value as WeaponId)||
       (runIntermission&&!available.includes(option.value as WeaponId));
      if(option.disabled!==disabled)option.disabled=disabled;
     }
    }
    const disabled=s.mode==="local-pvp"||s.upgradePoints<=0||available.length===0||
     (Boolean(s.inRun)&&!runIntermission);
    this.upgradeSelect.disabled=disabled;
    this.upgradeButton.disabled=disabled;
    this.setHidden(this.upgradeChoices,disabled);
    this.setHidden(this.upgradeSummary,upgraded.size===0||s.upgradePoints>0);
    this.setText(this.upgradeSummary,WEAPON_IDS.filter(id=>upgraded.has(id)).map(id=>messages.upgrades[id].name).join(" · "));
    this.setText(this.upgradePointsLabel,messages.upgrade.points+"  "+s.upgradePoints);
    this.setText(this.upgradeHint,s.upgradePoints>0&&selected?messages.upgrades[selected].description:messages.upgrade.earn);
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
   this.setHidden(this.upgradePanel,s.mode==="local-pvp"||!((state===GameState.MENU||state===GameState.GAME_OVER)&&
    (s.upgradePoints>0||upgraded.size>0)));
   if(localeChanged||weaponChanged||secondWeaponChanged||modeChanged||arenaChanged||upgradesChanged){
    for(const item of this.weaponList.children){
     const button=item as HTMLButtonElement,id=button.dataset.weapon as WeaponId;
     button.classList.toggle("active",id===s.weapon);
     this.setText(button,messages.weapons[id]+(upgraded.has(id)?" ★":""));
     const hidden=missileRules?id!=="missile":s.mode==="melee-only"?(id!=="blade"&&id!=="hammer"):
      s.mode==="random-weapons"?id!==s.weapon:id==="missile";
     this.setHidden(button,hidden);
     button.disabled=hidden||s.mode==="random-weapons";
    }
    const availableWeapons=WEAPON_IDS.filter(id=>id!=="missile"&&(s.mode!=="melee-only"||id==="blade"||id==="hammer"));
    this.setText(this.mobileWeaponName,(s.mode==="local-pvp"?messages.pvp.p1+" · ":"")+messages.weapons[s.weapon]+(upgraded.has(s.weapon)?" ★":""));
    this.setText(this.p2WeaponName,messages.pvp?.p2+" · "+messages.weapons[s.secondWeapon??"blade"]);
    if(this.mobileWeaponName.title!==equipped)this.mobileWeaponName.title=equipped;
    const position=availableWeapons.indexOf(s.weapon);
    this.setText(this.mobileWeaponIndex,(position<0?0:position+1)+"/"+availableWeapons.length);
   }
   if(stateChanged||weaponChanged||winnerChanged||modeChanged||arenaChanged){
    const playing=state===GameState.PLAYING&&s.winner===null;
    this.setHidden(this.weaponList,!playing);
    this.setHidden(this.mobileWeaponSwitcher,!playing||missileRules||s.mode==="random-weapons");
    this.setHidden(this.missilePanel,!playing||s.weapon!=="missile");
    this.setHidden(this.bowPanel,!playing||s.weapon!=="bow");
    this.setHidden(this.mobileControls,!playing);
    this.setHidden(this.p2Controls,!playing||s.mode!=="local-pvp");
    if(!playing&&(stateChanged||winnerChanged))this.cancelTouchControls();
   }
   this.syncWizard(state,s);
   this.lastView={state,locale,arena:s.arena,mode:s.mode,weapon:s.weapon,winner:s.winner,
    upgradePoints:s.upgradePoints,upgradedWeapons:[...s.upgradedWeapons],progressKey,inRun:Boolean(s.inRun),secondWeapon:s.secondWeapon};
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

  if(aimChanged){
   const angle=String(s.missileAngle),power=String(s.missilePower);
   if(this.angleInput.value!==angle)this.angleInput.value=angle;
   if(this.powerInput.value!==power)this.powerInput.value=power;
   this.setText(this.angleLabel,Math.round(s.missileAngle)+"°");
   this.setText(this.powerLabel,s.missilePower.toFixed(1));
   this.lastAim={angle:s.missileAngle,power:s.missilePower};
  }
  if(staticChanged||(aimChanged&&s.weapon==="missile")){
   const equipped=s.upgradedWeapons.includes(s.weapon)?messages.upgrades[s.weapon].name:messages.weapons[s.weapon];
   this.setText(this.details,messages.modes[s.mode]+"  •  "+messages.details.equipped+" "+equipped+
    (s.weapon==="missile"?"  •  "+messages.details.angle+" "+Math.round(s.missileAngle)+"°  •  "+
     messages.details.power+" "+s.missilePower.toFixed(1):""));
  }
  const hillChanged=!this.lastHill||this.lastHill.player!==s.hill.player||
   this.lastHill.opponent!==s.hill.opponent||this.lastHill.target!==s.hill.target;
  if(staticChanged||(s.mode==="king-of-hill"&&hillChanged)){
   const status=s.winner?(s.winner==="player"?messages.status.win:messages.status.lose):
    s.mode==="king-of-hill"?messages.status.hill+"  "+s.hill.player.toFixed(1)+" — "+
     s.hill.opponent.toFixed(1)+" / "+s.hill.target.toFixed(0):messages.modes[s.mode];
   this.setText(this.status,s.mode==="local-pvp"&&s.winner?(s.winner==="player"?messages.pvp.winner1:s.winner==="opponent"?messages.pvp.winner2:messages.pvp.draw):status);
   if(state===GameState.GAME_OVER)this.setText(this.menuResult,s.mode==="local-pvp"?(s.winner==="player"?messages.pvp.winner1:s.winner==="opponent"?messages.pvp.winner2:messages.pvp.draw):status);
  }
  if(s.mode==="king-of-hill"&&hillChanged)
   this.lastHill={player:s.hill.player,opponent:s.hill.opponent,target:s.hill.target};

  // While aiming, joystick movement can flip the fighter without moving the attack pointer.
  // Refresh only if direction/trajectory/locale changed; the guide caches its path.
  if(!this.missileAimGuide.hidden)this.updateMissileAimGuide(s.missileAngle,s.missilePower,s.playerFacing);
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
 private updateMissileAimGuide(angle:number,power:number,playerFacing:number){
  const facing=playerFacing<0?-1:1,locale=this.i18n.locale;
  const previous=this.lastAimGuide;
  if(previous&&previous.angle===angle&&previous.power===power&&previous.facing===facing&&previous.locale===locale)return;
  this.lastAimGuide={angle,power,facing,locale};
  const details=this.i18n.messages.details;
  this.missileAimValues.textContent=details.angle+" "+Math.round(angle)+"°  ·  "+details.power+" "+power.toFixed(1);
  if(!this.missileAimPath)return;
  const radians=angle*Math.PI/180,vx=Math.cos(radians)*power*facing,vy=Math.sin(radians)*power;
  const startX=facing===1?8:212;
  const points:string[]=[];
  // Use the same facing multiplier as GameSession's missile launch velocity.
  for(let i=0;i<=28;i++){
   const t=i*.1,x=startX+vx*t*4.6,y=109-(vy*t-3.9*t*t)*4.6;
   if(x<1||x>219||y<4||y>117)break;
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
  this.menuLead.textContent=messages.menu?.kickoff??"CHOOSE YOUR FIGHT";
  this.stepNextButton.textContent=messages.menu?.nextArena??"NEXT: CHOOSE ARENA";
  this.stepBackButton.textContent=messages.menu?.back??"BACK";
  this.weaponDetailsTitle.textContent=messages.menu?.loadout??"STARTING WEAPON · OPTIONAL";
  this.menuSetupTitle.textContent=messages.menu?.selectMode??"CHOOSE GAME MODE";
  this.quickDuelButton.textContent=messages.menu?.quickDuel??"SOLO DUEL";
  this.quickPvpButton.textContent=messages.menu?.quickPvp??"2 PLAYERS · LOCAL";
  this.quickModes.setAttribute("aria-label",messages.sections.gameMode);
  this.menuExtrasTitle.textContent=messages.menu?.options??"SETTINGS & HELP";
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
  this.p2Attack.textContent=messages.buttons.attack;
  this.p2Attack.setAttribute("aria-label",messages.pvp?.p2+" · "+messages.buttons.attack);
  this.p2Joystick.setAttribute("aria-label",messages.pvp?.p2);
  this.p2Prev.setAttribute("aria-label",messages.pvp?.p2+" · "+messages.buttons.previousWeapon);
  this.p2Next.setAttribute("aria-label",messages.pvp?.p2+" · "+messages.buttons.nextWeapon);
  this.mobilePauseButton.setAttribute("aria-label",messages.buttons.pause);
  this.mobilePauseButton.title=messages.buttons.pause;
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

  const actionLabels:Readonly<Record<UiAction,string>>={start:messages.buttons.start,pause:messages.buttons.pause,resume:messages.buttons.resume,restart:messages.buttons.restart,menu:messages.buttons.menu};
  for(const item of this.buttons.children){
   const button=item as HTMLButtonElement;
   button.textContent=actionLabels[button.dataset.action as UiAction];
  }
  for(const item of this.menuSettings.children){
   const card=item as HTMLButtonElement,id=card.dataset.mode as GameModeId;
   card.textContent=messages.modes[id];
   card.title=messages.menu?.modeDescriptions[id]??"";
  }
  for(const item of this.arenaCards.children){
   const card=item as HTMLButtonElement;
   const label=card.children[1] as HTMLElement;
   label.textContent=messages.arenas[card.dataset.arena as ArenaId];
  }
  for(const item of this.weaponCards.children){
   const card=item as HTMLButtonElement;
   card.textContent=messages.weapons[card.dataset.startingWeapon as WeaponId];
  }
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
