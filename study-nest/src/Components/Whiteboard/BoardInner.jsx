import React, { useEffect, useRef, useState } from "react";
import { 
  TOOLS, 
  DEFAULTS, 
  uid, 
  drawOp, 
  ensureTextBBox, 
  hitTest, 
  HANDLE_SIZE, 
  rasterizePage, 
  downloadURI 
} from "./WhiteboardUtils";
import { ToolBtn } from "./WhiteboardUI";

export default function BoardInner({ rtc, roomId, me, participants, className = "", visible = true }) {
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
  const [bg, setBg] = useState("dark"); // "dark" | "light"
  const [selection, setSelection] = useState(null); // {opId, handle?: "nw"|"ne"|"se"|"sw"}
  const [editingText, setEditingText] = useState(null); // {opId, el}

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef({ ox: 0, oy: 0, dragging: false, pointer: null, activeOp: null });

  /* -------------------- Helpers -------------------- */
  const page = () => board.pages[board.pageIndex];
  const canEdit = () => board.owner === me?.id || board.allowEdits;
  const bgColor = bg === "dark" ? "#0b0b0b" : "#ffffff";
  const textOnBg = bg === "dark" ? "#ffffff" : "#000000";

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
      if (msg.from && me?.id && msg.from === me.id) return;
      if (msg.to && me?.id && msg.to !== me.id) return;

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
          const idx = pg.ops.findIndex((o) => o.id === msg.op.id);
          if (idx >= 0) pg.ops[idx] = msg.op; else pg.ops.push(msg.op);
          return next;
        });
      }

      if (msg.type === "wb-sync-request") {
        const isOwner = board.owner === me?.id;
        const isHost = participants?.length > 0 && participants[0]?.self;
        if (isOwner || (board.owner !== me?.id && isHost)) {
          rtc.sendWB({
            type: "wb-sync-response",
            to: msg.from,
            board: board,
          });
        }
      }

      if (msg.type === "wb-sync-response") {
        if (!msg.board) return;
        setBoard(msg.board);
      }
    });

    if (me?.id) {
      rtc.sendWB({ type: "wb-sync-request", from: me.id });
    }

    return () => off && off();
  }, [rtc, me?.id, board, participants]); // Added participants to deps

  /* -------------------- Rendering loop -------------------- */
  useEffect(() => {
    if (!visible) return;
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

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      const pg = page();
      if (!pg) return;

      ctx.save();
      ctx.translate(stageRef.current.ox, stageRef.current.oy);
      ctx.scale(zoom, zoom);

      pg.ops.forEach((op) => drawOp(ctx, op, { bgColor, textOnBg }));

      if (selection) drawSelection(ctx, pg.ops.find((o) => o.id === selection.opId), zoom);

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = bg === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
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
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [board, zoom, visible, bg, selection, bgColor, textOnBg]);

  // Persist board to localStorage per room
  useEffect(() => {
    try {
      const key = `studynest.board.${roomId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.pages?.length) setBoard(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const key = `studynest.board.${roomId}`;
      localStorage.setItem(key, JSON.stringify(board));
    } catch {}
  }, [board, roomId]);

  // drag & drop import images
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const onDrop = (e) => {
      e.preventDefault();
      if (!canEdit()) return;
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - stageRef.current.ox) / zoom;
        const y = (e.clientY - rect.top - stageRef.current.oy) / zoom;
        const op = { id: uid(), type: "image", x, y, w: 320, h: 240, dataURL: reader.result, pageId: page().id };
        addOp(op, true);
      };
      reader.readAsDataURL(file);
    };
    const onDragOver = (e) => e.preventDefault();
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", onDragOver);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", onDragOver);
    };
  }, [zoom]);

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

  /* -------------------- Text helpers -------------------- */
  function spawnTextEditor(op) {
    const base = canvasRef.current;
    if (!base) return;
    const x = (op.pos.x * zoom) + stageRef.current.ox;
    const y = (op.pos.y * zoom) + stageRef.current.oy - (op.textSize || DEFAULTS.textSize);
    const ta = document.createElement("textarea");
    ta.value = op.text || "";
    ta.style.position = "absolute";
    ta.style.left = `${x}px`;
    ta.style.top = `${y}px`;
    ta.style.transform = "translate(-2px,-2px)";
    ta.style.font = `${op.textSize || DEFAULTS.textSize}px ui-sans-serif, system-ui, Arial`;
    ta.style.lineHeight = "1.2";
    ta.style.padding = op.sticky ? "8px" : "0px";
    ta.style.background = op.sticky ? (op.color || "#facc15") : "transparent";
    ta.style.color = op.sticky ? "#000" : (bg === "dark" ? "#fff" : "#000");
    ta.style.border = op.sticky ? "1px solid rgba(0,0,0,.2)" : "none";
    ta.style.resize = "none";
    ta.style.zIndex = 10;
    ta.style.minWidth = "120px";
    ta.style.outline = "none";
    ta.style.pointerEvents = "auto";

    const parent = base.parentElement;
    parent.appendChild(ta);
    ta.focus();
    setEditingText({ opId: op.id, el: ta });

    const commit = () => {
      const text = ta.value.trim();
      if (parent.contains(ta)) parent.removeChild(ta);
      setEditingText(null);
      if (!text) {
        setBoard(prev => {
          const next = structuredClone(prev);
          const pg = next.pages[next.pageIndex];
          const i = pg.ops.findIndex(o => o.id === op.id);
          if (i >= 0) pg.ops.splice(i, 1);
          return next;
        });
        rtc?.sendWB?.({ type: "wb-op", pageId: page().id, op: { id: op.id, type: "remove" } });
        return;
      }
      op.text = text;
      const ctx = base.getContext("2d");
      ensureTextBBox(op, ctx);
      setBoard(prev => {
        const next = structuredClone(prev);
        const pg = next.pages[next.pageIndex];
        const i = pg.ops.findIndex(o => o.id === op.id);
        if (i >= 0) pg.ops[i] = op;
        return next;
      });
      rtc?.sendWB?.({ type: "wb-op", pageId: page().id, op });
    };

    ta.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        if (parent.contains(ta)) parent.removeChild(ta);
        setEditingText(null);
      } else if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        commit();
      }
    });
    ta.addEventListener("blur", commit);
  }

  function drawSelection(ctx, op, zoom) {
    if (!op) return;
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);

    if (op.type === "image") {
      ctx.strokeRect(op.x, op.y, op.w, op.h);
      const hs = HANDLE_SIZE / zoom;
      const corners = [
        { x: op.x, y: op.y },
        { x: op.x + op.w, y: op.y },
        { x: op.x + op.w, y: op.y + op.h },
        { x: op.x, y: op.y + op.h },
      ];
      ctx.fillStyle = "#22c55e";
      corners.forEach(c => {
        ctx.fillRect(c.x - hs, c.y - hs, hs * 2, hs * 2);
      });
    } else if (op.text && op.bbox) {
      const { x, y, w, h } = op.bbox;
      ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
  }

  /* -------------------- Input handlers -------------------- */
  function down(e) {
    if (tool === TOOLS.HAND) {
      setPanning(true);
      stageRef.current.dragging = true;
      stageRef.current.pointer = { x: e.clientX, y: e.clientY };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      return;
    }
    if (!canEdit()) return;

    const p = pointerPos(e);

    if (tool === TOOLS.SELECT) {
      const pg = page();
      const ctxForText = canvasRef.current.getContext("2d");
      for (let i = pg.ops.length - 1; i >= 0; i--) {
        const op = pg.ops[i];
        const test = hitTest(op, p.x, p.y, zoom, ctxForText);
        if (test.hit) {
          setSelection({ opId: op.id, handle: test.handle });
          stageRef.current.activeOp = { ...op };
          stageRef.current.pointer = { x: p.x, y: p.y };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up, { once: true });
          if ((op.type === TOOLS.TEXT || op.sticky) && e.detail === 2) {
            spawnTextEditor(op);
          }
          return;
        }
      }
      setSelection(null);
      return;
    }

    const baseProps = {
      id: uid(),
      color,
      size,
      type: tool,
      t: Date.now(),
      pageId: page().id,
    };

    let op = null;

    if ([TOOLS.PEN, TOOLS.HIGHLIGHTER, TOOLS.ERASER].includes(tool)) {
      op = { ...baseProps, points: [p], alpha: tool === TOOLS.HIGHLIGHTER ? 0.25 : 1 };
    } else if ([TOOLS.LINE, TOOLS.ARROW, TOOLS.RECT, TOOLS.ELLIPSE].includes(tool)) {
      op = { ...baseProps, start: p, end: p };
    } else if (tool === TOOLS.TEXT) {
      op = { ...baseProps, text: "", textSize, pos: p };
      addOp(op, true);
      spawnTextEditor(op);
      return;
    } else if (tool === TOOLS.STICKY) {
      op = { ...baseProps, text: "", textSize: DEFAULTS.stickySize, pos: p, sticky: true, color: "#facc15" };
      addOp(op, true);
      spawnTextEditor(op);
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

    if (tool === TOOLS.SELECT && selection?.opId === op.id) {
      const dx = p.x - stageRef.current.pointer.x;
      const dy = p.y - stageRef.current.pointer.y;
      stageRef.current.pointer = { x: p.x, y: p.y };
      const pg = page();
      const idx = pg.ops.findIndex(o => o.id === op.id);
      if (idx < 0) return;
      const cur = structuredClone(pg.ops[idx]);
      if (cur.type === "image") {
        if (selection.handle) {
          const minSize = 10;
          let { x, y, w, h } = cur;
          if (selection.handle === "nw") { x += dx; y += dy; w -= dx; h -= dy; }
          if (selection.handle === "ne") { y += dy; w += dx; h -= dy; }
          if (selection.handle === "se") { w += dx; h += dy; }
          if (selection.handle === "sw") { x += dx; w -= dx; h += dy; }
          cur.x = w < minSize ? cur.x : x;
          cur.y = h < minSize ? cur.y : y;
          cur.w = Math.max(minSize, w);
          cur.h = Math.max(minSize, h);
        } else {
          cur.x += dx; cur.y += dy;
        }
      } else if (cur.text) {
        cur.pos = { x: (cur.pos?.x || 0) + dx, y: (cur.pos?.y || 0) + dy };
        ensureTextBBox(cur, canvasRef.current.getContext("2d"));
      }
      rtc?.sendWB?.({ type: "wb-op", pageId: page().id, op: cur });
      setBoard(prev => {
        const next = structuredClone(prev);
        const pg2 = next.pages[next.pageIndex];
        const i2 = pg2.ops.findIndex(o => o.id === cur.id);
        if (i2 >= 0) pg2.ops[i2] = cur;
        return next;
      });
      return;
    }

    if (op.points) op.points.push(p);
    if (op.start && op.end) op.end = p;

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
    if (!e.ctrlKey) return;
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
    const data = await rasterizePage(page(), canvasRef.current, bgColor, textOnBg);
    downloadURI(data, `board-page${board.pageIndex + 1}.png`);
  }

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "l", unit: "px", format: "a4" });
    for (let i = 0; i < board.pages.length; i++) {
      if (i > 0) doc.addPage();
      const data = await rasterizePage(board.pages[i], canvasRef.current, bgColor, textOnBg);
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.addImage(data, "PNG", 0, 0, w, h);
    }
    doc.save(`board.pdf`);
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
          <ToolBtn cur={tool} set={setTool} id={TOOLS.SELECT} label="Select" icon="🔲" />
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
            onClick={() => setBg((b) => (b === "dark" ? "light" : "dark"))}
            className="px-3 py-1 rounded border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
            title="Toggle background"
          >
            BG: {bg === "dark" ? "Black" : "White"}
          </button>
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
        style={{
          cursor:
            tool === TOOLS.HAND ? (stageRef.current.dragging ? "grabbing" : "grab")
            : tool === TOOLS.SELECT ? (selection ? "move" : "default")
            : "crosshair"
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
      </div>
    </div>
  );
}
