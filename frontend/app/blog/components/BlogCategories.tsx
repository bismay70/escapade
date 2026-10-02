const BlogCategories = () => {
    return (
        <section className="bg-gray-50 py-20 pt-32 px-8 font-gilroy-medium">
            <div className="max-w-7xl mx-auto">

                {/* Heading */}
                <div className="text-center mx-auto mb-16">
                    <h1 className="text-3xl md:text-4xl font-gilroy-semibold text-gray-900 mb-4">
                        Welcome To The Vacanes Blogs
                    </h1>
                    <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                        Uncover hidden gems, cultural secrets, and unforgettable experiences
                        with the TripJoy Blog. From personal travel tales to expert planning
                        guides, our stories are your passport to inspiring adventures and
                        smart travel. Whether you're chasing bucket-list dreams or weekend
                        escapes, there's something here for every explorer.
                    </p>
                </div>

                {/* Subheading */}
                <h2 className="text-2xl font-gilroy-semibold text-gray-900 mb-8">
                    Read By Category
                </h2>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Card 1 */}
                    <div>
                        <div className="rounded-2xl overflow-hidden mb-4">
                            <img
                                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800"
                                alt="Travel Tips"
                                className="w-full h-[260px] object-cover"
                            />
                        </div>
                        <h3 className="text-lg font-gilroy-semibold text-gray-900 mb-1">
                            Travel Tips & Advice
                        </h3>
                        <p className="text-sm text-gray-600">
                            Smart hacks and guides to make your trips smoother.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div>
                        <div className="rounded-2xl overflow-hidden mb-4">
                            <img
                                src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800"
                                alt="Destination Highlights"
                                className="w-full h-[260px] object-cover"
                            />
                        </div>
                        <h3 className="text-lg font-gilroy-semibold text-gray-900 mb-1">
                            Destination Highlights
                        </h3>
                        <p className="text-sm text-gray-600">
                            Top sights and hidden gems from around the world to explore.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div>
                        <div className="rounded-2xl overflow-hidden mb-4">
                            <img
                                src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800"
                                alt="Weekend Getaways"
                                className="w-full h-[260px] object-cover"
                            />
                        </div>
                        <h3 className="text-lg font-gilroy-semibold text-gray-900 mb-1">
                            Weekend Getaways
                        </h3>
                        <p className="text-sm text-gray-600">
                            Quick escapes and short-trip itineraries for busy travelers.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default BlogCategories;
