"use client"

import { Button } from "@/components/ui/button"

export default function NewsletterBanner() {
    return (
        <section className="w-full px-8 py-16">
            <div className="max-w-6xl mx-auto w-full">
                <div className="relative rounded-3xl overflow-hidden py-20 px-16">

                    {/* Background Image */}
                    <img
                        src="/home/offer-letter-bg.png"
                        alt="Newsletter background"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Left Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 h-full flex items-center">
                        <div className="max-w-xl text-white font-gilroy-medium">

                            <h2 className="text-4xl md:text-5xl font-gilroy-semibold leading-tight mb-4">
                                Stay In The Loop,
                                <br />
                                Travel Smarter
                            </h2>

                            <p className="text-base opacity-90 mb-6">
                                Subscribe To Our Newsletter
                            </p>

                            {/* Input + Button */}
                            <div className="flex items-center gap-4 mb-6">
                                <input
                                    type="email"
                                    placeholder="Enter Your Email"
                                    className="w-full bg-white text-gray-800 px-5 py-4 rounded-xl outline-none text-sm"
                                />
                                <Button className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-xl text-sm font-gilroy-semibold h-full">
                                    Subscribe
                                </Button>
                            </div>

                            <p className="text-sm opacity-80 leading-relaxed">
                                By subscribing, you’ll stay informed about our newest and most
                                exciting offers. Ensuring you never miss out on the freshest
                                and most advantageous opportunities.
                            </p>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
