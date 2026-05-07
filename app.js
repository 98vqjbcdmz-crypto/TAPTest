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

const simpleMeasures = [
  { id: "usual1", type: "walk", category: "usual", fields: ["time", "steps"] },
  { id: "usual2", type: "walk", category: "usual", fields: ["time", "steps"] },
  { id: "usual3", type: "walk", category: "usual", fields: ["time", "steps"] },
  { id: "fast1", type: "walk", category: "fast", fields: ["time", "steps"] },
  { id: "fast2", type: "walk", category: "fast", fields: ["time", "steps"] },
  { id: "fast3", type: "walk", category: "fast", fields: ["time", "steps"] },
  { id: "dtUsual1", type: "walk", category: "dtUsual", fields: ["time", "steps"] },
  { id: "dtUsual2", type: "walk", category: "dtUsual", fields: ["time", "steps"] },
  { id: "dtFast1", type: "walk", category: "dtFast", fields: ["time", "steps"] },
  { id: "dtFast2", type: "walk", category: "dtFast", fields: ["time", "steps"] },
  {
    id: "simpleTug",
    type: "tug",
    category: "tug",
    label: "TUG",
    badge: "Temps",
    instruction: "Timed Up and Go ponctuel avec chronometrage arme.",
    fields: ["time"],
  },
];

const dualTaskSets = [
  {
    id: "set1",
    label: "Set 1",
    taskA: "Meubles / vetements",
    taskB: "Equipement de sport",
  },
  {
    id: "set2",
    label: "Set 2",
    taskA: "Choses que l'on voit dans un parc d'attractions",
    taskB: "Choses que l'on voit dans un restaurant",
  },
  {
    id: "set3",
    label: "Set 3",
    taskA: "Fruits / legumes",
    taskB: "Choses que l'on voit a la plage",
  },
  {
    id: "set4",
    label: "Set 4",
    taskA: "Parties du corps",
    taskB: "Metiers / professions",
  },
];

const dualTaskBank = dualTaskSets.map((item) => `${item.label} | ${item.taskA} | ${item.taskB}`);

const defaultState = {
  participantId: "",
  activeMode: "tap",
  activeTimepoint: "before",
  notes: "",
  values: {},
  simpleDistance: "4",
  simpleNotes: "",
  simpleValues: {},
  simpleProtocol: null,
  simpleClinical: {
    parachuteAnt: "",
    parachutePost: "",
    unipodalLeft: "",
    unipodalRight: "",
    painBefore: "",
    painAfter: "",
    painNotes: "",
    age: "",
    sex: "",
    height: "",
    weight: "",
    evaluator: "SL",
    surface: "",
    leadIn: "2",
    slowDown: "2",
    context: "",
    chair5: "",
    tandem: "",
    handgrip: "",
  },
};

const participantInput = document.getElementById("participant-id");
const notesInput = document.getElementById("qualitative-notes");
const simpleNotesInput = document.getElementById("simple-notes");
const simpleDistanceInput = document.getElementById("simple-walk-distance");
const simpleRandomizeButton = document.getElementById("simple-randomize");
const measureList = document.getElementById("measure-list");
const simpleMeasureList = document.getElementById("simple-measure-list");
const simpleExtraList = document.getElementById("simple-extra-list");
const simpleRandomSummary = document.getElementById("simple-random-summary");
const currentTimepointLabel = document.getElementById("current-timepoint-label");
const resetAllButton = document.getElementById("reset-all");
const stopOverlay = document.getElementById("stop-overlay");
const stopOverlayLabel = document.getElementById("stop-overlay-label");
const stopOverlayMeasure = document.getElementById("stop-overlay-measure");
const stopOverlayTime = document.getElementById("stop-overlay-time");
const parachuteButtons = document.querySelectorAll("[data-choice-group]");
const unipodalLeftInput = document.getElementById("simple-unipodal-left");
const unipodalRightInput = document.getElementById("simple-unipodal-right");
const painBeforeInput = document.getElementById("simple-pain-before");
const painAfterInput = document.getElementById("simple-pain-after");
const painNotesInput = document.getElementById("simple-pain-notes");
const ageInput = document.getElementById("simple-age");
const sexInput = document.getElementById("simple-sex");
const heightInput = document.getElementById("simple-height");
const weightInput = document.getElementById("simple-weight");
const evaluatorInput = document.getElementById("simple-evaluator");
const surfaceInput = document.getElementById("simple-surface");
const leadInInput = document.getElementById("simple-lead-in");
const slowDownInput = document.getElementById("simple-slow-down");
const contextInput = document.getElementById("simple-context");
const chair5Input = document.getElementById("simple-chair5");
const tandemInput = document.getElementById("simple-tandem");
const handgripInput = document.getElementById("simple-handgrip");

