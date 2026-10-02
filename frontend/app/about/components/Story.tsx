
const Story = () => {
  return (
    <section className="w-full px-6 md:px-8 py-12 bg-[#F2F4F6]">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-10 md:flex-row">
        <div className="w-full md:w-1/2">
          <div className="overflow-hidden rounded-3xl">
            <img
              src="/about/img/story-img.png"
              alt="Colorful street with scooter"
              className="h-[320px] w-full object-cover md:h-[360px]"
            />
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="mb-4 text-3xl font-gilroy-semibold text-[#16242A] md:text-4xl ">
            Our Story
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-700 md:text-base font-gilroy-medium">
            At Vacanes, we specialize in crafting unforgettable travel
            experiences, be it luxurious getaways, cultural immersions, or
            adrenaline-filled adventures. Whether you're traveling solo, with
            friends, or as a family, we take care of every detail to ensure your
            journey is seamless, exciting, and memorable.
          </p>
          <p className="text-sm leading-relaxed text-slate-700 md:text-base font-gilroy-medium">
            From romantic escapes and scenic treks to group tours and urban
            explorations, our expert team is here to help you plan the perfect
            trip. With 24/7 support and regularly updated destinations, we’re
            committed to guiding you through the unexpected and helping you
            create stories that last a lifetime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Story;
