var T = Object.defineProperty;
var D = (h, t, e) =>
  t in h
    ? T(h, t, { enumerable: !0, configurable: !0, writable: !0, value: e })
    : (h[t] = e);
var O = (h, t, e) => D(h, typeof t != "symbol" ? t + "" : t, e);
import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ import {
  s as C,
  i as W,
} from "./transform-tHp9KnZo.js";
import { q as y } from "./quad-DIO_O7IL.js";
import "./timer-DWAvo6M8.js";
const R = (h) => +h,
  M = document.querySelector("#app");
if (M) {
  const h = document.URL.split("#")[1];
  if (h) {
    const t = document.createElement("div");
    ((t.dataset.id = h), M.appendChild(t));
  }
}
function m(h) {
  return new Promise((t) => {
    if (document.querySelector(h)) return t(document.querySelector(h));
    const e = new MutationObserver((i) => {
      document.querySelector(h) &&
        (e.disconnect(), t(document.querySelector(h)));
    });
    e.observe(document.body, { childList: !0, subtree: !0 });
  });
}
class x {
  constructor() {
    ((this.bodyStyle = getComputedStyle(
      document.getElementsByTagName("body")[0],
    )),
      (this.labelFontSize = 40),
      (this.pins = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1,
      ]));
  }
  getRandomAlpha() {
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      e = Math.floor(Math.random() * t.length);
    return t[e];
  }
  getVariable(t) {
    return this.bodyStyle.getPropertyValue(t).replaceAll("'", "");
  }
  updateColors() {
    ((this.transparent = "#ffffff00"),
      (this.blue = this.getVariable("--io-blue")),
      (this.lightBlue = this.getVariable("--io-light-blue")),
      (this.textBlue = this.getVariable("--text-blue")),
      (this.green = "#13862e"),
      (this.lightGreen = this.getVariable("--io-light-green")),
      (this.textGreen = this.getVariable("--text-green")),
      (this.orange = this.getVariable("--io-orange")),
      (this.lightOrange = this.getVariable("--io-light-orange")),
      (this.textGreen = this.getVariable("--text-orange")),
      (this.red = this.getVariable("--io-red")),
      (this.lightRed = this.getVariable("--io-light-red")),
      (this.darkRed = "#c11027"),
      (this.textRed = this.getVariable("--text-red")),
      (this.purple = this.getVariable("--io-purple")),
      (this.lightPurple = this.getVariable("--io-light-purple")),
      (this.textPurple = this.getVariable("--text-purple")),
      (this.yellow = "#e3d000"),
      (this.veryLightGray = "rgb(232, 232, 232)"),
      (this.lightGray = "rgb(149, 149, 149)"),
      (this.gray = "rgb(117, 117, 117)"),
      (this.dimGray = "rgb(64, 64, 64)"),
      (this.darkGray = "rgb(28, 28, 28)"),
      (this.pcbColor = this.darkGray),
      (this.white = "white"),
      (this.bgSec = this.getVariable("--io-bg-secondary")),
      (this.bgPrimary = this.getVariable("--bg-primary")),
      (this.lightOrange = "#ffe1b0"),
      (this.pageColor = this.getVariable("--io-text-secondary")),
      (this.textPrimary = "var(--text-primary)"),
      (this.textSecondary = this.getVariable("--text-secondary")));
  }
  addLabel(t, e, i, s, a, r) {
    (this.svg
      .selectAll(".theLabels" + r)
      .data([0])
      .join((n) => {
        const d = n.append("g").attr("class", "theLabels" + r);
        return (
          d.append("text").attr("class", r + "Label"),
          d.append("line").attr("class", r + "LabelLine"),
          d.append("ellipse").attr("class", r + "LabelDot"),
          d
        );
      }),
      this.svg
        .select("." + r + "Label")
        .attr("x", e)
        .attr("y", i)
        .text(t)
        .style(
          "font-family",
          'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        )
        .style("font-weight", "bold")
        .attr("fill", this.textPrimary)
        .attr("font-size", this.labelFontSize)
        .attr("text-anchor", "middle")
        .style("transform", "scale(1)")
        .attr("dominant-baseline", "middle"),
      this.svg
        .select("." + r + "LabelLine")
        .attr("stroke", this.yellow)
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("x1", e)
        .attr("y1", i + this.labelFontSize)
        .attr("x2", s)
        .attr("y2", a)
        .style("filter", `drop-shadow( 0px 0px 1px ${this.bgPrimary})`),
      this.svg
        .select("." + r + "LabelDot")
        .attr("fill", this.yellow)
        .attr("stroke-width", 2)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("cx", s)
        .attr("cy", a)
        .style("filter", "drop-shadow( 0px 1px 2px rgba(125, 125, 125, 0.7)"));
  }
  setupObserver() {
    new IntersectionObserver(
      (e) => {
        e.forEach((i) => {
          i.isIntersecting === !1 ? this.stop() : this.start();
        });
      },
      { threshold: 0 },
    ).observe(this.dom);
  }
  drawPinsInGroup(t) {
    (t
      .selectAll(".pinBg")
      .data([0])
      .join((e) =>
        e
          .append("rect")
          .attr("class", "pinBg")
          .attr("x", 0)
          .attr("y", (i, s) => this.heightChunk * 3 - 5)
          .attr("fill", this.darkGray)
          .attr("width", this.widthChunk * 1.3)
          .attr("height", this.pins.length * 10 + 10)
          .attr("rx", 2),
      ),
      t
        .selectAll(".pin")
        .data(this.pins)
        .join((e) =>
          e
            .append("rect")
            .attr("class", "pin")
            .attr("x", 5)
            .attr("y", (i, s) => this.heightChunk * 3 + s * 10)
            .attr("fill", this.yellow)
            .attr("width", 40)
            .attr("height", 7)
            .attr("opacity", (i) => i)
            .attr("rx", 2),
        ));
  }
}
O(
  x,
  "timerSVG",
  `
    <svg style="display:inline-block;vertical-align:middle;" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="12" x2="12" y2="6">
      <animateTransform
        attributeName="transform"
        type="rotate"
        dur="2s"
        from="0 12 12"
        to="360 12 12"
        repeatCount="indefinite" />
    </line>
    </svg>`,
);
class B {
  constructor(t) {
    ((this.initialPageValues = t),
      this.initializeData(),
      (this.pageCount = t.length),
      (this.ioQueue = []),
      (this.ioQueueId = 1));
  }
  initializeData() {
    this.pages = [];
    for (let t = 0; t < this.initialPageValues.length; t++)
      this.pages.push({
        value: this.initialPageValues[t],
        status: "",
        index: t,
      });
  }
  resetData() {
    for (let t = 0; t < this.initialPageValues.length; t++)
      ((this.pages[t].value = this.initialPageValues[t]),
        (this.pages[t].status = ""));
  }
  clearStatuses() {
    for (let t = 0; t < this.pages.length; t++) this.pages[t].status = "";
  }
  hasFreeSpace() {
    for (let t = 0; t < this.pages.length; t++)
      if (this.pages[t].value == "") return !0;
    return !1;
  }
  ioQueueCount() {
    return this.ioQueue.length;
  }
  pushIO(t) {
    ((t.id = this.ioQueueId), this.ioQueueId++, this.ioQueue.push(t));
  }
  popIO(t) {
    return this.ioQueue.shift(t);
  }
  peekIO(t) {
    return this.ioQueue[0];
  }
  isTopIOQueueWrite() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "W";
  }
  isTopIOQueueRead() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "R";
  }
}
class P extends x {
  constructor(t, e, i = [], s = {}) {
    (super(),
      (this.options = s),
      (this.width = 1e3),
      (this.height = 500),
      this.updateSizes(),
      (this.shift = 0),
      this.options.labels && (this.shift = this.heightChunk * 4),
      this.updateColors(),
      (this.id = e),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      (this.tape = t),
      this.initializeBaseElements(),
      (this.domSVG = this.dom.getElementsByClassName("tapeSVG")[0]),
      (this.percent = 0),
      (this.currentIO = void 0),
      (this.hasIOQueueTimer = !1),
      (this.timeStart = 0),
      (this.timeEnd = 0),
      (this.animationSpeed = this.options.speed ? this.options.speed : 1),
      this.initialize(),
      (this.initialIOs = i),
      this.setupInitialIOs(),
      this.updateIOQueue(),
      this.options.labels && this.drawLabels(),
      this.setupObserver(),
      this.start());
  }
  stop() {
    this.isAnimating = !1;
  }
  start() {
    ((this.isAnimating = !0), this.update());
  }
  setupInitialIOs() {
    if (this.initialIOs != null)
      for (const t of this.initialIOs) this.tape.pushIO(t);
  }
  updateSizes() {
    ((this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.outerSpinnerR = this.heightChunk * 5),
      (this.innerSpinnerR = this.heightChunk * 2),
      (this.spoolX = this.widthChunk * 5),
      (this.spoolY = this.heightChunk * 11),
      (this.spoolStudX = this.widthChunk * 6),
      (this.spoolStudY = this.heightChunk * 2),
      (this.spoolR = this.outerSpinnerR),
      (this.cartridgeX = this.width - this.heightChunk * 9),
      (this.cartridgeY = this.heightChunk * 11),
      (this.cartridgeStudX = this.widthChunk * 14),
      (this.cartridgeStudY = this.heightChunk * 2),
      (this.cartridgeR = this.outerSpinnerR),
      (this.studR = this.heightChunk * 0.5),
      (this.dotR = this.heightChunk * 0.3),
      (this.tapeY = this.heightChunk * 2),
      (this.strokeWThick = this.height / 100),
      (this.strokeWThin = this.height / 200),
      (this.strokeWSuperThin = this.height / 300),
      (this.fontSize = this.height / 19),
      (this.queueJump = this.fontSize * 1.5),
      (this.cellW = this.fontSize * 2.5),
      (this.cellH = this.fontSize * 1.5),
      (this.cellS = 4),
      (this.radiusBig = this.height / 50),
      (this.radiusSmall = this.height / 100),
      (this.screws = []));
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .attr("id", "interactivityContainer")
      .style("width", "100%");
    this.options.hideMenu ||
      (t
        .append("div")
        .attr("class", "menu")
        .attr("id", "menu")
        .style("width", "100%"),
      (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto")
      .style("width", "100%");
    ((this.svg = e
      .append("svg")
      .attr("class", "tapeSVG")
      .attr("id", "tapeSVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height + this.shift}`)
      .style("width", "100%")
      .style("height", "100%")),
      (this.svg.node().innerHTML = `
      <linearGradient class="tapeGradient" id="lgrad-${this.id}" x1="100%" y1="50%" x2="0%" y2="50%">
        <stop class="tapeGradientStop" offset="0%" style="stop-color:${this.darkGray};stop-opacity:0" />
        <stop class="tapeGradientStop" offset="20%" style="stop-color:${this.darkGray};stop-opacity:0" />
        <stop class="tapeGradientStop" offset="35%" style="stop-color:${this.darkGray};stop-opacity:1" />
        <stop class="tapeGradientStop" offset="100%" style="stop-color:${this.darkGray};stop-opacity:1" />
      </linearGradient>
      <linearGradient class="tapeGradient" id="rgrad-${this.id}" x1="100%" y1="50%" x2="0%" y2="50%">
        <stop class="tapeGradientStop" offset="0%" style="stop-color:${this.darkGray};stop-opacity:1" />
        <stop class="tapeGradientStop" offset="65%" style="stop-color:${this.darkGray};stop-opacity:1" />
        <stop class="tapeGradientStop" offset="80%" style="stop-color:${this.darkGray};stop-opacity:0" />
        <stop class="tapeGradientStop" offset="100%" style="stop-color:${this.darkGray};stop-opacity:0" />
      </linearGradient>
      <defs>
        <filter id="blurGauss" x="0" y="0" xmlns="http://www.w3.org/2000/svg">
          <feGaussianBlur in="SourceGraphic" stdDeviation="55" />
        </filter>
      </defs>`));
  }
  drawLabels() {
    (this.addLabel(
      "Take-up reel",
      this.widthChunk * 3,
      this.heightChunk * 1,
      this.widthChunk * 5,
      this.shift + this.heightChunk * 9,
      "reader",
    ),
      this.addLabel(
        "I/O head",
        this.widthChunk * 9.25,
        this.heightChunk * 1,
        this.widthChunk * 9.25,
        this.shift + this.heightChunk * 6,
        "readerHead",
      ),
      this.addLabel(
        "Tape",
        this.widthChunk * 13.5,
        this.heightChunk * 1,
        this.widthChunk * 12,
        this.shift + this.heightChunk * 2.5,
        "tape",
      ),
      this.addLabel(
        "Cartridge",
        this.widthChunk * 17.5,
        this.heightChunk * 1,
        this.widthChunk * 18,
        this.shift + this.heightChunk * 6,
        "cartridge",
      ));
  }
  initialize() {
    (this.svg
      .selectAll(".tapeDrive")
      .data([0])
      .join((t) => t.append("g").attr("class", "tapeDrive")),
      this.svg
        .select(".tapeDrive")
        .selectAll(".background")
        .data([0])
        .join((t) => {
          let e = t.append("g").attr("class", "background");
          return (
            e
              .append("rect")
              .attr("class", "bgRect")
              .attr("fill", this.dimGray)
              .attr("x", 0)
              .attr("y", this.shift)
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("width", this.width)
              .attr("height", this.height),
            e
              .append("rect")
              .attr("class", "bgInnerRect")
              .attr("fill", this.darkGray)
              .attr("x", this.heightChunk * 1.25)
              .attr("y", this.shift + this.heightChunk * 1.25)
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("width", this.width - this.heightChunk * 2.5)
              .attr("height", this.height - this.heightChunk * 2.5),
            e
              .append("path")
              .attr("class", "ReaderPointer")
              .attr("fill", this.gray)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr(
                "d",
                `M ${this.widthChunk * 9.5} ${this.shift + this.heightChunk * 5.5} L ${this.widthChunk * 10.5} ${this.shift + this.heightChunk * 5.5} L ${this.widthChunk * 10} ${this.shift + this.heightChunk * 3.5} L ${this.widthChunk * 9.5} ${this.shift + this.heightChunk * 5.5}`,
              )
              .attr("width", this.width - 20)
              .attr("height", this.height - 20),
            e
              .append("rect")
              .attr("class", "readerBox")
              .attr("fill", this.dimGray)
              .attr("x", this.widthChunk * 9)
              .attr("y", this.shift + this.heightChunk * 5)
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("width", this.widthChunk * 2)
              .attr("height", this.heightChunk * 2),
            e
              .append("path")
              .attr("class", "arc1")
              .attr("fill", "none")
              .attr("stroke", this.gray)
              .attr("stroke-width", this.strokeWThick)
              .attr("stroke-linecap", "round")
              .attr(
                "d",
                `M ${this.widthChunk * 9} ${this.shift + this.heightChunk * 10} A ${this.heightChunk * 8} ${this.heightChunk * 8} 0 0 1 ${this.widthChunk * 7} ${this.shift + this.heightChunk * 18}`,
              ),
            e
              .append("path")
              .attr("class", "arc2")
              .attr("fill", "none")
              .attr("stroke", this.gray)
              .attr("stroke-width", this.strokeWThick)
              .attr("stroke-linecap", "round")
              .attr(
                "d",
                `M ${this.widthChunk * 1} ${this.shift + this.heightChunk * 10} A ${this.heightChunk * 8} ${this.heightChunk * 8} 0 0 0 ${this.widthChunk * 3} ${this.shift + this.heightChunk * 18}`,
              ),
            e
          );
        }),
      this.svg
        .select(".tapeDrive")
        .selectAll(".dataLayer")
        .data([0])
        .join((t) => t.append("g").attr("class", "dataLayer")),
      this.svg
        .select(".tapeDrive")
        .selectAll(".coverLayer")
        .data([0])
        .join((t) => {
          let e = t.append("g").attr("class", "coverLayer");
          return (
            e
              .append("rect")
              .attr("class", "gradientA")
              .attr("fill", `url(#lgrad-${this.id})`)
              .attr("x", 0)
              .attr("y", this.shift + this.tapeY - this.cellH / 4)
              .attr("width", this.widthChunk * 10)
              .attr("height", this.cellH * 2),
            e
              .append("rect")
              .attr("class", "gradientB")
              .attr("fill", `url(#rgrad-${this.id})`)
              .attr("x", this.widthChunk * 10)
              .attr("y", this.shift + this.tapeY - this.cellH / 4)
              .attr("width", this.widthChunk * 10)
              .attr("height", this.cellH * 2),
            e
              .append("rect")
              .attr("class", "bgRectL")
              .attr("fill", this.dimGray)
              .attr("x", 0)
              .attr("y", this.shift + this.heightChunk)
              .attr("width", this.heightChunk * 1.25)
              .attr("height", this.heightChunk * 5),
            e
              .append("rect")
              .attr("class", "bgRectR")
              .attr("fill", this.dimGray)
              .attr("x", this.width - this.heightChunk * 1.25)
              .attr("y", this.shift + this.heightChunk)
              .attr("width", this.heightChunk * 1.25)
              .attr("height", this.heightChunk * 5),
            e
              .append("rect")
              .attr("class", "cartridgeCase")
              .attr("fill", this.lightGray)
              .attr("stroke", this.darkGray)
              .attr("stroke-width", this.strokeWThick)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr(
                "x",
                this.cartridgeX - this.outerSpinnerR - this.innerSpinnerR - 5,
              )
              .attr(
                "y",
                this.shift +
                  this.cartridgeY -
                  this.outerSpinnerR -
                  this.innerSpinnerR -
                  5,
              )
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("width", 2 * (this.outerSpinnerR + this.innerSpinnerR + 5))
              .attr(
                "height",
                2 * (this.outerSpinnerR + this.innerSpinnerR + 5),
              ),
            e
              .append("rect")
              .attr("class", "cartridgeCaseOpen")
              .attr("fill", this.darkGray)
              .attr(
                "x",
                this.cartridgeX -
                  this.outerSpinnerR -
                  this.innerSpinnerR +
                  this.widthChunk * 2.5,
              )
              .attr(
                "y",
                this.shift +
                  this.cartridgeY -
                  this.outerSpinnerR -
                  this.innerSpinnerR -
                  15,
              )
              .attr("width", this.widthChunk * 2)
              .attr("height", 13),
            e
          );
        }),
      this.svg
        .select(".tapeDrive")
        .selectAll(".tapeLayer")
        .data([0])
        .join((t) => t.append("g").attr("class", "tapeLayer")),
      this.svg
        .select(".tapeDrive")
        .selectAll(".screws")
        .data(this.screws)
        .join((t) => {
          let e = t.append("g").attr("class", "screws");
          (e
            .append("ellipse")
            .attr("class", "screwOuter")
            .attr("fill", this.darkGray)
            .attr("stroke", this.darkGray)
            .attr("stroke-width", this.strokeWThin)
            .attr("cx", (i) => i[0])
            .attr("cy", (i) => this.shift + i[1])
            .attr("rx", this.heightChunk / 2)
            .attr("ry", this.heightChunk / 2),
            e
              .append("ellipse")
              .attr("class", "screwInner")
              .attr("fill", this.lightGray)
              .attr("stroke", this.lightGray)
              .attr("stroke-width", this.strokeWThin)
              .attr("cx", (i) => i[0])
              .attr("cy", (i) => this.shift + i[1])
              .attr("rx", this.heightChunk / 3.5)
              .attr("ry", this.heightChunk / 3.5));
        }),
      this.svg
        .select(".tapeDrive")
        .selectAll(".foreground")
        .data([0])
        .join((t) => {
          let e = t.append("g").attr("class", "foreground");
          return (
            e
              .append("line")
              .attr("class", "midLine")
              .attr("stroke", this.white)
              .attr("stroke-width", "2")
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr("x1", this.spoolStudX)
              .attr("y1", this.shift + this.spoolStudY - 5)
              .attr("x2", this.cartridgeStudX)
              .attr("y2", this.shift + this.cartridgeStudY - 5),
            e
              .append("ellipse")
              .attr("class", "studA")
              .attr("fill", this.gray)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr("cx", this.cartridgeStudX)
              .attr("cy", this.shift + this.cartridgeStudY)
              .attr("rx", this.studR)
              .attr("ry", this.studR),
            e
              .append("ellipse")
              .attr("class", "studB")
              .attr("fill", this.gray)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr("cx", this.spoolStudX)
              .attr("cy", this.shift + this.spoolStudY)
              .attr("rx", this.studR)
              .attr("ry", this.studR),
            this.options.showIOQueue &&
              e
                .append("rect")
                .attr("class", "ioQueueBackground")
                .attr("fill", this.white)
                .attr("x", this.heightChunk)
                .attr("y", 0)
                .attr("width", this.widthChunk * 5)
                .attr("height", this.heightChunk * 9)
                .attr("rx", this.heightChunk)
                .attr("ry", this.heightChunk)
                .style("opacity", 0.7)
                .style(
                  "filter",
                  "drop-shadow( 0px 8px 4px rgba(0, 0, 0, 0.5))",
                ),
            e
          );
        }));
  }
  getIntersectXY(t, e, i, s, a, r) {
    const n = i - t,
      d = (a ** 2 - r ** 2 + n ** 2) / (2 * n),
      l = Math.sqrt(a ** 2 - d ** 2),
      o = t + (d * (i - t)) / n,
      u = e + (d * (s - e)) / n,
      p = o + (l * (s - e)) / n,
      c = u + (l * (i - t)) / n;
    return [p, c];
  }
  findTangentPoints(t, e, i, s, a) {
    const r = t - i,
      n = e - s,
      d = Math.sqrt(r * r + n * n),
      l = Math.acos(a / d),
      o = Math.atan2(n, r),
      u = o - l,
      p = o + l,
      c = i + a * Math.cos(u),
      f = s + a * Math.sin(u),
      g = i + a * Math.cos(p),
      k = s + a * Math.sin(p);
    return [
      [c, f],
      [g, k],
    ];
  }
  updateSpoolRadii() {
    ((this.spoolR =
      this.innerSpinnerR + this.outerSpinnerR * (this.percent / 100) + 2),
      (this.cartridgeR =
        this.innerSpinnerR +
        this.outerSpinnerR * ((100 - this.percent) / 100) +
        2));
  }
  moveToPage(t) {
    ((this.currentPage = t),
      (this.previousPercent = this.percent),
      (this.percent = 100 * (t / this.tape.pages.length)),
      (this.spoolRPrev = this.spoolR),
      (this.cartridgeRPrev = this.cartridgeR),
      this.updateSpoolRadii());
    let e =
      (5e3 * (Math.abs(this.previousPercent - this.percent) / 100)) /
      this.animationSpeed;
    (e < 150 && (e = 150), this.update(e));
  }
  updateTape(t = 1, e = !1) {
    this.svg
      .select(".dataLayer")
      .selectAll(".dataV")
      .data(this.tape.pages, (s) => "tapeValue-" + s.index + "-" + s.value)
      .join(
        (s) => {
          const a = s
            .append("g")
            .attr("class", "dataV")
            .attr("transform", (r, n) => {
              const d =
                  this.widthChunk * 10 +
                  n * (this.cellW + this.cellS) -
                  (this.percent / 100) *
                    this.tape.pages.length *
                    (this.cellW + this.cellS),
                l = this.shift + this.tapeY + this.cellH / 2 + 2 - 4;
              return `translate(${d}, ${l})`;
            });
          return (
            a
              .append("rect")
              .attr("class", "dataRect")
              .attr("fill", (r) =>
                this.currentIO != null && this.currentIO.type == "W"
                  ? this.lightGreen
                  : this.white,
              )
              .attr("x", -(this.cellW / 2))
              .attr("y", -(this.cellH / 2))
              .attr("rx", this.radiusSmall)
              .attr("ry", this.radiusSmall)
              .attr("width", this.cellW)
              .attr("height", this.cellH),
            a
              .append("text")
              .attr("class", "dataValue")
              .style(
                "font-family",
                'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              )
              .attr("fill", this.green)
              .attr("font-size", this.fontSize + "px")
              .attr("text-anchor", "middle")
              .attr("x", 0)
              .attr("y", 0)
              .style("transform", "scale(1)")
              .attr("dominant-baseline", "middle")
              .text((r) => r.value),
            a
          );
        },
        (s) => (
          s
            .transition()
            .ease(y)
            .duration(t)
            .attr("transform", (a, r) => {
              const n =
                  this.widthChunk * 10 +
                  r * (this.cellW + this.cellS) -
                  (this.percent / 100) *
                    this.tape.pages.length *
                    (this.cellW + this.cellS),
                d = this.shift + this.tapeY + this.cellH / 2 + 2 - 4;
              return `translate(${n}, ${d})`;
            }),
          s
            .selectAll(".dataRect")
            .attr("x", -(this.cellW / 2))
            .attr("y", -(this.cellH / 2))
            .attr("rx", this.radiusSmall)
            .attr("ry", this.radiusSmall)
            .attr("width", this.cellW)
            .attr("height", this.cellH)
            .attr("fill", (a) =>
              a.status == "W"
                ? this.lightGreen
                : a.status == "R"
                  ? this.lightBlue
                  : this.white,
            ),
          s
            .selectAll(".dataValue")
            .attr("font-size", this.fontSize + "px")
            .attr("opacity", (a) => (a.status == "W" ? 0 : 1))
            .transition()
            .ease(y)
            .duration(150 / this.animationSpeed)
            .attr("fill", "black")
            .text((a) => a.value)
            .attr("x", 0)
            .attr("y", (a) =>
              a.status == "W"
                ? +(this.heightChunk * 3.5)
                : a.status == "R"
                  ? +(this.heightChunk * 3.5)
                  : 0,
            )
            .attr("fill", (a) =>
              a.status == "W"
                ? this.green
                : a.status == "R"
                  ? this.blue
                  : this.darkGray,
            )
            .transition()
            .ease(y)
            .duration(50 / this.animationSpeed)
            .attr("opacity", 1)
            .transition()
            .ease(y)
            .duration(150 / this.animationSpeed)
            .attr("y", 0)
            .attr("fill", this.darkGray)
            .on("end", (a, r) => {
              a.index == 0 &&
                (this.updateIOQueue(),
                (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
                  this.nextIOQueue());
            }),
          s
        ),
      );
  }
  updateSpool(t, e, i, s, a, r, n, d, l, o) {
    const u = [
      [0, 0],
      [this.innerSpinnerR / 3, this.innerSpinnerR / 3],
      [this.innerSpinnerR / 3, -this.innerSpinnerR / 3],
      [-this.innerSpinnerR / 3, this.innerSpinnerR / 3],
      [-this.innerSpinnerR / 3, -this.innerSpinnerR / 3],
    ];
    this.svg
      .select(".tapeLayer")
      .selectAll(`.${n}V`)
      .data([1])
      .join(
        (c) => {
          const f = c.append("g").attr("class", `${n}V`);
          f.append("line")
            .attr("class", `${n}Line`)
            .attr("stroke", this.white)
            .attr("stroke-width", "2")
            .style(
              "filter",
              "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
            )
            .attr("x2", t)
            .attr("y2", this.shift + e - 5);
          const g = f
            .append("g")
            .attr("class", `${n}Circle`)
            .style("transform-box", "fill-box")
            .style("transform-origin", "50% 50%")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle");
          return (
            g
              .append("ellipse")
              .attr("class", `${n}Ellipse`)
              .attr("fill", this.white)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr("cx", s)
              .attr("cy", a)
              .attr("rx", r)
              .attr("ry", r),
            g
              .append("ellipse")
              .attr("class", `${n}Center`)
              .attr("fill", this.white)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .attr("cx", s)
              .attr("cy", a)
              .attr("rx", this.innerSpinnerR)
              .attr("ry", this.innerSpinnerR),
            g
              .selectAll(`.${n}Dots`)
              .data(u)
              .join((k) =>
                k
                  .append("ellipse")
                  .attr("class", `${n}Dots`)
                  .attr("fill", "black")
                  .style(
                    "filter",
                    "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
                  )
                  .attr("cx", (L) => s + L[0])
                  .attr("cy", (L) => a + L[1])
                  .attr("rx", this.dotR)
                  .attr("ry", this.dotR),
              ),
            f
          );
        },
        (c) => (
          c
            .selectAll(`.${n}Circle`)
            .transition()
            .ease(y)
            .duration(l)
            .attrTween("transform", () => {
              var f = W(
                -i * (this.cellW + this.cellS),
                -r * (this.cellW + this.cellS),
              );
              return function (g) {
                return o ? `rotate(${f(g)})` : `rotate(${-f(g)})`;
              }.bind(this);
            }),
          c
            .selectAll(`.${n}Line`)
            .attr("stroke", this.white)
            .attr("stroke-width", "2")
            .transition()
            .ease(y)
            .duration(l)
            .attr("x2", t)
            .attr("y2", this.shift + e - 5)
            .attr("x1", (f) => {
              const g = this.findTangentPoints(t, e, s, a, r - 1);
              return o ? g[0][0] : g[1][0];
            })
            .attr("y1", (f) => {
              const g = this.findTangentPoints(t, e, s, a, r - 1);
              return o ? g[0][1] : g[1][1];
            }),
          c
            .selectAll(`.${n}Center`)
            .attr("fill", this.gray)
            .transition()
            .ease(y)
            .duration(l)
            .attr("cx", s)
            .attr("cy", a)
            .attr("rx", this.innerSpinnerR)
            .attr("ry", this.innerSpinnerR),
          c
            .selectAll(`.${n}Ellipse`)
            .attr("fill", this.white)
            .transition()
            .ease(y)
            .duration(l)
            .attr("cx", s)
            .attr("cy", a)
            .attr("rx", r)
            .attr("ry", r)
            .on("end", (f) => {
              d &&
                (this.currentIO != null &&
                  (this.currentIO.type == "W"
                    ? ((this.tape.pages[this.currentIO.page].value =
                        this.currentIO.value),
                      (this.tape.pages[this.currentIO.page].status = "W"))
                    : this.currentIO.type == "R" &&
                      (this.tape.pages[this.currentIO.page].status = "R")),
                (this.currentIO = void 0),
                this.options.randomReads && this.createRandomRead(),
                this.updateTape(0, !0));
            }),
          c
            .selectAll(`.${n}Dots`)
            .data(u)
            .join(
              (f) => f,
              (f) =>
                f
                  .attr("fill", "black")
                  .attr("cx", (g) => s + g[0])
                  .attr("cy", (g) => a + g[1])
                  .attr("rx", this.dotR)
                  .attr("ry", this.dotR),
            ),
          c
        ),
      );
  }
  update(t = 1) {
    this.isAnimating &&
      ((this.spoolR += 0.5),
      this.updateTape(t, !1),
      this.updateSpool(
        this.cartridgeStudX,
        this.cartridgeStudY,
        this.cartridgeRPrev,
        this.cartridgeX,
        this.shift + this.cartridgeY,
        this.cartridgeR,
        "cartridge",
        !1,
        t,
        !1,
      ),
      this.updateSpool(
        this.spoolStudX,
        this.spoolStudY,
        this.spoolRPrev,
        this.spoolX,
        this.shift + this.spoolY,
        this.spoolR,
        "spool",
        !0,
        t,
        !0,
      ));
  }
  nextIOQueue() {
    if (this.currentIO == null) {
      if (this.tape.peekIO() == null) {
        ((this.currentIO = void 0), this.updateIOQueue());
        const t = this.dom.getElementsByClassName("timeIOResult")[0];
        t != null &&
          ((this.timeEnd = Date.now()),
          (t.innerHTML =
            Math.round(((this.timeEnd - this.timeStart) / 1e3) * 100) / 100 +
            "s"),
          (this.timeStart = 0),
          (this.timeEnd = 0));
        return;
      }
      for (
        this.tape.clearStatuses(), this.currentIO = this.tape.popIO();
        this.currentIO.type == "W" && !this.tape.hasFreeSpace();
      )
        this.currentIO = this.tape.popIO();
      if (this.currentIO.type == "W") {
        const t = this.findEarliestOpen();
        this.currentIO.page = t;
      }
      (this.moveToPage(this.currentIO.page), this.updateIOQueue());
    }
  }
  updateIOQueue() {
    if (this.options.showIOQueue == null || this.options.showIOQueue == !1)
      return;
    let t = this.tape.ioQueue;
    (this.currentIO != null && (t = [this.currentIO].concat(t)),
      t.length == 0
        ? this.svg
            .select(".ioQueueBackground")
            .transition()
            .duration(200)
            .style("opacity", 0)
        : this.svg
            .select(".ioQueueBackground")
            .transition()
            .duration(200)
            .style("opacity", 0.7),
      this.svg
        .select(".foreground")
        .selectAll(".ioQueueV")
        .data(t, (e) => "ioq-" + e.id)
        .join(
          (e) =>
            e
              .append("text")
              .attr("class", "ioQueueV")
              .style(
                "font-family",
                'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              )
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
              )
              .style("font-weight", "400")
              .style("font-size", this.fontSize + "px")
              .attr("x", this.widthChunk * 1)
              .attr(
                "y",
                (i, s) =>
                  this.shift + this.heightChunk * 8 - s * this.queueJump - 20,
              )
              .attr("fill", (i) => (i.type == "R" ? this.blue : this.green))
              .text((i) =>
                i.type == "R" ? "R page " + i.page : "W value " + i.value,
              ),
          (e) =>
            e
              .transition()
              .ease(y)
              .duration(200 / this.animationSpeed)
              .style("opacity", 1)
              .style("font-size", this.fontSize + "px")
              .attr("x", this.widthChunk * 1)
              .attr(
                "y",
                (i, s) =>
                  this.shift + this.heightChunk * 8 - s * this.queueJump,
              ),
          (e) =>
            e
              .transition()
              .ease(y)
              .duration(200 / this.animationSpeed)
              .style("opacity", 0)
              .attr("x", (i, s) => 120)
              .remove(),
        ));
  }
  addListener(t, e) {
    const i = this.dom.getElementsByClassName(t);
    i.length && i[0].addEventListener("click", e.bind(this), !1);
  }
  findEarliestOpen() {
    for (let t = 0; t < this.tape.pages.length; t++)
      if (this.tape.pages[t].value == "") return t;
    return -1;
  }
  addSpeedSelector() {
    const t = `
         <span class="subMenu speedSelector">
          <div class="subMenuTitle">Speed selector</div>
           <button class="ioElement ioButton speedMinus pm ${this.options.speedClasses}">-</button>
           <input type="text" class="ioElement speed noHover ${this.options.speedClasses}" value="${this.animationSpeed}" readonly="readonly">
           <button class="ioElement ioButton speedPlus pm ${this.options.speedClasses}">+</button>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("speedMinus", function () {
        this.animationSpeed < 0.5 ||
          ((this.animationSpeed -= 0.25),
          (this.dom.getElementsByClassName("speed")[0].value =
            this.animationSpeed));
      }),
      this.addListener("speedPlus", function () {
        this.animationSpeed > 3.8 ||
          ((this.animationSpeed += 0.25),
          (this.dom.getElementsByClassName("speed")[0].value =
            this.animationSpeed));
      }));
  }
  addWriteElement() {
    const t = `
         <span class="subMenu writeData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Write data</div>
             <button class="ioElement ioButton writeDataValueMinus pm ${this.options.writeClasses}">-</button>
             <input type="text" class="ioElement writeDataValue noHover ${this.options.writeClasses}" value="100" readonly="readonly">
             <button class="ioElement ioButton writeDataValuePlus pm ${this.options.writeClasses}">+</button>
             <button class="ioElement ioButton writeDataWrite ${this.options.writeClasses}">Write</button>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("writeDataValueMinus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value <= 1 || e.value--;
      }),
      this.addListener("writeDataValuePlus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value >= 98 || e.value++;
      }),
      this.addListener("writeDataWrite", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        (this.tape.pushIO({ type: "W", value: e.value }),
          (e.value = Math.floor(Math.random() * 98)),
          this.updateIOQueue(),
          this.tape.ioQueue.length == 1 &&
            (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
            this.nextIOQueue(),
          this.updateIOQueue());
      }));
  }
  addReadElement() {
    const t = `
         <span class="subMenu readData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Page to read from</div>
             <button class="ioElement ioButton readDataSlotMinus pm ${this.options.readClasses}">-</button>
             <input type="text" class="ioElement readDataSlot noHover ${this.options.readClasses}" value="10" readonly="readonly">
             <button class="ioElement ioButton readDataSlotPlus pm ${this.options.readClasses}">+</button>
             <button class="ioElement ioButton readDataRead ${this.options.readClasses}">Read</button>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("readDataSlotMinus", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0];
        e.value <= 0 || e.value--;
      }),
      this.addListener("readDataSlotPlus", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0];
        e.value >= this.tape.pages.length - 1 || e.value++;
      }),
      this.addListener("readDataRead", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0];
        (this.tape.pushIO({ type: "R", page: e.value }),
          (e.value = Math.floor(Math.random() * 49)),
          this.updateIOQueue(),
          (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
            this.nextIOQueue(),
          this.updateIOQueue());
      }));
  }
  addIOQueueTimer() {
    this.hasIOQueueTimer = !0;
    const t = `
         <span class="subMenu readData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Start and time IO queue</div>
             <button class="ioElement ioButton timeIOStart ${this.options.timerClasses}">Time IO</button>
             <span class="ioElement timeIOResult noHover ${this.options.timerClasses}"/>...</span>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("timeIOStart", function () {
        (this.tape.ioQueueCount() == 0 &&
          (this.tape.resetData(),
          this.setupInitialIOs(),
          this.updateIOQueue(),
          this.updateTape()),
          this.tape.ioQueueCount() != 0 &&
            ((this.dom.getElementsByClassName("timeIOResult")[0].innerHTML =
              x.timerSVG),
            (this.timeStart = Date.now()),
            this.nextIOQueue()));
      }));
  }
  createRandomRead() {
    this.tape.pushIO({
      type: "R",
      page: Math.floor(Math.random() * this.tape.pages.length),
    });
  }
}
class $ {
  constructor(t, e, i) {
    ((this.ringCount = t),
      (this.headPos = e),
      (this.originalRings = i),
      (this.pageCount = 0),
      this.initializeRings(),
      (this.ioQueue = []),
      (this.ioQueueId = 1));
  }
  getDataForRing(t) {
    return this.rings[this.ringCount - t].data;
  }
  resetRings() {
    for (let t = 0; t < this.rings.length; t++)
      for (let e = 0; e < this.rings[t].data.length; e++)
        this.rings[t].data[e] = this.originalRings[t].data[e];
  }
  initializeRings() {
    ((this.pageCount = 0), (this.rings = []));
    for (const t of this.originalRings) {
      const e = { index: t.index, data: [] };
      for (const i of t.data) (this.pageCount++, e.data.push(i));
      this.rings.push(e);
    }
  }
  ioQueueCount() {
    return this.ioQueue.length;
  }
  pushIO(t) {
    ((t.id = this.ioQueueId), this.ioQueueId++, this.ioQueue.push(t));
  }
  popIO() {
    return this.ioQueue.shift();
  }
  peekIO() {
    return this.ioQueue[0];
  }
  isTopIOQueueWrite() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "W";
  }
  isTopIOQueueRead() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "R";
  }
  hasFreeSpace() {
    for (let t = 0; t < this.rings.length; t++)
      for (let e = 0; e < this.rings[t].data.length; e++)
        if (this.rings[t].data[e] == "") return !0;
    return !1;
  }
}
const b = class b extends x {
  constructor(t, e, i, s) {
    (super(),
      (this.width = 1e3),
      (this.height = 650),
      (this.options = s),
      (this.disk = new $(t.ringCount, 1, t.rings)),
      this.updateSizes(),
      (this.shift = 0),
      this.options.labels && (this.shift = this.heightChunk * 4),
      this.updateColors(),
      (this.id = e),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      this.initializeBaseElements(),
      (this.domSVG = this.dom.getElementsByClassName("hddSVG")[0]),
      this.initialize(),
      (this.rotation = 0),
      (this.spinSpeed = this.options.speed ? this.options.speed : 0.5),
      (this.previousSector = "0"),
      (this.currentSector = "1"),
      (this.hasIOQueueTimer = !1),
      (this.timeStart = 0),
      (this.timeEnd = 0),
      (this.isAnimating = !1),
      (this.initialIOs = i),
      this.setupInitialIOs(),
      this.updateIOQueue(),
      this.options.labels && this.drawLabels(),
      this.setupObserver());
  }
  setupInitialIOs() {
    if (this.initialIOs != null)
      for (const t of this.initialIOs) this.disk.pushIO(t);
  }
  stop() {
    this.isAnimating = !1;
  }
  start() {
    ((this.isAnimating = !0), this.update());
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .attr("id", "interactivityContainer")
      .style("width", "100%");
    if (!this.options.hideMenu) {
      const i = t
        .append("div")
        .attr("class", "menu")
        .attr("id", "menu")
        .style("width", "100%");
      (this.options.showIOQueue && i.style("padding-bottom", "0px"),
        (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    }
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto")
      .style("width", "100%");
    this.svg = e
      .append("svg")
      .attr("class", "hddSVG")
      .attr("id", "hddSVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height + this.shift}`)
      .style("width", "100%")
      .style("height", "100%");
  }
  drawLabels() {
    (this.addLabel(
      "Enclosure",
      this.widthChunk * 3,
      this.heightChunk * 1,
      this.widthChunk * 3,
      this.shift + this.heightChunk * 1,
      "drive",
    ),
      this.addLabel(
        "Reader",
        this.widthChunk * 7.75,
        this.heightChunk * 1,
        this.widthChunk * 5,
        this.shift + this.heightChunk * 7,
        "reader",
      ),
      this.addLabel(
        "Platter",
        this.widthChunk * 12,
        this.heightChunk * 1,
        this.widthChunk * 12,
        this.shift + this.heightChunk * 7,
        "readerHead",
      ),
      this.addLabel(
        "",
        this.widthChunk * 16,
        this.heightChunk * 1,
        this.widthChunk * 14.3,
        this.shift + this.heightChunk * 10,
        "tracks1",
      ),
      this.addLabel(
        "Tracks",
        this.widthChunk * 16,
        this.heightChunk * 1,
        this.widthChunk * 15.5,
        this.shift + this.heightChunk * 10,
        "tracks2",
      ),
      this.addLabel(
        "",
        this.widthChunk * 16,
        this.heightChunk * 1,
        this.widthChunk * 16.8,
        this.shift + this.heightChunk * 10,
        "tracks3",
      ),
      this.addLabel(
        "",
        this.widthChunk * 16,
        this.heightChunk * 1,
        this.widthChunk * 18,
        this.shift + this.heightChunk * 10,
        "tracks4",
      ));
  }
  updateSizes() {
    ((this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.armX = this.widthChunk * 5),
      (this.armY = this.heightChunk * 7),
      (this.armL = this.widthChunk * 7),
      (this.armCR = this.heightChunk * 1.7),
      (this.diskX = this.widthChunk * 12.5),
      (this.diskY = this.heightChunk * 10),
      (this.diskR = this.heightChunk * 9.2),
      (this.diskInnerR = this.heightChunk * 2),
      (this.ringR = (this.diskR - this.diskInnerR) / this.disk.ringCount),
      (this.cutoutX = this.widthChunk * 1),
      (this.cutoutY = this.heightChunk * 2),
      (this.cutoutW = this.widthChunk * 18),
      (this.cutoutH = this.heightChunk * 16),
      (this.underX = this.widthChunk * 1.5),
      (this.underY = this.heightChunk * 2.5),
      (this.underW = this.widthChunk * 4.7),
      (this.underH = this.heightChunk * 15),
      (this.fontSize = Math.floor(this.height / 25)),
      (this.queueJump = this.fontSize * 1.7),
      (this.radiusBig = this.height / 50),
      (this.radiusSmall = this.height / 100),
      (this.screws = [
        [this.heightChunk, this.heightChunk],
        [this.heightChunk, this.heightChunk * 19],
        [this.widthChunk * 20 - this.heightChunk, this.heightChunk * 19],
        [this.widthChunk * 20 - this.heightChunk, this.heightChunk],
        [this.widthChunk * 8, this.heightChunk],
        [this.widthChunk * 8, this.heightChunk * 19],
      ]));
  }
  initialize() {
    (this.svg
      .selectAll(".hardDiskDrive")
      .data([0])
      .join((a) => {
        let r = a.append("g").attr("class", "hardDiskDrive");
        return (
          r.append("g").attr("class", "underPlatter"),
          r.append("g").attr("class", "platter"),
          r.append("g").attr("class", "overPlatter"),
          this.svg.append("rect").attr("class", "ioQueueBackground"),
          this.svg.append("g").attr("class", "ioQueueGroup"),
          a
        );
      }),
      this.svg
        .select(".hardDiskDrive")
        .attr("transform", `translate(0 ${this.shift})`));
    const t = this.svg
      .select(".underPlatter")
      .selectAll(".background")
      .data([0])
      .join((a) => {
        let r = a.append("g").attr("class", "background");
        (r.append("rect").attr("class", "outerRect"),
          r.append("rect").attr("class", "innerRect"),
          r.append("rect").attr("class", "queueRect"),
          r.append("g").attr("class", "queueRect2"),
          r.append("g").attr("class", "chip"),
          r.append("ellipse").attr("class", "diskOuter"));
        let n = 0;
        for (const d of this.screws)
          (r.append("ellipse").attr("class", "outerScrew" + n),
            r.append("ellipse").attr("class", "innerScrew" + n),
            n++);
        return r;
      });
    (this.options.showIOQueue &&
      this.svg
        .select(".ioQueueBackground")
        .attr("fill", this.white)
        .attr("x", this.heightChunk)
        .attr("y", 0)
        .attr("width", this.widthChunk * 6)
        .attr("height", this.heightChunk * 8)
        .attr("rx", this.heightChunk)
        .attr("ry", this.heightChunk)
        .style("opacity", 0.7)
        .style("filter", "drop-shadow( 0px 5px 4px rgba(0, 0, 0, 0.5))"),
      t
        .select(".outerRect")
        .attr("fill", this.dimGray)
        .attr("x", 0)
        .attr("y", 0)
        .attr("rx", this.radiusBig)
        .attr("ry", this.radiusBig)
        .attr("width", this.width)
        .attr("height", this.height),
      t
        .select(".innerRect")
        .attr("fill", this.darkGray)
        .attr("x", this.cutoutX)
        .attr("y", this.cutoutY)
        .attr("rx", this.radiusBig)
        .attr("ry", this.radiusBig)
        .attr("width", this.cutoutW)
        .attr("height", this.cutoutH),
      t
        .select(".queueRect2")
        .html(b.actuator)
        .attr("transform", "translate(70, 60)"),
      t.select(".chip").html(b.chip).attr("transform", "translate(70, 230)"),
      t
        .select(".diskOuter")
        .attr("fill", this.darkGray)
        .attr("cx", this.diskX)
        .attr("cy", this.diskY)
        .attr("rx", this.heightChunk * 9.5)
        .attr("ry", this.heightChunk * 9.5),
      t.select(".queueRect"),
      this.drawPinsInGroup(t));
    let e = 0;
    for (const a of this.screws)
      (t
        .select(".outerScrew" + e)
        .attr("fill", this.darkGray)
        .attr("cx", a[0])
        .attr("cy", a[1])
        .attr("rx", this.heightChunk / 2)
        .attr("ry", this.heightChunk / 2),
        t
          .select(".innerScrew" + e)
          .attr("fill", this.lightGray)
          .attr("cx", a[0])
          .attr("cy", a[1])
          .attr("rx", this.heightChunk / 3.5)
          .attr("ry", this.heightChunk / 3.5),
        e++);
    const i = this.svg
      .select(".platter")
      .attr("transform-origin", `${this.diskX}px ${this.height / 2}px`)
      .attr("transform-box", "fill-box")
      .selectAll(".ring")
      .data(this.disk.rings, (a, r) => a.index)
      .join((a) => {
        const r = a.append("g").attr("class", "ring");
        return (r.append("ellipse").attr("class", "diskCircleCenter"), r);
      });
    i.select(".diskCircleCenter")
      .attr("fill", this.veryLightGray)
      .attr("stroke", this.gray)
      .attr("stroke-width", 4)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("rx", this.diskInnerR)
      .attr("ry", this.diskInnerR);
    const s = [
      [25, 25],
      [-25, 25],
      [25, -25],
      [-25, -25],
    ];
    (i
      .append("ellipse")
      .attr("fill", this.veryLightGray)
      .attr("stroke", this.gray)
      .attr("stroke-width", 2)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("rx", 50)
      .attr("ry", 50),
      i
        .append("ellipse")
        .attr("fill", this.veryLightGray)
        .attr("stroke", this.gray)
        .attr("stroke-width", 2)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("rx", 15)
        .attr("ry", 15));
    for (const a of s)
      i.append("ellipse")
        .attr("fill", this.lightGray)
        .attr("stroke", this.gray)
        .attr("stroke-width", 1)
        .attr("cx", a[0])
        .attr("cy", a[1])
        .attr("rx", 7)
        .attr("ry", 7);
  }
  doesOverlap(t, e, i) {
    const s = ((e - 0) * 360) / i.length,
      a = ((e + 1) * 360) / i.length,
      r = this.diskInnerR + this.ringR * t.ring,
      n = this.getIntersectXY(this.armL, r - this.ringR / 2),
      d = this.radToDeg(Math.atan2(n[1] - this.diskY, n[0] - this.diskX)),
      l = (this.rotation + d) % 360;
    return l > s && l < a && this.disk.headPos == t.ring
      ? ((this.previousSector = this.currentSector),
        (this.currentSector = t.ring + "-" + e),
        !0)
      : !1;
  }
  getIntersectXY(t, e) {
    const i = this.armX,
      s = this.armY,
      a = this.diskX,
      r = this.diskY,
      n = a - i,
      d = r - s,
      l = Math.hypot(n, d),
      o = (t ** 2 - e ** 2 + l ** 2) / (2 * l),
      u = Math.sqrt(t ** 2 - o ** 2),
      p = i + (o * n) / l,
      c = s + (o * d) / l,
      f = p + -u * (d / l),
      g = c + u * (n / l);
    return [f, g];
  }
  isOnNewSector() {
    return this.previousSector != this.currentSector;
  }
  createRandomRead() {
    const t = Math.floor(Math.random() * this.disk.ringCount),
      e = Math.floor(Math.random() * this.disk.getDataForRing(t + 1).length);
    this.disk.pushIO({ type: "R", ring: t + 1, slot: e + 1 });
  }
  eventTypeForSector(t, e, i) {
    if (this.isOnNewSector()) {
      if (this.writeInProgress == !0 || this.readInProgress == !0) {
        for (
          this.disk.popIO();
          this.disk.peekIO() &&
          this.disk.peekIO().type == "W" &&
          !this.disk.hasFreeSpace();
        )
          this.disk.popIO();
        if (this.disk.peekIO() && this.disk.peekIO().type == "W") {
          const s = this.closestAvailableRing();
          this.disk.peekIO().ring = s;
        }
        ((this.writeInProgress = !1),
          (this.readInProgress = !1),
          this.updateIOQueue());
      }
    } else
      return this.doesOverlap(t, e, i)
        ? this.writeInProgress
          ? "write"
          : this.readInProgress
            ? "read"
            : "overlap"
        : "none";
    if (
      (this.options.randomReads &&
        this.disk.ioQueue.length < 2 &&
        this.createRandomRead(),
      !this.doesOverlap(t, e, i))
    )
      return "none";
    if (
      this.disk.ioQueue.length == 0 &&
      this.hasIOQueueTimer == !0 &&
      this.timeStart != 0
    ) {
      const s = this.dom.getElementsByClassName("timeIOResult")[0];
      s != null &&
        ((this.timeEnd = Date.now()),
        (s.innerHTML =
          Math.round(((this.timeEnd - this.timeStart) / 1e3) * 100) / 100 +
          "s"),
        (this.timeStart = 0),
        (this.timeEnd = 0));
    }
    if (this.disk.ioQueue.length == 0) return "overlap";
    if (this.hasIOQueueTimer == !1 || this.timeStart != 0) {
      if (this.disk.isTopIOQueueWrite()) {
        if (t.value != "") return "overlap";
        const s = this.disk.peekIO(),
          a = this.disk.ringCount - this.disk.headPos;
        return (
          (this.disk.rings[a].data[e] = s.value),
          this.updateIOQueue(),
          (this.writeInProgress = !0),
          "write"
        );
      } else if (this.disk.isTopIOQueueRead()) {
        const s = this.disk.peekIO();
        return s.ring != t.ring || s.slot != e + 1
          ? "overlap"
          : (this.updateIOQueue(), (this.readInProgress = !0), "read");
      }
    }
    return "overlap";
  }
  update() {
    ((this.rotation = (this.rotation + this.spinSpeed) % 360),
      this.disk.peekIO() != null &&
        this.disk.peekIO().ring != this.disk.headPos &&
        this.updateHead());
    for (const t of this.disk.rings) {
      let e = t.index == this.disk.headPos;
      const i = [];
      for (let s = 0; s < t.data.length; s++) {
        const a = {
          value: t.data[s],
          ring: t.index,
          radius: this.diskInnerR + t.index * this.ringR,
        };
        if (e) {
          const r = this.eventTypeForSector(a, s, t.data);
          ((a.eventType = r), r != "none" && (e = !1));
        } else a.eventType = "none";
        i.push(a);
      }
      (this.svg
        .select(".platter")
        .selectAll(".ringSection" + t.index)
        .data(i, (s, a) => "divider-" + s.radius + "-" + a + "-" + s.value)
        .join(
          (s) =>
            s
              .append("path")
              .attr("class", "ringSection" + t.index)
              .attr("fill", this.veryLightray)
              .attr("stroke", this.lightGray)
              .attr("stroke-width", 1)
              .attr("d", (a, r, n) => {
                const d =
                    (a.radius - this.ringR) *
                    Math.cos(r * this.degToRad(360 / n.length)),
                  l =
                    (a.radius - this.ringR) *
                    Math.sin(r * this.degToRad(360 / n.length)),
                  o = a.radius * Math.cos(r * this.degToRad(360 / n.length)),
                  u = a.radius * Math.sin(r * this.degToRad(360 / n.length)),
                  p =
                    (a.radius - this.ringR) *
                    Math.cos((r + 1) * this.degToRad(360 / n.length)),
                  c =
                    (a.radius - this.ringR) *
                    Math.sin((r + 1) * this.degToRad(360 / n.length)),
                  f =
                    a.radius *
                    Math.cos((r + 1) * this.degToRad(360 / n.length)),
                  g =
                    a.radius *
                    Math.sin((r + 1) * this.degToRad(360 / n.length));
                let k = `M ${d} ${l} `;
                return (
                  (k += `A ${a.radius - this.ringR} ${a.radius - this.ringR} 0 0 1 ${p} ${c} `),
                  (k += `L ${f} ${g} `),
                  (k += `A ${a.radius} ${a.radius} 0 0 0 ${o} ${u} `),
                  (k += `L ${d} ${l} `),
                  k
                );
              }),
          (s) => (
            s.attr("fill", (a, r, n) =>
              a.eventType == "read"
                ? this.lightBlue
                : a.eventType == "write"
                  ? this.lightGreen
                  : a.eventType == "overlap"
                    ? this.options.activeColor
                      ? this.options.activeColor
                      : this.lightOrange
                    : this.veryLightGray,
            ),
            s
          ),
        ),
        this.svg
          .select(".platter")
          .selectAll(".diskValue" + t.index)
          .data(i, (s, a) => "text-" + s.radius + "-" + a + "-" + s.value)
          .join(
            (s) =>
              s
                .append("text")
                .attr("class", "diskValue" + t.index)
                .style(
                  "font-family",
                  'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                )
                .style("font-weight", "200")
                .style("font-size", this.fontSize + "px")
                .attr("transform", (a, r, n) => {
                  const d =
                      (a.radius - this.ringR / 2) *
                      Math.cos((r + 0.5) * this.degToRad(360 / n.length)),
                    l =
                      (a.radius - this.ringR / 2) *
                      Math.sin((r + 0.5) * this.degToRad(360 / n.length)),
                    o = `rotate(${(r + 0.5) * (360 / n.length) + 90})`;
                  return `translate(${d} ${l}) ${o}`;
                })
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", this.darkGray)
                .text((a) => a.value),
            (s) => {
              s.attr("fill", (a, r, n) =>
                a.eventType == "read"
                  ? this.blue
                  : a.eventType == "write"
                    ? this.green
                    : a.eventType == "overlap"
                      ? this.orange
                      : this.gray,
              ).text((a) => a.value);
            },
          ));
    }
    (this.svg.select(".platter").attr("transform", (t) => {
      const e = `rotate(-${this.rotation})`,
        i = `translate(${this.diskX},${this.height / 2})`;
      return `${e} ${i}`;
    }),
      this.isAnimating && setTimeout(this.update.bind(this), 30));
  }
  updateIOQueue() {
    if (this.options.showIOQueue != null && this.options.showIOQueue == !1)
      return;
    let t = this.disk.ioQueue;
    (t.length == 0
      ? this.svg
          .select(".ioQueueBackground")
          .transition()
          .duration(200)
          .style("opacity", 0)
      : this.svg
          .select(".ioQueueBackground")
          .transition()
          .duration(200)
          .style("opacity", 0.7),
      this.svg
        .select(".ioQueueGroup")
        .selectAll(".ioQueueV")
        .data(t, (e) => "ioq-" + e.id)
        .join(
          (e) =>
            e
              .append("text")
              .attr("class", "ioQueueV")
              .style(
                "font-family",
                'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              )
              .style("font-weight", "400")
              .style("font-size", this.fontSize * 1.1 + "px")
              .attr("x", this.widthChunk * 1)
              .attr(
                "y",
                (i, s) => this.heightChunk * 7.2 - s * this.queueJump - 20,
              )
              .attr("fill", (i) => (i.type == "R" ? this.blue : this.green))
              .text((i) =>
                i.type == "R"
                  ? "R track " + i.ring + " pos " + i.slot
                  : "W track " + i.ring + " val " + i.value,
              ),
          (e) =>
            e
              .transition()
              .ease(y)
              .duration(200 / this.spinSpeed)
              .style("font-size", this.fontSize * 1.1 + "px")
              .style("opacity", 1)
              .attr("x", this.widthChunk * 1)
              .attr("y", (i, s) => this.heightChunk * 7.2 - s * this.queueJump),
          (e) =>
            e
              .transition()
              .ease(y)
              .duration(200 / this.spinSpeed)
              .style("opacity", 0)
              .attr("x", (i, s) => 120)
              .remove(),
        ));
  }
  updateHead() {
    (this.disk.peekIO() != null &&
      (this.disk.headPos = this.disk.peekIO().ring),
      this.svg
        .select(".overPlatter")
        .selectAll(".head")
        .data(
          [{ width: this.width, headPos: this.disk.headPos }],
          (t, e) => "head" + t.width,
        )
        .join(
          (t) => {
            let e = t
              .append("g")
              .attr("class", "head")
              .attr("transform-origin", `${this.armX}px ${this.armY}px`)
              .attr("transform-box", "fill-box")
              .attr("transform", (i) => {
                const s = this.diskInnerR + this.ringR * i.headPos,
                  a = this.getIntersectXY(this.armL, s - this.ringR / 2);
                return `${`rotate(${this.radToDeg(Math.atan2(a[1] - this.armY, a[0] - this.armX))})`}`;
              });
            return (
              e
                .append("polygon")
                .attr("class", "theArm")
                .attr("fill", this.bgSec)
                .attr("stroke", this.gray)
                .attr("stroke-width", 1)
                .style("filter", "drop-shadow(2px 2px 2px #00000050)")
                .attr(
                  "points",
                  (i) =>
                    `${this.armX} ${this.armY + this.armCR - 1} ${this.armX} ${this.armY - this.armCR + 1} ${this.armX + this.armL} ${this.armY}`,
                )
                .attr("ry", (i) => 50),
              e
                .append("ellipse")
                .attr("class", "theArm")
                .attr("fill", this.lightGray)
                .attr("stroke", this.gray)
                .attr("stroke-width", 1)
                .attr("cx", this.armX)
                .attr("cy", this.armY)
                .style("filter", "drop-shadow(2px 2px 2px #00000030)")
                .attr("rx", (i) => this.armCR)
                .attr("ry", (i) => this.armCR),
              e
                .append("ellipse")
                .attr(
                  "fill",
                  this.options.readerColor
                    ? this.options.readerColor
                    : this.darkGray,
                )
                .attr("rx", 2)
                .attr("ry", 2)
                .attr("cx", (i) => this.armX + this.armL)
                .attr("cy", (i) => this.armY),
              e
            );
          },
          (t) => (
            t
              .transition()
              .ease(y)
              .duration(200 / this.spinSpeed)
              .attr("transform", (e) => {
                const i = this.diskInnerR + this.ringR * e.headPos,
                  s = this.getIntersectXY(this.armL, i - this.ringR / 2);
                return `${`rotate(${this.radToDeg(Math.atan2(s[1] - this.armY, s[0] - this.armX))})`}`;
              }),
            t
              .selectAll(".theArm")
              .attr("fill", this.lightGray)
              .attr("stroke", this.gray)
              .attr("stroke-width", 1),
            t
          ),
        ));
  }
  ringAndSlotForPageNumber(t) {
    let e = 0;
    for (let i = 1; i <= this.disk.ringCount; i++) {
      const s = this.disk.getDataForRing(i).length;
      if (e < t && t <= e + s) return [i, t - e];
      e += s;
    }
  }
  closestAvailableRing() {
    const t = this.disk.headPos;
    for (let e = 0; e < this.disk.ringCount; e++) {
      let i = t + e;
      i > this.disk.ringCount && (i = i % this.disk.ringCount);
      const s = this.disk.getDataForRing(i);
      for (const a of s) if (a == null || a == "") return i;
    }
  }
  degToRad(t) {
    return t * 0.0174533;
  }
  radToDeg(t) {
    return t * 57.2958;
  }
  addListener(t, e) {
    const i = this.dom.getElementsByClassName(t);
    i.length && i[0].addEventListener("click", e.bind(this), !1);
  }
  addTrackSelector() {
    (this.menuDom.insertAdjacentHTML(
      "beforeend",
      `
         <span class="subMenu trackSelector">
          <div class="subMenuTitle">Track Selector</div>
           <button class="ioElement ioButton trackMinus pm">-</button>
           <input type="text" class="ioElement track" value="4" readonly="readonly">
           <button class="ioElement ioButton trackPlus pm">+</button>
         </span>`,
    ),
      this.addListener("trackMinus", function () {
        this.disk.headPos != 1 &&
          (this.disk.headPos--,
          this.updateHead(),
          this.updateIOQueue(),
          (this.dom.getElementsByClassName("track")[0].value =
            this.disk.headPos));
      }),
      this.addListener("trackPlus", function () {
        this.disk.headPos != 4 &&
          (this.disk.headPos++,
          this.updateHead(),
          this.updateIOQueue(),
          (this.dom.getElementsByClassName("track")[0].value =
            this.disk.headPos));
      }));
  }
  addSpeedSelector() {
    const t = `
         <span class="subMenu speedSelector">
          <div class="subMenuTitle">Speed selector</div>
           <button class=" ioElement ioButton speedMinus pm ${this.options.speedClasses}">-</button>
           <input type="text" class="ioElement speed noHover ${this.options.speedClasses}" value="${this.spinSpeed}" readonly="readonly">
           <button class="ioElement ioButton speedPlus pm ${this.options.speedClasses}">+</button>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("speedMinus", function () {
        this.spinSpeed < 0.5 ||
          ((this.spinSpeed -= 0.25),
          (this.dom.getElementsByClassName("speed")[0].value = this.spinSpeed));
      }),
      this.addListener("speedPlus", function () {
        this.spinSpeed > 3.8 ||
          ((this.spinSpeed += 0.25),
          (this.dom.getElementsByClassName("speed")[0].value = this.spinSpeed));
      }));
  }
  addWriteElement() {
    const t = `
         <span class="subMenu writeData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Write data</div>
             <button class="ioElement ioButton writeDataValueMinus pm ${this.options.writeClasses}">-</button>
             <input type="text" class="ioElement writeDataValue ${this.options.writeClasses}" value="100" readonly="readonly">
             <button class="ioElement ioButton writeDataValuePlus pm ${this.options.writeClasses}">+</button>
             <button class="ioElement ioButton writeDataWrite  ${this.options.writeClasses}">Write</button>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("writeDataValueMinus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value <= 1 || e.value--;
      }),
      this.addListener("writeDataValuePlus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value >= 100 || e.value++;
      }),
      this.addListener("writeDataWrite", function () {
        if (!this.disk.hasFreeSpace()) return;
        const e = this.closestAvailableRing(),
          i = this.dom.getElementsByClassName("writeDataValue")[0].value;
        (this.disk.pushIO({ type: "W", ring: e, value: i }),
          this.updateHead(),
          this.updateIOQueue());
      }));
  }
  addReadElement() {
    const t = `
         <span class="subMenu readData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Page to read from</div>
             <button class="ioElement ioButton readDataSlotMinus pm ${this.options.readClasses}">-</button>
             <input type="text" class="ioElement readDataSlot ${this.options.readClasses}" value="10" readonly="readonly">
             <button class="ioElement ioButton readDataSlotPlus pm ${this.options.readClasses}">+</button>
             <button class="ioElement ioButton readDataRead ${this.options.readClasses}">Read</button>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("readDataSlotMinus", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0];
        e.value <= 1 || e.value--;
      }),
      this.addListener("readDataSlotPlus", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0];
        e.value >= 100 || e.value++;
      }),
      this.addListener("readDataRead", function () {
        const e = this.dom.getElementsByClassName("readDataSlot")[0],
          i = this.ringAndSlotForPageNumber(e.value);
        (this.disk.pageCount <= e.value ? (e.value = 1) : e.value++,
          this.disk.pushIO({ type: "R", ring: i[0], slot: i[1] }),
          this.updateHead(),
          this.updateIOQueue());
      }));
  }
  addIOQueueTimer() {
    this.hasIOQueueTimer = !0;
    const t = `
         <span class="subMenu readData">
           <div style="display:inline-block;">
             <div class="subMenuTitle">Start and time IO queue</div>
             <button class="ioElement ioButton timeIOStart ${this.options.timerClasses}">Time IO</button>
             <span class="ioElement timeIOResult noHover ${this.options.timerClasses}"/>...</span>
           </div>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("timeIOStart", function () {
        (this.disk.ioQueueCount() == 0 &&
          (this.disk.resetRings(),
          this.setupInitialIOs(),
          this.updateIOQueue()),
          this.disk.ioQueueCount() != 0 &&
            ((this.dom.getElementsByClassName("timeIOResult")[0].innerHTML =
              x.timerSVG),
            (this.timeStart = Date.now())));
      }));
  }
};
(O(
  b,
  "actuator",
  `
<path d="M113 99H263V159C263 213.676 218.676 258 164 258H113V99Z" fill="#444444"/>
<path d="M0 33C0 21.9543 8.9543 13 20 13H250H325.796C326.597 13 327.398 12.9421 328.192 12.8267V12.8267C346.313 10.1928 354.802 34.4719 338.988 43.7033L312.295 59.285C309.795 60.7443 307.641 62.7288 305.983 65.1016L285.471 94.456C281.729 99.8102 275.609 103 269.077 103H216H172.245C139.072 103 113.045 131.459 116 164.5V164.5V218V261.573C116 265.127 115.053 268.616 113.257 271.683L92.7942 306.61C89.2052 312.736 82.6375 316.5 75.5376 316.5H59.6348C53.2639 316.5 47.2742 319.535 43.5067 324.673L36.1281 334.734C24.6974 350.322 0 342.237 0 322.907V33Z" fill="#757575"/>
<circle cx="16" cy="31" r="10" fill="#959595"/>
<rect x="8" y="30" width="16" height="2" rx="1" fill="#757575"/>
<rect x="15" y="39" width="16" height="2" rx="1" transform="rotate(-90 15 39)" fill="#757575"/>
<rect x="11.0503" y="24.6367" width="16" height="2" rx="1" transform="rotate(45 11.0503 24.6367)" fill="#757575"/>
<rect x="9.63604" y="35.9492" width="16" height="2" rx="1" transform="rotate(-45 9.63604 35.9492)" fill="#757575"/>
<circle cx="16" cy="31" r="4" fill="#757575"/>
<circle cx="20" cy="324" r="10" fill="#959595"/>
<rect x="12" y="323" width="16" height="2" rx="1" fill="#757575"/>
<rect x="19" y="332" width="16" height="2" rx="1" transform="rotate(-90 19 332)" fill="#757575"/>
<rect x="15.0503" y="317.637" width="16" height="2" rx="1" transform="rotate(45 15.0503 317.637)" fill="#757575"/>
<rect x="13.636" y="328.949" width="16" height="2" rx="1" transform="rotate(-45 13.636 328.949)" fill="#757575"/>
<circle cx="20" cy="324" r="4" fill="#757575"/>
<circle cx="324" cy="31" r="10" fill="#959595"/>
<rect x="316" y="30" width="16" height="2" rx="1" fill="#757575"/>
<rect x="323" y="39" width="16" height="2" rx="1" transform="rotate(-90 323 39)" fill="#757575"/>
<rect x="319.05" y="24.6367" width="16" height="2" rx="1" transform="rotate(45 319.05 24.6367)" fill="#757575"/>
<rect x="317.636" y="35.9492" width="16" height="2" rx="1" transform="rotate(-45 317.636 35.9492)" fill="#757575"/>
<circle cx="324" cy="31" r="4" fill="#757575"/>
<circle cx="273" cy="89" r="10" fill="#959595"/>
<rect x="265" y="88" width="16" height="2" rx="1" fill="#757575"/>
<rect x="272" y="97" width="16" height="2" rx="1" transform="rotate(-90 272 97)" fill="#757575"/>
<rect x="268.05" y="82.6367" width="16" height="2" rx="1" transform="rotate(45 268.05 82.6367)" fill="#757575"/>
<rect x="266.636" y="93.9492" width="16" height="2" rx="1" transform="rotate(-45 266.636 93.9492)" fill="#757575"/>
<circle cx="273" cy="89" r="4" fill="#757575"/>
<circle cx="78" cy="301" r="7" fill="#1C1C1C"/>
<circle cx="294" cy="52" r="7" fill="#1C1C1C"/>
`,
),
  O(
    b,
    "chip",
    `

<path d="M126.694 281.582L167.386 260.512C201.218 242.993 208.059 197.535 180.881 170.835L146.918 137.471C131.409 122.235 126.12 99.3998 133.351 78.897L161 0.499659" stroke="#8C5911" stroke-width="3" fill="none"/>
<path d="M0 182H107C118.046 182 127 190.954 127 202V245.127L127 280.5L63.249 341H20C8.9543 341 0 332.046 0 321V182Z" fill="#8C5911"/>
<circle cx="110" cy="199" r="10" fill="#959595"/>
<rect x="102" y="198" width="16" height="2" rx="1" fill="#757575"/>
<rect x="109" y="207" width="16" height="2" rx="1" transform="rotate(-90 109 207)" fill="#757575"/>
<rect x="105.05" y="192.637" width="16" height="2" rx="1" transform="rotate(45 105.05 192.637)" fill="#757575"/>
<rect x="103.636" y="203.949" width="16" height="2" rx="1" transform="rotate(-45 103.636 203.949)" fill="#757575"/>
<circle cx="110" cy="199" r="4" fill="#757575"/>
<circle cx="30" cy="324.994" r="10" fill="#959595"/>
<rect x="22" y="323.994" width="16" height="2" rx="1" fill="#757575"/>
<rect x="29" y="332.994" width="16" height="2" rx="1" transform="rotate(-90 29 332.994)" fill="#757575"/>
<rect x="25.0503" y="318.631" width="16" height="2" rx="1" transform="rotate(45 25.0503 318.631)" fill="#757575"/>
<rect x="23.636" y="329.943" width="16" height="2" rx="1" transform="rotate(-45 23.636 329.943)" fill="#757575"/>
<circle cx="30" cy="324.994" r="4" fill="#757575"/>
<path d="M0 248.002L59.6383 248.016C72.6923 248.019 85.2275 253.127 94.5655 262.249L119.501 286.607" stroke="#C77B11" fill="none"/>
<path d="M0 253.352L56.6352 253.359C69.6911 253.36 82.2284 258.469 91.5678 267.592L116.501 291.948" stroke="#C77B11" fill="none"/>
<path d="M0 259.352L53.6413 259.37C66.6936 259.374 79.2267 264.482 88.5634 273.603L113.501 297.963" stroke="#C77B11" fill="none"/>
<path d="M0 265.352L50.6584 265.379C63.7005 265.386 76.2237 270.489 85.5566 279.599L108.5 301.994" stroke="#C77B11" fill="none"/>
<path d="M0 271.352L47.6727 271.378C60.7063 271.385 73.222 276.481 82.5533 285.58L104 306.494" stroke="#C77B11" fill="none"/>
<path d="M0 277.352L44.472 277.373C57.6247 277.38 70.2452 282.568 79.5989 291.815L99 310.994" stroke="#C77B11" fill="none"/>
<path d="M0 283.352L41.4826 283.374C54.629 283.382 67.2437 288.566 76.5957 297.805L94.5 315.494" stroke="#C77B11" fill="none"/>
<path d="M0 289.352L38.4979 289.378C51.6352 289.387 64.2413 294.566 73.5905 303.795L90 319.994" stroke="#C77B11" fill="none"/>
<path d="M0 295.352L34.0028 295.382C46.84 295.393 59.181 300.342 68.4698 309.203L84.5 324.494" stroke="#C77B11" fill="none"/>
<path d="M0 301.352L30.5182 301.378C43.6435 301.389 56.2381 306.561 65.5835 315.777L80 329.994" stroke="#C77B11" fill="none"/>
<path d="M0 307.352L26.5093 307.367C39.6399 307.375 52.2404 312.548 61.5892 321.768L75 334.994" stroke="#C77B11" fill="none"/>
<path d="M124.64 275.994L128.882 280.237C129.663 281.018 129.663 282.284 128.882 283.065L68.0711 343.876C67.29 344.657 66.0237 344.657 65.2426 343.876L61 339.634L124.64 275.994Z" fill="#D9D9D9"/>
<circle cx="89.5" cy="217.5" r="2.5" fill="#959595"/>
<circle cx="89.5" cy="234.5" r="2.5" fill="#959595"/>

`,
  ));
let w = b;
class S {
  constructor(t, e, i, s, a, r = void 0) {
    ((this.targetCount = t),
      (this.blocksPerTarget = e),
      (this.pagesPerBlock = i),
      (this.pagesPerTarget = e * i),
      (this.readSpeed = s),
      (this.writeSpeed = a),
      (this.initialPages = r),
      (this.ioQueues = []));
    for (let n = 0; n < t; n++) this.ioQueues.push([]);
    ((this.ioQueueId = 1),
      (this.ioQueueSuper = []),
      this.initializeData(this.initialPages));
  }
  initializeData() {
    this.targets = [];
    let t = 0;
    for (let e = 0; e < this.targetCount; e++) {
      const i = [];
      for (let s = 0; s < this.blocksPerTarget; s++) {
        const a = [];
        for (let r = 0; r < this.pagesPerBlock; r++) {
          if (this.initialPages == null)
            a.push({ data: "", initial: !0, dirty: !1 });
          else {
            let n = this.initialPages[t],
              d = { data: n.data, dirty: n.dirty, initial: !0 };
            a.push(d);
          }
          t++;
        }
        i.push(a);
      }
      this.targets.push(i);
    }
  }
  totalPages() {
    return this.targetCount * this.blocksPerTarget * this.pagesPerBlock;
  }
  targetForPageIndex(t) {
    const e = this.blocksPerTarget * this.pagesPerBlock;
    return (this.pagesPerBlock, Math.floor(t / e));
  }
  blockForPageIndex(t) {
    const e = this.blocksPerTarget * this.pagesPerBlock;
    this.pagesPerBlock;
    const i = Math.floor(t / e);
    return Math.floor((t - i * e) / this.pagesPerBlock);
  }
  pageForPageIndex(t) {
    const e = this.blocksPerTarget * this.pagesPerBlock,
      i = this.pagesPerBlock,
      s = Math.floor(t / e),
      a = Math.floor((t - s * e) / this.pagesPerBlock);
    return t - s * e - a * i;
  }
  writeToPage(t, e) {
    if (this.totalPages() < t) return;
    const i = this.targetForPageIndex(t),
      s = this.blockForPageIndex(t),
      a = this.pageForPageIndex(t);
    this.targets[i][s][a] = { data: e, initial: !1, dirty: !1 };
  }
  dirtyPage(t) {
    if (this.totalPages() < t) return;
    const e = this.targetForPageIndex(t),
      i = this.blockForPageIndex(t),
      s = this.pageForPageIndex(t);
    this.targets[e][i][s].dirty = !0;
  }
  eraseBlock(t) {
    if (this.totalPages() < t) return;
    const e = this.targetForPageIndex(t),
      i = this.blockForPageIndex(t);
    for (let s = 0; s < this.pagesPerBlock; s++)
      ((this.targets[e][i][s].data = ""), (this.targets[e][i][s].dirty = !1));
  }
  readFromPage(t) {
    if (this.totalPages() < t) return;
    const e = this.targetForPageIndex(t),
      i = this.blockForPageIndex(t),
      s = this.pageForPageIndex(t);
    return this.targets[e][i][s].data;
  }
  pushIO(t) {
    const e = this.targetForPageIndex(t.page);
    return (
      (t.id = this.ioQueueId),
      this.ioQueueId++,
      this.ioQueues[e].push(t),
      e
    );
  }
  ioQueueCount() {
    let t = 0;
    for (const e of this.ioQueues) t += e.length;
    return ((t += this.ioQueueSuper.length), t);
  }
  popIO(t) {
    return this.ioQueues[t].shift();
  }
  peekIO(t) {
    return this.ioQueues[t][0];
  }
  isTopIOQueueWrite() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "W";
  }
  isTopIOQueueRead() {
    return this.ioQueue.length == 0 ? !1 : this.ioQueue[0].type == "R";
  }
}
class v extends x {
  constructor(t, e, i = [], s = {}) {
    (super(),
      (this.ssd = t),
      (this.options = s),
      (this.width = 1e3),
      (this.height = 500),
      this.updateSizes(),
      (this.shift = 0),
      this.options.labels && (this.shift = this.heightChunk * 4),
      (this.id = e),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      this.initializeBaseElements(),
      (this.domSVG = this.dom.getElementsByClassName("ssdSVG")[0]),
      (this.currentIOs = []));
    for (let a = 0; a < this.ssd.targetCount; a++) this.currentIOs.push(void 0);
    (this.updateColors(),
      (this.hasIOQueueTimer = !1),
      (this.timeStart = 0),
      (this.timeEnd = 0),
      (this.animationSpeed = this.options.speed ? this.options.speed : 1),
      this.initialize(),
      this.options.randomReadWrite && this.createRandomReadsWrites(),
      (this.initialIOs = i),
      this.setupInitialIOs(),
      this.updateIOQueue(),
      this.options.labels && this.drawLabels(),
      (this.isAnimating = !0),
      this.setupObserver());
  }
  stop() {
    this.isAnimating = !1;
  }
  start() {
    ((this.isAnimating = !0),
      this.options.randomReadWrite && this.createRandomReadsWrites(),
      this.initialize(),
      this.updateAll(),
      (this.hasIOQueueTimer == !1 || this.timeStart != 0) && this.startIOs());
  }
  drawLabels() {
    (this.addLabel(
      "Controller",
      this.widthChunk * 3.5,
      this.heightChunk * 1,
      this.widthChunk * 3.5,
      this.shift + this.heightChunk * 10,
      "controller",
    ),
      this.addLabel(
        "Lines",
        this.widthChunk * 8,
        this.heightChunk * 1,
        this.widthChunk * 8,
        this.shift + this.heightChunk * 10,
        "dataLines",
      ),
      this.addLabel(
        "Target",
        this.widthChunk * 12.75,
        this.heightChunk * 1,
        this.widthChunk * 12.75,
        this.shift + this.heightChunk * 2,
        "target",
      ),
      this.addLabel(
        "",
        this.widthChunk * 16.75,
        this.heightChunk * 1,
        this.widthChunk * 15.75,
        this.shift + this.heightChunk * 7,
        "block1",
      ),
      this.addLabel(
        "Blocks",
        this.widthChunk * 16.75,
        this.heightChunk * 1,
        this.widthChunk * 16.75,
        this.shift + this.heightChunk * 5,
        "block2",
      ),
      this.addLabel(
        "",
        this.widthChunk * 16.75,
        this.heightChunk * 1,
        this.widthChunk * 17.75,
        this.shift + this.heightChunk * 3,
        "block3",
      ));
  }
  setupInitialIOs() {
    if (this.options.superQueue == !0)
      this.ssd.ioQueueSuper = JSON.parse(JSON.stringify(this.initialIOs));
    else if (this.initialIOs != null)
      for (const t of this.initialIOs) this.ssd.pushIO(t);
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .attr("id", "interactivityContainer")
      .style("width", "100%");
    this.options.hideMenu ||
      (t
        .append("div")
        .attr("class", "menu")
        .attr("id", "menu")
        .style("width", "100%"),
      (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto");
    this.svg = e
      .append("svg")
      .attr("class", "ssdSVG")
      .attr("id", "ssdSVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height + this.shift}`)
      .style("width", "100%")
      .style("height", "100%");
  }
  updateSizes() {
    ((this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.targetShiftX = this.widthChunk * 7),
      (this.targetShiftY = this.heightChunk * 2),
      (this.targetSpaceX = this.widthChunk * 0.5),
      (this.targetSpaceY = this.heightChunk * 4),
      (this.targetW =
        (this.widthChunk * 12) / (this.ssd.targetCount / 2) -
        this.targetSpaceX),
      (this.targetH = (this.heightChunk * 12) / 2),
      (this.blockSpaceX = this.targetH / 20),
      (this.blockSpaceY = this.targetH / 20),
      (this.blockW = this.targetW - this.blockSpaceX * 2),
      (this.blockH =
        this.targetH / this.ssd.blocksPerTarget -
        (this.blockSpaceY + this.blockSpaceY / this.ssd.blocksPerTarget)),
      (this.pageW = this.blockW / this.ssd.pagesPerBlock),
      (this.pageH = this.blockH - this.blockH * 0.1),
      (this.lineShiftX = this.widthChunk * 6),
      (this.lineShiftY = this.heightChunk * 9),
      (this.lineSpaceY = (this.heightChunk * 2) / this.ssd.targetCount),
      (this.fontSize = Math.floor(this.height / 14)),
      (this.fontSizeW = this.fontSize * 0.75),
      (this.queueJump = this.fontSize * 2.5),
      (this.radiusBig = this.height / 50),
      (this.radiusSmall = this.height / 100),
      (this.screws = [
        [this.heightChunk, this.heightChunk],
        [this.heightChunk, this.heightChunk * 19],
        [this.widthChunk * 20 - this.heightChunk, this.heightChunk * 19],
        [this.widthChunk * 20 - this.heightChunk, this.heightChunk],
      ]));
  }
  initialize() {
    this.svg
      .selectAll(".solidStateDrive")
      .data([0])
      .join((e) =>
        e
          .append("g")
          .attr("class", "solidStateDrive")
          .attr("transform", `translate(0 ${this.shift})`),
      );
    const t = this.svg
      .select(".solidStateDrive")
      .selectAll(".background")
      .data([0])
      .join((e) => {
        let i = e.append("g").attr("class", "background");
        return (
          i.append("rect").attr("class", "outerRect"),
          i.append("rect").attr("class", "pcbRect"),
          i.append("rect").attr("class", "innerRect"),
          i.append("rect").attr("class", "controlRect"),
          i.append("text").attr("class", "controlText"),
          i
        );
      });
    (t
      .select(".outerRect")
      .attr("fill", this.dimGray)
      .attr("stroke", this.dimGray)
      .attr("x", 0)
      .attr("y", 0)
      .attr("rx", this.radiusBig)
      .attr("ry", this.radiusBig)
      .attr("width", this.width)
      .attr("height", this.height),
      t
        .select(".pcbRect")
        .attr("fill", this.pcbColor)
        .attr("x", this.widthChunk * 1.25)
        .attr("y", this.heightChunk * 1.25)
        .attr("rx", this.radiusBig)
        .attr("ry", this.radiusBig)
        .attr(
          "width",
          this.width - this.heightChunk * 2.5 - this.widthChunk * 0.5,
        )
        .attr("height", this.height - this.heightChunk * 2.5),
      t
        .select(".controlRect")
        .attr("fill", this.lightGray)
        .style("filter", "drop-shadow( 0px 2px 2px rgba(50, 50, 50, 0.3))")
        .attr("x", this.widthChunk * 1.5)
        .attr("y", this.heightChunk * 2)
        .attr("rx", this.radiusBig)
        .attr("ry", this.radiusBig)
        .attr("width", this.widthChunk * 4.5)
        .attr("height", this.heightChunk * 16),
      this.drawPinsInGroup(t),
      this.svg
        .select(".solidStateDrive")
        .selectAll(".screws")
        .data(this.screws)
        .join((e) => {
          let i = e.append("g").attr("class", "screws");
          (i
            .append("ellipse")
            .attr("class", "screwOuter")
            .attr("fill", this.darkGray)
            .attr("stroke", this.darkGray)
            .attr("cx", (s) => s[0])
            .attr("cy", (s) => s[1])
            .attr("rx", this.heightChunk / 2)
            .attr("ry", this.heightChunk / 2),
            i
              .append("ellipse")
              .attr("class", "screwInner")
              .attr("fill", this.lightGray)
              .attr("stroke", this.lightGray)
              .attr("cx", (s) => s[0])
              .attr("cy", (s) => s[1])
              .attr("rx", this.heightChunk / 3.5)
              .attr("ry", this.heightChunk / 3.5));
        }),
      this.svg
        .select(".solidStateDrive")
        .selectAll(".foreground")
        .data([0])
        .join((e) => {
          e.append("g").attr("class", "foreground");
        }));
  }
  isBottomRow(t) {
    const i = this.ssd.targetCount / 2;
    return Math.floor(t / i);
  }
  getTargetX(t) {
    const i = this.ssd.targetCount / 2;
    return Math.floor(t / i) == 0
      ? this.targetShiftX +
          Math.floor(t % i) * (this.targetW + this.targetSpaceX)
      : this.targetShiftX +
          (i - (t % i) - 1) * (this.targetW + this.targetSpaceX);
  }
  getTargetY(t) {
    const e = this.ssd.targetCount / 2,
      i = Math.floor(t / e);
    return this.targetShiftY + i * (this.targetH + this.targetSpaceY);
  }
  getStartOfLineXY(t) {
    const e = this.widthChunk / (this.ssd.targetCount / 2 + 1),
      i = (this.heightChunk * 16) / (this.ssd.targetCount + 1);
    let s,
      a = e * (this.ssd.targetCount / 2 - 1);
    this.isBottomRow(t)
      ? (s = e * t - a)
      : (s = e * (this.ssd.targetCount - (t + 1)) - a);
    const r = this.widthChunk * 6,
      n = i + this.heightChunk * 2 + i * t;
    return [r, n, s];
  }
  getLinePoints(t) {
    const e = Math.floor(t / (this.ssd.targetCount / 2)) == 0,
      i = this.getStartOfLineXY(t),
      s = i[0],
      a = i[1],
      r = s + i[2],
      n = a,
      d = r,
      l = this.lineShiftY + this.lineSpaceY * t,
      o = this.getTargetX(t) + this.targetW / 2,
      u = l,
      p = o,
      c = this.getTargetY(t) + (e ? this.targetH : 0);
    return [
      [s, a],
      [r, n],
      [d, l],
      [o, u],
      [p, c],
    ];
  }
  getWritePath(t, e, i) {
    const s = this.getLinePoints(i),
      a =
        this.getTargetX(i) + this.blockSpaceX + this.pageW / 2 + t * this.pageW,
      r =
        this.getTargetY(i) +
        (e % this.ssd.blocksPerTarget) * (this.blockH + this.blockSpaceY) +
        this.blockH / 1.8 +
        this.blockSpaceY;
    return (s.push([a, r]), s);
  }
  update(t, e = !0) {
    this.ssd.targets.length;
    const i = this.ssd.targets[0].length;
    this.ssd.targets[0][0].length;
    const s = t,
      a = this.ssd.targets[s];
    this.svg
      .select(".solidStateDrive")
      .selectAll(".target" + s)
      .data([0])
      .join(
        (d) => {
          let l = d.append("g").attr("class", "target" + s);
          (l
            .append("path")
            .attr("class", "linePath" + s)
            .attr("fill", this.transparent)
            .attr("stroke", this.lightGray)
            .attr("stroke-width", 2)
            .style(
              "filter",
              "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
            )
            .attr("d", (o) => {
              const u = this.getLinePoints(s);
              let p = "M ";
              for (const c of u) p += ` ${c[0]} ${c[1]}`;
              return p;
            }),
            l
              .append("rect")
              .attr("class", "targetRect" + s)
              .attr("fill", this.dimGray)
              .style(
                "filter",
                "drop-shadow( 0px 2px 2px rgba(50, 50, 50, 0.3))",
              )
              .attr("x", (o) => this.getTargetX(s))
              .attr("y", (o) => this.getTargetY(s))
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("width", this.targetW)
              .attr("height", this.targetH));
        },
        (d) => {
          (d
            .select(".linePath" + s)
            .attr("fill", this.transparent)
            .attr("d", (l) => {
              const o = this.getLinePoints(s);
              let u = "M ";
              for (const p of o) u += ` ${p[0]} ${p[1]}`;
              return u;
            }),
            d
              .select(".targetRect" + s)
              .attr("fill", this.dimGray)
              .attr("stroke", this.dimGray)
              .attr("rx", this.radiusBig)
              .attr("ry", this.radiusBig)
              .attr("stroke-width", 2)
              .attr("x", (l) => this.getTargetX(s))
              .attr("y", (l) => this.getTargetY(s))
              .attr("width", this.targetW)
              .attr("height", this.targetH));
        },
      );
    const r = a.map((d) => ({ blocks: d, targetIndex: s, total: a.length }));
    this.svg
      .select(".solidStateDrive")
      .selectAll(".blocks" + s)
      .data(r, (d, l) => "block-" + d.targetIndex + "-" + l)
      .join(
        (d) => {
          d.append("g")
            .attr("class", "blocks" + s)
            .append("rect")
            .attr("class", "blockRect")
            .attr("fill", this.lightGray)
            .attr(
              "x",
              (o, u) => this.getTargetX(o.targetIndex) + this.blockSpaceX,
            )
            .attr("y", (o, u) => {
              const p = this.getTargetY(o.targetIndex),
                c = u * (this.blockH + this.blockSpaceY);
              return p + c + this.blockSpaceY;
            })
            .attr("rx", this.radiusSmall)
            .attr("ry", this.radiusSmall)
            .attr("width", this.blockW)
            .attr("height", (o) => this.blockH);
        },
        (d) => {
          d.select(".blockRect")
            .attr("fill", this.lightGray)
            .attr("rx", this.radiusSmall)
            .attr("ry", this.radiusSmall)
            .attr(
              "x",
              (l, o) => this.getTargetX(l.targetIndex) + this.blockSpaceX,
            )
            .attr("y", (l, o) => {
              const u = this.getTargetY(l.targetIndex),
                p = o * (this.blockH + this.blockSpaceY);
              return u + p + this.blockSpaceY;
            })
            .attr("width", this.blockW)
            .attr("height", (l) => this.blockH);
        },
      );
    const n = [];
    for (let d = 0; d < a.length; d++) {
      const l = a[d];
      for (let o = 0; o < l.length; o++) {
        const u = l[o],
          p = {
            data: u.data,
            dirty: u.dirty,
            initial: u.initial,
            targetIndex: s,
            targetTotal: this.ssd.targets.length,
            blockIndex: d,
            blockTotal: a.length,
            pageIndex: o,
            writePath: this.getWritePath(o, d, s),
          };
        n.push(p);
      }
    }
    this.svg
      .select(".solidStateDrive")
      .selectAll(".page" + s)
      .data(n, (d, l) => "page-" + l + "-" + d.data)
      .join(
        (d) => {
          let l = d
            .append("g")
            .attr("class", "page" + s)
            .attr("transform", (o) =>
              o.data == ""
                ? "translate(0 0)"
                : `translate(${o.writePath[0][0]} ${o.writePath[0][1]})`,
            );
          (l
            .append("rect")
            .attr("class", "pageBackground")
            .attr("fill", this.lightGreen)
            .attr("x", (o) => -(this.fontSizeW * o.data.length) * 0.5)
            .attr("y", -this.fontSizeW * 0.8)
            .attr("rx", 5)
            .attr("width", (o) => this.fontSizeW * o.data.length)
            .attr("height", this.fontSizeW * 1.4)
            .attr("opacity", 1),
            l
              .append("text")
              .attr("class", "pageText")
              .style(
                "font-family",
                'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              )
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("font-size", this.fontSize)
              .attr("fill", this.green)
              .text((o) => o.data));
          for (let o = 1; o < 6; o++)
            l = l
              .transition()
              .ease(y)
              .duration((u) =>
                u.data == "" || e == !1 || u.initial
                  ? 0
                  : 250 / this.animationSpeed,
              )
              .attr("transform", (u) =>
                u.data == ""
                  ? "translate(0 0)"
                  : `translate(${u.writePath[o][0]} ${u.writePath[o][1]})`,
              );
          return (
            (l = l
              .transition()
              .duration(0)
              .attr("fill", (o) => (o.dirty ? this.darkRed : this.pageColor))),
            l
              .transition()
              .duration(250)
              .select(".pageBackground")
              .attr("opacity", 0),
            l
              .select(".pageText")
              .transition()
              .duration(250)
              .attr("fill", this.darkGray)
              .on("end", (o, u) => {
                if (o.initial) {
                  o.initial = !1;
                  return;
                }
                (this.updateIOTimerReadout(),
                  (this.currentIOs[o.targetIndex] = void 0),
                  this.isAnimating &&
                    (this.options.randomReadWrite &&
                      this.createRandomReadsWrites(),
                    this.updateIOQueue(),
                    (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
                      this.nextIOQueue(t)));
              }),
            l
          );
        },
        (d) => (
          d
            .select(".pageBackground")
            .transition()
            .ease(y)
            .duration(250)
            .attr("opacity", 0),
          d
            .select(".pageText")
            .attr("fill", (l) => (l.dirty ? this.darkRed : this.pageColor))
            .attr("font-size", this.fontSize)
            .text((l) => l.data),
          d.attr("transform", (l, o) => {
            if (l.data == "")
              return `translate(${this.widthChunk * 6} ${this.heightChunk * 10})`;
            {
              const u = this.getTargetX(l.targetIndex),
                p = this.pageW / 2 + l.pageIndex * this.pageW,
                c = u + this.blockSpaceX + p,
                f = this.getTargetY(l.targetIndex),
                g =
                  (l.blockIndex % i) * (this.blockH + this.blockSpaceY) +
                  this.blockH / 1.8,
                k = f + g + this.blockSpaceY;
              return `translate(${c} ${k})`;
            }
          }),
          d
        ),
      );
  }
  createRandomReadsWrites() {
    for (let t = 0; t < this.ssd.targetCount; t++) {
      if (this.ssd.peekIO(t)) continue;
      const e =
          t * this.ssd.pagesPerTarget +
          Math.floor(Math.random() * this.ssd.pagesPerTarget),
        i = this.ssd.readFromPage(e);
      if (i != null && i != null && i != "") {
        const s = { type: "R", page: e };
        this.ssd.pushIO(s);
      } else {
        const s = { type: "W", page: e, value: this.getRandomAlpha() };
        this.ssd.pushIO(s);
      }
    }
  }
  updateAll(t = !0) {
    (this.ssd.targets.length,
      this.ssd.targets[0].length,
      this.ssd.targets[0][0].length);
    for (let e = 0; e < this.ssd.targets.length; e++) this.update(e, t);
  }
  applyAnimation(t, e, i, s, a, r) {
    const n = this.ssd.targetForPageIndex(e),
      d = this.ssd.blockForPageIndex(e),
      l = this.ssd.pageForPageIndex(e);
    let o = this.getWritePath(l, d, n);
    if (r) {
      o = o.reverse();
      const p = o[o.length - 1];
      o.push([-50, p[1]]);
    }
    ((t = t.attr("transform", (p) => `translate(${o[0][0]} ${o[0][1]})`)),
      (t = t.attr("opacity", 0)));
    const u = this.fontSizeW * i.length;
    (t
      .append("rect")
      .attr("fill", a)
      .attr("x", -u * 0.5)
      .attr("y", -this.fontSizeW * 0.8)
      .attr("rx", 5)
      .attr("width", u)
      .attr("height", this.fontSizeW * 1.4)
      .attr("opacity", 1),
      t
        .append("text")
        .style(
          "font-family",
          'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        )
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("opacity", 1)
        .attr("font-size", "" + this.fontSize)
        .attr("fill", s)
        .text((p) => i),
      (t = t.attr("opacity", 1)));
    for (let p = 1; p < o.length; p++)
      t = t
        .transition()
        .ease(y)
        .duration(250 / this.animationSpeed)
        .attr("transform", (c) => `translate(${o[p][0]} ${o[p][1]})`);
    return (
      (t = t
        .transition()
        .duration(250)
        .attr("opacity", 0)
        .attr("fill", (p) => (p.dirty ? this.dirtyColor : this.pageColor))
        .on("end", (p, c) => {
          (this.update(n),
            this.updateIOTimerReadout(),
            (this.currentIOs[n] = void 0),
            this.isAnimating &&
              (this.options.randomReadWrite && this.createRandomReadsWrites(),
              this.updateIOQueue(),
              (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
                this.nextIOQueue(n)));
        })),
      t
    );
  }
  animateErase(t) {
    const e = this.ssd.targetForPageIndex(t);
    this.svg
      .select(".solidStateDrive")
      .selectAll(".eraseAnimation" + e)
      .data([0])
      .join(
        (i) =>
          this.applyAnimation(
            i.append("g").attr("class", "eraseAnimation" + e),
            t,
            "erase",
            this.orange,
            this.lightOrange,
            !1,
          ),
        (i) =>
          this.applyAnimation(i, t, "erase", this.orange, this.lightOrange, !1),
      );
  }
  animateDirty(t) {
    const e = this.ssd.targetForPageIndex(t);
    this.svg
      .select(".solidStateDrive")
      .selectAll(".dirtyAnimation" + e)
      .data([0])
      .join(
        (i) =>
          this.applyAnimation(
            i.append("g").attr("class", "dirtyAnimation" + e),
            t,
            "dirty",
            this.red,
            this.lightRed,
            !1,
          ),
        (i) => this.applyAnimation(i, t, "dirty", this.red, this.lightRed, !1),
      );
  }
  animateRead(t) {
    const e = this.ssd.targetForPageIndex(t);
    this.svg
      .select(".solidStateDrive")
      .selectAll(".readAnimation" + e)
      .data([0])
      .join(
        (i) =>
          this.applyAnimation(
            i.append("g").attr("class", "readAnimation" + e),
            t,
            this.ssd.readFromPage(t),
            this.blue,
            this.lightBlue,
            !0,
          ),
        (i) =>
          this.applyAnimation(
            i,
            t,
            this.ssd.readFromPage(t),
            this.blue,
            this.lightBlue,
            !0,
          ),
      );
  }
  nextIOQueue(t) {
    let e = 0;
    if (this.options.superQueue == !0) {
      if (this.ssd.ioQueueSuper.length == 0) return;
      for (let a of this.currentIOs) if (a != null) return;
      const i = this.ssd.ioQueueSuper.shift(),
        s = this.ssd.targetForPageIndex(i.page);
      ((this.currentIOs[s] = i), (e = s));
    } else {
      if (((e = t), this.currentIOs[e] != null || this.ssd.peekIO(e) == null))
        return;
      this.currentIOs[e] = this.ssd.popIO(e);
    }
    (this.updateIOQueue(),
      this.currentIOs[e].type == "W"
        ? (this.ssd.writeToPage(
            this.currentIOs[e].page,
            this.currentIOs[e].value,
          ),
          this.update(e))
        : this.currentIOs[e].type == "D"
          ? (this.ssd.dirtyPage(this.currentIOs[e].page),
            this.animateDirty(this.currentIOs[e].page))
          : this.currentIOs[e].type == "E"
            ? (this.ssd.eraseBlock(this.currentIOs[e].page),
              this.animateErase(this.currentIOs[e].page))
            : this.animateRead(this.currentIOs[e].page));
  }
  updateIOTimerReadout() {
    if (this.ssd.ioQueueCount() == 0) {
      this.updateIOQueue();
      const t = this.dom.getElementsByClassName("timeIOResult")[0];
      this.timeStart != 0 &&
        t != null &&
        ((this.timeEnd = Date.now()),
        (t.innerHTML =
          Math.round(((this.timeEnd - this.timeStart) / 1e3) * 100) / 100 +
          "s"),
        (this.timeStart = 0),
        (this.timeEnd = 0));
    }
  }
  updateIOQueue() {
    if (!(this.options.showIOQueue != null && this.options.showIOQueue == !1))
      for (let t = 0; t < this.ssd.ioQueues.length; t++) {
        let e = this.ssd.ioQueues[t];
        this.svg
          .select(".foreground")
          .selectAll(".ioQueueV" + t)
          .data(e, (i) => "ioq-" + i.id)
          .join(
            (i) => {
              let s = i
                .append("g")
                .attr("class", "ioQueueV" + t)
                .attr(
                  "transform",
                  (a, r) =>
                    `translate(${this.widthChunk * 6 - r * this.queueJump - 40} ${this.getStartOfLineXY(t)[1]})`,
                );
              return (
                s
                  .append("rect")
                  .attr("class", "pageBackground")
                  .attr("fill", (a) => {
                    if (a.type == "R") return this.lightBlue;
                    if (a.type == "W") return this.lightGreen;
                    if (a.type == "D") return this.lightDirty;
                    if (a.type == "E") return this.lightRed;
                  })
                  .attr(
                    "x",
                    (a) => -(this.fontSizeW * (a.type + a.page).length) * 0.5,
                  )
                  .attr("y", -this.fontSizeW * 0.8)
                  .attr("rx", 5)
                  .attr(
                    "width",
                    (a) => this.fontSizeW * (a.type + a.page).length,
                  )
                  .attr("height", this.fontSizeW * 1.4)
                  .attr("opacity", 1),
                s
                  .append("text")
                  .style(
                    "font-family",
                    'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  )
                  .style(
                    "filter",
                    "drop-shadow( 0px 2px 2px rgba(150, 150, 150, 0.3))",
                  )
                  .attr("text-anchor", "middle")
                  .attr("dominant-baseline", "middle")
                  .attr("font-size", this.fontSize)
                  .attr("fill", (a) => {
                    if (a.type == "R") return this.blue;
                    if (a.type == "W") return this.green;
                    if (a.type == "D") return this.dirtyColor;
                    if (a.type == "E") return this.red;
                  })
                  .text((a) => a.type + a.page),
                s
              );
            },
            (i) =>
              i
                .transition()
                .ease(y)
                .duration(250 / this.animationSpeed)
                .style("opacity", 1)
                .attr(
                  "transform",
                  (s, a) =>
                    `translate(${this.widthChunk * 6 - a * this.queueJump - 40} ${this.getStartOfLineXY(t)[1]})`,
                ),
            (i) =>
              i
                .transition()
                .ease(y)
                .duration(250 / this.animationSpeed)
                .style("opacity", 0)
                .attr(
                  "x",
                  (s, a) => this.widthChunk * 6 - a * this.queueJump - 10,
                )
                .remove(),
          );
      }
  }
  addListener(t, e) {
    const i = this.dom.getElementsByClassName(t);
    i.length && i[0].addEventListener("click", e.bind(this), !1);
  }
  addSpeedSelector() {
    const t = `
      <span class="subMenu speedSelector">
       <div class="subMenuTitle">Speed selector</div>
        <button class=" ioElement ioButton speedMinus pm ${this.options.speedClasses}">-</button>
        <input type="text" class="ioElement speed noHover ${this.options.speedClasses}" value="1" readonly="readonly">
        <button class="ioElement ioButton speedPlus pm ${this.options.speedClasses}">+</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("speedMinus", function () {
        this.animationSpeed < 0.5 ||
          ((this.animationSpeed -= 0.25),
          (this.dom.getElementsByClassName("speed")[0].value =
            this.animationSpeed));
      }),
      this.addListener("speedPlus", function () {
        this.animationSpeed > 3.8 ||
          ((this.animationSpeed += 0.25),
          (this.dom.getElementsByClassName("speed")[0].value =
            this.animationSpeed));
      }));
  }
  addWriteElement() {
    const t = `
      <span class="subMenu writeData">
        <div style="display:inline-block;">
          <div class="subMenuTitle">Page to write to</div>
          <button class="ioElement ioButton writeDataPageIndexMinus pm ${this.options.writeClasses}">-</button>
          <input type="text" class="ioElement writeDataPageIndex ${this.options.writeClasses}" value="0" readonly="readonly">
          <button class="ioElement ioButton writeDataPageIndexPlus pm ${this.options.writeClasses}">+</button>
        </div>
        <div style="display:inline-block;">
          <div class="subMenuTitle">Write data</div>
          <button class="ioElement ioButton writeDataValueMinus pm ${this.options.writeClasses}">-</button>
          <input type="text" class="ioElement writeDataValue ${this.options.writeClasses}" value="10" readonly="readonly">
          <button class="ioElement ioButton writeDataValuePlus pm ${this.options.writeClasses}">+</button>
        </div>
        <div style="display:inline-block;">
          <div class="subMenuTitle"></div>
          <button class="ioElement ioButton writeDataWrite">Write</button>
        </div>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("writeDataPageIndexMinus", function () {
        const e = this.dom.getElementsByClassName("writeDataPageIndex")[0];
        e.value <= 0 || e.value--;
      }),
      this.addListener("writeDataPageIndexPlus", function () {
        const e = this.dom.getElementsByClassName("writeDataPageIndex")[0];
        e.value > this.ssd.totalPages() || e.value++;
      }),
      this.addListener("writeDataValueMinus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value <= 1 || e.value--;
      }),
      this.addListener("writeDataValuePlus", function () {
        const e = this.dom.getElementsByClassName("writeDataValue")[0];
        e.value >= 100 || e.value++;
      }),
      this.addListener("writeDataWrite", function () {
        const e = this.dom.getElementsByClassName("writeDataPageIndex")[0],
          i = this.dom.getElementsByClassName("writeDataValue")[0],
          s = this.ssd.pushIO({ type: "W", page: e.value, value: i.value });
        (this.updateIOQueue(),
          (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
            this.nextIOQueue(s),
          e.value++,
          i.value++);
      }));
  }
  addReadElement() {
    const t = `
      <span class="subMenu readData">
        <div style="display:inline-block;">
          <div class="subMenuTitle">Page to read from</div>
          <button class="ioElement ioButton readDataPageIndexMinus pm ${this.options.readClasses}">-</button>
          <input type="text" class="ioElement readDataPageIndex ${this.options.readClasses}" value="4" readonly="readonly">
          <button class="ioElement ioButton readDataPageIndexPlus pm ${this.options.readClasses}">+</button>
        </div>
        <div style="display:inline-block;">
          <div class="subMenuTitle"></div>
          <button class="ioElement ioButton readDataRead">Read</button>
        </div>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("readDataPageIndexMinus", function () {
        const e = this.dom.getElementsByClassName("readDataPageIndex")[0];
        e.value <= 0 || e.value--;
      }),
      this.addListener("readDataPageIndexPlus", function () {
        const e = this.dom.getElementsByClassName("readDataPageIndex")[0];
        e.value > this.ssd.totalPages() || e.value++;
      }),
      this.addListener("readDataRead", function () {
        const e = this.dom.getElementsByClassName("readDataPageIndex")[0],
          i = this.ssd.pushIO({ type: "R", page: e.value });
        (this.updateIOQueue(),
          (this.hasIOQueueTimer == !1 || this.timeStart != 0) &&
            this.nextIOQueue(i),
          e.value++);
      }));
  }
  addIOQueueTimer() {
    this.hasIOQueueTimer = !0;
    const t = `
      <span class="subMenu readData">
        <div style="display:inline-block;">
          <div class="subMenuTitle">Start and time IO queues</div>
          <button class="ioElement ioButton timeIOStart ${this.options.timerClasses}">Time IO</button>
          <span class="ioElement timeIOResult noHover ${this.options.timerClasses}"/>...</span>
        </div>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("timeIOStart", function () {
        if (
          (this.ssd.ioQueueCount() == 0 &&
            (this.ssd.initializeData(),
            this.updateIOQueue(),
            this.updateAll(),
            this.setupInitialIOs(),
            this.updateIOQueue()),
          this.ssd.ioQueueCount() != 0)
        ) {
          ((this.dom.getElementsByClassName("timeIOResult")[0].innerHTML =
            x.timerSVG),
            (this.timeStart = Date.now()));
          for (let e = 0; e < this.ssd.targetCount; e++) this.nextIOQueue(e);
        }
      }));
  }
  startIOs() {
    for (let t = 0; t < this.ssd.targetCount; t++) this.nextIOQueue(t);
  }
}
class I extends x {
  constructor(t, e = {}) {
    (super(),
      (this.options = e),
      (this.latencies = e.latencies || []),
      (this.minSlow = e.minSlow || 1),
      (this.maxSlow = e.maxSlow || 50),
      (this.slowdown = this.maxSlow / 2),
      (this.id = t),
      (this.isAnimating = !1),
      (this.width = 1e3),
      (this.height = 250),
      (this.oneBillion = 1e9),
      (this.oneMillion = 1e6),
      (this.totalTime = this.oneBillion),
      this.updateColors(),
      (this.boxFill = this.lightGray),
      (this.boxStroke = "#999999"),
      (this.textColor = "#333333"),
      (this.transparent = "rgba(0,0,0,0)"),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      this.updateSizes(),
      this.initializeBaseElements(),
      this.initialize());
  }
  updateSizes() {
    ((this.boxHeight = 50), (this.boxSpacing = 10));
    const t =
      this.latencies.length * (this.boxHeight + this.boxSpacing) +
      this.boxSpacing * 2;
    ((this.height = t),
      (this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.strokeW = this.height / 200),
      (this.fontSize = this.width / 25),
      (this.radius = this.height / 50),
      (this.cpuX = 0),
      (this.cpuY = this.heightChunk),
      (this.cpuW = this.widthChunk * 3),
      (this.cpuH = this.height));
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .style("width", "100%");
    this.options.hideMenu ||
      (t.append("div").attr("class", "menu").style("width", "100%"),
      (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto")
      .style("width", "100%");
    this.svg = e
      .append("svg")
      .attr("class", "latencySVG")
      .attr("id", "latencySVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .style("width", "100%")
      .style("height", "auto");
  }
  drawBox(t, e, i, s, a, r) {
    (t
      .attr("fill", this.boxFill)
      .attr("x", e)
      .attr("y", i)
      .attr("width", s)
      .attr("height", a),
      this.svg
        .append("text")
        .text(r)
        .style("font-size", this.fontSize * 0.8 + "px")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", this.textColor)
        .attr("x", e + s / 2)
        .attr("y", i + a / 2));
  }
  initialize() {
    const t = this.svg
      .selectAll(".latencyDiagram")
      .data([0])
      .join("g")
      .attr("class", "latencyDiagram");
    (t
      .selectAll(".background")
      .data([0])
      .join("rect")
      .attr("class", "background")
      .attr("fill", this.transparent)
      .attr("x", 1)
      .attr("y", 1)
      .attr("width", this.width - 2)
      .attr("height", this.height - 2),
      t.selectAll(".cpuBox").data([0]).join("rect").attr("class", "cpuBox"),
      this.drawBox(
        t.select(".cpuBox"),
        this.cpuX,
        this.cpuY,
        this.cpuW,
        this.cpuH,
        "CPU",
      ),
      t
        .selectAll(".latGroup")
        .data(this.latencies)
        .join((i) => {
          const s = i.append("g").attr("class", "latGroup");
          return (
            s.append("rect").attr("class", "destinationBox"),
            s.append("rect").attr("class", "movingRect"),
            s
          );
        })
        .each((i, s, a) => {
          const r = C(a[s]),
            n =
              this.cpuY +
              this.boxSpacing +
              s * (this.boxHeight + this.boxSpacing),
            d = this.widthChunk * 7.5,
            l = this.width - d,
            o = n;
          (r
            .select(".destinationBox")
            .attr("fill", this.boxFill)
            .attr("stroke", "none")
            .attr("stroke-width", 0)
            .attr("x", l)
            .attr("y", o)
            .attr("width", d)
            .attr("height", this.boxHeight),
            this.svg
              .append("text")
              .text(i.label)
              .style("font-size", this.fontSize * 0.7 + "px")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("fill", this.textColor)
              .attr("x", l + d / 2)
              .attr("y", o + this.boxHeight / 2));
          const u = this.boxHeight,
            p = this.cpuX + this.cpuW,
            c = l - u;
          ((i._stash = { distanceTraveled: 0, begin: p, end: c, prevT: 0 }),
            r
              .select(".movingRect")
              .attr("fill", i.color)
              .attr("width", u)
              .attr("height", u)
              .attr("x", p)
              .attr("y", o + (this.boxHeight - u) / 2));
        }));
  }
  start() {
    ((this.isAnimating = !0),
      this.latencies.forEach((t) => {
        this.animateSquare(t);
      }));
  }
  stop() {
    this.isAnimating = !1;
  }
  animateSquare(t) {
    const e = this.svg
      .selectAll(".latGroup")
      .filter((i) => i === t)
      .select(".movingRect");
    e.transition()
      .ease(R)
      .duration(this.totalTime)
      .attrTween("x", () => (i) => {
        const s = t._stash,
          a = i * this.totalTime - s.prevT,
          r = (t.durationNS * this.slowdown) / this.oneMillion,
          n = s.end - s.begin,
          d = n * (a / r);
        s.distanceTraveled += d;
        const l = n * 2,
          o = s.distanceTraveled % l;
        let u;
        if (o <= n) u = s.begin + o;
        else {
          const p = o - n;
          u = s.end - p;
        }
        return (
          this.isAnimating
            ? (s.prevT = i * this.totalTime)
            : (e.interrupt(), (s.prevT = 0)),
          u
        );
      })
      .on("end", () => {
        this.isAnimating && this.animateSquare(t);
      });
  }
  addSpeedSelector() {
    const t = this.slowdown,
      e = `
      <span class="subMenu speedSelector" style="box-sizing:border-box;min-width:50px;width:90%;max-width:500px;">
        <div class="subMenuTitle">Slowdown from real time</div>
        <input
          class="latencySlider slider"
          type="range"
          step="${Math.max(1, (this.maxSlow - this.minSlow) / 100)}"
          min="${this.minSlow}"
          max="${this.maxSlow}"
          value="${t}"
          style="width:90%;box-sizing: border-box;"
        />
        <div class="latencyDisplay">${t}x slower</div>
      </span>`;
    this.menuDom.insertAdjacentHTML("beforeend", e);
    const i = this.dom.getElementsByClassName("latencySlider")[0],
      s = this.dom.getElementsByClassName("latencyDisplay")[0];
    i.addEventListener("input", () => {
      ((this.slowdown = +i.value), (s.innerText = this.slowdown + "x slower"));
    });
  }
}
class X extends x {
  constructor(t, e = {}) {
    (super(),
      (this.width = 1e3),
      (this.height = 500),
      (this.baseIOPS = 3e3),
      (this.maxBurstBalance = 1e5),
      (this.requestedIOPS = 3e3),
      (this.currentIOPS = 3e3),
      (this.burstBalance = 0),
      (this.requestedOffset = 0),
      (this.currentOffset = 0),
      (this.isAnimating = !1),
      (this.options = e),
      (this.id = t),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      this.initializeBaseElements(),
      (this.domSVG = this.dom.getElementsByClassName("ssdSVG")[0]),
      this.updateSizes(),
      this.updateColors(),
      this.initialize(),
      this.setupObserver());
  }
  stop() {
    this.isAnimating = !1;
  }
  start() {
    ((this.isAnimating = !0), this.secondUpdater(), this.update());
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .attr("id", "interactivityContainer")
      .style("width", "100%");
    this.options.hideMenu ||
      (t
        .append("div")
        .attr("class", "menu")
        .attr("id", "menu")
        .style("width", "100%"),
      (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto")
      .style("width", "100%");
    this.svg = e
      .append("svg")
      .attr("class", "ssdSVG")
      .attr("id", "ssdSVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .style("width", "100%")
      .style("height", "100%");
  }
  updateSizes() {
    ((this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.serverX = this.widthChunk * 1),
      (this.serverY = this.heightChunk * 4),
      (this.serverW = this.widthChunk * 4),
      (this.serverH = this.heightChunk * 12),
      (this.burstBalanceX = this.widthChunk * 8),
      (this.burstBalanceY = this.heightChunk * 4),
      (this.burstBalanceW = this.widthChunk * 4),
      (this.burstBalanceH = this.heightChunk * 12),
      (this.ebsX = this.widthChunk * 15),
      (this.ebsY = this.heightChunk * 4),
      (this.ebsW = this.widthChunk * 4),
      (this.ebsH = this.heightChunk * 12),
      (this.strokeWThick = this.height / 50),
      (this.strokeW = this.height / 200),
      (this.fontSize = this.height / 15),
      (this.radius = this.height / 50));
  }
  drawLabel(t, e, i, s, a) {
    this.svg
      .append("text")
      .text(a)
      .style("filter", `drop-shadow( 0px 0px 1px ${this.darkGray})`)
      .style("font-size", this.fontSize * 0.9 + "px")
      .style("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", this.white)
      .attr("x", t + i / 2)
      .attr("y", e + s / 2);
  }
  drawBox(t, e, i, s, a, r, n = void 0) {
    (this.svg
      .select(t)
      .attr("fill", this.gray)
      .attr("stroke", this.gray)
      .attr("stroke-width", this.strokeW)
      .attr("x", e)
      .attr("y", i)
      .attr("rx", this.radius)
      .attr("ry", this.radius)
      .attr("width", s)
      .attr("height", a),
      this.svg
        .select(t + "Label")
        .text(r)
        .style("filter", `drop-shadow( 0px 0px 1px ${this.darkGray})`)
        .style("font-size", this.fontSize * 0.9 + "px")
        .style("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", this.white)
        .attr("x", e + s / 2)
        .attr("y", i + a / 2),
      n != null &&
        this.svg
          .select(t + "AmountLabel")
          .text(n)
          .style("filter", `drop-shadow( 0px 0px 1px ${this.darkGray})`)
          .style("font-size", this.fontSize + "px")
          .style("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", this.white)
          .attr("x", e + s / 2)
          .attr("y", i + a / 2 + this.fontSize * 1.2));
  }
  drawBetweenLabel(t, e, i, s, a) {
    (this.svg
      .select(t + "Label")
      .text(s)
      .style("font-size", this.fontSize * 0.45 + "px")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", this.textSecondary)
      .attr("x", e)
      .attr("y", i),
      this.svg
        .select(t + "AmountLabel")
        .text(a)
        .style("font-size", this.fontSize * 0.7 + "px")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", this.textSecondary)
        .attr("x", e)
        .attr("y", i + this.fontSize));
  }
  initialize() {
    this.svg
      .selectAll(".IOsPerSecond")
      .data([0])
      .join((e) => e.append("g").attr("class", "IOsPerSecond"));
    const t = this.svg
      .select(".IOsPerSecond")
      .selectAll(".diagram")
      .data([0])
      .join((e) => {
        let i = e.append("g").attr("class", "diagram");
        return (
          i.append("rect").attr("class", "background"),
          i.append("path").attr("class", "ioPath1"),
          i.append("path").attr("class", "ioPath2"),
          i.append("rect").attr("class", "server"),
          i.append("rect").attr("class", "burstBalance"),
          i.append("rect").attr("class", "burstBalanceFill"),
          i.append("rect").attr("class", "ebs"),
          i.append("text").attr("class", "serverLabel"),
          i.append("text").attr("class", "burstBalanceLabel"),
          i.append("text").attr("class", "burstBalanceAmountLabel"),
          i.append("text").attr("class", "ebsLabel"),
          i.append("text").attr("class", "requestedIOPSLabel"),
          i.append("text").attr("class", "requestedIOPSAmountLabel"),
          i.append("text").attr("class", "currentIOPSLabel"),
          i.append("text").attr("class", "currentIOPSAmountLabel"),
          i
        );
      });
    (t
      .select(".background")
      .attr("fill", this.transparent)
      .attr("x", 1)
      .attr("y", 1)
      .attr("rx", this.radius)
      .attr("ry", this.radius)
      .attr("width", this.width - 2)
      .attr("height", this.height - 2),
      this.drawBox(
        ".server",
        this.serverX,
        this.serverY,
        this.serverW,
        this.serverH,
        "server",
      ),
      this.drawBox(".ebs", this.ebsX, this.ebsY, this.ebsW, this.ebsH, "EBS"),
      this.drawLabel(
        this.burstBalanceX,
        this.burstBalanceY - this.fontSize,
        this.burstBalanceW,
        this.burstBalanceH,
        "burst",
      ),
      this.drawBox(
        ".burstBalance",
        this.burstBalanceX,
        this.burstBalanceY,
        this.burstBalanceW,
        this.burstBalanceH,
        "balance",
        0,
      ),
      this.drawBetweenLabel(
        ".requestedIOPS",
        this.widthChunk * 6.5,
        this.heightChunk * 7,
        "requested IOPS",
        "3000",
      ),
      this.drawBetweenLabel(
        ".currentIOPS",
        this.widthChunk * 13.5,
        this.heightChunk * 7,
        "actual IOPS",
        "3000",
      ),
      t
        .select(".burstBalanceFill")
        .attr("fill", this.lightBlue)
        .attr("x", this.burstBalanceX + this.strokeW)
        .attr("y", this.burstBalanceY + this.burstBalanceH)
        .attr("rx", this.radius - 2)
        .attr("ry", this.radius - 2)
        .attr("width", this.burstBalanceW - this.strokeW * 2)
        .attr("height", 0),
      t
        .select(".ioPath1")
        .attr(
          "d",
          `M ${this.widthChunk * 8} ${this.heightChunk * 10} L ${this.widthChunk * 2} ${this.heightChunk * 10}`,
        )
        .attr("stroke", this.textSecondary)
        .attr("stroke-width", this.strokeWThick)
        .attr("stroke-miterlimit", this.strokeWThick)
        .attr("stroke-dasharray", this.strokeWThick)
        .attr("stroke-dashoffset", 1),
      t
        .select(".ioPath2")
        .attr(
          "d",
          `M ${this.widthChunk * 18} ${this.heightChunk * 10} L ${this.widthChunk * 12} ${this.heightChunk * 10}`,
        )
        .attr("stroke", this.textSecondary)
        .attr("stroke-width", this.strokeWThick)
        .attr("stroke-miterlimit", this.strokeWThick)
        .attr("stroke-dasharray", this.strokeWThick)
        .attr("stroke-dashoffset", 1));
  }
  secondUpdater() {
    if (this.requestedIOPS < this.baseIOPS) {
      const i = this.baseIOPS - this.requestedIOPS;
      ((this.burstBalance = Math.min(
        this.burstBalance + i,
        this.maxBurstBalance,
      )),
        (this.currentIOPS = this.requestedIOPS));
    } else {
      const i = this.requestedIOPS - this.baseIOPS,
        s = Math.min(i, this.burstBalance);
      ((this.burstBalance = Math.max(this.burstBalance - i, 0)),
        (this.currentIOPS = this.baseIOPS + s));
    }
    const t = this.burstBalance / this.maxBurstBalance,
      e = Math.max(0, this.heightChunk * 12 * t - this.strokeW * 2);
    (this.svg
      .select(".burstBalanceFill")
      .transition()
      .ease(R)
      .duration(1e3)
      .attr("y", this.heightChunk * 16 - e - this.strokeW)
      .attr("height", e)
      .on("end", () => {
        this.isAnimating && this.secondUpdater();
      }),
      this.svg.select(".burstBalanceAmountLabel").text(this.burstBalance));
  }
  update() {
    ((this.requestedOffset = this.requestedOffset + this.requestedIOPS / 200),
      (this.requestedOffset = Math.floor(this.requestedOffset)),
      this.svg.selectAll(".ioPath1").interrupt(),
      this.svg
        .selectAll(".ioPath1")
        .transition()
        .ease(R)
        .duration(100)
        .attr("stroke-dashoffset", this.requestedOffset),
      (this.currentOffset = this.currentOffset + this.currentIOPS / 200),
      (this.currentOffset = Math.floor(this.currentOffset)),
      this.svg.selectAll(".ioPath2").interrupt(),
      this.svg
        .selectAll(".ioPath2")
        .transition()
        .ease(R)
        .duration(100)
        .attr("stroke-dashoffset", this.currentOffset)
        .on("end", () => {
          this.isAnimating && this.update();
        }),
      this.svg.select(".currentIOPSAmountLabel").text(this.currentIOPS),
      this.svg.select(".requestedIOPSAmountLabel").text(this.requestedIOPS));
  }
  addListener(t, e) {
    const i = this.dom.getElementsByClassName(t);
    i.length && i[0].addEventListener("input", e.bind(this), !1);
  }
  addSpeedSelector() {
    (this.menuDom.insertAdjacentHTML(
      "beforeend",
      `
         <span class="subMenu speedSelector">
          <div class="subMenuTitle">I/Os requests per second</div>
          <input class="iopsSlider slider" type="range" min="100" max="10000" value="3000" style="min-width:50px;width:250px;max-width:250px;">
          <div class="iopsDisplay">3000</div>
         </span>`,
    ),
      this.addListener("iopsSlider", function () {
        const e = this.dom.getElementsByClassName("iopsSlider")[0],
          i = this.dom.getElementsByClassName("iopsDisplay")[0];
        ((i.innerText = e.value), (this.requestedIOPS = e.value));
      }));
  }
}
class Q extends x {
  constructor(t, e = {}) {
    (super(),
      (this.width = 1e3),
      (this.height = 500),
      (this.options = e),
      (this.id = t),
      (this.dom = document.querySelector(`[data-id="${this.id}"]`)),
      this.initializeBaseElements(),
      (this.domSVG = this.dom.getElementsByClassName("ssdSVG")[0]),
      this.updateSizes(),
      this.updateColors(),
      (this.animationSpeed = this.options.speed ? this.options.speed : 1),
      this.initialize(),
      this.update());
  }
  initializeBaseElements() {
    const t = C(`[data-id="${this.id}"]`)
      .append("div")
      .attr("class", "interactivityContainer")
      .attr("id", "interactivityContainer")
      .style("width", "100%");
    this.options.hideMenu ||
      (t
        .append("div")
        .attr("class", "menu")
        .attr("id", "menu")
        .style("width", "100%"),
      (this.menuDom = this.dom.getElementsByClassName("menu")[0]));
    const e = t
      .append("div")
      .attr("class", "svgContainer")
      .style("margin-left", "auto")
      .style("margin-right", "auto")
      .style("width", "100%");
    this.svg = e
      .append("svg")
      .attr("class", "ssdSVG")
      .attr("id", "ssdSVGID")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .style("width", "100%")
      .style("height", "100%");
  }
  updateSizes() {
    ((this.widthChunk = this.width / 20),
      (this.heightChunk = this.height / 20),
      (this.serverW = this.widthChunk * 3),
      (this.serverH = this.heightChunk * 4),
      (this.primaryX = this.widthChunk * 10),
      (this.primaryY = this.heightChunk * 5),
      (this.replicas = []));
    const t = this.options.replicaCount;
    for (let e = 0; e < t; e++) {
      const i = {
        name: "replica" + e,
        x: (this.width / (t + 1)) * (e + 1),
        y: this.heightChunk * 15,
      };
      this.replicas.push(i);
    }
    ((this.strokeWThick = this.height / 50),
      (this.strokeW = this.height / 200),
      (this.fontSize = this.height / 20),
      (this.radius = this.height / 50));
  }
  initialize() {
    this.svg.append("g").attr("class", "Replication");
  }
  update() {
    (this.svg
      .select(".Replication")
      .selectAll(".replica")
      .data(this.replicas)
      .join(
        (t) => {
          let e = t.append("g").attr("class", "replica");
          return (
            e
              .append("path")
              .attr("class", "replicationPath")
              .attr(
                "d",
                (i) => `M ${this.primaryX} ${this.primaryY} L ${i.x} ${i.y}`,
              )
              .attr("stroke", this.textSecondary)
              .attr("stroke-width", this.strokeWThick)
              .attr("stroke-miterlimit", this.strokeWThick)
              .attr("stroke-dasharray", this.strokeWThick)
              .attr("stroke-dashoffset", 1)
              .append("animate")
              .attr("class", "replicationLine")
              .attr("attributeName", "stroke-dashoffset")
              .attr("values", "1000;0")
              .attr("dur", "60s")
              .attr("calcMode", "linear")
              .attr("repeatCount", "indefinite"),
            e
              .append("rect")
              .attr("class", "replicaServer")
              .attr("fill", this.gray)
              .attr("x", (i) => i.x - this.serverW / 2)
              .attr("y", (i) => i.y - this.serverH / 2)
              .attr("rx", this.radius)
              .attr("ry", this.radius)
              .attr("width", this.serverW)
              .attr("height", this.serverH),
            e
              .append("text")
              .attr("class", "label")
              .text("replica")
              .style("font-size", this.fontSize * 0.9 + "px")
              .style("font-weight", "bold")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("fill", this.white)
              .attr("x", (i) => i.x)
              .attr("y", (i) => i.y),
            e
          );
        },
        (t) => (
          t.select(".label").style("font-size", this.fontSize * 0.9 + "px"),
          t
            .select(".replicaServer")
            .attr("x", (e) => e.x - this.serverW / 2)
            .attr("y", (e) => e.y - this.serverH / 2)
            .attr("width", this.serverW)
            .attr("height", this.serverH),
          t
            .select(".label")
            .attr("x", (e) => e.x)
            .attr("y", (e) => e.y),
          t
            .select(".replicationPath")
            .attr("stroke", this.textSecondary)
            .attr("stroke-width", this.strokeWThick)
            .attr("stroke-miterlimit", this.strokeWThick)
            .attr("stroke-dasharray", this.strokeWThick)
            .attr("stroke-width", this.strokeWThick)
            .attr(
              "d",
              (e) => `M ${this.primaryX} ${this.primaryY} L ${e.x} ${e.y}`,
            ),
          t
        ),
        (t) => {
          t.remove();
        },
      ),
      this.svg
        .select(".Replication")
        .selectAll(".primary")
        .data(this.replicas)
        .join(
          (t) => {
            let e = t.append("g").attr("class", "primary");
            return (
              e
                .append("rect")
                .attr("class", "primaryServer")
                .attr("fill", this.gray)
                .attr("x", this.primaryX - this.serverW / 2)
                .attr("y", this.primaryY - this.serverH / 2)
                .attr("rx", this.radius)
                .attr("ry", this.radius)
                .attr("width", this.serverW)
                .attr("height", this.serverH),
              e
                .append("text")
                .attr("class", "primaryLabel")
                .text("primary")
                .style("font-size", this.fontSize * 0.9 + "px")
                .style("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", this.white)
                .attr("x", this.primaryX)
                .attr("y", this.primaryY),
              e
            );
          },
          (t) => (
            t
              .select(".primaryServer")
              .attr("x", this.primaryX - this.serverW / 2)
              .attr("y", this.primaryY - this.serverH / 2)
              .attr("width", this.serverW)
              .attr("height", this.serverH),
            t
              .select(".primaryLabel")
              .style("font-size", this.fontSize * 0.9 + "px")
              .attr("x", this.primaryX)
              .attr("y", this.primaryY),
            t
          ),
          (t) => {
            t.remove();
          },
        ));
  }
  addListener(t, e) {
    const i = this.dom.getElementsByClassName(t);
    i.length && i[0].addEventListener("input", e.bind(this), !1);
  }
  addSpeedSelector() {
    (this.menuDom.insertAdjacentHTML(
      "beforeend",
      `
         <span class="subMenu replicaCountSelector">
          <div class="subMenuTitle">Number of replicas</div>
          <input class="replicaCountSlider slider" type="range" min="1" max="5" value="2" style="min-width:50px;width:250px;max-width:250px;">
          <div class="replicaCountDisplay">2</div>
         </span>`,
    ),
      this.addListener("replicaCountSlider", function () {
        const e = this.dom.getElementsByClassName("replicaCountSlider")[0],
          i = this.dom.getElementsByClassName("replicaCountDisplay")[0];
        ((i.innerText = e.value),
          (this.options.replicaCount = parseFloat(e.value)),
          this.updateSizes(),
          this.update());
      }));
  }
}
function E() {
  const h = {
      ringCount: 4,
      rings: [
        {
          index: 4,
          data: [
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
          ],
        },
        {
          index: 3,
          data: [
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "",
            "",
            "X",
            "X",
            "X",
            "X",
          ],
        },
        {
          index: 2,
          data: ["X", "X", "X", "X", "X", "X", "X", "X", "", "", ""],
        },
        { index: 1, data: ["X", "X", "X", "X", "X", "X", "X"] },
      ],
    },
    t = [
      { type: "W", ring: 2, value: "NEW" },
      { type: "W", ring: 3, value: "NEW" },
      { type: "W", ring: 3, value: "NEW" },
      { type: "R", ring: 1, slot: 2 },
      { type: "R", ring: 4, slot: 1 },
      { type: "R", ring: 3, slot: 3 },
    ],
    e = {
      showIOQueue: !0,
      speed: 2,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    i = new w(h, "io-hdd-io-fast", t, e);
  (i.addSpeedSelector(),
    i.addIOQueueTimer(),
    i.update(),
    i.start(),
    i.updateHead(),
    i.updateHead(),
    i.updateIOQueue());
}
m('[data-id="io-hdd-io-fast"]').then((h) => E());
function A() {
  const h = {
      ringCount: 4,
      rings: [
        {
          index: 4,
          data: [
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
          ],
        },
        {
          index: 3,
          data: [
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "X",
            "",
            "",
            "X",
            "X",
            "X",
            "X",
          ],
        },
        {
          index: 2,
          data: ["X", "X", "X", "X", "X", "X", "X", "X", "", "", ""],
        },
        { index: 1, data: ["X", "X", "X", "X", "X", "X", "X"] },
      ],
    },
    t = [
      { type: "R", ring: 1, slot: 2 },
      { type: "W", ring: 3, value: "NEW" },
      { type: "R", ring: 4, slot: 1 },
      { type: "W", ring: 2, value: "NEW" },
      { type: "R", ring: 3, slot: 3 },
      { type: "W", ring: 3, value: "NEW" },
    ],
    e = {
      showIOQueue: !0,
      speed: 2,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    i = new w(h, "io-hdd-io-slow", t, e);
  (i.addSpeedSelector(),
    i.addIOQueueTimer(),
    i.update(),
    i.start(),
    i.updateHead(),
    i.updateHead(),
    i.updateIOQueue());
}
m('[data-id="io-hdd-io-slow"]').then((h) => A());
function H() {
  const h = {
      ringCount: 4,
      rings: [
        {
          index: 4,
          data: [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ],
        },
        {
          index: 3,
          data: [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ],
        },
        { index: 2, data: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { index: 1, data: ["", "", "", "", "", "", ""] },
      ],
    },
    t = {
      showIOQueue: !0,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-orange io-bg-orange",
    },
    e = new w(h, "io-hdd-read-write", [], t);
  (e.addSpeedSelector(),
    e.addWriteElement(),
    e.addReadElement(),
    e.update(),
    e.start(),
    e.updateHead(),
    e.updateHead(),
    e.updateIOQueue());
}
m('[data-id="io-hdd-read-write"]').then((h) => H());
function G() {
  const h = {
      ringCount: 4,
      rings: [
        {
          index: 4,
          data: [
            "",
            "d2",
            "d3",
            "",
            "d5",
            "d6",
            "d7",
            "",
            "",
            "d10",
            "d11",
            "d12",
            "d13",
            "d14",
            "",
            "d16",
            "d17",
            "d18",
            "",
            "d20",
            "d21",
            "d22",
            "d23",
          ],
        },
        {
          index: 3,
          data: [
            "c1",
            "c2",
            "",
            "c4",
            "c5",
            "c6",
            "c7",
            "c8",
            "c9",
            "c10",
            "c11",
            "c12",
            "c13",
            "",
            "c15",
            "c16",
            "c17",
          ],
        },
        {
          index: 2,
          data: [
            "b1",
            "b2",
            "b3",
            "",
            "b5",
            "b6",
            "",
            "b8",
            "b9",
            "b10",
            "b11",
            "b12",
          ],
        },
        { index: 1, data: ["a1", "a2", "a3", "a4", "", "", "a7"] },
      ],
    },
    t = {
      randomReads: !0,
      showIOQueue: !1,
      hideMenu: !0,
      speed: 0.75,
      labels: !0,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-orange io-bg-orange",
    },
    e = new w(h, "io-hdd", [], t);
  (e.update(), e.start(), e.updateHead(), e.updateHead(), e.updateIOQueue());
}
m('[data-id="io-hdd"]').then((h) => G());
function z() {
  new X("io-iops").addSpeedSelector();
}
m('[data-id="io-iops"]').then((h) => z());
function V() {
  const h = new I("io-latency-hdd-ssd", {
    latencies: [
      { label: "HDD (2ms)", color: "var(--text-red)", durationNS: 2e6 },
      { label: "SSD (16μs)", color: "var(--text-blue)", durationNS: 16e3 },
    ],
    minSlow: 500,
    maxSlow: 5e4,
  });
  (h.addSpeedSelector(), h.start());
}
m('[data-id="io-latency-hdd-ssd"]').then((h) => V());
function Y() {
  new I("io-latency-local-ebs-pd", {
    latencies: [
      {
        label: "Local NVMe (~20μs)",
        color: "var(--text-green)",
        durationNS: 2e4,
      },
      {
        label: "EBS io2 BX (~400μs)",
        color: "var(--text-blue)",
        durationNS: 4e5,
      },
      { label: "EBS gp3 (~1ms)", color: "var(--text-purple)", durationNS: 1e6 },
      {
        label: "pd-balanced (~1ms)",
        color: "var(--text-red)",
        durationNS: 1e6,
      },
    ],
    minSlow: 100,
    maxSlow: 75e3,
    hideMenu: !0,
  }).start();
}
m('[data-id="io-latency-local-ebs-pd"]').then((h) => Y());
function N() {
  const h = new I("io-latency-local-ssd-network-ssd", {
    latencies: [
      { label: "local SSD (50μs)", color: "var(--text-blue)", durationNS: 5e4 },
      {
        label: "network SSD (250μs)",
        color: "var(--text-orange)",
        durationNS: 25e4,
      },
    ],
    minSlow: 1e3,
    maxSlow: 5e4,
  });
  (h.addSpeedSelector(), h.start());
}
m('[data-id="io-latency-local-ssd-network-ssd"]').then((h) => N());
function F() {
  const h = new I("io-latency-memory-local-ssd", {
    latencies: [
      { label: "memory (100ns)", color: "var(--text-green)", durationNS: 100 },
      { label: "local SSD (50μs)", color: "var(--text-blue)", durationNS: 5e4 },
    ],
    minSlow: 1e5,
    maxSlow: 1e7,
  });
  (h.addSpeedSelector(), h.start());
}
m('[data-id="io-latency-memory-local-ssd"]').then((h) => F());
function q() {
  const h = new I("io-latency-tape-hdd", {
    latencies: [
      { label: "tape (1s)", color: "var(--text-purple)", durationNS: 1e9 },
      { label: "local HDD (2ms)", color: "var(--text-red)", durationNS: 2e6 },
    ],
    minSlow: 1,
    maxSlow: 500,
  });
  (h.addSpeedSelector(), h.start());
}
m('[data-id="io-latency-tape-hdd"]').then((h) => q());
function j() {
  const h = { replicaCount: 2 };
  new Q("io-replication", h).addSpeedSelector();
}
m('[data-id="io-replication"]').then((h) => j());
function J() {
  const h = [
    { data: " ", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: "A", dirty: !1 },
    { data: "B", dirty: !1 },
    { data: "C", dirty: !0 },
    { data: "D", dirty: !0 },
    { data: "E", dirty: !1 },
    { data: "F", dirty: !0 },
    { data: "G", dirty: !1 },
    { data: "H", dirty: !0 },
    { data: "I", dirty: !1 },
    { data: "J", dirty: !1 },
    { data: "K", dirty: !1 },
    { data: "L", dirty: !1 },
    { data: "M", dirty: !0 },
    { data: "N", dirty: !1 },
    { data: "O", dirty: !1 },
    { data: "P", dirty: !1 },
    { data: "Q", dirty: !1 },
    { data: "R", dirty: !1 },
    { data: "S", dirty: !1 },
    { data: "T", dirty: !1 },
    { data: "U", dirty: !1 },
    { data: "V", dirty: !1 },
    { data: "W", dirty: !1 },
    { data: "X", dirty: !1 },
    { data: "Y", dirty: !1 },
    { data: "Z", dirty: !1 },
  ];
  let t = [
    { type: "W", page: 0, value: "D1" },
    { type: "W", page: 1, value: "D2" },
    { type: "W", page: 2, value: "D3" },
    { type: "W", page: 3, value: "D4" },
    { type: "W", page: 4, value: "D5" },
  ];
  const e = {
      hideMenu: !1,
      labels: !1,
      superQueue: !0,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    i = new S(4, 2, 4, 100, 1e3, h),
    s = new v(i, "io-ssd-gc-fast", t, e);
  (s.addSpeedSelector(), s.addIOQueueTimer(), s.updateAll(), s.updateIOQueue());
}
m('[data-id="io-ssd-gc-fast"]').then((h) => J());
function U() {
  const h = [
    { data: "A", dirty: !1 },
    { data: "B", dirty: !0 },
    { data: "C", dirty: !0 },
    { data: "D", dirty: !0 },
    { data: "E", dirty: !1 },
    { data: "F", dirty: !0 },
    { data: "G", dirty: !0 },
    { data: "H", dirty: !0 },
    { data: "I", dirty: !1 },
    { data: "J", dirty: !1 },
    { data: "K", dirty: !1 },
    { data: "L", dirty: !1 },
    { data: "M", dirty: !1 },
    { data: "N", dirty: !1 },
    { data: "O", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: "P", dirty: !1 },
    { data: "Q", dirty: !1 },
    { data: "R", dirty: !1 },
    { data: "S", dirty: !1 },
    { data: "T", dirty: !1 },
    { data: " ", dirty: !1 },
    { data: "U", dirty: !1 },
    { data: "V", dirty: !1 },
    { data: "W", dirty: !1 },
    { data: "X", dirty: !1 },
    { data: "Y", dirty: !1 },
    { data: "Z", dirty: !1 },
    { data: "@", dirty: !1 },
    { data: "#", dirty: !1 },
    { data: "$", dirty: !1 },
    { data: "%", dirty: !1 },
  ];
  let t = [
    { type: "R", page: 0 },
    { type: "W", page: 15, value: "A" },
    { type: "D", page: 0 },
    { type: "E", page: 0 },
    { type: "R", page: 4 },
    { type: "W", page: 21, value: "E" },
    { type: "D", page: 4 },
    { type: "E", page: 4 },
    { type: "W", page: 0, value: "D1" },
    { type: "W", page: 1, value: "D2" },
    { type: "W", page: 2, value: "D3" },
    { type: "W", page: 3, value: "D4" },
    { type: "W", page: 4, value: "D5" },
  ];
  const e = {
      hideMenu: !1,
      labels: !1,
      superQueue: !0,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    i = new S(4, 2, 4, 100, 1e3, h),
    s = new v(i, "io-ssd-gc-slow", t, e);
  (s.addSpeedSelector(), s.addIOQueueTimer(), s.updateAll(), s.updateIOQueue());
}
m('[data-id="io-ssd-gc-slow"]').then((h) => U());
function Z() {
  const h = [
      { type: "W", page: 0, value: "A" },
      { type: "W", page: 10, value: "B" },
      { type: "W", page: 20, value: "C" },
      { type: "W", page: 30, value: "D" },
      { type: "W", page: 1, value: "E" },
      { type: "W", page: 11, value: "F" },
      { type: "W", page: 21, value: "G" },
      { type: "W", page: 31, value: "H" },
    ],
    t = {
      hideMenu: !1,
      labels: !1,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    e = new S(4, 2, 5, 100, 1e3),
    i = new v(e, "io-ssd-lines-fast", h, t);
  (i.addSpeedSelector(), i.addIOQueueTimer(), i.updateAll(), i.updateIOQueue());
}
m('[data-id="io-ssd-lines-fast"]').then((h) => Z());
function K() {
  const h = [
      { type: "W", page: 0, value: "A" },
      { type: "W", page: 1, value: "B" },
      { type: "W", page: 2, value: "C" },
      { type: "W", page: 3, value: "D" },
      { type: "W", page: 4, value: "E" },
      { type: "W", page: 5, value: "F" },
      { type: "W", page: 6, value: "G" },
      { type: "W", page: 7, value: "H" },
    ],
    t = {
      hideMenu: !1,
      labels: !1,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-gray io-bg-gray",
    },
    e = new S(4, 2, 5, 100, 1e3),
    i = new v(e, "io-ssd-lines-slow", h, t);
  (i.addSpeedSelector(), i.addIOQueueTimer(), i.updateAll(), i.updateIOQueue());
}
m('[data-id="io-ssd-lines-slow"]').then((h) => K());
function _() {
  const h = {
      randomReadWrite: !0,
      showIOQueue: !1,
      hideMenu: !0,
      speed: 0.75,
      labels: !0,
    },
    t = new S(6, 3, 3, 100, 1e3),
    e = new v(t, "io-ssd", [], h);
  (e.updateAll(), e.startIOs());
}
m('[data-id="io-ssd"]').then((h) => _());
function tt() {
  const h = [];
  for (let a = 0; a < 50; a++) a < 5 ? h.push("p" + a) : h.push("");
  const t = [
      { type: "R", page: 1 },
      { type: "R", page: 2 },
      { type: "R", page: 3 },
      { type: "R", page: 4 },
      { type: "W", value: 10 },
      { type: "W", value: 20 },
      { type: "W", value: 30 },
      { type: "W", value: 40 },
    ],
    e = {
      randomReads: !1,
      showIOQueue: !0,
      hideMenu: !1,
      speed: 1,
      timerClasses: "io-text-purple io-bg-purple",
      speedClasses: "io-text-orange io-bg-orange",
    },
    i = new B(h),
    s = new P(i, "io-tape-fast", t, e);
  (s.addIOQueueTimer(),
    s.moveToPage(0),
    s.update(),
    s.updateIOQueue(),
    s.moveToPage(0));
}
m('[data-id="io-tape-fast"]').then((h) => tt());
function et() {
  const h = [];
  for (let s = 0; s < 50; s++) s < 10 ? h.push("p" + s) : h.push("");
  const t = {
      randomReads: !1,
      showIOQueue: !0,
      hideMenu: !1,
      speed: 1,
      timerClasses: "io-text-purple io-bg-purple",
      writeClasses: "io-text-green io-bg-green",
      readClasses: "io-text-blue io-bg-blue",
      speedClasses: "io-text-orange io-bg-orange",
    },
    e = new B(h, []),
    i = new P(e, "io-tape-read-write", [], t);
  (i.addSpeedSelector(),
    i.addWriteElement(),
    i.addReadElement(),
    i.moveToPage(0),
    i.update(),
    i.updateIOQueue(),
    i.moveToPage(0));
}
m('[data-id="io-tape-read-write"]').then((h) => et());
function it() {
  const h = [];
  for (let a = 0; a < 50; a++) a % 4 != 0 ? h.push("p" + a) : h.push("");
  const t = [
      { type: "R", page: 10 },
      { type: "W", value: 10 },
      { type: "R", page: 41 },
      { type: "W", value: 20 },
      { type: "R", page: 21 },
      { type: "W", value: 30 },
      { type: "R", page: 43 },
      { type: "W", value: 40 },
    ],
    e = {
      randomReads: !1,
      showIOQueue: !0,
      hideMenu: !1,
      speed: 1,
      timerClasses: "io-text-purple io-bg-purple",
    },
    i = new B(h),
    s = new P(i, "io-tape-slow", t, e);
  (s.addIOQueueTimer(),
    s.moveToPage(0),
    s.update(),
    s.updateIOQueue(),
    s.moveToPage(0));
}
m('[data-id="io-tape-slow"]').then((h) => it());
function st() {
  const h = [];
  for (let s = 0; s < 50; s++) h.push("p" + s);
  const t = {
      randomReads: !0,
      showIOQueue: !1,
      hideMenu: !0,
      speed: 0.75,
      labels: !0,
    },
    e = new B(h, []),
    i = new P(e, "io-tape", [], t);
  (i.moveToPage(0), i.update(), i.updateIOQueue(), i.moveToPage(0));
}
m('[data-id="io-tape"]').then((h) => st());
