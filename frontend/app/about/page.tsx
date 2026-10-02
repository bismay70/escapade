import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Story from "./components/Story";
import Mission from "./components/Mission";
import OurValues from "./components/Values";
import WhyIsItGreat from "./components/WhyIsItGreat";
import RecognitionByGovernment from "./components/Clients";
import Footer from "./components/Footer";

const AboutUsPage = () => {
    return (
        <main>
            <Navbar />
            <Hero />
            <Story />
            <Mission />
            <OurValues />
            <WhyIsItGreat />
            <RecognitionByGovernment />
            <Footer />
        </main>
    )
}

export default AboutUsPage