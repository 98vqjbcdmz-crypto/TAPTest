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
    excelCell: "D33",
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
    excelCell: "D35",
  },
];

const moduleDefinitions = [
  { id: "walk", label: "Marche" },
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
    note: "",
  },
  simpleBalance: {
    rpds: "",
    semiTandem: "",
    tandem: "",
    note: "",
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

const state = loadState();
const timerState = new Map();

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
  if (!normalized.simpleNotes || typeof normalized.simpleNotes !== "object") normalized.simpleNotes = freshDefaultState().simpleNotes;
  if (!normalized.simpleWorkflow || typeof normalized.simpleWorkflow !== "object") normalized.simpleWorkflow = freshDefaultState().simpleWorkflow;
  if (typeof normalized.simpleWorkflow.walkIndex !== "number") normalized.simpleWorkflow.walkIndex = 0;
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
    return Object.values(adl).some(Boolean) || Object.values(iadl).some(Boolean) || Boolean(String(state.simpleAutonomy.note || "").trim());
  }
  return Boolean(String(state.simpleNotes[moduleId] || "").trim());
}

function renderSimpleMenu() {
  const completed = walkCompletedCount();
  const noteCount = ["balance", "strength", "goals", "activities", "autonomy", "analytic"].filter((moduleId) => moduleDone(moduleId)).length;
  simpleMenuSummary.innerHTML = `
    <strong>Identification : ${state.participantId.trim() || "a renseigner"}</strong>
    <span>Marche : ${completed} / ${walkSequence.length} temps valides. Autres domaines notes : ${noteCount} / 6.</span>
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

function autonomySummary() {
  const adlLabels = { toilette: "Toilette", habillage: "Habillage", alimentation: "Alimentation", transferts: "Transferts", continence: "Continence", deplacements: "Deplacements", releverSol: "Relever du sol" };
  const iadlLabels = { telephone: "Telephone", courses: "Courses", repas: "Preparation repas", menage: "Menage", lessive: "Lessive", transports: "Transports", traitement: "Traitement", finances: "Finances" };
  const adl = Object.keys(adlLabels).filter((key) => state.simpleAutonomy.adl && state.simpleAutonomy.adl[key]).map((key) => adlLabels[key]);
  const iadl = Object.keys(iadlLabels).filter((key) => state.simpleAutonomy.iadl && state.simpleAutonomy.iadl[key]).map((key) => iadlLabels[key]);
  const parts = [];
  if (adl.length) parts.push(`ADL : ${adl.join(", ")}`);
  if (iadl.length) parts.push(`IADL : ${iadl.join(", ")}`);
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
    cellValues[measure.excelCell] = Number.isFinite(time) ? time.toFixed(2) : "";
  }
  const moduleNotes = [];
  for (let index = 0; index < moduleDefinitions.length; index += 1) {
    const moduleId = moduleDefinitions[index].id;
    if (moduleId === "walk" || moduleId === "strength" || moduleId === "autonomy" || moduleId === "balance") continue;
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
    G33: state.simpleStrength.chair5Time || "",
    B33: cellValues.B33 || "",
    D33: cellValues.D33 || "",
    B35: cellValues.B35 || "",
    D35: cellValues.D35 || "",
    A42: [balanceSummary(), state.simpleBalance.note ? `Equilibre : ${state.simpleBalance.note}` : "", state.simpleStrength.note ? `Force : ${state.simpleStrength.note}` : "", state.simpleStrength.impossibleWithoutHands ? "Force : impossible sans les mains" : "", autonomySummary(), state.simpleAutonomy.note ? `Autonomie : ${state.simpleAutonomy.note}` : "", moduleNotes.join("\n")].filter(Boolean).join("\n"),
  };
}

function worksheetCell(doc, ref) {
  const cells = doc.getElementsByTagName("c");
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index].getAttribute("r") === ref) return cells[index];
  }
  return null;
}

function setWorksheetValue(doc, ref, rawValue) {
  const cell = worksheetCell(doc, ref);
  if (!cell) return;
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  const value = rawValue == null ? "" : String(rawValue).trim();
  if (!value) {
    cell.removeAttribute("t");
    return;
  }
  const normalized = value.replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    cell.removeAttribute("t");
    const node = doc.createElement("v");
    node.textContent = normalized;
    cell.appendChild(node);
    return;
  }
  cell.setAttribute("t", "inlineStr");
  const isNode = doc.createElement("is");
  const tNode = doc.createElement("t");
  tNode.textContent = value;
  isNode.appendChild(tNode);
  cell.appendChild(isNode);
}

function workbookFileName() {
  const participant = state.participantId.trim() || "sans-identifiant";
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  return `${participant.replace(/[^a-z0-9_-]+/gi, "_")}_${stamp}_fiche_mesures_simples.xlsx`;
}

function setSheetCell(sheet, ref, value) {
  if (value == null || value === "") return;
  if (typeof value === "number" && Number.isFinite(value)) {
    sheet[ref] = { t: "n", v: value };
    return;
  }
  sheet[ref] = { t: "s", v: String(value) };
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

async function shareSimpleExcel() {
  try {
    const fileData = await buildSimpleExcelFile();
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
  } catch (error) {
    alert(error && error.message ? error.message : "Export Excel impossible.");
  }
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
    const noteInput = document.getElementById("autonomy-note");
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

  document.getElementById("share-results").addEventListener("click", shareResults);
  document.getElementById("mail-results").addEventListener("click", mailResults);
  document.getElementById("copy-results").addEventListener("click", copyResults);
}

bindEvents();
renderCurrentMode();
