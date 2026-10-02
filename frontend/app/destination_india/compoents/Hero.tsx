import React from "react"

const Hero = () => {
    return (
        <section
            className="relative flex min-h-screen items-center px-8 py-16"
            style={{
                backgroundImage: "url('/destination_india/hero-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Bottom white gradient */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[20vh] bg-gradient-to-t from-[#F2F4F6] via-[#F2F4F6]/80 to-transparent" />

            {/* Content */}
            <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center">
                <h1 className="text-[60px] lg:text-[180px] font-gilroy-bold uppercase text-white">
                    india
                </h1>
            </div>
        </section>
    )
}

export default Hero
