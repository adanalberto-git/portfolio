/* ==========================================================================
   Utilidades compartidas: toasts, modales, descargas, formato de átomos Prolog
   ========================================================================== */
(function (global) {
  "use strict";

  var Utils = {};

  // ---------------------------------------------------------------- IDs
  var _idCounter = 1;
  Utils.nextId = function (prefix) {
    return (prefix || "id") + "_" + (_idCounter++) + "_" + Math.random().toString(36).slice(2, 7);
  };

  // ---------------------------------------------------------------- Toasts
  Utils.toast = function (message, type) {
    var stack = document.getElementById("toast-stack");
    if (!stack) return;
    var el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s ease";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  };

  // ---------------------------------------------------------------- Prompt modal
  Utils.promptText = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.getElementById("prompt-modal");
      var title = document.getElementById("prompt-modal-title");
      var desc = document.getElementById("prompt-modal-desc");
      var input = document.getElementById("prompt-modal-input");
      var okBtn = document.getElementById("prompt-modal-ok");
      var cancelBtn = document.getElementById("prompt-modal-cancel");

      title.textContent = opts.title || I18n.t("modal.promptDefaultTitle");
      desc.textContent = opts.description || "";
      desc.style.display = opts.description ? "block" : "none";
      input.value = opts.value || "";
      input.placeholder = opts.placeholder || "";
      overlay.classList.remove("hidden");
      setTimeout(function () { input.focus(); input.select(); }, 30);

      function cleanup() {
        overlay.classList.add("hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        input.removeEventListener("keydown", onKey);
      }
      function onOk() {
        var v = input.value.trim();
        cleanup();
        resolve(v || null);
      }
      function onCancel() {
        cleanup();
        resolve(null);
      }
      function onKey(e) {
        if (e.key === "Enter") { e.preventDefault(); onOk(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      input.addEventListener("keydown", onKey);
    });
  };

  Utils.confirmDialog = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.getElementById("confirm-modal");
      var title = document.getElementById("confirm-modal-title");
      var desc = document.getElementById("confirm-modal-desc");
      var okBtn = document.getElementById("confirm-modal-ok");
      var cancelBtn = document.getElementById("confirm-modal-cancel");

      title.textContent = opts.title || I18n.t("modal.confirmDefaultTitle");
      desc.textContent = opts.description || "";
      okBtn.textContent = opts.okLabel || I18n.t("modal.yesContinue");
      overlay.classList.remove("hidden");

      function cleanup() {
        overlay.classList.add("hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
      }
      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
    });
  };

  // ---------------------------------------------------------------- File downloads
  Utils.downloadText = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  Utils.downloadDataUrl = function (filename, dataUrl) {
    var a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); }, 100);
  };

  Utils.readFileAsText = function (file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // ---------------------------------------------------------------- Debounce
  Utils.debounce = function (fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  // ---------------------------------------------------------------- Prolog atom / variable formatting
  var VALID_ATOM_RE = /^[a-z][a-zA-Z0-9_]*$/;
  var VALID_VAR_RE = /^[A-Z_][a-zA-Z0-9_]*$/;

  // Turn an arbitrary human label into a safe, readable Prolog atom.
  // - lowercases & underscores if it already looks like a plain word
  // - otherwise quotes it, preserving exactly what the user typed
  Utils.toPrologAtom = function (label) {
    if (label === null || label === undefined) return "''";
    var raw = String(label).trim();
    if (raw === "") return "''";
    var slug = raw
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/\s+/g, "_");
    if (VALID_ATOM_RE.test(slug)) return slug;
    var lowered = slug.charAt(0).toLowerCase() + slug.slice(1);
    if (VALID_ATOM_RE.test(lowered)) return lowered;
    // fall back to a quoted atom carrying the raw text verbatim
    var escaped = raw.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return "'" + escaped + "'";
  };

  Utils.toPrologVar = function (name) {
    var raw = String(name || "X").trim();
    if (raw === "") return "X";
    var first = raw.charAt(0);
    if (first >= "a" && first <= "z") raw = first.toUpperCase() + raw.slice(1);
    raw = raw.replace(/[^a-zA-Z0-9_]/g, "");
    if (!VALID_VAR_RE.test(raw)) raw = "X";
    return raw;
  };

  Utils.escapeHtml = function (str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  Utils.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  global.Utils = Utils;
})(window);
