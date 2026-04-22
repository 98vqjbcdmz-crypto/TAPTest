const timepoints = [
  { id: "before", label: "Avant TAP" },
  { id: "h2", label: "2-4 h" },
  { id: "h24", label: "24 h" },
  { id: "h48", label: "48 h si besoin" },
];

const measures = [
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

const defaultState = {
  participantId: "",
  activeTimepoint: "before",
  notes: "",
  values: {},
};

const state = loadState();
const timerState = new Map();

const participantInput = document.getElementById("participant-id");
const notesInput = document.getElementById("qualitative-notes");
const measureList = document.getElementById("measure-list");
const currentTimepointLabel = document.getElementById("current-timepoint-label");
const resetAllButton = document.getElementById("reset-all");

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
  for (let index = 0; index < measures.length; index += 1) {
    if (measures[index].id === measureId) return measures[index];
  }
  return null;
}

function closestActionButton(element) {
  let current = element;
  while (current && current !== measureList) {
    if (current.dataset && current.dataset.action) return current;
    current = current.parentNode;
  }
  return null;
}

function closestFieldInput(element) {
  let current = element;
  while (current && current !== measureList) {
    if (current.dataset && current.dataset.field) return current;
    current = current.parentNode;
  }
  return null;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tap-evaluation") || "null");
    return saved ? Object.assign(freshDefaultState(), saved) : freshDefaultState();
  } catch {
    return freshDefaultState();
  }
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
  saveState();
  participantInput.value = "";
  notesInput.value = "";
  renderTimepointButtons();
  renderMeasureList();
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

