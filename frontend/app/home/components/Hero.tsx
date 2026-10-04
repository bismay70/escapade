"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import gsap from "gsap";
import SearchBar from "./SearchBar";
import { usePageMotion } from "../../common/HomeMotion";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const enabled = usePageMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.14]);
  const titleY = useTransform(scrollYProgress, [0, .8], [0, -65]);
  const titleOpacity = useTransform(scrollYProgress, [0, .65], [1, .15]);

  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline.fromTo("[data-hero-eyebrow]", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .75 }, .1)
        .fromTo("[data-hero-letter]", { yPercent: 110, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.05, stagger: .045 }, .2)
        .fromTo("[data-hero-copy]", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .85 }, .6)
        .fromTo("[data-hero-search]", { y: 45, opacity: 0, scale: .97 }, { y: 0, opacity: 1, scale: 1, duration: 1, clearProps: "transform,opacity" }, .8);
    }, ref);
    return () => context.revert();
  }, [enabled]);

  return <section ref={ref} className="home-hero relative flex min-h-[100dvh] items-center overflow-clip px-4 sm:px-8 py-20">
    <motion.div aria-hidden="true" className="home-hero-background pointer-events-none absolute -inset-y-16 inset-x-0" style={{ backgroundImage: "url('/home/hero-bg.png')", backgroundSize: "cover", backgroundPosition: "center", y: enabled ? backgroundY : 0, scale: enabled ? backgroundScale : 1 }} />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent" />
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[35vh] bg-gradient-to-t from-[#F2F4F6] via-[#F2F4F6]/80 to-transparent" />
    <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center">
      <motion.div className="text-center" style={{ y: enabled ? titleY : 0, opacity: enabled ? titleOpacity : 1 }}>
        <p data-hero-eyebrow className="mb-4 text-lg sm:text-xl font-gilroy-semibold text-white">One Adventure At A Time</p>
        <h1 aria-label="Discover" className="home-hero-title text-[clamp(3.5rem,11vw,9rem)] font-gilroy-bold uppercase text-white lg:tracking-[-6px] leading-[1.1]">
          {"Discover".split("").map((letter, index) => <span key={index} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-2"><span data-hero-letter className="inline-block origin-bottom-left">{letter}</span></span>)}
        </h1>
        <p data-hero-copy className="mt-2 text-lg sm:text-2xl font-gilroy-medium text-white text-center">Let us be your getaway to luxury living</p>
      </motion.div>
      <div data-hero-search className="mt-10 w-full"><SearchBar /></div>
    </div>
  </section>;
}
