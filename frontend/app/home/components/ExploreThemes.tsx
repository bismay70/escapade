"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"
import { ArrowRight } from "lucide-react"

const themes = [
    {
        title: "Solo Travel",
        desc: "Set your own pace and explore the world on your terms",
        image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=500&h=600&fit=crop",
    },
    {
        title: "Romantic Getaway",
        desc: "Escape together to breathtaking destinations made for two",
        image: "/about/img/italy.jpg",
    },
    {
        title: "Family Adventure",
        desc: "Create lasting memories with the ones who matter most",
        image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=600&fit=crop",
    },
    {
        title: "Destination Wedding",
        desc: "Say your vows against the most stunning backdrops on earth",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=600&fit=crop",
    },
    {
        title: "Adventure & Trekking",
        desc: "Push your limits across mountains, forests and wild trails",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&h=600&fit=crop",
    },
    {
        title: "Beach & Coastal",
        desc: "Sun, sand and sea — the perfect formula for pure relaxation",
        image: "/destination_india/goa.png",
    },
    {
        title: "Cultural Immersion",
        desc: "Dive deep into local traditions, art and heritage",
        image: "/about/img/india.jpg",
    },
    {
        title: "Wellness Retreat",
        desc: "Recharge your mind and body in serene, restorative settings",
        image: "/destination_india/kerala.png",
    },
]

export default function ExploreThemes() {
    return (
        <section className="w-full py-16 px-8">
            <div className="max-w-7xl mx-auto ">
                {/* Heading */}
                <div className="text-center mb-10">
                    <h2 data-motion="heading" className="text-4xl font-gilroy-semibold mb-3">
                        Explore Our Themes
                    </h2>
                    <p className="text-base text-gray-500 font-gilroy-medium">
                        Choose from various themes that are hand curated
                    </p>
                </div>

                <div className="shadow-none border-none max-w-6xl mx-auto">
                    <div className="relative">
                        <Swiper
                            modules={[Navigation]}
                            spaceBetween={20}
                            // slidesPerView={5}
                            navigation={{ nextEl: ".themes-next" }}
                            breakpoints={{
                                0: { slidesPerView: 1.2 },
                                640: { slidesPerView: 2.2 },
                                1024: { slidesPerView: 4.2 },
                                1280: { slidesPerView: 4.2 },
                            }}
                        >
                            {themes.map((theme, idx) => (
                                <SwiperSlide key={idx}>
                                    <div data-motion="card" className="flex flex-col">
                                        <div className="relative h-[300px] rounded-2xl overflow-hidden">
                                            <img
                                                src={theme.image}
                                                alt={theme.title}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="pt-4">
                                            <h3 className="text-lg font-gilroy-semibold mb-1">
                                                {theme.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 font-gilroy-medium leading-relaxed">
                                                {theme.desc}
                                            </p>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>

                        {/* Arrow */}
                        <button className="themes-next absolute right-[-20px] top-[140px] w-12 h-12 bg-[#695B33] rounded-full flex items-center justify-center shadow-lg z-10">
                            <ArrowRight className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
