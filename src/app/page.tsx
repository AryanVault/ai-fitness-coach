import Link from "next/link";
import { BrandMark, OutwardArrow } from "@/components/brand/BrandMark";
import { MovementStudy } from "@/components/brand/MovementStudy";

export default function HomePage() {
  const signInHref = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? "/sign-in"
    : "/login";
  return (
    <main id="main-content" className="studio-home">
      <section className="studio-first-screen" aria-labelledby="home-title">
        <header className="studio-nav">
          <Link href="/" className="studio-brand" aria-label="FitCoach home">
            <BrandMark />
            FitCoach<span>Practice makes progress.</span>
          </Link>
          <nav aria-label="Main navigation">
            <a href="#the-practice">The practice</a>
            <a href="#your-data">Your data</a>
            <Link href={signInHref}>
              Sign in <OutwardArrow />
            </Link>
          </nav>
        </header>
        <div className="studio-heading">
          <h1 id="home-title">Move with intent.</h1>
          <p>
            Personal coaching.
            <br />A practice that’s yours.
          </p>
        </div>
        <MovementStudy />
        <div className="studio-hero-bottom">
          <p>
            Build a rhythm.
            <br /> Understand your movement. Keep showing up.
          </p>
          <Link className="studio-action" href="/onboarding">
            Find your starting point <OutwardArrow />
          </Link>
        </div>
      </section>
      <section
        id="the-practice"
        className="practice-section"
        aria-labelledby="practice-title"
      >
        <div className="practice-intro">
          <h2 id="practice-title">
            A coach for the
            <br />
            way you move.
          </h2>
          <p>
            From the first rep to the next small win. Bring your training, food
            and recovery into the same conversation.
          </p>
        </div>
        <div className="practice-index">
          <Link href="/coach/workout" className="practice-row">
            <span className="practice-index-number">01</span>
            <div>
              <h3>See your movement.</h3>
              <p>
                Use your camera for rep tracking and rule-based form cues.
                Review the evidence after each session.
              </p>
            </div>
            <span className="practice-row-action">
              Workout coach <OutwardArrow />
            </span>
          </Link>
          <Link href="/coach/dance" className="practice-row">
            <span className="practice-index-number">02</span>
            <div>
              <h3>Find your rhythm.</h3>
              <p>
                Work through the starter hip-hop course with guided practice and
                phrase timing.
              </p>
            </div>
            <span className="practice-row-action">
              Dance studio <OutwardArrow />
            </span>
          </Link>
          <Link href="/nutrition" className="practice-row">
            <span className="practice-index-number">03</span>
            <div>
              <h3>Support the work.</h3>
              <p>
                Plan meals, log your nutrition and check in on how you feel.
                Give your coach useful context.
              </p>
            </div>
            <span className="practice-row-action">
              Food & recovery <OutwardArrow />
            </span>
          </Link>
        </div>
      </section>
      <section
        id="your-data"
        className="data-section"
        aria-labelledby="data-title"
      >
        <BrandMark className="data-mark" />
        <h2 id="data-title">
          Your camera.
          <br />
          Your space.
        </h2>
        <div className="data-copy">
          <p className="data-lead">
            Camera frames are processed on your device. Your camera starts only
            when you choose.
          </p>
          <p>
            Session summaries and form evidence can be saved to your account.
            Export your data or delete your account in Settings.
          </p>
          <p className="data-note">
            FitCoach is in beta. Movement cues are estimates, not medical
            advice. Learned posture models remain disabled while validation is
            incomplete.
          </p>
          <Link href="/review-lab/methodology">
            Read how feedback works <OutwardArrow />
          </Link>
        </div>
      </section>
      <footer className="studio-footer">
        <Link href="/" className="footer-brand">
          <BrandMark />
          FitCoach
        </Link>
        <p>A little practice. A little progress.</p>
        <div>
          <Link href={signInHref}>Sign in</Link>
          <Link href="/review-lab/methodology">Methodology</Link>
          <span>© {new Date().getFullYear()} FitCoach</span>
        </div>
      </footer>
    </main>
  );
}
