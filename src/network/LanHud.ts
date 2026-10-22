import type {GameRenderState,GameHudState} from '../gameplay/GameSession';
/** HUD can put "You" first without mirroring the world or altering physical facing. */
export function lanHud(frame:GameRenderState,guest:boolean,you:string,opponent:string):GameHudState&{lanPlayer:1|2;playerName:string;secondPlayerName:string}{
 const own=guest?frame.opponent:frame.player,other=guest?frame.player:frame.opponent;
 const winner=frame.winner==='draw'||frame.winner===null?frame.winner:guest?(frame.winner==='player'?'opponent':'player'):frame.winner;
 return{lanPlayer:guest?2:1,playerName:you,secondPlayerName:opponent,characterId:own.characterId,opponentCharacterId:other.characterId,localPvP:false,playerHealth:own.health,playerMaxHealth:own.maxHealth,opponentHealth:other.health,opponentMaxHealth:other.maxHealth,weapon:own.weapon,secondWeapon:other.weapon,weaponAimAngle:own.aimAngle,secondAimAngle:other.aimAngle,winner,arena:frame.arena,mode:frame.mode,hill:frame.hill,bowCharge:own.bowCharge,missileAngle:own.missileAngle,missilePower:own.missilePower,playerFacing:own.facing,upgradePoints:0,upgradedWeapons:[],characterChosen:true,weaponChosen:true,secondCharacterChosen:true,secondWeaponChosen:true};
}
