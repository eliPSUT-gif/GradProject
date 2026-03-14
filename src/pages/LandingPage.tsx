import { useFadeIn } from '../hooks/useFadeIn';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import StatsStrip from '../components/landing/StatsStrip';
import ProblemSection from '../components/landing/ProblemSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import ArchitectureSection from '../components/landing/ArchitectureSection';
import AIEngineSection from '../components/landing/AIEngineSection';
import TeamSection from '../components/landing/TeamSection';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  const fadeRef = useFadeIn();

  return (
    <div ref={fadeRef} className="min-h-screen bg-navy">
      <Navbar />

      <Hero />

      <div className="fade-in-section">
        <StatsStrip />
      </div>

      <div className="fade-in-section">
        <ProblemSection />
      </div>

      <div className="fade-in-section">
        <FeaturesSection />
      </div>

      <div className="fade-in-section">
        <ArchitectureSection />
      </div>

      <div className="fade-in-section">
        <AIEngineSection />
      </div>

      <div className="fade-in-section">
        <TeamSection />
      </div>

      <div className="fade-in-section">
        <Footer />
      </div>
    </div>
  );
}
