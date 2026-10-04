'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePageMotion } from '../../common/HomeMotion';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const ROW_1 = [
    { name: 'HelloSign', color: '#60A5FA', text: '#DBEAFE' },
    { name: 'DoorDash', color: '#93C5FD', text: '#DBEAFE' },
    { name: 'Coinbase', color: '#BFDBFE', text: '#DBEAFE' },
];

const ROW_2 = [
    { name: 'Airtable', color: '#60A5FA', text: '#DBEAFE' },
    { name: 'Pendo', color: '#93C5FD', text: '#DBEAFE' },
    { name: 'Treehouse', color: '#BFDBFE', text: '#DBEAFE' },
];

function TapeRow({ items }: { items: typeof ROW_1 }) {
    return (
        <div className="flex gap-0">
            {[...items, ...items].map((p, i) => (
                <span
                    key={`${p.name}-${i}`}
                    className="flex items-center shrink-0 px-8 py-0 gap-4 font-semibold text-sm uppercase tracking-widest whitespace-nowrap"
                    style={{ color: p.text }}
                >
                    {/* Colored dot bullet */}
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
                    />
                    {p.name}
                </span>
            ))}
        </div>
    );
}

export default function Partners() {
    const motionEnabled = usePageMotion();
    const tape1Ref = useRef<HTMLDivElement>(null);
    const tape2Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!motionEnabled) return;
        const ctx = gsap.context(() => {
            const anim1 = gsap.fromTo(
                tape1Ref.current,
                { xPercent: -50 },
                { xPercent: 0, duration: 18, ease: 'none', repeat: -1 }
            );

            const anim2 = gsap.fromTo(
                tape2Ref.current,
                { xPercent: 0 },
                { xPercent: -50, duration: 22, ease: 'none', repeat: -1 }
            );

            ScrollTrigger.create({
                trigger: document.documentElement,
                start: 'top top',
                end: 'bottom bottom',
                onUpdate: (self) => {
                    const velocity = self.getVelocity();
                    let timeScale = 1 + Math.abs(velocity / 300);
                    timeScale = Math.min(timeScale, 5);

                    gsap.to([anim1, anim2], { timeScale, duration: 0.2, overwrite: true });
                    gsap.to([anim1, anim2], { timeScale: 1, duration: 0.8, delay: 0.1, overwrite: 'auto' });
                },
            });
        });

        return () => ctx.revert();
    }, [motionEnabled]);

    return (
        <section className="w-full bg-[#F2F4F6] py-16 overflow-hidden">
            {/* Heading */}
            <div className="text-center mb-12 px-8">
                <p className="text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold mb-3">Trusted Network</p>
                <h2 className="text-4xl font-semibold text-[#16242A] mb-3"
                    style={{ fontFamily: 'var(--font-editorial-new)' }}>
                    Our Partners
                </h2>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                    Connecting and growing with our trusted network of global travel partners.
                </p>
            </div>

            {/* Tape Row 1 — Left to Right — dark bg */}
            <div className="relative w-full -rotate-[2deg] mb-3">
                <div className="bg-[#16242A] py-4 w-full overflow-hidden">
                    <div ref={tape1Ref} className="flex w-[200%]">
                        <TapeRow items={ROW_1} />
                        <TapeRow items={ROW_1} />
                    </div>
                </div>
            </div>

            {/* Tape Row 2 — Right to Left — orange/brand bg */}
            <div className="relative w-full rotate-[2deg] mt-3">
                <div className="bg-[#12345A] py-4 w-full overflow-hidden">
                    <div ref={tape2Ref} className="flex w-[200%]">
                        <TapeRow items={ROW_2} />
                        <TapeRow items={ROW_2} />
                    </div>
                </div>
            </div>
        </section>
    );
}
