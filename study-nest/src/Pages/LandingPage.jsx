// LandingPage.jsx
// A Tailwind-based recreation of the Sparrow "Default" home layout (structure & behavior only).
// Uses placeholder copy and royalty-free placeholder images.
// Drop this file into your React + Vite + Tailwind project and import it into your router/App.

import React, { useEffect, useMemo, useRef, useState } from "react";

// ------------------------------
// Helpers
// ------------------------------
function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

function useCountUp({ target = 2000000, duration = 1800, startWhenInView = true }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    let obs;
    function start() {
      if (started.current) return;
      started.current = true;
      const startTs = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - startTs) / duration);
        setValue(Math.floor(target * p));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!startWhenInView) {
      start();
      return;
    }

    if (ref.current) {
      obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && start()),
        { threshold: 0.4 }
      );
      obs.observe(ref.current);
    }
    return () => obs && obs.disconnect();
  }, [target, duration, startWhenInView]);

  return { ref, value };
}

// ------------------------------
// UI: Icons (inline SVG, no extra deps)
// ------------------------------
const PlayIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <path d="M10 8l6 4-6 4z" fill="currentColor" />
  </svg>
);

const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M20.285 6.709a1 1 0 0 1 .006 1.414l-9.193 9.285a1 1 0 0 1-1.419.007L3.71 11.51a1 1 0 1 1 1.414-1.415l5.164 5.163 8.486-8.486a1 1 0 0 1 1.415-.006z"
      fill="currentColor"
    />
  </svg>
);

const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M12 2l2.938 6.037 6.662.97-4.82 4.7 1.138 6.634L12 17.77 6.082 20.34l1.138-6.634-4.82-4.7 6.662-.97L12 2z"
      fill="currentColor"
    />
  </svg>
);

const ArrowRight = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QuoteIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M9 5H5a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9H7V7h2V5zm12 0h-4a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9h-2V7h2V5z" fill="currentColor"/>
  </svg>
);

const socials = [
  { name: "Twitter", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M22.162 5.656c-.77.342-1.6.572-2.472.676a4.32 4.32 0 0 0 1.894-2.38 8.63 8.63 0 0 1-2.733 1.044 4.307 4.307 0 0 0-7.447 3.93A12.225 12.225 0 0 1 3.15 4.9a4.304 4.304 0 0 0 1.333 5.747 4.27 4.27 0 0 1-1.951-.54v.055a4.308 4.308 0 0 0 3.455 4.22 4.3 4.3 0 0 1-1.944.074 4.312 4.312 0 0 0 4.022 2.992A8.636 8.636 0 0 1 2 19.485a12.187 12.187 0 0 0 6.596 1.936c7.913 0 12.24-6.557 12.24-12.24 0-.187-.005-.374-.014-.56a8.74 8.74 0 0 0 2.14-2.23z"/>
      </svg>
    ) },
  { name: "Dribbble", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zm6.59 5.17a7.95 7.95 0 0 1 1.7 4.93 19.8 19.8 0 0 0-6.25-.182 29.5 29.5 0 0 0-1.12-2.5 19.5 19.5 0 0 0 5.67-2.248zM12 4.05c1.9 0 3.65.66 5.02 1.76a17.5 17.5 0 0 1-5.2 2.06A27 27 0 0 0 9.5 5.16 7.93 7.93 0 0 1 12 4.05zM7.23 5.86a25.9 25.9 0 0 1 2.61 2.57 17.2 17.2 0 0 1-6.04 1.14A7.97 7.97 0 0 1 7.23 5.86zM4.06 12c0-.2.01-.39.03-.58 2.8-.05 5.33-.53 7.47-1.35.27.51.52 1.05.76 1.6-.23.06-.47.12-.71.18-2.32.58-4.93 1.24-7.1 3.17A7.92 7.92 0 0 1 4.06 12zm2.29 4.92c1.86-1.66 4.16-2.23 6.34-2.77.3-.07.6-.15.91-.22.53 1.48.97 3.04 1.31 4.64A7.95 7.95 0 0 1 12 19.95c-2.1 0-4.03-.82-5.44-2.15zM16 18.82c-.32-1.7-.76-3.31-1.3-4.76a18 18 0 0 1 4.66.16 7.95 7.95 0 0 1-3.36 4.6z"/>
      </svg>
    ) },
  { name: "YouTube", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M23.5 7.5s-.23-1.64-.93-2.36c-.89-.93-1.88-.93-2.34-.99C16.92 3.8 12 3.8 12 3.8h-.01S7.08 3.8 3.77 4.15c-.46.06-1.45.06-2.34.99C.73 5.86.5 7.5.5 7.5S0 9.6 0 11.7v.58c0 2.1.5 4.2.5 4.2s.23 1.64.93 2.36c.89.93 2.06.9 2.58 1 1.87.18 7.99.23 8 .23 0 0 4.92-.01 8.24-.36.46-.06 1.45-.06 2.34-.99.7-.72.93-2.36.93-2.36S24 14.38 24 12.28v-.58c0-2.1-.5-4.2-.5-4.2zM9.75 14.81V8.88l6.23 2.97-6.23 2.96z"/>
      </svg>
    ) },
];

