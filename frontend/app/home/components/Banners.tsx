"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"
import { Button } from "@/components/ui/button"

const slides = [
    {
        title: "FLAT",
        offer: "30–50% OFF",
        cta: "Book Now",
        image: "/home/variant/variant1.png",
    },
    {
        title: "SUMMER",
        offer: "UP TO 40% OFF",
        cta: "Explore Now",
        image: "/home/variant/variant2.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant3.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant4.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant5.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant6.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant7.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant8.png",
    },
]

export default function HeroBanner() {
    return (
        <section className="w-full py-14 px-8">
            <div className="max-w-6xl mx-auto ">
                <Swiper
                    modules={[Autoplay, Pagination]}
                    autoplay={{
                        delay: 3500,
                        disableOnInteraction: false,
                    }}
                    pagination={{ clickable: true }}
                    loop
                    className="rounded-3xl overflow-hidden"
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

                                {/* Dark overlay */}
                                <div className="absolute bottom-0 w-full h-full bg-linear-to-t from-black to-black/0" />

                                {/* Content */}
                                <div className="relative z-10 h-full flex items-end">
                                    <div className="p-10 text-white max-w-md">
                                        <p className="tracking-widest text-base font-gilroy-semibold">
                                            {slide.title}
                                        </p>
                                        <h2 className="text-3xl md:text-4xl font-gilroy-semibold mb-4">
                                            {slide.offer}
                                        </h2>
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
