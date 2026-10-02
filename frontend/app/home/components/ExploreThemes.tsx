"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"
import { ArrowRight } from "lucide-react"

const themes = [
    {
        title: "Solo Travel",
        desc: "Travel solo and enjoy your peaceful journey",
        image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=600&fit=crop",
    },
    {
        title: "Romantic Travel",
        desc: "Travel with your partner to the most beautiful places",
        image: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=500&h=600&fit=crop",
    },
    {
        title: "Family Travel",
        desc: "Travel with your loved ones & enjoy your journey",
        image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=500&h=600&fit=crop",
    },
    {
        title: "Destination Wedding",
        desc: "Travel with your loved ones & celebrate your wedding",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=600&fit=crop",
    },
    {
        title: "Adventure Travel",
        desc: "Go through many wonderful places across India",
        image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=500&h=600&fit=crop",
    },
    {
        title: "Adventure Travel",
        desc: "Go through many wonderful places across India",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=600&fit=crop",
    },
]

export default function ExploreThemes() {
    return (
        <section className="w-full py-16 px-8">
            <div className="max-w-7xl mx-auto ">
                {/* Heading */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-gilroy-semibold mb-3">
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
                                    <div className="flex flex-col">
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
                        <button className="themes-next absolute right-[-20px] top-[140px] w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-10">
                            <ArrowRight className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
