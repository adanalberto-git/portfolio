/* Network Studio: application state and wiring. */
(function () {
"use strict";
const C = NS.core, CV = NS.canvas, IO = NS.io, HL = NS.pyhl, I = NS.i18n;
const $ = id => document.getElementById(id);
const t = (k, ...a) => I.t(k, ...a);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEYS = { design: "ns3.design", prefs: "ns3.prefs", editor: "ns3.editor", seen: "ns3.seen" };
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const DEFAULT_PREFS = { lang: null, theme: null, codeTheme: "auto", fontSize: 13, wrap: false, minimap: false, codeHidden: false, codeW: null, dockH: null,
  flyout: "elements", hudOpen: true, showValues: true, snap: true, speed: 5, codeTab: "live", lastAct: "tanh", layerUnits: 3, layerAct: "tanh", layerFromSel: true, layerToOut: true };

const S = {
  design: null, prefs: Object.assign({}, DEFAULT_PREFS, store.get(KEYS.prefs) || {}),
  sel: { nodes: new Set(), edges: new Set(), notes: new Set() },
  G: null, spec: null, prog: null, run: null, mode: "idle", timer: null, tick: 0, sample: 0,
  undo: [], redo: [], prevLines: [], lineEls: [], codeHover: null, values: null, valTick: -1,
  clipboard: null, ed: null, edP: null, renaming: null, editingNote: null, saveT: null, hudT: 0
};
const lang = () => I.lang;

/* ================= design helpers ================= */
const graph = () => S.design.graph;
const nodeById = id => graph().nodes.find(n => n.id === id);
const noteById = id => S.design.notes.find(n => n.id === id);
function ds() { return S.G ? S.G.ds : C.getDataset(S.design.data, lang()); }
function nextHiddenName() {
  const d = ds(), used = new Set(graph().nodes.map(n => C.nodeVar(n, d)));
  let k = 1; while (used.has("h" + k)) k++; return "h" + k;
}
function normData(d) {
  if (!d || typeof d !== "object") return { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] };
  if (d.kind === "logic") { const k = d.inputs === 3 ? 3 : 2; return { kind: "logic", inputs: k, targets: Array.from({ length: 1 << k }, (_, i) => (d.targets && d.targets[i]) ? 1 : 0) }; }
  if (["circles", "moons", "spiral", "agl"].includes(d.kind)) return { kind: d.kind };
  return { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] };
}
function normalizeDesign(d) {
  if (!d || typeof d !== "object") throw new Error("bad");
  // version 2 (single-page Network Studio) designs
  if (!d.data && typeof d.dataset === "string") {
    const map = { and: [0, 0, 0, 1], or: [0, 1, 1, 1], xor: [0, 1, 1, 0] };
    d.data = map[d.dataset] ? { kind: "logic", inputs: 2, targets: map[d.dataset] } : { kind: d.dataset };
    d.training = { loss: d.loss, lr: d.lr, epochs: d.epochs, seed: d.seed, style: d.style };
  }
  const data = normData(d.data), dset = C.getDataset(data, lang());
  const tr = d.training || {};
  const out = { version: 3, title: String(d.title || t("untitled")).slice(0, 60), data, graph: { nodes: [], edges: [] }, notes: [],
    training: { loss: tr.loss === "mse" ? "mse" : "bce", lr: +tr.lr > 0 && +tr.lr <= 10 ? +tr.lr : 0.5, epochs: Math.max(10, Math.min(50000, (tr.epochs | 0) || 2000)),
      seed: Math.max(0, Math.min(99999, tr.seed | 0)), style: tr.style === "matrix" ? "matrix" : "neuron", plot: !!tr.plot } };
  const g = d.graph || {}, ids = new Set(), feats = new Set();
  let hasOut = false;
  for (const n of g.nodes || []) {
    if (!n || !["input", "hidden", "output"].includes(n.type)) continue;
    let id = String(n.id || C.newId("n")); if (ids.has(id)) id = C.newId("n"); ids.add(id);
    const x = isFinite(+n.x) ? Math.round(+n.x) : 0, y = isFinite(+n.y) ? Math.round(+n.y) : 0;
    const color = n.color && CV.NODE_COLORS[n.color] ? n.color : undefined;
    if (n.type === "input") {
      const f = n.feature | 0; if (f < 0 || f >= dset.nIn || feats.has(f)) continue; feats.add(f);
      out.graph.nodes.push({ id, type: "input", feature: f, x, y, color });
    } else if (n.type === "output") {
      if (hasOut) continue; hasOut = true;
      const name = typeof n.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(n.name) ? n.name : "out";
      out.graph.nodes.push({ id, type: "output", name, act: "sigmoid", x, y, color });
    } else {
      out.graph.nodes.push({ id, type: "hidden", name: String(n.name || ""), act: C.ACT[n.act] ? n.act : "tanh", x, y, color });
    }
  }
  // fix missing or invalid hidden names
  const used = new Set();
  for (const n of out.graph.nodes) {
    if (n.type !== "hidden") { used.add(C.nodeVar(n, dset)); continue; }
    if (!/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(n.name) || used.has(n.name) || C.PY_KEYWORDS.has(n.name)) { let k = 1; while (used.has("h" + k)) k++; n.name = "h" + k; }
    used.add(n.name);
  }
  const nset = new Map(out.graph.nodes.map(n => [n.id, n])), eset = new Set();
  for (const e of g.edges || []) {
    const a = nset.get(String(e.from)), b = nset.get(String(e.to));
    if (!a || !b || a === b || b.type === "input" || a.type === "output") continue;
    const key = a.id + ">" + b.id; if (eset.has(key)) continue;
    if (C.wouldCycle(out.graph, a.id, b.id)) continue;
    eset.add(key);
    let id = String(e.id || C.newId("e")); if (ids.has(id)) id = C.newId("e"); ids.add(id);
    out.graph.edges.push({ id, from: a.id, to: b.id });
  }
  for (const nt of d.notes || []) {
    if (!nt) continue;
    out.notes.push({ id: String(nt.id || C.newId("t")), x: Math.round(+nt.x || 0), y: Math.round(+nt.y || 0), w: Math.max(140, Math.min(640, +nt.w || 260)),
      text: String(nt.text || "").slice(0, 3000), color: CV.NOTE_COLORS.includes(nt.color) ? nt.color : "yellow", size: Math.max(11, Math.min(32, +nt.size || 15)) });
  }
  return out;
}
function designFromTemplate(key) {
  const tp = C.makeTemplate(key, lang());
  return normalizeDesign(Object.assign({ title: tp.title }, tp));
}

/* ================= undo / save ================= */
function snapshot() { return JSON.stringify(S.design); }
function pushUndo() { S.undo.push(snapshot()); if (S.undo.length > 100) S.undo.shift(); S.redo = []; updateUndoUI(); }
function undo() {
  if (!S.undo.length) return;
  S.redo.push(snapshot()); S.design = JSON.parse(S.undo.pop());
  afterLoad(false); toast(t("undone"));
}
function redo() {
  if (!S.redo.length) return;
  S.undo.push(snapshot()); S.design = JSON.parse(S.redo.pop());
  afterLoad(false); toast(t("redone"));
}
function updateUndoUI() { $("undoBtn").disabled = !S.undo.length; $("redoBtn").disabled = !S.redo.length; }
function scheduleSave() {
  clearTimeout(S.saveT);
  S.saveT = setTimeout(() => { const ok = store.set(KEYS.design, S.design); $("saveState").textContent = ok ? t("savedLocal") : ""; }, 500);
}
function savePrefs() { store.set(KEYS.prefs, S.prefs); }
function afterLoad(fitView) {
  S.sel = { nodes: new Set(), edges: new Set(), notes: new Set() };
  S.sample = 0;
  $("designTitle").value = S.design.title;
  rebuild(null, { flash: false });
  if (fitView) CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 });
  renderCanvas(); refreshPanel(); updateUndoUI();
}

/* ================= rebuild pipeline ================= */
function rebuild(reason, opts) {
  opts = opts || {};
  stopSim();
  S.mode = "idle";
  S.G = C.compileGraph(graph(), S.design.data, lang());
  S.spec = C.buildSpec(Object.assign({}, S.design.training, { lang: lang() }));
  S.prog = S.G.valid ? C.buildProgram(S.spec, S.G) : C.invalidProgram(S.G, lang());
  S.run = S.G.valid ? C.createRun(S.spec, S.G, S.prog) : null;
  S.tick++;
  if (S.sample >= S.G.ds.X.length) S.sample = 0;
  cleanSel();
  renderLive(opts.flash !== false);
  resetSimConsole(); renderVars();
  renderStatus(); updateSimUI(); renderCanvas(); renderHUD(true);
  updateCtxBar(); updateStyleSeg(); updateEditorDirty();
  if (["inspect", "training"].includes(S.prefs.flyout) && !$("flyout").hidden) refreshPanel();
  if (reason) setSimStat(`<b>${esc(reason)}</b>`);
  scheduleSave();
}
function cleanSel() {
  const g = graph();
  S.sel.nodes.forEach(id => { if (!g.nodes.some(n => n.id === id)) S.sel.nodes.delete(id); });
  S.sel.edges.forEach(id => { if (!g.edges.some(e => e.id === id)) S.sel.edges.delete(id); });
  S.sel.notes.forEach(id => { if (!S.design.notes.some(n => n.id === id)) S.sel.notes.delete(id); });
}
function visualChange() { renderCanvas(); updateCtxBar(); scheduleSave(); }

/* ================= canvas ================= */
function values() {
  if (!S.run || !S.prefs.showValues) return null;
  if (S.valTick !== S.tick) {
    const x = S.G.ds.X[S.sample]; const v = C.forwardRows(S.run, [x]); S.values = {};
    for (const k in v) S.values[k] = v[k][0];
    S.valTick = S.tick;
  }
  return S.values;
}
function renderCanvas() {
  const exec = (S.mode === "step" || S.mode === "walk") && S.run && S.run.lastOp ? S.run.lastOp : null;
  CV.render({ design: S.design, G: S.G, sel: S.sel, values: values(), weights: S.run ? S.run.w : null, exec,
    hover: S.codeHover || CV.hover, emptyHint: t("emptyHint"), lang: lang() });
  const z = Math.round(CV.view.k * 100); $("zoomPct").textContent = z + "%";
  positionCtxBar();
}
const canvasApi = {
  design: () => S.design, sel: () => S.sel, prefs: () => S.prefs,
  render: () => { renderCanvas(); },
  pushUndo, hideCtx: () => { $("ctxBar").hidden = true; },
  closePopups,
  setSel(sel) { S.sel = sel; },
  selectOnly(kind, id) { S.sel = { nodes: new Set(), edges: new Set(), notes: new Set() }; (kind === "node" ? S.sel.nodes : kind === "edge" ? S.sel.edges : S.sel.notes).add(id); selectionChanged(); },
  clearSelection() { if (S.sel.nodes.size + S.sel.edges.size + S.sel.notes.size) { S.sel = { nodes: new Set(), edges: new Set(), notes: new Set() }; selectionChanged(); } },
  selectionChanged: (scroll) => selectionChanged(scroll),
  moved() { visualChange(); },
  addEdge, addElement, renameNode: id => openRename(id), editNote: id => openNoteEditor(id),
  contextMenu: openContextMenu
};
function selectionChanged(scroll) {
  renderCanvas(); updateCtxBar(); highlightLive(scroll !== false);
  if (S.prefs.flyout === "inspect" && !$("flyout").hidden) refreshPanel();
}

