type VisibilityTarget=Pick<Document,"hidden"|"addEventListener"|"removeEventListener">;

export function installWebVisibilityLifecycle(target:VisibilityTarget,onHidden:()=>void):()=>void{
 const handleVisibility=()=>{
  if(target.hidden)onHidden();
 };
 target.addEventListener("visibilitychange",handleVisibility);
 handleVisibility();
 return()=>target.removeEventListener("visibilitychange",handleVisibility);
}
