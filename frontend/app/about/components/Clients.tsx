import Marquee from "react-fast-marquee";

const RecognitionByGovernment = () => {
  return (
    <section className="w-full bg-[#F2F4F6] px-8 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 md:mb-16 text-center">
          <h2 className="mb-4 text-3xl font-gilroy-semibold text-[#16242A] md:text-4xl">
            Recognition By Government
          </h2>
          <p className="mx-auto max-w-4xl text-sm font-gilroy-medium leading-relaxed text-slate-600 md:text-base">
            Vacanes, a certified tour operator and ATOAI member, has quickly
            earned trust in the travel industry, winning multiple awards—including
            the TripAdvisor Travelers’ Choice 2023 and MSME Best Enterprise for
            three years—while being recognized by Startup India and featured in
            ANI and Business Standard.
          </p>
        </div>

        <div className="mb-20 grid items-center gap-10 sm:grid-cols-2 md:grid-cols-4 max-md:hidden">
          <img src="/about/logos/summit.svg" alt="Summit Hotels" className="mx-auto" />
          <img src="/about/logos/taj.svg" alt="Taj" className="mx-auto" />
          <img src="/about/logos/startup-india.svg" alt="Startup India" className="mx-auto" />
          <img src="/about/logos/marriott.svg" alt="Marriott Bonvoy" className="mx-auto" />
        </div>

        <div  className="md:hidden">
        <Marquee>
          <img src="/about/logos/summit.svg" alt="Summit Hotels" className="ml-8" />
          <img src="/about/logos/taj.svg" alt="Taj" className="ml-8" />
          <img src="/about/logos/startup-india.svg" alt="Startup India" className="ml-8" />
          <img src="/about/logos/marriott.svg" alt="Marriott Bonvoy" className="ml-8" />
        </Marquee>
        </div>
       

        <div className="mb-20 flex flex-col items-center justify-between gap-6 rounded-xl bg-white px-4 py-4 md:flex-row">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex -space-x-3">
              <img src="/avatars/1.jpg" className="h-10 w-10 rounded-full border-2 border-white" />
              <img src="/avatars/2.jpg" className="h-10 w-10 rounded-full border-2 border-white" />
              <img src="/avatars/3.jpg" className="h-10 w-10 rounded-full border-2 border-white" />
              <img src="/avatars/4.jpg" className="h-10 w-10 rounded-full border-2 border-white" />
            </div>

            <div className="text-center md:text-left">
              <p className="text-sm font-gilroy-semibold text-[#16242A]">
                1.2K+ Reviews
              </p>
              <p className="text-xs font-gilroy-medium text-slate-600">
                Hear What Our Travelers Are Saying
              </p>
            </div>
          </div>

          <button className="rounded-lg bg-[#FF6A00] px-6 py-3 text-sm font-gilroy-semibold text-white hover:bg-[#e96f21] w-full md:w-fit">
            Check Reviews
          </button>
        </div>

        <div className="grid gap-12 text-sm text-slate-700 md:grid-cols-3">

          <div className="flex flex-col items-center md:items-start">
            <h4 className="mb-4 font-gilroy-semibold text-[#16242A]">
              Contact Us
            </h4>
            <p className="mb-2 flex items-center gap-2">
              📧 vacanes@gmail.com
            </p>
            <p className="flex items-center gap-2">
              📞 +91-8861524428
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h4 className="mb-4 font-gilroy-semibold text-[#16242A]">
              Address
            </h4>
            <p className="leading-relaxed">
              📍 3rd floor, above united medicals, <br />
              ramdev galli, belagavi – 590010
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h4 className="mb-4 font-gilroy-semibold text-[#16242A]">
              We Accept
            </h4>
            <div className="flex items-center gap-4">
              <img src="/payments/amex.png" className="h-6" />
              <img src="/payments/mastercard.png" className="h-6" />
              <img src="/payments/visa.png" className="h-6" />
              <img src="/payments/paypal.png" className="h-6" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default RecognitionByGovernment;
