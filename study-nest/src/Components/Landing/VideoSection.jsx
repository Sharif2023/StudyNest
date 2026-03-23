import React, { useMemo, useState } from "react";
import { PlayIcon } from "./LandingShared";

function getYouTubeId(url) {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function VideoSection({ youtubeUrl }) {
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
            <span className="grid place-items-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm transition-transform group-hover:scale-110">
              <PlayIcon className="h-20 w-20 text-white" />
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
