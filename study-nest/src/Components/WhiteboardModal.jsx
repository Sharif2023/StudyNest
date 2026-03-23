import React from "react";
import BoardInner from "./Whiteboard/BoardInner";

/* =================== Modal (default export) =================== */
export default function WhiteboardModal({
  open,
  onClose,
  rtc,
  roomId,
  me,
  participants = [],
}) {
  return (
    <div
      className={
        "fixed inset-0 z-[100] bg-black/80 transition-opacity " +
        (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
      }
      aria-hidden={open ? "false" : "true"}
    >
      <div className="absolute inset-0 p-3 sm:p-4 flex flex-col">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold">
              WB
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">StudyNest Whiteboard</div>
              <div className="text-xs text-zinc-400">Room: {roomId}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700"
          >
            Close
          </button>
        </div>

        {/* Board */}
        <div className="flex-1 min-h-0">
          <BoardInner
            rtc={rtc}
            roomId={roomId}
            me={me}
            participants={participants}
            className="h-full"
            visible={open}
          />
        </div>
      </div>
    </div>
  );
}
