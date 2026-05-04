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
  {
    id: "launchedUsual",
    label: "Marche lancee - usuelle",
    badge: "Vitesse",
    instruction: "Lancer la marche avant la ligne, puis chronometrer uniquement la distance mesuree.",
    fields: ["time", "steps"],
    useSimpleDistance: true,
  },
  {
    id: "launchedFast",
    label: "Marche lancee - rapide",
    badge: "Vitesse",
    instruction: "Meme installation, a vitesse rapide securisee, sans courir.",
    fields: ["time", "steps"],
    useSimpleDistance: true,
  },
  {
    id: "chair5",
    label: "5 levees de chaise",
    badge: "SPPB",
    instruction: "Bras croises si possible. Chronometrer 5 levers-assis complets.",
    fields: ["time"],
  },
  {
    id: "balanceFeetTogether",
    label: "Equilibre - pieds joints",
    badge: "10 s",
    instruction: "Position pieds joints, maintien maximal 10 secondes.",
    fields: ["time"],
    maxTime: 10,
  },
  {
    id: "balanceSemiTandem",
    label: "Equilibre - semi-tandem",
    badge: "10 s",
    instruction: "Position semi-tandem, maintien maximal 10 secondes.",
    fields: ["time"],
    maxTime: 10,
  },
  {
    id: "balanceTandem",
    label: "Equilibre - tandem",
    badge: "10 s",
    instruction: "Position tandem, maintien maximal 10 secondes.",
    fields: ["time"],
    maxTime: 10,
  },
];

const allMeasures = tapMeasures.concat(simpleMeasures);

const defaultState = {
  participantId: "",
  activeMode: "tap",
  activeTimepoint: "before",
  notes: "",
  simpleNotes: "",
  simpleDistance: "4",
  values: {},
  simpleValues: {},
};

const state = loadState();
const timerState = new Map();

const participantInput = document.getElementById("participant-id");
const notesInput = document.getElementById("qualitative-notes");
const simpleNotesInput = document.getElementById("simple-notes");
const simpleDistanceInput = document.getElementById("simple-walk-distance");
const measureList = document.getElementById("measure-list");
const simpleMeasureList = document.getElementById("simple-measure-list");
const simpleScorePanel = document.getElementById("simple-score-panel");
const currentTimepointLabel = document.getElementById("current-timepoint-label");
const resetAllButton = document.getElementById("reset-all");
const stopOverlay = document.getElementById("stop-overlay");
const stopOverlayLabel = document.getElementById("stop-overlay-label");
const stopOverlayMeasure = document.getElementById("stop-overlay-measure");
const stopOverlayTime = document.getElementById("stop-overlay-time");

let overlayTimerScope = "";
let overlayTimerMeasure = "";
let overlayMode = "";

function eachNode(selector, callback) {
  const nodes = document.querySelectorAll(selector);
  for (let index = 0; index < nodes.length; index += 1) {
    callback(nodes[index]);
  }
}

function findTimepoint(timepointId) {
  for (let index = 0; index < timepoints.length; index += 1) {
    if (timepoints[index].id === timepointId) return timepoints[index];
  }
  return timepoints[0];
}

function findMeasure(measureId) {
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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tap-evaluation") || "null");
    return normalizeState(saved ? Object.assign(freshDefaultState(), saved) : freshDefaultState());
  } catch {
    return freshDefaultState();
  }
}

function normalizeState(candidate) {
  const normalized = Object.assign(freshDefaultState(), candidate || {});
  if (!normalized.values || typeof normalized.values !== "object") normalized.values = {};
  if (!normalized.simpleValues || typeof normalized.simpleValues !== "object") normalized.simpleValues = {};
  if (!normalized.activeMode) normalized.activeMode = "tap";
  if (!normalized.activeTimepoint) normalized.activeTimepoint = "before";
  if (!normalized.simpleDistance) normalized.simpleDistance = "4";
  if (typeof normalized.simpleNotes !== "string") normalized.simpleNotes = "";
  return normalized;
}

function freshDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  localStorage.setItem("tap-evaluation", JSON.stringify(state));
}

