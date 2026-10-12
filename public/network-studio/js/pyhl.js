/* Python syntax coloring in the style of VS Code: a small tokenizer for the live view and the
   fallback editor, plus the matching Monaco language rules and color themes. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

const CTL = new Set("if elif else for while return import from as break continue pass raise try except finally with yield await async assert del global nonlocal match case".split(" "));
const KW = new Set("def class lambda and or not is in".split(" "));
const CONST = new Set(["True", "False", "None"]);
const BUILTINS = new Set("print range len zip int float str list dict set tuple abs min max sum round sorted enumerate map filter open isinstance type super input bool any all repr format reversed iter next pow divmod hash id chr ord getattr setattr hasattr callable vars dir help".split(" "));
const MODULES = new Set("np numpy plt matplotlib pyplot math random os sys pd pandas json time re itertools collections".split(" "));
const OPS = ["**=", "//=", ">>=", "<<=", "->", "**", "//", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "@=", "&=", "|=", "^=", "<<", ">>", ":=", "+", "-", "*", "/", "%", "@", "=", "<", ">", "&", "|", "^", "~", "!"];
const NUM = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?)/;
const STR_START = /^([rRbBuUfF]{0,2})("""|'''|"|')/;

function esc(s) { return s.replace(/[&<>]/g, c => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"); }

/* Tokenize one line. state = { tri: null | {q, f}, depth } */
function tokenizeLine(line, state) {
  const out = [];
  let i = 0, depth = state.depth || 0, tri = state.tri || null;
  const push = (t, v) => { if (v) out.push({ t, v }); };
  let prevSig = null;
  const sig = (t, v) => { push(t, v); prevSig = { t, v }; };

  function readStringBody(q, isF, start) {
    // returns index after the closing quote, or -1 if the string continues past the line
    let j = start, buf = "";
    const flush = () => { if (buf) { push("str", buf); buf = ""; } };
    while (j < line.length) {
      if (line.startsWith(q, j)) { buf += q; flush(); return j + q.length; }
      const c = line[j];
      if (c === "\\") { flush(); push("esc", line.slice(j, j + 2)); j += 2; continue; }
      if (isF && (line.startsWith("{{", j) || line.startsWith("}}", j))) { flush(); push("esc", line.slice(j, j + 2)); j += 2; continue; }
      if (isF && c === "{") {
        flush();
        let k = j + 1, nest = 0;
        while (k < line.length) {
          const ch = line[k];
          if (ch === "{" || ch === "[" || ch === "(") nest++;
          else if (ch === "}" || ch === "]" || ch === ")") { if (nest === 0 && ch === "}") break; nest--; }
          else if (ch === "\"" || ch === "'") { if (q.includes(ch)) break; const e = line.indexOf(ch, k + 1); if (e > 0) k = e; }
          k++;
        }
        const inner = line.slice(j + 1, k);
        push("fb", "{");
        let expr = inner, spec = "";
        let nn = 0;
        for (let m = 0; m < inner.length; m++) {
          const ch = inner[m];
          if ("([{".includes(ch)) nn++; else if (")]}".includes(ch)) nn--;
          else if (ch === ":" && nn === 0 && inner[m + 1] !== "=") { expr = inner.slice(0, m); spec = inner.slice(m); break; }
          else if (ch === "!" && nn === 0 && /[rsa]/.test(inner[m + 1] || "") && (m + 2 >= inner.length || inner[m + 2] === ":")) { expr = inner.slice(0, m); spec = inner.slice(m); break; }
        }
        tokenizeLine(expr, { depth: 0, tri: null }).tokens.forEach(t => out.push(t));
        if (spec) push("fb", spec);
        if (k < line.length && line[k] === "}") { push("fb", "}"); j = k + 1; } else j = k;
        continue;
      }
      buf += c; j++;
    }
    flush();
    return -1;
  }

  if (tri) {
    const end = readStringBody(tri.q, tri.f, 0);
    if (end < 0) return { tokens: out, state: { tri, depth } };
    tri = null; i = end; prevSig = { t: "str", v: "" };
  }
  while (i < line.length) {
    const rest = line.slice(i), c = line[i];
    if (c === " " || c === "\t") { let j = i; while (j < line.length && (line[j] === " " || line[j] === "\t")) j++; push("ws", line.slice(i, j)); i = j; continue; }
    if (c === "#") { push("com", rest); break; }
    let m = STR_START.exec(rest);
    if (m && (m[1] === "" || /^[rRbBuUfF]+$/.test(m[1]))) {
      const pre = m[1], q = m[2], isF = /[fF]/.test(pre), isRaw = /[rR]/.test(pre);
      push("str", pre + q);
      const end = isRaw ? (() => { const e = line.indexOf(q, i + pre.length + q.length); if (e < 0) { push("str", line.slice(i + pre.length + q.length)); return -1; } push("str", line.slice(i + pre.length + q.length, e + q.length)); return e + q.length; })()
                        : readStringBody(q, isF, i + pre.length + q.length);
      prevSig = { t: "str", v: q };
      if (end < 0) { if (q.length === 3) tri = { q, f: isF }; i = line.length; break; }
      i = end; continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1] || ""))) {
      m = NUM.exec(rest);
      if (m && m[0]) { sig("num", m[0]); i += m[0].length; continue; }
    }
    if (/[A-Za-z_]/.test(c) || c.charCodeAt(0) > 127) {
      m = /^[\w\u0080-￿]+/.exec(rest);
      const v = m[0];
      let j = i + v.length; while (line[j] === " ") j++;
      const next = line[j] || "";
      const pv = prevSig ? prevSig.v : null;
      let t;
      if (pv === "def") t = "fndef";
      else if (pv === "class") t = "ns";
      else if (CTL.has(v)) t = "ctl";
      else if (KW.has(v)) t = "kw";
      else if (CONST.has(v)) t = "const";
      else if (v === "self" || v === "cls") t = "self";
      else if (pv === "." ) t = next === "(" ? "fn" : "prop";
      else if (pv === "import" || pv === "as" || pv === "from") t = "ns";
      else if (next === "(") t = BUILTINS.has(v) ? "bi" : "fn";
      else if (MODULES.has(v) && next === ".") t = "ns";
      else t = "var";
      sig(t, v); i += v.length; continue;
    }
    if ("([{".includes(c)) { sig("b" + (depth % 3), c); depth++; i++; continue; }
    if (")]}".includes(c)) { depth--; if (depth < 0) { depth = 0; sig("bad", c); } else sig("b" + (depth % 3), c); i++; continue; }
    if (",:;.".includes(c)) { sig("punct", c); i++; continue; }
    const op = OPS.find(o => line.startsWith(o, i));
    if (op) { sig("op", op); i += op.length; continue; }
    push("txt", c); i++;
  }
  return { tokens: out, state: { tri, depth } };
}
function highlightLines(lines) {
  let st = { tri: null, depth: 0 };
  return lines.map(l => {
    const r = tokenizeLine(l, st); st = r.state;
    return r.tokens.map(t => t.t === "ws" || t.t === "txt" ? esc(t.v) : `<span class="tk-${t.t}">${esc(t.v)}</span>`).join("");
  });
}

