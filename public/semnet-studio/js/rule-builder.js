/* ==========================================================================
   Constructor visual de reglas Prolog. Permite crear cláusulas del tipo
   cabeza(X, Y) :- condicion1(X, Z), condicion2(Z, Y). usando solo menús,
   campos de texto y botones -- sin escribir Prolog a mano. Genera además
   una vista previa en vivo del código Prolog resultante.

   Expone window.RuleBuilder con:
     - renderPanel(): construye y devuelve el <div class="rules-panel"> que
       se inserta en el inspector derecho cuando el modo es "rules".
     - ruleToProlog(rule): convierte una regla del estado en texto Prolog.
       (Reutilizado por js/prolog-generator.js para el código final.)
   ========================================================================== */
(function (global) {
  "use strict";

  function compareOps() {
    return [
      ["\\=", I18n.t("rules.opNotUnify")],
      ["=", I18n.t("rules.opUnify")],
      ["==", I18n.t("rules.opIdentical")],
      ["\\==", I18n.t("rules.opNotIdentical")]
    ];
  }

  // ------------------------------------------------------------------ helpers
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function textNode(s) { return document.createTextNode(s); }

  // ------------------------------------------------------------------ Prolog term helpers
  function isVarLike(s) {
    return /^[A-Z_]/.test(String(s || "").trim());
  }
  function termFor(raw) {
    var s = String(raw === undefined || raw === null ? "" : raw).trim();
    if (s === "") return "_";
    return isVarLike(s) ? Utils.toPrologVar(s) : Utils.toPrologAtom(s);
  }

  function headSignature(rule) {
    var name = Utils.toPrologAtom(rule.headName || "regla");
    var argsRaw = (rule.headArgs && rule.headArgs.length) ? rule.headArgs : ["X", "Y"];
    var args = argsRaw.map(function (a) { return Utils.toPrologVar(a); });
    return name + "(" + args.join(", ") + ")";
  }

  function conditionToProlog(cond) {
    var text;
    if (cond.kind === "compare") {
      var left = termFor(cond.left);
      var op = cond.op || "\\=";
      var right = termFor(cond.right);
      text = left + " " + op + " " + right;
    } else {
      var name = Utils.toPrologAtom(cond.name || "relacion");
      var argsRaw = (cond.args && cond.args.length) ? cond.args : ["X", "Y"];
      var args = argsRaw.map(termFor);
      text = name + "(" + args.join(", ") + ")";
    }
    return cond.not ? "\\+ (" + text + ")" : text;
  }

  function ruleToProlog(rule) {
    var head = headSignature(rule);
    if (!rule.body || !rule.body.length) return head + ".";
    var lines = rule.body.map(conditionToProlog);
    return head + " :-\n    " + lines.join(",\n    ") + ".";
  }

  // ------------------------------------------------------------------ syntax highlight (preview only)
  var TOKEN_RE = /(:-|\\\+)|('(?:[^'\\]|\\.)*')|([A-Z_][A-Za-z0-9_]*)|([a-z][A-Za-z0-9_]*)/g;
  function highlightProlog(text) {
    return String(text).replace(TOKEN_RE, function (match, kw, atomQuoted, varTok, atomPlain) {
      var esc = Utils.escapeHtml(match);
      if (kw) return '<span class="pl-kw">' + esc + "</span>";
      if (atomQuoted) return '<span class="pl-atom">' + esc + "</span>";
      if (varTok) return '<span class="pl-var">' + esc + "</span>";
      if (atomPlain) return '<span class="pl-atom">' + esc + "</span>";
      return esc;
    });
  }

  // ------------------------------------------------------------------ relation name suggestions
  var DATALIST_ID = "rule-rel-options";
  function buildRelationDatalist() {
    var dl = h("datalist", { id: DATALIST_ID });
    var seen = {};
    AppState.getUsedRelations().forEach(function (r) {
      if (seen[r]) return;
      seen[r] = true;
      dl.appendChild(h("option", { value: r }));
    });
    AppState.getState().rules.forEach(function (r) {
      var nm = r.headName || "regla";
      if (seen[nm]) return;
      seen[nm] = true;
      dl.appendChild(h("option", { value: nm }));
    });
    return dl;
  }

  // ------------------------------------------------------------------ condition row
  function conditionRow(rule, cond) {
    var row = h("div", { class: "cond-row" });

    var notBtn = h("button", {
      class: "cond-not-toggle" + (cond.not ? " active" : ""),
      type: "button",
      title: I18n.t("rules.negateTitle"),
      text: "\\+"
    });
    notBtn.addEventListener("click", function () {
      AppState.updateCondition(rule.id, cond.id, { not: !cond.not });
    });
    row.appendChild(notBtn);

    var kindSelect = h("select", {});
    [["call", I18n.t("rules.kindCall")], ["compare", I18n.t("rules.kindCompare")]].forEach(function (pair) {
      var opt = h("option", { value: pair[0], text: pair[1] });
      if (cond.kind === pair[0]) opt.selected = true;
      kindSelect.appendChild(opt);
    });
    kindSelect.addEventListener("change", function () {
      AppState.updateCondition(rule.id, cond.id, { kind: kindSelect.value });
    });
    row.appendChild(kindSelect);

    if (cond.kind === "compare") {
      var leftIn = h("input", { type: "text", placeholder: "X", value: cond.left || "" });
      leftIn.value = cond.left || "";
      leftIn.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { left: leftIn.value });
      });
      var opSel = h("select", {});
      compareOps().forEach(function (pair) {
        var opt = h("option", { value: pair[0], text: pair[1] });
        if ((cond.op || "\\=") === pair[0]) opt.selected = true;
        opSel.appendChild(opt);
      });
      opSel.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { op: opSel.value });
      });
      var rightIn = h("input", { type: "text", placeholder: "Y", value: cond.right || "" });
      rightIn.value = cond.right || "";
      rightIn.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { right: rightIn.value });
      });
      row.appendChild(leftIn);
      row.appendChild(opSel);
      row.appendChild(rightIn);
    } else {
      var args = cond.args && cond.args.length ? cond.args : ["X", "Y"];
      var nameIn = h("input", {
        type: "text",
        list: DATALIST_ID,
        placeholder: I18n.t("rules.namePlaceholder"),
        value: cond.name || ""
      });
      nameIn.value = cond.name || "";
      nameIn.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { name: nameIn.value.trim() });
      });
      var arg1 = h("input", { type: "text", placeholder: "X" });
      arg1.value = args[0] || "";
      arg1.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { args: [arg1.value, args[1] || ""] });
      });
      var arg2 = h("input", { type: "text", placeholder: "Y" });
      arg2.value = args[1] || "";
      arg2.addEventListener("change", function () {
        AppState.updateCondition(rule.id, cond.id, { args: [args[0] || "", arg2.value] });
      });
      row.appendChild(nameIn);
      row.appendChild(textNode("("));
      row.appendChild(arg1);
      row.appendChild(textNode(","));
      row.appendChild(arg2);
      row.appendChild(textNode(")"));
    }

    var removeBtn = h("button", {
      class: "btn btn-icon btn-danger btn-sm",
      type: "button",
      title: I18n.t("rules.deleteConditionTitle"),
      text: "✕"
    });
    removeBtn.addEventListener("click", function () {
      AppState.removeCondition(rule.id, cond.id);
    });
    row.appendChild(removeBtn);

    return row;
  }

  // ------------------------------------------------------------------ rule card
  function ruleCard(rule) {
    var card = h("div", { class: "rule-card" });

    var titleText = (rule.headName || "regla") + "(" + (rule.headArgs || []).join(", ") + ")";
    var deleteBtn = h("button", {
      class: "btn btn-icon btn-danger btn-sm",
      type: "button",
      title: I18n.t("rules.deleteRuleTitle"),
      text: "🗑"
    });
    deleteBtn.addEventListener("click", function () {
      Utils.confirmDialog({
        title: I18n.t("modal.deleteRuleTitle"),
        description: I18n.t("modal.deleteRuleDesc", { title: titleText }),
        okLabel: I18n.t("modal.deleteRuleOk")
      }).then(function (ok) { if (ok) AppState.removeRule(rule.id); });
    });
    var head = h("div", { class: "rule-card-head" }, [
      h("span", { class: "rule-title", text: titleText }),
      deleteBtn
    ]);
    card.appendChild(head);

    var body = h("div", { class: "rule-card-body" });

    var nameField = h("div", { class: "field" }, [h("label", { text: I18n.t("rules.predicateName") })]);
    var nameIn = h("input", { type: "text" });
    nameIn.value = rule.headName || "";
    nameIn.addEventListener("change", function () {
      AppState.updateRule(rule.id, { headName: nameIn.value.trim() || rule.headName });
    });
    nameField.appendChild(nameIn);

    var argsField = h("div", { class: "field" }, [h("label", { text: I18n.t("rules.variablesLabel") })]);
    var argsIn = h("input", { type: "text" });
    argsIn.value = (rule.headArgs || []).join(", ");
    argsIn.addEventListener("change", function () {
      var parsed = argsIn.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      AppState.updateRule(rule.id, { headArgs: parsed.length ? parsed : rule.headArgs });
    });
    argsField.appendChild(argsIn);

    var fieldRow = h("div", { class: "field-row" }, [nameField, argsField]);
    body.appendChild(fieldRow);

    var condsWrap = h("div", { class: "rule-conditions" });
    (rule.body || []).forEach(function (cond) {
      condsWrap.appendChild(conditionRow(rule, cond));
    });
    body.appendChild(condsWrap);

    var addCondBtn = h("button", {
      class: "btn btn-ghost btn-sm",
      type: "button",
      text: I18n.t("rules.addCondition")
    });
    addCondBtn.style.marginBottom = "10px";
    addCondBtn.addEventListener("click", function () {
      var defaultArgs = (rule.headArgs && rule.headArgs.length >= 2) ? [rule.headArgs[0], rule.headArgs[1]] : ["X", "Y"];
      AppState.addCondition(rule.id, { kind: "call", name: "", args: defaultArgs, not: false });
    });
    body.appendChild(addCondBtn);

    var preview = h("div", { class: "rule-preview" });
    preview.innerHTML = highlightProlog(ruleToProlog(rule));
    body.appendChild(preview);

    card.appendChild(body);
    return card;
  }

  // ------------------------------------------------------------------ panel
  function renderPanel() {
    var root = h("div", { class: "rules-panel" });
    root.appendChild(buildRelationDatalist());

    var addBtn = h("button", {
      class: "btn btn-primary btn-sm",
      type: "button",
      text: I18n.t("rules.newRule")
    });
    addBtn.addEventListener("click", function () { AppState.addRule(); });

    var headerEl = h("div", { class: "rules-panel-header" }, [
      h("h3", { text: I18n.t("rules.panelTitle") }),
      addBtn
    ]);
    root.appendChild(headerEl);

    var rules = AppState.getState().rules || [];
    if (!rules.length) {
      root.appendChild(h("div", {
        class: "empty-inspector",
        html: I18n.t("rules.emptyHtml")
      }));
    } else {
      var list = h("div", { class: "rules-list" });
      rules.forEach(function (rule) { list.appendChild(ruleCard(rule)); });
      root.appendChild(list);
    }

    return root;
  }

  global.RuleBuilder = {
    renderPanel: renderPanel,
    ruleToProlog: ruleToProlog
  };
})(window);
