/* ==========================================================================
   Generador de código Prolog a partir de la red semántica (nodos + enlaces)
   y de las reglas construidas visualmente. Expone window.PrologGenerator.
   ========================================================================== */
(function (global) {
  "use strict";

  function factLine(relationAtom, a, b) {
    return relationAtom + "(" + a + ", " + b + ").";
  }

  function buildFacts(state) {
    var nodesById = {};
    state.nodes.forEach(function (n) { nodesById[n.id] = n; });

    var lines = [];
    state.edges.forEach(function (e) {
      var from = nodesById[e.from], to = nodesById[e.to];
      if (!from || !to) return;
      var rel = Utils.toPrologAtom(e.relation);
      var a = Utils.toPrologAtom(from.label);
      var b = Utils.toPrologAtom(to.label);
      lines.push(factLine(rel, a, b));
      if (e.arrow === "two") lines.push(factLine(rel, b, a));
    });
    return lines;
  }

  function buildRules(state) {
    if (!global.RuleBuilder) return [];
    return (state.rules || []).map(function (r) { return global.RuleBuilder.ruleToProlog(r); });
  }

  function todayStr() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  // Genera el texto completo del archivo .pl a partir del estado actual.
  function generate(state) {
    state = state || global.AppState.getState();
    var out = [];
    out.push("% ============================================================");
    out.push("% " + I18n.t("gen.headerLine1"));
    out.push("% " + I18n.t("gen.headerLine2", { date: todayStr() }));
    out.push("% ============================================================");
    out.push("");

    var facts = buildFacts(state);
    out.push("% " + I18n.t("gen.factsHeader"));
    if (facts.length) {
      out = out.concat(facts);
    } else {
      out.push("% " + I18n.t("gen.noFacts"));
    }
    out.push("");

    var rules = buildRules(state);
    out.push("% " + I18n.t("gen.rulesHeader"));
    if (rules.length) {
      rules.forEach(function (r, i) {
        out.push(r);
        if (i < rules.length - 1) out.push("");
      });
    } else {
      out.push("% " + I18n.t("gen.noRules"));
    }
    out.push("");

    return out.join("\n");
  }

  global.PrologGenerator = { generate: generate };
})(window);
