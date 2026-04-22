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
  conditions: {},
  notes: "",
  values: {},
};

const state = loadState();
const timerState = new Map();

const participantInput = document.getElementById("participant-id");
const notesInput = document.getElementById("qualitative-notes");
const measureList = document.getElementById("measure-list");
const currentTimepointLabel = document.getElementById("current-timepoint-label");
const summaryCard = document.getElementById("summary-card");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tap-evaluation") || "null");
    return saved ? { ...defaultState, ...saved } : freshDefaultState();
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

function ensureMeasure(timepointId, measureId) {
  state.values[timepointId] ||= {};
  state.values[timepointId][measureId] ||= {};
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
  document.querySelectorAll(".timepoint-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.timepoint === state.activeTimepoint);
  });
  currentTimepointLabel.textContent = timepoints.find((item) => item.id === state.activeTimepoint).label;
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

  const values = ensureMeasure(state.activeTimepoint, measureId);
  values.time = (timer.elapsed / 1000).toFixed(2);
  saveState();
  renderMeasureList();
  renderSummary();
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
  const input = event.target.closest("[data-field]");
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
  return numberValue(state.values.before?.[measureId]?.[field]);
}

function pointValue(timepointId, measureId, field) {
  return numberValue(state.values[timepointId]?.[measureId]?.[field]);
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
  const values = state.values[timepointId]?.[measure.id] || {};
  const time = numberValue(values.time);
  const steps = numberValue(values.steps);
  const speed = measure.distance && time ? measure.distance / time : null;
  const timeStatus = statusFor(timepointId, measure.id, "time");
  const stepsStatus = measure.fields.includes("steps") ? statusFor(timepointId, measure.id, "steps") : null;

  return `
    <tr>
      <td>${timepoints.find((item) => item.id === timepointId).label}</td>
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

function checkedConditionLabels() {
  const labels = {
    shoes: "meme chaussage",
    aid: "meme aide technique",
    path: "meme parcours",
    instruction: "meme consigne",
    supervision: "meme surveillance",
    practice: "familiarisation si possible",
  };

  return Object.entries(state.conditions)
    .filter(([, checked]) => checked)
    .map(([key]) => labels[key])
    .join(", ");
}

function renderSummary() {
  const rows = timepoints.flatMap((timepoint) => measures.map((measure) => rowFor(timepoint.id, measure))).join("");
  const participant = state.participantId.trim() || "Non renseigne";
  const checked = checkedConditionLabels() || "Non renseigne";
  const notes = state.notes.trim() || "Aucune note qualitative renseignee.";

  summaryCard.innerHTML = `
    <div class="summary-head">
      <h3>Evaluation TAP test</h3>
      <p>Code: ${participant}</p>
    </div>
    <div class="summary-table-wrap">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Temps</th>
            <th>Mesure</th>
            <th>Temps</th>
            <th>Vitesse</th>
            <th>Pas</th>
            <th>Lecture</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="summary-notes">
      <strong>Conditions:</strong> ${checked}<br>
      <strong>Notes:</strong> ${notes}<br>
      <strong>Seuils:</strong> TUG amelioration >= 5 s ; marche 6 m temps amelioration > 10 % ; nombre de pas diminution > 10 %.
    </div>
  `;
}

function plainTextSummary() {
  const lines = [
    "Evaluation TAP test",
    `Code anonymise: ${state.participantId.trim() || "Non renseigne"}`,
    "",
    "Temps;Mesure;Temps (s);Vitesse (m/s);Pas;Lecture",
  ];

  timepoints.forEach((timepoint) => {
    measures.forEach((measure) => {
      const values = state.values[timepoint.id]?.[measure.id] || {};
      const time = numberValue(values.time);
      const steps = numberValue(values.steps);
      const speed = measure.distance && time ? measure.distance / time : null;
      const status = statusFor(timepoint.id, measure.id, "time");
      const stepsStatus = measure.fields.includes("steps") ? statusFor(timepoint.id, measure.id, "steps") : null;
      const lecture = [status.label, status.detail, stepsStatus?.label, stepsStatus?.detail].filter(Boolean).join(" - ");

      lines.push([
        timepoint.label,
        measure.label,
        time ? formatNumber(time) : "",
        speed ? formatNumber(speed) : "",
        steps ? formatNumber(steps, 0) : "",
        lecture,
      ].join(";"));
    });
  });

  lines.push("");
  lines.push(`Conditions: ${checkedConditionLabels() || "Non renseigne"}`);
  lines.push(`Notes: ${state.notes.trim() || "Aucune note qualitative renseignee."}`);
  lines.push("Seuils: TUG amelioration >= 5 s ; marche 6 m temps amelioration > 10 % ; nombre de pas diminution > 10 %.");

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
  const subject = encodeURIComponent(`Evaluation TAP test - ${state.participantId || "code anonymise"}`);
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

function switchTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `${tabId}-panel`);
  });
  renderSummary();
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

  document.querySelectorAll("[data-condition]").forEach((checkbox) => {
    checkbox.checked = Boolean(state.conditions[checkbox.dataset.condition]);
    checkbox.addEventListener("change", () => {
      state.conditions[checkbox.dataset.condition] = checkbox.checked;
      saveState();
      renderSummary();
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.querySelectorAll(".timepoint-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTimepoint = button.dataset.timepoint;
      saveState();
      renderTimepointButtons();
      renderMeasureList();
    });
  });

  measureList.addEventListener("input", handleValueInput);
  measureList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
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
