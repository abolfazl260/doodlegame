import * as THREE from "three";
import type {Renderer} from "./Renderer";
import type {GameRenderState} from "../gameplay/GameSession";

export class ThreeRenderer implements Renderer {
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
  private renderer:THREE.WebGLRenderer;
  private player=new THREE.Group();
  private head:THREE.Mesh;
  private limbs:THREE.LineSegments;
  private platformMeshes:THREE.Mesh[]=[];
  private limbPositions=new Float32Array(20);

  constructor(private readonly canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"high-performance"});
    this.renderer.setClearColor(0x000000,1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.camera.position.z=20;

    const headMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
    this.head=new THREE.Mesh(new THREE.CircleGeometry(.24,16),headMaterial);

    const limbGeometry=new THREE.BufferGeometry();
    limbGeometry.setAttribute("position",new THREE.BufferAttribute(this.limbPositions,3));
    this.limbs=new THREE.LineSegments(limbGeometry,new THREE.LineBasicMaterial({color:0xffffff}));

    this.player.add(this.head,this.limbs);
    this.scene.add(this.player);

    const platformMaterial=new THREE.MeshBasicMaterial({color:0x777777});
    for(const _ of [0,1,2]){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),platformMaterial);
      this.platformMeshes.push(mesh);
      this.scene.add(mesh);
    }
    this.resize();
  }

  resize(){
    const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),a=w/h;
    this.renderer.setSize(w,h,false);
    const viewHeight=10;
    this.camera.left=-a*viewHeight/2;
    this.camera.right=a*viewHeight/2;
    this.camera.top=viewHeight/2;
    this.camera.bottom=-viewHeight/2;
    this.camera.updateProjectionMatrix();
  }

  render(state:GameRenderState){
    const stride=state.grounded?Math.sin(state.animationTime*Math.min(Math.abs(state.playerVelocityX),6)*1.5)*.16:0;
    const bob=state.grounded?Math.abs(stride)*.35:0;
    const x=state.playerX,y=state.playerY+bob;
    this.player.position.set(x,y,0);

    this.head.position.set(0,.82,0);
    const hipY=-.08, shoulderY=.42, footY=-.9;
    const swing=stride;
    const armSwing=-swing*.9;
    const handY=shoulderY-.42;
    const values=[
      0,hipY, 0,shoulderY,
      0,hipY, -.28+swing,footY,
      0,hipY, .28-swing,footY,
      -.22,shoulderY, -.42+armSwing,handY,
      .22,shoulderY, .42-armSwing,handY
    ];
    for(let i=0;i<values.length;i++)this.limbPositions[i]=values[i];
    this.limbs.geometry.attributes.position.needsUpdate=true;

    for(let i=0;i<this.platformMeshes.length;i++){
      const p=state.platforms[i];
      if(!p)continue;
      const mesh=this.platformMeshes[i];
      mesh.position.set(p.x+p.width/2,p.y+p.height/2,-.05);
      mesh.scale.set(p.width,p.height,1);
    }

    const targetY=Math.max(2.5,state.playerY+1.2);
    this.camera.position.y+=(targetY-this.camera.position.y)*.12;
    this.renderer.render(this.scene,this.camera);
  }

  dispose(){
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.traverse(object=>{
      if(object instanceof THREE.Mesh){
        object.geometry.dispose();
        if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());
        else object.material.dispose();
      }
      if(object instanceof THREE.LineSegments){
        object.geometry.dispose();
        if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());
        else object.material.dispose();
      }
    });
    this.scene.clear();
  }
}