/* ================= editing operations ================= */
function viewCenterWorld() { const r = $("canvasHost").getBoundingClientRect(); return CV.toWorld(r.left + r.width / 2, r.top + r.height / 2); }
function freeSpot(x, y) {
  const busy = (px, py) => graph().nodes.some(n => Math.hypot(n.x - px, n.y - py) < 60) || S.design.notes.some(n => px > n.x - 30 && px < n.x + (n.w || 260) + 30 && py > n.y - 30 && py < n.y + 140);
  for (let r = 0; r < 12; r++) for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const px = Math.round(x + dx * r * 36), py = Math.round(y + dy * r * 36);
    if (!busy(px, py)) return { x: px, y: py };
  }
  return { x: Math.round(x), y: Math.round(y) };
}
function addElement(kind, x, y) {
  const at = x == null ? viewCenterWorld() : { x, y };
  const dset = ds();
  if (kind === "note") {
    pushUndo();
    const nt = { id: C.newId("t"), x: Math.round(at.x - 130), y: Math.round(at.y - 30), w: 260, text: t("newNote"), color: "yellow", size: 15 };
    S.design.notes.push(nt);
    S.sel = { nodes: new Set(), edges: new Set(), notes: new Set([nt.id]) };
    visualChange(); selectionChanged(); setTimeout(() => openNoteEditor(nt.id, true), 30); return;
  }
  if (kind === "layer") return addLayer(at);
  if (kind === "input") {
    const have = new Set(graph().nodes.filter(n => n.type === "input").map(n => n.feature));
    const f = dset.inputNames.findIndex((_, i) => !have.has(i));
    if (f < 0) { toast(t("allInputs", dset.inputNames.length)); return; }
    const p = x == null ? freeSpot(Math.min(...graph().nodes.map(n => n.x), at.x), at.y) : freeSpot(at.x, at.y);
    pushUndo();
    const n = { id: C.newId("n"), type: "input", feature: f, x: p.x, y: p.y };
    graph().nodes.push(n); S.sel = { nodes: new Set([n.id]), edges: new Set(), notes: new Set() };
    rebuild(t("rAddedInput", dset.inputNames[f])); selectionChanged(); return;
  }
  if (kind === "output" && graph().nodes.some(n => n.type === "output")) { toast(t("oneOutput")); return; }
  let p;
  if (kind === "output" && x == null && graph().nodes.length) {
    const ns = graph().nodes; p = freeSpot(Math.max(...ns.map(n => n.x)) + 220, Math.round(ns.reduce((s, n) => s + n.y, 0) / ns.length));
  } else if (kind === "hidden" && x == null && graph().nodes.length && !graph().nodes.some(n => n.type === "hidden")) {
    const ins = graph().nodes.filter(n => n.type === "input"); p = freeSpot(Math.max(...ins.map(n => n.x)) + 210, Math.round(ins.reduce((s, n) => s + n.y, 0) / Math.max(1, ins.length)));
  } else p = freeSpot(at.x, at.y);
  pushUndo();
  const n = kind === "hidden" ? { id: C.newId("n"), type: "hidden", name: nextHiddenName(), act: S.prefs.lastAct || "tanh", x: p.x, y: p.y }
                              : { id: C.newId("n"), type: "output", name: "out", act: "sigmoid", x: p.x, y: p.y };
  graph().nodes.push(n); S.sel = { nodes: new Set([n.id]), edges: new Set(), notes: new Set() };
  rebuild(kind === "hidden" ? t("rAddedHidden", n.name) : t("rAddedOutput")); selectionChanged();
}
function addLayer(at) {
  const units = Math.max(1, Math.min(16, S.prefs.layerUnits | 0 || 3)), act = S.prefs.layerAct || "tanh";
  const from = graph().nodes.filter(n => S.sel.nodes.has(n.id) && n.type !== "output");
  const out = graph().nodes.find(n => n.type === "output");
  pushUndo();
  let x = at.x;
  if (from.length) x = Math.max(...from.map(n => n.x)) + 200;
  const sp = 74, y0 = (from.length ? from.reduce((s, n) => s + n.y, 0) / from.length : at.y) - (units - 1) * sp / 2;
  const made = [];
  for (let i = 0; i < units; i++) {
    const n = { id: C.newId("n"), type: "hidden", name: "", act, x: Math.round(x), y: Math.round(y0 + i * sp) };
    graph().nodes.push(n); n.name = nextHiddenName(); made.push(n);
  }
  if (S.prefs.layerFromSel) for (const a of from) for (const b of made) graph().edges.push({ id: C.newId("e"), from: a.id, to: b.id });
  if (S.prefs.layerToOut && out) {
    if (out.x <= x + 80) { out.x = Math.round(x + 200); out.y = Math.round(y0 + (units - 1) * sp / 2); }
    for (const b of made) graph().edges.push({ id: C.newId("e"), from: b.id, to: out.id });
  }
  S.sel = { nodes: new Set(made.map(n => n.id)), edges: new Set(), notes: new Set() };
  rebuild(t("rAddedLayer", units)); selectionChanged();
}
function edgeProblem(from, to) {
  const a = nodeById(from), b = nodeById(to);
  if (!a || !b || from === to) return "";
  if (b.type === "input") return t("eIntoInput");
  if (a.type === "output") return t("eFromOutput");
  if (graph().edges.some(e => e.from === from && e.to === to)) return t("eExists");
  if (C.wouldCycle(graph(), from, to)) return t("eLoop");
  return null;
}
function addEdge(from, to) {
  const p = edgeProblem(from, to);
  if (p) { if (p) toast(p); renderCanvas(); return; }
  if (p === "") { renderCanvas(); return; }
  pushUndo();
  const e = { id: C.newId("e"), from, to };
  graph().edges.push(e);
  S.sel = { nodes: new Set(), edges: new Set([e.id]), notes: new Set() };
  rebuild(t("rAddedArrow", C.nodeVar(nodeById(from), ds()), C.nodeVar(nodeById(to), ds()))); selectionChanged();
}
function deleteSelection() {
  const s = S.sel; if (!s.nodes.size && !s.edges.size && !s.notes.size) return;
  pushUndo();
  const g = graph();
  const structural = s.nodes.size || s.edges.size;
  g.nodes = g.nodes.filter(n => !s.nodes.has(n.id));
  g.edges = g.edges.filter(e => !s.edges.has(e.id) && !s.nodes.has(e.from) && !s.nodes.has(e.to));
  S.design.notes = S.design.notes.filter(n => !s.notes.has(n.id));
  const count = s.nodes.size + s.edges.size + s.notes.size;
  S.sel = { nodes: new Set(), edges: new Set(), notes: new Set() };
  if (structural) rebuild(t("rDeleted", count)); else visualChange();
  selectionChanged();
}
function copySelection() {
  const s = S.sel, g = graph();
  const nodes = g.nodes.filter(n => s.nodes.has(n.id) && n.type === "hidden");
  const ids = new Set(nodes.map(n => n.id));
  const edges = g.edges.filter(e => ids.has(e.from) || ids.has(e.to));
  const notes = S.design.notes.filter(n => s.notes.has(n.id));
  if (!nodes.length && !notes.length) { if (s.nodes.size) toast(t("copyOnlyHidden")); return false; }
  S.clipboard = JSON.parse(JSON.stringify({ nodes, edges, notes }));
  return true;
}
function pasteClipboard(offset) {
  const cb = S.clipboard; if (!cb) return;
  pushUndo();
  const map = new Map(), g = graph(), d = offset == null ? 40 : offset;
  const newSel = { nodes: new Set(), edges: new Set(), notes: new Set() };
  for (const n of cb.nodes) {
    const m = Object.assign({}, n, { id: C.newId("n"), x: n.x + d, y: n.y + d });
    g.nodes.push(m); m.name = ""; m.name = nextHiddenName(); map.set(n.id, m.id); newSel.nodes.add(m.id);
  }
  for (const e of cb.edges) {
    const from = map.get(e.from) || (nodeById(e.from) ? e.from : null), to = map.get(e.to) || (nodeById(e.to) ? e.to : null);
    if (!from || !to || (from === e.from && to === e.to)) continue;
    if (edgeProblem(from, to) !== null) continue;
    g.edges.push({ id: C.newId("e"), from, to });
  }
  for (const nt of cb.notes) { const m = Object.assign({}, nt, { id: C.newId("t"), x: nt.x + d, y: nt.y + d }); S.design.notes.push(m); newSel.notes.add(m.id); }
  S.sel = newSel;
  if (cb.nodes.length) rebuild(t("rPasted")); else visualChange();
  selectionChanged();
}
function duplicateSelection() { if (copySelection()) pasteClipboard(40); }
function selectAll() {
  S.sel = { nodes: new Set(graph().nodes.map(n => n.id)), edges: new Set(), notes: new Set(S.design.notes.map(n => n.id)) };
  selectionChanged();
}
function nudge(dx, dy) {
  if (!S.sel.nodes.size && !S.sel.notes.size) return;
  pushUndo();
  graph().nodes.forEach(n => { if (S.sel.nodes.has(n.id)) { n.x += dx; n.y += dy; } });
  S.design.notes.forEach(n => { if (S.sel.notes.has(n.id)) { n.x += dx; n.y += dy; } });
  visualChange();
}
function selectedItems() {
  const items = [];
  graph().nodes.forEach(n => { if (S.sel.nodes.has(n.id)) items.push({ o: n, x: n.x, y: n.y, w: 0, h: 0, node: true }); });
  S.design.notes.forEach(n => { if (S.sel.notes.has(n.id)) { const m = CV.wrapNote(n); items.push({ o: n, x: n.x + (n.w || 260) / 2, y: n.y + m.h / 2, w: n.w || 260, h: m.h }); } });
  return items;
}
function align(how) {
  const it = selectedItems(); if (it.length < 2) return;
  pushUndo();
  const set = (i, cx, cy) => { if (i.node) { i.o.x = Math.round(cx); i.o.y = Math.round(cy); } else { i.o.x = Math.round(cx - i.w / 2); i.o.y = Math.round(cy - i.h / 2); } };
  const xs = it.map(i => i.x), ys = it.map(i => i.y);
  if (how === "left") it.forEach(i => set(i, Math.min(...xs), i.y));
  if (how === "center") it.forEach(i => set(i, (Math.min(...xs) + Math.max(...xs)) / 2, i.y));
  if (how === "right") it.forEach(i => set(i, Math.max(...xs), i.y));
  if (how === "top") it.forEach(i => set(i, i.x, Math.min(...ys)));
  if (how === "middle") it.forEach(i => set(i, i.x, (Math.min(...ys) + Math.max(...ys)) / 2));
  if (how === "bottom") it.forEach(i => set(i, i.x, Math.max(...ys)));
  if (how === "dv" || how === "dh") {
    const k = how === "dv" ? "y" : "x"; const s = it.slice().sort((a, b) => a[k] - b[k]);
    const lo = s[0][k], hi = s[s.length - 1][k];
    s.forEach((i, j) => { const v = lo + (hi - lo) * j / (s.length - 1); if (k === "y") set(i, i.x, v); else set(i, v, i.y); });
  }
  visualChange();
}
function connectColumns() {
  const nodes = graph().nodes.filter(n => S.sel.nodes.has(n.id)).sort((a, b) => a.x - b.x);
  if (nodes.length < 2) return;
  const cols = [];
  for (const n of nodes) { const c = cols[cols.length - 1]; if (c && Math.abs(c.x - n.x) < 50) c.items.push(n); else cols.push({ x: n.x, items: [n] }); }
  if (cols.length < 2) { toast(t("needColumns")); return; }
  pushUndo();
  let added = 0;
  for (let i = 0; i + 1 < cols.length; i++) for (const a of cols[i].items) for (const b of cols[i + 1].items) {
    if (edgeProblem(a.id, b.id) === null) { graph().edges.push({ id: C.newId("e"), from: a.id, to: b.id }); added++; }
  }
  if (!added) { S.undo.pop(); updateUndoUI(); toast(t("nothingToConnect")); return; }
  rebuild(t("rConnected", added));
}
function setActivation(act) {
  const nodes = graph().nodes.filter(n => S.sel.nodes.has(n.id) && n.type === "hidden");
  if (!nodes.length) return;
  pushUndo(); nodes.forEach(n => n.act = act); S.prefs.lastAct = act; savePrefs();
  rebuild(t("rAct", I.actLabel(act)));
}
function setColor(color) {
  pushUndo();
  graph().nodes.forEach(n => { if (S.sel.nodes.has(n.id)) n.color = color === "auto" ? undefined : color; });
  S.design.notes.forEach(n => { if (S.sel.notes.has(n.id) && CV.NOTE_COLORS.includes(color)) n.color = color; });
  visualChange();
}
function setNoteSize(delta) {
  pushUndo();
  S.design.notes.forEach(n => { if (S.sel.notes.has(n.id)) n.size = Math.max(11, Math.min(32, (n.size || 15) + delta)); });
  visualChange();
}
function tidy() {
  if (!graph().nodes.length) return;
  pushUndo();
  const before = new Map(graph().nodes.map(n => [n.id, { x: n.x, y: n.y }]));
  const bbOld = CV.bbox(S.design);
  C.tidyGraph(graph());
  const bbNew = CV.bbox({ graph: graph(), notes: [] });
  const dx = Math.round(bbOld.x - bbNew.x + 40), dy = Math.round((bbOld.y + bbOld.h / 2) - (bbNew.y + bbNew.h / 2));
  graph().nodes.forEach(n => { n.x += dx; n.y += dy; });
  void before;
  visualChange(); toast(t("tidied"));
}
function changeData(newData) {
  const old = ds(), data = normData(newData), nd = C.getDataset(data, lang());
  pushUndo();
  const g = graph(), inputs = g.nodes.filter(n => n.type === "input");
  const targets = new Set(g.edges.filter(e => inputs.some(n => n.id === e.from)).map(e => e.to));
  const drop = new Set(inputs.filter(n => n.feature >= nd.nIn).map(n => n.id));
  g.nodes = g.nodes.filter(n => !drop.has(n.id)); g.edges = g.edges.filter(e => !drop.has(e.from));
  const have = new Set(g.nodes.filter(n => n.type === "input").map(n => n.feature));
  const keep = g.nodes.filter(n => n.type === "input");
  const x0 = keep.length ? Math.min(...keep.map(n => n.x)) : (g.nodes.length ? Math.min(...g.nodes.map(n => n.x)) - 210 : -220);
  let yMax = keep.length ? Math.max(...keep.map(n => n.y)) : -60;
  const added = [];
  for (let f = 0; f < nd.nIn; f++) if (!have.has(f) && (f >= old.nIn || inputs.some(n => n.feature === f) || !inputs.length)) {
    yMax += 64; const n = { id: C.newId("n"), type: "input", feature: f, x: x0, y: yMax }; g.nodes.push(n); added.push(n);
  }
  added.forEach(n => targets.forEach(tid => { if (nodeById(tid)) g.edges.push({ id: C.newId("e"), from: n.id, to: tid }); }));
  S.design.data = data; S.sample = 0;
  if (Math.abs(nd.nIn - old.nIn) > 2) { C.tidyGraph(g); }
  rebuild(t("rData", nd.name));
  if (Math.abs(nd.nIn - old.nIn) > 2) { CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 }); renderCanvas(); }
  refreshPanel();
}
function setTraining(key, val, msg) {
  if (S.design.training[key] === val) return;
  pushUndo(); S.design.training[key] = val;
  rebuild(msg || t("rTraining"), { flash: key === "style" || key === "plot" ? false : true });
}
function loadDesign(d, fitView, msg) {
  let nd;
  try { nd = normalizeDesign(d); } catch (e) { toast(t("badDesign")); return false; }
  pushUndo(); S.design = nd; afterLoad(fitView !== false); if (msg) toast(msg); return true;
}

/* ================= rename / note editing ================= */
function openRename(id) {
  const n = nodeById(id); if (!n || n.type === "input") { if (n) toast(t("inputNames")); return; }
  closePopups();
  const pop = $("renamePop"), inp = $("renameInput"), err = $("renameErr");
  const p = CV.toScreen(n.x, n.y), r = 27 * CV.view.k;
  pop.hidden = false;
  const hostR = $("canvasHost").getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(hostR.width - 230, p.x - 110)) + "px";
  pop.style.top = Math.max(8, Math.min(hostR.height - 110, p.y + r + 12)) + "px";
  inp.value = C.nodeVar(n, ds()); err.textContent = "";
  S.renaming = id; $("ctxBar").hidden = true;
  inp.focus(); inp.select();
}
function renameCheck() {
  const n = nodeById(S.renaming); if (!n) return null;
  const v = $("renameInput").value.trim();
  if (v === C.nodeVar(n, ds())) return "";
  return C.checkName(v, n, graph(), ds(), lang());
}
function commitRename() {
  const id = S.renaming; if (!id) return;
  const err = renameCheck(), n = nodeById(id), v = $("renameInput").value.trim();
  if (err) { $("renameErr").textContent = err; $("renameInput").focus(); return; }
  closeRename();
  if (err === "") return;
  const old = C.nodeVar(n, ds());
  pushUndo(); n.name = v;
  rebuild(t("rRenamed", old, v));
}
function closeRename() { $("renamePop").hidden = true; S.renaming = null; updateCtxBar(); }
function openNoteEditor(id, selectAllText) {
  const nt = noteById(id); if (!nt) return;
  closePopups();
  const ta = $("noteEditor"), m = CV.wrapNote(nt), p = CV.toScreen(nt.x, nt.y), k = CV.view.k;
  ta.hidden = false; S.editingNote = id;
  Object.assign(ta.style, { left: p.x + "px", top: p.y + "px", width: Math.max(160, (nt.w || 260) * k) + "px", height: Math.max(60, (m.h + 30) * k) + "px",
    fontSize: (nt.size || 15) * k + "px", background: `var(--note-${nt.color || "yellow"})` });
  ta.value = nt.text; ta.focus();
  if (selectAllText) ta.select();
  $("ctxBar").hidden = true;
}
function commitNote() {
  const id = S.editingNote; if (!id) return;
  const ta = $("noteEditor"), nt = noteById(id);
  S.editingNote = null; ta.hidden = true;
  if (nt && ta.value !== nt.text) { pushUndo(); nt.text = ta.value.slice(0, 3000); visualChange(); }
  updateCtxBar();
}

