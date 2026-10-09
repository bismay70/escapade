"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { BufferGeometry } from "three";
import { usePageMotion } from "../../common/HomeMotion";
import styles from "./world.module.css";

/** Procedural travel dioramas: no remote models, textures or animation services. */
export default function TravelWorld({ hero = false }: { hero?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const enabled = usePageMotion();
  useEffect(() => {
    const element = canvas.current, section = root.current;
    if (!element || !section) return;
    let cancelled = false, cleanup = () => {};
    import("three").then(T => {
      if (cancelled) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(42, 1, .1, 100);
      const world = new T.Group(); scene.add(world);
      scene.add(new T.HemisphereLight(0xeafaff, 0x596e79, 3));
      const sun = new T.DirectionalLight(0xffefd8, 4); sun.position.set(-5, 9, 8); scene.add(sun);
      const materials = new Map<number, InstanceType<typeof T.MeshStandardMaterial>>();
      function mat(color: number) {
        if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .72, flatShading: true }));
        return materials.get(color)!;
      }
      function mesh(parent: InstanceType<typeof T.Group>, geometry: BufferGeometry, color: number, x=0, y=0, z=0) {
        const object = new T.Mesh(geometry, mat(color)); object.position.set(x,y,z); parent.add(object); return object;
      }
      function island(x: number, z: number, size: number) {
        const group = new T.Group(); group.position.set(x,-1,z); world.add(group);
        mesh(group,new T.ConeGeometry(size,2,7),0x817665,0,-1).rotation.z=Math.PI;
        mesh(group,new T.CylinderGeometry(size,size*.95,.22,48),0xe8d2a3);
        mesh(group,new T.CylinderGeometry(size*.82,size*.87,.16,48),0x719b70,0,.18);
        return group;
      }
      const beach = island(-4, 0, 2.5);
      const water = mesh(beach,new T.CylinderGeometry(1.25,1.25,.05,48),0x53c4cf,.25,.29,.55);
      water.scale.z=.66;
      function palm(x: number,z: number,scale=1) {
        const tree=new T.Group(); tree.position.set(x,.25,z); tree.scale.setScalar(scale); beach.add(tree);
        mesh(tree,new T.CylinderGeometry(.07,.12,1.6,7),0x91704d,0,.8).rotation.z=-.12;
        for(let i=0;i<7;i++) {
          const leaf=mesh(tree,new T.SphereGeometry(1,8,5),0x236f53);
          const angle=i*Math.PI*2/7;leaf.position.set(Math.cos(angle)*.44,1.6,Math.sin(angle)*.44);
          leaf.scale.set(.75,.07,.2);leaf.rotation.set(0,-angle,.17);
        }
      }
      palm(-1,-.4,1.25);palm(1,-1,.95);palm(-1.3,.7,.8);
      const umbrella = mesh(beach,new T.ConeGeometry(.55,.3,12),0xf48360,1,.9,.7);
      mesh(beach,new T.CylinderGeometry(.025,.025,.65,6),0xf5eee0,1,.56,.7);
      umbrella.rotation.z=.15;
      const mountains = island(4,-1,2.6);
      for(let i=0;i<4;i++) {
        const h=2.2+(i%2)*1.3,x=(i-1.5)*.85,z=(i%2)*.7-.5;
        mesh(mountains,new T.ConeGeometry(1.15,h,5),i%2?0x637f85:0x78979a,x,h/2+.25,z);
        mesh(mountains,new T.ConeGeometry(.36,h*.31,5),0xf2f7f3,x,h*.845+.25,z);
      }
      for(let i=0;i<9;i++) {
        const x=Math.sin(i*2.4)*1.9,z=Math.cos(i*2.4)*1.7;
        mesh(mountains,new T.ConeGeometry(.22,.85,6),0x315c4e,x,.6,z);
      }
      const balloons: InstanceType<typeof T.Group>[]=[];
      for(let i=0;i<5;i++) {
        const balloon=new T.Group();world.add(balloon);balloons.push(balloon);
        mesh(balloon,new T.SphereGeometry(.55,16,12),i%2?0xf1b34c:0xe88368,0,.6).scale.y=1.22;
        mesh(balloon,new T.BoxGeometry(.24,.19,.24),0xb48b62,0,-.4);
        for(const x of [-.1,.1]) mesh(balloon,new T.CylinderGeometry(.012,.012,.45,4),0xede0cb,x,-.16);
      }
      const cloudGroup=new T.Group();world.add(cloudGroup);
      for(let i=0;i<6;i++) {
        const cloud=new T.Group();cloudGroup.add(cloud);
        cloud.position.set((i%2?1:-1)*(6+(i%3)),(i%3)*2-2,-4+(i%3));
        for(let j=0;j<3;j++) {const puff=mesh(cloud,new T.SphereGeometry(.65,12,8),0xe9f2f5,j*.55,0);puff.scale.set(1,.45+j*.12,.65);}
      }
      const resize=()=>{const r=element.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(element);resize();
      let visible=false,progress=0,time=0,last=performance.now();
      const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(element);
      const pointer={x:0,y:0};
      const move=(e:PointerEvent)=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5;};
      window.addEventListener("pointermove",move,{passive:true});
      function render() {
        const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
        if(!visible||document.hidden)return;
        if(enabled)time+=dt;
        const r=section!.getBoundingClientRect();
        const target=enabled?Math.min(1,Math.max(0,-r.top/Math.max(1,r.height-(hero?0:innerHeight)))):0;
        progress+=(target-progress)*Math.min(1,dt*6);
        const mobile=element!.clientWidth<768;
        camera.position.set(enabled?pointer.x*.5:0,hero?4:3.4, mobile?22:17);
        camera.lookAt(0,hero?0:.5,0);
        world.rotation.y=hero?-.12+progress*.8:-.35+progress*1.7;
        world.position.y=hero?1+progress*2:0;
        world.scale.setScalar(hero?(mobile?.85:1.12):1+Math.sin(progress*Math.PI)*.22);
        beach.position.y=-1+Math.sin(time*.6)*.12;
        mountains.position.y=-.8+Math.sin(time*.5+2)*.16;
        balloons.forEach((b,i)=>{b.position.set(-6+i*3,2.8+Math.sin(time*.5+i)*.3,-2-(i%2)*3);b.rotation.z=Math.sin(time*.4+i)*.08;});
        cloudGroup.position.x=Math.sin(time*.1)*.4;
        section!.dataset.chapter=String(Math.min(2,Math.floor(progress*3)));
        renderer.render(scene,camera);
        element!.dataset.ready="true";
      }
      renderer.setAnimationLoop(render);
      cleanup=()=>{observer.disconnect();intersection.disconnect();window.removeEventListener("pointermove",move);renderer.setAnimationLoop(null);scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();delete element.dataset.ready;};
    }).catch(()=>{});
    return()=>{cancelled=true;cleanup();};
  },[enabled,hero]);
  return <div ref={root} data-chapter="0" data-enabled={enabled} className={hero?styles.hero:styles.world}>
    <div className={styles.stage}>
      <div ref={canvas} className={styles.canvas} aria-hidden="true"><div className={styles.fallback}/></div>
      {!hero&&<>
        <header className={styles.heading}><p>YOUR NEXT CHAPTER</p><h2>Somewhere<br/><em>out of the ordinary.</em></h2></header>
        <div className={styles.chapters}>
          <article data-chapter="0"><span>01 / DRIFT AWAY</span><h3>A slower kind of paradise.</h3><p>Palm-lined shores. Unhurried mornings. A little room to breathe.</p></article>
          <article data-chapter="1"><span>02 / TAKE THE SCENIC ROUTE</span><h3>Find your higher ground.</h3><p>Follow the mountains, take the detour, stay for the view.</p></article>
          <article data-chapter="2"><span>03 / GO BEYOND</span><h3>Let curiosity lead.</h3><p>Tell us what moves you. Build a journey around it.</p></article>
        </div>
        <Link className={styles.link} href="/dashboard">Create your journey <span>↗</span></Link>
        <div className={styles.track} aria-hidden="true"><i/><i/><i/></div>
      </>}
    </div>
  </div>;
}
