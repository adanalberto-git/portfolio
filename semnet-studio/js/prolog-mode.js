/* ==========================================================================
   Modo de resaltado de sintaxis para Prolog en CodeMirror 5.
   CodeMirror 5 no incluye un modo de Prolog de fábrica, así que lo
   definimos aquí con el addon "simple mode" (vendor/codemirror/simple.js).
   ========================================================================== */
(function () {
  "use strict";
  if (typeof CodeMirror === "undefined" || !CodeMirror.defineSimpleMode) return;

  CodeMirror.defineSimpleMode("prolog", {
    start: [
      { regex: /\/\*/, token: "comment", next: "comment" },
      { regex: /%.*/, token: "comment" },
      { regex: /"(?:[^"\\]|\\.)*"?/, token: "string" },
      { regex: /'(?:[^'\\]|\\.)*'?/, token: "string-2" },
      { regex: /0'\\?./, token: "number" },
      { regex: /\b\d+\.\d+([eE][+-]?\d+)?\b/, token: "number" },
      { regex: /\b\d+\b/, token: "number" },
      { regex: /\b[A-Z_][A-Za-z0-9_]*\b/, token: "variable-2" },
      { regex: /:-|-->|\?-/, token: "keyword" },
      { regex: /\\\+/, token: "keyword" },
      { regex: /\b(is|mod|rem|xor|not)\b/, token: "keyword" },
      { regex: /(=<|>=|=:=|=\\=|\\==|==|\\=|=\.\.|->|;|!|=|<|>)/, token: "operator" },
      { regex: /\b[a-z][A-Za-z0-9_]*\b/, token: "atom" },
      { regex: /[\(\)\[\]\{\}\|,]/, token: null },
      { regex: /\.(?=\s|$)/, token: "keyword" },
      { regex: /./, token: null }
    ],
    comment: [
      { regex: /.*?\*\//, token: "comment", next: "start" },
      { regex: /.*/, token: "comment" }
    ],
    meta: {
      lineComment: "%"
    }
  });
})();
