
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
    <div className="rounded-[2rem] bg-white p-6 border border-[#001D36]/10 shadow-sm hover:shadow-lg transition-shadow duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-[#00808C] animate-pulse" />
           <h3 className="text-[10px] font-black text-[#001D36] uppercase tracking-widest">Chat Feed</h3>
        </div>
        <label className="inline-flex items-center gap-2 text-[9px] text-[#66625C] font-bold uppercase cursor-pointer group">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="h-3.5 w-3.5 rounded-full border-[#001D36]/20 text-[#00808C] bg-white group-hover:border-[#00808C] transition-colors focus:ring-0"
          />
          <span className="group-hover:text-[#00808C] transition-colors">Anon Mode</span>
        </label>
      </div>
      <ul className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {chat.map((m) => (
          <li
            key={m.id}
            className={
              "rounded-2xl px-4 py-3 text-sm shadow-sm transition-transform duration-300 hover:-translate-y-0.5 " +
              (m.self ? "bg-[#00808C]/5 text-[#001D36] ml-8 border border-[#00808C]/10 rounded-tr-sm" : "bg-white text-[#001D36] border border-[#001D36]/10 mr-8 rounded-tl-sm")
            }
          >
            <div className="text-[9px] font-black uppercase tracking-widest text-[#66625C] mb-1.5 flex items-center gap-2">
              {m.author} <span className="opacity-50">•</span> {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="break-words font-medium leading-relaxed">{m.text}</div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-3">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Sync a message..."
          className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-5 py-3.5 text-xs font-semibold text-[#001D36] placeholder:text-[#66625C] focus:outline-none focus:ring-2 focus:ring-[#00808C]/20 shadow-sm transition-all"
        />
        <button onClick={send} className="rounded-2xl bg-[#00808C] p-3.5 text-white hover:bg-[#00606B] shadow-md hover:shadow-[#00808C]/30 transition-all group flex-shrink-0">
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export function ParticipantsPanel({ participants, hand }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 border border-[#001D36]/10 shadow-sm hover:shadow-lg transition-shadow duration-500">
      <div className="flex items-center gap-2 mb-6">
         <div className="w-2 h-2 rounded-full bg-[#8AB100]" />
         <h3 className="text-[10px] font-black text-[#001D36] uppercase tracking-widest">Synchronized ({participants.length})</h3>
      </div>
      <ul className="space-y-3 text-sm text-[#66625C]">
        {participants.map((p) => (
          <li key={p.id} className="group flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-[#001D36]/5 transition-colors">
            <span className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white ${p.state === 'connected' ? 'bg-[#8AB100]' : 'bg-[#F18900]'
              }`} />
            <span className="text-[11px] font-bold text-[#001D36] group-hover:text-[#00808C] transition-colors">{p.self ? "You" : p.name || "Student"}</span>
            {p.state === 'joining' && !p.self && (
              <span className="text-[9px] font-black uppercase text-[#F18900] tracking-widest ml-1 animate-pulse">(syncing)</span>
            )}
            {p.self && hand && <span className="ml-auto rounded-full bg-[#F18900] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">✋</span>}
            {!p.self && p.hand && <span className="ml-auto rounded-full bg-[#F18900] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm animate-bounce">✋</span>}
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
    <div className="sticky bottom-0 z-10 border-t border-[#001D36]/10 bg-white backdrop-blur-xl py-6 shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
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
              "rounded-[1.5rem] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border transition-all hover:-translate-y-1 " +
              (recording
                ? "bg-[#A7481E] border-[#A7481E] text-white"
                : "bg-white border-[#001D36]/10 text-[#001D36] hover:bg-[#001D36]/5")
            }
          >
            <div className="flex items-center gap-2">
              {recording ? (
                <>
                  <div className="h-2 w-2 rounded-sm bg-white animate-pulse"></div>
                  <span>End REC</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-[#A7481E]"></div>
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
              "rounded-[1.5rem] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border transition-all hover:-translate-y-1 " +
              (hand
                ? "bg-[#F18900] border-[#F18900] text-white"
                : "bg-white border-[#001D36]/10 text-[#001D36] hover:bg-[#001D36]/5")
            }
          >
            ✋ {hand ? "Lower" : "Hand Up"}
          </button>
          <button
            onClick={() => setBoardOpen(true)}
            className="rounded-[1.5rem] px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] bg-white border border-[#001D36]/10 text-[#001D36] hover:bg-[#001D36]/5 shadow-sm hover:-translate-y-1 transition-all"
          >
            Whiteboard
          </button>
        </div>
      </div>
    </div>
  );
}
