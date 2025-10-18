// src/Components/WhiteboardModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* =================== Whiteboard (pure Canvas) =================== */

const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  ERASER: "eraser",
  LINE: "line",
  ARROW: "arrow",
  RECT: "rect",
  ELLIPSE: "ellipse",
  TEXT: "text",
  STICKY: "sticky",
  HAND: "hand",
};

const DEFAULTS = {
  stroke: "#10b981",
  strokeWidth: 3,
  textSize: 20,
  stickySize: 16,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function BoardInner({ rtc, roomId, me, participants, className = "" }) {
  // Simple “vector ops” model synced over RTC
  const [board, setBoard] = useState({
    owner: me?.id || "me",
    name: (me?.name || "You") + "'s board",
    pages: [{ id: uid(), ops: [], undo: [], redo: [] }],
    pageIndex: 0,
    shared: true,
    allowEdits: true,
  });

  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState(DEFAULTS.stroke);
  const [size, setSize] = useState(DEFAULTS.strokeWidth);
  const [textSize, setTextSize] = useState(DEFAULTS.textSize);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef({ ox: 0, oy: 0, dragging: false, pointer: null, activeOp: null });

  /* -------------------- Helpers -------------------- */
  const page = () => board.pages[board.pageIndex];
  const canEdit = () => board.owner === me?.id || board.allowEdits;

  function pointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - stageRef.current.ox) / zoom;
    const y = (e.clientY - rect.top - stageRef.current.oy) / zoom;
    return { x, y };
  }

  /* -------------------- RTC wiring -------------------- */
  useEffect(() => {
    if (!rtc?.onWB) return;
    const off = rtc.onWB((msg) => {
      if (!msg) return;
      // Ignore my own echoes (server forwards wb-forward with from=id)
      if (msg.from && me?.id && msg.from === me.id) return;

      if (msg.type === "wb-op" && msg.pageId && msg.op) {
        setBoard((prev) => {
          const next = structuredClone(prev);
          const pg = next.pages.find((p) => p.id === msg.pageId);
          if (!pg) return prev;
          if (msg.op.type === "remove") {
            const idx = pg.ops.findIndex((o) => o.id === msg.op.id);
            if (idx >= 0) pg.ops.splice(idx, 1);
            return next;
          }
          // upsert by id (so incremental updates don’t duplicate)
          const idx = pg.ops.findIndex((o) => o.id === msg.op.id);
          if (idx >= 0) pg.ops[idx] = msg.op; else pg.ops.push(msg.op);
          return next;
        });
      }

      if (msg.type === "wb-sync-request") {
        // Reply with current board state (targeted)
        rtc.sendWB({
          type: "wb-sync-response",
          to: msg.from,
          board: board,
        });
      }

      if (msg.type === "wb-sync-response") {
        if (!msg.board) return;
        setBoard(msg.board);
      }
    });

    // Ask for latest on mount
    rtc.sendWB({ type: "wb-sync-request", from: me?.id });

    return () => off && off();
  }, [rtc, me?.id, board]);

  /* -------------------- Rendering loop -------------------- */
  useEffect(() => {
    const base = canvasRef.current;
    const overlay = overlayRef.current;
    if (!base || !overlay) return;

    const ctx = base.getContext("2d");
    const octx = overlay.getContext("2d");

    let raf;
    const render = () => {
      raf = requestAnimationFrame(render);
      const { width, height } = base;
      ctx.clearRect(0, 0, width, height);
      octx.clearRect(0, 0, width, height);

      // background
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, width, height);

      // subtle grid
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      const step = 32 * zoom;
      for (let x = stageRef.current.ox % step; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = stageRef.current.oy % step; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      const pg = page();
      if (!pg) return;

      ctx.save();
      ctx.translate(stageRef.current.ox, stageRef.current.oy);
      ctx.scale(zoom, zoom);

      pg.ops.forEach((op) => drawOp(ctx, op));
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [board, zoom]);

  /* -------------------- Resize canvas -------------------- */
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    const resize = () => {
      if (!canvasRef.current || !overlayRef.current || !el) return;
      const { width, height } = el.getBoundingClientRect();
      canvasRef.current.width = Math.max(640, Math.floor(width));
      canvasRef.current.height = Math.max(360, Math.floor(height));
      overlayRef.current.width = canvasRef.current.width;
      overlayRef.current.height = canvasRef.current.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* -------------------- Input handlers -------------------- */
  function down(e) {
    if (tool === TOOLS.HAND) {
      setPanning(true);
      stageRef.current.dragging = true;
      stageRef.current.pointer = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!canEdit()) return;

    const p = pointerPos(e);
    const base = {
      id: uid(),
      color,
      size,
      type: tool,
      t: Date.now(),
      pageId: page().id,
    };

    let op = null;

    if ([TOOLS.PEN, TOOLS.HIGHLIGHTER, TOOLS.ERASER].includes(tool)) {
      op = { ...base, points: [p], alpha: tool === TOOLS.HIGHLIGHTER ? 0.25 : 1 };
    } else if ([TOOLS.LINE, TOOLS.ARROW, TOOLS.RECT, TOOLS.ELLIPSE].includes(tool)) {
      op = { ...base, start: p, end: p };
    } else if (tool === TOOLS.TEXT) {
      const text = prompt("Enter text:");
      if (!text) return;
      op = { ...base, text, textSize, pos: p };
      addOp(op, true);
      return;
    } else if (tool === TOOLS.STICKY) {
      const text = prompt("Sticky note:");
      if (!text) return;
      op = { ...base, text, textSize: DEFAULTS.stickySize, pos: p, sticky: true, color: "#facc15" };
      addOp(op, true);
      return;
    }

    if (op) {
      addOp(op, true);
      stageRef.current.activeOp = op;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    }
  }

  function move(e) {
    if (stageRef.current.dragging && panning) {
      const prev = stageRef.current.pointer || { x: e.clientX, y: e.clientY };
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      stageRef.current.ox += dx;
      stageRef.current.oy += dy;
      stageRef.current.pointer = { x: e.clientX, y: e.clientY };
      return;
    }
    const op = stageRef.current.activeOp;
    if (!op) return;
    const p = pointerPos(e);

    if (op.points) op.points.push(p);
    if (op.start && op.end) op.end = p;

    // Incremental broadcast/update (idempotent by op.id)
    rtc?.sendWB?.({ type: "wb-op", pageId: op.pageId, op });
    setBoard((prev) => {
      const next = structuredClone(prev);
      const pg = next.pages.find((x) => x.id === op.pageId);
      if (!pg) return prev;
      const idx = pg.ops.findIndex((o) => o.id === op.id);
      if (idx >= 0) pg.ops[idx] = op; else pg.ops.push(op);
      return next;
    });
  }

  function up() {
    stageRef.current.activeOp = null;
    stageRef.current.dragging = false;
    setPanning(false);
    window.removeEventListener("pointermove", move);
  }

  function wheel(e) {
    if (!e.ctrlKey) return; // Ctrl/⌘ + wheel to zoom
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.2, Math.min(5, z * factor)));
  }

  function addOp(op, broadcast) {
    setBoard((prev) => {
      const next = structuredClone(prev);
      const i = next.pageIndex;
      const pg = next.pages[i];
      pg.ops.push(op);
      pg.undo.push(op);
      pg.redo = [];
      return next;
    });
    if (broadcast) rtc?.sendWB?.({ type: "wb-op", pageId: page().id, op });
  }

  function undo() {
    setBoard((prev) => {
      const next = structuredClone(prev);
      const pg = next.pages[next.pageIndex];
      if (!pg.undo.length) return prev;
      const last = pg.undo.pop();
      const idx = pg.ops.findIndex((o) => o.id === last.id);
      if (idx >= 0) pg.ops.splice(idx, 1);
      pg.redo.push(last);
      rtc?.sendWB?.({ type: "wb-op", pageId: pg.id, op: { id: last.id, type: "remove" } });
      return next;
    });
  }

  function redo() {
    setBoard((prev) => {
      const next = structuredClone(prev);
      const pg = next.pages[next.pageIndex];
      if (!pg.redo.length) return prev;
      const it = pg.redo.pop();
      pg.ops.push(it);
      pg.undo.push(it);
      rtc?.sendWB?.({ type: "wb-op", pageId: pg.id, op: it });
      return next;
    });
  }

  function addPage() {
    setBoard((prev) => {
      const next = structuredClone(prev);
      next.pages.push({ id: uid(), ops: [], undo: [], redo: [] });
      next.pageIndex = next.pages.length - 1;
      return next;
    });
  }
  function switchPage(delta) {
    setBoard((prev) => {
      const next = structuredClone(prev);
      next.pageIndex = Math.max(0, Math.min(next.pages.length - 1, next.pageIndex + delta));
      return next;
    });
  }

  async function exportPNG() {
    const data = await rasterizePage(page(), canvasRef.current);
    downloadURI(data, `board-page${board.pageIndex + 1}.png`);
  }

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "l", unit: "px", format: "a4" });
    for (let i = 0; i < board.pages.length; i++) {
      if (i > 0) doc.addPage();
      const data = await rasterizePage(board.pages[i], canvasRef.current);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.addImage(data, "PNG", 0, 0, w, h);
    }
    doc.save(`board.pdf`);
  }

  function downloadURI(uri, filename) {
    const a = document.createElement("a");
    a.href = uri;
    a.download = filename;
    a.click();
  }

  async function rasterizePage(pg, baseCanvas) {
    const canvas = document.createElement("canvas");
    canvas.width = baseCanvas.width;
    canvas.height = baseCanvas.height;
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw ops
    pg.ops.forEach((op) => drawOp(ctx, op));
    return canvas.toDataURL("image/png");
  }

  // paste images
  useEffect(() => {
    function onPaste(e) {
      if (!canEdit()) return;
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          const reader = new FileReader();
          reader.onload = () => {
            const op = { id: uid(), type: "image", x: 50, y: 50, w: 320, h: 240, dataURL: reader.result, pageId: page().id };
            addOp(op, true);
          };
          reader.readAsDataURL(file);
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, tool]);

  const pageNo = board.pageIndex + 1;
  const pageCount = board.pages.length;

  return (
    <div className={`flex flex-col bg-zinc-950/80 ring-1 ring-zinc-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-1 overflow-x-auto">
          <ToolBtn cur={tool} set={setTool} id={TOOLS.PEN} label="Pen" icon="✏️" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.HIGHLIGHTER} label="Highlighter" icon="🖍️" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.ERASER} label="Eraser" icon="🧽" />
          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.LINE} label="Line" icon="／" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.ARROW} label="Arrow" icon="➤" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.RECT} label="Rect" icon="▭" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.ELLIPSE} label="Ellipse" icon="◯" />
          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.TEXT} label="Text" icon="T" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.STICKY} label="Sticky" icon="🗒️" />
          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.HAND} label="Pan" icon="✋" />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded"
            title="Color"
          />
          <input
            type="range"
            min={1}
            max={40}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
            title="Size"
          />
          <span className="text-xs text-zinc-300 w-10 text-right">{size}px</span>

          <button onClick={undo} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700" title="Undo">
            ↶
          </button>
          <button onClick={redo} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700" title="Redo">
            ↷
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <button
            onClick={() => setZoom((z) => Math.min(5, z * 1.1))}
            className="px-2 py-1 rounded bg-zinc-800 text-zinc-100"
          >
            +
          </button>
          <div className="text-xs text-zinc-300 w-12 text-center">{Math.round(zoom * 100)}%</div>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z / 1.1))}
            className="px-2 py-1 rounded bg-zinc-800 text-zinc-100"
          >
            −
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <button
            onClick={exportPNG}
            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Export PNG
          </button>
          <button
            onClick={exportPDF}
            className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-900/30"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Page bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <button
            onClick={() => switchPage(-1)}
            className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            ◀
          </button>
        </div>
        <div className="text-xs text-zinc-300">
          Page {pageNo} / {pageCount}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <button
            onClick={() => switchPage(1)}
            className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            ▶
          </button>
          <button
            onClick={addPage}
            className="px-3 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700 text-xs"
          >
            + Add page
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative grow min-h-[320px]"
        onPointerDown={down}
        onWheel={wheel}
        style={{ cursor: tool === TOOLS.HAND ? "grab" : "crosshair" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

/* =================== Drawing =================== */
function drawOp(ctx, op) {
  if (op.type === "remove") return;

  if (op.type === "image" && op.dataURL) {
    const img = new Image();
    img.src = op.dataURL;
    try {
      ctx.drawImage(img, op.x || 0, op.y || 0, op.w || img.width, op.h || img.height);
    } catch {}
    return;
  }

  // Freehand
  if (op.points) {
    ctx.save();
    if (op.type === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = op.alpha ?? 1;
      ctx.strokeStyle = op.color || DEFAULTS.stroke;
    }
    ctx.lineWidth = op.size || DEFAULTS.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    op.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Shapes / lines
  if (op.start && op.end) {
    ctx.save();
    ctx.strokeStyle = op.color || DEFAULTS.stroke;
    ctx.lineWidth = op.size || DEFAULTS.strokeWidth;
    if (op.type === "rect") {
      const x = Math.min(op.start.x, op.end.x);
      const y = Math.min(op.start.y, op.end.y);
      const w = Math.abs(op.end.x - op.start.x);
      const h = Math.abs(op.end.y - op.start.y);
      ctx.strokeRect(x, y, w, h);
    } else if (op.type === "ellipse") {
      const cx = (op.start.x + op.end.x) / 2;
      const cy = (op.start.y + op.end.y) / 2;
      const rx = Math.abs(op.end.x - op.start.x) / 2;
      const ry = Math.abs(op.end.y - op.start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (op.type === "arrow") {
      const { x: x1, y: y1 } = op.start;
      const { x: x2, y: y2 } = op.end;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = 10 + (op.size || 2) * 0.6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - len * Math.cos(angle - Math.PI / 6),
        y2 - len * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - len * Math.cos(angle + Math.PI / 6),
        y2 - len * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      // line
      ctx.beginPath();
      ctx.moveTo(op.start.x, op.start.y);
      ctx.lineTo(op.end.x, op.end.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Text / Sticky
  if (op.text) {
    ctx.save();
    ctx.font = `${op.textSize || DEFAULTS.textSize}px ui-sans-serif, system-ui, Arial`;
    if (op.sticky) {
      const padding = 8;
      const metrics = ctx.measureText(op.text);
      const h = (op.textSize || DEFAULTS.textSize) + padding * 2;
      const w = metrics.width + padding * 2;
      ctx.fillStyle = op.color || "#facc15";
      ctx.globalAlpha = 0.9;
      ctx.fillRect((op.pos?.x || 0) - padding, (op.pos?.y || 0) - h + padding, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "black";
      ctx.fillText(op.text, op.pos?.x || 0, op.pos?.y || 0);
    } else {
      ctx.fillStyle = op.color || "white";
      ctx.fillText(op.text, op.pos?.x || 0, op.pos?.y || 0);
    }
    ctx.restore();
  }
}

/* =================== Small UI bits =================== */
function ToolBtn({ cur, set, id, label, icon }) {
  const on = cur === id;
  return (
    <button
      onClick={() => set(id)}
      className={`px-2 py-1 rounded-md text-xs border ${
        on
          ? "bg-emerald-600 text-white border-emerald-600"
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

/* =================== Modal (default export) =================== */
export default function WhiteboardModal({
  open,
  onClose,
  rtc,
  roomId,
  me,
  participants = [],
}) {

  const [board, setBoard] = useState({
    owner: me?.id || "me",
    name: (me?.name || "You") + "'s board",
    pages: [{ id: uid(), ops: [], undo: [], redo: [] }],
    pageIndex: 0,
    shared: true,
    allowEdits: true,
  });

  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState(DEFAULTS.stroke);
  const [size, setSize] = useState(DEFAULTS.strokeWidth);
  const [textSize, setTextSize] = useState(DEFAULTS.textSize);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef({ ox: 0, oy: 0, dragging: false, pointer: null, activeOp: null });

  // Reset pan/zoom when opening, but keep the board content
  useEffect(() => {
    if (open) {
      setZoom(1);
      stageRef.current.ox = 0;
      stageRef.current.oy = 0;
    }
  }, [open]);

  /* -------------------- Helpers -------------------- */
  const page = () => board.pages[board.pageIndex];
  const canEdit = () => board.owner === me?.id || board.allowEdits;

  function pointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - stageRef.current.ox) / zoom;
    const y = (e.clientY - rect.top - stageRef.current.oy) / zoom;
    return { x, y };
  }

  /* -------------------- RTC wiring -------------------- */
  useEffect(() => {
    if (!rtc?.onWB || !open) return; // Only listen when modal is open
    
    const off = rtc.onWB((msg) => {
      if (!msg) return;
      // Ignore my own echoes (server forwards wb-forward with from=id)
      if (msg.from && me?.id && msg.from === me.id) return;

      if (msg.type === "wb-op" && msg.pageId && msg.op) {
        setBoard((prev) => {
          const next = structuredClone(prev);
          const pg = next.pages.find((p) => p.id === msg.pageId);
          if (!pg) return prev;
          if (msg.op.type === "remove") {
            const idx = pg.ops.findIndex((o) => o.id === msg.op.id);
            if (idx >= 0) pg.ops.splice(idx, 1);
            return next;
          }
          // upsert by id (so incremental updates don't duplicate)
          const idx = pg.ops.findIndex((o) => o.id === msg.op.id);
          if (idx >= 0) pg.ops[idx] = msg.op; else pg.ops.push(msg.op);
          return next;
        });
      }

      if (msg.type === "wb-sync-request") {
        // Reply with current board state (targeted)
        rtc.sendWB({
          type: "wb-sync-response",
          to: msg.from,
          board: board,
        });
      }

      if (msg.type === "wb-sync-response") {
        if (!msg.board) return;
        setBoard(msg.board);
      }
    });

    // Ask for latest on mount when modal opens
    if (open) {
      rtc.sendWB({ type: "wb-sync-request", from: me?.id });
    }

    return () => off && off();
  }, [rtc, me?.id, board, open]); // Add open to dependencies

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80">
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
          />
        </div>
      </div>
    </div>
  );
}
