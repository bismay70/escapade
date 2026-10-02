const images = [
    "https://images.unsplash.com/photo-1548013146-72479768bada",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1549880338-65ddcdfd017b",
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70",
    "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66",
    "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66",
];

export default function Gallery() {
    return (
        <section className="pb-12 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-gilroy-semibold text-[#16242A] mb-2">
                    Gallery
                </h2>
                <p className="text-base font-gilroy-medium text-slate-600 mb-16">
                    Have a look at the beautiful images of our happy customers
                </p>
            </div>

            <div className="flex justify-center">
                <div className="flex items-center">
                    {images.map((img, index) => (
                        <div
                            key={index}
                            className={`
                w-[320px] h-[220px] rounded-none overflow-hidden
                
                ${index % 2 === 0
                                    ? "-rotate-6 translate-x-8"
                                    : "rotate-6 translate-x-8"
                                }
              `}
                        >
                            <img
                                src={img}
                                alt="gallery"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
