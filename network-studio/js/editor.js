/* The code editor: Monaco (the editor inside VS Code) when it can load, otherwise a lighter built-in editor. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }

async function loadMonaco() {
  if (root.monaco && root.monaco.editor) return root.monaco;
  let base = (root.NS_CONFIG && root.NS_CONFIG.monaco) || "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs";
  base = new URL(base.replace(/\/$/, ""), location.href).href;
  await loadScript(base + "/loader.js");
  root.MonacoEnvironment = {
    getWorkerUrl() {
      const src = `self.MonacoEnvironment={baseUrl:${JSON.stringify(base.replace(/\/vs$/, "") + "/")}};importScripts(${JSON.stringify(base + "/base/worker/workerMain.js")});`;
      return URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    }
  };
  root.require.config({ paths: { vs: base } });
  return new Promise((res, rej) => root.require(["vs/editor/editor.main"], () => res(root.monaco), rej));
}

/* ---------------- Monaco wrapper ---------------- */
function monacoEditor(host, opts, monaco) {
  NS.pyhl.registerMonaco(monaco);
  const ed = monaco.editor.create(host, {
    value: opts.value || "", language: "python", theme: "ns-" + (opts.theme || "dark"),
    automaticLayout: true, fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace', fontSize: opts.fontSize || 13, fontLigatures: false,
    lineHeight: Math.round((opts.fontSize || 13) * 1.6), minimap: { enabled: !!opts.minimap }, wordWrap: opts.wrap ? "on" : "off",
    bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: false }, guides: { bracketPairs: "active", indentation: true },
    tabSize: 4, insertSpaces: true, detectIndentation: false, scrollBeyondLastLine: false, renderLineHighlight: "all", smoothScrolling: true,
    padding: { top: 8, bottom: 8 }, stickyScroll: { enabled: false }, cursorBlinking: "smooth", matchBrackets: "always", renderWhitespace: "selection",
    "semanticHighlighting.enabled": false, fixedOverflowWidgets: true, ariaLabel: opts.ariaLabel || "Python editor"
  });
  const model = ed.getModel();
  model.updateOptions({ tabSize: 4, insertSpaces: true });
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => opts.onRun && opts.onRun());
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => opts.onSave && opts.onSave());
  ed.onDidChangeModelContent(() => opts.onChange && opts.onChange());
  let deco = ed.createDecorationsCollection([]);
  return {
    kind: "monaco",
    getValue: () => ed.getValue(),
    setValue: v => { if (ed.getValue() !== v) { ed.pushUndoStop(); ed.executeEdits("ns", [{ range: model.getFullModelRange(), text: v }]); ed.pushUndoStop(); ed.setScrollTop(0); } },
    setTheme: t => monaco.editor.setTheme("ns-" + t),
    setFontSize: s => ed.updateOptions({ fontSize: s, lineHeight: Math.round(s * 1.6) }),
    setWrap: w => ed.updateOptions({ wordWrap: w ? "on" : "off" }),
    setMinimap: m => ed.updateOptions({ minimap: { enabled: m } }),
    setMarkers(list) {
      monaco.editor.setModelMarkers(model, "ns", list.map(p => ({
        startLineNumber: p.line, endLineNumber: p.line, startColumn: p.col || 1, endColumn: p.endCol || model.getLineMaxColumn(Math.min(p.line, model.getLineCount())),
        message: p.msg, severity: p.sev === "warn" ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error })));
      deco.set(list.filter(p => p.sev !== "warn").map(p => ({ range: new monaco.Range(p.line, 1, p.line, 1), options: { isWholeLine: true, className: "ns-err-line" } })));
    },
    reveal(line, col) { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: col || 1 }); ed.focus(); },
    focus: () => ed.focus(),
    layout: () => ed.layout()
  };
}

