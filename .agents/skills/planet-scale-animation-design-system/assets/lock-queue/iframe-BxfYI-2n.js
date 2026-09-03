import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ const Se = "http://www.w3.org/2000/svg",
  W = "JetBrains Mono, ui-monospace, monospace",
  kt = 1504,
  Mt = 752,
  Rt = 1203,
  H = 16,
  ht = 16,
  ot = 96,
  xe = 5,
  Ot = 10,
  qt = Ot,
  st = 24,
  Ee = 0.62,
  U = 32,
  we = 80,
  Kt = 280,
  jt = 50,
  Jt = 900,
  ve = 1600,
  $e = 1700,
  Zt = 0.04,
  Ce = 500,
  te = 1200,
  Te = 120,
  ee = 40,
  re = 70,
  _t = 44,
  ke = 168,
  tt = 16,
  et = 20,
  Me = 172,
  Re = 170,
  qe = 24,
  _e = 180,
  Le = 27,
  Oe = 220,
  Ne = 30,
  rt = 220,
  ne = 0.025,
  i = {
    css: {
      background: "var(--diagram-bg, #FAFAFA)",
      foreground: "var(--diagram-fg, #111111)",
      accent: "var(--diagram-accent, #F35815)",
      blueAccent: "var(--diagram-blue, #144EB6)",
      greenAccent: "var(--diagram-green, #13862E)",
      redAccent: "var(--diagram-red, #D92038)",
      yellowAccent: "var(--diagram-yellow, #A78103)",
      connector: "var(--diagram-connector, #818181)",
    },
    light: {
      background: "#FAFAFA",
      foreground: "#111111",
      accent: "#F35815",
      blueAccent: "#144EB6",
      greenAccent: "#13862E",
      redAccent: "#D92038",
      yellowAccent: "#A78103",
      connector: "#818181",
    },
    dark: {
      background: "#111111",
      foreground: "#FAFAFA",
      accent: "#F35815",
      blueAccent: "#0E73CC",
      greenAccent: "#27B648",
      redAccent: "#FF455D",
      yellowAccent: "#F2B600",
      connector: "#818181",
    },
    typography: { labelSize: 30, labelWeight: "500" },
    stroke: { box: 2, connectorDashArray: "8 6" },
    opacity: { fill: 0.1, fillEmphasisDark: 0.25 },
  },
  ae = "SELECT * FROM orders WHERE id = 123",
  le = "ALTER TABLE orders ADD foo integer",
  ct = [
    "SELECT * FROM orders WHERE total > 99",
    "SELECT name FROM users LIMIT 20",
    "UPDATE products SET stock = stock - 1",
    "SELECT * FROM orders ORDER BY id DESC",
    "UPDATE orders SET status = 'paid'",
    "SELECT * FROM invoices OFFSET 200",
    "SELECT email FROM accounts",
    "SELECT * FROM orders WHERE id = 7",
    "INSERT INTO carts (user_id) VALUES (9)",
    "SELECT sku FROM products WHERE active",
    "UPDATE invoices SET paid = true",
    "SELECT * FROM orders WHERE id = 18",
    "SELECT id FROM users WHERE plan = 'pro'",
    "UPDATE carts SET qty = qty + 1",
    "SELECT * FROM invoices WHERE paid",
    "INSERT INTO orders (user_id) VALUES (3)",
  ],
  ue = {
    orders: "orange",
    users: "blue",
    products: "green",
    invoices: "gray",
    accounts: "blue",
    carts: "green",
  };
var ce;
const G =
  ((ce = window.matchMedia) == null
    ? void 0
    : ce.call(window, "(prefers-reduced-motion: reduce)").matches) ?? !1;
function p(r, n = {}) {
  const s = document.createElementNS(Se, r);
  for (const [l, a] of Object.entries(n)) s.setAttribute(l, String(a));
  return s;
}
function ie(r) {
  const n = Math.max(0, Math.min(1, r));
  return n * n * (3 - 2 * n);
}
function Ct(r, n, s, l, a = Re, b = qe) {
  const y = (n - r.value) * a - r.vel * b;
  ((r.vel += y * s), (r.value += r.vel * s));
}
function De(r, n) {
  return r.length * n * Ee;
}
const Pe = 2,
  Fe = 40;
