/* Files in and out: downloads, PNG/SVG with the design hidden inside, notebooks and zip projects. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

const enc = new TextEncoder(), dec = new TextDecoder();
function b64encode(str) { const bytes = enc.encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64decode(b64) { const bin = atob(b64.replace(/\s+/g, "")); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return dec.decode(bytes); }

function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const slug = s => (String(s || "network").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "network");
const readText = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
const readBuf = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });

/* ---------- PNG text chunk ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const KEY = "network-studio";
function pngAddText(buf, text) {
  const src = new Uint8Array(buf);
  const kw = enc.encode(KEY), body = enc.encode(text); // text is base64, so plain ASCII
  const data = new Uint8Array(kw.length + 1 + body.length); data.set(kw, 0); data[kw.length] = 0; data.set(body, kw.length + 1);
  const type = enc.encode("tEXt");
  const chunk = new Uint8Array(12 + data.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length); chunk.set(type, 4); chunk.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length); crcIn.set(type, 0); crcIn.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcIn));
  // insert right after IHDR (8-byte signature + 25-byte IHDR chunk)
  const at = 8 + 25;
  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, at), 0); out.set(chunk, at); out.set(src.subarray(at), at + chunk.length);
  return out;
}
function pngReadText(buf) {
  const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b[0] !== 0x89 || b[1] !== 0x50) return null;
  let p = 8;
  while (p + 8 <= b.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (type === "tEXt") {
      const data = b.subarray(p + 8, p + 8 + len), z = data.indexOf(0);
      if (dec.decode(data.subarray(0, z)) === KEY) return dec.decode(data.subarray(z + 1));
    }
    if (type === "IEND") break;
    p += 12 + len;
  }
  return null;
}
function svgToPng(svgText, w, h, scale) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext("2d"); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
      c.toBlob(b => b ? res(b) : rej(new Error("png")), "image/png");
    };
    img.onerror = () => rej(new Error("svg image"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  });
}
function svgReadMeta(text) { const m = /<metadata id="network-studio-design">([^<]*)<\/metadata>/.exec(text); return m ? m[1].trim() : null; }

/* ---------- design inside a .py file ---------- */
const PY_MARK = "# NS-DESIGN:";
function pyTrailer(designB64, lang) {
  const msg = lang === "es" ? "# --- Network Studio: esta línea permite que la app vuelva a dibujar la red. Puedes borrarla. ---" : "# --- Network Studio: this line lets the app redraw the network. You can delete it. ---";
  return `\n${msg}\n${PY_MARK}${designB64}\n`;
}
function pyReadDesign(text) { const i = text.lastIndexOf(PY_MARK); if (i < 0) return null; return text.slice(i + PY_MARK.length).split("\n")[0].trim(); }
function pyStripTrailer(text) {
  const i = text.lastIndexOf(PY_MARK); if (i < 0) return text;
  const before = text.slice(0, i).replace(/\n# --- Network Studio[^\n]*\n?$/, "\n");
  return before.replace(/\n+$/, "\n");
}

/* ---------- notebook ---------- */
function notebook(lines, title, intro) {
  const cells = [{ cell_type: "markdown", metadata: {}, source: [`# ${title}\n`, intro] }];
  let cur = [], heading = null;
  const push = () => {
    while (cur.length && !cur[cur.length - 1].trim()) cur.pop();
    while (cur.length && !cur[0].trim()) cur.shift();
    if (!cur.length) return;
    if (heading) cells.push({ cell_type: "markdown", metadata: {}, source: [`## ${heading}`] });
    cells.push({ cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: cur.map((l, i) => i < cur.length - 1 ? l + "\n" : l) });
    cur = []; heading = null;
  };
  let body = lines.slice(); const end = body.indexOf('"""', 1); if (body[0] === '"""' && end > 0) body = body.slice(end + 1);
  for (const l of body) { const m = l.match(/^# -{10} \d+\. (.+) -{10}$/); if (m) { push(); heading = m[1]; continue; } cur.push(l); }
  push();
  return JSON.stringify({ cells, metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python" } }, nbformat: 4, nbformat_minor: 5 }, null, 1);
}

let jszipP = null;
function loadJSZip() {
  if (root.JSZip) return Promise.resolve(root.JSZip);
  if (jszipP) return jszipP;
  jszipP = new Promise((res, rej) => {
    // Monaco's AMD loader defines window.define; hide it so JSZip sets window.JSZip instead of registering a module
    const savedDefine = root.define; root.define = undefined;
    const restore = () => { if (savedDefine) root.define = savedDefine; };
    const s = document.createElement("script"); s.src = (root.NS_CONFIG && root.NS_CONFIG.jszip) || "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => { restore(); root.JSZip ? res(root.JSZip) : (jszipP = null, rej(new Error("jszip"))); };
    s.onerror = () => { restore(); jszipP = null; rej(new Error("jszip")); };
    document.head.appendChild(s);
  });
  return jszipP;
}

NS.io = { download, slug, readText, readBuf, pngAddText, pngReadText, svgToPng, svgReadMeta, b64encode, b64decode, pyTrailer, pyReadDesign, pyStripTrailer, notebook, loadJSZip, PY_MARK };
})(typeof window !== "undefined" ? window : globalThis);