function numberValue(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

function timerKey(timepointId, measureId) {
  return `${timepointId}:${measureId}`;
}

function getTimer(timepointId, measureId) {
  const key = timerKey(timepointId, measureId);
  if (!timerState.has(key)) {
    timerState.set(key, {
      elapsed: 0,
      startedAt: 0,
      running: false,
      raf: null,
    });
  }
  return timerState.get(key);
}

function currentTimerMs(timer) {
  return timer.running ? timer.elapsed + performance.now() - timer.startedAt : timer.elapsed;
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

  measures.forEach((measure) => {
    const card = document.createElement("article");
    card.className = "measure-card";
    card.dataset.measure = measure.id;

    const values = ensureMeasure(state.activeTimepoint, measure.id);
    const timer = getTimer(state.activeTimepoint, measure.id);
    const time = numberValue(values.time);
    const speed = measure.distance && time ? measure.distance / time : null;
    const toggleLabel = timer.running ? "Arreter" : "Demarrer";

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
            <input data-field="time" data-measure="${measure.id}" type="number" min="0" step="0.01" inputmode="decimal" value="${values.time || ""}" placeholder="0,00" />
          </label>
          ${measure.fields.includes("steps") ? `
            <label class="field">
              <span>Nombre de pas</span>
              <input data-field="steps" data-measure="${measure.id}" type="number" min="0" step="1" inputmode="numeric" value="${values.steps || ""}" placeholder="0" />
            </label>
            <div class="computed wide">
              <span>Vitesse calculee</span>
              <strong>${speed ? `${formatNumber(speed)} m/s` : "Non renseignee"}</strong>
            </div>
          ` : ""}
        </div>
        <div class="timer-box" data-timer="${measure.id}">
          <div class="timer-display">${formatTimer(currentTimerMs(timer))}</div>
          <div class="timer-actions">
            <button class="start-timer" type="button" data-action="toggle" data-measure="${measure.id}">${toggleLabel}</button>
            <button class="use-timer" type="button" data-action="use" data-measure="${measure.id}">Ajouter</button>
            <button class="reset-timer" type="button" data-action="reset" data-measure="${measure.id}">RAZ</button>
          </div>
        </div>
      </div>
    `;

    measureList.append(card);
    updateTimerDisplay(state.activeTimepoint, measure.id);
  });
}

function updateTimerDisplay(timepointId, measureId) {
  if (timepointId !== state.activeTimepoint) return;
  const display = document.querySelector(`[data-timer="${measureId}"] .timer-display`);
  if (!display) return;

  const timer = getTimer(timepointId, measureId);
  display.textContent = formatTimer(currentTimerMs(timer));

  if (timer.running) {
    timer.raf = requestAnimationFrame(() => updateTimerDisplay(timepointId, measureId));
  }
}

function startTimer(measureId) {
  const timer = getTimer(state.activeTimepoint, measureId);
  if (timer.running) return;
  timer.running = true;
  timer.startedAt = performance.now();
  updateTimerDisplay(state.activeTimepoint, measureId);
}

function toggleTimer(measureId) {
  const timer = getTimer(state.activeTimepoint, measureId);
  if (timer.running) {
    timer.elapsed = currentTimerMs(timer);
    timer.running = false;
    cancelAnimationFrame(timer.raf);
    renderMeasureList();
    return;
  }
  startTimer(measureId);
  renderTimerButton(measureId);
}

function renderTimerButton(measureId) {
  const timer = getTimer(state.activeTimepoint, measureId);
  const button = document.querySelector(`[data-action="toggle"][data-measure="${measureId}"]`);
  if (button) button.textContent = timer.running ? "Arreter" : "Demarrer";
}

function useTimer(measureId) {
  const timer = getTimer(state.activeTimepoint, measureId);
  timer.elapsed = currentTimerMs(timer);
  timer.running = false;
  cancelAnimationFrame(timer.raf);

  const measure = findMeasure(measureId);
  const shouldFocusSteps = measure && measure.fields.includes("steps");
  const values = ensureMeasure(state.activeTimepoint, measureId);
  values.time = (timer.elapsed / 1000).toFixed(2);
  saveState();
  renderMeasureList();
  if (shouldFocusSteps) {
    focusStepsField(measureId);
  }
  renderSummary();
}

function focusStepsField(measureId) {
  const input = document.querySelector(`[data-field="steps"][data-measure="${measureId}"]`);
  if (!input) return;
  input.focus({ preventScroll: true });
  input.select();
  window.setTimeout(() => {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }, 60);
}

function resetTimer(measureId) {
  const timer = getTimer(state.activeTimepoint, measureId);
  timer.elapsed = 0;
  timer.startedAt = 0;
  timer.running = false;
  cancelAnimationFrame(timer.raf);
  updateTimerDisplay(state.activeTimepoint, measureId);
}

function handleValueInput(event) {
  const input = closestFieldInput(event.target);
  if (!input) return;

  const values = ensureMeasure(state.activeTimepoint, input.dataset.measure);
  values[input.dataset.field] = input.value;
  saveState();

  if (input.dataset.field === "time") {
    renderMeasureList();
  }
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

function rowFor(timepointId, measure) {
  const values = (state.values[timepointId] && state.values[timepointId][measure.id]) || {};
  const time = numberValue(values.time);
  const steps = numberValue(values.steps);
  const speed = measure.distance && time ? measure.distance / time : null;
  const timeStatus = statusFor(timepointId, measure.id, "time");
  const stepsStatus = measure.fields.includes("steps") ? statusFor(timepointId, measure.id, "steps") : null;

  return `
    <tr>
      <td>${findTimepoint(timepointId).label}</td>
      <td>${measure.label}</td>
      <td>${time ? `${formatNumber(time)} s` : "-"}</td>
      <td>${speed ? `${formatNumber(speed)} m/s` : "-"}</td>
      <td>${steps ? formatNumber(steps, 0) : "-"}</td>
      <td>
        <span class="status-chip ${timeStatus.className}">${timeStatus.label}</span>
        ${timeStatus.detail ? `<br>${timeStatus.detail}` : ""}
        ${stepsStatus && timepointId !== "before" ? `<br><span class="status-chip ${stepsStatus.className}">${stepsStatus.label}</span><br>${stepsStatus.detail}` : ""}
      </td>
    </tr>
  `;
}

function renderSummary() {
  return plainTextSummary();
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

function mailResults() {
  const participant = state.participantId.trim() || "non renseigne";
  const timepoint = findTimepoint(state.activeTimepoint);
  const subject = encodeURIComponent(`Evaluation motrice TAP test HCPN - ${timepoint.label} - Identifiant : ${participant}`);
  const body = encodeURIComponent(plainTextSummary());
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function copyResults() {
  await copyText(plainTextSummary());
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

  participantInput.addEventListener("input", () => {
    state.participantId = participantInput.value;
    saveState();
    renderSummary();
  });

  notesInput.addEventListener("input", () => {
    state.notes = notesInput.value;
    saveState();
    renderSummary();
  });

  if (resetAllButton) {
    resetAllButton.addEventListener("click", () => {
      const confirmed = window.confirm("Tout effacer pour demarrer un nouveau patient ?");
      if (confirmed) resetState();
    });
  }

  eachNode(".timepoint-button", (button) => {
    button.addEventListener("click", () => {
      state.activeTimepoint = button.dataset.timepoint;
      saveState();
      renderTimepointButtons();
      renderMeasureList();
    });
  });

  measureList.addEventListener("input", handleValueInput);
  measureList.addEventListener("click", (event) => {
    const button = closestActionButton(event.target);
    if (!button) return;

    if (button.dataset.action === "toggle") toggleTimer(button.dataset.measure);
    if (button.dataset.action === "use") useTimer(button.dataset.measure);
    if (button.dataset.action === "reset") resetTimer(button.dataset.measure);
  });

  document.getElementById("share-results").addEventListener("click", shareResults);
  document.getElementById("mail-results").addEventListener("click", mailResults);
  document.getElementById("copy-results").addEventListener("click", copyResults);
}

bindEvents();
renderTimepointButtons();
renderMeasureList();
renderSummary();
