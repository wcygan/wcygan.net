var N = Object.defineProperty;
var V = (r, t, e) =>
  t in r
    ? N(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e })
    : (r[t] = e);
var v = (r, t, e) => V(r, typeof t != "symbol" ? t + "" : t, e);
import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ import { g as n } from "./index-Brfk6Bdo.js";
const O = document.querySelector("#app");
if (O) {
  const r = document.URL.split("#")[1];
  if (r) {
    const t = document.createElement("div");
    ((t.dataset.id = r), O.appendChild(t));
  }
}
const p = "#00000000",
  T = "var(--text-green)",
  L = "var(--text-blue)",
  W = "var(--text-red)",
  M = "var(--text-orange)",
  m = "var(--text-primary)",
  E = "var(--bg-primary)";
class S {}
(v(S, "GENERIC", "generic"),
  v(S, "SELECT", "select"),
  v(S, "STEPS", "steps"),
  v(S, "USER", "user"));
function F(r, t) {
  return ("" + r).padStart(t).replaceAll(" ", "0");
}
function X(r, t) {
  return ("" + r).padStart(t).replaceAll(" ", "&nbsp;");
}
function P(r) {
  return Math.floor(Math.random() * r);
}
const B = class B {
  constructor(t) {
    ((this.dom = this.createGroup()),
      t.appendChild(this.dom),
      (this.x = 0),
      (this.y = 0));
  }
  draw(t, e) {
    ((this.x = t), (this.y = e));
  }
  createGroup(t) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", "g");
    return (e.setAttribute("id", `drawable-${B.globalIDSequence++}`), e);
  }
  inOutText(t, e, i, s, h) {
    const d = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ((d.innerHTML = e),
      d.setAttribute("id", `Hash${g.globalIDSequence++}`),
      d.setAttribute("dominant-baseline", "middle"),
      this.dom.appendChild(d),
      n.set(`#${d.id}`, {
        x: i,
        y: s,
        fontFamily: "monospace",
        fontSize: 14,
        fill: m,
        opacity: 0,
        userSelect: "none",
      }),
      t
        .to(`#${d.id}`, { opacity: 1, x: i + h / 2, ease: "none" }, "<")
        .to(`#${d.id}`, { opacity: 0, x: i + h, ease: "none" }, ">")
        .add(() => d.remove()));
  }
  drawLine(t, e, i, s, h) {
    const d = document.createElementNS("http://www.w3.org/2000/svg", "line");
    (d.setAttribute("id", t),
      this.dom.appendChild(d),
      n.set(`#${t}`, {
        attr: { x1: e, y1: i, x2: s, y2: h },
        stroke: "var(--text-secondary)",
        opacity: 0.25,
        strokeWidth: 2,
      }));
  }
  addLabel(t, e, i, s, h, d, a, o, c = void 0, x = p, u = void 0) {
    i = Math.floor(i);
    const l = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (
      (l.setAttribute("id", `${t}`),
      this.dom.appendChild(l),
      n.set(`#${t}`, { cursor: "pointer" }),
      c != null)
    ) {
      const C = this.drawBox(`${t}Background`, s, h, d, a, x, c);
      if (
        (C.addEventListener("click", u),
        n.set(`#${C.id}`, {
          filter: "brightness(100%)",
          transformOrigin: "50% 50%",
        }),
        l.appendChild(C),
        u)
      ) {
        (n.set(`#${t}`, { scale: 0.975, transformOrigin: "50% 50%" }),
          n.to(`#${t}`, {
            ease: "power1.inOut",
            paused: !1,
            duration: 1,
            scale: 1.025,
            transformOrigin: "50% 50%",
            stagger: { repeat: -1, yoyo: !0 },
          }));
        const y = n.to(`#${C.id}`, {
            paused: !0,
            duration: 0.125,
            filter: "brightness(120%)",
            transformOrigin: "50% 50%",
          }),
          I = n.to(`#${C.id}`, {
            paused: !0,
            duration: 0.125,
            filter: "brightness(80%)",
            transformOrigin: "50% 50%",
          });
        (l.addEventListener("touchstart", () => {
          ((g.usingTouch = !0), I.play());
        }),
          l.addEventListener("touchend", () => {
            I.reverse();
          }),
          l.addEventListener("touchcancel", () => {
            I.reverse();
          }),
          l.addEventListener("mouseenter", () => {
            g.usingTouch || y.play();
          }),
          l.addEventListener("mouseleave", () => {
            g.usingTouch || y.reverse();
          }),
          l.addEventListener("mousedown", () => {
            g.usingTouch || y.duration(0.025).reverse();
          }),
          l.addEventListener("mouseup", () => {
            g.usingTouch || y.duration(0.025).play();
          }));
      }
    }
    let R = 0;
    for (const C of e) {
      const y = document.createElementNS("http://www.w3.org/2000/svg", "text");
      (l.appendChild(y),
        y.setAttribute("id", `${t}Label${g.globalIDSequence++}`),
        y.addEventListener("click", u),
        y.setAttribute("dominant-baseline", "middle"),
        y.setAttribute("text-anchor", "middle"),
        (y.style.fontFamily = "monospace"),
        (y.innerHTML = C),
        n.set(`#${y.id}`, {
          cursor: "pointer",
          x: s + d / 2,
          y: h + a / 2 + (R + 0.5) * i - (e.length / 2) * i,
          fill: o,
          fontSize: Math.floor(i),
          fontWeight: "bold",
          userSelect: "none",
        }),
        R++);
    }
  }
  drawBox(t, e, i, s, h, d, a, o = 1) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    return (
      c.setAttribute("id", t),
      this.dom.appendChild(c),
      n.set(`#${t}`, {
        width: s,
        height: h,
        fill: a,
        opacity: o,
        stroke: d,
        filter: "drop-shadow(0px 2px 4px #00000025)",
        strokeWidth: 2,
        x: e,
        y: i,
        userSelect: "none",
      }),
      c
    );
  }
};
(v(B, "globalIDSequence", 1), v(B, "speed", 1), v(B, "usingTouch", !1));
let $ = B;
class H extends $ {
  constructor(t, e, i) {
    (super(t), (this.type = S.GENERIC), (this.width = e), (this.height = i));
  }
  clone(t) {
    const e = new H(t, this.width, this.height);
    return ((e.x = this.x), (e.y = this.y), e.draw(e.x, e.y), e);
  }
  purgeFlash(t = void 0) {
    (t || n.timeline({ defaults: { duration: f() * 0.5 } }))
      .to(`#${this.dom.id}Rect`, { fill: W, duration: 0 })
      .to(`#${this.dom.id}`, {
        transformOrigin: "50% 50%",
        scale: 1.2,
        duration: f() * 0.25,
      })
      .to(`#${this.dom.id}`, { transformOrigin: "50% 50%", scale: 0 })
      .add(() => this.dom.remove());
  }
  purge(t = void 0, e = "+=0") {
    (t || n.timeline({ defaults: { duration: f() * 0.5 } }))
      .to(`#${this.dom.id}`, { opacity: 0 }, e)
      .add(() => this.dom.remove(), e);
  }
  reveal(t, e = "+=0") {
    t.to(`#${this.dom.id}`, { duration: f() * 0.125, opacity: 1 }, e);
  }
  move(t, e, i, s = "+=0") {
    ((this.x = e),
      (this.y = i),
      t.to(`#${this.dom.id}`, { x: e, y: i, ease: "none" }, s));
  }
  toString() {
    return "select";
  }
  draw(t, e, i = void 0, s = 0) {
    (n.set(`#${this.dom.id}`, {
      x: t,
      y: e,
      transformOrigin: "50% 50%",
      opacity: s,
    }),
      this.drawBox(
        `${this.dom.id}Rect`,
        0,
        0,
        this.width,
        this.height,
        p,
        m,
        0.25,
      ));
    const h = document.createElementNS("http://www.w3.org/2000/svg", "text");
    (this.dom.appendChild(h),
      h.setAttribute("id", `${this.dom.id}Text`),
      h.setAttribute("dominant-baseline", "middle"),
      h.setAttribute("text-anchor", "middle"),
      (h.style.fontFamily = "monospace"),
      i ? (h.innerHTML = i) : (h.innerHTML = this.toString()),
      n.set(`#${this.dom.id}Text`, {
        width: this.width,
        height: this.height,
        x: this.width / 2,
        y: this.height / 2,
        fill: m,
        userSelect: "none",
        fontSize: 3 + this.width * 0.075 + "px",
        fontWeight: "bold",
      }));
  }
}
class D extends H {
  constructor(t, e, i, s) {
    (super(t, e, i),
      (this.type = S.STEPS),
      (this.data = {
        id: (s % 4) + 1,
        steps: P(1e4),
        date: `${F(1 + P(8), 2)}/${F(1 + P(8), 2)}`,
      }));
  }
  clone(t) {
    const e = new D(t, this.width, this.height, this.data_id);
    return (
      (e.data.id = this.data.id),
      (e.data.steps = this.data.steps),
      (e.data.date = this.data.date),
      (e.x = this.x),
      (e.y = this.y),
      e.draw(e.x, e.y),
      e
    );
  }
  toString() {
    return (
      this.data.id + " | " + X(this.data.steps, 4) + " | " + this.data.date
    );
  }
}
const k = class k extends H {
  constructor(t, e, i, s) {
    (super(t, e, i),
      (this.type = S.USER),
      (this.data = {
        id: s,
        age: Math.floor(Math.random() * 56) + 21,
        name: k.names[k.nameSequence++ % k.names.length],
      }));
  }
  clone(t) {
    const e = new k(t, this.width, this.height, this.data_id);
    return (
      (e.data.id = this.data.id),
      (e.data.age = this.data.age),
      (e.data.name = this.data.name),
      (e.x = this.x),
      (e.y = this.y),
      e.draw(e.x, e.y),
      e
    );
  }
  toString() {
    return X(this.data.id, 2) + " | " + this.data.name + " | " + this.data.age;
  }
};
(v(k, "names", [
  "joe",
  "ann",
  "ben",
  "aly",
  "ian",
  "cam",
  "sam",
  "ray",
  "jil",
  "liz",
  "dan",
  "nik",
]),
  v(k, "nameSequence", 0));