/* ================= contextual toolbar ================= */
const IC = {
  dup: '<svg class="ico" viewBox="0 0 20 20"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>',
  del: '<svg class="ico" viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>',
  info: '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.3v.2"/></svg>',
  edit: '<svg class="ico" viewBox="0 0 20 20"><path d="M4 16l1-4 8-8 3 3-8 8zM11 6l3 3"/></svg>',
  align: '<svg class="ico" viewBox="0 0 20 20"><path d="M4 3v14M7 6h9M7 10h6M7 14h8"/></svg>',
  link: '<svg class="ico" viewBox="0 0 20 20"><circle cx="4.5" cy="6" r="2"/><circle cx="4.5" cy="14" r="2"/><circle cx="15.5" cy="10" r="2"/><path d="M6.5 6.5l7 3M6.5 13.5l7-3"/></svg>',
  minus: '<svg class="ico" viewBox="0 0 20 20"><path d="M5 10h10"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 20 20"><path d="M5 10h10M10 5v10"/></svg>'
};
function updateCtxBar() {
  const bar = $("ctxBar"), s = S.sel;
  const count = s.nodes.size + s.edges.size + s.notes.size;
  if (!count || S.renaming || S.editingNote) { bar.hidden = true; return; }
  const nodes = graph().nodes.filter(n => s.nodes.has(n.id)), notes = S.design.notes.filter(n => s.notes.has(n.id));
  let h = "";
  const swatch = c => `<span class="swatch" style="background:${c}"></span>`;
  if (count === 1 && nodes.length === 1) {
    const n = nodes[0], name = C.nodeVar(n, ds());
    const col = n.color && CV.NODE_COLORS[n.color] ? CV.NODE_COLORS[n.color] : `var(--n-${n.type})`;
    if (n.type === "input") h += `<span class="cb name" title="${esc(t("inputNames"))}">${esc(name)}</span><span class="label">${t("kindInput")}</span>`;
    else h += `<button class="cb name" type="button" data-cb="rename" title="${esc(t("rename"))}">${esc(name)} ${IC.edit}</button>`;
    h += `<span class="sep"></span>`;
    if (n.type === "hidden") h += `<select data-cb="act" aria-label="${esc(t("activation"))}">${C.ACT_ORDER.map(a => `<option value="${a}"${a === n.act ? " selected" : ""}>${I.actLabel(a)}</option>`).join("")}</select>`;
    if (n.type === "output") h += `<span class="label">${I.actLabel("sigmoid")}</span>`;
    h += `<button class="cb icon" type="button" data-cb="color" title="${esc(t("color"))}">${swatch(col)}</button>`;
    h += `<span class="sep"></span><button class="cb icon" type="button" data-cb="inspect" title="${esc(t("pInspect"))}">${IC.info}</button>`;
    if (n.type === "hidden") h += `<button class="cb icon" type="button" data-cb="dup" title="${esc(t("duplicate"))}">${IC.dup}</button>`;
    h += `<button class="cb icon danger" type="button" data-cb="del" title="${esc(t("delete"))}">${IC.del}</button>`;
  } else if (count === 1 && s.edges.size === 1) {
    const e = graph().edges.find(x => s.edges.has(x.id));
    const a = nodeById(e.from), b = nodeById(e.to), w = S.run ? S.run.w[e.id] : null;
    h += `<span class="cb name">${esc(C.nodeVar(a, ds()))} → ${esc(C.nodeVar(b, ds()))}</span>`;
    if (w != null) h += `<span class="label">${t("weight")} <b class="${w >= 0 ? "wpos" : "wneg"}">${(w >= 0 ? "+" : "") + w.toFixed(3)}</b></span>`;
    h += `<span class="sep"></span><button class="cb icon" type="button" data-cb="inspect" title="${esc(t("pInspect"))}">${IC.info}</button><button class="cb icon danger" type="button" data-cb="del" title="${esc(t("delete"))}">${IC.del}</button>`;
  } else if (count === 1 && notes.length === 1) {
    const nt = notes[0];
    h += `<button class="cb" type="button" data-cb="editnote">${IC.edit}<span>${t("editText")}</span></button><span class="sep"></span>`;
    h += `<button class="cb icon" type="button" data-cb="color" title="${esc(t("color"))}">${swatch(`var(--note-${nt.color || "yellow"})`)}</button>`;
    h += `<button class="cb icon" type="button" data-cb="smaller" title="${esc(t("smaller"))}">${IC.minus}</button><span class="label">${nt.size || 15}</span><button class="cb icon" type="button" data-cb="bigger" title="${esc(t("bigger"))}">${IC.plus}</button>`;
    h += `<span class="sep"></span><button class="cb icon" type="button" data-cb="dup" title="${esc(t("duplicate"))}">${IC.dup}</button><button class="cb icon danger" type="button" data-cb="del" title="${esc(t("delete"))}">${IC.del}</button>`;
  } else {
    h += `<span class="label">${t("nSelected", count)}</span><span class="sep"></span>`;
    if (nodes.length + notes.length >= 2) h += `<button class="cb" type="button" data-cb="align">${IC.align}<span>${t("align")}</span></button>`;
    if (nodes.length >= 2) h += `<button class="cb" type="button" data-cb="connect" title="${esc(t("connectTitle"))}">${IC.link}<span>${t("connect")}</span></button>`;
    if (nodes.some(n => n.type === "hidden")) {
      const acts = new Set(nodes.filter(n => n.type === "hidden").map(n => n.act));
      h += `<select data-cb="act" aria-label="${esc(t("activation"))}">${acts.size > 1 ? `<option value="" selected>${t("mixed")}</option>` : ""}${C.ACT_ORDER.map(a => `<option value="${a}"${acts.size === 1 && acts.has(a) ? " selected" : ""}>${I.actLabel(a)}</option>`).join("")}</select>`;
    }
    if (nodes.length || notes.length) h += `<button class="cb icon" type="button" data-cb="color" title="${esc(t("color"))}">${swatch("conic-gradient(#3a63d8,#119b9b,#2f9e5a,#d48a10,#d6453d,#7b55d6,#3a63d8)")}</button>`;
    h += `<span class="sep"></span><button class="cb icon" type="button" data-cb="dup" title="${esc(t("duplicate"))}">${IC.dup}</button><button class="cb icon danger" type="button" data-cb="del" title="${esc(t("delete"))}">${IC.del}</button>`;
  }
  bar.innerHTML = h; bar.hidden = false;
  positionCtxBar();
}
function positionCtxBar() {
  const bar = $("ctxBar"); if (bar.hidden) return;
  const box = CV.selectionScreenBox(S.design, S.sel); if (!box) { bar.hidden = true; return; }
  const host = $("canvasHost").getBoundingClientRect();
  const bw = bar.offsetWidth || 300, bh = bar.offsetHeight || 40;
  let x = box.x + box.w / 2, y = box.y - 14;
  let below = false;
  if (y - bh < 64) { y = box.y + box.h + 14 + bh; below = true; }
  x = Math.max(bw / 2 + 8, Math.min(host.width - bw / 2 - 8, x));
  y = Math.max(bh + 8, Math.min(host.height - 8, y));
  bar.style.left = x + "px"; bar.style.top = y + "px"; bar.dataset.below = below;
}
$("ctxBar").addEventListener("click", e => {
  const b = e.target.closest("[data-cb]"); if (!b || b.tagName === "SELECT") return;
  const a = b.dataset.cb, id = [...S.sel.nodes][0];
  if (a === "rename") openRename(id);
  else if (a === "del") deleteSelection();
  else if (a === "dup") duplicateSelection();
  else if (a === "inspect") openPanel("inspect");
  else if (a === "editnote") openNoteEditor([...S.sel.notes][0]);
  else if (a === "smaller") setNoteSize(-1);
  else if (a === "bigger") setNoteSize(1);
  else if (a === "connect") connectColumns();
  else if (a === "color") openSwatches(b);
  else if (a === "align") openAlign(b);
});
$("ctxBar").addEventListener("change", e => { if (e.target.dataset.cb === "act" && e.target.value) setActivation(e.target.value); });
$("ctxBar").addEventListener("pointerdown", e => e.stopPropagation());

let popEl = null;
function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
function openPop(anchor, html, onClick) {
  closePop();
  popEl = document.createElement("div"); popEl.className = "pop"; popEl.innerHTML = html;
  document.body.appendChild(popEl);
  const r = anchor.getBoundingClientRect(), pw = popEl.offsetWidth;
  popEl.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + "px";
  popEl.style.top = (r.bottom + 8) + "px";
  popEl.addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b) { onClick(b.dataset.v); closePop(); } });
}
function openSwatches(anchor) {
  const onlyNotes = !S.sel.nodes.size && S.sel.notes.size;
  let html = `<div class="swatches">`;
  if (onlyNotes) html += CV.NOTE_COLORS.map(c => `<button type="button" data-v="${c}" title="${c}" style="background:var(--note-${c})"></button>`).join("");
  else html += `<button type="button" data-v="auto" title="${esc(t("autoColor"))}" style="background:linear-gradient(135deg,var(--n-input) 0 33%,var(--n-hidden) 33% 66%,var(--n-output) 66%)"></button>` +
    Object.entries(CV.NODE_COLORS).map(([k, c]) => `<button type="button" data-v="${k}" title="${k}" style="background:${c}"></button>`).join("");
  html += `</div>`;
  openPop(anchor, html, v => setColor(v));
}
function openAlign(anchor) {
  const mk = (v, d, label) => `<button type="button" data-v="${v}" title="${esc(label)}"><svg class="ico" viewBox="0 0 20 20"><path d="${d}"/></svg></button>`;
  const html = `<div class="swatches" style="grid-template-columns:repeat(4,32px)">` +
    mk("left", "M4 3v14M7 6h9M7 10h5M7 14h7", t("alLeft")) + mk("center", "M10 3v14M5 6h10M7 10h6M6 14h8", t("alCenter")) + mk("right", "M16 3v14M4 6h9M8 10h5M6 14h7", t("alRight")) +
    mk("dh", "M3 4v12M17 4v12M8 7h4v6H8z", t("alDistH")) + mk("top", "M3 4h14M6 7v9M10 7v5M14 7v7", t("alTop")) + mk("middle", "M3 10h14M6 5v10M10 7v6M14 6v8", t("alMiddle")) +
    mk("bottom", "M3 16h14M6 4v9M10 8v5M14 6v7", t("alBottom")) + mk("dv", "M4 3h12M4 17h12M7 8h6v4H7z", t("alDistV")) + `</div>`;
  openPop(anchor, html, v => align(v));
  popEl.querySelectorAll("button").forEach(b => Object.assign(b.style, { width: "32px", height: "32px", borderRadius: "8px", background: "var(--surface-2)", border: "0", display: "grid", placeItems: "center", boxShadow: "none" }));
}

/* ================= context menu ================= */
function openContextMenu(cx, cy, tg, p) {
  const m = $("ctxMenu"); const items = [];
  const it = (cmd, label, opts) => items.push(`<button role="menuitem" type="button" data-ctx="${cmd}" ${opts && opts.disabled ? "disabled" : ""} class="${opts && opts.danger ? "danger" : ""}">${opts && opts.icon ? opts.icon : ""}<span>${esc(label)}</span>${opts && opts.kbd ? `<kbd>${opts.kbd}</kbd>` : ""}</button>`);
  const sep = () => items.push(`<div class="menu-sep"></div>`);
  const count = S.sel.nodes.size + S.sel.edges.size + S.sel.notes.size;
  if (tg.kind === "empty" || !count) {
    it("addHidden", t("cmAddHidden"), { icon: IC.plus, kbd: "N" }); it("addNote", t("cmAddNote"), { icon: IC.edit, kbd: "T" });
    it("paste", t("paste"), { disabled: !S.clipboard, kbd: "Ctrl+V" }); sep();
    it("selectAll", t("selectAll"), { kbd: "Ctrl+A" }); it("tidy", t("tidy")); it("fit", t("zoomFit"), { kbd: "F" });
  } else {
    const n = S.sel.nodes.size === 1 && !S.sel.edges.size && !S.sel.notes.size ? nodeById([...S.sel.nodes][0]) : null;
    if (n && n.type !== "input") it("rename", t("rename"), { icon: IC.edit, kbd: "Enter" });
    if (S.sel.notes.size === 1 && count === 1) it("editnote", t("editText"), { icon: IC.edit, kbd: "Enter" });
    if (S.sel.nodes.size + S.sel.notes.size) { it("dup", t("duplicate"), { icon: IC.dup, kbd: "Ctrl+D" }); it("copy", t("copy"), { kbd: "Ctrl+C" }); }
    if (S.sel.nodes.size >= 2) it("connect", t("connect"), { icon: IC.link });
    it("inspect", t("pInspect"), { icon: IC.info }); sep();
    it("del", t("delete"), { icon: IC.del, danger: true, kbd: "Del" });
  }
  m.innerHTML = items.join(""); m.hidden = false;
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(cx, innerWidth - w - 8) + "px"; m.style.top = Math.min(cy, innerHeight - h - 8) + "px";
  m.onclick = e => {
    const b = e.target.closest("[data-ctx]"); if (!b) return; closePopups();
    const c = b.dataset.ctx;
    if (c === "addHidden") addElement("hidden", p.x, p.y);
    else if (c === "addNote") addElement("note", p.x, p.y);
    else if (c === "paste") pasteClipboard(0);
    else if (c === "selectAll") selectAll();
    else if (c === "tidy") tidy();
    else if (c === "fit") { CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 }); renderCanvas(); }
    else if (c === "rename") openRename([...S.sel.nodes][0]);
    else if (c === "editnote") openNoteEditor([...S.sel.notes][0]);
    else if (c === "dup") duplicateSelection();
    else if (c === "copy") { if (copySelection()) toast(t("copied")); }
    else if (c === "connect") connectColumns();
    else if (c === "inspect") openPanel("inspect");
    else if (c === "del") deleteSelection();
  };
}
function closePopups() {
  $("ctxMenu").hidden = true; closePop();
  for (const [b, m] of [["fileBtn", "fileMenu"], ["exportBtn", "exportMenu"], ["edSettingsBtn", "edSettings"]]) { $(m).hidden = true; $(b).setAttribute("aria-expanded", "false"); }
  if (S.renaming) closeRename();
  if (S.editingNote) commitNote();
}

/* ================= status chip & issues ================= */
function renderStatus() {
  const G = S.G, chip = $("statusChip");
  const nh = graph().nodes.filter(n => n.type === "hidden").length;
  let dot, text;
  if (G.errors.length) { dot = "var(--bad)"; text = `<b>${t("problemsN", G.errors.length)}</b>`; }
  else if (G.warnings.length) { dot = "var(--warn)"; text = `<b>${t("ready")}</b> · ${esc(G.warnings[0].msg)}`; }
  else { dot = "var(--good)"; text = `<b>${t("ready")}</b> · ${t("summary", G.usedInputs.length, nh, G.edges.length)}`; }
  chip.innerHTML = `<span class="dot" style="background:${dot}"></span><span>${text}</span>`;
  const list = $("issues");
  if (!list.hidden) renderIssues();
  chip.setAttribute("aria-expanded", String(!list.hidden));
}
function renderIssues() {
  const G = S.G, list = $("issues");
  const rows = [...G.errors.map(e => ({ e, c: "var(--bad)" })), ...G.warnings.map(e => ({ e, c: "var(--warn)" }))];
  list.innerHTML = rows.length ? rows.map(r => `<button type="button" ${r.e.id ? `data-goto="${r.e.id}"` : ""}><span class="dot" style="background:${r.c}"></span><span>${esc(r.e.msg)}</span></button>`).join("") : `<button type="button"><span class="dot" style="background:var(--good)"></span><span>${t("noIssues")}</span></button>`;
}
$("statusChip").onclick = () => { const l = $("issues"); l.hidden = !l.hidden; if (!l.hidden) renderIssues(); $("statusChip").setAttribute("aria-expanded", String(!l.hidden)); };
$("issues").onclick = e => {
  const b = e.target.closest("[data-goto]"); if (!b) return;
  S.sel = { nodes: new Set([b.dataset.goto]), edges: new Set(), notes: new Set() }; selectionChanged();
  const n = nodeById(b.dataset.goto); if (n) centerOn(n.x, n.y);
};
function centerOn(x, y) { const r = $("canvasHost").getBoundingClientRect(); CV.view.x = r.width / 2 - x * CV.view.k; CV.view.y = r.height / 2 - y * CV.view.k; renderCanvas(); }

