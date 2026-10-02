const WhyIsItGreat = () => {
  const reasons = [
    {
      icon: "/about/svg/great/clarity_employee-group-solid.svg",
      title: "Expertise & Experience",
      description:
        "Our team of travel experts has years of experience in the industry, and is passionate about delivering unforgettable travel experiences to our customers.",
    },
    {
      icon: "/about/svg/great/ion_pricetags.svg",
      title: "Competitive Pricing",
      description:
        "We believe that travel should be affordable and accessible to everyone. That’s why we offer competitive pricing on all our travel packages, without compromising on the quality of service.",
    },
    {
      icon: "/about/svg/great/iconamoon_discount-fill.svg",
      title: "Best Price Guarantee",
      description:
        "We believe that you shouldn’t have to sacrifice quality for affordability. That’s why we offer a Best Price Guarantee, ensuring that you always get the best value when you book with us.",
    },
    {
      icon: "/about/svg/great/ic_outline-travel-explore.svg",
      title: "Wide Range Of Travel Itinerary",
      description:
        "Our website offers a wide range of travel options, including luxury travel packages, adventure travel, and off-the-beaten-path destinations.",
    },
  ];

  return (
    <section className="w-full bg-[#F2F4F6] px-6 md:px-8 py-20">
      <div className="mx-auto max-w-7xl">

        <h2 className="mb-16 text-center text-3xl font-gilroy-semibold text-[#16242A] md:text-4xl">
          Why Is It Great
        </h2>

        <div className="grid gap-y-16 md:gap-y-20 gap-x-4 md:gap-x-12 grid-cols-2 max-w-3xl mx-auto w-full">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B00]">
                <img src={item.icon} alt={item.title} className="h-8 w-8" />
              </div>

              <h3 className="mb-4 text-lg font-gilroy-semibold text-[#16242A]">
                {item.title}
              </h3>

              <p className="max-w-sm text-sm font-gilroy-medium leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyIsItGreat;
