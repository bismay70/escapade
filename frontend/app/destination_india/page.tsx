import Hero from './compoents/Hero'
import StateCard from './compoents/StateCard'

const DESTINATIONS = [
    {
        name: 'Goa',
        description: 'Goa is a state in western India on the Malabar Coast of the Arabian Sea. It is known for its beaches, temples, and colonial architecture.',
        image: '/destination_india/goa.png'
    },
    {
        name: 'Kerala',
        description: 'Kerala is a state on the southwestern Malabar Coast of India. It is known for its palm-lined beaches and backwaters.',
        image: '/destination_india/kerala.png'
    },
    {
        name: 'Rajasthan',
        description: 'Rajasthan is a state in northern India. It is known for its majestic forts, vibrant culture, and the vast Thar Desert.',
        image: 'https://images.unsplash.com/photo-1599661046289-e318978505c1?q=80&w=2070&auto=format&fit=crop'
    },
    {
        name: 'Himachal Pradesh',
        description: 'Himachal Pradesh is a northern Indian state in the Himalayas. It is home to scenic mountain towns and resorts.',
        image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=2012&auto=format&fit=crop'
    }
]

const DestinationIndia = () => {
    return (
        <main>
            <Hero />
            <section className="w-full py-16">
                <div className="max-w-7xl mx-auto px-8">
                    <h2 className="text-4xl font-gilroy-semibold text-center mb-3">
                        Explore <span className="text-primary-orange">India</span>
                    </h2>
                    <p className="text-base text-gray-500 font-gilroy-medium text-center mb-8">
                        Embark on a Journey to Explore India's Rich Heritage and Natural Beauty
                    </p>
                    <div>
                        <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-12">
                            <div className="w-full md:max-w-md">
                                <input
                                    type="text"
                                    placeholder="Search destinations..."
                                    className="w-full px-6 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-orange/20 focus:border-primary-orange font-gilroy-medium bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <label className="text-gray-600 font-gilroy-medium whitespace-nowrap">Sort by:</label>
                                <select className="flex-1 md:w-48 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-orange/20 focus:border-primary-orange font-gilroy-medium bg-white cursor-pointer">
                                    <option value="all">All Destinations</option>
                                    <option value="popular">Most Popular</option>
                                    <option value="rating">Top Rated</option>
                                    <option value="newest">Newest Added</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className='flex flex-col justify-center items-center gap-6 mb-12'>
                        {DESTINATIONS.map((destination, index) => (
                            <StateCard
                                key={index}
                                name={destination.name}
                                description={destination.description}
                                image={destination.image}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}

export default DestinationIndia