function resetState() {
  Object.assign(state, freshDefaultState());
  timerState.forEach((timer) => {
    timer.running = false;
    cancelAnimationFrame(timer.raf);
  });
  timerState.clear();
  hideStopOverlay();
  saveState();
  participantInput.value = "";
  notesInput.value = "";
  simpleNotesInput.value = "";
  simpleDistanceInput.value = state.simpleDistance;
  renderModeTabs();
  renderTimepointButtons();
  renderMeasureList();
  renderSimpleMeasureList();
}

function ensureMeasure(timepointId, measureId) {
  if (!state.values[timepointId]) {
    state.values[timepointId] = {};
  }
  if (!state.values[timepointId][measureId]) {
    state.values[timepointId][measureId] = {};
  }
  return state.values[timepointId][measureId];
}

function ensureSimpleMeasure(measureId) {
  if (!state.simpleValues[measureId]) {
    state.simpleValues[measureId] = {};
  }
  return state.simpleValues[measureId];
}

function valuesFor(scope, measureId) {
  return scope === "simple"
    ? ensureSimpleMeasure(measureId)
    : ensureMeasure(state.activeTimepoint, measureId);
}

function numberValue(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function simpleDistance() {
  const parsed = numberValue(state.simpleDistance);
  return parsed && parsed > 0 ? parsed : 4;
}

function distanceFor(measure) {
  if (!measure) return null;
  if (measure.useSimpleDistance) return simpleDistance();
  return measure.distance || null;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "Non renseigne";
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
  const timepoint = findTimepoint(state.activeTimepoint);
  currentTimepointLabel.textContent = timepoint.label;
}

function renderMeasureList() {
  measureList.innerHTML = "";

  tapMeasures.forEach((measure) => {
    measureList.append(renderMeasureCard("tap", measure));
    updateTimerDisplay("tap", measure.id);
  });
}

function renderSimpleMeasureList() {
  simpleMeasureList.innerHTML = "";

  simpleMeasures.forEach((measure) => {
    simpleMeasureList.append(renderMeasureCard("simple", measure));
    updateTimerDisplay("simple", measure.id);
  });

  renderSimpleScorePanel();
}

function renderMeasureCard(scope, measure) {
  const card = document.createElement("article");
  card.className = "measure-card";
  card.dataset.measure = measure.id;
  card.dataset.scope = scope;

  const values = valuesFor(scope, measure.id);
  const timer = getTimer(scope, measure.id);
  const time = numberValue(values.time);
  const distance = distanceFor(measure);
  const speed = distance && time ? distance / time : null;
  const actionClass = timer.stopped ? "timer-actions is-post-stop" : "timer-actions is-ready";
  const timerActions = timer.stopped ? `
    <button class="use-timer" type="button" data-action="use" data-scope="${scope}" data-measure="${measure.id}">Ajouter</button>
    <button class="reset-timer" type="button" data-action="reset" data-scope="${scope}" data-measure="${measure.id}">RAZ</button>
  ` : `
    <button class="start-timer" type="button" data-action="toggle" data-scope="${scope}" data-measure="${measure.id}">Armer</button>
  `;

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
          <input data-field="time" data-scope="${scope}" data-measure="${measure.id}" type="number" min="0" step="0.01" inputmode="decimal" value="${values.time || ""}" placeholder="0,00" />
        </label>
        ${measure.fields.includes("steps") ? `
          <label class="field">
            <span>Nombre de pas</span>
            <input data-field="steps" data-scope="${scope}" data-measure="${measure.id}" type="number" min="0" step="1" inputmode="numeric" value="${values.steps || ""}" placeholder="0" />
          </label>
          <div class="computed wide">
            <span>Vitesse calculee</span>
            <strong>${speed ? `${formatNumber(speed)} m/s` : "Non renseignee"}</strong>
          </div>
        ` : ""}
        ${measure.maxTime ? `
          <div class="computed wide">
            <span>Maintien cible</span>
            <strong>${time ? `${formatNumber(Math.min(time, measure.maxTime), 1)} / ${measure.maxTime} s` : "Non renseigne"}</strong>
          </div>
        ` : ""}
      </div>
      <div class="timer-box" data-timer-scope="${scope}" data-timer="${measure.id}">
        <div class="timer-display">${formatTimer(currentTimerMs(timer))}</div>
        <div class="${actionClass}">
          ${timerActions}
        </div>
      </div>
    </div>
  `;

  return card;
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

function startTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  if (timer.running) return;
  timer.running = true;
  timer.stopped = false;
  timer.startedAt = performance.now();
  showRunningOverlay(scope, measureId);
  updateTimerDisplay(scope, measureId);
}

function showOverlay(scope, measureId, mode) {
  const measure = findMeasure(measureId);
  overlayTimerScope = scope;
  overlayTimerMeasure = measureId;
  overlayMode = mode;
  if (stopOverlayLabel) {
    stopOverlayLabel.textContent = mode === "armed" ? "DEMARRER" : "ARRETER";
  }
  if (stopOverlayMeasure) {
    stopOverlayMeasure.textContent = measure ? measure.label : "";
  }
  if (stopOverlayTime) {
    stopOverlayTime.textContent = formatTimer(currentTimerMs(getTimer(scope, measureId)));
  }
  if (stopOverlay) {
    stopOverlay.classList.toggle("is-armed", mode === "armed");
    stopOverlay.classList.toggle("is-running", mode === "running");
    stopOverlay.classList.add("is-visible");
  }
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
  if (stopOverlay) {
    stopOverlay.classList.remove("is-visible");
    stopOverlay.classList.remove("is-armed");
    stopOverlay.classList.remove("is-running");
  }
}

function stopTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();
  if (scope === "simple") renderSimpleMeasureList();
  else renderMeasureList();
}

function toggleTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  if (timer.running) {
    stopTimer(scope, measureId);
    return;
  }
  showArmedOverlay(scope, measureId);
}

function useTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  timer.stopped = true;
  cancelAnimationFrame(timer.raf);
  hideStopOverlay();

  const measure = findMeasure(measureId);
  const shouldFocusSteps = measure && measure.fields.includes("steps");
  const values = valuesFor(scope, measureId);
  values.time = (timer.elapsed / 1000).toFixed(2);
  saveState();

  if (scope === "simple") renderSimpleMeasureList();
  else renderMeasureList();

  if (shouldFocusSteps) {
    focusStepsField(scope, measureId);
  }
  renderSummary();
}

function focusStepsField(scope, measureId) {
  const input = document.querySelector(`[data-field="steps"][data-scope="${scope}"][data-measure="${measureId}"]`);
  if (!input) return;
  const field = input.parentNode;
  field.classList.add("field-alert");
  input.focus({ preventScroll: true });
  input.select();
  window.setTimeout(() => {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }, 60);
}

function focusNotesField(scope) {
  const notes = scope === "simple" ? simpleNotesInput : notesInput;
  const field = notes.parentNode;
  field.classList.add("field-alert");
  notes.focus({ preventScroll: true });
  notes.select();
  window.setTimeout(() => {
    notes.scrollIntoView({ behavior: "smooth", block: "center" });
    notes.focus({ preventScroll: true });
  }, 60);
}

function resetTimer(scope, measureId) {
  const timer = getTimer(scope, measureId);
  timer.elapsed = 0;
  timer.startedAt = 0;
  timer.running = false;
  timer.stopped = false;
  cancelAnimationFrame(timer.raf);
  if (overlayTimerScope === scope && overlayTimerMeasure === measureId) {
    hideStopOverlay();
  }
  if (scope === "simple") renderSimpleMeasureList();
  else renderMeasureList();
}

function handleValueInput(event) {
  const input = closestFieldInput(event.target);
  if (!input) return;

  const scope = input.dataset.scope || "tap";
  const values = valuesFor(scope, input.dataset.measure);
  values[input.dataset.field] = input.value;
  if (input.dataset.field === "steps") {
    input.parentNode.classList.remove("field-alert");
  }
  saveState();

  if (scope === "simple") renderSimpleMeasureList();
  else if (input.dataset.field === "time") renderMeasureList();

  renderSummary();
}

function baselineValue(measureId, field) {
  const measure = state.values.before && state.values.before[measureId];
  return numberValue(measure && measure[field]);
}

function pointValue(timepointId, measureId, field) {
  const measure = state.values[timepointId] && state.values[timepointId][measureId];
  return numberValue(measure && measure[field]);
}

function statusFor(timepointId, measureId, field) {
  if (timepointId === "before") return { label: "Reference", className: "status-missing", detail: "" };

  const base = baselineValue(measureId, field);
  const value = pointValue(timepointId, measureId, field);
  if (!base || !value) return { label: "A completer", className: "status-missing", detail: "" };

  if (measureId === "tug") {
    const gain = base - value;
    return gain >= 5
      ? { label: "TAP positif", className: "status-ok", detail: `Amelioration ${formatNumber(gain, 1)} s` }
      : { label: "A surveiller", className: "status-watch", detail: `Amelioration ${formatNumber(gain, 1)} s` };
  }

  const variation = ((base - value) / base) * 100;
  const thresholdMet = field === "steps" ? variation > 10 : variation > 10;
  const label = field === "steps" ? "Diminution" : "Amelioration";

  return thresholdMet
    ? { label: "Seuil atteint", className: "status-ok", detail: `${label} ${formatNumber(variation, 1)} %` }
    : { label: "A surveiller", className: "status-watch", detail: `${label} ${formatNumber(variation, 1)} %` };
}

function scoreGait4m(timeSeconds) {
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return null;
  if (timeSeconds <= 4.82) return 4;
  if (timeSeconds <= 6.20) return 3;
  if (timeSeconds <= 8.70) return 2;
  return 1;
}

function scoreChair5(timeSeconds) {
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return null;
  if (timeSeconds <= 11.19) return 4;
  if (timeSeconds <= 13.69) return 3;
  if (timeSeconds <= 16.69) return 2;
  if (timeSeconds < 60) return 1;
  return 0;
}

function scoreBalance() {
  const side = numberValue(state.simpleValues.balanceFeetTogether && state.simpleValues.balanceFeetTogether.time);
  const semi = numberValue(state.simpleValues.balanceSemiTandem && state.simpleValues.balanceSemiTandem.time);
  const tandem = numberValue(state.simpleValues.balanceTandem && state.simpleValues.balanceTandem.time);

  if (!Number.isFinite(side)) return null;
  if (side < 10) return 0;
  if (!Number.isFinite(semi)) return null;
  if (semi < 10) return 1;
  if (!Number.isFinite(tandem)) return null;
  if (tandem < 3) return 2;
  if (tandem < 10) return 3;
  return 4;
}

function renderSimpleScorePanel() {
  const distance = simpleDistance();
  const usualTime = numberValue(state.simpleValues.launchedUsual && state.simpleValues.launchedUsual.time);
  const chairTime = numberValue(state.simpleValues.chair5 && state.simpleValues.chair5.time);
  const gaitScore = Math.abs(distance - 4) < 0.01 ? scoreGait4m(usualTime) : null;
  const chairScore = scoreChair5(chairTime);
  const balance = scoreBalance();

  const gaitScoreText = Math.abs(distance - 4) < 0.01
    ? (gaitScore === null ? "A completer" : `${gaitScore} / 4`)
    : "Disponible si distance = 4 m";

  const scoreItems = [
    {
      label: "Marche usuelle",
      value: gaitScoreText,
    },
    {
      label: "5 levees de chaise",
      value: chairScore === null ? "A completer" : `${chairScore} / 4`,
    },
    {
      label: "Equilibre statique",
      value: balance === null ? "A completer" : `${balance} / 4`,
    },
  ];

  const total = [gaitScore, chairScore, balance].every((score) => score !== null)
    ? gaitScore + chairScore + balance
    : null;

  simpleScorePanel.innerHTML = `
    <div class="score-header">
      <strong>Repere SPPB indicatif</strong>
      <span>${total === null ? "Score incomplet" : `${total} / 12`}</span>
    </div>
    <div class="score-grid">
      ${scoreItems.map((item) => `
        <div class="score-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSummary() {
  return state.activeMode === "simple" ? simplePlainTextSummary() : plainTextSummary();
}

function exportTimestamp() {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function fieldValue(value, suffix = "") {
  return Number.isFinite(value) ? `${formatNumber(value)}${suffix}` : "";
}

function stepsValue(value) {
  return Number.isFinite(value) ? formatNumber(value, 0) : "";
}

function plainTextSummary() {
  const timepoint = findTimepoint(state.activeTimepoint);
  const timepointValues = state.values[timepoint.id] || {};
  const tug = timepointValues.tug || {};
  const usual = timepointValues.walkUsual || {};
  const fast = timepointValues.walkFast || {};
  const tugTime = numberValue(tug.time);
  const usualTime = numberValue(usual.time);
  const fastTime = numberValue(fast.time);
  const usualSpeed = usualTime ? 6 / usualTime : null;
  const fastSpeed = fastTime ? 6 / fastTime : null;

  const lines = [
    "Evaluation motrice du TAP test pour HCPN:",
    `- Date / heure : ${exportTimestamp()}`,
    `- Identifiant : ${state.participantId.trim() || ""}`,
    `- ${timepoint.label}`,
    "- Marche sur 6 m :",
    "-- usuelle",
    `--- vitesse (m/s) : ${fieldValue(usualSpeed)}`,
    `--- nombre de pas : ${stepsValue(numberValue(usual.steps))}`,
    "-- rapide",
    `--- vitesse (m/s) : ${fieldValue(fastSpeed)}`,
    `--- nombre de pas : ${stepsValue(numberValue(fast.steps))}`,
    `- TUG (s) : ${fieldValue(tugTime)}`,
    `- Notes : ${state.notes.trim() || ""}`,
  ];

  return lines.join("\n");
}

function simplePlainTextSummary() {
  const distance = simpleDistance();
  const usual = state.simpleValues.launchedUsual || {};
  const fast = state.simpleValues.launchedFast || {};
  const chair = state.simpleValues.chair5 || {};
  const side = state.simpleValues.balanceFeetTogether || {};
  const semi = state.simpleValues.balanceSemiTandem || {};
  const tandem = state.simpleValues.balanceTandem || {};

  const usualTime = numberValue(usual.time);
  const fastTime = numberValue(fast.time);
  const chairTime = numberValue(chair.time);
  const usualSpeed = usualTime ? distance / usualTime : null;
  const fastSpeed = fastTime ? distance / fastTime : null;
  const gaitScore = Math.abs(distance - 4) < 0.01 ? scoreGait4m(usualTime) : null;
  const chairScore = scoreChair5(chairTime);
  const balance = scoreBalance();
  const total = [gaitScore, chairScore, balance].every((score) => score !== null)
    ? gaitScore + chairScore + balance
    : null;

  const lines = [
    "Mesures simples de marche et SPPB:",
    `- Date / heure : ${exportTimestamp()}`,
    `- Identifiant : ${state.participantId.trim() || ""}`,
    `- Distance de marche lancee : ${formatNumber(distance, 1)} m`,
    "- Marche lancee usuelle :",
    `-- temps (s) : ${fieldValue(usualTime)}`,
    `-- vitesse (m/s) : ${fieldValue(usualSpeed)}`,
    `-- nombre de pas : ${stepsValue(numberValue(usual.steps))}`,
    "- Marche lancee rapide :",
    `-- temps (s) : ${fieldValue(fastTime)}`,
    `-- vitesse (m/s) : ${fieldValue(fastSpeed)}`,
    `-- nombre de pas : ${stepsValue(numberValue(fast.steps))}`,
    `- 5 levees de chaise (s) : ${fieldValue(chairTime)}`,
    "- Equilibre statique type SPPB :",
    `-- pieds joints (s) : ${fieldValue(numberValue(side.time), " s")}`,
    `-- semi-tandem (s) : ${fieldValue(numberValue(semi.time), " s")}`,
    `-- tandem (s) : ${fieldValue(numberValue(tandem.time), " s")}`,
    "- Scores indicatifs :",
    `-- marche usuelle 4 m : ${gaitScore === null ? "" : `${gaitScore}/4`}`,
    `-- 5 levees de chaise : ${chairScore === null ? "" : `${chairScore}/4`}`,
    `-- equilibre : ${balance === null ? "" : `${balance}/4`}`,
    `-- total SPPB indicatif : ${total === null ? "" : `${total}/12`}`,
    `- Notes : ${state.simpleNotes.trim() || ""}`,
  ];

  return lines.join("\n");
}

async function shareResults() {
  const text = plainTextSummary();
  if (navigator.share) {
    await navigator.share({
      title: "Evaluation TAP test",
      text,
    });
    return;
  }
  await copyText(text);
}

async function shareSimpleResults() {
  const text = simplePlainTextSummary();
  if (navigator.share) {
    await navigator.share({
      title: "Mesures marche et SPPB",
      text,
    });
    return;
  }
  await copyText(text);
}

function mailResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const timepoint = findTimepoint(state.activeTimepoint);
  const subject = encodeURIComponent(`Evaluation motrice TAP test HCPN - ${timepoint.label} - Identifiant : ${participant}`);
  const body = encodeURIComponent(plainTextSummary());
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function mailSimpleResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const subject = encodeURIComponent(`Mesures marche et SPPB - Identifiant : ${participant}`);
  const body = encodeURIComponent(simplePlainTextSummary());
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function copyResults() {
  await copyText(plainTextSummary());
}

async function copySimpleResults() {
  await copyText(simplePlainTextSummary());
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

function bindEvents() {
  participantInput.value = state.participantId;
  notesInput.value = state.notes;
  simpleNotesInput.value = state.simpleNotes;
  simpleDistanceInput.value = state.simpleDistance;

  participantInput.addEventListener("input", () => {
    state.participantId = participantInput.value;
    saveState();
    renderSummary();
  });

  notesInput.addEventListener("input", () => {
    state.notes = notesInput.value;
    notesInput.parentNode.classList.remove("field-alert");
    saveState();
    renderSummary();
  });

  simpleNotesInput.addEventListener("input", () => {
    state.simpleNotes = simpleNotesInput.value;
    simpleNotesInput.parentNode.classList.remove("field-alert");
    saveState();
    renderSummary();
  });

  simpleDistanceInput.addEventListener("input", () => {
    state.simpleDistance = simpleDistanceInput.value;
    saveState();
    renderSimpleMeasureList();
    renderSummary();
  });

  if (resetAllButton) {
    resetAllButton.addEventListener("click", () => {
      const confirmed = window.confirm("Tout effacer pour demarrer un nouveau patient ?");
      if (confirmed) resetState();
    });
  }

  if (stopOverlay) {
    stopOverlay.addEventListener("click", () => {
      if (!overlayTimerScope || !overlayTimerMeasure) return;
      if (overlayMode === "armed") {
        startTimer(overlayTimerScope, overlayTimerMeasure);
      } else if (overlayMode === "running") {
        stopTimer(overlayTimerScope, overlayTimerMeasure);
      }
    });
  }

  eachNode(".mode-button", (button) => {
    button.addEventListener("click", () => {
      state.activeMode = button.dataset.mode;
      saveState();
      hideStopOverlay();
      renderModeTabs();
      renderSummary();
    });
  });

  eachNode(".timepoint-button", (button) => {
    button.addEventListener("click", () => {
      state.activeTimepoint = button.dataset.timepoint;
      saveState();
      hideStopOverlay();
      renderTimepointButtons();
      renderMeasureList();
    });
  });

  measureList.addEventListener("input", handleValueInput);
  simpleMeasureList.addEventListener("input", handleValueInput);

  measureList.addEventListener("change", (event) => {
    const input = closestFieldInput(event.target);
    if (!input) return;
    if (input.dataset.field === "steps" && input.dataset.measure === "walkFast") {
      focusNotesField("tap");
    }
  });

  simpleMeasureList.addEventListener("change", (event) => {
    const input = closestFieldInput(event.target);
    if (!input) return;
    if (input.dataset.field === "steps" && input.dataset.measure === "launchedFast") {
      focusNotesField("simple");
    }
  });

  document.addEventListener("click", (event) => {
    const button = closestActionButton(event.target);
    if (!button) return;
    if (!button.dataset.measure) return;

    const scope = button.dataset.scope || "tap";
    if (button.dataset.action === "toggle") toggleTimer(scope, button.dataset.measure);
    if (button.dataset.action === "use") useTimer(scope, button.dataset.measure);
    if (button.dataset.action === "reset") resetTimer(scope, button.dataset.measure);
  });

  document.getElementById("share-results").addEventListener("click", shareResults);
  document.getElementById("mail-results").addEventListener("click", mailResults);
  document.getElementById("copy-results").addEventListener("click", copyResults);

  document.getElementById("share-simple-results").addEventListener("click", shareSimpleResults);
  document.getElementById("mail-simple-results").addEventListener("click", mailSimpleResults);
  document.getElementById("copy-simple-results").addEventListener("click", copySimpleResults);
}

bindEvents();
renderModeTabs();
renderTimepointButtons();
renderMeasureList();
renderSimpleMeasureList();
renderSummary();
