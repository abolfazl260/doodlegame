import {GameState} from "../../core/GameState";
import type {TelegramWebApp} from "./TelegramMiniApp";

type Result="player"|"opponent"|"draw"|null;
type Hud={winner:Result;localPvP?:boolean;inRun?:boolean};
type Ticket={matchId:string;minimumSeconds:number;startedAt:number};
type Player={displayName:string;wins:number};
type Leader={rank:number;displayName:string;wins:number};
type ApiResponse={ok?:boolean;error?:string;player?:Player;me?:Player;leaders?:Leader[];myRank?:number|null;matchId?:string;minimumSeconds?:number};

/**
 * Telegram-only, optional ranked wins. Username is NEVER trusted from the WebApp
 * client. The Worker verifies raw initData using the bot token kept as a secret.
 * Game results remain client-reported: this is not anti-cheat matchmaking.
 */
export class TelegramLeaderboard{
 private apiBase="";
 private initData="";
 private connected=false;
 private disposed=false;
 private previousState=GameState.MENU;
 private ticket:Promise<Ticket|null>|null=null;
 private button:HTMLButtonElement|null=null;
 private modal:HTMLElement|null=null;
 private status:HTMLElement|null=null;
 private profile:HTMLElement|null=null;
 private entries:HTMLOListElement|null=null;
 private refreshButton:HTMLButtonElement|null=null;

 constructor(private readonly root:HTMLElement){}

 connect(app:TelegramWebApp){
  if(this.disposed)return;
  this.ensureUi();
  if(typeof app.initData!=="string"||!app.initData){
   this.showStatus("برای شناسایی حساب، بازی را از دکمه Mini App ربات باز کنید.");
   return;
  }
  this.initData=app.initData;
  void this.load();
 }

 onGameState(state:GameState,hud:Hud){
  if(this.disposed)return;
  if(state!==this.previousState){
   if(state===GameState.PLAYING&&this.previousState!==GameState.PAUSED){
    this.close();
    this.ticket=this.connected&&!hud.localPvP&&!hud.inRun?this.beginMatch():null;
   }else if(state===GameState.GAME_OVER&&this.previousState===GameState.PLAYING){
    const pending=this.ticket;
    this.ticket=null;
    if(pending)void this.finishMatch(pending,hud.winner);
   }else if(state===GameState.MENU){
    this.ticket=null;
   }
  }
  this.previousState=state;
 }
 dispose(){this.disposed=true;this.button?.remove();this.modal?.remove();this.ticket=null;}

 private ensureUi(){
  if(this.button)return;
  const links=this.root.querySelector(".game-ui__menu-links");
  if(!links)return;
  const button=document.createElement("button");
  button.type="button";button.className="game-ui__telegram-ranks";
  button.textContent="🏆 رتبه‌بندی تلگرام";
  button.onclick=()=>{this.open();};
  links.append(button);this.button=button;

  const modal=document.createElement("div");
  modal.className="telegram-leaderboard";modal.hidden=true;
  modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-label","رتبه‌بندی تلگرام");
  const panel=document.createElement("section");
  panel.className="telegram-leaderboard__panel";
  const heading=document.createElement("h2");heading.textContent="🏆 رتبه‌بندی بازیکنان";
  const profile=document.createElement("p");profile.className="telegram-leaderboard__profile";
  const status=document.createElement("p");status.className="telegram-leaderboard__status";
  const entries=document.createElement("ol");entries.className="telegram-leaderboard__entries";
  const actions=document.createElement("div");actions.className="telegram-leaderboard__actions";
  const reload=document.createElement("button");reload.type="button";reload.textContent="بروزرسانی";
  reload.onclick=()=>{void this.refresh();};
  const close=document.createElement("button");close.type="button";close.textContent="بستن";
  close.onclick=()=>this.close();
  actions.append(reload,close);
  panel.append(heading,profile,status,entries,actions);
  modal.append(panel);
  modal.addEventListener("pointerdown",event=>{if(event.target===modal)this.close();});
  document.body.append(modal);
  this.modal=modal;this.profile=profile;this.status=status;this.entries=entries;this.refreshButton=reload;
 }

