import Hero from './components/Hero'
import ComfortZone from './components/ComfortZone'
import ExclusiveDeals from './components/ExclusiveDeals'
import HeroBanner from './components/Banners'
import ExploreThemes from './components/ExploreThemes'
import HeroSlider from '../common/HeroSlider'
import EarlyBirdOffers from './components/EarlyBirdOffers'
import WeOfferBest from './components/WeOfferBest'
import HowItWorks from './components/HowItWorks'
import BestPackages from './components/BestPackages'
import Hotels from './components/Hotels'
import NewsletterBanner from '../common/Form'
import CustomizeBooking from './components/CustomizeBooking'
import VacanesBlogs from './components/VacanesBlogs'
import Partners from './components/Partners'
import Gallery from './components/Gallery'
import Testimonials from './components/Testimonials'
import FAQ from '../common/FAQ'


const slides = [
    {
        title: "Solo/Group Female Travellers",
        offer: "Your safety and peace of mind are our utmost priorities",
        cta: "Book Now",
        image: "/home/variant/variant1.png",
    },
    {
        title: "SUMMER",
        offer: "UP TO 40% OFF",
        cta: "Explore Now",
        image: "/home/variant/variant2.png",
    },
    {
        title: "WEEKEND",
        offer: "SPECIAL DEALS",
        cta: "View Deals",
        image: "/home/variant/variant3.png",
    },
]


const HomePage = () => {
    return (
        <section>
            <Hero />
            <ComfortZone />
            <ExclusiveDeals />
            <HeroBanner />
            <ExploreThemes />
            <HeroSlider
                heading="Experience the Extraordinary"
                subheading="Immerse yourself in extraordinary journeys tailored to your style"
                slides={slides}
            />
            <EarlyBirdOffers />
            <WeOfferBest />
            <HowItWorks />
            <BestPackages />
            <Hotels />
            <NewsletterBanner />
            <CustomizeBooking />
            <VacanesBlogs />
            {/* <ExploreTheWorld /> */}
            <Partners />
            <Testimonials />
            <Gallery />
            <FAQ />
        </section>
    )
}

export default HomePage
