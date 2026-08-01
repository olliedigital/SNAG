import type { Metadata } from "next";

export const metadata: Metadata = { title: "SNAG — Privacy Policy" };

const UPDATED = "August 2026";
const CONTACT = "oliver.austria@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <a href="/" className="font-display text-2xl font-extrabold tracking-[-0.01em]">
        SNAG<span className="text-live">.</span>
      </a>
      <h1 className="mt-8 font-display text-4xl font-black uppercase tracking-[-0.02em]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-bone/45">Last updated {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-bone/75">
        <p>
          SNAG watches sneaker marketplaces and alerts you when a pair on your watchlist drops below what it should
          cost. This policy explains what we collect and why. We keep it minimal on purpose.
        </p>

        <Section title="What we collect">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>The sneakers you add to your watchlist, and any strike price you set.</li>
            <li>Your email address, only if you provide it to receive deal alerts.</li>
            <li>
              If you enable notifications, a device push token — an anonymous identifier from Apple used solely to send
              you alerts. It is not tied to your name or account.
            </li>
            <li>Basic, non-identifying usage needed to operate the service.</li>
          </ul>
          <p className="mt-2">
            SNAG has no user accounts and never asks for or stores payment information. When you buy a pair, you do it
            directly on the seller&rsquo;s own site — SNAG only links you there.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            Only to run the product: to search for the sneakers you asked us to watch, decide whether a listing is a
            good deal, and notify you by email and/or push notification. That&rsquo;s it.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>We do not sell your data. We use a small set of service providers to operate SNAG:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1.5">
            <li>Marketplace and price sources (e.g. eBay, Google Shopping) — to find listings.</li>
            <li>Supabase (database) and Vercel (hosting) — to store your watchlist and run the service.</li>
            <li>Resend (email) and Apple Push Notification service — to deliver your alerts.</li>
          </ul>
        </Section>

        <Section title="Your choices">
          <p>
            You can remove any watched item at any time, turn off notifications in your device settings, and ask us to
            delete your data by emailing us. We&rsquo;ll erase what we hold on request.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or a deletion request? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-live underline">
              {CONTACT}
            </a>
            .
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
