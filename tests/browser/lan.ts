/** In-memory transport fixture. This tests UI/orchestration, not Android sockets or physical Wi-Fi. */
import '../../src/styles.css';
import {SessionController} from '../../src/network/SessionController';
import {LanUI} from '../../src/network/LanUI';
import {lanHud} from '../../src/network/LanHud';
import {IDLE} from '../../src/network/NetworkInput';
import type {LanTransport,TransportEvent} from '../../src/network/LanTransport';
import {GameSession} from '../../src/gameplay/GameSession';
import {GameUI} from '../../src/ui/GameUI';
import {GameState} from '../../src/core/GameState';
import {WebInput} from '../../src/platform/web/WebInput';
import {WebStorage} from '../../src/platform/web/WebStorage';
import {I18n} from '../../src/i18n/I18n';
import {WebFrameScheduler} from '../../src/platform/web/WebFrameScheduler';
class Transport implements LanTransport{
 peer:Transport|null=null;target:Transport|null=null;listening=false;listeners=new Set<(e:TransportEvent)=>void>();
 subscribe(listener:(e:TransportEvent)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 emit(e:TransportEvent){for(const listener of this.listeners)listener(e);}
 async listen(){this.listening=true;return{address:'192.168.4.2',port:23000};}
 async connect(){if(!this.target?.listening)throw new Error('connection');this.peer=this.target;this.target.peer=this;this.target.emit({type:'connected'});this.emit({type:'connected'});}
 async send(data:string){const peer=this.peer;if(!peer)throw new Error('connection');queueMicrotask(()=>peer.emit({type:'message',data}));}
 async dropPeer(){const peer=this.peer;this.peer=null;this.emit({type:'disconnected'});if(peer){peer.peer=null;peer.emit({type:'disconnected'});}}
 async close(){this.listening=false;const peer=this.peer;this.peer=null;if(peer){peer.peer=null;peer.emit({type:'disconnected'});}}
}
const root=document.querySelector<HTMLElement>('#ui-root')!,input=new WebInput(document.querySelector('#game-canvas')!);input.start();
const idle={getState:()=>IDLE,endFrame(){},resetTransientState(){},start(){},stop(){},dispose(){}};
const ht=new Transport(),gt=new Transport();gt.target=ht;
const i18n=new I18n(new WebStorage());let panel:LanUI,ui:GameUI;
const guestView=new URLSearchParams(location.search).get('role')==='guest';
const offline=new GameSession(input);offline.reset(false);
const read=()=>{const frame=visible.frame;return frame?lanHud(frame,guestView,panel.labels.you,panel.labels.opponent):offline.getHudState();};
const host=new SessionController(ht,guestView?idle:input,new WebFrameScheduler(),{render:(_frame,state)=>{if(!guestView)ui.render(state,read());},change:()=>panel?.render()});
const guest=new SessionController(gt,guestView?input:idle,new WebFrameScheduler(),{render:(_frame,state)=>{if(guestView)ui.render(state,read());},change:()=>panel?.render()});
const visible=guestView?guest:host;
ui=new GameUI(root,{
 quickPlay(){},start(){},pause:()=>visible.pause(),resume:()=>visible.ready(),restart:()=>visible.ready(),stopToMenu:()=>void panel.close(),
 weaponNext:()=>visible.cycleWeapon(1),weaponPrevious:()=>visible.cycleWeapon(-1),weaponSelect:id=>visible.selectWeapon(id),selectStartingWeapon(){},upgradeWeapon(){},arenaSelect(){},modeSelect(){},
 setTouchMove:(x,y)=>input.setTouchMove(x,y),touchGrab:()=>input.triggerTouchGrab(),touchDash:()=>input.triggerTouchDash(),touchAttackStart:()=>input.touchAttack(true),touchAttackEnd:()=>input.touchAttackRelease(),touchAttackCancel:()=>input.touchAttackCancel(),setWeaponAim:(_player,x,y)=>visible.setAim(x,y),toggleCombatSound(){},toggleCameraShake(){},updateData:async()=>{}
},i18n);
ui.bind(()=>()=>{},read);
panel=new LanUI(root,visible,i18n,()=>input.resetTransientState(),()=>ui.render(GameState.MENU,offline.getHudState()));
const fixture={
 hostRoom:async()=>{await host.create();return{...host.view};},
 joinPeer:()=>guest.join(host.view.address,host.view.port,host.view.token),
 peerReady:()=>guestView?host.ready():guest.ready(),
 startHost:()=>host.start(),
 pause:()=>visible.interrupt(),
 drop:()=>gt.dropPeer(),
 lifecycle:()=>{const transport=guestView?gt:ht;transport.emit({type:'background'});transport.emit({type:'foreground'});},
 state:()=>({host:host.view.lobby.phase,guest:guest.view.lobby.phase,frame:host.frame,localInput:{...input.getState()}}),
 locale:(locale:'fa'|'en')=>i18n.setLocale(locale)
};
(window as typeof window&{__lanFixture:typeof fixture}).__lanFixture=fixture;
