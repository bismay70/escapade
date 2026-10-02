
const HowItWorks = () => {
    return (
        <section className="w-full py-16 px-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-gilroy-semibold mb-3">
                        How It Works
                    </h2>
                    <p className="text-base text-gray-500 font-gilroy-medium">
                        Customize and book your travel in 3 simple steps
                    </p>
                </div>
                <img
                    src={"/home/works.png"}
                    alt="How It Works"
                    className="w-full object-cover"
                />
            </div>
        </section>
    )
}

export default HowItWorks