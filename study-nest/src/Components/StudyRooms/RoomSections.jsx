
import React from "react";
import { 
  ArrowRight, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ScreenShare, 
  LogOut, 
  Sparkles 
} from "lucide-react";
import { ToggleButton } from "./RoomUIComponents";
import { 
  MicIcon, 
  MicOffIcon, 
  CamIcon, 
  CamOffIcon, 
  ScreenIcon 
} from "./RoomUIComponents";

export function ChatPanel({ 
  chat, 
  msg, 
  setMsg, 
  send, 
  anon, 
  setAnon, 
  displayName 
}) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest ">Chat Feed</h3>
        <label className="inline-flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase cursor-pointer">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="h-3 w-3 rounded-full border-white/10 text-white bg-white/5 focus:ring-0"
          />
          Anon Mode
        </label>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
        {chat.map((m) => (
          <li
            key={m.id}
            className={
              "rounded-2xl px-4 py-3 text-sm shadow-sm " +
              (m.self ? "bg-white/10 text-white ml-8" : "bg-white/5 text-white border border-white/5 mr-8")
            }
          >
            <div className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
              {m.author} • {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="break-words">{m.text}</div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Sync a message..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 "
        />
        <button onClick={send} className="rounded-2xl bg-white/10 p-3 text-white hover:bg-zinc-800 shadow-lg group">
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export function ParticipantsPanel({ participants, hand }) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 border border-white/10 shadow-xl">
      <h3 className="text-[10px] font-black text-white uppercase tracking-widest ">Synchronized ({participants.length})</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-400">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-1">
            <span className={`inline-block h-2 w-2 rounded-full shadow-sm ${p.state === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            <span className="text-[11px] font-bold text-slate-400 ">{p.self ? "You" : p.name || "Student"}</span>
            {p.state === 'joining' && !p.self && (
              <span className="text-[8px] font-black uppercase text-amber-500 tracking-tighter">(syncing...)</span>
            )}
            {p.self && hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
            {!p.self && p.hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoomControls({
  mic,
  setMic,
  cam,
  setCam,
  sharing,
  toggleShare,
  recording,
  toggleRecord,
  hand,
  setHand,
  rtc,
  setBoardOpen
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-white/10 bg-white/5 backdrop-blur-xl py-6 shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4">
          <ToggleButton on={mic} onClick={() => setMic((s) => !s)} label={mic ? "Mute" : "Unmute"}>
            {mic ? <MicIcon /> : <MicOffIcon />}
          </ToggleButton>
          <ToggleButton on={cam} onClick={() => setCam((s) => !s)} label={cam ? "Camera off" : "Camera on"}>
            {cam ? <CamIcon /> : <CamOffIcon />}
          </ToggleButton>
          <ToggleButton on={sharing} onClick={toggleShare} label={sharing ? "Stop sharing" : "Share screen"}>
            <ScreenIcon />
          </ToggleButton>

          <button
            onClick={toggleRecord}
            className={
              "rounded-[1.5rem] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 " +
              (recording
                ? "bg-white/10 text-white"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/5")
            }
          >
            <div className="flex items-center gap-2">
              {recording ? (
                <>
                  <div className="h-2 w-2 rounded-sm bg-white/5 animate-pulse"></div>
                  <span>End REC</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  <span>Record</span>
                </>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setHand((s) => {
                rtc.toggleHand(!s);
                return !s;
              });
            }}
            className={
              "rounded-[1.5rem] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 " +
              (hand
                ? "bg-white/5 border-2 border-zinc-900 text-white"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/5")
            }
          >
            ✋ {hand ? "Lower" : "Hand Up"}
          </button>
          <button
            onClick={() => setBoardOpen(true)}
            className="rounded-[1.5rem] px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 text-white hover:bg-zinc-800 shadow-xl hover:-translate-y-1 transition-all"
          >
            Whiteboard
          </button>
        </div>
      </div>
    </div>
  );
}
