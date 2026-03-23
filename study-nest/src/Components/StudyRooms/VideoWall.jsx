import React, { useEffect, useRef, useMemo } from "react";
import { Users } from "lucide-react";

export function MediaVideo({ stream, muted, className, videoId }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      const p = el.play();
      if (p?.catch) p.catch(() => { });
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      id={videoId}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}

export function TileFooter({ title, mutedBadge = false, handUp = false, onFullscreen }) {
  return (
    <div className="absolute left-6 bottom-6 flex items-center gap-3 rounded-2xl bg-black/50 backdrop-blur-xl px-4 py-2 text-[10px] text-white border border-white/10 shadow-2xl">
      <span className="font-bold uppercase tracking-widest">{title}</span>
      {mutedBadge && <span className="rounded-full bg-rose-500 px-2 py-0.5 font-bold uppercase text-[8px]">muted</span>}
      {handUp && <span className="text-lg">✋</span>}
      <button
        className="ml-2 text-white hover:text-slate-400 transition-colors"
        onClick={onFullscreen}
        title="Toggle fullscreen"
      >
        <svg className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}

export function ScreenWall({ screens, toggleFullTile }) {
  const colClass =
    screens.length === 1 ? "grid-cols-1" :
      screens.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={`grid ${colClass} gap-4 sm:gap-6`}>
      {screens.map((s) => (
        <div
          key={s.id}
          id={`tile-${s.id}`}
          className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-zinc-700 shadow-lg aspect-video"
        >
          {s.stream ? (
            <MediaVideo
              videoId={`video-${s.id}`}
              stream={s.stream}
              muted={s.self}
              className="h-full w-full object-contain bg-black"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-slate-400 bg-white/5 font-semibold text-xs">Connecting...</div>
          )}

          <TileFooter
            title={s.self ? "You (screen)" : (s.name || "Student")}
            onFullscreen={() => toggleFullTile(`tile-${s.id}`)}
          />
        </div>
      ))}
    </div>
  );
}

export function PeopleWall({ cams, placeholders, mic, toggleFullTile }) {
  const tiles = [...cams, ...placeholders];

  if (tiles.length === 0) return null;

  return (
    <div
      className="grid gap-4 sm:gap-6"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
    >
      {tiles.map((t) => {
        const isPlaceholder = t.type === "placeholder";
        return (
          <div
            key={t.id}
            id={`tile-${t.id}`}
            className="relative overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl aspect-video group"
          >
            {isPlaceholder ? (
              <div className="h-full w-full grid place-items-center text-slate-400 bg-white/5 ">
                <div className="text-center group-hover:scale-110 transition-transform duration-700">
                   <div className="w-16 h-16 rounded-full bg-white/5 shadow-xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                     <Users className="h-8 w-8 text-white/50" />
                   </div>
                   <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-white">
                     {t.name} {t.state !== 'connected' && <span className="text-amber-500 font-medium">(joining...)</span>}
                   </div>
                </div>
              </div>
            ) : (
              <MediaVideo
                videoId={`video-${t.id}`}
                stream={t.stream}
                muted={t.self}
                className="h-full w-full object-cover"
              />
            )}

            <TileFooter
              title={
                t.self ? (t.type === "screen" ? "You (screen)" : "You")
                  : (t.name || "Student")
              }
              mutedBadge={t.self && t.type !== "screen" ? !mic : false}
              handUp={t.hand}
              onFullscreen={() => toggleFullTile(`tile-${t.id}`)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function RoomVideoWall({ streams, participants, mic, toggleFullTile }) {
  const { screens, cams, placeholders } = useMemo(() => {
    const s = [];
    const c = [];
    const withVideo = new Set();
    const selfHasVideoTile = streams.some(
      (item) => item.self && (item.type === "cam" || item.type === "screen")
    );

    for (const item of streams) {
      if (item.type === "screen") {
        s.push(item);
        withVideo.add(item.id.split("::")[0]);
      } else if (item.type === "cam") {
        c.push(item);
        withVideo.add(item.id.split("::")[0]);
      }
    }

    const ph = participants
      .filter((p) => {
        if (p.self && selfHasVideoTile) return false;
        return !withVideo.has(p.id);
      })
      .map(p => ({
        id: p.id + "::placeholder",
        name: p.self ? "You" : (p.name || "Student"),
        self: !!p.self,
        state: p.state,
        hand: !!p.hand,
        type: "placeholder",
      }));

    s.sort((a, b) => (a.self === b.self ? (a.name || "").localeCompare(b.name || "") : a.self ? -1 : 1));
    c.sort((a, b) => (a.self === b.self ? (a.name || "").localeCompare(b.name || "") : a.self ? -1 : 1));

    return { screens: s, cams: c, placeholders: ph };
  }, [streams, participants]);

  const hasScreens = screens.length > 0;

  return (
    <div className="space-y-6">
      {hasScreens && (
        <ScreenWall screens={screens} toggleFullTile={toggleFullTile} />
      )}

      <PeopleWall
        cams={cams}
        placeholders={placeholders}
        mic={mic}
        toggleFullTile={toggleFullTile}
      />

       {!hasScreens && cams.length === 0 && placeholders.length === 0 && (
         <div className="aspect-video rounded-3xl bg-white/5 border border-white/10 grid place-items-center text-slate-400 font-bold uppercase tracking-widest text-[11px] shadow-inner">
           Waiting for students...
         </div>
       )}
    </div>
  );
}
