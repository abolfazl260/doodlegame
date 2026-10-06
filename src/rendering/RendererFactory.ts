import type {Renderer} from "./Renderer";

export function createRendererWithFallback(
 primary:()=>Renderer,
 fallback:()=>Renderer,
 onFallback:(error:unknown)=>void=()=>{}
):Renderer{
 try{
  return primary();
 }catch(error){
  onFallback(error);
  return fallback();
 }
}
