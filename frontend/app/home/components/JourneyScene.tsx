// "use client";

// import { useEffect, useRef } from "react";
// import { useScroll, useMotionValueEvent } from "motion/react";
// import Link from "next/link";
// import { ArrowUpRight } from "lucide-react";
// import { usePageMotion } from "../../common/HomeMotion";

// import styles from "./journey.module.css";

// const stops = [
//   { name: "Find your horizon.", detail: "A quiet coast. A mountain morning. Somewhere that feels like you.", image: "/destination_india/goa.png", label: "Room to breathe" },
//   { name: "Take the scenic route.", detail: "Make space for the detours, the local stories, and the unexpected.", image: "/home/hero-bg.png", label: "A different perspective" },
//   { name: "Make it your journey.", detail: "Your pace, your preferences, your budget. Bring them together with your travel planner.", image: "/destination_india/kerala.png", label: "Travel on your terms" },
// ];

// export default function JourneyScene() {
//   const section = useRef<HTMLElement>(null);
//   const mount = useRef<HTMLDivElement>(null);
//   const progress = useRef(0);
//   const enabled = usePageMotion();
//   const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
//   useMotionValueEvent(scrollYProgress, "change", value => {
//     progress.current = value;
//     if (section.current) section.current.dataset.stop = String(Math.min(2, Math.floor(value * 3)));
//   });

//   useEffect(() => {
//     const host = mount.current;
//     if (!host || !enabled) return;
//     let cancelled = false;
//     let cleanup = () => {};
//     import("three").then(THREE => {
//       if (cancelled) return;
//       let renderer: InstanceType<typeof THREE.WebGLRenderer>;
//       try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
//       catch { return; }
//       renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
//       renderer.setClearColor(0x000000, 0);
//       host.appendChild(renderer.domElement);
//       host.dataset.ready = "true";
//       const scene = new THREE.Scene();
//       const camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
//       camera.position.set(0, 0, 4.4);
//       const globe = new THREE.Group();
//       scene.add(globe);
//       const texture = new THREE.TextureLoader().load("/home/earth/earth.jpg");
//       texture.colorSpace = THREE.SRGBColorSpace;
//       const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ map: texture, roughness: .85, metalness: .08 }));
//       globe.add(sphere);
//       scene.add(new THREE.AmbientLight(0xc5dcff, 1.7));
//       const sun = new THREE.DirectionalLight(0xffffff, 3);
//       sun.position.set(-3, 4, 5); scene.add(sun);
//       const point = (lat: number, lon: number, radius = 1.025) => {
//         const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
//         return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
//       };
//       const start = point(28.6, 77.2), end = point(48.85, 2.35);
//       const middle = start.clone().add(end).normalize().multiplyScalar(1.5);
//       const route = new THREE.QuadraticBezierCurve3(start, middle, end);
//       const line = new THREE.Mesh(new THREE.TubeGeometry(route, 80, .006, 6, false), new THREE.MeshBasicMaterial({ color: 0xffffff }));
//       globe.add(line);
//       const traveler = new THREE.Mesh(new THREE.SphereGeometry(.023, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffae62 }));
//       globe.add(traveler);
//       for (const p of [start, end]) {
//         const marker = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
//         marker.position.copy(p); globe.add(marker);
//       }
//       const resize = new ResizeObserver(() => {
//         const { width, height } = host.getBoundingClientRect();
//         renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
//       });
//       resize.observe(host);
//       let visible = false;
//       const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: "100px" });
//       observer.observe(host);
//       let smoothed = progress.current;
//       renderer.setAnimationLoop(() => {
//         if (!visible || document.hidden) return;
//         smoothed += (progress.current - smoothed) * .065;
//         globe.rotation.set(.12 + smoothed * .12, -1.4 + smoothed * 1.55, -.16);
//         traveler.position.copy(route.getPoint(Math.min(1, smoothed)));
//         renderer.render(scene, camera);
//       });
//       cleanup = () => {
//         resize.disconnect(); observer.disconnect(); renderer.setAnimationLoop(null);
//         scene.traverse(object => {
//           if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); }
//         });
//         texture.dispose(); renderer.dispose(); renderer.domElement.remove(); delete host.dataset.ready;
//       };
//     }).catch(() => { /* Static photography remains available without WebGL. */ });
//     return () => { cancelled = true; cleanup(); };
//   }, [enabled]);

//   return <section ref={section} className={styles.journey} data-stop="0" data-motion-enabled={enabled} aria-label="Explore your next journey">
//     <div className={styles.stage}>
//       <div className={styles.heading}><span className={styles.eyebrow}>The world, at your pace</span><h2>A little further.<br /><em>A little more you.</em></h2></div>
//       <div className={styles.globe} ref={mount} aria-hidden="true"><div className={styles.fallback} /></div>
//       <div className={styles.stories}>
//         {stops.map((stop, index) => <article key={stop.name} className={styles.story} data-journey-stop={index}>
//           {/* Existing local travel photography is retained as the non-WebGL fallback. */}
//           <div className={styles.photo} style={{ backgroundImage: `url('${stop.image}')` }} role="img" aria-label={stop.label} />
//           <div className={styles.copy}><span>{stop.label}</span><h3>{stop.name}</h3><p>{stop.detail}</p></div>
//         </article>)}
//       </div>
//       <Link href="/dashboard" className={styles.link}>Plan my journey <ArrowUpRight size={19} /></Link>
//     </div>
//   </section>;
// }





