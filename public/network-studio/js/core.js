/* Network Studio core: data, graph checks, Python generator, training engine.
   No DOM access here, so the same file runs in the browser and in Node tests. */
(function (root) {
"use strict";
const NS = root.NS = root.NS || {};

/* ================= Random numbers: NumPy's MT19937 RandomState ================= */
function MT19937(seed) {
  const mt = new Uint32Array(624); let mti = 624, hasG = false, g = 0;
  mt[0] = seed >>> 0;
  for (let i = 1; i < 624; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; }
  const U = 0x80000000, L = 0x7fffffff, A = 0x9908b0df;
  function int32() {
    if (mti >= 624) {
      let k = 0, y;
      for (; k < 227; k++) { y = (mt[k] & U) | (mt[k + 1] & L); mt[k] = mt[k + 397] ^ (y >>> 1) ^ ((y & 1) ? A : 0); }
      for (; k < 623; k++) { y = (mt[k] & U) | (mt[k + 1] & L); mt[k] = mt[k - 227] ^ (y >>> 1) ^ ((y & 1) ? A : 0); }
      y = (mt[623] & U) | (mt[0] & L); mt[623] = mt[396] ^ (y >>> 1) ^ ((y & 1) ? A : 0); mti = 0;
    }
    let y = mt[mti++]; y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18; return y >>> 0;
  }
  const dbl = () => { const a = int32() >>> 5, b = int32() >>> 6; return (a * 67108864 + b) / 9007199254740992; };
  const gauss = () => {
    if (hasG) { hasG = false; return g; }
    let x1, x2, r2;
    do { x1 = 2 * dbl() - 1; x2 = 2 * dbl() - 1; r2 = x1 * x1 + x2 * x2; } while (r2 >= 1 || r2 === 0);
    const f = Math.sqrt(-2 * Math.log(r2) / r2); g = f * x1; hasG = true; return f * x2;
  };
  return { dbl, gauss, uniform: (lo, hi, n) => Array.from({ length: n }, () => lo + (hi - lo) * dbl()), normal: (loc, sc) => loc + sc * gauss() };
}

/* ================= Text used inside the generated Python (and the engine's log) ================= */
const CT = {
  en: {
    docTitle: "Neural network designed in Network Studio.",
    docData: "Data",
    docOrder: "Neurons, in the order the code computes them:",
    docColumns: "Columns (each column is one weight matrix):",
    inputs: "inputs", hidden: "hidden", output: "output", receives: "receives",
    colInputs: "Inputs", colHidden: "Hidden", colOutput: "Output",
    docMade: "Made with Network Studio.",
    docRun: "Run it:", docThen: "then",
    seed: "same random starting weights on every run",
    sec: ["Data", "Activation functions", "Weights and biases", "Training settings", "Training loop", "Results"],
    nEx: "number of training examples",
    colVars: "One variable per input neuron: a column of X",
    notConnected: "not connected, so not used",
    contains: c => `1 if the string contains "${c}"`,
    connectedCols: "input columns connected on the canvas",
    circles: "Circles: class 0 inside a small circle, class 1 on a ring around it",
    moons: "Two moons: two curved half circles that hook into each other",
    spiral: "Spiral: two arms that wind around each other",
    ownRng: "its own random generator, so the data never changes",
    along: "how far along the arm each point is",
    noise: "a little random noise",
    round3: "keep 3 decimals",
    agl1: "Letter strings from an artificial grammar (Reber, 1967).",
    agl2: "Rules: start with T or M. T -> X or S. S -> X. X -> X or V. V -> P (end). M -> V.",
    gram: "1 = grammatical",
    aglEnc: "Each string becomes 10 numbers: does it contain each two-letter chunk?",
    tanhBuilt: "tanh itself is built into NumPy as np.tanh",
    slope: f => `slope of ${f}, written using its output a`,
    reluKeep: "keep positive values, turn negative values into 0",
    leakyKeep: "keep positive values, shrink negative values to 1%",
    linearKeep: "no squashing: the output is the weighted sum itself",
    oneWeight: "One weight for each arrow on the canvas and one bias for each neuron.",
    receivesFrom: (n, a, src) => `${n} (${a}) receives ${src}`,
    wRows: "Each W has one row per sending neuron and one column per receiving neuron.",
    rowsCols: (r, c, a) => `rows: ${r}   columns: ${c} (${a})`,
    mask: "1 = arrow drawn, 0 = no arrow",
    lr: "size of each weight update", ep: "passes over the whole dataset", pe: "report progress this often",
    lossesList: "loss after every epoch, for the plot",
    fwdN: "Forward pass: compute each neuron, inputs first",
    fwdM: "Forward pass: send the data through each column",
    wsum: n => `weighted sum of ${n}'s inputs`,
    act: n => `activation of ${n}`,
    outAct: "output: chance the answer is 1",
    wsumCol: list => `weighted sums: ${list}`,
    acts: "activations",
    lossC: "Loss: one number that says how wrong the network is",
    backN: "Backward pass (backpropagation): error signal for each neuron, output first",
    backM: "Backward pass (backpropagation): how should each weight change?",
    errOut: "error at the output",
    errBack: n => `error sent back to ${n}`,
    errCol: "error sent back to this column",
    upd1: "Update (gradient descent): each weight moves against its gradient,",
    upd2: "which is the sending neuron's value times the receiving neuron's error",
    updM: "Update (gradient descent): move every weight a small step downhill",
    gradW: k => `gradient for W${k}`, gradB: k => `gradient for b${k}`,
    onlyDrawn: "only drawn arrows learn",
    predictDoc: "Forward pass with the trained weights: data -> output.",
    // printed by the program (must match the engine's log)
    pTrain: name => `Training on: ${name}`,
    pEpoch: ["epoch", "loss", "accuracy"],
    pPred: "Predictions after training:",
    pInput: "input", pTarget: "target", pOutput: "output",
    pFinal: "Final training accuracy:",
    pNew: "New strings the network never saw:",
    pSays: "says", pTruth: "truth:", pG: "grammatical", pNG: "not grammatical",
    pTest: "Test accuracy on new strings:", pPeople: "(people: about 65%)",
    plotT: "Loss during training", plotX: "epoch", plotY: "loss",
    plotC: "Plot the loss curve (needs matplotlib: pip install matplotlib)"
  },
  es: {
    docTitle: "Red neuronal diseñada en Network Studio.",
    docData: "Datos",
    docOrder: "Neuronas, en el orden en que el código las calcula:",
    docColumns: "Columnas (cada columna es una matriz de pesos):",
    inputs: "entradas", hidden: "oculta", output: "salida", receives: "recibe",
    colInputs: "Entradas", colHidden: "Oculta", colOutput: "Salida",
    docMade: "Hecho con Network Studio.",
    docRun: "Para ejecutarlo:", docThen: "y luego",
    seed: "los mismos pesos iniciales en cada ejecución",
    sec: ["Datos", "Funciones de activación", "Pesos y sesgos", "Ajustes de entrenamiento", "Ciclo de entrenamiento", "Resultados"],
    nEx: "número de ejemplos de entrenamiento",
    colVars: "Una variable por neurona de entrada: una columna de X",
    notConnected: "no está conectada, así que no se usa",
    contains: c => `1 si la cadena contiene "${c}"`,
    connectedCols: "columnas de entrada conectadas en el lienzo",
    circles: "Círculos: clase 0 dentro de un círculo pequeño, clase 1 en un anillo alrededor",
    moons: "Dos lunas: dos medios círculos curvos que se enganchan entre sí",
    spiral: "Espiral: dos brazos que giran uno alrededor del otro",
    ownRng: "su propio generador aleatorio, así los datos nunca cambian",
    along: "qué tan lejos en el brazo está cada punto",
    noise: "un poco de ruido aleatorio",
    round3: "conservar 3 decimales",
    agl1: "Cadenas de letras de una gramática artificial (Reber, 1967).",
    agl2: "Reglas: empieza con T o M. T -> X o S. S -> X. X -> X o V. V -> P (fin). M -> V.",
    gram: "1 = gramatical",
    aglEnc: "Cada cadena se convierte en 10 números: ¿contiene cada par de letras?",
    tanhBuilt: "tanh ya viene incluida en NumPy como np.tanh",
    slope: f => `pendiente de ${f}, escrita con su salida a`,
    reluKeep: "deja los valores positivos y convierte los negativos en 0",
    leakyKeep: "deja los valores positivos y reduce los negativos al 1%",
    linearKeep: "sin aplastar: la salida es la suma ponderada",
    oneWeight: "Un peso por cada flecha del lienzo y un sesgo por cada neurona.",
    receivesFrom: (n, a, src) => `${n} (${a}) recibe ${src}`,
    wRows: "Cada W tiene una fila por neurona que envía y una columna por neurona que recibe.",
    rowsCols: (r, c, a) => `filas: ${r}   columnas: ${c} (${a})`,
    mask: "1 = flecha dibujada, 0 = sin flecha",
    lr: "tamaño de cada ajuste de los pesos", ep: "pasadas por todos los datos", pe: "cada cuánto mostrar el progreso",
    lossesList: "pérdida después de cada época, para la gráfica",
    fwdN: "Propagación hacia adelante: calcular cada neurona, primero las entradas",
    fwdM: "Propagación hacia adelante: pasar los datos por cada columna",
    wsum: n => `suma ponderada de las entradas de ${n}`,
    act: n => `activación de ${n}`,
    outAct: "salida: probabilidad de que la respuesta sea 1",
    wsumCol: list => `sumas ponderadas: ${list}`,
    acts: "activaciones",
    lossC: "Pérdida: un número que dice qué tan equivocada está la red",
    backN: "Propagación hacia atrás (retropropagación): señal de error de cada neurona, primero la salida",
    backM: "Propagación hacia atrás (retropropagación): ¿cuánto debe cambiar cada peso?",
    errOut: "error en la salida",
    errBack: n => `error que regresa a ${n}`,
    errCol: "error que regresa a esta columna",
    upd1: "Actualización (descenso del gradiente): cada peso se mueve contra su gradiente,",
    upd2: "que es el valor de la neurona que envía por el error de la que recibe",
    updM: "Actualización (descenso del gradiente): mover cada peso un pequeño paso cuesta abajo",
    gradW: k => `gradiente de W${k}`, gradB: k => `gradiente de b${k}`,
    onlyDrawn: "solo aprenden las flechas dibujadas",
    predictDoc: "Propagación hacia adelante con los pesos entrenados: datos -> salida.",
    pTrain: name => `Entrenando con: ${name}`,
    pEpoch: ["época", "pérdida", "exactitud"],
    pPred: "Predicciones después del entrenamiento:",
    pInput: "entrada", pTarget: "objetivo", pOutput: "salida",
    pFinal: "Exactitud final en el entrenamiento:",
    pNew: "Cadenas nuevas que la red nunca vio:",
    pSays: "dice", pTruth: "verdad:", pG: "gramatical", pNG: "no gramatical",
    pTest: "Exactitud en cadenas nuevas:", pPeople: "(personas: cerca de 65%)",
    plotT: "Pérdida durante el entrenamiento", plotX: "época", plotY: "pérdida",
    plotC: "Graficar la curva de pérdida (requiere matplotlib: pip install matplotlib)"
  }
};

/* ================= Activations ================= */
const ACT = {
  sigmoid: { f: z => 1 / (1 + Math.exp(-z)), d: a => a * (1 - a), py: "sigmoid", pyD: "sigmoid_deriv", label: { en: "Sigmoid", es: "Sigmoide" }, short: "sigmoid", relu: false },
  tanh: { f: Math.tanh, d: a => 1 - a * a, py: "np.tanh", pyD: "tanh_deriv", label: { en: "Tanh", es: "Tanh" }, short: "tanh", relu: false },
  relu: { f: z => z > 0 ? z : 0, d: a => a > 0 ? 1 : 0, py: "relu", pyD: "relu_deriv", label: { en: "ReLU", es: "ReLU" }, short: "relu", relu: true },
  leaky: { f: z => z > 0 ? z : 0.01 * z, d: a => a > 0 ? 1 : 0.01, py: "leaky_relu", pyD: "leaky_relu_deriv", label: { en: "Leaky ReLU", es: "Leaky ReLU" }, short: "leaky", relu: true },
  linear: { f: z => z, d: () => 1, py: "linear", pyD: "linear_deriv", label: { en: "Linear", es: "Lineal" }, short: "linear", relu: false }
};
const ACT_ORDER = ["sigmoid", "tanh", "relu", "leaky", "linear"];

/* ================= Datasets ================= */
const BIGRAMS = ["TX", "TS", "SX", "XX", "XV", "VP", "MV", "TP", "VX", "MX"];
const AGL = {
  trainG: ["TXVP", "TXXVP", "TXXXVP", "TSXVP", "TSXXVP", "TSXXXVP", "MVP"],
  trainU: ["TPVX", "MXXX", "TVP", "XTVP", "TXXV", "MXVP", "PVXT", "TSVP"],
  testG: ["TXXXXVP", "TSXXXXVP", "TXXXXXVP"],
  testU: ["SXVP", "TXSVP", "MPV", "TMXVP", "VPTX"]
};
const GATES = {
  2: { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], XOR: [0, 1, 1, 0], NAND: [1, 1, 1, 0], NOR: [1, 0, 0, 0], XNOR: [1, 0, 0, 1] },
  3: { AND: [0, 0, 0, 0, 0, 0, 0, 1], OR: [0, 1, 1, 1, 1, 1, 1, 1], XOR: [0, 1, 1, 0, 1, 0, 0, 1], MAJ: [0, 0, 0, 1, 0, 1, 1, 1] }
};
const GATE_NOTE = {
  en: { AND: "the output is 1 only when every input is 1", OR: "the output is 1 when at least one input is 1",
        XOR: "the output is 1 when exactly one input is 1", XOR3: "the output is 1 when an odd number of inputs are 1",
        NAND: "the output is 0 only when every input is 1", NOR: "the output is 1 only when every input is 0",
        XNOR: "the output is 1 when both inputs are equal", MAJ: "the output is 1 when most inputs are 1",
        custom: "targets chosen in the truth table" },
  es: { AND: "la salida es 1 solo cuando todas las entradas son 1", OR: "la salida es 1 cuando al menos una entrada es 1",
        XOR: "la salida es 1 cuando exactamente una entrada es 1", XOR3: "la salida es 1 cuando un número impar de entradas son 1",
        NAND: "la salida es 0 solo cuando todas las entradas son 1", NOR: "la salida es 1 solo cuando todas las entradas son 0",
        XNOR: "la salida es 1 cuando las dos entradas son iguales", MAJ: "la salida es 1 cuando la mayoría de las entradas son 1",
        custom: "objetivos elegidos en la tabla de verdad" }
};
const DATA_NAMES = {
  en: { circles: "Circles", moons: "Two moons", spiral: "Spiral", agl: "Artificial grammar", custom: "Custom gate", MAJ: "Majority" },
  es: { circles: "Círculos", moons: "Dos lunas", spiral: "Espiral", agl: "Gramática artificial", custom: "Compuerta personalizada", MAJ: "Mayoría" }
};
function logicRows(k) { const rows = []; for (let i = 0; i < (1 << k); i++) rows.push(Array.from({ length: k }, (_, j) => (i >> (k - 1 - j)) & 1)); return rows; }
function gateName(k, targets) {
  const g = GATES[k] || {};
  for (const name in g) if (g[name].every((v, i) => v === targets[i])) return name;
  return null;
}
const encodeAGL = s => BIGRAMS.map(b => s.includes(b) ? 1 : 0);
const pointsCache = {};
function pointsData(kind) {
  if (pointsCache[kind]) return pointsCache[kind];
  const rng = MT19937(7), X = [], y = [];
  if (kind === "circles") {
    const per = 60, ang = rng.uniform(0, 2 * Math.PI, 2 * per), rad = [...rng.uniform(0.0, 0.5, per), ...rng.uniform(0.8, 1.2, per)];
    for (let i = 0; i < 2 * per; i++) { X.push([rad[i] * Math.cos(ang[i]), rad[i] * Math.sin(ang[i])]); y.push(i < per ? 0 : 1); }
  } else if (kind === "moons") {
    const per = 60, t = rng.uniform(0, Math.PI, per), s = rng.uniform(0, Math.PI, per);
    for (let i = 0; i < per; i++) X.push([Math.cos(t[i]), Math.sin(t[i])]);
    for (let i = 0; i < per; i++) X.push([1 - Math.cos(s[i]), 0.5 - Math.sin(s[i])]);
    for (const p of X) { p[0] = (p[0] + rng.normal(0, 0.12)) - 0.5; p[1] = (p[1] + rng.normal(0, 0.12)) - 0.25; }
    for (let i = 0; i < 2 * per; i++) y.push(i < per ? 0 : 1);
  } else if (kind === "spiral") {
    const per = 80, u = rng.uniform(0, 1, 2 * per), c = 3 * Math.PI;
    for (let i = 0; i < 2 * per; i++) {
      const arm = i < per ? 0 : 1, t = Math.sqrt(u[i]) * 3 * Math.PI, r = t / c * 1.2, ang = t + arm * Math.PI;
      X.push([r * Math.cos(ang), r * Math.sin(ang)]); y.push(arm);
    }
    for (const p of X) { p[0] = p[0] + rng.normal(0, 0.05); p[1] = p[1] + rng.normal(0, 0.05); }
  }
  // np.round(X, 3): round half to even on X * 1000, then divide (hides tiny differences between math libraries)
  const rint = v => { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };
  for (const p of X) { p[0] = rint(p[0] * 1000) / 1000; p[1] = rint(p[1] * 1000) / 1000; }
  return (pointsCache[kind] = { X, y });
}
const RANGES = { logic: [-0.5, 1.5], circles: [-1.45, 1.45], moons: [-1.75, 1.75], spiral: [-1.55, 1.55] };
function getDataset(data, lang) {
  lang = lang || "en";
  const names = DATA_NAMES[lang];
  if (data.kind === "logic") {
    const k = data.inputs === 3 ? 3 : 2, rows = logicRows(k);
    const targets = rows.map((_, i) => data.targets && data.targets[i] ? 1 : 0);
    const g = gateName(k, targets);
    const name = g ? (g === "MAJ" ? names.MAJ : (k === 3 ? g + " (3)" : g)) : names.custom;
    const noteKey = g ? (g === "XOR" && k === 3 ? "XOR3" : g) : "custom";
    return { kind: "table", key: "logic", gate: g, name, inputNames: rows[0].map((_, j) => `x${j + 1}`), X: rows, y: targets,
      note: GATE_NOTE[lang][noteKey], range: RANGES.logic, nIn: k };
  }
  if (data.kind === "agl") {
    const trainStrings = [...AGL.trainG, ...AGL.trainU], testStrings = [...AGL.testG, ...AGL.testU];
    return { kind: "strings", key: "agl", name: names.agl, inputNames: BIGRAMS, trainStrings, testStrings,
      X: trainStrings.map(encodeAGL), y: [...AGL.trainG.map(() => 1), ...AGL.trainU.map(() => 0)],
      XTest: testStrings.map(encodeAGL), yTest: [...AGL.testG.map(() => 1), ...AGL.testU.map(() => 0)], nIn: 10 };
  }
  const p = pointsData(data.kind);
  return { kind: "points", key: data.kind, name: names[data.kind], inputNames: ["x1", "x2"], X: p.X, y: p.y, range: RANGES[data.kind], nIn: 2 };
}

/* ================= Names ================= */
const PY_KEYWORDS = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "));
const RESERVED = new Set(("np numpy X y n X_test y_test X_in cols epoch epochs loss losses learning_rate print_every accuracy predict data inputs target p s answer truth " +
  "test_out test_accuracy final_accuracy rng per_class angle radius t arm r noise plt matplotlib sigmoid sigmoid_deriv tanh tanh_deriv relu relu_deriv " +
  "leaky_relu leaky_relu_deriv linear linear_deriv encode bigrams train_strings train_labels test_strings test_labels print range len zip sum min max abs " +
  "int float str list dict set tuple type input open object id map filter round sorted").split(" "));
function nodeVar(n, ds) {
  if (n.type === "input") return ds.inputNames[n.feature] || `x${n.feature + 1}`;
  if (n.type === "output") return n.name || "out";
  return n.name;
}
function naturalKey(s) { return String(s).replace(/\d+/g, d => d.padStart(6, "0")); }
function checkName(name, node, graph, ds, lang) {
  const M = { en: {
      empty: "Type a name.", pattern: "Use letters, digits and _ only, starting with a letter. No spaces or accents.",
      long: "Keep names to 24 characters or fewer.", keyword: n => `"${n}" is a Python keyword.`,
      reserved: n => `"${n}" is already used by the generated code.`, prefix: "Names cannot start with w_, b_, z_ or d_. The code uses those for weights, biases and errors.",
      taken: n => `Another neuron is already called "${n}".` },
    es: {
      empty: "Escribe un nombre.", pattern: "Usa solo letras, dígitos y _, empezando con una letra. Sin espacios ni acentos.",
      long: "Usa como máximo 24 caracteres.", keyword: n => `"${n}" es una palabra clave de Python.`,
      reserved: n => `"${n}" ya lo usa el código generado.`, prefix: "Los nombres no pueden empezar con w_, b_, z_ ni d_. El código los usa para pesos, sesgos y errores.",
      taken: n => `Otra neurona ya se llama "${n}".` } }[lang || "en"];
  if (!name) return M.empty;
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return M.pattern;
  if (name.length > 24) return M.long;
  if (PY_KEYWORDS.has(name)) return M.keyword(name);
  if (RESERVED.has(name) || /^(W|b|z|a|d|dW|db|M|h)\d+$/.test(name) && !/^h\d+$/.test(name)) return M.reserved(name);
  if (/^(w|b|z|d)_/.test(name)) return M.prefix;
  if (graph.nodes.some(m => m !== node && nodeVar(m, ds) === name)) return M.taken(name);
  if (ds.inputNames.includes(name) && node.type !== "input") return M.taken(name);
  return null;
}

/* ================= Graph compiler ================= */
const ERR = {
  en: { noOut: "Add an output neuron. It gives the network's answer.",
        noIn: v => `${v} receives no input. Draw an arrow into it.`,
        noOutArrow: v => `${v} sends its value nowhere. Draw an arrow from it toward the output.`,
        outNoIn: "The output receives no input. Draw arrows into it.",
        loop: "The arrows form a loop. Remove one arrow in the loop.",
        dup: v => `Two neurons share the name ${v}. Rename one of them.`,
        clash: v => `The names make two different weights both called ${v}. Rename a neuron.`,
        badInput: v => `The input ${v} does not exist in this data. Delete it.`,
        ignored: list => `The network ignores ${list} (not connected).`,
        mCols: (a, b) => `Matrix style needs neat columns, where every arrow goes to the very next column. The arrow ${a} → ${b} skips a column.`,
        mMix: (c, list) => `Matrix style needs one activation per column. Column ${c} mixes ${list}.`,
        mFix: "Fix the problems on the canvas first." },
  es: { noOut: "Agrega una neurona de salida. Da la respuesta de la red.",
        noIn: v => `${v} no recibe ninguna entrada. Dibuja una flecha hacia ella.`,
        noOutArrow: v => `${v} no envía su valor a ningún lado. Dibuja una flecha desde ella hacia la salida.`,
        outNoIn: "La salida no recibe ninguna entrada. Dibuja flechas hacia ella.",
        loop: "Las flechas forman un ciclo. Quita una flecha del ciclo.",
        dup: v => `Dos neuronas se llaman ${v}. Cambia el nombre de una.`,
        clash: v => `Los nombres hacen que dos pesos distintos se llamen ${v}. Cambia el nombre de una neurona.`,
        badInput: v => `La entrada ${v} no existe en estos datos. Bórrala.`,
        ignored: list => `La red ignora ${list} (sin conectar).`,
        mCols: (a, b) => `El estilo matricial necesita columnas ordenadas, donde cada flecha va a la columna siguiente. La flecha ${a} → ${b} se salta una columna.`,
        mMix: (c, list) => `El estilo matricial necesita una sola activación por columna. La columna ${c} mezcla ${list}.`,
        mFix: "Primero corrige los problemas del lienzo." }
};
function compileGraph(graph, data, lang) {
  lang = lang || "en";
  const E = ERR[lang], ds = getDataset(data, lang), byId = new Map(), inE = new Map(), outE = new Map();
  const nodes = graph.nodes;
  for (const n of nodes) { byId.set(n.id, n); inE.set(n.id, []); outE.set(n.id, []); }
  const edges = graph.edges.filter(e => byId.has(e.from) && byId.has(e.to));
  for (const e of edges) { outE.get(e.from).push(e); inE.get(e.to).push(e); }
  const V = n => nodeVar(n, ds);
  const errors = [], warnings = [];
  const outs = nodes.filter(n => n.type === "output");
  if (!outs.length) errors.push({ id: null, msg: E.noOut });
  for (const n of nodes) {
    if (n.type === "input" && n.feature >= ds.nIn) errors.push({ id: n.id, msg: E.badInput(`x${n.feature + 1}`) });
    if (n.type === "hidden") {
      if (!inE.get(n.id).length) errors.push({ id: n.id, msg: E.noIn(V(n)) });
      if (!outE.get(n.id).length) errors.push({ id: n.id, msg: E.noOutArrow(V(n)) });
    } else if (n.type === "output" && !inE.get(n.id).length) errors.push({ id: n.id, msg: E.outNoIn });
  }
  const seen = new Map(); let dupFound = false;
  for (const n of nodes) { const v = V(n); if (seen.has(v)) { dupFound = true; errors.push({ id: n.id, msg: E.dup(v) }); } else seen.set(v, n.id); }
  if (!dupFound) {
    const ids = new Map();
    const reg = (name, key) => { if (ids.has(name) && ids.get(name) !== key) return name; ids.set(name, key); return null; };
    let clash = null;
    for (const n of nodes) if (n.type !== "input") for (const p of ["z_", "d_", "b_"]) clash = clash || reg(p + V(n), "n" + p + n.id);
    for (const e of edges) clash = clash || reg(`w_${V(byId.get(e.from))}_${V(byId.get(e.to))}`, "e" + e.id);
    if (clash) errors.push({ id: null, msg: E.clash(clash) });
  }
  const present = new Set(nodes.filter(n => n.type === "input").map(n => n.feature));
  const ignored = [];
  ds.inputNames.forEach((nm, f) => { if (!present.has(f)) ignored.push(nm); });
  nodes.filter(n => n.type === "input" && n.feature < ds.nIn && !outE.get(n.id).length).forEach(n => ignored.push(V(n)));
  if (ignored.length) warnings.push({ id: null, msg: E.ignored(ignored.join(", ")) });
  const rank = n => n.type === "input" ? "0" + String(n.feature).padStart(4, "0") : n.type === "output" ? "9" : "5" + naturalKey(V(n));
  const indeg = new Map(nodes.map(n => [n.id, inE.get(n.id).length]));
  const ready = nodes.filter(n => indeg.get(n.id) === 0), order = [];
  while (ready.length) {
    ready.sort((a, b) => rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0);
    const n = ready.shift(); order.push(n);
    for (const e of outE.get(n.id)) { indeg.set(e.to, indeg.get(e.to) - 1); if (indeg.get(e.to) === 0) ready.push(byId.get(e.to)); }
  }
  if (order.length !== nodes.length) errors.push({ id: null, msg: E.loop });
  const idx = new Map(order.map((n, i) => [n.id, i]));
  for (const l of inE.values()) l.sort((a, b) => idx.get(a.from) - idx.get(b.from));
  for (const l of outE.values()) l.sort((a, b) => idx.get(a.to) - idx.get(b.to));
  const usedInputs = order.filter(n => n.type === "input" && outE.get(n.id).length);
  const compute = order.filter(n => n.type !== "input");
  if (outs.length && compute.length && compute[compute.length - 1].type !== "output") { // output must be last
    const o = compute.find(n => n.type === "output"); compute.splice(compute.indexOf(o), 1); compute.push(o);
  }
  const depth = new Map();
  for (const n of order) { let d = 0; for (const e of inE.get(n.id)) d = Math.max(d, (depth.get(e.from) ?? 0) + 1); depth.set(n.id, d); }
  let matrix = { ok: false, reason: E.mFix };
  if (!errors.length) {
    const bad = edges.find(e => depth.get(e.to) !== depth.get(e.from) + 1);
    if (bad) matrix = { ok: false, reason: E.mCols(V(byId.get(bad.from)), V(byId.get(bad.to))) };
    else {
      const Lm = depth.get(outs[0].id), groups = [];
      for (let g = 0; g <= Lm; g++) groups.push(order.filter(n => depth.get(n.id) === g && (n.type !== "input" || outE.get(n.id).length)));
      const mixed = groups.findIndex((g, i) => i > 0 && new Set(g.map(n => n.act)).size > 1);
      matrix = mixed > 0 ? { ok: false, reason: E.mMix(mixed, [...new Set(groups[mixed].map(n => ACT[n.act].label[lang]))].join(lang === "es" ? " y " : " and ")) } : { ok: true, L: Lm, groups };
    }
  }
  return { ds, byId, edges, inE, outE, order, compute, usedInputs, depth, errors, warnings, valid: !errors.length, matrix, V, lang,
    params: edges.length + nodes.filter(n => n.type !== "input").length };
}
function wouldCycle(graph, from, to) {
  const out = new Map(); graph.edges.forEach(e => { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e.to); });
  const stack = [to], seen = new Set();
  while (stack.length) { const n = stack.pop(); if (n === from) return true; if (seen.has(n)) continue; seen.add(n); (out.get(n) || []).forEach(m => stack.push(m)); }
  return false;
}

