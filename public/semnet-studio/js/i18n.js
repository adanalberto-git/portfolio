/* ==========================================================================
   Internacionalización (es/en). Diccionario + helpers de traducción.
   i18n / Internationalization (es/en). Dictionary + translation helpers.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "semnet-studio:lang:v1";
  var DEFAULT_LANG = "es";

  var STRINGS = {
    es: {
      docTitle: "Semantic Network & Prolog Studio",
      topbar: {
        tabNetwork: "Diseñador de Redes",
        tabIde: "Editor Prolog",
        tabHelp: "Ayuda",
        autosaved: "Guardado automático",
        sendToIde: "Enviar a Prolog",
        sendToIdeTitle: "Genera el código Prolog de tu red y ábrelo en el Editor Prolog"
      },
      toolbar: {
        move: "Mover", moveTitle: "Seleccionar y mover (V)",
        node: "Nodo", nodeTitle: "Agregar nodo (N)",
        link: "Enlace", linkTitle: "Crear enlace (L)",
        pan: "Mano", panTitle: "Desplazar el lienzo (Espacio)",
        delete: "Borrar", deleteTitle: "Eliminar seleccionado (Supr)",
        undo: "Deshacer", undoTitle: "Deshacer (Ctrl+Z)",
        redo: "Rehacer", redoTitle: "Rehacer (Ctrl+Y)",
        rules: "Reglas", rulesTitle: "Abrir el constructor de reglas",
        newNet: "Nueva", newNetTitle: "Nueva red",
        json: "JSON", jsonTitle: "Descargar red como JSON",
        importBtn: "Importar", importTitle: "Importar red desde JSON",
        image: "Imagen", imageTitle: "Descargar red como imagen PNG"
      },
      canvas: {
        emptyTitle: "Tu lienzo está vacío.",
        emptyBodyHtml: 'Elige la herramienta <b>Nodo</b> y haz clic en el lienzo para crear tu primer concepto. Luego usa <b>Enlace</b> para conectarlos.',
        zoomIn: "Acercar", zoomReset: "Ajustar a la pantalla", zoomOut: "Alejar"
      },
      inspector: {
        emptyHtml: 'Selecciona un nodo o un enlace para ver y editar sus propiedades aquí, o abre el constructor de <b>Reglas</b> desde la barra de herramientas.',
        nodeProps: "Propiedades del nodo",
        label: "Etiqueta",
        actions: "Acciones",
        deleteNode: "Eliminar nodo y sus enlaces",
        edgeTitle: "Enlace: {from} → {to}",
        relationType: "Tipo de relación",
        customRelation: "O escribe una relación personalizada",
        customRelationPlaceholder: "p. ej. teme_a",
        arrowStyle: "Estilo de la flecha",
        direction: "Dirección",
        oneWay: "→ Un sentido",
        twoWay: "↔ Doble sentido",
        lineStyle: "Estilo de línea",
        solid: "Sólida", dashed: "Discontinua", dotted: "Punteada",
        color: "Color",
        deleteEdge: "Eliminar enlace"
      },
      relation: {
        is_a: "is_a (es un / es una)",
        part_of: "part_of (es parte de)",
        related_to: "related_to (relacionado con)",
        causes: "causes (causa)",
        precedes: "precedes (precede a)",
        instance_of: "instance_of (instancia de)",
        has_property: "has_property (tiene la propiedad)",
        same_as: "same_as (es igual a)"
      },
      modal: {
        cancel: "Cancelar", accept: "Aceptar", yesContinue: "Sí, continuar",
        newNetTitle: "¿Crear una red nueva?",
        newNetDesc: "Se borrará la red actual de este navegador (nodos, enlaces y reglas). Si quieres conservarla, expórtala primero como JSON.",
        newNetOk: "Sí, empezar de nuevo",
        newNodeTitle: "Nuevo nodo",
        newNodePlaceholder: "p. ej. perro",
        newNodeDesc: "Escribe el nombre del concepto para este nodo.",
        renameNodeTitle: "Renombrar nodo",
        promptDefaultTitle: "Escribe un valor",
        confirmDefaultTitle: "¿Confirmar?",
        deleteRuleTitle: "¿Eliminar esta regla?",
        deleteRuleDesc: 'Se eliminará la regla "{title}" y todas sus condiciones.',
        deleteRuleOk: "Sí, eliminar"
      },
      toast: {
        canvasCleared: "Lienzo nuevo listo.",
        jsonDownloaded: "JSON descargado.",
        jsonImported: "Red importada correctamente.",
        jsonImportError: "No se pudo leer ese archivo JSON.",
        pngDownloaded: "Imagen descargada.",
        pngError: "No se pudo generar la imagen.",
        addNodeFirstForImage: "Agrega al menos un nodo antes de exportar una imagen.",
        pickTarget: "Ahora haz clic en el nodo de destino.",
        pickDifferentTarget: "Elige un nodo distinto como destino.",
        fileImported: 'Archivo "{name}" importado.',
        cantReadFile: "No se pudo leer el archivo.",
        programConsulted: "Programa consultado.",
        consultError: "Error al consultar el programa.",
        needNodeOrRule: "Agrega al menos un nodo o una regla antes de enviar a Prolog.",
        codeSentToIde: "Código Prolog generado y cargado en el Editor Prolog."
      },
      rules: {
        panelTitle: "Reglas Prolog",
        newRule: "+ Nueva regla",
        emptyHtml: 'Todavía no hay reglas. Haz clic en <b>+ Nueva regla</b> para definir una nueva relación derivada (por ejemplo, "todo lo que está bajo una categoría") a partir de las relaciones de tu red.',
        predicateName: "Nombre del predicado",
        variablesLabel: "Variables (separadas por comas)",
        addCondition: "+ Agregar condición",
        kindCall: "Relación",
        kindCompare: "Comparación",
        namePlaceholder: "ej. is_a",
        deleteRuleTitle: "Eliminar esta regla",
        deleteConditionTitle: "Eliminar esta condición",
        negateTitle: "Negar esta condición (que NO se cumpla)",
        opNotUnify: "\\=  (no se unifican)",
        opUnify: "=  (se unifican)",
        opIdentical: "==  (idénticos)",
        opNotIdentical: "\\==  (no idénticos)"
      },
      ide: {
        newFile: "Nuevo archivo",
        openImport: "Abrir / Importar .pl",
        exportBtn: "Exportar .pl",
        filesInSession: "Archivos de esta sesión",
        unsavedTitle: "Cambios sin guardar",
        syntaxHint: "Sintaxis",
        syntaxHintTitle: "Consejo: usa % para comentarios",
        consult: "Consultar programa",
        consoleTitle: "Consola de consultas",
        clear: "Limpiar",
        queryPlaceholder: "escribe una consulta, p. ej. under(violin, instruments).",
        run: "Ejecutar",
        closeFileTitle: "Cerrar este archivo",
        untitledBase: "sin-titulo",
        defaultProgramComment: "% Escribe tu programa Prolog aqui.\n% Ejemplo:\n% is_a(perro, mamifero).\n% is_a(mamifero, animal).\n% ?- is_a(perro, animal).\n",
        placeholder: "% Escribe tu programa Prolog aquí...",
        consulting: "Consultando {name}...",
        consultedOk: "Programa consultado correctamente. Ya puedes escribir consultas.",
        consultErrorPrefix: "Error al consultar el programa: {err}",
        needConsultFirst: 'Primero debes presionar "Consultar programa".',
        needConsultFirstToast: "Primero consulta tu programa.",
        falseLine: "false.",
        noMoreSolutions: "No hay más soluciones.",
        trueLine: "true.",
        nextSolution: "Siguiente solución ;",
        stepLimit: "Se alcanzó el límite de pasos permitidos para esta consulta.",
        errorPrefix: "Error: {err}",
        queryErrorPrefix: "Error en la consulta: {err}",
        engineNotLoaded: "El motor de Prolog (Tau Prolog) no se cargó correctamente."
      },
      gen: {
        headerLine1: "Red semantica generada con Semantic Network & Prolog Studio",
        headerLine2: "Fecha: {date}",
        factsHeader: "---- Hechos (relaciones entre conceptos) ----",
        noFacts: "(todavia no hay enlaces en la red)",
        rulesHeader: "---- Reglas ----",
        noRules: "(todavia no se han definido reglas)"
      },
      help: {
        heroTitle: "Centro de ayuda",
        heroSubtitle: "Guía rápida de cada herramienta de Semantic Network & Prolog Studio.",
        nav: {
          nodes: "Nodos", links: "Enlaces", rules: "Reglas",
          exportImport: "Exportar e importar", ide: "Editor Prolog",
          queries: "Consultas", shortcuts: "Atajos de teclado"
        },
        nodes: {
          title: "Crear y editar nodos",
          bodyHtml:
            '<ol class="help-step-list">' +
            '<li>Haz clic en la herramienta <b>Nodo</b> en la barra izquierda (o presiona <span class="help-kbd">N</span>).</li>' +
            '<li>Haz clic en cualquier parte vacía del lienzo para crear un nodo nuevo ahí mismo.</li>' +
            '<li>Escribe el nombre del concepto (por ejemplo <code>perro</code>) y presiona <span class="help-kbd">Enter</span>.</li>' +
            '<li>Para mover un nodo, cambia a la herramienta <b>Mover</b> (<span class="help-kbd">V</span>) y arrástralo con el mouse.</li>' +
            '<li>Para renombrar un nodo, haz doble clic sobre él.</li>' +
            '<li>Para borrar un nodo (y todos sus enlaces), selecciónalo y presiona <span class="help-kbd">Supr</span> o usa el botón <b>Borrar</b>.</li>' +
            '</ol>'
        },
        links: {
          title: "Crear enlaces entre conceptos",
          bodyHtml:
            '<p>Un enlace representa una relación entre dos nodos (por ejemplo, "es un", "forma parte de" o cualquier relación que tú definas). Cada enlace se convierte directamente en un hecho de Prolog.</p>' +
            '<ol class="help-step-list">' +
            '<li>Elige la herramienta <b>Enlace</b> (<span class="help-kbd">L</span>).</li>' +
            '<li>Haz clic en el nodo de origen y después en el nodo de destino.</li>' +
            '<li>En el panel derecho, elige una relación de la lista (<code>is_a</code>, <code>part_of</code>, <code>related_to</code>, <code>causes</code>, <code>precedes</code>, <code>instance_of</code>, <code>has_property</code>, <code>same_as</code>) o escribe tu propia relación personalizada en el campo de texto.</li>' +
            '<li>También puedes elegir si la flecha es de un solo sentido o de doble sentido, el estilo de línea (sólida, discontinua, punteada) y el color.</li>' +
            '<li>Para seleccionar un enlace ya creado, haz clic sobre la línea o su etiqueta.</li>' +
            '</ol>' +
            '<p>El nombre de la relación se usa como el nombre del predicado en Prolog. Si escribes una relación personalizada con mayúsculas, espacios o símbolos, el programa la convertirá automáticamente en un átomo válido de Prolog (entre comillas si hace falta), sin cambiar lo que ves en el diagrama.</p>'
        },
        rules: {
          title: "Construir reglas (sin escribir Prolog a mano)",
          bodyHtml:
            '<p>Las reglas te permiten definir nuevas relaciones derivadas, como "todo lo que está bajo una categoría" o "dos elementos en la misma rama", usando solo menús y botones.</p>' +
            '<ol class="help-step-list">' +
            '<li>Haz clic en <b>Reglas</b> en la barra de herramientas para abrir el constructor.</li>' +
            '<li>Haz clic en <b>+ Nueva regla</b>.</li>' +
            '<li>Define la <b>cabeza</b> de la regla: el nombre de la nueva relación (por ejemplo <code>bajo_categoria</code>) y sus variables (por ejemplo <code>X, Y</code>).</li>' +
            '<li>Agrega <b>condiciones</b> al <b>cuerpo</b> de la regla con el botón <b>+ Agregar condición</b>. Cada condición puede ser una relación existente (incluida la misma regla, para crear recursión), o una comparación como <code>X \\= Y</code>.</li>' +
            '<li>Activa el botón <code>\\+</code> junto a una condición si quieres negarla (que NO se cumpla).</li>' +
            '<li>El programa muestra abajo una vista previa en vivo del código Prolog que se va a generar.</li>' +
            '</ol>' +
            '<p>Ejemplo: una regla con cabeza <code>under(X, Y)</code> y dos condiciones alternativas (<code>is_a(X, Y)</code>, y <code>is_a(X, Z)</code> seguido de <code>under(Z, Y)</code> de forma recursiva) genera exactamente el patrón de "todo lo que está debajo de una categoría" usado en clase.</p>'
        },
        exportImport: {
          title: "Exportar e importar tu trabajo",
          bodyHtml:
            '<ul>' +
            '<li><b>JSON</b>: guarda toda tu red (nodos, enlaces y reglas) en un archivo <code>.json</code> que puedes volver a abrir después con el botón <b>Importar</b>, o compartir con tu profesor.</li>' +
            '<li><b>Imagen (PNG)</b>: descarga tu red tal como se ve en el lienzo, lista para pegar en un documento o presentación.</li>' +
            '<li><b>Enviar a Prolog</b>: convierte tu red y tus reglas en código Prolog real y lo abre automáticamente en el Editor Prolog, como un archivo nuevo.</li>' +
            '</ul>'
        },
        ide: {
          title: "El Editor Prolog",
          bodyHtml:
            '<p>Funciona de forma parecida a SWISH: un editor de código a la izquierda/arriba y una consola de consultas abajo. Todo se ejecuta dentro de tu navegador, no necesitas instalar nada.</p>' +
            '<ul>' +
            '<li><b>Nuevo archivo</b>: abre una pestaña en blanco.</li>' +
            '<li><b>Abrir / Importar</b>: carga un archivo <code>.pl</code> desde tu computadora.</li>' +
            '<li><b>Exportar</b>: descarga el contenido actual del editor como un archivo <code>.pl</code>.</li>' +
            '<li><b>Consultar programa</b>: carga (consulta) tu código en el motor de Prolog, para poder hacer preguntas sobre él.</li>' +
            '<li>Puedes tener varios archivos abiertos a la vez; aparecen en la lista de la izquierda.</li>' +
            '</ul>'
        },
        queries: {
          title: "Escribir y ejecutar consultas",
          bodyHtml:
            '<ol class="help-step-list">' +
            '<li>Primero presiona <b>Consultar programa</b> para cargar tu código.</li>' +
            '<li>Escribe una pregunta en la barra <code>?-</code>, por ejemplo <code>is_a(violin, bowed)</code>, y presiona <b>Ejecutar</b> o <span class="help-kbd">Enter</span>.</li>' +
            '<li>Si la consulta tiene variables (por ejemplo <code>is_a(X, bowed)</code>), verás el valor encontrado para cada variable.</li>' +
            '<li>Si hay más de una respuesta posible, aparecerá un botón <b>Siguiente solución ;</b> para pedir la próxima, igual que escribir <code>;</code> en Prolog normal.</li>' +
            '<li>Si la consulta es simplemente verdadera o falsa (sin variables), verás <code>true.</code> o <code>false.</code></li>' +
            '</ol>'
        },
        shortcuts: {
          title: "Atajos de teclado (Diseñador de Redes)",
          bodyHtml:
            '<ul>' +
            '<li><span class="help-kbd">V</span> — herramienta Mover</li>' +
            '<li><span class="help-kbd">N</span> — herramienta Nodo</li>' +
            '<li><span class="help-kbd">L</span> — herramienta Enlace</li>' +
            '<li><span class="help-kbd">Espacio</span> (mantener) — desplazar el lienzo temporalmente</li>' +
            '<li><span class="help-kbd">Supr</span> / <span class="help-kbd">Backspace</span> — borrar lo seleccionado</li>' +
            '<li><span class="help-kbd">Ctrl</span>+<span class="help-kbd">Z</span> — deshacer</li>' +
            '<li><span class="help-kbd">Ctrl</span>+<span class="help-kbd">Y</span> — rehacer</li>' +
            '<li>Rueda del mouse — acercar / alejar</li>' +
            '</ul>'
        }
      }
    },

    en: {
      docTitle: "Semantic Network & Prolog Studio",
      topbar: {
        tabNetwork: "Network Designer",
        tabIde: "Prolog Editor",
        tabHelp: "Help",
        autosaved: "Autosaved",
        sendToIde: "Send to Prolog",
        sendToIdeTitle: "Generates the Prolog code for your network and opens it in the Prolog Editor"
      },
      toolbar: {
        move: "Move", moveTitle: "Select and move (V)",
        node: "Node", nodeTitle: "Add node (N)",
        link: "Link", linkTitle: "Create link (L)",
        pan: "Pan", panTitle: "Pan the canvas (Space)",
        delete: "Delete", deleteTitle: "Delete selection (Del)",
        undo: "Undo", undoTitle: "Undo (Ctrl+Z)",
        redo: "Redo", redoTitle: "Redo (Ctrl+Y)",
        rules: "Rules", rulesTitle: "Open the rule builder",
        newNet: "New", newNetTitle: "New network",
        json: "JSON", jsonTitle: "Download network as JSON",
        importBtn: "Import", importTitle: "Import network from JSON",
        image: "Image", imageTitle: "Download network as a PNG image"
      },
      canvas: {
        emptyTitle: "Your canvas is empty.",
        emptyBodyHtml: 'Pick the <b>Node</b> tool and click the canvas to create your first concept. Then use <b>Link</b> to connect them.',
        zoomIn: "Zoom in", zoomReset: "Fit to screen", zoomOut: "Zoom out"
      },
      inspector: {
        emptyHtml: 'Select a node or a link to view and edit its properties here, or open the <b>Rules</b> builder from the toolbar.',
        nodeProps: "Node properties",
        label: "Label",
        actions: "Actions",
        deleteNode: "Delete node and its links",
        edgeTitle: "Link: {from} → {to}",
        relationType: "Relation type",
        customRelation: "Or type a custom relation",
        customRelationPlaceholder: "e.g. fears",
        arrowStyle: "Arrow style",
        direction: "Direction",
        oneWay: "→ One-way",
        twoWay: "↔ Two-way",
        lineStyle: "Line style",
        solid: "Solid", dashed: "Dashed", dotted: "Dotted",
        color: "Color",
        deleteEdge: "Delete link"
      },
      relation: {
        is_a: "is_a (is a / is an)",
        part_of: "part_of",
        related_to: "related_to",
        causes: "causes",
        precedes: "precedes",
        instance_of: "instance_of",
        has_property: "has_property",
        same_as: "same_as"
      },
      modal: {
        cancel: "Cancel", accept: "Accept", yesContinue: "Yes, continue",
        newNetTitle: "Create a new network?",
        newNetDesc: "This will erase the current network in this browser (nodes, links and rules). If you want to keep it, export it as JSON first.",
        newNetOk: "Yes, start over",
        newNodeTitle: "New node",
        newNodePlaceholder: "e.g. dog",
        newNodeDesc: "Type the name of the concept for this node.",
        renameNodeTitle: "Rename node",
        promptDefaultTitle: "Enter a value",
        confirmDefaultTitle: "Confirm?",
        deleteRuleTitle: "Delete this rule?",
        deleteRuleDesc: 'The rule "{title}" and all its conditions will be deleted.',
        deleteRuleOk: "Yes, delete"
      },
      toast: {
        canvasCleared: "New canvas ready.",
        jsonDownloaded: "JSON downloaded.",
        jsonImported: "Network imported successfully.",
        jsonImportError: "That JSON file couldn't be read.",
        pngDownloaded: "Image downloaded.",
        pngError: "The image couldn't be generated.",
        addNodeFirstForImage: "Add at least one node before exporting an image.",
        pickTarget: "Now click the target node.",
        pickDifferentTarget: "Pick a different node as the target.",
        fileImported: 'File "{name}" imported.',
        cantReadFile: "The file couldn't be read.",
        programConsulted: "Program consulted.",
        consultError: "Error consulting the program.",
        needNodeOrRule: "Add at least one node or rule before sending to Prolog.",
        codeSentToIde: "Prolog code generated and loaded in the Prolog Editor."
      },
      rules: {
        panelTitle: "Prolog Rules",
        newRule: "+ New rule",
        emptyHtml: 'No rules yet. Click <b>+ New rule</b> to define a new derived relation (for example, "everything under a category") from your network’s relations.',
        predicateName: "Predicate name",
        variablesLabel: "Variables (comma-separated)",
        addCondition: "+ Add condition",
        kindCall: "Relation",
        kindCompare: "Comparison",
        namePlaceholder: "e.g. is_a",
        deleteRuleTitle: "Delete this rule",
        deleteConditionTitle: "Delete this condition",
        negateTitle: "Negate this condition (must NOT hold)",
        opNotUnify: "\\=  (don't unify)",
        opUnify: "=  (unify)",
        opIdentical: "==  (identical)",
        opNotIdentical: "\\==  (not identical)"
      },
      ide: {
        newFile: "New file",
        openImport: "Open / Import .pl",
        exportBtn: "Export .pl",
        filesInSession: "Files in this session",
        unsavedTitle: "Unsaved changes",
        syntaxHint: "Syntax",
        syntaxHintTitle: "Tip: use % for comments",
        consult: "Consult program",
        consoleTitle: "Query console",
        clear: "Clear",
        queryPlaceholder: "type a query, e.g. under(violin, instruments).",
        run: "Run",
        closeFileTitle: "Close this file",
        untitledBase: "untitled",
        defaultProgramComment: "% Write your Prolog program here.\n% Example:\n% is_a(dog, mammal).\n% is_a(mammal, animal).\n% ?- is_a(dog, animal).\n",
        placeholder: "% Write your Prolog program here...",
        consulting: "Consulting {name}...",
        consultedOk: "Program consulted successfully. You can now write queries.",
        consultErrorPrefix: "Error consulting the program: {err}",
        needConsultFirst: 'First press "Consult program".',
        needConsultFirstToast: "Consult your program first.",
        falseLine: "false.",
        noMoreSolutions: "No more solutions.",
        trueLine: "true.",
        nextSolution: "Next solution ;",
        stepLimit: "The step limit allowed for this query was reached.",
        errorPrefix: "Error: {err}",
        queryErrorPrefix: "Error in the query: {err}",
        engineNotLoaded: "The Prolog engine (Tau Prolog) failed to load correctly."
      },
      gen: {
        headerLine1: "Semantic network generated with Semantic Network & Prolog Studio",
        headerLine2: "Date: {date}",
        factsHeader: "---- Facts (relations between concepts) ----",
        noFacts: "(there are no links in the network yet)",
        rulesHeader: "---- Rules ----",
        noRules: "(no rules have been defined yet)"
      },
      help: {
        heroTitle: "Help center",
        heroSubtitle: "Quick guide to every tool in Semantic Network & Prolog Studio.",
        nav: {
          nodes: "Nodes", links: "Links", rules: "Rules",
          exportImport: "Export & import", ide: "Prolog Editor",
          queries: "Queries", shortcuts: "Keyboard shortcuts"
        },
        nodes: {
          title: "Create and edit nodes",
          bodyHtml:
            '<ol class="help-step-list">' +
            '<li>Click the <b>Node</b> tool on the left-hand bar (or press <span class="help-kbd">N</span>).</li>' +
            '<li>Click any empty spot on the canvas to create a new node there.</li>' +
            '<li>Type the concept’s name (for example <code>dog</code>) and press <span class="help-kbd">Enter</span>.</li>' +
            '<li>To move a node, switch to the <b>Move</b> tool (<span class="help-kbd">V</span>) and drag it with the mouse.</li>' +
            '<li>To rename a node, double-click it.</li>' +
            '<li>To delete a node (and all its links), select it and press <span class="help-kbd">Del</span> or use the <b>Delete</b> button.</li>' +
            '</ol>'
        },
        links: {
          title: "Create links between concepts",
          bodyHtml:
            '<p>A link represents a relation between two nodes (for example, "is a", "is part of", or any relation you define). Each link becomes a Prolog fact directly.</p>' +
            '<ol class="help-step-list">' +
            '<li>Choose the <b>Link</b> tool (<span class="help-kbd">L</span>).</li>' +
            '<li>Click the source node, then the target node.</li>' +
            '<li>In the right-hand panel, pick a relation from the list (<code>is_a</code>, <code>part_of</code>, <code>related_to</code>, <code>causes</code>, <code>precedes</code>, <code>instance_of</code>, <code>has_property</code>, <code>same_as</code>) or type your own custom relation in the text field.</li>' +
            '<li>You can also choose whether the arrow is one-way or two-way, the line style (solid, dashed, dotted) and the color.</li>' +
            '<li>To select an existing link, click on its line or its label.</li>' +
            '</ol>' +
            '<p>The relation name is used as the predicate name in Prolog. If you type a custom relation with uppercase letters, spaces or symbols, the app automatically turns it into a valid Prolog atom (quoted if needed) without changing what you see in the diagram.</p>'
        },
        rules: {
          title: "Build rules (without writing Prolog by hand)",
          bodyHtml:
            '<p>Rules let you define new derived relations, such as "everything under a category" or "two elements in the same branch", using only menus and buttons.</p>' +
            '<ol class="help-step-list">' +
            '<li>Click <b>Rules</b> on the toolbar to open the builder.</li>' +
            '<li>Click <b>+ New rule</b>.</li>' +
            '<li>Define the rule’s <b>head</b>: the name of the new relation (for example <code>under_category</code>) and its variables (for example <code>X, Y</code>).</li>' +
            '<li>Add <b>conditions</b> to the rule’s <b>body</b> with the <b>+ Add condition</b> button. Each condition can be an existing relation (including the rule itself, to create recursion), or a comparison such as <code>X \\= Y</code>.</li>' +
            '<li>Toggle the <code>\\+</code> button next to a condition if you want to negate it (it must NOT hold).</li>' +
            '<li>The app shows a live preview of the Prolog code that will be generated below.</li>' +
            '</ol>' +
            '<p>Example: a rule with head <code>under(X, Y)</code> and two alternative conditions (<code>is_a(X, Y)</code>, and <code>is_a(X, Z)</code> followed by <code>under(Z, Y)</code> recursively) generates exactly the "everything under a category" pattern used in class.</p>'
        },
        exportImport: {
          title: "Export and import your work",
          bodyHtml:
            '<ul>' +
            '<li><b>JSON</b>: saves your whole network (nodes, links and rules) to a <code>.json</code> file you can reopen later with the <b>Import</b> button, or share with your professor.</li>' +
            '<li><b>Image (PNG)</b>: downloads your network exactly as it looks on the canvas, ready to paste into a document or presentation.</li>' +
            '<li><b>Send to Prolog</b>: converts your network and rules into real Prolog code and automatically opens it in the Prolog Editor as a new file.</li>' +
            '</ul>'
        },
        ide: {
          title: "The Prolog Editor",
          bodyHtml:
            '<p>It works similarly to SWISH: a code editor on the left/top and a query console below. Everything runs inside your browser — you don’t need to install anything.</p>' +
            '<ul>' +
            '<li><b>New file</b>: opens a blank tab.</li>' +
            '<li><b>Open / Import</b>: loads a <code>.pl</code> file from your computer.</li>' +
            '<li><b>Export</b>: downloads the editor’s current content as a <code>.pl</code> file.</li>' +
            '<li><b>Consult program</b>: loads (consults) your code into the Prolog engine so you can ask questions about it.</li>' +
            '<li>You can have several files open at once; they appear in the list on the left.</li>' +
            '</ul>'
        },
        queries: {
          title: "Write and run queries",
          bodyHtml:
            '<ol class="help-step-list">' +
            '<li>First press <b>Consult program</b> to load your code.</li>' +
            '<li>Type a question in the <code>?-</code> bar, for example <code>is_a(violin, bowed)</code>, and press <b>Run</b> or <span class="help-kbd">Enter</span>.</li>' +
            '<li>If the query has variables (for example <code>is_a(X, bowed)</code>), you’ll see the value found for each variable.</li>' +
            '<li>If more than one answer is possible, a <b>Next solution ;</b> button will appear to ask for the next one, just like typing <code>;</code> in regular Prolog.</li>' +
            '<li>If the query is simply true or false (no variables), you’ll see <code>true.</code> or <code>false.</code></li>' +
            '</ol>'
        },
        shortcuts: {
          title: "Keyboard shortcuts (Network Designer)",
          bodyHtml:
            '<ul>' +
            '<li><span class="help-kbd">V</span> — Move tool</li>' +
            '<li><span class="help-kbd">N</span> — Node tool</li>' +
            '<li><span class="help-kbd">L</span> — Link tool</li>' +
            '<li><span class="help-kbd">Space</span> (hold) — temporarily pan the canvas</li>' +
            '<li><span class="help-kbd">Del</span> / <span class="help-kbd">Backspace</span> — delete selection</li>' +
            '<li><span class="help-kbd">Ctrl</span>+<span class="help-kbd">Z</span> — undo</li>' +
            '<li><span class="help-kbd">Ctrl</span>+<span class="help-kbd">Y</span> — redo</li>' +
            '<li>Mouse wheel — zoom in / out</li>' +
            '</ul>'
        }
      }
    }
  };

  var listeners = [];
  var lang = DEFAULT_LANG;
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") lang = saved;
  } catch (e) { /* storage unavailable */ }

  function getPath(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m;
    });
  }

  function t(key, vars) {
    var val = getPath(STRINGS[lang], key);
    if (val === undefined) val = getPath(STRINGS[DEFAULT_LANG], key);
    if (val === undefined) return key;
    return interpolate(val, vars);
  }

  function getLang() { return lang; }

  function setLang(newLang) {
    if (newLang !== "es" && newLang !== "en") return;
    lang = newLang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute("lang", lang);
    document.title = t("docTitle");
    applyStaticTranslations();
    listeners.forEach(function (cb) { cb(lang); });
  }

  function onChange(cb) { listeners.push(cb); }

  // Applies translations to every element tagged with data-i18n / data-i18n-html /
  // data-i18n-title / data-i18n-placeholder found in the current DOM.
  function applyStaticTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(function (elx) {
      elx.textContent = t(elx.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (elx) {
      elx.innerHTML = t(elx.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (elx) {
      elx.setAttribute("title", t(elx.getAttribute("data-i18n-title")));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (elx) {
      elx.setAttribute("placeholder", t(elx.getAttribute("data-i18n-placeholder")));
    });
  }

  global.I18n = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    onChange: onChange,
    applyStaticTranslations: applyStaticTranslations
  };
})(window);
