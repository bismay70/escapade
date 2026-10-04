import React from 'react';
import Image from 'next/image';

const ComfortZone = () => {
    return (
        <section className="py-16 px-8 max-w-7xl mx-auto font-twk-lausanne">
            {/* Logos */}
            <div className="flex flex-wrap justify-between items-center gap-8 mb-16 opacity-60">
                <span className="font-editorial-new text-xl font-bold uppercase tracking-widest text-gray-500">HelloSign</span>
                <span className="font-twk-lausanne text-xl font-bold uppercase tracking-widest text-gray-500">DoorDash</span>
                <span className="font-pp-mondwest text-xl font-bold lowercase tracking-widest text-gray-500">Coinbase</span>
                <span className="font-twk-lausanne text-xl font-bold capitalize tracking-widest text-gray-500">Airtable</span>
                <span className="font-twk-lausanne text-xl font-bold lowercase tracking-widest text-gray-500">Pendo</span>
                <span className="font-twk-lausanne text-xl font-bold lowercase tracking-widest text-gray-500">Treehouse</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                    {/* Top Left Card */}
                    <div data-motion="card" className="bg-[#1f1b18] rounded-2xl p-8 flex flex-col justify-between h-[300px] text-white">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-twk-lausanne font-semibold leading-tight mb-2">Explore more to get your<br/>comfort zone</h2>
                            <p className="text-gray-400 mb-6">Book your perfect stay with us.</p>
                            <button className="bg-white text-black px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors w-fit">
                                Booking Now 
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Bottom Left Card */}
                    <div data-motion="card" className="relative rounded-2xl overflow-hidden h-[250px]">
                        <img 
                            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop" 
                            alt="Hotel Room" 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute bottom-6 left-6 text-white z-10">
                            <p className="text-sm font-medium mb-1">Hotel Available</p>
                            <p className="text-4xl font-bold tracking-tight">1,764,980</p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div data-motion="card" className="relative rounded-2xl overflow-hidden h-[566px] md:h-auto">
                    <img 
                        src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1974&auto=format&fit=crop" 
                        alt="Luxury Bedroom" 
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center z-10">
                        <h2 className="text-white text-4xl md:text-5xl font-editorial-new font-medium leading-tight">
                            Beyond accommodation, creating<br/>memories of a lifetime
                        </h2>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default ComfortZone;
