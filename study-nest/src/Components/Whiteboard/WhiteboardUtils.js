export const TOOLS = {
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
  SELECT: "select",
};

export const DEFAULTS = {
  stroke: "#10b981",
  strokeWidth: 3,
  textSize: 20,
  stickySize: 16,
};

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function drawOp(ctx, op, theme) {
  const { bgColor, textOnBg } = theme || { bgColor: "#0b0b0b", textOnBg: "#ffffff" };
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
    const isEraser = op.type === "eraser";
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = op.alpha ?? 1;
    ctx.strokeStyle = isEraser ? bgColor : (op.color || DEFAULTS.stroke);
    if (op.type === "highlighter") ctx.globalAlpha = 0.25;

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
      ctx.fillStyle = "#000";
      ctx.fillText(op.text, op.pos?.x || 0, op.pos?.y || 0);
      op.bbox = { x: (op.pos?.x || 0) - padding, y: (op.pos?.y || 0) - (op.textSize || DEFAULTS.textSize), w, h };
    } else {
      ctx.fillStyle = op.color || textOnBg;
      ctx.fillText(op.text, op.pos?.x || 0, op.pos?.y || 0);
      const metrics = ctx.measureText(op.text);
      const h = (op.textSize || DEFAULTS.textSize);
      const w = metrics.width;
      op.bbox = { x: (op.pos?.x || 0), y: (op.pos?.y || 0) - h, w, h };
    }
    ctx.restore();
  }
}

export function ensureTextBBox(op, ctx) {
  const size = op.textSize || DEFAULTS.textSize;
  ctx.save();
  ctx.font = `${size}px ui-sans-serif, system-ui, Arial`;
  const metrics = ctx.measureText(op.text || "");
  const padding = op.sticky ? 8 : 0;
  const w = metrics.width + padding * 2;
  const h = size + padding * 2;
  ctx.restore();
  const x = (op.pos?.x || 0) - padding;
  const y = (op.pos?.y || 0) - size + (op.sticky ? padding : 0);
  op.bbox = { x, y, w, h };
  return op;
}

export const HANDLE_SIZE = 8;

export function hitTest(op, x, y, zoom, ctxForText) {
  if (op.type === "image") {
    const { x: ox, y: oy, w, h } = op;
    if (x >= ox && x <= ox + w && y >= oy && y <= oy + h) {
      // check handles first
      const hs = HANDLE_SIZE / zoom;
      const corners = [
        { id: "nw", x: ox, y: oy },
        { id: "ne", x: ox + w, y: oy },
        { id: "se", x: ox + w, y: oy + h },
        { id: "sw", x: ox, y: oy + h },
      ];
      for (const c of corners) {
        if (x >= c.x - hs && x <= c.x + hs && y >= c.y - hs && y <= c.y + hs) {
          return { hit: true, handle: c.id };
        }
      }
      return { hit: true };
    }
  }
  if (op.text) {
    if (!op.bbox && ctxForText) ensureTextBBox(op, ctxForText);
    if (op.bbox) {
      const { x: ox, y: oy, w, h } = op.bbox;
      if (x >= ox && x <= ox + w && y >= oy && y <= oy + h) {
        return { hit: true };
      }
    }
  }
  return { hit: false };
}

export async function rasterizePage(pg, baseCanvas, bgColor, textOnBg) {
  const canvas = document.createElement("canvas");
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw ops
  pg.ops.forEach((op) => drawOp(ctx, op, { bgColor, textOnBg }));

  // draw grid on top (subtle)
  ctx.save();
  ctx.strokeStyle = bgColor === "#0b0b0b" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const step = 32;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export function downloadURI(uri, filename) {
  const a = document.createElement("a");
  a.href = uri;
  a.download = filename;
  a.click();
}