/* ---------------- Built-in fallback editor ---------------- */
function fallbackEditor(host, opts) {
  host.innerHTML = `<div class="fb-editor"><div class="fb-gutter"></div><div class="fb-scroll"><div class="fb-inner"><pre class="fb-pre" aria-hidden="true"></pre><textarea class="fb-ta" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="${opts.ariaLabel || "Python editor"}"></textarea></div></div></div>`;
  const wrap = host.firstChild, gutter = wrap.querySelector(".fb-gutter"), scroll = wrap.querySelector(".fb-scroll"), pre = wrap.querySelector(".fb-pre"), ta = wrap.querySelector(".fb-ta");
  let markers = [];
  ta.value = opts.value || "";
  function paint() {
    const lines = ta.value.split("\n");
    const html = NS.pyhl.highlightLines(lines);
    const bad = new Set(markers.filter(m => m.sev !== "warn").map(m => m.line));
    pre.innerHTML = html.map((h, i) => bad.has(i + 1) ? `<span class="ln-err">${h || " "}</span>` : h).join("\n") + "\n ";
    gutter.innerHTML = lines.map((_, i) => bad.has(i + 1) ? `<span class="err">${i + 1}</span>` : String(i + 1)).join("\n");
  }
  ta.addEventListener("input", () => { paint(); opts.onChange && opts.onChange(); });
  scroll.addEventListener("scroll", () => { gutter.scrollTop = scroll.scrollTop; });
  ta.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); opts.onRun && opts.onRun(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); opts.onSave && opts.onSave(); return; }
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    if (e.key === "Tab") {
      e.preventDefault();
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      if (e.shiftKey) {
        const lineEnd = v.indexOf("\n", en); const block = v.slice(ls, lineEnd < 0 ? v.length : lineEnd);
        const out = block.split("\n").map(l => l.replace(/^ {1,4}/, "")).join("\n");
        ta.setRangeText(out, ls, lineEnd < 0 ? v.length : lineEnd, "select");
      } else if (s !== en && v.slice(s, en).includes("\n")) {
        const lineEnd = v.indexOf("\n", en); const block = v.slice(ls, lineEnd < 0 ? v.length : lineEnd);
        ta.setRangeText(block.split("\n").map(l => "    " + l).join("\n"), ls, lineEnd < 0 ? v.length : lineEnd, "select");
      } else ta.setRangeText("    ", s, en, "end");
      paint(); opts.onChange && opts.onChange(); return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const ls = v.lastIndexOf("\n", s - 1) + 1, line = v.slice(ls, s);
      let ind = (line.match(/^\s*/) || [""])[0];
      if (/:\s*(#.*)?$/.test(line)) ind += "    ";
      ta.setRangeText("\n" + ind, s, en, "end");
      paint(); opts.onChange && opts.onChange(); return;
    }
    const pairs = { "(": ")", "[": "]", "{": "}" };
    if (pairs[e.key] && s === en) { e.preventDefault(); ta.setRangeText(e.key + pairs[e.key], s, en, "end"); ta.selectionStart = ta.selectionEnd = s + 1; paint(); opts.onChange && opts.onChange(); return; }
    if (Object.values(pairs).includes(e.key) && s === en && v[s] === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; }
  });
  paint();
  const api = {
    kind: "fallback",
    getValue: () => ta.value,
    setValue: v => { ta.value = v; paint(); scroll.scrollTop = 0; },
    setTheme: () => {},
    setFontSize: s => { wrap.style.setProperty("--code-fs", s + "px"); },
    setWrap: w => { wrap.classList.toggle("wrap", !!w); ta.setAttribute("wrap", w ? "soft" : "off"); },
    setMinimap: () => {},
    setMarkers(list) { markers = list; paint(); },
    reveal(line) {
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      scroll.scrollTop = Math.max(0, (line - 4) * lh);
      const lines = ta.value.split("\n"); let pos = 0; for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      ta.focus(); ta.selectionStart = ta.selectionEnd = pos;
    },
    focus: () => ta.focus(),
    layout: () => {}
  };
  api.setFontSize(opts.fontSize || 13); api.setWrap(opts.wrap);
  return api;
}

async function create(host, opts) {
  try {
    const monaco = await withTimeout(loadMonaco(), 15000);
    host.innerHTML = "";
    return monacoEditor(host, opts, monaco);
  } catch (e) {
    if (root.console) console.warn("Monaco unavailable, using the built-in editor:", e.message);
    return fallbackEditor(host, opts);
  }
}
NS.editor = { create, fallbackEditor };
})(typeof window !== "undefined" ? window : globalThis);
