import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ const G = 5e3,
  R = "JetBrains Mono, ui-monospace, monospace",
  v = {
    light: {
      background: "#FAFAFA",
      foreground: "#111111",
      accent: "#F35815",
      blueAccent: "#144EB6",
      greenAccent: "#13862E",
      fail: "#D92038",
      connector: "#818181",
      traffic: "#818181",
    },
    dark: {
      background: "#111111",
      foreground: "#FAFAFA",
      accent: "#F35815",
      blueAccent: "#0E73CC",
      greenAccent: "#27B648",
      fail: "#FF455D",
      connector: "#818181",
      traffic: "#818181",
    },
  },
  s = {
    bg: v.light.background,
    fg: v.light.foreground,
    accent: v.light.accent,
    blue: v.light.blueAccent,
    green: v.light.greenAccent,
    fail: v.light.fail,
    connector: v.light.connector,
    traffic: v.light.traffic,
  };
function K() {
  const t =
    window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches
      ? v.dark
      : v.light;
  ((s.bg = t.background),
    (s.fg = t.foreground),
    (s.accent = t.accent),
    (s.blue = t.blueAccent),
    (s.green = t.greenAccent),
    (s.fail = t.fail),
    (s.connector = t.connector),
    (s.traffic = t.traffic));
}
function Z() {
  if (document.querySelector("#brand-diagram-styles")) return;
  const o = document.createElement("style");
  ((o.id = "brand-diagram-styles"),
    (o.textContent = `
    .brand-diagram-canvas {
      --diagram-bg: ${v.light.background};
      --diagram-fg: ${v.light.foreground};
      --diagram-accent: ${v.light.accent};
      --diagram-blue: ${v.light.blueAccent};
      --diagram-green: ${v.light.greenAccent};
      --diagram-connector: ${v.light.connector};
      --diagram-traffic: ${v.light.traffic};
    }
    @media (prefers-color-scheme: dark) {
      .brand-diagram-canvas {
        --diagram-bg: ${v.dark.background};
        --diagram-fg: ${v.dark.foreground};
        --diagram-accent: ${v.dark.accent};
        --diagram-blue: ${v.dark.blueAccent};
        --diagram-green: ${v.dark.greenAccent};
        --diagram-connector: ${v.dark.connector};
        --diagram-traffic: ${v.dark.traffic};
      }
    }
  `),
    document.head.appendChild(o));
}
const O =
  window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function B(o) {
  const t = window.devicePixelRatio || 1,
    a = o.clientWidth || o.parentElement.clientWidth,
    e = parseInt(o.getAttribute("data-h"), 10);
  ((o.width = Math.max(1, Math.round(a * t))),
    (o.height = Math.round(e * t)),
    (o.style.height = e + "px"));
  const n = o.getContext("2d");
  return (n.setTransform(t, 0, 0, t, 0, 0), { ctx: n, w: a, h: e });
}
function tt(o, t = 200, a = 420, e = 0.62, n = 1) {
  return o <= t ? e : o >= a ? n : e + ((n - e) * (o - t)) / (a - t);
}
function et(o) {
  return o <= 180 ? 0.52 : o <= 240 ? 0.65 : o <= 320 ? 0.8 : 1;
}
function at(o) {
  let t = o >>> 0;
  return () => (t = (t * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function b(o, t, ...a) {
  const e = document.createElement(o);
  if (t)
    for (const n in t)
      n === "class" ? (e.className = t[n]) : e.setAttribute(n, t[n]);
  for (const n of a)
    e.append(n && n.nodeType ? n : document.createTextNode(n ?? ""));
  return e;
}
function H(o) {
  return b("input", { type: "range", class: "blog-styled-range", ...o });
}
function U(o, t, a) {
  (o.setAttribute("role", "button"),
    o.setAttribute("tabindex", "0"),
    o.setAttribute("aria-label", t),
    (o.style.cursor = "pointer"),
    o.addEventListener("click", a),
    o.addEventListener("keydown", (e) => {
      (e.key !== "Enter" && e.key !== " ") || (e.preventDefault(), a());
    }));
}
class V {
  constructor(t, a) {
    ((this.cv = t),
      (this.opts = Object.assign(
        {
          mode: "open",
          cap: 5,
          arrival: 5,
          tau0: 0.12,
          beta: 0.06,
          Tmax: 10,
          poolTimeout: 1 / 0,
          seed: 7,
        },
        a,
      )),
      (this.label = a.label || ""),
      this.reset(),
      this.resize());
  }
  resize() {
    const t = B(this.cv);
    ((this.ctx = t.ctx),
      (this.W = t.w),
      (this.H = t.h),
      (this.beltW = Math.min(280, this.W * 0.55)),
      (this.cx = this.W / 2),
      (this.junY = this.H - 120),
      (this.gateY = this.junY - 72),
      (this.zoneTop = this.opts.mode === "gated" ? this.gateY : 40),
      (this.botY = this.H - 52));
  }
  reset() {
    ((this.balls = []),
      (this.done = 0),
      (this.err = 0),
      (this.rej = 0),
      (this.doneTimes = []),
      (this.latencies = []),
      (this.spawnTimes = []),
      (this.spawnAcc = 0),
      (this.burstAcc = 0),
      (this.burstLeft = 0),
      (this.t = 0),
      (this.server = null),
      (this.serveT = 0),
      (this.serveDur = 0),
      (this.holder = null),
      (this.holdT = 0),
      (this.rand = at(this.opts.seed)),
      (this.flash = 0));
  }
  burst(t) {
    this.burstLeft += t;
  }
  dropLock(t) {
    return this.holder
      ? !1
      : ((this.holder = { x: this.cx, y: this.junY, r: 9 }),
        (this.holdT = t),
        this.server && ((this.server.state = "active"), (this.server = null)),
        !0);
  }
  activeCount() {
    let t = 0;
    for (const a of this.balls)
      (a.state === "active" || a.state === "serve") && t++;
    return t;
  }
  stackGeometry() {
    const t = this.beltW + 28,
      a = 14,
      e = Math.max(3, Math.floor((t - a * 2) / 20) + 1),
      n = (t - a * 2) / (e - 1);
    return { columns: e, pitchX: n, x0: this.cx - t / 2 + a };
  }
  stackCapacity(t) {
    const a = this.stackGeometry(),
      e = (t === "queue" ? this.gateY : this.junY) - 16,
      n = t === "queue" ? 14 : this.zoneTop + 14,
      u = Math.max(1, Math.floor((e - n) / 20) + 1);
    return a.columns * u;
  }
  trimStack(t) {
    const a = this.stackCapacity(t),
      e = this.balls.filter((n) => n.state === t);
    for (let n = a; n < e.length; n++) this.ejectFail(e[n], t === "queue");
  }
  assignColumn(t, a) {
    const e = this.stackGeometry(),
      n = Array(e.columns).fill(0);
    for (const r of this.balls)
      r === a ||
        r.state !== t ||
        (Number.isInteger(r.column) &&
          r.column >= 0 &&
          r.column < e.columns &&
          n[r.column]++);
    let u = 0;
    for (let r = 1; r < e.columns; r++)
      (n[r] < n[u] ||
        (n[r] === n[u] &&
          Math.abs(e.x0 + r * e.pitchX - a.x) <
            Math.abs(e.x0 + u * e.pitchX - a.x))) &&
        (u = r);
    a.column = u;
  }
  layoutStack(t) {
    const a = this.stackGeometry();
    for (const n of this.balls)
      n.state === t &&
        (!Number.isInteger(n.column) ||
          n.column < 0 ||
          n.column >= a.columns) &&
        this.assignColumn(t, n);
    const e = Array(a.columns).fill(0);
    for (const n of this.balls) {
      if (n.state !== t) continue;
      const u = e[n.column]++;
      ((n.tx = a.x0 + n.column * a.pitchX),
        (n.ty = (t === "queue" ? this.gateY : this.junY) - 16 - u * 20));
    }
  }
  ejectFail(t, a) {
    (a
      ? ((t.state = "reject"), this.rej++)
      : ((t.state = "fail"),
        this.err++,
        this.server === t && (this.server = null)),
      (t.column = null));
    const e = this.rand() < 0.5 ? -1 : 1;
    ((t.vx = e * (240 + this.rand() * 140)), (t.vy = -90 - this.rand() * 70));
  }
  spawn() {
    if (this.balls.length > 420) return;
    this.spawnTimes.push(this.t);
    const t = (this.rand() - 0.5) * this.beltW * 0.7;
    this.balls.push({
      x: this.cx + t,
      y: -10,
      tx: this.cx + t,
      ty: 60,
      state: "drop",
      born: this.t,
      vx: 0,
      vy: 0,
      fade: 1,
      column: null,
    });
  }
  step(t) {
    const a = this.opts;
    for (this.t += t, this.spawnAcc += a.arrival * t; this.spawnAcc >= 1; )
      ((this.spawnAcc -= 1), this.spawn());
    if (this.burstLeft > 0)
      for (this.burstAcc += 33 * t; this.burstAcc >= 1 && this.burstLeft > 0; )
        ((this.burstAcc -= 1), this.burstLeft--, this.spawn());
    else this.burstAcc = 0;
    this.holder && ((this.holdT -= t), this.holdT <= 0 && (this.holder = null));
    for (const e of this.balls)
      (e.state === "drop" &&
        e.y > 40 &&
        (a.mode === "gated"
          ? ((e.state = "queue"),
            (e.qat = this.t),
            this.assignColumn("queue", e))
          : ((e.state = "active"), this.assignColumn("active", e))),
        e.state === "queue" &&
          this.t - e.qat <= a.poolTimeout &&
          this.activeCount() < a.cap &&
          ((e.state = "active"),
          (e.column = null),
          this.assignColumn("active", e)));
    if (
      (this.trimStack("queue"),
      this.trimStack("active"),
      this.layoutStack("queue"),
      this.layoutStack("active"),
      !this.server && !this.holder)
    ) {
      let e = null;
      for (const n of this.balls)
        n.state === "active" && (!e || n.born < e.born) && (e = n);
      e &&
        Math.abs(e.y - e.ty) < 60 &&
        ((this.server = e),
        (e.state = "serve"),
        (e.column = null),
        (this.serveDur =
          a.tau0 * (1 + a.beta * Math.max(0, this.activeCount() - 1))),
        (this.serveT = 0));
    }
    if (this.server) {
      const e = this.server,
        n = this.cx,
        u = this.junY - 10,
        r = Math.hypot(n - e.x, u - e.y);
      if (this.serveT === 0 && r > 4) ((e.tx = n), (e.ty = u));
      else {
        this.serveT += t;
        const f = Math.min(1, this.serveT / this.serveDur);
        ((e.x = n),
          (e.tx = n),
          (e.y = u + f * 20),
          (e.ty = e.y),
          f >= 1 &&
            ((e.state = "exit"),
            (e.column = null),
            (e.vy = 40),
            this.latencies.push(this.t - e.born),
            this.latencies.length > 24 && this.latencies.shift(),
            (this.server = null)));
      }
    }
    for (const e of this.balls) {
      if (e.state === "exit") {
        ((e.vy += 700 * t),
          (e.y += e.vy * t),
          e.y >= this.botY &&
            (this.done++,
            this.doneTimes.push(this.t),
            (this.flash = 1),
            (e.state = "gone")));
        continue;
      }
      if (e.state === "fail" || e.state === "reject") {
        ((e.x += e.vx * t),
          (e.y += e.vy * t),
          (e.vy += 380 * t),
          (e.fade -= 2.2 * t),
          (e.fade <= 0 || e.x < -40 || e.x > this.W + 40) &&
            (e.state = "gone"));
        continue;
      }
      const n = e.tx - e.x,
        u = e.ty - e.y,
        r = Math.hypot(n, u);
      if (r > 0.1) {
        const f = e.state === "drop" ? 280 : r > 40 ? 520 : 220,
          l = Math.min(r, f * t);
        ((e.x += (n / r) * l), (e.y += (u / r) * l));
      }
      e.state === "queue" && this.t - e.qat > a.poolTimeout
        ? this.ejectFail(e, !0)
        : e.state !== "serve" &&
          this.t - e.born > a.Tmax &&
          this.ejectFail(e, !1);
    }
    for (
      this.balls = this.balls.filter((e) => e.state !== "gone");
      this.doneTimes.length && this.doneTimes[0] < this.t - 3;
    )
      this.doneTimes.shift();
    for (; this.spawnTimes.length && this.spawnTimes[0] < this.t - 3; )
      this.spawnTimes.shift();
    this.flash = Math.max(0, this.flash - 2.2 * t);
  }
  throughput() {
    return this.doneTimes.length / 3;
  }
  offeredRate() {
    return this.spawnTimes.length / 3;
  }
  avgLatency() {
    return this.latencies.length
      ? this.latencies.reduce((t, a) => t + a, 0) / this.latencies.length
      : 0;
  }
  draw() {
    const t = this.ctx,
      a = this.opts,
      e = (a.textScale || 1) * tt(this.W);
    t.clearRect(0, 0, this.W, this.H);
    const n = this.cx - this.beltW / 2,
      u = this.cx + this.beltW / 2,
      r = this.zoneTop,
      f = n - 14,
      l = u + 14,
      m = this.junY + 18,
      x = 22;
    if (
      ((t.fillStyle = s.blue),
      (t.globalAlpha = 0.1),
      t.fillRect(f, r, l - f, m - r),
      (t.globalAlpha = 1),
      (t.strokeStyle = s.blue),
      (t.lineWidth = 2),
      t.beginPath(),
      t.moveTo(f, r),
      t.lineTo(f, m),
      t.moveTo(l, r),
      t.lineTo(l, m),
      t.moveTo(f, m),
      t.lineTo(this.cx - x, m),
      t.moveTo(this.cx + x, m),
      t.lineTo(l, m),
      t.stroke(),
      this.label &&
        ((t.fillStyle = s.fg),
        (t.font = `bold ${14 * e}px ${R}`),
        (t.textAlign = "center"),
        t.fillText(this.label, this.cx, 22)),
      a.mode === "gated")
    ) {
      ((t.strokeStyle = s.connector),
        (t.lineWidth = 2),
        t.setLineDash([8, 8]),
        t.beginPath(),
        t.moveTo(f, this.gateY),
        t.lineTo(this.cx - 16, this.gateY),
        t.moveTo(this.cx + 16, this.gateY),
        t.lineTo(l, this.gateY),
        t.stroke(),
        t.setLineDash([]),
        (t.fillStyle = s.fg),
        (t.font = `500 ${13 * e}px ${R}`));
      const g = "GATE",
        k = t.measureText(g).width,
        L = l + 12;
      L + k > this.W - 4
        ? ((t.textAlign = "right"), t.fillText(g, l - 8, this.gateY + 4))
        : ((t.textAlign = "left"), t.fillText(g, L, this.gateY + 4));
    }
    const M = this.err + this.rej,
      S = this.botY + 18,
      d = S + 17 * e;
    ((t.font = `bold ${16 * e}px ${R}`),
      (t.textAlign = "center"),
      (t.fillStyle = s.green),
      t.fillText(String(this.done), this.cx - 40, S),
      (t.fillStyle = s.fail),
      t.fillText(String(M), this.cx + 40, S),
      (t.font = `500 ${11 * e}px ${R}`),
      (t.fillStyle = s.green),
      t.fillText("SUCCESS", this.cx - 40, d),
      (t.fillStyle = s.fail),
      t.fillText("FAILED", this.cx + 40, d));
    const w = [];
    for (const g of this.balls) {
      if (g.state === "fail" || g.state === "reject") {
        w.push(g);
        continue;
      }
      let k = s.traffic;
      (g.state === "queue" && (k = s.connector),
        g.state === "exit" && (k = s.green),
        (t.globalAlpha = g.fade),
        (t.fillStyle = k),
        t.beginPath(),
        t.arc(g.x, g.y, 7, 0, 6.2832),
        t.fill(),
        (t.strokeStyle = s.bg),
        (t.lineWidth = 2),
        t.stroke(),
        (t.globalAlpha = 1));
    }
    for (const g of w)
      ((t.globalAlpha = Math.max(0, g.fade)),
        g.state === "reject"
          ? ((t.strokeStyle = s.fail),
            (t.lineWidth = 2.5),
            t.beginPath(),
            t.arc(g.x, g.y, 7, 0, 6.2832),
            t.stroke())
          : ((t.fillStyle = s.fail),
            t.beginPath(),
            t.arc(g.x, g.y, 7, 0, 6.2832),
            t.fill(),
            (t.strokeStyle = s.bg),
            (t.lineWidth = 2),
            t.stroke()),
        (t.globalAlpha = 1));
    this.holder &&
      ((t.fillStyle = s.accent),
      t.beginPath(),
      t.arc(this.cx, this.junY, 9, 0, 6.2832),
      t.fill(),
      (t.strokeStyle = s.bg),
      (t.lineWidth = 2),
      t.stroke());
  }
}
const y = { x0: 12, xr: 12, y0: 28, y1: 132, tpMax: 28, rtMax: 10, win: 30 };
class _ {
  constructor(t, a = {}) {
    ((this.cv = t),
      (this.labelScale = a.labelScale || 1),
      (this.hist = []),
      (this.f = B(t)));
  }
  resize() {
    this.f = B(this.cv);
  }
  reset() {
    this.hist.length = 0;
  }
  push(t) {
    (this.hist.push(t), this.hist.length > 280 && this.hist.shift());
  }
  draw(t) {
    const a = this.f.ctx,
      e = this.hist;
    a.clearRect(0, 0, this.f.w, this.f.h);
    const n = y.x0,
      u = this.f.w - y.xr,
      r = e.length ? e[e.length - 1].t : 0,
      f = r - y.win,
      l = (d) => n + ((d - f) / y.win) * (u - n),
      m = (d) => y.y1 - (Math.min(d, y.tpMax) / y.tpMax) * (y.y1 - y.y0),
      x = (d) => y.y1 - (Math.min(d, y.rtMax) / y.rtMax) * (y.y1 - y.y0);
    ((a.fillStyle = s.connector),
      (a.globalAlpha = 0.1),
      a.fillRect(n, y.y0, u - n, y.y1 - y.y0),
      (a.globalAlpha = 1),
      (a.strokeStyle = s.connector),
      (a.lineWidth = 1),
      a.setLineDash([4, 6]),
      (a.globalAlpha = 0.22));
    for (let d = 1; d <= 3; d++) {
      const w = y.y0 + ((y.y1 - y.y0) * d) / 4;
      (a.beginPath(), a.moveTo(n, w), a.lineTo(u, w), a.stroke());
    }
    if ((a.setLineDash([]), (a.globalAlpha = 1), t && e.length))
      for (const d of t) {
        if (d.t < f || d.t > r) continue;
        const w = l(d.t);
        ((a.strokeStyle = s.accent),
          (a.lineWidth = 1.5),
          a.setLineDash([2, 4]),
          (a.globalAlpha = 0.8),
          a.beginPath(),
          a.moveTo(w, y.y0 + 6),
          a.lineTo(w, y.y1),
          a.stroke(),
          a.setLineDash([]),
          (a.globalAlpha = 1));
      }
    if (e.length > 1) {
      const d = (w, g, k) => {
        ((a.strokeStyle = k), (a.lineWidth = 2), a.beginPath());
        let L = !1;
        for (const A of e) {
          if (A.t < f) continue;
          const C = l(A.t),
            E = g(A[w]);
          L ? a.lineTo(C, E) : (a.moveTo(C, E), (L = !0));
        }
        a.stroke();
      };
      (d("off", m, s.connector), d("tp", m, s.green), d("rt", x, s.accent));
    }
    const M = this.labelScale * et(this.f.w);
    ((a.font = `bold ${12 * M}px ${R}`), (a.textBaseline = "alphabetic"));
    const S = y.y0 - 7;
    ((a.textAlign = "left"),
      (a.fillStyle = s.connector),
      a.fillText("ARRIVALS", n + 6, S),
      (a.textAlign = "center"),
      (a.fillStyle = s.green),
      a.fillText("COMPLETED", (n + u) / 2, S),
      (a.textAlign = "right"),
      (a.fillStyle = s.accent),
      a.fillText("LATENCY", u - 6, S));
  }
}
const it = `
.dmwl {
  font-family: ${R};
  color: var(--diagram-fg, #111111);
  background: var(--diagram-bg, #FAFAFA);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}
.dmwl canvas { display: block; width: 100%; height: auto; }
.dmwl .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; }
@media (max-width: 520px) {
  .dmwl .duo { grid-template-columns: 1fr; }
}
.dmwl .controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 12px 20px;
  width: 100%;
}
.dmwl .controls-pair {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}
.dmwl .controls-pair .brand-diagram-control {
  width: 100%;
  max-width: none;
}
.dmwl .controls-pair .brand-diagram-control-label {
  text-transform: none;
  font-variant-numeric: tabular-nums;
}
.dmwl .action-btns {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
  width: 100%;
  padding: 0 3%;
  box-sizing: border-box;
}
.dmwl {
  --dmwl-btn-idle-bg: color-mix(in srgb, var(--diagram-connector) 12%, var(--diagram-bg));
  --dmwl-btn-idle-fg: var(--diagram-fg);
  --dmwl-btn-idle-border: color-mix(in srgb, var(--diagram-connector) 28%, var(--diagram-bg));
}
.dmwl .action-btns button {
  font: inherit;
  flex: 1 1 0;
  max-width: 220px;
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dmwl-btn-idle-fg);
  background: var(--dmwl-btn-idle-bg);
  border: 1px solid var(--dmwl-btn-idle-border);
  border-radius: 0;
  padding: 14px clamp(10px, 2.4vw, 24px);
  opacity: 1;
  cursor: pointer;
}
.dmwl .action-btns button:hover {
  border-color: var(--diagram-connector);
  color: var(--dmwl-btn-idle-fg);
}
.dmwl .action-btns button:active {
  background: var(--diagram-accent);
  color: #FAFAFA;
  border-color: var(--diagram-accent);
}
.dmwl .controls-wide .brand-diagram-control {
  width: 100%;
  max-width: none;
}
.dmwl .brand-diagram-control {
  width: min(94%, 420px);
  margin: 0;
  color: var(--diagram-fg);
  font-family: ${R};
}
.dmwl .brand-diagram-control::before {
  content: '';
  display: block;
  width: 100%;
  height: 1px;
  background: var(--diagram-connector);
  opacity: 0.75;
  margin-bottom: 8px;
}
.dmwl .brand-diagram-control.flat::before {
  display: none;
}
.dmwl .brand-diagram-control-label {
  color: var(--diagram-fg);
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: bold;
  letter-spacing: 0.02em;
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.dmwl .brand-diagram-control .valreadout {
  display: block;
  text-align: center;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--diagram-fg);
  margin-top: 4px;
}
.dmwl .blog-styled-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 36px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
.dmwl .blog-styled-range:focus { outline: none; }
.dmwl .blog-styled-range:focus-visible { outline: 2px solid var(--diagram-accent); outline-offset: 2px; }
.dmwl .blog-styled-range::-webkit-slider-runnable-track {
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    var(--diagram-connector) 0,
    var(--diagram-connector) 6px,
    transparent 6px,
    transparent 10px
  );
}
.dmwl .blog-styled-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: clamp(18px, 2.4vw, 22px);
  height: clamp(30px, 4.5vw, 36px);
  border: 0;
  border-radius: 0;
  background: var(--diagram-fg);
  margin-top: calc((2px - clamp(30px, 4.5vw, 36px)) / 2);
}
.dmwl .blog-styled-range::-moz-range-track {
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    var(--diagram-connector) 0,
    var(--diagram-connector) 6px,
    transparent 6px,
    transparent 10px
  );
}
.dmwl .blog-styled-range::-moz-range-thumb {
  width: clamp(18px, 2.4vw, 22px);
  height: clamp(30px, 4.5vw, 36px);
  border: 0;
  border-radius: 0;
  background: var(--diagram-fg);
}
.dmwl button {
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--diagram-fg);
  background: transparent;
  border: 0;
  border-bottom: 2px solid var(--diagram-connector);
  border-radius: 0;
  padding: 8px 4px;
  cursor: pointer;
}
.dmwl button:hover { border-bottom-color: var(--diagram-accent); color: var(--diagram-accent); }
.dmwl button[aria-pressed="true"] { border-bottom-color: var(--diagram-accent); color: var(--diagram-accent); }
.dmwl :focus-visible { outline: 2px solid var(--diagram-accent); outline-offset: 2px; }
.dmwl .chartwrap { position: relative; width: 100%; }
.dmwl .tip {
  position: absolute;
  pointer-events: none;
  display: none;
  background: var(--diagram-fg);
  color: var(--diagram-bg);
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  z-index: 3;
  font-family: ${R};
}
`;
function J(o, t) {
  if (!("IntersectionObserver" in window)) {
    t(!0);
    return;
  }
  new IntersectionObserver((a) => a.forEach((e) => t(e.isIntersecting)), {
    rootMargin: "200px",
    threshold: 0,
  }).observe(o);
}
function nt(o) {
  const t = b("canvas", { class: "brand-diagram-canvas", "data-h": "380" }),
    a = b("canvas", { class: "brand-diagram-canvas", "data-h": "148" }),
    e = H({ min: "1", max: "26", step: "1", value: "2" }),
    n = b("div", { class: "brand-diagram-control-label" }, "2 ARRIVALS / S"),
    u = b("div", { class: "brand-diagram-control flat" }, n, e);
  o.append(
    t,
    b("div", { class: "controls controls-wide" }, u),
    b("div", { class: "chartwrap" }, a),
  );
  const r = new V(t, { mode: "open", arrival: 2, seed: 11, textScale: 1.6 }),
    f = new _(a, { labelScale: 1.6 }),
    l = !O;
  let m = !1;
  function x(h) {
    ((r.opts.arrival = h),
      (e.value = String(h)),
      (n.textContent = h + (h === 1 ? " ARRIVAL / S" : " ARRIVALS / S")));
  }
  const M = [
      { t: 0, arrival: 2 },
      { t: 8, arrival: 6 },
      { t: 14, arrival: 12 },
      { t: 20, arrival: 20 },
      { t: 28, arrival: 8 },
    ],
    S = 36;
  let d = 0,
    w = 0,
    g = !O;
  function k() {
    if (!g || m) return;
    let h = M[0].arrival;
    for (const T of M) d >= T.t && (h = T.arrival);
    x(h);
  }
  e.addEventListener("input", () => {
    ((m = !0), (g = !1), x(+e.value));
  });
  function L() {
    (r.reset(), f.reset(), (d = 0), (w = 0), (m = !1), (g = !O), k());
  }
  U(t, "Reset simulation", L);
  let A = !1;
  J(o, (h) => {
    A = h;
  });
  let C = performance.now(),
    E = 0;
  function i(h) {
    const T = Math.min(0.05, (h - C) / 1e3);
    ((C = h),
      l &&
        A &&
        (r.step(T),
        g &&
          !m &&
          (w > 0
            ? h >= w && (r.reset(), f.reset(), (d = 0), (w = 0), k())
            : ((d += T), k(), d >= S && (w = h + G)))),
      A && r.draw(),
      (E += T),
      E > 0.25 &&
        ((E = 0),
        l &&
          A &&
          f.push({
            t: r.t,
            off: r.opts.arrival,
            tp: r.throughput(),
            rt: r.avgLatency(),
          })),
      A && f.draw(),
      requestAnimationFrame(i));
  }
  (window.addEventListener("resize", () => {
    (r.resize(), f.resize());
  }),
    k(),
    requestAnimationFrame(i));
}
function st(o) {
  const t = b("canvas", { class: "brand-diagram-canvas", "data-h": "380" }),
    a = b("div", { class: "tip" }),
    e = H({ min: "0.002", max: "0.15", step: "0.002", value: "0.03" }),
    n = H({ min: "1", max: "60", step: "1", value: "12" }),
    u = b(
      "div",
      { class: "brand-diagram-control-label" },
      "α Contention 0.030",
    ),
    r = b(
      "div",
      { class: "brand-diagram-control-label" },
      "β Coherency 0.00024",
    );
  o.append(
    b("div", { class: "chartwrap" }, t, a),
    b(
      "div",
      { class: "controls controls-pair" },
      b("div", { class: "brand-diagram-control flat" }, u, e),
      b("div", { class: "brand-diagram-control flat" }, r, n),
    ),
  );
  let f = B(t),
    l = null,
    m = !1;
  const x = 300,
    M = (i) => i * 2e-5,
    S = (i, h, T) => i / (1 + h * (i - 1) + T * i * (i - 1)),
    d = () => ({ x0: 44, y0: 28, x1: f.w - 16, y1: f.h - 36 }),
    w = [
      { a: 0.03, b: 12 },
      { a: 0.06, b: 20 },
      { a: 0.02, b: 8 },
      { a: 0.1, b: 35 },
    ];
  let g = 0,
    k = 0,
    L = !1;
  J(o, (i) => {
    ((L = i), i && !k && (k = performance.now() + G));
  });
  function A() {
    const i = f.ctx,
      h = +e.value,
      T = M(+n.value),
      c = d(),
      Y = Math.sqrt(Math.max(1e-9, (1 - h) / T)),
      $ = Math.min(Y, x);
    let D = 0;
    for (let p = 1; p <= x; p++) D = Math.max(D, S(p, h, T));
    D *= 1.18;
    const F = (p) => c.x0 + ((p - 1) / (x - 1)) * (c.x1 - c.x0),
      z = (p) => c.y1 - (p / D) * (c.y1 - c.y0);
    (i.clearRect(0, 0, f.w, f.h),
      $ < x &&
        ((i.globalAlpha = 0.12),
        (i.fillStyle = s.accent),
        i.fillRect(F($), c.y0, c.x1 - F($), c.y1 - c.y0),
        (i.globalAlpha = 1)),
      (i.strokeStyle = s.connector),
      (i.lineWidth = 1),
      (i.font = "500 12px " + R),
      (i.fillStyle = s.connector),
      (i.textAlign = "right"));
    for (let p = 0; p <= 4; p++) {
      const W = ((D / 1.18) * p) / 4,
        P = z(W);
      ((i.globalAlpha = 0.35),
        i.beginPath(),
        i.moveTo(c.x0, P),
        i.lineTo(c.x1, P),
        i.stroke(),
        (i.globalAlpha = 1),
        i.fillText(W.toFixed(0), c.x0 - 6, P + 3.5));
    }
    i.textAlign = "center";
    for (const p of [1, 75, 150, 225, 300])
      i.fillText(String(p), F(p), c.y1 + 16);
    ((i.strokeStyle = s.connector),
      (i.lineWidth = 1),
      (i.globalAlpha = 0.55),
      i.strokeRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0),
      (i.globalAlpha = 1),
      (i.strokeStyle = s.connector),
      (i.lineWidth = 2),
      i.setLineDash([8, 6]),
      i.beginPath(),
      i.moveTo(F(1), z(1)));
    const I = Math.min(x, D);
    (i.lineTo(F(I), z(I)),
      i.stroke(),
      i.setLineDash([]),
      (i.fillStyle = s.connector),
      (i.textAlign = "left"),
      (i.font = "500 13px " + R),
      i.fillText("γN", F(Math.min(I, x) * 0.82) + 6, z(I * 0.82) - 6),
      (i.strokeStyle = s.blue),
      (i.lineWidth = 2),
      i.beginPath());
    for (let p = 1; p <= x; p++) {
      const W = F(p),
        P = z(S(p, h, T));
      p === 1 ? i.moveTo(W, P) : i.lineTo(W, P);
    }
    if (
      (i.stroke(),
      (i.fillStyle = s.blue),
      i.fillText("X(N)", F(x) - 44, z(S(x, h, T)) - 10),
      Y <= x)
    ) {
      ((i.strokeStyle = s.accent),
        (i.lineWidth = 1.5),
        i.setLineDash([8, 6]),
        i.beginPath(),
        i.moveTo(F(Y), c.y0),
        i.lineTo(F(Y), c.y1),
        i.stroke(),
        i.setLineDash([]));
      const p = "NMAX " + Y.toFixed(0);
      i.font = "bold 13px " + R;
      const W = i.measureText(p).width,
        P = 8,
        Q = 5,
        N = 13 + Q * 2,
        j = W + P * 2;
      let q = F(Y) - j / 2;
      q = Math.max(c.x0 + 2, Math.min(q, c.x1 - j - 2));
      const X = c.y0 + 4;
      ((i.fillStyle = s.bg),
        i.fillRect(q, X, j, N),
        (i.strokeStyle = s.accent),
        (i.lineWidth = 1.5),
        i.strokeRect(q, X, j, N),
        (i.fillStyle = s.accent),
        (i.textAlign = "center"),
        (i.textBaseline = "middle"),
        i.fillText(p, q + j / 2, X + N / 2),
        (i.textBaseline = "alphabetic"),
        (i.strokeStyle = s.connector),
        (i.lineWidth = 1),
        (i.globalAlpha = 0.55),
        i.beginPath(),
        i.moveTo(c.x0, c.y0),
        i.lineTo(c.x1, c.y0),
        i.lineTo(c.x1, c.y1),
        i.stroke(),
        (i.globalAlpha = 1));
    }
    if (l) {
      const p = F(l),
        W = z(S(l, h, T));
      ((i.strokeStyle = s.connector),
        (i.lineWidth = 1),
        i.setLineDash([2, 3]),
        i.beginPath(),
        i.moveTo(p, c.y0),
        i.lineTo(p, c.y1),
        i.stroke(),
        i.setLineDash([]),
        (i.fillStyle = s.blue),
        i.beginPath(),
        i.arc(p, W, 4.5, 0, 6.2832),
        i.fill(),
        (i.strokeStyle = s.bg),
        (i.lineWidth = 2),
        i.stroke());
    }
    ((u.textContent = "α Contention " + (+e.value).toFixed(3)),
      (r.textContent = "β Coherency " + T.toFixed(5)));
  }
  function C() {
    ((m = !0), A());
  }
  (e.addEventListener("input", C),
    n.addEventListener("input", C),
    t.addEventListener("mousemove", (i) => {
      const h = t.getBoundingClientRect(),
        T = d(),
        c = i.clientX - h.left;
      if (c < T.x0 || c > T.x1) {
        ((l = null), (a.style.display = "none"), A());
        return;
      }
      l = Math.round(1 + ((c - T.x0) / (T.x1 - T.x0)) * (x - 1));
      const Y = +e.value,
        $ = M(+n.value),
        D = Math.sqrt(Math.max(1e-9, (1 - Y) / $));
      ((a.style.display = "block"),
        (a.style.left = Math.min(c + 14, h.width - 140) + "px"),
        (a.style.top = i.clientY - h.top - 34 + "px"),
        (a.textContent =
          "N=" + l + "  X=" + S(l, Y, $).toFixed(1) + (l > D ? " ↓" : "")),
        A());
    }),
    t.addEventListener("mouseleave", () => {
      ((l = null), (a.style.display = "none"), A());
    }),
    window.addEventListener("resize", () => {
      ((f = B(t)), A());
    }));
  function E(i) {
    if (L && !m && !O && k && i >= k) {
      g = (g + 1) % w.length;
      const h = w[g];
      ((e.value = String(h.a)), (n.value = String(h.b)), A(), (k = i + G));
    }
    requestAnimationFrame(E);
  }
  (A(),
    document.fonts && document.fonts.ready.then(A),
    window.addEventListener("dmwl-themechange", A),
    requestAnimationFrame(E));
}
function ot(o) {
  const t = b("canvas", { class: "brand-diagram-canvas", "data-h": "335" }),
    a = b("canvas", { class: "brand-diagram-canvas", "data-h": "335" }),
    e = b("canvas", { class: "brand-diagram-canvas", "data-h": "148" }),
    n = b("canvas", { class: "brand-diagram-canvas", "data-h": "148" }),
    u = b("button", { type: "button" }, "Burst"),
    r = b("button", { type: "button" }, "Lock"),
    f = b("button", { type: "button", "aria-pressed": "false" });
  o.append(
    b(
      "div",
      { class: "duo" },
      b(
        "div",
        {},
        t,
        b("div", { class: "chartwrap", style: "margin-top:12px" }, e),
      ),
      b(
        "div",
        {},
        a,
        b("div", { class: "chartwrap", style: "margin-top:12px" }, n),
      ),
    ),
    b("div", { class: "controls action-btns" }, u, r, f),
  );
  const l = new V(t, {
      mode: "open",
      arrival: 4,
      seed: 23,
      label: "OPEN",
      textScale: 1.2,
    }),
    m = new V(a, {
      mode: "gated",
      arrival: 4,
      seed: 23,
      cap: 3,
      poolTimeout: 8,
      label: "GATED · CAP 3",
      textScale: 1.2,
    }),
    x = new _(e, { labelScale: 1.2 }),
    M = new _(n, { labelScale: 1.2 }),
    S = [];
  (u.addEventListener("click", () => {
    (l.burst(40), m.burst(40));
  }),
    r.addEventListener("click", () => {
      const i = l.dropLock(4),
        h = m.dropLock(4);
      (i || h) && S.push({ t: l.t });
    }));
  let d = !1;
  function w() {
    ((m.opts.poolTimeout = d ? 8 : 1),
      (f.textContent = d ? "Absorb" : "Reject"),
      f.setAttribute("aria-pressed", d ? "true" : "false"),
      (m.label = d ? "GATED · CAP 3" : "GATED · REJECT"));
  }
  (f.addEventListener("click", () => {
    ((d = !d), w());
  }),
    w());
  const g = !O;
  function k() {
    (l.reset(), m.reset(), x.reset(), M.reset(), (S.length = 0));
  }
  (U(t, "Reset both simulations", k), U(a, "Reset both simulations", k));
  let L = !1;
  J(o, (i) => {
    L = i;
  });
  let A = performance.now(),
    C = 0;
  function E(i) {
    const h = Math.min(0.05, (i - A) / 1e3);
    ((A = i),
      g && L && (l.step(h), m.step(h)),
      L && (l.draw(), m.draw()),
      (C += h),
      C > 0.25 &&
        ((C = 0),
        g &&
          L &&
          (x.push({
            t: l.t,
            off: l.offeredRate(),
            tp: l.throughput(),
            rt: l.avgLatency(),
          }),
          M.push({
            t: m.t,
            off: m.offeredRate(),
            tp: m.throughput(),
            rt: m.avgLatency(),
          }))),
      L && (x.draw(S), M.draw(S)),
      requestAnimationFrame(E));
  }
  (window.addEventListener("resize", () => {
    (l.resize(), m.resize(), x.resize(), M.resize());
  }),
    requestAnimationFrame(E));
}
function rt() {
  (Z(),
    K(),
    window.matchMedia &&
      matchMedia("(prefers-color-scheme: dark)").addEventListener(
        "change",
        () => {
          (K(), window.dispatchEvent(new Event("dmwl-themechange")));
        },
      ));
  const o = document.querySelector("#app");
  if (!o) return;
  const t = document.createElement("style");
  ((t.textContent = it),
    document.head.appendChild(t),
    document.documentElement.classList.add("brand-diagram-canvas"),
    document.body.classList.add("brand-diagram-canvas"),
    (document.body.style.margin = "0"),
    (document.body.style.background = "var(--diagram-bg, #FAFAFA)"));
  const a = b("div", { class: "dmwl brand-diagram-canvas" });
  o.appendChild(a);
  const e = (location.hash || "#junction").slice(1);
  e === "usl-curve" ? st(a) : e === "before-after" ? ot(a) : nt(a);
}
rt();
