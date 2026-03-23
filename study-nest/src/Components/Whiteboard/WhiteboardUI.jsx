import React from "react";

export function ToolBtn({ cur, set, id, label, icon }) {
  const on = cur === id;
  return (
    <button
      onClick={() => set(id)}
      className={`px-2 py-1 rounded-md text-xs border ${
        on ? "bg-emerald-600 text-white border-emerald-600"
           : "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
      }`}
      title={label}
      aria-pressed={on}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}
