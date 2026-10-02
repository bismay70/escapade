"use client";
import { useState } from "react";

const testimonials = [
    {
        quote: "A truly luxurious experience.",
        body: "Vacanes exceeded all my expectations. From the moment I walked in, the service was impeccable, and the ambiance was pure elegance. The room was spacious, with breathtaking views, and every detail screamed luxury, from the fine linens to the state-of-the-art amenities. The staff went above and beyond to ensure I felt pampered throughout my stay. It's hands down the best hotel experience I've ever had, and I look forward to returning.",
        author: "James Whitfield",
        role: "Verified Guest",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop",
        rating: 5,
    },
    {
        quote: "An oasis of tranquility and elegance.",
        body: "Vacanes provided the perfect escape with its impeccable service, luxurious amenities, and serene atmosphere. Every corner of the resort breathed calm and sophistication. Truly a place I will cherish and revisit.",
        author: "Sophia Andersson",
        role: "Verified Guest",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
        image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop",
        rating: 5,
    },
];

export default function Testimonials() {
    const [active, setActive] = useState(0);
    const current = testimonials[active];

    return (
        <section className="py-24 px-8 bg-[#F2F4F6]">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-widest text-[#FF6A00] font-semibold mb-3">
                            What Our Guests Say
                        </p>
                        <h2
                            className="text-4xl md:text-5xl font-semibold text-[#16242A] leading-tight"
                            style={{ fontFamily: "var(--font-editorial-new)" }}
                        >
                            Stories of Unforgettable <br className="hidden md:block" />
                            <span className="italic">Stays</span>
                        </h2>
                    </div>
                    {/* Dot navigation */}
                    <div className="flex gap-3">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                    active === i
                                        ? "w-8 bg-[#FF6A00]"
                                        : "w-2.5 bg-gray-300 hover:bg-gray-400"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Card */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 rounded-3xl overflow-hidden shadow-xl">
                    {/* Image Panel */}
                    <div className="lg:col-span-2 relative h-64 lg:h-auto">
                        <img
                            src={current.image}
                            alt="Resort"
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </div>

                    {/* Quote Panel */}
                    <div className="lg:col-span-3 bg-white flex flex-col justify-between p-10 md:p-14">
                        {/* Stars */}
                        <div className="flex gap-1 mb-6">
                            {Array.from({ length: current.rating }).map((_, i) => (
                                <svg
                                    key={i}
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="#FF6A00"
                                    className="shrink-0"
                                >
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            ))}
                        </div>

                        {/* Quote mark */}
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 48 48"
                            fill="none"
                            className="text-[#FF6A00] opacity-20 mb-4"
                        >
                            <text
                                x="0"
                                y="44"
                                fontSize="64"
                                fill="currentColor"
                                fontFamily="Georgia, serif"
                            >
                                "
                            </text>
                        </svg>

                        <h3
                            className="text-2xl md:text-3xl font-semibold text-[#16242A] mb-5 leading-snug"
                            style={{ fontFamily: "var(--font-editorial-new)" }}
                        >
                            {current.quote}
                        </h3>

                        <p className="text-gray-500 text-base leading-relaxed mb-10">
                            {current.body}
                        </p>

                        {/* Author */}
                        <div className="flex items-center gap-4 border-t border-gray-100 pt-8">
                            <img
                                src={current.avatar}
                                alt={current.author}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6A00]/30"
                            />
                            <div>
                                <p className="font-semibold text-[#16242A]">{current.author}</p>
                                <p className="text-sm text-gray-400">{current.role}</p>
                            </div>

                            {/* Arrow buttons */}
                            <div className="ml-auto flex gap-3">
                                <button
                                    onClick={() =>
                                        setActive((prev) =>
                                            prev === 0 ? testimonials.length - 1 : prev - 1
                                        )
                                    }
                                    className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#FF6A00] hover:border-[#FF6A00] hover:text-white transition-all text-gray-400"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                <button
                                    onClick={() =>
                                        setActive((prev) =>
                                            prev === testimonials.length - 1 ? 0 : prev + 1
                                        )
                                    }
                                    className="w-11 h-11 rounded-full bg-[#FF6A00] border border-[#FF6A00] flex items-center justify-center hover:bg-[#e85e00] transition-all text-white"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
