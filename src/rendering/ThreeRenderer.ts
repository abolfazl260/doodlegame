import * as THREE from "three";
import type {Renderer} from "./Renderer";
export class ThreeRenderer implements Renderer {
 private scene=new THREE.Scene(); private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10); private renderer:THREE.WebGLRenderer;
 constructor(private readonly canvas:HTMLCanvasElement){this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});this.renderer.setClearColor(0x000000,1);this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.camera.position.z=1;this.resize();}
 resize(){const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;this.renderer.setSize(w,h,false);this.camera.left=-a;this.camera.right=a;this.camera.top=1;this.camera.bottom=-1;this.camera.updateProjectionMatrix();}
 render(){this.renderer.render(this.scene,this.camera);}
 dispose(){this.renderer.dispose();this.renderer.forceContextLoss();this.scene.clear();}
}
