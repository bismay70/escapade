import Hero from './components/Hero'
import ComfortZone from './components/ComfortZone'
// import ExclusiveDeals from './components/ExclusiveDeals'
import HeroBanner from './components/Banners'
import ExploreThemes from './components/ExploreThemes'
import HeroSlider from '../common/HeroSlider'
// import EarlyBirdOffers from './components/EarlyBirdOffers'
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
import ScrollReveal from '../common/ScrollReveal'
import HomeMotion from '../common/HomeMotion'
import JourneyScene from './components/JourneyScene'
import DestinationDeck from './components/DestinationDeck'
import TravelWorld from './components/TravelWorld'


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
        <HomeMotion>
        <section>
            <Hero />
            <JourneyScene />
            <ScrollReveal variant="slide"><ComfortZone /></ScrollReveal>
            {/* <ScrollReveal><ExclusiveDeals /></ScrollReveal> */}
            <ScrollReveal><HeroBanner /></ScrollReveal>
            <TravelWorld />
            <ScrollReveal variant="scale"><ExploreThemes /></ScrollReveal>
            <ScrollReveal>
            <HeroSlider
                heading="Experience the Extraordinary"
                subheading="Immerse yourself in extraordinary journeys tailored to your style"
                slides={slides}
            />
            </ScrollReveal>
            <DestinationDeck />
            {/* <ScrollReveal><EarlyBirdOffers /></ScrollReveal> */}
            <ScrollReveal><HowItWorks /></ScrollReveal>
            <ScrollReveal><BestPackages /></ScrollReveal>
            <ScrollReveal><Hotels /></ScrollReveal>
            <ScrollReveal><Partners /></ScrollReveal>
            <ScrollReveal><NewsletterBanner /></ScrollReveal>
            <ScrollReveal variant="slide"><CustomizeBooking /></ScrollReveal>
            <ScrollReveal><VacanesBlogs /></ScrollReveal>
            {/* <ExploreTheWorld /> */}
            <ScrollReveal><Testimonials /></ScrollReveal>
            <ScrollReveal variant="scale"><Gallery /></ScrollReveal>
            <ScrollReveal><FAQ /></ScrollReveal>
        </section>
        </HomeMotion>
    )
}

export default HomePage