// ------------------------------
// Sections
// ------------------------------
function Navbar() {
  const [open, setOpen] = useState(false);
  const nav = [
    { label: "Home", href: "#home" },
    { label: "Why", href: "#why" },
    { label: "Inside", href: "#inside" },
    { label: "Process", href: "#process" },
    { label: "Pricing", href: "#pricing" },
    { label: "Team", href: "#team" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold">Sp</span>
            <span className="font-semibold tracking-tight">Sparrow</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-700">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href="#pricing" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Pricing</a>
            <a href="#contact" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Get Started</a>
          </div>

          <button onClick={() => setOpen((s) => !s)} className="md:hidden inline-flex items-center justify-center rounded-xl p-2 text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400" aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="grid gap-4 text-sm">
              <a href="#home" onClick={() => setOpen(false)} className="py-1">Home</a>
              <a href="#why" onClick={() => setOpen(false)} className="py-1">Why</a>
              <a href="#inside" onClick={() => setOpen(false)} className="py-1">Inside</a>
              <a href="#process" onClick={() => setOpen(false)} className="py-1">Process</a>
              <a href="#pricing" onClick={() => setOpen(false)} className="py-1">Pricing</a>
              <a href="#team" onClick={() => setOpen(false)} className="py-1">Team</a>
              <a href="#contact" onClick={() => setOpen(false)} className="py-1">Contact</a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white" />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" /> renovating together
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              <span className="block">Sparrow</span>
              <span className="block">creative</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600">
              Craft delightful product experiences for your brand, seamlessly.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Start a project <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#reel" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">
                Watch the reel
              </a>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-zinc-700">Follow us</p>
              <div className="mt-3 flex items-center gap-3 text-zinc-600">
                {socials.map((s) => (
                  <a key={s.name} href={s.href} aria-label={s.name} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 hover:bg-zinc-50">
                    {s.svg}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=1600&auto=format&fit=crop"
              alt="Hero artwork"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
            />
            <a
              href="#reel"
              className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-lg ring-1 ring-zinc-200 hover:bg-white"
              aria-label="Play reel"
            >
              <PlayIcon className="h-7 w-7" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-700">why sparrow?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">A rock-solid starting point</h2>
            <p className="mt-4 text-zinc-600">
              A flexible set of layouts, thoughtful elements, and utility classes — rigorously tested and optimized — gives you the perfect foundation for landing pages and stylish business sites.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#inside" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Explore features</a>
              <a href="#pricing" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">See pricing</a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop" alt="Workspace" className="h-56 w-full rounded-2xl object-cover shadow-md" />
            <img src="https://images.unsplash.com/photo-1556767576-cfba9fdac0f3?q=80&w=1200&auto=format&fit=crop" alt="Laptop" className="h-56 w-full rounded-2xl object-cover shadow-md" />
            <img src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop" alt="Code" className="h-56 w-full rounded-2xl object-cover shadow-md lg:col-span-2" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Inside() {
  const features = [
    {
      title: "Bootstrap DNA, Tailwind speed",
      body: "All the essentials you expect — translated into fast, utility-first ergonomics.",
    },
    {
      title: "Responsive helpers",
      body: "Toggle styles across breakpoints with simple, expressive classes.",
    },
    {
      title: "32+ elements",
      body: "From sliders to video backgrounds and typed text — use only what you need.",
    },
    {
      title: "Smooth animations",
      body: "Butter-smooth motion powered by modern, GPU-accelerated techniques.",
    },
  ];

  return (
    <section id="inside" className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-zinc-700">bootstrap 5 + much more</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Powerful inside</h2>
            <p className="mt-3 max-w-2xl text-zinc-600">Mix and match building blocks to ship beautiful experiences faster.</p>
          </div>
          <a href="#reel" className="hidden shrink-0 md:inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50">
            <PlayIcon className="h-4 w-4" /> Watch the reel
          </a>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <StarIcon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.body}</p>
              <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 hover:underline">
                Learn more <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    {
      n: "01",
      title: "Plan",
      body: "We discover goals, map the journey, and produce a clear blueprint for the project.",
      img: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1200&auto=format&fit=crop",
    },
    {
      n: "02",
      title: "Design",
      body: "From wireframes to polished comps, we iterate quickly with you and your team.",
      img: "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1200&auto=format&fit=crop",
    },
    {
      n: "03",
      title: "Develop",
      body: "We build with modern tooling, accessibility, and performance top of mind.",
      img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop",
    },
    {
      n: "04",
      title: "Deploy",
      body: "After QA and review, we launch, monitor, and keep improving.",
      img: "https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?q=80&w=1200&auto=format&fit=crop",
    },
  ];

  return (
    <section id="process" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Our process</h2>
          <p className="mt-3 max-w-2xl text-zinc-600">A flexible framework that adapts to your needs — refined by years of shipping websites and campaigns.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {steps.map((s) => (
            <article key={s.n} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
              <img src={s.img} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-6">
                <div className="text-sm font-semibold text-zinc-500">{s.n}</div>
                <h3 className="mt-1 text-xl font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-zinc-600">{s.body}</p>
                <a href="#portfolio" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 hover:underline">View methods <ArrowRight className="h-4 w-4" /></a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-6 text-white">
          <div>
            <h3 className="text-xl font-semibold">Have a website to build?</h3>
            <p className="mt-1 text-sm text-white/80">We can help you ship faster with confidence.</p>
          </div>
          <div className="flex gap-3">
            <a href="#pricing" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">Purchase</a>
            <a href="#contact" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">Talk to us</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Performance() {
  const { ref, value } = useCountUp({ target: 2000000 });
  const testimonials = [
    {
      quote: "Sparrow helps me sleep like a baby — everything just works.",
      author: "Mane Dumas",
      role: "Web Designer",
    },
    {
      quote: "With almost no custom CSS, I can still customize nearly everything.",
      author: "Jane Dumas",
      role: "Developer",
    },
  ];

  return (
    <section className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-700">performance?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Fast by default</h2>
            <p className="mt-3 text-zinc-600">Be surprised by the outcome: modern bundling, smart loading, and minimal runtime overhead.</p>
            <div ref={ref} className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="text-4xl font-extrabold tracking-tight text-zinc-900">{value.toLocaleString()}</div>
              <p className="mt-1 text-sm text-zinc-600">happy customers & counting</p>
              <a href="#stories" className="mt-4 inline-block text-sm font-semibold text-zinc-900 hover:underline">Read user stories</a>
            </div>
          </div>

          <div className="grid gap-6">
            {testimonials.map((t, idx) => (
              <figure key={idx} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
                <QuoteIcon className="h-6 w-6 text-zinc-400" />
                <blockquote className="mt-3 text-zinc-800">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">{t.author}</span> — {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Personal",
      badge: "Forever",
      price: "Free",
      features: [
        "Beautiful campaigns",
        "No design skills needed",
        "Start sending today",
      ],
      cta: { label: "Join now", href: "#" },
    },
    {
      name: "Business",
      badge: "Starting at",
      price: "$10 / month",
      sub: "Save 50%",
      features: [
        "Automation",
        "Workflows & e‑commerce",
        "More tools to refine",
      ],
      highlighted: true,
      cta: { label: "Learn more", href: "#" },
    },
    {
      name: "Enterprise",
      badge: "Additional",
      price: "$199 / year",
      features: [
        "High‑volume features",
        "Multivariate testing",
        "Premium support",
      ],
      cta: { label: "Contact sales", href: "#contact" },
    },
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Find the right plan</h2>
          <p className="mt-3 text-zinc-600">Choose a plan that fits your stage and scale.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={classNames(
                "relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200",
                t.highlighted && "ring-2 ring-zinc-900"
              )}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-700">{t.name.toLowerCase()}</p>
                  <h3 className="mt-1 text-2xl font-bold text-zinc-900">{t.name}</h3>
                </div>
                {t.sub && (
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{t.sub}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-500">{t.badge}</p>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900">{t.price}</div>

              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-700">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white"><CheckIcon className="h-3 w-3" /></span>
                    {f}
                  </li>
                ))}
              </ul>

              <a href={t.cta.href} className={classNames(
                "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                t.highlighted ? "bg-zinc-900 text-white hover:bg-zinc-800" : "border border-zinc-300 hover:bg-zinc-50"
              )}>
                {t.cta.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const people = [
    { name: "Elizabeth Swan", role: "The Lady", img: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=1200&auto=format&fit=crop" },
    { name: "Jack Sparrow", role: "The Man", img: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=1200&auto=format&fit=crop" },
    { name: "Hector Barbossa", role: "The Beta", img: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=1200&auto=format&fit=crop" },
    { name: "Tia Dalma", role: "The Gama", img: "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1200&auto=format&fit=crop" },
    { name: "Angelica Syrena", role: "The Ohm", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop" },
    { name: "Joshame Gibbs", role: "The Pi", img: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?q=80&w=1200&auto=format&fit=crop" },
    { name: "Carina Smyth", role: "The Delta", img: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=1200&auto=format&fit=crop" },
    { name: "Black Beard", role: "The Fi", img: "https://images.unsplash.com/photo-1542382257-80dedb725088?q=80&w=1200&auto=format&fit=crop" },
    { name: "Davy Jones", role: "The Zita", img: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=1200&auto=format&fit=crop" },
    { name: "Pintel & Ragetti", role: "Entertainers", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop" },
  ];

  return (
    <section id="team" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Meet the crews</h2>
          <p className="mt-3 text-zinc-600">A passionate group of designers, developers, and engineers.</p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {people.map((p) => (
            <li key={p.name} className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-zinc-200">
              <img src={p.img} alt={p.name} className="mx-auto aspect-square w-full rounded-2xl object-cover" />
              <a href="#" className="mt-4 block text-sm font-semibold text-zinc-900 hover:underline">{p.name}</a>
              <p className="text-xs text-zinc-600">{p.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery() {
  const imgs = [
    "https://images.unsplash.com/photo-1557093790-6e6a6a6a6a6a?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520975922313-24f955ab3ef2?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop",
  ];

  return (
    <section className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">life@sparrow</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {imgs.map((src, i) => (
            <img key={i} src={src} alt="Life at work" className="aspect-square w-full rounded-2xl object-cover" />
          ))}
        </div>
      </div>
    </section>
  );
}

function CareersCTA() {
  return (
    <section id="contact" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-10 text-white md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start your career with us</h2>
            <p className="mt-3 text-white/80">Join a talented group of artists, engineers, and imagineers.</p>
          </div>
          <div className="md:text-right">
            <a href="#" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
              See openings <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold">Sp</span>
            <span className="text-sm text-zinc-600">© {new Date().getFullYear()} Sparrow™ Inc.</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="#" className="hover:underline">English</a>
            <span className="text-zinc-300">/</span>
            <a href="#" className="hover:underline">Français</a>
            <span className="text-zinc-300">/</span>
            <a href="#" className="hover:underline">عربى</a>
            <span className="text-zinc-300">/</span>
            <a href="#" className="hover:underline">Deutsche</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-white text-zinc-900">
      <Navbar />
      <Hero />
      <Why />
      <Inside />
      <Process />
      <Performance />
      <Pricing />
      <Team />
      <Gallery />
      <CareersCTA />
      <Footer />
    </main>
  );
}