const state = loadState();
const timerState = new Map();

let overlayTimerScope = "";
let overlayTimerMeasure = "";
let overlayMode = "";

function eachNode(selector, callback) {
  const nodes = document.querySelectorAll(selector);
  for (let index = 0; index < nodes.length; index += 1) {
    callback(nodes[index]);
  }
}

function shuffleArray(items) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    const saved = copy[index];
    copy[index] = copy[other];
    copy[other] = saved;
  }
  return copy;
}

function buildSimpleProtocol() {
  const walkIds = [
    "usual1", "usual2", "usual3",
    "fast1", "fast2", "fast3",
    "dtUsual1", "dtUsual2",
    "dtFast1", "dtFast2",
  ];
  const dualTasks = shuffleArray(dualTaskPool()).slice(0, 4);
  const selectedSet = dualTasks[0] || { label: "", taskA: "", taskB: "" };
  return {
    order: shuffleArray(walkIds),
    dtSetLabel: selectedSet.label || "",
    dtLabels: {
      dtUsual1: selectedSet.taskA || "",
      dtUsual2: selectedSet.taskB || "",
      dtFast1: selectedSet.taskA || "",
      dtFast2: selectedSet.taskB || "",
    },
  };
}

function dualTaskPool() {
  return dualTaskSets.slice();
}

function normalizeState(candidate) {
  const normalized = Object.assign(freshDefaultState(), candidate || {});
  if (!normalized.values || typeof normalized.values !== "object") normalized.values = {};
  if (!normalized.simpleValues || typeof normalized.simpleValues !== "object") normalized.simpleValues = {};
  const hasValidProtocol = normalized.simpleProtocol
    && Array.isArray(normalized.simpleProtocol.order)
    && normalized.simpleProtocol.order.length === 10
    && typeof normalized.simpleProtocol.dtSetLabel === "string"
    && normalized.simpleProtocol.dtLabels
    && typeof normalized.simpleProtocol.dtLabels === "object";
  if (!hasValidProtocol) {
    normalized.simpleProtocol = buildSimpleProtocol();
  }
  if (!normalized.simpleClinical || typeof normalized.simpleClinical !== "object") {
    normalized.simpleClinical = freshDefaultState().simpleClinical;
  }
  return normalized;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tap-evaluation") || "null");
    return normalizeState(saved);
  } catch {
    return normalizeState(null);
  }
}

function freshDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  localStorage.setItem("tap-evaluation", JSON.stringify(state));
}

function findTimepoint(timepointId) {
  for (let index = 0; index < timepoints.length; index += 1) {
    if (timepoints[index].id === timepointId) return timepoints[index];
  }
  return timepoints[0];
}

