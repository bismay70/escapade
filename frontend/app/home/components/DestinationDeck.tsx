"use client";

import { useEffect, useRef } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePageMotion } from "../../common/HomeMotion";
import styles from "./deck.module.css";

const destinations=[{name:"Goa",image:"/destination_india/goa.png"},{name:"The mountains",image:"/home/hero-bg.png"},{name:"Kerala",image:"/destination_india/kerala.png"},{name:"Paris",image:"/about/img/paris.jpg"},{name:"Italy",image:"/about/img/italy.jpg"}];

export default function DestinationDeck(){
 const section=useRef<HTMLElement>(null),host=useRef<HTMLDivElement>(null),progress=useRef(0);
 const enabled=usePageMotion();
 const {scrollYProgress}=useScroll({target:section,offset:["start start","end end"]});
 useMotionValueEvent(scrollYProgress,"change",v=>{progress.current=v;});
 useEffect(()=>{
  const element=host.current;if(!element||!enabled)return;let cancelled=false;let clean=()=>{};
  import("three").then(T=>{
   if(cancelled)return;let renderer:InstanceType<typeof T.WebGLRenderer>;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}catch{return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));element.appendChild(renderer.domElement);element.dataset.ready="true";
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,40);camera.position.set(0,.2,9);
   scene.add(new T.HemisphereLight(0xffffff,0x7c91ad,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,4,6);scene.add(light);
   const textures:InstanceType<typeof T.Texture>[]=[];
   const cards=destinations.map((d,i)=>{
    const group=new T.Group();scene.add(group);
    const frame=new T.Mesh(new T.BoxGeometry(2.38,3.18,.1),new T.MeshStandardMaterial({color:0xffffff,roughness:.7}));group.add(frame);
    const texture=new T.TextureLoader().load(d.image,loaded=>{
      if(cancelled){loaded.dispose();return;}
      const aspect=loaded.image.width/loaded.image.height,target=2.18/2.58;
      loaded.repeat.set(Math.min(1,target/aspect),Math.min(1,aspect/target));
      loaded.offset.set((1-loaded.repeat.x)/2,(1-loaded.repeat.y)/2);
    });texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    const photo=new T.Mesh(new T.PlaneGeometry(2.18,2.58),new T.MeshBasicMaterial({map:texture}));photo.position.set(0,.18,.061);group.add(photo);
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;const ctx=canvas.getContext("2d");if(ctx){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,512,96);ctx.fillStyle="#10213e";ctx.font="32px Georgia";ctx.fillText(d.name,24,58);}
    const label=new T.CanvasTexture(canvas);label.colorSpace=T.SRGBColorSpace;textures.push(label);
    const caption=new T.Mesh(new T.PlaneGeometry(2.18,.4),new T.MeshBasicMaterial({map:label}));caption.position.set(0,-1.25,.063);group.add(caption);
    group.userData.index=i;return group;
   });
   const resize=new ResizeObserver(()=>{const r=element.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(r.height,1);camera.position.z=r.width<768?12:9;camera.updateProjectionMatrix();});resize.observe(element);
   let visible=false;const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});observer.observe(element);let smooth=progress.current;
   renderer.setAnimationLoop(()=>{if(!visible||document.hidden)return;smooth+=(progress.current-smooth)*.075;cards.forEach((card,i)=>{const offset=i-smooth*4;card.position.set(offset*2.7,-Math.abs(offset)*.12,-Math.abs(offset)*.65);card.rotation.set(-.08,offset*-.17,offset*-.055);});renderer.render(scene,camera);});
   clean=()=>{resize.disconnect();observer.disconnect();renderer.setAnimationLoop(null);scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();delete element.dataset.ready;};
  }).catch(()=>{});
  return()=>{cancelled=true;clean();};
 },[enabled]);
 return <section ref={section} className={styles.deck} data-enabled={enabled} aria-label="Destination inspiration"><div className={styles.stage}><header><p>Places worth getting lost in</p><h2>Collect moments.<br/><em>Not just miles.</em></h2></header><div ref={host} className={styles.canvas} aria-hidden="true"><div className={styles.fallback}>{destinations.slice(0,3).map(d=><div key={d.name} style={{backgroundImage:`url('${d.image}')`}} />)}</div></div><div className={styles.footer}><p>From Goa and Kerala to Paris and Italy.<br/>A few ideas for your next chapter.</p><Link href="/destination_all">Explore destinations <ArrowUpRight size={18}/></Link></div></div></section>;
}
