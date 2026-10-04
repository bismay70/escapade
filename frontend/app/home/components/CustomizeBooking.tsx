"use client"

import { ArrowRight, MapPin, IndianRupee, Layers, Route } from "lucide-react"
import Link from "next/link"

export default function CustomizeBooking() {
    return (
        <section className="w-full px-8 py-0 pb-16">
            <div className="max-w-6xl mx-auto space-y-5">

                {/* ── Dark Maroon Banner ── */}
                <div data-motion="card" className="relative rounded-3xl overflow-hidden bg-[#5c1a2e] flex flex-col md:flex-row items-center min-h-[220px]">
                    {/* Decorative scattered elements */}
                    <span className="absolute top-6 left-40 w-4 h-4 rounded-full border border-white/20" />
                    <span className="absolute top-12 left-52 w-2 h-2 rounded-full bg-white/20" />
                    <span className="absolute bottom-10 left-56 w-3 h-3 rounded-full border border-white/20" />
                    <span className="absolute top-4 right-64 w-2 h-2 rounded-full bg-pink-300/30" />
                    <span className="absolute bottom-4 right-80 w-5 h-5 rounded-full border border-white/10" />

                    {/* Illustrated character */}
                    <div className="relative w-56 shrink-0 flex items-end justify-center h-full pt-6 pl-6 select-none">
                        <div className="absolute top-8 left-8 w-12 h-12 rounded-full bg-yellow-300/90 flex items-center justify-center shadow-lg z-10">
                            <IndianRupee className="w-6 h-6 text-yellow-800" strokeWidth={2.5} />
                        </div>
                        <div className="absolute bottom-14 left-6 w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center shadow-lg z-10">
                            <span className="text-2xl">🎁</span>
                        </div>
                        <span className="absolute top-6 right-4 text-yellow-200 text-xl">✦</span>
                        <span className="absolute bottom-20 right-2 text-pink-200 text-sm">✦</span>
                        <svg viewBox="0 0 120 220" className="h-52 w-auto z-20 relative" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="60" cy="30" r="22" fill="#f4c5a0" stroke="#5c1a2e" strokeWidth="1.5" />
                            <ellipse cx="60" cy="12" rx="22" ry="10" fill="#2d1a0e" />
                            <rect x="38" y="50" width="44" height="70" rx="16" fill="#fff" stroke="#ccc" strokeWidth="1.5" />
                            <path d="M82 60 Q110 30 100 10" stroke="#f4c5a0" strokeWidth="10" strokeLinecap="round" fill="none" />
                            <path d="M38 70 Q15 90 20 110" stroke="#f4c5a0" strokeWidth="10" strokeLinecap="round" fill="none" />
                            <rect x="42" y="118" width="14" height="60" rx="7" fill="#2d1a0e" />
                            <rect x="64" y="118" width="14" height="60" rx="7" fill="#2d1a0e" />
                            <ellipse cx="49" cy="178" rx="12" ry="7" fill="#111" />
                            <ellipse cx="71" cy="178" rx="12" ry="7" fill="#111" />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-8 py-10 md:py-12 text-white">
                        <h2 className="text-3xl md:text-4xl font-semibold leading-snug mb-4" style={{ fontFamily: "var(--font-editorial-new)" }}>
                            Customize every aspect of your<br className="hidden md:block" />
                            journey to fit your <span className="italic">budget &amp; schedule.</span>
                        </h2>
                        <p className="text-white/70 text-sm mb-6 max-w-md">
                            Travelers have saved over <span className="underline font-semibold text-white">₹5 crore</span> booking customized trips with Vacanes' AI planner.
                        </p>
                        <Link href="/planner" className="border border-white/60 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white hover:text-[#5c1a2e] transition-all flex items-center gap-2 w-fit">
                            Customize Your Booking
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* ── Bento Image Grid ── */}
                <div className="grid grid-cols-12 grid-rows-2 gap-5 h-[680px]">

                    {/* Card 1 — Dining (large, left) */}
                    <div data-motion="card" className="col-span-12 md:col-span-5 row-span-1 relative rounded-2xl overflow-hidden group bg-[#f5ece4]">
                        <div className="absolute inset-0 flex flex-col justify-between p-8 z-10">
                            <h3 className="text-3xl font-semibold text-[#5c1a2e] leading-tight max-w-[160px]"
                                style={{ fontFamily: "var(--font-editorial-new)" }}>
                                Elegance at the Heart of Dining
                            </h3>
                            <div>
                                <p className="text-xs text-gray-500 mb-4">Experience world traditions, sharing joy with family and friends.</p>
                                <button className="flex items-center gap-2 text-xs font-semibold text-[#5c1a2e] border border-[#5c1a2e] px-4 py-2 rounded-full hover:bg-[#5c1a2e] hover:text-white transition-all w-fit">
                                    DISCOVER MORE <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        {/* Dining image offset right */}
                        <div className="absolute right-0 top-0 bottom-0 w-[60%] overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
                                alt="Fine Dining"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Card 2 — Palace Wedding (right top) */}
                    <div data-motion="card" className="col-span-12 md:col-span-7 row-span-1 relative rounded-2xl overflow-hidden group bg-[#1a3a2a]">
                        <img
                            src="https://images.unsplash.com/photo-1519741347686-c1e331fcb4d0?q=80&w=2070&auto=format&fit=crop"
                            alt="Palace Wedding"
                            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                        />
                        {/* Small inset image */}
                        <div className="absolute bottom-8 right-8 w-28 h-36 rounded-xl overflow-hidden shadow-xl border-2 border-white/20">
                            <img
                                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop"
                                alt="Wedding couple"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 p-10 flex flex-col justify-center z-10">
                            <h3 className="text-4xl font-semibold text-white leading-tight mb-3 max-w-[280px]"
                                style={{ fontFamily: "var(--font-editorial-new)" }}>
                                Palace Wedding in Luxury
                            </h3>
                            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-5 max-w-[220px]">A wedding is a monumental event, deserving of a truly magnificent setting.</p>
                            <button className="flex items-center gap-2 text-xs font-semibold text-[#1a3a2a] bg-[#c9a96e] px-5 py-2.5 rounded-full hover:bg-[#b8945a] transition-all w-fit">
                                DISCOVER MORE <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Card 3 — Suites & Rooms (wide bottom left) */}
                    <div data-motion="card" className="col-span-12 md:col-span-7 row-span-1 relative rounded-2xl overflow-hidden group bg-[#1a3a2a] flex flex-col p-8 justify-between">
                        <img
                            src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop"
                            alt="Suite"
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                        <div className="relative z-10">
                            <h3 className="text-4xl font-semibold text-[#c9a96e] mb-2 text-center"
                                style={{ fontFamily: "var(--font-editorial-new)" }}>
                                Suites and Rooms
                            </h3>
                            <p className="text-white/50 text-xs text-center max-w-xs mx-auto">
                                Vacanes spans acres of lush destinations with luxurious accommodations, fine dining, and unmatched amenities.
                            </p>
                        </div>
                        {/* Strip of 4 room images */}
                        <div className="relative z-10 flex gap-3 mt-4">
                            {[
                                "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=800&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop",
                            ].map((src, i) => (
                                <div key={i} className="flex-1 h-28 rounded-xl overflow-hidden">
                                    <img src={src} alt={`Room ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 4 — Packages & Offers (bottom right) */}
                    <div data-motion="card" className="col-span-12 md:col-span-5 row-span-1 relative rounded-2xl overflow-hidden group bg-white flex flex-col p-8 justify-between border border-gray-100 shadow-sm">
                        <div>
                            <h3 className="text-4xl font-semibold text-[#16242A] leading-tight mb-3"
                                style={{ fontFamily: "var(--font-editorial-new)" }}>
                                Packages and Offers
                            </h3>
                        </div>
                        {/* Two images side by side */}
                        <div className="flex gap-3 h-36">
                            <div className="flex-1 rounded-xl overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1602002418082-a4443e081dd1?q=80&w=800&auto=format&fit=crop"
                                    alt="Couple"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <div className="flex-1 rounded-xl overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=800&auto=format&fit=crop"
                                    alt="Spa"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-semibold text-[#5c1a2e] border border-[#5c1a2e] px-5 py-2.5 rounded-full hover:bg-[#5c1a2e] hover:text-white transition-all w-fit mt-2">
                            View All Offers <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                </div>

                {/* ── Feature Pills ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <Layers className="w-5 h-5" />, label: "100% Customized Trips" },
                        { icon: <Route className="w-5 h-5" />, label: "Multi-City Adventures" },
                        { icon: <MapPin className="w-5 h-5" />, label: "Flexible Planning" },
                        { icon: <IndianRupee className="w-5 h-5" />, label: "Budget-Friendly" },
                    ].map((f) => (
                        <div key={f.label} data-motion="card" className="flex items-center gap-3 bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <span className="text-[#FF6A00]">{f.icon}</span>
                            <span className="text-sm font-semibold text-[#16242A]">{f.label}</span>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    )
}
