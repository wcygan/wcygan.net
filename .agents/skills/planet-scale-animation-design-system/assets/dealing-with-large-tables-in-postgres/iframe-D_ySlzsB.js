var He = Object.defineProperty;
var Ke = (e, t, i) =>
  t in e
    ? He(e, t, { enumerable: !0, configurable: !0, writable: !0, value: i })
    : (e[t] = i);
var J = (e, t, i) => Ke(e, typeof t != "symbol" ? t + "" : t, i);
import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ const Xe = "http://www.w3.org/2000/svg",
  rt = "JetBrains Mono, ui-monospace, monospace",
  P = 1504,
  F = 752,
  at = 80,
  Y = 16,
  je = 5e3,
  j = 14e3,
  oe = 550,
  Qe = 1600,
  Je = 180,
  ve = 480,
  kt = 420,
  $e = 75,
  ke = 90,
  Re = 420,
  ut = 320,
  Dt = [2023, 2024, 2025, 2026],
  St = 2,
  It = 12,
  re = 3,
  Te = 400,
  Le = 70,
  Oe = 420,
  Ne = 0.9,
  Ze = 6400,
  ce = 550,
  tn = 1e3,
  Bt = 24,
  zt = [
    "COPYING ROWS",
    "COPYING BLOAT",
    "COPYING INDEXES",
    "COPYING TOAST",
    "COPYING WAL",
  ],
  en = 14,
  Mt = 3400,
  ct = 60 * 60 * 1e3,
  qt = 2,
  nn = 2200,
  sn = 72,
  an = 96,
  le = 15,
  on = -15,
  Ut = 487291004,
  rn = 28,
  Et = 200,
  cn = [
    "events_pkey",
    "events_created_at_idx",
    "events_org_id_idx",
    "events_user_id_idx",
    "events_event_type_idx",
    "events_org_created_at_idx",
    "events_session_id_idx",
    "events_request_id_idx",
    "events_ip_addr_idx",
    "events_properties_gin",
    "events_user_created_at_idx",
    "events_trace_id_idx",
    "events_page_url_idx",
    "events_referrer_idx",
    "events_country_idx",
    "events_region_idx",
    "events_city_idx",
    "events_device_idx",
    "events_browser_idx",
    "events_os_idx",
    "events_app_version_idx",
    "events_experiment_id_idx",
    "events_anon_id_idx",
    "events_email_idx",
    "events_utm_source_idx",
    "events_utm_campaign_idx",
    "events_utm_medium_idx",
    "events_path_idx",
    "events_status_idx",
    "events_error_code_idx",
    "events_tenant_id_idx",
    "events_workspace_id_idx",
    "events_project_id_idx",
    "events_release_idx",
    "events_env_idx",
    "events_payload_gin",
  ],
  pt = 3,
  ft = 12,
  de = 2,
  ue = 480,
  ln = 3,
  dn = 1e3,
  he = 420,
  Rt = 560,
  Vt = 360,
  Gt = 584,
  vt = 32,
  Wt = [1, 2, 1, 3, 2, 2],
  Z = 6,
  Yt = 8,
  pe = 160,
  un = 280,
  hn = 420,
  Ht = 2,
  pn = 5,
  fe = 2,
  ge = 2,
  lt = 80,
  me = 140,
  fn = 720,
  gn = 4800,
  ye = 0.04,
  mn = 28,
  yn = 16,
  gt = 24,
  jt = 20,
  Qt = 0.62,
  dt = ["blue", "green", "gray"],
  c = {
    css: {
      background: "var(--diagram-bg, #FAFAFA)",
      foreground: "var(--diagram-fg, #111111)",
      accent: "var(--diagram-accent, #F35815)",
      blueAccent: "var(--diagram-blue, #144EB6)",
      greenAccent: "var(--diagram-green, #13862E)",
      connector: "var(--diagram-connector, #818181)",
    },
    light: {
      background: "#FAFAFA",
      foreground: "#111111",
      accent: "#F35815",
      blueAccent: "#144EB6",
      greenAccent: "#13862E",
      connector: "#818181",
    },
    dark: {
      background: "#111111",
      foreground: "#FAFAFA",
      accent: "#F35815",
      blueAccent: "#0E73CC",
      greenAccent: "#27B648",
      connector: "#818181",
    },
    typography: { labelSize: 30, titleSize: 32, labelWeight: "500" },
    stroke: { box: 2 },
    opacity: { fill: 0.1, fillEmphasisDark: 0.25 },
  },
  mt = [
    { name: "events", start: 487291004, rate: 18, big: !0 },
    { name: "users", start: 12480, rate: 3 },
    { name: "products", start: 9360, rate: 3 },
    { name: "posts", start: 8580, rate: 3 },
    { name: "comments", start: 7800, rate: 3 },
    { name: "orders", start: 7020, rate: 3 },
    { name: "reviews", start: 6240, rate: 3 },
    { name: "invoices", start: 5460, rate: 3 },
    { name: "media", start: 4680, rate: 3 },
    { name: "accounts", start: 3900, rate: 3 },
    { name: "pages", start: 3120, rate: 3 },
    { name: "tags", start: 2652, rate: 3 },
    { name: "categories", start: 2340, rate: 3 },
    { name: "teams", start: 2028, rate: 3 },
    { name: "settings", start: 1716, rate: 3 },
    { name: "roles", start: 1404, rate: 3 },
    { name: "plans", start: 1170, rate: 3 },
  ];
var Me;
const B =
  ((Me = window.matchMedia) == null
    ? void 0
    : Me.call(window, "(prefers-reduced-motion: reduce)").matches) ?? !1;
let bn = 0;
const xn = 170,
  Cn = 24;