/* ---------------- Monaco ---------------- */
const monarch = {
  defaultToken: "", tokenPostfix: ".python",
  ctl: [...CTL], kw: [...KW], consts: [...CONST], builtins: [...BUILTINS], modules: [...MODULES],
  brackets: [{ open: "(", close: ")", token: "delimiter.parenthesis" }, { open: "[", close: "]", token: "delimiter.square" }, { open: "{", close: "}", token: "delimiter.curly" }],
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/(?:[fF][rR]?|[rR][fF])"""/, "string", "@ftdq"], [/(?:[fF][rR]?|[rR][fF])'''/, "string", "@ftsq"],
      [/[rRuUbB]{0,2}"""/, "string", "@tdq"], [/[rRuUbB]{0,2}'''/, "string", "@tsq"],
      [/(?:[fF][rR]?|[rR][fF])"/, "string", "@fdq"], [/(?:[fF][rR]?|[rR][fF])'/, "string", "@fsq"],
      [/[rRuUbB]{0,2}"/, "string", "@dq"], [/[rRuUbB]{0,2}'/, "string", "@sq"],
      { include: "@code" }
    ],
    code: [
      [/(def)(\s+)([A-Za-z_]\w*)/, ["keyword", "white", "function.def"]],
      [/(class)(\s+)([A-Za-z_]\w*)/, ["keyword", "white", "namespace"]],
      [/(import|from|as)(\s+)([A-Za-z_][\w.]*)/, ["keyword.control", "white", "namespace"]],
      [/(\.)(\s*)([A-Za-z_]\w*)(?=\s*\()/, ["delimiter", "white", "function.call"]],
      [/(\.)(\s*)([A-Za-z_]\w*)/, ["delimiter", "white", "property"]],
      [/[A-Za-z_]\w*(?=\s*\()/, { cases: { "@ctl": "keyword.control", "@kw": "keyword", "@builtins": "support.function", "@default": "function.call" } }],
      [/[A-Za-z_]\w*(?=\s*\.)/, { cases: { "@modules": "namespace", "@ctl": "keyword.control", "@kw": "keyword", "@consts": "constant", "self|cls": "variable.self", "@default": "variable" } }],
      [/[A-Za-z_]\w*/, { cases: { "@ctl": "keyword.control", "@kw": "keyword", "@consts": "constant", "self|cls": "variable.self", "@default": "variable" } }],
      [/(?:0[xX][0-9a-fA-F_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?)/, "number"],
      [/[{}()[\]]/, "@brackets"],
      [/[,:;.]/, "delimiter"],
      [/\*\*=?|\/\/=?|->|:=|[=!<>]=|<<=?|>>=?|[-+*/%@&|^~<>]=?|=/, "operator"],
      [/\s+/, "white"]
    ],
    dq: [[/[^\\"]+/, "string"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
    sq: [[/[^\\']+/, "string"], [/\\./, "string.escape"], [/'/, "string", "@pop"]],
    tdq: [[/[^\\"]+/, "string"], [/\\./, "string.escape"], [/"""/, "string", "@pop"], [/"/, "string"]],
    tsq: [[/[^\\']+/, "string"], [/\\./, "string.escape"], [/'''/, "string", "@pop"], [/'/, "string"]],
    fdq: [[/\{\{|\}\}/, "string.escape"], [/\{/, "fstring.brace", "@fexpr"], [/[^\\"{}]+/, "string"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
    fsq: [[/\{\{|\}\}/, "string.escape"], [/\{/, "fstring.brace", "@fexpr"], [/[^\\'{}]+/, "string"], [/\\./, "string.escape"], [/'/, "string", "@pop"]],
    ftdq: [[/\{\{|\}\}/, "string.escape"], [/\{/, "fstring.brace", "@fexpr"], [/[^\\"{}]+/, "string"], [/\\./, "string.escape"], [/"""/, "string", "@pop"], [/"/, "string"]],
    ftsq: [[/\{\{|\}\}/, "string.escape"], [/\{/, "fstring.brace", "@fexpr"], [/[^\\'{}]+/, "string"], [/\\./, "string.escape"], [/'''/, "string", "@pop"], [/'/, "string"]],
    fexpr: [[/\}/, "fstring.brace", "@pop"], [/![rsa](?=[:}])/, "fstring.brace"], [/:(?!=)[^}]*/, "fstring.brace"],
      [/"[^"]*"|'[^']*'/, "string"], { include: "@code" }]
  }
};
const THEMES = {
  dark: { base: "vs-dark", bg: "#1e1e1e", fg: "#d4d4d4", rules: { comment: "6A9955", string: "CE9178", "string.escape": "D7BA7D", number: "B5CEA8", keyword: "569CD6", "keyword.control": "C586C0", constant: "569CD6",
    "function.def": "DCDCAA", "function.call": "DCDCAA", "support.function": "DCDCAA", namespace: "4EC9B0", variable: "9CDCFE", "variable.self": "569CD6", property: "9CDCFE", operator: "D4D4D4", delimiter: "D4D4D4", "fstring.brace": "569CD6" },
    colors: { "editor.background": "#1e1e1e", "editor.foreground": "#d4d4d4", "editorLineNumber.foreground": "#858585", "editorLineNumber.activeForeground": "#c6c6c6",
      "editorBracketHighlight.foreground1": "#ffd700", "editorBracketHighlight.foreground2": "#da70d6", "editorBracketHighlight.foreground3": "#179fff", "editorBracketHighlight.unexpectedBracket.foreground": "#ff4f4f" } },
  light: { base: "vs", bg: "#ffffff", fg: "#000000", rules: { comment: "008000", string: "A31515", "string.escape": "EE0000", number: "098658", keyword: "0000FF", "keyword.control": "AF00DB", constant: "0000FF",
    "function.def": "795E26", "function.call": "795E26", "support.function": "795E26", namespace: "267F99", variable: "001080", "variable.self": "0000FF", property: "001080", operator: "000000", delimiter: "000000", "fstring.brace": "0000FF" },
    colors: { "editor.background": "#ffffff", "editor.foreground": "#000000", "editorLineNumber.foreground": "#237893", "editorLineNumber.activeForeground": "#0b216f",
      "editorBracketHighlight.foreground1": "#0431fa", "editorBracketHighlight.foreground2": "#319331", "editorBracketHighlight.foreground3": "#7b3814", "editorBracketHighlight.unexpectedBracket.foreground": "#e51400" } },
  monokai: { base: "vs-dark", bg: "#272822", fg: "#f8f8f2", rules: { comment: "88846F", string: "E6DB74", "string.escape": "AE81FF", number: "AE81FF", keyword: "66D9EF", "keyword.control": "F92672", constant: "AE81FF",
    "function.def": "A6E22E", "function.call": "66D9EF", "support.function": "66D9EF", namespace: "A6E22E", variable: "F8F8F2", "variable.self": "FD971F", property: "F8F8F2", operator: "F92672", delimiter: "F8F8F2", "fstring.brace": "AE81FF" },
    colors: { "editor.background": "#272822", "editor.foreground": "#f8f8f2", "editorLineNumber.foreground": "#90908a", "editorLineNumber.activeForeground": "#f8f8f2", "editor.lineHighlightBackground": "#3e3d32",
      "editor.selectionBackground": "#49483e", "editorBracketHighlight.foreground1": "#ffd700", "editorBracketHighlight.foreground2": "#da70d6", "editorBracketHighlight.foreground3": "#179fff", "editorBracketHighlight.unexpectedBracket.foreground": "#f92672" } }
};
function registerMonaco(monaco) {
  monaco.languages.setMonarchTokensProvider("python", monarch);
  for (const k in THEMES) {
    const th = THEMES[k];
    const rules = Object.entries(th.rules).map(([token, fg]) => ({ token, foreground: fg, fontStyle: token === "comment" || token === "variable.self" || (k === "monokai" && token === "keyword") ? "italic" : "" }));
    monaco.editor.defineTheme("ns-" + k, { base: th.base, inherit: true, rules, colors: th.colors });
  }
}

NS.pyhl = { tokenizeLine, highlightLines, registerMonaco, monarch, THEMES, esc };
})(typeof window !== "undefined" ? window : globalThis);
