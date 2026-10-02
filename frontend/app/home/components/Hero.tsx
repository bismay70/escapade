import React from "react"
import SearchBar from "./SearchBar"

const Hero = () => {
    return (
        <section
            className="relative flex min-h-screen items-center px-8 py-16"
            style={{
                backgroundImage: "url('/home/hero-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Bottom white gradient */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[35vh] bg-gradient-to-t from-[#F2F4F6] via-[#F2F4F6]/80 to-transparent" />

            {/* Content */}
            <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center">
                <h3 className="text-xl font-gilroy-semibold text-white mb-4">
                    One Adventure At A Time
                </h3>
                <h1 className="text-9xl font-gilroy-bold uppercase text-white lg:tracking-[-8px]">
                    Discover
                </h1>
                <p className="mt-2 text-2xl font-gilroy-medium text-white text-center shadow-sm">
                    Let us be your getaway to luxury living
                </p>

                {/* Search Bar */}
                <div className="mt-10 w-full">
                    <SearchBar />
                </div>
            </div>
        </section>
    )
}

export default Hero
