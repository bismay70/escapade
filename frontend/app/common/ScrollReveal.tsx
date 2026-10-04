"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePageMotion } from "./HomeMotion";

type RevealStyle = "rise" | "scale" | "slide";

export default function ScrollReveal({ children, delay = 0, variant = "rise" }: { children: ReactNode; delay?: number; variant?: RevealStyle }) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = usePageMotion();
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-motion]");
      const elements = targets.length ? targets : [root.firstElementChild as HTMLElement];
      elements.forEach((element, index) => {
        if (!element) return;
        const kind = element.dataset.motion;
        const media = kind === "image" || kind === "gallery-card";
        const heading = kind === "heading";
        const horizontal = variant === "slide" && kind === "card";
        const start = {
          opacity: 0,
          y: heading ? 38 : media ? 64 : 52,
          x: horizontal ? (index % 2 ? 36 : -36) : 0,
          scale: media ? 1.07 : variant === "scale" && kind === "card" ? .94 : 1,
          rotate: kind === "gallery-card" ? (index % 2 ? 5 : -5) : 0,
        };
        // Only hide content below the initial viewport, keeping server content and
        // already-visible elements stable on refresh and client navigation.
        const belowFold = element.getBoundingClientRect().top > window.innerHeight - 40;
        const scrollTrigger = { trigger: element, start: "top 94%", once: true, invalidateOnRefresh: true };
        if (belowFold) {
          gsap.fromTo(element, start, {
            opacity: 1, x: 0, y: 0, scale: 1, rotate: 0,
            duration: heading ? .85 : media ? 1.2 : 1,
            delay: delay + (heading ? 0 : Math.min(index % 5, 4) * .095),
            ease: "power3.out", scrollTrigger,
            clearProps: "transform,opacity",
          });
        } else {
          gsap.fromTo(element, { ...start, opacity: 1, y: 24 }, {
            opacity: 1, x: 0, y: 0, scale: 1, rotate: 0,
            duration: .85, delay: Math.min(index, 4) * .06,
            ease: "power3.out", clearProps: "transform,opacity",
          });
        }
      });
    }, root);
    // ScrollTrigger already refreshes on load/resize. Refreshing all triggers
    // from every section's ResizeObserver can create a layout feedback loop.
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(refresh); context.revert(); };
  }, [enabled, delay, variant]);
  return <div ref={ref} data-scroll-reveal data-reveal-style={variant}>{children}</div>;
}