"use client";

import { useEffect, useRef } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePageMotion } from "../../common/HomeMotion";
import styles from "./journey.module.css";

const VIDEO_SRC = "/home/hro.mp4";
const VIDEO_DELAY_MS = 2000;

const stops = [
  { name: "Find your horizon.", detail: "A quiet coast. A mountain morning. Somewhere that feels like you.", image: "/destination_india/goa.png", label: "Room to breathe" },
  { name: "Take the scenic route.", detail: "Make space for the detours, the local stories, and the unexpected.", image: "/home/hero-bg.png", label: "A different perspective" },
  { name: "Make it your journey.", detail: "Your pace, your preferences, your budget. Bring them together with your travel planner.", image: "/destination_india/kerala.png", label: "Travel on your terms" },
];

export default function JourneyScene() {
  const section = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef(0);
  const enabled = usePageMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", value => {
    progress.current = value;
    if (section.current) section.current.dataset.stop = String(Math.min(2, Math.floor(value * 3)));
  });

  useEffect(() => {
    const v = video.current;
    const s = section.current;
    if (!v || !s || !enabled) return;
    let timer = 0;
    let started = false;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        timer = window.setTimeout(() => {
          v.dataset.playing = "true";
          v.play().catch(() => {});
        }, VIDEO_DELAY_MS);
      }
    });
    io.observe(s);
    return () => { clearTimeout(timer); io.disconnect(); v.pause(); delete v.dataset.playing; };
  }, [enabled]);

  useEffect(() => {
    const host = mount.current;
    if (!host || !enabled) return;
    let cancelled = false;
    let cleanup = () => {};
    import("three").then(THREE => {
      if (cancelled) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      host.dataset.ready = "true";
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
      camera.position.set(0, 0, 4.4);
      const globe = new THREE.Group();
      scene.add(globe);
      const texture = new THREE.TextureLoader().load("/home/earth/earth.jpg");
      texture.colorSpace = THREE.SRGBColorSpace;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ map: texture, roughness: .85, metalness: .08 }));
      globe.add(sphere);
      scene.add(new THREE.AmbientLight(0xc5dcff, 1.7));
      const sun = new THREE.DirectionalLight(0xffffff, 3);
      sun.position.set(-3, 4, 5); scene.add(sun);
      const point = (lat: number, lon: number, radius = 1.025) => {
        const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
      };
      const start = point(28.6, 77.2), end = point(48.85, 2.35);
      const middle = start.clone().add(end).normalize().multiplyScalar(1.5);
      const route = new THREE.QuadraticBezierCurve3(start, middle, end);
      const line = new THREE.Mesh(new THREE.TubeGeometry(route, 80, .006, 6, false), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      globe.add(line);
      const traveler = new THREE.Mesh(new THREE.SphereGeometry(.023, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffae62 }));
      globe.add(traveler);
      for (const p of [start, end]) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        marker.position.copy(p); globe.add(marker);
      }
      const resize = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
      });
      resize.observe(host);
      let visible = false;
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: "100px" });
      observer.observe(host);
      let smoothed = progress.current;
      renderer.setAnimationLoop(() => {
        if (!visible || document.hidden) return;
        smoothed += (progress.current - smoothed) * .065;
        globe.rotation.set(.12 + smoothed * .12, -1.4 + smoothed * 1.55, -.16);
        traveler.position.copy(route.getPoint(Math.min(1, smoothed)));
        renderer.render(scene, camera);
      });
      cleanup = () => {
        resize.disconnect(); observer.disconnect(); renderer.setAnimationLoop(null);
        scene.traverse(object => {
          if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); }
        });
        texture.dispose(); renderer.dispose(); renderer.domElement.remove(); delete host.dataset.ready;
      };
    }).catch(() => { /* Static photography remains available without WebGL. */ });
    return () => { cancelled = true; cleanup(); };
  }, [enabled]);

  return <section ref={section} className={styles.journey} data-stop="0" data-motion-enabled={enabled} aria-label="Explore your next journey">
    <div className={styles.stage}>
      {enabled && <video ref={video} className={styles.bgVideo} src={VIDEO_SRC} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />}
      <div className={styles.heading}><span className={styles.eyebrow}>The world, at your pace</span><h2>A little further.<br /><em>A little more you.</em></h2></div>
      <div className={styles.globe} ref={mount} aria-hidden="true"><div className={styles.fallback} /></div>
      <div className={styles.stories}>
        {stops.map((stop, index) => <article key={stop.name} className={styles.story} data-journey-stop={index}>
          {/* Existing local travel photography is retained as the non-WebGL fallback. */}
          <div className={styles.photo} style={{ backgroundImage: `url('${stop.image}')` }} role="img" aria-label={stop.label} />
          <div className={styles.copy}><span>{stop.label}</span><h3>{stop.name}</h3><p>{stop.detail}</p></div>
        </article>)}
      </div>
      <Link href="/dashboard" className={styles.link}>Plan my journey <ArrowUpRight size={19} /></Link>
    </div>
  </section>;
}