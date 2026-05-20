const timepoints = [
  { id: "before", label: "Avant TAP" },
  { id: "h2", label: "2-4 h" },
  { id: "h24", label: "24 h" },
  { id: "h48", label: "48 h si besoin" },
];

const tapMeasures = [
  {
    id: "tug",
    label: "TUG",
    badge: "Temps",
    instruction: "Test standardise habituel.",
    fields: ["time"],
    distance: null,
  },
  {
    id: "walkUsual",
    label: "Marche 6 m - usuelle",
    badge: "6 m",
    instruction: "Marchez a votre vitesse habituelle, en securite.",
    fields: ["time", "steps"],
    distance: 6,
  },
  {
    id: "walkFast",
    label: "Marche 6 m - rapide",
    badge: "6 m",
    instruction: "Marchez aussi vite que possible sans vous mettre en danger.",
    fields: ["time", "steps"],
    distance: 6,
  },
];

const walkSequence = [
  {
    id: "usual1",
    label: "Usuelle 1",
    badge: "4 m",
    instruction: "Marche usuelle sur 4 m lances.",
    excelCell: "B16",
  },
  {
    id: "usual2",
    label: "Usuelle 2",
    badge: "4 m",
    instruction: "Marche usuelle sur 4 m lances.",
    excelCell: "B17",
  },
  {
    id: "usual3",
    label: "Usuelle 3",
    badge: "4 m",
    instruction: "Marche usuelle sur 4 m lances.",
    excelCell: "B18",
  },
  {
    id: "fast1",
    label: "Rapide 1",
    badge: "4 m",
    instruction: "Marche rapide securisee sur 4 m lances.",
    excelCell: "B22",
  },
  {
    id: "fast2",
    label: "Rapide 2",
    badge: "4 m",
    instruction: "Marche rapide securisee sur 4 m lances.",
    excelCell: "B23",
  },
  {
    id: "fast3",
    label: "Rapide 3",
    badge: "4 m",
    instruction: "Marche rapide securisee sur 4 m lances.",
    excelCell: "B24",
  },
  {
    id: "dtUsualFruits",
    label: "DT usuelle - Fruits / legumes",
    badge: "DT",
    instruction: "Marche usuelle sur 4 m lances avec enumeration Fruits / legumes.",
    excelCell: "B33",
  },
  {
    id: "dtUsualBody",
    label: "DT usuelle - Parties du corps",
    badge: "DT",
    instruction: "Marche usuelle sur 4 m lances avec enumeration Parties du corps.",
    excelCell: "E33",
  },
  {
    id: "dtFastClothes",
    label: "DT rapide - Vetements",
    badge: "DT",
    instruction: "Marche rapide securisee sur 4 m lances avec enumeration Vetements.",
    excelCell: "B35",
  },
  {
    id: "dtFastFurniture",
    label: "DT rapide - Meubles",
    badge: "DT",
    instruction: "Marche rapide securisee sur 4 m lances avec enumeration Meubles.",
    excelCell: "E35",
  },
];

const moduleDefinitions = [
  { id: "walk", label: "Marche" },
  { id: "accelerometer", label: "Accelerometre" },
  { id: "balance", label: "Equilibre" },
  { id: "strength", label: "Force" },
  { id: "goals", label: "Objectifs" },
  { id: "activities", label: "Activites" },
  { id: "autonomy", label: "Autonomie" },
  { id: "analytic", label: "Analytique" },
];

const defaultState = {
  participantId: "",
  activeMode: "tap",
  activeTimepoint: "before",
  notes: "",
  values: {},
  simpleValues: {},
  simpleStrength: {
    chair5Time: "",
    impossibleWithoutHands: false,
    note: "",
  },
  simpleAutonomy: {
    adl: { toilette: false, habillage: false, alimentation: false, transferts: false, continence: false, deplacements: false, releverSol: false },
    iadl: { telephone: false, courses: false, repas: false, menage: false, lessive: false, transports: false, traitement: false, finances: false },
    sf12: "",
    note: "",
  },
  simpleBalance: {
    rpds: "",
    semiTandem: "",
    tandem: "",
    note: "",
  },
  simpleAccelerometer: {
    testId: "",
    dateHeure: "",
    distanceM: 20,
    targetHz: 100,
    phonePosition: "belt",
    instruction: "comfortable",
    comment: "",
    useFullRecording: false,
    rawSamples: [],
    liveStats: {
      durationS: 0,
      sampleCount: 0,
      estimatedHz: null,
    },
    analysis: null,
    status: "idle",
    lastError: "",
  },
  simpleNotes: {
    balance: "",
    goals: "",
    activities: "",
    autonomy: "",
    analytic: "",
  },
  simpleWorkflow: {
    module: "menu",
    walkIndex: 0,
  },
  simpleMotion: {
    captures: {},
  },
};

const participantInput = document.getElementById("participant-id");
const notesInput = document.getElementById("qualitative-notes");
const measureList = document.getElementById("measure-list");
const currentTimepointLabel = document.getElementById("current-timepoint-label");
const resetAllButton = document.getElementById("reset-all");
const stopOverlay = document.getElementById("stop-overlay");
const stopOverlayLabel = document.getElementById("stop-overlay-label");
const stopOverlayMeasure = document.getElementById("stop-overlay-measure");
const stopOverlayTime = document.getElementById("stop-overlay-time");

const simpleMenuScreen = document.getElementById("simple-menu-screen");
const simpleWorkflowScreen = document.getElementById("simple-workflow-screen");
const simpleMenuSummary = document.getElementById("simple-menu-summary");
const simpleWorkflowCard = document.getElementById("simple-workflow-card");
const simpleWorkflowProgress = document.getElementById("simple-workflow-progress");
const simpleWorkflowPrimary = document.getElementById("simple-workflow-primary");
const simpleWorkflowSecondary = document.getElementById("simple-workflow-secondary");
const simpleBackToMenu = document.getElementById("simple-back-to-menu");
const shareSimpleExcelButton = document.getElementById("share-simple-excel");
const shareSimpleModelExcelButton = document.getElementById("share-simple-model-excel");

const state = loadState();
const timerState = new Map();
const accelerometerApi = window.AccelerometerWalkTest || null;
const accelerometerRuntime = accelerometerApi && typeof accelerometerApi.createRuntime === "function"
  ? accelerometerApi.createRuntime()
  : null;
let overlayTimerScope = "";
let overlayTimerMeasure = "";
let overlayMode = "";

function smoothScrollToNode(node) {
  if (!node || typeof node.scrollIntoView !== "function") return;
  window.setTimeout(() => {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 40);
}

function eachNode(selector, callback) {
  const nodes = document.querySelectorAll(selector);
  for (let index = 0; index < nodes.length; index += 1) callback(nodes[index]);
}

function freshDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizeState(candidate) {
  const normalized = Object.assign(freshDefaultState(), candidate || {});
  if (!normalized.values || typeof normalized.values !== "object") normalized.values = {};
  if (!normalized.simpleValues || typeof normalized.simpleValues !== "object") normalized.simpleValues = {};
  if (!normalized.simpleStrength || typeof normalized.simpleStrength !== "object") normalized.simpleStrength = freshDefaultState().simpleStrength;
  if (!normalized.simpleAutonomy || typeof normalized.simpleAutonomy !== "object") normalized.simpleAutonomy = freshDefaultState().simpleAutonomy;
  if (!normalized.simpleBalance || typeof normalized.simpleBalance !== "object") normalized.simpleBalance = freshDefaultState().simpleBalance;
  if (!normalized.simpleAccelerometer || typeof normalized.simpleAccelerometer !== "object") normalized.simpleAccelerometer = freshDefaultState().simpleAccelerometer;
  if (!normalized.simpleNotes || typeof normalized.simpleNotes !== "object") normalized.simpleNotes = freshDefaultState().simpleNotes;
  if (!normalized.simpleWorkflow || typeof normalized.simpleWorkflow !== "object") normalized.simpleWorkflow = freshDefaultState().simpleWorkflow;
  if (typeof normalized.simpleWorkflow.walkIndex !== "number") normalized.simpleWorkflow.walkIndex = 0;
  if (!normalized.simpleMotion || typeof normalized.simpleMotion !== "object") normalized.simpleMotion = freshDefaultState().simpleMotion;
  if (!normalized.simpleMotion.captures || typeof normalized.simpleMotion.captures !== "object") normalized.simpleMotion.captures = {};
  if (!Array.isArray(normalized.simpleAccelerometer.rawSamples)) normalized.simpleAccelerometer.rawSamples = [];
  if (!normalized.simpleAccelerometer.liveStats || typeof normalized.simpleAccelerometer.liveStats !== "object") normalized.simpleAccelerometer.liveStats = freshDefaultState().simpleAccelerometer.liveStats;
  if (!normalized.simpleWorkflow.module) normalized.simpleWorkflow.module = "menu";
  return normalized;
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem("tap-evaluation") || "null"));
  } catch {
    return normalizeState(null);
  }
}

function saveState() {
  localStorage.setItem("tap-evaluation", JSON.stringify(state));
}

function numberValue(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, digits) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatValueOrNa(value, digits, unit) {
  if (!Number.isFinite(value)) return "NA";
  return `${formatNumber(value, digits)}${unit ? ` ${unit}` : ""}`;
}

function accelerometerState() {
  if (accelerometerApi && typeof accelerometerApi.ensureState === "function") {
    const ensured = accelerometerApi.ensureState(state.simpleAccelerometer);
    ensured.patientId = state.participantId.trim() || ensured.patientId || "";
    state.simpleAccelerometer = ensured;
    return ensured;
  }
  if (state.simpleAccelerometer) state.simpleAccelerometer.patientId = state.participantId.trim() || state.simpleAccelerometer.patientId || "";
  return state.simpleAccelerometer;
}

function ensureAccelerometerIdentity() {
  const current = accelerometerState();
  if (!current.testId && accelerometerApi && typeof accelerometerApi.generateTestId === "function") {
    current.testId = accelerometerApi.generateTestId();
  }
  if (!current.dateHeure) current.dateHeure = new Date().toISOString();
  current.patientId = state.participantId.trim() || "";
  return current;
}

function accelerometerSummaryLine() {
  const current = accelerometerState();
  const results = current.analysis && current.analysis.results;
  if (!results) return "";
  const cadence = Number.isFinite(results.cadencePasMin) ? `${formatNumber(results.cadencePasMin, 1)} pas/min` : "NA";
  return `Accelerometre 20 m : ${results.nbPasDetectes || 0} pas ; cadence ${cadence}`;
}