/* ================= Python generator ================= */
const pyNum = v => { let s = String(v); if (!s.includes(".") && !s.includes("e")) s += ".0"; return s; };
const pyList = a => "[" + a.join(", ") + "]";
const pyStrList = a => "[" + a.map(s => `"${s}"`).join(", ") + "]";
function wrapSum(prefix, terms, suffix, forceParen) {
  if (!forceParen && terms.length <= 3) return [prefix + terms.join(" + ") + suffix];
  const out = [], chunks = [];
  for (let i = 0; i < terms.length; i += 3) chunks.push(terms.slice(i, i + 3));
  const pad = " ".repeat(Math.max(0, prefix.length - 1)) + "+ ";
  chunks.forEach((c, i) => { let l = (i === 0 ? prefix + "(" : pad) + c.join(" + "); if (i === chunks.length - 1) l += ")" + suffix; out.push(l); });
  return out;
}
function buildSpec(st) {
  const epochs = Math.max(10, Math.min(50000, Math.round(st.epochs)));
  return { loss: st.loss, lr: st.lr, epochs, seed: st.seed | 0, style: st.style, plot: !!st.plot, lang: st.lang || "en",
    printEvery: Math.max(1, Math.round(epochs / 10)) };
}
function buildProgram(spec, G) {
  const { loss, lr, epochs, seed, printEvery, style, lang } = spec, ds = G.ds, V = G.V, C = CT[lang];
  const lines = [], ops = [];
  const NT = id => `node:${id}`, ET = id => `edge:${id}`;
  const add = (t, tags = [], op = null, primary = null) => lines.push({ t, tags, op, primary });
  const cm = (code, comment) => comment ? code.padEnd(Math.max(code.length + 2, 40)) + "# " + comment : code;
  const addOp = o => { ops.push(o); return o.key; };
  const flat = style !== "matrix" || !G.matrix.ok;
  const out = G.compute[G.compute.length - 1];
  const outName = V(out);
  const inTags = G.order.filter(n => n.type === "input").map(n => NT(n.id));
  const wn = e => `w_${V(G.byId.get(e.from))}_${V(G.byId.get(e.to))}`;
  const AL = a => ACT[a].label[lang];
  const sec = i => add(`# ---------- ${i + 1}. ${C.sec[i]} ----------`, i === 0 ? inTags : []);
  const plot = spec.plot;

  add('"""');
  add(C.docTitle);
  add(`${C.docData}: ${ds.name}`);
  add("");
  if (flat) {
    add(C.docOrder);
    if (G.usedInputs.length) add(`    ${G.usedInputs.map(V).join(", ")}`.padEnd(20) + "  " + C.inputs, G.usedInputs.map(n => NT(n.id)));
    for (const n of G.compute) {
      const src = G.inE.get(n.id).map(e => V(G.byId.get(e.from))).join(", ");
      add(`    ${V(n)}`.padEnd(20) + `  ${n.type === "output" ? C.output : C.hidden}, ${AL(n.act)}, ${C.receives} ${src}`, [NT(n.id)], null, { kind: "node", id: n.id });
    }
  } else {
    add(C.docColumns);
    G.matrix.groups.forEach((g, i) => add(`    ${i === 0 ? C.colInputs : i === G.matrix.L ? C.colOutput : C.colHidden + " " + i}`.padEnd(14) + `  ${g.map(V).join(", ")}${i ? ", " + AL(g[0].act) : ""}`, g.map(n => NT(n.id))));
  }
  add("");
  add(C.docMade);
  add(`${C.docRun}  pip install numpy${plot ? " matplotlib" : ""}   ${C.docThen}   python network.py`);
  add('"""');
  add("import numpy as np");
  if (plot) add("import matplotlib.pyplot as plt");
  add("");
  add(cm(`np.random.seed(${seed})`, C.seed));
  add("");

  /* 1. data */
  sec(0);
  if (ds.kind === "table") {
    add(`# ${ds.name}: ${ds.note}`, inTags);
    add(`X = np.array(${pyList(ds.X.map(r => pyList(r)))}, dtype=float)`, inTags);
    add(flat ? `y = np.array(${pyList(ds.y)}, dtype=float)` : `y = np.array(${pyList(ds.y.map(v => `[${v}]`))}, dtype=float)`);
  } else if (ds.kind === "points") {
    const yl = `y = np.concatenate([np.zeros(per_class), np.ones(per_class)])${flat ? "" : ".reshape(-1, 1)"}`;
    if (ds.key === "circles") {
      add("# " + C.circles, inTags);
      add(cm("rng = np.random.RandomState(7)", C.ownRng), inTags);
      add("per_class = 60", inTags);
      add("angle = rng.uniform(0, 2 * np.pi, 2 * per_class)", inTags);
      add("radius = np.concatenate([rng.uniform(0.0, 0.5, per_class),", inTags);
      add("                         rng.uniform(0.8, 1.2, per_class)])", inTags);
      add("X = np.column_stack([radius * np.cos(angle), radius * np.sin(angle)])", inTags);
      add(cm("X = np.round(X, 3)", C.round3), inTags);
      add(yl);
    } else if (ds.key === "moons") {
      add("# " + C.moons, inTags);
      add(cm("rng = np.random.RandomState(7)", C.ownRng), inTags);
      add("per_class = 60", inTags);
      add("t = rng.uniform(0, np.pi, per_class)", inTags);
      add("s = rng.uniform(0, np.pi, per_class)", inTags);
      add("X = np.concatenate([np.column_stack([np.cos(t), np.sin(t)]),", inTags);
      add("                    np.column_stack([1 - np.cos(s), 0.5 - np.sin(s)])])", inTags);
      add(cm("X = X + rng.normal(0, 0.12, X.shape) - [0.5, 0.25]", C.noise), inTags);
      add(cm("X = np.round(X, 3)", C.round3), inTags);
      add(yl);
    } else {
      add("# " + C.spiral, inTags);
      add(cm("rng = np.random.RandomState(7)", C.ownRng), inTags);
      add("per_class = 80", inTags);
      add(cm("t = np.sqrt(rng.uniform(0, 1, 2 * per_class)) * 3 * np.pi", C.along), inTags);
      add("arm = np.concatenate([np.zeros(per_class), np.ones(per_class)])", inTags);
      add("r = t / (3 * np.pi) * 1.2", inTags);
      add("X = np.column_stack([r * np.cos(t + arm * np.pi), r * np.sin(t + arm * np.pi)])", inTags);
      add(cm("X = X + rng.normal(0, 0.05, X.shape)", C.noise), inTags);
      add(cm("X = np.round(X, 3)", C.round3), inTags);
      add(`y = arm${flat ? "" : ".reshape(-1, 1)"}`);
    }
  } else {
    add("# " + C.agl1, inTags);
    add("# " + C.agl2, inTags);
    add(`train_strings = ${pyStrList(ds.trainStrings)}`, inTags);
    add(cm(`train_labels = ${pyList(ds.y)}`, C.gram));
    add(`test_strings = ${pyStrList(ds.testStrings)}`, inTags);
    add(`test_labels = ${pyList(ds.yTest)}`);
    add("");
    add("# " + C.aglEnc, inTags);
    add(`bigrams = ${pyStrList(BIGRAMS)}`, inTags);
    add("");
    add("def encode(s):", inTags);
    add("    return [1 if b in s else 0 for b in bigrams]", inTags);
    add("");
    add("X = np.array([encode(s) for s in train_strings], dtype=float)", inTags);
    add(`y = np.array(train_labels, dtype=float)${flat ? "" : ".reshape(-1, 1)"}`);
    add("X_test = np.array([encode(s) for s in test_strings], dtype=float)", inTags);
    add(`y_test = np.array(test_labels, dtype=float)${flat ? "" : ".reshape(-1, 1)"}`);
  }
  add(cm("n = len(X)", C.nEx));
  const usedCols = G.usedInputs.map(n => n.feature);
  const allCols = usedCols.length === ds.nIn && usedCols.every((f, i) => f === i);
  if (flat) {
    add("");
    add("# " + C.colVars, inTags);
    for (const n of G.order.filter(n => n.type === "input")) {
      const used = G.outE.get(n.id).length, c = `${V(n)} = X[:, ${n.feature}]`;
      add(used ? cm(c, ds.kind === "strings" ? C.contains(BIGRAMS[n.feature]) : "") : `# ${c}   (${C.notConnected})`, [NT(n.id)], null, { kind: "node", id: n.id });
    }
  } else if (!allCols) {
    add("");
    add(cm(`cols = ${pyList(usedCols)}`, C.connectedCols), inTags);
    add("X_in = X[:, cols]", inTags);
  }
  add("");

  /* 2. activations */
  sec(1);
  const used = new Set(G.compute.map(n => n.act));
  for (const a of ACT_ORDER.filter(a => used.has(a))) {
    const t = [`act:${a}`];
    if (a === "sigmoid") { add("def sigmoid(z):", t); add("    return 1 / (1 + np.exp(-z))", t); add("", t); add("def sigmoid_deriv(a):", t); add("    # " + C.slope("sigmoid"), t); add("    return a * (1 - a)", t); }
    else if (a === "tanh") { add("# " + C.tanhBuilt, t); add("def tanh_deriv(a):", t); add("    # " + C.slope("tanh"), t); add("    return 1 - a ** 2", t); }
    else if (a === "relu") { add("def relu(z):", t); add("    # " + C.reluKeep, t); add("    return np.maximum(0, z)", t); add("", t); add("def relu_deriv(a):", t); add("    return (a > 0).astype(float)", t); }
    else if (a === "leaky") { add("def leaky_relu(z):", t); add("    # " + C.leakyKeep, t); add("    return np.where(z > 0, z, 0.01 * z)", t); add("", t); add("def leaky_relu_deriv(a):", t); add("    return np.where(a > 0, 1.0, 0.01)", t); }
    else { add("def linear(z):", t); add("    # " + C.linearKeep, t); add("    return z", t); add("", t); add("def linear_deriv(a):", t); add("    return np.ones_like(a)", t); }
    add("");
  }

  /* 3. weights */
  sec(2);
  if (flat) {
    add("# " + C.oneWeight);
    for (const n of G.compute) {
      const ins = G.inE.get(n.id), fan = ins.length, sc = ACT[n.act].relu ? `np.sqrt(2 / ${fan})` : `np.sqrt(1 / ${fan})`;
      add("# " + C.receivesFrom(V(n), AL(n.act), ins.map(e => V(G.byId.get(e.from))).join(", ")), [NT(n.id)], null, { kind: "node", id: n.id });
      for (const e of ins) add(`${wn(e)} = np.random.randn() * ${sc}`, [ET(e.id), NT(n.id)], null, { kind: "edge", id: e.id });
      add(`b_${V(n)} = 0.0`, [NT(n.id)], null, { kind: "node", id: n.id });
    }
  } else {
    add("# " + C.wRows);
    const gs = G.matrix.groups;
    for (let g = 1; g < gs.length; g++) {
      const src = gs[g - 1], dst = gs[g], eds = G.edges.filter(e => dst.some(n => n.id === e.to));
      const full = eds.length === src.length * dst.length;
      const tags = [...dst.map(n => NT(n.id)), ...eds.map(e => ET(e.id))], pr = { kind: "node", id: dst[0].id };
      add("# " + C.rowsCols(src.map(V).join(", "), dst.map(V).join(", "), AL(dst[0].act)), tags, null, pr);
      if (!full) {
        const Mrows = src.map(s => pyList(dst.map(d => eds.some(e => e.from === s.id && e.to === d.id) ? 1 : 0)));
        add(cm(`M${g} = np.array(${pyList(Mrows)}, dtype=float)`, C.mask), tags, null, pr);
      }
      const sc = ACT[dst[0].act].relu ? `np.sqrt(2 / ${src.length})` : `np.sqrt(1 / ${src.length})`;
      add(`W${g} = np.random.randn(${src.length}, ${dst.length}) * ${sc}${full ? "" : ` * M${g}`}`, tags, null, pr);
      add(`b${g} = np.zeros((1, ${dst.length}))`, dst.map(n => NT(n.id)), null, pr);
    }
  }
  add("");
  sec(3);
  add(cm(`learning_rate = ${pyNum(lr)}`, C.lr));
  add(cm(`epochs = ${epochs}`, C.ep));
  add(cm(`print_every = ${printEvery}`, C.pe));
  if (plot) add(cm("losses = []", C.lossesList));
  add("");

  /* 5. loop */
  sec(4);
  add(`print("${C.pTrain(ds.name)}")`, ["loop"], "start");
  add("for epoch in range(epochs + 1):", ["loop"], addOp({ key: "for", kind: "for", prims: [], nodes: [], edges: [] }));
  const outVar = flat ? outName : `a${G.matrix.L}`;
  if (flat) {
    add("    # " + C.fwdN, ["loop"]);
    for (const n of G.compute) {
      const ins = G.inE.get(n.id), terms = [...ins.map(e => `${wn(e)} * ${V(G.byId.get(e.from))}`), `b_${V(n)}`];
      const key = addOp({ key: `z:${n.id}`, kind: "z", prims: [["z", n.id]], nodes: [n.id], edges: ins.map(e => e.id), id: n.id });
      const ls = wrapSum(`    z_${V(n)} = `, terms, "", false);
      ls.forEach((l, i) => add(i === 0 && ls.length === 1 ? cm(l, C.wsum(V(n))) : l, ["loop", NT(n.id), ...ins.map(e => ET(e.id))], key, { kind: "node", id: n.id }));
      const k2 = addOp({ key: `a:${n.id}`, kind: "a", prims: [["a", n.id]], nodes: [n.id], edges: [], id: n.id });
      add(cm(`    ${V(n)} = ${ACT[n.act].py}(z_${V(n)})`, n.type === "output" ? C.outAct : C.act(V(n))), ["loop", NT(n.id)], k2, { kind: "node", id: n.id });
    }
  } else {
    add("    # " + C.fwdM, ["loop"]);
    const gs = G.matrix.groups;
    for (let g = 1; g < gs.length; g++) {
      const dst = gs[g], eds = G.edges.filter(e => dst.some(n => n.id === e.to)), prev = g === 1 ? (allCols ? "X" : "X_in") : `a${g - 1}`;
      const tags = ["loop", ...dst.map(n => NT(n.id))], pr = { kind: "node", id: dst[0].id };
      const key = addOp({ key: `z${g}`, kind: "mz", prims: dst.map(n => ["z", n.id]), nodes: dst.map(n => n.id), edges: eds.map(e => e.id), g });
      add(cm(`    z${g} = ${prev} @ W${g} + b${g}`, C.wsumCol(dst.map(V).join(", "))), [...tags, ...eds.map(e => ET(e.id))], key, pr);
      const k2 = addOp({ key: `a${g}`, kind: "ma", prims: dst.map(n => ["a", n.id]), nodes: dst.map(n => n.id), edges: [], g });
      add(cm(`    a${g} = ${ACT[dst[0].act].py}(z${g})`, g === G.matrix.L ? C.outAct : C.acts), tags, k2, pr);
    }
  }
  add("", ["loop"]);
  add("    # " + C.lossC, ["loop"]);
  const kl = addOp({ key: "loss", kind: "loss", prims: [["loss"]], nodes: [out.id], edges: [] });
  if (loss === "bce") add(`    loss = -np.mean(y * np.log(${outVar} + 1e-9) + (1 - y) * np.log(1 - ${outVar} + 1e-9))`, ["loop", NT(out.id)], kl, { kind: "node", id: out.id });
  else add(`    loss = np.mean((${outVar} - y) ** 2)`, ["loop", NT(out.id)], kl, { kind: "node", id: out.id });
  if (plot) add("    losses.append(loss)", ["loop"]);
  add("", ["loop"]);
  if (flat) {
    add("    # " + C.backN, ["loop"]);
    for (const n of [...G.compute].reverse()) {
      const key = addOp({ key: `d:${n.id}`, kind: "d", prims: [["d", n.id]], nodes: [n.id], edges: G.outE.get(n.id).map(e => e.id), id: n.id });
      const tags = ["loop", NT(n.id), ...G.outE.get(n.id).map(e => ET(e.id))], pr = { kind: "node", id: n.id };
      const dn = `d_${V(n)}`;
      if (n.type === "output") {
        add(loss === "bce" ? cm(`    ${dn} = (${outName} - y) / n`, C.errOut) : cm(`    ${dn} = 2 * (${outName} - y) / n * sigmoid_deriv(${outName})`, C.errOut), tags, key, pr);
      } else {
        const terms = G.outE.get(n.id).map(e => `d_${V(G.byId.get(e.to))} * ${wn(e)}`);
        const ls = terms.length === 1 ? [`    ${dn} = ${terms[0]} * ${ACT[n.act].pyD}(${V(n)})`] : wrapSum(`    ${dn} = `, terms, ` * ${ACT[n.act].pyD}(${V(n)})`, true);
        ls.forEach((l, i) => add(i === 0 && ls.length === 1 ? cm(l, C.errBack(V(n))) : l, tags, key, pr));
      }
    }
    add("", ["loop"]);
    add("    # " + C.upd1, ["loop"]);
    add("    # " + C.upd2, ["loop"]);
    for (const n of G.compute) {
      for (const e of G.inE.get(n.id)) {
        const key = addOp({ key: `uw:${e.id}`, kind: "uw", prims: [["gw", e.id], ["aw", e.id]], nodes: [n.id, e.from], edges: [e.id], id: e.id });
        add(`    ${wn(e)} -= learning_rate * np.sum(${V(G.byId.get(e.from))} * d_${V(n)})`, ["loop", ET(e.id), NT(n.id)], key, { kind: "edge", id: e.id });
      }
      const key = addOp({ key: `ub:${n.id}`, kind: "ub", prims: [["gb", n.id], ["ab", n.id]], nodes: [n.id], edges: [], id: n.id });
      add(`    b_${V(n)} -= learning_rate * np.sum(d_${V(n)})`, ["loop", NT(n.id)], key, { kind: "node", id: n.id });
    }
  } else {
    add("    # " + C.backM, ["loop"]);
    const gs = G.matrix.groups, L = G.matrix.L;
    for (let g = L; g >= 1; g--) {
      const dst = gs[g], src = gs[g - 1], eds = G.edges.filter(e => dst.some(n => n.id === e.to));
      const full = eds.length === src.length * dst.length, prev = g === 1 ? (allCols ? "X" : "X_in") : `a${g - 1}`;
      const tags = ["loop", ...dst.map(n => NT(n.id))], pr = { kind: "node", id: dst[0].id };
      const kd = addOp({ key: `d${g}`, kind: "md", prims: dst.map(n => ["d", n.id]), nodes: dst.map(n => n.id), edges: G.edges.filter(e => dst.some(n => n.id === e.from)).map(e => e.id), g });
      if (g === L) add(loss === "bce" ? cm(`    d${g} = (a${g} - y) / n`, C.errOut) : cm(`    d${g} = 2 * (a${g} - y) / n * sigmoid_deriv(a${g})`, C.errOut), tags, kd, pr);
      else add(cm(`    d${g} = (d${g + 1} @ W${g + 1}.T) * ${ACT[dst[0].act].pyD}(a${g})`, C.errCol), tags, kd, pr);
      const kw = addOp({ key: `dW${g}`, kind: "mdW", prims: eds.map(e => ["gw", e.id]), nodes: dst.map(n => n.id), edges: eds.map(e => e.id), g });
      add(cm(full ? `    dW${g} = ${prev}.T @ d${g}` : `    dW${g} = (${prev}.T @ d${g}) * M${g}`, full ? C.gradW(g) : C.onlyDrawn), [...tags, ...eds.map(e => ET(e.id))], kw, pr);
      const kb = addOp({ key: `db${g}`, kind: "mdb", prims: dst.map(n => ["gb", n.id]), nodes: dst.map(n => n.id), edges: [], g });
      add(cm(`    db${g} = d${g}.sum(axis=0, keepdims=True)`, C.gradB(g)), tags, kb, pr);
    }
    add("", ["loop"]);
    add("    # " + C.updM, ["loop"]);
    for (let g = 1; g <= L; g++) {
      const dst = gs[g], eds = G.edges.filter(e => dst.some(n => n.id === e.to)), tags = ["loop", ...dst.map(n => NT(n.id))], pr = { kind: "node", id: dst[0].id };
      add(`    W${g} -= learning_rate * dW${g}`, [...tags, ...eds.map(e => ET(e.id))], addOp({ key: `uW${g}`, kind: "muW", prims: eds.map(e => ["aw", e.id]), nodes: dst.map(n => n.id), edges: eds.map(e => e.id), g }), pr);
      add(`    b${g} -= learning_rate * db${g}`, tags, addOp({ key: `ub${g}`, kind: "mub", prims: dst.map(n => ["ab", n.id]), nodes: dst.map(n => n.id), edges: [], g }), pr);
    }
  }
  add("", ["loop"]);
  const kp = addOp({ key: "print", kind: "print", prims: [["print"]], nodes: [], edges: [] });
  const [wE, wL, wA] = C.pEpoch;
  add("    if epoch % print_every == 0:", ["loop"], kp);
  add(`        accuracy = np.mean((${outVar} > 0.5) == y)`, ["loop"], kp);
  add(`        print(f"${wE} {epoch:5d}  ${wL} {loss:.4f}  ${wA} {accuracy:.0%}")`, ["loop"], kp);
  add("");

  /* 6. results */
  sec(5);
  add("def predict(data):");
  add(`    """${C.predictDoc}"""`);
  if (flat) {
    for (const n of G.usedInputs) add(`    ${V(n)} = data[:, ${n.feature}]`, [NT(n.id)], null, { kind: "node", id: n.id });
    for (const n of G.compute) {
      const ins = G.inE.get(n.id), terms = [...ins.map(e => `${wn(e)} * ${V(G.byId.get(e.from))}`), `b_${V(n)}`];
      const pre = n.type === "output" ? `    return ${ACT[n.act].py}(` : `    ${V(n)} = ${ACT[n.act].py}(`;
      wrapSum(pre, terms, ")", false).forEach(l => add(l, [NT(n.id)], null, { kind: "node", id: n.id }));
    }
  } else {
    const gs = G.matrix.groups, L = G.matrix.L;
    for (let g = 1; g <= L; g++) {
      const prev = g === 1 ? (allCols ? "data" : "data[:, cols]") : `h${g - 1}`, dst = gs[g];
      add(g === L ? `    return ${ACT[dst[0].act].py}(${prev} @ W${g} + b${g})` : `    h${g} = ${ACT[dst[0].act].py}(${prev} @ W${g} + b${g})`, dst.map(n => NT(n.id)), null, { kind: "node", id: dst[0].id });
    }
  }
  add("");
  const T = flat ? "target" : "target[0]", P = flat ? "p" : "p[0]";
  if (ds.kind === "table") {
    add(`print("\\n${C.pPred}")`);
    add("for inputs, target, p in zip(X, y, predict(X)):");
    add(`    print(f"  ${C.pInput} {inputs.astype(int)}  ${C.pTarget} {int(${T})}  ${C.pOutput} {${P}:.3f}")`);
  } else if (ds.kind === "points") {
    add("final_accuracy = np.mean((predict(X) > 0.5) == y)");
    add(`print(f"\\n${C.pFinal} {final_accuracy:.0%}")`);
  } else {
    add(`print("\\n${C.pNew}")`);
    add("test_out = predict(X_test)");
    add("for s, target, p in zip(test_strings, y_test, test_out):");
    add(`    answer = "${C.pG}" if ${P} > 0.5 else "${C.pNG}"`);
    add(`    truth = "${C.pG}" if ${T} == 1 else "${C.pNG}"`);
    add(`    print(f"  {s:10s} p = {${P}:.2f}  ${C.pSays} {answer:16s} ${C.pTruth} {truth}")`);
    add("test_accuracy = np.mean((test_out > 0.5) == y_test)");
    add(`print(f"${C.pTest} {test_accuracy:.0%}  ${C.pPeople}")`);
  }
  if (plot) {
    add("");
    add("# " + C.plotC);
    add("plt.figure(figsize=(6, 3.5))");
    add("plt.plot(losses)");
    add(`plt.title("${C.plotT}")`);
    add(`plt.xlabel("${C.plotX}")`);
    add(`plt.ylabel("${C.plotY}")`);
    add("plt.grid(alpha=0.3)");
    add("plt.tight_layout()");
    add("plt.show()");
  }
  const opLines = {};
  lines.forEach((l, i) => { if (l.op) (opLines[l.op] = opLines[l.op] || []).push(i); });
  return { lines, ops, opLines, text: lines.map(l => l.t).join("\n") + "\n" };
}
function invalidProgram(G, lang) {
  const H = lang === "es"
    ? ["# La red del lienzo todavía no está terminada.", "# Corrige estos problemas y el código Python aparecerá aquí:"]
    : ["# The network on the canvas is not finished yet.", "# Fix these problems and the Python code will appear here:"];
  const lines = [{ t: H[0], tags: [] }, { t: H[1], tags: [] }, { t: "", tags: [] }];
  G.errors.forEach(e => lines.push({ t: `#   - ${e.msg}`, tags: e.id ? [`node:${e.id}`] : [], primary: e.id ? { kind: "node", id: e.id } : null }));
  return { lines, ops: [], opLines: {}, text: lines.map(l => l.t).join("\n") + "\n" };
}

