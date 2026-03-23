
import React from "react";

export function ToggleButton({ on, onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:-translate-y-0.5 " +
        (on ? "bg-white/10 text-white" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5")
      }
      aria-label={label}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-white/10 border border-white shadow-sm" />;
}

/* ====================== Icons ====================== */

export function ArrowLeft(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
}

export function CamIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H3A2 2 0 0 0 1 7v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z" /></svg>;
}

export function CamOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-8 w-8" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-3.44-3.44A2 2 0 0 1 15 21H3a2 2 0 0 1-2-2V7c0-.35.06-.68.17-1L.7 3.5 2.1 2.1l1.9 1.9H15a2 2 0 0 1 2 2v6.17l2-2V7l4 4v2l-3.17-3.17L2.1 3.5z" /></svg>;
}

export function MicIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19h2v3h-2z" /></svg>;
}

export function MicOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-4.02-4.02A7 7 0 0 1 5 11h2a5 5 0 0 0 6.94 4.57L12 13.63V5a3 3 0 0 1 5.8-1.2l1.6 1.6-1.4 1.4L16.8 5.2A1 1 0 0 0 15 6v5.63l-2-2V5a1 1 0 0 0-2 0v6.63l-7.5-7.5zM11 19h2v3h-2z" /></svg>;
}

export function ScreenIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M3 4h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7v2h3v2H7v-2h3v-2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>;
}

export function UserIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-12 w-12" {...props}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" /></svg>;
}
