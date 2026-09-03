var kt = Object.defineProperty;
var Lt = (h, a, t) =>
  a in h
    ? kt(h, a, { enumerable: !0, configurable: !0, writable: !0, value: t })
    : (h[a] = t);
var l = (h, a, t) => Lt(h, typeof a != "symbol" ? a + "" : a, t);
import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ import { g as y } from "./index-Brfk6Bdo.js";
const Et = "popular-arch",
  ut = document.querySelector("#app"),
  Tt = document.URL.split("#")[1],
  ft = Tt || Et;
if (ut) {
  const h = document.createElement("div");
  ((h.dataset.id = ft), ut.appendChild(h));
}
const Dt = "#00000000",
  p = {
    css: {
      background: "var(--diagram-bg, #FAFAFA)",
      foreground: "var(--diagram-fg, #111111)",
      accent: "var(--diagram-accent, #F35815)",
      blueAccent: "var(--diagram-blue, #144EB6)",
      greenAccent: "var(--diagram-green, #13862E)",
      connector: "var(--diagram-connector, #818181)",
      traffic: "var(--diagram-traffic, #F35815)",
    },
    light: {
      background: "#FAFAFA",
      foreground: "#111111",
      accent: "#F35815",
      blueAccent: "#144EB6",
      greenAccent: "#13862E",
      connector: "#818181",
      traffic: "#F35815",
    },
    dark: {
      background: "#111111",
      foreground: "#FAFAFA",
      accent: "#F35815",
      blueAccent: "#0E73CC",
      greenAccent: "#27B648",
      connector: "#818181",
      traffic: "#F35815",
    },
    typography: {
      fontFamily: "JetBrains Mono, monospace",
      labelWeight: 500,
      titleWeight: "bold",
    },
    stroke: {
      box: 2,
      databaseContour: 1.35,
      databaseDetail: 0.5,
      dashArray: "8 8",
      connectorDashArray: "8 6",
    },
    opacity: { fill: 0.1, hatch: 0.3 },
  },
  I = p.css.greenAccent,
  O = p.css.blueAccent,
  A = p.css.foreground,
  W = p.css.background,
  xt = p.css.connector,
  Pt = "none",
  F = 1.5,
  Rt = 1.2,
  J = 18 / 145;
