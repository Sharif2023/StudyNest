import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Collaborative Whiteboard (Canvas + Vector model)
 * - Free draw (pen/highlighter), shapes, text, sticky notes, image paste
 * - Multi-page, per-owner boards; anyone can view; owner can toggle "allow edits"
 * - Realtime sync via rtc.sendWB() / rtc.onWB()
 * - Export: PNG / multi-page PDF
 * - Undo/Redo per-page
 *
 * Zero dependencies except optional jsPDF (lazy-loaded when exporting PDF).
 */

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
  LASER: "laser",
  SELECT: "select",
  HAND: "hand",
};

const DEFAULTS = {
  stroke: "#10b981",
  strokeWidth: 3,
  highlighterWidth: 12,
  textSize: 20,
  stickySize: 16,
  eraserWidth: 18,
};

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function Whiteboard({
  rtc,
  myId,
  myName = "You",
  roomId,
  className = "",
}) {
  // board registry: { [ownerId]: { name, pages:[{ops:[], bg:null}], pageIndex, shared, allowEdits } }
  const [boards, setBoards] = useState({});
  const [activeOwner, setActiveOwner] = useState(null);
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState(DEFAULTS.stroke);
  const [size, setSize] = useState(DEFAULTS.strokeWidth);
  const [textSize, setTextSize] = useState(DEFAULTS.textSize);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [allowEdits, setAllowEdits] = useState(true);
  const [shared, setShared] = useState(true);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef({ ox: 0, oy: 0, dragging: false, pointer: null });

  // local board bootstrap
  useEffect(() => {
    setBoards(prev => {
      if (prev[myId]) return prev;
      return {
        ...prev,
        [myId]: {
          name: `${myName}'s board`,
          pages: [{ ops: [], undo: [], redo: [], bg: null, id: uid() }],
          pageIndex: 0,
          shared: true,
          allowEdits: true,
          owner: myId,
        }
      };
    });
    setActiveOwner(myId);
  }, [myId, myName]);

  // wire RTC whiteboard bus
  useEffect(() => {
    if (!rtc?.onWB) return;
    const off = rtc.onWB((msg) => {
      if (!msg?.type) return;
      setBoards(prev => applyIncoming(prev, msg));
    });
    // ask others for latest state
    rtc.sendWB({ type: "wb-sync-request", roomId, from: myId });
    return off;
  }, [rtc, roomId, myId]);

  // handle sync requests from late joiners (owner will respond)
  function applyIncoming(prev, msg) {
    const next = { ...prev };
    if (msg.type === "wb-op") {
      const { ownerId, pageId, op } = msg;
      const b = next[ownerId]; if (!b) return next;
      const page = b.pages.find(p => p.id === pageId); if (!page) return next;
      page.ops = [...page.ops, op];
      page.undo = [...page.undo, op]; // for local redo continuity
      page.redo = []; // reset redo on new op
      return next;
    }
    if (msg.type === "wb-board-meta") {
      const { ownerId, meta } = msg;
      if (!next[ownerId]) next[ownerId] = { name: meta.name, pages: [], pageIndex: 0, shared: !!meta.shared, allowEdits: !!meta.allowEdits, owner: ownerId };
      else next[ownerId] = { ...next[ownerId], ...meta };
      return next;
    }
    if (msg.type === "wb-sync-request") {
      // only the owner replies with full board state
      const b = prev[myId];
      if (b) {
        rtc.sendWB({ type: "wb-sync-response", to: msg.from, ownerId: myId, board: b });
      }
      return prev;
    }
    if (msg.type === "wb-sync-response") {
      if (msg.to !== myId) return prev;
      next[msg.ownerId] = msg.board;
      return next;
    }
    if (msg.type === "wb-page") {
      const { ownerId, page, insertAfterId } = msg;
      const b = next[ownerId]; if (!b) return next;
      if (insertAfterId) {
        const idx = b.pages.findIndex(p => p.id === insertAfterId);
        if (idx >= 0) b.pages = [...b.pages.slice(0, idx + 1), page, ...b.pages.slice(idx + 1)];
        else b.pages = [...b.pages, page];
      } else {
        b.pages = [...b.pages, page];
      }
      return next;
    }
    if (msg.type === "wb-set-page-index") {
      const { ownerId, index } = msg;
      const b = next[ownerId]; if (!b) return next;
      b.pageIndex = Math.max(0, Math.min(index, b.pages.length - 1));
      return next;
    }
    if (msg.type === "wb-meta-toggle") {
      const { ownerId, key, value } = msg;
      const b = next[ownerId]; if (!b) return next;
      b[key] = value;
      if (ownerId === myId) {
        // reflect my toggles in top-level UI
        if (key === "allowEdits") setAllowEdits(value);
        if (key === "shared") setShared(value);
      }
      return next;
    }
    return next;
  }

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const overlay = overlayRef.current; const octx = overlay.getContext("2d");

    let raf;
    const render = () => {
      raf = requestAnimationFrame(render);
      const { width, height } = canvas;
      ctx.clearRect(0,0,width,height);
      octx.clearRect(0,0,width,height);

      const board = boards[activeOwner]; if (!board) return;
      const page = board.pages[board.pageIndex]; if (!page) return;

      // background
      if (page.bg) {
        try { ctx.drawImage(page.bg, 0,0, width, height); } catch {}
      } else {
        // subtle grid
        ctx.save();
        ctx.fillStyle = "#0b0b0b";
        ctx.fillRect(0,0,width,height);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        const step = 32 * zoom;
        for (let x = (stageRef.current.ox % step); x < width; x += step) {
          ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
        }
        for (let y = (stageRef.current.oy % step); y < height; y += step) {
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(stageRef.current.ox, stageRef.current.oy);
      ctx.scale(zoom, zoom);

      page.ops.forEach(op => drawOp(ctx, octx, op));
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [boards, activeOwner, zoom]);

  // helpers
  function currentBoard() { return boards[activeOwner]; }
  function currentPage() {
    const b = currentBoard(); if (!b) return null;
    return b.pages[b.pageIndex];
  }

  function canEditActive() {
    const b = currentBoard(); if (!b) return false;
    if (b.owner === myId) return true;
    return !!b.allowEdits;
  }

  // pointer handlers
  function pointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - stageRef.current.ox) / zoom;
    const y = (e.clientY - rect.top - stageRef.current.oy) / zoom;
    return { x, y };
  }

  function down(e) {
    if (tool === TOOLS.HAND) {
      setPanning(true);
      stageRef.current.dragging = true;
      stageRef.current.pointer = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!canEditActive()) return;

    const p = pointerPos(e);
    const base = {
      id: uid(),
      color,
      size,
      type: tool,
      t: Date.now(),
      pageId: currentPage().id,
      ownerId: activeOwner,
    };

    let op = null;

    if (tool === TOOLS.PEN || tool === TOOLS.HIGHLIGHTER || tool === TOOLS.ERASER || tool === TOOLS.LASER) {
      op = { ...base, points: [p], alpha: (tool === TOOLS.HIGHLIGHTER ? 0.25 : 1) };
    } else if (tool === TOOLS.LINE || tool === TOOLS.ARROW || tool === TOOLS.RECT || tool === TOOLS.ELLIPSE) {
      op = { ...base, start: p, end: p };
    } else if (tool === TOOLS.TEXT) {
      const text = prompt("Enter text:");
      if (!text) return;
      op = { ...base, pos: p, text, textSize };
    } else if (tool === TOOLS.STICKY) {
      const text = prompt("Sticky note:");
      if (!text) return;
      op = { ...base, pos: p, text, textSize: DEFAULTS.stickySize, sticky: true, color: "#facc15" };
    }

    if (op) {
      appendOp(op, true);
      stageRef.current.activeOp = op;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    }
  }

  function move(e) {
    if (stageRef.current.dragging && panning) {
      const prev = stageRef.current.pointer || { x: e.clientX, y: e.clientY };
      const dx = e.clientX - prev.x; const dy = e.clientY - prev.y;
      stageRef.current.ox += dx; stageRef.current.oy += dy;
      stageRef.current.pointer = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!stageRef.current.activeOp) return;
    const p = pointerPos(e);
    const op = stageRef.current.activeOp;

    if (op.points) op.points.push(p);
    if (op.start && op.end) op.end = p;

    // broadcast incremental (throttle would be nicer; keep it simple)
    rtc.sendWB({ type: "wb-op", ownerId: activeOwner, pageId: op.pageId, op });
    setBoards(prev => applyIncoming(prev, { type: "wb-op", ownerId: activeOwner, pageId: op.pageId, op }));
  }

  function up() {
    stageRef.current.activeOp = null;
    stageRef.current.dragging = false;
    setPanning(false);
    window.removeEventListener("pointermove", move);
  }

  function wheel(e) {
    if (!e.ctrlKey) return; // use ctrl+wheel for zoom to not fight scroll
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.2, Math.min(5, z * factor)));
  }

  function appendOp(op, broadcast) {
    const page = currentPage();
    const ownerId = activeOwner;
    setBoards(prev => {
      const next = { ...prev };
      const b = { ...next[ownerId] };
      const pages = [...b.pages];
      const i = b.pageIndex;
      const cp = { ...pages[i], ops: [...pages[i].ops, op], undo: [...pages[i].undo, op], redo: [] };
      pages[i] = cp; b.pages = pages; next[ownerId] = b; return next;
    });
    if (broadcast) rtc.sendWB({ type: "wb-op", ownerId, pageId: page.id, op });
  }

  function undo() {
    const b = currentBoard(); if (!b) return;
    const i = b.pageIndex;
    const page = b.pages[i];
    if (!page.undo?.length) return;
    const last = page.undo[page.undo.length - 1];
    setBoards(prev => {
      const next = structuredClone(prev);
      const bp = next[activeOwner].pages[i];
      bp.undo.pop();
      const idx = bp.ops.findIndex(o => o.id === last.id);
      if (idx >= 0) bp.ops.splice(idx, 1);
      bp.redo.push(last);
      return next;
    });
    rtc.sendWB({ type: "wb-op", ownerId: activeOwner, pageId: page.id, op: { id: last.id, type: "remove" } });
  }

  function redo() {
    const b = currentBoard(); if (!b) return;
    const i = b.pageIndex;
    const page = b.pages[i];
    if (!page.redo?.length) return;
    const item = page.redo[page.redo.length - 1];
    setBoards(prev => {
      const next = structuredClone(prev);
      const bp = next[activeOwner].pages[i];
      bp.redo.pop();
      bp.ops.push(item);
      bp.undo.push(item);
      return next;
    });
    rtc.sendWB({ type: "wb-op", ownerId: activeOwner, pageId: page.id, op: item });
  }

  function addPage() {
    const newPage = { ops: [], undo: [], redo: [], bg: null, id: uid() };
    const b = currentBoard(); if (!b) return;
    setBoards(prev => {
      const next = structuredClone(prev);
      next[activeOwner].pages.push(newPage);
      next[activeOwner].pageIndex = next[activeOwner].pages.length - 1;
      return next;
    });
    rtc.sendWB({ type: "wb-page", ownerId: activeOwner, page: newPage });
  }

  function switchPage(delta) {
    const b = currentBoard(); if (!b) return;
    const newIdx = Math.max(0, Math.min(b.pages.length - 1, b.pageIndex + delta));
    setBoards(prev => {
      const next = structuredClone(prev);
      next[activeOwner].pageIndex = newIdx; return next;
    });
    rtc.sendWB({ type: "wb-set-page-index", ownerId: activeOwner, index: newIdx });
  }

  async function exportPNG() {
    const data = await rasterizeActivePage();
    downloadURI(data, `board-${activeOwner}-page${currentBoard().pageIndex + 1}.png`);
  }

  async function exportPDF() {
    const b = currentBoard(); if (!b) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "l", unit: "px", format: "a4" });
    for (let i = 0; i < b.pages.length; i++) {
      if (i > 0) doc.addPage();
      const data = await rasterizePage(b.pages[i]);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.addImage(data, "PNG", 0, 0, w, h);
    }
    doc.save(`board-${activeOwner}.pdf`);
  }

  function downloadURI(uri, filename) {
    const a = document.createElement("a");
    a.href = uri; a.download = filename; a.click();
  }

  async function rasterizeActivePage() { return rasterizePage(currentPage()); }

  async function rasterizePage(page) {
    const canvas = document.createElement("canvas");
    const base = canvasRef.current;
    canvas.width = base.width; canvas.height = base.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0,0);
    // draw ops at 1:1
    page.ops.forEach(op => drawOp(ctx, null, op));
    ctx.restore();
    return canvas.toDataURL("image/png");
  }

  // paste images
  useEffect(() => {
    function onPaste(e) {
      if (!canEditActive()) return;
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          const img = new Image();
          img.onload = () => {
            const op = {
              id: uid(), type: "image", w: img.width, h: img.height,
              x: 50, y: 50, dataURL: null,
            };
            // embed dataURL to ensure sync
            const r = new FileReader();
            r.onload = () => {
              op.dataURL = r.result;
              appendOp(op, true);
            };
            r.readAsDataURL(file);
          };
          img.src = URL.createObjectURL(file);
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeOwner, boards]);

  // resize canvas to container
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
    const ro = new ResizeObserver(resize); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const participantsBoards = useMemo(() => {
    // show all shared boards + mine always
    const entries = Object.entries(boards)
      .filter(([id, b]) => id === myId || b.shared)
      .map(([id, b]) => ({ id, name: b.name || `${id.slice(0,4)}'s board`, owner: b.owner, count: b.pages.length, pageIndex: b.pageIndex, allowEdits: b.allowEdits, shared: b.shared }));
    // mine first
    entries.sort((a,b)=> a.id===myId ? -1 : b.id===myId ? 1 : a.name.localeCompare(b.name));
    return entries;
  }, [boards, myId]);

  const b = currentBoard();
  const pageNo = b ? b.pageIndex + 1 : 0;
  const pageCount = b ? b.pages.length : 0;

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
          <ToolBtn cur={tool} set={setTool} id={TOOLS.LASER} label="Laser" icon="🔴" />
          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <ToolBtn cur={tool} set={setTool} id={TOOLS.HAND} label="Pan" icon="✋" />
        </div>

        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="w-8 h-8 rounded" title="Color" />
          <input type="range" min={1} max={40} value={size} onChange={(e)=>setSize(+e.target.value)} title="Size" />
          <span className="text-xs text-zinc-300 w-10 text-right">{size}px</span>

          <button onClick={undo} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700" title="Undo">↶</button>
          <button onClick={redo} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700" title="Redo">↷</button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <button onClick={()=>setZoom(z=>Math.min(5, z*1.1))} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100">+</button>
          <div className="text-xs text-zinc-300 w-12 text-center">{Math.round(zoom*100)}%</div>
          <button onClick={()=>setZoom(z=>Math.max(0.2, z/1.1))} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100">−</button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
          <button onClick={exportPNG} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Export PNG</button>
          <button onClick={exportPDF} className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-900/30">Export PDF</button>
        </div>
      </div>

      {/* Top strip: board chooser & share toggles */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2 overflow-x-auto">
          {participantsBoards.map(b => (
            <button
              key={b.id}
              onClick={()=>setActiveOwner(b.id)}
              className={`px-3 py-1 rounded-xl text-xs border ${activeOwner===b.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"}`}
              title={`${b.name} • ${b.count} page(s)`}
            >
              {b.id===myId ? "My board" : b.name} {b.shared ? "" : "🔒"}
            </button>
          ))}
        </div>

        {b?.owner === myId && (
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1 text-zinc-300">
              <input type="checkbox" checked={shared} onChange={(e)=> {
                setShared(e.target.checked);
                rtc.sendWB({ type: "wb-meta-toggle", ownerId: myId, key: "shared", value: e.target.checked });
              }} />
              Share my board
            </label>
            <label className="flex items-center gap-1 text-zinc-300">
              <input type="checkbox" checked={allowEdits} onChange={(e)=> {
                setAllowEdits(e.target.checked);
                rtc.sendWB({ type: "wb-meta-toggle", ownerId: myId, key: "allowEdits", value: e.target.checked });
              }} />
              Allow others to draw
            </label>
          </div>
        )}
      </div>

      {/* Page bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <button onClick={()=>switchPage(-1)} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700">◀</button>
          <span>Page {pageNo} / {pageCount}</span>
          <button onClick={()=>switchPage(1)} className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700">▶</button>
        </div>
        {b?.owner === myId && (
          <button onClick={addPage} className="px-3 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700 text-xs">+ Add page</button>
        )}
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

/* =================== Drawing impl =================== */
function drawOp(ctx, octx, op) {
  if (op.type === "remove") {
    // NOP here (removals applied by mutating ops array)
    return;
  }

  if (op.type === "image" && op.dataURL) {
    const img = new Image();
    img.src = op.dataURL;
    try { ctx.drawImage(img, op.x||0, op.y||0, (op.w||img.width), (op.h||img.height)); } catch {}
    return;
  }

  if (op.points) {
    ctx.save();
    if (op.type === "ERASER" || op.type === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = op.size || 18;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      op.points.forEach((p,i)=> { if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
      ctx.stroke();
    } else {
      ctx.globalAlpha = op.alpha ?? 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = op.color || DEFAULTS.stroke;
      ctx.lineWidth = op.size || DEFAULTS.strokeWidth;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      op.points.forEach((p,i)=> { if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (op.start && op.end) {
    ctx.save();
    ctx.strokeStyle = op.color || DEFAULTS.stroke;
    ctx.lineWidth = op.size || DEFAULTS.strokeWidth;
    if (op.type === "rect") {
      const x = Math.min(op.start.x, op.end.x);
      const y = Math.min(op.start.y, op.end.y);
      const w = Math.abs(op.end.x - op.start.x);
      const h = Math.abs(op.end.y - op.start.y);
      ctx.strokeRect(x,y,w,h);
    } else if (op.type === "ellipse") {
      const cx = (op.start.x + op.end.x)/2;
      const cy = (op.start.y + op.end.y)/2;
      const rx = Math.abs(op.end.x - op.start.x)/2;
      const ry = Math.abs(op.end.y - op.start.y)/2;
      ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.stroke();
    } else if (op.type === "arrow") {
      const { x: x1, y: y1 } = op.start; const { x: x2, y: y2 } = op.end;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = 10 + (op.size || 2)*0.6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - len * Math.cos(angle - Math.PI/6), y2 - len * Math.sin(angle - Math.PI/6));
      ctx.lineTo(x2 - len * Math.cos(angle + Math.PI/6), y2 - len * Math.sin(angle + Math.PI/6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    } else {
      // line
      ctx.beginPath(); ctx.moveTo(op.start.x, op.start.y); ctx.lineTo(op.end.x, op.end.y); ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (op.text) {
    ctx.save();
    ctx.fillStyle = op.sticky ? "black" : (op.color || "white");
    ctx.font = `${op.textSize || DEFAULTS.textSize}px ui-sans-serif,system-ui,Arial`;
    if (op.sticky) {
      const padding = 8;
      const metrics = ctx.measureText(op.text);
      const h = (op.textSize||DEFAULTS.textSize) + padding*2;
      const w = metrics.width + padding*2;
      ctx.fillStyle = op.color || "#facc15"; ctx.globalAlpha = 0.9;
      ctx.fillRect((op.pos?.x||0)-padding, (op.pos?.y||0)-h+padding, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "black";
      ctx.fillText(op.text, op.pos?.x||0, (op.pos?.y||0));
    } else {
      ctx.fillText(op.text, op.pos?.x||0, (op.pos?.y||0));
    }
    ctx.restore();
  }
}

/* ===== UI bits ===== */
function ToolBtn({ cur, set, id, label, icon }) {
  const on = cur===id;
  return (
    <button
      onClick={()=>set(id)}
      className={`px-2 py-1 rounded-md text-xs border ${on ? "bg-emerald-600 text-white border-emerald-600" : "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"}`}
      title={label}
      aria-pressed={on}
    >
      <span className="mr-1">{icon}</span>{label}
    </button>
  );
}
