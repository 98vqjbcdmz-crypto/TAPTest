const clockEl = document.getElementById("clock");
const lapsEl = document.getElementById("laps");

let running = false;
let startTs = 0;
let elapsed = 0;
let timer = null;

function formatMs(ms) {
  const cs = Math.floor(ms / 10);
  const totalSec = Math.floor(cs / 100);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cent = cs % 100;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cent).padStart(2, "0")}`;
}

function currentElapsed() {
  if (!running) return elapsed;
  return elapsed + (Date.now() - startTs);
}

function render() {
  clockEl.textContent = formatMs(currentElapsed());
}

function start() {
  if (running) return;
  running = true;
  startTs = Date.now();
  timer = setInterval(render, 40);
}

function stop() {
  if (!running) return;
  elapsed = currentElapsed();
  running = false;
  clearInterval(timer);
  timer = null;
  render();
}

function reset() {
  running = false;
  elapsed = 0;
  clearInterval(timer);
  timer = null;
  lapsEl.innerHTML = "";
  render();
}

function lap() {
  const li = document.createElement("li");
  li.textContent = formatMs(currentElapsed());
  lapsEl.prepend(li);
}

document.getElementById("start").addEventListener("click", start);
document.getElementById("stop").addEventListener("click", stop);
document.getElementById("reset").addEventListener("click", reset);
document.getElementById("lap").addEventListener("click", lap);

render();