/* ================= live code view ================= */
function diffNew(a, b) {
  const n = a.length, m = b.length, fresh = new Set();
  if (n * m > 600000) return fresh;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else { fresh.add(j); j++; } }
  while (j < m) fresh.add(j++);
  return fresh;
}
function codeTheme() { const ct = S.prefs.codeTheme; return ct === "auto" ? (document.documentElement.dataset.theme === "dark" ? "dark" : "light") : ct; }
function renderLive(flash) {
  const lines = S.prog.lines.map(l => l.t), html = HL.highlightLines(lines);
  let fresh = new Set();
  if (flash && S.prevLines.length) { fresh = diffNew(S.prevLines, lines); if (fresh.size > Math.max(12, lines.length * 0.5)) fresh = new Set(); }
  S.prevLines = lines;
  const view = $("liveView");
  view.innerHTML = lines.map((l, i) => {
    const ln = S.prog.lines[i], link = !!ln.primary || ln.tags.some(x => x.startsWith("act:"));
    return `<div class="ln${link ? " link" : ""}${fresh.has(i) ? " fresh" : ""}" data-i="${i}"><span class="no">${i + 1}</span><span>${html[i] || " "}</span></div>`;
  }).join("");
  S.lineEls = [...view.children];
  highlightLive(false);
  if (fresh.size && codeVisible() && S.prefs.codeTab === "live") scrollToLine(Math.min(...fresh), true);
  const plural = lines.length;
  $("liveMeta").innerHTML = S.G.valid ? `<span class="live-dot"></span><span>${t("liveMeta", plural)}</span>${fresh.size ? `<span style="margin-left:auto">${t("linesChanged", fresh.size)}</span>` : ""}` : `<span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--bad)"></span><span>${t("liveInvalid")}</span>`;
}
function selLines() {
  const set = new Set(), s = S.sel;
  const tags = new Set([...[...s.nodes].map(id => "node:" + id), ...[...s.edges].map(id => "edge:" + id)]);
  if (!tags.size) return set;
  const acts = new Set(); s.nodes.forEach(id => { const n = nodeById(id); if (n && n.type !== "input") acts.add("act:" + n.act); });
  S.prog.lines.forEach((l, i) => { if (l.tags.some(x => tags.has(x) || acts.has(x))) set.add(i); });
  return set;
}
function highlightLive(scroll) {
  const sel = selLines();
  const ex = new Set((S.mode === "step" || S.mode === "walk") && S.run && S.run.lastOp ? (S.prog.opLines[S.run.lastOp.key] || []) : []);
  const running = S.mode === "run";
  S.lineEls.forEach((el, i) => {
    el.classList.toggle("sel", sel.has(i) && !ex.has(i));
    el.classList.toggle("exec", ex.has(i));
    el.classList.toggle("run", running && S.prog.lines[i].tags.includes("loop"));
  });
  let target = null;
  if (ex.size) target = Math.min(...ex);
  else if (scroll && sel.size) { const arr = [...sel].sort((a, b) => a - b); target = arr.find(i => S.prog.lines[i].op) ?? arr[0]; }
  if (target != null && codeVisible() && S.prefs.codeTab === "live") scrollToLine(target);
}
function scrollToLine(i, smooth) {
  const c = $("liveView"), el = S.lineEls[i]; if (!el) return;
  const top = el.offsetTop - c.offsetTop, h = c.clientHeight;
  if (top < c.scrollTop + 30 || top > c.scrollTop + h - 60) c.scrollTo({ top: Math.max(0, top - h * 0.3), behavior: smooth ? "smooth" : "auto" });
}
function lineTarget(l) {
  if (l.primary) return l.primary;
  const a = l.tags.find(x => x.startsWith("act:"));
  if (a) { const n = graph().nodes.find(n => n.type !== "input" && n.act === a.slice(4)); if (n) return { kind: "node", id: n.id }; }
  return null;
}
$("liveView").addEventListener("click", e => {
  const ln = e.target.closest(".ln"); if (!ln) return;
  const tg = lineTarget(S.prog.lines[+ln.dataset.i]); if (!tg) return;
  S.sel = { nodes: new Set(), edges: new Set(), notes: new Set() };
  (tg.kind === "node" ? S.sel.nodes : S.sel.edges).add(tg.id);
  renderCanvas(); updateCtxBar(); highlightLive(false);
  if (S.prefs.flyout === "inspect" && !$("flyout").hidden) refreshPanel();
});
$("liveView").addEventListener("mouseover", e => {
  const ln = e.target.closest(".ln"); const tg = ln ? (S.prog.lines[+ln.dataset.i].primary || null) : null;
  if (JSON.stringify(tg) !== JSON.stringify(S.codeHover)) { S.codeHover = tg; renderCanvas(); }
});
$("liveView").addEventListener("mouseleave", () => { if (S.codeHover) { S.codeHover = null; renderCanvas(); } });
function updateStyleSeg() {
  const ok = S.G.matrix.ok, eff = S.design.training.style === "matrix" && ok ? "matrix" : "neuron";
  $("styleNeuron").setAttribute("aria-pressed", String(eff === "neuron"));
  $("styleMatrix").setAttribute("aria-pressed", String(eff === "matrix"));
  $("styleMatrix").title = ok ? t("styleMatrixTitle") : S.G.matrix.reason;
  $("styleMatrix").classList.toggle("unavailable", !ok);
}
$("styleNeuron").onclick = () => setTraining("style", "neuron", t("rStyle", t("styleNeuron")));
$("styleMatrix").onclick = () => { if (!S.G.matrix.ok) { toast(S.G.matrix.reason); return; } setTraining("style", "matrix", t("rStyle", t("styleMatrix"))); };

/* ================= simulation (training on the canvas) ================= */
function stopSim() { if (S.timer) { clearTimeout(S.timer); cancelAnimationFrame(S.timer); S.timer = null; } }
function setSimStat(h) { $("simStat").innerHTML = h; }
function simStatText() {
  const r = S.run; if (!r) return `<b>${t("notReady")}</b>`;
  const parts = [`${t("epoch")} <b>${Math.min(r.epoch, S.spec.epochs)}</b>/${S.spec.epochs}`];
  if (r.loss != null) parts.push(`${t("loss")} <b>${r.loss.toFixed(4)}</b>`);
  if (r.trainAcc != null) parts.push(`<b>${C.pyPct(r.trainAcc)}</b>`);
  return parts.join(" · ");
}
function updateSimUI() {
  const running = S.mode === "run" && !!S.timer, walking = S.mode === "walk" && !!S.timer, ok = !!S.run;
  const rb = $("simRun");
  rb.querySelector("span").textContent = running ? t("pause") : (S.run && S.run.done ? t("trainAgain") : (S.run && S.run.started ? t("resume") : t("train")));
  rb.querySelector("svg").innerHTML = running ? '<path d="M4 3h3v10H4zM9 3h3v10H9z"/>' : '<path d="M4 2.5l9.5 5.5L4 13.5z"/>';
  $("simWalk").setAttribute("aria-pressed", String(walking));
  $("simWalk").querySelector("span").textContent = walking ? t("stopWalk") : t("walk");
  rb.disabled = !ok; $("simStep").disabled = !ok || running; $("simWalk").disabled = !ok || running; $("simReset").disabled = !ok;
  setSimStat(simStatText());
  $("liveRunPy").disabled = !ok; $("liveToEditor").disabled = !ok; $("liveCopy").disabled = !ok;
}
function speed() { return S.prefs.speed || 5; }
function simRun() {
  if (!S.run) { toast(t("fixFirst")); return; }
  if (S.mode === "run" && S.timer) { stopSim(); updateSimUI(); setSimStat(`<b>${t("paused")}</b> · ` + simStatText()); return; }
  if (S.run.done) { S.run = C.createRun(S.spec, S.G, S.prog); S.tick++; resetSimConsole(); }
  stopSim(); S.mode = "run";
  const total = S.spec.epochs + 1 - S.run.epoch, frames = Math.round(60 * (11 - speed()) * 0.5) + 24, per = Math.max(1, Math.ceil(total / frames));
  const tick = () => {
    C.runEpochs(S.run, per); S.tick++;
    renderCanvas(); renderSimConsole(); renderHUD();
    if (S.run.done) {
      S.timer = null; S.mode = "idle"; highlightLive(false); renderHUD(true); updateSimUI(); updateCtxBar();
      if (S.prefs.flyout === "inspect" && !$("flyout").hidden) refreshPanel();
      setSimStat(`<b>${t("done")}</b> · ${t("loss")} <b>${S.run.loss.toFixed(4)}</b> · <b>${C.pyPct(S.run.trainAcc)}</b>`);
      return;
    }
    setSimStat(simStatText());
    S.timer = requestAnimationFrame(tick);
  };
  highlightLive(false); S.timer = requestAnimationFrame(tick); updateSimUI();
}
function simStep() {
  if (!S.run) { toast(t("fixFirst")); return; }
  if (S.run.done) { S.run = C.createRun(S.spec, S.G, S.prog); resetSimConsole(); }
  if (S.mode !== "walk") S.mode = "step";
  const op = C.stepOp(S.run); if (!op) return;
  S.tick++;
  if (codeVisible() && S.prefs.codeTab !== "live") showCodeTab("live");
  showDock("vars");
  renderCanvas(); highlightLive(false); renderSimConsole(); renderVars(); renderHUD();
  const ln = S.prog.opLines[op.key] ? S.prog.opLines[op.key][0] + 1 : "";
  setSimStat(`${t("line")} <b>${ln}</b> · ` + simStatText());
  if (S.run.done) { renderHUD(true); setSimStat(`<b>${t("done")}</b> · ` + simStatText()); }
}
function simWalk() {
  if (!S.run) { toast(t("fixFirst")); return; }
  if (S.mode === "walk" && S.timer) { stopSim(); S.mode = "step"; updateSimUI(); return; }
  stopSim(); S.mode = "walk";
  const loop = () => { simStep(); if (S.run.done) { S.mode = "step"; S.timer = null; updateSimUI(); return; } S.timer = setTimeout(loop, 1500 / speed() + 40); };
  loop(); updateSimUI();
}
function simReset() { rebuild(t("rReset"), { flash: false }); }
$("simRun").onclick = simRun;
$("simStep").onclick = () => { stopSim(); if (S.mode !== "step") S.mode = "step"; simStep(); updateSimUI(); };
$("simWalk").onclick = simWalk;
$("simReset").onclick = simReset;
$("simSpeed").oninput = e => { S.prefs.speed = +e.target.value; savePrefs(); };

function resetSimConsole() {
  $("simConsole").innerHTML = S.run ? `<span class="o-sys">$ python network.py\n${esc(t("simHint"))}</span>` : `<span class="o-sys">${esc(t("simFix"))}</span>`;
}
function renderSimConsole() {
  if (!S.run) return;
  if (!(codeVisible() && S.prefs.codeTab === "live")) return;
  const c = $("simConsole");
  c.innerHTML = `<span class="o-sys">$ python network.py</span>\n` + S.run.log.map(esc).join("\n") + (S.run.done ? `\n\n<span class="o-ok">${esc(t("processDone"))}</span>` : "");
  c.scrollTop = c.scrollHeight;
}
function showDock(which) {
  const live = which === "console" || which === "vars";
  if (live) {
    $("dTabConsole").setAttribute("aria-selected", String(which === "console")); $("dTabVars").setAttribute("aria-selected", String(which === "vars"));
    $("simConsole").hidden = which !== "console"; $("simVars").hidden = which !== "vars";
  } else {
    $("dTabOut").setAttribute("aria-selected", String(which === "out")); $("dTabProb").setAttribute("aria-selected", String(which === "prob"));
    $("pyOut").hidden = which !== "out"; $("pyProblems").hidden = which !== "prob";
  }
}
$("dTabConsole").onclick = () => { showDock("console"); renderSimConsole(); };
$("dTabVars").onclick = () => showDock("vars");
$("dTabOut").onclick = () => showDock("out");
$("dTabProb").onclick = () => showDock("prob");

/* variables of the current step */
function opValue(r, op) {
  const G = S.G, V = G.V, gs = G.matrix.groups;
  const vec = (arr, label) => ({ name: label, rows: Array.from(arr).map(v => [v]), cols: [label] });
  const mat = (nodes, src, label) => ({ name: label, cols: nodes.map(V), rows: Array.from({ length: r.n }, (_, i) => nodes.map(n => src[n.id][i])) });
  const wmat = (g, store_, label) => { const Sx = gs[g - 1], D = gs[g]; return { name: label, cols: D.map(V), rlab: Sx.map(V), rows: Sx.map(s => D.map(d => { const e = G.edges.find(e => e.from === s.id && e.to === d.id); return e ? store_[e.id] : null; })) }; };
  switch (op.kind) {
    case "for": return { name: "epoch", scalar: r.epoch };
    case "z": return vec(r.z[op.id], "z_" + V(G.byId.get(op.id)));
    case "a": return vec(r.a[op.id], V(G.byId.get(op.id)));
    case "d": return vec(r.d[op.id], "d_" + V(G.byId.get(op.id)));
    case "loss": return { name: "loss", scalar: r.loss };
    case "print": return { name: "accuracy", scalar: r.accuracy };
    case "uw": { const e = G.edges.find(x => x.id === op.id); return { name: `w_${V(G.byId.get(e.from))}_${V(G.byId.get(e.to))}`, scalar: r.w[op.id], extra: `${t("gradient")} ${r.gw[op.id].toFixed(5)}` }; }
    case "ub": return { name: "b_" + V(G.byId.get(op.id)), scalar: r.b[op.id], extra: `${t("gradient")} ${r.gb[op.id].toFixed(5)}` };
    case "mz": return mat(gs[op.g], r.z, "z" + op.g);
    case "ma": return mat(gs[op.g], r.a, "a" + op.g);
    case "md": return mat(gs[op.g], r.d, "d" + op.g);
    case "mdW": return wmat(op.g, r.gw, "dW" + op.g);
    case "muW": return wmat(op.g, r.w, "W" + op.g);
    case "mdb": return { name: "db" + op.g, cols: gs[op.g].map(V), rows: [gs[op.g].map(n => r.gb[n.id])] };
    case "mub": return { name: "b" + op.g, cols: gs[op.g].map(V), rows: [gs[op.g].map(n => r.b[n.id])] };
  }
  return null;
}
function valueHTML(v) {
  if (!v) return "";
  if (v.scalar !== undefined) return `<table class="mat"><tr><td class="${v.scalar < 0 ? "neg" : "pos"}">${v.scalar == null ? "None" : Number.isInteger(v.scalar) ? v.scalar : v.scalar.toFixed(5)}</td>${v.extra ? `<td style="color:var(--muted)">${v.extra}</td>` : ""}</tr></table>`;
  const R = Math.min(v.rows.length, 6), Cn = Math.min(v.cols.length, 8);
  let h = `<table class="mat"><tr>${v.rlab ? "<th></th>" : ""}${v.cols.slice(0, Cn).map(c => `<th>${esc(c)}</th>`).join("")}</tr>`;
  for (let i = 0; i < R; i++) { h += "<tr>" + (v.rlab ? `<th>${esc(v.rlab[i])}</th>` : ""); for (let j = 0; j < Cn; j++) { const x = v.rows[i][j]; h += x == null ? `<td class="off">0</td>` : `<td class="${x < 0 ? "neg" : "pos"}">${x.toFixed(3)}</td>`; } h += "</tr>"; }
  if (R < v.rows.length) h += `<tr><td colspan="${Cn + 1}" style="text-align:left;color:var(--muted)">${esc(t("moreRows", v.rows.length - R))}</td></tr>`;
  return h + "</table>";
}
function renderVars() {
  const box = $("simVars");
  if (!S.run) { box.innerHTML = `<p class="why" style="color:var(--muted)">${esc(t("simFix"))}</p>`; return; }
  let h = "";
  if (S.run.lastOp && (S.mode === "step" || S.mode === "walk")) {
    const op = S.run.lastOp, v = opValue(S.run, op);
    const shape = v && v.rows ? `  shape (${v.rows.length}${v.rlab || v.cols.length > 1 ? ", " + v.cols.length : ""})` : "";
    h += `<div><span class="vname">${esc(v ? v.name : op.key)}</span><span style="color:var(--muted);font-family:var(--mono);font-size:12px">${shape}</span></div>`;
    h += `<p class="why">${esc(I.opHelp(op, S.run, S.G))}${S.run.lastNote === "skip" ? " " + esc(t("printSkip", S.run.epoch, S.spec.printEvery)) : ""}</p>`;
    if (op.kind !== "for") h += valueHTML(v);
  } else h += `<p class="why" style="color:var(--muted)">${esc(t("varsHint"))}</p>`;
  const G = S.G;
  const ws = G.edges.slice(0, 12).map(e => `<span class="vchip">w_${esc(G.V(G.byId.get(e.from)))}_${esc(G.V(G.byId.get(e.to)))} = ${S.run.w[e.id].toFixed(3)}</span>`).join("");
  h += `<div class="varlist">${S.run.loss != null ? `<span class="vchip">loss = ${S.run.loss.toFixed(4)}</span>` : ""}${ws}${G.edges.length > 12 ? `<span class="vchip">${esc(t("moreWeights", G.edges.length - 12))}</span>` : ""}</div>`;
  box.innerHTML = h;
}

