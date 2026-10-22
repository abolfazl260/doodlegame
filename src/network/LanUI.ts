import type {SessionController} from './SessionController';
import {ARENAS,CHARACTERS,WEAPONS} from './Protocol.js';
import type {I18n} from '../i18n/I18n';
import type {BuiltInArenaId,CharacterId} from '../gameplay/GameSession';
import type {WeaponId} from '../input/Input';
const COPY={
 en:{title:'Local Wi-Fi · 1v1',help:'Two Android phones on the same Wi-Fi. No internet or account needed. If connecting fails, disable AP/client isolation on the router. Hotspots are best effort.',host:'Create LAN Room',join:'Join LAN Room',ip:'Host local IP',port:'Port',token:'Session token',connect:'Connect',ready:'Ready',start:'Start match',resume:'Ready to resume',rematch:'Ready for rematch',leave:'Leave / Close room',back:'Back to menu',retry:'Retry connection (30 seconds)',you:'You',opponent:'Opponent',players:'Players',room:'Room address',waiting:'Waiting for guest',connecting:'Connecting…',connected:'Connected',lobby:'Choose equipment, then Ready',countdown:'Starting in',playing:'Playing',paused:'Paused on both phones. Both players must agree to resume.',result:'Match complete. Both players must agree to rematch.',lost:'Connection lost. Match frozen; no result awarded.',duel:'Duel (MVP)',arena:'Arena (host chooses)',character:'Your character',weapon:'Your starting weapon',waitReady:'Waiting for both players to be ready',rtt:'RTT',win:'You win',lose:'Opponent wins',draw:'Draw',close:'Close',status:'LAN status'},
 fa:{title:'بازی با Wi-Fi محلی · دونفره',help:'دو گوشی اندرویدی را به یک Wi-Fi وصل کنید؛ اینترنت و حساب لازم نیست. اگر اتصال برقرار نشد، AP isolation یا جداسازی دستگاه‌ها را در روتر خاموش کنید. پشتیبانی هات‌اسپات تضمین‌شده نیست.',host:'ساخت اتاق محلی',join:'پیوستن به اتاق',ip:'IP محلی میزبان',port:'پورت',token:'توکن جلسه',connect:'اتصال',ready:'آماده‌ام',start:'شروع مسابقه',resume:'آماده ادامه‌ام',rematch:'آماده بازی دوباره‌ام',leave:'خروج / بستن اتاق',back:'بازگشت به منو',retry:'تلاش مجدد برای اتصال (۳۰ ثانیه)',you:'شما',opponent:'حریف',players:'بازیکنان',room:'آدرس اتاق',waiting:'در انتظار مهمان',connecting:'در حال اتصال…',connected:'متصل',lobby:'شخصیت و سلاح را انتخاب و آماده را بزنید',countdown:'شروع تا',playing:'در حال بازی',paused:'بازی برای هر دو متوقف است. ادامه به آمادگی هر دو نفر نیاز دارد.',result:'مسابقه تمام شد. بازی دوباره به تأیید هر دو نیاز دارد.',lost:'ارتباط قطع شد؛ بازی متوقف است و نتیجه‌ای ثبت نمی‌شود.',duel:'دوئل (نسخه اول)',arena:'زمین (انتخاب میزبان)',character:'شخصیت شما',weapon:'سلاح شروع شما',waitReady:'در انتظار آمادگی هر دو بازیکن',rtt:'رفت‌وبرگشت',win:'شما برنده شدید',lose:'حریف برنده شد',draw:'مساوی',close:'بستن',status:'وضعیت شبکه محلی'}
};
const ERRORS:Record<string,[string,string]>={
 wifi:['Connect both phones to the same Wi-Fi first.','ابتدا هر دو گوشی را به یک Wi-Fi وصل کنید.'],
 address:['Enter a private numeric IPv4 address, port 1024–65535 and the 32-character room token. The host must be on your Wi-Fi subnet.','IP خصوصی عددی، پورت ۱۰۲۴ تا ۶۵۵۳۵ و توکن ۳۲ نویسه‌ای را وارد کنید. میزبان باید در همان شبکه Wi-Fi باشد.'],
 token:['Incorrect session token. Copy it from the host.','توکن نادرست است؛ توکن نمایش‌داده‌شده روی میزبان را وارد کنید.'],
 version:['Different APK/game content. Install the same build on both phones.','نسخه بازی متفاوت است؛ همان APK را روی هر دو گوشی نصب کنید.'],
 full:['Room full or too many join attempts. Only one guest is allowed.','اتاق پر است یا تعداد تلاش‌ها زیاد است؛ فقط یک مهمان مجاز است.'],
 connection:['Cannot reach the host. Check Wi-Fi, room address and router AP/client isolation.','میزبان در دسترس نیست. Wi-Fi، آدرس اتاق و AP isolation روتر را بررسی کنید.'],
 timeout:['Connection timed out. Check the same Wi-Fi and try again.','مهلت اتصال تمام شد؛ اتصال به Wi-Fi مشترک را بررسی و دوباره تلاش کنید.'],
 packet:['Invalid network data. Match paused; reconnect or leave.','داده شبکه نامعتبر است؛ بازی متوقف شد. دوباره وصل شوید یا خارج شوید.'],
 backpressure:['Connection cannot keep up. Match paused; reconnect.','سرعت اتصال کافی نیست؛ بازی متوقف شد. دوباره وصل شوید.'],
 expired:['Rejoin window expired. Create a new room.','مهلت اتصال مجدد تمام شد؛ اتاق تازه بسازید.'],
 left:['The other player left the room. Return to the menu.','بازیکن دیگر از اتاق خارج شد؛ به منو برگردید.'],
 unsupported:['LAN play requires two Android APKs.','بازی شبکه محلی به APK اندروید روی هر دو گوشی نیاز دارد.']
};
function button(action:()=>void){const b=document.createElement('button');b.type='button';b.onclick=action;return b;}
export class LanUI {
 opened=false;
 private entry=button(()=>this.open());
 private panel=document.createElement('section');
 private heading=document.createElement('h2');
 private help=document.createElement('p');
 private status=document.createElement('p');
 private error=document.createElement('p');
 private details=document.createElement('p');
 private host=button(()=>this.run(()=>this.controller.create()));
 private join=button(()=>{this.joinForm.hidden=false;this.ip.focus();});
 private joinForm=document.createElement('form');
 private ip=document.createElement('input');
 private port=document.createElement('input');
 private token=document.createElement('input');
 private connect=document.createElement('button');
 private ready=button(()=>this.controller.ready());
 private start=button(()=>this.controller.start());
 private retry=button(()=>this.run(()=>this.controller.retry()));
 private leave=button(()=>this.close());
 private arena=document.createElement('select');
 private character=document.createElement('select');
 private weapon=document.createElement('select');
 private arenaLabel=document.createElement('label');
 private characterLabel=document.createElement('label');
 private weaponLabel=document.createElement('label');
 private unsubscribe:()=>void;
 private formError:string|null=null;
 private busy=false;
 constructor(private root:HTMLElement,private controller:SessionController,private i18n:I18n,private beforeOpen:()=>void,private afterClose:()=>void){
  this.entry.className='game-ui__lan-entry';this.entry.dataset.route='lan';
  root.querySelector('.game-ui__landing-routes')?.append(this.entry);
  this.panel.className='lan-panel';this.panel.hidden=true;this.panel.setAttribute('role','region');
  this.status.setAttribute('role','status');this.error.setAttribute('role','alert');this.error.className='lan-panel__error';this.details.className='lan-panel__address';this.details.dir='ltr';
  this.ip.inputMode='decimal';this.ip.autocomplete='off';this.ip.maxLength=15;
  this.port.type='number';this.port.min='1024';this.port.max='65535';this.port.inputMode='numeric';
  this.token.autocomplete='off';this.token.maxLength=32;this.token.spellcheck=false;
  for(const el of [this.ip,this.port,this.token]){el.required=true;el.dir='ltr';}
  this.connect.type='submit';this.joinForm.hidden=true;
  this.joinForm.append(this.ip,this.port,this.token,this.connect);
  this.joinForm.onsubmit=e=>{e.preventDefault();this.run(()=>this.controller.join(this.ip.value.trim(),Number(this.port.value),this.token.value.trim()));};
  for(const id of ARENAS){const o=document.createElement('option');o.value=id;this.arena.append(o);}
  for(const id of CHARACTERS){const o=document.createElement('option');o.value=id;o.textContent=id;this.character.append(o);}
  for(const id of WEAPONS){const o=document.createElement('option');o.value=id;this.weapon.append(o);}
  const select=()=>this.controller.select(this.arena.value as BuiltInArenaId,this.character.value as CharacterId,this.weapon.value as WeaponId);
  this.arena.onchange=this.character.onchange=this.weapon.onchange=select;
  this.panel.append(this.heading,this.help,this.host,this.join,this.joinForm,this.details,this.status,this.error,this.arenaLabel,this.arena,this.characterLabel,this.character,this.weaponLabel,this.weapon,this.ready,this.start,this.retry,this.leave);
  for(const [label,select,id] of [[this.arenaLabel,this.arena,'lan-arena'],[this.characterLabel,this.character,'lan-character'],[this.weaponLabel,this.weapon,'lan-weapon']] as const){select.id=id;label.htmlFor=id;}
  this.panel.tabIndex=-1;root.append(this.panel);this.unsubscribe=i18n.subscribe(()=>this.render());this.render();
 }
 get labels(){return COPY[this.i18n.locale];}
 open(){this.beforeOpen();this.opened=true;this.formError=null;this.joinForm.hidden=true;this.root.dataset.lanOpen='true';this.render();this.panel.focus();}
 async close(){this.opened=false;delete this.root.dataset.lanOpen;this.panel.hidden=true;await this.controller.close();this.afterClose();this.entry.focus();}
 private async run(action:()=>Promise<void>){
  if(this.busy)return;this.busy=true;this.formError=null;this.render();
  try{await action();}catch(error){this.formError=error instanceof Error?error.message:'connection';}
  finally{this.busy=false;this.render();}
 }
 render(){
  const c=this.labels,v=this.controller.view,l=v.lobby,active=this.controller.active,host=v.role==='host',playing=active&&l.phase==='playing';
  this.entry.textContent=c.title;this.panel.hidden=!this.opened||playing;
  this.heading.textContent=c.title;this.help.textContent=c.help;this.panel.setAttribute('aria-label',c.title);
  this.host.textContent=c.host;this.join.textContent=c.join;this.connect.textContent=c.connect;
  this.ip.placeholder=c.ip;this.ip.setAttribute('aria-label',c.ip);this.port.placeholder=c.port;this.port.setAttribute('aria-label',c.port);this.token.placeholder=c.token;this.token.setAttribute('aria-label',c.token);
  this.host.hidden=this.join.hidden=active;this.host.disabled=this.join.disabled=this.connect.disabled=this.busy;
  if(active)this.joinForm.hidden=true;
  this.details.textContent=host&&v.address?`${v.address}:${v.port}\n${c.token}: ${v.token}`:'';
  this.details.setAttribute('aria-label',c.room);
  const readyNames=`${c.you}: ${(host?l.hostReady:l.guestReady)?'✓':'…'} · ${c.opponent}: ${(host?l.guestReady:l.hostReady)?'✓':'…'}`;
  this.status.textContent=!active?'':v.connecting?c.connecting:!v.connected&&l.phase==='lobby'?c.waiting:
   `${c[l.phase]}${l.phase==='countdown'?' '+Math.ceil(l.remaining):''} · ${c.players}: ${v.connected?'2/2':'1/2'} · ${c.duel}\n${readyNames} · ${c.rtt}: ${Math.round(v.rtt)} ms`;
  const state=this.controller.frame;
  if(l.phase==='result'&&state?.winner){const own=host?'player':'opponent';this.status.textContent=(state.winner==='draw'?c.draw:state.winner===own?c.win:c.lose)+' · '+c.result+'\n'+readyNames;}
  const error=this.formError??v.error;this.error.textContent=error?(ERRORS[error]??ERRORS.connection)[this.i18n.locale==='fa'?1:0]:'';this.error.hidden=!error;
  for(const el of [this.arena,this.arenaLabel,this.character,this.characterLabel,this.weapon,this.weaponLabel])el.hidden=!active||l.phase!=='lobby';
  this.arenaLabel.textContent=c.arena;this.characterLabel.textContent=c.character;this.weaponLabel.textContent=c.weapon;
  for(const o of this.arena.options)o.textContent=this.i18n.messages.arenas[o.value as BuiltInArenaId];
  for(const o of this.weapon.options)o.textContent=this.i18n.messages.weapons[o.value as WeaponId];
  const names:Record<CharacterId,string>={soldier:'سرباز',ninja:'نینجا',viking:'وایکینگ',ranger:'رنجر',pharaoh:'فرعون',knight:'شوالیه',mummy:'مومیایی',archer:'کماندار'};
  for(const o of this.character.options)o.textContent=this.i18n.locale==='fa'?names[o.value as CharacterId]:o.value[0].toUpperCase()+o.value.slice(1);
  this.arena.disabled=!host||v.connected&&(l.hostReady||l.guestReady);this.arena.value=l.arena;
  this.character.value=host?l.hostCharacter:l.guestCharacter;this.weapon.value=host?l.hostWeapon:l.guestWeapon;
  this.character.disabled=this.weapon.disabled=!v.connected;
  this.ready.hidden=!active||!['lobby','paused','result'].includes(l.phase)||!v.connected;
  this.ready.textContent=l.phase==='paused'?c.resume:l.phase==='result'?c.rematch:c.ready;this.ready.disabled=host?l.hostReady:l.guestReady;
  this.start.hidden=!host||l.phase!=='lobby';this.start.textContent=c.start;this.start.disabled=!v.connected||!l.hostReady||!l.guestReady;
  this.retry.hidden=v.role!=='guest'||l.phase!=='lost'||v.error==='left';this.retry.textContent=c.retry;this.retry.disabled=this.busy||v.connecting||v.error==='expired';
  this.leave.textContent=active?c.leave:c.back;
 }
 dispose(){this.unsubscribe();this.entry.remove();this.panel.remove();}
}
