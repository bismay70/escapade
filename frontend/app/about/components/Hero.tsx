
const Hero = () => {
  return (
    <section className="w-full px-6 md:px-8 py-12 bg-[#F2F4F6]">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between flex-col items-start gap-6 md:gap-10 md:flex-row">
          <h1 className="text-4xl font-gilroy-semibold leading-tight text-slate-900 md:text-5xl w-fit">
            Redefining Travel
            <br />
            Experiences
          </h1>

          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base font-gilroy-medium w-full">
            Vacanes is an online travel platform that specialises in providing
            personalised and affordable travel packages, including luxury travel
            options. We understand that every traveler is unique, which is why we
            offer customised packages that fit your specific needs and budget,
            ensuring that you have a unique and memorable trip.
          </p>
        </div>

        <div className="mt-10 rounded-3xl">
          <img
            src="/about/img/hero-bg.png"
            alt="Traveler standing in front of a waterfall"
            className="h-[420px] w-full rounded-[1.4rem] object-cover md:h-[480px]"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
