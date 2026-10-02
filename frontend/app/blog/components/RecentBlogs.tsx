import { Search } from "lucide-react";

const RecentBlogs = () => {
    const blogs = Array.from({ length: 9 });

    return (
        <section className="bg-gray-50 pb-20 px-8 font-gilroy-medium">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
                    <h2 className="text-2xl font-gilroy-semibold text-gray-900">
                        Recent Blogs
                    </h2>

                    {/* Search */}
                    <div className="relative w-full md:w-[360px]">
                        <input
                            type="text"
                            placeholder="Search by destinations, travel tips etc"
                            className="w-full rounded-full bg-white px-12 py-3 text-sm text-gray-700 placeholder:text-gray-400 shadow-none outline-none"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={16} />
                        </span>
                    </div>
                </div>

                {/* Blog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {blogs.map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-4 shadow-none hover:shadow-md transition"
                        >
                            {/* Image */}
                            <div className="rounded-xl overflow-hidden mb-4">
                                <img
                                    src={
                                        i % 3 === 0
                                            ? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=800"
                                            : i % 3 === 1
                                                ? "https://images.unsplash.com/photo-1500534314209-a26db0f5b2fa?auto=format&fit=crop&q=80&w=800"
                                                : "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800"
                                    }
                                    alt="blog"
                                    className="w-full h-[200px] object-cover"
                                />
                            </div>

                            {/* Meta */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>09 May 2025</span>
                                <div className="flex items-center gap-2">
                                    <img
                                        src="https://i.pravatar.cc/40"
                                        alt="author"
                                        className="w-6 h-6 rounded-full"
                                    />
                                    <span>Tarun Singh</span>
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="font-gilroy-semibold text-gray-900 mb-1">
                                Chasing Sunsets In Santorini
                            </h3>

                            {/* Description */}
                            <p className="text-xs text-gray-600 mb-3">
                                Soak in the charm of whitewashed streets & unforgettable views.
                            </p>

                            {/* CTA */}
                            <button className="text-sm text-orange-500 font-gilroy-semibold hover:underline">
                                Read More
                            </button>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-2 mt-12">
                    <button className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center">
                        ‹
                    </button>

                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                            key={n}
                            className={`w-9 h-9 rounded-lg text-sm ${n === 1
                                ? "bg-orange-500 text-white"
                                : "bg-gray-200 text-gray-700"
                                }`}
                        >
                            {n}
                        </button>
                    ))}

                    <button className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center">
                        ›
                    </button>
                </div>

            </div>
        </section>
    );
};

export default RecentBlogs;
