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
const PlayIcon = ({ className }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Circle outline */}
    <circle
      cx="50"
      cy="50"
      r="45"
      stroke="white"
      strokeWidth="6"
      opacity="0.9"
    />
    {/* Play triangle */}
    <polygon
      points="40,30 70,50 40,70"
      fill="white"
    />
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
    <path d="M9 5H5a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9H7V7h2V5zm12 0h-4a2 2 0 0 0-2 2v4a4 4 0 0 0 4 4h2V9h-2V7h2V5z" fill="currentColor" />
  </svg>
);

const socials = [
  {
    name: "Twitter", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M22.162 5.656c-.77.342-1.6.572-2.472.676a4.32 4.32 0 0 0 1.894-2.38 8.63 8.63 0 0 1-2.733 1.044 4.307 4.307 0 0 0-7.447 3.93A12.225 12.225 0 0 1 3.15 4.9a4.304 4.304 0 0 0 1.333 5.747 4.27 4.27 0 0 1-1.951-.54v.055a4.308 4.308 0 0 0 3.455 4.22 4.3 4.3 0 0 1-1.944.074 4.312 4.312 0 0 0 4.022 2.992A8.636 8.636 0 0 1 2 19.485a12.187 12.187 0 0 0 6.596 1.936c7.913 0 12.24-6.557 12.24-12.24 0-.187-.005-.374-.014-.56a8.74 8.74 0 0 0 2.14-2.23z" />
      </svg>
    )
  },
  {
    name: "Dribbble", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zm6.59 5.17a7.95 7.95 0 0 1 1.7 4.93 19.8 19.8 0 0 0-6.25-.182 29.5 29.5 0 0 0-1.12-2.5 19.5 19.5 0 0 0 5.67-2.248zM12 4.05c1.9 0 3.65.66 5.02 1.76a17.5 17.5 0 0 1-5.2 2.06A27 27 0 0 0 9.5 5.16 7.93 7.93 0 0 1 12 4.05zM7.23 5.86a25.9 25.9 0 0 1 2.61 2.57 17.2 17.2 0 0 1-6.04 1.14A7.97 7.97 0 0 1 7.23 5.86zM4.06 12c0-.2.01-.39.03-.58 2.8-.05 5.33-.53 7.47-1.35.27.51.52 1.05.76 1.6-.23.06-.47.12-.71.18-2.32.58-4.93 1.24-7.1 3.17A7.92 7.92 0 0 1 4.06 12zm2.29 4.92c1.86-1.66 4.16-2.23 6.34-2.77.3-.07.6-.15.91-.22.53 1.48.97 3.04 1.31 4.64A7.95 7.95 0 0 1 12 19.95c-2.1 0-4.03-.82-5.44-2.15zM16 18.82c-.32-1.7-.76-3.31-1.3-4.76a18 18 0 0 1 4.66.16 7.95 7.95 0 0 1-3.36 4.6z" />
      </svg>
    )
  },
  {
    name: "YouTube", href: "#", svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M23.5 7.5s-.23-1.64-.93-2.36c-.89-.93-1.88-.93-2.34-.99C16.92 3.8 12 3.8 12 3.8h-.01S7.08 3.8 3.77 4.15c-.46.06-1.45.06-2.34.99C.73 5.86.5 7.5.5 7.5S0 9.6 0 11.7v.58c0 2.1.5 4.2.5 4.2s.23 1.64.93 2.36c.89.93 2.06.9 2.58 1 1.87.18 7.99.23 8 .23 0 0 4.92-.01 8.24-.36.46-.06 1.45-.06 2.34-.99.7-.72.93-2.36.93-2.36S24 14.38 24 12.28v-.58c0-2.1-.5-4.2-.5-4.2zM9.75 14.81V8.88l6.23 2.97-6.23 2.96z" />
      </svg>
    )
  },
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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-white font-bold"><img src="src/assets/logo.png" alt="Study-Nest-Logo" className="h-full w-full" /></span>
            <span className="font-semibold tracking-tight">StudyNest</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-700">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href="/signup" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Signup</a>
            <a href="/login" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Login</a>
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
  const images = [
    "https://www.uiu.ac.bd/wp-content/uploads/2023/12/IMG_1752-Edited.jpg",
    "https://ciac.uiu.ac.bd/wp-content/uploads/2022/01/canteen.jpg",
    "https://westcoastuniversity.edu/wp-content/uploads/2023/03/WCU-Blog_StudyBuddy-VirtualStudyGroup.jpg",
    "https://i.pinimg.com/1200x/95/42/dc/9542dcfeeb674eb281caf1bf1977677b.jpg",
    "https://i.pinimg.com/1200x/44/8e/b3/448eb3654f309cde7392d18ec811f95b.jpg",
    "https://i.pinimg.com/1200x/73/fb/bd/73fbbd7f9b4d0faf3248be25aeb74ed8.jpg",
  ];

  const [current, setCurrent] = useState(0);

  // Auto-swipe every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % images.length);
  };

  return (
    <section id="home" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white" />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* LEFT TEXT */}
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-l bg-zinc-900 px-3 py-1 text-2xl font-semibold text-white">STUDY TOGETHER</p>
            <h1 className="text-4xl tracking-tight text-zinc-900 sm:text-5xl">
              <span className="block text-7xl tracking-widest font-extrabold font-sans underline">Study</span>
              <span className="block text-7xl font-light tracking-wide">Nest</span>
            </h1>
            <p className="mt-9 max-w-xl text-base leading-8 text-zinc-600 font-serif">
              Connect, collaborate, and learn together with peers at United
              International University. Build knowledge, share resources, and
              grow as a community.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Join a Group <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* RIGHT SLIDER */}
          <div className="relative w-full">
            <img
              src={images[current]}
              alt="UIU Student Activities"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl transition-all duration-700"
            />

            {/* LEFT ARROW */}
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 shadow hover:bg-white"
              aria-label="Previous"
            >
              ‹
            </button>

            {/* RIGHT ARROW */}
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 shadow hover:bg-white"
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-center text-4xl sm:text-5xl font-extrabold tracking-tight underline underline-offset-8 decoration-black lowercase">
          why studynest?
        </h2>

        {/* 3-column layout with vertical centering */}
        <div className="mt-10 grid gap-10 md:grid-cols-3 items-center">
          {/* Left: italic paragraph */}
          <div className="text-center md:text-right">
            <p className="mx-auto max-w-md text-xl leading-8 italic text-zinc-600">
              Studying alone can feel overwhelming.
              With StudyNest you can connect with
              peers, share resources, and learn
              collaboratively — turning challenges
              into opportunities for growth.
            </p>
          </div>

          {/* Middle: tall image */}
          <div className="flex justify-center">
            <img
              src="https://images.stockcake.com/public/8/2/8/828a6567-801e-4b49-bb13-28ab39e847cb_large/group-study-session-stockcake.jpg"
              alt="Students collaborating at UIU"
              className="h-[520px] w-full max-w-sm rounded-2xl object-cover shadow-md"
            />
          </div>

          {/* Right: title + paragraph */}
          <div className="text-center md:text-left">
            <div>
              <h3 className="text-2xl font-extrabold text-zinc-900">
                built for uiu students
              </h3>
              <p className="mt-3 max-w-md text-zinc-600 leading-7">
                StudyNest makes it easy to find study groups,
                collaborate on projects, and exchange ideas
                within United International University.
                Build friendships while excelling
                academically — all in one platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Watch reel
