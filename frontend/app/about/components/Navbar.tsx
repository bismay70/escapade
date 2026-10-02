const Navbar = () => {
  return (
    <header className="w-full px-8 py-4 bg-[#F2F4F6] max-md:hidden">
      <nav className="mx-auto flex max-w-7xl items-center gap-10 ">
        <img
        src={"/about/logos/logo.svg"}
        className=""
        />

        <ul className="flex items-center gap-10 text-sm  text-slate-800 font-gilroy-semibold">
          <li className="cursor-pointer hover:text-slate-900">Home</li>

          <li className="flex cursor-pointer items-center gap-1 hover:text-slate-900">
            <span>Destinations</span>
            {/* <ChevronDownIcon className="h-4 w-4" /> */}
          </li>

          <li className="cursor-pointer hover:text-slate-900">Packages</li>
          <li className="cursor-pointer hover:text-slate-900">About Us</li>
          <li className="cursor-pointer hover:text-slate-900">Support</li>
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;
