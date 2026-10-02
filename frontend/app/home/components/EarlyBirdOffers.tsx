"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"
import { ArrowRight, Timer } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const tabs = [
    "Deals",
    "Hotels",
    "Packages",
    "Cruise",
    "Cabs",
    "Activities",
    "Community Trips",
    "Trekking",
]

const cards = [
    {
        type: "Hotel",
        title: "Lemon Tree Hotel",
        location: "New Delhi",
        price: "5,999",
        oldPrice: "12,999",
        image: "/home/card1.png",
        timer: "Ends in 11h : 32m : 45s",
    },
    {
        type: "Package",
        title: "Shimla, Kullu & Manali",
        location: "Manali",
        price: "10,999",
        oldPrice: "12,999",
        image: "/home/card2.png",
        timer: "Ends in 11h : 32m : 45s",
        meta: "6N/7D",
    },
    {
        type: "Cruise",
        title: "Cordelia Cruise",
        location: "Chennai – Chennai",
        price: "10,999",
        oldPrice: "12,999",
        image: "/home/card3.png",
        timer: "Ends in 11h : 32m",
        meta: "6N/7D",
    },
    {
        type: "Cruise",
        title: "Cordelia Cruise",
        location: "Chennai – Chennai",
        price: "10,999",
        oldPrice: "12,999",
        image: "/home/card1.png",
        timer: "Ends in 11h : 32m",
        meta: "6N/7D",
    },
]

export default function EarlyBirdOffers() {
    return (
        <section className="w-full py-16">
            <div className="max-w-7xl mx-auto px-8">
                <h2 className="text-4xl font-gilroy-semibold text-center mb-3">
                    Explore Our Early Bird Offers
                </h2>
                <p className="text-base text-gray-500 font-gilroy-medium text-center mb-8">
                    Grab our early bird offer deals and enjoy your vacation with multiple benefits
                </p>

                {/* Tabs */}
                <div className="bg-none p-4 shadow-none border-none max-w-6xl w-full mx-auto">

                    {/* Carousel */}
                    <div className="relative">
                        <Swiper
                            modules={[Navigation]}
                            spaceBetween={16}
                            slidesPerView={3}
                            navigation={{
                                nextEl: ".deals-next",
                            }}
                            breakpoints={{
                                0: { slidesPerView: 1.1 },
                                768: { slidesPerView: 2 },
                                1024: { slidesPerView: 3 },
                            }}
                        >
                            {cards.map((card, idx) => (
                                <SwiperSlide key={idx}>
                                    <div className="relative h-[420px] rounded-2xl overflow-hidden">
                                        <img
                                            src={card.image}
                                            alt={card.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                                        {/* Timer */}
                                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-500 text-white text-xs px-4 py-2 rounded-lg">
                                            <span><Timer className="h-[1em] w-[1em]" /></span>{card.timer}
                                        </div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 p-5 text-white w-full font-gilroy-medium">
                                            <span className="text-xs bg-black/50 px-3 py-1 rounded-full inline-block mb-2">
                                                {card.type}
                                                {card.meta && <span className="ml-2">{card.meta}</span>}
                                            </span>
                                            <h3 className="text-xl font-semibold">{card.title}</h3>
                                            <p className="text-sm opacity-80 mb-3">
                                                {card.location}
                                            </p>

                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-semibold text-white font-gilroy-semibold">
                                                    <span className="text-orange-400">₹</span> {card.price}
                                                </span>
                                                <span className="text-sm line-through opacity-60">
                                                    {card.oldPrice}
                                                </span>
                                                <span className="text-sm">Per Person</span>
                                            </div>
                                            <p className="text-xs opacity-70 mt-1">Includes taxes</p>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>

                        {/* Arrow */}
                        <button className="deals-next absolute right-[-20px] top-1/2 -translate-y-1/2 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-10">
                            <ArrowRight className="text-white" />
                        </button>
                    </div>
                    <div className="flex justify-center mt-8">
                        <Button className="bg-primary-orange text-sm">Explore More</Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
