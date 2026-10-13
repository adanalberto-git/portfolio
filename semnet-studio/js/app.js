/* ==========================================================================
   Punto de entrada de la aplicación: cambia entre pestañas (Diseñador de
   Redes / Editor Prolog / Ayuda), inicializa los módulos y conecta el botón
   "Enviar a Prolog".
   ========================================================================== */
(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }

  function switchTab(view) {
    document.querySelectorAll("#main-tabs .tab-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === view);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    if (view === "ide" && window.PrologIDE) {
      // CodeMirror necesita un refresh si se inicializó mientras estaba oculto.
      setTimeout(function () { window.PrologIDE.refresh(); }, 20);
    }
    if (view === "network" && window.NetworkEditor) {
      setTimeout(function () { /* el SVG no necesita refresh, pero reservamos el gancho */ }, 0);
    }
  }

  function wireTabs() {
    document.querySelectorAll("#main-tabs .tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-view"));
      });
    });
  }

  function wireSendToIde() {
    var btn = $("#btn-send-to-ide");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var state = window.AppState.getState();
      if (!state.nodes.length && !state.rules.length) {
        Utils.toast(I18n.t("toast.needNodeOrRule"), "error");
        return;
      }
      var code = window.PrologGenerator.generate(state);
      window.PrologIDE.loadProgram("red-semantica.pl", code);
      switchTab("ide");
      Utils.toast(I18n.t("toast.codeSentToIde"), "success");
    });
  }

  function updateLangSwitchUI() {
    var lang = I18n.getLang();
    document.querySelectorAll("#lang-switch [data-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  function wireLangSwitch() {
    var host = $("#lang-switch");
    if (!host) return;
    updateLangSwitchUI();
    host.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        I18n.setLang(btn.getAttribute("data-lang"));
        updateLangSwitchUI();
      });
    });
  }

  function init() {
    I18n.applyStaticTranslations();
    wireLangSwitch();
    window.AppState.loadFromStorage();
    window.NetworkEditor.init();
    window.PrologIDE.init();
    wireTabs();
    wireSendToIde();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