function yt(e, t, i, n) {
  if (n) {
    ((e.value = t), (e.vel = 0));
    return;
  }
  const s = (t - e.value) * xn - e.vel * Cn;
  ((e.vel += s * i), (e.value += e.vel * i));
}
function An(e, t) {
  const i = ((e % 10) + 10) % 10;
  let n = (10 + t - i) % 10;
  return (n > 5 && (n -= 10), n);
}
function Pe(e) {
  return Math.max(1, String(Math.floor(Math.abs(e))).length);
}
function wn(e) {
  const t = [];
  for (let i = e - 1; i >= 0; i--) t.push(10 ** i);
  return t;
}
class Fe {
  constructor(t, i, n) {
    J(this, "root");
    J(this, "fontSize");
    J(this, "height");
    J(this, "cw");
    J(this, "columns");
    J(this, "commas");
    J(this, "cx", 0);
    J(this, "cy", 0);
    ((this.fontSize = n.fontSize),
      (this.height = n.fontSize),
      (this.cw = n.fontSize * Qt),
      (this.root = a("g", { class: "tile-counter" })),
      (this.columns = []),
      (this.commas = []));
    const s = Pe(n.maxValue),
      r = wn(s),
      g = ++bn;
    for (let y = 0; y < r.length; y++) {
      const d = r[y] ?? 1,
        b = `reel-${g}-${d}`,
        _ = a("clipPath", { id: b }),
        M = a("rect", { x: 0, y: 0, width: this.cw, height: this.height });
      (_.appendChild(M), i.appendChild(_));
      const f = a("g", { "clip-path": `url(#${b})` }),
        v = [];
      for (let o = 0; o < 10; o++) {
        const S = a("text", {
          class: "tile-count",
          x: 0,
          y: 0,
          "font-size": this.fontSize,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        });
        ((S.textContent = String(o)), f.appendChild(S), v.push(S));
      }
      (this.root.appendChild(f),
        this.columns.push({
          place: d,
          spring: { value: Math.floor(n.initial / d), vel: 0 },
          wrap: f,
          clipRect: M,
          digits: v,
        }));
    }
    const h = Math.floor((s - 1) / 3);
    for (let y = 0; y < h; y++) {
      const d = a("text", {
        class: "tile-count",
        "font-size": this.fontSize,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      ((d.textContent = ","), this.root.appendChild(d), this.commas.push(d));
    }
    (t.appendChild(this.root), this.layout(n.initial), this.renderDigits());
  }
  setCenter(t, i) {
    ((this.cx = t), (this.cy = i));
  }
  setVisible(t) {
    this.root.style.display = t ? "" : "none";
  }
  setValue(t, i, n) {
    for (const s of this.columns) yt(s.spring, Math.floor(t / s.place), i, n);
    (this.layout(t), this.renderDigits());
  }
  layout(t) {
    var y;
    const i = this.columns.filter(
      (d) => d.place === 1 || Math.floor(t / d.place) > 0,
    );
    let n = 0;
    for (let d = 1; d < i.length; d++) (i.length - d) % 3 === 0 && n++;
    const s = (i.length + n) * this.cw;
    let r = this.cx - s / 2;
    const g = this.cy - this.height / 2;
    let h = 0;
    for (let d = 0; d < this.columns.length; d++) {
      const b = this.columns[d];
      if (!b) continue;
      const _ = i.includes(b);
      if (((b.wrap.style.display = _ ? "" : "none"), !_)) continue;
      const M = i.indexOf(b);
      if (M > 0 && (i.length - M) % 3 === 0) {
        const f = this.commas[h++];
        f &&
          ((f.style.display = ""),
          f.setAttribute("x", String(r + this.cw / 2)),
          f.setAttribute("y", String(this.cy)),
          (r += this.cw));
      }
      (b.clipRect.setAttribute("x", String(r)),
        b.clipRect.setAttribute("y", String(g)),
        b.clipRect.setAttribute("width", String(this.cw)),
        b.clipRect.setAttribute("height", String(this.height)));
      for (const f of b.digits) f.setAttribute("x", String(r + this.cw / 2));
      r += this.cw;
    }
    for (let d = h; d < this.commas.length; d++)
      (y = this.commas[d]) == null || y.style.setProperty("display", "none");
  }
  renderDigits() {
    const t = this.cy - this.height / 2;
    for (const i of this.columns)
      if (i.wrap.style.display !== "none")
        for (let n = 0; n < i.digits.length; n++) {
          const s = i.digits[n];
          if (!s) continue;
          const r = t + this.height / 2 + An(i.spring.value, n) * this.height;
          s.setAttribute("y", String(r));
        }
  }
}
function a(e, t = {}) {
  const i = document.createElementNS(Xe, e);
  for (const [n, s] of Object.entries(t)) i.setAttribute(n, String(s));
  return i;
}
function be(e) {
  return Math.floor(e).toLocaleString("en-US");
}
function Kt(e, t) {
  return e.length * t * Qt;
}
function st(e, t) {
  return {
    x: e.x + t / 2,
    y: e.y + t / 2,
    w: Math.max(0, e.w - t),
    h: Math.max(0, e.h - t),
  };
}
function xe(e, t, i, n, s, r) {
  const g = ((e / s) * r) / n,
    h = (i / e) * n,
    y = (t / e) * n;
  return Math.max(h / g, g / y, g / h, y / g);
}
function _n(e, t, i, n, s) {
  const r = e.length,
    g = Array.from({ length: r }, () => ({ x: t, y: i, w: 0, h: 0 })),
    h = e.reduce((v, o) => v + o, 0);
  if (h <= 0 || n <= 0 || s <= 0) return g;
  let y = h,
    d = 0,
    b = t,
    _ = i,
    M = n,
    f = s;
  for (; d < r; ) {
    const v = M,
      o = f,
      S = o > v,
      w = S ? v : o,
      T = v * o,
      O = e[d] ?? 0;
    let k = d + 1,
      R = O,
      l = O,
      A = O,
      u = xe(R, l, A, w, y, T);
    for (; k < r; ) {
      const C = e[k] ?? 0,
        m = R + C,
        x = Math.min(l, C),
        E = Math.max(A, C),
        L = xe(m, x, E, w, y, T);
      if (L > u) break;
      ((R = m), (l = x), (A = E), (u = L), k++);
    }
    const p = R / y;
    if (S) {
      const C = o * p;
      let m = b;
      for (let x = d; x < k; x++) {
        const E = ((e[x] ?? 0) / R) * v;
        ((g[x] = { x: m, y: _, w: E, h: C }), (m += E));
      }
      ((_ += C), (f -= C));
    } else {
      const C = v * p;
      let m = _;
      for (let x = d; x < k; x++) {
        const E = ((e[x] ?? 0) / R) * o;
        ((g[x] = { x: b, y: m, w: C, h: E }), (m += E));
      }
      ((b += C), (M -= C));
    }
    ((y -= R), (d = k));
  }
  return g;
}
function tt() {
  if (document.querySelector("#brand-diagram-styles")) return;
  const e = document.createElement("style");
  ((e.id = "brand-diagram-styles"),
    (e.textContent = `
    html, body, #app {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${c.css.background};
      color-scheme: light dark;
    }
    #app {
      --replay-h: 36px;
      display: grid;
      place-items: center;
      container-type: size;
    }
    .diagram-frame {
      position: relative;
      width: min(100cqi, calc(100cqh * ${P} / ${F}));
      aspect-ratio: ${P} / ${F};
    }
    .diagram-stage {
      width: 100%;
      height: 100%;
    }
    .replay-bar {
      position: absolute;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      height: var(--replay-h);
      padding: 0;
      box-sizing: border-box;
    }
    .replay-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: 0;
      appearance: none;
      background: transparent;
      color: ${c.css.accent};
      cursor: pointer;
      opacity: 0.7;
      font-family: ${rt};
      font-size: 13px;
      font-weight: ${c.typography.labelWeight};
      line-height: 1;
      touch-action: manipulation;
    }
    .replay-btn .replay-icon {
      font-size: 16px;
      line-height: 1;
    }
    .replay-btn:hover,
    .replay-btn:focus-visible {
      opacity: 1;
      outline: none;
    }
    .brand-diagram-svg {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
      user-select: none;
      --diagram-bg: ${c.light.background};
      --diagram-fg: ${c.light.foreground};
      --diagram-accent: ${c.light.accent};
      --diagram-blue: ${c.light.blueAccent};
      --diagram-green: ${c.light.greenAccent};
      --diagram-connector: ${c.light.connector};
    }
    @media (prefers-color-scheme: dark) {
      .brand-diagram-svg {
        --diagram-bg: ${c.dark.background};
        --diagram-fg: ${c.dark.foreground};
        --diagram-accent: ${c.dark.accent};
        --diagram-blue: ${c.dark.blueAccent};
        --diagram-green: ${c.dark.greenAccent};
        --diagram-connector: ${c.dark.connector};
      }
    }
    .tile-box {
      fill-opacity: ${c.opacity.fill};
      stroke-width: ${c.stroke.box};
    }
    .tile-orange .tile-box {
      fill: ${c.css.accent};
      stroke: ${c.css.accent};
    }
    .tile-blue .tile-box {
      fill: ${c.css.blueAccent};
      stroke: ${c.css.blueAccent};
    }
    .tile-green .tile-box {
      fill: ${c.css.greenAccent};
      stroke: ${c.css.greenAccent};
    }
    .tile-gray .tile-box {
      fill: ${c.css.connector};
      stroke: ${c.css.connector};
    }
    .tile-progress {
      pointer-events: none;
      fill-opacity: 0.35;
    }
    .tile-orange .tile-progress,
    .tile-orange .query-progress {
      fill: ${c.css.accent};
    }
    .tile-blue .tile-progress,
    .tile-blue .query-progress {
      fill: ${c.css.blueAccent};
    }
    .tile-green .tile-progress,
    .tile-green .query-progress {
      fill: ${c.css.greenAccent};
    }
    .tile-gray .tile-progress,
    .tile-gray .query-progress {
      fill: ${c.css.connector};
    }
    .query-progress {
      pointer-events: none;
      fill-opacity: 0.175;
    }
    @media (prefers-color-scheme: dark) {
      .tile-orange .tile-box {
        fill-opacity: ${c.opacity.fillEmphasisDark};
      }
      .tile-progress {
        fill-opacity: 0.5;
      }
      .query-progress {
        fill-opacity: 0.25;
      }
    }
    .tile-name,
    .tile-count {
      font-family: ${rt};
      font-weight: ${c.typography.labelWeight};
      letter-spacing: 0em;
    }
    .tile-orange .tile-name {
      fill: ${c.css.accent};
    }
    .tile-blue .tile-name {
      fill: ${c.css.blueAccent};
    }
    .tile-green .tile-name {
      fill: ${c.css.greenAccent};
    }
    .tile-gray .tile-name {
      fill: ${c.css.connector};
    }
    .tile-count {
      fill: ${c.css.foreground};
      font-variant-numeric: tabular-nums;
    }
    .copy-window,
    .copy-rule,
    .copy-x {
      fill: none;
      stroke: ${c.css.connector};
      stroke-width: ${c.stroke.box};
    }
    .copy-x {
      stroke-linecap: square;
    }
    .copy-title,
    .copy-status {
      font-family: ${rt};
      font-weight: ${c.typography.labelWeight};
      fill: ${c.css.accent};
    }
    .copy-remain,
    .copy-btn-label {
      font-family: ${rt};
      font-weight: ${c.typography.labelWeight};
      fill: ${c.css.foreground};
      font-variant-numeric: tabular-nums;
    }
    .copy-bar-track {
      fill: none;
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
    }
    .tuple-box {
      fill: none;
      stroke: ${c.css.connector};
      stroke-width: ${c.stroke.box};
      stroke-dasharray: 8 8;
    }
    .index-box {
      fill: none;
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
      stroke-dasharray: 8 8;
    }
    .tile-outer {
      fill: none;
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
    }
    .partition-box {
      fill: ${c.css.accent};
      fill-opacity: ${c.opacity.fill};
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
      stroke-dasharray: 8 8;
    }
    @media (prefers-color-scheme: dark) {
      .partition-box {
        fill-opacity: ${c.opacity.fillEmphasisDark};
      }
    }
    .wide-cell {
      fill: ${c.css.accent};
      fill-opacity: 0.35;
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
    }
    .wide-try {
      fill: none;
      stroke: ${c.css.accent};
      stroke-width: ${c.stroke.box};
      stroke-dasharray: 8 8;
    }
    @media (prefers-color-scheme: dark) {
      .wide-cell {
        fill-opacity: 0.5;
      }
    }
    .tuple-label {
      font-family: ${rt};
      font-weight: ${c.typography.labelWeight};
      fill: ${c.css.foreground};
      font-variant-numeric: tabular-nums;
    }
    .query-sql {
      font-family: ${rt};
      font-weight: ${c.typography.labelWeight};
      fill: ${c.css.foreground};
    }
    .query-table-orange {
      fill: ${c.css.accent};
    }
    .query-table-blue {
      fill: ${c.css.blueAccent};
    }
    .query-table-green {
      fill: ${c.css.greenAccent};
    }
    .query-table-gray {
      fill: ${c.css.connector};
    }
    .query-active-border {
      fill: none;
      stroke-width: ${c.stroke.box};
    }
    .query-tone-orange {
      stroke: ${c.css.accent};
    }
    .query-tone-blue {
      stroke: ${c.css.blueAccent};
    }
    .query-tone-green {
      stroke: ${c.css.greenAccent};
    }
    .query-tone-gray {
      stroke: ${c.css.connector};
    }
  `),
    document.head.appendChild(e));
}
function Sn(e, t) {
  const i = e.getBoundingClientRect(),
    n = t.innerHeight,
    s = t.innerWidth,
    r = Math.max(0, Math.min(i.bottom, n) - Math.max(i.top, 0)),
    g = Math.max(0, Math.min(i.right, s) - Math.max(i.left, 0)),
    h = i.width * i.height;
  return h > 0 && (r * g) / h >= 0.1;
}
function et(e, t) {
  let i = !1,
    n;
  const s = () => {
    const h = i && document.visibilityState !== "hidden";
    h !== n && ((n = h), t(h));
  };
  document.addEventListener("visibilitychange", s);
  const r = window.parent !== window,
    g = window.frameElement;
  if (g) {
    const h = window.parent,
      y = () => {
        ((i = Sn(g, h)), s());
      };
    (h.addEventListener("scroll", y, { passive: !0, capture: !0 }),
      h.addEventListener("resize", y));
    try {
      new h.IntersectionObserver(y, { threshold: [0, 0.1, 1] }).observe(g);
    } catch {}
    y();
    return;
  }
  if (r) {
    ((i = !0), s());
    return;
  }
  if (!("IntersectionObserver" in window)) {
    ((i = !0), s());
    return;
  }
  new IntersectionObserver(
    (h) => {
      ((i = h.some((y) => y.isIntersecting && y.intersectionRatio > 0)), s());
    },
    { threshold: 0.1 },
  ).observe(e);
}
function nt(e, t) {
  const i = document.createElement("div");
  i.className = "diagram-frame";
  const n = document.createElement("div");
  ((n.className = "diagram-stage"),
    n.appendChild(t),
    i.appendChild(n),
    e.appendChild(i));
}
function bt(e, t) {
  if (B) return;
  const i = e.querySelector(".diagram-frame") ?? e,
    n = document.createElement("div");
  n.className = "replay-bar";
  const s = document.createElement("button");
  ((s.type = "button"),
    (s.className = "replay-btn"),
    s.setAttribute("aria-label", "Restart animation"));
  const r = document.createElement("span");
  ((r.className = "replay-icon"),
    r.setAttribute("aria-hidden", "true"),
    (r.textContent = "↻"));
  const g = document.createElement("span");
  ((g.textContent = "RESTART"),
    s.append(r, g),
    s.addEventListener("click", (h) => {
      (h.stopPropagation(), t());
    }),
    n.appendChild(s),
    i.appendChild(n));
}
function Ce(e) {
  return e ? c.typography.titleSize : gt;
}
function En(e, t, i) {
  return Kt(e, t) + 24 <= i.w && t + 24 <= i.h;
}
function Xt(e, t, i, n) {
  const r = Math.max(Kt(e, i), Kt(t, i)),
    g = i + jt + i;
  return r + 24 <= n.w && g + 24 <= n.h;
}
function Jt(e) {
  let t = 2166136261;
  for (let i = 0; i < e.length; i++)
    t = Math.imul(t ^ e.charCodeAt(i), 16777619);
  return t >>> 0;
}
function Mn(e, t) {
  const i = Math.max(0, t) / 1e3;
  if (e.big) return e.start + e.rate * i;
  const n = Jt(e.name),
    s = 0.32 + (n % 23) / 100,
    r = 0.55 + (n % 19) / 12,
    g = (n % 628) / 100,
    h = 0.12 + ((n >> 8) % 11) / 100,
    y = r * (1.3 + ((n >> 4) % 9) / 10),
    d = g * 1.7,
    b =
      -((e.rate * s) / r) * (Math.cos(r * i + g) - Math.cos(g)) +
      -((e.rate * h) / y) * (Math.cos(y * i + d) - Math.cos(d));
  return e.start + e.rate * i + b;
}
function Lt(e = F) {
  const t = mt.find((h) => h.big),
    i = mt.filter((h) => !h.big),
    n = P * (2 / 3),
    s = st({ x: 0, y: 0, w: n, h: e }, Y),
    r = { x: n, y: 0, w: P - n, h: e },
    g = _n(
      i.map((h) => h.start),
      r.x,
      r.y,
      r.w,
      r.h,
    ).map((h) => st(h, Y));
  return [
    { spec: t, rect: s, tone: "orange" },
    ...i.map((h, y) => ({
      spec: h,
      rect: g[y] ?? { x: 0, y: 0, w: 0, h: 0 },
      tone: dt[y % dt.length] ?? "blue",
    })),
  ];
}
function Ot(e, t, i) {
  (e.setAttribute("class", `tile-${i}`),
    e.appendChild(
      a("rect", { class: "tile-box", x: t.x, y: t.y, width: t.w, height: t.h }),
    ));
}
function vn(e, t, i) {
  if (e.big) return j;
  const n = Math.max(1, i - t),
    s = (e.start - t) / n;
  return oe + s * (Qe - oe);
}
function $n(e, t, i, n) {
  if (e <= 0) return 0;
  if (t.big) return Math.min(1, e / i);
  const s = e - n;
  if (s <= 0) return 0;
  const r = i + Je,
    g = s % r;
  return g >= i ? 1 : g / i;
}
function Zt(e, t, i) {
  const n = t.h * Math.max(0, Math.min(1, i));
  (e.setAttribute("x", String(t.x)),
    e.setAttribute("width", String(t.w)),
    e.setAttribute("y", String(t.y + t.h - n)),
    e.setAttribute("height", String(n)));
}
function Tt(e) {
  const t = Math.max(0, Math.min(1, e));
  return t * t * (3 - 2 * t);
}
function Ie(e, t, i) {
  const n = t.w * Math.max(0, Math.min(1, i));
  (e.setAttribute("x", String(t.x)),
    e.setAttribute("y", String(t.y)),
    e.setAttribute("width", String(n)),
    e.setAttribute("height", String(t.h)));
}
function kn(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label":
      "Small tables vacuum many times while one large table is still running",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = mt.filter((u) => !u.big).map((u) => u.start),
    s = Math.min(...n),
    r = Math.max(...n),
    g = [];
  let h = 0,
    y = null;
  for (const u of Lt(F - at)) {
    const { spec: p, rect: C, tone: m } = u;
    if (C.w < 8 || C.h < 8) continue;
    const x = `vacuum-clip-${++h}`,
      E = a("clipPath", { id: x });
    (E.appendChild(a("rect", { x: C.x, y: C.y, width: C.w, height: C.h })),
      i.appendChild(E));
    const L = a("g");
    Ot(L, C, m);
    const U = a("g", { "clip-path": `url(#${x})` }),
      q = a("rect", {
        class: "tile-progress",
        x: C.x,
        y: C.y + C.h,
        width: C.w,
        height: 0,
      });
    (U.appendChild(q),
      L.appendChild(U),
      p.big &&
        ((y = a("text", {
          class: "tile-name",
          x: C.x + C.w / 2,
          y: C.y + C.h / 2,
          "font-size": c.typography.titleSize,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        })),
        (y.textContent = "VACUUMING..."),
        L.appendChild(y)),
      t.appendChild(L));
    const G = Jt(p.name);
    g.push({
      spec: p,
      rect: C,
      fill: q,
      g: L,
      duration: vn(p, s, r),
      offset: p.big ? 0 : G % 900,
    });
  }
  nt(e, t);
  let d = !1,
    b = 0,
    _ = 0,
    M = "run",
    f = [],
    v = 0,
    o = 0,
    S = 0,
    w = 0;
  function T() {
    const u = g.map((p, C) => C);
    for (let p = u.length - 1; p > 0; p--) {
      const C = Math.floor(Math.random() * (p + 1)),
        m = u[p];
      ((u[p] = u[C]), (u[C] = m));
    }
    f = g.map(() => 0);
    for (let p = 0; p < u.length; p++) {
      const C = u[p];
      f[C] = ve + p * $e + Math.random() * ke;
    }
    v = Math.max(0, ...f) + kt;
  }
  function O(u) {
    if (M === "run") return 1;
    if (M === "gap") return 0;
    if (M === "fadeIn") return Tt(_ / ut);
    const p = _ - (f[u] ?? 0);
    return p <= 0 ? 1 : 1 - Tt(p / kt);
  }
  function k(u, p) {
    if (!y) return;
    if (B) {
      y.setAttribute("opacity", "1");
      return;
    }
    if (!p) {
      y.setAttribute("opacity", "0");
      return;
    }
    const C = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((u / 600) * Math.PI));
    y.setAttribute("opacity", String(C));
  }
  function R(u, p = 0, C = !0) {
    for (let m = 0; m < g.length; m++) {
      const x = g[m];
      (Zt(x.fill, x.rect, $n(u, x.spec, x.duration, x.offset)),
        x.g.setAttribute("opacity", String(O(m))));
    }
    k(p, C);
  }
  function l(u) {
    if (!d) return;
    const p = w ? Math.min(0.05, (u - w) / 1e3) : 1 / 60;
    if (((w = u), B)) {
      R(j * 0.4, u, !0);
      return;
    }
    (M === "run"
      ? ((b += p * 1e3), b >= j && ((b = j), T(), (M = "fadeOut"), (_ = 0)))
      : M === "fadeOut"
        ? ((_ += p * 1e3),
          _ >= v && ((b = 0), (_ = v), (M = "gap"), (o = u + Re)))
        : M === "gap"
          ? u >= o && ((M = "fadeIn"), (_ = 0))
          : ((_ += p * 1e3), _ >= ut && ((_ = ut), (b = 0), (M = "run"))),
      R(b, u, M === "run"),
      (S = requestAnimationFrame(l)));
  }
  function A() {
    ((b = 0), (_ = 0), (M = "run"), (o = 0), (w = 0), R(0, 0, !0));
  }
  (bt(e, A),
    et(t, (u) => {
      ((d = u),
        u
          ? ((w = 0), (S = requestAnimationFrame(l)))
          : cancelAnimationFrame(S));
    }),
    R(B ? j * 0.4 : 0, 0, !0));
}
function Rn(e = F) {
  const t = st({ x: 0, y: 0, w: P, h: e }, Y),
    i = st(t, Y),
    n = Math.ceil(Dt.length / St),
    s = i.w / St,
    r = i.h / n,
    g = Dt.map((h, y) => {
      const d = y % St,
        b = Math.floor(y / St);
      return st({ x: i.x + d * s, y: i.y + b * r, w: s, h: r }, Y);
    });
  return { outer: t, cells: g };
}
function Tn(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Four yearly partitions of events vacuum at the same time",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const { outer: n, cells: s } = Rn(F - at),
    r = a("g", { class: "tile-orange" });
  (r.appendChild(
    a("rect", { class: "tile-outer", x: n.x, y: n.y, width: n.w, height: n.h }),
  ),
    t.appendChild(r));
  const g = [];
  (s.forEach((l, A) => {
    const u = Dt[A];
    if (!u || l.w < 8 || l.h < 8) return;
    const p = `partition-clip-${u}`,
      C = a("clipPath", { id: p });
    (C.appendChild(a("rect", { x: l.x, y: l.y, width: l.w, height: l.h })),
      i.appendChild(C));
    const m = a("g", { class: "tile-orange" });
    m.appendChild(
      a("rect", {
        class: "partition-box",
        x: l.x,
        y: l.y,
        width: l.w,
        height: l.h,
      }),
    );
    const x = a("g", { "clip-path": `url(#${p})` }),
      E = a("rect", {
        class: "tile-progress",
        x: l.x,
        y: l.y + l.h,
        width: l.w,
        height: 0,
      });
    (x.appendChild(E), m.appendChild(x));
    const L = c.typography.titleSize,
      U = `EVENTS ${u}`,
      q = Xt("VACUUMING", U, L, l),
      G = l.x + l.w / 2,
      $ = a("text", {
        class: "tile-name",
        x: G,
        y: qe(l, L, q),
        "font-size": L,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
    if ((($.textContent = "VACUUMING"), m.appendChild($), q)) {
      const N = a("text", {
        class: "tile-name",
        x: G,
        y: Ue(l, L),
        "font-size": L,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      ((N.textContent = U), m.appendChild(N));
    }
    (t.appendChild(m), g.push({ rect: l, fill: E, g: m, vacuuming: $ }));
  }),
    nt(e, t));
  let h = !1,
    y = 0,
    d = 0,
    b = "run",
    _ = [],
    M = 0,
    f = 0,
    v = 0,
    o = 0;
  function S() {
    const l = g.map((A, u) => u);
    for (let A = l.length - 1; A > 0; A--) {
      const u = Math.floor(Math.random() * (A + 1)),
        p = l[A];
      ((l[A] = l[u]), (l[u] = p));
    }
    _ = g.map(() => 0);
    for (let A = 0; A < l.length; A++) {
      const u = l[A];
      _[u] = ve + A * $e + Math.random() * ke;
    }
    M = Math.max(0, ..._) + kt;
  }
  function w(l) {
    if (b === "run") return 1;
    if (b === "gap") return 0;
    if (b === "fadeIn") return Tt(d / ut);
    const A = d - (_[l] ?? 0);
    return A <= 0 ? 1 : 1 - Tt(A / kt);
  }
  function T(l, A) {
    for (const u of g) {
      if (B) {
        u.vacuuming.setAttribute("opacity", "1");
        continue;
      }
      if (!A) {
        u.vacuuming.setAttribute("opacity", "0");
        continue;
      }
      const p = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((l / 600) * Math.PI));
      u.vacuuming.setAttribute("opacity", String(p));
    }
  }
  function O(l, A = 0, u = !0) {
    const p = B ? 0.4 : Math.min(1, l / j);
    let C = 0;
    for (let m = 0; m < g.length; m++) {
      const x = g[m],
        E = w(m);
      ((C = Math.max(C, E)),
        Zt(x.fill, x.rect, p),
        x.g.setAttribute("opacity", String(E)));
    }
    (r.setAttribute("opacity", String(C)), T(A, u));
  }
  function k(l) {
    if (!h) return;
    const A = o ? Math.min(0.05, (l - o) / 1e3) : 1 / 60;
    if (((o = l), B)) {
      O(j * 0.4, l, !0);
      return;
    }
    (b === "run"
      ? ((y += A * 1e3), y >= j && ((y = j), S(), (b = "fadeOut"), (d = 0)))
      : b === "fadeOut"
        ? ((d += A * 1e3),
          d >= M && ((y = 0), (d = M), (b = "gap"), (f = l + Re)))
        : b === "gap"
          ? l >= f && ((b = "fadeIn"), (d = 0))
          : ((d += A * 1e3), d >= ut && ((d = ut), (y = 0), (b = "run"))),
      O(y, l, b === "run"),
      (v = requestAnimationFrame(k)));
  }
  function R() {
    ((y = 0), (d = 0), (b = "run"), (f = 0), (o = 0), O(0, 0, !0));
  }
  (bt(e, R),
    et(t, (l) => {
      ((h = l),
        l
          ? ((o = 0), (v = requestAnimationFrame(k)))
          : cancelAnimationFrame(v));
    }),
    O(B ? j * 0.4 : 0, 0, !0));
}
function Ln(e, t = F) {
  const i = P * 0.6666666666666666,
    n = t / e;
  return Array.from({ length: e }, (s, r) =>
    st({ x: i, y: r * n, w: P - i, h: n }, Y),
  );
}
function On(e, t, i = F) {
  const n = P / 3,
    s = (P * 2) / 3 + e * n,
    r = i / t;
  return Array.from({ length: t }, (g, h) =>
    st({ x: s, y: h * r, w: n, h: r }, Y),
  );
}
function Nn(e) {
  for (let t = e.length - 1; t > 0; t--) {
    const i = Math.floor(Math.random() * (t + 1)),
      n = e[t];
    ((e[t] = e[i]), (e[i] = n));
  }
  return e;
}
function Ae(e) {
  const t = 1 + Math.floor(Math.random() * 3),
    i = 4 + Math.floor(Math.random() * 4),
    n = e - i - t;
  return Nn([
    ...Array.from({ length: i }, () => 1),
    ...Array.from({ length: n }, () => 2),
    ...Array.from({ length: t }, () => 3),
  ]);
}
function Pn(e, t) {
  const i = Jt(`tuple-${e}-${t}`),
    n = 4812104 + (i % 9e3),
    s = 1 + (i % 28);
  return `(${n},${s})`;
}
function Fn(e, t, i, n, s) {
  if (s < n) return 0;
  if (s > n) return 1;
  const r = t - i - Te;
  return r <= 0 ? 1 : 1 - Math.max(0, Math.min(1, (r - e * Le) / Oe));
}
function In(e, t) {
  let i = 0;
  for (let n = 0; n < t.length; n++) t[n] === e && (i = n);
  return Te + i * Le + Oe;
}
function $t(e) {
  return e === 1 ? j * (1 - Ne) : Ze;
}
function qn(e, t) {
  const i = t === 1 ? Ne : 0,
    n = $t(t);
  return i + (1 - i) * Math.min(1, e / n);
}
function Un(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Vacuum needs three passes to reclaim every dead tuple",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = Lt(F - at)[0];
  if (!n) return;
  const s = a("clipPath", { id: "repack-clip" });
  (s.appendChild(
    a("rect", { x: n.rect.x, y: n.rect.y, width: n.rect.w, height: n.rect.h }),
  ),
    i.appendChild(s));
  const r = a("g");
  Ot(r, n.rect, "orange");
  const g = a("rect", {
      class: "tile-progress",
      x: n.rect.x,
      y: n.rect.y + n.rect.h,
      width: n.rect.w,
      height: 0,
    }),
    h = a("g", { "clip-path": "url(#repack-clip)" });
  (h.appendChild(g), r.appendChild(h));
  const y = a("text", {
    class: "tile-name",
    x: n.rect.x + n.rect.w / 2,
    y: n.rect.y + n.rect.h / 2,
    "font-size": c.typography.titleSize,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  ((y.textContent = "VACUUMING..."), r.appendChild(y), t.appendChild(r));
  const d = Ln(It, F - at).map((m, x) => {
    const E = a("g");
    E.appendChild(
      a("rect", {
        class: "tuple-box",
        x: m.x,
        y: m.y,
        width: m.w,
        height: m.h,
      }),
    );
    const L = m.y + m.h / 2,
      U = a("text", {
        class: "tuple-label",
        x: m.x + Bt,
        y: L,
        "font-size": gt,
        "text-anchor": "start",
        "dominant-baseline": "middle",
      }),
      q = a("text", {
        class: "tuple-label",
        x: m.x + m.w - Bt,
        y: L,
        "font-size": gt,
        "text-anchor": "end",
        "dominant-baseline": "middle",
      });
    return (
      (q.textContent = "LP_DEAD"),
      E.appendChild(U),
      E.appendChild(q),
      t.appendChild(E),
      { g: E, i: x, ctid: U }
    );
  });
  nt(e, t);
  let b = 1,
    _ = Ae(It),
    M = 1,
    f = !1,
    v = !1,
    o = 0,
    S = !1,
    w = 0,
    T = 0,
    O = 0,
    k = 0;
  function R() {
    for (const m of d) m.ctid.textContent = Pn(m.i, M);
  }
  function l() {
    return $t(b) + In(b, _);
  }
  function A(m, x) {
    if (B) {
      y.setAttribute("opacity", "1");
      return;
    }
    if (!x) {
      y.setAttribute("opacity", "0");
      return;
    }
    const E = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((m / 600) * Math.PI));
    y.setAttribute("opacity", String(E));
  }
  function u(m, x = 0, E = !0) {
    const L = $t(b),
      U = f ? Math.min(1, o / ce) : 0,
      q = f ? 1 - U : qn(m, b);
    (Zt(g, n.rect, q), A(x, E));
    for (const G of d) {
      const $ = Fn(G.i, m, L, b, _[G.i]);
      G.g.setAttribute("opacity", String(f && v ? $ + (1 - $) * U : $));
    }
  }
  function p(m) {
    if (!S) return;
    const x = k ? Math.min(0.05, (m - k) / 1e3) : 1 / 60;
    if (((k = m), B)) {
      u(l(), m, !1);
      return;
    }
    if (T) m >= T && ((T = 0), (f = !0), (v = b >= re), (o = 0));
    else if (f)
      ((o += x * 1e3),
        o >= ce &&
          ((f = !1),
          (o = 0),
          v ? ((v = !1), (b = 1), (M += 1), (_ = Ae(It)), R()) : (b += 1),
          (w = 0)));
    else {
      w += x * 1e3;
      const E = l();
      w >= E && ((w = E), (T = m + (b >= re ? je : tn)));
    }
    (u(w, m, !f && !T && w < $t(b)), (O = requestAnimationFrame(p)));
  }
  function C() {
    ((f = !1),
      (v = !1),
      (o = 0),
      (b = 1),
      (w = 0),
      (T = 0),
      (k = 0),
      u(0, 0, !0));
  }
  (R(),
    bt(e, C),
    et(t, (m) => {
      ((S = m),
        m
          ? ((k = 0), (O = requestAnimationFrame(p)))
          : cancelAnimationFrame(O));
    }),
    u(B ? l() : 0, 0, !B));
}
function Wn(e, t, i, n) {
  const s = Math.round(i * 0.36),
    r = Math.max(32, Math.round(n * 0.16));
  return `M ${e} ${t + r} L ${e} ${t} L ${e + s} ${t} L ${e + s} ${t + r} L ${e + i} ${t + r} L ${e + i} ${t + n} L ${e} ${t + n} Z`;
}
function we(e, t, i) {
  const n = a("g", { class: `tile-${i}` });
  (n.appendChild(a("path", { class: "tile-box", d: Wn(t.x, t.y, t.w, t.h) })),
    e.appendChild(n));
}
function Dn(e, t, i, n) {
  const s = 1 - n;
  return {
    x: s * s * e.x + 2 * s * n * t.x + n * n * i.x,
    y: s * s * e.y + 2 * s * n * t.y + n * n * i.y,
  };
}
function Bn(e) {
  return Math.floor(Math.max(0, e) / Mt) % zt.length;
}
function zn(e) {
  const t = e % Mt;
  return t < Et ? t / Et : t > Mt - Et ? (Mt - t) / Et : 1;
}
function Vn(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Copying a large table is busy but barely makes progress",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = { x: Y, y: Y, w: P - Y * 2, h: F - Y * 2 },
    s = 32,
    r = n.x + s,
    g = 48,
    h = s + g + s;
  (t.appendChild(
    a("rect", {
      class: "copy-window",
      x: n.x,
      y: n.y,
      width: n.w,
      height: n.h,
    }),
  ),
    t.appendChild(
      a("line", {
        class: "copy-rule",
        x1: n.x,
        y1: n.y + h,
        x2: n.x + n.w,
        y2: n.y + h,
      }),
    ));
  const y = a("text", {
    class: "copy-title",
    x: r,
    y: n.y + h / 2,
    "font-size": c.typography.titleSize,
    "text-anchor": "start",
    "dominant-baseline": "middle",
  });
  ((y.textContent = "COPYING..."), t.appendChild(y));
  const d = { x: n.x + n.w - s - g, y: n.y + s, w: g, h: g },
    b = a("g", { class: "tile-gray" });
  b.appendChild(
    a("rect", { class: "tile-box", x: d.x, y: d.y, width: d.w, height: d.h }),
  );
  const _ = 14;
  (b.appendChild(
    a("line", {
      class: "copy-x",
      x1: d.x + _,
      y1: d.y + _,
      x2: d.x + d.w - _,
      y2: d.y + d.h - _,
    }),
  ),
    b.appendChild(
      a("line", {
        class: "copy-x",
        x1: d.x + d.w - _,
        y1: d.y + _,
        x2: d.x + _,
        y2: d.y + d.h - _,
      }),
    ),
    t.appendChild(b));
  const M = 280,
    f = 188,
    v = c.typography.labelSize,
    o = c.typography.titleSize,
    S = 56,
    w = c.typography.labelSize,
    T = n.y + h + s,
    O = n.y + n.h - s,
    k = f + v + o + S + w,
    R = (O - T - k) / 4,
    l = T,
    A = l + f + R + v / 2,
    u = A + v / 2 + R + o / 2,
    p = u + o / 2 + R,
    C = p + S + R + w / 2,
    m = { x: r, y: l, w: M, h: f },
    x = { x: n.x + n.w - s - M, y: l, w: M, h: f };
  (we(t, m, "orange"), we(t, x, "gray"));
  const E = l + f * 0.58,
    L = {
      a: { x: m.x + m.w - 24, y: E },
      c: { x: P / 2, y: l + 12 },
      b: { x: x.x + 24, y: E },
    },
    U = Array.from({ length: qt }, () => {
      const V = a("g", { class: "tile-orange" });
      return (
        V.appendChild(
          a("rect", {
            class: "tile-box",
            x: -72 / 2,
            y: -96 / 2,
            width: sn,
            height: an,
          }),
        ),
        t.appendChild(V),
        V
      );
    }),
    q = new Fe(t, i, { fontSize: v, initial: Ut, maxValue: 999999999 }),
    G = a("text", {
      class: "copy-remain",
      x: r,
      y: A,
      "font-size": v,
      "text-anchor": "start",
      "dominant-baseline": "middle",
    });
  ((G.textContent = "ROWS"), t.appendChild(G));
  const $ = a("text", {
    class: "copy-status",
    x: r,
    y: u,
    "font-size": c.typography.titleSize,
    "text-anchor": "start",
    "dominant-baseline": "middle",
  });
  t.appendChild($);
  const N = 188,
    W = { x: n.x + n.w - s - N, y: p, w: N, h: S },
    z = a("g", { class: "tile-gray" });
  z.appendChild(
    a("rect", { class: "tile-box", x: W.x, y: W.y, width: W.w, height: W.h }),
  );
  const I = a("text", {
    class: "copy-btn-label",
    x: W.x + W.w / 2,
    y: W.y + W.h / 2,
    "font-size": c.typography.labelSize,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  ((I.textContent = "CANCEL"), z.appendChild(I), t.appendChild(z));
  const D = { x: r, y: W.y, w: W.x - r - 24, h: S },
    ht = a("clipPath", { id: "backup-bar-clip" });
  (ht.appendChild(a("rect", { x: D.x, y: D.y, width: D.w, height: D.h })),
    i.appendChild(ht),
    t.appendChild(
      a("rect", {
        class: "copy-bar-track",
        x: D.x,
        y: D.y,
        width: D.w,
        height: D.h,
      }),
    ));
  const ot = a("rect", {
      class: "tile-progress",
      x: D.x,
      y: D.y,
      width: 0,
      height: D.h,
    }),
    te = a("g", { class: "tile-orange", "clip-path": "url(#backup-bar-clip)" });
  (te.appendChild(ot), t.appendChild(te));
  const ee = a("text", {
    class: "copy-remain",
    x: r,
    y: C,
    "font-size": c.typography.labelSize,
    "text-anchor": "start",
    "dominant-baseline": "middle",
  });
  (t.appendChild(ee), nt(e, t));
  const Ve = v * Qt;
  let ne = !1,
    xt = 0,
    ie = 0,
    Nt = 0,
    Ct = 0;
  function se(V) {
    const H = Pe(V),
      K = Math.floor((H - 1) / 3),
      X = (H + K) * Ve;
    (q.setCenter(r + X / 2, A),
      G.setAttribute("x", String(r + X + v * 0.45)),
      G.setAttribute("y", String(A)));
  }
  function Ge(V, H) {
    for (let K = 0; K < U.length; K++) {
      const X = U[K];
      if (!X) continue;
      const At = (((V / nn + K / qt) % 1) + 1) % 1,
        Q = H ? At : (K + 0.35) / qt,
        wt = Dn(L.a, L.c, L.b, Q),
        Ft = le + (on - le) * Q,
        _t = Q < 0.1 ? Q / 0.1 : Q > 0.9 ? (1 - Q) / 0.1 : 1;
      (X.setAttribute("transform", `translate(${wt.x} ${wt.y}) rotate(${Ft})`),
        X.setAttribute("opacity", String(_t)));
    }
  }
  function Pt(V, H = 0, K = 0, X = !0) {
    const At = V >= ct,
      Q = Math.min(1, V / ct),
      wt = Bn(V),
      Ft = Math.max(0, Math.ceil(en * (1 - Q))),
      _t = Ut + ie * rn,
      Ye = X ? 0.72 + 0.28 * (0.5 + 0.5 * Math.sin((H / 800) * Math.PI)) : 1;
    (se(_t),
      q.setValue(_t, K, !X),
      ($.textContent = zt[wt] ?? zt[0]),
      $.setAttribute("opacity", String(At || !X ? 1 : zn(V))),
      (ee.textContent = `${Ft} HOURS REMAINING`),
      Ie(ot, D, Q),
      ot.setAttribute("opacity", String(Ye)),
      Ge(H, X && !At));
  }
  function ae(V) {
    if (!ne) return;
    const H = Ct ? Math.min(0.05, (V - Ct) / 1e3) : 0;
    Ct = V;
    const K = xt >= ct;
    if (B) {
      Pt(ct * 0.04, V, H, !1);
      return;
    }
    (K || ((xt = Math.min(ct, xt + H * 1e3)), (ie += H)),
      Pt(xt, V, H, !0),
      K || (Nt = requestAnimationFrame(ae)));
  }
  (et(t, (V) => {
    ((ne = V),
      V
        ? ((Ct = 0), (Nt = requestAnimationFrame(ae)))
        : cancelAnimationFrame(Nt));
  }),
    se(Ut),
    Pt(B ? ct * 0.04 : 0, 0, 0, !B));
}
function Gn(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Table sizes in an imagined database",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = [];
  for (const _ of Lt()) {
    const { spec: M, rect: f, tone: v } = _;
    if (f.w < 8 || f.h < 8) continue;
    const o = a("g");
    Ot(o, f, v);
    const S = Ce(!!M.big),
      w = M.name.toUpperCase(),
      T = be(M.start),
      O = f.x + f.w / 2,
      k = Xt(w, T, S, f),
      R = k || En(w, S, f);
    let l = null;
    if (R) {
      const A = a("text", {
        class: "tile-name",
        x: O,
        y: qe(f, S, k),
        "font-size": S,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      if (((A.textContent = w), o.appendChild(A), M.big)) {
        const u = ["EVENTS", "CHONKER"];
        let p = 0;
        o.addEventListener("click", () => {
          ((p = 1 - p), (A.textContent = u[p] ?? "EVENTS"));
        });
      }
    }
    (k &&
      ((l = new Fe(o, i, {
        fontSize: S,
        initial: M.start,
        maxValue: M.start * 100,
      })),
      l.setCenter(O, Ue(f, S)),
      l.setValue(M.start, 0, !0)),
      t.appendChild(o),
      n.push({ spec: M, rect: f, counter: l }));
  }
  nt(e, t);
  let s = !1,
    r = 0,
    g = 0,
    h = 0;
  function y(_, M, f) {
    for (const v of n) {
      if (!v.counter) continue;
      const o = Mn(v.spec, _),
        S = Ce(!!v.spec.big),
        w = be(o);
      (v.counter.setVisible(Xt(v.spec.name.toUpperCase(), w, S, v.rect)),
        v.counter.setValue(o, M, f || B));
    }
  }
  function d(_) {
    if (!s) return;
    const M = h ? Math.min(0.05, (_ - h) / 1e3) : 1 / 60;
    ((h = _), (r += M * 1e3), y(r, M, B), (g = requestAnimationFrame(d)));
  }
  function b() {
    (cancelAnimationFrame(g), (h = 0), (g = requestAnimationFrame(d)));
  }
  (et(t, (_) => {
    ((s = _), _ ? b() : cancelAnimationFrame(g));
  }),
    y(r, 0, !0));
}
function qe(e, t, i) {
  const n = e.y + e.h / 2;
  if (!i) return n;
  const s = t + jt + t;
  return n - s / 2 + t / 2;
}
function Ue(e, t) {
  const i = e.y + e.h / 2,
    n = t + jt + t;
  return i + n / 2 - t / 2;
}
const Yn = [
    "SELECT * FROM orders WHERE total > 99",
    "SELECT name, plan FROM users LIMIT 20",
    "UPDATE products SET stock = stock - 1",
    "SELECT * FROM comments WHERE post_id = 7",
    "INSERT INTO reviews (stars) VALUES (5)",
    "SELECT * FROM invoices OFFSET 200",
    "DELETE FROM sessions WHERE idle",
    "SELECT slug FROM pages WHERE published",
    "SELECT * FROM media WHERE mime = 'png'",
    "SELECT id FROM teams LIMIT 12",
    "SELECT * FROM tags ORDER BY name",
    "SELECT * FROM roles WHERE name = 'admin'",
    "SELECT * FROM plans WHERE price > 0",
    "SELECT * FROM posts WHERE published",
    "UPDATE users SET last_seen = now()",
    "SELECT email FROM accounts WHERE id = 4",
    "INSERT INTO carts (user_id) VALUES (9)",
    "SELECT count(*) FROM reviews",
    "SELECT sku FROM products WHERE active",
    "UPDATE invoices SET paid = true",
    "SELECT * FROM posts LIMIT 15",
    "SELECT * FROM orders ORDER BY id DESC",
  ],
  Hn = [
    "SELECT * FROM events",
    "SELECT * FROM events ORDER BY ts",
    "SELECT count(*) FROM events",
    "SELECT * FROM events WHERE type = 'click'",
    "SELECT DISTINCT user_id FROM events",
    "SELECT * FROM events OFFSET 900000",
  ];
function We(e) {
  const t = e.toLowerCase();
  if (t === "events") return "orange";
  const i = mt.filter((r) => !r.big),
    n = i.findIndex((r) => r.name === t);
  if (n >= 0) return dt[n % dt.length] ?? "gray";
  const s = ["sessions", "carts"].indexOf(t);
  return s >= 0 ? (dt[(i.length + s) % dt.length] ?? "gray") : "gray";
}
function De() {
  const e = [...mt.map((t) => t.name), "sessions", "carts"]
    .sort((t, i) => i.length - t.length)
    .join("|");
  return new RegExp(`\\b(${e})\\b`, "gi");
}
function Kn(e, t) {
  for (; e.firstChild; ) e.removeChild(e.firstChild);
  const i = De();
  let n = 0,
    s;
  for (; (s = i.exec(t)); ) {
    s.index > n && e.appendChild(document.createTextNode(t.slice(n, s.index)));
    const r = a("tspan", { class: `query-table-${We(s[0])}` });
    ((r.textContent = s[0]), e.appendChild(r), (n = s.index + s[0].length));
  }
  n < t.length && e.appendChild(document.createTextNode(t.slice(n)));
}
function Xn(e) {
  const t = De().exec(e);
  return t != null && t[0] ? We(t[0]) : "gray";
}
function jn(e) {
  const t = Math.abs(e);
  return t < 1
    ? 1 - 0.58 * t
    : t < 2
      ? 0.42 - 0.26 * (t - 1)
      : t < 2.5
        ? 0.16 * (1 - (t - 2) / 0.5)
        : 0;
}
function _e(e, t) {
  const i = e.filter((r) => !t.has(r)),
    n = i.length > 0 ? i : e,
    s = n[Math.floor(Math.random() * n.length)] ?? e[0] ?? "";
  return (t.add(s), s);
}
function Qn() {
  return me + Math.random() * (fn - me);
}
function Jn() {
  const e = new Set(),
    t = new Set(),
    i = () => ({ sql: _e(Yn, e), slow: !1, ms: Qn() }),
    n = () => ({ sql: _e(Hn, t), slow: !0, ms: gn }),
    s = Array.from({ length: 4 }, i),
    r = 1 + Math.floor(Math.random() * Math.max(1, s.length - 1));
  return (s.splice(r, 0, n()), s);
}
function Be(e, t = 12) {
  for (; e.queries.length < e.target + t; ) e.queries.push(...Jn());
}
function Zn(e) {
  const i = (P - Y * (Ht - 1)) / Ht;
  return { x: e * (i + Y), y: 0, w: i, h: F };
}
function Se(e) {
  return e.ms;
}
function ti(e) {
  ((e.queries = []),
    (e.target = ge),
    (e.scroll.value = ge),
    (e.scroll.vel = 0),
    (e.runningSince = 0),
    (e.bound = e.labels.map(() => -1)),
    Be(e));
}
function ei(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Two connections stuck on slow queries against events",
  });
  ((t.style.background = c.css.background),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const i = a("defs");
  t.appendChild(i);
  const n = lt * pn,
    s = (F - n) / 2,
    r = s + fe * lt,
    g = r + lt / 2,
    h = [];
  for (let o = 0; o < Ht; o++) {
    const S = Zn(o),
      w = `conn-clip-${o}`,
      T = `conn-fill-clip-${o}`,
      O = a("clipPath", { id: w });
    (O.appendChild(a("rect", { x: S.x, y: s, width: S.w, height: n })),
      i.appendChild(O));
    const k = { x: S.x + 1, y: r + 1, w: S.w - 2, h: lt - 2 },
      R = a("clipPath", { id: T });
    (R.appendChild(a("rect", { x: k.x, y: k.y, width: k.w, height: k.h })),
      i.appendChild(R));
    const l = a("g", { class: "tile-gray", "clip-path": `url(#${T})` }),
      A = a("rect", {
        class: "query-progress",
        x: k.x,
        y: k.y,
        width: 0,
        height: k.h,
      });
    (l.appendChild(A), t.appendChild(l));
    const u = a("g", { "clip-path": `url(#${w})` }),
      p = [];
    for (let x = 0; x < yn; x++) {
      const E = a("text", {
        class: "query-sql",
        x: S.x + mn,
        y: 0,
        "font-size": gt,
        "text-anchor": "start",
        "dominant-baseline": "middle",
      });
      (u.appendChild(E), p.push(E));
    }
    t.appendChild(u);
    const C = a("rect", {
      class: "query-active-border query-tone-gray",
      x: S.x + 1,
      y: r + 1,
      width: S.w - 2,
      height: lt - 2,
    });
    t.appendChild(C);
    const m = {
      queries: [],
      labels: p,
      bound: p.map(() => -1),
      border: C,
      fill: A,
      fillWrap: l,
      slot: k,
      scroll: { value: 0, vel: 0 },
      target: 0,
      runningSince: 0,
    };
    (ti(m), h.push(m));
  }
  nt(e, t);
  let y = !1,
    d = 0,
    b = 0;
  function _(o, S, w) {
    const T = Math.max(0, Math.round(o.scroll.value) - fe - 2);
    for (let u = 0; u < o.labels.length; u++) {
      const p = o.labels[u];
      if (!p) continue;
      const C = T + u,
        m = o.queries[C];
      if (!m) {
        ((p.style.display = "none"), (o.bound[u] = -1));
        continue;
      }
      (o.bound[u] !== C && (Kn(p, m.sql), (o.bound[u] = C)),
        (p.style.display = ""),
        p.setAttribute("y", String(g + (C - o.scroll.value) * lt)),
        p.setAttribute("opacity", String(jn(C - o.scroll.value))));
    }
    const O = o.queries[o.target],
      k = o.queries[Math.round(o.scroll.value)] ?? O,
      R = k ? Xn(k.sql) : "gray";
    (o.border.setAttribute("class", `query-active-border query-tone-${R}`),
      o.fillWrap.setAttribute("class", `tile-${R}`));
    const l = Math.abs(o.scroll.value - o.target) < ye;
    let A = 0;
    (w
      ? (A = O != null && O.slow ? 0.4 : 0)
      : l &&
        O &&
        o.runningSince &&
        (A = Math.min(1, (S - o.runningSince) / Se(O))),
      Ie(o.fill, o.slot, A));
  }
  function M(o, S, w) {
    if (
      (yt(o.scroll, o.target, w, !1),
      !(Math.abs(o.scroll.value - o.target) < ye))
    )
      return;
    o.runningSince || (o.runningSince = S);
    const O = o.queries[o.target];
    !O ||
      S - o.runningSince < Se(O) ||
      ((o.target += 1), (o.runningSince = 0), Be(o));
  }
  function f(o, S) {
    for (const w of h) _(w, o, S);
  }
  function v(o) {
    if (!y) return;
    const S = b ? Math.min(0.05, (o - b) / 1e3) : 1 / 60;
    if (((b = o), B)) {
      for (const w of h) {
        const T = Math.max(
          0,
          w.queries.findIndex((O) => O.slow),
        );
        ((w.target = T), (w.scroll.value = T));
      }
      f(o, !0);
      return;
    }
    for (const w of h) M(w, o, S);
    (f(o, !1), (d = requestAnimationFrame(v)));
  }
  (et(t, (o) => {
    ((y = o),
      o ? ((b = 0), (d = requestAnimationFrame(v))) : cancelAnimationFrame(d));
  }),
    f(0, !0));
}
function ni(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label":
      "Indexes keep accumulating until they push the events table off the page",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = Lt(F - at)[0];
  if (!n) return;
  const s = P / 3,
    r = a("clipPath", { id: "indexes-clip" });
  (r.appendChild(a("rect", { x: 0, y: 0, width: P, height: F })),
    i.appendChild(r));
  const g = a("g", { "clip-path": "url(#indexes-clip)" }),
    h = a("g");
  (g.appendChild(h), t.appendChild(g));
  const y = a("g");
  Ot(y, n.rect, "orange");
  const d = a("text", {
    class: "tile-name",
    x: n.rect.x + n.rect.w / 2,
    y: n.rect.y + n.rect.h / 2,
    "font-size": c.typography.titleSize,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  ((d.textContent = "EVENTS"), y.appendChild(d), h.appendChild(y));
  const b = Array.from({ length: pt }, (x, E) =>
    On(E, ft, F - at).map((L, U) => {
      const q = a("g");
      q.appendChild(
        a("rect", {
          class: "index-box",
          x: L.x,
          y: L.y,
          width: L.w,
          height: L.h,
        }),
      );
      const G = a("text", {
        class: "tuple-label",
        x: L.x + Bt,
        y: L.y + L.h / 2,
        "font-size": gt,
        "text-anchor": "start",
        "dominant-baseline": "middle",
      });
      return (
        (G.textContent = cn[E * ft + U] ?? ""),
        q.appendChild(G),
        h.appendChild(q),
        q
      );
    }),
  );
  nt(e, t);
  const _ = (x) => -x * s,
    M = pt * ft,
    f = { value: 0, vel: 0 };
  let v = 0,
    o = de,
    S = 0,
    w = 0,
    T = "add",
    O = 0,
    k = !1,
    R = 0,
    l = 0;
  function A(x) {
    return Math.min(pt - 1, Math.floor((x + ln) / ft));
  }
  function u() {
    ((o = de),
      (S = 0),
      (w = 0),
      (T = "add"),
      (O = 0),
      (v = 0),
      (f.value = 0),
      (f.vel = 0),
      (l = 0),
      C(!0));
  }
  function p(x, E, L) {
    if (!L) return 1;
    const U = x * ft + E;
    let q = 0;
    return (
      U < o ? (q = 1) : T === "add" && U === o && (q = Math.min(1, S / ue)),
      T === "rewind" && (q *= 1 - Math.min(1, w / he)),
      q
    );
  }
  function C(x = !0) {
    var E;
    h.setAttribute("transform", `translate(${x ? f.value : _(pt - 1)} 0)`);
    for (let L = 0; L < b.length; L++) {
      const U = b[L];
      if (U)
        for (let q = 0; q < U.length; q++)
          (E = U[q]) == null || E.setAttribute("opacity", String(p(L, q, x)));
    }
  }
  function m(x) {
    if (!k) return;
    const E = l ? Math.min(0.05, (x - l) / 1e3) : 0;
    if (((l = x), B)) {
      C(!1);
      return;
    }
    if (
      (T === "rewind"
        ? (v = 0)
        : T === "hold"
          ? (v = _(pt - 1))
          : (v = _(A(o))),
      yt(f, v, E, !1),
      T === "hold")
    )
      x >= O && ((T = "rewind"), (w = 0));
    else if (T === "rewind") {
      w += E * 1e3;
      const L = w >= he,
        U = Math.abs(f.value) < 1 && Math.abs(f.vel) < 12;
      L && U && ((f.value = 0), (f.vel = 0), u());
    } else
      o < M &&
        ((S += E * 1e3),
        S >= ue && ((o += 1), (S = 0), o >= M && ((T = "hold"), (O = x + dn))));
    (C(!0), (R = requestAnimationFrame(m)));
  }
  (bt(e, u),
    et(t, (x) => {
      ((k = x),
        x
          ? ((l = 0), (R = requestAnimationFrame(m)))
          : cancelAnimationFrame(R));
    }),
    C(!B));
}
function it(e) {
  return P / 2 - Rt / 2 - e * Gt;
}
function ze() {
  return (Rt - vt * 2) * (2 / 3);
}
function Ee(e = 0) {
  const t = Vt - vt * 2,
    i = ze(),
    n = (Wt.length - 1) * Yt,
    s = (i - n) / Wt.reduce((g, h) => g + h, 0);
  let r = vt + e;
  return Wt.map((g) => {
    const h = { x: r, y: vt, w: g * s, h: t };
    return ((r += h.w + Yt), h);
  });
}
function ii(e) {
  (tt(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const t = a("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${P} ${F}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label":
      "A wide row fills most of a page so the next row has to take a new one",
  });
  t.style.background = c.css.background;
  const i = a("defs");
  (t.appendChild(i),
    t.appendChild(
      a("rect", { x: 0, y: 0, width: P, height: F, fill: c.css.background }),
    ));
  const n = a("clipPath", { id: "wide-clip" });
  (n.appendChild(a("rect", { x: 0, y: 0, width: P, height: F })),
    i.appendChild(n));
  const s = a("linearGradient", {
      id: "wide-edge",
      gradientUnits: "userSpaceOnUse",
      x1: 0,
      y1: 0,
      x2: P,
      y2: 0,
    }),
    r = [
      [0, 0],
      [0.12, 1],
      [0.88, 1],
      [1, 0],
    ];
  for (const [$, N] of r)
    s.appendChild(
      a("stop", { offset: $, "stop-color": "#ffffff", "stop-opacity": N }),
    );
  i.appendChild(s);
  const g = a("mask", { id: "wide-mask", maskUnits: "userSpaceOnUse" });
  (g.appendChild(
    a("rect", { x: 0, y: 0, width: P, height: F, fill: "url(#wide-edge)" }),
  ),
    i.appendChild(g));
  const h = a("g", { "clip-path": "url(#wide-clip)", mask: "url(#wide-mask)" }),
    y = a("g");
  (h.appendChild(y), t.appendChild(h));
  const d = (F - at - Vt) / 2,
    b = Ee(),
    _ = Ee(ze() + Yt),
    M = P / 2 - Rt / 2,
    f = new Map();
  function v($, N) {
    ($.setAttribute("x", String(N.x)),
      $.setAttribute("y", String(N.y)),
      $.setAttribute("width", String(N.w)),
      $.setAttribute("height", String(N.h)));
  }
  function o($, N) {
    $.setAttribute("class", N ? "wide-cell" : "wide-try");
  }
  function S($) {
    const N = a("g", { class: "tile-orange" });
    N.appendChild(
      a("rect", { class: "tile-box", x: 0, y: 0, width: Rt, height: Vt }),
    );
    const W = [];
    for (const I of b) {
      const D = a("rect", {
        class: "wide-try",
        x: I.x,
        y: I.y,
        width: I.w,
        height: I.h,
      });
      (D.setAttribute("opacity", "0"), N.appendChild(D), W.push(D));
    }
    y.appendChild(N);
    const z = { i: $, g: N, cells: W };
    return (f.set($, z), z);
  }
  function w($) {
    return f.get($) ?? S($);
  }
  const T = a("g"),
    O = _.map(($) => {
      const N = a("rect", {
        class: "wide-try",
        x: $.x,
        y: $.y,
        width: $.w,
        height: $.h,
      });
      return (N.setAttribute("opacity", "0"), T.appendChild(N), N);
    });
  (y.appendChild(T), nt(e, t));
  const k = { value: it(0), vel: 0 };
  let R = 0,
    l = 0,
    A = 0,
    u = 0,
    p = "write",
    C = !1,
    m = 0,
    x = 0;
  function E($, N, W) {
    for (let z = 0; z < $.cells.length; z++) {
      const I = $.cells[z];
      I && (o(I, W), I.setAttribute("opacity", z < N ? "1" : "0"));
    }
  }
  function L($, N = 0) {
    for (let W = 0; W < O.length; W++) {
      const z = O[W],
        I = _[W],
        D = b[W];
      !z ||
        !I ||
        !D ||
        (v(z, { x: I.x + (D.x - I.x) * N, y: I.y, w: I.w, h: I.h }),
        z.setAttribute("opacity", W < $ ? "1" : "0"));
    }
  }
  function U($ = !0) {
    const N = $ ? k.value : it(1);
    $ || (w(0), w(1), w(2));
    for (const [z, I] of f)
      (I.g.setAttribute("transform", `translate(${N + z * Gt} ${d})`),
        $ || E(I, z <= 1 ? Z : 0, !0));
    const W = !$ || p === "advance" ? M : N + R * Gt;
    (T.setAttribute("transform", `translate(${W} ${d})`),
      $ || T.setAttribute("opacity", "0"));
  }
  function q($) {
    var z;
    if (!C) return;
    const N = x ? Math.min(0.05, ($ - x) / 1e3) : 0;
    if (((x = $), B)) {
      U(!1);
      return;
    }
    (w(R), w(R + 1), R > 0 && w(R - 1));
    for (const I of [...f.keys()])
      I < R - 2 && ((z = f.get(I)) == null || z.g.remove(), f.delete(I));
    const W = it(R);
    if ((p !== "advance" && yt(k, W, N, !1), p === "write")) {
      if (((A += N * 1e3), A >= pe)) {
        ((A = 0), (l = Math.min(Z, l + 1)));
        const I = f.get(R);
        (I && E(I, l, !1), l >= Z && (p = "pause"));
      }
    } else if (p === "pause") {
      if (((A += N * 1e3), A >= un)) {
        const I = f.get(R);
        (I && E(I, Z, !0),
          (A = 0),
          (l = 0),
          L(0),
          T.setAttribute("opacity", "1"),
          (p = "try"));
      }
    } else if (p === "try")
      ((A += N * 1e3),
        A >= pe &&
          ((A = 0), (l = Math.min(Z, l + 1)), L(l), l >= Z && (p = "hold")));
    else if (p === "hold")
      ((A += N * 1e3),
        A >= hn && ((A = 0), (u = 0), (R += 1), (k.vel = 0), (p = "advance")));
    else if (p === "advance") {
      yt(k, it(R), N, !1);
      const I = it(R - 1),
        D = it(R),
        ht = I - D;
      if (
        ((u = ht === 0 ? 1 : Math.max(0, Math.min(1, (I - k.value) / ht))),
        L(Z, u),
        Math.abs(k.value - D) < 1 && Math.abs(k.vel) < 12)
      ) {
        ((k.value = D), (k.vel = 0));
        const ot = f.get(R);
        (ot && E(ot, Z, !0),
          L(0),
          T.setAttribute("opacity", "0"),
          (A = 0),
          (l = 0),
          (p = "pause"));
      }
    }
    (U(!0), (m = requestAnimationFrame(q)));
  }
  function G() {
    for (const [$, N] of [...f.entries()])
      $ > 1 ? (N.g.remove(), f.delete($)) : E(N, 0, !1);
    (w(0),
      w(1),
      L(0),
      T.setAttribute("opacity", "0"),
      (k.value = it(0)),
      (k.vel = 0),
      (R = 0),
      (l = 0),
      (A = 0),
      (u = 0),
      (p = "write"),
      (x = 0),
      U(!0));
  }
  (bt(e, G),
    et(t, ($) => {
      ((C = $),
        $
          ? ((x = 0), (m = requestAnimationFrame(q)))
          : cancelAnimationFrame(m));
    }),
    w(0),
    w(1),
    T.setAttribute("opacity", "0"),
    U(!B));
}
function si() {
  const e = document.querySelector("#app");
  if (!e) return;
  const t = (location.hash || "#tables").slice(1);
  t === "vacuum"
    ? kn(e)
    : t === "partitioning"
      ? Tn(e)
      : t === "repack"
        ? Un(e)
        : t === "connections"
          ? ei(e)
          : t === "backups"
            ? Vn(e)
            : t === "indexes"
              ? ni(e)
              : t === "wide"
                ? ii(e)
                : Gn(e);
}
si();
