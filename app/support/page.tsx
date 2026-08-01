import type { Metadata } from "next";

export const metadata: Metadata = { title: "SNAG — Support" };

const CONTACT = "oliver.austria@gmail.com";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <a href="/" className="font-display text-2xl font-extrabold tracking-[-0.01em]">
        SNAG<span className="text-live">.</span>
      </a>
      <h1 className="mt-8 font-display text-4xl font-black uppercase tracking-[-0.02em]">Support</h1>
      <p className="mt-2 text-sm text-bone/45">Your personal sneaker deal agent.</p>

      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-bone/75">
        <p>
          SNAG watches eBay, StockX, GOAT and more — 24/7 — and pings you the second a verified pair on your watchlist
          drops below what it should cost.
        </p>

        <Section title="Getting started">
          <ol className="ml-5 list-decimal space-y-1.5">
            <li>Add a sneaker to your watchlist (model, size, colorway).</li>
            <li>Optionally set a strike price — your win number.</li>
            <li>SNAG hunts every hour and alerts you when a deal or your strike hits.</li>
            <li>Tap the deal to go straight to the listing and buy it yourself.</li>
          </ol>
        </Section>

        <Section title="Notifications">
          <p>
            To get push alerts, allow notifications when the app asks. You can change this anytime in{" "}
            <span className="text-bone">Settings → Notifications → SNAG</span>. Deal alerts are also available by email.
          </p>
        </Section>

        <Section title="Frequently asked">
          <p className="font-semibold text-bone">Does SNAG buy shoes for me?</p>
          <p className="mb-3">
            No. SNAG surfaces the deal and links you to the seller&rsquo;s own page — you complete the purchase
            yourself. This keeps you in control and within each marketplace&rsquo;s rules.
          </p>
          <p className="font-semibold text-bone">Why am I seeing a certain price?</p>
          <p>
            Every deal is checked against the going rate across the listings SNAG tracks for that shoe, so you can see
            exactly how far under market it is.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Need help, found a bug, or want a feature? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-live underline">
              {CONTACT}
            </a>{" "}
            and we&rsquo;ll get back to you.
          </p>
        </Section>
      </div>

      <a href="/" className="mt-12 inline-block text-sm text-bone/45 underline">
        ← Back to SNAG
      </a>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-[0.02em] text-bone">{title}</h2>
      {children}
    </section>
  );
}
