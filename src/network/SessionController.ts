import {GameSession,type GameRenderState,type BuiltInArenaId,type CharacterId} from '../gameplay/GameSession.js';
import type {InputSource,WeaponId} from '../input/Input';
import type {FrameScheduler} from '../core/FrameScheduler';
import {GameLoop} from '../core/GameLoop.js';
import {GameState} from '../core/GameState.js';
import {FixedStep} from './FixedStep.js';
import {HostInput,RemoteInput,InputJournal,type InputSample} from './NetworkInput.js';
import {decodeMessage,sessionToken,PROTOCOL,ARENAS,type Message,type Lobby} from './Protocol.js';
import {encodeFrame,SnapshotBuffer,type MatchFrame} from './StateCodec.js';
import type {LanTransport,TransportEvent} from './LanTransport';
import {isLanAddress} from './LanTransport.js';
import {BUILD_FINGERPRINT} from './BuildFingerprint.js';
import type {CombatCue} from '../gameplay/CombatFeedback';
export type LanView={role:'host'|'guest'|null;address:string;port:number;token:string;connected:boolean;connecting:boolean;error:string|null;lobby:Lobby;rtt:number;};
const initialLobby=():Lobby=>({arena:'classic',mode:'duel',hostReady:false,guestReady:false,phase:'lobby',epoch:0,remaining:0,match:0,hostCharacter:'soldier',guestCharacter:'ninja',hostWeapon:'blade',guestWeapon:'blade'});
type LocalInput=InputSource&{resetTransientState():void};
type Callbacks={render:(state:GameRenderState,stateId:GameState)=>void;change:()=>void;clock?:()=>number};

