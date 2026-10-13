/* Network Studio canvas: drawing the network (on screen and for image export) and all pointer work. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};
const SVGNS = "http://www.w3.org/2000/svg";

const NODE_COLORS = { blue: "#3a63d8", teal: "#119b9b", green: "#2f9e5a", amber: "#d48a10", red: "#d6453d", pink: "#d4468c", purple: "#7b55d6", slate: "#5a6a82" };
const NOTE_COLORS = ["yellow", "pink", "blue", "green", "gray", "white"];
const NOTE_LIGHT = { yellow: "#fff0b3", pink: "#ffd9e2", blue: "#d6e6ff", green: "#d5f2dd", gray: "#e9ecf1", white: "#ffffff" };
const LIVE_P = {
  ink: "var(--ink)", muted: "var(--muted)", faint: "var(--faint)", surface: "var(--surface)", bg: "var(--bg)", line: "var(--line-2)",
  pos: "var(--pos)", neg: "var(--neg)", neutral: "var(--faint)", accent: "var(--accent)", accentSoft: "var(--accent-soft)", exec: "var(--exec)", bad: "var(--bad)",
  type: { input: "var(--n-input)", hidden: "var(--n-hidden)", output: "var(--n-output)" },
  note: c => `var(--note-${c})`, noteInk: "var(--note-ink)", halo: "var(--bg)",
  mono: "var(--mono)", body: "var(--body)"
};
const EXPORT_P = {
  ink: "#141a26", muted: "#566174", faint: "#8a93a3", surface: "#ffffff", bg: "#ffffff", line: "#c6ceda",
  pos: "#2463b8", neg: "#d0661a", neutral: "#8a93a3", accent: "#3047c9", accentSoft: "rgba(48,71,201,.10)", exec: "#e3a21a", bad: "#c8372d",
  type: { input: "#4b5b74", hidden: "#3047c9", output: "#d48a10" },
  note: c => NOTE_LIGHT[c] || NOTE_LIGHT.yellow, noteInk: "#1d2330", halo: "#ffffff",
  mono: "'JetBrains Mono', Menlo, Consolas, monospace", body: "'IBM Plex Sans', 'Segoe UI', Arial, sans-serif"
};
const GEOM = { input: { hw: 29, hh: 19 }, hidden: { r: 24 }, output: { r: 27 } };
const halfW = n => n.type === "input" ? GEOM.input.hw : GEOM[n.type].r;
const halfH = n => n.type === "input" ? GEOM.input.hh : GEOM[n.type].r;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- note text wrapping ---------- */
let measureCtx = null;
function wrapNote(note) {
  const size = note.size || 15, w = Math.max(120, note.w || 260) - 26;
  if (!measureCtx && typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
  const ctx = measureCtx; if (ctx) ctx.font = `${size}px "IBM Plex Sans", system-ui, sans-serif`;
  const meas = s => ctx ? ctx.measureText(s).width : s.length * size * 0.52;
  const out = [];
  String(note.text || "").split("\n").forEach(par => {
    if (!par) { out.push(""); return; }
    let line = "";
    for (const word of par.split(/(\s+)/)) {
      const test = line + word;
      if (meas(test) > w && line.trim()) { out.push(line.trimEnd()); line = word.trimStart(); }
      else line = test;
      while (meas(line) > w && line.length > 1) { let k = line.length - 1; while (k > 1 && meas(line.slice(0, k)) > w) k--; out.push(line.slice(0, k)); line = line.slice(k); }
    }
    out.push(line);
  });
  const lh = Math.round(size * 1.38);
  return { lines: out, lh, h: Math.max(48, out.length * lh + 22), size };
}

/* ---------- edge geometry ---------- */
function edgePath(a, b, nodes) {
  const ra = halfW(a) + 2, rb = halfW(b) + 4;
  if (b.x - a.x > 70) {
    const x1 = a.x + ra, y1 = a.y, x2 = b.x - rb, y2 = b.y, dx = Math.max(36, (x2 - x1) * 0.45);
    let off = 0;
    for (const n of nodes) {
      if (n === a || n === b || n.x <= x1 + 12 || n.x >= x2 - 12) continue;
      const t = (n.x - x1) / (x2 - x1), ly = y1 + (y2 - y1) * t;
      if (Math.abs(n.y - ly) < halfH(n) + 22) { const o = (n.y >= ly ? -1 : 1) * (halfH(n) + 50 - Math.abs(n.y - ly)) * 1.6; if (Math.abs(o) > Math.abs(off)) off = o; }
    }
    return { d: `M${x1},${y1} C${x1 + dx},${y1 + off} ${x2 - dx},${y2 + off} ${x2},${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 + off * 0.75 };
  }
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const x1 = a.x + Math.cos(ang) * ra, y1 = a.y + Math.sin(ang) * ra, x2 = b.x - Math.cos(ang) * rb, y2 = b.y - Math.sin(ang) * rb;
  return { d: `M${x1},${y1} L${x2},${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}
const fmtVal = v => Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2).replace(/^(-?)0\./, "$1.");

/* ---------- scene: shared by the live canvas and image export ---------- */
function scene(o) {
  const { design, G, P, values, weights, interactive } = o;
  const g = design.graph, ds = G ? G.ds : NS.core.getDataset(design.data, o.lang);
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  const sel = o.sel || { nodes: new Set(), edges: new Set(), notes: new Set() };
  const hv = o.hover || null, exec = o.exec || null;
  const execN = new Set(exec ? exec.nodes : []), execE = new Set(exec ? exec.edges : []);
  const errIds = new Set(G ? G.errors.map(e => e.id).filter(Boolean) : []);
  const focus = sel.nodes.size === 1 && !sel.edges.size ? [...sel.nodes][0] : null;
  let maxW = 1; if (weights) for (const k in weights) maxW = Math.max(maxW, Math.abs(weights[k]));
  const parts = { notes: "", edges: "", nodes: "", over: "" };
  const V = n => NS.core.nodeVar(n, ds);

  for (const nt of design.notes || []) {
    const w = Math.max(120, nt.w || 260), m = wrapNote(nt), isSel = sel.notes.has(nt.id);
    const fill = P.note(nt.color || "yellow");
    let s = `<g ${interactive ? `class="note-g" data-note="${nt.id}"` : ""} transform="translate(${nt.x},${nt.y})">`;
    if (!interactive) s += `<rect x="1" y="3" width="${w}" height="${m.h}" rx="10" style="fill:rgba(0,0,0,.08)"/>`;
    s += `<rect width="${w}" height="${m.h}" rx="10" style="fill:${fill};stroke:${isSel ? P.accent : "rgba(0,0,0,.08)"};stroke-width:${isSel ? 2 : 1}${interactive ? ";filter:drop-shadow(0 2px 5px rgba(0,0,0,.12))" : ""}"/>`;
    m.lines.forEach((ln, i) => { s += `<text x="13" y="${13 + m.size + i * m.lh - m.size * 0.18}" style="font-family:${P.body};font-size:${m.size}px;fill:${P.noteInk}" ${interactive ? 'pointer-events="none"' : ""}>${esc(ln)}</text>`; });
    if (interactive && isSel && sel.notes.size === 1) s += `<rect data-resize="${nt.id}" x="${w - 5}" y="${m.h / 2 - 14}" width="10" height="28" rx="5" style="fill:${P.surface};stroke:${P.accent};stroke-width:1.5;cursor:ew-resize"/>`;
    s += `</g>`;
    parts.notes += s;
  }

  for (const e of g.edges) {
    const a = byId.get(e.from), b = byId.get(e.to); if (!a || !b) continue;
    const p = edgePath(a, b, g.nodes), w = weights ? weights[e.id] : null;
    const isSel = sel.edges.has(e.id), isHv = hv && hv.kind === "edge" && hv.id === e.id, isEx = execE.has(e.id);
    const col = w == null ? P.neutral : w >= 0 ? P.pos : P.neg, mk = w == null ? "neu" : w >= 0 ? "pos" : "neg";
    let op = w == null ? 0.75 : 0.38 + 0.6 * Math.min(1, Math.abs(w) / maxW);
    const wd = w == null ? 1.8 : 0.9 + 3.8 * Math.min(1, Math.abs(w) / maxW);
    if (focus && e.from !== focus && e.to !== focus) op *= 0.16;
    if (exec && !isEx) op *= 0.35;
    let s = "";
    if (isSel || isHv) s += `<path d="${p.d}" style="fill:none;stroke:${P.accent};stroke-opacity:.3;stroke-width:${wd + 8}"/>`;
    if (isEx) s += `<path d="${p.d}" style="fill:none;stroke:${P.exec};stroke-opacity:.5;stroke-width:${wd + 7}"/>`;
    s += `<path d="${p.d}" style="fill:none;stroke:${col};stroke-opacity:${op.toFixed(2)};stroke-width:${wd.toFixed(2)}" marker-end="url(#${o.mid}-${mk})"/>`;
    if (interactive) s += `<path class="e-hit" d="${p.d}" data-edge="${e.id}"/>`;
    parts.edges += s;
    if ((isSel || isHv) && w != null && interactive) {
      const txt = (w >= 0 ? "+" : "") + w.toFixed(3), tw = txt.length * 7.2 + 14;
      parts.over += `<g class="w-pill" transform="translate(${p.mx},${p.my - 14})" pointer-events="none"><rect x="${-tw / 2}" y="-11" width="${tw}" height="22" rx="11"/><text style="fill:${w >= 0 ? P.pos : P.neg}">${txt}</text></g>`;
    }
  }

  for (const n of g.nodes) {
    const v = values ? values[n.id] : null, isSel = sel.nodes.has(n.id), isHv = hv && hv.kind === "node" && hv.id === n.id;
    const isEx = execN.has(n.id), isErr = errIds.has(n.id);
    const color = n.color && NODE_COLORS[n.color] ? NODE_COLORS[n.color] : P.type[n.type];
    const inten = v == null ? 0 : Math.min(1, Math.abs(v)), vcol = v != null && v < 0 ? P.neg : P.pos;
    const r = n.type === "input" ? 0 : GEOM[n.type].r, hw = halfW(n), hh = halfH(n);
    let s = `<g ${interactive ? `class="n-g" data-node="${n.id}"` : ""}>`;
    const ring = (pad, style) => n.type === "input"
      ? `<rect x="${n.x - hw - pad}" y="${n.y - hh - pad}" width="${2 * (hw + pad)}" height="${2 * (hh + pad)}" rx="${12 + pad}" style="${style}"/>`
      : `<circle cx="${n.x}" cy="${n.y}" r="${r + pad}" style="${style}"/>`;
    if (isEx) s += ring(8, `fill:${P.exec};fill-opacity:.22;stroke:${P.exec};stroke-width:2`);
    if (isSel) s += ring(6, `fill:none;stroke:${P.accent};stroke-width:2;stroke-dasharray:5 4`);
    else if (isHv) s += ring(6, `fill:none;stroke:${P.accent};stroke-width:1.6;stroke-opacity:.6`);
    const stroke = isErr ? `stroke:${P.bad};stroke-dasharray:4 3;stroke-width:2` : `stroke:${color};stroke-width:2.2`;
    if (n.type === "input") {
      s += `<rect x="${n.x - hw}" y="${n.y - hh}" width="${2 * hw}" height="${2 * hh}" rx="11" style="fill:${P.surface};${stroke}"/>`;
      s += `<rect x="${n.x - hw + 4}" y="${n.y - hh + 4}" width="${2 * hw - 8}" height="${2 * hh - 8}" rx="7" style="fill:${v != null ? vcol : color};fill-opacity:${v != null ? (0.1 + 0.78 * inten).toFixed(2) : 0.1}" pointer-events="none"/>`;
    } else {
      s += `<circle cx="${n.x}" cy="${n.y}" r="${r}" style="fill:${P.surface};${stroke}"/>`;
      s += `<circle cx="${n.x}" cy="${n.y}" r="${r - 4.5}" style="fill:${v != null ? vcol : color};fill-opacity:${v != null ? (0.1 + 0.78 * inten).toFixed(2) : 0.1}" pointer-events="none"/>`;
      if (n.type === "output") s += `<circle cx="${n.x}" cy="${n.y}" r="${r + 4}" style="fill:none;stroke:${color};stroke-width:1.4;stroke-opacity:.55" pointer-events="none"/>`;
    }
    if (v != null) s += `<text x="${n.x}" y="${n.y}" style="font-family:${P.mono};font-size:11px;font-weight:500;text-anchor:middle;dominant-baseline:central;fill:${inten > 0.6 ? "#ffffff" : P.ink}" pointer-events="none">${fmtVal(v)}</text>`;
    else if (isErr) s += `<text x="${n.x}" y="${n.y}" style="font-family:${P.body};font-size:15px;font-weight:700;text-anchor:middle;dominant-baseline:central;fill:${P.bad}" pointer-events="none">!</text>`;
    const name = V(n), halo = `paint-order:stroke;stroke:${P.halo};stroke-width:4px;stroke-linejoin:round`;
    const nameStyle = `font-family:${P.mono};font-size:12.5px;font-weight:500;fill:${P.ink};${halo}`;
    if (n.type === "input") s += `<text x="${n.x - hw - 9}" y="${n.y}" style="${nameStyle};text-anchor:end;dominant-baseline:central" pointer-events="none">${esc(name)}</text>`;
    else {
      const actLabel = NS.core.ACT[n.act] ? NS.core.ACT[n.act].short : "";
      const gap = Math.min(999, ...g.nodes.filter(m => m !== n && Math.abs(m.x - n.x) < 46 && m.y > n.y).map(m => m.y - n.y));
      if (gap < 2 * r + 24) s += `<text x="${n.x + r + 14}" y="${n.y - r + 4}" style="${nameStyle};text-anchor:start" pointer-events="none">${esc(name)}<tspan style="font-family:${P.body};font-size:10.5px;font-weight:400;fill:${P.muted}"> ${actLabel}</tspan></text>`;
      else {
        s += `<text x="${n.x}" y="${n.y + r + 17}" style="${nameStyle};text-anchor:middle" pointer-events="none">${esc(name)}</text>`;
        if (gap >= 2 * r + 40) s += `<text x="${n.x}" y="${n.y + r + 31}" style="font-family:${P.body};font-size:10.5px;fill:${P.muted};text-anchor:middle;${halo}" pointer-events="none">${actLabel}</text>`;
      }
    }
    if (interactive) s += `<title>${esc(name)}${v != null ? ` = ${v.toFixed(4)}` : ""}</title>`;
    s += `</g>`;
    if (interactive && n.type !== "output") {
      const px = n.x + hw + 10;
      s += `<g class="port" data-port="${n.id}"><circle cx="${px}" cy="${n.y}" r="13" style="fill:transparent"/><circle class="pdot" cx="${px}" cy="${n.y}" r="5"/></g>`;
    }
    parts.nodes += s;
  }

  const mk = (k, c) => `<marker id="${o.mid}-${k}" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1.2 L10,5 L0,8.8 z" style="fill:${c}"/></marker>`;
  const defs = `<defs>${mk("pos", P.pos)}${mk("neg", P.neg)}${mk("neu", P.neutral)}${mk("acc", P.accent)}</defs>`;
  return { defs, body: parts.notes + parts.edges + parts.nodes + parts.over };
}
function bbox(design) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of design.graph.nodes) {
    const extraL = n.type === "input" ? 46 : 0, extraB = n.type === "input" ? 0 : 36;
    x0 = Math.min(x0, n.x - halfW(n) - extraL); x1 = Math.max(x1, n.x + halfW(n) + 22); y0 = Math.min(y0, n.y - halfH(n) - 8); y1 = Math.max(y1, n.y + halfH(n) + extraB);
  }
  for (const nt of design.notes || []) { const m = wrapNote(nt); x0 = Math.min(x0, nt.x); y0 = Math.min(y0, nt.y); x1 = Math.max(x1, nt.x + (nt.w || 260)); y1 = Math.max(y1, nt.y + m.h); }
  if (!isFinite(x0)) return { x: -200, y: -150, w: 400, h: 300 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function exportSVG(design, opts) {
  opts = opts || {};
  const P = Object.assign({}, EXPORT_P);
  if (opts.transparent) P.halo = "#ffffff";
  const sc = scene({ design, G: opts.G, P, values: opts.values, weights: opts.weights, interactive: false, mid: "x", lang: opts.lang });
  const bb = bbox(design), pad = 32, title = opts.title || "";
  const titleH = title ? 44 : 0;
  const W = Math.ceil(bb.w + pad * 2), H = Math.ceil(bb.h + pad * 2 + titleH);
  let s = `<svg xmlns="${SVGNS}" width="${W}" height="${H}" viewBox="${bb.x - pad} ${bb.y - pad - titleH} ${W} ${H}">`;
  if (opts.meta) s += `<metadata id="network-studio-design">${opts.meta}</metadata>`;
  s += sc.defs;
  if (!opts.transparent) s += `<rect x="${bb.x - pad}" y="${bb.y - pad - titleH}" width="${W}" height="${H}" fill="#ffffff"/>`;
  if (title) s += `<text x="${bb.x}" y="${bb.y - pad - titleH + 38}" style="font-family:'Bricolage Grotesque','IBM Plex Sans',Arial,sans-serif;font-size:22px;font-weight:700;fill:#141a26">${esc(title)}</text>`;
  s += sc.body + `</svg>`;
  return { svg: s, width: W, height: H };
}

/* =================== live canvas =================== */
const view = { x: 0, y: 0, k: 1 };
let host, svg, A, vp;
let mode = null; // drag | pan | marquee | connect | resize | pinch
let st = {};
let hover = null, spaceDown = false, tool = "select", lastDown = null;
const pointers = new Map();

function init(api) {
  A = api; host = document.getElementById("canvasHost"); svg = document.getElementById("canvas");
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onCancel);
  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("contextmenu", onContext);
  host.addEventListener("dragover", e => { if ([...e.dataTransfer.types].includes("application/x-ns-element")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
  host.addEventListener("drop", e => {
    const kind = e.dataTransfer.getData("application/x-ns-element"); if (!kind) return;
    e.preventDefault(); e.stopPropagation();
    const p = toWorld(e.clientX, e.clientY); A.addElement(kind, p.x, p.y);
  });
  host.addEventListener("pointerleave", () => { if (hover && !mode) { hover = null; A.render(); } });
  window.addEventListener("keydown", e => { if (e.code === "Space" && !isTyping(e)) { if (!spaceDown) { spaceDown = true; host.classList.add("hand"); } } });
  window.addEventListener("keyup", e => { if (e.code === "Space") { spaceDown = false; if (tool !== "hand") host.classList.remove("hand"); } });
  new ResizeObserver(() => A.render()).observe(host);
}
function isTyping(e) { const t = (e.target.tagName || "").toLowerCase(); return t === "input" || t === "textarea" || t === "select" || e.target.isContentEditable || (e.target.closest && e.target.closest(".monaco-editor")); }
function setTool(t) { tool = t; host.classList.toggle("hand", t === "hand"); }
function toWorld(cx, cy) { const r = host.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k }; }
function toScreen(x, y) { return { x: x * view.k + view.x, y: y * view.k + view.y }; }

function render(o) {
  const sc = scene(Object.assign({ P: LIVE_P, interactive: true, mid: "m", hover }, o));
  let over = "";
  if (mode === "connect" && st.from) {
    const a = o.design.graph.nodes.find(n => n.id === st.from);
    if (a) over += `<path d="M${a.x + halfW(a) + 10},${a.y} L${st.x},${st.y}" style="fill:none;stroke:var(--accent);stroke-width:${2 / view.k};stroke-dasharray:${6 / view.k} ${4 / view.k}" marker-end="url(#m-acc)"/>`;
    if (st.target) { const t = o.design.graph.nodes.find(n => n.id === st.target); if (t) over += t.type === "input" ? "" : `<circle cx="${t.x}" cy="${t.y}" r="${halfW(t) + 8}" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/>`; }
  }
  if (mode === "marquee" && st.moved) {
    const x = Math.min(st.x0, st.x1), y = Math.min(st.y0, st.y1);
    over += `<rect class="marquee" x="${x}" y="${y}" width="${Math.abs(st.x1 - st.x0)}" height="${Math.abs(st.y1 - st.y0)}" style="stroke-width:${1 / view.k}"/>`;
  }
  if (mode === "drag" && st.guides) for (const gd of st.guides) {
    over += gd.v ? `<line class="guide" x1="${gd.v}" y1="${gd.a}" x2="${gd.v}" y2="${gd.b}" style="stroke-width:${1 / view.k}"/>` : `<line class="guide" x1="${gd.a}" y1="${gd.h}" x2="${gd.b}" y2="${gd.h}" style="stroke-width:${1 / view.k}"/>`;
  }
  let empty = "";
  if (!o.design.graph.nodes.some(n => n.type !== "input") && !(o.design.notes || []).length) {
    const bb = bbox(o.design);
    empty = `<text class="empty-hint" x="${bb.x + bb.w + 220}" y="${bb.y + bb.h / 2}">${esc(o.emptyHint || "")}</text>`;
  }
  svg.innerHTML = sc.defs + `<g id="vp" transform="translate(${view.x},${view.y}) scale(${view.k})">${sc.body}${empty}${over}</g>`;
  host.style.backgroundSize = `${24 * view.k}px ${24 * view.k}px`;
  host.style.backgroundPosition = `${view.x}px ${view.y}px`;
}
function selectionScreenBox(design, sel) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const nodes = design.graph.nodes;
  for (const n of nodes) if (sel.nodes.has(n.id)) { x0 = Math.min(x0, n.x - halfW(n) - 6); x1 = Math.max(x1, n.x + halfW(n) + 6); y0 = Math.min(y0, n.y - halfH(n) - 6); y1 = Math.max(y1, n.y + halfH(n) + 6); }
  for (const nt of design.notes || []) if (sel.notes.has(nt.id)) { const m = wrapNote(nt); x0 = Math.min(x0, nt.x); x1 = Math.max(x1, nt.x + (nt.w || 260)); y0 = Math.min(y0, nt.y); y1 = Math.max(y1, nt.y + m.h); }
  for (const e of design.graph.edges) if (sel.edges.has(e.id)) {
    const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to); if (!a || !b) continue;
    const p = edgePath(a, b, nodes); x0 = Math.min(x0, p.mx - 10); x1 = Math.max(x1, p.mx + 10); y0 = Math.min(y0, p.my - 18); y1 = Math.max(y1, p.my + 10);
  }
  if (!isFinite(x0)) return null;
  const a = toScreen(x0, y0), b = toScreen(x1, y1);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
function fit(design, opt) {
  const bb = bbox(design), r = host.getBoundingClientRect();
  const top = document.querySelector(".stage-top"), padT = (top ? top.getBoundingClientRect().height : 60) + 40, padB = (opt && opt.padB) || 90, padX = 60;
  const k = Math.max(0.2, Math.min(1.15, (r.width - padX * 2) / Math.max(bb.w, 1), (r.height - padT - padB) / Math.max(bb.h, 1)));
  const onlyInputs = !design.graph.nodes.some(n => n.type !== "input") && !(design.notes || []).length;
  view.k = onlyInputs ? 1 : k; view.x = (onlyInputs ? r.width * 0.22 : r.width / 2) - (bb.x + bb.w / 2) * view.k; view.y = padT + (r.height - padT - padB) / 2 - (bb.y + bb.h / 2) * view.k;
}
function zoomAt(k, cx, cy) {
  const r = host.getBoundingClientRect();
  if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  const p = toWorld(cx, cy);
  view.k = Math.max(0.15, Math.min(4, k));
  view.x = cx - r.left - p.x * view.k; view.y = cy - r.top - p.y * view.k;
}
function hitNode(p, design, pad) {
  let best = null, bd = Infinity;
  for (const n of design.graph.nodes) {
    const dx = Math.abs(p.x - n.x) - halfW(n), dy = Math.abs(p.y - n.y) - halfH(n);
    const d = Math.max(dx, dy);
    if (d < (pad || 0) && d < bd) { bd = d; best = n; }
  }
  return best;
}
function targetOf(e) {
  const t = e.target;
  const port = t.closest && t.closest("[data-port]"); if (port) return { kind: "port", id: port.dataset.port };
  const rs = t.closest && t.closest("[data-resize]"); if (rs) return { kind: "resize", id: rs.dataset.resize };
  const nd = t.closest && t.closest("[data-node]"); if (nd) return { kind: "node", id: nd.dataset.node };
  const nt = t.closest && t.closest("[data-note]"); if (nt) return { kind: "note", id: nt.dataset.note };
  const ed = t.closest && t.closest("[data-edge]"); if (ed) return { kind: "edge", id: ed.dataset.edge };
  return { kind: "empty" };
}
function onDown(e) {
  if (e.target.closest(".ctx-bar,.rename-pop,.note-editor")) return;
  host.focus({ preventScroll: true });
  A.closePopups();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [p1, p2] = [...pointers.values()];
    mode = "pinch"; st = { d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), k0: view.k, cx: (p1.x + p2.x) / 2, cy: (p1.y + p2.y) / 2 };
    return;
  }
  if (e.button === 2) return;
  const now = performance.now();
  if (e.button === 0 && lastDown && now - lastDown.t < 380 && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 7 && !targetOf(e).kind.startsWith("port")) {
    lastDown = null; e.preventDefault(); onDbl(e); return;
  }
  lastDown = { t: now, x: e.clientX, y: e.clientY };
  const design = A.design(), p = toWorld(e.clientX, e.clientY), tg = targetOf(e);
  if (e.button === 1 || spaceDown || tool === "hand") {
    mode = "pan"; st = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; host.classList.add("panning");
    host.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }
  const sel = A.sel();
  if (tg.kind === "port") {
    mode = "connect"; st = { from: tg.id, x: p.x, y: p.y, target: null }; host.classList.add("connecting");
    host.setPointerCapture(e.pointerId); e.preventDefault(); A.render(); return;
  }
  if (tg.kind === "resize") {
    const nt = design.notes.find(n => n.id === tg.id);
    mode = "resize"; st = { id: tg.id, w0: nt.w || 260, x0: p.x, pushed: false };
    host.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }
  if (tg.kind === "node" || tg.kind === "note") {
    const set = tg.kind === "node" ? sel.nodes : sel.notes;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) { if (set.has(tg.id)) set.delete(tg.id); else set.add(tg.id); A.selectionChanged(); }
    else if (!set.has(tg.id)) { A.selectOnly(tg.kind, tg.id); }
    else A.selectionChanged(false);
    const start = new Map();
    design.graph.nodes.forEach(n => { if (sel.nodes.has(n.id)) start.set("n" + n.id, { x: n.x, y: n.y }); });
    (design.notes || []).forEach(n => { if (sel.notes.has(n.id)) start.set("t" + n.id, { x: n.x, y: n.y }); });
    const prim = tg.kind === "node" ? design.graph.nodes.find(n => n.id === tg.id) : design.notes.find(n => n.id === tg.id);
    mode = "drag"; st = { sx: p.x, sy: p.y, start, moved: false, prim: prim ? { kind: tg.kind, id: tg.id, x0: prim.x, y0: prim.y } : null, guides: [] };
    host.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }
  if (tg.kind === "edge") {
    if (e.shiftKey || e.ctrlKey || e.metaKey) { if (sel.edges.has(tg.id)) sel.edges.delete(tg.id); else sel.edges.add(tg.id); A.selectionChanged(); }
    else A.selectOnly("edge", tg.id);
    return;
  }
  if (!(e.shiftKey || e.ctrlKey || e.metaKey)) A.clearSelection();
  mode = "marquee"; st = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, moved: false, additive: e.shiftKey || e.ctrlKey || e.metaKey, base: { nodes: new Set(sel.nodes), notes: new Set(sel.notes) } };
  host.setPointerCapture(e.pointerId);
}
function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (mode === "pinch") {
    const ps = [...pointers.values()]; if (ps.length < 2) return;
    const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
    zoomAt(st.k0 * d / st.d0, st.cx, st.cy); A.render(); return;
  }
  const design = A.design(), p = toWorld(e.clientX, e.clientY);
  if (!mode) {
    const tg = targetOf(e);
    const h = tg.kind === "edge" || tg.kind === "node" ? { kind: tg.kind, id: tg.id } : null;
    if (JSON.stringify(h) !== JSON.stringify(hover)) { hover = h; A.render(); }
    return;
  }
  if (mode === "pan") { view.x = st.vx + e.clientX - st.sx; view.y = st.vy + e.clientY - st.sy; A.render(); return; }
  if (mode === "connect") {
    st.x = p.x; st.y = p.y;
    const t = hitNode(p, design, 14); st.target = t && t.id !== st.from ? t.id : null; A.render(); return;
  }
  if (mode === "resize") {
    if (!st.pushed) { A.pushUndo(); st.pushed = true; }
    const nt = design.notes.find(n => n.id === st.id); nt.w = Math.round(Math.max(140, Math.min(640, st.w0 + p.x - st.x0))); A.render(); return;
  }
  if (mode === "marquee") {
    st.x1 = p.x; st.y1 = p.y; st.moved = st.moved || Math.hypot(st.x1 - st.x0, st.y1 - st.y0) * view.k > 4;
    if (st.moved) {
      const x0 = Math.min(st.x0, st.x1), x1 = Math.max(st.x0, st.x1), y0 = Math.min(st.y0, st.y1), y1 = Math.max(st.y0, st.y1);
      const sel = A.sel();
      sel.nodes = new Set(st.additive ? st.base.nodes : []); sel.notes = new Set(st.additive ? st.base.notes : []); sel.edges = new Set();
      design.graph.nodes.forEach(n => { if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) sel.nodes.add(n.id); });
      (design.notes || []).forEach(n => { const m = wrapNote(n); if (n.x < x1 && n.x + (n.w || 260) > x0 && n.y < y1 && n.y + m.h > y0) sel.notes.add(n.id); });
      A.setSel(sel);
    }
    A.render(); return;
  }
  if (mode === "drag") {
    let dx = p.x - st.sx, dy = p.y - st.sy;
    if (!st.moved && Math.hypot(dx, dy) * view.k < 3) return;
    if (!st.moved) { A.pushUndo(); st.moved = true; A.hideCtx(); }
    st.guides = [];
    if (st.prim && !e.altKey) {
      const nx = st.prim.x0 + dx, ny = st.prim.y0 + dy, tol = 6 / view.k;
      let gx = null, gy = null;
      if (st.prim.kind === "node") {
        const sel = A.sel();
        for (const n of design.graph.nodes) {
          if (sel.nodes.has(n.id)) continue;
          if (gx == null && Math.abs(n.x - nx) < tol) gx = n.x;
          if (gy == null && Math.abs(n.y - ny) < tol) gy = n.y;
        }
        if (gx != null) { dx = gx - st.prim.x0; st.guides.push({ v: gx, a: Math.min(ny, ...design.graph.nodes.filter(n => n.x === gx).map(n => n.y)) - 40, b: Math.max(ny, ...design.graph.nodes.filter(n => n.x === gx).map(n => n.y)) + 40 }); }
        if (gy != null) { dy = gy - st.prim.y0; st.guides.push({ h: gy, a: Math.min(nx, ...design.graph.nodes.filter(n => n.y === gy).map(n => n.x)) - 60, b: Math.max(nx, ...design.graph.nodes.filter(n => n.y === gy).map(n => n.x)) + 60 }); }
      }
      if (A.prefs().snap) {
        if (gx == null) dx = Math.round((st.prim.x0 + dx) / 12) * 12 - st.prim.x0;
        if (gy == null) dy = Math.round((st.prim.y0 + dy) / 12) * 12 - st.prim.y0;
      }
    }
    design.graph.nodes.forEach(n => { const s0 = st.start.get("n" + n.id); if (s0) { n.x = Math.round(s0.x + dx); n.y = Math.round(s0.y + dy); } });
    (design.notes || []).forEach(n => { const s0 = st.start.get("t" + n.id); if (s0) { n.x = Math.round(s0.x + dx); n.y = Math.round(s0.y + dy); } });
    A.render();
  }
}
function onUp(e) {
  pointers.delete(e.pointerId);
  const m = mode; mode = null;
  host.classList.remove("panning", "connecting");
  if (m === "pinch") { st = {}; A.render(); return; }
  if (m === "connect") {
    const t = st.target, from = st.from; st = {};
    if (t) A.addEdge(from, t); else A.render();
    return;
  }
  if (m === "drag") { const moved = st.moved; st = {}; if (moved) A.moved(); else A.render(); return; }
  if (m === "resize") { st = {}; A.moved(); return; }
  if (m === "marquee") { st = {}; A.selectionChanged(); return; }
  st = {}; A.render();
}
function onCancel(e) { pointers.delete(e.pointerId); mode = null; st = {}; host.classList.remove("panning", "connecting"); A.render(); }
function onDbl(e) {
  if (e.target.closest(".ctx-bar,.rename-pop,.note-editor")) return;
  const p = toWorld(e.clientX, e.clientY), design = A.design();
  let tg = { kind: "empty" };
  const n = hitNode(p, design, 4);
  if (n) tg = { kind: "node", id: n.id };
  else {
    const nt = (design.notes || []).slice().reverse().find(o => { const m = wrapNote(o); return p.x >= o.x && p.x <= o.x + (o.w || 260) && p.y >= o.y && p.y <= o.y + m.h; });
    if (nt) tg = { kind: "note", id: nt.id };
    else if (targetOf(e).kind === "edge") return;
  }
  if (tg.kind === "empty") A.addElement("hidden", p.x, p.y);
  else if (tg.kind === "node") A.renameNode(tg.id);
  else if (tg.kind === "note") A.editNote(tg.id);
}
function onWheel(e) {
  if (e.target.closest(".hud,.issues,.ctx-bar")) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) { zoomAt(view.k * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX, e.clientY); }
  else { const f = e.deltaMode ? 30 : 1; view.x -= (e.shiftKey ? e.deltaY : e.deltaX) * f; view.y -= (e.shiftKey ? 0 : e.deltaY) * f; }
  A.render();
}
function onContext(e) {
  e.preventDefault();
  const tg = targetOf(e), p = toWorld(e.clientX, e.clientY);
  if ((tg.kind === "node" || tg.kind === "note" || tg.kind === "edge")) {
    const sel = A.sel(), set = tg.kind === "node" ? sel.nodes : tg.kind === "note" ? sel.notes : sel.edges;
    if (!set.has(tg.id)) A.selectOnly(tg.kind, tg.id);
  }
  A.contextMenu(e.clientX, e.clientY, tg, p);
}

NS.canvas = { init, render, fit, zoomAt, toWorld, toScreen, view, setTool, selectionScreenBox, exportSVG, bbox, wrapNote, NODE_COLORS, NOTE_COLORS, isTyping,
  get hover() { return hover; }, set hover(v) { hover = v; } };
})(typeof window !== "undefined" ? window : globalThis);
