import {GameState} from "../core/GameState";
export class GameUI {
 private root=document.createElement("section");private status=document.createElement("p");private buttons=document.createElement("div");private unsubscribe:(()=>boolean)|null=null;
 constructor(container:HTMLElement,actions:{start:()=>void;pause:()=>void;resume:()=>void;restart:()=>void}){this.root.className="game-ui";const title=document.createElement("h1");title.textContent="DoodleGame";this.status.textContent="Ready";this.buttons.className="game-ui__controls";for(const [label,fn] of [["Start",actions.start],["Pause",actions.pause],["Resume",actions.resume],["Restart",actions.restart]] as const){const b=document.createElement("button");b.textContent=label;b.type="button";b.dataset.action=label;b.onclick=fn;this.buttons.append(b);}this.root.append(title,this.status,this.buttons);container.append(this.root);}
 bind(subscribe:(listener:(state:GameState)=>void)=>()=>boolean){this.unsubscribe?.();this.unsubscribe=subscribe(s=>this.render(s));this.render(GameState.MENU);}
 render(state:GameState){this.status.textContent=state==="MENU"?"Ready":state==="PLAYING"?"Playing":state==="PAUSED"?"Paused":"Game Over";for(const b of this.buttons.children){const button=b as HTMLButtonElement;button.hidden=(button.dataset.action==="Start"&&state!==GameState.MENU)||(button.dataset.action==="Pause"&&state!==GameState.PLAYING)||(button.dataset.action==="Resume"&&state!==GameState.PAUSED)||(button.dataset.action==="Restart"&&state!==GameState.GAME_OVER);}}
 dispose(){this.unsubscribe?.();this.root.remove();}
}
