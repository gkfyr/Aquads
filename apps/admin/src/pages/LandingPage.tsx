import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import NavBar from "../components/NavBar";

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace(/^#/, "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location]);

  return (
    <div className="min-h-full font-[Inter]">
      {/* Hero */}
      <header className="hero border-b border-white/5">
        <NavBar />
        <div className="relative mx-auto max-w-7xl px-6 py-16 min-h-[70vh] flex items-center justify-center">
          <div
            className="absolute -inset-x-20 -top-10 h-40 bg-brand-gradient blur-3xl opacity-30 pointer-events-none"
            aria-hidden
          />

          <div className="relative max-w-3xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 mb-4 reveal"
              style={{ animationDelay: ".05s" }}
            >
              <span className="h-2 w-2 rounded-full bg-brand-400" />
              Live on Sui Testnet
            </div>
            <h1
              className="reveal text-4xl sm:text-5xl font-semibold leading-tight text-white"
              style={{ animationDelay: ".1s" }}
            >
              Aquads — Ads on Sui, built for speed
            </h1>
            <p className="reveal text-slate-300 mt-4 text-base sm:text-lg" style={{ animationDelay: ".2s" }}>
              Monetize instantly. Bid, lock, and update creatives that go live in seconds — fast and cheap advertising
              platform powered by Sui.
            </p>
            <p className="reveal text-slate-400 mt-2 text-sm sm:text-base" style={{ animationDelay: ".25s" }}>
              Aquads turns ad inventory into programmable slots on Sui. Advertisers compete in open auctions, publishers
              get paid the moment bids settle, and creatives propagate globally in a blink.
            </p>
            <div className="reveal mt-6 flex flex-wrap gap-3 justify-center" style={{ animationDelay: ".3s" }}>
              <Link to="/" className="btn-primary">
                Open Marketplace
              </Link>
              <Link to="/admin" className="btn-outline">
                For Publishers
              </Link>
              <Link to="/swap" className="btn-outline">
                Swap / Deposit
              </Link>
            </div>
            <div
              className="reveal mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"
              style={{ animationDelay: ".35s" }}
            >
              <div className="surface px-3 py-2">⚡ Fast settlement</div>
              <div className="surface px-3 py-2">🧩 Drop‑in embed</div>
              <div className="surface px-3 py-2">🔎 Verifiable updates</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <main className="mx-auto max-w-7xl px-6 py-12 space-y-16">
        <section id="features" className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon="⚡"
            title="Instant payouts"
            body={
              <>
                Funds land in your wallet as soon as bids clear. No invoices or delays — just direct SUI transfers to
                your address.
              </>
            }
            delay={0.05}
          />
          <FeatureCard
            icon="🧩"
            title="Drop‑in embed"
            body={
              <>
                Add one script tag and mount by selector.
                <pre className="mt-3 rounded-md bg-black/60 border border-white/10 p-3 text-xs text-slate-200 overflow-auto">
                  {`<script src="/sdk/aquads.umd.js"></script>
<script>window.Aquads.mount('#slot', { slotId: '0x...' })</script>`}
                </pre>
                Works with any site or framework — no build steps required.
              </>
            }
            delay={0.1}
          />
          <FeatureCard
            icon="🔒"
            title="Buyouts & locks"
            body={
              <>
                Lock a slot or buy it out. Multiple creatives can rotate when unlocked, and changes propagate instantly.
              </>
            }
            delay={0.15}
          />
        </section>

        <section className="max-w-3xl mx-auto text-center">
          <h3 className="reveal text-xl font-semibold text-white" style={{ animationDelay: ".05s" }}>
            Built for advertisers & publishers
          </h3>
          <p className="reveal mt-3 text-slate-300" style={{ animationDelay: ".1s" }}>
            Advertisers get an open market with immediate placement and verifiable delivery. Publishers set reserves,
            lock windows, and page targeting — with SUI settling directly to their wallets.
          </p>
          <p className="reveal mt-3 text-slate-400" style={{ animationDelay: ".15s" }}>
            Under the hood, slots are shared objects on Sui. Events drive real‑time state in a lightweight indexer, and
            the SDK fetches the latest creative for seamless rendering. It’s fast, transparent, and composable.
          </p>
        </section>

        <section id="why" className="surface p-6 text-center">
          <h2 className="text-xl font-semibold text-white reveal" style={{ animationDelay: ".05s" }}>
            Why Aquads
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Transparent pricing", "On‑chain bids & events — no black boxes."],
              ["Performance‑friendly", "Tiny client, responsive slots, rotating creatives."],
              ["Publisher‑first", "Your slots, your rules. Reserves, locks, targeting."],
              ["Dev‑ready", "HTTP APIs + lightweight SDK. Swap/Deposit tools included."],
            ].map(([t, d], i) => (
              <li key={t} className="reveal" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-medium text-white">{t}</div>
                  <div className="text-sm text-slate-300">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="text-center">
          <div className="reveal text-2xl font-semibold text-white" style={{ animationDelay: ".05s" }}>
            Ready to launch your first slot?
          </div>
          <div className="reveal text-slate-300 mt-2" style={{ animationDelay: ".1s" }}>
            Create a slot, set a reserve, and upload a creative. Start earning today.
          </div>
          <div className="reveal mt-6 flex justify-center gap-3" style={{ animationDelay: ".15s" }}>
            <Link to="/admin" className="btn-primary">
              Get Started
            </Link>
            <Link to="/" className="btn-outline">
              Browse Market
            </Link>
            <Link to="/swap" className="btn-outline">
              Swap / Deposit
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  delay,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className="card p-6 reveal text-center" style={{ animationDelay: `${delay || 0}s` }}>
      <div className="text-2xl select-none">{icon}</div>
      <div className="mt-2 text-base font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{body}</div>
    </div>
  );
}
