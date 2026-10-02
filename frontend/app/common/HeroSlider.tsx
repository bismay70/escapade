"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"
import { Button } from "@/components/ui/button"

type SlideItem = {
    title: string
    offer: string
    cta: string
    image: string
}

type HeroSliderProps = {
    heading: string
    subheading?: string
    slides: SlideItem[]
    autoplayDelay?: number
}

export default function HeroSlider({
    heading,
    subheading,
    slides,
    autoplayDelay = 3500,
}: HeroSliderProps) {
    return (
        <section className="w-full py-16 px-8">
            <div className="max-w-7xl mx-auto">
                {/* Heading */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-gilroy-semibold mb-3">
                        {heading}
                    </h2>
                    {subheading && (
                        <p className="text-base text-gray-500 font-gilroy-medium">
                            {subheading}
                        </p>
                    )}
                </div>

                {/* Slider */}
                <Swiper
                    modules={[Autoplay, Pagination]}
                    autoplay={{
                        delay: autoplayDelay,
                        disableOnInteraction: false,
                    }}
                    pagination={{ clickable: true }}
                    loop
                    className="rounded-3xl overflow-hidden max-w-6xl"
                >
                    {slides.map((slide, idx) => (
                        <SwiperSlide key={idx}>
                            <div className="relative h-[360px]">
                                {/* Background */}
                                <img
                                    src={slide.image}
                                    alt={slide.offer}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

                                {/* Content */}
                                <div className="relative z-10 h-full flex items-end">
                                    <div className="p-10 text-white">
                                        <h2 className="text-3xl md:text-4xl font-gilroy-semibold">
                                            {slide.title}
                                        </h2>
                                        <p className="tracking-widest text-base font-gilroy-medium mb-4">
                                            {slide.offer}
                                        </p>
                                        <Button className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-6 py-3 rounded-lg text-sm font-gilroy-medium">
                                            {slide.cta}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    )
}