function getYouTubeId(url) {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function VideoSection({ youtubeUrl }) {
  const id = useMemo(() => getYouTubeId(youtubeUrl), [youtubeUrl]);
  const bg = id
    ? `https://png.pngtree.com/thumb_back/fh260/background/20240914/pngtree-diverse-group-of-students-studying-in-a-library-with-open-books-image_16203293.jpg`
    : "https://img.youtube.com/vi/${id}/maxresdefault.jpg"; // fallback

  const [open, setOpen] = useState(false);

  return (
    <section id="reel" className="relative">
      {/* Parallax background */}
      <div
        className="relative bg-fixed bg-center bg-cover"
        style={{ backgroundImage: `url(${bg})` }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Centered play button + label */}
        <div className="relative min-h-[65vh] sm:min-h-[75vh] grid place-items-center">
          <button
            onClick={() => setOpen(true)}
            className="group inline-flex flex-col items-center"
            aria-label="Play promo video"
          >
            <span className="grid place-items-center w-24 h-24 rounded-full bg-white/15 ring-1 ring-white/50 backdrop-blur transition-transform group-hover:scale-105">
              <PlayIcon className="h-10 w-10 text-white" />
            </span>
            <span className="mt-3 text-white font-semibold tracking-wide">
              watch the reel
            </span>
          </button>
        </div>
      </div>

      {/* Modal player */}
      {open && id && (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title="StudyNest Promo"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-zinc-900 hover:bg-white"
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}


function Inside() {
  const features = [
    {
      title: "Find Your Group Easily",
      body: "Search and join study groups by subject, semester, or interest to connect with the right peers.",
    },
    {
      title: "Collaboration Made Simple",
      body: "Share notes, resources, and assignments with your group in a structured and easy way.",
    },
    {
      title: "Stay Organized",
      body: "Track group schedules, upcoming study sessions, and deadlines all in one place.",
    },
    {
      title: "Build Community",
      body: "Engage in discussions, motivate each other, and grow together at United International University.",
    },
  ];

  return (
    <section id="inside" className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-zinc-700">studynest features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Powerful for Students
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-600">
              StudyNest helps UIU students collaborate smarter, stay motivated, and achieve academic success together.
            </p>
          </div>
          <a
            href="#reel"
            className="hidden shrink-0 md:inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            <PlayIcon className="h-4 w-4" /> Watch the reel
          </a>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <StarIcon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-600">{f.body}</p>
              <a
                href="/login"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 hover:underline"
              >
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
      title: "Create or Join Groups",
      body:
        "Find the right peers by course, semester, or interest. Create open or private groups and start collaborating instantly.",
      img: "https://www.uiu.ac.bd/wp-content/uploads/2023/12/IMG_1752-Edited.jpg",
    },
    {
      n: "02",
      title: "Smart Scheduling",
      body:
        "Plan study sessions with built‑in calendar, availability polls, and reminders so everyone stays on track.",
      img: "https://byu-pathway.brightspotcdn.com/dims4/default/1a670e9/2147483647/strip/true/crop/1266x662+0+0/resize/600x314!/quality/90/?url=http%3A%2F%2Fbyu-pathway-brightspot.s3.amazonaws.com%2Fba%2F31%2F008d47e240489ef92100d2f52503%2Fdiseno-sin-titulo-14.png",
    },
    {
      n: "03",
      title: "Share Notes & Resources",
      body:
        "Upload lecture notes, past questions, links, and files. Organize everything by course topics for quick access.",
      img: "https://i.ytimg.com/vi/xVXGTvoLndw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBkdO5k77WuIIbXf_rSvC3NSolgvQ",
    },
    {
      n: "04",
      title: "Track Progress & Motivate",
      body:
        "Set goals, checklist tasks, and celebrate wins together. Stay accountable and improve every week.",
      img: "https://www.deprocrastination.co/assets/illustrations/uncertain_feedback.png",
    },
  ];

  return (
    <section id="process" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            StudyNest features
          </h2>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Everything UIU students need to learn together — from forming groups
            to sharing resources and staying organized.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {steps.map((s) => (
            <article
              key={s.n}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200"
            >
              <img src={s.img} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-6">
                <div className="text-sm font-semibold text-zinc-500">{s.n}</div>
                <h3 className="mt-1 text-xl font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-zinc-600">{s.body}</p>
                <a
                  href="/login"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 hover:underline"
                >
                  Learn more <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-6 text-white">
          <div>
            <h3 className="text-xl font-semibold">Ready to study together?</h3>
            <p className="mt-1 text-sm text-white/80">
              Create a StudyNest group or browse active groups at UIU.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/login"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Create a group
            </a>
            <a
              href="/login"
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Browse groups
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Performance() {
  const { ref, value } = useCountUp({ target: 15000, duration: 2000 });
  const testimonials = [
    {
      quote:
        "StudyNest made it easy to find a CSE220 group before midterms. We shared notes, set goals, and my grade went up.",
      author: "Rafi Ahmed",
      role: "CSE, UIU",
    },
    {
      quote:
        "Scheduling sessions and keeping resources in one place removed so much stress. Our team finally stayed consistent.",
      author: "Nusrat Jahan",
      role: "EEE, UIU",
    },
  ];

  return (
    <section className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-700">impact @ uiu</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Learn better, together
            </h2>
            <p className="mt-3 text-zinc-600">
              StudyNest helps UIU students connect, plan focused sessions, and
              track progress—so learning feels organized and achievable.
            </p>

            <div
              ref={ref}
              className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
            >
              <div className="text-4xl font-extrabold tracking-tight text-zinc-900">
                {value.toLocaleString()}
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                study sessions scheduled
              </p>
              <a
                href="/login"
                className="mt-4 inline-block text-sm font-semibold text-zinc-900 hover:underline"
              >
                Join a group
              </a>
            </div>
          </div>

          <div className="grid gap-6">
            {testimonials.map((t, idx) => (
              <figure
                key={idx}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
              >
                <QuoteIcon className="h-6 w-6 text-zinc-400" />
                <blockquote className="mt-3 text-zinc-800">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">{t.author}</span>{" "}
                  — {t.role}
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
      cta: { label: "Join now", href: "/login" },
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
      cta: { label: "Learn more", href: "/login" },
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
      cta: { label: "Contact sales", href: "/login" },
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
    {
      name: "Shariful Islam",
      role: "Team Lead & Full Stack Developer",
      img: "https://i.pinimg.com/1200x/b9/35/23/b93523661e3d3caccf3e9a82e562ee84.jpg",
    },
    {
      name: "Mahmudul Hasan",
      role: "Full Stack Developer",
      img: "https://i.pinimg.com/1200x/82/6f/d5/826fd55fd0a04225cc625368d7e8476c.jpg",
    },
  ];

  return (
    <section id="team" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Meet the team
          </h2>
          <p className="mt-3 text-zinc-600">
            A passionate group of students and builders behind StudyNest.
          </p>
        </div>

        {/* Exactly 4 cards */}
        <ul className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
          {people.map((p) => (
            <li
              key={p.name}
              className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-zinc-200"
            >
              <img
                src={p.img}
                alt={p.name}
                className="mx-auto aspect-square w-full rounded-2xl object-cover"
              />
              <a
                href="/login"
                className="mt-4 block text-sm font-semibold text-zinc-900 hover:underline"
              >
                {p.name}
              </a>
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
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=3840&auto=format&fit=crop",
    "https://images.pexels.com/photos/15244082/pexels-photo-15244082/free-photo-of-hands-of-a-group-of-students-studying-together-around-a-table.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=85&w=3840&auto=format&fit=crop",
    "https://images.stockcake.com/public/b/2/3/b23d669d-d751-45e7-af44-94cc97af960c_large/students-studying-together-stockcake.jpg",
    "https://webusupload.apowersoft.info/gitmind/wp-content/uploads/2019/10/study-tool.jpg",
    "https://static.vecteezy.com/system/resources/thumbnails/026/309/247/small/robot-chat-or-chat-bot-logo-modern-conversation-automatic-technology-logo-design-template-vector.jpg",
    "https://internetmarketingteam.com/wp-content/uploads/2020/06/Depositphotos_5633878_l-2015-e1591268647775.jpg",
    "https://assets3.cbsnewsstatic.com/hub/i/r/2023/11/28/8c7104bf-6624-47fd-b053-c25beb077f2c/thumbnail/1200x630/89d189dbac8a95620748324c8552c60f/cbsn-fusion-study-finds-zoom-fatigue-may-affect-brain-and-heart-thumbnail-2484223-640x360.jpg",
  ];

  return (
    <section className="bg-zinc-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          life@studynest
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {imgs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="StudyNest student life and study groups"
              loading="lazy"
              className="aspect-square w-full rounded-2xl object-cover"
            />
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
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Study together at UIU
            </h2>
            <p className="mt-3 text-white/80">
              Create or join study groups, plan sessions, and share resources — all in one place.
            </p>
            <p className="mt-2 text-xs text-white/60">
              Use your UIU email to get started.
            </p>
          </div>
          <div className="md:text-right flex flex-wrap gap-3 md:justify-end">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Create a group <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse groups
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-4 sm:p-6 ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} StudyNest, UIU. All rights reserved.
            </p>

            <div className="flex items-center gap-5 text-zinc-400">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="rounded hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M22 12A10 10 0 1 0 10.5 21.9v-7.1H8v-3h2.5V9.6a3.6 3.6 0 0 1 3.9-3.9c.8 0 1.6.1 1.6.1v2.2h-.9c-.9 0-1.2.54-1.2 1.1V11H18l-.5 3h-2.6v7A10 10 0 0 0 22 12z"
                  />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="rounded hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM18 6.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                  />
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href="#"
                aria-label="X"
                className="rounded hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M3 2h3.4l6 7.6L18.5 2H22l-7.6 9 7.9 11H18l-6-8-6.2 8H2l8.4-10.5L3 2z"
                  />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="#"
                aria-label="GitHub"
                className="rounded hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.11.79-.25.79-.56v-2c-3.23.7-3.91-1.4-3.91-1.4-.53-1.35-1.3-1.71-1.3-1.71-1.07-.74.09-.73.09-.73 1.18.08 1.8 1.21 1.8 1.21 1.05 1.8 2.76 1.28 3.43.98.11-.77.41-1.28.75-1.57-2.58-.29-5.3-1.29-5.3-5.74 0-1.27.46-2.31 1.2-3.13-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.19a10.9 10.9 0 0 1 5.8 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.23 2.77.11 3.06.75.82 1.2 1.86 1.2 3.13 0 4.46-2.72 5.44-5.31 5.73.42.36.8 1.06.8 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5z"
                  />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="#"
                aria-label="YouTube"
                className="rounded hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M23.5 7.5s-.23-1.64-.93-2.36c-.89-.93-1.88-.93-2.34-.99C16.92 3.8 12 3.8 12 3.8S7.08 3.8 3.77 4.15c-.46.06-1.45.06-2.34.99C.73 5.86.5 7.5.5 7.5S0 9.6 0 11.7v.58c0 2.1.5 4.2.5 4.2s.23 1.64.93 2.36c.89.93 2.06.9 2.58 1 1.87.18 7.99.23 8 .23 0 0 4.92-.01 8.24-.36.46-.06 1.45-.06 2.34-.99.7-.72.93-2.36.93-2.36S24 14.38 24 12.28v-.58c0-2.1-.5-4.2-.5-4.2zM9.75 14.81V8.88l6.23 2.97-6.23 2.96z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-[#f5f5dd] text-zinc-900">
      <Navbar />
      <Hero />
      <Why />
      <VideoSection youtubeUrl="https://youtu.be/c_i8x8M0Gzg" />
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
