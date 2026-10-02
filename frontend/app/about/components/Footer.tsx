import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full bg-[#006077] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="space-y-6 w-full">
          <span className="text-2xl font-gilroy-bold">Vacanes</span>

          <div>
            <p className="mb-3 text-sm font-gilroy-semibold">Follow Us</p>
            <div className="flex items-center gap-4 text-xl">
              <a href="#" aria-label="Facebook">
                <i className="ri-facebook-circle-fill" />
              </a>
              <a href="#" aria-label="Instagram">
                <i className="ri-instagram-fill" />
              </a>
              <a href="#" aria-label="WhatsApp">
                <i className="ri-whatsapp-fill" />
              </a>
              <a href="#" aria-label="YouTube">
                <i className="ri-youtube-fill" />
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-sm md:text-base w-full">
          <div>
            <h3 className="mb-3 font-gilroy-semibold">Contact Us</h3>
            <div className="space-y-2 text-sm font-gilroy-medium">
              <div className="flex items-center gap-2">
                <span className="">
                    <img
                    src={"/about/logos/mail.svg"}
                    />
                </span>
                <span>vacanes@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="">
                      <img
                    src={"/about/logos/phone.svg"}
                    />
                </span>
                <span>+91-8861524428</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-gilroy-semibold">Address</h3>
            <div className="flex items-start gap-2">
            <span>
                <img
                    src={"/about/logos/address-marker.svg"}
                />
            </span>
            <p className="max-w-xs text-sm font-gilroy-medium leading-relaxed">
              3rd floor, above united medicals, ramdev galli, belagavi - 590010
            </p>
            </div>
          </div>
        </div>

        <div className="text-sm md:text-base w-full">
          <h3 className="mb-3 font-gilroy-semibold">Pages</h3>
          <ul className="space-y-4 font-gilroy-medium text-sm">
            <li>
              <Link href="#" className="hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline">
                Destinations
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline">
                Packages
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline">
                About Us
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline">
                Support
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 pb-12">
        <div className="h-px w-full bg-white/40" />
        <p className="mt-4 text-center text-xs font-gilroy-medium text-white/80">
          © {new Date().getFullYear()} Vacanes | Powered by Vacanes
        </p>
      </div>
    </footer>
  );
};

export default Footer;
