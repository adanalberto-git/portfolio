/* English and Spanish text for Network Studio. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

const EN = {
  file: "File", mNew: "New design", mOpen: "Open design…", mSave: "Save design (.json)", mImportPy: "Import Python script…", mTemplates: "Browse templates", mHelp: "Help and shortcuts",
  undo: "Undo (Ctrl+Z)", redo: "Redo (Ctrl+Shift+Z)", designName: "Design name", themeToggle: "Light or dark", help: "Help",
  export: "Export", exNetwork: "Network", exPng: "Image (.png)", exSvg: "Vector image (.svg)", exJson: "Design file (.json)", exCode: "Python code",
  exPyLive: "Script from the canvas (.py)", exPyEditor: "Script from the editor (.py)", exIpynb: "Jupyter notebook (.ipynb)", exZip: "VS Code project (.zip)",
  code: "Code", rlTraining: "Training", rlInspect: "Inspect", pElements: "Elements", pTemplates: "Templates", pData: "Data", pTraining: "Training", pInspect: "Inspect", closePanel: "Close panel",
  rename: "Rename", toolSelect: "Select (V)", toolHand: "Move the view (H, or hold Space)", tidy: "Tidy up", showValues: "Show neuron values", snap: "Snap to grid",
  train: "Train", step: "Step", walk: "Walk", stepTitle: "Run the next line of the training loop (S)", walkTitle: "Step through the loop automatically", resetTitle: "Start again with new random weights", speed: "Speed",
  results: "Results", lossOverEpochs: "Loss over epochs", zoomOut: "Zoom out", zoomIn: "Zoom in", zoomReset: "Back to 100%", zoomFit: "Fit to screen", showCode: "Show code", resizeCode: "Drag to resize the code panel",
  liveCode: "Live code", editor: "Editor", hideCode: "Hide the code panel (\\)", codeStyle: "Code style", styleNeuron: "Neuron by neuron", styleMatrix: "Matrix",
  styleMatrixTitle: "Group the neurons of each column into weight matrices", copy: "Copy", openInEditor: "Open in editor", runPython: "Run in Python",
  simConsole: "Training console", variables: "Variables", run: "Run", runTitle: "Run the program (Ctrl+Enter)", stop: "Stop", check: "Check", checkTitle: "Compile and look for mistakes without running",
  fromCanvas: "Replace with the code from the canvas", importPy: "Import a .py file", exportPy: "Download as .py", edSettings: "Editor settings", codeTheme: "Color theme", themeAuto: "Match the app",
  fontSize: "Font size", wordWrap: "Wrap long lines", minimap: "Show minimap", output: "Output", problems: "Problems", clearOutput: "Clear output", helpTitle: "Help",
  close: "Close", dropHere: "Drop a design (.json, .png, .svg) or a Python file (.py)",
  // general
  untitled: "Untitled network", savedLocal: "Saved in this browser", undone: "Undone", redone: "Redone", emptyHint: "Drag Hidden and Output neurons here from Elements",
  welcome: "Welcome to Network Studio. Press ? at any time for help.",
  // canvas edits
  newNote: "Write a note", allInputs: n => `This data has ${n} inputs, and all of them are already on the canvas.`, oneOutput: "There is already an output. The network gives one answer per example, so it needs exactly one output neuron.",
  rAddedInput: n => `Input ${n} added`, rAddedHidden: n => `${n} added`, rAddedOutput: "Output added", rAddedLayer: n => `Layer of ${n} added`, rAddedArrow: (a, b) => `Arrow ${a} → ${b} added`,
  rDeleted: n => `${n} deleted`, rPasted: "Pasted", rConnected: n => `${n} arrows added`, rAct: a => `Activation set to ${a}`, rRenamed: (a, b) => `${a} renamed to ${b}`,
  rData: n => `Data: ${n}`, rTraining: "Settings changed", rStyle: s => `Code style: ${s}`, rSeed: "New random starting weights", rReset: "New random weights",
  eIntoInput: "Arrows cannot point into an input. Inputs only hold the data.", eFromOutput: "The output is the end of the network, so arrows cannot leave it.",
  eExists: "These two neurons are already connected.", eLoop: "That arrow would make a loop. Signals in this network only move forward, from inputs toward the output.",
  copyOnlyHidden: "Only hidden neurons and notes can be copied. Inputs come from the data, and there is only one output.", copied: "Copied", needColumns: "Select neurons in at least two columns.",
  nothingToConnect: "Those neurons are already connected wherever an arrow is allowed.", tidied: "Tidied up into columns", inputNames: "Input names come from the data and cannot be changed.",
  badDesign: "That file is not a Network Studio design.", tplLoaded: "Template loaded. Ctrl+Z brings back your previous design.",
  // contextual toolbar
  kindInput: "Input", kindHidden: "Hidden", kindOutput: "Output", activation: "Activation", color: "Color", duplicate: "Duplicate", delete: "Delete", weight: "weight",
  editText: "Edit text", smaller: "Smaller text", bigger: "Bigger text", nSelected: n => `${n} selected`, align: "Align", connect: "Connect", connectTitle: "Connect each column of selected neurons to the next column",
  mixed: "Mixed", autoColor: "Color by type", alLeft: "Align left", alCenter: "Align centers", alRight: "Align right", alTop: "Align top", alMiddle: "Align middles", alBottom: "Align bottom",
  alDistH: "Spread out horizontally", alDistV: "Spread out vertically", cmAddHidden: "Add hidden neuron here", cmAddNote: "Add note here", paste: "Paste", selectAll: "Select all",
  // status
  problemsN: n => n === 1 ? "1 problem to fix" : `${n} problems to fix`, ready: "Ready", summary: (i, h, e) => `${i} in, ${h} hidden, 1 out, ${e} ${e === 1 ? "arrow" : "arrows"}`, noIssues: "No problems. The network is ready to train.",
  liveMeta: n => `${n} lines · written from the canvas`, linesChanged: n => n === 1 ? "1 line changed" : `${n} lines changed`, liveInvalid: "Fix the problems on the canvas to see the code",
  // simulation
  notReady: "Not ready", epoch: "Epoch", loss: "Loss", pause: "Pause", resume: "Resume", trainAgain: "Train again", stopWalk: "Stop", paused: "Paused", done: "Done", line: "Line",
  fixFirst: "Fix the problems on the canvas first. Click the red status chip to see them.", simHint: "Press Train, or Step to watch the loop work one line at a time.",
  simFix: "Finish the network on the canvas to run it.", processDone: "Process finished.", gradient: "gradient", moreRows: n => `… ${n} more rows, one per example`,
  moreWeights: n => `… ${n} more weights`, printSkip: (e, p) => `Nothing printed: ${e} is not a multiple of print_every (${p}).`, varsHint: "Press Step to run the training loop one line at a time. The value each line creates appears here.",
  hudIdle: "Untrained. Press Train.", pressTrain: "Press Train to watch the loss fall", testStrings: "New test strings", people65: "people: about 65%", string: "String", grammatical: "grammatical",
  notGrammatical: "not grammatical", yes: "yes", no: "no", truthTable: "Truth table", target: "Target", decisionMap: "What the network decides", missingInput: x => `${x} is not on the canvas`,
  // panels
  neurons: "Neurons", allPlaced: "All placed", inputsLeft: n => `${n} left`, dragOrClick: "Drag or click", alreadyHas: "Already added", oneAnswer: "The answer", note: "Note", forLabels: "For labels",
  buildLayer: "Build a whole layer", neuronsCount: "Neurons", lmFrom: "Connect from the selected neurons", lmFromSub: n => n ? `${n} selected now` : "Select neurons first, for example the inputs",
  lmTo: "Connect to the output", addLayer: "Add layer", quickTools: "Quick tools", tplIntro: "Start from a ready-made network. Your current design stays in the undo history.",
  chooseData: "Choose the data", dsLogic: "Logic gate", logicGate: "Logic gate", inputsN: "Inputs", clickTargets: "Click a target to flip it between 0 and 1.",
  aglAbout: "Each string becomes 10 numbers: whether it contains each two-letter chunk (TX, TS, SX, …). The test strings are new, so test accuracy measures generalization, as in Reber (1967).",
  trainStrings: "Training strings", about_circles: "Class 0 sits inside a small circle and class 1 on a ring around it. No straight line separates them, so hidden neurons must bend the boundary.",
  about_moons: "Two curved half circles that hook into each other. A small hidden layer can learn the curved boundary.",
  about_spiral: "Two arms that wind around each other. This is hard: it needs two hidden layers and many epochs.",
  pointsInfo: n => `${n} points. Blue is class 1, orange is class 0.`, showing: "Example shown on the canvas", showingSub: "Neuron values on the canvas use this example",
  lossFn: "Loss function", bce: "Cross-entropy", mse: "Mean squared error", lr: "Learning rate", epochs: "Epochs", seed: "Random seed", newSeed: "New random seed",
  trHelp: "Changing a setting rewrites the code and starts again from fresh random weights.", pythonCode: "Python code", plotOpt: "Plot the loss curve", plotSub: "Adds matplotlib code that draws the loss after training",
  canvasView: "Canvas", numbers: "Numbers", trainable: "Trainable numbers", weights: "Weights", biases: "Biases", examples: "Examples", test: "test", arrows: "Arrows",
  inspectHint: "Select a neuron or an arrow to see its numbers and the code that uses it.", inspectMulti: "Select a single neuron or arrow to see its details.",
  noteInfo: "Notes are for your labels and explanations. They are saved with the design and appear in images, but not in the code.",
  oneWeight: "one weight", edgeExplain: (a, b) => `This arrow multiplies ${a}'s value by a weight before it reaches ${b}. Training changes the weight to make the loss smaller.`,
  edgePos: (a, b) => `It is positive, so a larger ${a} pushes ${b} up.`, edgeNeg: (a, b) => `It is negative, so a larger ${a} pushes ${b} down.`,
  kind_input: "input neuron", kind_hidden: "hidden neuron", kind_output: "output neuron",
  inputExplain: f => `Holds one number from each example: column ${f} of the data. It does no computing.`, inputAgl: c => `It is 1 when the string contains "${c}" and 0 when it does not.`,
  valueShown: "Value for the example shown", sendsN: n => `It sends its value along ${n} ${n === 1 ? "arrow" : "arrows"}.`, ignoredInput: "It has no arrows yet, so the network ignores it.",
  outputExplain: "The output uses a sigmoid, so its value is between 0 and 1: the network's estimate that the answer is 1. Above 0.5 counts as yes.",
  bias: "Bias", incoming: "Incoming weights", noIncoming: "No arrows come into this neuron yet.", sendsTo: list => `Sends its value to ${list}.`, sendsNowhere: "It does not send its value anywhere yet.",
  ciWeights: "its incoming weights", ciBias: "its bias", ciAct: "its activation for every example",
  // editor & python
  editorDiffers: "The editor has your own changes", replaceTitle: "Replace the editor code?", replaceText: "The editor has changes that are not in the canvas code. They will be replaced.",
  replace: "Replace", cancel: "Cancel", copiedToEditor: "The code from the canvas is now in the editor", codeCopied: "Code copied. Paste it into a .py file in VS Code.", copyFailed: "Copy did not work here. Select the code and press Ctrl+C.",
  plotAlt: "Plot made by your program", noProblems: "No problems found.", lineN: n => `line ${n}`,
  pyLoading: "Loading Python (Pyodide). The first time takes a few seconds…", pyReady: v => `Python ready (Pyodide ${v})`, pyRunning: "Running…", pyError: m => `Python could not load: ${m}`,
  pyIdle: "Python loads the first time you run or check code.", pyFirstLoad: "Loading Python in your browser. This takes a few seconds the first time.",
  noInput: "input() cannot read the keyboard here. It returns nothing.", stopped: "Stopped. Python will restart the next time you run.", finished: s => `Finished in ${s} s`,
  pyLoadFail: m => `Python could not run: ${m}. Check your internet connection and try again.`, emptyCode: "The editor is empty.", checking: "Checking the code…",
  syntaxErr: n => `Syntax error on line ${n}:`, syntaxOkOnly: "No syntax errors. (The extra checker could not load, so only the syntax was checked.)", checkClean: "No syntax errors and no warnings.",
  checkWarn: n => n === 1 ? "No syntax errors, but 1 warning. See Problems." : `No syntax errors, but ${n} warnings. See Problems.`,
  hintModule: "Only libraries that Pyodide provides can be imported here, such as numpy, matplotlib, pandas and scipy. In VS Code you can install others with pip.",
  hintName: "A name is used before it has a value. Check the spelling, and check that the line that creates it runs first.",
  hintIndent: "Python uses indentation to group lines. Lines in the same block need the same number of spaces (4 per level).",
  hintSyntax: "Look for a missing parenthesis, colon or quote on that line or the line above.", hintType: "Two values of the wrong kind were combined, for example a number and a string, or a function called with the wrong arguments.",
  hintShape: "The shapes of two arrays do not fit together. Print .shape of each array to see them.", hintZero: "Something was divided by zero.", hintInput: "input() is not available in the browser. Put the value directly in the code.",
  // files
  savedFile: f => `Downloaded ${f}`, pngFailed: "The image could not be made in this browser. Try the .svg export.", zipFailed: "The zip tool could not load. Check your internet connection.",
  noDesignInImage: "This image does not contain a Network Studio design. Only images exported from Network Studio can be opened.", unknownFile: "Open a .json, .png or .svg design, or a .py file.",
  opened: f => `Opened ${f}`, pyImported: f => `${f} is in the editor`, pyHasDesignTitle: "Redraw the network too?", pyHasDesign: "This script was exported from Network Studio and includes its drawing. Do you also want to open the network on the canvas?",
  redraw: "Open on canvas", notNow: "Not now", redrawn: "Network opened on the canvas", newMade: "New design. Ctrl+Z brings back the previous one.",
  snapOn: "Snap to grid on", snapOff: "Snap to grid off",
  nbIntro: "Made with Network Studio. Run the cells from top to bottom.",
  readme: (title, hasEdits) => `# ${title}\n\nExported from Network Studio.\n\n## Files\n\n- network.py: the program written from the canvas\n${hasEdits ? "- my_code.py: your own version from the editor\n" : ""}- network.ipynb: the same program as a Jupyter notebook\n- design.json: the drawing. Open it again in Network Studio with File > Open design\n- network.png: a picture of the network (it can also be opened in Network Studio)\n- requirements.txt: the Python libraries the program needs\n\n## Run it in Visual Studio Code\n\n1. Install Python 3 and VS Code with the Python extension.\n2. Unzip this folder. In VS Code choose File > Open Folder and pick it.\n3. Open the terminal (View > Terminal) and type:  pip install -r requirements.txt\n4. Run the program:  python network.py\n   Or open network.ipynb and click Run All.\n\nThe program starts from the same random weights as the web page, so it prints the same numbers.\n`
};

const ES = {
  file: "Archivo", mNew: "Nuevo diseño", mOpen: "Abrir diseño…", mSave: "Guardar diseño (.json)", mImportPy: "Importar script de Python…", mTemplates: "Ver plantillas", mHelp: "Ayuda y atajos",
  undo: "Deshacer (Ctrl+Z)", redo: "Rehacer (Ctrl+Shift+Z)", designName: "Nombre del diseño", themeToggle: "Claro u oscuro", help: "Ayuda",
  export: "Exportar", exNetwork: "Red", exPng: "Imagen (.png)", exSvg: "Imagen vectorial (.svg)", exJson: "Archivo de diseño (.json)", exCode: "Código Python",
  exPyLive: "Script del lienzo (.py)", exPyEditor: "Script del editor (.py)", exIpynb: "Notebook de Jupyter (.ipynb)", exZip: "Proyecto para VS Code (.zip)",
  code: "Código", rlTraining: "Entrenar", rlInspect: "Detalles", pElements: "Elementos", pTemplates: "Plantillas", pData: "Datos", pTraining: "Entrenamiento", pInspect: "Inspeccionar", closePanel: "Cerrar panel",
  rename: "Renombrar", toolSelect: "Seleccionar (V)", toolHand: "Mover la vista (H, o mantén Espacio)", tidy: "Ordenar", showValues: "Mostrar valores de las neuronas", snap: "Ajustar a la cuadrícula",
  train: "Entrenar", step: "Paso", walk: "Recorrer", stepTitle: "Ejecutar la siguiente línea del ciclo de entrenamiento (S)", walkTitle: "Recorrer el ciclo paso a paso automáticamente", resetTitle: "Empezar de nuevo con pesos aleatorios nuevos", speed: "Velocidad",
  results: "Resultados", lossOverEpochs: "Pérdida por época", zoomOut: "Alejar", zoomIn: "Acercar", zoomReset: "Volver a 100%", zoomFit: "Ajustar a la pantalla", showCode: "Mostrar código", resizeCode: "Arrastra para cambiar el ancho del panel de código",
  liveCode: "Código en vivo", editor: "Editor", hideCode: "Ocultar el panel de código (\\)", codeStyle: "Estilo del código", styleNeuron: "Neurona por neurona", styleMatrix: "Matricial",
  styleMatrixTitle: "Agrupar las neuronas de cada columna en matrices de pesos", copy: "Copiar", openInEditor: "Abrir en el editor", runPython: "Ejecutar en Python",
  simConsole: "Consola del entrenamiento", variables: "Variables", run: "Ejecutar", runTitle: "Ejecutar el programa (Ctrl+Enter)", stop: "Detener", check: "Revisar", checkTitle: "Compilar y buscar errores sin ejecutar",
  fromCanvas: "Reemplazar con el código del lienzo", importPy: "Importar un archivo .py", exportPy: "Descargar como .py", edSettings: "Ajustes del editor", codeTheme: "Tema de colores", themeAuto: "Igual que la app",
  fontSize: "Tamaño de letra", wordWrap: "Ajustar líneas largas", minimap: "Mostrar minimapa", output: "Salida", problems: "Problemas", clearOutput: "Borrar la salida", helpTitle: "Ayuda",
  close: "Cerrar", dropHere: "Suelta un diseño (.json, .png, .svg) o un archivo de Python (.py)",
  untitled: "Red sin título", savedLocal: "Guardado en este navegador", undone: "Deshecho", redone: "Rehecho", emptyHint: "Arrastra neuronas ocultas y de salida desde Elementos",
  welcome: "Bienvenido a Network Studio. Pulsa ? en cualquier momento para ver la ayuda.",
  newNote: "Escribe una nota", allInputs: n => `Estos datos tienen ${n} entradas y todas ya están en el lienzo.`, oneOutput: "Ya hay una salida. La red da una respuesta por ejemplo, así que necesita exactamente una neurona de salida.",
  rAddedInput: n => `Entrada ${n} agregada`, rAddedHidden: n => `${n} agregada`, rAddedOutput: "Salida agregada", rAddedLayer: n => `Capa de ${n} agregada`, rAddedArrow: (a, b) => `Flecha ${a} → ${b} agregada`,
  rDeleted: n => `${n} borrados`, rPasted: "Pegado", rConnected: n => `${n} flechas agregadas`, rAct: a => `Activación cambiada a ${a}`, rRenamed: (a, b) => `${a} ahora se llama ${b}`,
  rData: n => `Datos: ${n}`, rTraining: "Ajustes cambiados", rStyle: s => `Estilo del código: ${s}`, rSeed: "Pesos iniciales aleatorios nuevos", rReset: "Pesos aleatorios nuevos",
  eIntoInput: "Las flechas no pueden apuntar a una entrada. Las entradas solo contienen los datos.", eFromOutput: "La salida es el final de la red, así que no pueden salir flechas de ella.",
  eExists: "Estas dos neuronas ya están conectadas.", eLoop: "Esa flecha formaría un ciclo. En esta red las señales solo avanzan, de las entradas hacia la salida.",
  copyOnlyHidden: "Solo se pueden copiar neuronas ocultas y notas. Las entradas vienen de los datos y solo hay una salida.", copied: "Copiado", needColumns: "Selecciona neuronas en al menos dos columnas.",
  nothingToConnect: "Esas neuronas ya están conectadas donde se permite una flecha.", tidied: "Ordenado en columnas", inputNames: "Los nombres de las entradas vienen de los datos y no se pueden cambiar.",
  badDesign: "Ese archivo no es un diseño de Network Studio.", tplLoaded: "Plantilla cargada. Ctrl+Z recupera tu diseño anterior.",
  kindInput: "Entrada", kindHidden: "Oculta", kindOutput: "Salida", activation: "Activación", color: "Color", duplicate: "Duplicar", delete: "Borrar", weight: "peso",
  editText: "Editar texto", smaller: "Texto más pequeño", bigger: "Texto más grande", nSelected: n => `${n} seleccionados`, align: "Alinear", connect: "Conectar", connectTitle: "Conectar cada columna de neuronas seleccionadas con la siguiente",
  mixed: "Mezcla", autoColor: "Color por tipo", alLeft: "Alinear a la izquierda", alCenter: "Alinear centros", alRight: "Alinear a la derecha", alTop: "Alinear arriba", alMiddle: "Alinear al medio", alBottom: "Alinear abajo",
  alDistH: "Repartir horizontalmente", alDistV: "Repartir verticalmente", cmAddHidden: "Agregar neurona oculta aquí", cmAddNote: "Agregar nota aquí", paste: "Pegar", selectAll: "Seleccionar todo",
  problemsN: n => n === 1 ? "1 problema por corregir" : `${n} problemas por corregir`, ready: "Lista", summary: (i, h, e) => `${i} entradas, ${h} ocultas, 1 salida, ${e} ${e === 1 ? "flecha" : "flechas"}`, noIssues: "Sin problemas. La red está lista para entrenar.",
  liveMeta: n => `${n} líneas · escritas desde el lienzo`, linesChanged: n => n === 1 ? "1 línea cambió" : `${n} líneas cambiaron`, liveInvalid: "Corrige los problemas del lienzo para ver el código",
  notReady: "No está lista", epoch: "Época", loss: "Pérdida", pause: "Pausa", resume: "Seguir", trainAgain: "Entrenar otra vez", stopWalk: "Parar", paused: "En pausa", done: "Listo", line: "Línea",
  fixFirst: "Primero corrige los problemas del lienzo. Haz clic en el aviso rojo para verlos.", simHint: "Pulsa Entrenar, o Paso para ver el ciclo trabajar línea por línea.",
  simFix: "Termina la red en el lienzo para ejecutarla.", processDone: "Proceso terminado.", gradient: "gradiente", moreRows: n => `… ${n} filas más, una por ejemplo`,
  moreWeights: n => `… ${n} pesos más`, printSkip: (e, p) => `No se imprime nada: ${e} no es múltiplo de print_every (${p}).`, varsHint: "Pulsa Paso para ejecutar el ciclo de entrenamiento línea por línea. Aquí aparece el valor que crea cada línea.",
  hudIdle: "Sin entrenar. Pulsa Entrenar.", pressTrain: "Pulsa Entrenar para ver bajar la pérdida", testStrings: "Cadenas nuevas de prueba", people65: "personas: cerca de 65%", string: "Cadena", grammatical: "gramatical",
  notGrammatical: "no gramatical", yes: "sí", no: "no", truthTable: "Tabla de verdad", target: "Objetivo", decisionMap: "Lo que decide la red", missingInput: x => `${x} no está en el lienzo`,
  neurons: "Neuronas", allPlaced: "Todas colocadas", inputsLeft: n => `Faltan ${n}`, dragOrClick: "Arrastra o haz clic", alreadyHas: "Ya está", oneAnswer: "La respuesta", note: "Nota", forLabels: "Para etiquetas",
  buildLayer: "Crear una capa completa", neuronsCount: "Neuronas", lmFrom: "Conectar desde las neuronas seleccionadas", lmFromSub: n => n ? `${n} seleccionadas ahora` : "Primero selecciona neuronas, por ejemplo las entradas",
  lmTo: "Conectar a la salida", addLayer: "Agregar capa", quickTools: "Herramientas rápidas", tplIntro: "Empieza con una red ya hecha. Tu diseño actual queda en el historial para deshacer.",
  chooseData: "Elige los datos", dsLogic: "Compuerta lógica", logicGate: "Compuerta lógica", inputsN: "Entradas", clickTargets: "Haz clic en un objetivo para cambiarlo entre 0 y 1.",
  aglAbout: "Cada cadena se convierte en 10 números: si contiene cada par de letras (TX, TS, SX, …). Las cadenas de prueba son nuevas, así que su exactitud mide la generalización, como en Reber (1967).",
  trainStrings: "Cadenas de entrenamiento", about_circles: "La clase 0 está dentro de un círculo pequeño y la clase 1 en un anillo alrededor. Ninguna línea recta las separa, así que las neuronas ocultas deben doblar la frontera.",
  about_moons: "Dos medios círculos curvos que se enganchan entre sí. Una capa oculta pequeña puede aprender la frontera curva.",
  about_spiral: "Dos brazos que giran uno alrededor del otro. Es difícil: necesita dos capas ocultas y muchas épocas.",
  pointsInfo: n => `${n} puntos. Azul es la clase 1 y naranja la clase 0.`, showing: "Ejemplo que muestra el lienzo", showingSub: "Los valores de las neuronas en el lienzo usan este ejemplo",
  lossFn: "Función de pérdida", bce: "Entropía cruzada", mse: "Error cuadrático medio", lr: "Tasa de aprendizaje", epochs: "Épocas", seed: "Semilla aleatoria", newSeed: "Semilla aleatoria nueva",
  trHelp: "Cambiar un ajuste reescribe el código y vuelve a empezar con pesos aleatorios nuevos.", pythonCode: "Código Python", plotOpt: "Graficar la curva de pérdida", plotSub: "Agrega código de matplotlib que dibuja la pérdida después de entrenar",
  canvasView: "Lienzo", numbers: "Números", trainable: "Números entrenables", weights: "Pesos", biases: "Sesgos", examples: "Ejemplos", test: "de prueba", arrows: "Flechas",
  inspectHint: "Selecciona una neurona o una flecha para ver sus números y el código que la usa.", inspectMulti: "Selecciona una sola neurona o flecha para ver sus detalles.",
  noteInfo: "Las notas sirven para tus etiquetas y explicaciones. Se guardan con el diseño y aparecen en las imágenes, pero no en el código.",
  oneWeight: "un peso", edgeExplain: (a, b) => `Esta flecha multiplica el valor de ${a} por un peso antes de llegar a ${b}. El entrenamiento cambia el peso para que la pérdida baje.`,
  edgePos: (a, b) => `Es positivo, así que un ${a} más grande sube a ${b}.`, edgeNeg: (a, b) => `Es negativo, así que un ${a} más grande baja a ${b}.`,
  kind_input: "neurona de entrada", kind_hidden: "neurona oculta", kind_output: "neurona de salida",
  inputExplain: f => `Contiene un número de cada ejemplo: la columna ${f} de los datos. No hace ningún cálculo.`, inputAgl: c => `Vale 1 cuando la cadena contiene "${c}" y 0 cuando no.`,
  valueShown: "Valor para el ejemplo mostrado", sendsN: n => `Envía su valor por ${n} ${n === 1 ? "flecha" : "flechas"}.`, ignoredInput: "Todavía no tiene flechas, así que la red la ignora.",
  outputExplain: "La salida usa una sigmoide, así que su valor está entre 0 y 1: la estimación de la red de que la respuesta es 1. Más de 0.5 cuenta como sí.",
  bias: "Sesgo", incoming: "Pesos que llegan", noIncoming: "Todavía no llega ninguna flecha a esta neurona.", sendsTo: list => `Envía su valor a ${list}.`, sendsNowhere: "Todavía no envía su valor a ningún lado.",
  ciWeights: "sus pesos de entrada", ciBias: "su sesgo", ciAct: "su activación para cada ejemplo",
  editorDiffers: "El editor tiene tus propios cambios", replaceTitle: "¿Reemplazar el código del editor?", replaceText: "El editor tiene cambios que no están en el código del lienzo. Se van a reemplazar.",
  replace: "Reemplazar", cancel: "Cancelar", copiedToEditor: "El código del lienzo ya está en el editor", codeCopied: "Código copiado. Pégalo en un archivo .py en VS Code.", copyFailed: "No se pudo copiar aquí. Selecciona el código y pulsa Ctrl+C.",
  plotAlt: "Gráfica hecha por tu programa", noProblems: "No se encontraron problemas.", lineN: n => `línea ${n}`,
  pyLoading: "Cargando Python (Pyodide). La primera vez tarda unos segundos…", pyReady: v => `Python listo (Pyodide ${v})`, pyRunning: "Ejecutando…", pyError: m => `Python no pudo cargar: ${m}`,
  pyIdle: "Python se carga la primera vez que ejecutas o revisas el código.", pyFirstLoad: "Cargando Python en tu navegador. La primera vez tarda unos segundos.",
  noInput: "input() no puede leer el teclado aquí. No devuelve nada.", stopped: "Detenido. Python se reiniciará la próxima vez que ejecutes.", finished: s => `Terminó en ${s} s`,
  pyLoadFail: m => `Python no pudo ejecutarse: ${m}. Revisa tu conexión a internet e inténtalo de nuevo.`, emptyCode: "El editor está vacío.", checking: "Revisando el código…",
  syntaxErr: n => `Error de sintaxis en la línea ${n}:`, syntaxOkOnly: "Sin errores de sintaxis. (El revisor adicional no pudo cargar, así que solo se revisó la sintaxis.)", checkClean: "Sin errores de sintaxis y sin advertencias.",
  checkWarn: n => n === 1 ? "Sin errores de sintaxis, pero hay 1 advertencia. Mira Problemas." : `Sin errores de sintaxis, pero hay ${n} advertencias. Mira Problemas.`,
  hintModule: "Aquí solo se pueden importar las bibliotecas que ofrece Pyodide, como numpy, matplotlib, pandas y scipy. En VS Code puedes instalar otras con pip.",
  hintName: "Se usa un nombre antes de que tenga un valor. Revisa cómo está escrito y que la línea que lo crea se ejecute antes.",
  hintIndent: "Python usa la sangría para agrupar líneas. Las líneas del mismo bloque necesitan el mismo número de espacios (4 por nivel).",
  hintSyntax: "Busca un paréntesis, dos puntos o comillas que falten en esa línea o en la anterior.", hintType: "Se combinaron dos valores de tipos distintos, por ejemplo un número y un texto, o se llamó una función con argumentos incorrectos.",
  hintShape: "Las formas de dos arreglos no encajan. Imprime .shape de cada arreglo para verlas.", hintZero: "Algo se dividió entre cero.", hintInput: "input() no está disponible en el navegador. Pon el valor directamente en el código.",
  savedFile: f => `Se descargó ${f}`, pngFailed: "No se pudo crear la imagen en este navegador. Prueba exportar .svg.", zipFailed: "La herramienta de zip no pudo cargar. Revisa tu conexión a internet.",
  noDesignInImage: "Esta imagen no contiene un diseño de Network Studio. Solo se pueden abrir imágenes exportadas desde Network Studio.", unknownFile: "Abre un diseño .json, .png o .svg, o un archivo .py.",
  opened: f => `Se abrió ${f}`, pyImported: f => `${f} está en el editor`, pyHasDesignTitle: "¿Dibujar también la red?", pyHasDesign: "Este script se exportó desde Network Studio e incluye su dibujo. ¿Quieres abrir también la red en el lienzo?",
  redraw: "Abrir en el lienzo", notNow: "Ahora no", redrawn: "Red abierta en el lienzo", newMade: "Diseño nuevo. Ctrl+Z recupera el anterior.",
  snapOn: "Ajuste a la cuadrícula activado", snapOff: "Ajuste a la cuadrícula desactivado",
  nbIntro: "Hecho con Network Studio. Ejecuta las celdas de arriba hacia abajo.",
  readme: (title, hasEdits) => `# ${title}\n\nExportado desde Network Studio.\n\n## Archivos\n\n- network.py: el programa escrito desde el lienzo\n${hasEdits ? "- my_code.py: tu propia versión desde el editor\n" : ""}- network.ipynb: el mismo programa como notebook de Jupyter\n- design.json: el dibujo. Ábrelo otra vez en Network Studio con Archivo > Abrir diseño\n- network.png: una imagen de la red (también se puede abrir en Network Studio)\n- requirements.txt: las bibliotecas de Python que necesita el programa\n\n## Ejecutarlo en Visual Studio Code\n\n1. Instala Python 3 y VS Code con la extensión de Python.\n2. Descomprime esta carpeta. En VS Code elige Archivo > Abrir carpeta y selecciónala.\n3. Abre la terminal (Ver > Terminal) y escribe:  pip install -r requirements.txt\n4. Ejecuta el programa:  python network.py\n   O abre network.ipynb y haz clic en Ejecutar todo.\n\nEl programa empieza con los mismos pesos aleatorios que la página web, así que imprime los mismos números.\n`
};

const ACT_EXPLAIN = {
  en: { sigmoid: "Sigmoid squashes any number into the range 0 to 1. It is smooth, like a neuron's firing rate, but it learns slowly when values get very large or very small.",
        tanh: "Tanh squashes any number into the range -1 to 1. Because it is centered on 0, it often learns faster than sigmoid in hidden neurons.",
        relu: "ReLU keeps positive values and turns negative values into 0. It is fast and common in deep networks, but a neuron can get stuck at 0 and stop learning.",
        leaky: "Leaky ReLU is like ReLU, but negative values are shrunk to 1% instead of becoming 0, so the neuron never gets completely stuck.",
        linear: "Linear does no squashing: the neuron's output is its weighted sum. A network made only of linear neurons can only draw straight lines." },
  es: { sigmoid: "La sigmoide aplasta cualquier número al rango de 0 a 1. Es suave, como la frecuencia de disparo de una neurona, pero aprende despacio cuando los valores son muy grandes o muy pequeños.",
        tanh: "Tanh aplasta cualquier número al rango de -1 a 1. Como está centrada en 0, suele aprender más rápido que la sigmoide en las neuronas ocultas.",
        relu: "ReLU deja los valores positivos y convierte los negativos en 0. Es rápida y común en redes profundas, pero una neurona puede quedarse en 0 y dejar de aprender.",
        leaky: "Leaky ReLU es como ReLU, pero los valores negativos se reducen al 1% en lugar de volverse 0, así que la neurona nunca se queda totalmente atascada.",
        linear: "Lineal no aplasta nada: la salida de la neurona es su suma ponderada. Una red hecha solo de neuronas lineales solo puede trazar líneas rectas." }
};

function opHelp(op, r, G) {
  const es = cur === "es", V = n => G.V(n), node = id => G.byId.get(id), sp = r.spec;
  const lab = a => NS.core.ACT[a].label[cur];
  switch (op.kind) {
    case "for": return es ? `Empieza la época ${r.epoch}. Una época es una pasada por los ${r.n} ejemplos a la vez.` : `Start of epoch ${r.epoch}. One epoch is one pass over all ${r.n} examples at once.`;
    case "z": return es ? `${V(node(op.id))} multiplica cada valor que recibe por su peso, los suma y agrega su sesgo. Un número por ejemplo.` : `${V(node(op.id))} multiplies each incoming value by its weight, adds them up, and adds its bias. One number per example.`;
    case "a": { const n = node(op.id); return (es ? `${lab(n.act)} convierte la suma ponderada en la activación de ${V(n)}.` : `${lab(n.act)} turns the weighted sum into ${V(n)}'s activation.`) + (n.type === "output" ? (es ? " Esta es la respuesta de la red: la probabilidad de que la etiqueta sea 1." : " This is the network's answer: the chance that the label is 1.") : ""); }
    case "mz": return es ? "Cada neurona de esta columna suma sus entradas ponderadas más su sesgo, todas a la vez con una multiplicación de matrices. Una fila por ejemplo, una columna por neurona." : "Every neuron in this column adds up its weighted inputs plus its bias, all at once with one matrix multiplication. One row per example, one column per neuron.";
    case "ma": return es ? "La función de activación convierte cada suma ponderada en la salida de la neurona." : "The activation function turns each weighted sum into the neuron's output.";
    case "loss": return sp.loss === "bce" ? (es ? "Pérdida de entropía cruzada: un número que mide qué tan equivocadas están las salidas. Las respuestas equivocadas y seguras cuestan más. Menos es mejor." : "Cross-entropy loss: one number that measures how wrong the outputs are. Confident wrong answers cost the most. Lower is better.")
                                          : (es ? "Error cuadrático medio: el promedio de (salida - objetivo) al cuadrado. Menos es mejor." : "Mean squared error: the average of (output - target) squared. Lower is better.");
    case "d": { const n = node(op.id); return n.type === "output" ? (es ? "La señal de error en la salida: qué tan lejos está cada predicción de su objetivo." : "The error signal at the output: how far each prediction is from its target.")
      : (es ? `El error de ${V(n)}: los errores de las neuronas a las que alimenta, ponderados por sus flechas, por la pendiente de ${lab(n.act)}. Esto es la retropropagación.` : `${V(n)}'s error: the errors of the neurons it feeds, weighted by its arrows, times the slope of ${lab(n.act)}. This is backpropagation.`); }
    case "md": return op.g === G.matrix.L ? (es ? "La señal de error en la salida: qué tan lejos está cada predicción de su objetivo." : "The error signal at the output: how far each prediction is from its target.")
      : (es ? "El error regresa por la siguiente matriz de pesos y se escala por la pendiente de la activación. Esto es la retropropagación." : "The error flows backward through the next weight matrix and is scaled by the slope of the activation. This is backpropagation.");
    case "uw": { const e = G.edges.find(x => x.id === op.id), a = V(node(e.from)), b = V(node(e.to)); return es ? `Descenso del gradiente para una flecha. El gradiente es el valor de ${a} por el error de ${b}, sumado sobre los ejemplos. El peso da un pequeño paso (tasa de aprendizaje ${sp.lr}) en sentido contrario.` : `Gradient descent for one arrow. The gradient is ${a}'s value times ${b}'s error, summed over examples. The weight takes a small step (learning rate ${sp.lr}) the other way.`; }
    case "ub": return es ? `El sesgo de ${V(node(op.id))} da el mismo tipo de paso, usando su error sumado sobre los ejemplos.` : `The bias of ${V(node(op.id))} takes the same kind of small step, using its error summed over examples.`;
    case "mdW": return es ? "El gradiente de cada peso de esta matriz: valores que envían por errores que reciben." : "The gradient for every weight in this matrix: sending values times receiving errors.";
    case "mdb": return es ? "El gradiente de cada sesgo de esta columna: su error sumado sobre los ejemplos." : "The gradient for each bias in this column: its error summed over examples.";
    case "muW": return es ? `Descenso del gradiente: cada peso de la matriz da un pequeño paso (tasa de aprendizaje ${sp.lr}) cuesta abajo.` : `Gradient descent: every weight in the matrix takes a small step (learning rate ${sp.lr}) downhill.`;
    case "mub": return es ? "El mismo pequeño paso para los sesgos." : "The same small step for the biases.";
    case "print": return es ? `Cada ${sp.printEvery} épocas el programa imprime la pérdida y la exactitud.` : `Every ${sp.printEvery} epochs the program prints the loss and the accuracy.`;
  }
  return "";
}

/* ---------------- help content ---------------- */
const K = s => `<kbd>${s}</kbd>`;
const HELP = {
en: [
 { id: "start", title: "Getting started", html: `
  <p>Network Studio lets you design a neural network by drawing it. While you draw, the app writes the matching Python program, line by line. You can then edit that program, run it right here in the browser, and take it to Visual Studio Code.</p>
  <h4>The screen</h4>
  <ul>
   <li><b>Top bar.</b> The File menu, undo and redo, the design name, the language switch (EN / ES), light or dark mode, Help, Export, and the Code button that shows or hides the code panel.</li>
   <li><b>Left rail.</b> Opens the panels: Elements, Templates, Data, Training and Inspect. Click the same icon again to close its panel and get more room.</li>
   <li><b>Canvas.</b> The large area in the middle, where you build the network. At the top you find the tools and the training controls. The Results card sits at the bottom left, and the zoom controls at the bottom right.</li>
   <li><b>Code panel.</b> On the right. The <b>Live code</b> tab shows the program written from your drawing. The <b>Editor</b> tab is where you change and run Python. Drag its left edge to resize it, or hide it with ${K("\\")} to give the canvas the whole window.</li>
  </ul>
  <h4>Your first network in six steps</h4>
  <ol>
   <li>Open <b>Templates</b> and pick <i>Blank canvas</i>. You get the two inputs of the XOR data.</li>
   <li>Open <b>Elements</b> and drag two <b>Hidden</b> neurons and one <b>Output</b> neuron onto the canvas.</li>
   <li>Drag from the small dot on the right side of <code>x1</code> to a hidden neuron. That draws an arrow, and the arrow is one weight. Connect both inputs to both hidden neurons, and both hidden neurons to the output.</li>
   <li>Watch the <b>Live code</b> tab. Each new arrow adds lines, which flash green.</li>
   <li>When the status chip at the top left says <b>Ready</b>, press <b>Train</b>. The arrows change color and thickness as the weights learn, and the loss curve falls.</li>
   <li>Press <b>Run in Python</b> to run the same program for real, or <b>Export → VS Code project</b> to take it with you.</li>
  </ol>
  <div class="tip">Everything you do is saved in this browser automatically. To move a design to another computer, use <b>File → Save design</b> or export an image, which also contains the design.</div>` },
 { id: "canvas", title: "Designing on the canvas", html: `
  <h4>Adding things</h4>
  <ul>
   <li>Drag a card from <b>Elements</b> onto the canvas, or click the card to place it in the middle of the view.</li>
   <li>Double-click empty space to add a hidden neuron right there.</li>
   <li>Keys: ${K("N")} hidden neuron, ${K("I")} input, ${K("O")} output, ${K("T")} note, ${K("L")} a whole layer.</li>
   <li>Right-click the canvas for a menu with the same actions.</li>
  </ul>
  <h4>Drawing arrows</h4>
  <p>Every neuron except the output has a small dot on its right side. Drag from that dot and let go over another neuron. Arrows always point forward, from inputs toward the output. The app refuses an arrow that would point into an input, leave the output, repeat an existing arrow, or make a loop, and it tells you why.</p>
  <p>To wire many neurons at once, select two or more columns of neurons and choose <b>Connect</b> in the floating toolbar. Each column is connected to the next one.</p>
  <h4>Selecting and moving</h4>
  <ul>
   <li>Click to select. Hold ${K("Shift")} and click to add or remove items. Drag on empty space to draw a selection box.</li>
   <li>Drag selected items to move them. Pink guide lines appear when a neuron lines up with another one. With <b>Snap to grid</b> on, positions jump to a 12-pixel grid. Hold ${K("Alt")} while dragging to move freely.</li>
   <li>Arrow keys nudge the selection by 1 pixel, or 12 with ${K("Shift")}.</li>
   <li>When something is selected, a floating toolbar appears above it with the most useful actions: rename, activation, color, duplicate, delete, align and connect.</li>
  </ul>
  <h4>Moving around</h4>
  <ul>
   <li>Scroll to move the view. Hold ${K("Ctrl")} and scroll (or pinch on a trackpad) to zoom.</li>
   <li>Hold ${K("Space")} and drag, use the hand tool ${K("H")}, or drag with the middle mouse button to pan.</li>
   <li>${K("F")} fits the whole network on screen. <b>Tidy up</b> lines the neurons up in neat columns.</li>
  </ul>
  <h4>Notes</h4>
  <p>Notes are sticky labels for explanations, like "this layer detects corners". Double-click a note to edit its text. Use the floating toolbar to change its color and text size, and drag the handle on its right edge to change its width. Notes are saved in the design and appear in exported images, but they are not part of the code.</p>
  <h4>Building a whole layer</h4>
  <p>In <b>Elements → Build a whole layer</b>, choose how many neurons and which activation. If neurons are selected, the new layer is connected from them. It can also be connected to the output. For example, select the inputs, set 4 neurons, and click <b>Add layer</b>.</p>` },
 { id: "neurons", title: "Neurons, arrows and names", html: `
  <table><tr><th>Element</th><th>What it does</th></tr>
   <tr><td><b>Input</b> (rounded square)</td><td>Holds one column of the data, such as <code>x1</code>. It does no computing. The data decides how many inputs exist.</td></tr>
   <tr><td><b>Hidden</b> (circle)</td><td>Multiplies each incoming value by a weight, adds them up with a bias, and passes the sum through its activation function.</td></tr>
   <tr><td><b>Output</b> (double circle)</td><td>Works like a hidden neuron with a sigmoid activation. Its value, between 0 and 1, is the network's answer. Each network has exactly one output.</td></tr>
   <tr><td><b>Arrow</b></td><td>One weight. Blue arrows have positive weights, orange arrows negative ones. Thicker arrows have larger weights.</td></tr></table>
  <h4>Activation functions</h4>
  <table><tr><th>Name</th><th>Formula in the code</th><th>Range</th></tr>
   <tr><td>Sigmoid</td><td><code>1 / (1 + np.exp(-z))</code></td><td>0 to 1</td></tr>
   <tr><td>Tanh</td><td><code>np.tanh(z)</code></td><td>-1 to 1</td></tr>
   <tr><td>ReLU</td><td><code>np.maximum(0, z)</code></td><td>0 and up</td></tr>
   <tr><td>Leaky ReLU</td><td><code>np.where(z &gt; 0, z, 0.01 * z)</code></td><td>any</td></tr>
   <tr><td>Linear</td><td><code>z</code></td><td>any</td></tr></table>
  <h4>Names</h4>
  <p>Hidden neurons are called <code>h1</code>, <code>h2</code>, and so on, and the output is called <code>out</code>. Rename them with a double-click, ${K("Enter")}, or the name button in the floating toolbar. The new name appears everywhere in the code. A name must be a valid Python variable: letters, digits and <code>_</code>, starting with a letter, with no spaces or accents, and not a word the code already uses (such as <code>loss</code>).</p>
  <h4>Colors</h4>
  <p>The color button in the floating toolbar changes a neuron's ring color, which is useful to mark groups. The fill inside the neuron shows its current value for the example shown: blue for positive values, orange for negative ones, with stronger color for larger values. Turn the values off with the check-mark tool at the top left.</p>
  <h4>The status chip</h4>
  <p>The chip at the top left of the canvas says <b>Ready</b> when the network can be trained. Otherwise it is red and lists the problems, for example a hidden neuron that receives no arrow. Click the chip and then a problem to jump to the neuron. Neurons with problems have a dashed red ring.</p>` },
 { id: "data", title: "Data", html: `
  <p>Open the <b>Data</b> panel to choose what the network learns. Changing the data adds or removes input neurons as needed, and new inputs are wired like the existing ones.</p>
  <ul>
   <li><b>Logic gate.</b> A truth table with 2 or 3 inputs. Pick AND, OR, XOR, NAND, NOR, XNOR or Majority, or click any target in the table to invent your own gate. XOR is the classic example that needs a hidden layer (Minsky &amp; Papert, 1969).</li>
   <li><b>Circles, Two moons and Spiral.</b> Points on a plane with two inputs, <code>x1</code> and <code>x2</code>. The Results card draws the network's decision as a map, so you can see the boundary bend while it learns.</li>
   <li><b>Artificial grammar.</b> Letter strings from Reber's (1967) finite-state grammar. Each string becomes 10 inputs, one per two-letter chunk. The network is tested on new strings, and the Results card compares its accuracy with people's (about 65%).</li>
  </ul>
  <p><b>Example shown on the canvas</b> chooses which example feeds the neuron values you see on the canvas.</p>` },
 { id: "training", title: "Training and the simulation", html: `
  <h4>Settings (Training panel)</h4>
  <ul>
   <li><b>Loss function.</b> Cross-entropy (recommended for yes/no answers) or mean squared error.</li>
   <li><b>Learning rate.</b> How big each weight update is. If the loss jumps around, make it smaller. If it falls very slowly, make it larger.</li>
   <li><b>Epochs.</b> How many passes over all the data.</li>
   <li><b>Random seed.</b> Chooses the random starting weights. The same seed always gives the same start, so results can be repeated. Some starts get stuck. Try 🎲 for a new seed.</li>
  </ul>
  <h4>The training controls</h4>
  <ul>
   <li><b>Train</b> (${K("P")}) runs the whole training loop and animates it. Press again to pause.</li>
   <li><b>Step</b> (${K("S")}) runs exactly one line of the loop. That line lights up in the Live code, the neurons and arrows it uses glow on the canvas, and the <b>Variables</b> tab shows the numbers it produced.</li>
   <li><b>Walk</b> steps automatically at the chosen speed.</li>
   <li><b>Reset</b> starts again with fresh random weights.</li>
  </ul>
  <h4>The Results card</h4>
  <p>It shows the loss curve, plus a decision map (for 2 inputs), a truth table (for 3 inputs), or the test strings (for the grammar). Click its title bar to fold it away.</p>
  <div class="tip">The simulation runs the same steps, in the same order, as the Python program. The numbers in the training console are the numbers Python prints.</div>` },
 { id: "live", title: "Live code", html: `
  <p>The Live code tab always shows the complete program for the network on the canvas. It has six sections: data, activation functions, weights and biases, training settings, the training loop, and results. The comments are written in the language you choose at the top.</p>
  <ul>
   <li><b>Changes flash green.</b> When you add a neuron or an arrow, the new or changed lines flash, and the view scrolls to them.</li>
   <li><b>Code and canvas are linked.</b> Select a neuron or an arrow, and every line that uses it is highlighted. Hover over a line to see its neuron glow on the canvas. Click the line to select that neuron.</li>
   <li><b>Two styles.</b> <i>Neuron by neuron</i> gives every neuron and every arrow its own variable, so you can follow each one. <i>Matrix</i> groups each column into a weight matrix, which is how real deep-learning code is written. Matrix style needs neat columns, so every arrow must go to the next column and each column needs one activation. When that is not the case, the button explains why.</li>
  </ul>
  <p><b>Copy</b> copies the program. <b>Open in editor</b> puts it in the Editor tab so you can change it. <b>Run in Python</b> does that and runs it.</p>` },
 { id: "editor", title: "Editor: write and run Python", html: `
  <p>The Editor tab is a real code editor, the same one used in Visual Studio Code. It has the same colors for keywords, functions, strings, numbers, operators and matching brackets, and the same shortcuts (${K("Ctrl+F")} to find, ${K("Ctrl+/")} to comment out lines, ${K("Alt+↑")} / ${K("Alt+↓")} to move lines).</p>
  <ul>
   <li><b>Run</b> (${K("Ctrl+Enter")}) runs the program with real Python (Pyodide) inside your browser. Printed text appears in <b>Output</b>, and matplotlib plots appear as pictures.</li>
   <li><b>Stop</b> ends a program that is taking too long.</li>
   <li><b>Check</b> compiles the code without running it. It reports syntax errors and warnings, such as unused imports or names that were never defined, in the <b>Problems</b> tab. Click a problem to jump to its line.</li>
   <li>When the program fails, the error line is underlined in red, and the Output shows the Python traceback plus a 💡 hint in plain words.</li>
   <li>The ⟳ button replaces the editor text with the current code from the canvas. You can also import a <code>.py</code> file, download the editor text as <code>.py</code>, and change the color theme, font size, line wrapping and minimap with the ⚙ button.</li>
  </ul>
  <h4>What works in the browser</h4>
  <p>numpy, matplotlib, pandas, scipy, scikit-learn and the standard library can be imported, and they load the first time you use them. <code>input()</code> cannot read the keyboard here. The first run needs an internet connection and takes a few seconds while Python loads.</p>
  <p>Your editor text is saved in this browser. A small orange dot on the Editor tab means the editor has changes that differ from the canvas code.</p>` },
 { id: "files", title: "Import and export", html: `
  <table><tr><th>Format</th><th>What you get</th><th>Can be opened again?</th></tr>
   <tr><td>Image (.png)</td><td>A picture of the network with a white background, at double resolution</td><td>Yes. The design is stored inside the image.</td></tr>
   <tr><td>Vector image (.svg)</td><td>A sharp picture for slides and papers</td><td>Yes. The design is stored inside the file.</td></tr>
   <tr><td>Design file (.json)</td><td>Everything about the drawing, data and settings</td><td>Yes</td></tr>
   <tr><td>Script from the canvas (.py)</td><td>The Live code program</td><td>Yes. The editor gets the code, and the app offers to redraw the network.</td></tr>
   <tr><td>Script from the editor (.py)</td><td>Exactly what is in the editor</td><td>Into the editor</td></tr>
   <tr><td>Jupyter notebook (.ipynb)</td><td>The program split into one cell per section</td><td>Open it in VS Code or Jupyter</td></tr>
   <tr><td>VS Code project (.zip)</td><td>network.py, network.ipynb, design.json, network.png, requirements.txt and a README</td><td>Unzip and open the folder in VS Code</td></tr></table>
  <p>To open a file, use <b>File → Open design</b> (${K("Ctrl+O")}) or <b>File → Import Python script</b>, or simply drag the file onto the window.</p>` },
 { id: "vscode", title: "Running the code in VS Code", html: `
  <ol>
   <li>Install Python 3 from python.org and Visual Studio Code, then add the <b>Python</b> extension in VS Code.</li>
   <li>Choose <b>Export → VS Code project (.zip)</b> and unzip the file.</li>
   <li>In VS Code choose <b>File → Open Folder</b> and pick the unzipped folder.</li>
   <li>Open the terminal (<b>View → Terminal</b>) and type <code>pip install -r requirements.txt</code></li>
   <li>Type <code>python network.py</code>, or open <code>network.py</code> and press the ▶ button at the top right.</li>
  </ol>
  <p>The program starts from the same random weights as the web page, so it prints the same numbers you saw in the training console. In matrix style, or on very hard problems like the spiral, the last digit can differ slightly because computers round in slightly different ways.</p>` },
 { id: "keys", title: "Keyboard shortcuts", html: `
  <table><tr><th>Keys</th><th>Action</th></tr>
   <tr><td>${K("N")} ${K("I")} ${K("O")} ${K("T")} ${K("L")}</td><td>Add a hidden neuron, input, output, note or layer</td></tr>
   <tr><td>Double-click</td><td>Empty space: add a hidden neuron. Neuron: rename. Note: edit</td></tr>
   <tr><td>${K("Enter")}</td><td>Rename the selected neuron or edit the selected note</td></tr>
   <tr><td>${K("Delete")}</td><td>Delete the selection</td></tr>
   <tr><td>${K("Ctrl+Z")} / ${K("Ctrl+Shift+Z")}</td><td>Undo / redo</td></tr>
   <tr><td>${K("Ctrl+C")} ${K("Ctrl+X")} ${K("Ctrl+V")} ${K("Ctrl+D")}</td><td>Copy, cut, paste, duplicate</td></tr>
   <tr><td>${K("Ctrl+A")}</td><td>Select everything</td></tr>
   <tr><td>Arrow keys</td><td>Nudge 1 pixel (12 with ${K("Shift")})</td></tr>
   <tr><td>${K("V")} / ${K("H")} / hold ${K("Space")}</td><td>Select tool / hand tool / pan for a moment</td></tr>
   <tr><td>${K("Ctrl")} + scroll, ${K("Ctrl+=")}, ${K("Ctrl+-")}, ${K("Ctrl+0")}</td><td>Zoom in and out, back to 100%</td></tr>
   <tr><td>${K("F")}</td><td>Fit the network to the screen</td></tr>
   <tr><td>${K("P")} / ${K("S")}</td><td>Train or pause / step one line</td></tr>
   <tr><td>${K("\\")}</td><td>Show or hide the code panel</td></tr>
   <tr><td>${K("Ctrl+Enter")}</td><td>Run the editor code (inside the editor)</td></tr>
   <tr><td>${K("Ctrl+S")} / ${K("Ctrl+O")}</td><td>Save the design file / open a design</td></tr>
   <tr><td>${K("Alt+N")}</td><td>New design</td></tr>
   <tr><td>${K("?")}</td><td>This help</td></tr></table>
  <p>On a Mac, use ${K("Cmd")} instead of ${K("Ctrl")}.</p>` },
 { id: "tips", title: "Tips and troubleshooting", html: `
  <ul>
   <li><b>The loss stops at about 0.35 and accuracy stays at 50% or 75%.</b> The network is stuck. Change the random seed, add a hidden neuron, or use tanh instead of sigmoid in the hidden layer.</li>
   <li><b>The loss jumps up and down.</b> The learning rate is too large. Try half of it.</li>
   <li><b>A perceptron cannot learn XOR.</b> That is expected. A single neuron can only draw one straight line. Add a hidden layer, or shortcut arrows plus one hidden neuron.</li>
   <li><b>Python does not load.</b> The first run needs an internet connection. If your school network blocks the download, use <b>Export → VS Code project</b> and run the code on your computer.</li>
   <li><b>I lost my design.</b> Designs are saved per browser. Press ${K("Ctrl+Z")} to step back, and use File → Save design to keep copies.</li>
   <li><b>The image I exported will not open as a design.</b> Only images exported from Network Studio contain the design. Messaging apps that compress images may remove it, so share the .json file instead.</li>
  </ul>` },
 { id: "math", title: "The math in one page", html: `
  <p>For each neuron, the forward pass computes a weighted sum and an activation:</p>
  <p><code>z = w1 * input1 + w2 * input2 + … + b</code> and then <code>a = activation(z)</code></p>
  <p>The output <code>out</code> is a number between 0 and 1. The <b>loss</b> measures how far the outputs are from the targets <code>y</code>. With cross-entropy it is <code>-mean(y·log(out) + (1−y)·log(1−out))</code>.</p>
  <p><b>Backpropagation</b> works backward from the output. The error at the output is <code>(out − y) / n</code>. A hidden neuron's error is the sum of the errors of the neurons it feeds, each multiplied by the weight of its arrow, times the slope of its own activation.</p>
  <p><b>Gradient descent</b> then changes every weight a little: <code>w = w − learning_rate × sum(sending value × receiving error)</code>, and every bias by <code>b = b − learning_rate × sum(error)</code>. Repeating this for many epochs makes the loss smaller, step by step.</p>` }
],
es: [
 { id: "start", title: "Primeros pasos", html: `
  <p>Network Studio te permite diseñar una red neuronal dibujándola. Mientras dibujas, la app escribe el programa de Python correspondiente, línea por línea. Después puedes editar ese programa, ejecutarlo aquí mismo en el navegador y llevarlo a Visual Studio Code.</p>
  <h4>La pantalla</h4>
  <ul>
   <li><b>Barra superior.</b> El menú Archivo, deshacer y rehacer, el nombre del diseño, el cambio de idioma (EN / ES), el modo claro u oscuro, Ayuda, Exportar y el botón Código, que muestra u oculta el panel de código.</li>
   <li><b>Barra izquierda.</b> Abre los paneles: Elementos, Plantillas, Datos, Entrenamiento e Inspeccionar. Haz clic otra vez en el mismo icono para cerrar su panel y tener más espacio.</li>
   <li><b>Lienzo.</b> El área grande del centro, donde construyes la red. Arriba están las herramientas y los controles de entrenamiento. La tarjeta de Resultados está abajo a la izquierda y el zoom abajo a la derecha.</li>
   <li><b>Panel de código.</b> A la derecha. La pestaña <b>Código en vivo</b> muestra el programa escrito desde tu dibujo. La pestaña <b>Editor</b> es donde cambias y ejecutas Python. Arrastra su borde izquierdo para cambiar el ancho, u ocúltalo con ${K("\\")} para darle toda la ventana al lienzo.</li>
  </ul>
  <h4>Tu primera red en seis pasos</h4>
  <ol>
   <li>Abre <b>Plantillas</b> y elige <i>Lienzo en blanco</i>. Aparecen las dos entradas de los datos XOR.</li>
   <li>Abre <b>Elementos</b> y arrastra dos neuronas <b>Ocultas</b> y una de <b>Salida</b> al lienzo.</li>
   <li>Arrastra desde el puntito del lado derecho de <code>x1</code> hasta una neurona oculta. Eso dibuja una flecha, y la flecha es un peso. Conecta las dos entradas con las dos ocultas, y las dos ocultas con la salida.</li>
   <li>Mira la pestaña <b>Código en vivo</b>. Cada flecha nueva agrega líneas, que se iluminan en verde.</li>
   <li>Cuando el aviso de arriba a la izquierda diga <b>Lista</b>, pulsa <b>Entrenar</b>. Las flechas cambian de color y grosor mientras los pesos aprenden, y la curva de pérdida baja.</li>
   <li>Pulsa <b>Ejecutar en Python</b> para ejecutar el mismo programa de verdad, o <b>Exportar → Proyecto para VS Code</b> para llevártelo.</li>
  </ol>
  <div class="tip">Todo lo que haces se guarda automáticamente en este navegador. Para llevar un diseño a otra computadora, usa <b>Archivo → Guardar diseño</b> o exporta una imagen, que también contiene el diseño.</div>` },
 { id: "canvas", title: "Diseñar en el lienzo", html: `
  <h4>Agregar cosas</h4>
  <ul>
   <li>Arrastra una tarjeta de <b>Elementos</b> al lienzo, o haz clic en la tarjeta para ponerla en el centro de la vista.</li>
   <li>Haz doble clic en un espacio vacío para agregar ahí una neurona oculta.</li>
   <li>Teclas: ${K("N")} neurona oculta, ${K("I")} entrada, ${K("O")} salida, ${K("T")} nota, ${K("L")} una capa completa.</li>
   <li>Haz clic derecho en el lienzo para ver un menú con las mismas acciones.</li>
  </ul>
  <h4>Dibujar flechas</h4>
  <p>Cada neurona, menos la salida, tiene un puntito en su lado derecho. Arrastra desde ese punto y suelta sobre otra neurona. Las flechas siempre apuntan hacia adelante, de las entradas hacia la salida. La app rechaza una flecha que apunte a una entrada, que salga de la salida, que repita una flecha existente o que forme un ciclo, y te dice por qué.</p>
  <p>Para conectar muchas neuronas a la vez, selecciona dos o más columnas de neuronas y elige <b>Conectar</b> en la barra flotante. Cada columna se conecta con la siguiente.</p>
  <h4>Seleccionar y mover</h4>
  <ul>
   <li>Haz clic para seleccionar. Mantén ${K("Shift")} y haz clic para agregar o quitar elementos. Arrastra en un espacio vacío para dibujar un recuadro de selección.</li>
   <li>Arrastra lo seleccionado para moverlo. Aparecen guías rosas cuando una neurona se alinea con otra. Con <b>Ajustar a la cuadrícula</b> activado, las posiciones saltan a una cuadrícula de 12 píxeles. Mantén ${K("Alt")} al arrastrar para moverte libremente.</li>
   <li>Las flechas del teclado mueven la selección 1 píxel, o 12 con ${K("Shift")}.</li>
   <li>Cuando algo está seleccionado, aparece encima una barra flotante con las acciones más útiles: renombrar, activación, color, duplicar, borrar, alinear y conectar.</li>
  </ul>
  <h4>Moverse por el lienzo</h4>
  <ul>
   <li>Desplázate con la rueda para mover la vista. Mantén ${K("Ctrl")} y usa la rueda (o pellizca en el touchpad) para hacer zoom.</li>
   <li>Mantén ${K("Espacio")} y arrastra, usa la herramienta mano ${K("H")}, o arrastra con el botón central del ratón.</li>
   <li>${K("F")} ajusta toda la red a la pantalla. <b>Ordenar</b> alinea las neuronas en columnas.</li>
  </ul>
  <h4>Notas</h4>
  <p>Las notas son etiquetas para explicaciones, como "esta capa detecta esquinas". Haz doble clic en una nota para editar su texto. Usa la barra flotante para cambiar su color y el tamaño del texto, y arrastra el control de su borde derecho para cambiar el ancho. Las notas se guardan en el diseño y aparecen en las imágenes exportadas, pero no forman parte del código.</p>
  <h4>Crear una capa completa</h4>
  <p>En <b>Elementos → Crear una capa completa</b>, elige cuántas neuronas y qué activación. Si hay neuronas seleccionadas, la capa nueva se conecta desde ellas. También se puede conectar a la salida. Por ejemplo, selecciona las entradas, pon 4 neuronas y haz clic en <b>Agregar capa</b>.</p>` },
 { id: "neurons", title: "Neuronas, flechas y nombres", html: `
  <table><tr><th>Elemento</th><th>Qué hace</th></tr>
   <tr><td><b>Entrada</b> (cuadro redondeado)</td><td>Contiene una columna de los datos, como <code>x1</code>. No hace cálculos. Los datos deciden cuántas entradas hay.</td></tr>
   <tr><td><b>Oculta</b> (círculo)</td><td>Multiplica cada valor que recibe por un peso, los suma con un sesgo y pasa la suma por su función de activación.</td></tr>
   <tr><td><b>Salida</b> (círculo doble)</td><td>Funciona como una neurona oculta con activación sigmoide. Su valor, entre 0 y 1, es la respuesta de la red. Cada red tiene exactamente una salida.</td></tr>
   <tr><td><b>Flecha</b></td><td>Un peso. Las flechas azules tienen pesos positivos y las naranjas negativos. Las más gruesas tienen pesos más grandes.</td></tr></table>
  <h4>Funciones de activación</h4>
  <table><tr><th>Nombre</th><th>Fórmula en el código</th><th>Rango</th></tr>
   <tr><td>Sigmoide</td><td><code>1 / (1 + np.exp(-z))</code></td><td>0 a 1</td></tr>
   <tr><td>Tanh</td><td><code>np.tanh(z)</code></td><td>-1 a 1</td></tr>
   <tr><td>ReLU</td><td><code>np.maximum(0, z)</code></td><td>0 o más</td></tr>
   <tr><td>Leaky ReLU</td><td><code>np.where(z &gt; 0, z, 0.01 * z)</code></td><td>cualquiera</td></tr>
   <tr><td>Lineal</td><td><code>z</code></td><td>cualquiera</td></tr></table>
  <h4>Nombres</h4>
  <p>Las neuronas ocultas se llaman <code>h1</code>, <code>h2</code>, etc., y la salida se llama <code>out</code>. Cámbiales el nombre con doble clic, ${K("Enter")} o el botón de nombre de la barra flotante. El nombre nuevo aparece en todo el código. Debe ser una variable válida de Python: letras, dígitos y <code>_</code>, empezando con una letra, sin espacios ni acentos, y no puede ser una palabra que el código ya usa (como <code>loss</code>).</p>
  <h4>Colores</h4>
  <p>El botón de color de la barra flotante cambia el color del aro de una neurona, útil para marcar grupos. El relleno dentro de la neurona muestra su valor actual para el ejemplo mostrado: azul para valores positivos, naranja para negativos, más intenso cuanto más grande. Apaga los valores con la herramienta de palomita de arriba a la izquierda.</p>
  <h4>El aviso de estado</h4>
  <p>El aviso de arriba a la izquierda dice <b>Lista</b> cuando la red se puede entrenar. Si no, aparece en rojo y lista los problemas, por ejemplo una neurona oculta que no recibe ninguna flecha. Haz clic en el aviso y luego en un problema para ir a la neurona. Las neuronas con problemas tienen un aro rojo punteado.</p>` },
 { id: "data", title: "Datos", html: `
  <p>Abre el panel <b>Datos</b> para elegir qué aprende la red. Al cambiar los datos se agregan o quitan neuronas de entrada, y las entradas nuevas se conectan como las que ya existían.</p>
  <ul>
   <li><b>Compuerta lógica.</b> Una tabla de verdad con 2 o 3 entradas. Elige AND, OR, XOR, NAND, NOR, XNOR o Mayoría, o haz clic en cualquier objetivo de la tabla para inventar tu propia compuerta. XOR es el ejemplo clásico que necesita una capa oculta (Minsky y Papert, 1969).</li>
   <li><b>Círculos, Dos lunas y Espiral.</b> Puntos en un plano con dos entradas, <code>x1</code> y <code>x2</code>. La tarjeta de Resultados dibuja la decisión de la red como un mapa, así puedes ver cómo se dobla la frontera mientras aprende.</li>
   <li><b>Gramática artificial.</b> Cadenas de letras de la gramática de estados finitos de Reber (1967). Cada cadena se convierte en 10 entradas, una por cada par de letras. La red se prueba con cadenas nuevas, y la tarjeta de Resultados compara su exactitud con la de las personas (cerca de 65%).</li>
  </ul>
  <p><b>Ejemplo que muestra el lienzo</b> elige qué ejemplo alimenta los valores de las neuronas que ves en el lienzo.</p>` },
 { id: "training", title: "Entrenamiento y simulación", html: `
  <h4>Ajustes (panel Entrenamiento)</h4>
  <ul>
   <li><b>Función de pérdida.</b> Entropía cruzada (recomendada para respuestas de sí o no) o error cuadrático medio.</li>
   <li><b>Tasa de aprendizaje.</b> Qué tan grande es cada ajuste de los pesos. Si la pérdida salta, hazla más pequeña. Si baja muy despacio, hazla más grande.</li>
   <li><b>Épocas.</b> Cuántas pasadas por todos los datos.</li>
   <li><b>Semilla aleatoria.</b> Elige los pesos iniciales aleatorios. La misma semilla siempre da el mismo inicio, así los resultados se pueden repetir. Algunos inicios se atascan. Prueba 🎲 para una semilla nueva.</li>
  </ul>
  <h4>Los controles de entrenamiento</h4>
  <ul>
   <li><b>Entrenar</b> (${K("P")}) ejecuta todo el ciclo de entrenamiento con animación. Púlsalo otra vez para pausar.</li>
   <li><b>Paso</b> (${K("S")}) ejecuta exactamente una línea del ciclo. Esa línea se ilumina en el Código en vivo, las neuronas y flechas que usa brillan en el lienzo, y la pestaña <b>Variables</b> muestra los números que produjo.</li>
   <li><b>Recorrer</b> avanza paso a paso automáticamente a la velocidad elegida.</li>
   <li><b>Reiniciar</b> empieza otra vez con pesos aleatorios nuevos.</li>
  </ul>
  <h4>La tarjeta de Resultados</h4>
  <p>Muestra la curva de pérdida, más un mapa de decisión (con 2 entradas), una tabla de verdad (con 3 entradas) o las cadenas de prueba (con la gramática). Haz clic en su título para plegarla.</p>
  <div class="tip">La simulación ejecuta los mismos pasos, en el mismo orden, que el programa de Python. Los números de la consola de entrenamiento son los que imprime Python.</div>` },
 { id: "live", title: "Código en vivo", html: `
  <p>La pestaña Código en vivo siempre muestra el programa completo de la red del lienzo. Tiene seis secciones: datos, funciones de activación, pesos y sesgos, ajustes de entrenamiento, el ciclo de entrenamiento y resultados. Los comentarios se escriben en el idioma que eliges arriba.</p>
  <ul>
   <li><b>Los cambios se iluminan en verde.</b> Cuando agregas una neurona o una flecha, las líneas nuevas o cambiadas se iluminan y la vista se mueve hacia ellas.</li>
   <li><b>Código y lienzo están conectados.</b> Selecciona una neurona o una flecha y se resaltan todas las líneas que la usan. Pasa el cursor sobre una línea y su neurona brilla en el lienzo. Haz clic en la línea para seleccionar esa neurona.</li>
   <li><b>Dos estilos.</b> <i>Neurona por neurona</i> le da a cada neurona y a cada flecha su propia variable, para que puedas seguir cada una. <i>Matricial</i> agrupa cada columna en una matriz de pesos, como se escribe el código real de aprendizaje profundo. El estilo matricial necesita columnas ordenadas, así que cada flecha debe ir a la columna siguiente y cada columna necesita una sola activación. Cuando no es así, el botón explica por qué.</li>
  </ul>
  <p><b>Copiar</b> copia el programa. <b>Abrir en el editor</b> lo pone en la pestaña Editor para que lo cambies. <b>Ejecutar en Python</b> hace eso y lo ejecuta.</p>` },
 { id: "editor", title: "Editor: escribir y ejecutar Python", html: `
  <p>La pestaña Editor es un editor de código real, el mismo que usa Visual Studio Code. Tiene los mismos colores para palabras clave, funciones, textos, números, operadores y paréntesis que se corresponden, y los mismos atajos (${K("Ctrl+F")} para buscar, ${K("Ctrl+/")} para comentar líneas, ${K("Alt+↑")} / ${K("Alt+↓")} para mover líneas).</p>
  <ul>
   <li><b>Ejecutar</b> (${K("Ctrl+Enter")}) ejecuta el programa con Python real (Pyodide) dentro de tu navegador. El texto impreso aparece en <b>Salida</b>, y las gráficas de matplotlib aparecen como imágenes.</li>
   <li><b>Detener</b> termina un programa que está tardando demasiado.</li>
   <li><b>Revisar</b> compila el código sin ejecutarlo. Informa errores de sintaxis y advertencias, como importaciones sin usar o nombres que nunca se definieron, en la pestaña <b>Problemas</b>. Haz clic en un problema para ir a su línea.</li>
   <li>Cuando el programa falla, la línea del error se subraya en rojo, y la Salida muestra el traceback de Python más una pista 💡 en palabras sencillas.</li>
   <li>El botón ⟳ reemplaza el texto del editor con el código actual del lienzo. También puedes importar un archivo <code>.py</code>, descargar el texto del editor como <code>.py</code> y cambiar el tema de colores, el tamaño de letra, el ajuste de líneas y el minimapa con el botón ⚙.</li>
  </ul>
  <h4>Qué funciona en el navegador</h4>
  <p>Se pueden importar numpy, matplotlib, pandas, scipy, scikit-learn y la biblioteca estándar, que se cargan la primera vez que los usas. <code>input()</code> no puede leer el teclado aquí. La primera ejecución necesita conexión a internet y tarda unos segundos mientras carga Python.</p>
  <p>El texto del editor se guarda en este navegador. Un puntito naranja en la pestaña Editor significa que el editor tiene cambios distintos al código del lienzo.</p>` },
 { id: "files", title: "Importar y exportar", html: `
  <table><tr><th>Formato</th><th>Qué obtienes</th><th>¿Se puede volver a abrir?</th></tr>
   <tr><td>Imagen (.png)</td><td>Una imagen de la red con fondo blanco, al doble de resolución</td><td>Sí. El diseño va guardado dentro de la imagen.</td></tr>
   <tr><td>Imagen vectorial (.svg)</td><td>Una imagen nítida para presentaciones y artículos</td><td>Sí. El diseño va guardado dentro del archivo.</td></tr>
   <tr><td>Archivo de diseño (.json)</td><td>Todo el dibujo, los datos y los ajustes</td><td>Sí</td></tr>
   <tr><td>Script del lienzo (.py)</td><td>El programa del Código en vivo</td><td>Sí. El editor recibe el código y la app ofrece volver a dibujar la red.</td></tr>
   <tr><td>Script del editor (.py)</td><td>Exactamente lo que hay en el editor</td><td>En el editor</td></tr>
   <tr><td>Notebook de Jupyter (.ipynb)</td><td>El programa dividido en una celda por sección</td><td>Ábrelo en VS Code o Jupyter</td></tr>
   <tr><td>Proyecto para VS Code (.zip)</td><td>network.py, network.ipynb, design.json, network.png, requirements.txt y un README</td><td>Descomprime y abre la carpeta en VS Code</td></tr></table>
  <p>Para abrir un archivo usa <b>Archivo → Abrir diseño</b> (${K("Ctrl+O")}) o <b>Archivo → Importar script de Python</b>, o simplemente arrastra el archivo a la ventana.</p>` },
 { id: "vscode", title: "Ejecutar el código en VS Code", html: `
  <ol>
   <li>Instala Python 3 desde python.org y Visual Studio Code, y agrega la extensión <b>Python</b> en VS Code.</li>
   <li>Elige <b>Exportar → Proyecto para VS Code (.zip)</b> y descomprime el archivo.</li>
   <li>En VS Code elige <b>Archivo → Abrir carpeta</b> y selecciona la carpeta descomprimida.</li>
   <li>Abre la terminal (<b>Ver → Terminal</b>) y escribe <code>pip install -r requirements.txt</code></li>
   <li>Escribe <code>python network.py</code>, o abre <code>network.py</code> y pulsa el botón ▶ de arriba a la derecha.</li>
  </ol>
  <p>El programa empieza con los mismos pesos aleatorios que la página web, así que imprime los mismos números que viste en la consola de entrenamiento. En el estilo matricial, o en problemas muy difíciles como la espiral, el último dígito puede cambiar un poco porque las computadoras redondean de formas ligeramente distintas.</p>` },
 { id: "keys", title: "Atajos de teclado", html: `
  <table><tr><th>Teclas</th><th>Acción</th></tr>
   <tr><td>${K("N")} ${K("I")} ${K("O")} ${K("T")} ${K("L")}</td><td>Agregar neurona oculta, entrada, salida, nota o capa</td></tr>
   <tr><td>Doble clic</td><td>Espacio vacío: agregar neurona oculta. Neurona: renombrar. Nota: editar</td></tr>
   <tr><td>${K("Enter")}</td><td>Renombrar la neurona seleccionada o editar la nota seleccionada</td></tr>
   <tr><td>${K("Supr")}</td><td>Borrar la selección</td></tr>
   <tr><td>${K("Ctrl+Z")} / ${K("Ctrl+Shift+Z")}</td><td>Deshacer / rehacer</td></tr>
   <tr><td>${K("Ctrl+C")} ${K("Ctrl+X")} ${K("Ctrl+V")} ${K("Ctrl+D")}</td><td>Copiar, cortar, pegar, duplicar</td></tr>
   <tr><td>${K("Ctrl+A")}</td><td>Seleccionar todo</td></tr>
   <tr><td>Flechas</td><td>Mover 1 píxel (12 con ${K("Shift")})</td></tr>
   <tr><td>${K("V")} / ${K("H")} / mantener ${K("Espacio")}</td><td>Herramienta selección / mano / mover la vista un momento</td></tr>
   <tr><td>${K("Ctrl")} + rueda, ${K("Ctrl+=")}, ${K("Ctrl+-")}, ${K("Ctrl+0")}</td><td>Acercar y alejar, volver a 100%</td></tr>
   <tr><td>${K("F")}</td><td>Ajustar la red a la pantalla</td></tr>
   <tr><td>${K("P")} / ${K("S")}</td><td>Entrenar o pausar / un paso</td></tr>
   <tr><td>${K("\\")}</td><td>Mostrar u ocultar el panel de código</td></tr>
   <tr><td>${K("Ctrl+Enter")}</td><td>Ejecutar el código del editor (dentro del editor)</td></tr>
   <tr><td>${K("Ctrl+S")} / ${K("Ctrl+O")}</td><td>Guardar el archivo de diseño / abrir un diseño</td></tr>
   <tr><td>${K("Alt+N")}</td><td>Diseño nuevo</td></tr>
   <tr><td>${K("?")}</td><td>Esta ayuda</td></tr></table>
  <p>En Mac, usa ${K("Cmd")} en lugar de ${K("Ctrl")}.</p>` },
 { id: "tips", title: "Consejos y solución de problemas", html: `
  <ul>
   <li><b>La pérdida se queda cerca de 0.35 y la exactitud en 50% o 75%.</b> La red está atascada. Cambia la semilla aleatoria, agrega una neurona oculta o usa tanh en lugar de sigmoide en la capa oculta.</li>
   <li><b>La pérdida sube y baja.</b> La tasa de aprendizaje es demasiado grande. Prueba con la mitad.</li>
   <li><b>Un perceptrón no puede aprender XOR.</b> Es lo esperado. Una sola neurona solo puede trazar una línea recta. Agrega una capa oculta, o flechas directas más una neurona oculta.</li>
   <li><b>Python no carga.</b> La primera ejecución necesita internet. Si la red de tu escuela bloquea la descarga, usa <b>Exportar → Proyecto para VS Code</b> y ejecuta el código en tu computadora.</li>
   <li><b>Perdí mi diseño.</b> Los diseños se guardan por navegador. Pulsa ${K("Ctrl+Z")} para regresar, y usa Archivo → Guardar diseño para guardar copias.</li>
   <li><b>La imagen que exporté no se abre como diseño.</b> Solo las imágenes exportadas desde Network Studio contienen el diseño. Las apps de mensajes que comprimen imágenes pueden borrarlo, así que comparte mejor el archivo .json.</li>
  </ul>` },
 { id: "math", title: "Las matemáticas en una página", html: `
  <p>Para cada neurona, la propagación hacia adelante calcula una suma ponderada y una activación:</p>
  <p><code>z = w1 * entrada1 + w2 * entrada2 + … + b</code> y luego <code>a = activación(z)</code></p>
  <p>La salida <code>out</code> es un número entre 0 y 1. La <b>pérdida</b> mide qué tan lejos están las salidas de los objetivos <code>y</code>. Con entropía cruzada es <code>-promedio(y·log(out) + (1−y)·log(1−out))</code>.</p>
  <p>La <b>retropropagación</b> trabaja hacia atrás desde la salida. El error en la salida es <code>(out − y) / n</code>. El error de una neurona oculta es la suma de los errores de las neuronas a las que alimenta, cada uno multiplicado por el peso de su flecha, por la pendiente de su propia activación.</p>
  <p>Después, el <b>descenso del gradiente</b> cambia un poco cada peso: <code>w = w − tasa × suma(valor que envía × error que recibe)</code>, y cada sesgo con <code>b = b − tasa × suma(error)</code>. Repetir esto durante muchas épocas hace que la pérdida baje, paso a paso.</p>` }
]};

let cur = "en";
const DICT = { en: EN, es: ES };
function t(key, ...args) {
  const v = (DICT[cur] && DICT[cur][key] !== undefined) ? DICT[cur][key] : EN[key];
  if (v === undefined) return key;
  return typeof v === "function" ? v(...args) : v;
}
function apply() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute("aria-label", t(el.dataset.i18nTitle)); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}
function setLang(l) { cur = l === "es" ? "es" : "en"; apply(); }
NS.i18n = {
  t, setLang, apply, opHelp, get lang() { return cur; },
  actLabel: a => NS.core.ACT[a] ? NS.core.ACT[a].label[cur] : a,
  actExplain: a => ACT_EXPLAIN[cur][a] || "",
  dataName: k => ({ en: { circles: "Circles", moons: "Two moons", spiral: "Spiral", agl: "Artificial grammar", MAJ: "Majority" }, es: { circles: "Círculos", moons: "Dos lunas", spiral: "Espiral", agl: "Gramática artificial", MAJ: "Mayoría" } })[cur][k] || k,
  help: () => HELP[cur],
  _dicts: DICT
};
})(typeof window !== "undefined" ? window : globalThis);
