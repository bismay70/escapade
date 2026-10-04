"use client"

const blogs = {
    featured: {
        image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        title: "Top 10 Hidden Gems Around The World",
        desc: "Discover the world's best-kept secrets, from secluded beaches to off-the-beaten-path towns. These hidden gems are worth the journey.",
        date: "07 May 2025",
        author: "Tarun Singh",
        authorImage: "/avatars/tarun.png",
    },

    list: [
        {
            image:
                "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=800&q=80",
            title: "Chasing Sunsets In Santorini",
            excerpt:
                "Discover breathtaking destinations, unforgettable sunsets, and experiences that make every journey worth remembering.",
            date: "1 day ago",
            author: "Tarun Singh",
            authorImage: "/avatars/tarun.png",
        },
        {
            image:
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
            title: "Packing Like A Pro: Essentials Only",
            excerpt:
                "Master the art of smart packing with tips for stress-free travel and everything you actually need on your next adventure.",
            date: "07 May 2025",
            author: "Tarun Singh",
            authorImage: "/avatars/tarun.png",
        },
    ],
}

export default function VacanesBlogs() {
    return (
        <section className="py-20 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="text-center mb-14">
                    <h2 data-motion="heading" className="text-4xl font-gilroy-semibold text-gray-900">
                        Vacanes Blogs
                    </h2>

                    <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                        Get travel tips, destination guides, and real stories from
                        explorers around the globe
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Featured Blog */}
                    <div data-motion="card" className="relative rounded-3xl overflow-hidden md:row-span-1">
                        <img
                            src={blogs.featured.image}
                            alt={blogs.featured.title}
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        <div className="relative z-10 h-full flex flex-col justify-end p-8 text-white">
                            <h3 className="text-2xl font-gilroy-semibold mb-3">
                                {blogs.featured.title}
                            </h3>

                            <p className="text-sm opacity-90 max-w-xs mb-6 leading-relaxed">
                                {blogs.featured.desc}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-sm">
                                    <span>{blogs.featured.date}</span>

                                    <span className="w-1 h-1 bg-white/60 rounded-full" />

                                    <div className="flex items-center gap-2">
                                        <img
                                            src={blogs.featured.authorImage}
                                            className="w-6 h-6 rounded-full"
                                            alt={blogs.featured.author}
                                        />
                                        <span>{blogs.featured.author}</span>
                                    </div>
                                </div>

                                <button className="bg-orange-500 hover:bg-orange-600 transition text-white px-5 py-2 rounded-lg text-sm font-medium">
                                    Read More
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right List */}
                    <div className="flex flex-col gap-6">
                        {blogs.list.map((blog, idx) => (
                            <div
                                key={idx}
                                data-motion="card"
                                className="bg-white rounded-2xl p-4 flex gap-5 md:row-span-1"
                            >
                                <img
                                    src={blog.image}
                                    alt={blog.title}
                                    className="w-56 rounded-xl object-cover"
                                />

                                <div className="flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                            <span>{blog.date}</span>

                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={blog.authorImage}
                                                    className="w-5 h-5 rounded-full"
                                                    alt={blog.author}
                                                />
                                                <span>{blog.author}</span>
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-gilroy-semibold text-gray-900 mb-2">
                                            {blog.title}
                                        </h4>

                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {blog.excerpt}
                                        </p>
                                    </div>

                                    <button className="text-orange-500 text-sm font-medium mt-3 self-start">
                                        Read More
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View All */}
                <div className="flex justify-center mt-14">
                    <button className="bg-orange-500 hover:bg-orange-600 transition text-white px-10 py-3 rounded-xl text-sm font-medium">
                        View All
                    </button>
                </div>
            </div>
        </section>
    )
}

