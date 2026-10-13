/* ==========================================================================
   Editor Prolog estilo SWISH: múltiples archivos, editor CodeMirror con
   resaltado de sintaxis Prolog, consola de consultas usando Tau Prolog
   (motor Prolog en JavaScript que corre enteramente en el navegador).
   ========================================================================== */
(function (global) {
  "use strict";

  var FILES_KEY = "semnet-studio:ide-files:v1";

  var editor = null;
  var files = [];
  var activeId = null;
  var session = null;

  function $(sel) { return document.querySelector(sel); }

  function defaultProgram() {
    return I18n.t("ide.defaultProgramComment");
  }

  function nextUntitledName() {
    var existing = {};
    files.forEach(function (f) { existing[f.name] = true; });
    var base = I18n.t("ide.untitledBase");
    var name = base + ".pl", n = 1;
    while (existing[name]) { n++; name = base + "-" + n + ".pl"; }
    return name;
  }

  function getActiveFile() {
    return files.filter(function (f) { return f.id === activeId; })[0] || null;
  }

  function commitEditorToFile() {
    if (!editor) return;
    var f = getActiveFile();
    if (f) f.content = editor.getValue();
  }

  function onEditorChange() {
    var f = getActiveFile();
    if (!f) return;
    f.content = editor.getValue();
    f.dirty = true;
    updateToolbar();
    debouncedSave();
  }

  var debouncedSave = Utils.debounce(saveFilesToStorage, 600);

  function saveFilesToStorage() {
    try {
      commitEditorToFile();
      var payload = {
        files: files.map(function (f) { return { id: f.id, name: f.name, content: f.content }; }),
        activeId: activeId
      };
      localStorage.setItem(FILES_KEY, JSON.stringify(payload));
    } catch (e) { /* almacenamiento no disponible: se ignora */ }
  }

  function loadFilesFromStorage() {
    try {
      var raw = localStorage.getItem(FILES_KEY);
      if (!raw) return false;
      var payload = JSON.parse(raw);
      if (payload && Array.isArray(payload.files) && payload.files.length) {
        files = payload.files.map(function (f) {
          return { id: f.id || Utils.nextId("f"), name: f.name || (I18n.t("ide.untitledBase") + ".pl"), content: f.content || "", dirty: false };
        });
        activeId = (payload.activeId && files.some(function (f) { return f.id === payload.activeId; }))
          ? payload.activeId : files[0].id;
        return true;
      }
    } catch (e) { /* almacenamiento corrupto: se ignora */ }
    return false;
  }

  function newFile(name, content, opts) {
    opts = opts || {};
    var f = { id: Utils.nextId("f"), name: name || nextUntitledName(), content: content || "", dirty: !!opts.dirty };
    files.push(f);
    switchToFile(f.id);
    saveFilesToStorage();
    return f;
  }

  function closeFile(id) {
    if (files.length <= 1) return;
    var idx = files.map(function (f) { return f.id; }).indexOf(id);
    if (idx < 0) return;
    var wasActive = id === activeId;
    files.splice(idx, 1);
    if (wasActive) {
      var next = files[Math.max(0, idx - 1)] || files[0];
      activeId = null;
      switchToFile(next.id);
    } else {
      renderFileList();
    }
    saveFilesToStorage();
  }

  function switchToFile(id) {
    commitEditorToFile();
    activeId = id;
    var f = getActiveFile();
    if (editor && f) {
      editor.off("change", onEditorChange);
      editor.setValue(f.content || "");
      editor.clearHistory();
      editor.on("change", onEditorChange);
    }
    session = null; // el consultado anterior ya no corresponde al archivo activo
    renderFileList();
    updateToolbar();
  }

  function renderFileList() {
    var host = $("#ide-file-list");
    if (!host) return;
    host.innerHTML = "";
    files.forEach(function (f) {
      var item = document.createElement("div");
      item.className = "ide-file-item" + (f.id === activeId ? " active" : "");
      item.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      var nameSpan = document.createElement("span");
      nameSpan.style.flex = "1";
      nameSpan.style.overflow = "hidden";
      nameSpan.style.textOverflow = "ellipsis";
      nameSpan.style.whiteSpace = "nowrap";
      nameSpan.textContent = f.name + (f.dirty ? " •" : "");
      item.appendChild(nameSpan);
      if (files.length > 1) {
        var closeBtn = document.createElement("span");
        closeBtn.textContent = "✕";
        closeBtn.title = I18n.t("ide.closeFileTitle");
        closeBtn.style.opacity = ".55";
        closeBtn.style.padding = "0 2px";
        closeBtn.addEventListener("click", function (ev) { ev.stopPropagation(); closeFile(f.id); });
        item.appendChild(closeBtn);
      }
      item.addEventListener("click", function () { if (f.id !== activeId) switchToFile(f.id); });
      host.appendChild(item);
    });
  }

  function updateToolbar() {
    var f = getActiveFile();
    var nameEl = $("#ide-filename");
    if (nameEl) nameEl.textContent = f ? f.name : (I18n.t("ide.untitledBase") + ".pl");
    var dot = $("#ide-dirty-dot");
    if (dot) dot.classList.toggle("show", !!(f && f.dirty));
  }

  // ---------------------------------------------------------------- consola / consultas
  function appendResultLine(text, cls) {
    var host = $("#ide-results");
    if (!host) return;
    var div = document.createElement("div");
    div.className = "ide-result-line" + (cls ? " " + cls : "");
    div.textContent = text;
    host.appendChild(div);
    scrollResultsToBottom();
  }

  function scrollResultsToBottom() {
    var host = $("#ide-results");
    if (host) host.scrollTop = host.scrollHeight;
  }

  function highlightBindings(formatted) {
    var esc = Utils.escapeHtml(formatted);
    return esc.replace(/(^|,\s*)([A-Z_][A-Za-z0-9_]*)(\s*=\s*)/g, function (m, pre, name, eq) {
      return pre + '<span class="var">' + name + "</span>" + eq;
    });
  }

  function consultCurrent() {
    commitEditorToFile();
    var f = getActiveFile();
    if (!f) return;
    if (!global.pl) {
      appendResultLine(I18n.t("ide.engineNotLoaded"), "err");
      return;
    }
    var sess = global.pl.create(1000000);
    appendResultLine(I18n.t("ide.consulting", { name: f.name }), "info");
    sess.consult(f.content, {
      success: function () {
        session = sess;
        appendResultLine(I18n.t("ide.consultedOk"), "ok");
        Utils.toast(I18n.t("toast.programConsulted"), "success");
      },
      error: function (err) {
        appendResultLine(I18n.t("ide.consultErrorPrefix", { err: sess.format_answer(err) }), "err");
        Utils.toast(I18n.t("toast.consultError"), "error");
      }
    });
  }

  function answerNext(isFirst) {
    session.answer({
      success: function (answer) { renderAnswerSuccess(answer); },
      fail: function () { appendResultLine(isFirst ? I18n.t("ide.falseLine") : I18n.t("ide.noMoreSolutions"), "info"); },
      error: function (err) { appendResultLine(I18n.t("ide.errorPrefix", { err: session.format_answer(err) }), "err"); },
      limit: function () { appendResultLine(I18n.t("ide.stepLimit"), "err"); }
    });
  }

  function renderAnswerSuccess(answer) {
    var formatted = session.format_answer(answer);
    if (formatted === "true") {
      appendResultLine(I18n.t("ide.trueLine"), "ok");
      return;
    }
    var host = $("#ide-results");
    var row = document.createElement("div");
    row.className = "ide-result-bindings";
    row.innerHTML = highlightBindings(formatted) + ".";
    host.appendChild(row);

    var nextRow = document.createElement("div");
    nextRow.className = "ide-next-sol-row";
    var btn = document.createElement("button");
    btn.className = "ide-next-btn";
    btn.type = "button";
    btn.textContent = I18n.t("ide.nextSolution");
    btn.addEventListener("click", function () {
      btn.disabled = true;
      nextRow.remove();
      answerNext(false);
    });
    nextRow.appendChild(btn);
    host.appendChild(nextRow);
    scrollResultsToBottom();
  }

  function disablePendingNextButtons() {
    var btns = document.querySelectorAll("#ide-results .ide-next-btn");
    btns.forEach ? btns.forEach(function (b) { b.disabled = true; }) :
      Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
  }

  function runCurrentQuery() {
    var input = $("#ide-query-input");
    var raw = (input.value || "").trim();
    if (!raw) return;
    if (!session) {
      appendResultLine(I18n.t("ide.needConsultFirst"), "err");
      Utils.toast(I18n.t("ide.needConsultFirstToast"), "error");
      return;
    }
    disablePendingNextButtons();
    var goal = /\.\s*$/.test(raw) ? raw : (raw + ".");
    appendResultLine("?- " + goal, "query-echo");
    session.query(goal, {
      success: function () { answerNext(true); },
      error: function (err) { appendResultLine(I18n.t("ide.queryErrorPrefix", { err: session.format_answer(err) }), "err"); }
    });
    input.value = "";
  }

  // ---------------------------------------------------------------- init / wiring
  function wireButtons() {
    $("#ide-new").addEventListener("click", function () { newFile(); });
    $("#ide-open").addEventListener("click", function () { $("#ide-file-input").click(); });
    $("#ide-file-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      Utils.readFileAsText(file).then(function (text) {
        newFile(file.name, text);
        Utils.toast(I18n.t("toast.fileImported", { name: file.name }), "success");
      }).catch(function () { Utils.toast(I18n.t("toast.cantReadFile"), "error"); });
      e.target.value = "";
    });
    $("#ide-export").addEventListener("click", function () {
      commitEditorToFile();
      var f = getActiveFile();
      if (!f) return;
      Utils.downloadText(f.name, f.content, "text/plain;charset=utf-8");
    });
    $("#ide-consult").addEventListener("click", consultCurrent);
    $("#ide-run-query").addEventListener("click", runCurrentQuery);
    $("#ide-query-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); runCurrentQuery(); }
    });
    $("#ide-clear-console").addEventListener("click", function () {
      var host = $("#ide-results");
      if (host) host.innerHTML = "";
    });
  }

  function init() {
    if (typeof CodeMirror !== "undefined") {
      editor = CodeMirror.fromTextArea($("#prolog-editor"), {
        mode: "prolog",
        theme: "dracula",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: false,
        placeholder: I18n.t("ide.placeholder"),
        extraKeys: { Tab: function (cm) { cm.replaceSelection("    "); } }
      });
    }

    var restored = loadFilesFromStorage();
    if (!restored || !files.length) {
      files = [];
      activeId = null;
      newFile(I18n.t("ide.untitledBase") + ".pl", defaultProgram());
    } else {
      var keepId = activeId;
      activeId = null;
      switchToFile(keepId);
    }

    wireButtons();

    I18n.onChange(function () {
      if (editor) editor.setOption("placeholder", I18n.t("ide.placeholder"));
      updateToolbar();
      renderFileList();
    });
  }

  function refresh() {
    if (editor) editor.refresh();
  }

  // Usado por el botón "Enviar a Prolog" del Diseñador de Redes.
  function loadProgram(name, content) {
    newFile(name, content, { dirty: false });
  }

  global.PrologIDE = { init: init, refresh: refresh, loadProgram: loadProgram };
})(window);
