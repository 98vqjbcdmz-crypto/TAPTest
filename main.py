import network
import socket
import time
import ure


# --------- Wi-Fi config ---------
# Option A (default): create an access point from the Pico W.
USE_ACCESS_POINT = True
AP_SSID = "PicoChrono"
AP_PASSWORD = "chronopico"

# Option B: connect Pico W to an existing Wi-Fi network.
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"


class Chrono:
    def __init__(self):
        self.running = False
        self.started_at_ms = 0
        self.elapsed_ms = 0

    def _now_ms(self):
        return time.ticks_ms()

    def start(self):
        if not self.running:
            self.running = True
            self.started_at_ms = self._now_ms()

    def stop(self):
        if self.running:
            delta = time.ticks_diff(self._now_ms(), self.started_at_ms)
            self.elapsed_ms += max(0, delta)
            self.running = False

    def reset(self):
        self.running = False
        self.started_at_ms = 0
        self.elapsed_ms = 0

    def get_elapsed_ms(self):
        if self.running:
            delta = time.ticks_diff(self._now_ms(), self.started_at_ms)
            return self.elapsed_ms + max(0, delta)
        return self.elapsed_ms

    def to_json(self):
        elapsed = self.get_elapsed_ms()
        return (
            '{"running":%s,"elapsed_ms":%d}'
            % ("true" if self.running else "false", elapsed)
        )


HTML = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pico Chrono</title>
  <style>
    :root {
      --bg: #0c1020;
      --card: #151b35;
      --text: #f2f5ff;
      --muted: #9fb0e0;
      --good: #22c55e;
      --stop: #f59e0b;
      --reset: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      color: var(--text);
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 20% 20%, #1a2559 0%, transparent 40%),
        radial-gradient(circle at 80% 80%, #083344 0%, transparent 35%),
        var(--bg);
    }
    .card {
      width: min(92vw, 560px);
      background: linear-gradient(180deg, #1b2244 0%, var(--card) 100%);
      border: 1px solid #2a376f;
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }
    h1 { margin: 0 0 8px; font-size: 1.4rem; }
    p { margin: 0 0 18px; color: var(--muted); }
    .clock {
      font-size: clamp(2.4rem, 8vw, 4.4rem);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-align: center;
      margin: 12px 0 22px;
      font-variant-numeric: tabular-nums;
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    button {
      border: 0;
      border-radius: 12px;
      color: #fff;
      font-weight: 700;
      padding: 12px 14px;
      cursor: pointer;
    }
    #start { background: var(--good); }
    #stop { background: var(--stop); }
    #reset { background: var(--reset); }
    .status {
      margin-top: 14px;
      color: var(--muted);
      font-size: 0.92rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Chrono Pico W</h1>
    <p>Controle en Wi-Fi depuis ton telephone ou PC.</p>
    <div class="clock" id="clock">00:00.00</div>
    <div class="buttons">
      <button id="start">Start</button>
      <button id="stop">Stop</button>
      <button id="reset">Reset</button>
    </div>
    <div class="status" id="status">Connexion...</div>
  </main>

  <script>
    const clock = document.getElementById("clock");
    const statusLabel = document.getElementById("status");

    function fmt(ms) {
      const c = Math.floor(ms / 10);
      const sec = Math.floor(c / 100);
      const cs = c % 100;
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
    }

    async function call(action) {
      await fetch(`/api/${action}`, { method: "POST" });
      await refresh();
    }

    async function refresh() {
      try {
        const r = await fetch("/api/status");
        const j = await r.json();
        clock.textContent = fmt(j.elapsed_ms);
        statusLabel.textContent = j.running ? "En cours" : "En pause";
      } catch (e) {
        statusLabel.textContent = "Pico W non joignable";
      }
    }

    document.getElementById("start").onclick = () => call("start");
    document.getElementById("stop").onclick = () => call("stop");
    document.getElementById("reset").onclick = () => call("reset");

    setInterval(refresh, 200);
    refresh();
  </script>
</body>
</html>
"""


def connect_wifi():
    if USE_ACCESS_POINT:
        ap = network.WLAN(network.AP_IF)
        ap.active(True)
        ap.config(essid=AP_SSID, password=AP_PASSWORD)
        while not ap.active():
            time.sleep(0.2)
        ip = ap.ifconfig()[0]
        print("AP ready")
        print("SSID:", AP_SSID)
        print("IP:", ip)
        return ip

    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    print("Connecting to Wi-Fi...")
    while not wlan.isconnected():
        time.sleep(0.5)
    ip = wlan.ifconfig()[0]
    print("Wi-Fi connected, IP:", ip)
    return ip


def response(conn, status, content_type, body):
    headers = (
        "HTTP/1.1 %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %d\r\n"
        "Connection: close\r\n\r\n"
    ) % (status, content_type, len(body))
    conn.send(headers)
    conn.send(body)


def handle_request(conn, chrono):
    req = conn.recv(2048)
    if not req:
        return

    req_line_end = req.find(b"\r\n")
    if req_line_end == -1:
        return
    req_line = req[:req_line_end].decode()

    m = ure.match("([A-Z]+) ([^ ]+) HTTP/1.[01]", req_line)
    if not m:
        return

    method = m.group(1)
    path = m.group(2)

    if path == "/":
        response(conn, "200 OK", "text/html; charset=utf-8", HTML)
        return

    if path == "/api/status" and method == "GET":
        response(conn, "200 OK", "application/json", chrono.to_json())
        return

    if path == "/api/start" and method == "POST":
        chrono.start()
        response(conn, "200 OK", "application/json", chrono.to_json())
        return

    if path == "/api/stop" and method == "POST":
        chrono.stop()
        response(conn, "200 OK", "application/json", chrono.to_json())
        return

    if path == "/api/reset" and method == "POST":
        chrono.reset()
        response(conn, "200 OK", "application/json", chrono.to_json())
        return

    response(conn, "404 Not Found", "text/plain", "Not found")


def serve():
    ip = connect_wifi()
    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(1)

    chrono = Chrono()
    print("Server started at http://%s/" % ip)

    while True:
        conn, _ = s.accept()
        try:
            handle_request(conn, chrono)
        except Exception as e:
            print("Request error:", e)
        finally:
            conn.close()


serve()
