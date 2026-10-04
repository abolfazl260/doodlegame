import type {FrameCallback,FrameScheduler} from "../../core/FrameScheduler";
export class WebFrameScheduler implements FrameScheduler {request(callback:FrameCallback){return window.requestAnimationFrame(callback);}cancel(handle:number){window.cancelAnimationFrame(handle);}}