function m(h) {
  return document.createElementNS("http://www.w3.org/2000/svg", h);
}
function Mt(h) {
  return new Promise((a) => {
    const t = document.querySelector(h);
    if (t) {
      a(t);
      return;
    }
    const i = new MutationObserver(() => {
      const e = document.querySelector(h);
      e && (i.disconnect(), a(e));
    });
    i.observe(document.documentElement, { childList: !0, subtree: !0 });
  });
}
function wt() {
  if (document.querySelector("#brand-diagram-styles")) return;
  const h = document.createElement("style");
  ((h.id = "brand-diagram-styles"),
    (h.textContent = `
    .brand-diagram-svg,
    .brand-diagram-canvas {
      --diagram-bg: ${p.light.background};
      --diagram-fg: ${p.light.foreground};
      --diagram-accent: ${p.light.accent};
      --diagram-blue: ${p.light.blueAccent};
      --diagram-green: ${p.light.greenAccent};
      --diagram-connector: ${p.light.connector};
      --diagram-traffic: ${p.light.traffic};
    }

    @media (prefers-color-scheme: dark) {
      .brand-diagram-svg,
      .brand-diagram-canvas {
        --diagram-bg: ${p.dark.background};
        --diagram-fg: ${p.dark.foreground};
        --diagram-accent: ${p.dark.accent};
        --diagram-blue: ${p.dark.blueAccent};
        --diagram-green: ${p.dark.greenAccent};
        --diagram-connector: ${p.dark.connector};
        --diagram-traffic: ${p.dark.traffic};
      }
    }
  `),
    document.head.appendChild(h));
}
function bt(h, a) {
  if (!("IntersectionObserver" in window)) {
    (a(!document.hidden),
      document.addEventListener("visibilitychange", () => a(!document.hidden)));
    return;
  }
  let t = !1,
    i;
  const e = () => {
    const s = t && !document.hidden;
    s !== i && ((i = s), a(s));
  };
  (new IntersectionObserver(
    ([s]) => {
      ((t = s.isIntersecting && s.intersectionRatio > 0), e());
    },
    { threshold: 0 },
  ).observe(h),
    document.addEventListener("visibilitychange", e),
    e());
}
class E {
  constructor(a, t, i) {
    l(this, "id");
    l(this, "dom");
    l(this, "trafficAnimations", []);
    l(this, "trafficGeneration", 0);
    ((this.id = a), (this.dom = this.setupDom(t, i)));
  }
  observePlaybackVisibility() {
    bt(this.dom, (a) => {
      a
        ? y.globalTimeline.paused(!1)
        : (y.globalTimeline.paused(!0), y.ticker.sleep());
    });
  }
  clearTrafficAnimations() {
    (this.trafficAnimations.forEach((a) => a.kill()),
      (this.trafficAnimations = []),
      this.trafficGeneration++);
  }
  scheduleTrafficLoop(a, t, i) {
    const e = this.trafficGeneration,
      r = y.delayedCall(a, () => {
        if (e !== this.trafficGeneration) return;
        const s = t();
        (s.eventCallback("onComplete", () => {
          e === this.trafficGeneration && this.scheduleTrafficLoop(i(), t, i);
        }),
          this.trafficAnimations.push(s));
      });
    this.trafficAnimations.push(r);
  }
  createLayer(a) {
    const t = m("g");
    return (
      t.setAttribute("id", `${this.id}-${a}`),
      this.dom.appendChild(t),
      t
    );
  }
  resetLayer(a, t) {
    return (a.remove(), this.createLayer(t));
  }
  setupDom(a, t) {
    wt();
    const i = m("svg");
    (i.setAttribute("id", `${this.id}SVG`),
      i.setAttribute("viewBox", `0 0 ${a} ${t}`),
      i.setAttribute("data-brand-style", "brand-diagram-v1"),
      i.classList.add("brand-diagram-svg"),
      (i.style.marginBottom = "0.35em"));
    const e = document.querySelector(`[data-id="${this.id}"]`);
    return (
      e == null || e.appendChild(i),
      y.set(`#${this.id}SVG`, {
        width: "100%",
        height: "100%",
        backgroundColor: p.css.background,
      }),
      i
    );
  }
}
class Bt {
  constructor(a, t, i) {
    l(this, "id");
    l(this, "width");
    l(this, "height");
    l(this, "canvas");
    l(this, "context");
    ((this.id = a),
      (this.width = t),
      (this.height = i),
      (this.canvas = this.setupDom()));
    const e = this.canvas.getContext("2d");
    if (!e) throw new Error("Canvas rendering context unavailable");
    this.context = e;
  }
  observePlaybackVisibility() {
    bt(this.canvas, (a) => this.setPlaying(a));
  }
  setPlaying(a) {}
  setupDom() {
    wt();
    const a = document.createElement("canvas"),
      t = document.querySelector(`[data-id="${this.id}"]`);
    (t == null || t.appendChild(a),
      a.classList.add("brand-diagram-canvas"),
      (a.style.width = "100%"),
      (a.style.height = "auto"),
      (a.style.aspectRatio = `${this.width} / ${this.height}`),
      (a.style.display = "block"),
      (a.style.marginBottom = "0.35em"),
      (a.style.backgroundColor = p.css.background));
    const i = window.devicePixelRatio || 1;
    ((a.width = this.width * i), (a.height = this.height * i));
    const e = a.getContext("2d");
    return (e == null || e.scale(i, i), a);
  }
}
class Ot {
  constructor(a, t, i, e, r = {}) {
    l(this, "id");
    l(this, "start");
    l(this, "end");
    l(this, "options");
    l(this, "points");
    l(this, "dom");
    ((this.id = t),
      (this.start = i),
      (this.end = e),
      (this.options = {
        stroke: r.stroke ?? xt,
        strokeWidth: r.strokeWidth ?? 2,
        segmentCount: r.segmentCount ?? 3,
        animatedDash: r.animatedDash ?? !1,
        arrowEnd: r.arrowEnd ?? !1,
        orientation: r.orientation ?? "horizontal-first",
        midPoint: r.midPoint ?? 0.5,
      }));
    const s = this.calculatePoints();
    ((this.points = this.options.arrowEnd ? It(s, 8) : s),
      (this.dom = this.draw(a)));
  }
  calculatePoints() {
    if (this.start.x === this.end.x || this.start.y === this.end.y)
      return [this.start, this.end];
    if (this.options.segmentCount === 2)
      return this.options.orientation === "vertical-first"
        ? [this.start, { x: this.start.x, y: this.end.y }, this.end]
        : [this.start, { x: this.end.x, y: this.start.y }, this.end];
    if (this.options.orientation === "vertical-first") {
      const t =
        this.start.y + (this.end.y - this.start.y) * this.options.midPoint;
      return [
        this.start,
        { x: this.start.x, y: t },
        { x: this.end.x, y: t },
        this.end,
      ];
    }
    const a =
      this.start.x + (this.end.x - this.start.x) * this.options.midPoint;
    return [
      this.start,
      { x: a, y: this.start.y },
      { x: a, y: this.end.y },
      this.end,
    ];
  }
  draw(a) {
    const t = m("path");
    return (
      t.setAttribute("id", this.id),
      this.options.arrowEnd && t.setAttribute("marker-end", "url(#arrowhead)"),
      t.setAttribute("stroke-dasharray", p.stroke.connectorDashArray),
      a.appendChild(t),
      y.set(`#${this.id}`, {
        attr: { d: N(this.points) },
        fill: "none",
        stroke: this.options.stroke,
        strokeWidth: this.options.strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: 1,
      }),
      this.options.animatedDash &&
        y.to(`#${this.id}`, {
          attr: { "stroke-dashoffset": -14 },
          duration: 0.9,
          ease: "none",
          repeat: -1,
        }),
      t
    );
  }
}
class b {
  constructor(a) {
    l(this, "dom");
    ((this.dom = m("g")), a.appendChild(this.dom));
  }
  addLabel(a, t, i, e, r = A, s = 18) {
    const n = m("text");
    (n.setAttribute("id", a),
      n.setAttribute("dominant-baseline", "middle"),
      n.setAttribute("text-anchor", "middle"),
      this.dom.appendChild(n));
    const o = t.split(`
`);
    return (
      o.forEach((d, u) => {
        const c = m("tspan");
        ((c.textContent = d),
          c.setAttribute("x", "0"),
          c.setAttribute(
            "dy",
            u === 0 ? `${-((o.length - 1) * s * 1.2) / 2}` : `${s * 1.2}`,
          ),
          n.appendChild(c));
      }),
      y.set(`#${a}`, {
        x: i,
        y: e,
        fill: r,
        fontFamily: p.typography.fontFamily,
        fontSize: s,
        fontWeight: p.typography.labelWeight,
        userSelect: "none",
      }),
      n
    );
  }
  colorForNode(a, t = A) {
    const i = a.toLowerCase();
    return i.includes("database") ||
      i.includes("postgres") ||
      i.includes("replica") ||
      i.includes("primary")
      ? p.css.blueAccent
      : i.includes("client")
        ? p.css.connector
        : i.includes("app") ||
            i.includes("server") ||
            i.includes("proxy") ||
            i.includes("bouncer") ||
            i.includes("nlb") ||
            t === A
          ? p.css.greenAccent
          : t;
  }
  drawSharpBox(a, t, i = A) {
    return this.drawBrandBox(a, t, {
      stroke: this.colorForNode(t, i),
      labelColor: p.css.foreground,
      labelFontSize: Math.min(
        20,
        Math.max(13, Math.floor(Math.min(a.width, a.height) * 0.18)),
      ),
      inset: Math.min(
        8,
        Math.max(4, Math.floor(Math.min(a.width, a.height) * 0.08)),
      ),
      hatched: t.toLowerCase().includes("app"),
    });
  }
  drawBrandBox(a, t, i = {}) {
    const e = i.stroke ?? p.css.accent,
      r = i.fillOpacity ?? p.opacity.fill,
      s = i.labelColor ?? p.css.foreground,
      n = i.labelFontSize ?? 20,
      o = i.inset ?? 8,
      d = m("rect");
    (d.setAttribute("id", a.id),
      this.dom.appendChild(d),
      y.set(`#${a.id}`, {
        attr: { x: a.x, y: a.y, width: a.width, height: a.height },
        fill: Dt,
        stroke: e,
        strokeWidth: p.stroke.box,
      }));
    const u = m("rect");
    return (
      u.setAttribute("id", `${a.id}-inset`),
      this.dom.appendChild(u),
      y.set(`#${a.id}-inset`, {
        attr: {
          x: a.x + o,
          y: a.y + o,
          width: a.width - o * 2,
          height: a.height - o * 2,
          "stroke-dasharray": p.stroke.dashArray,
        },
        fill: e,
        fillOpacity: r,
        stroke: e,
        strokeWidth: p.stroke.box,
      }),
      i.hatched &&
        this.drawHatch(
          `${a.id}-hatch`,
          a.x + o,
          a.y + o,
          a.width - o * 2,
          a.height - o * 2,
          e,
        ),
      t &&
        this.addLabel(
          `${a.id}-label`,
          t.toUpperCase(),
          a.x + a.width / 2,
          a.y + a.height / 2,
          s,
          n,
        ),
      d
    );
  }
  drawHatch(a, t, i, e, r, s = p.css.accent) {
    const n = `${a}-clip`,
      o = m("clipPath");
    o.setAttribute("id", n);
    const d = m("rect");
    (d.setAttribute("x", `${t}`),
      d.setAttribute("y", `${i}`),
      d.setAttribute("width", `${e}`),
      d.setAttribute("height", `${r}`),
      o.appendChild(d),
      this.dom.appendChild(o));
    const u = m("g");
    (u.setAttribute("id", a),
      u.setAttribute("clip-path", `url(#${n})`),
      this.dom.appendChild(u));
    for (let c = -r; c <= e + r; c += 10) {
      const g = m("line");
      (u.appendChild(g),
        y.set(g, {
          attr: { x1: t + c, y1: i + r, x2: t + c + r, y2: i },
          stroke: s,
          strokeOpacity: p.opacity.hatch,
          strokeWidth: 1,
        }));
    }
    return u;
  }
  drawDatabase(
    a,
    t,
    i = p.css.blueAccent,
    e = p.css.background,
    r = 18,
    s = p.css.foreground,
  ) {
    const n = m("path");
    (n.setAttribute("id", a.id), this.dom.appendChild(n));
    const o = a.width * J,
      d = a.y + o,
      u = a.y + a.height - o,
      c = [
        `M ${a.x} ${d}`,
        `L ${a.x} ${u}`,
        `A ${a.width / 2} ${o} 0 0 0 ${a.x + a.width} ${u}`,
        `L ${a.x + a.width} ${d}`,
        `A ${a.width / 2} ${o} 0 0 1 ${a.x} ${d}`,
      ].join(" ");
    y.set(`#${a.id}`, {
      attr: { d: c },
      fill: e,
      stroke: i,
      strokeWidth: p.stroke.databaseContour,
      strokeLinecap: "round",
    });
    const g = m("ellipse");
    (g.setAttribute("id", `${a.id}-top`),
      this.dom.appendChild(g),
      y.set(`#${a.id}-top`, {
        attr: { cx: a.x + a.width / 2, cy: d, rx: a.width / 2, ry: o },
        fill: e,
        stroke: i,
        strokeWidth: p.stroke.databaseContour,
        strokeLinecap: "round",
      }));
    const f = `${a.id}-top-clip`,
      x = m("clipPath");
    x.setAttribute("id", f);
    const $ = m("ellipse");
    (y.set($, {
      attr: { cx: a.x + a.width / 2, cy: d, rx: a.width / 2, ry: o },
    }),
      x.appendChild($),
      this.dom.appendChild(x));
    const S = m("g");
    (S.setAttribute("id", `${a.id}-top-details`),
      S.setAttribute("clip-path", `url(#${f})`),
      this.dom.appendChild(S));
    const M = Math.max(11, a.width / 10);
    for (let v = -o * 2; v <= a.width + o * 2; v += M) {
      const D = m("line");
      (S.appendChild(D),
        y.set(D, {
          attr: {
            x1: a.x + v + o * 1.3,
            y1: d - o,
            x2: a.x + v - o * 1.3,
            y2: d + o,
          },
          stroke: i,
          strokeWidth: p.stroke.databaseDetail,
          strokeLinecap: "round",
        }));
    }
    if (t) {
      const D = (d + o + a.y + a.height) / 2;
      this.addLabel(
        `${a.id}-label`,
        t.toUpperCase(),
        a.x + a.width / 2,
        D,
        s,
        r,
      );
    }
    return n;
  }
  drawCloud(a, t, i = p.css.accent) {
    const e = m("path");
    (e.setAttribute("id", a.id), this.dom.appendChild(e));
    const r = a.x,
      s = a.y,
      n = a.width,
      o = a.height,
      d = [
        `M ${r + n * 0.22} ${s + o * 0.72}`,
        `C ${r + n * 0.04} ${s + o * 0.72}, ${r + n * 0.04} ${s + o * 0.44}, ${r + n * 0.23} ${s + o * 0.44}`,
        `C ${r + n * 0.26} ${s + o * 0.2}, ${r + n * 0.48} ${s + o * 0.14}, ${r + n * 0.58} ${s + o * 0.32}`,
        `C ${r + n * 0.78} ${s + o * 0.25}, ${r + n * 0.94} ${s + o * 0.4}, ${r + n * 0.86} ${s + o * 0.61}`,
        `C ${r + n * 0.95} ${s + o * 0.68}, ${r + n * 0.89} ${s + o * 0.84}, ${r + n * 0.73} ${s + o * 0.84}`,
        `L ${r + n * 0.22} ${s + o * 0.84}`,
        `C ${r + n * 0.1} ${s + o * 0.84}, ${r + n * 0.08} ${s + o * 0.74}, ${r + n * 0.22} ${s + o * 0.72}`,
        "Z",
      ].join(" ");
    return (
      y.set(`#${a.id}`, {
        attr: { d },
        fill: i,
        fillOpacity: p.opacity.fill,
        stroke: i,
        strokeWidth: p.stroke.box,
      }),
      this.addLabel(
        `${a.id}-label`,
        t.toUpperCase(),
        a.x + a.width / 2,
        a.y + a.height * 0.58,
        p.css.foreground,
        20,
      ),
      e
    );
  }
  drawConnector(a, t, i, e) {
    return new Ot(this.dom, a, t, i, e);
  }
  drawTrafficDot(a, t = 6, i = p.css.traffic) {
    const e = m("circle");
    return (
      e.setAttribute("id", a),
      this.dom.appendChild(e),
      y.set(`#${a}`, { attr: { cx: 0, cy: 0, r: t }, fill: i, opacity: 0 }),
      e
    );
  }
  drawNumberedTrafficDot(a, t, i = 9, e = p.css.traffic) {
    const r = m("g");
    (r.setAttribute("id", a), this.dom.appendChild(r));
    const s = m("circle");
    (s.setAttribute("id", `${a}-dot`), r.appendChild(s));
    const n = m("text");
    return (
      n.setAttribute("id", `${a}-label`),
      n.setAttribute("dominant-baseline", "middle"),
      n.setAttribute("text-anchor", "middle"),
      (n.textContent = t),
      r.appendChild(n),
      y.set(`#${a}-dot`, { attr: { cx: 0, cy: 0, r: i }, fill: e }),
      y.set(`#${a}-label`, {
        x: 0,
        y: 1,
        fill: W,
        fontFamily: p.typography.fontFamily,
        fontSize: 11,
        fontWeight: p.typography.titleWeight,
        userSelect: "none",
      }),
      y.set(`#${a}`, { x: -100, y: -100, opacity: 0 }),
      r
    );
  }
  animateTraffic(a, t, i) {
    const e = t[0],
      r = t[t.length - 1];
    y.set(`#${a}`, { attr: { cx: e.x, cy: e.y }, opacity: 0 });
    const s = y
      .timeline({ delay: i, repeat: -1, repeatDelay: 0.8 })
      .set(`#${a}`, { attr: { cx: e.x, cy: e.y }, opacity: 0 })
      .to(`#${a}`, { opacity: 1, duration: 0.18, ease: "power1.out" });
    return (
      X(s, a, t, 3.2 * F),
      s
        .set(`#${a}`, { attr: { cx: r.x, cy: r.y } })
        .to(`#${a}`, { opacity: 0, duration: 0.25, ease: "power1.in" })
        .add(() => {
          y.set(`#${a}`, { attr: { cx: e.x, cy: e.y } });
        })
    );
  }
}
function Ft(h) {
  let a = 0;
  for (let t = 1; t < h.length; t++)
    a += Math.hypot(h[t].x - h[t - 1].x, h[t].y - h[t - 1].y);
  return a;
}
function N(h) {
  return h.map((a, t) => `${t === 0 ? "M" : "L"} ${a.x} ${a.y}`).join(" ");
}
function It(h, a) {
  if (h.length < 2) return h;
  const t = [...h],
    i = t[t.length - 1],
    e = t[t.length - 2],
    r = Math.hypot(i.x - e.x, i.y - e.y);
  if (r === 0) return t;
  const s = Math.min(a, r - 1);
  return (
    (t[t.length - 1] = {
      x: i.x - ((i.x - e.x) / r) * s,
      y: i.y - ((i.y - e.y) / r) * s,
    }),
    t
  );
}
function $t(h, a) {
  const t = Ft(h) * a;
  let i = 0;
  for (let e = 1; e < h.length; e++) {
    const r = h[e - 1],
      s = h[e],
      n = Math.hypot(s.x - r.x, s.y - r.y);
    if (i + n >= t) {
      const o = (t - i) / n;
      return { x: r.x + (s.x - r.x) * o, y: r.y + (s.y - r.y) * o };
    }
    i += n;
  }
  return h[h.length - 1];
}
function P(h) {
  return [...h].reverse();
}
function X(h, a, t, i, e = !1) {
  const r = { progress: 0 };
  return h.set(r, { progress: 0 }).to(r, {
    progress: 1,
    duration: i,
    ease: Pt,
    onUpdate: () => {
      const s = $t(t, r.progress);
      y.set(`#${a}`, e ? { x: s.x, y: s.y } : { attr: { cx: s.x, cy: s.y } });
    },
  });
}
function G(h, a, t) {
  const i = a[0],
    e = t.transform ?? !1,
    r = y
      .timeline()
      .set(
        `#${h}`,
        e
          ? { x: i.x, y: i.y, opacity: 0 }
          : { attr: { cx: i.x, cy: i.y }, opacity: 0 },
      )
      .to(`#${h}`, {
        opacity: 1,
        duration: t.fadeIn ?? 0.12,
        ease: "power1.out",
      });
  return (
    X(r, h, a, t.duration, e),
    r.to(`#${h}`, {
      opacity: 0,
      duration: t.fadeOut ?? 0.18,
      ease: "power1.in",
    })
  );
}
function K(h, a, t, i, e) {
  return t.map((r, s) => ({
    id: `${h}-client-${s + 1}`,
    x: a,
    y: r,
    width: i,
    height: e,
  }));
}
function Wt(h) {
  return [
    { x: h.x, y: h.y + 28 },
    { x: h.x, y: h.y + h.height / 2 },
    { x: h.x, y: h.y + h.height - 28 },
  ];
}
function Q(h, a, t, i, e) {
  const r = Wt(i);
  return t.map((s, n) =>
    h.drawConnector(
      `${a}-client-path-${n + 1}`,
      { x: s.x + s.width, y: s.y + s.height / 2 },
      r[n],
      e,
    ),
  );
}
function tt(h, a) {
  const {
      primaryX: t,
      replicaX: i,
      centerY: e,
      width: r,
      height: s,
      replicaOffset: n,
    } = a,
    o = { id: `${h}-primary`, x: t, y: e - s / 2, width: r, height: s },
    d = [
      { id: `${h}-replica-1`, x: i, y: e - n - s / 2, width: r, height: s },
      { id: `${h}-replica-2`, x: i, y: e + n - s / 2, width: r, height: s },
    ];
  return { primary: o, replicas: d };
}
function U(h, a, t, i, e) {
  return i.map((r, s) =>
    h.drawConnector(
      `${a}-replication-${s + 1}`,
      { x: t.x + t.width, y: t.y + t.height / 2 },
      { x: r.x, y: r.y + r.height / 2 },
      { animatedDash: !0, ...e },
    ),
  );
}
function it(h, a, t) {
  (h.drawDatabase(a, "", O, W, 12),
    t.forEach((i) => h.drawDatabase(i, "", O, W, 12)));
}
function mt() {
  var h;
  return (h = window.matchMedia) != null &&
    h.call(window, "(prefers-color-scheme: dark)").matches
    ? p.dark
    : p.light;
}
function gt(h) {
  const a = Math.sin(h * 12.9898) * 43758.5453;
  return a - Math.floor(a);
}
function Gt(h) {
  return 1 - Math.pow(1 - h, 3);
}
function Ht(h) {
  return h * h * h;
}
function Nt(h, a) {
  return h.x === a.x && h.y === a.y;
}
function Z(h, a) {
  const t = h[h.length - 1];
  (!t || !Nt(t, a)) && h.push(a);
}
function q(h, a, t) {
  const i = h[h.length - 1],
    e = t[0],
    r = [...h];
  return (
    Z(r, { x: a.x + a.width, y: i.y }),
    Z(r, e),
    t.slice(1).forEach((s) => Z(r, s)),
    [...r, ...P(r).slice(1)]
  );
}
function R(h) {
  const a = m("defs"),
    t = m("marker"),
    i = m("path");
  (t.setAttribute("id", "arrowhead"),
    t.setAttribute("markerWidth", "6"),
    t.setAttribute("markerHeight", "6"),
    t.setAttribute("refX", "5"),
    t.setAttribute("refY", "3"),
    t.setAttribute("orient", "auto"),
    t.setAttribute("markerUnits", "strokeWidth"),
    i.setAttribute("d", "M 0 0 L 6 3 L 0 6 z"),
    i.setAttribute("fill", xt),
    t.appendChild(i),
    a.appendChild(t),
    h.appendChild(a));
}
class Vt extends E {
  constructor(t) {
    super(t, 900, 450);
    l(this, "diagram");
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 15)"),
      this.draw());
  }
  draw() {
    const t = p.css,
      i = K(this.id, 60, [45, 170, 295], 150, 80),
      e = [
        `web
browser`,
        `MCP
server`,
        `mobile
phone`,
      ],
      r = {
        id: `${this.id}-app-server`,
        x: 370,
        y: 145,
        width: 170,
        height: 130,
      },
      s = {
        id: `${this.id}-database-server`,
        x: 700,
        y: 135,
        width: 150,
        height: 150,
      };
    (i.forEach((d, u) =>
      this.diagram.drawBrandBox(d, e[u], {
        stroke: t.connector,
        labelColor: t.foreground,
        labelFontSize: 20,
      }),
    ),
      this.diagram.drawBrandBox(
        r,
        `app
server`,
        {
          stroke: t.greenAccent,
          labelColor: t.foreground,
          labelFontSize: 20,
          hatched: !0,
        },
      ),
      this.diagram.drawDatabase(
        s,
        `database
server`,
        t.blueAccent,
        t.background,
        17,
        t.foreground,
      ));
    const n = Q(this.diagram, this.id, i, r, { stroke: t.connector }),
      o = this.diagram.drawConnector(
        `${this.id}-database-path`,
        { x: r.x + r.width, y: r.y + r.height / 2 },
        { x: s.x, y: s.y + s.height / 2 },
        { stroke: t.connector },
      );
    (n.forEach((d, u) => {
      const c = `${this.id}-traffic-${u + 1}`;
      (this.diagram.drawTrafficDot(c, 5, t.traffic),
        this.diagram.animateTraffic(c, q(d.points, r, o.points), u * 0.75));
    }),
      y.fromTo(
        [
          ...i.map((d) => `#${d.id}`),
          `#${r.id}`,
          `#${s.id}`,
          `#${s.id}-top`,
          `#${s.id}-top-details`,
        ].join(","),
        { opacity: 0 },
        { opacity: 1, duration: 0.6, stagger: 0.08, ease: "power1.out" },
      ));
  }
}
class Yt extends E {
  constructor(t) {
    super(t, 900, 540);
    l(this, "diagram");
    l(this, "replicaCount", 0);
    l(this, "dynamicLayer");
    l(this, "clientConnectors", []);
    l(this, "replicaGroups", []);
    l(this, "replicaConnectors", []);
    l(this, "replicaBaseNodes", []);
    l(this, "transitionTimeline");
    l(this, "trafficTargetIndex", 0);
    l(this, "appServer");
    l(this, "primary");
    l(this, "primaryConnector");
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      (this.dynamicLayer = this.createLayer("dynamic")),
      this.diagram.dom.setAttribute("transform", "translate(0 50)"),
      this.dynamicLayer.setAttribute("transform", "translate(0 50)"),
      (this.appServer = {
        id: `${this.id}-app-server`,
        x: 270,
        y: 160,
        width: 170,
        height: 120,
      }),
      (this.primary = {
        id: `${this.id}-primary`,
        x: 505,
        y: 162.5,
        width: 145,
        height: 115,
      }),
      (this.primaryConnector = {}),
      this.draw());
  }
  draw() {
    const t = K(this.id, 45, [60, 180, 300], 145, 80);
    (t.forEach((i) => this.diagram.drawSharpBox(i, "client", I)),
      this.diagram.drawSharpBox(
        this.appServer,
        `app
server`,
        A,
      ),
      (this.clientConnectors = Q(this.diagram, this.id, t, this.appServer)),
      this.drawDatabaseLayer(),
      this.startReplicaCycle());
  }
  drawDatabaseLayer() {
    const t = new b(this.dynamicLayer),
      i = {
        x: this.appServer.x + this.appServer.width,
        y: this.appServer.y + this.appServer.height / 2,
      };
    ((this.primaryConnector = t.drawConnector(
      `${this.id}-app-primary-path`,
      i,
      { x: this.primary.x, y: this.primary.y + this.primary.height / 2 },
    )),
      t.drawDatabase(
        this.primary,
        `postgres
primary`,
        O,
        W,
      ),
      (this.replicaBaseNodes = this.getReplicaNodes(4)),
      (this.replicaConnectors = U(
        t,
        this.id,
        this.primary,
        this.replicaBaseNodes,
        { strokeWidth: 1.5, midPoint: 0.28 },
      )),
      this.replicaBaseNodes.forEach((e) => {
        const r = m("g");
        (r.setAttribute("id", `${e.id}-group`),
          this.dynamicLayer.appendChild(r),
          new b(r).drawDatabase(e, "replica", O, W),
          this.replicaGroups.push(r));
      }));
    for (let e = 0; e < 10; e++)
      t.drawTrafficDot(`${this.id}-traffic-${e + 1}`, 5);
    this.setReplicaLayout(0);
  }
  startReplicaCycle() {
    this.playTrafficRound(() => this.advanceReplicaCycle());
  }
  advanceReplicaCycle() {
    const t = this.replicaCount === 0 ? 2 : this.replicaCount === 2 ? 4 : 0;
    this.transitionReplicaCount(t, () => {
      const i = y.delayedCall(0.4, () =>
        this.playTrafficRound(() => this.advanceReplicaCycle()),
      );
      this.trafficAnimations.push(i);
    });
  }
  setReplicaLayout(t) {
    const i = this.getReplicaNodes(t);
    this.replicaBaseNodes.forEach((e, r) => {
      const s = i[r],
        n = r < t;
      (y.set(this.replicaGroups[r], {
        x: n ? s.x - e.x : 0,
        y: n ? s.y - e.y : 0,
        scale: n ? 1 : 0.82,
        opacity: n ? 1 : 0,
        transformOrigin: `${e.x + e.width / 2}px ${e.y + e.height / 2}px`,
      }),
        y.set(this.replicaConnectors[r].dom, {
          attr: { d: this.replicaConnectorPath(n ? s : e) },
          opacity: n ? 1 : 0,
        }));
    });
  }
  transitionReplicaCount(t, i) {
    var s;
    ((s = this.transitionTimeline) == null || s.kill(),
      this.clearTrafficAnimations(),
      y.set(`[id^="${this.id}-traffic-"]`, { opacity: 0 }));
    const e = this.replicaCount,
      r = this.getReplicaNodes(t);
    ((this.replicaCount = t),
      (this.transitionTimeline = y.timeline({ onComplete: i })),
      this.replicaBaseNodes.forEach((n, o) => {
        const d = r[o],
          u = o < t;
        (u &&
          o >= e &&
          y.set(this.replicaGroups[o], { x: d.x - n.x, y: d.y - n.y }),
          this.transitionTimeline.to(
            this.replicaGroups[o],
            {
              x: u ? d.x - n.x : "+=0",
              y: u ? d.y - n.y : "+=0",
              scale: u ? 1 : 0.82,
              opacity: u ? 1 : 0,
              duration: 0.8,
              ease: "power2.inOut",
            },
            0,
          ),
          this.transitionTimeline.to(
            this.replicaConnectors[o].dom,
            {
              attr: { d: this.replicaConnectorPath(u ? d : n) },
              opacity: u ? 1 : 0,
              duration: 0.8,
              ease: "power2.inOut",
            },
            0,
          ));
      }));
  }
  replicaConnectorPath(t) {
    const i = {
        x: this.primary.x + this.primary.width,
        y: this.primary.y + this.primary.height / 2,
      },
      e = { x: t.x, y: t.y + t.height / 2 },
      r = i.x + (e.x - i.x) * 0.28;
    return N([i, { x: r, y: i.y }, { x: r, y: e.y }, e]);
  }
  getTrafficDuration() {
    return (2.2 + Math.random() * 0.8) * F;
  }
  getReplicaNodes(t = this.replicaCount) {
    const i = [],
      n = t === 2 ? [120, 320] : t === 4 ? [137, 303, 52, 388] : [];
    for (let o = 0; o < n.length; o++) {
      const d = n[o] - 41;
      i.push({
        id: `${this.id}-replica-${o + 1}`,
        x: 735,
        y: d,
        width: 135,
        height: 82,
      });
    }
    return i;
  }
  playTrafficRound(t) {
    (this.clearTrafficAnimations(), (this.trafficTargetIndex = 0));
    const i = this.getReplicaNodes();
    let e = 0;
    for (let r = 0; r < 10; r++) {
      const s = `${this.id}-traffic-${r + 1}`,
        n = this.clientConnectors[r % this.clientConnectors.length],
        o = G(s, this.pickDatabaseRequestPath(n.points, i), {
          duration: this.getTrafficDuration(),
          fadeIn: 0.16,
          fadeOut: 0.22,
        });
      (o.delay(r * 0.24),
        o.eventCallback("onComplete", () => {
          (e++, e === 10 && t());
        }),
        this.trafficAnimations.push(o));
    }
  }
  pickDatabaseRequestPath(t, i) {
    const e = this.trafficTargetIndex % (i.length + 1);
    if ((this.trafficTargetIndex++, e === 0))
      return q(t, this.appServer, this.primaryConnector.points);
    const r = i[e - 1],
      s = {
        x: this.appServer.x + this.appServer.width,
        y: this.appServer.y + this.appServer.height / 2,
      },
      n = s.x + 14,
      o = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    return q(t, this.appServer, [s, { x: n, y: s.y }, { x: n, y: o.y }, o]);
  }
}
class Xt extends E {
  constructor(t) {
    super(t, 900, 630);
    l(this, "diagram");
    l(this, "dynamicLayer");
    l(this, "trafficLayer");
    l(this, "shardGroups", []);
    l(this, "shardCount", 4);
    l(this, "shardStageIndex", 0);
    l(this, "shardCycle", [4, 6, 2]);
    l(this, "appServer");
    l(this, "clientConnectors", []);
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      (this.dynamicLayer = this.createLayer("dynamic")),
      (this.appServer = {
        id: `${this.id}-app-server`,
        x: 375,
        y: 250,
        width: 150,
        height: 120,
      }),
      this.draw());
  }
  draw() {
    const t = K(this.id, 45, [115, 271, 427], 145, 78);
    (t.forEach((i) => this.diagram.drawSharpBox(i, "client", I)),
      this.diagram.drawSharpBox(
        this.appServer,
        `app
server`,
        A,
      ),
      (this.clientConnectors = Q(this.diagram, this.id, t, this.appServer)),
      this.buildShardGroups(),
      (this.trafficLayer = this.createLayer("traffic")),
      this.setShardLayout(this.shardCount, !1, () => this.animateTraffic()));
  }
  buildShardGroups() {
    const t = new b(this.dynamicLayer),
      i = {
        x: this.appServer.x + this.appServer.width,
        y: this.appServer.y + this.appServer.height / 2,
      },
      e = 645,
      r = this.getShardCenters(6);
    for (let s = 0; s < 6; s++) {
      const n = `${this.id}-shard-${s + 1}`,
        o = r[s],
        { primary: d, replicas: u } = tt(n, {
          primaryX: e,
          replicaX: e + 114,
          centerY: o,
          width: 52,
          height: 42,
          replicaOffset: 25,
        }),
        c = t.drawConnector(`${n}-path`, i, { x: d.x, y: d.y + d.height / 2 }),
        g = m("g");
      (g.setAttribute("id", `${n}-group`), this.dynamicLayer.appendChild(g));
      const f = new b(g),
        x = U(f, n, d, u, { strokeWidth: 1.5, midPoint: 0.4 });
      (it(f, d, u),
        this.shardGroups.push({
          id: n,
          dom: g,
          primary: d,
          replicas: u,
          appConnector: c,
          replicaConnectors: x,
          baseCenterY: o,
          offsetY: 0,
        }));
    }
  }
  getShardCenters(t) {
    const r =
      this.appServer.y + this.appServer.height / 2 - ((t - 1) * 104) / 2;
    return Array.from({ length: t }, (s, n) => r + n * 104);
  }
  setShardLayout(t, i, e) {
    const r = this.getShardCenters(t),
      s = {
        x: this.appServer.x + this.appServer.width,
        y: this.appServer.y + this.appServer.height / 2,
      },
      n = i ? y.timeline({ onComplete: e }) : void 0;
    (this.shardGroups.forEach((o, d) => {
      const u = d < t,
        c = u ? r[d] - o.baseCenterY : o.offsetY;
      (u && (o.offsetY = c),
        u &&
          ((o.appConnector.start = s),
          (o.appConnector.end = {
            x: o.primary.x,
            y: o.primary.y + o.primary.height / 2 + c,
          }),
          (o.appConnector.points = o.appConnector.calculatePoints())));
      const g = {
          y: c,
          opacity: u ? 1 : 0,
          scale: u ? 1 : 0.82,
          duration: i ? 0.9 : 0,
          ease: "power2.inOut",
          transformOrigin: `${o.primary.x + o.primary.width / 2}px ${o.primary.y + o.primary.height / 2}px`,
        },
        f = {
          attr: { d: N(o.appConnector.points) },
          opacity: u ? 1 : 0,
          duration: i ? 0.9 : 0,
          ease: "power2.inOut",
        };
      i
        ? n.to(o.dom, g, 0).to(o.appConnector.dom, f, 0)
        : (y.set(o.dom, g), y.set(o.appConnector.dom, f));
    }),
      i || e());
  }
  animateTraffic() {
    this.trafficLayer = this.resetLayer(this.trafficLayer, "traffic");
    const t = new b(this.trafficLayer),
      i = this.shardGroups.slice(0, this.shardCount),
      e = y.timeline({ onComplete: () => this.advanceShardCycle() });
    (this.clientConnectors.forEach((r, s) => {
      const n = `${this.id}-traffic-${s + 1}`;
      t.drawTrafficDot(n, 5);
      const o = this.pickShardRequestPath(r.points, i),
        d = [...o, ...P(o).slice(1)];
      e.add(
        G(n, d, {
          duration: (3 + Math.random() * 0.3) * F * 1.2,
          fadeIn: 0.16,
          fadeOut: 0.22,
        }),
        s * 0.2,
      );
    }),
      e.to({}, { duration: 0.5 }),
      this.trafficAnimations.push(e));
  }
  advanceShardCycle() {
    (this.clearTrafficAnimations(),
      (this.shardStageIndex =
        (this.shardStageIndex + 1) % this.shardCycle.length),
      (this.shardCount = this.shardCycle[this.shardStageIndex]),
      this.setShardLayout(this.shardCount, !0, () => this.animateTraffic()));
  }
  pickShardRequestPath(t, i) {
    const e = i[Math.floor(Math.random() * i.length)],
      r = Math.random(),
      s = e.replicaConnectors[r < 0.71 ? 0 : 1].points
        .slice(1)
        .map((o) => ({ x: o.x, y: o.y + e.offsetY })),
      n = r < 0.42 ? e.appConnector.points : [...e.appConnector.points, ...s];
    return q(t, this.appServer, n);
  }
}
class qt extends E {
  constructor(t) {
    super(t, 900, 360);
    l(this, "diagram");
    l(this, "connector");
    (R(this.dom), (this.diagram = new b(this.dom)), this.draw());
  }
  draw() {
    const t = {
        id: `${this.id}-app-servers`,
        x: 35,
        y: 75,
        width: 170,
        height: 220,
      },
      i = { id: `${this.id}-database`, x: 430, y: 55, width: 420, height: 260 };
    (this.diagram.drawSharpBox(
      t,
      `app
servers`,
      A,
    ),
      this.diagram.drawSharpBox(i, "database", A),
      (this.connector = this.diagram.drawConnector(
        `${this.id}-app-database-path`,
        { x: t.x + t.width, y: t.y + t.height / 2 },
        { x: i.x, y: i.y + i.height / 2 },
      )),
      this.animateTraffic());
  }
  animateTraffic() {
    const t = [...this.connector.points, ...P(this.connector.points).slice(1)];
    for (let i = 0; i < 8; i++) {
      const e = `${this.id}-traffic-${i + 1}`;
      (this.diagram.drawTrafficDot(e, 5),
        this.diagram.animateTraffic(e, t, i * 0.38));
    }
  }
}
class Ut extends E {
  constructor(t) {
    super(t, 900, 450);
    l(this, "diagram");
    l(this, "appServers");
    l(this, "pgbouncer");
    l(this, "postgres");
    l(this, "inboundConnectors", []);
    l(this, "poolConnectors", []);
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 10)"),
      (this.appServers = [
        { id: `${this.id}-app-server-1`, x: 45, y: 45, width: 165, height: 88 },
        {
          id: `${this.id}-app-server-2`,
          x: 45,
          y: 171,
          width: 165,
          height: 88,
        },
        {
          id: `${this.id}-app-server-3`,
          x: 45,
          y: 297,
          width: 165,
          height: 88,
        },
      ]),
      (this.pgbouncer = {
        id: `${this.id}-pgbouncer`,
        x: 365,
        y: 150,
        width: 210,
        height: 130,
      }),
      (this.postgres = {
        id: `${this.id}-postgres`,
        x: 720,
        y: 115,
        width: 135,
        height: 200,
      }),
      this.draw());
  }
  draw() {
    (this.drawConnectors(),
      this.appServers.forEach((t) =>
        this.diagram.drawSharpBox(
          t,
          `app
servers`,
          I,
        ),
      ),
      this.diagram.drawSharpBox(
        this.pgbouncer,
        `PG
bouncer`,
        A,
      ),
      this.diagram.drawDatabase(this.postgres, "postgres", O, W, 20),
      this.animateTraffic());
  }
  drawConnectors() {
    const t = [165, 181, 197, 215, 233, 251, 267],
      i = [
        { server: this.appServers[0], y: this.appServers[0].y + 16 },
        { server: this.appServers[0], y: this.appServers[0].y + 44 },
        { server: this.appServers[0], y: this.appServers[0].y + 72 },
        { server: this.appServers[1], y: this.appServers[1].y + 20 },
        { server: this.appServers[1], y: this.appServers[1].y + 44 },
        { server: this.appServers[1], y: this.appServers[1].y + 68 },
        { server: this.appServers[2], y: this.appServers[2].y + 16 },
        { server: this.appServers[2], y: this.appServers[2].y + 44 },
        { server: this.appServers[2], y: this.appServers[2].y + 72 },
      ];
    this.inboundConnectors = i.map(({ server: r, y: s }, n) =>
      this.diagram.drawConnector(
        `${this.id}-app-pgbouncer-path-${n + 1}`,
        { x: r.x + r.width, y: s },
        { x: this.pgbouncer.x, y: t[n % t.length] },
        { strokeWidth: 1.45, midPoint: 0.62 },
      ),
    );
    const e = [185, 215, 245];
    this.poolConnectors = e.map((r, s) =>
      this.diagram.drawConnector(
        `${this.id}-pgbouncer-postgres-path-${s + 1}`,
        { x: this.pgbouncer.x + this.pgbouncer.width, y: r },
        { x: this.postgres.x, y: this.postgres.y + 70 + s * 30 },
        { strokeWidth: 2.15 },
      ),
    );
  }
  animateTraffic() {
    for (let i = 0; i < 18; i++) {
      const e = `${this.id}-traffic-${i + 1}`;
      (this.diagram.drawTrafficDot(e, 4.8),
        this.scheduleTrafficLoop(
          Math.random() * 2.4,
          () =>
            G(e, this.randomMultiplexedPath(), {
              duration: (2.7 + Math.random() * 0.7) * F,
            }),
          () => 0.18 + Math.random() * 0.75,
        ));
    }
  }
  randomMultiplexedPath() {
    const t =
        this.inboundConnectors[
          Math.floor(Math.random() * this.inboundConnectors.length)
        ],
      i =
        this.poolConnectors[
          Math.floor(Math.random() * this.poolConnectors.length)
        ],
      e = t.points[t.points.length - 1],
      r = i.points[0],
      s = this.pgbouncer.x + this.pgbouncer.width / 2,
      n = [{ x: s, y: e.y }, { x: s, y: r.y }, r],
      o = [...t.points, ...n, ...i.points.slice(1)];
    return [...o, ...P(o).slice(1)];
  }
}
class jt extends E {
  constructor(t) {
    super(t, 900, 540);
    l(this, "diagram");
    l(this, "appServers");
    l(this, "nlb");
    l(this, "proxies");
    l(this, "appConnectors", []);
    l(this, "proxyRoutes", []);
    l(this, "shardRoutes", []);
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 10)"),
      (this.appServers = [
        { id: `${this.id}-app-server-1`, x: 35, y: 55, width: 150, height: 95 },
        {
          id: `${this.id}-app-server-2`,
          x: 35,
          y: 212,
          width: 150,
          height: 95,
        },
        {
          id: `${this.id}-app-server-3`,
          x: 35,
          y: 369,
          width: 150,
          height: 95,
        },
      ]),
      (this.nlb = {
        id: `${this.id}-nlb`,
        x: 265,
        y: 45,
        width: 95,
        height: 430,
      }),
      (this.proxies = [
        { id: `${this.id}-proxy-1`, x: 455, y: 70, width: 125, height: 92 },
        { id: `${this.id}-proxy-2`, x: 455, y: 214, width: 125, height: 92 },
        { id: `${this.id}-proxy-3`, x: 455, y: 358, width: 125, height: 92 },
      ]),
      this.draw());
  }
  draw() {
    (this.drawConnectorsAndShards(),
      this.appServers.forEach((t) =>
        this.diagram.drawSharpBox(
          t,
          `app
server`,
          I,
        ),
      ),
      this.diagram.drawSharpBox(this.nlb, "NLB", A),
      this.proxies.forEach((t) => this.diagram.drawSharpBox(t, "router", A)),
      this.animateTraffic());
  }
  drawConnectorsAndShards() {
    const t = [104, 260, 416];
    ((this.appConnectors = this.appServers.map((i, e) =>
      this.diagram.drawConnector(
        `${this.id}-app-nlb-path-${e + 1}`,
        { x: i.x + i.width, y: i.y + i.height / 2 },
        { x: this.nlb.x, y: t[e] },
        { strokeWidth: 1.7 },
      ),
    )),
      (this.proxyRoutes = this.proxies.map((i, e) => ({
        connector: this.diagram.drawConnector(
          `${this.id}-nlb-proxy-path-${e + 1}`,
          { x: this.nlb.x + this.nlb.width, y: i.y + i.height / 2 },
          { x: i.x, y: i.y + i.height / 2 },
          { strokeWidth: 1.45, midPoint: 0.45 },
        ),
        proxy: i,
      }))),
      (this.shardRoutes = this.drawShardGroups()));
  }
  drawShardGroups() {
    const t = [];
    return (
      [82, 196, 324, 438].forEach((e, r) => {
        const s = `${this.id}-shard-${r + 1}`,
          { primary: n, replicas: o } = tt(s, {
            primaryX: 665,
            replicaX: 805,
            centerY: e,
            width: 50,
            height: 40,
            replicaOffset: 31,
          });
        (U(this.diagram, s, n, o, { strokeWidth: 1.25, midPoint: 0.5 }),
          this.proxies.forEach((d, u) => {
            const c = this.diagram.drawConnector(
              `${this.id}-proxy-${u + 1}-shard-${r + 1}-path`,
              { x: d.x + d.width, y: d.y + d.height / 2 },
              { x: n.x, y: n.y + n.height / 2 },
              { strokeWidth: 1.35, midPoint: 0.55 },
            );
            t.push({ connector: c, proxy: d, primary: n, replicas: o });
          }),
          it(this.diagram, n, o));
      }),
      t
    );
  }
  animateTraffic() {
    for (let t = 0; t < 16; t++) {
      const i = `${this.id}-traffic-${t + 1}`;
      (this.diagram.drawTrafficDot(i, 4.8),
        this.scheduleTrafficLoop(
          Math.random() * 2.4,
          () =>
            G(i, this.randomRequestPath(), {
              duration: (3.1 + Math.random() * 0.7) * F,
            }),
          () => 0.25 + Math.random() * 0.95,
        ));
    }
  }
  randomRequestPath() {
    const t =
        this.appConnectors[
          Math.floor(Math.random() * this.appConnectors.length)
        ],
      i = this.proxyRoutes[Math.floor(Math.random() * this.proxyRoutes.length)],
      e = this.shardRoutes.filter(($) => $.proxy === i.proxy),
      r = e[Math.floor(Math.random() * e.length)],
      s = [r.primary, ...r.replicas],
      n = s[Math.floor(Math.random() * s.length)],
      o = t.points,
      d = i.connector.points[0],
      u = i.connector.points[i.connector.points.length - 1],
      c = r.connector.points[0],
      g = r.connector.points[r.connector.points.length - 1],
      f = { x: n.x + n.width / 2, y: n.y + n.height / 2 },
      x = [
        ...o,
        d,
        ...i.connector.points.slice(1),
        { x: i.proxy.x + i.proxy.width / 2, y: u.y },
        { x: i.proxy.x + i.proxy.width / 2, y: c.y },
        c,
        ...r.connector.points.slice(1),
        g,
        f,
      ];
    return [...x, ...P(x).slice(1)];
  }
}
class zt extends E {
  constructor(t) {
    super(t, 900, 300);
    l(this, "diagram");
    l(this, "timeline");
    l(this, "databaseBox");
    l(this, "proxyBox");
    l(this, "stages");
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 -11)"),
      (this.databaseBox = {
        id: `${this.id}-database`,
        x: 95,
        y: 42,
        width: 692,
        height: 238,
      }),
      (this.proxyBox = {
        id: `${this.id}-proxy`,
        x: 20,
        y: 42,
        width: 250,
        height: 238,
      }),
      (this.stages = this.createStages()),
      this.draw());
  }
  createStages() {
    const t = [
        {
          id: "parser",
          label: `query
parser`,
          color: I,
        },
        {
          id: "planner",
          label: `query
planner`,
          color: I,
        },
        {
          id: "evaluation",
          label: `evaluation
engine`,
          color: O,
        },
        {
          id: "buffer",
          label: `buffer
cache`,
          color: O,
        },
        {
          id: "storage",
          label: `storage
engine`,
          color: O,
        },
      ],
      i = [150, 275, 400, 525, 650],
      e = [405, 495, 585, 675, 765];
    return t.map((r, s) => ({
      ...r,
      id: `${this.id}-${r.id}`,
      initial: {
        id: `${this.id}-${r.id}`,
        x: i[s],
        y: 105,
        width: 82,
        height: 140,
      },
      final: {
        id: `${this.id}-${r.id}`,
        x: e[s],
        y: 105,
        width: 70,
        height: 140,
      },
    }));
  }
  draw() {
    (this.diagram.drawBrandBox(this.databaseBox, "", {
      stroke: p.css.blueAccent,
    }),
      this.diagram.addLabel(
        `${this.id}-database-label`,
        "database",
        this.databaseBox.x + 95,
        72,
        A,
        28,
      ),
      this.stages.forEach((s) => this.drawStage(s.initial, s.label, s.color)));
    const t = this.drawStageConnectors(
      this.stages.map((s) => s.initial),
      `${this.id}-initial`,
      !0,
    );
    (this.diagram.drawBrandBox(this.proxyBox, "", {
      stroke: p.css.greenAccent,
    }),
      this.diagram.addLabel(
        `${this.id}-proxy-label`,
        "proxy",
        this.proxyBox.x + 70,
        72,
        A,
        28,
      ),
      [
        {
          id: `${this.id}-proxy-parser`,
          x: 58,
          y: 105,
          width: 70,
          height: 140,
        },
        {
          id: `${this.id}-proxy-planner`,
          x: 160,
          y: 105,
          width: 70,
          height: 140,
        },
      ].forEach((s, n) =>
        this.drawStage(
          s,
          n === 0
            ? `query
parser`
            : `query
planner`,
          I,
        ),
      ));
    const e = this.diagram.drawConnector(
        `${this.id}-proxy-database-request`,
        { x: this.proxyBox.x + this.proxyBox.width, y: 145 },
        { x: 370, y: 145 },
        { segmentCount: 2, arrowEnd: !0 },
      ),
      r = this.diagram.drawConnector(
        `${this.id}-database-proxy-response`,
        { x: 370, y: 220 },
        { x: this.proxyBox.x + this.proxyBox.width, y: 220 },
        { segmentCount: 2, arrowEnd: !0 },
      );
    (this.dom.addEventListener("click", () => this.play(t, e, r)),
      this.play(t, e, r));
  }
  drawStage(t, i, e) {
    const r = m("rect");
    return (
      r.setAttribute("id", t.id),
      this.diagram.dom.appendChild(r),
      y.set(`#${t.id}`, {
        attr: {
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          "stroke-dasharray": p.stroke.dashArray,
        },
        fill: e,
        fillOpacity: p.opacity.fill,
        stroke: e,
        strokeWidth: p.stroke.box,
      }),
      this.diagram.addLabel(
        `${t.id}-label`,
        i.toUpperCase(),
        t.x + t.width / 2,
        t.y + t.height / 2,
        p.css.foreground,
        13,
      ),
      r
    );
  }
  drawStageConnectors(t, i, e = !1) {
    const r = t
      .slice(0, -1)
      .map((n, o) =>
        this.diagram.drawConnector(
          `${i}-stage-path-${o + 1}`,
          { x: n.x + n.width, y: n.y + 35 },
          { x: t[o + 1].x, y: t[o + 1].y + 35 },
          { strokeWidth: 1.5, arrowEnd: !0 },
        ),
      );
    if (!e) return r;
    const s = t
      .slice(0, -1)
      .map((n, o) =>
        this.diagram.drawConnector(
          `${i}-return-path-${o + 1}`,
          { x: t[o + 1].x, y: t[o + 1].y + 105 },
          { x: n.x + n.width, y: n.y + 105 },
          { strokeWidth: 1.5, arrowEnd: !0 },
        ),
      );
    return [...r, ...s];
  }
  play(t, i, e) {
    var u;
    (u = this.timeline) == null || u.kill();
    const r = [
        `#${this.proxyBox.id}`,
        `#${this.proxyBox.id}-inset`,
        `#${this.id}-proxy-label`,
        `#${this.id}-proxy-parser`,
        `#${this.id}-proxy-parser-label`,
        `#${this.id}-proxy-planner`,
        `#${this.id}-proxy-planner-label`,
        `#${i.id}`,
        `#${e.id}`,
      ],
      s = this.stages.flatMap((c) => [`#${c.id}`, `#${c.id}-label`]),
      n = t.map((c) => `#${c.id}`),
      o = [
        `#${this.databaseBox.id}`,
        `#${this.databaseBox.id}-inset`,
        `#${this.id}-database-label`,
        ...s,
        ...n,
      ],
      d = [
        `#${this.databaseBox.id}`,
        `#${this.databaseBox.id}-inset`,
        `#${this.id}-database-label`,
        ...s,
        ...r,
      ];
    (y.set(r.join(","), { opacity: 0 }),
      y.set(`#${this.databaseBox.id}`, {
        attr: { x: 95, y: 42, width: 692, height: 238 },
        opacity: 1,
      }),
      y.set(`#${this.databaseBox.id}-inset`, {
        attr: { x: 103, y: 50, width: 676, height: 222 },
        opacity: 1,
      }),
      y.set(`#${this.id}-database-label`, { x: 190, y: 72, opacity: 1 }),
      this.stages.forEach((c) => {
        (y.set(`#${c.id}`, {
          attr: {
            x: c.initial.x,
            y: c.initial.y,
            width: c.initial.width,
            height: c.initial.height,
          },
          opacity: 1,
        }),
          y.set(`#${c.id}-label`, {
            x: c.initial.x + c.initial.width / 2,
            y: c.initial.y + c.initial.height / 2,
            opacity: 1,
          }));
      }),
      t.forEach((c) => y.set(`#${c.id}`, { opacity: 1 })),
      (this.timeline = y
        .timeline({ repeat: -1, repeatDelay: 1.1 })
        .add(
          this.animatePipeline(
            `${this.id}-initial-query`,
            this.initialPipelinePath(),
            2.2,
          ),
          0.2,
        )
        .to({}, { duration: 0.35 })
        .addLabel("phaseTwo")
        .to(
          `#${this.databaseBox.id}`,
          { attr: { x: 370, width: 500 }, duration: 0.9, ease: "power2.inOut" },
          "phaseTwo",
        )
        .to(
          `#${this.databaseBox.id}-inset`,
          { attr: { x: 378, width: 484 }, duration: 0.9, ease: "power2.inOut" },
          "phaseTwo",
        )
        .to(
          `#${this.id}-database-label`,
          { x: 455, duration: 0.9, ease: "power2.inOut" },
          "phaseTwo",
        )
        .to(
          this.stages.flatMap((c) => [`#${c.id}`, `#${c.id}-label`]),
          {
            attr: (c, g, f) => {
              const x = this.stages[Math.floor(c / 2)];
              if (f[c].tagName === "rect")
                return {
                  x: x.final.x,
                  y: x.final.y,
                  width: x.final.width,
                  height: x.final.height,
                };
            },
            x: (c) => {
              const g = this.stages[Math.floor(c / 2)];
              return c % 2 === 1 ? g.final.x + g.final.width / 2 : 0;
            },
            y: (c) => {
              const g = this.stages[Math.floor(c / 2)];
              return c % 2 === 1 ? g.final.y + g.final.height / 2 : 0;
            },
            duration: 0.9,
            ease: "power2.inOut",
          },
          "phaseTwo",
        )
        .to(
          r.join(","),
          { opacity: 1, duration: 0.55, ease: "power1.out" },
          "phaseTwo+=0.2",
        )
        .to(
          n.join(","),
          { opacity: 0, duration: 0.35, ease: "power1.in" },
          "phaseTwo+=0.2",
        )
        .add(
          this.animatePipeline(
            `${this.id}-proxy-query`,
            this.proxyPipelinePath(),
            3.2,
          ),
          "+=0.35",
        )
        .to({}, { duration: 0.6 })
        .to(d, { opacity: 0, duration: 0.45, ease: "power1.in" })
        .call(() => {
          (y.set(`#${this.databaseBox.id}`, {
            attr: { x: 95, y: 42, width: 692, height: 238 },
            opacity: 0,
          }),
            y.set(`#${this.databaseBox.id}-inset`, {
              attr: { x: 103, y: 50, width: 676, height: 222 },
              opacity: 0,
            }),
            y.set(`#${this.id}-database-label`, { x: 190, y: 72, opacity: 0 }),
            this.stages.forEach((c) => {
              (y.set(`#${c.id}`, {
                attr: {
                  x: c.initial.x,
                  y: c.initial.y,
                  width: c.initial.width,
                  height: c.initial.height,
                },
                opacity: 0,
              }),
                y.set(`#${c.id}-label`, {
                  x: c.initial.x + c.initial.width / 2,
                  y: c.initial.y + c.initial.height / 2,
                  opacity: 0,
                }));
            }),
            y.set(r, { opacity: 0 }),
            y.set(n, { opacity: 0 }));
        })
        .to(o, {
          opacity: 1,
          duration: 0.55,
          stagger: 0.025,
          ease: "power1.out",
        })));
  }
  initialPipelinePath() {
    const t = this.stages[0].initial,
      i = this.stages[this.stages.length - 1].initial,
      e = { x: t.x - 50, y: t.y + 35 },
      r = [
        e,
        ...this.stages.map((o) => ({
          x: o.initial.x + o.initial.width / 2,
          y: o.initial.y + 35,
        })),
      ],
      s = { x: i.x + i.width / 2, y: i.y + 105 },
      n = P(
        this.stages.map((o) => ({
          x: o.initial.x + o.initial.width / 2,
          y: o.initial.y + 105,
        })),
      );
    return [...r, s, ...n.slice(1), { x: e.x, y: t.y + 105 }];
  }
  proxyPipelinePath() {
    const t = [
        { x: 58, y: 105, width: 70, height: 140 },
        { x: 160, y: 105, width: 70, height: 140 },
      ],
      i = this.stages.map((c) => ({
        x: c.final.x + c.final.width / 2,
        y: c.final.y + 35,
      })),
      e = P(
        this.stages.map((c) => ({
          x: c.final.x + c.final.width / 2,
          y: c.final.y + 105,
        })),
      ),
      r = { x: this.proxyBox.x + 34, y: 140 },
      s = 370,
      n = { x: s, y: 145 },
      o = { x: s, y: 220 },
      d = { x: this.proxyBox.x + this.proxyBox.width - 35, y: 220 },
      u = e[0];
    return [
      r,
      ...t.map((c) => ({ x: c.x + c.width / 2, y: c.y + 35 })),
      { x: this.proxyBox.x + this.proxyBox.width, y: 145 },
      n,
      ...i,
      u,
      ...e.slice(1),
      o,
      d,
      ...P(t.map((c) => ({ x: c.x + c.width / 2, y: c.y + 105 }))),
      { x: r.x, y: 220 },
    ];
  }
  animatePipeline(t, i, e) {
    return (this.diagram.drawTrafficDot(t, 6), G(t, i, { duration: e * F }));
  }
}
class _t extends E {
  constructor(t) {
    super(t, 900, 450);
    l(this, "diagram");
    l(this, "appServer");
    l(this, "shardGroups", []);
    (R(this.dom),
      (this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 15)"),
      (this.appServer = {
        id: `${this.id}-app-servers`,
        x: 25,
        y: 90,
        width: 165,
        height: 240,
      }),
      this.draw());
  }
  draw() {
    this.diagram.drawSharpBox(
      this.appServer,
      `app
servers`,
      A,
    );
    const t = this.diagram.addLabel(
      `${this.id}-database-label`,
      "database",
      365,
      210,
      A,
      24,
    );
    (y.set(`#${t.id}`, { rotation: -90, transformOrigin: "50% 50%" }),
      (this.shardGroups = this.drawShardGrid()),
      this.animateTraffic(),
      this.dom.addEventListener("click", () => this.restartAnimations()));
  }
  drawShardGrid() {
    const t = [];
    for (let d = 0; d < 3 * 4; d++) {
      const u = d % 3,
        c = Math.floor(d / 3),
        g = 425 + u * 155,
        f = `${this.id}-shard-${d + 1}`,
        { primary: x, replicas: $ } = tt(f, {
          primaryX: g,
          replicaX: g + 82,
          centerY: 62 + c * 96,
          width: 42,
          height: 34,
          replicaOffset: 22,
        }),
        S = U(this.diagram, f, x, $, { strokeWidth: 1.25, midPoint: 0.42 });
      (it(this.diagram, x, $),
        t.push({ id: f, primary: x, replicas: $, replicaConnectors: S }));
    }
    return t;
  }
  restartAnimations() {
    (this.clearTrafficAnimations(),
      y.set(`[id^="${this.id}-traffic-"]`, { opacity: 0 }),
      this.animateTraffic(!1));
  }
  animateTraffic(t = !0) {
    for (let e = 0; e < 15; e++) {
      const r = `${this.id}-traffic-${e + 1}`;
      (t && this.diagram.drawTrafficDot(r, 4.5),
        this.scheduleTrafficLoop(
          Math.random() * 2.2,
          () => this.buildRoundTripTimeline(r),
          () => 0.15 + Math.random() * 0.9,
        ));
    }
  }
  buildRoundTripTimeline(t) {
    const i =
        this.shardGroups[Math.floor(Math.random() * this.shardGroups.length)],
      e = [i.primary, ...i.replicas],
      r = e[Math.floor(Math.random() * e.length)],
      s = {
        x: this.appServer.x + this.appServer.width,
        y: this.appServer.y + this.appServer.height / 2,
      },
      n = { x: r.x + r.width / 2, y: r.y + r.height / 2 },
      o = y
        .timeline()
        .set(`#${t}`, { attr: { cx: s.x, cy: s.y }, opacity: 0 })
        .to(`#${t}`, { opacity: 1, duration: 0.12, ease: "power1.out" });
    return (
      X(o, t, [s, n], (0.95 + Math.random() * 0.35) * F),
      o
        .add(() => this.setDatabaseHighlight(r, p.css.accent))
        .to({}, { duration: 0.5 })
        .add(() => this.setDatabaseHighlight(r, p.css.blueAccent)),
      X(o, t, [n, s], (0.95 + Math.random() * 0.35) * F),
      o.to(`#${t}`, { opacity: 0, duration: 0.18, ease: "power1.in" })
    );
  }
  setDatabaseHighlight(t, i) {
    y.set([`#${t.id}`, `#${t.id}-top`, `#${t.id}-top-details line`].join(","), {
      stroke: i,
    });
  }
}
class Zt extends E {
  constructor(t) {
    super(t, 1e3, 700);
    l(this, "diagram");
    l(this, "rows");
    l(this, "proxy");
    l(this, "shards");
    l(this, "shardConnectors", []);
    l(this, "highlightedRoutes", []);
    l(this, "hashResultLabel");
    l(this, "timeline");
    l(this, "rowWidth", 300);
    l(this, "rowHeight", 34);
    l(this, "storedRowScale", 0.75);
    ((this.diagram = new b(this.dom)),
      this.diagram.dom.setAttribute("transform", "translate(0 -2.5)"));
    const i = [
      ["ada", "ada@example.com"],
      ["grace", "grace@example.com"],
      ["linus", "linus@example.com"],
      ["margaret", "margaret@example.com"],
      ["dennis", "dennis@example.com"],
      ["barbara", "barbara@example.com"],
      ["donald", "donald@example.com"],
      ["james", "james@example.com"],
    ];
    ((this.rows = i.map(([e, r], s) => ({
      value: s + 1,
      username: e,
      email: r,
    }))),
      (this.proxy = {
        id: `${this.id}-hash-router`,
        x: 115,
        y: 220,
        width: 310,
        height: 260,
      }),
      (this.shards = [10, 185, 360, 535].map((e, r) => ({
        id: `${this.id}-insert-shard-${r}`,
        x: 635,
        y: e,
        width: 250,
        height: 160,
      }))),
      this.draw());
  }
  draw() {
    (this.drawRoutes(),
      this.drawProxy(),
      this.drawShards(),
      this.drawRows(),
      this.drawEntryFade(),
      this.play());
  }
  drawRoutes() {
    const t = this.proxy.y + this.proxy.height / 2;
    ((this.shardConnectors = this.shards.map((i, e) =>
      this.diagram.drawConnector(
        `${this.id}-router-shard-${e}`,
        { x: this.proxy.x + this.proxy.width, y: t },
        { x: i.x, y: i.y + i.height / 2 },
        { strokeWidth: 1.4, animatedDash: !0, midPoint: 0.55 },
      ),
    )),
      (this.highlightedRoutes = this.shardConnectors.map((i, e) => {
        const r = m("path");
        return (
          r.setAttribute("id", `${this.id}-active-router-shard-${e}`),
          r.setAttribute("d", N(i.points)),
          r.setAttribute("fill", "none"),
          r.setAttribute("stroke", p.css.accent),
          r.setAttribute("stroke-width", "2"),
          r.setAttribute("stroke-dasharray", p.stroke.connectorDashArray),
          r.setAttribute("stroke-linecap", "round"),
          r.setAttribute("stroke-linejoin", "round"),
          r.setAttribute("opacity", "0"),
          this.diagram.dom.appendChild(r),
          y.to(r, {
            attr: { "stroke-dashoffset": -14 },
            duration: 0.75,
            ease: "none",
            repeat: -1,
          }),
          r
        );
      })));
  }
  drawRows() {
    this.rows.forEach((t) => {
      const i = m("g");
      (i.setAttribute("id", `${this.id}-insert-row-${t.value}`),
        this.diagram.dom.appendChild(i),
        (t.group = i));
      const e = new b(i),
        r = m("rect");
      (r.setAttribute("id", `${this.id}-insert-row-${t.value}-background`),
        e.dom.appendChild(r),
        y.set(r, {
          attr: { x: 0, y: 0, width: this.rowWidth, height: this.rowHeight },
          fill: p.css.connector,
          fillOpacity: 0.18,
          stroke: "none",
        }));
      const s = m("rect");
      (s.setAttribute("id", `${this.id}-insert-row-${t.value}-id-highlight`),
        e.dom.appendChild(s),
        y.set(s, {
          attr: { x: 5, y: 5, width: 38, height: this.rowHeight - 10 },
          fill: p.css.accent,
          fillOpacity: 0,
          stroke: p.css.accent,
          strokeOpacity: 0,
          strokeWidth: 1.5,
        }),
        e.addLabel(
          `${this.id}-insert-row-${t.value}-id`,
          `${t.value}`,
          25,
          this.rowHeight / 2,
          p.css.foreground,
          16,
        ),
        e.addLabel(
          `${this.id}-insert-row-${t.value}-username`,
          t.username.toUpperCase(),
          88,
          this.rowHeight / 2,
          p.css.foreground,
          15,
        ),
        e.addLabel(
          `${this.id}-insert-row-${t.value}-email`,
          t.email,
          215,
          this.rowHeight / 2,
          p.css.foreground,
          13,
        ));
    });
  }
  drawEntryFade() {
    const t = `${this.id}-entry-fade-gradient`,
      i = m("defs"),
      e = m("linearGradient");
    (e.setAttribute("id", t),
      e.setAttribute("gradientUnits", "userSpaceOnUse"),
      e.setAttribute("x1", "0"),
      e.setAttribute("x2", "100"));
    const r = m("stop");
    (r.setAttribute("offset", "0%"),
      r.setAttribute("stop-color", p.css.background),
      r.setAttribute("stop-opacity", "1"));
    const s = m("stop");
    (s.setAttribute("offset", "40%"),
      s.setAttribute("stop-color", p.css.background),
      s.setAttribute("stop-opacity", "0.82"));
    const n = m("stop");
    (n.setAttribute("offset", "100%"),
      n.setAttribute("stop-color", p.css.background),
      n.setAttribute("stop-opacity", "0"),
      e.append(r, s, n),
      i.appendChild(e),
      this.dom.appendChild(i));
    const o = m("rect");
    (o.setAttribute("x", "0"),
      o.setAttribute("y", "0"),
      o.setAttribute("width", "100"),
      o.setAttribute("height", "700"),
      o.setAttribute("fill", `url(#${t})`),
      o.setAttribute("pointer-events", "none"),
      this.diagram.dom.appendChild(o));
  }
  drawProxy() {
    (this.diagram.drawBrandBox(this.proxy, "", {
      stroke: p.css.greenAccent,
      inset: 8,
    }),
      this.diagram.addLabel(
        `${this.id}-router-label`,
        "ROUTER",
        this.proxy.x + this.proxy.width / 2,
        this.proxy.y + 65,
        p.css.foreground,
        20,
      ),
      (this.hashResultLabel = this.diagram.addLabel(
        `${this.id}-hash-result`,
        "HASH(1) % 4 = 1",
        this.proxy.x + this.proxy.width / 2,
        this.proxy.y + 215,
        p.css.foreground,
        14,
      )),
      y.set(this.hashResultLabel, { opacity: 0 }));
  }
  drawShards() {
    this.shards.forEach((t) => {
      this.diagram.drawDatabase(t, "", p.css.blueAccent, p.css.background);
    });
  }
  rowTarget(t) {
    const i = t % 4,
      e = this.shards[i],
      r = t > 4 ? 1 : 0;
    return {
      shardIndex: i,
      point: {
        x: e.x + (e.width - this.rowWidth * this.storedRowScale) / 2,
        y: e.y + (r === 0 ? 72 : 105),
      },
    };
  }
  proxyRowPosition() {
    return {
      x: this.proxy.x + 5,
      y: this.proxy.y + this.proxy.height / 2 - this.rowHeight / 2,
    };
  }
  incomingPath() {
    const t = this.proxyRowPosition();
    return [{ x: -this.rowWidth - 20, y: t.y }, { x: 20, y: t.y }, t];
  }
  outgoingPath(t) {
    const i = this.proxyRowPosition(),
      { shardIndex: e } = this.rowTarget(t),
      r = this.rowWidth / 2,
      s = this.rowHeight / 2,
      n = this.shardConnectors[e].points.map((o) => ({
        x: o.x - r,
        y: o.y - s,
      }));
    return [i, ...n];
  }
  addEasedRowTravel(t, i, e, r) {
    const s = { progress: 0 };
    return t.set(s, { progress: 0 }).to(s, {
      progress: 1,
      duration: r,
      ease: "power2.inOut",
      onUpdate: () => {
        const n = $t(e, s.progress);
        y.set(`#${i}`, { x: n.x, y: n.y });
      },
    });
  }
  animateInsert(t) {
    const i = `${this.id}-insert-row-${t.value}`,
      e = `${i}-id-highlight`,
      { shardIndex: r, point: s } = this.rowTarget(t.value),
      n = this.highlightedRoutes[r],
      o = this.incomingPath(),
      d = y.timeline().set(`#${i}`, {
        x: o[0].x,
        y: o[0].y,
        scale: 1,
        opacity: 0,
        transformOrigin: "0 0",
      });
    return (
      d.to(`#${i}`, { opacity: 1, duration: 0.12, ease: "power1.out" }),
      this.addEasedRowTravel(d, i, o, 1),
      d
        .call(() => {
          this.hashResultLabel.textContent = `HASH(${t.value}) % 4 = ${r}`;
        })
        .to(
          `#${e}`,
          {
            fillOpacity: 0.18,
            strokeOpacity: 1,
            duration: 0.18,
            ease: "power1.out",
          },
          "+=0.05",
        )
        .to(this.hashResultLabel, { opacity: 1, duration: 0.18 }, "<")
        .to({}, { duration: 0.4 })
        .to(`#${e}`, { fillOpacity: 0, strokeOpacity: 0, duration: 0.15 })
        .to(n, { opacity: 1, duration: 0.15 }, "<"),
      this.addEasedRowTravel(d, i, this.outgoingPath(t.value), 0.95),
      d
        .to(`#${i}`, {
          x: s.x,
          y: s.y,
          scale: this.storedRowScale,
          duration: 0.4,
          ease: "power2.inOut",
        })
        .to(n, { opacity: 0, duration: 0.18 }, "<"),
      d.to(this.hashResultLabel, { opacity: 0, duration: 0.18 }, "<")
    );
  }
  play() {
    var i;
    (i = this.timeline) == null || i.kill();
    const t = this.rows.map(({ value: e }) => `#${this.id}-insert-row-${e}`);
    (y.set(t, { x: -this.rowWidth - 20, opacity: 0, scale: 1 }),
      y.set(this.hashResultLabel, { opacity: 0 }),
      y.set(this.highlightedRoutes, { opacity: 0 }),
      (this.timeline = y.timeline({ repeat: -1, repeatDelay: 0.8 })),
      this.rows.forEach((e, r) => {
        this.timeline.add(this.animateInsert(e), 0.5 + r * 1.95);
      }),
      this.timeline
        .to({}, { duration: 2.4 })
        .to(t, { opacity: 0, duration: 0.45, ease: "power1.in" })
        .to(this.hashResultLabel, { opacity: 0, duration: 0.25 }, "<"));
  }
}
class Jt extends Bt {
  constructor(t) {
    super(t, 900, 225);
    l(this, "servers");
    l(this, "startTime");
    l(this, "animationFrame");
    l(this, "strokeColor");
    l(this, "isPlaying", !0);
    l(this, "pausedAt");
    ((this.servers = this.createServers()),
      (this.startTime = performance.now()),
      (this.strokeColor = mt().foreground),
      this.canvas.addEventListener("click", () => this.restart()),
      (this.draw = this.draw.bind(this)),
      this.draw());
  }
  createServers() {
    const t = [],
      d = (this.width - 8 - 2) / 63,
      u = (this.height - 10 - 1 * 2) / 11;
    for (let c = 0; c < 12; c++)
      for (let g = 0; g < 64; g++) {
        const f = gt(c * 64 + g);
        t.push({
          x: 1 + g * d,
          y: 1 + c * u,
          delay: (g / 63) * 1.55 + (c / 11) * 0.55 + f * 0.35,
          exitDelay:
            3.35 +
            (g / 63) * 1.05 +
            (c / 11) * 0.35 +
            gt(9e3 + c * 64 + g) * 0.35,
        });
      }
    return t;
  }
  restart() {
    this.startTime = performance.now();
  }
  setPlaying(t) {
    if (t === this.isPlaying) return;
    if (!t) {
      ((this.isPlaying = !1),
        (this.pausedAt = performance.now()),
        this.animationFrame !== void 0 &&
          (cancelAnimationFrame(this.animationFrame),
          (this.animationFrame = void 0)));
      return;
    }
    const i = performance.now();
    (this.pausedAt !== void 0 &&
      ((this.startTime += i - this.pausedAt), (this.pausedAt = void 0)),
      (this.isPlaying = !0),
      this.draw());
  }
  draw() {
    if (!this.isPlaying) return;
    const t = ((performance.now() - this.startTime) / 1e3 / Rt) % 6.15,
      i = this.context,
      e = mt();
    ((this.strokeColor = e.foreground),
      i.clearRect(0, 0, this.width, this.height),
      (i.fillStyle = e.background),
      i.fillRect(0, 0, this.width, this.height),
      (i.lineWidth = p.stroke.databaseContour),
      (i.lineCap = "round"),
      (i.strokeStyle = this.strokeColor));
    for (const r of this.servers) {
      const s =
        this.getServerOpacity(t, r.delay) *
        this.getServerExitOpacity(t, r.exitDelay);
      s <= 0.01 || ((i.globalAlpha = s), this.drawServerIcon(r.x, r.y));
    }
    ((i.globalAlpha = 1),
      (this.animationFrame = requestAnimationFrame(this.draw)));
  }
  getServerOpacity(t, i) {
    return t < i ? 0 : t < i + 0.65 ? Gt((t - i) / 0.65) : 1;
  }
  getServerExitOpacity(t, i) {
    return t < i ? 1 : t < i + 0.55 ? 1 - Ht((t - i) / 0.55) : 0;
  }
  drawServerIcon(t, i) {
    const e = this.context,
      r = 8,
      s = 10,
      n = r * J;
    (e.beginPath(),
      e.ellipse(t + r / 2, i + n, r / 2, n, 0, 0, Math.PI * 2),
      e.stroke(),
      e.beginPath(),
      e.moveTo(t, i + n),
      e.lineTo(t, i + s - n),
      e.ellipse(t + r / 2, i + s - n, r / 2, n, 0, Math.PI, 0, !0),
      e.lineTo(t + r, i + n),
      e.stroke());
  }
}
class Kt extends E {
  constructor(t) {
    super(t, 900, 675);
    l(this, "diagram");
    l(this, "root");
    l(this, "connectorLayer");
    l(this, "appConnectorLayer");
    l(this, "shardLayer");
    l(this, "proxyLayer");
    l(this, "appLayer");
    l(this, "trafficLayer");
    l(this, "servers", []);
    l(this, "shards", []);
    l(this, "appServers", []);
    l(this, "proxy");
    l(this, "timeline");
    ((this.diagram = new b(this.dom)),
      (this.root = this.createFormationLayer("formation")),
      (this.connectorLayer = this.createFormationLayer(
        "connectors",
        this.root,
      )),
      (this.appConnectorLayer = this.createFormationLayer(
        "app-connectors",
        this.root,
      )),
      (this.shardLayer = this.createFormationLayer("shards", this.root)),
      (this.proxyLayer = this.createFormationLayer("proxy-layer", this.root)),
      (this.appLayer = this.createFormationLayer("app-layer", this.root)),
      (this.trafficLayer = this.createFormationLayer(
        "traffic-layer",
        this.root,
      )),
      (this.proxy = {
        id: `${this.id}-formation-proxy`,
        x: 25,
        y: 194,
        width: 850,
        height: 60,
      }),
      this.draw());
  }
  createFormationLayer(t, i = this.diagram.dom) {
    const e = m("g");
    return (e.setAttribute("id", `${this.id}-${t}`), i.appendChild(e), e);
  }
  draw() {
    (this.drawServersAndShards(),
      this.drawShardConnectors(),
      this.drawProxy(),
      this.drawApps(),
      this.drawTraffic(),
      this.dom.addEventListener("click", () => this.play()),
      this.play());
  }
  drawServersAndShards() {
    const i = { x: 41, y: 26 },
      e = { x: 35.5, y: 20 },
      r = { x: 70, y: 49 },
      s = { x: 50.5, y: 38 },
      n = { x: 39, y: 374 },
      o = { x: 26.5, y: 39 },
      d = [
        { x: -3, y: -8 },
        { x: -8, y: 1 },
        { x: 2, y: 1 },
      ],
      u = [
        { x: -3, y: -8 },
        { x: -6, y: 1 },
        { x: 0, y: 1 },
      ];
    for (let c = 0; c < 256; c++) {
      const g = c % 16,
        f = Math.floor(c / 16),
        x = c % 32,
        $ = Math.floor(c / 32),
        S = { x: n.x + x * o.x, y: n.y + $ * o.y + 4.5 },
        M = [];
      for (let v = 0; v < 3; v++) {
        const D = c * 3 + v,
          j = D % 24,
          V = Math.floor(D / 24),
          H = {
            dom: this.drawTinyDatabase(`${this.id}-formation-server-${D + 1}`),
            initial: { x: i.x + j * e.x, y: i.y + V * e.y },
            merged: { x: r.x + g * s.x + d[v].x, y: r.y + f * s.y + d[v].y },
            final: { x: S.x + u[v].x, y: S.y + u[v].y },
          };
        (this.servers.push(H), M.push(H));
      }
      this.shards.push({ servers: M, target: S });
    }
  }
  drawTinyDatabase(t) {
    const i = m("g");
    (i.setAttribute("id", t), this.shardLayer.appendChild(i));
    const e = 8,
      r = 10,
      s = e * J,
      n = m("path");
    n.setAttribute(
      "d",
      `M 0 ${s} L 0 ${r - s} A ${e / 2} ${s} 0 0 0 ${e} ${r - s} L ${e} ${s} A ${e / 2} ${s} 0 0 1 0 ${s}`,
    );
    const o = m("ellipse");
    return (
      o.setAttribute("cx", `${e / 2}`),
      o.setAttribute("cy", `${s}`),
      o.setAttribute("rx", `${e / 2}`),
      o.setAttribute("ry", `${s}`),
      i.append(n, o),
      y.set([n, o], {
        fill: p.css.background,
        stroke: p.css.blueAccent,
        strokeWidth: 0.7,
        strokeLinecap: "round",
        vectorEffect: "non-scaling-stroke",
      }),
      i
    );
  }
  drawShardConnectors() {
    this.shards.forEach((t, i) => {
      const e = m("path");
      (e.setAttribute("id", `${this.id}-formation-shard-path-${i + 1}`),
        e.setAttribute(
          "d",
          `M ${t.target.x} ${this.proxy.y + this.proxy.height} V ${t.target.y}`,
        ),
        e.setAttribute("fill", "none"),
        e.setAttribute("stroke", p.css.connector),
        e.setAttribute("stroke-width", "0.65"),
        e.setAttribute("stroke-dasharray", "3 4"),
        e.setAttribute("stroke-linecap", "round"),
        e.setAttribute("opacity", "0.18"),
        this.connectorLayer.appendChild(e),
        this.animateFlowingDash(e, -7, 0.7));
    });
  }
  drawProxy() {
    new b(this.proxyLayer).drawBrandBox(this.proxy, "router", {
      stroke: p.css.greenAccent,
      labelColor: p.css.foreground,
      labelFontSize: 18,
      inset: 7,
    });
  }
  drawApps() {
    const t = new b(this.appLayer),
      i = 120,
      e = 62.5,
      r = 25;
    for (let s = 0; s < 5; s++) {
      const n = {
        id: `${this.id}-formation-app-${s + 1}`,
        x: r + s * (i + e),
        y: 13,
        width: i,
        height: 65,
      };
      (this.appServers.push(n),
        t.drawBrandBox(n, "app", {
          stroke: p.css.greenAccent,
          labelColor: p.css.foreground,
          labelFontSize: 13,
          inset: 5,
          hatched: !0,
        }));
      const o = n.x + n.width / 2,
        d = m("path");
      (d.setAttribute("id", `${this.id}-formation-app-path-${s + 1}`),
        d.setAttribute("d", `M ${o} ${n.y + n.height} V ${this.proxy.y}`),
        d.setAttribute("fill", "none"),
        d.setAttribute("stroke", p.css.connector),
        d.setAttribute("stroke-width", "1.2"),
        d.setAttribute("stroke-dasharray", p.stroke.connectorDashArray),
        d.setAttribute("stroke-linecap", "round"),
        this.appConnectorLayer.appendChild(d),
        this.animateFlowingDash(d, -14, 0.9));
    }
  }
  animateFlowingDash(t, i, e) {
    y.to(t, {
      attr: { "stroke-dashoffset": i },
      duration: e,
      ease: "none",
      repeat: -1,
    });
  }
  drawTraffic() {
    const t = new b(this.trafficLayer);
    for (let i = 0; i < 16; i++)
      t.drawTrafficDot(`${this.id}-formation-traffic-${i + 1}`, 4.2);
  }
  play() {
    var r;
    ((r = this.timeline) == null || r.kill(),
      y.set(this.root, { opacity: 1 }),
      y.set(
        [
          this.connectorLayer,
          this.appConnectorLayer,
          this.proxyLayer,
          this.appLayer,
        ],
        { opacity: 0 },
      ),
      y.set(this.trafficLayer, { opacity: 1 }),
      y.set(`[id^="${this.id}-formation-traffic-"]`, { opacity: 0 }),
      this.servers.forEach((s) => {
        y.set(s.dom, {
          x: s.initial.x,
          y: s.initial.y,
          scale: 1,
          opacity: 0,
          transformOrigin: "3px 2.5px",
        });
      }));
    const t = this.servers.map((s) => s.dom);
    this.timeline = y
      .timeline({ repeat: -1, repeatDelay: 0.5 })
      .to(
        t,
        {
          opacity: 1,
          duration: 0.38,
          stagger: { amount: 0.72, grid: [32, 24], from: "center" },
          ease: "power1.out",
        },
        0,
      )
      .to(
        t,
        {
          x: (s) => this.servers[s].merged.x,
          y: (s) => this.servers[s].merged.y,
          scale: 1.3,
          duration: 0.9,
          ease: "power2.inOut",
        },
        1.35,
      )
      .to(
        t,
        {
          x: (s) => this.servers[s].final.x,
          y: (s) => this.servers[s].final.y,
          scale: 0.9,
          duration: 1.25,
          ease: "power2.inOut",
        },
        2.55,
      )
      .to(
        this.connectorLayer,
        { opacity: 1, duration: 0.65, ease: "power1.out" },
        4.05,
      )
      .to(
        this.proxyLayer,
        { opacity: 1, duration: 0.6, ease: "power1.out" },
        4.2,
      )
      .to(this.appLayer, { opacity: 1, duration: 0.7, ease: "power1.out" }, 5.1)
      .to(
        this.appConnectorLayer,
        { opacity: 1, duration: 0.6, ease: "power1.out" },
        5.25,
      );
    const i = 6.2,
      e = 0.28;
    for (let s = 0; s < 16; s++) {
      const n = `${this.id}-formation-traffic-${s + 1}`,
        o = this.appServers[s % this.appServers.length],
        d = this.shards[(s * 47 + 19) % this.shards.length],
        u = o.x + o.width / 2,
        c = [
          { x: u, y: o.y + o.height },
          { x: u, y: this.proxy.y },
          { x: u, y: this.proxy.y + this.proxy.height / 2 },
          { x: d.target.x, y: this.proxy.y + this.proxy.height / 2 },
          { x: d.target.x, y: this.proxy.y + this.proxy.height },
          d.target,
        ],
        g = G(n, [...c, ...P(c).slice(1)], { duration: 3.1 });
      this.timeline.add(g, i + s * e);
    }
    this.timeline.to(
      this.root,
      { opacity: 0, duration: 0.55, ease: "power1.in" },
      13.95,
    );
  }
}
class Qt extends E {
  constructor(t) {
    super(t, 940, 470);
    l(this, "diagram");
    (R(this.dom), (this.diagram = new b(this.dom)), this.draw());
  }
  draw() {
    const t = p.css,
      i = { left: 105, top: 35, width: 760, height: 365 },
      e = i.top + i.height,
      r = 0.5,
      s = 0.75,
      n = 0.87,
      o = (w) => {
        if (w <= s)
          return n * i.width * (w - (19 / 60) * w ** 2 - (14 / 45) * w ** 3);
        const k = i.width * (s - (19 / 60) * s ** 2 - (14 / 45) * s ** 3);
        return n * (k - 1600 * (w - s) ** 2);
      },
      d = (w) => ({ x: i.left + i.width * w, y: e - o(w) }),
      u = d(0),
      c = d(r),
      g = d(s),
      f = d(1),
      x = m("defs");
    this.dom.appendChild(x);
    const $ = (w, k, L) => {
        const C = m("path");
        return (
          C.setAttribute("id", w),
          C.setAttribute("d", k),
          Object.entries(L).forEach(([T, B]) => {
            const z = T.replace(/[A-Z]/g, (_) => `-${_.toLowerCase()}`);
            C.setAttribute(z, `${B}`);
          }),
          this.diagram.dom.appendChild(C),
          C
        );
      },
      S = (w, k, L) => {
        const C = `${w}-pattern`,
          T = m("pattern");
        (T.setAttribute("id", C),
          T.setAttribute("width", "10"),
          T.setAttribute("height", "10"),
          T.setAttribute("patternUnits", "userSpaceOnUse"));
        const B = m("path");
        (B.setAttribute("d", "M -2 10 L 10 -2 M 8 12 L 12 8"),
          B.setAttribute("fill", "none"),
          B.setAttribute("stroke", L),
          B.setAttribute("stroke-opacity", `${p.opacity.hatch}`),
          B.setAttribute("stroke-width", "1"),
          T.appendChild(B),
          x.appendChild(T));
        const z = $(w, k, { fill: L, fillOpacity: 0.5, stroke: "none" }),
          _ = $(`${w}-hatch`, k, { fill: `url(#${C})`, stroke: "none" });
        return [z, _];
      },
      M = (w, k) => {
        const L = Math.round((k - w) * 100) + 1;
        return N(
          Array.from({ length: L }, (C, T) => d(w + ((k - w) * T) / (L - 1))),
        );
      },
      v = {
        fill: "none",
        strokeWidth: 5,
        strokeLinecap: "butt",
        strokeLinejoin: "round",
      };
    ([0.25, 0.5, 0.75].forEach((w, k) => {
      const L = e - i.height * w;
      $(
        `${this.id}-horizontal-guide-${k + 1}`,
        `M ${i.left} ${L} H ${i.left + i.width}`,
        {
          fill: "none",
          stroke: t.connector,
          strokeOpacity: 0.18,
          strokeWidth: 1,
          strokeDasharray: "7 9",
        },
      );
    }),
      $(`${this.id}-y-axis`, `M ${i.left} ${i.top + i.height} V ${i.top}`, {
        fill: "none",
        stroke: t.foreground,
        strokeWidth: 2,
        strokeLinecap: "round",
        "marker-end": "url(#arrowhead)",
      }),
      $(
        `${this.id}-x-axis`,
        `M ${i.left} ${i.top + i.height} H ${i.left + i.width}`,
        {
          fill: "none",
          stroke: t.foreground,
          strokeWidth: 2,
          strokeLinecap: "round",
          "marker-end": "url(#arrowhead)",
        },
      ));
    const j = this.diagram.addLabel(
      `${this.id}-y-title`,
      "SYSTEM THROUGHPUT",
      50,
      i.top + i.height / 2,
      t.foreground,
      16,
    );
    (y.set(j, { rotation: -90, transformOrigin: "center center" }),
      this.diagram.addLabel(
        `${this.id}-x-title`,
        "SYSTEM LOAD",
        i.left + i.width / 2,
        440,
        t.foreground,
        16,
      ));
    const V = S(
        `${this.id}-linear-area`,
        `M ${u.x} ${e} L ${c.x} ${c.y} V ${e} Z`,
        t.greenAccent,
      ),
      H = S(
        `${this.id}-contention-area`,
        `M ${c.x} ${c.y} L ${g.x} ${g.y} V ${c.y} Z`,
        t.blueAccent,
      ),
      et = S(
        `${this.id}-coherency-area`,
        `M ${g.x} ${g.y} L ${f.x} ${f.y} H ${g.x} Z`,
        t.accent,
      ),
      rt = $(`${this.id}-linear-scaling`, M(0, r), {
        ...v,
        stroke: t.greenAccent,
      }),
      st = $(`${this.id}-contention`, M(r, s), { ...v, stroke: t.blueAccent }),
      at = $(`${this.id}-coherency`, M(s, 1), { ...v, stroke: t.accent }),
      Y = (w, k, L) => {
        const C = m("circle");
        return (
          C.setAttribute("id", w),
          C.setAttribute("cx", `${k.x}`),
          C.setAttribute("cy", `${k.y}`),
          C.setAttribute("r", "6"),
          C.setAttribute("fill", L),
          C.setAttribute("stroke", t.background),
          C.setAttribute("stroke-width", "3"),
          this.diagram.dom.appendChild(C),
          C
        );
      },
      ot = Y(`${this.id}-linear-start-dot`, u, t.greenAccent),
      nt = Y(`${this.id}-contention-dot`, c, t.blueAccent),
      ht = Y(`${this.id}-coherency-dot`, g, t.accent),
      ct = Y(`${this.id}-coherency-end-dot`, f, t.accent),
      dt = this.diagram.addLabel(
        `${this.id}-linear-label`,
        `~LINEAR
SCALING`,
        i.left + i.width * 0.25,
        d(0.25).y - 60,
        t.greenAccent,
        16,
      ),
      lt = this.diagram.addLabel(
        `${this.id}-contention-label`,
        `CONTENTION
SLOWS SCALING`,
        i.left + i.width * 0.625,
        g.y - 38,
        t.blueAccent,
        16,
      ),
      pt = this.diagram.addLabel(
        `${this.id}-coherency-label`,
        `INCOHERENCY
CAUSES DECLINE`,
        i.left + i.width * 0.875,
        d(0.875).y - 48,
        t.accent,
        16,
      ),
      Ct = [rt, st, at],
      vt = [ot, nt, ht, ct],
      At = [dt, lt, pt],
      St = [...V, ...H, ...et],
      yt = [...Ct, ...vt, ...At, ...St];
    (y.set(yt, { opacity: 0 }),
      y
        .timeline({
          delay: 0.2,
          repeat: -1,
          repeatDelay: 0.4,
          defaults: { duration: 0.8, ease: "power2.inOut" },
        })
        .to([rt, ot, dt], { opacity: 1 })
        .to([st, nt, lt], { opacity: 1 }, "+=0.5")
        .to([at, ht, ct, pt], { opacity: 1 }, "+=0.5")
        .to(V, { opacity: 1, duration: 0.8 }, "+=0.15")
        .to(H, { opacity: 1, duration: 0.8 }, "+=0.5")
        .to(et, { opacity: 1, duration: 0.8 }, "+=0.5")
        .to({}, { duration: 4 })
        .to(yt, { opacity: 0, duration: 0.65 }));
  }
}
const ti = {
  servers: Jt,
  "shard-formation": Kt,
  "primary-replicas": Yt,
  sharding: Xt,
  "simple-sharded": qt,
  "tons-of-shards": _t,
  "shard-inserts": Zt,
  "proxy-plan": zt,
  pgbouncer: Ut,
  "full-sharded": jt,
  "universal-scalability-law": Qt,
  "popular-arch": Vt,
};
function ii(h) {
  const a = ti[h];
  a &&
    Mt(`[data-id="${h}"]`).then(() => {
      new a(h).observePlaybackVisibility();
    });
}
ii(ft);
