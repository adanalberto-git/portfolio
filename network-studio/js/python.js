/* Runs Python in the browser with Pyodide, inside a Web Worker so long programs never freeze the page. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

const HELPER = String.raw`
import sys, json, io, base64, traceback, linecache

def _ns_register(src):
    linecache.cache["network.py"] = (len(src), None, src.splitlines(True), "network.py")

def _ns_syntax(src):
    try:
        compile(src, "network.py", "exec")
        return None
    except SyntaxError as e:
        return {"ok": False, "kind": "syntax", "line": e.lineno, "col": e.offset, "type": type(e).__name__,
                "msg": str(e.msg), "text": (e.text or "").rstrip("\n")}

def _ns_check(src):
    r = _ns_syntax(src)
    return json.dumps(r or {"ok": True})

def _ns_run(src):
    _ns_register(src)
    r = _ns_syntax(src)
    if r:
        return json.dumps(r)
    g = {"__name__": "__main__", "__file__": "network.py"}
    try:
        exec(compile(src, "network.py", "exec"), g)
    except SystemExit:
        pass
    except BaseException as e:
        tb = traceback.extract_tb(e.__traceback__)
        frames = [f for f in tb if f.filename == "network.py"]
        line = frames[-1].lineno if frames else None
        text = "Traceback (most recent call last):\n" + "".join(traceback.format_list(frames)) + "".join(traceback.format_exception_only(type(e), e))
        return json.dumps({"ok": False, "kind": "runtime", "line": line, "type": type(e).__name__, "msg": str(e), "trace": text})
    finally:
        try:
            sys.stdout.flush(); sys.stderr.flush()
        except Exception:
            pass
    return json.dumps({"ok": True})

def _ns_setup_mpl():
    import os
    os.environ["MPLBACKEND"] = "Agg"
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.show = lambda *a, **k: _ns_flush_figs()

def _ns_flush_figs():
    if "matplotlib.pyplot" not in sys.modules:
        return
    import matplotlib.pyplot as plt
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
        _ns_post_image(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")

def _ns_lint(src):
    from pyflakes import api
    class R:
        def __init__(self):
            self.items = []
        def unexpectedError(self, filename, msg):
            pass
        def syntaxError(self, filename, msg, lineno, offset, text):
            pass
        def flake(self, m):
            self.items.append({"line": m.lineno, "col": (getattr(m, "col", 0) or 0) + 1, "msg": m.message % m.message_args})
    r = R()
    api.check(src, "network.py", r)
    return json.dumps(r.items)
`;

const WORKER_SRC = `
let py = null, flakes = null;
const post = m => self.postMessage(m);
async function init(url, helper) {
  importScripts(url + "pyodide.js");
  py = await loadPyodide({ indexURL: url });
  py.setStdout({ batched: s => post({ type: "out", text: s }) });
  py.setStderr({ batched: s => post({ type: "err", text: s }) });
  py.setStdin({ stdin: () => { post({ type: "stdin" }); return null; } });
  py.globals.set("_ns_post_image", b64 => post({ type: "image", data: b64 }));
  py.runPython(helper);
}
async function ensureFlakes() {
  if (flakes) return flakes;
  flakes = (async () => {
    await py.loadPackage("micropip");
    await py.runPythonAsync("import micropip\\nawait micropip.install('pyflakes')");
    return true;
  })();
  return flakes;
}
self.onmessage = async ev => {
  const m = ev.data;
  try {
    if (m.type === "init") {
      await init(m.url, m.helper);
      post({ type: "ready", version: py.version });
    } else if (m.type === "run") {
      await py.loadPackagesFromImports(m.code, { messageCallback: s => post({ type: "pkg", text: s }), errorCallback: s => post({ type: "pkgerr", text: s }) });
      const mpl = /\\bmatplotlib\\b/.test(m.code);
      if (mpl) py.runPython("_ns_setup_mpl()");
      post({ type: "started" });
      const t0 = performance.now();
      const res = py.globals.get("_ns_run")(m.code);
      if (mpl) py.runPython("_ns_flush_figs()");
      post({ type: "done", result: JSON.parse(res), ms: performance.now() - t0 });
    } else if (m.type === "check") {
      const syntax = JSON.parse(py.globals.get("_ns_check")(m.code));
      let lint = null;
      if (syntax.ok && m.lint) {
        try { await ensureFlakes(); lint = JSON.parse(py.globals.get("_ns_lint")(m.code)); } catch (e) { flakes = null; lint = null; }
      }
      post({ type: "checked", syntax, lint });
    }
  } catch (err) {
    post({ type: "fatal", msg: String((err && err.message) || err) });
  }
};
`;

let worker = null, state = "idle", version = "", readyP = null, current = null, cb = {};
function setState(s, info) { state = s; if (cb.status) cb.status(s, info); }
function absURL(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

function ensure() {
  if (readyP) return readyP;
  setState("loading");
  readyP = new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch (e) { setState("error", String(e.message || e)); readyP = null; reject(e); return; }
    worker.onmessage = ev => {
      const m = ev.data;
      if (m.type === "ready") { version = m.version; setState("ready", version); resolve(); }
      else if (m.type === "fatal" && state === "loading") { setState("error", m.msg); worker.terminate(); worker = null; readyP = null; reject(new Error(m.msg)); }
      else handle(m);
    };
    worker.onerror = e => {
      const msg = e.message || "worker error";
      if (state === "loading") { setState("error", msg); readyP = null; reject(new Error(msg)); }
      else if (current) { const c = current; current = null; c.reject(new Error(msg)); }
    };
    let base = absURL((root.NS_CONFIG && root.NS_CONFIG.pyodide) || "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/");
    if (!base.endsWith("/")) base += "/";
    worker.postMessage({ type: "init", url: base, helper: HELPER });
  });
  return readyP;
}
function handle(m) {
  const h = current ? current.handlers : {};
  if (m.type === "out") h.out && h.out(m.text);
  else if (m.type === "err") h.err && h.err(m.text);
  else if (m.type === "image") h.image && h.image(m.data);
  else if (m.type === "stdin") h.stdin && h.stdin();
  else if (m.type === "pkg") h.pkg && h.pkg(m.text);
  else if (m.type === "pkgerr") h.err && h.err(m.text);
  else if (m.type === "started") { setState("running"); h.started && h.started(); }
  else if (m.type === "done" || m.type === "checked") { const c = current; current = null; setState("ready", version); c && c.resolve(m); }
  else if (m.type === "fatal") { const c = current; current = null; setState("ready", version); c && c.reject(new Error(m.msg)); }
}
async function send(msg, handlers) {
  await ensure();
  if (current) throw new Error("busy");
  return new Promise((resolve, reject) => { current = { resolve, reject, handlers: handlers || {} }; worker.postMessage(msg); });
}
const run = (code, handlers) => send({ type: "run", code }, handlers);
const check = (code, lint) => send({ type: "check", code, lint: !!lint });
function stop() {
  if (worker) worker.terminate();
  worker = null; readyP = null;
  const c = current; current = null;
  setState("idle");
  if (c) c.resolve({ type: "stopped" });
}
NS.python = { ensure, run, check, stop, onStatus: f => { cb.status = f; }, get state() { return state; }, get version() { return version; }, get busy() { return !!current; } };
})(typeof window !== "undefined" ? window : globalThis);