function formatTimer(ms) {
  const centiseconds = Math.floor(ms / 10);
  const totalSeconds = Math.floor(centiseconds / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const cents = centiseconds % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

function findTimepoint(timepointId) {
  for (let index = 0; index < timepoints.length; index += 1) {
    if (timepoints[index].id === timepointId) return timepoints[index];
  }
  return timepoints[0];
}

function findTapMeasure(measureId) {
  for (let index = 0; index < tapMeasures.length; index += 1) {
    if (tapMeasures[index].id === measureId) return tapMeasures[index];
  }
  return null;
}

function findWalkMeasure(measureId) {
  for (let index = 0; index < walkSequence.length; index += 1) {
    if (walkSequence[index].id === measureId) return walkSequence[index];
  }
  return null;
}

function closestActionButton(element) {
  let current = element;
  while (current && current !== document.body) {
    if (current.dataset && current.dataset.action) return current;
    current = current.parentNode;
  }
  return null;
}

function closestFieldInput(element) {
  let current = element;
  while (current && current !== document.body) {
    if (current.dataset && current.dataset.field) return current;
    current = current.parentNode;
  }
  return null;
}

function ensureTapMeasure(timepointId, measureId) {
  if (!state.values[timepointId]) state.values[timepointId] = {};
  if (!state.values[timepointId][measureId]) state.values[timepointId][measureId] = {};
  return state.values[timepointId][measureId];
}

function ensureWalkMeasure(measureId) {
  if (!state.simpleValues[measureId]) state.simpleValues[measureId] = {};
  return state.simpleValues[measureId];
}

function tapValuesFor(measureId) {
  return ensureTapMeasure(state.activeTimepoint, measureId);
}

function walkValuesFor(measureId) {
  return ensureWalkMeasure(measureId);
}

function timerKey(scope, measureId) {
  return `${scope}:${measureId}`;
}

function getTimer(scope, measureId) {
  const key = timerKey(scope, measureId);
  if (!timerState.has(key)) {
    timerState.set(key, {
      elapsed: 0,
      startedAt: 0,
      running: false,
      stopped: false,
      raf: null,
    });
  }
  return timerState.get(key);
}

function currentTimerMs(timer) {
  return timer.running ? timer.elapsed + performance.now() - timer.startedAt : timer.elapsed;
}

function renderModeTabs() {
  eachNode(".mode-button", (button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.activeMode);
  });
  eachNode(".mode-panel", (panel) => {
    panel.hidden = panel.dataset.panel !== state.activeMode;
  });
}

function renderTimepointButtons() {
  eachNode(".timepoint-button", (button) => {
    button.classList.toggle("is-active", button.dataset.timepoint === state.activeTimepoint);
  });
  currentTimepointLabel.textContent = findTimepoint(state.activeTimepoint).label;
}

function renderTapMeasureCard(measure) {
  const values = tapValuesFor(measure.id);
  const timer = getTimer("tap", measure.id);
  const time = numberValue(values.time);
  const speed = measure.distance && time ? measure.distance / time : null;
  const card = document.createElement("article");
  card.className = "measure-card";
  card.dataset.scope = "tap";
  card.dataset.measure = measure.id;
  card.innerHTML = `
    <div class="measure-header">
      <div class="measure-title-row">
        <h3>${measure.label}</h3>
        <span class="measure-badge">${measure.badge}</span>
      </div>
      <p>${measure.instruction}</p>
    </div>
    <div class="measure-body">
      <div class="field-grid">
        <label class="field">
          <span>Temps (s)</span>
          <input data-field="time" data-scope="tap" data-measure="${measure.id}" type="number" min="0" step="0.01" inputmode="decimal" value="${values.time || ""}" placeholder="0,00" />
        </label>
        ${measure.fields.indexOf("steps") >= 0 ? `
          <label class="field">
            <span>Nombre de pas</span>
            <input data-field="steps" data-scope="tap" data-measure="${measure.id}" type="number" min="0" step="1" inputmode="numeric" value="${values.steps || ""}" placeholder="0" />
          </label>
          <div class="computed wide">
            <span>Vitesse calculee</span>
            <strong>${speed ? `${formatNumber(speed, 2)} m/s` : "Non renseignee"}</strong>
          </div>
        ` : ""}
      </div>
      ${renderTimerBox("tap", measure.id, timer)}
    </div>
  `;
  return card;
}

function renderTimerBox(scope, measureId, timer) {
  const actions = timer.stopped ? `
    <button class="use-timer" type="button" data-action="use" data-scope="${scope}" data-measure="${measureId}">Ajouter</button>
    <button class="reset-timer" type="button" data-action="reset" data-scope="${scope}" data-measure="${measureId}">RAZ</button>
  ` : `
    <button class="start-timer" type="button" data-action="toggle" data-scope="${scope}" data-measure="${measureId}">Armer</button>
  `;
  const actionClass = timer.stopped ? "timer-actions is-post-stop" : "timer-actions is-ready";
  return `
    <div class="timer-box" data-timer-scope="${scope}" data-timer="${measureId}">
      <div class="timer-display">${formatTimer(currentTimerMs(timer))}</div>
      <div class="${actionClass}">${actions}</div>
    </div>
  `;
}

function renderTapMeasureList() {
  measureList.innerHTML = "";
  for (let index = 0; index < tapMeasures.length; index += 1) {
    const measure = tapMeasures[index];
    measureList.append(renderTapMeasureCard(measure));
    updateTimerDisplay("tap", measure.id);
  }
}

function walkCompletedCount() {
  let count = 0;
  for (let index = 0; index < walkSequence.length; index += 1) {
    if (numberValue(walkValuesFor(walkSequence[index].id).time)) count += 1;
  }
  return count;
}

function moduleDone(moduleId) {
  if (moduleId === "walk") return walkCompletedCount() === walkSequence.length;
  if (moduleId === "accelerometer") {
    const current = accelerometerState();
    return Boolean((current.analysis && current.analysis.results) || (current.rawSamples && current.rawSamples.length));
  }
  if (moduleId === "strength") {
    return Boolean(numberValue(state.simpleStrength.chair5Time)) || Boolean(String(state.simpleStrength.note || "").trim()) || state.simpleStrength.impossibleWithoutHands;
  }
  if (moduleId === "balance") {
    const values = state.simpleBalance || {};
    return Boolean(numberValue(values.rpds)) || Boolean(numberValue(values.semiTandem)) || Boolean(numberValue(values.tandem)) || Boolean(String(values.note || "").trim());
  }
  if (moduleId === "autonomy") {
    const adl = state.simpleAutonomy.adl || {};
    const iadl = state.simpleAutonomy.iadl || {};
    return Object.values(adl).some(Boolean) || Object.values(iadl).some(Boolean) || Boolean(String(state.simpleAutonomy.sf12 || "").trim()) || Boolean(String(state.simpleAutonomy.note || "").trim());
  }
  return Boolean(String(state.simpleNotes[moduleId] || "").trim());
}

function renderSimpleMenu() {
  const completed = walkCompletedCount();
  const completedModules = moduleDefinitions.filter((definition) => definition.id !== "walk" && moduleDone(definition.id)).length;
  simpleMenuSummary.innerHTML = `
    <strong>Identification : ${state.participantId.trim() || "a renseigner"}</strong>
    <span>Marche : ${completed} / ${walkSequence.length} temps valides. Autres domaines completes : ${completedModules} / ${moduleDefinitions.length - 1}.</span>
  `;
  eachNode(".module-button", (button) => {
    button.classList.toggle("is-done", moduleDone(button.dataset.module));
  });
}

function renderSimpleWorkflow() {
  const moduleId = state.simpleWorkflow.module;
  simpleMenuScreen.hidden = moduleId !== "menu";
  simpleWorkflowScreen.hidden = moduleId === "menu";
  if (moduleId === "menu") {
    renderSimpleMenu();
    hideStopOverlay();
    return;
  }
  if (moduleId === "walk") {
    renderWalkWorkflow();
    return;
  }
  if (moduleId === "strength") {
    renderStrengthWorkflow();
    return;
  }
  if (moduleId === "accelerometer") {
    renderAccelerometerWorkflow();
    return;
  }
  if (moduleId === "balance") {
    renderBalanceWorkflow();
    return;
  }
  if (moduleId === "autonomy") {
    renderAutonomyWorkflow();
    return;
  }
  renderNoteWorkflow(moduleId);
}

function renderWalkWorkflow() {
  const index = Math.max(0, Math.min(state.simpleWorkflow.walkIndex, walkSequence.length - 1));
  state.simpleWorkflow.walkIndex = index;
  const measure = walkSequence[index];
  const values = walkValuesFor(measure.id);
  const timer = getTimer("simple", measure.id);
  simpleWorkflowProgress.textContent = `Marche ${index + 1} / ${walkSequence.length}`;
  simpleWorkflowPrimary.hidden = false;
  simpleWorkflowPrimary.textContent = index >= walkSequence.length - 1 ? "Enregistrer et terminer" : "Enregistrer et suivant";
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-measure-card" data-scope="simple" data-measure="${measure.id}">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>${measure.label}</h3>
          <span class="measure-badge">${measure.badge}</span>
        </div>
        <p>${measure.instruction}</p>
      </div>
      <div class="measure-body workflow-measure-body">
        <label class="field">
          <span>Temps valide (s)</span>
          <input data-field="time" data-scope="simple" data-measure="${measure.id}" type="number" min="0" step="0.01" inputmode="decimal" value="${values.time || ""}" placeholder="0,00" />
        </label>
        ${renderTimerBox("simple", measure.id, timer)}
      </div>
    </article>
  `;
  updateTimerDisplay("simple", measure.id);
}

function accelerometerResultCards(results) {
  const warnings = results && results.avertissements ? results.avertissements.split(" | ").filter(Boolean) : [];
  return `
    <div class="acc-card-grid">
      <div class="computed"><span>Pas detectes</span><strong>${results ? results.nbPasDetectes || 0 : "NA"}</strong></div>
      <div class="computed"><span>Cadence</span><strong>${results ? formatValueOrNa(results.cadencePasMin, 1, "pas/min") : "NA"}</strong></div>
      <div class="computed"><span>Longueur moyenne de pas</span><strong>${results ? formatValueOrNa(results.longueurPasMoyenneM, 2, "m") : "NA"}</strong></div>
      <div class="computed"><span>Moyenne intervalles</span><strong>${results ? formatValueOrNa(results.intervallePasMoyenS, 3, "s") : "NA"}</strong></div>
      <div class="computed"><span>CV intervalles</span><strong>${results ? formatValueOrNa(results.intervallePasCvPourcent, 1, "%") : "NA"}</strong></div>
      <div class="computed"><span>Sample entropy signal</span><strong>${results ? formatValueOrNa(results.sampleEntropyNorm, 3, "") : "NA"}</strong></div>
      <div class="computed"><span>DFA alpha signal</span><strong>${results ? formatValueOrNa(results.dfaAlphaNorm, 3, "") : "NA"}</strong></div>
      <div class="computed"><span>Sample entropy intervalles</span><strong>${results ? formatValueOrNa(results.sampleEntropyStepIntervals, 3, "") : "NA"}</strong></div>
      <div class="computed"><span>DFA intervalles</span><strong>${results ? formatValueOrNa(results.dfaAlphaStepIntervals, 3, "") : "NA"}</strong></div>
    </div>
    <div class="protocol-note">
      <strong>Analyse exploratoire - a interpreter avec prudence</strong>
      <span>${warnings.length ? warnings.join(" | ") : "Ces resultats completent l'evaluation clinique et ne produisent pas de conclusion medicale automatique."}</span>
    </div>
  `;
}

function renderAccelerometerWorkflow() {
  const current = ensureAccelerometerIdentity();
  const results = current.analysis && current.analysis.results;
  const live = current.liveStats || {};
  simpleWorkflowProgress.textContent = "Accelerometre - marche 20 m";
  simpleWorkflowPrimary.hidden = true;
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-note-card accelerometer-card">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>Accelerometre - marche 20 m</h3>
          <span class="measure-badge">Prototype</span>
        </div>
        <p>Procedure : fixer le telephone de maniere stable, idealement au niveau de la ceinture ou du bas du dos. Lancer l'enregistrement, donner une pichenette nette sur le telephone pour marquer le debut, demander au patient de marcher environ 20 metres, donner une deuxieme pichenette pour marquer la fin, puis arreter l'enregistrement.</p>
      </div>
      <div class="measure-body">
        <div class="field-grid acc-meta-grid">
          <label class="field">
            <span>Distance (m)</span>
            <input id="acc-distance" type="number" min="1" step="1" inputmode="decimal" value="${current.distanceM || 20}" />
          </label>
          <label class="field">
            <span>Frequence cible (Hz)</span>
            <input id="acc-target-hz" type="number" min="1" step="1" inputmode="numeric" value="${current.targetHz || 100}" />
          </label>
          <label class="field">
            <span>Position telephone</span>
            <select id="acc-position">
              <option value="belt"${current.phonePosition === "belt" ? " selected" : ""}>bas du dos / ceinture</option>
              <option value="pocket"${current.phonePosition === "pocket" ? " selected" : ""}>poche</option>
              <option value="hand"${current.phonePosition === "hand" ? " selected" : ""}>main</option>
              <option value="other"${current.phonePosition === "other" ? " selected" : ""}>autre</option>
            </select>
          </label>
          <label class="field">
            <span>Consigne</span>
            <select id="acc-instruction">
              <option value="comfortable"${current.instruction === "comfortable" ? " selected" : ""}>marche confortable</option>
              <option value="fast"${current.instruction === "fast" ? " selected" : ""}>marche rapide</option>
              <option value="dual-task"${current.instruction === "dual-task" ? " selected" : ""}>double tache</option>
              <option value="other"${current.instruction === "other" ? " selected" : ""}>autre</option>
            </select>
          </label>
        </div>
        <div class="field-grid acc-meta-grid">
          <label class="field">
            <span>Patient ID</span>
            <input id="acc-patient-id" type="text" value="${state.participantId.trim() || ""}" placeholder="Repris depuis l'identification" disabled />
          </label>
          <label class="field">
            <span>Test ID</span>
            <input id="acc-test-id" type="text" value="${current.testId || ""}" readonly />
          </label>
        </div>
        <label class="field">
          <span>Commentaire libre</span>
          <textarea id="acc-comment" rows="4" placeholder="Contexte de marche, aide technique, remarques utiles...">${current.comment || ""}</textarea>
        </label>
        <label class="choice-inline">
          <input id="acc-use-full-recording" type="checkbox" ${current.useFullRecording ? "checked" : ""} />
          <span>Utiliser tout l'enregistrement si la detection des pichenettes est incertaine</span>
        </label>
        <div class="protocol-note">
          <strong>Consigne operatoire</strong>
          <span>Donner une pichenette nette au telephone au debut et a la fin du trajet.</span>
        </div>
        <div class="acc-button-grid">
          <button class="secondary-action" type="button" data-action="acc-request-permission">Autoriser l'accelerometre</button>
          <button class="primary-action" type="button" data-action="acc-start"${accelerometerRuntime && accelerometerRuntime.recording ? " disabled" : ""}>Demarrer l'enregistrement</button>
          <button class="secondary-action" type="button" data-action="acc-stop"${accelerometerRuntime && accelerometerRuntime.recording ? "" : " disabled"}>Arreter l'enregistrement</button>
          <button class="secondary-action" type="button" data-action="acc-reset">Reinitialiser le test</button>
          <button class="primary-action" type="button" data-action="acc-export">Exporter Excel</button>
          <button class="secondary-action" type="button" data-action="acc-save-return">Enregistrer et revenir</button>
        </div>
        <div class="acc-status-grid">
          <div class="computed"><span>Etat capteur</span><strong>${accelerometerRuntime ? (accelerometerRuntime.permission === "granted" ? "Actif" : accelerometerRuntime.permission === "denied" ? "Refuse" : accelerometerRuntime.permission === "unsupported" ? "Indisponible" : "A autoriser") : "Module indisponible"}</strong></div>
          <div class="computed"><span>Duree enregistrement</span><strong id="acc-live-duration">${formatValueOrNa(live.durationS, 2, "s")}</strong></div>
          <div class="computed"><span>Nombre d'echantillons</span><strong id="acc-live-samples">${live.sampleCount || 0}</strong></div>
          <div class="computed"><span>Frequence reelle estimee</span><strong id="acc-live-fs">${formatValueOrNa(live.estimatedHz, 1, "Hz")}</strong></div>
        </div>
        ${current.lastError ? `<div class="protocol-note warning-note"><strong>Erreur</strong><span>${current.lastError}</span></div>` : ""}
        ${results ? accelerometerResultCards(results) : ""}
        ${results ? `
          <div class="chart-stack">
            <section class="chart-panel">
              <h4>Signal acc_norm brut</h4>
              <canvas id="acc-chart-raw" width="640" height="220"></canvas>
            </section>
            <section class="chart-panel">
              <h4>Signal filtre et pas detectes</h4>
              <canvas id="acc-chart-filtered" width="640" height="220"></canvas>
            </section>
            <section class="chart-panel">
              <h4>Histogramme des intervalles de pas</h4>
              <canvas id="acc-chart-hist" width="640" height="220"></canvas>
            </section>
            <section class="chart-panel">
              <h4>DFA log-log signal continu</h4>
              <canvas id="acc-chart-dfa" width="640" height="220"></canvas>
            </section>
            <section class="chart-panel">
              <h4>Serie des intervalles de pas</h4>
              <canvas id="acc-chart-steps" width="640" height="220"></canvas>
            </section>
            <section class="chart-panel">
              <h4>Serie des intervalles de foulee</h4>
              <canvas id="acc-chart-strides" width="640" height="220"></canvas>
            </section>
          </div>
        ` : ""}
      </div>
    </article>
  `;
  if (results) window.setTimeout(renderAccelerometerCharts, 20);
}

function drawLineChart(canvasId, points, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.getContext) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 26;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#d9e1e8";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  const filtered = (points || []).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!filtered.length) {
    context.fillStyle = "#647182";
    context.font = "14px sans-serif";
    context.fillText("Pas de donnees", 18, height / 2);
    return;
  }

  let minX = filtered[0].x;
  let maxX = filtered[0].x;
  let minY = filtered[0].y;
  let maxY = filtered[0].y;
  for (let index = 1; index < filtered.length; index += 1) {
    minX = Math.min(minX, filtered[index].x);
    maxX = Math.max(maxX, filtered[index].x);
    minY = Math.min(minY, filtered[index].y);
    maxY = Math.max(maxY, filtered[index].y);
  }
  if (minX === maxX) maxX += 1;
  if (minY === maxY) maxY += 1;

  const projectX = (value) => padding + (((value - minX) / (maxX - minX)) * (width - (padding * 2)));
  const projectY = (value) => height - padding - (((value - minY) / (maxY - minY)) * (height - (padding * 2)));

  context.strokeStyle = "#0f766e";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < filtered.length; index += 1) {
    const x = projectX(filtered[index].x);
    const y = projectY(filtered[index].y);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  if (options && Array.isArray(options.markers)) {
    context.strokeStyle = "#b9403a";
    context.fillStyle = "#b9403a";
    for (let index = 0; index < options.markers.length; index += 1) {
      const markerX = options.markers[index];
      if (!Number.isFinite(markerX)) continue;
      const x = projectX(markerX);
      context.beginPath();
      context.moveTo(x, padding / 2);
      context.lineTo(x, height - (padding / 2));
      context.stroke();
    }
  }

  if (options && Array.isArray(options.scatter)) {
    context.fillStyle = "#a16207";
    for (let index = 0; index < options.scatter.length; index += 1) {
      const point = options.scatter[index];
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      const x = projectX(point.x);
      const y = projectY(point.y);
      context.beginPath();
      context.arc(x, y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawHistogramChart(canvasId, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.getContext) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 26;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#d9e1e8";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  const series = (values || []).filter((value) => Number.isFinite(value));
  if (!series.length) {
    context.fillStyle = "#647182";
    context.font = "14px sans-serif";
    context.fillText("Pas de donnees", 18, height / 2);
    return;
  }

  let min = Math.min.apply(null, series);
  let max = Math.max.apply(null, series);
  if (min === max) max += 0.1;
  const bins = Math.min(8, Math.max(4, Math.round(Math.sqrt(series.length))));
  const bucketSize = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (let index = 0; index < series.length; index += 1) {
    const rawIndex = Math.floor((series[index] - min) / bucketSize);
    const bucketIndex = Math.max(0, Math.min(bins - 1, rawIndex));
    counts[bucketIndex] += 1;
  }
  const maxCount = Math.max.apply(null, counts) || 1;
  const barWidth = (width - (padding * 2)) / bins;
  for (let index = 0; index < counts.length; index += 1) {
    const barHeight = (counts[index] / maxCount) * (height - (padding * 2));
    context.fillStyle = "#23527c";
    context.fillRect(padding + (index * barWidth) + 4, height - padding - barHeight, barWidth - 8, barHeight);
  }
}

function renderAccelerometerCharts() {
  const current = accelerometerState();
  const results = current.analysis && current.analysis.results;
  if (!results || !results.graphData) return;
  drawLineChart("acc-chart-raw", results.graphData.raw);
  drawLineChart("acc-chart-filtered", results.graphData.filteredSegment, {
    markers: results.graphData.stepTimes,
  });
  drawHistogramChart("acc-chart-hist", results.graphData.stepIntervals);
  drawLineChart("acc-chart-dfa", (results.graphData.dfa || []).map((point) => ({ x: point.x, y: point.y })));
  drawLineChart("acc-chart-steps", (results.graphData.stepIntervals || []).map((value, index) => ({ x: index + 1, y: value })));
  drawLineChart("acc-chart-strides", (results.graphData.strideIntervals || []).map((value, index) => ({ x: index + 1, y: value })));
}

function balanceScoreFromValues(values) {
  const rpds = numberValue(values && values.rpds);
  const semiTandem = numberValue(values && values.semiTandem);
  const tandem = numberValue(values && values.tandem);
  if (!Number.isFinite(rpds) || rpds < 10) return 0;
  if (!Number.isFinite(semiTandem) || semiTandem < 10) return 1;
  if (!Number.isFinite(tandem)) return 2;
  if (tandem >= 10) return 4;
  if (tandem >= 3) return 3;
  return 2;
}

function renderBalanceWorkflow() {
  const values = state.simpleBalance;
  const score = balanceScoreFromValues(values);
  simpleWorkflowProgress.textContent = "Equilibre";
  simpleWorkflowPrimary.hidden = false;
  simpleWorkflowPrimary.textContent = "Enregistrer et revenir";
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-note-card">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>SPPB equilibre</h3>
          <span class="measure-badge">Equilibre</span>
        </div>
        <p>Renseigner les temps tenus pour RPdS, 1/2 tandem et tandem. Le score SPPB est calcule automatiquement.</p>
      </div>
      <div class="measure-body">
        <label class="field">
          <span>RPdS (s)</span>
          <input id="balance-rpds" type="number" min="0" step="0.1" inputmode="decimal" value="${values.rpds || ""}" placeholder="0,0" />
        </label>
        <label class="field">
          <span>1/2 tandem (s)</span>
          <input id="balance-semi-tandem" type="number" min="0" step="0.1" inputmode="decimal" value="${values.semiTandem || ""}" placeholder="0,0" />
        </label>
        <label class="field">
          <span>Tandem (s)</span>
          <input id="balance-tandem" type="number" min="0" step="0.1" inputmode="decimal" value="${values.tandem || ""}" placeholder="0,0" />
        </label>
        <div class="computed wide">
          <span>Score SPPB equilibre</span>
          <strong id="balance-score-output">${score} / 4</strong>
        </div>
        <label class="field">
          <span>Note libre</span>
          <textarea id="balance-note" rows="5" placeholder="Aides, desequilibre, strategie, precision utile...">${values.note || ""}</textarea>
        </label>
      </div>
    </article>
  `;
}

function renderStrengthWorkflow() {
  const timer = getTimer("strength", "chair5");
  const values = state.simpleStrength;
  simpleWorkflowProgress.textContent = "Force";
  simpleWorkflowPrimary.hidden = false;
  simpleWorkflowPrimary.textContent = "Enregistrer et revenir";
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-note-card" data-scope="strength" data-measure="chair5">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>5 levers de chaise</h3>
          <span class="measure-badge">Force</span>
        </div>
        <p>Chronometrer 5 levers de chaise et cocher si impossible sans les mains.</p>
      </div>
      <div class="measure-body workflow-measure-body">
        <label class="field">
          <span>Temps valide (s)</span>
          <input id="strength-chair5-time" type="number" min="0" step="0.01" inputmode="decimal" value="${values.chair5Time || ""}" placeholder="0,00" />
        </label>
        ${renderTimerBox("strength", "chair5", timer)}
        <label class="choice-inline">
          <input id="strength-hands-checkbox" type="checkbox" ${values.impossibleWithoutHands ? "checked" : ""} />
          <span>Impossible sans les mains</span>
        </label>
        <label class="field">
          <span>Note libre</span>
          <textarea id="strength-note" rows="5" placeholder="Observation, strategie, aide, remarques...">${values.note || ""}</textarea>
        </label>
      </div>
    </article>
  `;
  updateTimerDisplay("strength", "chair5");
}

function renderAutonomyWorkflow() {
  const values = state.simpleAutonomy;
  const adlItems = [
    ["toilette", "Toilette"],
    ["habillage", "Habillage"],
    ["alimentation", "Alimentation"],
    ["transferts", "Transferts"],
    ["continence", "Continence"],
    ["deplacements", "Deplacements"],
    ["releverSol", "Relever du sol"],
  ];
  const iadlItems = [
    ["telephone", "Telephone"],
    ["courses", "Courses"],
    ["repas", "Preparation des repas"],
    ["menage", "Menage"],
    ["lessive", "Lessive"],
    ["transports", "Transports"],
    ["traitement", "Traitement"],
    ["finances", "Finances"],
  ];
  simpleWorkflowProgress.textContent = "Autonomie";
  simpleWorkflowPrimary.hidden = false;
  simpleWorkflowPrimary.textContent = "Enregistrer et revenir";
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-note-card">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>ADL / IADL</h3>
          <span class="measure-badge">Autonomie</span>
        </div>
        <p>Cocher les items pertinents puis ajouter une note libre si besoin.</p>
      </div>
      <div class="measure-body">
        <div class="autonomy-section">
          <strong>ADL</strong>
          <div class="autonomy-grid">
            ${adlItems.map(([key, label]) => `
              <label class="choice-inline">
                <input type="checkbox" data-autonomy-group="adl" data-autonomy-key="${key}" ${values.adl[key] ? "checked" : ""} />
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="autonomy-section">
          <strong>IADL</strong>
          <div class="autonomy-grid">
            ${iadlItems.map(([key, label]) => `
              <label class="choice-inline">
                <input type="checkbox" data-autonomy-group="iadl" data-autonomy-key="${key}" ${values.iadl[key] ? "checked" : ""} />
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <label class="field">
          <span>SF-12</span>
          <input id="autonomy-sf12" type="text" inputmode="text" value="${values.sf12 || ""}" placeholder="Score ou synthese SF-12" />
        </label>
        <label class="field">
          <span>Note libre</span>
          <textarea id="autonomy-note" rows="5" placeholder="Aide humaine, supervision, precision utile...">${values.note || ""}</textarea>
        </label>
      </div>
    </article>
  `;
}

function renderNoteWorkflow(moduleId) {
  let title = "";
  for (let index = 0; index < moduleDefinitions.length; index += 1) {
    if (moduleDefinitions[index].id === moduleId) title = moduleDefinitions[index].label;
  }
  const note = state.simpleNotes[moduleId] || "";
  simpleWorkflowProgress.textContent = title;
  simpleWorkflowPrimary.hidden = false;
  simpleWorkflowPrimary.textContent = "Enregistrer et revenir";
  simpleWorkflowSecondary.hidden = true;
  simpleWorkflowCard.innerHTML = `
    <article class="workflow-note-card">
      <div class="measure-header">
        <div class="measure-title-row">
          <h3>${title}</h3>
          <span class="measure-badge">Note</span>
        </div>
        <p>Champ libre court pour ce domaine. Retour automatique au menu apres validation.</p>
      </div>
      <div class="measure-body">
        <label class="field">
          <span>Saisie</span>
          <textarea id="simple-module-note" rows="7" placeholder="Observation, resultat, element utile...">${note}</textarea>
        </label>
      </div>
    </article>
  `;
}

function openSimpleModule(moduleId) {
  state.simpleWorkflow.module = moduleId;
  if (moduleId === "walk") {
    let firstIncomplete = 0;
    for (let index = 0; index < walkSequence.length; index += 1) {
      if (!numberValue(walkValuesFor(walkSequence[index].id).time)) {
        firstIncomplete = index;
        break;
      }
      firstIncomplete = Math.min(index + 1, walkSequence.length - 1);
    }
    state.simpleWorkflow.walkIndex = firstIncomplete;
  }
  if (moduleId === "accelerometer") {
    ensureAccelerometerIdentity();
  }
  saveState();
  renderSimpleWorkflow();
  smoothScrollToNode(simpleWorkflowScreen);
}

function returnToSimpleMenu() {
  state.simpleWorkflow.module = "menu";
  saveState();
  renderSimpleWorkflow();
  smoothScrollToNode(simpleMenuScreen);
}

function updateTimerDisplay(scope, measureId) {
  const display = document.querySelector(`[data-timer-scope="${scope}"][data-timer="${measureId}"] .timer-display`);
  if (!display) return;
  const timer = getTimer(scope, measureId);
  const formatted = formatTimer(currentTimerMs(timer));
  display.textContent = formatted;
  if (overlayTimerScope === scope && overlayTimerMeasure === measureId) stopOverlayTime.textContent = formatted;
  if (timer.running) timer.raf = requestAnimationFrame(() => updateTimerDisplay(scope, measureId));
}

function showOverlay(scope, measureId, mode) {
  const measure = scope === "simple" ? findWalkMeasure(measureId) : findTapMeasure(measureId);
  overlayTimerScope = scope;
  overlayTimerMeasure = measureId;
  overlayMode = mode;
  stopOverlayLabel.textContent = mode === "armed" ? "DEMARRER" : "ARRETER";
  stopOverlayMeasure.textContent = measure ? measure.label : "";
  stopOverlayTime.textContent = formatTimer(currentTimerMs(getTimer(scope, measureId)));
  stopOverlay.classList.toggle("is-armed", mode === "armed");
  stopOverlay.classList.toggle("is-running", mode === "running");
  stopOverlay.classList.add("is-visible");
}

function hideStopOverlay() {
  overlayTimerScope = "";
  overlayTimerMeasure = "";
  overlayMode = "";
  stopOverlay.classList.remove("is-visible");
  stopOverlay.classList.remove("is-armed");
  stopOverlay.classList.remove("is-running");
}

function startTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  if (timer.running) return;
  timer.running = true;
  timer.stopped = false;
  timer.startedAt = performance.now();
  showOverlay(scope, measureId, "running");
  updateTimerDisplay(scope, measureId);
}

function stopTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();
  renderCurrentMode();
}

function toggleTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  if (timer.running) {
    stopTimer(scope, measureId);
    return;
  }
  showOverlay(scope, measureId, "armed");
}

function useTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();
  const values = scope === "simple" ? walkValuesFor(measureId) : (scope === "strength" ? state.simpleStrength : tapValuesFor(measureId));
  if (scope === "strength") values.chair5Time = (timer.elapsed / 1000).toFixed(2);
  else values.time = (timer.elapsed / 1000).toFixed(2);
  saveState();
  if (scope === "simple") {
    renderWalkWorkflow();
  } else if (scope === "strength") {
    renderStrengthWorkflow();
  } else {
    renderTapMeasureList();
  }
}

function resetTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = 0;
  timer.startedAt = 0;
  timer.running = false;
  timer.stopped = false;
  cancelAnimationFrame(timer.raf);
  if (overlayTimerScope === scope && overlayTimerMeasure === measureId) hideStopOverlay();
  const values = scope === "simple" ? walkValuesFor(measureId) : (scope === "strength" ? state.simpleStrength : tapValuesFor(measureId));
  if (scope === "strength") values.chair5Time = "";
  else values.time = "";
  if (scope === "tap") values.steps = "";
  saveState();
  renderCurrentMode();
}

function advanceWalkWorkflow() {
  const currentIndex = state.simpleWorkflow.walkIndex;
  if (currentIndex >= walkSequence.length - 1) {
    returnToSimpleMenu();
    return;
  }
  state.simpleWorkflow.walkIndex = currentIndex + 1;
  saveState();
  renderSimpleWorkflow();
}

function handleValueInput(event) {
  const target = event.target;
  if (target && target.id && (target.id === "balance-rpds" || target.id === "balance-semi-tandem" || target.id === "balance-tandem" || target.id === "balance-note")) {
    if (target.id === "balance-rpds") state.simpleBalance.rpds = target.value;
    if (target.id === "balance-semi-tandem") state.simpleBalance.semiTandem = target.value;
    if (target.id === "balance-tandem") state.simpleBalance.tandem = target.value;
    if (target.id === "balance-note") state.simpleBalance.note = target.value;
    saveState();
    const output = document.getElementById("balance-score-output");
    if (output) output.textContent = `${balanceScoreFromValues(state.simpleBalance)} / 4`;
    return;
  }
  const input = closestFieldInput(event.target);
  if (!input) return;
  const scope = input.dataset.scope;
  const measureId = input.dataset.measure;
  if (scope === "tap") {
    const values = tapValuesFor(measureId);
    values[input.dataset.field] = input.value;
    saveState();
    if (input.dataset.field === "time") renderTapMeasureList();
    else {
      const measure = findTapMeasure(measureId);
      const time = numberValue(values.time);
      const speed = measure && measure.distance && time ? measure.distance / time : null;
      eachNode(`.measure-card[data-scope="tap"][data-measure="${measureId}"] .computed strong`, (node) => {
        node.textContent = speed ? `${formatNumber(speed, 2)} m/s` : "Non renseignee";
      });
    }
    return;
  }
  if (scope === "simple") {
    const values = walkValuesFor(measureId);
    values[input.dataset.field] = input.value;
    saveState();
  }
}

function plainTextSummary() {
  const timepoint = findTimepoint(state.activeTimepoint);
  const values = state.values[timepoint.id] || {};
  const tugTime = numberValue(values.tug && values.tug.time);
  const usualTime = numberValue(values.walkUsual && values.walkUsual.time);
  const fastTime = numberValue(values.walkFast && values.walkFast.time);
  const usualSpeed = usualTime ? 6 / usualTime : null;
  const fastSpeed = fastTime ? 6 / fastTime : null;
  return [
    "Evaluation motrice du TAP test pour HCPN:",
    `- Date / heure : ${exportTimestamp()}`,
    `- Identifiant : ${state.participantId.trim() || ""}`,
    `- ${timepoint.label}`,
    "- Marche sur 6 m :",
    "-- usuelle",
    `--- vitesse (m/s) : ${usualSpeed ? `${formatNumber(usualSpeed, 2)}` : ""}`,
    `--- nombre de pas : ${values.walkUsual && values.walkUsual.steps ? values.walkUsual.steps : ""}`,
    "-- rapide",
    `--- vitesse (m/s) : ${fastSpeed ? `${formatNumber(fastSpeed, 2)}` : ""}`,
    `--- nombre de pas : ${values.walkFast && values.walkFast.steps ? values.walkFast.steps : ""}`,
    `- TUG (s) : ${tugTime ? formatNumber(tugTime, 2) : ""}`,
    `- Notes : ${state.notes.trim() || ""}`,
  ].join("\n");
}

function exportTimestamp() {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
}

function currentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function balanceSummary() {
  const values = state.simpleBalance || {};
  const parts = [];
  if (String(values.rpds || "").trim()) parts.push(`RPdS : ${values.rpds} s`);
  if (String(values.semiTandem || "").trim()) parts.push(`1/2 tandem : ${values.semiTandem} s`);
  if (String(values.tandem || "").trim()) parts.push(`Tandem : ${values.tandem} s`);
  if (parts.length) parts.push(`SPPB equilibre : ${balanceScoreFromValues(values)} / 4`);
  return parts.join(" | ");
}

function balanceBestStageLabel() {
  const values = state.simpleBalance || {};
  if (numberValue(values.tandem) != null) return "tandem";
  if (numberValue(values.semiTandem) != null) return "1/2tandem";
  if (numberValue(values.rpds) != null) return "RPdS";
  return "";
}

function balanceBestStageSeconds() {
  const values = state.simpleBalance || {};
  const candidates = [numberValue(values.rpds), numberValue(values.semiTandem), numberValue(values.tandem)].filter((value) => Number.isFinite(value));
  if (!candidates.length) return null;
  let maxValue = candidates[0];
  for (let index = 1; index < candidates.length; index += 1) {
    if (candidates[index] > maxValue) maxValue = candidates[index];
  }
  return maxValue;
}

function balanceTemplateDisplay() {
  const label = balanceBestStageLabel();
  const seconds = balanceBestStageSeconds();
  if (!label || !Number.isFinite(seconds)) return "";
  return `${label} ; ${formatNumber(seconds, 0)}`;
}

function autonomySummary() {
  const adlLabels = { toilette: "Toilette", habillage: "Habillage", alimentation: "Alimentation", transferts: "Transferts", continence: "Continence", deplacements: "Deplacements", releverSol: "Relever du sol" };
  const iadlLabels = { telephone: "Telephone", courses: "Courses", repas: "Preparation repas", menage: "Menage", lessive: "Lessive", transports: "Transports", traitement: "Traitement", finances: "Finances" };
  const adl = Object.keys(adlLabels).filter((key) => state.simpleAutonomy.adl && state.simpleAutonomy.adl[key]).map((key) => adlLabels[key]);
  const iadl = Object.keys(iadlLabels).filter((key) => state.simpleAutonomy.iadl && state.simpleAutonomy.iadl[key]).map((key) => iadlLabels[key]);
  const parts = [];
  if (adl.length) parts.push(`ADL : ${adl.join(", ")}`);
  if (iadl.length) parts.push(`IADL : ${iadl.join(", ")}`);
  if (String(state.simpleAutonomy.sf12 || "").trim()) parts.push(`SF-12 : ${state.simpleAutonomy.sf12.trim()}`);
  return parts.join(" | ");
}

function simpleExportSummaryLines() {
  return [
    `Identifiant : ${state.participantId.trim() || ""}`,
    `Date : ${currentDateIso()}`,
    `Usuelle 1 : ${walkValuesFor("usual1").time || ""}`,
    `Usuelle 2 : ${walkValuesFor("usual2").time || ""}`,
    `Usuelle 3 : ${walkValuesFor("usual3").time || ""}`,
    `Rapide 1 : ${walkValuesFor("fast1").time || ""}`,
    `Rapide 2 : ${walkValuesFor("fast2").time || ""}`,
    `Rapide 3 : ${walkValuesFor("fast3").time || ""}`,
    `DT usuelle Fruits / legumes : ${walkValuesFor("dtUsualFruits").time || ""}`,
    `DT usuelle Parties du corps : ${walkValuesFor("dtUsualBody").time || ""}`,
    `DT rapide Vetements : ${walkValuesFor("dtFastClothes").time || ""}`,
    `DT rapide Meubles : ${walkValuesFor("dtFastFurniture").time || ""}`,
    accelerometerSummaryLine(),
    `5 levers de chaise : ${state.simpleStrength.chair5Time || ""}`,
    balanceSummary(),
    autonomySummary(),
    state.simpleStrength.note ? `Force : ${state.simpleStrength.note}` : "",
    state.simpleBalance.note ? `Equilibre : ${state.simpleBalance.note}` : "",
    state.simpleAutonomy.note ? `Autonomie : ${state.simpleAutonomy.note}` : "",
  ].filter(Boolean);
}

function simpleWorkbookRecord() {
  const cellValues = {};
  for (let index = 0; index < walkSequence.length; index += 1) {
    const measure = walkSequence[index];
    const time = numberValue(walkValuesFor(measure.id).time);
    cellValues[measure.excelCell] = Number.isFinite(time) ? formatNumber(time, 2) : "";
  }
  const moduleNotes = [];
  for (let index = 0; index < moduleDefinitions.length; index += 1) {
    const moduleId = moduleDefinitions[index].id;
    if (moduleId === "walk" || moduleId === "accelerometer" || moduleId === "strength" || moduleId === "autonomy" || moduleId === "balance") continue;
    const note = String(state.simpleNotes[moduleId] || "").trim();
    if (note) moduleNotes.push(`${moduleDefinitions[index].label} : ${note}`);
  }
  return {
    B5: state.participantId.trim(),
    E5: currentDateIso(),
    H5: "MCO",
    B11: "4.0",
    E11: "2",
    B12: "2",
    B16: cellValues.B16 || "",
    B17: cellValues.B17 || "",
    B18: cellValues.B18 || "",
    B22: cellValues.B22 || "",
    B23: cellValues.B23 || "",
    B24: cellValues.B24 || "",
    B31: "DT usuelle : Fruits / legumes | Parties du corps | DT rapide : Vetements | Meubles",
    G33: formatNumber(numberValue(state.simpleStrength.chair5Time), 2) || "",
    B33: cellValues.B33 || "",
    E33: cellValues.E33 || "",
    B35: cellValues.B35 || "",
    E35: cellValues.E35 || "",
    A42: [accelerometerSummaryLine(), balanceSummary(), state.simpleBalance.note ? `Equilibre : ${state.simpleBalance.note}` : "", state.simpleStrength.note ? `Force : ${state.simpleStrength.note}` : "", state.simpleStrength.impossibleWithoutHands ? "Force : impossible sans les mains" : "", autonomySummary(), state.simpleAutonomy.note ? `Autonomie : ${state.simpleAutonomy.note}` : "", moduleNotes.join("\n")].filter(Boolean).join("\n"),
  };
}

function simpleTemplateWorkbookRecord() {
  const cellValues = {};
  for (let index = 0; index < walkSequence.length; index += 1) {
    const measure = walkSequence[index];
    cellValues[measure.excelCell] = numberValue(walkValuesFor(measure.id).time);
  }
  const moduleNotes = [];
  for (let index = 0; index < moduleDefinitions.length; index += 1) {
    const moduleId = moduleDefinitions[index].id;
    if (moduleId === "walk" || moduleId === "accelerometer" || moduleId === "strength" || moduleId === "autonomy" || moduleId === "balance") continue;
    const note = String(state.simpleNotes[moduleId] || "").trim();
    if (note) moduleNotes.push(`${moduleDefinitions[index].label} : ${note}`);
  }
  return {
    B5: state.participantId.trim(),
    E5: currentDateIso(),
    H5: "MCO",
    B11: 4,
    E11: 2,
    B12: 2,
    B16: cellValues.B16,
    B17: cellValues.B17,
    B18: cellValues.B18,
    B22: cellValues.B22,
    B23: cellValues.B23,
    B24: cellValues.B24,
    B31: "DT usuelle : Fruits / legumes | Parties du corps | DT rapide : Vetements | Meubles",
    G33: numberValue(state.simpleStrength.chair5Time),
    E37: balanceTemplateDisplay(),
    G39: balanceScoreFromValues(state.simpleBalance),
    B33: cellValues.B33,
    E33: cellValues.E33,
    B35: cellValues.B35,
    E35: cellValues.E35,
    A42: [accelerometerSummaryLine(), balanceSummary(), state.simpleBalance.note ? `Equilibre : ${state.simpleBalance.note}` : "", state.simpleStrength.note ? `Force : ${state.simpleStrength.note}` : "", state.simpleStrength.impossibleWithoutHands ? "Force : impossible sans les mains" : "", autonomySummary(), state.simpleAutonomy.note ? `Autonomie : ${state.simpleAutonomy.note}` : "", moduleNotes.join("\n")].filter(Boolean).join("\n"),
  };
}

function worksheetCell(doc, ref) {
  const cells = doc.getElementsByTagName("c");
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index].getAttribute("r") === ref) return cells[index];
  }
  return null;
}

function cellRefParts(ref) {
  const match = String(ref || "").match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { column: match[1], row: Number.parseInt(match[2], 10) };
}

function columnIndexFromName(name) {
  let result = 0;
  for (let index = 0; index < name.length; index += 1) {
    result = (result * 26) + (name.charCodeAt(index) - 64);
  }
  return result;
}

function worksheetRow(doc, rowNumber) {
  const rows = doc.getElementsByTagName("row");
  for (let index = 0; index < rows.length; index += 1) {
    if (Number.parseInt(rows[index].getAttribute("r"), 10) === rowNumber) return rows[index];
  }
  return null;
}

function ensureWorksheetRow(doc, rowNumber) {
  const existing = worksheetRow(doc, rowNumber);
  if (existing) return existing;
  const namespace = doc.documentElement.namespaceURI || "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const sheetData = doc.getElementsByTagName("sheetData")[0];
  if (!sheetData) return null;
  const row = doc.createElementNS(namespace, "row");
  row.setAttribute("r", String(rowNumber));
  const rows = sheetData.getElementsByTagName("row");
  let inserted = false;
  for (let index = 0; index < rows.length; index += 1) {
    const current = Number.parseInt(rows[index].getAttribute("r"), 10);
    if (current > rowNumber) {
      sheetData.insertBefore(row, rows[index]);
      inserted = true;
      break;
    }
  }
  if (!inserted) sheetData.appendChild(row);
  return row;
}

function ensureWorksheetCell(doc, ref) {
  const existing = worksheetCell(doc, ref);
  if (existing) return existing;
  const parts = cellRefParts(ref);
  if (!parts) return null;
  const namespace = doc.documentElement.namespaceURI || "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const row = ensureWorksheetRow(doc, parts.row);
  if (!row) return null;
  const cell = doc.createElementNS(namespace, "c");
  cell.setAttribute("r", ref);

  const cells = row.getElementsByTagName("c");
  let styleRef = "";
  for (let index = 0; index < cells.length; index += 1) {
    const currentRef = cells[index].getAttribute("r");
    const currentParts = cellRefParts(currentRef);
    if (!currentParts) continue;
    if (!styleRef && cells[index].getAttribute("s")) styleRef = cells[index].getAttribute("s");
    if (columnIndexFromName(currentParts.column) > columnIndexFromName(parts.column)) {
      if (!styleRef && index > 0 && cells[index - 1].getAttribute("s")) styleRef = cells[index - 1].getAttribute("s");
      row.insertBefore(cell, cells[index]);
      if (styleRef) cell.setAttribute("s", styleRef);
      return cell;
    }
  }

  if (!styleRef && cells.length && cells[cells.length - 1].getAttribute("s")) styleRef = cells[cells.length - 1].getAttribute("s");
  if (styleRef) cell.setAttribute("s", styleRef);
  row.appendChild(cell);
  return cell;
}

function setWorksheetValue(doc, ref, rawValue) {
  const cell = ensureWorksheetCell(doc, ref);
  if (!cell) return;
  const namespace = doc.documentElement.namespaceURI || "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  const value = rawValue == null ? "" : String(rawValue).trim();
  if (!value) {
    cell.removeAttribute("t");
    return;
  }
  const normalized = value.replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    cell.removeAttribute("t");
    const node = doc.createElementNS(namespace, "v");
    node.textContent = normalized;
    cell.appendChild(node);
    return;
  }
  cell.setAttribute("t", "inlineStr");
  const isNode = doc.createElementNS(namespace, "is");
  const tNode = doc.createElementNS(namespace, "t");
  tNode.setAttribute("xml:space", "preserve");
  tNode.textContent = value;
  isNode.appendChild(tNode);
  cell.appendChild(isNode);
}

function workbookFileName() {
  const participant = state.participantId.trim() || "sans-identifiant";
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  return `${participant.replace(/[^a-z0-9_-]+/gi, "_")}_${stamp}_fiche_mesures_simples.xlsx`;
}

function modelWorkbookFileName() {
  const participant = state.participantId.trim() || "sans-identifiant";
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  return `${participant.replace(/[^a-z0-9_-]+/gi, "_")}_${stamp}_fiche_modele.xlsx`;
}

const accRawHeaders = [
  "patient_id", "date_heure", "test_id", "timestamp_ms", "time_s", "ax", "ay", "az",
  "gx", "gy", "gz", "rotation_alpha", "rotation_beta", "rotation_gamma", "acc_norm",
  "acc_norm_centered", "acc_norm_filtered", "segment_analyse", "pic_pas_detecte",
  "marker_pichenette", "fs_reelle_hz", "position_telephone", "consigne", "distance_m",
];

const accResultsHeaders = [
  "patient_id", "date_heure", "test_id", "distance_m", "consigne", "position_telephone",
  "commentaire_libre", "frequence_cible_hz", "frequence_reelle_hz", "duree_totale_s",
  "duree_analysee_s", "nb_echantillons_total", "nb_echantillons_analyse",
  "detection_pichenettes_ok", "pichenette_start_time_s", "pichenette_end_time_s",
  "nb_pas_detectes", "cadence_pas_min", "longueur_pas_moyenne_m", "intervalle_pas_moyen_s",
  "intervalle_pas_sd_s", "intervalle_pas_cv_pourcent", "nb_intervalles_pas",
  "nb_intervalles_aberrants", "sample_entropy_norm", "sample_entropy_ax", "sample_entropy_ay",
  "sample_entropy_az", "dfa_alpha_norm", "dfa_r2_norm", "dfa_nb_points", "dfa_nb_windows",
  "dfa_window_min_s", "dfa_window_max_s", "sample_entropy_step_intervals",
  "nb_step_intervals_for_entropy", "interpretation_sample_entropy_step_intervals",
  "dfa_alpha_step_intervals", "dfa_r2_step_intervals", "nb_step_intervals_for_dfa",
  "interpretation_dfa_step_intervals", "nb_stride_intervals", "stride_interval_mean_s",
  "stride_interval_sd_s", "stride_interval_cv_percent", "sample_entropy_stride_intervals",
  "dfa_alpha_stride_intervals", "dfa_r2_stride_intervals", "interpretation_stride_nonlinear",
  "nonlinear_analysis_scope", "nonlinear_analysis_warning", "avertissements", "commentaire_auto",
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnNameFromIndex(index) {
  let current = index + 1;
  let name = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function worksheetXmlFromRows(rows, headers) {
  const tableRows = [headers];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    tableRows.push(headers.map((header) => (row && row[header] != null ? row[header] : "")));
  }
  const lastRef = `${columnNameFromIndex(headers.length - 1)}${tableRows.length}`;
  const xmlRows = [];
  for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex += 1) {
    const rowValues = tableRows[rowIndex];
    const cellXml = [];
    for (let columnIndex = 0; columnIndex < rowValues.length; columnIndex += 1) {
      const ref = `${columnNameFromIndex(columnIndex)}${rowIndex + 1}`;
      const value = rowValues[columnIndex];
      if (typeof value === "boolean") {
        cellXml.push(`<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`);
      } else if (Number.isFinite(value)) {
        cellXml.push(`<c r="${ref}"><v>${value}</v></c>`);
      } else if (value == null || value === "") {
        cellXml.push(`<c r="${ref}" t="inlineStr"><is><t></t></is></c>`);
      } else {
        cellXml.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`);
      }
    }
    xmlRows.push(`<row r="${rowIndex + 1}">${cellXml.join("")}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastRef}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${xmlRows.join("")}</sheetData>
</worksheet>`;
}

async function appendAccelerometerSheetsToZip(zip) {
  if (!accelerometerApi) return;
  const workbookFile = zip.file("xl/workbook.xml");
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbookFile || !relsFile) return;

  const workbookDoc = new DOMParser().parseFromString(await workbookFile.async("string"), "application/xml");
  const relsDoc = new DOMParser().parseFromString(await relsFile.async("string"), "application/xml");
  const contentTypesDoc = new DOMParser().parseFromString(await zip.file("[Content_Types].xml").async("string"), "application/xml");

  const workbookNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const relsNs = "http://schemas.openxmlformats.org/package/2006/relationships";
  const officeRelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const sheetsNode = workbookDoc.getElementsByTagNameNS(workbookNs, "sheets")[0] || workbookDoc.getElementsByTagName("sheets")[0];
  const relationshipsNode = relsDoc.getElementsByTagNameNS(relsNs, "Relationships")[0] || relsDoc.getElementsByTagName("Relationships")[0];
  const typesNode = contentTypesDoc.getElementsByTagName("Types")[0];
  if (!sheetsNode || !relationshipsNode || !typesNode) return;

  const sheetNodes = sheetsNode.getElementsByTagNameNS(workbookNs, "sheet");
  let nextSheetId = 1;
  for (let index = 0; index < sheetNodes.length; index += 1) {
    const sheetId = Number.parseInt(sheetNodes[index].getAttribute("sheetId"), 10);
    if (Number.isFinite(sheetId) && sheetId >= nextSheetId) nextSheetId = sheetId + 1;
  }

  const relationshipNodes = relationshipsNode.getElementsByTagNameNS(relsNs, "Relationship");
  let nextRid = 1;
  for (let index = 0; index < relationshipNodes.length; index += 1) {
    const id = relationshipNodes[index].getAttribute("Id") || "";
    const numeric = Number.parseInt(id.replace("rId", ""), 10);
    if (Number.isFinite(numeric) && numeric >= nextRid) nextRid = numeric + 1;
  }

  const existingSheetFiles = Object.keys(zip.files)
    .map((path) => {
      const match = path.match(/^xl\/worksheets\/sheet(\d+)\.xml$/);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isFinite(value));
  let nextSheetNumber = existingSheetFiles.length ? Math.max.apply(null, existingSheetFiles) + 1 : 1;

  const addSheet = (sheetName, rows, headers) => {
    const sheetNumber = nextSheetNumber;
    nextSheetNumber += 1;
    const sheetFilePath = `xl/worksheets/sheet${sheetNumber}.xml`;
    zip.file(sheetFilePath, worksheetXmlFromRows(rows, headers));

    const relationship = relsDoc.createElementNS(relsNs, "Relationship");
    relationship.setAttribute("Id", `rId${nextRid}`);
    relationship.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
    relationship.setAttribute("Target", `worksheets/sheet${sheetNumber}.xml`);
    relationshipsNode.appendChild(relationship);

    const sheet = workbookDoc.createElementNS(workbookNs, "sheet");
    sheet.setAttribute("name", sheetName);
    sheet.setAttribute("sheetId", String(nextSheetId));
    sheet.setAttributeNS(officeRelNs, "r:id", `rId${nextRid}`);
    sheetsNode.appendChild(sheet);

    const override = contentTypesDoc.createElement("Override");
    override.setAttribute("PartName", `/${sheetFilePath}`);
    override.setAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml");
    typesNode.appendChild(override);

    nextSheetId += 1;
    nextRid += 1;
  };

  addSheet("ACC_BRUT", accelerometerApi.buildRawExportRows(accelerometerState()), accRawHeaders);
  addSheet("ACC_RESULTATS", [accelerometerApi.buildResultsExportRow(accelerometerState())], accResultsHeaders);

  zip.file("xl/workbook.xml", new XMLSerializer().serializeToString(workbookDoc));
  zip.file("xl/_rels/workbook.xml.rels", new XMLSerializer().serializeToString(relsDoc));
  zip.file("[Content_Types].xml", new XMLSerializer().serializeToString(contentTypesDoc));
}

function setSheetCell(sheet, ref, value) {
  if (value == null || value === "") return;
  const current = sheet[ref] ? { ...sheet[ref] } : {};
  delete current.f;
  delete current.w;
  if (typeof value === "number" && Number.isFinite(value)) {
    current.t = "n";
    current.v = value;
    if (!current.z) current.z = "0.00";
    sheet[ref] = current;
    return;
  }
  current.t = "s";
  current.v = String(value);
  sheet[ref] = current;
}

function buildGeneratedWorkbook() {
  if (typeof XLSX === "undefined") throw new Error("Bibliotheque Excel indisponible");

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ activeTab: 0 }];

  const summaryRows = [
    ["Synthese export"],
    ["Identifiant", state.participantId.trim() || ""],
    ["Date", currentDateIso()],
    [],
    ["Marche"],
    ["Usuelle 1", walkValuesFor("usual1").time || ""],
    ["Usuelle 2", walkValuesFor("usual2").time || ""],
    ["Usuelle 3", walkValuesFor("usual3").time || ""],
    ["Rapide 1", walkValuesFor("fast1").time || ""],
    ["Rapide 2", walkValuesFor("fast2").time || ""],
    ["Rapide 3", walkValuesFor("fast3").time || ""],
    ["DT usuelle Fruits / legumes", walkValuesFor("dtUsualFruits").time || ""],
    ["DT usuelle Parties du corps", walkValuesFor("dtUsualBody").time || ""],
    ["DT rapide Vetements", walkValuesFor("dtFastClothes").time || ""],
    ["DT rapide Meubles", walkValuesFor("dtFastFurniture").time || ""],
    [],
    ["Accelerometre 20 m"],
    ["Resume accelerometre", accelerometerSummaryLine() || ""],
    ["Avertissements accelerometre", accelerometerState().analysis && accelerometerState().analysis.results ? accelerometerState().analysis.results.avertissements || "" : ""],
    [],
    ["Force"],
    ["5 levers de chaise", state.simpleStrength.chair5Time || ""],
    ["Impossible sans les mains", state.simpleStrength.impossibleWithoutHands ? "Oui" : "Non"],
    ["Note force", state.simpleStrength.note || ""],
    [],
    ["Equilibre"],
    ["RPdS", state.simpleBalance.rpds || ""],
    ["1/2 tandem", state.simpleBalance.semiTandem || ""],
    ["Tandem", state.simpleBalance.tandem || ""],
    ["SPPB equilibre", balanceScoreFromValues(state.simpleBalance)],
    ["Note equilibre", state.simpleBalance.note || ""],
    [],
    ["Autonomie"],
    ["Resume autonomie", autonomySummary() || ""],
    ["Note autonomie", state.simpleAutonomy.note || ""],
    [],
    ["Autres notes"],
    ["Objectifs", state.simpleNotes.goals || ""],
    ["Activites", state.simpleNotes.activities || ""],
    ["Analytique", state.simpleNotes.analytic || ""],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 34 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Synthese export");

  const recueilSheet = XLSX.utils.aoa_to_sheet([]);
  setSheetCell(recueilSheet, "A1", "Recueil brut export");
  setSheetCell(recueilSheet, "A3", "Identifiant");
  setSheetCell(recueilSheet, "B3", state.participantId.trim() || "");
  setSheetCell(recueilSheet, "D3", "Date");
  setSheetCell(recueilSheet, "E3", currentDateIso());
  setSheetCell(recueilSheet, "A5", "Usuelle 1");
  setSheetCell(recueilSheet, "B5", numberValue(walkValuesFor("usual1").time));
  setSheetCell(recueilSheet, "A6", "Usuelle 2");
  setSheetCell(recueilSheet, "B6", numberValue(walkValuesFor("usual2").time));
  setSheetCell(recueilSheet, "A7", "Usuelle 3");
  setSheetCell(recueilSheet, "B7", numberValue(walkValuesFor("usual3").time));
  setSheetCell(recueilSheet, "A9", "Rapide 1");
  setSheetCell(recueilSheet, "B9", numberValue(walkValuesFor("fast1").time));
  setSheetCell(recueilSheet, "A10", "Rapide 2");
  setSheetCell(recueilSheet, "B10", numberValue(walkValuesFor("fast2").time));
  setSheetCell(recueilSheet, "A11", "Rapide 3");
  setSheetCell(recueilSheet, "B11", numberValue(walkValuesFor("fast3").time));
  setSheetCell(recueilSheet, "A13", "DT usuelle Fruits / legumes");
  setSheetCell(recueilSheet, "B13", numberValue(walkValuesFor("dtUsualFruits").time));
  setSheetCell(recueilSheet, "A14", "DT usuelle Parties du corps");
  setSheetCell(recueilSheet, "B14", numberValue(walkValuesFor("dtUsualBody").time));
  setSheetCell(recueilSheet, "A15", "DT rapide Vetements");
  setSheetCell(recueilSheet, "B15", numberValue(walkValuesFor("dtFastClothes").time));
  setSheetCell(recueilSheet, "A16", "DT rapide Meubles");
  setSheetCell(recueilSheet, "B16", numberValue(walkValuesFor("dtFastFurniture").time));
  setSheetCell(recueilSheet, "A18", "5 levers de chaise");
  setSheetCell(recueilSheet, "B18", numberValue(state.simpleStrength.chair5Time));
  setSheetCell(recueilSheet, "A20", "RPdS");
  setSheetCell(recueilSheet, "B20", numberValue(state.simpleBalance.rpds));
  setSheetCell(recueilSheet, "A21", "1/2 tandem");
  setSheetCell(recueilSheet, "B21", numberValue(state.simpleBalance.semiTandem));
  setSheetCell(recueilSheet, "A22", "Tandem");
  setSheetCell(recueilSheet, "B22", numberValue(state.simpleBalance.tandem));
  setSheetCell(recueilSheet, "A23", "SPPB equilibre");
  setSheetCell(recueilSheet, "B23", balanceScoreFromValues(state.simpleBalance));
  setSheetCell(recueilSheet, "A25", "Autonomie");
  setSheetCell(recueilSheet, "B25", autonomySummary() || "");
  recueilSheet["!cols"] = [{ wch: 34 }, { wch: 18 }];
  recueilSheet["!ref"] = "A1:B25";
  XLSX.utils.book_append_sheet(workbook, recueilSheet, "Recueil brut");

  if (accelerometerApi && typeof accelerometerApi.appendAccelerometerSheetsToWorkbook === "function") {
    accelerometerApi.appendAccelerometerSheetsToWorkbook(workbook, accelerometerState());
  }

  return workbook;
}

async function buildSimpleExcelFile() {
  const workbook = buildGeneratedWorkbook();
  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { blob, filename: workbookFileName() };
}

async function buildSimpleModelExcelFile() {
  if (typeof JSZip === "undefined") throw new Error("Bibliotheque Excel indisponible");
  const response = await fetch("./assets/fiche_4m_usuel_rapide_complexite_template.xlsx");
  if (!response.ok) throw new Error("Modele Excel introuvable");
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const recueilFile = zip.file("xl/worksheets/sheet1.xml");
  if (!recueilFile) throw new Error("Feuille Recueil introuvable");
  const recueilXml = await recueilFile.async("string");
  const recueilDoc = new DOMParser().parseFromString(recueilXml, "application/xml");
  const record = simpleTemplateWorkbookRecord();
  const refs = Object.keys(record);
  for (let index = 0; index < refs.length; index += 1) {
    setWorksheetValue(recueilDoc, refs[index], record[refs[index]]);
  }
  zip.file("xl/worksheets/sheet1.xml", new XMLSerializer().serializeToString(recueilDoc));

  const resultsFile = zip.file("xl/worksheets/sheet2.xml");
  if (resultsFile) {
    let resultsXml = await resultsFile.async("string");
    resultsXml = resultsXml.replaceAll("_xlfn.STDEV.S", "STDEV");
    const resultsDoc = new DOMParser().parseFromString(resultsXml, "application/xml");
    setWorksheetValue(resultsDoc, "A1", "SYNTHESE EXPORT");
    setWorksheetValue(resultsDoc, "A34", simpleExportSummaryLines().join("\n"));
    zip.file("xl/worksheets/sheet2.xml", new XMLSerializer().serializeToString(resultsDoc));
  }

  const workbookFile = zip.file("xl/workbook.xml");
  if (workbookFile) {
    const workbookXml = await workbookFile.async("string");
    const workbookDoc = new DOMParser().parseFromString(workbookXml, "application/xml");
    const workbookView = workbookDoc.getElementsByTagName("workbookView")[0];
    if (workbookView) {
      workbookView.setAttribute("firstSheet", "0");
      workbookView.setAttribute("activeTab", "0");
    }
    const calcPr = workbookDoc.getElementsByTagName("calcPr")[0];
    if (calcPr) {
      calcPr.setAttribute("calcMode", "auto");
      calcPr.setAttribute("fullCalcOnLoad", "1");
      calcPr.setAttribute("forceFullCalc", "1");
    }
    zip.file("xl/workbook.xml", new XMLSerializer().serializeToString(workbookDoc));
  }

  if (zip.file("xl/calcChain.xml")) {
    zip.remove("xl/calcChain.xml");
  }

  await appendAccelerometerSheetsToZip(zip);

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: modelWorkbookFileName() };
}

async function shareWorkbookFile(fileData) {
  if (navigator.share && navigator.canShare && typeof File !== "undefined") {
    const file = new File([fileData.blob], fileData.filename, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ title: fileData.filename, files: [file] });
      return;
    }
  }
  const url = URL.createObjectURL(fileData.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileData.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareSimpleModelExcel() {
  try {
    if (state.simpleWorkflow.module === "accelerometer") syncAccelerometerFieldsFromUi();
    await shareWorkbookFile(await buildSimpleModelExcelFile());
  } catch (error) {
    alert(error && error.message ? error.message : "Export Excel modele impossible.");
  }
}

async function shareSimpleExcel() {
  try {
    if (state.simpleWorkflow.module === "accelerometer") syncAccelerometerFieldsFromUi();
    await shareWorkbookFile(await buildSimpleExcelFile());
  } catch (error) {
    alert(error && error.message ? error.message : "Export Excel impossible.");
  }
}

function syncAccelerometerFieldsFromUi() {
  const current = ensureAccelerometerIdentity();
  const distanceInput = document.getElementById("acc-distance");
  const targetInput = document.getElementById("acc-target-hz");
  const positionInput = document.getElementById("acc-position");
  const instructionInput = document.getElementById("acc-instruction");
  const commentInput = document.getElementById("acc-comment");
  const useFullInput = document.getElementById("acc-use-full-recording");
  current.distanceM = distanceInput ? distanceInput.value : current.distanceM;
  current.targetHz = targetInput ? targetInput.value : current.targetHz;
  current.phonePosition = positionInput ? positionInput.value : current.phonePosition;
  current.instruction = instructionInput ? instructionInput.value : current.instruction;
  current.comment = commentInput ? commentInput.value : current.comment;
  current.useFullRecording = Boolean(useFullInput && useFullInput.checked);
  current.patientId = state.participantId.trim() || "";
  if (!current.dateHeure) current.dateHeure = new Date().toISOString();
  if (!current.testId && accelerometerApi) current.testId = accelerometerApi.generateTestId();
  return current;
}

function accelerometerLiveUpdate(stats) {
  const current = accelerometerState();
  current.liveStats = {
    durationS: stats.durationS,
    sampleCount: stats.sampleCount,
    estimatedHz: stats.estimatedHz,
  };
  const durationNode = document.getElementById("acc-live-duration");
  const samplesNode = document.getElementById("acc-live-samples");
  const fsNode = document.getElementById("acc-live-fs");
  if (durationNode) durationNode.textContent = formatValueOrNa(stats.durationS, 2, "s");
  if (samplesNode) samplesNode.textContent = String(stats.sampleCount || 0);
  if (fsNode) fsNode.textContent = formatValueOrNa(stats.estimatedHz, 1, "Hz");
}

async function requestAccelerometerPermission() {
  if (!accelerometerApi || !accelerometerRuntime) {
    alert("Module accelerometre indisponible dans cette version.");
    return;
  }
  const current = ensureAccelerometerIdentity();
  current.lastError = "";
  const permission = await accelerometerApi.requestMotionPermission(accelerometerRuntime);
  if (permission === "denied") current.lastError = accelerometerRuntime.lastError || "Autorisation refusee.";
  if (permission === "unsupported") current.lastError = accelerometerRuntime.lastError || "Accelerometre non disponible.";
  saveState();
  renderSimpleWorkflow();
}

function startAccelerometerRecording() {
  if (!accelerometerApi || !accelerometerRuntime) {
    alert("Module accelerometre indisponible dans cette version.");
    return;
  }
  const current = syncAccelerometerFieldsFromUi();
  current.dateHeure = new Date().toISOString();
  current.lastError = "";
  current.status = "recording";
  current.analysis = null;
  current.rawSamples = [];
  try {
    accelerometerApi.startRecording(accelerometerRuntime, current, accelerometerLiveUpdate);
    saveState();
    renderSimpleWorkflow();
  } catch (error) {
    current.lastError = error && error.message ? error.message : "Demarrage impossible.";
    current.status = "error";
    saveState();
    renderSimpleWorkflow();
  }
}

function stopAccelerometerRecording() {
  if (!accelerometerApi || !accelerometerRuntime) return;
  const current = syncAccelerometerFieldsFromUi();
  current.lastError = "";
  current.status = "stopped";
  current.rawSamples = accelerometerApi.stopRecording(accelerometerRuntime);
  current.liveStats = accelerometerApi.getLiveStats(accelerometerRuntime);
  const analysis = accelerometerApi.analyseRecording(current);
  current.rawSamples = analysis.processedSamples;
  current.analysis = analysis;
  current.status = analysis.errors && analysis.errors.length ? "error" : "analysed";
  if (analysis.errors && analysis.errors.length) current.lastError = analysis.errors.join(" | ");
  saveState();
  renderSimpleWorkflow();
}

function resetAccelerometerTest() {
  if (accelerometerApi && accelerometerRuntime) accelerometerApi.resetRecording(accelerometerRuntime);
  state.simpleAccelerometer = normalizeState(null).simpleAccelerometer;
  ensureAccelerometerIdentity();
  saveState();
  renderSimpleWorkflow();
}

function saveAccelerometerAndReturn() {
  syncAccelerometerFieldsFromUi();
  saveState();
  returnToSimpleMenu();
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  alert("Synthese copiee dans le presse-papiers.");
}

async function shareResults() {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Evaluation TAP test", text: plainTextSummary() });
      return;
    } catch {
      // fallback
    }
  }
  await copyText(plainTextSummary());
}

function mailResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const subject = encodeURIComponent(`Evaluation motrice TAP test HCPN - ${findTimepoint(state.activeTimepoint).label} - Identifiant : ${participant}`);
  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(plainTextSummary())}`;
}

function copyResults() {
  return copyText(plainTextSummary());
}

function handleWorkflowPrimary() {
  const moduleId = state.simpleWorkflow.module;
  if (!moduleId || moduleId === "menu") return;
  if (moduleId === "walk") {
    const measure = walkSequence[Math.max(0, Math.min(state.simpleWorkflow.walkIndex, walkSequence.length - 1))];
    const input = document.querySelector(`[data-field="time"][data-scope="simple"][data-measure="${measure.id}"]`);
    const values = walkValuesFor(measure.id);
    values.time = input ? input.value : values.time;
    saveState();
    advanceWalkWorkflow();
    return;
  }
  if (moduleId === "strength") {
    const timeInput = document.getElementById("strength-chair5-time");
    const checkbox = document.getElementById("strength-hands-checkbox");
    const noteInput = document.getElementById("strength-note");
    state.simpleStrength.chair5Time = timeInput ? timeInput.value : state.simpleStrength.chair5Time;
    state.simpleStrength.impossibleWithoutHands = checkbox ? checkbox.checked : state.simpleStrength.impossibleWithoutHands;
    state.simpleStrength.note = noteInput ? noteInput.value : state.simpleStrength.note;
    saveState();
    returnToSimpleMenu();
    return;
  }
  if (moduleId === "balance") {
    const rpdsInput = document.getElementById("balance-rpds");
    const semiTandemInput = document.getElementById("balance-semi-tandem");
    const tandemInput = document.getElementById("balance-tandem");
    const noteInput = document.getElementById("balance-note");
    state.simpleBalance.rpds = rpdsInput ? rpdsInput.value : state.simpleBalance.rpds;
    state.simpleBalance.semiTandem = semiTandemInput ? semiTandemInput.value : state.simpleBalance.semiTandem;
    state.simpleBalance.tandem = tandemInput ? tandemInput.value : state.simpleBalance.tandem;
    state.simpleBalance.note = noteInput ? noteInput.value : state.simpleBalance.note;
    saveState();
    returnToSimpleMenu();
    return;
  }
  if (moduleId === "autonomy") {
    eachNode("[data-autonomy-group]", (input) => {
      const group = input.dataset.autonomyGroup;
      const key = input.dataset.autonomyKey;
      state.simpleAutonomy[group][key] = Boolean(input.checked);
    });
    const sf12Input = document.getElementById("autonomy-sf12");
    const noteInput = document.getElementById("autonomy-note");
    state.simpleAutonomy.sf12 = sf12Input ? sf12Input.value : state.simpleAutonomy.sf12;
    state.simpleAutonomy.note = noteInput ? noteInput.value : state.simpleAutonomy.note;
    saveState();
    returnToSimpleMenu();
    return;
  }
  const textarea = document.getElementById("simple-module-note");
  state.simpleNotes[moduleId] = textarea ? textarea.value : "";
  saveState();
  returnToSimpleMenu();
}

function renderCurrentMode() {
  renderModeTabs();
  renderTimepointButtons();
  renderTapMeasureList();
  renderSimpleWorkflow();
}

function resetState() {
  const next = normalizeState(null);
  Object.assign(state, next);
  timerState.forEach((timer) => {
    timer.running = false;
    cancelAnimationFrame(timer.raf);
  });
  timerState.clear();
  if (accelerometerApi && accelerometerRuntime) {
    accelerometerApi.resetRecording(accelerometerRuntime);
    accelerometerApi.detachListener(accelerometerRuntime);
  }
  hideStopOverlay();
  saveState();
  participantInput.value = "";
  notesInput.value = "";
  renderCurrentMode();
}

function bindEvents() {
  participantInput.value = state.participantId;
  notesInput.value = state.notes;

  participantInput.addEventListener("input", () => {
    state.participantId = participantInput.value;
    saveState();
    renderSimpleMenu();
  });

  notesInput.addEventListener("input", () => {
    state.notes = notesInput.value;
    saveState();
  });

  if (resetAllButton) {
    resetAllButton.addEventListener("click", () => {
      if (window.confirm("Tout effacer pour demarrer un nouveau patient ?")) resetState();
    });
  }

  if (stopOverlay) {
    stopOverlay.addEventListener("click", () => {
      if (!overlayTimerScope || !overlayTimerMeasure) return;
      if (overlayMode === "armed") startTimer(overlayTimerScope, overlayTimerMeasure);
      else if (overlayMode === "running") stopTimer(overlayTimerScope, overlayTimerMeasure);
    });
  }

  eachNode(".mode-button", (button) => {
    button.addEventListener("click", () => {
      state.activeMode = button.dataset.mode;
      saveState();
      hideStopOverlay();
      renderModeTabs();
      renderSimpleWorkflow();
    });
  });

  eachNode(".timepoint-button", (button) => {
    button.addEventListener("click", () => {
      state.activeTimepoint = button.dataset.timepoint;
      saveState();
      hideStopOverlay();
      renderTimepointButtons();
      renderTapMeasureList();
    });
  });

  eachNode(".module-button", (button) => {
    button.addEventListener("click", () => openSimpleModule(button.dataset.module));
  });

  if (simpleBackToMenu) simpleBackToMenu.addEventListener("click", returnToSimpleMenu);
  if (simpleWorkflowPrimary) simpleWorkflowPrimary.addEventListener("click", handleWorkflowPrimary);
  if (shareSimpleExcelButton) shareSimpleExcelButton.addEventListener("click", shareSimpleExcel);
  if (shareSimpleModelExcelButton) shareSimpleModelExcelButton.addEventListener("click", shareSimpleModelExcel);

  measureList.addEventListener("input", handleValueInput);
  if (simpleWorkflowCard) simpleWorkflowCard.addEventListener("input", handleValueInput);

  document.addEventListener("click", (event) => {
    const button = closestActionButton(event.target);
    if (!button || !button.dataset.measure) return;
    const scope = button.dataset.scope;
    if (button.dataset.action === "toggle") toggleTimer(scope, button.dataset.measure);
    if (button.dataset.action === "use") useTimer(scope, button.dataset.measure);
    if (button.dataset.action === "reset") resetTimer(scope, button.dataset.measure);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target || !target.dataset) return;
    if (target.dataset.action === "acc-request-permission") {
      requestAccelerometerPermission();
      return;
    }
    if (target.dataset.action === "acc-start") {
      startAccelerometerRecording();
      return;
    }
    if (target.dataset.action === "acc-stop") {
      stopAccelerometerRecording();
      return;
    }
    if (target.dataset.action === "acc-reset") {
      resetAccelerometerTest();
      return;
    }
    if (target.dataset.action === "acc-export") {
      shareSimpleModelExcel();
      return;
    }
    if (target.dataset.action === "acc-save-return") {
      saveAccelerometerAndReturn();
    }
  });

  document.getElementById("share-results").addEventListener("click", shareResults);
  document.getElementById("mail-results").addEventListener("click", mailResults);
  document.getElementById("copy-results").addEventListener("click", copyResults);
}

bindEvents();
renderCurrentMode();
