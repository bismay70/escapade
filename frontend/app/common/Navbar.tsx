"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const indiaDestinations = [
    ["Kerala", "Goa", "Himachal Pradesh", "Gujarat", "Tamil Nadu"],
    ["Rajasthan", "Jammu & Kashmir", "Karnataka", "Madhya Pradesh", "Meghalaya"],
    ["Uttar Pradesh", "Assam", "Andhra Pradesh", "Andaman & Nicobar Islands"]
];

const internationalDestinations = [
    ["Dubai", "Thailand", "Singapore", "Malaysia", "Vietnam"],
    ["Bali", "Maldives", "Mauritius", "Europe", "Switzerland"],
    ["Japan", "Australia", "New Zealand", "USA", "UK"]
];

const allDestinations = [
    [""]
];

export default function Navbar() {
    const [activeTab, setActiveTab] = useState("India")

    return (
        <header className="w-full relative z-50">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 absolute top-0 left-0 right-0 bg-none z-50 font-gilroy">
                {/* Left */}
                <div className="flex items-center gap-10">
                    <Link href="/">
                        <span className="cursor-pointer text-xl font-gilroy-bold tracking-wide text-text">
                            Vacanes
                        </span>
                    </Link>

                    <NavigationMenu>
                        <NavigationMenuList className="gap-6">
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent p-0 text-sm font-gilroy-semibold h-auto text-text transition-colors">
                                    Destination
                                </NavigationMenuTrigger>
                                <NavigationMenuContent className="p-0 rounded-2xl">
                                    <div className="w-[850px] p-8 bg-white rounded-2xl shadow-xl relative z-100">
                                        {/* Tabs */}
                                        <div className="flex gap-10 mb-4 border-b border-gray-100">
                                            {["India", "International", "All"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={cn(
                                                        "pb-4 text-sm font-gilroy-bold transition-colors relative",
                                                        activeTab === tab
                                                            ? "text-primary-orange  after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary-orange"
                                                            : "text-gray-400 hover:text-gray-600"
                                                    )}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Content - India Grid */}
                                        {activeTab === "India" && (
                                            <div className="grid grid-cols-3 gap-x-16 gap-y-5">
                                                {indiaDestinations.map((column, colIdx) => (
                                                    <div key={colIdx} className="flex flex-col gap-4">
                                                        {column.map((destination) => (
                                                            <Link
                                                                key={destination}
                                                                href={`/destination_india`}
                                                                className="flex items-center gap-2 text-sm text-gray-800 hover:text-primary-orange transition-colors font-gilroy-semibold group/item"
                                                            >
                                                                <ChevronRight className="w-4 h-4 text-gray-900 group-hover/item:text-primary-orange transition-colors" />
                                                                <span>{destination}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Placeholder for other tabs */}
                                        {activeTab === "International" && (
                                            <div className="grid grid-cols-3 gap-x-16 gap-y-5">
                                                {internationalDestinations.map((column, colIdx) => (
                                                    <div key={colIdx} className="flex flex-col gap-4">
                                                        {column.map((destination) => (
                                                            <Link
                                                                key={destination}
                                                                href={`/destination_all`}
                                                                className="flex items-center gap-2 text-sm text-gray-800 hover:text-primary-orange transition-colors font-gilroy-semibold group/item"
                                                            >
                                                                <ChevronRight className="w-4 h-4 text-gray-900 group-hover/item:text-primary-orange transition-colors" />
                                                                <span>{destination}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === "All" && (
                                            <div className="grid grid-cols-3 gap-x-16 gap-y-5">
                                                {allDestinations.map((column, colIdx) => (
                                                    <div key={colIdx} className="flex flex-col gap-4">
                                                        {column.map((destination) => (
                                                            <Link
                                                                key={destination}
                                                                href={`/destination_all`}
                                                                className="flex items-center gap-2 text-sm text-gray-800 hover:text-primary-orange transition-colors font-gilroy-semibold group/item"
                                                            >
                                                                <ChevronRight className="w-4 h-4 text-gray-900 group-hover/item:text-primary-orange transition-colors" />
                                                                <span>{destination}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            <NavItem label="Explore Extraordinary" />
                            <NavItem label="Offers" />
                            <NavItem label="Support" />
                            <NavItem label="Review & Ratings" />
                            <NavItem label="About Us" />
                            <NavigationMenuItem>
                                <span className="cursor-pointer text-text hover:text-white text-sm font-gilroy-semibold transition-colors">Blogs</span>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 font-gilroy-semibold">
                    <Button
                        asChild
                        variant="secondary"
                        className="bg-[#10213E] text-white hover:bg-[#17345D] rounded-full px-6 transition-all"
                    >
                        <Link href="/login">Sign up</Link>
                    </Button>
                    <Button
                        asChild
                        variant="secondary"
                        className="bg-[#1D4ED8] text-white hover:bg-[#1E40AF] rounded-full px-6 transition-all"
                    >
                        <Link href="/login">Log in</Link>
                    </Button>
                </div>
            </div>
        </header >
    )
}

function NavItem({ label }: { label: string }) {
    return (
        <NavigationMenuItem>
            <div className="flex cursor-pointer items-center gap-1 text-text hover:text-white transition-colors group">
                <span className="text-sm font-gilroy-semibold">{label}</span>
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
            </div>
        </NavigationMenuItem>
    )
}