/* ================= HUD (results) ================= */
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function setupCanvas(cv, hCss) { const w = cv.clientWidth || 300, dpr = window.devicePixelRatio || 1; cv.width = Math.round(w * dpr); cv.height = Math.round(hCss * dpr); cv.style.height = hCss + "px"; const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [ctx, w, hCss]; }
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function renderHUD(full) {
  const r = S.run, nums = $("hudNums");
  nums.innerHTML = r && r.history.length ? simStatText() : (r ? esc(t("hudIdle")) : esc(t("notReady")));
  drawSpark();
  if (!S.prefs.hudOpen) return;
  const now = performance.now();
  if (!full && now - S.hudT < 60) return;
  S.hudT = now;
  drawLoss(); renderSide();
}
function drawSpark() {
  const cv = $("hudSpark"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  cv.width = 80 * dpr; cv.height = 22 * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, 80, 22);
  const h = S.run ? S.run.history : []; if (h.length < 2) { ctx.strokeStyle = css("--line-2"); ctx.beginPath(); ctx.moveTo(2, 11); ctx.lineTo(78, 11); ctx.stroke(); return; }
  const max = Math.max(...h.map(p => p[1])) || 1, E = S.spec.epochs;
  ctx.strokeStyle = css("--accent"); ctx.lineWidth = 1.6; ctx.beginPath();
  const step = Math.max(1, Math.floor(h.length / 80));
  for (let i = 0; i < h.length; i += step) { const x = 2 + 76 * h[i][0] / E, y = 20 - 18 * h[i][1] / max; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
}
function drawLoss() {
  const [ctx, w, h] = setupCanvas($("lossChart"), 170);
  const pad = { l: 42, r: 10, t: 8, b: 24 }, ink = css("--ink"), mut = css("--muted"), line = css("--line"), acc = css("--accent");
  ctx.clearRect(0, 0, w, h); ctx.font = "11px " + css("--body");
  const hist = S.run ? S.run.history : [], E = S.spec.epochs;
  const ymax = niceMax(hist.length ? Math.max(...hist.map(p => p[1]), 1e-4) : 0.8);
  const X = e => pad.l + (w - pad.l - pad.r) * e / E, Y = v => pad.t + (h - pad.t - pad.b) * (1 - v / ymax);
  ctx.strokeStyle = line; ctx.fillStyle = mut; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const v = ymax * i / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(+v.toPrecision(3), pad.l - 6, y); }
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  [0, 0.5, 1].forEach(f => { const e = Math.round(E * f); ctx.fillText(e, X(e), h - pad.b + 6); });
  if (!hist.length) {
    const msg = S.run ? t("pressTrain") : t("notReady"), cx = (pad.l + w - pad.r) / 2, cy = Y(ymax * 0.62);
    ctx.font = "12px " + css("--body"); const tw = ctx.measureText(msg).width;
    ctx.fillStyle = css("--surface"); ctx.fillRect(cx - tw / 2 - 8, cy - 11, tw + 16, 22);
    ctx.fillStyle = mut; ctx.textBaseline = "middle"; ctx.fillText(msg, cx, cy); return;
  }
  const step = Math.max(1, Math.floor(hist.length / 600));
  ctx.beginPath(); for (let i = 0; i < hist.length; i += step) { const x = X(hist[i][0]), y = Y(hist[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  const last = hist[hist.length - 1]; ctx.lineTo(X(last[0]), Y(last[1]));
  ctx.lineTo(X(last[0]), Y(0)); ctx.lineTo(X(hist[0][0]), Y(0)); ctx.closePath(); ctx.globalAlpha = .13; ctx.fillStyle = acc; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); for (let i = 0; i < hist.length; i += step) { const x = X(hist[i][0]), y = Y(hist[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineTo(X(last[0]), Y(last[1]));
  ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke();
  const lx = X(last[0]), ly = Y(last[1]); ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = ink; ctx.textAlign = lx > w - 70 ? "right" : "left"; ctx.textBaseline = "bottom"; ctx.fillText(last[1].toFixed(4), lx + (lx > w - 70 ? -6 : 6), ly - 4);
}
function renderSide() {
  const box = $("hudSide"), d = S.G.ds;
  if (!S.run) { box.innerHTML = `<div class="hud-label">${esc(t("results"))}</div><p style="color:var(--muted);font-size:12.5px;margin:0">${esc(t("notReady"))}</p>`; return; }
  const oid = S.run.outId;
  if (d.kind === "strings") {
    const o = C.forwardRows(S.run, d.XTest)[oid]; let c = 0;
    const rows = d.testStrings.map((s, i) => { const p = o[i], ok = (p > 0.5) === (d.yTest[i] === 1); if (ok) c++; return `<tr><td class="m">${s}</td><td>${d.yTest[i] ? t("yes") : t("no")}</td><td>${p.toFixed(2)}</td><td class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"}</td></tr>`; }).join("");
    box.innerHTML = `<div class="hud-label">${esc(t("testStrings"))} · ${C.pyPct(c / d.testStrings.length)} <span style="text-transform:none;letter-spacing:0">(${esc(t("people65"))})</span></div><div class="table-wrap"><table class="ptable"><thead><tr><th>${t("string")}</th><th>${t("grammatical")}</th><th>p</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if (d.kind === "table" && d.nIn === 3) {
    const o = C.forwardRows(S.run, d.X)[oid];
    box.innerHTML = `<div class="hud-label">${esc(t("truthTable"))}</div><div class="table-wrap"><table class="ptable"><thead><tr><th>x1 x2 x3</th><th>${t("target")}</th><th>${t("output")}</th><th></th></tr></thead><tbody>${d.X.map((x, i) => { const ok = (o[i] > 0.5) === (d.y[i] === 1); return `<tr><td class="m">${x.join("  ")}</td><td>${d.y[i]}</td><td>${o[i].toFixed(3)}</td><td class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"}</td></tr>`; }).join("")}</tbody></table></div>`;
    return;
  }
  const has = f => graph().nodes.some(n => n.type === "input" && n.feature === f);
  box.innerHTML = `<div class="hud-label">${esc(t("decisionMap"))}</div><canvas id="boundary" height="170"></canvas>`;
  const [ctx, w, h] = setupCanvas($("boundary"), 170), size = Math.min(w, h), ox = (w - size) / 2;
  const [lo, hi] = d.range, N = 42, cell = size / N, grid = [];
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) grid.push([lo + (gx + .5) / N * (hi - lo), hi - (gy + .5) / N * (hi - lo)]);
  const o = C.forwardRows(S.run, grid)[oid], pos = css("--pos"), neg = css("--neg");
  ctx.clearRect(0, 0, w, h);
  grid.forEach((_, i) => { const p = o[i]; ctx.globalAlpha = 0.07 + 0.42 * Math.abs(p - 0.5) * 2; ctx.fillStyle = p > 0.5 ? pos : neg; ctx.fillRect(ox + (i % N) * cell, Math.floor(i / N) * cell, cell + .6, cell + .6); });
  ctx.globalAlpha = 1;
  const tx = x => ox + (x - lo) / (hi - lo) * size, ty = y => (hi - y) / (hi - lo) * size;
  d.X.forEach((x, i) => { ctx.beginPath(); ctx.arc(tx(x[0]), ty(x[1]), d.kind === "points" ? 2.6 : 7, 0, 7); ctx.fillStyle = d.y[i] ? pos : neg; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = css("--surface"); ctx.stroke(); });
  const s = d.X[S.sample]; ctx.beginPath(); ctx.arc(tx(s[0]), ty(s[1]), d.kind === "points" ? 6 : 10.5, 0, 7); ctx.strokeStyle = css("--ink"); ctx.lineWidth = 1.6; ctx.stroke();
  if (!has(0) || !has(1)) { ctx.fillStyle = css("--muted"); ctx.font = "11px " + css("--body"); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(t("missingInput", !has(0) ? "x1" : "x2"), ox + 4, 4); }
}
$("hudToggle").onclick = () => {
  S.prefs.hudOpen = !S.prefs.hudOpen; savePrefs();
  $("hudBody").hidden = !S.prefs.hudOpen; $("hudToggle").setAttribute("aria-expanded", String(S.prefs.hudOpen));
  if (S.prefs.hudOpen) renderHUD(true);
};

/* ================= flyout panels ================= */
const PANELS = ["elements", "templates", "data", "training", "inspect"];
function openPanel(name) {
  const fly = $("flyout");
  if (S.prefs.flyout === name && !fly.hidden && name !== "inspect") { fly.hidden = true; S.prefs.flyout = null; }
  else { fly.hidden = false; S.prefs.flyout = name; }
  savePrefs(); syncRail(); refreshPanel();
}
function syncRail() { document.querySelectorAll(".rail-btn[data-panel]").forEach(b => b.setAttribute("aria-pressed", String(!$("flyout").hidden && b.dataset.panel === S.prefs.flyout))); }
function refreshPanel() {
  const fly = $("flyout"); if (fly.hidden || !S.prefs.flyout) return;
  const name = S.prefs.flyout;
  $("flyoutTitle").textContent = t({ elements: "pElements", templates: "pTemplates", data: "pData", training: "pTraining", inspect: "pInspect" }[name]);
  const body = $("flyoutBody");
  const keepScroll = body.dataset.panel === name ? body.scrollTop : 0;
  body.dataset.panel = name;
  body.innerHTML = ({ elements: panelElements, templates: panelTemplates, data: panelData, training: panelTraining, inspect: panelInspect })[name]();
  body.scrollTop = keepScroll;
  if (name === "data") drawDataPreviews();
}
document.querySelectorAll(".rail-btn[data-panel]").forEach(b => b.onclick = () => openPanel(b.dataset.panel));
$("flyoutClose").onclick = () => { $("flyout").hidden = true; S.prefs.flyout = null; savePrefs(); syncRail(); };

function nodeIcon(type) {
  if (type === "input") return `<svg viewBox="0 0 46 40"><rect x="5" y="9" width="36" height="24" rx="7" style="fill:var(--surface);stroke:var(--n-input);stroke-width:2"/><rect x="9" y="13" width="28" height="16" rx="4" style="fill:var(--n-input);opacity:.15"/></svg>`;
  if (type === "hidden") return `<svg viewBox="0 0 46 40"><circle cx="23" cy="20" r="15" style="fill:var(--surface);stroke:var(--n-hidden);stroke-width:2"/><circle cx="23" cy="20" r="11" style="fill:var(--n-hidden);opacity:.15"/></svg>`;
  if (type === "output") return `<svg viewBox="0 0 46 40"><circle cx="23" cy="20" r="18" style="fill:none;stroke:var(--n-output);stroke-width:1.3;opacity:.6"/><circle cx="23" cy="20" r="14.5" style="fill:var(--surface);stroke:var(--n-output);stroke-width:2"/><circle cx="23" cy="20" r="10.5" style="fill:var(--n-output);opacity:.15"/></svg>`;
  if (type === "layer") return `<svg viewBox="0 0 46 40"><circle cx="23" cy="8" r="6" style="fill:var(--surface);stroke:var(--n-hidden);stroke-width:1.8"/><circle cx="23" cy="20" r="6" style="fill:var(--surface);stroke:var(--n-hidden);stroke-width:1.8"/><circle cx="23" cy="32" r="6" style="fill:var(--surface);stroke:var(--n-hidden);stroke-width:1.8"/></svg>`;
  return `<svg viewBox="0 0 46 40"><rect x="6" y="5" width="34" height="30" rx="5" style="fill:var(--note-yellow);stroke:rgba(0,0,0,.12)"/><path d="M12 14h22M12 20h22M12 26h14" style="stroke:var(--note-ink);stroke-width:1.6;opacity:.5"/></svg>`;
}
function panelElements() {
  const d = ds(), inCount = graph().nodes.filter(n => n.type === "input").length, hasOut = graph().nodes.some(n => n.type === "output");
  const card = (kind, label, sub, disabled) => `<button class="el-card" type="button" draggable="${!disabled}" data-el="${kind}" ${disabled ? "disabled" : ""}>${nodeIcon(kind)}<span>${label}</span><small>${sub}</small></button>`;
  return `<section class="p-section"><h3 class="p-title">${t("neurons")}</h3><div class="el-grid">
      ${card("input", t("kindInput"), inCount >= d.nIn ? t("allPlaced") : t("inputsLeft", d.nIn - inCount), inCount >= d.nIn)}
      ${card("hidden", t("kindHidden"), t("dragOrClick"), false)}
      ${card("output", t("kindOutput"), hasOut ? t("alreadyHas") : t("oneAnswer"), hasOut)}
      ${card("note", t("note"), t("forLabels"), false)}
    </div></section>
    <section class="p-section"><h3 class="p-title">${t("buildLayer")}</h3>
      <div class="layer-maker">
        <div class="row"><label>${t("neuronsCount")}</label><span class="stepper"><button type="button" data-lm="-1" aria-label="-">−</button><output>${S.prefs.layerUnits}</output><button type="button" data-lm="1" aria-label="+">+</button></span></div>
        <label class="field"><span>${t("activation")}</span><select id="lmAct">${C.ACT_ORDER.map(a => `<option value="${a}"${a === S.prefs.layerAct ? " selected" : ""}>${I.actLabel(a)}</option>`).join("")}</select></label>
        <label class="check-row"><input type="checkbox" id="lmFrom" ${S.prefs.layerFromSel ? "checked" : ""}><span>${t("lmFrom")}<small>${t("lmFromSub", graph().nodes.filter(n => S.sel.nodes.has(n.id) && n.type !== "output").length)}</small></span></label>
        <label class="check-row"><input type="checkbox" id="lmTo" ${S.prefs.layerToOut ? "checked" : ""}><span>${t("lmTo")}</span></label>
        <button class="btn accent block" type="button" data-el="layer">${t("addLayer")}</button>
      </div></section>
    <section class="p-section"><h3 class="p-title">${t("quickTools")}</h3>
      <div class="row"><button class="btn sm" type="button" data-qa="tidy">${t("tidy")}</button><button class="btn sm" type="button" data-qa="fit">${t("zoomFit")}</button><button class="btn sm" type="button" data-qa="all">${t("selectAll")}</button></div></section>`;
}
function panelTemplates() {
  return `<p class="p-text">${t("tplIntro")}</p><div class="tpl-grid">` + Object.keys(C.TEMPLATE_INFO).map(k => {
    const info = C.TEMPLATE_INFO[k][lang()];
    if (!panelTemplates.thumbs) panelTemplates.thumbs = {};
    const key = k + lang();
    if (!panelTemplates.thumbs[key]) {
      const d = designFromTemplate(k); d.notes = [];
      panelTemplates.thumbs[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(CV.exportSVG(d, { lang: lang() }).svg);
    }
    return `<button class="tpl-card" type="button" data-tpl="${k}"><img class="thumb" alt="" src="${panelTemplates.thumbs[key]}" style="object-fit:contain;background:#fff"><span><b>${esc(info[0])}</b><span>${esc(info[1])}</span></span></button>`;
  }).join("") + `</div>`;
}
function panelData() {
  const data = S.design.data, d = ds();
  const card = (kind, label) => `<button class="ds-card" type="button" data-ds="${kind}" aria-pressed="${data.kind === kind}"><canvas data-prev="${kind}" width="120" height="64"></canvas><span>${label}</span></button>`;
  let h = `<section class="p-section"><h3 class="p-title">${t("chooseData")}</h3><div class="ds-grid">${card("logic", t("dsLogic"))}${card("circles", I.dataName("circles"))}${card("moons", I.dataName("moons"))}${card("spiral", I.dataName("spiral"))}${card("agl", I.dataName("agl"))}</div></section>`;
  if (data.kind === "logic") {
    const k = data.inputs, gates = Object.keys(C.GATES[k]);
    h += `<section class="p-section"><h3 class="p-title">${t("logicGate")}</h3>
      <div class="row"><span style="font-size:12.5px;color:var(--muted)">${t("inputsN")}</span><span class="seg small"><button type="button" data-lin="2" aria-pressed="${k === 2}">2</button><button type="button" data-lin="3" aria-pressed="${k === 3}">3</button></span></div>
      <div class="chips">${gates.map(g => `<button class="chip" type="button" data-gate="${g}" aria-pressed="${d.gate === g}">${g === "MAJ" ? I.dataName("MAJ") : g}</button>`).join("")}</div>
      <p class="p-text"><b>${esc(d.name)}</b>: ${esc(d.note)}. ${t("clickTargets")}</p>
      <table class="truth"><thead><tr>${d.inputNames.map(n => `<th>${n}</th>`).join("")}<th>${t("target")}</th></tr></thead><tbody>
      ${d.X.map((x, i) => `<tr>${x.map(v => `<td>${v}</td>`).join("")}<td><button class="tgt" type="button" data-tgt="${i}" aria-pressed="${d.y[i] === 1}">${d.y[i]}</button></td></tr>`).join("")}</tbody></table></section>`;
  } else if (data.kind === "agl") {
    h += `<section class="p-section"><h3 class="p-title">${esc(d.name)}</h3><p class="p-text">${t("aglAbout")}</p>
      <h3 class="p-title">${t("trainStrings")}</h3><div class="str-list">${d.trainStrings.map((s, i) => `<span class="str ${d.y[i] ? "g" : "u"}">${s}</span>`).join("")}</div>
      <h3 class="p-title">${t("testStrings")}</h3><div class="str-list">${d.testStrings.map((s, i) => `<span class="str ${d.yTest[i] ? "g" : "u"}">${s}</span>`).join("")}</div>
      <p class="p-text"><span class="str g">TXVP</span> ${t("grammatical")} · <span class="str u">TPVX</span> ${t("notGrammatical")}</p></section>`;
  } else {
    h += `<section class="p-section"><h3 class="p-title">${esc(d.name)}</h3><canvas data-prev="${data.kind}-big" width="260" height="190" style="width:100%;height:auto;border-radius:10px;background:var(--surface-2)"></canvas><p class="p-text">${t("about_" + data.kind)}</p><p class="p-text">${t("pointsInfo", d.X.length)}</p></section>`;
  }
  h += `<section class="p-section"><h3 class="p-title">${t("showing")}</h3><label class="field"><span>${t("showingSub")}</span><select id="sampleSel">${d.X.map((x, i) => `<option value="${i}"${i === S.sample ? " selected" : ""}>${esc(sampleLabel(d, i))}</option>`).join("")}</select></label></section>`;
  return h;
}
function sampleLabel(d, i) {
  const x = d.X[i];
  if (d.kind === "table") return `[${x.join(" ")}] → ${d.y[i]}`;
  if (d.kind === "points") return `#${i + 1} (${x[0].toFixed(2)}, ${x[1].toFixed(2)}) → ${d.y[i]}`;
  return `${d.trainStrings[i]} → ${d.y[i] ? t("grammatical") : t("notGrammatical")}`;
}
function drawDataPreviews() {
  document.querySelectorAll("#flyoutBody canvas[data-prev]").forEach(cv => {
    const kind = cv.dataset.prev.replace("-big", ""), big = cv.dataset.prev.endsWith("-big");
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
    const pos = css("--pos"), neg = css("--neg"), ink = css("--ink");
    if (kind === "logic") {
      const d = C.getDataset(S.design.data.kind === "logic" ? S.design.data : { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] }, lang());
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const rows = d.X, cw = (W - 8) / rows.length;
      rows.forEach((x, i) => {
        const cx = 4 + i * cw + cw / 2;
        ctx.fillStyle = d.y[i] ? pos : neg; ctx.globalAlpha = .2; ctx.fillRect(4 + i * cw + 2, 8, cw - 4, H - 16); ctx.globalAlpha = 1;
        ctx.fillStyle = ink; ctx.font = `500 ${rows.length > 4 ? 9 : 11}px ` + css("--mono"); ctx.fillText(x.join(""), cx, H / 2 - 9);
        ctx.fillStyle = d.y[i] ? pos : neg; ctx.font = "700 14px " + css("--mono"); ctx.fillText(String(d.y[i]), cx, H / 2 + 10);
      });
      return;
    }
    if (kind === "agl") { ctx.font = "600 14px " + css("--mono"); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = pos; ctx.fillText("TXXVP", W / 2, H / 2 - 11); ctx.fillStyle = neg; ctx.fillText("TPVX", W / 2, H / 2 + 11); return; }
    const d = C.getDataset({ kind }, lang()), [lo, hi] = d.range;
    const sx = x => 6 + (x - lo) / (hi - lo) * (W - 12), sy = y => H - 6 - (y - lo) / (hi - lo) * (H - 12);
    d.X.forEach((x, i) => { ctx.fillStyle = d.y[i] ? pos : neg; ctx.beginPath(); ctx.arc(sx(x[0]), sy(x[1]), big ? 3 : 1.7, 0, 7); ctx.fill(); });
  });
}
function panelTraining() {
  const tr = S.design.training, G = S.G;
  return `<section class="p-section">
      <label class="field"><span>${t("lossFn")}</span><select id="trLoss"><option value="bce"${tr.loss === "bce" ? " selected" : ""}>${t("bce")}</option><option value="mse"${tr.loss === "mse" ? " selected" : ""}>${t("mse")}</option></select></label>
      <div class="field-row">
        <label class="field"><span>${t("lr")}</span><input id="trLr" type="number" min="0.001" max="10" step="0.05" value="${tr.lr}"></label>
        <label class="field"><span>${t("epochs")}</span><input id="trEpochs" type="number" min="10" max="50000" step="100" value="${tr.epochs}"></label>
      </div>
      <label class="field"><span>${t("seed")}</span><span class="inline-input"><input class="inp" id="trSeed" type="number" min="0" max="99999" step="1" value="${tr.seed}"><button class="btn sm" type="button" id="trDice" title="${esc(t("newSeed"))}">🎲</button></span></label>
      <p class="p-text">${t("trHelp")}</p>
    </section>
    <section class="p-section"><h3 class="p-title">${t("pythonCode")}</h3>
      <div class="seg small" style="align-self:flex-start"><button type="button" data-style="neuron" aria-pressed="${!(tr.style === "matrix" && G.matrix.ok)}">${t("styleNeuron")}</button><button type="button" data-style="matrix" aria-pressed="${tr.style === "matrix" && G.matrix.ok}" ${G.matrix.ok ? "" : "disabled"}>${t("styleMatrix")}</button></div>
      ${G.matrix.ok ? "" : `<p class="p-text">${esc(G.matrix.reason)}</p>`}
      <label class="check-row"><input type="checkbox" id="trPlot" ${tr.plot ? "checked" : ""}><span>${t("plotOpt")}<small>${t("plotSub")}</small></span></label>
    </section>
    <section class="p-section"><h3 class="p-title">${t("canvasView")}</h3>
      <label class="check-row"><input type="checkbox" id="trValues" ${S.prefs.showValues ? "checked" : ""}><span>${t("showValues")}</span></label>
      <label class="field"><span>${t("speed")}</span><input id="trSpeed" type="range" min="1" max="10" value="${S.prefs.speed}"></label>
    </section>
    <section class="p-section"><h3 class="p-title">${t("numbers")}</h3>
      <dl class="kv"><dt>${t("trainable")}</dt><dd>${G.params}</dd><dt>${t("weights")}</dt><dd>${G.edges.length}</dd><dt>${t("biases")}</dt><dd>${G.params - G.edges.length}</dd>
      <dt>${t("examples")}</dt><dd>${G.ds.X.length}${G.ds.kind === "strings" ? ` + ${G.ds.XTest.length} ${t("test")}` : ""}</dd><dt>print_every</dt><dd>${S.spec.printEvery}</dd></dl>
    </section>`;
}
function panelInspect() {
  const s = S.sel, d = ds(), G = S.G, r = S.run;
  const count = s.nodes.size + s.edges.size + s.notes.size;
  if (!count) {
    const nh = graph().nodes.filter(n => n.type === "hidden").length;
    return `<div class="insp p-section"><h3>${esc(S.design.title)}</h3><div class="kind">${esc(d.name)}</div>
      <dl class="kv"><dt>${t("kindInput")}</dt><dd>${G.usedInputs.length}/${d.nIn}</dd><dt>${t("kindHidden")}</dt><dd>${nh}</dd><dt>${t("arrows")}</dt><dd>${G.edges.length}</dd><dt>${t("trainable")}</dt><dd>${G.params}</dd>
      ${r && r.loss != null ? `<dt>${t("loss")}</dt><dd>${r.loss.toFixed(4)}</dd>` : ""}</dl>
      <p class="muted">${t("inspectHint")}</p></div>`;
  }
  if (count > 1) return `<div class="insp p-section"><h3>${t("nSelected", count)}</h3><p class="muted">${t("inspectMulti")}</p></div>`;
  if (s.notes.size) return `<div class="insp p-section"><h3>${t("note")}</h3><p class="muted">${t("noteInfo")}</p></div>`;
  if (s.edges.size) {
    const e = graph().edges.find(x => s.edges.has(x.id)); if (!e) return "";
    const a = nodeById(e.from), b = nodeById(e.to), A = C.nodeVar(a, d), B = C.nodeVar(b, d);
    const w = r ? r.w[e.id] : null, gw = r && r.started ? r.gw[e.id] : null;
    let ref = `w_${A}_${B}`;
    if (S.design.training.style === "matrix" && G.matrix.ok) { const g = G.depth.get(b.id); ref = `W${g}[${G.matrix.groups[g - 1].findIndex(n => n.id === a.id)}, ${G.matrix.groups[g].findIndex(n => n.id === b.id)}]`; }
    return `<div class="insp p-section"><h3>${esc(A)} → ${esc(B)}</h3><div class="kind">${t("oneWeight")}</div>
      <p>${t("edgeExplain", esc(A), esc(B))}</p>
      <dl class="kv">${w != null ? `<dt>${t("weight")}</dt><dd class="${w >= 0 ? "wpos" : "wneg"}">${(w >= 0 ? "+" : "") + w.toFixed(5)}</dd>` : ""}${gw != null && G.valid ? `<dt>${t("gradient")}</dt><dd>${gw.toFixed(6)}</dd>` : ""}</dl>
      ${w != null ? `<p class="muted">${w >= 0 ? t("edgePos", esc(A), esc(B)) : t("edgeNeg", esc(A), esc(B))}</p>` : ""}
      ${G.valid ? `<div class="coderef">${esc(ref)}</div>` : ""}</div>`;
  }
  const n = nodeById([...s.nodes][0]); if (!n) return "";
  const name = C.nodeVar(n, d), v = values() ? values()[n.id] : null;
  const ins = G.inE.get(n.id) || [], outs = G.outE.get(n.id) || [];
  let h = `<div class="insp p-section"><h3>${esc(name)}</h3><div class="kind">${t("kind_" + n.type)}${n.type !== "input" ? " · " + I.actLabel(n.act) : ""}</div>`;
  if (n.type === "input") {
    h += `<p>${t("inputExplain", n.feature)}${d.kind === "strings" ? " " + t("inputAgl", esc(C.BIGRAMS[n.feature])) : ""}</p>`;
    if (v != null) h += `<dl class="kv"><dt>${t("valueShown")}</dt><dd>${v}</dd></dl>`;
    h += `<p class="muted">${outs.length ? t("sendsN", outs.length) : t("ignoredInput")}</p><div class="coderef">${esc(name)} = X[:, ${n.feature}]</div>`;
  } else {
    h += `<p>${n.type === "output" ? t("outputExplain") : I.actExplain(n.act)}</p>`;
    if (v != null) h += `<dl class="kv"><dt>${t("valueShown")}</dt><dd>${v.toFixed(4)}</dd>${r ? `<dt>${t("bias")}</dt><dd>${r.b[n.id].toFixed(4)}</dd>` : ""}</dl>`;
    if (ins.length && r) h += `<h3 class="p-title">${t("incoming")}</h3><div class="wlist">${ins.map(e => { const w = r.w[e.id]; return `<button type="button" data-goedge="${e.id}"><span>${esc(C.nodeVar(nodeById(e.from), d))}</span><span class="${w >= 0 ? "wpos" : "wneg"}">${(w >= 0 ? "+" : "") + w.toFixed(4)}</span></button>`; }).join("")}</div>`;
    else if (!ins.length) h += `<p class="muted">${t("noIncoming")}</p>`;
    if (n.type === "hidden") h += `<p class="muted">${outs.length ? t("sendsTo", outs.map(e => esc(C.nodeVar(nodeById(e.to), d))).join(", ")) : t("sendsNowhere")}</p>`;
    if (G.valid) {
      if (S.design.training.style === "matrix" && G.matrix.ok) { const g = G.depth.get(n.id), col = G.matrix.groups[g].findIndex(x => x.id === n.id); h += `<div class="coderef">W${g}[:, ${col}]   # ${t("ciWeights")}\nb${g}[0, ${col}]   # ${t("ciBias")}\na${g}[:, ${col}]   # ${t("ciAct")}</div>`; }
      else h += `<div class="coderef">z_${esc(name)} = ${ins.map(e => `w_${esc(C.nodeVar(nodeById(e.from), d))}_${esc(name)} * ${esc(C.nodeVar(nodeById(e.from), d))}`).join(" + ")} + b_${esc(name)}\n${esc(name)} = ${C.ACT[n.act].py}(z_${esc(name)})</div>`;
    }
    if (n.type !== "input") h += `<div class="row"><button class="btn sm" type="button" data-qa="rename">${t("rename")}</button></div>`;
  }
  return h + `</div>`;
}

/* panel events (delegated) */
const fb = $("flyoutBody");
fb.addEventListener("click", e => {
  const el = e.target.closest("[data-el]"); if (el && !el.disabled) { addElement(el.dataset.el); refreshPanel(); return; }
  const lm = e.target.closest("[data-lm]"); if (lm) { S.prefs.layerUnits = Math.max(1, Math.min(16, S.prefs.layerUnits + +lm.dataset.lm)); savePrefs(); refreshPanel(); return; }
  const qa = e.target.closest("[data-qa]");
  if (qa) { const a = qa.dataset.qa; if (a === "tidy") tidy(); else if (a === "fit") { CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 }); renderCanvas(); } else if (a === "all") selectAll(); else if (a === "rename") openRename([...S.sel.nodes][0]); return; }
  const tp = e.target.closest("[data-tpl]");
  if (tp) { stopSim(); if (loadDesign(designFromTemplate(tp.dataset.tpl), true)) toast(t("tplLoaded")); return; }
  const dsb = e.target.closest("[data-ds]");
  if (dsb) { const k = dsb.dataset.ds; if (k === S.design.data.kind) return; changeData(k === "logic" ? { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] } : { kind: k }); return; }
  const lin = e.target.closest("[data-lin]");
  if (lin) { const k = +lin.dataset.lin; if (k === S.design.data.inputs) return; changeData({ kind: "logic", inputs: k, targets: k === 3 ? C.GATES[3].XOR : C.GATES[2].XOR }); return; }
  const gate = e.target.closest("[data-gate]");
  if (gate) { const k = S.design.data.inputs; changeData({ kind: "logic", inputs: k, targets: C.GATES[k][gate.dataset.gate].slice() }); return; }
  const tgt = e.target.closest("[data-tgt]");
  if (tgt) { const tg = S.design.data.targets.slice(); tg[+tgt.dataset.tgt] ^= 1; changeData({ kind: "logic", inputs: S.design.data.inputs, targets: tg }); return; }
  const st = e.target.closest("[data-style]");
  if (st && !st.disabled) { setTraining("style", st.dataset.style, t("rStyle", t(st.dataset.style === "matrix" ? "styleMatrix" : "styleNeuron"))); refreshPanel(); return; }
  const ge = e.target.closest("[data-goedge]");
  if (ge) { S.sel = { nodes: new Set(), edges: new Set([ge.dataset.goedge]), notes: new Set() }; selectionChanged(); return; }
  if (e.target.id === "trDice") { setTraining("seed", Math.floor(Math.random() * 10000), t("rSeed")); refreshPanel(); }
});
fb.addEventListener("change", e => {
  const id = e.target.id, v = e.target.value;
  if (id === "lmAct") { S.prefs.layerAct = v; savePrefs(); }
  else if (id === "lmFrom") { S.prefs.layerFromSel = e.target.checked; savePrefs(); }
  else if (id === "lmTo") { S.prefs.layerToOut = e.target.checked; savePrefs(); }
  else if (id === "trLoss") setTraining("loss", v);
  else if (id === "trLr") { const x = parseFloat(v); if (x > 0 && x <= 10) setTraining("lr", x); else e.target.value = S.design.training.lr; }
  else if (id === "trEpochs") { const x = parseInt(v, 10); if (x >= 10 && x <= 50000) setTraining("epochs", x); else e.target.value = S.design.training.epochs; }
  else if (id === "trSeed") { const x = parseInt(v, 10); if (x >= 0 && x <= 99999) setTraining("seed", x, t("rSeed")); else e.target.value = S.design.training.seed; }
  else if (id === "trPlot") setTraining("plot", e.target.checked);
  else if (id === "trValues") { S.prefs.showValues = e.target.checked; savePrefs(); $("toolValues").setAttribute("aria-pressed", String(S.prefs.showValues)); S.valTick = -1; renderCanvas(); }
  else if (id === "sampleSel") { S.sample = +v; S.valTick = -1; renderCanvas(); renderHUD(true); }
});
fb.addEventListener("input", e => { if (e.target.id === "trSpeed") { S.prefs.speed = +e.target.value; $("simSpeed").value = S.prefs.speed; savePrefs(); } });
fb.addEventListener("dragstart", e => { const el = e.target.closest("[data-el]"); if (el) { e.dataTransfer.setData("application/x-ns-element", el.dataset.el); e.dataTransfer.effectAllowed = "copy"; } });

/* ================= code panel: layout, tabs, editor ================= */
function codeVisible() { return !S.prefs.codeHidden; }
function applyCodePanel() {
  $("app").classList.toggle("code-hidden", S.prefs.codeHidden);
  $("showCode").hidden = !S.prefs.codeHidden;
  $("codeToggle").setAttribute("aria-pressed", String(!S.prefs.codeHidden));
  if (S.prefs.codeW) document.documentElement.style.setProperty("--code-w", S.prefs.codeW + "px");
  if (S.prefs.dockH) document.documentElement.style.setProperty("--dock-h", S.prefs.dockH + "px");
}
function toggleCode(show) {
  S.prefs.codeHidden = show === undefined ? !S.prefs.codeHidden : !show; savePrefs(); applyCodePanel();
  if (!S.prefs.codeHidden) { if (S.prefs.codeTab === "live") { renderSimConsole(); highlightLive(true); } else ensureEditor(); }
  setTimeout(renderCanvas, 0);
}
$("codeToggle").onclick = () => toggleCode();
$("codeHide").onclick = () => toggleCode(false);
$("showCode").onclick = () => toggleCode(true);
function showCodeTab(tab) {
  S.prefs.codeTab = tab; savePrefs();
  $("tabLive").setAttribute("aria-selected", String(tab === "live")); $("tabEditor").setAttribute("aria-selected", String(tab === "editor"));
  $("paneLive").hidden = tab !== "live"; $("paneEditor").hidden = tab !== "editor";
  if (tab === "editor") { ensureEditor().then(ed => ed.layout()); NS.python.ensure().catch(() => {}); }
  else { renderSimConsole(); highlightLive(true); }
}
$("tabLive").onclick = () => showCodeTab("live");
$("tabEditor").onclick = () => showCodeTab("editor");
// splitter
(function () {
  const sp = $("splitter"); let drag = null;
  sp.addEventListener("pointerdown", e => { drag = { x: e.clientX, w: $("codepanel").getBoundingClientRect().width }; sp.classList.add("drag"); sp.setPointerCapture(e.pointerId); e.preventDefault(); });
  sp.addEventListener("pointermove", e => {
    if (!drag) return;
    const ws = $("workspace").getBoundingClientRect().width;
    const w = Math.max(320, Math.min(ws - 420, drag.w + drag.x - e.clientX));
    document.documentElement.style.setProperty("--code-w", w + "px"); S.prefs.codeW = Math.round(w);
  });
  const end = () => { if (drag) { drag = null; sp.classList.remove("drag"); savePrefs(); renderCanvas(); } };
  sp.addEventListener("pointerup", end); sp.addEventListener("pointercancel", end);
  sp.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const w = $("codepanel").getBoundingClientRect().width + (e.key === "ArrowLeft" ? 40 : -40);
    const ws = $("workspace").getBoundingClientRect().width, c = Math.max(320, Math.min(ws - 420, w));
    document.documentElement.style.setProperty("--code-w", c + "px"); S.prefs.codeW = Math.round(c); savePrefs(); renderCanvas();
  });
  for (const dock of document.querySelectorAll(".dock")) {
    const h = document.createElement("div"); h.className = "dock-resize"; dock.prepend(h);
    let d = null;
    h.addEventListener("pointerdown", e => { d = { y: e.clientY, h: dock.getBoundingClientRect().height }; h.setPointerCapture(e.pointerId); e.preventDefault(); });
    h.addEventListener("pointermove", e => {
      if (!d) return;
      const max = $("codepanel").getBoundingClientRect().height - 200;
      const nh = Math.max(110, Math.min(max, d.h + d.y - e.clientY));
      document.documentElement.style.setProperty("--dock-h", nh + "px"); S.prefs.dockH = Math.round(nh);
    });
    h.addEventListener("pointerup", () => { if (d) { d = null; savePrefs(); } });
  }
})();