 private showStatus(message:string){
  if(this.status)this.status.textContent=message;
 }
 private open(){
  if(!this.modal)return;
  this.modal.hidden=false;
  void this.refresh();
 }
 private close(){if(this.modal)this.modal.hidden=true;}
 private async load(){
  try{
   const response=await fetch(import.meta.env.BASE_URL+"leaderboard-config.json",{cache:"no-store"});
   if(!response.ok)throw new Error("Configuration unavailable");
   const config:unknown=await response.json();
   const raw=(config&&typeof config==="object"&&"apiBaseUrl" in config)?(config as {apiBaseUrl:unknown}).apiBaseUrl:"";
   if(typeof raw!=="string"||!/^https:\/\/[^/\s]+(?:\/[^?\s]*)?$/.test(raw)){
    this.showStatus("جدول رکورد هنوز روی سرور فعال نشده است.");
    return;
   }
   this.apiBase=raw.replace(/\/+$/,"");
   const data=await this.call("/api/me","GET");
   if(this.disposed)return;
   this.connected=true;
   this.updateProfile(data.player);
   this.showStatus("پیروزی‌های تک‌نفره در این جدول ثبت می‌شوند.");
  }catch(error){
   if(this.disposed)return;
   this.showStatus("اتصال به رتبه‌بندی برقرار نشد؛ دوباره از داخل تلگرام امتحان کنید.");
   console.warn("Telegram leaderboard unavailable:",error instanceof Error?error.message:"error");
  }
 }
 private async call(path:string,method:"GET"|"POST",body?:object):Promise<ApiResponse>{
  if(!this.apiBase||!this.initData)throw new Error("Leaderboard is not connected");
  const response=await fetch(this.apiBase+path,{
   method,
   headers:{"Authorization":"tma "+this.initData,...(body?{"Content-Type":"application/json"}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),
   cache:"no-store"
  });
  const data=await response.json() as ApiResponse;
  if(!response.ok||!data.ok)throw new Error(data.error??"Leaderboard request failed");
  return data;
 }
 private updateProfile(player?:Player){
  if(this.profile&&player)this.profile.textContent=player.displayName+" · "+player.wins+" پیروزی ثبت‌شده";
 }
 private async refresh(){
  if(!this.connected)return;
  if(this.refreshButton)this.refreshButton.disabled=true;
  try{
   const data=await this.call("/api/leaderboard","GET");
   if(this.disposed)return;
   this.entries?.replaceChildren();
   const leaders=Array.isArray(data.leaders)?data.leaders:[];
   if(leaders.length===0)this.showStatus("هنوز رکوردی ثبت نشده است.");
   else this.showStatus("۲۰ نفر برتر · بر اساس پیروزی‌های تک‌نفره");
   for(const leader of leaders){
    const item=document.createElement("li");
    const name=document.createElement("span");
    const value=document.createElement("strong");
    name.textContent=leader.rank+". "+String(leader.displayName??"بازیکن");
    value.textContent=Number(leader.wins??0)+" برد";
    if(data.myRank===leader.rank)item.classList.add("is-me");
    item.append(name,value);
    this.entries?.append(item);
   }
   this.updateProfile(data.me);
  }catch(error){
   if(!this.disposed)this.showStatus(error instanceof Error?error.message:"دریافت جدول ناموفق بود");
  }finally{if(this.refreshButton)this.refreshButton.disabled=false;}
 }
 private async beginMatch():Promise<Ticket|null>{
  try{
   const data=await this.call("/api/matches/start","POST");
   return data.matchId?{matchId:data.matchId,minimumSeconds:data.minimumSeconds??5,startedAt:Date.now()}:null;
  }catch(error){console.warn("Ranked match could not start:",error instanceof Error?error.message:"error");return null;}
 }
 private async finishMatch(pending:Promise<Ticket|null>,winner:Result){
  const match=await pending;
  if(!match||this.disposed)return;
  // Respect the server's minimum duration even when a fight ends very quickly.
  const remaining=match.minimumSeconds*1000-(Date.now()-match.startedAt)+250;
  if(remaining>0)await new Promise<void>(resolve=>setTimeout(resolve,remaining));
  if(this.disposed)return;
  try{
   const result=await this.call("/api/matches/finish","POST",{
    matchId:match.matchId,outcome:winner==="player"?"win":winner==="draw"?"draw":"loss"
   });
   this.updateProfile(result.player);
  }catch(error){
   console.warn("Ranked match result was not saved:",error instanceof Error?error.message:"error");
   this.showStatus("ثبت نتیجه انجام نشد. ارتباط یا زمان‌بندی مسابقه را بررسی کنید.");
  }
 }
}