function Ie(r) {
  let n = 0;
  for (const s of [ae, le, ...ct]) n = Math.max(n, De(s, r));
  return n;
}
const Lt = Math.ceil(H * 2 + Ie(i.typography.labelSize) + U * 2 + Pe * ot + Fe);
function We() {
  const r = Object.keys(ue)
    .sort((n, s) => s.length - n.length)
    .join("|");
  return new RegExp(`\\b(${r})\\b`, "gi");
}
function He(r, n) {
  for (; r.firstChild; ) r.removeChild(r.firstChild);
  const s = We();
  let l = 0,
    a;
  for (; (a = s.exec(n)); ) {
    a.index > l && r.appendChild(document.createTextNode(n.slice(l, a.index)));
    const b = ue[a[0].toLowerCase()] ?? "gray",
      y = p("tspan", { class: `query-table-${b}` });
    ((y.textContent = a[0]), r.appendChild(y), (l = a.index + a[0].length));
  }
  l < n.length && r.appendChild(document.createTextNode(n.slice(l)));
}
function Ue(r, n, s) {
  const l = n.w * Math.max(0, Math.min(1, s));
  (r.setAttribute("x", String(n.x)),
    r.setAttribute("y", String(n.y)),
    r.setAttribute("width", String(l)),
    r.setAttribute("height", String(n.h)));
}
function nt(r, n) {
  (r.setAttribute("x", String(n.x)),
    r.setAttribute("y", String(n.y)),
    r.setAttribute("width", String(n.w)),
    r.setAttribute("height", String(n.h)));
}
const de = 800;
function fe() {
  try {
    if (window.parent !== window)
      return (window.parent.innerWidth, window.parent);
  } catch {}
  return window;
}
function O() {
  return fe().innerWidth <= de;
}
function Ge(r) {
  const n = `(max-width: ${de}px)`,
    s = fe();
  (s.matchMedia(n).addEventListener("change", r),
    s.addEventListener("resize", r));
}
function at(r = !1) {
  return r ? Rt : Mt;
}
function lt(r = !1) {
  return r ? Lt : kt;
}
function ut(r = !1) {
  return r ? Ot : xe;
}
function dt(r = !1) {
  const n = at(r) - we;
  return { x: H, y: H, w: lt(r) - H * 2, h: n - H * 2 };
}
function it(r = !1) {
  const n = dt(r),
    s = ut(r),
    l = r ? 0 : _t,
    a = r ? 0 : ke,
    b = r ? 0 : Me,
    y = n.y + l,
    g = (n.h - l - ht * (s - 1)) / s;
  return Array.from({ length: s }, (w, x) => ({
    x: n.x + a,
    y: y + x * (g + ht),
    w: n.w - a - b,
    h: g,
  }));
}
function oe() {
  const r = new Set(),
    n = [];
  for (; n.length < qt; ) {
    const s = 14e3 + Math.floor(Math.random() * 16e3);
    r.has(s) || (r.add(s), n.push(s));
  }
  return n.sort((s, l) => s - l);
}
function ze() {
  return Jt + Math.random() * (ve - Jt);
}
function Be(r) {
  const n = ct.filter((a) => !r.has(a)),
    s = n.length > 0 ? n : ct,
    l = s[Math.floor(Math.random() * s.length)] ?? ct[0] ?? "";
  return (r.add(l), l);
}
function ft(r) {
  return { sql: Be(r), ms: ze(), kind: "ok" };
}
function se(r) {
  const n = new Set();
  return r === "error"
    ? [ft(n), ft(n), { sql: ae, ms: $e, kind: "error" }]
    : Array.from({ length: 8 }, () => ft(n));
}
function Ye(r) {
  const n = new Set(r.map((s) => s.sql));
  for (; r.length < 16; ) r.push(ft(n));
}
function Tt(r, n, s) {
  return r === "alter" && n ? 1 : r === "wait" && s ? 2 : 0;
}
function Qe(r, n, s, l, a) {
  return r === "error" && n
    ? "error"
    : (r === "alter" && s) || l
      ? "stuck"
      : a
        ? "releasing"
        : "working";
}
function Ve(r) {
  return r === "error"
    ? "red"
    : r === "stuck"
      ? "yellow"
      : r === "releasing"
        ? "green"
        : "gray";
}
function Xe(r) {
  return r === "error"
    ? "ERROR"
    : r === "stuck"
      ? "WAITING"
      : r === "releasing"
        ? "RELEASING"
        : "WORKING";
}
function Ke() {
  if (document.querySelector("#brand-diagram-styles")) return;
  const r = document.createElement("style");
  ((r.id = "brand-diagram-styles"),
    (r.textContent = `
    html, body, #app {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${i.css.background};
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
      width: min(100cqi, calc(100cqh * ${kt} / ${Mt}));
      aspect-ratio: ${kt} / ${Mt};
    }
    .compact .diagram-frame {
      width: min(100cqi, calc(100cqh * ${Lt} / ${Rt}));
      aspect-ratio: ${Lt} / ${Rt};
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
      color: ${i.css.accent};
      cursor: pointer;
      opacity: 0.7;
      font-family: ${W};
      font-size: 13px;
      font-weight: ${i.typography.labelWeight};
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
      --diagram-bg: ${i.light.background};
      --diagram-fg: ${i.light.foreground};
      --diagram-accent: ${i.light.accent};
      --diagram-blue: ${i.light.blueAccent};
      --diagram-green: ${i.light.greenAccent};
      --diagram-red: ${i.light.redAccent};
      --diagram-yellow: ${i.light.yellowAccent};
      --diagram-connector: ${i.light.connector};
    }
    @media (prefers-color-scheme: dark) {
      .brand-diagram-svg {
        --diagram-bg: ${i.dark.background};
        --diagram-fg: ${i.dark.foreground};
        --diagram-accent: ${i.dark.accent};
        --diagram-blue: ${i.dark.blueAccent};
        --diagram-green: ${i.dark.greenAccent};
        --diagram-red: ${i.dark.redAccent};
        --diagram-yellow: ${i.dark.yellowAccent};
        --diagram-connector: ${i.dark.connector};
      }
    }
    .tile-bg {
      fill: ${i.css.background};
    }
    .tile-box {
      fill-opacity: ${i.opacity.fill};
      stroke-width: ${i.stroke.box};
    }
    .tile-orange .tile-box {
      fill: ${i.css.accent};
      stroke: ${i.css.accent};
    }
    .tile-blue .tile-box {
      fill: ${i.css.blueAccent};
      stroke: ${i.css.blueAccent};
    }
    .tile-green .tile-box {
      fill: ${i.css.greenAccent};
      stroke: ${i.css.greenAccent};
    }
    .tile-gray .tile-box {
      fill: ${i.css.connector};
      stroke: ${i.css.connector};
    }
    .tile-red .tile-box {
      fill: ${i.css.redAccent};
      stroke: ${i.css.redAccent};
    }
    .tile-yellow .tile-box {
      fill: ${i.css.yellowAccent};
      stroke: ${i.css.yellowAccent};
    }
    .query-progress {
      pointer-events: none;
      fill-opacity: 0.175;
    }
    .tile-orange .query-progress {
      fill: ${i.css.accent};
    }
    .tile-blue .query-progress {
      fill: ${i.css.blueAccent};
    }
    .tile-green .query-progress {
      fill: ${i.css.greenAccent};
    }
    .tile-gray .query-progress {
      fill: ${i.css.connector};
    }
    .tile-red .query-progress {
      fill: ${i.css.redAccent};
    }
    .tile-yellow .query-progress {
      fill: ${i.css.yellowAccent};
    }
    .status-label {
      font-family: ${W};
      font-weight: ${i.typography.labelWeight};
      font-size: ${st}px;
    }
    .tile-gray .status-label {
      fill: ${i.css.connector};
    }
    .tile-green .status-label {
      fill: ${i.css.greenAccent};
    }
    .tile-red .status-label {
      fill: ${i.css.redAccent};
    }
    .tile-yellow .status-label {
      fill: ${i.css.yellowAccent};
    }
    .block-line {
      fill: none;
      stroke: ${i.css.yellowAccent};
      stroke-width: ${i.stroke.box};
      stroke-dasharray: ${i.stroke.connectorDashArray};
      stroke-linejoin: miter;
      stroke-linecap: square;
    }
    @media (prefers-color-scheme: dark) {
      .tile-orange .tile-box,
      .tile-green .tile-box,
      .tile-red .tile-box,
      .tile-yellow .tile-box {
        fill-opacity: ${i.opacity.fillEmphasisDark};
      }
      .query-progress {
        fill-opacity: 0.25;
      }
    }
    .col-header {
      font-family: ${W};
      font-weight: ${i.typography.labelWeight};
      font-size: ${st}px;
      fill: ${i.css.connector};
    }
    .pid-label {
      font-family: ${W};
      font-weight: ${i.typography.labelWeight};
      font-size: ${st}px;
    }
    .tile-gray .pid-label {
      fill: ${i.css.connector};
    }
    .tile-green .pid-label {
      fill: ${i.css.greenAccent};
    }
    .tile-red .pid-label {
      fill: ${i.css.redAccent};
    }
    .tile-yellow .pid-label {
      fill: ${i.css.yellowAccent};
    }
    .query-sql {
      font-family: ${W};
      font-weight: ${i.typography.labelWeight};
      fill: ${i.css.foreground};
    }
    .query-table-orange {
      fill: ${i.css.accent};
    }
    .query-table-blue {
      fill: ${i.css.blueAccent};
    }
    .query-table-green {
      fill: ${i.css.greenAccent};
    }
    .query-table-gray {
      fill: ${i.css.connector};
    }
    .compact .col-headers,
    .compact .pid-label,
    .compact .status-label {
      display: none;
    }
  `),
    document.head.appendChild(r));
}
function je(r, n) {
  const s = r.getBoundingClientRect(),
    l = n.innerHeight,
    a = n.innerWidth,
    b = Math.max(0, Math.min(s.bottom, l) - Math.max(s.top, 0)),
    y = Math.max(0, Math.min(s.right, a) - Math.max(s.left, 0)),
    m = s.width * s.height;
  return m > 0 && (b * y) / m >= 0.1;
}
function Je(r, n) {
  let s = !0,
    l;
  const a = () => {
    const m = s && document.visibilityState !== "hidden";
    m !== l && ((l = m), n(m));
  };
  document.addEventListener("visibilitychange", a);
  const b = window.parent !== window,
    y = window.frameElement;
  if (y) {
    const m = window.parent,
      g = () => {
        const w = y.getBoundingClientRect();
        w.width <= 0 || w.height <= 0 || ((s = je(y, m)), a());
      };
    (m.addEventListener("scroll", g, { passive: !0, capture: !0 }),
      m.addEventListener("resize", g));
    try {
      const w = m.IntersectionObserver;
      new w(g, { threshold: [0, 0.1, 1] }).observe(y);
    } catch {}
    g();
    return;
  }
  if (b) {
    ((s = !0), a());
    return;
  }
  if (!("IntersectionObserver" in window)) {
    ((s = !0), a());
    return;
  }
  (new IntersectionObserver(
    (m) => {
      const g = m.find((w) => w.target === r) ?? m[0];
      g &&
        (g.boundingClientRect.width <= 0 ||
          g.boundingClientRect.height <= 0 ||
          ((s = g.isIntersecting), a()));
    },
    { threshold: [0, 0.1] },
  ).observe(r),
    a());
}
function Ze(r, n) {
  const s = document.createElement("div");
  s.className = "diagram-frame";
  const l = document.createElement("div");
  ((l.className = "diagram-stage"),
    l.appendChild(n),
    s.appendChild(l),
    r.appendChild(s));
}
function tr(r, n) {
  if (G) return;
  const s = r.querySelector(".diagram-frame") ?? r,
    l = document.createElement("div");
  l.className = "replay-bar";
  const a = document.createElement("button");
  ((a.type = "button"),
    (a.className = "replay-btn"),
    a.setAttribute("aria-label", "Restart animation"));
  const b = document.createElement("span");
  ((b.className = "replay-icon"),
    b.setAttribute("aria-hidden", "true"),
    (b.textContent = "↻"));
  const y = document.createElement("span");
  ((y.textContent = "RESTART"),
    a.append(b, y),
    a.addEventListener("click", (m) => {
      (m.stopPropagation(), n());
    }),
    l.appendChild(a),
    s.appendChild(l));
}
function er(r) {
  (Ke(),
    document.documentElement.classList.add("brand-diagram-svg"),
    document.body.classList.add("brand-diagram-svg"));
  const n = p("svg", {
    class: "brand-diagram-svg",
    viewBox: `0 0 ${lt(O())} ${at(O())}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label":
      "A finished SELECT stays idle, a migration waits on it, and later queries queue behind the migration",
  });
  n.style.background = i.css.background;
  const s = p("defs");
  n.appendChild(s);
  const l = p("rect", {
    x: 0,
    y: 0,
    width: lt(O()),
    height: at(O()),
    fill: i.css.background,
  });
  n.appendChild(l);
  const a = O(),
    b = it(a),
    y = it(!0),
    m = ["error", "alter", ...Array.from({ length: qt - 2 }, () => "wait")],
    g = [];
  let w = oe();
  const x = b[0],
    gt = dt(a).y + (_t - ht) / 2,
    pt = p("g", { class: "col-headers" }),
    z = p("text", {
      class: "col-header",
      x: ((x == null ? void 0 : x.x) ?? 0) - tt,
      y: gt,
      "text-anchor": "end",
      "dominant-baseline": "middle",
    });
  z.textContent = "PROCESS ID";
  const B = p("text", {
    class: "col-header",
    x: ((x == null ? void 0 : x.x) ?? 0) + U,
    y: gt,
    "text-anchor": "start",
    "dominant-baseline": "middle",
  });
  B.textContent = "QUERY";
  const Y = p("text", {
    class: "col-header",
    x:
      ((x == null ? void 0 : x.x) ?? 0) +
      ((x == null ? void 0 : x.w) ?? 0) +
      et,
    y: gt,
    "text-anchor": "start",
    "dominant-baseline": "middle",
  });
  ((Y.textContent = "STATUS"), pt.append(z, B, Y), n.appendChild(pt));
  for (let t = 0; t < qt; t++) {
    const e = b[t] ?? y[t];
    if (!e) continue;
    const o = m[t] ?? "wait",
      c = `conn-clip-${t}`,
      u = `conn-fill-${t}`,
      f = p("clipPath", { id: c }),
      h = p("rect", { x: e.x, y: e.y, width: e.w, height: e.h });
    (f.appendChild(h), s.appendChild(f));
    const d = p("clipPath", { id: u }),
      v = p("rect", { x: e.x, y: e.y, width: e.w, height: e.h });
    (d.appendChild(v), s.appendChild(d));
    const S = p("g", { class: "tile-gray" }),
      k = p("text", {
        class: "pid-label",
        x: e.x - tt,
        y: e.y + e.h / 2,
        "text-anchor": "end",
        "dominant-baseline": "middle",
      });
    ((k.textContent = String(w[t] ?? 14e3 + t)), S.appendChild(k));
    const Z = p("rect", {
      class: "tile-bg",
      x: e.x,
      y: e.y,
      width: e.w,
      height: e.h,
    });
    S.appendChild(Z);
    const M = p("rect", {
      class: "tile-box",
      x: e.x,
      y: e.y,
      width: e.w,
      height: e.h,
    });
    S.appendChild(M);
    const $ = p("g", { class: "tile-gray", "clip-path": `url(#${u})` }),
      C = p("rect", {
        class: "query-progress",
        x: e.x,
        y: e.y,
        width: 0,
        height: e.h,
      });
    ($.appendChild(C), S.appendChild($));
    const L = p("g", { "clip-path": `url(#${c})` }),
      P = [];
    for (let Vt = 0; Vt < 2; Vt++) {
      const Xt = p("text", {
        class: "query-sql",
        x: e.x + U,
        y: e.y + e.h / 2,
        "font-size": st,
        "text-anchor": "start",
        "dominant-baseline": "middle",
      });
      (L.appendChild(Xt), P.push(Xt));
    }
    S.appendChild(L);
    const $t = p("text", {
      class: "status-label",
      x: e.x + e.w + et,
      y: e.y + e.h / 2,
      "text-anchor": "start",
      "dominant-baseline": "middle",
    });
    (($t.textContent = "WORKING"), S.appendChild($t), n.appendChild(S));
    const Ae = se(o);
    (g.push({
      role: o,
      home: e,
      pid: w[t] ?? 14e3 + t,
      pidLabel: k,
      queries: Ae,
      labels: P,
      bound: P.map(() => -1),
      bg: Z,
      box: M,
      fill: C,
      clipRect: h,
      fillClipRect: v,
      g: S,
      fillWrap: $,
      badge: $t,
      scroll: { value: 0, vel: 0 },
      depth: { value: 0, vel: 0 },
      slotY: { value: e.y, vel: 0 },
      target: 0,
      runningSince: 0,
      releasingUntil: 0,
      enterAt: t * jt,
      frozenProgress: 0,
      queued: !1,
      pendingStick: !1,
    }),
      t >= ut(a) && (S.style.display = "none"));
  }
  function Nt() {
    const t = p("path", { class: "block-line", d: "", opacity: "0" });
    return (n.appendChild(t), { path: t, drawT: 0, active: !1 });
  }
  const N = Nt(),
    Q = Array.from({ length: Ot - 2 }, Nt);
  Ze(r, n);
  let mt = !0,
    T = !1,
    A = !1,
    V = 0,
    F = 0,
    I = 0,
    X = 0,
    yt = "run",
    q = 0,
    D = 0,
    bt = 1 / 60,
    E = O();
  function R() {
    const t = ut(E);
    return g.filter((e, o) => o < t);
  }
  function Dt() {
    return R().filter((t) => t.role === "wait" && t.queued);
  }
  function At(t) {
    const e = it(E);
    R().forEach((o, c) => {
      const u = e[c];
      u && ((o.home = u), (o.slotY.value = u.y), (o.slotY.vel = 0));
    });
  }
  function Pt() {
    const t = ut(E);
    g.forEach((e, o) => {
      e.g.style.display = o < t ? "" : "none";
    });
  }
  function Ft() {
    ((mt = !0),
      (D = 0),
      cancelAnimationFrame(q),
      (q = requestAnimationFrame(J)));
  }
  function It(t = !1) {
    const e = O();
    if (!t && e === E) return;
    ((E = e),
      n.classList.toggle("compact", E),
      document.documentElement.classList.toggle("compact", E),
      document.body.classList.toggle("compact", E));
    const o = lt(E),
      c = at(E);
    (n.setAttribute("viewBox", `0 0 ${o} ${c}`),
      l.setAttribute("width", String(o)),
      l.setAttribute("height", String(c)),
      Pt(),
      At());
    const f = it(E)[0];
    if (f) {
      const h = dt(E).y + (_t - ht) / 2;
      (z.setAttribute("x", String(f.x - tt)),
        z.setAttribute("y", String(h)),
        B.setAttribute("x", String(f.x + U)),
        B.setAttribute("y", String(h)),
        Y.setAttribute("x", String(f.x + f.w + et)),
        Y.setAttribute("y", String(h)));
    }
    if (G) {
      (Yt(), j(performance.now(), !0));
      return;
    }
    t || (Bt(), Ft());
  }
  function Wt() {
    return 1;
  }
  function _(t) {
    const e = Math.max(0, t.depth.value);
    return {
      x: t.home.x + e * ot,
      y: t.slotY.value,
      w: Math.max(8, t.home.w - e * ot),
      h: t.home.h,
    };
  }
  function Ht(t) {
    var o;
    const e = ((o = g[0]) == null ? void 0 : o.home.x) ?? dt(E).x;
    return Math.round(e + ot * (t + 0.5));
  }
  function St(t) {
    const e = Tt(t.role, A, t.queued);
    return Math.abs(t.depth.value - e) < ne && Math.abs(t.depth.vel) < 10;
  }
  function xt(t) {
    return (
      Math.abs(t.slotY.value - t.home.y) < ne && Math.abs(t.slotY.vel) < 10
    );
  }
  function he() {
    const t = g.find((h) => h.role === "error"),
      e = g.find((h) => h.role === "alter");
    if (!t || !e) return "";
    const o = _(t),
      c = _(e),
      u = Ht(0),
      f = Math.round(c.y + c.h / 2);
    return `M ${u} ${Math.round(o.y + o.h)} L ${u} ${f} L ${Math.round(c.x)} ${f}`;
  }
  function ge(t) {
    const e = g.find((k) => k.role === "alter"),
      o = Dt(),
      c = o[t];
    if (!e || !c) return "";
    const u = _(e),
      f = _(c),
      h = Ht(1),
      d = t === 0 ? void 0 : o[t - 1],
      v = Math.round(t === 0 ? u.y + u.h : _(d).y + _(d).h / 2),
      S = Math.round(f.y + f.h / 2);
    return `M ${h} ${v} L ${h} ${S} L ${Math.round(f.x)} ${S}`;
  }
  function Et(t, e, o, c) {
    if (!o || !e) {
      ((t.active = !1),
        (t.drawT = 0),
        t.path.setAttribute("d", ""),
        t.path.setAttribute("opacity", "0"));
      return;
    }
    (t.active || ((t.active = !0), (t.drawT = 0)), t.path.setAttribute("d", e));
    let u = 0;
    try {
      u = t.path.getTotalLength();
    } catch {
      u = 0;
    }
    if (c || G) {
      ((t.drawT = rt),
        (t.path.style.strokeDasharray = ""),
        (t.path.style.strokeDashoffset = ""),
        t.path.setAttribute("opacity", "1"));
      return;
    }
    t.drawT = Math.min(rt, t.drawT + bt * 1e3);
    const f = ie(t.drawT / rt);
    (f >= 1
      ? ((t.path.style.strokeDasharray = ""),
        (t.path.style.strokeDashoffset = ""))
      : u > 0 &&
        ((t.path.style.strokeDasharray = `${u}`),
        (t.path.style.strokeDashoffset = `${u * (1 - f)}`)),
      t.path.setAttribute("opacity", "1"));
  }
  function K(t) {
    return t.active && t.drawT >= rt;
  }
  function Ut(t) {
    ((t.scroll.value = t.target), (t.scroll.vel = 0));
  }
  function Gt(t) {
    const e = t.queries[t.target];
    if ((e == null ? void 0 : e.kind) === "alter") return;
    const o = t.target + 1;
    (t.queries.splice(o, 0, { sql: le, ms: 0, kind: "alter" }),
      (t.target = o),
      (t.runningSince = 0),
      Ut(t));
  }
  function pe(t) {
    T || ((T = !0), (V = t));
  }
  function zt(t) {
    if (!A) return;
    const e = R().filter(
      (o) =>
        o.role === "wait" &&
        !o.queued &&
        o.releasingUntil <= t &&
        o.runningSince >= F &&
        o.runningSince > 0 &&
        t - o.runningSince >= re,
    );
    if (e.length)
      return (e.sort((o, c) => o.runningSince - c.runningSince), e[0]);
  }
  function wt(t, e) {
    return !T || e - V < te
      ? !1
      : t.role === "alter"
        ? !A
        : t.role === "wait" && A && !t.queued
          ? t === zt(e) && e - I >= ee
          : !1;
  }
  function vt(t, e) {
    if (
      ((t.releasingUntil = 0),
      (t.runningSince = 0),
      (t.frozenProgress = 0),
      (t.pendingStick = !1),
      t.role === "alter")
    ) {
      (Gt(t), (A = !0), (F = e), (I = e));
      return;
    }
    t.role === "wait" && !t.queued && (Ut(t), (t.queued = !0), (I = e));
  }
  function me(t) {
    if (!T) return;
    if (!A && t - V >= te) {
      const o = g.find((c) => c.role === "alter");
      o && (o.pendingStick = !0);
    }
    if (!A || t - I < ee) return;
    const e = zt(t);
    e && (e.pendingStick = !0);
  }
  function Bt() {
    ((T = !1),
      (A = !1),
      (V = 0),
      (F = 0),
      (I = 0),
      (X = 0),
      (yt = "run"),
      (D = 0),
      (bt = 1 / 60));
    for (const e of [N, ...Q])
      ((e.active = !1),
        (e.drawT = 0),
        e.path.setAttribute("d", ""),
        e.path.setAttribute("opacity", "0"));
    ((w = oe()),
      g.forEach((e, o) => {
        ((e.pid = w[o] ?? e.pid),
          (e.pidLabel.textContent = String(e.pid)),
          (e.queries = se(e.role)),
          (e.target = 0),
          (e.scroll.value = 0),
          (e.scroll.vel = 0),
          (e.depth.value = 0),
          (e.depth.vel = 0),
          (e.slotY.vel = 0),
          (e.runningSince = 0),
          (e.releasingUntil = 0),
          (e.frozenProgress = 0),
          (e.queued = !1),
          (e.pendingStick = !1),
          (e.bound = e.labels.map(() => -1)),
          (e.enterAt = o * jt));
      }),
      At(),
      Pt());
    const t = N.path.parentNode ? N.path : null;
    t && g.forEach((e) => n.insertBefore(e.g, t));
  }
  function Yt() {
    ((T = !0), (A = !0));
    for (const t of R()) {
      if (t.role === "error") {
        const e = Math.max(
          0,
          t.queries.findIndex((o) => o.kind === "error"),
        );
        ((t.target = e), (t.scroll.value = e));
      } else
        t.role === "alter"
          ? (Gt(t), (t.scroll.value = t.target))
          : (t.queued = !0);
      t.depth.value = Tt(t.role, !0, t.queued);
    }
    At();
  }
  function ye(t, e) {
    const o = Wt();
    if (G || e) return o;
    const c = X - t.enterAt;
    return c < 0 ? 0 : ie(Math.min(1, c / Kt)) * o;
  }
  function be(t, e, o) {
    const c = _(t),
      u = Qe(t.role, T, A, t.queued, t.releasingUntil > 0),
      f = Ve(u),
      h = ye(t, o);
    (t.g.setAttribute("class", `tile-${f}`),
      t.g.setAttribute("opacity", String(h)),
      t.fillWrap.setAttribute("class", `tile-${f}`),
      t.pidLabel.setAttribute("x", String(t.home.x - tt)),
      t.pidLabel.setAttribute("y", String(c.y + c.h / 2)),
      nt(t.bg, c),
      nt(t.box, c),
      nt(t.clipRect, c),
      nt(t.fillClipRect, c),
      t.badge.setAttribute("x", String(t.home.x + t.home.w + et)),
      t.badge.setAttribute("y", String(c.y + c.h / 2)),
      (t.badge.textContent = Xe(u)));
    const d = t.queries[t.target],
      v = c.y + c.h / 2,
      S = Math.max(0, Math.floor(t.scroll.value));
    for (let $ = 0; $ < t.labels.length; $++) {
      const C = t.labels[$];
      if (!C) continue;
      const L = S + $,
        P = t.queries[L];
      if (!P) {
        ((C.style.display = "none"), (t.bound[$] = -1));
        continue;
      }
      (t.bound[$] !== L && (He(C, P.sql), (t.bound[$] = L)),
        C.setAttribute("font-size", String(i.typography.labelSize)),
        (C.style.display = ""),
        C.setAttribute("x", String(c.x + U)),
        C.setAttribute("y", String(v + (L - t.scroll.value) * c.h)));
    }
    const k = Math.abs(t.scroll.value - t.target) < Zt,
      Z = u === "stuck";
    let M = 0;
    (Z
      ? (M = 0)
      : u === "error" || u === "releasing"
        ? (M = 1)
        : k &&
          d &&
          t.runningSince &&
          ((M = Math.min(1, (e - t.runningSince) / d.ms)),
          (t.frozenProgress = M)),
      Ue(t.fill, c, M));
  }
  function Qt(t, e, o, c) {
    const u = Tt(t.role, A, t.queued);
    if (
      (Ct(t.depth, u, o, c, _e, Le),
      Ct(t.slotY, t.home.y, o, c, Oe, Ne),
      Ct(t.scroll, t.target, o),
      (t.role === "error" && T) ||
        (t.role === "alter" && A) ||
        t.queued ||
        c ||
        X < t.enterAt + Kt)
    )
      return;
    if (t.releasingUntil) {
      e >= t.releasingUntil &&
        ((t.releasingUntil = 0),
        t.role === "alter" && (t.pendingStick || wt(t, e))
          ? vt(t, e)
          : ((t.target += 1), (t.runningSince = 0), Ye(t.queries)));
      return;
    }
    if (!(Math.abs(t.scroll.value - t.target) < Zt)) return;
    t.runningSince || (t.runningSince = e);
    const d = t.queries[t.target];
    if (
      t.role === "wait" &&
      A &&
      !t.queued &&
      (t.pendingStick || wt(t, e)) &&
      t.runningSince >= F &&
      e - t.runningSince >= re
    ) {
      vt(t, e);
      return;
    }
    if (!(!d || e - t.runningSince < d.ms)) {
      if (d.kind === "error") {
        pe(e);
        return;
      }
      if (t.role === "alter" && (t.pendingStick || wt(t, e))) {
        if (e - t.runningSince < d.ms + Te) return;
        vt(t, e);
        return;
      }
      (t.role === "wait" && A && t.runningSince >= F) ||
        (t.releasingUntil = e + Ce);
    }
  }
  function j(t, e) {
    const o = R();
    for (const h of o) be(h, t, e);
    pt.setAttribute("opacity", String(Wt()));
    const c = o.find((h) => h.role === "alter"),
      u = Dt(),
      f = !!(A && c && St(c) && xt(c));
    (Et(N, he(), f, e),
      Q.forEach((h, d) => {
        const v = u[d];
        if (!v) {
          Et(h, "", !1, !0);
          return;
        }
        const S = K(d === 0 ? N : Q[d - 1]),
          k = !!(v.queued && St(v) && xt(v) && (e || S));
        Et(h, ge(d), k, e);
      }));
  }
  function J(t) {
    if (!mt) return;
    const e = D ? Math.min(0.05, (t - D) / 1e3) : 1 / 60;
    if (((D = t), G)) {
      (Yt(), j(t, !0));
      return;
    }
    if (((bt = e), (X += e * 1e3), yt === "run")) {
      me(t);
      for (const d of R()) Qt(d, t, e, !1);
      const o = R(),
        c = o.filter((d) => d.role === "wait").every((d) => d.queued),
        u = o.every((d) => St(d) && xt(d)),
        f = o.filter((d) => d.role === "wait").length,
        h = K(N) && Q.slice(0, f).every((d) => K(d));
      T && A && c && u && h && (yt = "done");
    } else for (const o of R()) Qt(o, t, e, !1);
    (j(t, !1), (q = requestAnimationFrame(J)));
  }
  (tr(r, () => {
    (Bt(), Ft());
  }),
    Je(n, (t) => {
      ((mt = t),
        t
          ? ((D = 0), cancelAnimationFrame(q), (q = requestAnimationFrame(J)))
          : cancelAnimationFrame(q));
    }),
    It(!0),
    Ge(() => {
      It();
    }),
    j(0, !0),
    (q = requestAnimationFrame(J)));
}
function rr() {
  const r = document.querySelector("#app");
  r && er(r);
}
rr();