function ensureEditor() {
  if (S.ed) return Promise.resolve(S.ed);
  if (S.edP) return S.edP;
  const saved = store.get(KEYS.editor);
  S.edP = NS.editor.create($("editorHost"), {
    value: typeof saved === "string" && saved.trim() ? saved : S.prog.text, theme: codeTheme(), fontSize: S.prefs.fontSize, wrap: S.prefs.wrap, minimap: S.prefs.minimap,
    onRun: pyRun, onSave: exportEditorPy, onChange: onEditorChange, ariaLabel: t("editor")
  }).then(ed => { S.ed = ed; updateEditorDirty(); return ed; });
  return S.edP;
}
let edSaveT = null;
function onEditorChange() {
  clearTimeout(edSaveT);
  edSaveT = setTimeout(() => { if (S.ed) store.set(KEYS.editor, S.ed.getValue()); updateEditorDirty(); }, 400);
}
function editorText() { if (S.ed) return S.ed.getValue(); const s = store.get(KEYS.editor); return typeof s === "string" && s.trim() ? s : S.prog.text; }
function updateEditorDirty() {
  const txt = S.ed ? S.ed.getValue() : store.get(KEYS.editor);
  const dirty = typeof txt === "string" && txt.trim() && S.prog && txt !== S.prog.text;
  $("editorDirty").hidden = !dirty;
  $("tabEditor").title = dirty ? t("editorDiffers") : "";
}
async function loadLiveIntoEditor(askFirst) {
  const ed = await ensureEditor();
  const cur = ed.getValue();
  if (askFirst && cur.trim() && cur !== S.prog.text) {
    const ok = await confirmBox(t("replaceTitle"), t("replaceText"), t("replace"), t("cancel"));
    if (!ok) return false;
  }
  ed.setValue(S.prog.text); store.set(KEYS.editor, S.prog.text); ed.setMarkers([]); setProblems([]); updateEditorDirty();
  return true;
}
$("liveToEditor").onclick = async () => { if (!S.G.valid) return; showCodeTab("editor"); if (await loadLiveIntoEditor(true)) toast(t("copiedToEditor")); };
$("liveRunPy").onclick = async () => { if (!S.G.valid) return; showCodeTab("editor"); if (await loadLiveIntoEditor(true)) pyRun(); };
$("edFromCanvas").onclick = async () => { if (!S.G.valid) { toast(t("fixFirst")); return; } if (await loadLiveIntoEditor(true)) toast(t("copiedToEditor")); };
$("liveCopy").onclick = () => copyText(S.prog.text, t("codeCopied"));
function copyText(txt, msg) {
  const fallback = () => {
    const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(msg); } catch (e) { toast(t("copyFailed")); } ta.remove();
  };
  try { navigator.clipboard.writeText(txt).then(() => toast(msg), fallback); } catch (e) { fallback(); }
}
/* editor settings */
$("edSettingsBtn").onclick = e => { e.stopPropagation(); const m = $("edSettings"), open = m.hidden; closePopups(); m.hidden = !open; $("edSettingsBtn").setAttribute("aria-expanded", String(open)); };
$("edSettings").addEventListener("click", e => e.stopPropagation());
$("codeThemeSel").onchange = e => { S.prefs.codeTheme = e.target.value; savePrefs(); applyCodeTheme(); };
$("fontSizeSel").oninput = e => { S.prefs.fontSize = +e.target.value; savePrefs(); applyCodeTheme(); };
$("wrapSel").onchange = e => { S.prefs.wrap = e.target.checked; savePrefs(); if (S.ed) S.ed.setWrap(S.prefs.wrap); };
$("minimapSel").onchange = e => { S.prefs.minimap = e.target.checked; savePrefs(); if (S.ed) S.ed.setMinimap(S.prefs.minimap); };
function applyCodeTheme() {
  const ct = codeTheme();
  document.querySelectorAll(".code-theme").forEach(el => el.dataset.ct = ct);
  document.documentElement.style.setProperty("--code-fs", S.prefs.fontSize + "px");
  if (S.ed) { S.ed.setTheme(ct); S.ed.setFontSize(S.prefs.fontSize); }
}

