import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SessionController} from '../.test-build/network/SessionController.js';
import {FixedStep} from '../.test-build/network/FixedStep.js';
import {HostInput,RemoteInput,InputJournal,IDLE} from '../.test-build/network/NetworkInput.js';
import {decodeMessage,PROTOCOL} from '../.test-build/network/Protocol.js';
import {BUILD_FINGERPRINT} from '../.test-build/network/BuildFingerprint.js';
import {encodeFrame,decodeFrame,SnapshotBuffer} from '../.test-build/network/StateCodec.js';
import {isLanAddress,MAX_PACKET_BYTES} from '../.test-build/network/LanTransport.js';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {lanHud} from '../.test-build/network/LanHud.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function local(){return{state:{...IDLE},getState(){return this.state;},endFrame(){this.state={...this.state,pointerPressed:false,pointerReleased:false,attackCancelled:false,jumpPressed:false,dashPressed:false,grabPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};},resetTransientState(){this.state={...IDLE};},start(){},stop(){},dispose(){}};}
function scheduler(){const callbacks=new Map();let id=0;return{request(cb){callbacks.set(++id,cb);return id;},cancel(i){callbacks.delete(i);},frame(now){for(const [i,cb]of [...callbacks]){callbacks.delete(i);cb(now);}}};}
class Transport{
 listeners=new Set();peer=null;sent=[];listening=false;
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(e){for(const fn of this.listeners)fn(e);}
 async listen(){this.listening=true;return{address:'192.168.4.2',port:23000};}
 async connect(){if(!this.target?.listening)throw new Error('connection');this.peer=this.target;this.target.peer=this;this.target.emit({type:'connected'});this.emit({type:'connected'});}
 async send(data){if(!this.peer)throw new Error('connection');this.sent.push(JSON.parse(data));const peer=this.peer;queueMicrotask(()=>peer.emit({type:'message',data}));}
 async dropPeer(){const peer=this.peer;this.peer=null;this.emit({type:'disconnected'});if(peer){peer.peer=null;peer.emit({type:'disconnected'});}}
 async close(){this.listening=false;const peer=this.peer;this.peer=null;if(peer){peer.peer=null;peer.emit({type:'disconnected'});}}
}
async function room(t){
 let now=1000;const ht=new Transport(),gt=new Transport();gt.target=ht;
 const hi=local(),gi=local(),hs=scheduler(),gs=scheduler(),renders=[];
 const host=new SessionController(ht,hi,hs,{clock:()=>now,render:(frame,state)=>renders.push({frame,state}),change(){}});
 const guest=new SessionController(gt,gi,gs,{clock:()=>now,render:(frame,state)=>renders.push({frame,state}),change(){}});
 t.after(async()=>{await host.close();await guest.close();});
 await host.create();await guest.join('192.168.4.2',23000,host.view.token);await flush();
 const step=async(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;hs.frame(now);gs.frame(now);await flush();}};
 const play=async()=>{host.ready();guest.ready();await flush();host.start();await flush();await step(185);assert.equal(host.view.lobby.phase,'playing');assert.equal(guest.view.lobby.phase,'playing');};
 return{host,guest,ht,gt,hi,gi,step,play,renders,advanceClock(ms){now+=ms;}};
}

