"""Curated examples, never live availability or quotes."""
DESTINATIONS = [
    {"name": "Goa", "interests": ["beaches", "food", "wellness"], "daily": 2200, "activities": {"beaches": "Enjoy a quieter beach such as Agonda", "food": "Explore Goan cuisine with a dietary-aware food walk", "culture": "Explore Fontainhas and Old Goa", "wellness": "Try a gentle seaside yoga session", "nature": "Visit a coastal nature trail", "adventure": "Check operator safety before a water activity"}},
    {"name": "Kerala", "interests": ["nature", "wellness", "food"], "daily": 2400, "activities": {"nature": "Explore the backwaters around Alappuzha", "wellness": "Enjoy a restful wellness afternoon", "culture": "Explore Fort Kochi", "food": "Try regional Kerala dishes", "beaches": "Walk along a Kerala beach", "adventure": "Choose a guided nature excursion"}},
    {"name": "Jaipur", "interests": ["culture", "food"], "daily": 1800, "activities": {"culture": "Explore Amber Fort and Jaipur's old city", "food": "Sample Rajasthani cuisine", "nature": "Take a gentle garden walk", "adventure": "Join a guided heritage walk", "wellness": "Enjoy a quiet cafe and rest afternoon"}},
    {"name": "Manali", "interests": ["nature", "adventure"], "daily": 2100, "activities": {"nature": "Explore the valley's scenery", "adventure": "Choose a guided trail suited to your fitness", "culture": "Visit local villages respectfully", "food": "Explore Himachali food", "wellness": "Enjoy a quiet mountain morning"}},
    {"name": "Udaipur", "interests": ["culture", "wellness", "food"], "daily": 2300, "activities": {"culture": "Visit the City Palace area", "nature": "Enjoy the lakeside scenery", "food": "Try regional Mewari cuisine", "wellness": "Spend a relaxed evening by Lake Pichola"}},
    {"name": "Rishikesh", "interests": ["wellness", "nature", "adventure"], "daily": 1800, "activities": {"wellness": "Join a beginner-friendly yoga session", "nature": "Enjoy a riverside walk", "adventure": "Verify season and operator safety before rafting", "culture": "Learn about local traditions", "food": "Explore vegetarian cafes"}},
    {"name": "Meghalaya", "interests": ["nature", "adventure"], "daily": 2500, "activities": {"nature": "Explore the landscapes around Shillong", "adventure": "Choose a guided trail with weather checks", "culture": "Learn about Khasi traditions with a local guide", "food": "Try local dishes with dietary checks"}},
    {"name": "Bali", "interests": ["beaches", "wellness", "culture"], "daily": 4200, "activities": {"culture": "Explore Ubud with a local guide", "nature": "Visit rice terrace viewpoints", "beaches": "Enjoy a beach afternoon", "wellness": "Try yoga or a restful spa session", "food": "Explore Balinese cuisine"}},
    {"name": "Thailand", "interests": ["beaches", "food", "culture"], "daily": 3800, "activities": {"beaches": "Explore a beach destination with weather checks", "culture": "Visit temples respectfully", "food": "Explore a local food market", "nature": "Take a guided nature excursion"}},
    {"name": "Paris", "interests": ["culture", "food"], "daily": 11000, "activities": {"culture": "Explore museums and neighbourhoods", "food": "Visit a local market", "nature": "Enjoy a garden walk", "wellness": "Take a relaxed cafe break"}},
    {"name": "Japan", "interests": ["culture", "food", "nature"], "daily": 9000, "activities": {"culture": "Explore a local cultural district", "food": "Try regional cuisine with ingredient checks", "nature": "Visit a public garden"}},
    {"name": "Dubai", "interests": ["culture", "food", "adventure"], "daily": 8000, "activities": {"culture": "Explore Al Fahidi", "food": "Visit a local food market", "adventure": "Choose a reputable guided desert excursion", "beaches": "Relax at a public beach"}},
]


def destination_record(name):
    return next((d for d in DESTINATIONS if d["name"].casefold() == name.casefold()), None)


def recommend(p):
    def estimate(d):
        return round(d["daily"] * p.days * p.travelers * {"budget": .75, "boutique": 1, "luxury": 1.8}[p.hotel_type])
    ranked = sorted(DESTINATIONS, key=lambda d: (estimate(d) <= p.budget, len(set(d["interests"]) & set(p.interests)), -estimate(d)), reverse=True)
    return [{"destination": d["name"], "reason": f"Matches {', '.join(sorted(set(d['interests']) & set(p.interests))) or 'a varied holiday'}; suits a {p.pace} {p.travel_style} trip." + (" The sample ground estimate exceeds your budget; shorten the trip or increase it." if estimate(d) > p.budget else ""), "estimated_ground_cost": estimate(d), "sample": True} for d in ranked[:3]]