function findMeasure(measureId) {
  const allMeasures = tapMeasures.concat(simpleMeasures);
  for (let index = 0; index < allMeasures.length; index += 1) {
    if (allMeasures[index].id === measureId) return allMeasures[index];
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

function ensureSimpleMeasure(measureId) {
  if (!state.simpleValues[measureId]) state.simpleValues[measureId] = {};
  return state.simpleValues[measureId];
}

function valuesFor(scope, measureId) {
  return scope === "simple"
    ? ensureSimpleMeasure(measureId)
    : ensureTapMeasure(state.activeTimepoint, measureId);
}

function simpleDistance() {
  const parsed = numberValue(state.simpleDistance);
  return parsed && parsed > 0 ? parsed : 4;
}

function distanceFor(scope, measure) {
  if (!measure) return null;
  if (scope === "tap") return measure.distance || null;
  if (measure.type === "walk") return simpleDistance();
  return null;
}

function numberValue(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, digits) {
  const minDigits = typeof digits === "number" ? digits : 2;
  const maxDigits = typeof digits === "number" ? digits : 2;
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
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

function timerScope(scope) {
  return scope === "simple" ? "simple" : `tap:${state.activeTimepoint}`;
}

function timerKey(scope, measureId) {
  return `${timerScope(scope)}:${measureId}`;
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

function simpleMeasurePresentation(measureId, orderIndex) {
  const measure = findMeasure(measureId);
  const labelMap = {
    usual: "Marche lancee usuelle",
    fast: "Marche lancee rapide",
    dtUsual: "Double tache usuelle",
    dtFast: "Double tache rapide",
  };
  if (measure && measure.type === "tug") {
    return {
      title: measure.label,
      badge: measure.badge,
      instruction: measure.instruction,
    };
  }
  const dtLabels = state.simpleProtocol && state.simpleProtocol.dtLabels ? state.simpleProtocol.dtLabels : {};
  const dtLabel = dtLabels[measureId];
  const category = measure ? measure.category : "";
  const titleCore = labelMap[category] || "Mesure";
  const title = `${orderIndex}. ${titleCore}`;
  const instruction = dtLabel
    ? `Consigne de double tache : ${dtLabel}.`
    : "Chronometrer uniquement la distance mesuree, en marche lancee.";
  const badge = category.indexOf("dt") === 0 ? "DT" : "Vitesse";
  return { title, badge, instruction };
}

function renderMeasureCard(scope, measureId, orderIndex) {
  const measure = findMeasure(measureId);
  const values = valuesFor(scope, measureId);
  const timer = getTimer(scope, measureId);
  const distance = distanceFor(scope, measure);
  const time = numberValue(values.time);
  const speed = distance && time ? distance / time : null;
  const actionClass = timer.stopped ? "timer-actions is-post-stop" : "timer-actions is-ready";
  const actions = timer.stopped ? `
    <button class="use-timer" type="button" data-action="use" data-scope="${scope}" data-measure="${measureId}">Ajouter</button>
    <button class="reset-timer" type="button" data-action="reset" data-scope="${scope}" data-measure="${measureId}">RAZ</button>
  ` : `
    <button class="start-timer" type="button" data-action="toggle" data-scope="${scope}" data-measure="${measureId}">Armer</button>
  `;
  const presentation = scope === "simple"
    ? simpleMeasurePresentation(measureId, orderIndex)
    : { title: measure.label, badge: measure.badge, instruction: measure.instruction };

  const card = document.createElement("article");
  card.className = "measure-card";
  card.dataset.scope = scope;
  card.dataset.measure = measureId;
  card.innerHTML = `
    <div class="measure-header">
      <div class="measure-title-row">
        <h3>${presentation.title}</h3>
        <span class="measure-badge">${presentation.badge}</span>
      </div>
      <p>${presentation.instruction}</p>
    </div>
    <div class="measure-body">
      <div class="field-grid">
        <label class="field">
          <span>Temps (s)</span>
          <input data-field="time" data-scope="${scope}" data-measure="${measureId}" type="number" min="0" step="0.01" inputmode="decimal" value="${values.time || ""}" placeholder="0,00" />
        </label>
        ${measure.fields.indexOf("steps") >= 0 ? `
          <label class="field">
            <span>Nombre de pas</span>
            <input data-field="steps" data-scope="${scope}" data-measure="${measureId}" type="number" min="0" step="1" inputmode="numeric" value="${values.steps || ""}" placeholder="0" />
          </label>
          <div class="computed wide">
            <span>Vitesse calculee</span>
            <strong>${speed ? `${formatNumber(speed, 2)} m/s` : "Non renseignee"}</strong>
          </div>
        ` : ""}
      </div>
      <div class="timer-box" data-timer-scope="${scope}" data-timer="${measureId}">
        <div class="timer-display">${formatTimer(currentTimerMs(timer))}</div>
        <div class="${actionClass}">
          ${actions}
        </div>
      </div>
    </div>
  `;
  return card;
}

function renderTapMeasureList() {
  measureList.innerHTML = "";
  for (let index = 0; index < tapMeasures.length; index += 1) {
    const measure = tapMeasures[index];
    measureList.append(renderMeasureCard("tap", measure.id, index + 1));
    updateTimerDisplay("tap", measure.id);
  }
}

function renderSimpleProtocolSummary() {
  const order = state.simpleProtocol.order || [];
  const titles = [];
  for (let index = 0; index < order.length; index += 1) {
    titles.push(simpleMeasurePresentation(order[index], index + 1).title);
  }
  const dtRows = [];
  const dtLabels = state.simpleProtocol && state.simpleProtocol.dtLabels ? state.simpleProtocol.dtLabels : {};
  const selectedSetLabel = state.simpleProtocol && state.simpleProtocol.dtSetLabel ? state.simpleProtocol.dtSetLabel : "";
  const keys = [
    { id: "dtUsual1", label: "DT usuelle 1" },
    { id: "dtUsual2", label: "DT usuelle 2" },
    { id: "dtFast1", label: "DT rapide 1" },
    { id: "dtFast2", label: "DT rapide 2" },
  ];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    dtRows.push(`${key.label} : ${dtLabels[key.id] || ""}`);
  }
  simpleRandomSummary.innerHTML = `
    <strong>Ordre aleatoire des 10 releves actif</strong>
    <span>${titles.join(" -> ")}</span>
    <span>Set de double tache : ${selectedSetLabel || "non tire"}</span>
    <span>Double tache tiree au sort : ${dtRows.join(" | ")}</span>
  `;
}

function renderSimpleMeasureList() {
  simpleMeasureList.innerHTML = "";
  simpleExtraList.innerHTML = "";
  renderSimpleProtocolSummary();

  const order = state.simpleProtocol.order || [];
  for (let index = 0; index < order.length; index += 1) {
    simpleMeasureList.append(renderMeasureCard("simple", order[index], index + 1));
    updateTimerDisplay("simple", order[index]);
  }

  simpleExtraList.append(renderMeasureCard("simple", "simpleTug", 0));
  updateTimerDisplay("simple", "simpleTug");
  renderSimpleClinical();
}

function renderSimpleClinical() {
  const clinical = state.simpleClinical;
  if (unipodalLeftInput && document.activeElement !== unipodalLeftInput) unipodalLeftInput.value = clinical.unipodalLeft || "";
  if (unipodalRightInput && document.activeElement !== unipodalRightInput) unipodalRightInput.value = clinical.unipodalRight || "";
  if (painBeforeInput && document.activeElement !== painBeforeInput) painBeforeInput.value = clinical.painBefore || "";
  if (painAfterInput && document.activeElement !== painAfterInput) painAfterInput.value = clinical.painAfter || "";
  if (painNotesInput && document.activeElement !== painNotesInput) painNotesInput.value = clinical.painNotes || "";
  if (ageInput && document.activeElement !== ageInput) ageInput.value = clinical.age || "";
  if (sexInput && document.activeElement !== sexInput) sexInput.value = clinical.sex || "";
  if (heightInput && document.activeElement !== heightInput) heightInput.value = clinical.height || "";
  if (weightInput && document.activeElement !== weightInput) weightInput.value = clinical.weight || "";
  if (evaluatorInput && document.activeElement !== evaluatorInput) evaluatorInput.value = clinical.evaluator || "";
  if (surfaceInput && document.activeElement !== surfaceInput) surfaceInput.value = clinical.surface || "";
  if (leadInInput && document.activeElement !== leadInInput) leadInInput.value = clinical.leadIn || "";
  if (slowDownInput && document.activeElement !== slowDownInput) slowDownInput.value = clinical.slowDown || "";
  if (contextInput && document.activeElement !== contextInput) contextInput.value = clinical.context || "";
  if (chair5Input && document.activeElement !== chair5Input) chair5Input.value = clinical.chair5 || "";
  if (tandemInput && document.activeElement !== tandemInput) tandemInput.value = clinical.tandem || "";
  if (handgripInput && document.activeElement !== handgripInput) handgripInput.value = clinical.handgrip || "";
  eachNode(".choice-button", (button) => {
    const group = button.dataset.choiceGroup;
    button.classList.toggle("is-active", clinical[group] === button.dataset.choiceValue);
  });
}

function updateTimerDisplay(scope, measureId) {
  const display = document.querySelector(`[data-timer-scope="${scope}"][data-timer="${measureId}"] .timer-display`);
  if (!display) return;
  const timer = getTimer(scope, measureId);
  const formatted = formatTimer(currentTimerMs(timer));
  display.textContent = formatted;
  if (overlayTimerScope === scope && overlayTimerMeasure === measureId && stopOverlayTime) {
    stopOverlayTime.textContent = formatted;
  }
  if (timer.running) {
    timer.raf = requestAnimationFrame(() => updateTimerDisplay(scope, measureId));
  }
}

function showOverlay(scope, measureId, mode) {
  const presentation = scope === "simple"
    ? simpleMeasurePresentation(measureId, 0)
    : { title: findMeasure(measureId).label };
  overlayTimerScope = scope;
  overlayTimerMeasure = measureId;
  overlayMode = mode;
  stopOverlayLabel.textContent = mode === "armed" ? "DEMARRER" : "ARRETER";
  stopOverlayMeasure.textContent = presentation.title;
  stopOverlayTime.textContent = formatTimer(currentTimerMs(getTimer(scope, measureId)));
  stopOverlay.classList.toggle("is-armed", mode === "armed");
  stopOverlay.classList.toggle("is-running", mode === "running");
  stopOverlay.classList.add("is-visible");
}

function showArmedOverlay(scope, measureId) {
  showOverlay(scope, measureId, "armed");
}

function showRunningOverlay(scope, measureId) {
  showOverlay(scope, measureId, "running");
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
  showRunningOverlay(scope, measureId);
  updateTimerDisplay(scope, measureId);
}

function stopTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();
  if (scope === "simple") renderSimpleMeasureList();
  else renderTapMeasureList();
}

function toggleTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  if (timer.running) {
    stopTimer(scope, measureId);
    return;
  }
  showArmedOverlay(scope, measureId);
}

function focusFieldAlert(input) {
  if (!input) return;
  const field = input.parentNode;
  field.classList.add("field-alert");
  input.focus({ preventScroll: true });
  if (typeof input.select === "function") input.select();
  window.setTimeout(() => {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }, 60);
}

function focusNotesField(scope) {
  focusFieldAlert(scope === "simple" ? simpleNotesInput : notesInput);
}

function useTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();
  const measure = findMeasure(measureId);
  const values = valuesFor(scope, measureId);
  values.time = (timer.elapsed / 1000).toFixed(2);
  saveState();
  if (scope === "simple") renderSimpleMeasureList();
  else renderTapMeasureList();
  if (measure.fields.indexOf("steps") >= 0) {
    const selector = `[data-field="steps"][data-scope="${scope}"][data-measure="${measureId}"]`;
    focusFieldAlert(document.querySelector(selector));
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
  const values = valuesFor(scope, measureId);
  values.time = "";
  values.steps = "";
  saveState();
  if (scope === "simple") renderSimpleMeasureList();
  else renderTapMeasureList();
}

function handleValueInput(event) {
  const input = closestFieldInput(event.target);
  if (!input) return;
  const scope = input.dataset.scope || "tap";
  const values = valuesFor(scope, input.dataset.measure);
  values[input.dataset.field] = input.value;
  if (input.dataset.field === "steps") {
    input.parentNode.classList.remove("field-alert");
    if (scope === "simple") {
      const order = state.simpleProtocol.order || [];
      const lastMeasureId = order[order.length - 1];
      if (input.dataset.measure === lastMeasureId && input.value) {
        focusNotesField("simple");
      }
    } else if (input.dataset.measure === "walkFast" && input.value) {
      focusNotesField("tap");
    }
  }
  saveState();
  if (scope === "simple" && input.dataset.field === "time") {
    renderSimpleMeasureList();
  } else if (scope === "tap" && input.dataset.field === "time") {
    renderTapMeasureList();
  } else {
    updateComputedDisplays(scope, input.dataset.measure);
  }
}

function updateComputedDisplays(scope, measureId) {
  const measure = findMeasure(measureId);
  const values = valuesFor(scope, measureId);
  const distance = distanceFor(scope, measure);
  const time = numberValue(values.time);
  const speed = distance && time ? distance / time : null;
  eachNode(`.measure-card[data-scope="${scope}"][data-measure="${measureId}"] .computed strong`, (node) => {
    node.textContent = speed ? `${formatNumber(speed, 2)} m/s` : "Non renseignee";
  });
}

function fieldValue(value, suffix) {
  return Number.isFinite(value) ? `${formatNumber(value, 2)}${suffix || ""}` : "";
}

function stepsValue(value) {
  return Number.isFinite(value) ? formatNumber(value, 0) : "";
}

function exportTimestamp() {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
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
    `--- vitesse (m/s) : ${fieldValue(usualSpeed)}`,
    `--- nombre de pas : ${stepsValue(numberValue(values.walkUsual && values.walkUsual.steps))}`,
    "-- rapide",
    `--- vitesse (m/s) : ${fieldValue(fastSpeed)}`,
    `--- nombre de pas : ${stepsValue(numberValue(values.walkFast && values.walkFast.steps))}`,
    `- TUG (s) : ${fieldValue(tugTime)}`,
    `- Notes : ${state.notes.trim() || ""}`,
  ].join("\n");
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function measureTimeValue(measureId) {
  const entry = state.simpleValues[measureId] || {};
  const time = numberValue(entry.time);
  return Number.isFinite(time) ? time : null;
}

function categoryTimes(category) {
  const matches = [];
  const order = state.simpleProtocol.order || [];
  for (let index = 0; index < order.length; index += 1) {
    const measureId = order[index];
    const measure = findMeasure(measureId);
    if (!measure || measure.category !== category) continue;
    const time = measureTimeValue(measureId);
    if (Number.isFinite(time)) matches.push(time);
  }
  return matches;
}

function parachuteSummary() {
  const ant = (state.simpleClinical.parachuteAnt || "").trim().toLowerCase();
  const post = (state.simpleClinical.parachutePost || "").trim().toLowerCase();
  if (!ant && !post) return "";
  return `ant ${ant || "?"}; post ${post || "?"}`;
}

function unipodalSummary() {
  const right = String(state.simpleClinical.unipodalRight || "").trim();
  const left = String(state.simpleClinical.unipodalLeft || "").trim();
  if (!right && !left) return "";
  return `D ${right || "XX"}; G ${left || "XX"}`;
}

function dualTaskSummary() {
  const labels = state.simpleProtocol && state.simpleProtocol.dtLabels ? state.simpleProtocol.dtLabels : {};
  const setLabel = state.simpleProtocol && state.simpleProtocol.dtSetLabel ? state.simpleProtocol.dtSetLabel : "";
  const items = [];
  const order = ["dtUsual1", "dtUsual2", "dtFast1", "dtFast2"];
  for (let index = 0; index < order.length; index += 1) {
    const key = order[index];
    if (labels[key]) items.push(labels[key]);
  }
  return [setLabel, items.join(" | ")].filter(Boolean).join(" | ");
}

function currentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function decimalExport(value, digits) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(typeof digits === "number" ? digits : 2);
}

