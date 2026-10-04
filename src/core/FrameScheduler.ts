export type FrameCallback=(time:number)=>void;
export interface FrameScheduler { request(callback:FrameCallback):number; cancel(handle:number):void; }