/* ================= Python runner UI ================= */
let outQueue = [], outRAF = 0;
function outAppend(text, cls) {
  outQueue.push([text, cls]);
  if (!outRAF) outRAF = requestAnimationFrame(flushOut);
}
function flushOut() {
  outRAF = 0; const box = $("pyOut"), frag = document.createDocumentFragment();
  for (const [text, cls] of outQueue) { const s = document.createElement("span"); if (cls) s.className = "o-" + cls; s.textContent = text; frag.appendChild(s); }
  outQueue = []; box.appendChild(frag);
  while (box.childNodes.length > 4000) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function outImage(b64) { flushOut(); const img = document.createElement("img"); img.className = "o-img"; img.alt = t("plotAlt"); img.src = "data:image/png;base64," + b64; $("pyOut").appendChild(img); $("pyOut").scrollTop = $("pyOut").scrollHeight; }
$("outClear").onclick = () => { outQueue = []; $("pyOut").innerHTML = ""; };
function setProblems(list) {
  S.problems = list;
  const box = $("pyProblems"), cnt = $("probCount");
  if (!list.length) { box.innerHTML = `<p style="color:var(--muted);margin:4px 0">${esc(t("noProblems"))}</p>`; cnt.hidden = true; return; }
  cnt.hidden = false; cnt.textContent = list.length; cnt.classList.toggle("warn", list.every(p => p.sev === "warn"));
  box.innerHTML = list.map((p, i) => `<button class="prob" type="button" data-prob="${i}"><span class="dot" style="background:${p.sev === "warn" ? "var(--warn)" : "var(--bad)"}"></span><span>${esc(p.msg)} <code>${t("lineN", p.line)}</code></span></button>`).join("");
}
$("pyProblems").onclick = e => { const b = e.target.closest("[data-prob]"); if (!b || !S.ed) return; const p = S.problems[+b.dataset.prob]; S.ed.reveal(p.line, p.col); };
function pyStatus(state, info) {
  const dot = $("pyStatus").querySelector(".py-dot"), txt = $("pyStatusText");
  dot.className = "py-dot " + (state === "idle" ? "" : state);
  txt.textContent = state === "loading" ? t("pyLoading") : state === "ready" ? t("pyReady", info || "") : state === "running" ? t("pyRunning") : state === "error" ? t("pyError", info || "") : t("pyIdle");
  const busy = state === "running" || (NS.python.busy);
  $("edStop").disabled = !(state === "running" || state === "loading" && S.pyRunning);
  $("edRun").disabled = !!S.pyRunning; $("edCheck").disabled = !!S.pyRunning || state === "running";
  void busy;
}
NS.python.onStatus(pyStatus);
function friendlyHint(r) {
  const m = (r.type || "") + ": " + (r.msg || "");
  if (/ModuleNotFoundError/.test(m)) return t("hintModule");
  if (r.type === "NameError") return t("hintName");
  if (r.type === "IndentationError" || r.type === "TabError") return t("hintIndent");
  if (r.type === "SyntaxError") return t("hintSyntax");
  if (r.type === "TypeError") return t("hintType");
  if (r.type === "ValueError" && /shape|broadcast|align/.test(r.msg)) return t("hintShape");
  if (r.type === "ZeroDivisionError") return t("hintZero");
  if (r.type === "EOFError") return t("hintInput");
  return "";
}
async function pyRun() {
  if (S.pyRunning) return;
  const ed = await ensureEditor(); const code = ed.getValue();
  if (!code.trim()) { toast(t("emptyCode")); return; }
  S.pyRunning = true; showDock("out");
  if ($("pyOut").childNodes.length) outAppend("\n", "");
  outAppend(`$ python network.py\n`, "sys");
  ed.setMarkers([]); setProblems([]);
  pyStatus(NS.python.state === "ready" ? "ready" : NS.python.state, NS.python.version);
  if (NS.python.state !== "ready") outAppend(t("pyFirstLoad") + "\n", "sys");
  try {
    const res = await NS.python.run(code, {
      out: s => outAppend(s + "\n"), err: s => outAppend(s + "\n", "err"), image: outImage,
      stdin: () => outAppend(t("noInput") + "\n", "warn"), pkg: s => outAppend(s + "\n", "sys")
    });
    if (res.type === "stopped") { outAppend(t("stopped") + "\n", "warn"); return; }
    const r = res.result;
    if (r.ok) outAppend(t("finished", (res.ms / 1000).toFixed(2)) + "\n", "ok");
    else {
      const trace = r.kind === "syntax" ? `  File "network.py", line ${r.line}\n    ${(r.text || "").trim()}\n${r.type}: ${r.msg}` : r.trace;
      outAppend(trace.replace(/\n?$/, "\n"), "err");
      const hint = friendlyHint(r); if (hint) outAppend("💡 " + hint + "\n", "warn");
      if (r.line) { const p = [{ line: r.line, col: r.col || 1, msg: `${r.type}: ${r.msg}`, sev: "error" }]; ed.setMarkers(p); setProblems(p); }
    }
  } catch (e) {
    outAppend(t("pyLoadFail", e.message) + "\n", "err");
  } finally {
    S.pyRunning = false; pyStatus(NS.python.state, NS.python.version);
  }
}
async function pyCheck() {
  if (S.pyRunning) return;
  const ed = await ensureEditor(); const code = ed.getValue();
  showDock("out"); S.pyRunning = true; pyStatus(NS.python.state, NS.python.version);
  outAppend((($("pyOut").childNodes.length) ? "\n" : "") + t("checking") + "\n", "sys");
  try {
    const res = await NS.python.check(code, true);
    if (res.type === "stopped") return;
    const probs = [];
    if (!res.syntax.ok) probs.push({ line: res.syntax.line || 1, col: res.syntax.col || 1, msg: `${res.syntax.type}: ${res.syntax.msg}`, sev: "error" });
    if (res.lint) res.lint.forEach(p => probs.push({ line: p.line, col: p.col, msg: p.msg, sev: "warn" }));
    ed.setMarkers(probs); setProblems(probs);
    if (!res.syntax.ok) { outAppend(`${t("syntaxErr", res.syntax.line)}\n${res.syntax.type}: ${res.syntax.msg}\n`, "err"); const h = friendlyHint(res.syntax); if (h) outAppend("💡 " + h + "\n", "warn"); }
    else if (res.lint == null) outAppend(t("syntaxOkOnly") + "\n", "ok");
    else if (!res.lint.length) outAppend(t("checkClean") + "\n", "ok");
    else { outAppend(t("checkWarn", res.lint.length) + "\n", "warn"); showDock("prob"); }
  } catch (e) { outAppend(t("pyLoadFail", e.message) + "\n", "err"); }
  finally { S.pyRunning = false; pyStatus(NS.python.state, NS.python.version); }
}
$("edRun").onclick = pyRun;
$("edCheck").onclick = pyCheck;
$("edStop").onclick = () => { NS.python.stop(); S.pyRunning = false; pyStatus("idle"); };

/* ================= import / export ================= */
function designB64() { return IO.b64encode(JSON.stringify(S.design)); }
const base = () => IO.slug(S.design.title);
function exportJSON() { IO.download(base() + ".json", JSON.stringify(S.design, null, 2), "application/json"); toast(t("savedFile", base() + ".json")); }
function svgForExport() {
  return CV.exportSVG(S.design, { G: S.G, values: S.prefs.showValues ? values() : null, weights: S.run ? S.run.w : null, title: S.design.title, meta: designB64(), lang: lang() });
}
function exportSVGFile() { const x = svgForExport(); IO.download(base() + ".svg", x.svg, "image/svg+xml"); toast(t("savedFile", base() + ".svg")); }
async function pngBlob() {
  const x = svgForExport();
  const blob = await IO.svgToPng(x.svg, x.width, x.height, 2);
  const buf = await blob.arrayBuffer();
  return new Blob([IO.pngAddText(buf, designB64())], { type: "image/png" });
}
async function exportPNG() {
  try { IO.download(base() + ".png", await pngBlob()); toast(t("savedFile", base() + ".png")); }
  catch (e) { toast(t("pngFailed")); }
}
function liveWithTrailer() { return S.prog.text + IO.pyTrailer(designB64(), lang()); }
function exportLivePy() { if (!S.G.valid) { toast(t("fixFirst")); return; } IO.download(base() + ".py", liveWithTrailer(), "text/x-python"); toast(t("savedFile", base() + ".py")); }
function exportEditorPy() { const txt = editorText(); IO.download(base() + "_editor.py", txt, "text/x-python"); toast(t("savedFile", base() + "_editor.py")); }
function exportIpynb() {
  if (!S.G.valid) { toast(t("fixFirst")); return; }
  IO.download(base() + ".ipynb", IO.notebook(S.prog.lines.map(l => l.t), S.design.title, t("nbIntro")), "application/x-ipynb+json"); toast(t("savedFile", base() + ".ipynb"));
}
async function exportZip() {
  if (!S.G.valid) { toast(t("fixFirst")); return; }
  let JSZip;
  try { JSZip = await IO.loadJSZip(); } catch (e) { toast(t("zipFailed")); return; }
  const zip = new JSZip(), f = zip.folder(base());
  f.file("network.py", liveWithTrailer());
  const ed = editorText(); if (ed.trim() && ed !== S.prog.text) f.file("my_code.py", ed);
  f.file("network.ipynb", IO.notebook(S.prog.lines.map(l => l.t), S.design.title, t("nbIntro")));
  f.file("requirements.txt", "numpy>=1.24\n" + (S.design.training.plot || /matplotlib/.test(ed) ? "matplotlib>=3.5\n" : ""));
  f.file("design.json", JSON.stringify(S.design, null, 2) + "\n");
  try { f.file("network.png", await pngBlob()); } catch (e) { /* image is optional */ }
  f.file("README.md", t("readme", S.design.title, ed.trim() && ed !== S.prog.text));
  const blob = await zip.generateAsync({ type: "blob" });
  IO.download(base() + ".zip", blob); toast(t("savedFile", base() + ".zip"));
}
async function openDesignFile(file) {
  const name = file.name.toLowerCase();
  try {
    let json = null;
    if (name.endsWith(".json")) json = JSON.parse(await IO.readText(file));
    else if (name.endsWith(".png")) { const tx = IO.pngReadText(await IO.readBuf(file)); if (!tx) { toast(t("noDesignInImage")); return; } json = JSON.parse(IO.b64decode(tx)); }
    else if (name.endsWith(".svg")) { const tx = IO.svgReadMeta(await IO.readText(file)); if (!tx) { toast(t("noDesignInImage")); return; } json = JSON.parse(IO.b64decode(tx)); }
    else if (name.endsWith(".py") || name.endsWith(".txt")) { return importPyFile(file); }
    else { toast(t("unknownFile")); return; }
    if (loadDesign(json, true)) toast(t("opened", file.name));
  } catch (e) { toast(t("badDesign")); }
}
async function importPyFile(file) {
  const text = await IO.readText(file);
  const b64 = IO.pyReadDesign(text), code = IO.pyStripTrailer(text);
  toggleCode(true); showCodeTab("editor");
  const ed = await ensureEditor();
  const cur = ed.getValue();
  if (cur.trim() && cur !== S.prog.text && cur !== code) {
    const ok = await confirmBox(t("replaceTitle"), t("replaceText"), t("replace"), t("cancel")); if (!ok) return;
  }
  ed.setValue(code); store.set(KEYS.editor, code); ed.setMarkers([]); setProblems([]); updateEditorDirty();
  toast(t("pyImported", file.name));
  if (b64) {
    const yes = await confirmBox(t("pyHasDesignTitle"), t("pyHasDesign"), t("redraw"), t("notNow"));
    if (yes) { try { loadDesign(JSON.parse(IO.b64decode(b64)), true, t("redrawn")); } catch (e) { toast(t("badDesign")); } }
  }
}
$("fileDesign").onchange = e => { const f = e.target.files[0]; if (f) openDesignFile(f); e.target.value = ""; };
$("filePy").onchange = e => { const f = e.target.files[0]; if (f) importPyFile(f); e.target.value = ""; };
$("edImport").onclick = () => $("filePy").click();
$("edExport").onclick = exportEditorPy;
async function newDesign() {
  pushUndo();
  S.design = designFromTemplate("blank"); S.design.title = t("untitled");
  afterLoad(true); toast(t("newMade"));
}
const CMDS = {
  new: newDesign, open: () => $("fileDesign").click(), save: exportJSON, importPy: () => $("filePy").click(),
  templates: () => { if (S.prefs.flyout !== "templates" || $("flyout").hidden) openPanel("templates"); }, help: () => openHelp(),
  exPng: exportPNG, exSvg: exportSVGFile, exPyLive: exportLivePy, exPyEditor: exportEditorPy, exIpynb: exportIpynb, exZip: exportZip
};
function menuToggle(btn, menu) {
  $(btn).onclick = e => { e.stopPropagation(); const open = $(menu).hidden; closePopups(); $(menu).hidden = !open; $(btn).setAttribute("aria-expanded", String(open)); if (open) { const f = $(menu).querySelector("button"); f && f.focus({ preventScroll: true }); } };
  $(menu).addEventListener("click", e => { const b = e.target.closest("[data-cmd]"); if (!b) return; closePopups(); CMDS[b.dataset.cmd](); });
}
menuToggle("fileBtn", "fileMenu"); menuToggle("exportBtn", "exportMenu");
document.addEventListener("pointerdown", e => {
  if (!e.target.closest(".menu,.menu-wrap,.pop,.ctx-bar,.rename-pop,.note-editor")) {
    $("ctxMenu").hidden = true; closePop();
    for (const [b, m] of [["fileBtn", "fileMenu"], ["exportBtn", "exportMenu"], ["edSettingsBtn", "edSettings"]]) { $(m).hidden = true; $(b).setAttribute("aria-expanded", "false"); }
  }
  if (!e.target.closest("#issues,#statusChip")) { $("issues").hidden = true; $("statusChip").setAttribute("aria-expanded", "false"); }
});
/* drag and drop files */
(function () {
  let depth = 0;
  const hasFiles = e => [...(e.dataTransfer && e.dataTransfer.types || [])].includes("Files");
  window.addEventListener("dragenter", e => { if (!hasFiles(e)) return; depth++; $("dropOverlay").hidden = false; });
  window.addEventListener("dragleave", e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) $("dropOverlay").hidden = true; });
  window.addEventListener("dragover", e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener("drop", e => {
    if (!hasFiles(e)) return; e.preventDefault(); depth = 0; $("dropOverlay").hidden = true;
    const f = e.dataTransfer.files[0]; if (!f) return;
    if (/\.py$/i.test(f.name)) importPyFile(f); else openDesignFile(f);
  });
})();

