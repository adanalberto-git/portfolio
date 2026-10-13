# Network Studio

Design a neural network on a canvas, watch its Python code being written in real time, then edit and run that code in the browser. English and Spanish.

## Put it on your website

Upload the whole `network-studio` folder (keep `index.html`, `css/` and `js/` together) to any web host, then link to `index.html`. No server code or database is needed.

If you prefer one file, upload `network-studio.html` instead. It is the same app with everything inside one page.

The app must be opened from a web address (`https://…`). Opening `index.html` by double-clicking it also works for the canvas and the code view. Some browsers block running Python from a local file, though.

## What it loads from the internet

| Part | Loaded from | When |
|---|---|---|
| Python (Pyodide 0.26.4) | cdn.jsdelivr.net | The first time someone runs or checks code |
| Code editor (Monaco 0.52.0) | cdn.jsdelivr.net | When the Editor tab opens. If it fails, a simpler built-in editor is used |
| Zip tool (JSZip 3.10.1) | cdnjs.cloudflare.com | Only for "VS Code project (.zip)" |
| Fonts | fonts.googleapis.com | On page load (system fonts are used if blocked) |
| pyflakes (extra checks) | pypi.org | The first time someone presses Check |

To host these yourself, copy them to your server and change the addresses near the top of `index.html`, in `window.NS_CONFIG`. The `credit` line there is the sentence shown at the bottom of the Help window.

## Where data is saved

Each visitor's design, editor code and settings are saved in their own browser (localStorage). Nothing is sent to your server. Students keep or share their work with File → Save design, or with the Export menu.

## Files

- `index.html`: the page
- `css/app.css`: all styles (light and dark themes, code color themes)
- `js/core.js`: data sets, network checks, the Python code generator, and the training engine that matches NumPy
- `js/canvas.js`: drawing and editing on the canvas, plus image export
- `js/pyhl.js`: VS Code–style Python coloring
- `js/python.js`: runs Python in a background worker
- `js/editor.js`: the code editor
- `js/io.js`: import and export
- `js/i18n.js`: all English and Spanish text, including the Help section
- `js/app.js`: connects everything

---

# Network Studio (español)

Diseña una red neuronal en un lienzo, mira cómo se escribe su código Python en tiempo real, y después edita y ejecuta ese código en el navegador.

**Para publicarla:** sube la carpeta completa `network-studio` a tu sitio web y enlaza a `index.html`, o sube solo `network-studio.html`. No necesita servidor ni base de datos. Python, el editor y la herramienta de zip se cargan desde internet la primera vez que se usan. Las direcciones están en `window.NS_CONFIG`, al inicio de `index.html`. El trabajo de cada estudiante se guarda en su propio navegador.