test('LAN address validation rejects DNS, WAN, loopback, alternate encodings and invalid ports in join',async t=>{
 for(const ip of ['8.8.8.8','127.0.0.1','localhost','[::1]','10.0.0.256','010.1.2.3','192.168.1.255','192.168.1.0','172.32.0.1'])assert.equal(isLanAddress(ip),false,ip);
 for(const ip of ['10.1.2.3','192.168.4.2','172.16.8.9','172.31.1.1'])assert.equal(isLanAddress(ip),true,ip);
 const r=await room(t);await assert.rejects(()=>r.guest.join('8.8.8.8',23000,r.host.view.token),/address/);await assert.rejects(()=>r.guest.join('192.168.4.2',80,r.host.view.token),/address/);
});
test('fixed 60 Hz LAN step is independent of 30/60/120 FPS, capped and resets at pause',()=>{
 for(const fps of [30,60,120]){const clock=new FixedStep();let ticks=0;for(let i=0;i<fps;i++)clock.advance(1/fps,()=>ticks++);assert.equal(ticks,60);}
 const clock=new FixedStep();assert.equal(clock.advance(60,()=>{}),6);clock.advance(1/120,()=>{});clock.reset();assert.equal(clock.advance(1/120,()=>{}),0);
});
test('reliable input journal preserves ordered press/release, deduplicates retransmission and rejects gaps/overflow',()=>{
 const journal=new InputJournal(),remote=new RemoteInput();
 journal.capture({input:{...IDLE,attackPressed:true,attackHeld:true},aim:null,weapon:null});
 journal.capture({input:{...IDLE,pointerReleased:true},aim:null,weapon:null});
 remote.accept(journal.held,journal.pending());remote.accept(journal.held,journal.pending());assert.equal(remote.ack,2);
 assert.equal(remote.next().input.attackPressed,true);assert.equal(remote.next().input.pointerReleased,true);assert.equal(remote.next().input.pointerReleased,false);
 journal.acknowledge(2);assert.equal(journal.pending().length,0);
 assert.throws(()=>remote.accept(journal.held,[{...journal.held,id:4}]),/overflow/);
 const input=local(),host=new HostInput(input);host.setLocalPvPEnabled(true);assert.equal(input.pvp,undefined);
});
test('protocol rejects oversized, nonfinite, bad enums, malformed edges and unrecognized packet types',()=>{
 const base={type:'INPUT',epoch:1,seq:1,cueAck:0,held:{input:IDLE,aim:null,weapon:null},edges:[]};
 assert.equal(decodeMessage(JSON.stringify(base)).held.input.moveX,0);
 for(const bad of [{...base,held:{...base.held,input:{...IDLE,moveX:3}}},{...base,edges:Array(65).fill({})},{type:'SET_HP',hp:999},{...base,held:{...base.held,weapon:'evil'}},{...base,held:{...base.held,aim:[1]}}])assert.throws(()=>decodeMessage(JSON.stringify(bad)));
 assert.throws(()=>decodeMessage(' '.repeat(MAX_PACKET_BYTES+1)));assert.throws(()=>decodeFrame({tick:NaN}));
});
test('full handshake requires matching token, protocol and build, never enables Online',async t=>{
 const r=await room(t);assert.equal(r.host.view.connected,true);assert.equal(r.guest.view.connected,true);
 assert.equal(r.ht.sent.find(m=>m.type==='ACCEPT').version,PROTOCOL);
 assert.equal(r.gt.sent.find(m=>m.type==='JOIN').fingerprint,BUILD_FINGERPRINT);
 await r.guest.close();await r.guest.join('192.168.4.2',23000,'0'.repeat(32));await flush();await flush();assert.equal(r.guest.view.error,'token');assert.equal(r.host.view.connected,false);
 const ui=readFileSync('src/ui/GameUI.ts','utf8');assert.match(ui,/onlineModeButton.disabled=true/);
});
test('host is sole physics authority; guest movement, dash, aim, weapon and held bow use P2 and snapshots agree',async t=>{
 const r=await room(t);await r.play();
 const initial=r.host.frame.opponent.x;r.guest.setAim(-1,.5);r.guest.selectWeapon('bow');r.gi.state={...IDLE,moveX:-1,jumpPressed:true,attackPressed:true,attackHeld:true};await r.step(24);
 assert.ok(r.host.frame.opponent.x<initial);assert.equal(r.host.frame.opponent.weapon,'bow');assert.ok(r.host.frame.opponent.bowCharge>0);assert.ok(r.host.frame.opponent.aimAngle>2);
 r.gi.state={...IDLE,pointerReleased:true};await r.step(8);assert.equal(r.host.frame.opponent.bowCharge,0);
 r.gi.state={...IDLE,dashPressed:true,moveX:1};r.hi.state={...IDLE,moveX:-1};await r.step(20);
 assert.equal(r.guest.frame.player.health,r.host.frame.player.health);assert.equal(r.guest.frame.opponent.health,r.host.frame.opponent.health);
 assert.equal(r.guest.frame.arena,r.host.frame.arena);assert.equal(r.guest.frame.opponent.enemyType,null);assert.equal(r.guest.session,null);
 const hud=lanHud(r.host.frame,true,'You','Opponent');assert.equal(hud.weapon,r.host.frame.opponent.weapon);assert.equal(hud.localPvP,false);assert.equal(hud.lanPlayer,2);
});
test('snapshot projection strips simulation internals, validates all built-in arenas and interpolates poses only',()=>{
 const input=local(),session=new GameSession(new HostInput(input));session.setLocalPvP(true);
 for(const arena of ['classic','towers','pit','steps','zigzag','sky','moving','fortress','bridge','crater','vertical','ruins','conveyor','collapse','storm','reactor']){
  session.setArena(arena);session.reset(false);const frame=encodeFrame(1,1,1,0,session.getRenderState());assert.equal('cooldown' in frame.state.player,false);assert.ok(JSON.stringify(frame).length<MAX_PACKET_BYTES);
 }
 const a=encodeFrame(1,1,1,0,session.getRenderState());const b=structuredClone(a);b.tick=4;b.state.player.x+=10;b.state.player.health=33;
 const buffer=new SnapshotBuffer();buffer.push(a,0);buffer.push(b,50);assert.equal(buffer.render(75).player.x,a.state.player.x+5);assert.equal(buffer.render(75).player.health,33);assert.equal(buffer.push(a,80),false);
});
test('pause, foreground, rotation interruption and resume require both ready, cancel held inputs and a fresh epoch',async t=>{
 const r=await room(t);await r.play();r.guest.selectWeapon('bow');r.gi.state={...IDLE,attackPressed:true,attackHeld:true};await r.step(20);
 r.guest.interrupt();await flush();await flush();assert.equal(r.host.view.lobby.phase,'paused');assert.equal(r.guest.view.lobby.phase,'paused');assert.equal(r.host.frame.opponent.bowCharge,0);
 const x=r.host.frame.player.x;await r.step(30);assert.equal(r.host.frame.player.x,x);
 const epoch=r.host.view.lobby.epoch;r.host.ready();await flush();assert.equal(r.host.view.lobby.phase,'paused');r.guest.ready();await flush();assert.equal(r.host.view.lobby.phase,'countdown');assert.equal(r.host.view.lobby.epoch,epoch+1);
 await r.step(185);assert.equal(r.host.view.lobby.phase,'playing');assert.equal(r.guest.view.lobby.phase,'playing');assert.equal(r.gi.state.attackHeld,false);
});
test('disconnect freezes without winner, same room rejoin pauses, stale epoch input and forged score cannot mutate host',async t=>{
 const r=await room(t);await r.play();await r.gt.dropPeer();await flush();assert.equal(r.host.view.lobby.phase,'lost');assert.equal(r.host.frame.winner,null);const x=r.host.frame.opponent.x;await r.step(20);assert.equal(r.host.frame.opponent.x,x);
 await r.guest.retry();await flush();assert.equal(r.host.view.connected,true);assert.equal(r.host.view.lobby.phase,'paused');assert.equal(r.guest.view.lobby.phase,'paused');
 r.host.ready();r.guest.ready();await flush();await r.step(185);
 const epoch=r.host.view.lobby.epoch,previousSeq=r.host.lastInputSeq;r.ht.emit({type:'message',data:JSON.stringify({type:'INPUT',epoch:epoch-1,seq:999,cueAck:0,held:{input:{...IDLE,moveX:-1},aim:null,weapon:null},edges:[]})});
 assert.equal(r.host.lastInputSeq,previousSeq);
 const before=r.host.frame.player.health;r.ht.emit({type:'message',data:JSON.stringify({type:'SNAPSHOT',frame:encodeFrame(999,epoch,1,0,r.host.frame)})});await flush();assert.equal(r.host.frame.player.health,before);assert.equal(r.host.view.error,'packet');
});
test('authoritative result and consented rematch reset both phones; no progression is attached',async t=>{
 const r=await room(t);await r.play();
 // Inject lethal state into host simulation only to exercise real winner/result orchestration.
 r.host.session.opponent.health=0;r.host.session.winner='player';await r.step(5);
 assert.equal(r.host.view.lobby.phase,'result');assert.equal(r.guest.view.lobby.phase,'result');assert.equal(r.guest.frame.winner,'player');
 const match=r.host.view.lobby.match;r.guest.ready();await flush();assert.equal(r.host.view.lobby.phase,'result');r.host.ready();await flush();assert.equal(r.host.view.lobby.phase,'countdown');await r.step(185);
 assert.equal(r.guest.view.lobby.match,match+1);assert.equal(r.guest.frame.winner,null);assert.equal(r.host.frame.player.health,100);assert.equal(r.host.frame.upgradePoints,0);
});
test('heartbeat timeout and bounded rejoin expiration do not synthesize results',async t=>{
 const r=await room(t);await r.play();r.advanceClock(6000);r.host.maintain();await flush();assert.equal(r.host.view.error,'timeout');assert.equal(r.host.frame.winner,null);r.advanceClock(31000);r.guest.maintain();assert.equal(r.guest.view.error,'expired');
});
test('native build copies and registers LAN source, retains HTTPS hardening and Wi-Fi subnet restrictions',()=>{
 const configure=readFileSync('scripts/android/configure.mjs','utf8'),java=readFileSync('scripts/android/native/DoodleLanPlugin.java','utf8');
 assert.match(configure,/copyFileSync\("scripts\/android\/native\/DoodleLanPlugin.java"/);assert.match(configure,/registerPlugin\(DoodleLanPlugin.class\)/);assert.match(configure,/usesCleartextTraffic="false"/);assert.doesNotMatch(configure,/cleartextTrafficPermitted="true"/);
 for(const required of ['TRANSPORT_WIFI','network.bindSocket(socket)','selected.contains(destination)','selected.address, 0','MAX_FRAME = 65536','new ArrayBlockingQueue<>(16)','handleOnDestroy','BACKGROUND'])assert.ok(java.includes(required),required);
 assert.doesNotMatch(java,/InetAddress.getByName\(/);
});

test('backgrounding in lobby revokes readiness without poisoning initial countdown; native foreground never resumes',async t=>{
 const r=await room(t);r.host.ready();r.guest.ready();await flush();assert.equal(r.host.view.lobby.guestReady,true);
 r.gt.emit({type:'background'});await flush();assert.equal(r.host.view.lobby.phase,'lobby');assert.equal(r.host.view.lobby.guestReady,false);assert.equal(r.guest.localPause,false);
 await r.play();r.ht.emit({type:'background'});await flush();assert.equal(r.guest.view.lobby.phase,'paused');
 r.ht.emit({type:'foreground'});await flush();assert.equal(r.host.view.lobby.phase,'paused');assert.equal(r.guest.view.lobby.phase,'paused');
});

test('LAN starts local input in one-player layout even after shared-screen PvP',async t=>{
 const r=await room(t);let enabled=true;r.hi.setLocalPvPEnabled=v=>{enabled=v;};await r.host.close();await r.host.create();assert.equal(enabled,false);
});