/* ================= Engine: runs the same steps as the Python program ================= */
/* np.sum / np.mean use pairwise summation; copy it so the page matches Python digit for digit */
function pwSum(a, lo, n) {
  if (n < 8) { let r = 0; for (let i = 0; i < n; i++) r += a[lo + i]; return r; }
  if (n <= 128) {
    const r = [a[lo], a[lo + 1], a[lo + 2], a[lo + 3], a[lo + 4], a[lo + 5], a[lo + 6], a[lo + 7]];
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[lo + i + j];
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
    for (; i < n; i++) res += a[lo + i];
    return res;
  }
  let n2 = Math.floor(n / 2); n2 -= n2 % 8;
  return pwSum(a, lo, n2) + pwSum(a, lo + n2, n - n2);
}
const npSum = a => pwSum(a, 0, a.length);
function seqSum(a) { let s = a[0]; for (let i = 1; i < a.length; i++) s += a[i]; return s; }
const pyPct = v => { const x = v * 100; let r = Math.round(x); if (Math.abs(x % 1) === 0.5) r = 2 * Math.round(x / 2); return r + "%"; };
function createRun(spec, G, prog) {
  const ds = G.ds, n = ds.X.length, mt = MT19937(spec.seed);
  const r = { spec, G, prog, n, a: {}, z: {}, d: {}, w: {}, gw: {}, b: {}, gb: {}, y: Float64Array.from(ds.y), loss: null, accuracy: null,
    epoch: 0, pos: 0, started: false, done: false, history: [], log: [], lastOp: null, lastNote: "", outId: G.compute[G.compute.length - 1].id };
  for (const nd of G.order.filter(x => x.type === "input")) r.a[nd.id] = Float64Array.from(ds.X.map(row => row[nd.feature]));
  for (const e of G.edges) { r.w[e.id] = 0; r.gw[e.id] = 0; }
  for (const nd of G.compute) { r.b[nd.id] = 0; r.gb[nd.id] = 0; }
  if (spec.style === "matrix" && G.matrix.ok) {
    const gs = G.matrix.groups;
    for (let g = 1; g < gs.length; g++) {
      const S = gs[g - 1], D = gs[g], sc = ACT[D[0].act].relu ? Math.sqrt(2 / S.length) : Math.sqrt(1 / S.length);
      for (const a of S) for (const b of D) { const v = mt.gauss() * sc, e = G.edges.find(x => x.from === a.id && x.to === b.id); if (e) r.w[e.id] = v; }
    }
  } else {
    for (const nd of G.compute) {
      const ins = G.inE.get(nd.id), sc = ACT[nd.act].relu ? Math.sqrt(2 / ins.length) : Math.sqrt(1 / ins.length);
      for (const e of ins) r.w[e.id] = mt.gauss() * sc;
    }
  }
  r.ops = prog.ops;
  r.matrixMode = spec.style === "matrix" && G.matrix.ok;
  r.edgeById = new Map(G.edges.map(e => [e.id, e]));
  return r;
}
function prim(r, p) {
  const G = r.G, n = r.n, t = p[0], id = p[1];
  if (t === "z") {
    const z = new Float64Array(n), ins = G.inE.get(id);
    ins.forEach((e, j) => { const w = r.w[e.id], a = r.a[e.from]; for (let i = 0; i < n; i++) z[i] = j ? z[i] + w * a[i] : w * a[i]; });
    const b = r.b[id]; for (let i = 0; i < n; i++) z[i] += b;
    r.z[id] = z;
  } else if (t === "a") { const f = ACT[G.byId.get(id).act].f; r.a[id] = r.z[id].map(f); }
  else if (t === "loss") {
    const a = r.a[r.outId], y = r.y, t = new Float64Array(n);
    if (r.spec.loss === "bce") { for (let i = 0; i < n; i++) t[i] = y[i] * Math.log(a[i] + 1e-9) + (1 - y[i]) * Math.log(1 - a[i] + 1e-9); r.loss = -(npSum(t) / n); }
    else { for (let i = 0; i < n; i++) t[i] = (a[i] - y[i]) ** 2; r.loss = npSum(t) / n; }
  } else if (t === "d") {
    const nd = G.byId.get(id), a = r.a[id], d = new Float64Array(n);
    if (nd.type === "output") { for (let i = 0; i < n; i++) d[i] = r.spec.loss === "bce" ? (a[i] - r.y[i]) / n : 2 * (a[i] - r.y[i]) / n * (a[i] * (1 - a[i])); }
    else {
      const der = ACT[nd.act].d;
      G.outE.get(id).forEach((e, j) => { const w = r.w[e.id], dt = r.d[e.to]; for (let i = 0; i < n; i++) d[i] = j ? d[i] + dt[i] * w : dt[i] * w; });
      for (let i = 0; i < n; i++) d[i] *= der(a[i]);
    }
    r.d[id] = d;
  } else if (t === "gw") {
    const e = r.edgeById.get(id), a = r.a[e.from], d = r.d[e.to];
    if (r.matrixMode) { let s = 0; for (let i = 0; i < n; i++) s += a[i] * d[i]; r.gw[id] = s; }
    else { const pr = new Float64Array(n); for (let i = 0; i < n; i++) pr[i] = a[i] * d[i]; r.gw[id] = npSum(pr); }
  }
  else if (t === "aw") r.w[id] -= r.spec.lr * r.gw[id];
  else if (t === "gb") r.gb[id] = r.matrixMode ? seqSum(r.d[id]) : npSum(r.d[id]);
  else if (t === "ab") r.b[id] -= r.spec.lr * r.gb[id];
  else if (t === "print") {
    if (r.epoch % r.spec.printEvery === 0) {
      const a = r.a[r.outId]; let c = 0; for (let i = 0; i < n; i++) if ((a[i] > 0.5) === (r.y[i] === 1)) c++;
      r.accuracy = c / n;
      const [wE, wL, wA] = CT[r.spec.lang].pEpoch;
      r.log.push(`${wE} ${String(r.epoch).padStart(5)}  ${wL} ${r.loss.toFixed(4)}  ${wA} ${pyPct(r.accuracy)}`);
    } else r.lastNote = "skip";
  }
}
function startRun(r) { if (r.started) return; r.started = true; r.log.push(CT[r.spec.lang].pTrain(r.G.ds.name)); }
function execOp(r, op) { r.lastNote = ""; for (const p of op.prims) prim(r, p); r.lastOp = op; }
function endEpoch(r) {
  r.history.push([r.epoch, r.loss]);
  if (r.epoch % r.spec.printEvery === 0 || r.accuracy == null) {
    const a = r.a[r.outId]; let c = 0; for (let i = 0; i < r.n; i++) if ((a[i] > 0.5) === (r.y[i] === 1)) c++; r.trainAcc = c / r.n;
  }
  r.pos = 0; r.epoch++; if (r.epoch > r.spec.epochs) finishRun(r);
}
function stepOp(r) { if (r.done) return null; startRun(r); const op = r.ops[r.pos]; execOp(r, op); r.pos++; if (r.pos >= r.ops.length) endEpoch(r); return op; }
function runEpochs(r, count) {
  startRun(r);
  for (let c = 0; c < count && !r.done; c++) { while (r.pos < r.ops.length) { execOp(r, r.ops[r.pos]); r.pos++; } endEpoch(r); }
}
function forwardRows(r, rows) {
  const G = r.G, m = rows.length, v = {};
  for (const nd of G.order) {
    if (nd.type === "input") { v[nd.id] = rows.map(x => x[nd.feature]); continue; }
    const f = ACT[nd.act].f, ins = G.inE.get(nd.id), z = new Array(m).fill(0);
    ins.forEach((e, j) => { const w = r.w[e.id], a = v[e.from]; for (let i = 0; i < m; i++) z[i] = j ? z[i] + w * a[i] : w * a[i]; });
    const b = r.b[nd.id];
    v[nd.id] = z.map(x => f(x + b));
  }
  return v;
}
function finishRun(r) {
  r.done = true; const G = r.G, ds = G.ds, C = CT[r.spec.lang], oid = r.outId;
  if (ds.kind === "table") {
    r.log.push("", C.pPred);
    const o = forwardRows(r, ds.X)[oid];
    ds.X.forEach((x, i) => r.log.push(`  ${C.pInput} [${x.join(" ")}]  ${C.pTarget} ${ds.y[i]}  ${C.pOutput} ${o[i].toFixed(3)}`));
  } else if (ds.kind === "points") {
    const o = forwardRows(r, ds.X)[oid]; let c = 0; o.forEach((p, i) => { if ((p > 0.5) === (ds.y[i] === 1)) c++; });
    r.log.push("", `${C.pFinal} ${pyPct(c / ds.X.length)}`);
  } else {
    r.log.push("", C.pNew);
    const o = forwardRows(r, ds.XTest)[oid]; let c = 0;
    ds.testStrings.forEach((s, i) => {
      const p = o[i], ans = p > 0.5 ? C.pG : C.pNG, truth = ds.yTest[i] === 1 ? C.pG : C.pNG;
      if ((p > 0.5) === (ds.yTest[i] === 1)) c++;
      r.log.push(`  ${s.padEnd(10)} p = ${p.toFixed(2)}  ${C.pSays} ${ans.padEnd(16)} ${C.pTruth} ${truth}`);
    });
    r.log.push(`${C.pTest} ${pyPct(c / ds.testStrings.length)}  ${C.pPeople}`);
  }
}

