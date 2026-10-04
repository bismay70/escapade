'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Preferences, travelApi } from "@/lib/travel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Hotel, Car, MapPin, Train, Bus, Plane, Ship, Package } from "lucide-react"

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
    const [origin, setOrigin] = useState("")
    const [destination, setDestination] = useState("")
    const [theme, setTheme] = useState<Preferences["travel_style"]>("solo")
    const [travelers, setTravelers] = useState("2-1")
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    async function search(event: React.FormEvent) {
        event.preventDefault()
        if (busy) return
        setBusy(true); setError("")
        try {
            const { preferences } = await travelApi<{ preferences: Preferences }>("profile")
            const next = { ...preferences, origin, destination, travel_style: theme,
                travelers: Number(travelers.split("-")[0]), departure_date: from || null, return_date: to || null,
                transport: activeTab === "Flights" || addFlight ? "flight" as const : preferences.transport }
            await travelApi("profile", { method: "PUT", body: JSON.stringify(next) })
            router.push(activeTab === "Flights" || activeTab === "Hotels" ? `/bookings?kind=${activeTab === "Hotels" ? "hotel" : "flight"}` : "/planner")
        } catch (problem) { setError(problem instanceof Error ? problem.message : "Search could not start. Please try again.") }
        finally { setBusy(false) }
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-0 sm:px-6">
            {/* Tabs */}
            <div className="flex justify-between gap-2 overflow-x-auto">
                {tabs.map(({ label, icon: Icon }) => (
                    <button
                        key={label}
                        onClick={() => setActiveTab(label)}
                        className={`flex shrink-0 items-center gap-2 px-4 lg:px-6 py-2 text-sm font-medium transition rounded-t-lg font-gilroy-medium ${activeTab === label
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
                <form onSubmit={search}><fieldset disabled={busy} className="grid grid-cols-2 sm:grid-cols-3 xl:flex gap-2 items-stretch box-border min-w-0">

                    <FieldBox>
                        <Field label="Leaving From">
                            <Select value={origin} onValueChange={setOrigin}>
                                <SelectTrigger aria-label="Leaving from" className="border-none p-0 shadow-none !text-black font-gilroy-medium w-full min-w-0">
                                    <SelectValue placeholder="Choose origin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DEL">Delhi</SelectItem>
                                    <SelectItem value="BOM">Mumbai</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Destination">
                            <Select value={destination} onValueChange={setDestination}>
                                <SelectTrigger aria-label="Destination" className="border-none p-0 shadow-none font-gilroy-medium w-full min-w-0">
                                    <SelectValue placeholder="Choose destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Goa">Goa</SelectItem>
                                    <SelectItem value="Manali">Manali</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Theme">
                            <Select value={theme} onValueChange={value => setTheme(value as Preferences["travel_style"])}>
                                <SelectTrigger aria-label="Travel theme" className="border-none p-0 shadow-none font-gilroy-medium w-full min-w-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solo">Solo Travel</SelectItem>
                                    <SelectItem value="family">Family</SelectItem>
                                    <SelectItem value="couple">Honeymoon</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="From">
                            <div className="relative">
                                <Input
                                    type="date" aria-label="Departure date" value={from} onChange={event => setFrom(event.target.value)}
                                    className="border-none p-0 shadow-none font-gilroy-medium min-w-0 w-full"
                                />
                            </div>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="To">
                            <div className="relative">
                                <Input
                                    type="date" aria-label="Return date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)}
                                    className="border-none p-0 shadow-none font-gilroy-medium min-w-0 w-full"
                                />
                            </div>
                        </Field>
                    </FieldBox>

                    <FieldBox>
                        <Field label="Travelers">
                            <Select value={travelers} onValueChange={setTravelers}>
                                <SelectTrigger aria-label="Travelers" className="border-none p-0 shadow-none font-gilroy-medium w-full min-w-0">
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

                    <Button type="submit" disabled={busy} className="col-span-2 sm:col-span-3 xl:col-span-1 h-full min-h-10 rounded-lg bg-slate-800 text-white hover:bg-slate-700">
                        {busy ? "Opening…" : "Search"}
                    </Button>

                </fieldset></form>
                {error && <p role="alert" className="text-sm text-red-900 mt-2">{error}</p>}
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
    <div className="bg-white px-3 pt-2 rounded-lg min-w-0 xl:flex-1">
        {children}
    </div>
)