let A = k;
class G extends $ {
  constructor(t, e, i, s, h, d, a, o) {
    (super(t),
      (this.label = s),
      (this.rowCount = i),
      (this.replicating = a),
      (this.rows = []));
    for (let c = 0; c < this.rowCount; c++) this.rows.push(void 0);
    this.replicaRows = [[], []];
    for (let c = 0; c < this.rowCount; c++)
      (this.replicaRows[0].push(void 0), this.replicaRows[1].push(void 0));
    ((this.hotCount = 0),
      (this.width = h),
      (this.height = d),
      (this.padding = o));
  }
  clear() {
    const t = n.timeline({ defaults: { duration: f() * 0.5 } });
    for (let e = 0; e < this.rows.length; e++)
      this.rows[e] && (this.rows[e].purgeFlash(t), (this.rows[e] = void 0));
  }
  getShardRowY(t, e) {
    return this.y + (this.padding + t.height) * e + this.padding;
  }
  insertRow(t, e) {
    let i, s;
    const h = this.isFull();
    if (h) {
      (this.hot(), (s = this.getOverWriteIndex()));
      const d = this.rows[s];
      ((i = d.y),
        e.move(t, d.x, d.y),
        d.purge(t),
        t
          .add(() => {
            this.cool();
          })
          .add(() => e.dom.addEventListener("click", () => e.purgeFlash())),
        this.overWriteIndex(s, e));
    } else
      ((s = this.addRow(e)),
        (i = this.getShardRowY(e, s)),
        e.move(t, this.x + this.padding, i),
        t.add(() => e.dom.addEventListener("click", () => e.purgeFlash())));
    if (this.replicating) {
      const d = this.height * 0.6,
        a = this.x + this.width * 1.2,
        o = [-d, d];
      for (let c = 0; c < o.length; c++) {
        const x = o[c],
          u = e.clone(this.dom);
        (u.reveal(t, "<"),
          u.move(t, a + this.padding, i + x, "<"),
          h && this.replicaRows[c][s].purge(t, ">"),
          (this.replicaRows[c][s] = u));
      }
    }
  }
  drawAsBackup(t, e, i) {
    (super.draw(t, e),
      this.drawBox(`${this.dom.id}Box`, t, e, this.width, this.height, M, p),
      this.addLabel(
        `${this.dom.id}BackupLabel`,
        [this.label],
        this.width * 0.1,
        t,
        e - this.width * 0.1,
        this.width,
        this.width / 58,
        M,
        void 0,
        p,
        () => this.clear(),
      ),
      this.drawLine(
        `${this.dom.id}BackupLine`,
        i + this.width,
        e + this.height / 2,
        t,
        e + this.height / 2,
      ));
  }
  draw(t, e) {
    const i = `${this.dom.id}`;
    this.drawBox(i + "Rect", t, e, this.width, this.height, L, p);
    const s = this.height * 0.6,
      h = t + this.width * 1.2;
    if (this.replicating)
      for (const d of [Math.floor(e - s), Math.floor(e + s)])
        (this.drawBox(
          `${this.dom.id}-${d}`,
          h,
          d,
          this.width,
          this.height,
          L,
          p,
        ),
          this.drawLine(
            `${this.dom.id}-${d}-Line`,
            t + this.width,
            e + this.height / 2,
            h,
            d + this.height / 2,
          ));
    (this.addLabel(
      i + "ShardLabel",
      [this.label],
      this.width * 0.1,
      t,
      e - this.width * 0.085,
      this.width,
      this.width / 58,
      L,
      void 0,
      p,
      () => this.clear(),
    ),
      super.draw(t, e));
  }
  hot() {
    (this.hotCount++,
      !(this.hotCount > 1) &&
        (n.set(`#${this.dom.id}Rect`, { stroke: W }),
        (this.hotTimeline = n
          .timeline({ repeat: -1, yoyo: !0, defaults: { duration: f() * 0.5 } })
          .add("start")
          .to(
            `#${this.dom.id}Rect`,
            {
              scale: 1.05,
              stroke: W,
              transformOrigin: "50% 50%",
              ease: "power1.inOut",
            },
            "start",
          )),
        this.hotTimeline.play(0)));
  }
  cool() {
    (this.hotCount--,
      !this.hotCount &&
        this.hotTimeline &&
        (this.hotTimeline.pause(),
        n.to(`#${this.dom.id}Rect`, { strokeWidth: 2, stroke: L, scale: 1 })));
  }
  isFull() {
    for (const t of this.rows) if (t == null) return !1;
    return !0;
  }
  getOverWriteIndex() {
    return P(this.rows.length);
  }
  overWriteIndex(t, e) {
    this.rows[t] = e;
  }
  addRow(t) {
    for (let e = 0; e < this.rows.length; e++)
      if (this.rows[e] == null) return ((this.rows[e] = t), e);
    return -1;
  }
  removeRow(t) {
    for (let e = 0; e < this.rows.length; e++)
      if (this.rows[e] != null && this.rows[e].id == t.id) {
        this.rows[e] = void 0;
        return;
      }
  }
}
class z extends $ {
  constructor(t, e, i, s, h, d, a) {
    (super(t), (this.rowCount = i), (this.rows = []));
    for (let o = 0; o < this.rowCount; o++) this.rows.push(void 0);
    ((this.queue = []),
      (this.isHot = !1),
      (this.width = s),
      (this.height = h),
      (this.app = d),
      (this.padding = a));
  }
  getClusterProxyRowY(t, e) {
    return this.y + (this.padding + t.height) * e + this.padding;
  }
  dequeue(t) {
    if (this.queue.length == 0) return;
    const e = this.queue.shift();
    if (this.isFull()) this.hot();
    else {
      const i = n.timeline({ defaults: { duration: f() * 0.5 } });
      (this.receiveRow(i, e.row, e.shard, t, e.rows),
        this.queue.length == 0 && this.cool());
    }
  }
  handleSelect(t, e, i) {
    const s = [];
    t.addLabel("select");
    for (const h of i) {
      const d = q.spawnRowCustom(
        S.SELECT,
        "select",
        this.dom,
        e.width,
        e.height,
        0,
      );
      (d.draw(e.x, e.y),
        d.reveal(t, "select"),
        d.move(t, h.x, h.y, ">"),
        d.purge(t, ">"));
      const a = h.clone(this.dom);
      (a.reveal(t, ">"), a.move(t, e.x, e.y, ">"), s.push(a));
    }
    (e.purge(t),
      t.add(
        (() => {
          (this.removeRow(e), this.dequeue(void 0));
        }).bind(this),
      ),
      this.app.handleReturnedRows(t, s));
  }
  handleInsert(t, e, i, s) {
    t.add(
      (() => {
        (this.removeRow(e), this.dequeue(s), i.insertRow(t, e));
      }).bind(this),
    );
  }
  receiveRow(t, e, i, s, h) {
    const d = this.addRow(e),
      a = this.getClusterProxyRowY(e, d);
    if (
      (e.move(t, e.x, a),
      t.to(`#${e.id}`, { duration: f() * 1 }),
      s && s.type == "hash" && e.type != S.SELECT)
    ) {
      const o = "hash = " + s.keyFunction(e.data[s.column]);
      this.inOutText(t, o, this.x + this.width, a + e.height / 2, 20);
    }
    h
      ? (h.length == 0 &&
          this.inOutText(
            t,
            "no rows!",
            this.x + this.width,
            a + e.height / 2,
            20,
          ),
        this.handleSelect(t, e, h))
      : this.handleInsert(t, e, i, s);
  }
  processRow(t, e, i, s, h) {
    t.add(() => {
      this.isFull()
        ? (this.queue.push({ row: e, shard: i, rows: h }), this.hot())
        : (this.receiveRow(t, e, i, s, h),
          this.queue.length == 0 && this.cool());
    });
  }
  draw(t, e, i) {
    for (let s = 0; s < i.length; s++)
      this.drawLine(
        `${this.dom.id}-${i[s].dom.id}`,
        t + this.width,
        e + this.height / 2,
        i[s].x,
        i[s].y + this.height / 2,
      );
    (this.drawBox(`${this.dom.id}Rect`, t, e, this.width, this.height, m, p),
      this.addLabel(
        `${this.dom.id}ClusterProxyLabel`,
        ["Proxy"],
        this.width * 0.12,
        t,
        e - this.height / 2 - this.width * 0.1,
        this.width,
        this.height,
        m,
        void 0,
        p,
      ),
      super.draw(t, e));
  }
  hot() {
    this.isHot ||
      ((this.isHot = !0),
      n.set(`#${this.dom.id}Rect`, { stroke: W }),
      (this.hotTimeline = n
        .timeline({ repeat: -1, yoyo: !0, defaults: { duration: f() * 0.5 } })
        .add("start")
        .to(
          `#${this.dom.id}Rect`,
          {
            scale: 1.05,
            stroke: W,
            transformOrigin: "50% 50%",
            ease: "power1.inOut",
          },
          "start",
        )),
      this.hotTimeline.play(0));
  }
  cool() {
    ((this.isHot = !1),
      this.hotTimeline &&
        (this.hotTimeline.pause(),
        n.to(`#${this.dom.id}Rect`, { strokeWidth: 2, stroke: m, scale: 1 })));
  }
  isFull() {
    for (const t of this.rows) if (t == null) return !1;
    return !0;
  }
  addRow(t) {
    for (let e = 0; e < this.rows.length; e++)
      if (this.rows[e] == null) return ((this.rows[e] = t), e);
    return -1;
  }
  removeRow(t) {
    for (let e = 0; e < this.rows.length; e++)
      if (this.rows[e] != null && this.rows[e].dom.id == t.dom.id) {
        this.rows[e] = void 0;
        return;
      }
  }
}
class j extends $ {
  constructor(t, e, i, s, h) {
    (super(t),
      (this.id = e),
      (this.width = i),
      (this.height = s),
      (this.padding = h));
  }
  handleReturnedRows(t, e) {
    t.addLabel("return");
    for (const i of e) {
      const s = this.y + this.height / 2 - i.height / 2,
        h = this.x;
      (i.move(t, h, s, "return"), i.move(t, -200, s, ">"), i.purge(t, ">"));
    }
  }
  insertRowIntoShard(t, e, i) {
    const s = e.x - t.width,
      h = e.y + e.height / 2 - t.height / 2;
    e.x + this.padding;
    const d = n.timeline({ defaults: { duration: i * 0.5 } });
    (t.reveal(d), t.move(d, s, h), e.insertRow(d, t));
  }
  insertRowIntoShardWithClusterProxy(t, e, i, s, h) {
    const d = i.x + this.padding,
      a = i.y + i.height + this.padding,
      o = n.timeline({ defaults: { duration: s * 0.5 } });
    (t.reveal(o), t.move(o, d, a), i.processRow(o, t, e, h, void 0));
  }
  draw(t, e, i, s, h, d, a, o, c) {
    super.draw(t, e);
    let x = i;
    s.length > 0 && (x = s);
    for (let u = 0; u < x.length; u++) {
      const l = x[u];
      this.drawLine(
        `${this.dom.id}-${l.dom.id}`,
        t + this.width,
        e + this.height / 2,
        l.x,
        l.y + l.height / 2,
      );
    }
    if (
      (this.drawBox(`${this.dom.id}Box`, t, e, this.width, this.height, T, p),
      this.addLabel(
        `${this.dom.id}AppLabel`,
        ["App server"],
        this.width * 0.12,
        t + this.padding,
        e - this.width * 0.16,
        this.width,
        this.width * 0.11,
        T,
        void 0,
        p,
        o,
      ),
      h)
    ) {
      let u = this.height - this.padding * 2;
      (d && (u = this.height / 2 - this.padding * 1.5),
        this.addLabel(
          `${this.dom.id}Insert`,
          ["insert", "row"],
          this.width / 7,
          t + this.padding,
          e + this.padding,
          this.width - this.padding * 2,
          u,
          E,
          T,
          p,
          o,
        ));
    }
    if (d) {
      let u = this.height - this.padding * 2;
      h && (u = this.height / 2 - this.padding * 1.5);
      let l = ["select", "row"],
        R = this.width / 7;
      (a &&
        ((R = this.width / 9),
        a.begin && a.end
          ? (l = ["select", "where", `${a.begin} <= ${a.column} <= ${a.end}`])
          : a.equals &&
            (l = ["select", "where", `${a.column} == ${a.equals}`])),
        this.addLabel(
          `${this.dom.id}Select`,
          l,
          R,
          t + this.padding,
          e + this.height - u - this.padding,
          this.width - this.padding * 2,
          u,
          E,
          T,
          p,
          c,
        ));
    }
  }
}
class q extends $ {
  constructor(t, e, i, s, h, d, a) {
    (super(t),
      (this.container = t),
      (this.width = h),
      (this.height = d),
      (this.strategy = a.strategy),
      (this.shards = []),
      (this.proxies = []),
      (this.backups = []),
      (this.proxyCount = i),
      (this.select = a.select),
      (this.rowType = a.rowType),
      (this.shardCount = s),
      (this.idCounter = 1),
      (this.rowsPerShard = a.rowsPerShard),
      (this.backup = a.backup),
      (this.replicating = a.replicating),
      (this.strategy = a.strategy),
      this.setSizes(),
      (this.rowIDSequence = 1),
      (this.app = new j(
        t,
        `app-${this.id}-${g.globalIDSequence++}`,
        this.appWidth,
        this.appHeight,
        this.padding,
      )));
    for (let o = 0; o < i; o++) {
      const c = new z(
        t,
        `proxy-${this.id}-${g.globalIDSequence++}`,
        this.rowsPerShard,
        this.proxyWidth,
        this.proxyHeight,
        this.app,
        this.padding,
      );
      this.proxies.push(c);
    }
    for (let o = 0; o < s; o++) {
      const c = new G(
        t,
        `shard-${this.id}-${g.globalIDSequence++}`,
        this.rowsPerShard,
        this.getShardLabelText(o),
        this.shardWidth,
        this.shardHeight,
        this.replicating,
        this.padding,
      );
      this.shards.push(c);
    }
    if (this.backup)
      for (let o = 0; o < s; o++) {
        const c = new G(
          t,
          `backup-${this.id}-${g.globalIDSequence++}`,
          this.rowsPerShard,
          this.getBackupLabelText(o),
          this.shardWidth,
          this.shardHeight,
          this.padding,
        );
        this.backups.push(c);
      }
    this.rowLayer = new $(t);
  }
  performBackup() {
    const t = n.timeline({ defaults: { duration: f() * 0.5 } });
    for (const i of this.backups)
      for (let s = 0; s < i.rows.length; s++)
        i.rows[s] != null && (i.rows[s].purge(t, "0"), (i.rows[s] = void 0));
    let e = 0;
    for (const i of this.shards) {
      const s = n.timeline({ defaults: { duration: f() * 0.5 } }),
        h = this.backups[e],
        d = this.shardGap + (this.shardGap + this.shardHeight) * e;
      for (const a of i.rows) {
        const o = a.clone(this.dom),
          c = h.addRow(o),
          x = d + (this.padding + (this.rowHeight + this.padding) * c);
        (o.reveal(s),
          o.move(s, h.x + this.padding, x),
          s.to(`#${o.dom.id}`, { duration: f() * 0.25 }));
      }
      e++;
    }
  }
  getShardToInsertRow(t) {
    const e = this.strategy;
    if (e) {
      if (e.type == "range")
        for (let s = 0; s < e.shards.length; s++) {
          const h = e.shards[s];
          if (h.begin <= t.data[e.column] && t.data[e.column] <= h.end)
            return this.shards[s];
        }
      else if (e.type == "hash")
        for (let s = 0; s < e.shards.length; s++) {
          const h = e.shards[s],
            d = e.keyFunction(t.data[e.column]);
          if (h.begin <= d && d <= h.end) return this.shards[s];
        }
    }
    const i = Math.floor(Math.random() * this.shards.length);
    return this.shards[i];
  }
  getClusterProxyForRow() {
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }
  insertRow(t = void 0) {
    t == null && (t = f());
    const e = q.spawnRowCustom(
      this.rowType,
      "TODO",
      this.rowLayer.dom,
      this.rowWidth,
      this.rowHeight,
      this.rowIDSequence++,
    );
    e.draw(
      this.width * 0.15 - this.rowWidth / 2,
      this.height * 0.5 - this.rowHeight / 2,
    );
    const i = this.getShardToInsertRow(e);
    if (this.proxies.length == 0) this.app.insertRowIntoShard(e, i, t);
    else {
      const s = this.getClusterProxyForRow(e);
      this.app.insertRowIntoShardWithClusterProxy(e, i, s, t, this.strategy);
    }
  }
  selectRowsWithClusterProxy(t, e, i) {
    const s = i.x + this.padding,
      h = i.y + i.height + this.padding,
      d = n.timeline({ defaults: { duration: f() * 0.5 } });
    (t.reveal(d), t.move(d, s, h), i.processRow(d, t, void 0, void 0, e));
  }
  selectRows(t) {
    const e = n.timeline({ defaults: { duration: f() * 0.5 } });
    t.length == 0 &&
      this.inOutText(
        e,
        "no rows!",
        this.app.x + this.app.width,
        this.app.y + this.app.height / 2,
        50,
      );
    for (const i of t) {
      const s = this.spawnRow(S.SELECT, "select");
      (s.reveal(e), s.move(e, i.x, i.y), s.purge(e));
      const h = i.clone(this.dom);
      h.reveal(e);
      const d = this.app.y + this.app.height / 2 - h.height / 2;
      (h.move(e, this.app.x, d), h.move(e, -200, d), h.purge(e));
    }
  }
  selectRow(t) {
    const e = t ? this.getMatchingRows(t) : this.getRandomSelect();
    if (this.proxies.length == 0) this.selectRows(e);
    else {
      const i = this.spawnRow(S.SELECT, "select"),
        s = this.getClusterProxyForRow(i);
      this.selectRowsWithClusterProxy(i, e, s);
    }
  }
  drawBackups() {
    for (let t = 0; t < this.backups.length; t++) {
      const e = this.shardGap + (this.shardGap + this.shardHeight) * t;
      this.backups[t].drawAsBackup(this.backupX, e, this.shardX);
    }
    this.addLabel(
      `BackupButton-${g.globalIDSequence++}`,
      ["run backup"],
      this.backupWidth * 0.125,
      this.width / 2 - this.backupWidth / 2,
      this.height / 50,
      this.backupWidth,
      this.height * 0.125,
      m,
      M,
      p,
      (() => {
        this.performBackup();
      }).bind(this),
    );
  }
  spawnRow(t, e) {
    const i = q.spawnRowCustom(
      t,
      e,
      this.dom,
      this.rowWidth,
      this.rowHeight,
      this.rowIDSequence++,
    );
    return (
      i.draw(
        this.width * 0.15 - this.rowWidth / 2,
        this.height * 0.5 - this.rowHeight / 2,
      ),
      i
    );
  }
  static spawnRowCustom(t, e, i, s, h, d) {
    let a;
    return (
      t == S.STEPS
        ? (a = new D(i, s, h, d))
        : t == S.USER || t == null
          ? (a = new A(i, s, h, d))
          : (a = new H(i, s, h)),
      (a.type = t),
      a
    );
  }
  drawApp(t, e) {
    const i = this.height / 2 - this.appHeight / 2;
    this.app.draw(
      this.appX,
      i,
      this.shards,
      this.proxies,
      t,
      e,
      this.select,
      (() => {
        this.insertRow();
      }).bind(this),
      (() => {
        this.selectRow(this.select);
      }).bind(this),
    );
  }
  drawShards() {
    for (let t = 0; t < this.shards.length; t++) {
      const e = this.shardGap + (this.shardGap + this.shardHeight) * t;
      this.shards[t].draw(this.shardX, e);
    }
  }
  drawProxies() {
    for (let t = 0; t < this.proxies.length; t++) {
      const e = this.proxyGap + (this.proxyGap + this.proxyHeight) * t;
      this.proxies[t].draw(this.proxyX, e, this.shards);
    }
  }
  setSizes() {
    const t = this.shardCount,
      e = this.proxyCount != 0;
    ((this.padding = Math.floor(this.height * 0.01)),
      (this.shardWidth = this.replicating
        ? e
          ? this.width / 6
          : this.width / 4.5
        : e
          ? this.width / 4
          : this.width / 4),
      (this.shardGap = this.replicating
        ? (this.height / t) * 0.5
        : t == 1
          ? (this.height / t) * 0.15
          : (this.height / t) * 0.25),
      (this.shardHeight = (this.height - this.shardGap * (t + 1)) / t),
      (this.shardChunk = this.height / (this.shardCount + 1)),
      (this.shardX = void 0),
      this.replicating
        ? (this.shardX = this.width * 0.75 - this.shardWidth * 1.1)
        : this.backup > 0
          ? (this.shardX = this.shardWidth * 0.05)
          : (this.shardX = this.width - this.shardWidth * 1.1),
      (this.totalRowSpace = this.padding * (this.rowsPerShard + 1)),
      (this.rowHeight =
        (this.shardHeight - this.totalRowSpace) / this.rowsPerShard),
      (this.rowWidth = this.shardWidth - this.padding * 2),
      (this.proxyWidth = this.shardWidth),
      (this.proxyHeight = this.shardHeight),
      (this.proxySpace = this.height - this.proxyHeight * this.proxyCount),
      (this.proxyGap = this.proxySpace / (this.proxyCount + 1)),
      (this.proxyChunk = this.proxyGap + this.proxyHeight),
      (this.proxyX = this.replicating
        ? this.width * 0.39 - this.proxyWidth * 0.5
        : this.width * 0.47 - this.proxyWidth * 0.5),
      (this.appWidth = this.replicating
        ? this.shardWidth * 1.4
        : this.shardWidth),
      (this.appHeight =
        this.showInsert && this.showSelect
          ? this.height / 1.5
          : this.height / 3),
      (this.appHeight = Math.max(250, this.appHeight)),
      (this.appButtonHeight = this.appHeight / 4),
      (this.appX = (this.replicating, 1)),
      (this.backupWidth = this.shardWidth),
      (this.backupX = this.width - this.backupWidth * 1.05),
      (this.backupHeight = this.shardHeight),
      (this.backupGap = (this.height - this.backupHeight) / 2));
  }
  getShardLabelText(t) {
    const e = this.strategy;
    if (this.shardCount == 1) return "Database";
    if (e) {
      if (e.type == "range")
        return `${e.column} ${e.shards[t].begin}-${e.shards[t].end}`;
      if (e.type == "hash")
        return `hashed ${e.column} ${e.shards[t].begin}-${e.shards[t].end}`;
      if (e.type == "none") return "Database";
    }
    return `Shard ${t + 1}`;
  }
  getBackupLabelText(t) {
    return this.shardCount == 1 ? "Backup server" : `Backup server ${t}`;
  }
  removeRow(t) {
    for (const e of this.shards)
      for (let i = 0; i < e.rows.length; i++)
        if (e.rows[i] && e.rows[i].id == t) {
          e.rows[i] = void 0;
          return;
        }
  }
  getMatchingRows(t) {
    const e = [];
    for (const i of this.shards)
      for (const s of i.rows)
        ((s && t.equals && t.equals == s.data[t.column]) ||
          (s &&
            t.begin &&
            t.end &&
            t.begin <= s.data[t.column] &&
            s.data[t.column] <= t.end)) &&
          e.push(s);
    return e;
  }
  getRandomSelect() {
    const t = [];
    for (const e of this.shards) for (const i of e.rows) i && t.push(i);
    return t.length == 0 ? [] : [t[Math.floor(Math.random() * t.length)]];
  }
}
class g {
  constructor(t, e, i) {
    ((this.id = t), this.setupDom(e, i));
  }
  setupDom(t, e) {
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (i.setAttribute("viewBox", `0 0 ${t} ${e}`),
      i.setAttribute("id", `${this.id}SVG`),
      (i.style.marginBottom = "1.35em"),
      document.querySelector(`[data-id="${this.id}"]`).appendChild(i),
      (this.dom = i),
      n.set(`#${this.id}SVG`, {
        width: "100%",
        height: "100%",
        backgroundColor: "#00000000",
      }));
  }
}
(v(g, "globalIDSequence", 1), v(g, "usingTouch", !1));
class Y extends g {
  constructor(t, e) {
    (super(t, 1e3, 250),
      (this.width = 1e3),
      (this.height = 250),
      (this.stops = e),
      (this.drawable = new $(this.dom)),
      this.draw());
  }
  draw() {
    const t = this.stops.length,
      e = 50,
      i = 25,
      h = this.width / t / 2,
      d = 150,
      a = (this.width - i * 2 - h * t) / (t - 1);
    let o = 0;
    const c = 80,
      x = n.timeline({ repeat: -1, yoyo: !0, defaults: { duration: f() * 1 } });
    for (const u of this.stops) {
      const l = i + (h + a) * o;
      if (
        (this.drawable.addLabel(
          `${u.name}-${g.globalIDSequence++}`,
          [u.name],
          20,
          l,
          e,
          h,
          d,
          u.color,
          p,
          u.color,
        ),
        o < this.stops.length - 1)
      ) {
        const R = `${u.name}-Request-${g.globalIDSequence++}`;
        (this.drawable.addLabel(R, ["request"], 14, 0, 0, c, c, m, p, m),
          n.set(`#${R}`, { x: l + h, y: this.height / 2 - c / 2 }),
          x.to(`#${R}`, { x: l + h + a - c, ease: "none", duration: f() }));
      }
      o++;
    }
  }
}
function f() {
  const r = top.document.querySelector('iframe[src$="#sharding-duration"]');
  if (!r) return 1;
  const t = r.contentWindow.document.getElementById(
    "database-sharding-global-speed",
  );
  return t && t.innerHTML != "" ? parseFloat(t.innerHTML) : 1;
}
class U extends g {
  constructor(t) {
    (super(t, 975, 200),
      (this.drawable = new $(this.dom)),
      this.setupSpeed(),
      this.draw(),
      this.dom.AppendChild);
  }
  setupSpeed() {
    ((this.globalSpeedDiv = document.createElement("div")),
      (this.globalSpeedDiv.id = "database-sharding-global-speed"),
      (this.globalSpeedDiv.style.display = "none"),
      this.dom.appendChild(this.globalSpeedDiv));
  }
  updateSpeed(t) {
    this.globalSpeedDiv.innerHTML = t;
  }
  draw() {
    (this.drawable.drawBox("SpeedContainer", 25, 25, 925, 150, m, p),
      this.drawable.addLabel(
        "SpeedButton0",
        ["half speed"],
        28,
        50,
        50,
        275,
        100,
        E,
        m,
        p,
        () => {
          (this.updateSpeed(2), this.highlightButton(0));
        },
      ),
      this.drawable.addLabel(
        "SpeedButton1",
        ["regular speed"],
        28,
        350,
        50,
        275,
        100,
        E,
        L,
        p,
        () => {
          (this.updateSpeed(1), this.highlightButton(1));
        },
      ),
      this.drawable.addLabel(
        "SpeedButton2",
        ["double speed"],
        28,
        650,
        50,
        275,
        100,
        E,
        m,
        p,
        () => {
          (this.updateSpeed(0.5), this.highlightButton(2));
        },
      ));
  }
  highlightButton(t) {
    (n.to("#SpeedButton0Background", { duration: 0, fill: m }),
      n.to("#SpeedButton1Background", { duration: 0, fill: m }),
      n.to("#SpeedButton2Background", { duration: 0, fill: m }),
      n.to(`#SpeedButton${t}Background`, { duration: 0, fill: L }));
  }
}
class b extends g {
  constructor(t, e, i, s, h, d = {}) {
    (super(t, e, i),
      this.setOptionDefaults(d),
      (this.options = d),
      (this.cluster = new q(this.dom, t, s, h, e, i, d)));
  }
  starterRows(t) {
    for (let e = 0; e < t; e++) this.cluster.insertRow(0);
  }
  setOptionDefaults(t) {
    (t.backup || (t.backup = !1),
      t.showInsert || (t.showInsert = !0),
      t.showSelect || (t.showSelect = !1),
      t.strategy || (t.strategy = void 0),
      t.select || (t.select = void 0),
      t.rowType || (t.rowType = "user"),
      t.rowsPerShard || (t.rowsPerShard = 3),
      t.replicating || (t.replicating = !1));
  }
  draw() {
    (this.cluster.drawShards(),
      this.cluster.drawProxies(),
      this.cluster.backup
        ? this.cluster.drawBackups()
        : this.cluster.drawApp(
            this.options.showInsert,
            this.options.showSelect,
          ));
  }
}
function w(r) {
  return new Promise((t) => {
    if (document.querySelector(r)) return t(document.querySelector(r));
    const e = new MutationObserver((i) => {
      document.querySelector(r) &&
        (e.disconnect(), t(document.querySelector(r)));
    });
    e.observe(document.documentElement, { childList: !0, subtree: !0 });
  });
}
w('[data-id="sharding-no-proxy-1-0-1"]').then((r) => {
  new b(r.dataset.id, 800, 400, 0, 1, {
    showSelect: !0,
    rowsPerShard: 5,
  }).draw();
});
w('[data-id="sharding-no-proxy-1-0-2"]').then((r) => {
  new b(r.dataset.id, 800, 550, 0, 2, {
    showSelect: !0,
    rowsPerShard: 4,
  }).draw();
});
w('[data-id="sharding-1-1-2"]').then((r) => {
  new b(r.dataset.id, 800, 500, 1, 2).draw();
});
w('[data-id="sharding-1-1-3"]').then((r) => {
  new b(r.dataset.id, 800, 500, 1, 3).draw();
});
w('[data-id="sharding-1-1-4"]').then((r) => {
  new b(r.dataset.id, 800, 600, 1, 4).draw();
});
w('[data-id="sharding-1-3-4"]').then((r) => {
  new b(r.dataset.id, 800, 600, 3, 4, { showSelect: !0 }).draw();
});
w('[data-id="sharding-range-id-1-2-4"]').then((r) => {
  const t = {
    type: "range",
    column: "id",
    shards: [
      { begin: 1, end: 25 },
      { begin: 26, end: 50 },
      { begin: 51, end: 75 },
      { begin: 76, end: 100 },
    ],
  };
  new b(r.dataset.id, 800, 600, 2, 4, { strategy: t }).draw();
});
w('[data-id="sharding-range-name-1-2-4"]').then((r) => {
  const t = {
    type: "range",
    column: "name",
    shards: [
      { begin: "a", end: "f" },
      { begin: "g", end: "m" },
      { begin: "n", end: "u" },
      { begin: "v", end: "z" },
    ],
  };
  new b(r.dataset.id, 800, 600, 2, 4, { strategy: t }).draw();
});
w('[data-id="sharding-range-age-1-2-4"]').then((r) => {
  const t = {
    type: "range",
    column: "age",
    shards: [
      { begin: 0, end: 24 },
      { begin: 25, end: 49 },
      { begin: 50, end: 74 },
      { begin: 74, end: 200 },
    ],
  };
  new b(r.dataset.id, 800, 600, 2, 4, { strategy: t }).draw();
});
w('[data-id="sharding-hash-name-1-2-4"]').then((r) => {
  const t = {
    type: "hash",
    column: "name",
    keyFunction: (i) => {
      let s = 0;
      for (let h = 0; h < i.length; h++) s += i.charCodeAt(h);
      return Math.floor((s * 1234.1231987) % 100);
    },
    shards: [
      { begin: 0, end: 25 },
      { begin: 26, end: 50 },
      { begin: 51, end: 75 },
      { begin: 76, end: 100 },
    ],
  };
  new b(r.dataset.id, 800, 600, 2, 4, { strategy: t }).draw();
});
w('[data-id="sharding-hash-id-1-2-4"]').then((r) => {
  const t = {
    type: "hash",
    column: "id",
    keyFunction: (i) => Math.floor(((i * 25) % 100) + i),
    shards: [
      { begin: 0, end: 25 },
      { begin: 26, end: 50 },
      { begin: 51, end: 75 },
      { begin: 76, end: 100 },
    ],
  };
  new b(r.dataset.id, 800, 600, 2, 4, { strategy: t }).draw();
});
w('[data-id="sharding-steps-range-steps-1-2-4"]').then((r) => {
  const t = {
      type: "range",
      column: "steps",
      shards: [
        { begin: 0, end: 2500 },
        { begin: 2500, end: 5e3 },
        { begin: 5e3, end: 7500 },
        { begin: 7500, end: 1e4 },
      ],
    },
    e = { column: "id", equals: 1 };
  new b(r.dataset.id, 800, 600, 2, 4, {
    showSelect: !0,
    select: e,
    strategy: t,
    rowType: "steps",
  }).draw();
});
w('[data-id="sharding-steps-hash-id-1-2-4"]').then((r) => {
  const t = {
      type: "hash",
      column: "id",
      keyFunction: (s) => Math.floor((s * 24) % 100),
      shards: [
        { begin: 0, end: 25 },
        { begin: 26, end: 50 },
        { begin: 51, end: 75 },
        { begin: 76, end: 100 },
      ],
    },
    e = { column: "id", equals: 1 };
  new b(r.dataset.id, 800, 600, 2, 4, {
    showSelect: !0,
    select: e,
    strategy: t,
    rowType: "steps",
  }).draw();
});
w('[data-id="sharding-replicating"]').then((r) => {
  new b(r.dataset.id, 800, 600, 1, 2, { replicating: !0 }).draw();
});
w('[data-id="sharding-backup-1"]').then((r) => {
  const t = new b(r.dataset.id, 800, 600, 0, 1, {
    backup: !0,
    rowsPerShard: 12,
  });
  (t.draw(), t.starterRows(20));
});
w('[data-id="sharding-backup-4"]').then((r) => {
  const t = new b(r.dataset.id, 800, 700, 0, 4, {
    backup: !0,
    rowsPerShard: 3,
  });
  (t.draw(), t.starterRows(50));
});
w('[data-id="sharding-duration"]').then((r) => {
  new U(r.dataset.id);
});
w('[data-id="sharding-latency-app-db"]').then((r) => {
  const t = [
    { name: "Application", color: T },
    { name: "Database", color: L },
  ];
  new Y(r.dataset.id, t);
});
w('[data-id="sharding-latency-app-proxy-shard"]').then((r) => {
  const t = [
    { name: "Application", color: T },
    { name: "Proxy", color: m },
    { name: "Shard", color: L },
  ];
  new Y(r.dataset.id, t);
});