/** Host owns the only GameSession. Guest never steps physics, awards progress or decides a winner. */
export class SessionController {
 view:LanView={role:null,address:'',port:0,token:'',connected:false,connecting:false,error:null,lobby:initialLobby(),rtt:0};
 private hostInput:HostInput;
 private session:GameSession|null=null;
 private remote=new RemoteInput();
 private journal=new InputJournal();
 private snapshots=new SnapshotBuffer();
 private step=new FixedStep();
 private loop:GameLoop;
 private clock:()=>number;
 private maintenance:ReturnType<typeof setInterval>|null=null;
 private unsubscribe:()=>void;
 private authorized=false;
 private socketConnected=false;
 private lastHeard=0;
 private handshakeDeadline=0;
 private lostAt=0;
 private tick=0;
 private seq=0;
 private lastInputSeq=0;
 private inputClock=0;
 private snapshotClock=0;
 private countdownEnd=0;
 private guestStartAt=0;
 private localPause=false;
 private aim:[number,number]|null=null;
 private weapon:WeaponId|null=null;
 private cueAck=0;
 private cueSeen=0;
 private cues:CombatCue[]=[];
 private queue:Message[]=[];
 private pendingSnapshot:Message|null=null;
 private sending=false;
 private generation=0;
 private attempts:number[]=[];
 private packetWindow=0;
 private packetCount=0;
 private connectGeneration=0;
 constructor(private transport:LanTransport,private input:LocalInput,scheduler:FrameScheduler,private callbacks:Callbacks){
  this.clock=callbacks.clock??(()=>performance.now());
  this.hostInput=new HostInput(input);
  this.loop=new GameLoop(scheduler,dt=>this.advance(dt),()=>this.render(),()=>this.fail('packet'),.25);
  this.unsubscribe=transport.subscribe(event=>this.onTransport(event));
 }
 get active(){return this.view.role!==null;}
 getState(){const p=this.view.lobby.phase;return p==='playing'?GameState.PLAYING:p==='result'?GameState.GAME_OVER:p==='lobby'?GameState.MENU:GameState.PAUSED;}
 get frame(){return this.view.role==='host'?this.session?.getRenderState()??null:this.snapshots.render(this.clock());}
 private notify(){this.callbacks.change();}
 private begin(){this.input.setLocalPvPEnabled?.(false);this.loop.start();this.maintenance=setInterval(()=>this.maintain(),1000);this.lastHeard=this.clock();}
 async create(){
  await this.close();this.view={role:'host',address:'',port:0,token:sessionToken(),connected:false,connecting:true,error:null,lobby:initialLobby(),rtt:0};this.notify();
  try{const gen=++this.connectGeneration;const room=await this.transport.listen();if(gen!==this.connectGeneration)return;
   this.view.address=room.address;this.view.port=room.port;this.view.connecting=false;this.begin();this.notify();
  }catch(error){this.view.connecting=false;this.view.error=this.errorCode(error);this.notify();}
 }
 async join(address:string,port:number,token:string){
  if(!isLanAddress(address)||!Number.isInteger(port)||port<1024||port>65535||!/[a-f0-9]{32}/i.test(token)||token.length!==32)throw new Error('address');
  await this.close();this.view={role:'guest',address,port,token:token.toLowerCase(),connected:false,connecting:true,error:null,lobby:initialLobby(),rtt:0};this.begin();this.notify();
  await this.connectGuest();
 }
 private async connectGuest(){
  const gen=++this.connectGeneration;this.view.connecting=true;this.view.error=null;this.notify();
  try{await this.transport.connect(this.view.address,this.view.port);if(gen!==this.connectGeneration)return;}
  catch(error){if(gen!==this.connectGeneration)return;this.view.connecting=false;this.view.error=this.errorCode(error);this.view.lobby.phase='lost';if(!this.lostAt)this.lostAt=this.clock();this.notify();}
 }
 async retry(){if(this.view.role!=='guest'||this.view.connecting)return;if(this.lostAt&&this.clock()-this.lostAt>30000){this.view.error='expired';this.notify();return;}await this.connectGuest();}
 select(arena:BuiltInArenaId,character:CharacterId,weapon:WeaponId){
  const l=this.view.lobby;if(l.phase!=='lobby')return;
  if(this.view.role==='host'){if(!ARENAS.includes(arena))return;l.arena=arena;l.hostCharacter=character;l.hostWeapon=weapon;l.hostReady=l.guestReady=false;this.publishLobby();}
  else if(this.authorized){l.guestCharacter=character;l.guestWeapon=weapon;l.guestReady=false;this.send({type:'READY',ready:false,character,weapon});}
  this.notify();
 }
 ready(){
  if(!this.authorized)return;const l=this.view.lobby;
  if(!['lobby','paused','result'].includes(l.phase))return;
  if(this.view.role==='host'){l.hostReady=true;this.publishLobby();this.tryResume();}
  else if(l.phase==='lobby')this.send({type:'READY',ready:true,character:l.guestCharacter,weapon:l.guestWeapon});
  else this.send({type:l.phase==='result'?'REMATCH':'RESUME_READY'});
  this.notify();
 }
 start(){if(this.view.role==='host'&&this.view.lobby.phase==='lobby'&&this.view.lobby.hostReady&&this.view.lobby.guestReady&&this.authorized)this.countdown(true);}
 private tryResume(){const l=this.view.lobby;if(l.hostReady&&l.guestReady&&(l.phase==='paused'||l.phase==='result'))this.countdown(l.phase==='result');}
 private countdown(fresh:boolean){
  const l=this.view.lobby;this.clearInputs();l.epoch++;l.phase='countdown';l.remaining=3;l.hostReady=l.guestReady=false;
  if(fresh){
   l.match++;this.tick=0;this.cueSeen=this.cueAck=0;this.cues=[];
   this.session?.dispose();this.session=new GameSession(this.hostInput);this.session.setLocalPvP(true);this.session.setMode('duel');this.session.setArena(l.arena);
   this.session.setCharacterId(l.hostCharacter);this.session.setPlayer2CharacterId(l.guestCharacter);
   this.session.setStartingWeapon(l.hostWeapon);this.session.setPlayer2StartingWeapon(l.guestWeapon);this.session.reset(false);
  }
  this.countdownEnd=this.clock()+3000;this.publishLobby();this.send({type:'START',epoch:l.epoch,remaining:3,match:l.match});this.snapshot();this.notify();
 }
 pause(){
  if(!this.active)return;
  const l=this.view.lobby;
  if(this.view.role==='guest'){
   if(this.authorized)this.send({type:'PAUSE'});
   if(l.phase==='playing'||l.phase==='countdown')this.localPause=true;
   this.freeze();return;
  }
  if(l.phase==='lost')return;
  if(l.phase==='playing'||l.phase==='countdown')l.phase='paused';
  l.hostReady=l.guestReady=false;l.remaining=0;this.clearInputs();this.session?.cancelTransientActions();this.publishLobby();this.snapshot();this.notify();
 }
 /** Also called on foreground: never secretly resume after WebView suspension. */
 interrupt(){if(this.active)this.pause();}
 setAim(x:number,y:number){if(this.view.lobby.phase==='playing'&&Number.isFinite(x)&&Number.isFinite(y))this.aim=[Math.max(-1,Math.min(1,x)),Math.max(-1,Math.min(1,y))];}
 selectWeapon(id:WeaponId){if(this.view.lobby.phase==='playing')this.weapon=id;}
 cycleWeapon(direction:1|-1){const order:WeaponId[]=['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile','spear','grapple'];const frame=this.frame;if(!frame)return;const current=this.view.role==='host'?frame.player.weapon:frame.opponent.weapon;this.selectWeapon(order[(order.indexOf(current)+direction+order.length)%order.length]);}
 private apply(sample:InputSample,player:1|2){
  if(!this.session)return;
  if(sample.aim)this.session.setWeaponAim(player,...sample.aim);
  if(sample.weapon){if(player===1)this.session.selectWeaponById(sample.weapon);else this.session.selectPlayer2WeaponById(sample.weapon);}
  if(sample.input.weaponNextPressed){if(player===1)this.session.selectWeapon(1);else this.session.selectPlayer2Weapon(1);}
  if(sample.input.weaponPreviousPressed){if(player===1)this.session.selectWeapon(-1);else this.session.selectPlayer2Weapon(-1);}
 }
 advance(dt:number){
  if(!this.active)return;
  const l=this.view.lobby,now=this.clock();
  if(this.view.role==='host'){
   if(l.phase==='countdown'){
    const remaining=Math.max(0,(this.countdownEnd-now)/1000);
    if(Math.ceil(remaining)!==Math.ceil(l.remaining)){l.remaining=remaining;this.publishLobby();this.notify();}else l.remaining=remaining;
    if(now>=this.countdownEnd){l.phase='playing';l.remaining=0;this.step.reset();this.input.resetTransientState();this.publishLobby();this.notify();}
   }
   if(l.phase==='playing'&&this.session){
    this.step.advance(dt,step=>{
     if(l.phase!=='playing')return;
     const second=this.remote.next();this.hostInput.second=second.input;this.apply(second,2);
     this.apply({input:this.input.getState(),aim:this.aim,weapon:this.weapon},1);this.weapon=null;
     this.session!.update(step);this.tick++;this.collectCues();
     if(this.session!.getRenderState().winner){l.phase='result';this.clearInputs();this.publishLobby();this.snapshot();this.notify();}
    });
    this.snapshotClock+=dt;if(this.snapshotClock>=.05){this.snapshotClock%=.05;this.snapshot();}
   }
  }else if(l.phase==='playing'){
   // The clock guard also prevents a delayed PLAYING packet bypassing the local countdown.
   if(now<this.guestStartAt){this.input.resetTransientState();return;}
   try{this.journal.capture({input:this.input.getState(),aim:this.aim,weapon:this.weapon});this.input.endFrame();this.weapon=null;
    this.inputClock+=dt;if(this.inputClock>=1/30){this.inputClock%=1/30;this.send({type:'INPUT',epoch:l.epoch,seq:++this.seq,held:this.journal.held,edges:this.journal.pending(),cueAck:this.cueAck});}
   }catch{this.fail('backpressure');}
  }
 }
 private render(){const frame=this.frame;if(frame){this.callbacks.render(frame,this.getState());if(this.view.role==='guest')for(const cue of frame.combatCues)this.cueAck=Math.max(this.cueAck,cue.id);}}
 private collectCues(){
  if(!this.session)return;for(const cue of this.session.getRenderState().combatCues)if(cue.id>this.cueSeen){this.cues.push(cue);this.cueSeen=cue.id;}
  if(this.cues.length>128)this.fail('backpressure');
 }
 private snapshot(){
  if(!this.session||!this.authorized)return;
  try{const state={...this.session.getRenderState(),combatCues:this.cues};const frame=encodeFrame(this.tick,this.view.lobby.epoch,this.view.lobby.match,this.remote.ack,state);this.send({type:'SNAPSHOT',frame});}
  catch{this.fail('packet');}
 }
 private clearInputs(){this.remote.clear();this.journal.clear();this.step.reset();this.input.resetTransientState();this.hostInput.second=this.remote.next().input;this.aim=null;this.weapon=null;this.lastInputSeq=0;this.seq=0;this.inputClock=this.snapshotClock=0;}
 private freeze(){this.clearInputs();this.session?.cancelTransientActions();this.view.lobby.hostReady=this.view.lobby.guestReady=false;if(this.view.lobby.phase!=='result'&&this.view.lobby.phase!=='lobby')this.view.lobby.phase='paused';this.notify();}
 private publishLobby(){if(this.authorized)this.send({type:'LOBBY',lobby:{...this.view.lobby}});}
 private onTransport(event:TransportEvent){
  if(!this.active)return;
  if(event.type==='background'||event.type==='foreground'){this.interrupt();return;}
  if(event.type==='connected'){
   this.socketConnected=true;this.lastHeard=this.clock();this.handshakeDeadline=this.clock()+5000;
   if(this.view.role==='guest')this.send({type:'JOIN',version:PROTOCOL,fingerprint:BUILD_FINGERPRINT,token:this.view.token});return;
  }
  if(event.type==='disconnected'){
   const wasAuthorized=this.authorized;this.socketConnected=false;this.authorized=false;this.generation++;this.queue=[];this.pendingSnapshot=null;
   if(wasAuthorized||this.view.role==='guest'){
    this.freeze();this.view.connected=false;this.view.connecting=false;this.view.lobby.phase='lost';this.view.error??='connection';this.lostAt=this.clock();this.notify();
   }return;
  }
  if(event.type==='message'){
   try{
    const now=this.clock();if(now-this.packetWindow>=1000){this.packetWindow=now;this.packetCount=0;}if(++this.packetCount>90)throw new Error('packet');
    this.receive(decodeMessage(event.data));
   }catch{this.fail('packet');}
  }
 }
 private receive(message:Message){
  this.lastHeard=this.clock();const l=this.view.lobby;
  if(message.type==='REJECT'&&this.view.role==='guest'){this.view.error=['token','version','full','expired'].includes(message.reason)?message.reason:'connection';void this.transport.dropPeer();this.notify();return;}
  if(!this.authorized){
   if(message.type==='JOIN'&&this.view.role==='host'){
    this.attempts=this.attempts.filter(t=>this.clock()-t<60000);this.attempts.push(this.clock());
    const reason=this.attempts.length>12?'full':message.version!==PROTOCOL||message.fingerprint!==BUILD_FINGERPRINT?'version':message.token!==this.view.token?'token':l.phase==='lost'&&this.clock()-this.lostAt>30000?'expired':null;
    if(reason){void this.reject(reason);return;}
    this.authorized=true;this.view.connected=true;this.view.error=null;this.view.connecting=false;
    if(l.phase==='lost')l.phase=this.session?'paused':'lobby';l.hostReady=l.guestReady=false;
    this.clearInputs();this.send({type:'ACCEPT',version:PROTOCOL,fingerprint:BUILD_FINGERPRINT});this.publishLobby();this.snapshot();this.notify();return;
   }
   if(message.type==='ACCEPT'&&this.view.role==='guest'){
    if(message.version!==PROTOCOL||message.fingerprint!==BUILD_FINGERPRINT){this.fail('version');return;}
    this.authorized=true;this.view.connected=true;this.view.connecting=false;this.view.error=null;this.clearInputs();this.snapshots.clear();this.notify();return;
   }
   throw new Error('packet');
  }
  if(message.type==='PING'){this.send({type:'PONG',time:message.time});return;}
  if(message.type==='PONG'){this.view.rtt=Math.max(0,Math.min(10000,this.clock()-message.time));this.notify();return;}
  if(message.type==='LEAVE'){this.freeze();this.view.error='left';void this.transport.dropPeer();return;}
  if(message.type==='PAUSE'||message.type==='BACKGROUND'){this.pause();return;}
  if(this.view.role==='host'){
   switch(message.type){
    case 'READY':if(l.phase==='lobby'){l.guestCharacter=message.character;l.guestWeapon=message.weapon;l.guestReady=message.ready;this.publishLobby();this.notify();}return;
    case 'RESUME_READY':if(l.phase==='paused'){l.guestReady=true;this.publishLobby();this.tryResume();this.notify();}return;
    case 'REMATCH':if(l.phase==='result'){l.guestReady=true;this.publishLobby();this.tryResume();this.notify();}return;
    case 'INPUT':
     if(l.phase!=='playing'||message.epoch!==l.epoch||message.seq<=this.lastInputSeq)return;
     this.lastInputSeq=message.seq;this.remote.accept(message.held,message.edges);
     this.cues=this.cues.filter(c=>c.id>Math.min(message.cueAck,this.cueSeen));return;
    default:throw new Error('packet'); // Guests cannot author snapshots, selections or results.
   }
  }
  switch(message.type){
   case 'LOBBY':{
    if(message.lobby.epoch<l.epoch)return;
    const was=l.phase,epochChanged=message.lobby.epoch!==l.epoch,matchChanged=message.lobby.match!==l.match;
    this.view.lobby=message.lobby;
    if(epochChanged){this.clearInputs();this.snapshots.clear();if(matchChanged)this.cueAck=0;}
    if(message.lobby.phase==='countdown'&&was!=='countdown')this.guestStartAt=this.clock()+message.lobby.remaining*1000;
    if(message.lobby.phase==='paused')this.localPause=false;
    if(message.lobby.phase==='playing'&&this.localPause){this.view.lobby.phase='paused';this.send({type:'PAUSE'});}
    if(message.lobby.phase!=='playing')this.input.resetTransientState();this.notify();return;
   }
   case 'START':if(message.epoch>=l.epoch)this.guestStartAt=this.clock()+Math.max(0,message.remaining*1000-this.view.rtt/2);return;
   case 'SNAPSHOT':this.acceptSnapshot(message.frame);return;
   default:throw new Error('packet');
  }
 }
 private acceptSnapshot(frame:MatchFrame){
  const l=this.view.lobby;
  if(frame.epoch!==l.epoch||frame.match!==l.match||frame.state.arena!==l.arena)return;
  if(!this.snapshots.push(frame,this.clock()))return;
  this.journal.acknowledge(frame.ack);
 }
 maintain(){
  if(!this.active)return;const now=this.clock();
  if(this.socketConnected&&!this.authorized&&now>this.handshakeDeadline){this.view.error='timeout';void this.transport.dropPeer();}
  else if(this.authorized){
   if(now-this.lastHeard>5000){this.fail('timeout');return;}
   this.send({type:'PING',time:now});
  }
  if(this.view.lobby.phase==='lost'&&now-this.lostAt>30000){this.view.error='expired';this.notify();}
 }
 private async reject(reason:string){try{await this.transport.send(JSON.stringify({type:'REJECT',reason}));}finally{await this.transport.dropPeer();}}
 private send(message:Message){
  if(!this.socketConnected)return;
  if(message.type==='SNAPSHOT')this.pendingSnapshot=message;
  else{if(this.queue.length>=32){this.fail('backpressure');return;}this.queue.push(message);}
  void this.pump();
 }
 private async pump(){
  if(this.sending)return;this.sending=true;const generation=this.generation;
  try{
   while(generation===this.generation&&this.socketConnected){
    const message=this.queue.shift()??this.pendingSnapshot;if(!message)break;
    if(message===this.pendingSnapshot)this.pendingSnapshot=null;
    await this.transport.send(JSON.stringify(message));
   }
  }catch{if(generation===this.generation)this.fail('connection');}
  finally{this.sending=false;if(generation!==this.generation&&(this.queue.length||this.pendingSnapshot))void this.pump();}
 }
 private fail(code:string){this.view.error=code;this.freeze();void this.transport.dropPeer().catch(()=>{});this.notify();}
 private errorCode(error:unknown){const message=error instanceof Error?error.message:String(error);return ['wifi','address','unsupported','cancelled'].includes(message)?message:'connection';}
 async close(){
  const was=this.active;this.loop.stop();this.clearInputs();
  if(was&&this.authorized){
   let timeout:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([this.transport.send(JSON.stringify({type:'LEAVE'})),new Promise<void>(resolve=>{timeout=setTimeout(resolve,200);})]);}catch{/* already disconnected */}
   finally{if(timeout)clearTimeout(timeout);}
  }
  this.connectGeneration++;this.generation++;this.loop.stop();if(this.maintenance)clearInterval(this.maintenance);this.maintenance=null;
  this.authorized=this.socketConnected=false;this.queue=[];this.pendingSnapshot=null;this.clearInputs();this.snapshots.clear();this.session?.dispose();this.session=null;
  this.view={role:null,address:'',port:0,token:'',connected:false,connecting:false,error:null,lobby:initialLobby(),rtt:0};
  this.lostAt=0;this.localPause=false;this.cueAck=this.cueSeen=0;this.cues=[];await this.transport.close();if(was)this.notify();
 }
 dispose(){void this.close();this.unsubscribe();}
}