/* ================= Layout and templates ================= */
let SEQ = 0;
const newId = p => `${p}${(++SEQ).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
function tidyGraph(graph) {
  const byId = new Map(graph.nodes.map(n => [n.id, n])), inc = new Map(graph.nodes.map(n => [n.id, []]));
  graph.edges.forEach(e => { if (inc.has(e.to) && byId.has(e.from)) inc.get(e.to).push(e.from); });
  const depth = new Map(), visiting = new Set();
  const dep = id => {
    if (depth.has(id)) return depth.get(id); if (visiting.has(id)) return 0; visiting.add(id);
    const n = byId.get(id); let d = n.type === "input" ? 0 : 1;
    for (const s of inc.get(id)) d = Math.max(d, dep(s) + 1);
    visiting.delete(id); depth.set(id, d); return d;
  };
  graph.nodes.forEach(n => dep(n.id));
  let maxD = Math.max(1, ...[...depth.values()]);
  graph.nodes.filter(n => n.type === "output").forEach(n => { maxD = Math.max(maxD, depth.get(n.id)); });
  graph.nodes.filter(n => n.type === "output").forEach(n => depth.set(n.id, maxD));
  const cols = []; for (let d = 0; d <= maxD; d++) cols.push(graph.nodes.filter(n => depth.get(n.id) === d));
  const maxCount = Math.max(...cols.map(c => c.length));
  const sp = maxCount > 8 ? 62 : 84, colW = 210;
  const cx = (maxD * colW) / 2;
  cols.forEach((c, d) => {
    if (d === 0) c.sort((a, b) => (a.type === "input" ? a.feature : 99) - (b.type === "input" ? b.feature : 99));
    else c.sort((a, b) => {
      const by = n => { const s = inc.get(n.id); return s.length ? s.reduce((t, id) => t + byId.get(id).y, 0) / s.length : n.y; };
      return by(a) - by(b) || naturalKey(a.name || "") .localeCompare(naturalKey(b.name || ""));
    });
    const x = d * colW - cx;
    c.forEach((n, i) => { n.x = Math.round(x); n.y = Math.round((i - (c.length - 1) / 2) * sp); });
  });
  return graph;
}
function layeredGraph(nIn, hidden, extra) {
  const nodes = [], edges = [], layers = [];
  layers.push(Array.from({ length: nIn }, (_, f) => { const n = { id: newId("n"), type: "input", feature: f, x: 0, y: 0 }; nodes.push(n); return n; }));
  let k = 1;
  hidden.forEach(h => layers.push(Array.from({ length: h.units }, () => { const n = { id: newId("n"), type: "hidden", name: "h" + (k++), act: h.act, x: 0, y: 0 }; nodes.push(n); return n; })));
  const out = { id: newId("n"), type: "output", name: "out", act: "sigmoid", x: 0, y: 0 }; nodes.push(out); layers.push([out]);
  for (let i = 1; i < layers.length; i++) for (const a of layers[i - 1]) for (const b of layers[i]) edges.push({ id: newId("e"), from: a.id, to: b.id });
  if (extra) extra(layers).forEach(([a, b]) => edges.push({ id: newId("e"), from: a.id, to: b.id }));
  return tidyGraph({ nodes, edges });
}
const TEMPLATE_INFO = {
  perceptron: { en: ["Perceptron", "One output neuron learns AND. No hidden layer."], es: ["Perceptrón", "Una neurona de salida aprende AND. Sin capa oculta."] },
  xor: { en: ["XOR with a hidden layer", "Three hidden neurons solve XOR, which a perceptron cannot."], es: ["XOR con capa oculta", "Tres neuronas ocultas resuelven XOR, algo que un perceptrón no puede."] },
  shortcut: { en: ["XOR with shortcut arrows", "One hidden neuron plus arrows that skip straight to the output."], es: ["XOR con flechas directas", "Una neurona oculta más flechas que van directo a la salida."] },
  parity: { en: ["3-input parity", "XOR with three inputs. Needs a wider hidden layer."], es: ["Paridad de 3 entradas", "XOR con tres entradas. Necesita una capa oculta más ancha."] },
  circles: { en: ["Circles", "Two hidden layers bend the boundary into a ring."], es: ["Círculos", "Dos capas ocultas doblan la frontera en forma de anillo."] },
  moons: { en: ["Two moons", "Curved classes that hook into each other."], es: ["Dos lunas", "Clases curvas que se enganchan entre sí."] },
  spiral: { en: ["Spiral", "A hard problem: two arms winding around each other."], es: ["Espiral", "Un problema difícil: dos brazos que giran uno alrededor del otro."] },
  agl: { en: ["Artificial grammar", "Reber (1967): is a letter string grammatical?"], es: ["Gramática artificial", "Reber (1967): ¿una cadena de letras es gramatical?"] },
  blank: { en: ["Blank canvas", "Only the inputs. Build the rest yourself."], es: ["Lienzo en blanco", "Solo las entradas. Construye el resto tú."] }
};
const TEMPLATE_NOTES = {
  shortcut: { en: "Shortcut arrows: x1 and x2 also connect straight to the output. Delete them and XOR can no longer be learned.",
              es: "Flechas directas: x1 y x2 también se conectan directo a la salida. Bórralas y XOR ya no se puede aprender." },
  perceptron: { en: "A single neuron draws one straight line. Switch the data to XOR and see it fail.",
                es: "Una sola neurona traza una línea recta. Cambia los datos a XOR y mira cómo falla." }
};
function makeTemplate(key, lang) {
  lang = lang || "en";
  const base = { loss: "bce", lr: 0.5, epochs: 2000, seed: 3 };
  let data, graph, train = {};
  switch (key) {
    case "perceptron": data = { kind: "logic", inputs: 2, targets: [0, 0, 0, 1] }; graph = layeredGraph(2, []); train = { epochs: 1000 }; break;
    case "xor": data = { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] }; graph = layeredGraph(2, [{ units: 3, act: "tanh" }]); break;
    case "shortcut": data = { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] }; graph = layeredGraph(2, [{ units: 1, act: "tanh" }], L => L[0].map(x => [x, L[2][0]])); break;
    case "parity": data = { kind: "logic", inputs: 3, targets: [0, 1, 1, 0, 1, 0, 0, 1] }; graph = layeredGraph(3, [{ units: 5, act: "tanh" }]); train = { epochs: 3000 }; break;
    case "circles": data = { kind: "circles" }; graph = layeredGraph(2, [{ units: 6, act: "tanh" }, { units: 4, act: "tanh" }]); train = { epochs: 3000 }; break;
    case "moons": data = { kind: "moons" }; graph = layeredGraph(2, [{ units: 6, act: "tanh" }, { units: 4, act: "tanh" }]); train = { epochs: 3000 }; break;
    case "spiral": data = { kind: "spiral" }; graph = layeredGraph(2, [{ units: 10, act: "tanh" }, { units: 8, act: "tanh" }]); train = { epochs: 6000, lr: 0.3 }; break;
    case "agl": data = { kind: "agl" }; graph = layeredGraph(10, [{ units: 4, act: "sigmoid" }]); train = { epochs: 1500, lr: 1.0 }; break;
    default: { data = { kind: "logic", inputs: 2, targets: [0, 1, 1, 0] }; graph = layeredGraph(2, []); graph.edges = []; graph.nodes = graph.nodes.filter(n => n.type === "input"); graph.nodes.forEach(n => n.x = -220); }
  }
  const notes = [];
  if (TEMPLATE_NOTES[key]) {
    const ys = graph.nodes.map(n => n.y), xs = graph.nodes.map(n => n.x);
    notes.push({ id: newId("t"), x: Math.min(...xs) - 20, y: Math.min(...ys) - 170, w: 300, text: TEMPLATE_NOTES[key][lang], color: "yellow", size: 15 });
  }
  return { title: TEMPLATE_INFO[key] ? TEMPLATE_INFO[key][lang][0] : "Network", data, graph, notes, training: Object.assign(base, train) };
}

NS.core = { MT19937, CT, ACT, ACT_ORDER, BIGRAMS, AGL, GATES, getDataset, logicRows, gateName, nodeVar, checkName, compileGraph, wouldCycle,
  buildSpec, buildProgram, npSum, invalidProgram, createRun, stepOp, runEpochs, forwardRows, pyPct, tidyGraph, layeredGraph, makeTemplate, newId,
  TEMPLATE_INFO, naturalKey, PY_KEYWORDS };
})(typeof window !== "undefined" ? window : globalThis);
