import React from "react";

export default function Footer({ sidebarWidth = 72 }) {
  return (
    <footer
      className="bg-slate-950 dark:bg-slate-950 bottom-0 left-0 w-full"
      style={{ paddingLeft: sidebarWidth }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white dark:bg-zinc-900/40 p-4 sm:p-6 ring-1 ring-zinc-200 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} StudyNest, UIU. All rights reserved.
            </p>

            <div className="flex items-center gap-5 text-zinc-400 dark:text-zinc-500">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="rounded hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
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
                className="rounded hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
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
                className="rounded hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
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
                className="rounded hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
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
                className="rounded hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/30"
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
