/* ==========================================================================
   Estado central de la aplicación: nodos, enlaces, reglas, historial (deshacer
   / rehacer) y persistencia automática en localStorage.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "semnet-studio:network:v1";
  var MAX_HISTORY = 60;

  // Los valores son átomos Prolog (independientes del idioma); su descripción
  // se traduce en tiempo de render vía I18n.t("relation." + value).
  // Values are Prolog atoms (language-independent); their description is
  // translated at render time via I18n.t("relation." + value).
  var BUILT_IN_RELATIONS = [
    "is_a", "part_of", "related_to", "causes",
    "precedes", "instance_of", "has_property", "same_as"
  ];

  function freshState() {
    return { nodes: [], edges: [], rules: [] };
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function Store() {
    this._state = freshState();
    this._listeners = {};
    this._undoStack = [];
    this._redoStack = [];
    this.selection = { type: null, id: null }; // transient UI selection, not undo-tracked
  }

  Store.prototype.on = function (evt, cb) {
    (this._listeners[evt] = this._listeners[evt] || []).push(cb);
    return cb;
  };
  Store.prototype.off = function (evt, cb) {
    var arr = this._listeners[evt] || [];
    var i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  };
  Store.prototype.emit = function (evt, payload) {
    (this._listeners[evt] || []).forEach(function (cb) { cb(payload); });
  };

  // ---- snapshot / history -------------------------------------------------
  Store.prototype._pushHistory = function () {
    this._undoStack.push(JSON.stringify(this._state));
    if (this._undoStack.length > MAX_HISTORY) this._undoStack.shift();
    this._redoStack.length = 0;
  };

  Store.prototype.mutate = function (fn) {
    this._pushHistory();
    fn(this._state);
    this._afterChange();
  };

  Store.prototype._afterChange = function () {
    this.emit("change", this._state);
    this._scheduleSave();
  };

  Store.prototype.canUndo = function () { return this._undoStack.length > 0; };
  Store.prototype.canRedo = function () { return this._redoStack.length > 0; };

  Store.prototype.undo = function () {
    if (!this.canUndo()) return;
    this._redoStack.push(JSON.stringify(this._state));
    this._state = JSON.parse(this._undoStack.pop());
    this.selection = { type: null, id: null };
    this._afterChange();
  };

  Store.prototype.redo = function () {
    if (!this.canRedo()) return;
    this._undoStack.push(JSON.stringify(this._state));
    this._state = JSON.parse(this._redoStack.pop());
    this.selection = { type: null, id: null };
    this._afterChange();
  };

  // ---- persistence ----------------------------------------------------
  Store.prototype._scheduleSave = Utils.debounce(function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
      this.emit("saved", null);
    } catch (e) { /* storage unavailable: silently skip autosave */ }
  }, 500);

  Store.prototype.loadFromStorage = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.nodes && parsed.edges) {
        this._state = parsed;
        this._state.rules = this._state.rules || [];
        this.emit("change", this._state);
        return true;
      }
    } catch (e) { /* ignore corrupt storage */ }
    return false;
  };

  // ---- accessors --------------------------------------------------------
  Store.prototype.getState = function () { return this._state; };
  Store.prototype.getNode = function (id) {
    return this._state.nodes.find(function (n) { return n.id === id; }) || null;
  };
  Store.prototype.getEdge = function (id) {
    return this._state.edges.find(function (e) { return e.id === id; }) || null;
  };
  Store.prototype.getRule = function (id) {
    return this._state.rules.find(function (r) { return r.id === id; }) || null;
  };

  // ---- node mutations -----------------------------------------------------
  Store.prototype.addNode = function (label, x, y) {
    var node = { id: Utils.nextId("n"), label: label, x: x, y: y };
    this.mutate(function (s) { s.nodes.push(node); });
    return node;
  };
  Store.prototype.updateNode = function (id, patch) {
    this.mutate(function (s) {
      var n = s.nodes.find(function (n) { return n.id === id; });
      if (n) Object.assign(n, patch);
    });
  };
  Store.prototype.removeNode = function (id) {
    this.mutate(function (s) {
      s.nodes = s.nodes.filter(function (n) { return n.id !== id; });
      s.edges = s.edges.filter(function (e) { return e.from !== id && e.to !== id; });
    });
  };

  // ---- edge mutations -----------------------------------------------------
  Store.prototype.addEdge = function (fromId, toId, opts) {
    opts = opts || {};
    var edge = {
      id: Utils.nextId("e"),
      from: fromId,
      to: toId,
      relation: opts.relation || "related_to",
      arrow: opts.arrow || "one",
      dash: opts.dash || "solid",
      color: opts.color || "#5b7b9a"
    };
    this.mutate(function (s) { s.edges.push(edge); });
    return edge;
  };
  Store.prototype.updateEdge = function (id, patch) {
    this.mutate(function (s) {
      var e = s.edges.find(function (e) { return e.id === id; });
      if (e) Object.assign(e, patch);
    });
  };
  Store.prototype.removeEdge = function (id) {
    this.mutate(function (s) {
      s.edges = s.edges.filter(function (e) { return e.id !== id; });
    });
  };

  // ---- rule mutations -----------------------------------------------------
  function newRule() {
    return {
      id: Utils.nextId("r"),
      headName: "nueva_regla",
      headArgs: ["X", "Y"],
      body: []
    };
  }
  Store.prototype.addRule = function () {
    var rule = newRule();
    this.mutate(function (s) { s.rules.push(rule); });
    return rule;
  };
  Store.prototype.updateRule = function (id, patch) {
    this.mutate(function (s) {
      var r = s.rules.find(function (r) { return r.id === id; });
      if (r) Object.assign(r, patch);
    });
  };
  Store.prototype.removeRule = function (id) {
    this.mutate(function (s) {
      s.rules = s.rules.filter(function (r) { return r.id !== id; });
    });
  };
  Store.prototype.addCondition = function (ruleId, cond) {
    this.mutate(function (s) {
      var r = s.rules.find(function (r) { return r.id === ruleId; });
      if (r) r.body.push(Object.assign({ id: Utils.nextId("c") }, cond));
    });
  };
  Store.prototype.updateCondition = function (ruleId, condId, patch) {
    this.mutate(function (s) {
      var r = s.rules.find(function (r) { return r.id === ruleId; });
      if (!r) return;
      var c = r.body.find(function (c) { return c.id === condId; });
      if (c) Object.assign(c, patch);
    });
  };
  Store.prototype.removeCondition = function (ruleId, condId) {
    this.mutate(function (s) {
      var r = s.rules.find(function (r) { return r.id === ruleId; });
      if (!r) return;
      r.body = r.body.filter(function (c) { return c.id !== condId; });
    });
  };

  // ---- whole-network ops --------------------------------------------------
  Store.prototype.clearAll = function () {
    this.mutate(function (s) {
      s.nodes = []; s.edges = []; s.rules = [];
    });
  };

  Store.prototype.exportJSON = function () {
    return JSON.stringify(this._state, null, 2);
  };

  Store.prototype.importFromObject = function (obj) {
    var next = freshState();
    if (Array.isArray(obj.nodes)) {
      next.nodes = obj.nodes.map(function (n, i) {
        return {
          id: n.id || Utils.nextId("n"),
          label: n.label !== undefined ? n.label : ("nodo_" + i),
          x: typeof n.x === "number" ? n.x : 80 + (i % 6) * 150,
          y: typeof n.y === "number" ? n.y : 80 + Math.floor(i / 6) * 120
        };
      });
    }
    var idSet = {};
    next.nodes.forEach(function (n) { idSet[n.id] = true; });
    var labelToId = {};
    next.nodes.forEach(function (n) { labelToId[n.label] = n.id; });

    if (Array.isArray(obj.edges)) {
      next.edges = obj.edges.map(function (e, i) {
        var from = idSet[e.from] ? e.from : (labelToId[e.from] || e.from);
        var to = idSet[e.to] ? e.to : (labelToId[e.to] || e.to);
        return {
          id: e.id || Utils.nextId("e"),
          from: from,
          to: to,
          relation: e.relation || "related_to",
          arrow: e.arrow || "one",
          dash: e.dash || "solid",
          color: e.color || "#5b7b9a"
        };
      }).filter(function (e) { return idSet[e.from] && idSet[e.to]; });
    }
    if (Array.isArray(obj.rules)) {
      next.rules = obj.rules.map(function (r) {
        return {
          id: r.id || Utils.nextId("r"),
          headName: r.headName || "regla",
          headArgs: Array.isArray(r.headArgs) && r.headArgs.length ? r.headArgs : ["X", "Y"],
          body: Array.isArray(r.body) ? r.body.map(function (c) {
            return Object.assign({ id: c.id || Utils.nextId("c") }, c);
          }) : []
        };
      });
    }
    this.mutate(function (s) {
      s.nodes = next.nodes; s.edges = next.edges; s.rules = next.rules;
    });
  };

  Store.prototype.getBuiltInRelations = function () { return BUILT_IN_RELATIONS.slice(); };

  Store.prototype.getUsedRelations = function () {
    var set = {};
    BUILT_IN_RELATIONS.forEach(function (r) { set[r] = true; });
    this._state.edges.forEach(function (e) { set[e.relation] = true; });
    return Object.keys(set);
  };

  Store.prototype.getRelationArity = function () { return 2; }; // every edge relation is binary

  global.AppState = new Store();
})(window);
