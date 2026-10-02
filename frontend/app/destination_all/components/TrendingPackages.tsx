"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const TrendingPackages = () => {
    const trips = Array.from({ length: 6 });

    return (
        <section className="bg-gray-50 py-20 px-8">
            <div className="max-w-7xl mx-auto">

                {/* Heading */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-gilroy-semibold text-gray-900 mb-3">
                        Explore All Travel Packages In One Place
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Discover all domestic and international trips tailored for every kind of traveler.
                    </p>
                </div>

                {/* Subheading + Nav */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-gilroy-semibold text-gray-900">
                        Trending Trips Everyone&apos;s Booking
                    </h3>

                    <div className="flex gap-3">
                        <div className="swiper-button-prev-custom w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer">
                            ‹
                        </div>
                        <div className="swiper-button-next-custom w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer text-orange-500">
                            ›
                        </div>
                    </div>
                </div>

                {/* Swiper */}
                <Swiper
                    modules={[Navigation]}
                    navigation={{
                        prevEl: ".swiper-button-prev-custom",
                        nextEl: ".swiper-button-next-custom",
                    }}
                    spaceBetween={24}
                    slidesPerView={1.1}
                    breakpoints={{
                        640: { slidesPerView: 2 },
                        1024: { slidesPerView: 3.2 },
                        // 1280: { slidesPerView: 4 },
                    }}
                >
                    {trips.map((_, i) => (
                        <SwiperSlide key={i}>
                            <div className="relative rounded-2xl overflow-hidden h-[420px] text-white">

                                {/* Image */}
                                <img
                                    src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=800"
                                    alt="trip"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />

                                {/* Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                {/* Discount */}
                                <span className="absolute top-4 right-4 bg-orange-500 text-xs px-3 py-1 rounded-full font-medium">
                                    25% OFF
                                </span>

                                {/* Duration */}
                                <span className="absolute top-4 left-4 bg-black/60 text-xs px-3 py-1 rounded-full">
                                    6N / 7D
                                </span>

                                {/* Content */}
                                <div className="absolute bottom-0 p-4 w-full">
                                    <h4 className="font-gilroy-semibold text-sm mb-1">
                                        Shimla, Kullu, Manali in Winters
                                    </h4>
                                    <p className="text-xs text-gray-200 mb-3">
                                        Himachal Pradesh
                                    </p>

                                    {/* Icons row */}
                                    <div className="flex justify-between text-[10px] text-gray-300 mb-3">
                                        <span>✈ 2 Flights</span>
                                        <span>🏨 1 Hotel</span>
                                        <span>🎯 5 Activities</span>
                                        <span>🚗 Transfers</span>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-gilroy-semibold text-orange-400">
                                            ₹ 5,999
                                        </span>
                                        <span className="text-xs line-through text-gray-400">
                                            ₹ 12,999
                                        </span>
                                        <span className="text-xs text-gray-300">
                                            Per Person
                                        </span>
                                    </div>

                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Includes taxes
                                    </p>
                                </div>

                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

            </div>
        </section>
    );
};

export default TrendingPackages;