function simpleWorkbookRecord() {
  const clinical = state.simpleClinical;
  const usualTimes = categoryTimes("usual");
  const fastTimes = categoryTimes("fast");
  const dtUsualTimes = categoryTimes("dtUsual");
  const dtFastTimes = categoryTimes("dtFast");
  const tug = state.simpleValues.simpleTug || {};
  return {
    export_timestamp: exportTimestamp(),
    template_name: "XXXX NIP_fiche_4m_usuel_rapide_complexite.xlsx",
    template_sheet: "Recueil",
    recueil_B5_identifiant: state.participantId.trim(),
    recueil_E5_date: currentDateIso(),
    recueil_H5_groupe: "MCO",
    recueil_B6_age_ans: clinical.age || "",
    recueil_E6_sexe: clinical.sex || "",
    recueil_B7_taille_cm: clinical.height || "",
    recueil_E7_poids_kg: clinical.weight || "",
    recueil_B8_diagnostic_contexte: clinical.context || "",
    recueil_E8_evaluateur: clinical.evaluator || "",
    recueil_B11_distance_m: decimalExport(simpleDistance(), 1),
    recueil_E11_elan_m: clinical.leadIn || "",
    recueil_B12_deceleration_m: clinical.slowDown || "",
    recueil_E12_surface_chaussures: clinical.surface || "",
    recueil_B16_usuel_1_s: decimalExport(usualTimes[0], 2),
    recueil_B17_usuel_2_s: decimalExport(usualTimes[1], 2),
    recueil_B18_usuel_3_s: decimalExport(usualTimes[2], 2),
    recueil_B22_rapide_1_s: decimalExport(fastTimes[0], 2),
    recueil_B23_rapide_2_s: decimalExport(fastTimes[1], 2),
    recueil_B24_rapide_3_s: decimalExport(fastTimes[2], 2),
    recueil_B27_usuel_apres_rapide_s: "",
    recueil_B28_rapide_apres_usuel_s: "",
    recueil_B31_type_double_tache: dualTaskSummary(),
    recueil_B33_usuel_dt_1_s: decimalExport(dtUsualTimes[0], 2),
    recueil_E33_usuel_dt_2_s: decimalExport(dtUsualTimes[1], 2),
    recueil_G33_5tsts_s: clinical.chair5 || "",
    recueil_B35_rapide_dt_1_s: decimalExport(dtFastTimes[0], 2),
    recueil_E35_rapide_dt_2_s: decimalExport(dtFastTimes[1], 2),
    recueil_H35_parachutes: parachuteSummary(),
    recueil_B37_equilibre_unipodal: unipodalSummary(),
    recueil_E37_tandem: clinical.tandem || "",
    recueil_H37_tug_s: tug.time || "",
    recueil_E39_handgrip: clinical.handgrip || "",
    recueil_A42_notes_globales: [state.simpleNotes, clinical.painNotes].filter(Boolean).join("\n"),
    douleur_avant_0_10: clinical.painBefore || "",
    douleur_apres_0_10: clinical.painAfter || "",
  };
}

