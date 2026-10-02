'use client'
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarDays, Hotel, Car, MapPin, Train, Bus, Plane, Ship, Package } from "lucide-react"

const tabs = [
    { label: "Packages", icon: Package },
    { label: "Hotels", icon: Hotel },
    { label: "Cabs", icon: Car },
    { label: "Activities", icon: MapPin },
    { label: "Trains", icon: Train },
    { label: "Buses", icon: Bus },
    { label: "Flights", icon: Plane },
    { label: "Cruise", icon: Ship },
]

export default function SearchBar() {
    const [activeTab, setActiveTab] = useState("Packages")
    const [addFlight, setAddFlight] = useState(false)

    return (
        <div className="w-full max-w-6xl mx-auto px-6">
            {/* Tabs */}
            <div className="flex justify-between gap-2 overflow-x-auto">
                {tabs.map(({ label, icon: Icon }) => (
                    <button
                        key={label}
                        onClick={() => setActiveTab(label)}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium transition rounded-t-lg font-gilroy-medium ${activeTab === label
                            ? "bg-[#CEDDE7] text-black"
                            : "text-white/80 hover:bg-black/60 bg-black/70"
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Search Card */}
            <Card className="rounded-none bg-[#CEDDE7] p-4 border-none rounded-b-lg">
                <div className="flex gap-2 items-end box-border">

                    <FieldBox>
                        <Field label="Leaving From">
                            <Select>
                                <SelectTrigger className="border-none p-0 shadow-none !text-black font-gilroy-medium">
                                    <SelectValue placeholder="Select leaving Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="delhi">Delhi</SelectItem>
                                    <SelectItem value="mumbai">Mumbai</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Destination">
                            <Select>
                                <SelectTrigger className="border-none p-0 shadow-none font-gilroy-medium">
                                    <SelectValue placeholder="Select Destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goa">Goa</SelectItem>
                                    <SelectItem value="manali">Manali</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Theme">
                            <Select defaultValue="solo">
                                <SelectTrigger className="border-none p-0 shadow-none font-gilroy-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solo">Solo Travel</SelectItem>
                                    <SelectItem value="family">Family</SelectItem>
                                    <SelectItem value="honeymoon">Honeymoon</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="From">
                            <div className="relative">
                                <Input
                                    placeholder="DD-MM"
                                    className="border-none p-0 shadow-none font-gilroy-medium"
                                />
                                <CalendarDays className="absolute right-0 top-1 h-4 w-4 text-muted-foreground" />
                            </div>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="To">
                            <div className="relative">
                                <Input
                                    placeholder="DD-MM"
                                    className="border-none p-0 shadow-none font-gilroy-medium"
                                />
                                <CalendarDays className="absolute right-0 top-1 h-4 w-4 text-muted-foreground" />
                            </div>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Travelers">
                            <Select defaultValue="2-1">
                                <SelectTrigger className="border-none p-0 shadow-none font-gilroy-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1-1">1 Traveler, 1 Room</SelectItem>
                                    <SelectItem value="2-1">2 Traveler, 1 Room</SelectItem>
                                    <SelectItem value="4-2">4 Traveler, 2 Room</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <Button className="h-full rounded-lg bg-slate-800 text-white hover:bg-slate-700">
                        Search
                    </Button>

                </div>
            </Card>


            {/* Add Flight */}
            <label className="mt-4 flex items-center gap-2 text-white bg-black/60 px-4 py-2 rounded-md cursor-pointer w-fit">
                <Checkbox
                    checked={addFlight}
                    onCheckedChange={(v) => setAddFlight(!!v)}
                />
                <span className="font-gilroy-medium text-sm">Add a flight</span>
            </label>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-gilroy-medium">{label}</span>
            {children}
        </div>
    )
}

const FieldBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white px-4 pt-2 rounded-lg">
        {children}
    </div>
)

