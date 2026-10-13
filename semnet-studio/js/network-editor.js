/* ==========================================================================
   Diseñador de Redes Semánticas — lienzo SVG estilo Canva
   ========================================================================== */
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var NODE_PAD_X = 16, NODE_PAD_Y = 11, NODE_MIN_W = 60, NODE_MIN_H = 34;
  var DASH_PATTERNS = { solid: "", dashed: "7 4", dotted: "1.5 4" };

  var svg, viewport, nodesLayer, edgesLayer, canvasWrap, emptyHint;
  var inspectorMode = "properties"; // 'properties' | 'rules'
  var currentTool = "select";
  var view = { x: 0, y: 0, scale: 1 };
  var nodeSizes = {}; // id -> {w,h}

  var linkDraft = null;   // { fromId } while placing a link
  var dragState = null;   // active node drag
  var panState = null;    // active canvas pan
  var spaceHeld = false;

  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs) {
    var e = document.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ---------------------------------------------------------------- init
  function init() {
    svg = $("#network-svg");
    viewport = $("#viewport");
    nodesLayer = $("#nodes-layer");
    edgesLayer = $("#edges-layer");
    canvasWrap = $("#net-canvas-wrap");
    emptyHint = $("#net-empty-hint");

    wireToolbar();
    wireCanvasEvents();
    wireKeyboard();
    wireInspectorStaticButtons();

    AppState.on("change", render);
    AppState.on("saved", flashAutosave);
    I18n.onChange(render);
    render();
    applyViewTransform();
  }

  function flashAutosave() {
    var badge = document.getElementById("autosave-badge");
    if (!badge) return;
    badge.style.opacity = "1";
    badge.querySelector(".dot").style.background = "var(--accent-teal)";
  }

  // ---------------------------------------------------------------- toolbar
  function wireToolbar() {
    document.querySelectorAll("#net-toolbar .tool-btn[data-tool]").forEach(function (btn) {
      btn.addEventListener("click", function () { setTool(btn.getAttribute("data-tool")); });
    });
    $("#tool-delete").addEventListener("click", deleteSelection);
    $("#tool-undo").addEventListener("click", function () { AppState.undo(); });
    $("#tool-redo").addEventListener("click", function () { AppState.redo(); });
    $("#tool-rules").addEventListener("click", function () {
      inspectorMode = inspectorMode === "rules" ? "properties" : "rules";
      $("#tool-rules").classList.toggle("active", inspectorMode === "rules");
      renderInspector();
    });
    $("#tool-new").addEventListener("click", async function () {
      var ok = await Utils.confirmDialog({
        title: I18n.t("modal.newNetTitle"),
        description: I18n.t("modal.newNetDesc"),
        okLabel: I18n.t("modal.newNetOk")
      });
      if (ok) {
        AppState.clearAll();
        resetSelection();
        Utils.toast(I18n.t("toast.canvasCleared"), "success");
      }
    });
    $("#tool-export-json").addEventListener("click", function () {
      Utils.downloadText("red-semantica.json", AppState.exportJSON(), "application/json");
      Utils.toast(I18n.t("toast.jsonDownloaded"), "success");
    });
    $("#tool-import-json").addEventListener("click", function () { $("#file-import-json").click(); });
    $("#file-import-json").addEventListener("change", async function (e) {
      var file = e.target.files[0];
      if (!file) return;
      try {
        var text = await Utils.readFileAsText(file);
        var obj = JSON.parse(text);
        AppState.importFromObject(obj);
        resetSelection();
        fitToContent();
        Utils.toast(I18n.t("toast.jsonImported"), "success");
      } catch (err) {
        Utils.toast(I18n.t("toast.jsonImportError"), "error");
      }
      e.target.value = "";
    });
    $("#tool-export-png").addEventListener("click", exportPNG);

    $("#zoom-in").addEventListener("click", function () { zoomBy(1.2); });
    $("#zoom-out").addEventListener("click", function () { zoomBy(1 / 1.2); });
    $("#zoom-reset").addEventListener("click", fitToContent);
  }

  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll("#net-toolbar .tool-btn[data-tool]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tool") === tool);
    });
    svg.classList.remove("mode-pan", "mode-add-node", "mode-link");
    if (tool === "pan") svg.classList.add("mode-pan");
    if (tool === "add-node") svg.classList.add("mode-add-node");
    if (tool === "link") svg.classList.add("mode-link");
    clearLinkDraft();
  }

  // ---------------------------------------------------------------- keyboard
  function wireKeyboard() {
    window.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (typing) return;
      if (!document.getElementById("view-network").classList.contains("active")) return;

      if (e.code === "Space" && !spaceHeld) { spaceHeld = true; svg.classList.add("mode-pan"); }
      if (e.key === "v" || e.key === "V") setTool("select");
      if (e.key === "n" || e.key === "N") setTool("add-node");
      if (e.key === "l" || e.key === "L") setTool("link");
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); AppState.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault(); AppState.redo();
      }
      if (e.key === "Escape") { clearLinkDraft(); }
    });
    window.addEventListener("keyup", function (e) {
      if (e.code === "Space") {
        spaceHeld = false;
        if (currentTool !== "pan") svg.classList.remove("mode-pan");
      }
    });
  }

  // ---------------------------------------------------------------- coordinate helpers
  function screenToViewport(clientX, clientY) {
    var rect = svg.getBoundingClientRect();
    var sx = clientX - rect.left, sy = clientY - rect.top;
    return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
  }

  function applyViewTransform() {
    viewport.setAttribute("transform", "translate(" + view.x + "," + view.y + ") scale(" + view.scale + ")");
  }

  function zoomBy(factor, centerClientX, centerClientY) {
    var rect = svg.getBoundingClientRect();
    var cx = centerClientX !== undefined ? centerClientX - rect.left : rect.width / 2;
    var cy = centerClientY !== undefined ? centerClientY - rect.top : rect.height / 2;
    var newScale = Utils.clamp(view.scale * factor, 0.25, 2.5);
    var worldX = (cx - view.x) / view.scale, worldY = (cy - view.y) / view.scale;
    view.scale = newScale;
    view.x = cx - worldX * newScale;
    view.y = cy - worldY * newScale;
    applyViewTransform();
  }

  function fitToContent() {
    var state = AppState.getState();
    if (!state.nodes.length) { view = { x: 0, y: 0, scale: 1 }; applyViewTransform(); return; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(function (n) {
      var sz = nodeSizes[n.id] || { w: NODE_MIN_W, h: NODE_MIN_H };
      minX = Math.min(minX, n.x - sz.w / 2); maxX = Math.max(maxX, n.x + sz.w / 2);
      minY = Math.min(minY, n.y - sz.h / 2); maxY = Math.max(maxY, n.y + sz.h / 2);
    });
    var rect = svg.getBoundingClientRect();
    var pad = 60;
    var contentW = Math.max(1, maxX - minX), contentH = Math.max(1, maxY - minY);
    var scale = Utils.clamp(Math.min((rect.width - pad * 2) / contentW, (rect.height - pad * 2) / contentH), 0.25, 1.4);
    view.scale = scale;
    view.x = rect.width / 2 - ((minX + maxX) / 2) * scale;
    view.y = rect.height / 2 - ((minY + maxY) / 2) * scale;
    applyViewTransform();
  }

  // ---------------------------------------------------------------- canvas interaction
  function wireCanvasEvents() {
    svg.addEventListener("mousedown", onCanvasMouseDown);
    window.addEventListener("mousemove", onCanvasMouseMove);
    window.addEventListener("mouseup", onCanvasMouseUp);
    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08, e.clientX, e.clientY);
    }, { passive: false });
  }

  function onCanvasMouseDown(e) {
    var targetNodeGroup = e.target.closest(".net-node-group");
    var targetEdge = e.target.closest(".net-edge-hit");
    var usePan = currentTool === "pan" || spaceHeld || (e.button === 1);

    if (usePan && !targetNodeGroup) {
      panState = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };
      return;
    }

    if (targetNodeGroup) {
      var nodeId = targetNodeGroup.dataset.id;
      if (currentTool === "link") {
        handleLinkClick(nodeId);
        return;
      }
      selectNode(nodeId);
      var pt = screenToViewport(e.clientX, e.clientY);
      var node = AppState.getNode(nodeId);
      dragState = { id: nodeId, dx: pt.x - node.x, dy: pt.y - node.y, moved: false };
      return;
    }

    if (targetEdge) {
      selectEdge(targetEdge.closest("[data-edge-id]").dataset.edgeId);
      return;
    }

    // empty canvas click
    if (currentTool === "add-node") {
      var p = screenToViewport(e.clientX, e.clientY);
      createNodeAt(p.x, p.y);
      return;
    }
    if (currentTool === "link") { clearLinkDraft(); }
    resetSelection();
  }

  function onCanvasMouseMove(e) {
    if (panState) {
      view.x = panState.origX + (e.clientX - panState.startX);
      view.y = panState.origY + (e.clientY - panState.startY);
      applyViewTransform();
      return;
    }
    if (dragState) {
      var pt = screenToViewport(e.clientX, e.clientY);
      dragState.moved = true;
      var nx = pt.x - dragState.dx, ny = pt.y - dragState.dy;
      var g = nodesLayer.querySelector('[data-id="' + dragState.id + '"]');
      if (g) g.setAttribute("transform", "translate(" + nx + "," + ny + ")");
      dragState.liveX = nx; dragState.liveY = ny;
      redrawEdgesLive();
      return;
    }
    if (linkDraft) {
      var p2 = screenToViewport(e.clientX, e.clientY);
      var ghost = $("#link-ghost");
      if (ghost) {
        var from = AppState.getNode(linkDraft.fromId);
        ghost.setAttribute("x1", from.x); ghost.setAttribute("y1", from.y);
        ghost.setAttribute("x2", p2.x); ghost.setAttribute("y2", p2.y);
      }
    }
  }

  function onCanvasMouseUp() {
    if (panState) { panState = null; }
    if (dragState) {
      if (dragState.moved) {
        AppState.updateNode(dragState.id, { x: dragState.liveX, y: dragState.liveY });
      }
      dragState = null;
    }
  }

  function handleLinkClick(nodeId) {
    if (!linkDraft) {
      linkDraft = { fromId: nodeId };
      selectNode(nodeId);
      var from = AppState.getNode(nodeId);
      var ghost = el("line", {
        id: "link-ghost", class: "net-link-ghost",
        x1: from.x, y1: from.y, x2: from.x, y2: from.y
      });
      edgesLayer.appendChild(ghost);
      Utils.toast(I18n.t("toast.pickTarget"), null);
    } else {
      var fromId = linkDraft.fromId;
      clearLinkDraft();
      if (fromId === nodeId) { Utils.toast(I18n.t("toast.pickDifferentTarget"), null); return; }
      var edge = AppState.addEdge(fromId, nodeId, {});
      selectEdge(edge.id);
    }
  }

  function clearLinkDraft() {
    linkDraft = null;
    var ghost = $("#link-ghost");
    if (ghost) ghost.remove();
  }

  async function createNodeAt(x, y) {
    var label = await Utils.promptText({
      title: I18n.t("modal.newNodeTitle"), placeholder: I18n.t("modal.newNodePlaceholder"),
      description: I18n.t("modal.newNodeDesc")
    });
    if (!label) return;
    var node = AppState.addNode(label, x, y);
    setTool("select");
    selectNode(node.id);
  }

  function deleteSelection() {
    if (AppState.selection.type === "node") {
      AppState.removeNode(AppState.selection.id);
      resetSelection();
    } else if (AppState.selection.type === "edge") {
      AppState.removeEdge(AppState.selection.id);
      resetSelection();
    }
  }

  function selectNode(id) {
    AppState.selection = { type: "node", id: id };
    inspectorMode = "properties";
    $("#tool-rules").classList.remove("active");
    render();
  }
  function selectEdge(id) {
    AppState.selection = { type: "edge", id: id };
    inspectorMode = "properties";
    $("#tool-rules").classList.remove("active");
    render();
  }
  function resetSelection() {
    AppState.selection = { type: null, id: null };
    render();
  }

  // ---------------------------------------------------------------- rendering
  function render() {
    var state = AppState.getState();
    emptyHint.classList.toggle("hidden", state.nodes.length > 0);

    renderNodes(state);
    renderEdges(state);
    renderInspector();
    syncUndoRedoButtons();
  }

  function syncUndoRedoButtons() {
    $("#tool-undo").style.opacity = AppState.canUndo() ? "1" : ".4";
    $("#tool-redo").style.opacity = AppState.canRedo() ? "1" : ".4";
  }

  function renderNodes(state) {
    nodesLayer.innerHTML = "";
    state.nodes.forEach(function (n) {
      var g = el("g", {
        class: "net-node-group" + (AppState.selection.type === "node" && AppState.selection.id === n.id ? " selected" : ""),
        transform: "translate(" + n.x + "," + n.y + ")"
      });
      g.dataset.id = n.id;

      var text = el("text", { class: "net-node-label", "text-anchor": "middle", dy: "0.32em" });
      text.textContent = n.label;
      // text must be in DOM to measure; append temporarily to compute bbox
      g.appendChild(text);
      nodesLayer.appendChild(g);
      var bbox;
      try { bbox = text.getBBox(); } catch (e) { bbox = { width: 40, height: 14 }; }
      var w = Math.max(NODE_MIN_W, bbox.width + NODE_PAD_X * 2);
      var h = Math.max(NODE_MIN_H, bbox.height + NODE_PAD_Y * 2);
      nodeSizes[n.id] = { w: w, h: h };

      var rect = el("rect", {
        class: "net-node-box", x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, ry: 10
      });
      g.insertBefore(rect, text);

      g.addEventListener("dblclick", function (ev) {
        ev.stopPropagation();
        renameNode(n.id);
      });
    });
  }

  async function renameNode(id) {
    var node = AppState.getNode(id);
    if (!node) return;
    var label = await Utils.promptText({ title: I18n.t("modal.renameNodeTitle"), value: node.label });
    if (label) AppState.updateNode(id, { label: label });
  }

  function edgePairKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

  function renderEdges(state) {
    edgesLayer.innerHTML = "";
    if (linkDraft) {
      var from = AppState.getNode(linkDraft.fromId);
      if (from) {
        var ghost = el("line", { id: "link-ghost", class: "net-link-ghost", x1: from.x, y1: from.y, x2: from.x, y2: from.y });
        edgesLayer.appendChild(ghost);
      }
    }
    var seen = {};
    state.edges.forEach(function (e) {
      var a = AppState.getNode(e.from), b = AppState.getNode(e.to);
      if (!a || !b) return;
      var key = edgePairKey(e.from, e.to);
      var n = seen[key] || 0; seen[key] = n + 1;
      drawEdge(e, a, b, n);
    });
  }

  function boxBoundaryPoint(cx, cy, hw, hh, dirx, diry) {
    if (dirx === 0 && diry === 0) return { x: cx, y: cy };
    var tx = dirx !== 0 ? hw / Math.abs(dirx) : Infinity;
    var ty = diry !== 0 ? hh / Math.abs(diry) : Infinity;
    var t = Math.min(tx, ty);
    return { x: cx + dirx * t, y: cy + diry * t };
  }

  function edgeGeometry(e, a, b, dupIndex) {
    var szA = nodeSizes[a.id] || { w: NODE_MIN_W, h: NODE_MIN_H };
    var szB = nodeSizes[b.id] || { w: NODE_MIN_W, h: NODE_MIN_H };
    var dirx = b.x - a.x, diry = b.y - a.y;
    var dist = Math.hypot(dirx, diry) || 1;
    var ux = dirx / dist, uy = diry / dist;
    var start = boxBoundaryPoint(a.x, a.y, szA.w / 2, szA.h / 2, dirx, diry);
    var end = boxBoundaryPoint(b.x, b.y, szB.w / 2, szB.h / 2, -dirx, -diry);

    var curve = Math.floor((dupIndex + 1) / 2) * 24 * (dupIndex % 2 === 0 ? 1 : -1);
    var mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2;
    var nx = -uy, ny = ux; // normal
    var ctrl = { x: mx + nx * curve, y: my + ny * curve };
    var labelPt = curve === 0 ? { x: mx, y: my } : {
      x: 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y
    };
    var path = curve === 0
      ? "M " + start.x + " " + start.y + " L " + end.x + " " + end.y
      : "M " + start.x + " " + start.y + " Q " + ctrl.x + " " + ctrl.y + " " + end.x + " " + end.y;
    return { path: path, labelPt: labelPt };
  }

  function drawEdge(e, a, b, dupIndex) {
    var geo = edgeGeometry(e, a, b, dupIndex);
    var selected = AppState.selection.type === "edge" && AppState.selection.id === e.id;

    var g = el("g", {});
    g.dataset.edgeId = e.id;

    var hit = el("path", { class: "net-edge-hit", d: geo.path });
    var visible = el("path", {
      class: "net-edge-path" + (selected ? " selected" : ""),
      d: geo.path,
      stroke: e.color || "#5b7b9a"
    });
    if (DASH_PATTERNS[e.dash]) visible.setAttribute("stroke-dasharray", DASH_PATTERNS[e.dash]);
    visible.setAttribute("marker-end", "url(#arrow-head)");
    if (e.arrow === "two") visible.setAttribute("marker-start", "url(#arrow-head)");

    g.appendChild(hit);
    g.appendChild(visible);

    var label = relationDisplay(e.relation);
    var labelText = el("text", {
      class: "net-edge-label", x: geo.labelPt.x, y: geo.labelPt.y,
      "text-anchor": "middle", dy: "-4"
    });
    labelText.textContent = label;
    g.appendChild(labelText);
    edgesLayer.appendChild(g);
    try {
      var bb = labelText.getBBox();
      var bg = el("rect", {
        class: "net-edge-label-bg", x: bb.x - 3, y: bb.y - 1, width: bb.width + 6, height: bb.height + 2, rx: 4
      });
      g.insertBefore(bg, labelText);
    } catch (err) { /* ignore measurement errors (e.g. hidden tab) */ }
  }

  function relationDisplay(rel) { return rel; }

  // cheap live redraw while dragging (avoids full re-render/measure on every frame)
  function redrawEdgesLive() {
    var state = AppState.getState();
    // Patch positions in-memory just for geometry calc, without committing to AppState
    var overrideNode = function (id) {
      if (dragState && id === dragState.id) return { id: id, x: dragState.liveX, y: dragState.liveY };
      return AppState.getNode(id);
    };
    edgesLayer.innerHTML = "";
    var seen = {};
    state.edges.forEach(function (e) {
      var a = overrideNode(e.from), b = overrideNode(e.to);
      if (!a || !b) return;
      var key = edgePairKey(e.from, e.to);
      var n = seen[key] || 0; seen[key] = n + 1;
      drawEdge(e, a, b, n);
    });
  }

  // ---------------------------------------------------------------- inspector
  var RELATION_PRESETS_CACHE = null;

  function wireInspectorStaticButtons() { /* reserved for future static controls */ }

  function renderInspector() {
    var host = $("#inspector-content");
    if (inspectorMode === "rules") {
      host.innerHTML = "";
      host.appendChild(RuleBuilder.renderPanel());
      return;
    }
    var sel = AppState.selection;
    if (sel.type === "node") {
      renderNodeInspector(host, AppState.getNode(sel.id));
    } else if (sel.type === "edge") {
      renderEdgeInspector(host, AppState.getEdge(sel.id));
    } else {
      host.innerHTML = '<div class="empty-inspector">' + I18n.t("inspector.emptyHtml") + '</div>';
    }
  }

  function section(title) {
    var s = document.createElement("div");
    s.className = "inspector-section";
    var h = document.createElement("h3");
    h.textContent = title;
    s.appendChild(h);
    return s;
  }

  function renderNodeInspector(host, node) {
    host.innerHTML = "";
    if (!node) return;
    var s = section(I18n.t("inspector.nodeProps"));

    var f1 = document.createElement("div"); f1.className = "field";
    f1.innerHTML = '<label>' + I18n.t("inspector.label") + '</label>';
    var input = document.createElement("input");
    input.type = "text"; input.value = node.label;
    input.addEventListener("change", function () { AppState.updateNode(node.id, { label: input.value || node.label }); });
    f1.appendChild(input);
    s.appendChild(f1);
    host.appendChild(s);

    var s2 = section(I18n.t("inspector.actions"));
    var delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger btn-sm"; delBtn.style.width = "100%";
    delBtn.textContent = I18n.t("inspector.deleteNode");
    delBtn.addEventListener("click", deleteSelection);
    s2.appendChild(delBtn);
    host.appendChild(s2);
  }

  function renderEdgeInspector(host, edge) {
    host.innerHTML = "";
    if (!edge) return;
    var a = AppState.getNode(edge.from), b = AppState.getNode(edge.to);

    var s = section(I18n.t("inspector.edgeTitle", { from: a ? a.label : "?", to: b ? b.label : "?" }));

    // relation chips
    var f1 = document.createElement("div"); f1.className = "field";
    f1.innerHTML = "<label>" + I18n.t("inspector.relationType") + "</label>";
    var chipWrap = document.createElement("div"); chipWrap.className = "rel-chip-list";
    AppState.getBuiltInRelations().forEach(function (r) {
      var chip = document.createElement("span");
      chip.className = "rel-chip" + (edge.relation === r ? " active" : "");
      chip.textContent = r;
      chip.title = I18n.t("relation." + r);
      chip.addEventListener("click", function () { AppState.updateEdge(edge.id, { relation: r }); });
      chipWrap.appendChild(chip);
    });
    f1.appendChild(chipWrap);
    host.appendChild(s);
    s.appendChild(f1);

    var f2 = document.createElement("div"); f2.className = "field";
    f2.innerHTML = "<label>" + I18n.t("inspector.customRelation") + "</label>";
    var customInput = document.createElement("input");
    customInput.type = "text"; customInput.placeholder = I18n.t("inspector.customRelationPlaceholder");
    customInput.value = AppState.getBuiltInRelations().indexOf(edge.relation) >= 0 ? "" : edge.relation;
    customInput.addEventListener("change", function () {
      if (customInput.value.trim()) AppState.updateEdge(edge.id, { relation: customInput.value.trim() });
    });
    f2.appendChild(customInput);
    s.appendChild(f2);

    // arrow direction
    var s3 = section(I18n.t("inspector.arrowStyle"));
    var f3 = document.createElement("div"); f3.className = "field";
    f3.innerHTML = "<label>" + I18n.t("inspector.direction") + "</label>";
    var seg = document.createElement("div"); seg.className = "seg-control";
    [["one", I18n.t("inspector.oneWay")], ["two", I18n.t("inspector.twoWay")]].forEach(function (pair) {
      var b2 = document.createElement("button");
      b2.textContent = pair[1];
      b2.className = edge.arrow === pair[0] ? "active" : "";
      b2.addEventListener("click", function () { AppState.updateEdge(edge.id, { arrow: pair[0] }); });
      seg.appendChild(b2);
    });
    f3.appendChild(seg); s3.appendChild(f3);

    var f4 = document.createElement("div"); f4.className = "field";
    f4.innerHTML = "<label>" + I18n.t("inspector.lineStyle") + "</label>";
    var seg2 = document.createElement("div"); seg2.className = "seg-control";
    [["solid", I18n.t("inspector.solid")], ["dashed", I18n.t("inspector.dashed")], ["dotted", I18n.t("inspector.dotted")]].forEach(function (pair) {
      var b3 = document.createElement("button");
      b3.textContent = pair[1];
      b3.className = edge.dash === pair[0] ? "active" : "";
      b3.addEventListener("click", function () { AppState.updateEdge(edge.id, { dash: pair[0] }); });
      seg2.appendChild(b3);
    });
    f4.appendChild(seg2); s3.appendChild(f4);

    var f5 = document.createElement("div"); f5.className = "field";
    f5.innerHTML = "<label>" + I18n.t("inspector.color") + "</label>";
    var swWrap = document.createElement("div"); swWrap.className = "swatches";
    ["#5b7b9a", "#4C6FFF", "#0f9b8e", "#e2920f", "#d64550", "#8450c7", "#13293d"].forEach(function (c) {
      var sw = document.createElement("span");
      sw.className = "swatch" + (edge.color === c ? " selected" : "");
      sw.style.background = c;
      sw.addEventListener("click", function () { AppState.updateEdge(edge.id, { color: c }); });
      swWrap.appendChild(sw);
    });
    f5.appendChild(swWrap); s3.appendChild(f5);
    host.appendChild(s3);

    var s4 = section(I18n.t("inspector.actions"));
    var delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger btn-sm"; delBtn.style.width = "100%";
    delBtn.textContent = I18n.t("inspector.deleteEdge");
    delBtn.addEventListener("click", deleteSelection);
    s4.appendChild(delBtn);
    host.appendChild(s4);
  }

  // ---------------------------------------------------------------- PNG export
  function exportPNG() {
    var state = AppState.getState();
    if (!state.nodes.length) { Utils.toast(I18n.t("toast.addNodeFirstForImage"), "error"); return; }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(function (n) {
      var sz = nodeSizes[n.id] || { w: NODE_MIN_W, h: NODE_MIN_H };
      minX = Math.min(minX, n.x - sz.w / 2); maxX = Math.max(maxX, n.x + sz.w / 2);
      minY = Math.min(minY, n.y - sz.h / 2); maxY = Math.max(maxY, n.y + sz.h / 2);
    });
    var pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var w = maxX - minX, h = maxY - minY;

    var clone = svg.cloneNode(true);
    clone.removeAttribute("class");
    clone.setAttribute("width", w);
    clone.setAttribute("height", h);
    clone.setAttribute("viewBox", minX + " " + minY + " " + w + " " + h);
    var vp = clone.querySelector("#viewport");
    vp.removeAttribute("transform");
    var g2 = clone.querySelector("#link-ghost");
    if (g2) g2.remove();

    var style = document.createElementNS(SVG_NS, "style");
    style.textContent =
      ".net-node-box{fill:#ffffff;stroke:#4C6FFF;stroke-width:1.6;}" +
      ".net-node-label{font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;fill:#13293d;}" +
      ".net-edge-path{fill:none;stroke-width:2;}" +
      ".net-edge-label{font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;fill:#2c4a63;}" +
      ".net-edge-label-bg{fill:#ffffff;opacity:.95;}";
    clone.insertBefore(style, clone.firstChild);

    clone.insertBefore(makeBgRect(minX, minY, w, h), clone.firstChild.nextSibling);

    var xml = new XMLSerializer().serializeToString(clone);
    var svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(svgBlob);
    var img = new Image();
    img.onload = function () {
      var scaleFactor = 2; // export at 2x for sharpness
      var canvas = document.createElement("canvas");
      canvas.width = w * scaleFactor; canvas.height = h * scaleFactor;
      var ctx = canvas.getContext("2d");
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var pngUrl = canvas.toDataURL("image/png");
      Utils.downloadDataUrl("red-semantica.png", pngUrl);
      Utils.toast(I18n.t("toast.pngDownloaded"), "success");
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      Utils.toast(I18n.t("toast.pngError"), "error");
    };
    img.src = url;
  }

  function makeBgRect(x, y, w, h) {
    return el("rect", { x: x, y: y, width: w, height: h, fill: "#ffffff" });
  }

  global.NetworkEditor = {
    init: init,
    fitToContent: fitToContent,
    getNodeSizes: function () { return nodeSizes; }
  };
})(window);