/* ================= dialogs, toast, help ================= */
function toast(msg) { const el = $("toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3400); }
function confirmBox(title, text, yes, no) {
  return new Promise(res => {
    $("confirmTitle").textContent = title; $("confirmText").textContent = text; $("confirmYes").textContent = yes; $("confirmNo").textContent = no;
    $("modalBack").hidden = false; $("confirmModal").hidden = false; $("confirmYes").focus();
    const done = v => { $("modalBack").hidden = true; $("confirmModal").hidden = true; $("confirmYes").onclick = $("confirmNo").onclick = null; document.removeEventListener("keydown", key, true); res(v); };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    document.addEventListener("keydown", key, true);
    $("confirmYes").onclick = () => done(true); $("confirmNo").onclick = () => done(false);
  });
}
function openHelp(section) {
  const sections = I.help();
  $("helpNav").innerHTML = sections.map(s => `<button type="button" data-h="${s.id}">${esc(s.title)}</button>`).join("");
  $("helpBody").innerHTML = sections.map(s => `<section id="h-${s.id}"><h3>${esc(s.title)}</h3>${s.html}</section>`).join("") +
    `<p class="credit">${esc((window.NS_CONFIG && window.NS_CONFIG.credit) || "")}</p>`;
  $("modalBack").hidden = false; $("helpModal").hidden = false;
  const go = id => { const el = document.getElementById("h-" + id); if (el) $("helpBody").scrollTop = el.offsetTop - $("helpBody").offsetTop - 10; mark(id); };
  const mark = id => $("helpNav").querySelectorAll("button").forEach(b => b.setAttribute("aria-current", String(b.dataset.h === id)));
  $("helpNav").onclick = e => { const b = e.target.closest("[data-h]"); if (b) go(b.dataset.h); };
  $("helpBody").onscroll = () => {
    const top = $("helpBody").scrollTop + $("helpBody").offsetTop + 40; let cur = sections[0].id;
    for (const s of sections) { const el = document.getElementById("h-" + s.id); if (el && el.offsetTop <= top) cur = s.id; }
    mark(cur);
  };
  if (section) go(section); else { $("helpBody").scrollTop = 0; mark(sections[0].id); }
  $("helpModal").querySelector("[data-close]").focus();
}
function closeHelp() { $("modalBack").hidden = true; $("helpModal").hidden = true; }
$("helpModal").querySelector("[data-close]").onclick = closeHelp;
$("modalBack").onclick = () => { if (!$("helpModal").hidden) closeHelp(); };
$("helpBtn").onclick = () => openHelp();
$("railHelp").onclick = () => openHelp();

/* ================= top bar ================= */
$("undoBtn").onclick = undo; $("redoBtn").onclick = redo;
$("designTitle").addEventListener("change", e => { const v = e.target.value.trim() || t("untitled"); if (v === S.design.title) return; pushUndo(); S.design.title = v.slice(0, 60); e.target.value = S.design.title; scheduleSave(); if (S.prefs.flyout === "inspect") refreshPanel(); });
$("designTitle").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === "Escape") { if (e.key === "Escape") e.target.value = S.design.title; e.target.blur(); } });
function applyTheme() {
  const sys = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = S.prefs.theme || sys;
  applyCodeTheme();
  renderHUD(true);
  if (S.prefs.flyout === "data") drawDataPreviews();
}
$("themeBtn").onclick = () => { S.prefs.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; savePrefs(); applyTheme(); };
if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!S.prefs.theme) applyTheme(); });
function setLang(l) {
  if (l === lang() && document.documentElement.lang === l) return;
  I.setLang(l); S.prefs.lang = l; savePrefs();
  document.documentElement.lang = l;
  $("langEn").setAttribute("aria-pressed", String(l === "en")); $("langEs").setAttribute("aria-pressed", String(l === "es"));
  panelTemplates.thumbs = {};
  rebuild(null, { flash: false }); refreshPanel(); pyStatus(NS.python.state, NS.python.version);
  if (!$("helpModal").hidden) openHelp();
  if (!S.problems || !S.problems.length) setProblems([]);
  if (!S.G.errors.length) setSimStat(simStatText());
}
$("langEn").onclick = () => setLang("en"); $("langEs").onclick = () => setLang("es");

/* tools & zoom */
function setTool(tl) { CV.setTool(tl); $("toolSelect").setAttribute("aria-pressed", String(tl === "select")); $("toolHand").setAttribute("aria-pressed", String(tl === "hand")); }
$("toolSelect").onclick = () => setTool("select");
$("toolHand").onclick = () => setTool("hand");
$("toolTidy").onclick = tidy;
$("toolValues").onclick = () => { S.prefs.showValues = !S.prefs.showValues; savePrefs(); $("toolValues").setAttribute("aria-pressed", String(S.prefs.showValues)); S.valTick = -1; renderCanvas(); if (S.prefs.flyout === "training") refreshPanel(); };
$("toolSnap").onclick = () => { S.prefs.snap = !S.prefs.snap; savePrefs(); $("toolSnap").setAttribute("aria-pressed", String(S.prefs.snap)); toast(S.prefs.snap ? t("snapOn") : t("snapOff")); };
$("zoomIn").onclick = () => { CV.zoomAt(CV.view.k * 1.2); renderCanvas(); };
$("zoomOut").onclick = () => { CV.zoomAt(CV.view.k / 1.2); renderCanvas(); };
$("zoomPct").onclick = () => { CV.zoomAt(1); renderCanvas(); };
$("zoomFit").onclick = () => { CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 }); renderCanvas(); };

/* rename & note editors */
$("renameInput").addEventListener("input", () => { const e = renameCheck(); $("renameErr").textContent = e || ""; });
$("renameInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); commitRename(); } else if (e.key === "Escape") { e.preventDefault(); closeRename(); $("canvasHost").focus(); } e.stopPropagation(); });
$("renameInput").addEventListener("blur", () => setTimeout(() => { if (S.renaming && document.activeElement !== $("renameInput")) { if (!renameCheck()) commitRename(); else closeRename(); } }, 120));
$("noteEditor").addEventListener("blur", commitNote);
$("noteEditor").addEventListener("keydown", e => { if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commitNote(); $("canvasHost").focus(); } e.stopPropagation(); });

/* ================= keyboard ================= */
document.addEventListener("keydown", e => {
  if (!$("helpModal").hidden) { if (e.key === "Escape") closeHelp(); return; }
  if (!$("confirmModal").hidden) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === "s") { e.preventDefault(); exportJSON(); return; }
  if (mod && k === "o") { e.preventDefault(); $("fileDesign").click(); return; }
  if (CV.isTyping(e)) return;
  if (e.altKey && k === "n") { e.preventDefault(); newDesign(); return; }
  if (mod && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if ((mod && k === "z" && e.shiftKey) || (mod && k === "y")) { e.preventDefault(); redo(); return; }
  if (mod && k === "c") { if (copySelection()) toast(t("copied")); return; }
  if (mod && k === "x") { if (copySelection()) deleteSelection(); return; }
  if (mod && k === "v") { e.preventDefault(); pasteClipboard(); return; }
  if (mod && k === "d") { e.preventDefault(); duplicateSelection(); return; }
  if (mod && k === "a") { e.preventDefault(); selectAll(); return; }
  if (mod && (k === "=" || k === "+")) { e.preventDefault(); CV.zoomAt(CV.view.k * 1.2); renderCanvas(); return; }
  if (mod && k === "-") { e.preventDefault(); CV.zoomAt(CV.view.k / 1.2); renderCanvas(); return; }
  if (mod && k === "0") { e.preventDefault(); CV.zoomAt(1); renderCanvas(); return; }
  if (mod) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); return; }
  if (e.key === "Escape") { closePopups(); canvasApi.clearSelection(); return; }
  if (e.key === "Enter") {
    if (S.sel.nodes.size === 1 && !S.sel.notes.size) { e.preventDefault(); openRename([...S.sel.nodes][0]); }
    else if (S.sel.notes.size === 1 && !S.sel.nodes.size) { e.preventDefault(); openNoteEditor([...S.sel.notes][0]); }
    return;
  }
  if (e.key.startsWith("Arrow")) {
    e.preventDefault(); const st = e.shiftKey ? 12 : 1;
    nudge(e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0); return;
  }
  if (e.key === "?") { openHelp(); return; }
  if (e.key === "\\") { toggleCode(); return; }
  if (k === "v") setTool("select"); else if (k === "h") setTool("hand");
  else if (k === "f") { CV.fit(S.design, { padB: S.prefs.hudOpen ? 280 : 90 }); renderCanvas(); }
  else if (k === "n") addElement("hidden"); else if (k === "i") addElement("input"); else if (k === "o") addElement("output"); else if (k === "t") addElement("note");
  else if (k === "l") addElement("layer");
  else if (k === "p") simRun(); else if (k === "s") { stopSim(); if (S.mode !== "step") S.mode = "step"; simStep(); updateSimUI(); }
});

/* ================= start ================= */
function init() {
  if (!store.get(KEYS.prefs)) { // first visit: give the canvas room on smaller screens
    if (innerWidth < 1400) S.prefs.flyout = null;
    if (innerWidth < 980) S.prefs.codeHidden = true;
    if (innerWidth < 1300 || innerHeight < 760) S.prefs.hudOpen = false;
  }
  I.setLang(S.prefs.lang || ((navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en"));
  document.documentElement.lang = lang();
  $("langEn").setAttribute("aria-pressed", String(lang() === "en")); $("langEs").setAttribute("aria-pressed", String(lang() === "es"));
  const sys = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = S.prefs.theme || sys;
  $("codeThemeSel").value = S.prefs.codeTheme; $("fontSizeSel").value = S.prefs.fontSize; $("wrapSel").checked = S.prefs.wrap; $("minimapSel").checked = S.prefs.minimap;
  $("simSpeed").value = S.prefs.speed;
  $("toolValues").setAttribute("aria-pressed", String(S.prefs.showValues)); $("toolSnap").setAttribute("aria-pressed", String(S.prefs.snap));
  $("hudBody").hidden = !S.prefs.hudOpen; $("hudToggle").setAttribute("aria-expanded", String(S.prefs.hudOpen));
  applyCodePanel(); applyCodeTheme();
  CV.init(canvasApi);
  const saved = store.get(KEYS.design);
  let d = null;
  if (saved) { try { d = normalizeDesign(saved); } catch (e) { d = null; } }
  S.design = d || designFromTemplate("shortcut");
  if (S.prefs.flyout) { $("flyout").hidden = false; syncRail(); }
  afterLoad(true);
  showCodeTab(S.prefs.codeTab === "editor" ? "editor" : "live");
  setProblems([]); pyStatus("idle");
  if (!store.get(KEYS.seen)) { store.set(KEYS.seen, 1); setTimeout(() => toast(t("welcome")), 600); }
  window.addEventListener("resize", () => { renderHUD(true); positionCtxBar(); });
}
init();
NS.app = { S, rebuild, loadDesign, designFromTemplate, openHelp, setLang, exportPNG, pngBlob };
})();
