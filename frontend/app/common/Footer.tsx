import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#0a0a0a] text-gray-300 py-16 px-8 font-gilroy-medium">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                {/* Brand & Mission */}
                <div className="lg:col-span-1 flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-6">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-white">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        <span className="text-white text-xl font-gilroy-bold">Vacanes</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pr-2 mb-6">
                        Our mission is to empower modern travelers with an intelligent AI agent to plan, book, and elevate every adventure seamlessly.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                        <p>hello@vacanes.ai</p>
                        <p>+91-8861524428</p>
                        <p className="leading-relaxed">3rd Floor, Above United Medicals, Ramdev Galli, Belagavi – 590010</p>
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="text-white font-gilroy-semibold mb-6 uppercase text-sm tracking-wider">Quick Links</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                        <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                        <li><Link href="/destinations" className="hover:text-white transition-colors">Destinations</Link></li>
                        <li><Link href="/blog" className="hover:text-white transition-colors">Blogs</Link></li>
                        <li><Link href="/career" className="hover:text-white transition-colors">Career</Link></li>
                        <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                    </ul>
                </div>

                {/* Services */}
                <div>
                    <h4 className="text-white font-gilroy-semibold mb-6 uppercase text-sm tracking-wider">Services</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li><Link href="/packages" className="hover:text-white transition-colors">Packages</Link></li>
                        <li><Link href="/hotels" className="hover:text-white transition-colors">Hotels & Luxury</Link></li>
                        <li><Link href="/flights" className="hover:text-white transition-colors">Flights & Transport</Link></li>
                        <li><Link href="/cruise" className="hover:text-white transition-colors">Cruise</Link></li>
                        <li><Link href="/solo-travel" className="hover:text-white transition-colors">Solo Female Travel</Link></li>
                        <li><Link href="/weddings" className="hover:text-white transition-colors">Destination Wedding</Link></li>
                    </ul>
                </div>

                {/* Offers */}
                <div>
                    <h4 className="text-white font-gilroy-semibold mb-6 uppercase text-sm tracking-wider">Offers</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li><Link href="/offers/summer" className="hover:text-white transition-colors">Summer Sale</Link></li>
                        <li><Link href="/offers/diwali" className="hover:text-white transition-colors">Diwali Sale</Link></li>
                        <li><Link href="/rewards" className="hover:text-white transition-colors">Vacanes Rewards</Link></li>
                        <li><Link href="/refer" className="hover:text-white transition-colors">Refer & Earn</Link></li>
                        <li><Link href="/group" className="hover:text-white transition-colors">Group Bookings</Link></li>
                        <li><Link href="/celebrations" className="hover:text-white transition-colors">Celebrations</Link></li>
                    </ul>
                </div>

                {/* Get Updates */}
                <div className="lg:col-span-1">
                    <h4 className="text-white font-gilroy-semibold mb-6 uppercase text-sm tracking-wider">Get Updates</h4>
                    <div className="flex flex-col gap-3 mb-8">
                        <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1 border border-[#333] shadow-inner">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="bg-transparent text-sm text-white px-3 py-2 w-full focus:outline-none placeholder-gray-500"
                            />
                        </div>
                        <button className="bg-white text-black font-gilroy-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors w-full">
                            Subscribe
                        </button>
                    </div>

                    {/* Socials */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer text-gray-300">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer text-gray-300">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                            </svg>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer text-gray-300">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#333] flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
                <p>© 2025 Vacanes. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0 font-gilroy-semibold">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
