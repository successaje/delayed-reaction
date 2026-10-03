import { Developers } from '@/components/landing/developers';
import { FireTv } from '@/components/landing/fire-tv';
import { ClosingCta, Footer } from '@/components/landing/footer';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingNav } from '@/components/landing/nav';
import { Problem } from '@/components/landing/problem';
import { SpoilerSafe } from '@/components/landing/spoiler-safe';

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <SpoilerSafe />
        <FireTv />
        <Developers />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
