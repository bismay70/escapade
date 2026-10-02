const Mission = () => {
  const features = [
    {
      icon: "/about/svg/mission/ion_pin.svg",
      title: "One-Stop Solution",
      description:
        "We’re your one-stop travel hub for bookings & experiences – flights, stays, transport, and adventures all in one place.",
    },
    {
      icon: "/about/svg/mission/mdi_customer-service.svg",
      title: "Personalized Recommendations",
      description:
        "We offer personalized service and custom itineraries to match your unique travel style, group size, and budget.",
    },
    {
      icon: "/about/svg/mission/mingcute_user-security-fill.svg",
      title: "Safety & Security",
      description:
        "We work only with trusted partners and uphold the highest standards across all our travel packages.",
    },
    {
      icon: "/about/svg/mission/ic_round-computer.svg",
      title: "Hassle-Free Booking",
      description:
        "We ensure a smooth booking experience with easy access, secure payments, and 24/7 customer support throughout your journey.",
    },
  ];

  return (
   <section className="w-full px-6 md:px-8 py-12 md:py-20 bg-[#F2F4F6]">
  <div className="mx-auto flex flex-col-reverse max-w-7xl gap-10 items-stretch md:flex-row">

    <div className="flex flex-1 flex-col justify-between max-md:gap-4">
      {features.map((item) => (
        <div
          key={item.title}
          className="flex items-start gap-4 rounded-xl bg-white p-4 md:px-6 md:py-5"
        >
          <div className="rounded-2xl bg-linear-to-r from-[#FFD9BD50] to-[#B3E5F150] h-full md:px-6 max-md:py-6 max-md:w-full flex justify-center items-center">
            <img src={item.icon} alt={item.title} className=""/>
          </div>

          <div>
            <h3 className="mb-1 text-base font-gilroy-semibold text-[#16242A]">
              {item.title}
            </h3>
            <p className="text-sm font-gilroy-medium text-slate-700">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div className="flex flex-1 flex-col">
      <h2 className="mb-2 text-3xl font-gilroy-semibold text-[#16242A] md:text-4xl">
        Our Mission
      </h2>

      <p className="mb-2 text-sm font-gilroy-medium text-slate-700 md:text-base">
        Our mission is to inspire exploration and simplify travel through expert support and curated experiences.
      </p>

      <div className="flex-1 overflow-hidden rounded-3xl">
        <img
          src="/about/img/mission.png"
          className="h-full w-full object-cover"
        />
      </div>
    </div>

  </div>
</section>

  );
};

export default Mission;