function simpleCsvContent() {
  const record = simpleWorkbookRecord();
  const header = Object.keys(record);
  const row = header.map((key) => record[key]);
  return [header, row].map((values) => values.map(csvEscape).join(";")).join("\n");
}

async function shareText(title, text, filename) {
  if (navigator.share && navigator.canShare && typeof File !== "undefined") {
    try {
      const file = new File([text], filename, { type: "text/csv;charset=utf-8" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return;
      }
    } catch (error) {
      // fallback below
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (error) {
      // fallback below
    }
  }
  await copyText(text);
}

async function shareResults() {
  await shareText("Evaluation TAP test", plainTextSummary(), "tap-test.txt");
}

function xmlFirst(doc, tagName) {
  return doc.getElementsByTagName(tagName)[0] || null;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
  const numericPattern = /^-?\d+(?:\.\d+)?$/;
  if (numericPattern.test(normalized)) {
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
  const safe = participant.replace(/[^a-z0-9_-]+/gi, "_");
  return `${safe}_fiche_4m_usuel_rapide_complexite.xlsx`;
}

async function downloadSimpleExcel() {
  if (typeof JSZip === "undefined") {
    alert("La librairie d'export Excel n'est pas disponible.");
    return;
  }
  const response = await fetch("./assets/fiche_4m_usuel_rapide_complexite_template.xlsx");
  if (!response.ok) {
    alert("Modele Excel introuvable.");
    return;
  }
  const buffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml").async("string");
  const doc = new DOMParser().parseFromString(sheetXml, "application/xml");
  const record = simpleWorkbookRecord();
  const cellMap = {
    B5: record.recueil_B5_identifiant,
    E5: record.recueil_E5_date,
    H5: record.recueil_H5_groupe,
    B6: record.recueil_B6_age_ans,
    E6: record.recueil_E6_sexe,
    B7: record.recueil_B7_taille_cm,
    E7: record.recueil_E7_poids_kg,
    B8: record.recueil_B8_diagnostic_contexte,
    E8: record.recueil_E8_evaluateur,
    B11: record.recueil_B11_distance_m,
    E11: record.recueil_E11_elan_m,
    B12: record.recueil_B12_deceleration_m,
    E12: record.recueil_E12_surface_chaussures,
    B16: record.recueil_B16_usuel_1_s,
    B17: record.recueil_B17_usuel_2_s,
    B18: record.recueil_B18_usuel_3_s,
    B22: record.recueil_B22_rapide_1_s,
    B23: record.recueil_B23_rapide_2_s,
    B24: record.recueil_B24_rapide_3_s,
    B27: record.recueil_B27_usuel_apres_rapide_s,
    B28: record.recueil_B28_rapide_apres_usuel_s,
    B31: record.recueil_B31_type_double_tache,
    B33: record.recueil_B33_usuel_dt_1_s,
    E33: record.recueil_E33_usuel_dt_2_s,
    G33: record.recueil_G33_5tsts_s,
    B35: record.recueil_B35_rapide_dt_1_s,
    E35: record.recueil_E35_rapide_dt_2_s,
    H35: record.recueil_H35_parachutes,
    B37: record.recueil_B37_equilibre_unipodal,
    E37: record.recueil_E37_tandem,
    H37: record.recueil_H37_tug_s,
    E39: record.recueil_E39_handgrip,
    A42: record.recueil_A42_notes_globales,
  };
  const refs = Object.keys(cellMap);
  for (let index = 0; index < refs.length; index += 1) {
    setWorksheetValue(doc, refs[index], cellMap[refs[index]]);
  }
  const serialized = new XMLSerializer().serializeToString(doc);
  zip.file("xl/worksheets/sheet1.xml", serialized);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = workbookFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareSimpleResults() {
  await shareText("Mesures simples", simpleCsvContent(), "mesures-simples.csv");
}

function mailResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const subject = encodeURIComponent(`Evaluation motrice TAP test HCPN - ${findTimepoint(state.activeTimepoint).label} - Identifiant : ${participant}`);
  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(plainTextSummary())}`;
}

function mailSimpleResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const subject = encodeURIComponent(`Mesures simples CSV - Identifiant : ${participant}`);
  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(simpleCsvContent())}`;
}

async function copyResults() {
  await copyText(plainTextSummary());
}

async function copySimpleResults() {
  await copyText(simpleCsvContent());
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

function renderSummary() {
  return state.activeMode === "simple" ? simpleCsvContent() : plainTextSummary();
}

function updateSimpleClinicalField(key, value) {
  state.simpleClinical[key] = value;
  saveState();
  renderSummary();
}

function bindSimpleClinicalInput(input, key) {
  if (!input) return;
  input.addEventListener("input", () => updateSimpleClinicalField(key, input.value));
}

function rerandomizeSimpleProtocol() {
  state.simpleProtocol = buildSimpleProtocol();
  state.simpleValues = {};
  saveState();
  hideStopOverlay();
  renderSimpleMeasureList();
  renderSummary();
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
  simpleNotesInput.value = state.simpleNotes;
  simpleDistanceInput.value = state.simpleDistance;
  renderModeTabs();
  renderTimepointButtons();
  renderTapMeasureList();
  renderSimpleMeasureList();
  renderSimpleClinical();
}

function bindEvents() {
  participantInput.value = state.participantId;
  notesInput.value = state.notes;
  simpleNotesInput.value = state.simpleNotes;
  simpleDistanceInput.value = state.simpleDistance;

  participantInput.addEventListener("input", () => {
    state.participantId = participantInput.value;
    saveState();
  });

  notesInput.addEventListener("input", () => {
    state.notes = notesInput.value;
    notesInput.parentNode.classList.remove("field-alert");
    saveState();
  });

  simpleNotesInput.addEventListener("input", () => {
    state.simpleNotes = simpleNotesInput.value;
    simpleNotesInput.parentNode.classList.remove("field-alert");
    saveState();
  });

  simpleDistanceInput.addEventListener("input", () => {
    state.simpleDistance = simpleDistanceInput.value;
    saveState();
    renderSimpleMeasureList();
  });

  simpleRandomizeButton.addEventListener("click", rerandomizeSimpleProtocol);

  if (resetAllButton) {
    resetAllButton.addEventListener("click", () => {
      if (window.confirm("Tout effacer pour demarrer un nouveau patient ?")) {
        resetState();
      }
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

  measureList.addEventListener("input", handleValueInput);
  simpleMeasureList.addEventListener("input", handleValueInput);
  simpleExtraList.addEventListener("input", handleValueInput);

  document.addEventListener("click", (event) => {
    const button = closestActionButton(event.target);
    if (!button || !button.dataset.measure) return;
    const scope = button.dataset.scope || "tap";
    if (button.dataset.action === "toggle") toggleTimer(scope, button.dataset.measure);
    if (button.dataset.action === "use") useTimer(scope, button.dataset.measure);
    if (button.dataset.action === "reset") resetTimer(scope, button.dataset.measure);
  });

  eachNode(".choice-button", (button) => {
    button.addEventListener("click", () => {
      updateSimpleClinicalField(button.dataset.choiceGroup, button.dataset.choiceValue);
      renderSimpleClinical();
    });
  });

  bindSimpleClinicalInput(unipodalLeftInput, "unipodalLeft");
  bindSimpleClinicalInput(unipodalRightInput, "unipodalRight");
  bindSimpleClinicalInput(painBeforeInput, "painBefore");
  bindSimpleClinicalInput(painAfterInput, "painAfter");
  bindSimpleClinicalInput(painNotesInput, "painNotes");
  bindSimpleClinicalInput(ageInput, "age");
  bindSimpleClinicalInput(sexInput, "sex");
  bindSimpleClinicalInput(heightInput, "height");
  bindSimpleClinicalInput(weightInput, "weight");
  bindSimpleClinicalInput(evaluatorInput, "evaluator");
  bindSimpleClinicalInput(surfaceInput, "surface");
  bindSimpleClinicalInput(leadInInput, "leadIn");
  bindSimpleClinicalInput(slowDownInput, "slowDown");
  bindSimpleClinicalInput(contextInput, "context");
  bindSimpleClinicalInput(chair5Input, "chair5");
  bindSimpleClinicalInput(tandemInput, "tandem");
  bindSimpleClinicalInput(handgripInput, "handgrip");

  document.getElementById("share-results").addEventListener("click", shareResults);
  document.getElementById("mail-results").addEventListener("click", mailResults);
  document.getElementById("copy-results").addEventListener("click", copyResults);
  document.getElementById("share-simple-results").addEventListener("click", shareSimpleResults);
  document.getElementById("mail-simple-results").addEventListener("click", mailSimpleResults);
  document.getElementById("copy-simple-results").addEventListener("click", copySimpleResults);
  document.getElementById("download-simple-excel").addEventListener("click", downloadSimpleExcel);
}

bindEvents();
renderModeTabs();
renderTimepointButtons();
renderTapMeasureList();
renderSimpleMeasureList();
renderSimpleClinical();
