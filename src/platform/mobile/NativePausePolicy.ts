import {GameState} from "../../core/GameState";

type PauseActions={
 getState:()=>GameState;
 pause:()=>void;
};

/**
 * Backgrounding may suspend the WebView before it receives a native
 * appStateChange(false) callback. Check again when it becomes active so an
 * interrupted match never resumes without displaying the pause menu.
 */
export function pausePlayingMatch(actions:PauseActions):boolean{
 if(actions.getState()!==GameState.PLAYING)return false;
 actions.pause();
 return true;
}
