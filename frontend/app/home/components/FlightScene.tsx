"use client";

import { useEffect, useRef } from "react";
import { usePageMotion } from "../../common/HomeMotion";

/** A decorative aircraft and cloud layer. Pointer events pass through to search. */
export default function FlightScene() {
  const host = useRef<HTMLDivElement>(null);
  const enabled = usePageMotion();
  useEffect(() => {
    const element = host.current;
    if (!element || !enabled) return;
    let disposed = false;
    let clean = () => {};
    import("three").then(T => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(43,1,.1,80); camera.position.set(0,0,12);
      scene.add(new T.HemisphereLight(0xffffff,0x5a7eab,3));
      const light = new T.DirectionalLight(0xffffff,4); light.position.set(-4,6,8); scene.add(light);
      const plane = new T.Group(); scene.add(plane);
      const white = new T.MeshStandardMaterial({color:0xf7fafc,metalness:.25,roughness:.38});
      const navy = new T.MeshStandardMaterial({color:0x164f9a,metalness:.35,roughness:.3});
      const glass = new T.MeshStandardMaterial({color:0x0e2e4d,metalness:.5,roughness:.18});
      function ellipsoid(x:number,y:number,z:number,sx:number,sy:number,sz:number,material=white) {
        const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); plane.add(mesh); return mesh;
      }
      // Fuselage points forward along -Z; swept wings are actual extruded geometry.
      ellipsoid(0,0,0,.22,.23,1.8);
      ellipsoid(0,.10,-1.20,.17,.14,.35,glass);
      const wingShape = new T.Shape(); wingShape.moveTo(-2.15,.7); wingShape.lineTo(-.2,-.3); wingShape.lineTo(.2,-.3); wingShape.lineTo(2.15,.7); wingShape.lineTo(2.15,.94); wingShape.lineTo(.2,.48); wingShape.lineTo(-.2,.48); wingShape.lineTo(-2.15,.94); wingShape.closePath();
      const wings = new T.Mesh(new T.ExtrudeGeometry(wingShape,{depth:.055,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:2,steps:1}),white);
      wings.rotation.x=Math.PI/2; wings.position.z=-.2; plane.add(wings);
      const tail=wings.clone(); tail.scale.set(.4,.5,1); tail.position.z=1.2; plane.add(tail);
      const fin = new T.Mesh(new T.BoxGeometry(.055,.7,.6),navy); fin.position.set(0,.45,1.15); fin.rotation.x=-.32; plane.add(fin);
      for (const x of [-.75,.75]) { ellipsoid(x,-.18,.05,.17,.17,.4); ellipsoid(x,-.18,-.3,.125,.125,.025,glass); }
      for (let i=0;i<8;i++) for(const x of [-.21,.21]) ellipsoid(x,.085,-.85+i*.23,.012,.045,.035,glass);
      const clouds = new T.Group(); scene.add(clouds);
      const cloudMat = new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.55,roughness:1,depthWrite:false});
      for(let i=0;i<12;i++) {
        const cloud=new T.Group();
        for(let j=0;j<3;j++) {
          const puff=new T.Mesh(new T.SphereGeometry(1,16,12),cloudMat); puff.scale.set(.8+j*.15,.3+j*.06,.4); puff.position.x=j*.6; cloud.add(puff);
        }
        cloud.position.set((i%4-1.5)*4,Math.floor(i/4)*3-3,-3-(i%3)*2); clouds.add(cloud);
      }
      const observer=new ResizeObserver(()=>{const r=element.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}); observer.observe(element);
      let visible=false;const intersection=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});intersection.observe(element);
      const pointer={x:0,y:0};const move=(e:PointerEvent)=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5;};window.addEventListener("pointermove",move,{passive:true});
      let phase=0,last=performance.now();
      renderer.setAnimationLoop(()=>{
        const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now;
        if(!visible||document.hidden)return;
        phase+=dt;
        const rect=element.getBoundingClientRect();const scroll=Math.max(0,-rect.top/Math.max(1,rect.height));
        const small=rect.width<768;
        plane.position.set((small?1.4:3.9)-scroll*6+Math.sin(phase*.28)*.25,1.6+Math.sin(phase*.5)*.18+scroll*2,1);
        plane.rotation.set(.38+pointer.y*.12,.6+scroll*.8+pointer.x*.2,-.3+Math.sin(phase*.4)*.08);
        plane.scale.setScalar(small?.62:.88);
        clouds.position.x=Math.sin(phase*.07)*1.4; clouds.position.y=scroll*2;
        renderer.render(scene,camera);
      });
      clean=()=>{observer.disconnect();intersection.disconnect();window.removeEventListener("pointermove",move);renderer.setAnimationLoop(null);const geometries=new Set<InstanceType<typeof T.BufferGeometry>>();const materials=new Set<InstanceType<typeof T.Material>>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
    }).catch(()=>{});
    return()=>{disposed=true;clean();};
  },[enabled]);
  return <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />;
}
