var V = Object.defineProperty;
var Q = (u, t, e) =>
  t in u
    ? V(u, t, { enumerable: !0, configurable: !0, writable: !0, value: e })
    : (u[t] = e);
var H = (u, t, e) => Q(u, typeof t != "symbol" ? t + "" : t, e);
import "./modulepreload-polyfill-B5Qt9EMX.js";
import { g as X } from "./index-Brfk6Bdo.js";
class Y {
  constructor() {
    this.colors = [
      "#E06666",
      "#6FA8DC",
      "#7CCC9C",
      "#E6C74C",
      "#B694E8",
      "#E87F5A",
      "#5CC6B6",
      "#DB9B9B",
      "#919392",
      "#8BB675",
      "#7298A8",
      "#B16A76",
    ];
  }
  getColors() {
    return this.colors;
  }
  getColor(t) {
    return this.colors[t % this.colors.length];
  }
  getRandomColor() {
    const t = Math.floor(Math.random() * this.colors.length);
    return this.colors[t];
  }
  getColorRange(t, e = 0) {
    const s = [];
    for (let i = 0; i < t; i++) s.push(this.getColor(e + i));
    return s;
  }
}
const I = new Y();
function K() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
function _() {
  const u = K();
  return {
    text: u ? "#ffffff" : "#000000",
    background: u ? "#2a2a2a" : "#f5f5f5",
    backgroundDark: u ? "#1a1a1a" : "#e0e0e0",
    border: u ? "#404040" : "#cccccc",
    accent: u ? "#4a9eff" : "#0066cc",
    accentHover: u ? "#6bb5ff" : "#0052cc",
    success: u ? "#4caf50" : "#2e7d32",
    error: u ? "#f44336" : "#d32f2f",
    warning: u ? "#ff9800" : "#ed6c02",
    canvasText: u ? "#ffffff" : "#000000",
    canvasBackground: "transparent",
    canvasGrid: u ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    componentBackground: u ? "#333" : "#d8d8d8",
    componentBorder: u ? "#555555" : "#cccccc",
    componentText: u ? "#ffffff" : "#333333",
    componentHighlight: u ? "#444444" : "#e0e0e0",
  };
}
function M(u) {
  if (window.matchMedia) {
    const t = window.matchMedia("(prefers-color-scheme: dark)");
    (u(t.matches),
      t.addEventListener("change", (e) => {
        u(e.matches);
      }));
  }
}
function J(u, t, e) {
  u.clearRect(0, 0, t, e);
}
class z {
  constructor(
    t,
    e = 5,
    s = 6,
    i = [{ rows: 2, cols: 3, label: "Cache" }],
    n = "Requester",
    a = "Database",
    o = "random",
    l = "manual",
    c = !1,
    h = 1e3,
  ) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.config = {
      databaseRows: e,
      databaseCols: s,
      cacheLayers: Array.isArray(i)
        ? i
        : [{ rows: 2, cols: 3, label: "Cache" }],
      requesterLabel: n,
      databaseLabel: a,
      mode: o.toLowerCase() === "recency" ? "recency" : "random",
      automation: this.validateAutomationMode(l),
      prewarmCache: !!c,
      automationInterval: h || 1e3,
    }),
      (this.paletteColors = I.getColors()),
      (this.BASE_CELL_SIZE = 40),
      (this.BASE_REQUEST_SIZE = 20),
      (this.BASE_MARGIN = 16),
      (this.CELL_SIZE = this.BASE_CELL_SIZE),
      (this.REQUEST_SIZE = this.BASE_REQUEST_SIZE),
      (this.MARGIN = this.BASE_MARGIN),
      (this.caches = []),
      (this.cacheOrders = []),
      (this.roundRobinIndices = []),
      (this.databaseColors = []),
      (this.databaseRecency = []),
      (this.databaseNumbers = []),
      (this.activeRequests = []),
      (this.nextRequestId = 1),
      (this.stats = { cacheHits: 0, cacheMisses: 0 }),
      (this.events = new EventTarget()),
      (this.elements = { cacheLayers: [] }),
      (this.isAutoRequestActive = !1),
      (this.autoRequestTimeout = null),
      (this.postgresMode = !1),
      this.updateThemeColors(),
      this.initialize());
  }
  validateAutomationMode(t) {
    const e = ["manual", "automatic", "automatic-hit", "automatic-miss"],
      s = t.toLowerCase();
    return e.includes(s) ? s : "manual";
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    if (!this.containerElement) return;
    const t = this.themeColors;
    if (
      (this.elements.mainContainer &&
        (this.elements.mainContainer.style.color = t.text),
      this.elements.requester &&
        (this.elements.requester.style.backgroundColor = t.componentBackground),
      this.elements.cacheLayers.forEach((i) => {
        i.cache && (i.cache.style.backgroundColor = t.componentBackground);
      }),
      this.elements.database &&
        (this.elements.database.style.backgroundColor = t.componentBackground),
      this.containerElement
        .querySelectorAll('[style*="color"]')
        .forEach((i) => {
          i.style.color &&
            i.style.color !== "white" &&
            (i.style.color = t.text);
        }),
      this.containerElement
        .querySelectorAll('[style*="border"]')
        .forEach((i) => {
          i.style.border &&
            i.style.border.includes("cbd5e0") &&
            (i.style.border = `1px solid ${t.componentBorder}`);
        }),
      this.config.mode === "recency" && this.elements.legendContainer)
    ) {
      const i = this.elements.legendContainer.querySelector("div:nth-child(2)"),
        n = this.elements.legendContainer.querySelector("div:nth-child(3)");
      (i && (i.style.color = "white"), n && (n.style.color = "white"));
    }
    (this.renderCaches(), this.renderDatabaseGrid());
  }
  updateSizesForScreenWidth() {
    const t = window.innerWidth,
      e = t < 640 ? 0.7 : 1;
    ((this.CELL_SIZE = Math.floor(this.BASE_CELL_SIZE * e)),
      (this.REQUEST_SIZE = Math.floor(this.BASE_REQUEST_SIZE * e)),
      (this.MARGIN = Math.floor(this.BASE_MARGIN * e)),
      (this.SCALE_FACTOR = e),
      (this.BASE_LABEL_FONT_SIZE = t < 640 ? 17 : 19));
  }
  initialize() {
    (this.updateSizesForScreenWidth(),
      this.createAnimationStyles(),
      this.createDOMStructure(),
      this.applyStyles(),
      this.generateDatabaseColors(),
      this.initializeCaches(),
      this.config.prewarmCache && this.prewarmCaches(),
      this.renderCaches(),
      this.renderDatabaseGrid(),
      this.updateContainerSizes(),
      this.addEventListeners(),
      this.setupThemeListener(),
      this.config.automation !== "manual" && this.startAutoRequests());
  }
  createAnimationStyles() {
    const t = `caching-animation-styles-${Math.random().toString(36).substr(2, 9)}`;
    let e = document.getElementById(t);
    if (!e) {
      ((e = document.createElement("style")), (e.id = t));
      const s = `
                /* Force all animated elements onto compositing layers for Safari */
                .appear, .disappear, .pulse, .move,
                .request-circle, .cache-data, .db-data, 
                .cache-clone, .requester-data {
                    will-change: transform, opacity;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    -webkit-perspective: 1000px;
                    perspective: 1000px;
                }
                
                /* Keep parent containers on compositing layers too */
                .visualization, .visualizationInner {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                @keyframes appear {
                    0% { transform: translateZ(0) scale(0); opacity: 0; }
                    100% { transform: translateZ(0) scale(1); opacity: 1; }
                }
                
                @keyframes disappear {
                    0% { transform: translateZ(0) scale(1); opacity: 1; }
                    100% { transform: translateZ(0) scale(0); opacity: 0; }
                }
                
                @keyframes pulse {
                    0% { transform: translateZ(0) scale(1); }
                    50% { transform: translateZ(0) scale(0.8); }
                    100% { transform: translateZ(0) scale(1); }
                }
                
                @keyframes hitTextAnimation {
                    0% { transform: translateZ(0) translateX(0); opacity: 0; }
                    20% { transform: translateZ(0) translateX(0); opacity: 1; }
                    80% { transform: translateZ(0) translateX(40px); opacity: 0.7; }
                    100% { transform: translateZ(0) translateX(60px); opacity: 0; }
                }
                
                .appear { animation: appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .disappear { animation: disappear 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
                .pulse { animation: pulse 1s ease-in-out; }
                .move { transition: left 0.8s ease-in-out, top 0.8s ease-in-out; }
                .hit-text { animation: hitTextAnimation 1s ease-out forwards; }
            `;
      ((e.textContent = s), document.head.appendChild(e));
    }
  }
  createDOMStructure() {
    if (
      ((this.containerElement.innerHTML = ""),
      (this.elements.mainContainer = document.createElement("div")),
      this.containerElement.appendChild(this.elements.mainContainer),
      (this.elements.visualization = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.visualization),
      (this.elements.visualizationInner = document.createElement("div")),
      this.elements.visualization.appendChild(this.elements.visualizationInner),
      (this.elements.requesterContainer = document.createElement("div")),
      this.elements.visualizationInner.appendChild(
        this.elements.requesterContainer,
      ),
      (this.elements.requester = document.createElement("div")),
      this.elements.requesterContainer.appendChild(this.elements.requester),
      (this.elements.requesterLabel = document.createElement("div")),
      (this.elements.requesterLabel.textContent = this.config.requesterLabel),
      this.elements.requester.appendChild(this.elements.requesterLabel),
      Array.isArray(this.config.cacheLayers))
    )
      for (let t = 0; t < this.config.cacheLayers.length; t++) {
        const e = this.config.cacheLayers[t],
          s = document.createElement("div");
        this.elements.visualizationInner.appendChild(s);
        const i = document.createElement("div");
        s.appendChild(i);
        const n = document.createElement("div");
        i.appendChild(n);
        const a = document.createElement("div");
        ((a.textContent = e.label),
          s.appendChild(a),
          this.elements.cacheLayers.push({
            container: s,
            cache: i,
            grid: n,
            label: a,
          }));
      }
    if (
      ((this.elements.databaseContainer = document.createElement("div")),
      this.elements.visualizationInner.appendChild(
        this.elements.databaseContainer,
      ),
      (this.elements.database = document.createElement("div")),
      this.elements.databaseContainer.appendChild(this.elements.database),
      (this.elements.databaseGrid = document.createElement("div")),
      this.elements.database.appendChild(this.elements.databaseGrid),
      (this.elements.databaseLabel = document.createElement("div")),
      (this.elements.databaseLabel.textContent = this.config.databaseLabel),
      this.elements.databaseContainer.appendChild(this.elements.databaseLabel),
      this.createPostgresModeToggle(),
      this.config.mode === "recency")
    ) {
      const t = document.createElement("div");
      ((t.style.display = "flex"),
        (t.style.position = "relative"),
        (t.style.width = "100%"),
        (t.style.marginTop = "15px"),
        (t.style.marginBottom = "0"),
        (t.style.width = "100%"),
        (t.style.margin = "15px auto 0 auto"));
      const e = document.createElement("div");
      ((e.style.width = "100%"),
        (e.style.height = `${24 * (this.SCALE_FACTOR || 1)}px`),
        (e.style.background = "linear-gradient(to right, #FF0000, #0000FF)"),
        (e.style.borderRadius = "0"));
      const s = document.createElement("div");
      ((s.textContent = "NEWER"),
        (s.style.position = "absolute"),
        (s.style.left = "10px"),
        (s.style.top = "50%"),
        (s.style.transform = "translateY(-50%)"),
        (s.style.color = "white"),
        (s.style.fontWeight = "bold"));
      const i = window.innerWidth < 640 ? 14 : 13;
      ((s.style.fontSize = `${i * (this.SCALE_FACTOR || 1)}px`),
        (s.style.fontFamily = "monospace"),
        (s.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)"),
        (s.style.zIndex = "1"),
        (s.style.userSelect = "none"),
        (s.style.pointerEvents = "none"));
      const n = document.createElement("div");
      ((n.textContent = "OLDER"),
        (n.style.position = "absolute"),
        (n.style.right = "10px"),
        (n.style.top = "50%"),
        (n.style.transform = "translateY(-50%)"),
        (n.style.color = "white"),
        (n.style.fontWeight = "bold"),
        (n.style.fontSize = `${i * (this.SCALE_FACTOR || 1)}px`),
        (n.style.fontFamily = "monospace"),
        (n.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)"),
        (n.style.zIndex = "1"),
        (n.style.userSelect = "none"),
        (n.style.pointerEvents = "none"),
        t.appendChild(e),
        t.appendChild(s),
        t.appendChild(n),
        this.elements.mainContainer.appendChild(t),
        (this.elements.legendContainer = t));
    }
    this.createStatsElements();
  }
  createPostgresModeToggle() {
    const t = () => {
      const e = top.document.querySelector('iframe[src$="#postgres-toggle"]');
      if (!e || !e.contentWindow) {
        setTimeout(t, 100);
        return;
      }
      const s = e.contentWindow.document.getElementById("caching-pg-toggle");
      if (!s) {
        setTimeout(t, 100);
        return;
      }
      new MutationObserver((n) => {
        n.forEach((a) => {
          if (a.type === "childList" || a.type === "characterData") {
            const o = s.innerHTML == "true";
            ((this.postgresMode = o),
              this.renderCaches(),
              this.renderDatabaseGrid());
          }
        });
      }).observe(s, { childList: !0, subtree: !0, characterData: !0 });
    };
    t();
  }
  createPostgresSVG(t) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (e.setAttribute("width", "432.071pt"),
      e.setAttribute("height", "445.383pt"),
      e.setAttribute("viewBox", "0 0 432.071 445.383"),
      e.setAttribute("xml:space", "preserve"),
      (e.style.width = `${this.CELL_SIZE * 0.88}px`),
      (e.style.height = `${this.CELL_SIZE * 0.88}px`));
    const s = `
        <g id="orginal" style="fill-rule:nonzero;clip-rule:nonzero;stroke:#000000;stroke-miterlimit:4;">
        </g>
        <g id="Layer_x0020_3" style="fill-rule:nonzero;clip-rule:nonzero;fill:none;stroke:#FFFFFF;stroke-width:12.4651;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;">
        <path style="fill:#000000;stroke:#000000;stroke-width:37.3953;stroke-linecap:butt;stroke-linejoin:miter;" d="M323.205,324.227c2.833-23.601,1.984-27.062,19.563-23.239l4.463,0.392c13.517,0.615,31.199-2.174,41.587-7c22.362-10.376,35.622-27.7,13.572-23.148c-50.297,10.376-53.755-6.655-53.755-6.655c53.111-78.803,75.313-178.836,56.149-203.322    C352.514-5.534,262.036,26.049,260.522,26.869l-0.482,0.089c-9.938-2.062-21.06-3.294-33.554-3.496c-22.761-0.374-40.032,5.967-53.133,15.904c0,0-161.408-66.498-153.899,83.628c1.597,31.936,45.777,241.655,98.47,178.31    c19.259-23.163,37.871-42.748,37.871-42.748c9.242,6.14,20.307,9.272,31.912,8.147l0.897-0.765c-0.281,2.876-0.157,5.689,0.359,9.019c-13.572,15.167-9.584,17.83-36.723,23.416c-27.457,5.659-11.326,15.734-0.797,18.367c12.768,3.193,42.305,7.716,62.268-20.224    l-0.795,3.188c5.325,4.26,4.965,30.619,5.72,49.452c0.756,18.834,2.017,36.409,5.856,46.771c3.839,10.36,8.369,37.05,44.036,29.406c29.809-6.388,52.6-15.582,54.677-101.107"/>
        <path style="fill:${t};stroke:none;" d="M402.395,271.23c-50.302,10.376-53.76-6.655-53.76-6.655c53.111-78.808,75.313-178.843,56.153-203.326c-52.27-66.785-142.752-35.2-144.262-34.38l-0.486,0.087c-9.938-2.063-21.06-3.292-33.56-3.496c-22.761-0.373-40.026,5.967-53.127,15.902    c0,0-161.411-66.495-153.904,83.63c1.597,31.938,45.776,241.657,98.471,178.312c19.26-23.163,37.869-42.748,37.869-42.748c9.243,6.14,20.308,9.272,31.908,8.147l0.901-0.765c-0.28,2.876-0.152,5.689,0.361,9.019c-13.575,15.167-9.586,17.83-36.723,23.416    c-27.459,5.659-11.328,15.734-0.796,18.367c12.768,3.193,42.307,7.716,62.266-20.224l-0.796,3.188c5.319,4.26,9.054,27.711,8.428,48.969c-0.626,21.259-1.044,35.854,3.147,47.254c4.191,11.4,8.368,37.05,44.042,29.406c29.809-6.388,45.256-22.942,47.405-50.555c1.525-19.631,4.976-16.729,5.194-34.28l2.768-8.309c3.192-26.611,0.507-35.196,18.872-31.203l4.463,0.392c13.517,0.615,31.208-2.174,41.591-7c22.358-10.376,35.618-27.7,13.573-23.148z"/>
        <path d="M215.866,286.484c-1.385,49.516,0.348,99.377,5.193,111.495c4.848,12.118,15.223,35.688,50.9,28.045c29.806-6.39,40.651-18.756,45.357-46.051c3.466-20.082,10.148-75.854,11.005-87.281"/>
        <path d="M173.104,38.256c0,0-161.521-66.016-154.012,84.109c1.597,31.938,45.779,241.664,98.473,178.316c19.256-23.166,36.671-41.335,36.671-41.335"/>
        <path d="M260.349,26.207c-5.591,1.753,89.848-34.889,144.087,34.417c19.159,24.484-3.043,124.519-56.153,203.329"/>
        <path style="stroke-linejoin:bevel;" d="M348.282,263.953c0,0,3.461,17.036,53.764,6.653c22.04-4.552,8.776,12.774-13.577,23.155c-18.345,8.514-59.474,10.696-60.146-1.069c-1.729-30.355,21.647-21.133,19.96-28.739c-1.525-6.85-11.979-13.573-18.894-30.338    c-6.037-14.633-82.796-126.849,21.287-110.183c3.813-0.789-27.146-99.002-124.553-100.599c-97.385-1.597-94.19,119.762-94.19,119.762"/>
        <path d="M188.604,274.334c-13.577,15.166-9.584,17.829-36.723,23.417c-27.459,5.66-11.326,15.733-0.797,18.365c12.768,3.195,42.307,7.718,62.266-20.229c6.078-8.509-0.036-22.086-8.385-25.547c-4.034-1.671-9.428-3.765-16.361,3.994z"/>
        <path d="M187.715,274.069c-1.368-8.917,2.93-19.528,7.536-31.942c6.922-18.626,22.893-37.255,10.117-96.339c-9.523-44.029-73.396-9.163-73.436-3.193c-0.039,5.968,2.889,30.26-1.067,58.548c-5.162,36.913,23.488,68.132,56.479,64.938"/>
        <path style="fill:#FFFFFF;stroke-width:4.155;stroke-linecap:butt;stroke-linejoin:miter;" d="M172.517,141.7c-0.288,2.039,3.733,7.48,8.976,8.207c5.234,0.73,9.714-3.522,9.998-5.559c0.284-2.039-3.732-4.285-8.977-5.015c-5.237-0.731-9.719,0.333-9.996,2.367z"/>
        <path style="fill:#FFFFFF;stroke-width:2.0775;stroke-linecap:butt;stroke-linejoin:miter;" d="M331.941,137.543c0.284,2.039-3.732,7.48-8.976,8.207c-5.238,0.73-9.718-3.522-10.005-5.559c-0.277-2.039,3.74-4.285,8.979-5.015c5.239-0.73,9.718,0.333,10.002,2.368z"/>
        <path d="M350.676,123.432c0.863,15.994-3.445,26.888-3.988,43.914c-0.804,24.748,11.799,53.074-7.191,81.435"/>
        <path style="stroke-width:3;" d="M0,60.232"/>
        </g>`;
    return ((e.innerHTML = s), e);
  }
  createStatsElements() {
    const t = this.containerElement.dataset.id,
      e = document.createElement("div");
    ((e.style.display = "none"), (e.id = `${t}-stats-data`));
    const s = document.createElement("div");
    ((s.id = `${t}-hits`), (s.textContent = "0"));
    const i = document.createElement("div");
    ((i.id = `${t}-misses`), (i.textContent = "0"));
    const n = document.createElement("div");
    ((n.id = `${t}-requests`),
      (n.textContent = "0"),
      e.appendChild(s),
      e.appendChild(i),
      e.appendChild(n),
      this.containerElement.appendChild(e),
      (this.elements.statsHits = s),
      (this.elements.statsMisses = i),
      (this.elements.statsRequests = n));
  }
  applyStyles() {
    (this.setStyles(this.containerElement, {
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
    }),
      this.setStyles(this.elements.mainContainer, {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0",
        color: this.themeColors.text,
        backgroundColor: "transparent",
      }),
      this.setStyles(this.elements.visualization, {
        position: "relative",
        width: "100%",
        marginBottom: "0",
        overflow: "visible",
      }),
      this.setStyles(this.elements.visualizationInner, {
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        height: `${420 * (this.SCALE_FACTOR || 1)}px`,
        padding: "0",
      }),
      this.setStyles(this.elements.requesterContainer, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
      this.setStyles(this.elements.requester, {
        backgroundColor: this.themeColors.componentBackground,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s",
        position: "relative",
        userSelect: "none",
        webkitUserSelect: "none",
        mozUserSelect: "none",
        msUserSelect: "none",
      }),
      this.setStyles(this.elements.requesterLabel, {
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)",
        position: "absolute",
        color: this.themeColors.text,
        textAlign: "center",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        userSelect: "none",
        pointerEvents: "none",
      }));
    for (let s = 0; s < this.elements.cacheLayers.length; s++) {
      const i = this.elements.cacheLayers[s];
      (this.setStyles(i.container, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
        this.setStyles(i.cache, {
          backgroundColor: this.themeColors.componentBackground,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          marginBottom: "0",
        }));
      const n = this.config.cacheLayers[s],
        a = n.label && n.label.trim() !== "";
      (this.setStyles(i.label, {
        textAlign: "center",
        marginTop: a ? "5px" : "0",
        color: this.themeColors.text,
        width: "100%",
        display: a ? "block" : "none",
        padding: a ? "5px 0" : "0",
        height: a ? "25px" : "0",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        userSelect: "none",
        pointerEvents: "none",
      }),
        this.setStyles(i.grid, {
          display: "grid",
          width: "fit-content",
          height: "fit-content",
          margin: "0 auto",
        }));
    }
    (this.setStyles(this.elements.databaseContainer, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }),
      this.setStyles(this.elements.database, {
        backgroundColor: this.themeColors.componentBackground,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        marginBottom: "0",
      }));
    const t =
      this.config.databaseLabel && this.config.databaseLabel.trim() !== "";
    (this.setStyles(this.elements.databaseLabel, {
      textAlign: "center",
      marginTop: t ? "5px" : "0",
      color: this.themeColors.text,
      width: "100%",
      display: t ? "block" : "none",
      padding: t ? "5px 0" : "0",
      height: t ? "25px" : "0",
      fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
      fontFamily: "monospace",
      userSelect: "none",
      pointerEvents: "none",
    }),
      this.setStyles(this.elements.databaseGrid, {
        display: "grid",
        width: "fit-content",
        height: "fit-content",
        margin: "0 auto",
      }));
    const e = this.elements.requester;
    (e.addEventListener(
      "mouseenter",
      () => (e.style.backgroundColor = this.themeColors.componentHighlight),
    ),
      e.addEventListener(
        "mouseleave",
        () => (e.style.backgroundColor = this.themeColors.componentBackground),
      ));
  }
  setStyles(t, e) {
    Object.assign(t.style, e);
  }
  generateDatabaseColors() {
    ((this.databaseColors = []),
      (this.databaseRecency = []),
      (this.databaseNumbers = []));
    const t = this.config.databaseRows * this.config.databaseCols;
    for (let e = 0; e < t; e++) this.databaseNumbers.push(e + 1);
    if (this.config.mode === "recency")
      for (let e = 0; e < t; e++) {
        const s = e / (t - 1);
        this.databaseRecency.push(s);
        const i = Math.floor(s * 255),
          n = Math.floor((1 - s) * 255),
          a = `rgb(${i}, 0, ${n})`;
        this.databaseColors.push(a);
      }
    else
      for (let e = 0; e < t; e++) {
        const s = e % this.paletteColors.length;
        this.databaseColors.push(this.paletteColors[s]);
      }
    (this.config.mode === "recency"
      ? this.shuffleArrayWithRecency(this.databaseColors, this.databaseRecency)
      : this.shuffleArray(this.databaseColors),
      this.shuffleArray(this.databaseNumbers));
  }
  shuffleArray(t) {
    for (let e = t.length - 1; e > 0; e--) {
      const s = Math.floor(Math.random() * (e + 1));
      [t[e], t[s]] = [t[s], t[e]];
    }
    return t;
  }
  shuffleArrayWithRecency(t, e) {
    const s = t.map((i, n) => ({ color: i, recency: e[n] }));
    this.shuffleArray(s);
    for (let i = 0; i < s.length; i++)
      ((t[i] = s[i].color), (e[i] = s[i].recency));
  }
  initializeCaches() {
    Array.isArray(this.config.cacheLayers) ||
      (this.config.cacheLayers = [{ rows: 2, cols: 3, label: "Cache" }]);
    for (let t = 0; t < this.config.cacheLayers.length; t++) {
      const e = this.config.cacheLayers[t],
        s = e.rows * e.cols;
      (this.caches.push(Array(s).fill(null)),
        this.cacheOrders.push(Array(s).fill(null)),
        this.roundRobinIndices.push(0));
    }
  }
  prewarmCaches() {
    if (!(!Array.isArray(this.caches) || this.caches.length === 0))
      for (let t = 0; t < this.caches.length; t++) {
        const e = this.caches[t].length,
          i = Math.floor(e * 1),
          n = Array.from({ length: this.databaseColors.length }, (a, o) => o);
        this.shuffleArray(n);
        for (let a = 0; a < i && a < n.length; a++) {
          const o = n[a],
            l = this.databaseColors[o];
          ((this.caches[t][a] = l), this.updateCacheOrder(t, a, l));
        }
      }
  }
  renderCaches() {
    if (Array.isArray(this.config.cacheLayers))
      for (let t = 0; t < this.config.cacheLayers.length; t++)
        this.renderCacheLayer(t);
  }
  renderCacheLayer(t) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      t < 0 ||
      t >= this.config.cacheLayers.length
    )
      return;
    const e = this.config.cacheLayers[t],
      s = this.elements.cacheLayers[t].grid,
      i = this.caches[t];
    ((s.innerHTML = ""),
      this.setStyles(s, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(${e.rows}, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(${e.cols}, ${this.CELL_SIZE}px)`,
      }));
    for (let n = 0; n < i.length; n++) {
      const a = document.createElement("div"),
        o = i[n];
      if (this.postgresMode && o) {
        this.setStyles(a, {
          backgroundColor: "transparent",
          border: "none",
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          boxSizing: "border-box",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
        const l = this.createPostgresSVG(o);
        a.appendChild(l);
      } else
        this.setStyles(a, {
          backgroundColor: o || "transparent",
          border: `1px solid ${this.themeColors.componentBorder}`,
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          boxSizing: "border-box",
          position: "relative",
        });
      (a.setAttribute("data-index", n),
        a.setAttribute("data-layer", t),
        s.appendChild(a));
    }
  }
  renderDatabaseGrid() {
    const t = this.elements.databaseGrid;
    ((t.innerHTML = ""),
      this.setStyles(t, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(${this.config.databaseRows}, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(${this.config.databaseCols}, ${this.CELL_SIZE}px)`,
      }));
    for (let e = 0; e < this.databaseColors.length; e++) {
      const s = document.createElement("div");
      if (this.postgresMode) {
        this.setStyles(s, {
          backgroundColor: "transparent",
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
        const i = this.createPostgresSVG(this.databaseColors[e]);
        s.appendChild(i);
      } else
        this.setStyles(s, {
          backgroundColor: this.databaseColors[e],
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          cursor: "pointer",
          position: "relative",
        });
      (s.setAttribute("data-index", e),
        s.addEventListener("click", (i) => {
          const n = parseInt(i.currentTarget.getAttribute("data-index"));
          this.requestSpecificColor(n);
        }),
        (s.style.userSelect = "none"),
        (s.style.webkitUserSelect = "none"),
        (s.style.mozUserSelect = "none"),
        (s.style.msUserSelect = "none"),
        t.appendChild(s));
    }
  }
  startAutoRequests() {
    if (this.isAutoRequestActive) return;
    this.isAutoRequestActive = !0;
    const t = () => {
      this.isAutoRequestActive &&
        (this.handleRequest(),
        (this.autoRequestTimeout = setTimeout(
          t,
          this.config.automationInterval,
        )));
    };
    t();
  }
  stopAutoRequests() {
    ((this.isAutoRequestActive = !1),
      this.autoRequestTimeout &&
        (clearTimeout(this.autoRequestTimeout),
        (this.autoRequestTimeout = null)));
  }
  isColorInCache(t) {
    for (let e = 0; e < this.caches.length; e++)
      if (this.caches[e].includes(t)) return !0;
    return !1;
  }
  getCachedItems() {
    const t = new Set();
    for (let e = 0; e < this.caches.length; e++)
      for (let s = 0; s < this.caches[e].length; s++) {
        const i = this.caches[e][s];
        i !== null && t.add(i);
      }
    return Array.from(t);
  }
  getUncachedItems() {
    const t = this.getCachedItems();
    return this.databaseColors.filter((e) => !t.includes(e));
  }
  findDatabaseIndexByColor(t) {
    return this.databaseColors.indexOf(t);
  }
  findDatabaseIndexByNumber(t) {
    return this.databaseNumbers.indexOf(t);
  }
  requestSpecificColor(t) {
    const e = this.databaseColors[t],
      s = this.elements.requester.getBoundingClientRect(),
      i = this.elements.cacheLayers.map((d) => d.cache.getBoundingClientRect()),
      n = this.elements.database.getBoundingClientRect(),
      a = this.elements.visualization.getBoundingClientRect(),
      o = { x: s.left - a.left + s.width / 2, y: s.top - a.top + s.height / 2 },
      l = this.nextRequestId++,
      c = `request-${l}`,
      h = document.createElement("div");
    ((h.className = `request-circle ${c}`),
      (h.style.backgroundColor = e),
      (h.style.position = "absolute"),
      (h.style.width = `${this.REQUEST_SIZE}px`),
      (h.style.height = `${this.REQUEST_SIZE}px`),
      (h.style.borderRadius = "50%"),
      (h.style.zIndex = "20"),
      (h.style.left = o.x - this.REQUEST_SIZE / 2 + "px"),
      (h.style.top = o.y - this.REQUEST_SIZE / 2 + "px"),
      (h.style.transform = "translateZ(0) scale(0)"),
      (h.style.opacity = "0"),
      (h.style.willChange = "transform, opacity"),
      this.elements.visualization.appendChild(h));
    const r = {
      id: l,
      color: e,
      dbIndex: t,
      element: h,
      startTime: Date.now(),
      targetCacheIndices: [],
      class: c,
    };
    (this.activeRequests.push(r),
      h.classList.add("appear"),
      setTimeout(() => {
        this.checkCacheLayers(0, l, h, e, t, o, i, n, a);
      }, 300));
  }
  getCacheLayerCenter(t, e, s) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      t >= this.config.cacheLayers.length
    )
      return { x: 0, y: 0 };
    const i = e[t];
    return {
      x: i.left - s.left + i.width / 2,
      y: i.top - s.top + i.height / 2,
    };
  }
  getCacheLayerLeftBoundary(t, e, s) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      t >= this.config.cacheLayers.length
    )
      return { x: 0, y: 0 };
    const i = this.config.cacheLayers[t],
      n = e[t],
      a = i.cols * this.CELL_SIZE + (i.cols - 1) * this.MARGIN;
    return {
      x: n.left - s.left + (n.width - a) / 2 + this.MARGIN,
      y: n.top - s.top + n.height / 2,
    };
  }
  getCellPosition(t, e, s, i) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      t >= this.config.cacheLayers.length
    )
      return { x: 0, y: 0 };
    const n = this.config.cacheLayers[t],
      a = s[t],
      o = Math.floor(e / n.cols),
      l = e % n.cols,
      c = n.cols * this.CELL_SIZE + (n.cols - 1) * this.MARGIN,
      h = n.rows * this.CELL_SIZE + (n.rows - 1) * this.MARGIN,
      r = a.left - i.left + (a.width - c) / 2,
      d = a.top - i.top + (a.height - h) / 2,
      p = r + l * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2,
      m = d + o * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2;
    return { x: p, y: m };
  }
  getDatabaseCellPosition(t, e, s) {
    const i = Math.floor(t / this.config.databaseCols),
      n = t % this.config.databaseCols,
      a =
        this.config.databaseCols * this.CELL_SIZE +
        (this.config.databaseCols - 1) * this.MARGIN,
      o =
        this.config.databaseRows * this.CELL_SIZE +
        (this.config.databaseRows - 1) * this.MARGIN,
      l = e.left - s.left + (e.width - a) / 2,
      c = e.top - s.top + (e.height - o) / 2,
      h = l + n * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2,
      r = c + i * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2;
    return { x: h, y: r };
  }
  updateContainerSizes() {
    this.updateSizesForScreenWidth();
    const t = this.elements.visualizationInner,
      s =
        (this.config.databaseLabel &&
          this.config.databaseLabel.trim() !== "") ||
        (Array.isArray(this.config.cacheLayers) &&
          this.config.cacheLayers.some((m) => m.label && m.label.trim() !== ""))
          ? 30
          : 0,
      i = this.CELL_SIZE + this.MARGIN,
      n = this.config.databaseCols * i + this.MARGIN,
      a = this.config.databaseRows * i + this.MARGIN,
      o = Array.isArray(this.config.cacheLayers)
        ? this.config.cacheLayers.map((m) => m.cols * i + this.MARGIN)
        : [],
      l = Array.isArray(this.config.cacheLayers)
        ? this.config.cacheLayers.map((m) => m.rows * i + this.MARGIN)
        : [];
    if (
      ((this.elements.database.style.width = n + "px"),
      (this.elements.database.style.height = a + "px"),
      Array.isArray(this.config.cacheLayers))
    )
      for (let m = 0; m < this.config.cacheLayers.length; m++)
        m < this.elements.cacheLayers.length &&
          ((this.elements.cacheLayers[m].cache.style.width = o[m] + "px"),
          (this.elements.cacheLayers[m].cache.style.height = l[m] + "px"));
    const c = Math.max(a, ...l.filter((m) => m !== void 0)),
      h = c + s,
      r = this.CELL_SIZE + this.MARGIN * 2;
    if (
      ((this.elements.requesterContainer.style.width = r + "px"),
      (this.elements.requester.style.width = r + "px"),
      (this.elements.requester.style.height = c + "px"),
      Array.isArray(this.config.cacheLayers))
    ) {
      for (let m = 0; m < this.config.cacheLayers.length; m++)
        if (m < this.elements.cacheLayers.length) {
          const f = (c - l[m]) / 2;
          this.elements.cacheLayers[m].container.style.paddingTop = f + "px";
        }
    }
    const d = (c - a) / 2;
    if (
      ((this.elements.databaseContainer.style.paddingTop = d + "px"),
      (t.style.height = h + 20 + "px"),
      (t.style.justifyContent = "space-between"),
      this.config.mode === "recency" && this.elements.legendContainer)
    ) {
      const m =
        this.elements.visualizationInner.offsetWidth ||
        this.elements.visualizationInner.clientWidth;
      ((this.elements.legendContainer.style.width = `${m}px`),
        setTimeout(() => {
          const f =
            this.elements.visualizationInner.offsetWidth ||
            this.elements.visualizationInner.clientWidth;
          f > 0 && (this.elements.legendContainer.style.width = `${f}px`);
        }, 50));
    }
    (this.renderCaches(), this.renderDatabaseGrid());
    const p = `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`;
    if (
      (this.elements.requesterLabel &&
        (this.elements.requesterLabel.style.fontSize = p),
      this.elements.databaseLabel &&
        (this.elements.databaseLabel.style.fontSize = p),
      Array.isArray(this.elements.cacheLayers))
    )
      for (let m = 0; m < this.elements.cacheLayers.length; m++)
        this.elements.cacheLayers[m] &&
          this.elements.cacheLayers[m].label &&
          (this.elements.cacheLayers[m].label.style.fontSize = p);
  }
  addEventListeners() {
    (this.elements.requester.addEventListener(
      "click",
      this.handleRequest.bind(this),
    ),
      window.addEventListener("resize", this.updateContainerSizes.bind(this)),
      window.addEventListener("beforeunload", () => {
        this.stopAutoRequests();
      }));
  }
  handleRequest() {
    let t = -1;
    switch (this.config.automation) {
      case "automatic-hit":
        ((t = this.getRandomCacheHitIndex()),
          t === -1 &&
            (this.prewarmCaches(), (t = this.getRandomCacheHitIndex())));
        break;
      case "automatic-miss":
        ((t = this.getRandomCacheMissIndex()),
          t === -1 &&
            (this.clearSomeCache(), (t = this.getRandomCacheMissIndex())));
        break;
      default:
        this.config.mode === "recency"
          ? (t = this.selectRecencyWeightedIndex())
          : (t = Math.floor(Math.random() * this.databaseColors.length));
        break;
    }
    t !== -1 && this.requestSpecificColor(t);
  }
  getRandomCacheHitIndex() {
    const t = this.getCachedItems();
    if (t.length === 0) return -1;
    const e = t[Math.floor(Math.random() * t.length)];
    return this.findDatabaseIndexByColor(e);
  }
  getRandomCacheMissIndex() {
    const t = this.getUncachedItems();
    if (t.length === 0) return -1;
    const e = t[Math.floor(Math.random() * t.length)];
    return this.findDatabaseIndexByColor(e);
  }
  clearSomeCache() {
    if (!(!Array.isArray(this.caches) || this.caches.length === 0)) {
      for (let t = 0; t < this.caches.length; t++) {
        const e = [];
        for (let i = 0; i < this.caches[t].length; i++)
          this.caches[t][i] !== null && e.push(i);
        if (e.length === 0) continue;
        this.shuffleArray(e);
        const s = Math.ceil(e.length * 0.3);
        for (let i = 0; i < s && i < e.length; i++) this.caches[t][e[i]] = null;
      }
      this.renderCaches();
    }
  }
  selectRecencyWeightedIndex() {
    if (!this.databaseRecency || this.databaseRecency.length === 0)
      return Math.floor(Math.random() * this.databaseColors.length);
    const t = 4,
      e = this.databaseRecency.map((o) => Math.pow(o, t)),
      s = e.reduce((o, l) => o + l, 0),
      i = e.map((o) => o / s),
      n = Math.random();
    let a = 0;
    for (let o = 0; o < i.length; o++) if (((a += i[o]), n <= a)) return o;
    return i.length - 1;
  }
  showCacheHitText(t, e, s) {
    if (this.config.automation !== "automatic-hit") return;
    const i = document.createElement("div");
    ((i.textContent = "Cache hit!"),
      (i.className = "hit-text"),
      (i.style.position = "absolute"),
      (i.style.color = s),
      (i.style.fontWeight = "bold"),
      (i.style.fontSize = `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`),
      (i.style.fontFamily = "monospace"),
      (i.style.whiteSpace = "nowrap"),
      this.elements.visualization.appendChild(i),
      i.offsetWidth,
      (i.style.left = t + this.CELL_SIZE * 0.75 + "px"),
      (i.style.top =
        e - (this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)) / 2 + "px"),
      (i.style.zIndex = "20"),
      (i.style.pointerEvents = "none"),
      (i.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.3)"),
      setTimeout(() => {
        i.remove();
      }, 1e3));
  }
  showCacheMissText(t, e, s) {
    if (this.config.automation !== "automatic-miss") return;
    const i = document.createElement("div");
    ((i.textContent = "Cache miss!"),
      (i.className = "hit-text"),
      (i.style.position = "absolute"),
      (i.style.color = s),
      (i.style.fontWeight = "bold"),
      (i.style.fontSize = `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`),
      (i.style.fontFamily = "monospace"),
      (i.style.whiteSpace = "nowrap"),
      this.elements.visualization.appendChild(i),
      i.offsetWidth,
      (i.style.left = t + this.CELL_SIZE * 0.75 + "px"),
      (i.style.top =
        e - (this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)) / 2 + "px"),
      (i.style.zIndex = "20"),
      (i.style.pointerEvents = "none"),
      (i.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.3)"),
      setTimeout(() => {
        i.remove();
      }, 1e3));
  }
  checkCacheLayers(t, e, s, i, n, a, o, l, c) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      t >= this.config.cacheLayers.length
    ) {
      if (
        (this.stats.cacheMisses++,
        this.elements.statsMisses &&
          (this.elements.statsMisses.textContent = this.stats.cacheMisses),
        this.elements.statsRequests)
      ) {
        const r = this.stats.cacheHits + this.stats.cacheMisses;
        this.elements.statsRequests.textContent = r;
      }
      if (
        (this.events.dispatchEvent(
          new CustomEvent("cacheMiss", {
            detail: {
              color: i,
              dbIndex: n,
              message: "Color not found in any cache layer",
            },
          }),
        ),
        this.config.cacheLayers.length > 0)
      ) {
        const r = this.config.cacheLayers.length - 1,
          d = this.getCacheLayerCenter(r, o, c);
        this.showCacheMissText(d.x, d.y, i);
      }
      this.prepareAndHandleCacheMiss(e, s, i, n, a, o, l, c);
      return;
    }
    const h = this.caches[t].indexOf(i);
    if (h !== -1) {
      const r = this.getCacheLayerCenter(t, o, c);
      if (
        (s.classList.add("move"),
        (s.style.left = r.x - this.REQUEST_SIZE / 2 + "px"),
        (s.style.top = r.y - this.REQUEST_SIZE / 2 + "px"),
        this.stats.cacheHits++,
        this.elements.statsHits &&
          (this.elements.statsHits.textContent = this.stats.cacheHits),
        this.elements.statsRequests)
      ) {
        const p = this.stats.cacheHits + this.stats.cacheMisses;
        this.elements.statsRequests.textContent = p;
      }
      this.events.dispatchEvent(
        new CustomEvent("cacheHit", {
          detail: {
            color: i,
            layer: t,
            message: "Color found in cache layer " + t,
          },
        }),
      );
      const d = this.getCellPosition(t, h, o, c);
      (s.classList.add("move"),
        (s.style.left = d.x - this.REQUEST_SIZE / 2 + "px"),
        (s.style.top = d.y - this.REQUEST_SIZE / 2 + "px"),
        this.showCacheHitText(d.x, d.y, i),
        this.handleCacheHit(e, s, i, t, h, a, o, c));
    } else {
      const r = this.getCacheLayerLeftBoundary(t, o, c);
      (s.classList.add("move"),
        (s.style.left = r.x - this.REQUEST_SIZE / 2 + "px"),
        (s.style.top = r.y - this.REQUEST_SIZE / 2 + "px"),
        setTimeout(() => {
          this.checkCacheLayers(t + 1, e, s, i, n, a, o, l, c);
        }, 500));
    }
  }
  handleCacheHit(t, e, s, i, n, a, o, l) {
    if (
      !Array.isArray(this.config.cacheLayers) ||
      i >= this.config.cacheLayers.length
    )
      return;
    const c = this.activeRequests.find((r) => r.id === t);
    if (!c) return;
    const h = this.getCellPosition(i, n, o, l);
    setTimeout(() => {
      (e.classList.add("disappear"),
        setTimeout(() => {
          e.remove();
          const r = document.createElement("div");
          if (
            ((r.className = `cache-data ${c.class}`),
            (r.style.position = "absolute"),
            (r.style.zIndex = "10"),
            this.postgresMode)
          ) {
            ((r.style.backgroundColor = "transparent"),
              (r.style.display = "flex"),
              (r.style.alignItems = "center"),
              (r.style.justifyContent = "center"));
            const d = this.createPostgresSVG(s);
            r.appendChild(d);
          } else r.style.backgroundColor = s;
          ((r.style.width = `${this.CELL_SIZE}px`),
            (r.style.height = `${this.CELL_SIZE}px`),
            (r.style.left = h.x - this.CELL_SIZE / 2 + "px"),
            (r.style.top = h.y - this.CELL_SIZE / 2 + "px"),
            (r.style.transform = "scale(0)"),
            (r.style.opacity = "0"),
            this.elements.visualization.appendChild(r),
            r.classList.add("appear"),
            setTimeout(() => {
              (this.updateCacheOrder(i, n, s),
                i > 0
                  ? this.propagateToPreviousCacheLayers(
                      i - 1,
                      t,
                      r,
                      s,
                      h.x,
                      h.y,
                      a,
                      o,
                      l,
                    )
                  : setTimeout(() => {
                      (r.classList.add("move"),
                        (r.style.left = a.x - this.CELL_SIZE / 2 + "px"),
                        (r.style.top = a.y - this.CELL_SIZE / 2 + "px"),
                        setTimeout(() => {
                          (r.classList.add("disappear"),
                            setTimeout(() => {
                              (r.remove(),
                                (this.activeRequests =
                                  this.activeRequests.filter(
                                    (d) => d.id !== t,
                                  )));
                            }, 300));
                        }, 800));
                    }, 50));
            }, 300));
        }, 300));
    }, 800);
  }
  propagateToPreviousCacheLayers(t, e, s, i, n, a, o, l, c) {
    if (t < 0) {
      setTimeout(() => {
        (s.classList.add("move"),
          (s.style.left = o.x - this.CELL_SIZE / 2 + "px"),
          (s.style.top = o.y - this.CELL_SIZE / 2 + "px"),
          setTimeout(() => {
            (s.classList.add("disappear"),
              setTimeout(() => {
                (s.remove(),
                  (this.activeRequests = this.activeRequests.filter(
                    (p) => p.id !== e,
                  )));
              }, 300));
          }, 800));
      }, 50);
      return;
    }
    const h = this.activeRequests.find((p) => p.id === e);
    if (!h) return;
    (h.targetCacheIndices || (h.targetCacheIndices = []),
      h.targetCacheIndices[t] === void 0 &&
        (h.targetCacheIndices[t] = this.determineCacheSlot(t, i)));
    const r = this.getCellPosition(t, h.targetCacheIndices[t], l, c),
      d = document.createElement("div");
    if (
      ((d.className = `cache-clone ${h.class}`),
      (d.style.position = "absolute"),
      (d.style.zIndex = h.isNeighbor ? "9" : "20"),
      (d.style.transform = "translateZ(0)"),
      (d.style.willChange = "transform, opacity"),
      this.postgresMode)
    ) {
      ((d.style.backgroundColor = "transparent"),
        (d.style.display = "flex"),
        (d.style.alignItems = "center"),
        (d.style.justifyContent = "center"));
      const p = this.createPostgresSVG(i);
      d.appendChild(p);
    } else d.style.backgroundColor = i;
    ((d.style.width = `${this.CELL_SIZE}px`),
      (d.style.height = `${this.CELL_SIZE}px`),
      (d.style.left = n - this.CELL_SIZE / 2 + "px"),
      (d.style.top = a - this.CELL_SIZE / 2 + "px"),
      (d.style.opacity = "1"),
      this.elements.visualization.appendChild(d),
      setTimeout(() => {
        (d.classList.add("move"),
          (d.style.left = r.x - this.CELL_SIZE / 2 + "px"),
          (d.style.top = r.y - this.CELL_SIZE / 2 + "px"),
          setTimeout(() => {
            (Array.isArray(this.caches) &&
              this.caches[t] &&
              ((this.caches[t][h.targetCacheIndices[t]] = i),
              this.updateCacheOrder(t, h.targetCacheIndices[t], i),
              this.renderCacheLayer(t)),
              this.propagateToPreviousCacheLayers(
                t - 1,
                e,
                d,
                i,
                r.x,
                r.y,
                o,
                l,
                c,
              ));
          }, 800));
      }, 50));
  }
  prepareAndHandleCacheMiss(t, e, s, i, n, a, o, l) {
    const c = this.activeRequests.find((h) => h.id === t);
    if (c) {
      if (Array.isArray(this.caches))
        for (let h = 0; h < this.caches.length; h++) {
          const r = this.determineCacheSlot(h, s);
          c.targetCacheIndices[h] = r;
        }
      this.animateToDatabase(t, e, s, i, n, a, o, l);
    }
  }
  determineCacheSlot(t, e) {
    if (!Array.isArray(this.caches) || !this.caches[t]) return 0;
    const s = this.activeRequests
      .filter(
        (a) =>
          !this.caches[t].includes(a.color) &&
          a.targetCacheIndices &&
          a.targetCacheIndices[t] !== void 0,
      )
      .map((a) => a.targetCacheIndices[t]);
    for (let a = 0; a < this.caches[t].length; a++)
      if (this.caches[t][a] === null && !s.includes(a)) return a;
    let i = this.roundRobinIndices[t],
      n = 0;
    for (; s.includes(i) && n < this.caches[t].length; )
      ((i = (i + 1) % this.caches[t].length), n++);
    return ((this.roundRobinIndices[t] = (i + 1) % this.caches[t].length), i);
  }
  animateToDatabase(t, e, s, i, n, a, o, l) {
    const c = this.activeRequests.find((d) => d.id === t);
    if (!c) return;
    const h = this.getDatabaseCellPosition(i, o, l);
    e
      ? (e.classList.add("move"),
        (e.style.left = h.x - this.REQUEST_SIZE / 2 + "px"),
        (e.style.top = h.y - this.REQUEST_SIZE / 2 + "px"),
        setTimeout(() => {
          (e.classList.add("disappear"),
            setTimeout(() => {
              (e.remove(), r());
            }, 300));
        }, 800))
      : r();
    function r() {
      const d = document.createElement("div");
      if (
        ((d.className = `db-data ${c.class}`),
        (d.style.position = "absolute"),
        (d.style.zIndex = "20"),
        (d.style.transform = "translateZ(0)"),
        (d.style.willChange = "transform, opacity"),
        this.postgresMode)
      ) {
        ((d.style.backgroundColor = "transparent"),
          (d.style.display = "flex"),
          (d.style.alignItems = "center"),
          (d.style.justifyContent = "center"));
        const p = this.createPostgresSVG(s);
        d.appendChild(p);
      } else d.style.backgroundColor = s;
      ((d.style.width = `${this.CELL_SIZE}px`),
        (d.style.height = `${this.CELL_SIZE}px`),
        (d.style.left = h.x - this.CELL_SIZE / 2 + "px"),
        (d.style.top = h.y - this.CELL_SIZE / 2 + "px"),
        (d.style.opacity = "0"),
        this.elements.visualization.appendChild(d),
        d.classList.add("appear"),
        setTimeout(() => {
          (d.classList.add("pulse"),
            setTimeout(() => {
              Array.isArray(this.config.cacheLayers) &&
              this.config.cacheLayers.length > 0
                ? this.propagateFromDatabase(
                    this.config.cacheLayers.length - 1,
                    t,
                    d,
                    s,
                    h.x,
                    h.y,
                    n,
                    a,
                    l,
                  )
                : this.animateDataToRequester(t, d, s, h.x, h.y, n);
            }, 800));
        }, 300));
    }
    r = r.bind(this);
  }
  propagateFromDatabase(t, e, s, i, n, a, o, l, c) {
    if (t < 0) {
      this.animateDataToRequester(e, s, i, n, a, o);
      return;
    }
    const h = this.activeRequests.find((p) => p.id === e);
    if (!h || !h.targetCacheIndices) return;
    const r = this.getCellPosition(t, h.targetCacheIndices[t], l, c),
      d = document.createElement("div");
    if (
      ((d.className = `cache-clone ${h.class}`),
      (d.style.position = "absolute"),
      (d.style.zIndex = h.isNeighbor ? "9" : "20"),
      (d.style.transform = "translateZ(0)"),
      (d.style.willChange = "transform, opacity"),
      this.postgresMode)
    ) {
      ((d.style.backgroundColor = "transparent"),
        (d.style.display = "flex"),
        (d.style.alignItems = "center"),
        (d.style.justifyContent = "center"));
      const p = this.createPostgresSVG(i);
      d.appendChild(p);
    } else d.style.backgroundColor = i;
    ((d.style.width = `${this.CELL_SIZE}px`),
      (d.style.height = `${this.CELL_SIZE}px`),
      (d.style.left = n - this.CELL_SIZE / 2 + "px"),
      (d.style.top = a - this.CELL_SIZE / 2 + "px"),
      (d.style.opacity = "1"),
      this.elements.visualization.appendChild(d),
      setTimeout(() => {
        (d.classList.add("move"),
          (d.style.left = r.x - this.CELL_SIZE / 2 + "px"),
          (d.style.top = r.y - this.CELL_SIZE / 2 + "px"),
          setTimeout(() => {
            (Array.isArray(this.caches) &&
              this.caches[t] &&
              ((this.caches[t][h.targetCacheIndices[t]] = i),
              this.updateCacheOrder(t, h.targetCacheIndices[t], i),
              this.renderCacheLayer(t)),
              this.propagateFromDatabase(t - 1, e, d, i, r.x, r.y, o, l, c));
          }, 800));
      }, 50));
  }
  updateCacheOrder(t, e, s) {
    if (!Array.isArray(this.cacheOrders) || !this.cacheOrders[t]) return;
    const i = this.cacheOrders[t].indexOf(s);
    (i >= 0 && this.cacheOrders[t].splice(i, 1), this.cacheOrders[t].push(s));
  }
  animateDataToRequester(t, e, s, i, n, a) {
    const o = this.activeRequests.find((c) => c.id === t);
    if (!o) return;
    const l = document.createElement("div");
    if (
      ((l.className = `requester-data ${o.class}`),
      (l.style.position = "absolute"),
      (l.style.zIndex = o.isNeighbor ? "9" : "20"),
      (l.style.transform = "translateZ(0)"),
      (l.style.willChange = "transform, opacity"),
      this.postgresMode)
    ) {
      ((l.style.backgroundColor = "transparent"),
        (l.style.display = "flex"),
        (l.style.alignItems = "center"),
        (l.style.justifyContent = "center"));
      const c = this.createPostgresSVG(s);
      l.appendChild(c);
    } else l.style.backgroundColor = s;
    ((l.style.width = `${this.CELL_SIZE}px`),
      (l.style.height = `${this.CELL_SIZE}px`),
      (l.style.left = i - this.CELL_SIZE / 2 + "px"),
      (l.style.top = n - this.CELL_SIZE / 2 + "px"),
      (l.style.opacity = "1"),
      this.elements.visualization.appendChild(l),
      setTimeout(() => {
        (l.classList.add("move"),
          (l.style.left = a.x - this.CELL_SIZE / 2 + "px"),
          (l.style.top = a.y - this.CELL_SIZE / 2 + "px"),
          setTimeout(() => {
            (l.classList.add("disappear"),
              setTimeout(() => {
                (document
                  .querySelectorAll(`.${o.class}`)
                  .forEach((h) => h.remove()),
                  (this.activeRequests = this.activeRequests.filter(
                    (h) => h.id !== t,
                  )));
              }, 300));
          }, 800));
      }, 50));
  }
}
const U = document.createElement("style");
U.textContent = `
.tweet-container {
    border: 1px solid var(--tweet-border-color);
    border-radius: 0;
    padding: 16px;
    margin-bottom: 16px;
    background-color: var(--tweet-background-color);
    max-width: none;
    font-family: monospace;
    color: var(--tweet-text-color);
    width: 100%;
    box-sizing: border-box;
    display: block;
    text-decoration: none;
}

.tweet-container.interactive {
    cursor: pointer;
}

.tweet-header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;
}

.tweet-profile-image-wrapper {
    margin-right: 12px;
    flex-shrink: 0;
    text-decoration: none;
    display: block;
}

.tweet-profile-image {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--tweet-component-background-color);
    color: var(--tweet-background-color);
    font-size: 15px;
    font-weight: bold;
    font-family: monospace;
}

.tweet-profile-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.tweet-user-info {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.tweet-name {
    font-weight: bold;
    margin-bottom: 2px;
    color: var(--tweet-text-color);
    text-decoration: none;
    font-family: monospace;
}

.tweet-name.interactive {
    cursor: pointer;
    transition: color 0.2s;
}

.tweet-name.interactive:hover {
    text-decoration: underline;
}

.tweet-handle {
    color: var(--tweet-component-text-color);
    font-size: 0.9em;
    text-decoration: none;
    font-family: monospace;
}

.tweet-handle.interactive {
    cursor: pointer;
    transition: color 0.2s;
}

.tweet-handle.interactive:hover {
    text-decoration: underline;
}

.tweet-logo {
    margin-left: auto;
    color: var(--tweet-component-text-color);
    text-decoration: none;
}

.tweet-logo.interactive {
    cursor: pointer;
    transition: color 0.2s;
}

.tweet-logo.interactive:hover {
    color: var(--tweet-accent-color);
}

.tweet-content {
    margin-bottom: 12px;
    line-height: 1.4;
    white-space: pre-wrap;
    color: var(--tweet-text-color);
    text-decoration: none;
    text-transform: uppercase;
    font-family: monospace;
}

.tweet-content.interactive {
    cursor: pointer;
    transition: color 0.2s;
}

.tweet-footer {
    display: flex;
    justify-content: space-between;
    color: var(--tweet-component-text-color);
    font-size: 0.9em;
    align-items: center;
    font-family: monospace;
}

.tweet-metrics {
    display: flex;
    gap: 16px;
}

.tweet-retweets,
.tweet-likes {
    display: flex;
    align-items: center;
    gap: 4px;
}
`;
document.head.appendChild(U);
class tt {
  constructor(t, e = {}) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.options = {
      imageName: e.imageName || "default-profile.png",
      name: e.name || "User Name",
      handle: e.handle || "username",
      text: e.text || "Tweet content goes here.",
      date: e.date || "Now",
      retweets: e.retweets || 0,
      likes: e.likes || 0,
      tweetId: e.tweetId || "",
      interactive: e.interactive !== void 0 ? e.interactive : !0,
    }),
      this.updateThemeColors(),
      this.initialize(),
      this.setupThemeListener());
  }
  updateThemeColors() {
    ((this.themeColors = _()), this.setCSSCustomProperties());
  }
  setCSSCustomProperties() {
    this.containerElement &&
      (this.containerElement.style.setProperty(
        "--tweet-border-color",
        this.themeColors.border,
      ),
      this.containerElement.style.setProperty(
        "--tweet-background-color",
        this.themeColors.background,
      ),
      this.containerElement.style.setProperty(
        "--tweet-text-color",
        this.themeColors.text,
      ),
      this.containerElement.style.setProperty(
        "--tweet-component-background-color",
        this.themeColors.componentBackground,
      ),
      this.containerElement.style.setProperty(
        "--tweet-component-text-color",
        this.themeColors.componentText,
      ),
      this.containerElement.style.setProperty(
        "--tweet-accent-color",
        this.themeColors.accent,
      ));
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    this.containerElement && this.setCSSCustomProperties();
  }
  initialize() {
    const t = this.options.interactive,
      e = this.options.tweetId,
      s = t ? 'target="_blank" rel="noopener noreferrer"' : "",
      i = t ? `https://x.com/${this.options.handle}` : "",
      n =
        t && e
          ? `https://x.com/${this.options.handle}/status/${this.options.tweetId}`
          : "",
      a = t ? (e ? n : "https://x.com") : "",
      o =
        this.options.retweets > 0
          ? `
            <span class="tweet-retweets">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                    <g>
                        <path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path>
                    </g>
                </svg>
                ${this.options.retweets}
            </span>
        `
          : "",
      l =
        this.options.likes > 0
          ? `
            <span class="tweet-likes">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                    <g>
                        <path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path>
                    </g>
                </svg>
                ${this.options.likes}
            </span>
        `
          : "",
      c = `tweet-container${t && e ? " interactive" : ""}`,
      h = t
        ? `<a class="tweet-profile-image-wrapper" href="${i}" ${s}>`
        : '<div class="tweet-profile-image-wrapper">',
      r = t ? "</a>" : "</div>",
      d = `tweet-name${t ? " interactive" : ""}`,
      p = t ? `<a class="${d}" href="${i}" ${s}>` : `<span class="${d}">`,
      m = t ? "</a>" : "</span>",
      f = `tweet-handle${t ? " interactive" : ""}`,
      x = t ? `<a class="${f}" href="${i}" ${s}>` : `<span class="${f}">`,
      v = t ? "</a>" : "</span>",
      w = `tweet-logo${t ? " interactive" : ""}`,
      y = t ? `<a class="${w}" href="${a}" ${s}>` : `<div class="${w}">`,
      g = t ? "</a>" : "</div>",
      L = `tweet-content${t && e ? " interactive" : ""}`,
      T = t && e ? `<a class="${L}" href="${n}" ${s}>` : `<div class="${L}">`,
      A = t && e ? "</a>" : "</div>",
      C = `
            <div class="tweet-header">
                ${h}
                    <div class="tweet-profile-image">
                        <img src="https://iframe-git-caching.preview.planetscale.com/blog/caching/${this.options.imageName}" 
                             alt="${this.options.name}'s profile picture"
                             onerror="this.style.display='none'; this.parentElement.style.backgroundColor='${this.getColorFromString(this.options.name)}'; this.parentElement.innerHTML='${this.getInitials(this.options.name)}';">
                    </div>
                ${r}
                <div class="tweet-user-info">
                    ${p}${this.options.name}${m}
                    ${x}@${this.options.handle}${v}
                </div>
                ${y}
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                        <g>
                            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </g>
                    </svg>
                ${g}
            </div>
            ${T}${this.options.text}${A}
            <div class="tweet-footer">
                <span class="tweet-timestamp">${this.options.date}</span>
                <div class="tweet-metrics">
                    ${o}
                    ${l}
                </div>
            </div>
        `,
      b = document.createElement(t && e ? "a" : "div");
    ((b.className = c),
      t &&
        e &&
        ((b.href = n), (b.target = "_blank"), (b.rel = "noopener noreferrer")),
      (b.innerHTML = C),
      (this.containerElement.innerHTML = ""),
      this.containerElement.appendChild(b));
  }
  getInitials(t) {
    return t
      .split(" ")
      .map((e) => e.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }
  getColorFromString(t) {
    let e = 0;
    for (let i = 0; i < t.length; i++) e = t.charCodeAt(i) + ((e << 5) - e);
    return `hsl(${e % 360}, 70%, 45%)`;
  }
}
class et {
  constructor(t, e = {}) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.options = {
      totalImpressions: e.totalImpressions || 1e6,
      publishDate: e.publishDate || "2023-01-01",
      endDate: e.endDate || "2023-01-31",
      animationDuration: e.animationDuration || 1e4,
      width: e.width || "100%",
      height: e.height || 200,
      impressionsColor: e.impressionsColor || I.getColor(3),
      pauseBeforeRestart: e.pauseBeforeRestart || 3e3,
      gridLines: e.gridLines !== void 0 ? e.gridLines : !0,
    }),
      (this.state = {
        isAnimating: !1,
        animationFrame: null,
        startTime: null,
        currentTime: null,
        dataPoints: {
          timestamps: [],
          impressions: [],
          cumulativeImpressions: [],
        },
        currentValues: { impressions: 0 },
        animationComplete: !1,
      }),
      (this.svgNS = "http://www.w3.org/2000/svg"),
      (this.svg = null),
      (this.gridGroup = null),
      (this.axisGroup = null),
      (this.dataGroup = null),
      (this.legendGroup = null),
      (this.fontStyle = { font: "monospace", size: "18px" }),
      (this.mobileBreakpoint = 600),
      this.updateThemeColors(),
      this.generateDataPoints(),
      this.initialize());
  }
  updateThemeColors() {
    ((this.themeColors = _()), this.setCSSCustomProperties());
  }
  setupThemeListener() {
    M((t) => {
      this.updateThemeColors();
    });
  }
  setCSSCustomProperties() {
    const t = this.themeColors,
      e = this.containerElement.style;
    (e.setProperty("--tweet-sim-text", t.text),
      e.setProperty("--tweet-sim-border", t.border),
      e.setProperty("--tweet-sim-grid", t.canvasGrid),
      e.setProperty("--tweet-sim-bg", t.componentBackground),
      e.setProperty("--tweet-sim-component-border", t.componentBorder),
      e.setProperty("--tweet-sim-impressions", this.options.impressionsColor));
  }
  getResponsiveFontSize() {
    const t = window.innerWidth,
      e = parseInt(this.fontStyle.size);
    return t <= this.mobileBreakpoint ? e * 0.5 : e;
  }
  generateDataPoints() {
    const t = new Date(this.options.publishDate),
      s = new Date(this.options.endDate).getTime() - t.getTime(),
      i = Math.min(Math.ceil(s / (1e3 * 60 * 60)), 200);
    this.state.dataPoints = {
      timestamps: [],
      impressions: [],
      cumulativeImpressions: [],
    };
    let n = 0,
      a = [];
    for (let c = 0; c < i; c++) {
      const h = c / (i - 1),
        r = new Date(t.getTime() + h * s);
      this.state.dataPoints.timestamps.push(r);
      const d = 2;
      let p =
        c < d
          ? Math.pow(c / d, 1.1)
          : Math.exp(-0.25 * (c - d)) * (c < d + 24 ? 1 : 0.28);
      const m = (c < d + 12 ? 0.15 : 0.25) * (Math.random() - 0.5),
        f =
          c < 48 && Math.random() < 0.1
            ? Math.random() * 0.2
            : Math.random() < 0.03
              ? Math.random() * 0.15
              : 0;
      a.push(p * (1 + m) + f);
    }
    const o = a.reduce((c, h) => c + h, 0);
    for (let c = 0; c < i; c++) {
      const h = Math.round((a[c] / o) * this.options.totalImpressions);
      (this.state.dataPoints.impressions.push(h),
        (n += h),
        this.state.dataPoints.cumulativeImpressions.push(n));
    }
    const l = this.options.totalImpressions - n;
    l !== 0 &&
      ((this.state.dataPoints.impressions[i - 1] += l),
      (this.state.dataPoints.cumulativeImpressions[i - 1] =
        this.options.totalImpressions));
  }
  initialize() {
    (this.createDOMStructure(),
      this.setupSVG(),
      this.createInitialDataPoints(),
      requestAnimationFrame(() => {
        (this.updateSVGViewBox(), this.drawFrame(0));
      }),
      this.setupThemeListener());
  }
  createInitialDataPoints() {
    if (this.state.dataPoints.timestamps.length === 0) {
      const t = new Date(this.options.publishDate),
        s = new Date(this.options.endDate).getTime() - t.getTime();
      for (let i = 0; i <= 6; i++) {
        const n = i / 6,
          a = new Date(t.getTime() + n * s);
        (this.state.dataPoints.timestamps.push(a),
          this.state.dataPoints.impressions.push(0),
          this.state.dataPoints.cumulativeImpressions.push(0));
      }
    }
  }
  createDOMStructure() {
    const t = this.options.height + 70;
    ((this.containerElement.innerHTML = `
            <style>
                .tweet-simulator-outer-container {
                    color: var(--tweet-sim-text);
                    font-family: monospace;
                }
                .tweet-simulator-start-button-container {
                    width: 100%;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .tweet-simulator-start-button {
                    padding: 10px 20px;
                    background-color: var(--tweet-sim-bg);
                    color: var(--tweet-sim-text);
                    border: 2px solid var(--tweet-sim-component-border);
                    border-radius: 0;
                    cursor: pointer;
                    font-family: monospace;
                    font-size: 1.2em;
                    font-weight: bold;
                    box-shadow: none;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                .tweet-simulator-container {
                    position: relative;
                    width: ${this.options.width};
                    height: ${t}px;
                    border: 1px solid var(--tweet-sim-border);
                    background-color: transparent;
                    box-sizing: border-box;
                    font-family: monospace;
                    overflow: hidden;
                }
                .tweet-simulator-stats {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background-color: transparent;
                    padding: 8px;
                    border-radius: 0;
                    font-size: 16px;
                    color: var(--tweet-sim-text);
                    text-align: right;
                    font-weight: bold;
                    font-family: monospace;
                    z-index: 5;
                }
                .tweet-simulator-impressions {
                    color: var(--tweet-sim-impressions);
                }
                .tweet-simulator-date {
                    position: absolute;
                    bottom: 10px;
                    right: 10px;
                    font-size: 12px;
                    color: var(--tweet-sim-text);
                    font-family: monospace;
                }
                .tweet-simulator-container text {
                    fill: var(--tweet-sim-text);
                    font-family: monospace;
                }
                .tweet-simulator-container .grid-lines line {
                    stroke: var(--tweet-sim-grid);
                }
                .tweet-simulator-container .axes line {
                    stroke: var(--tweet-sim-text);
                }
            </style>
            <div class="tweet-simulator-outer-container">
                <div class="tweet-simulator-start-button-container">
                    <button class="tweet-simulator-start-button">Click to Start</button>
                </div>
                <div class="tweet-simulator-container">
                    <svg width="100%" height="100%" viewBox="0 0 600 ${t}">
                        <g class="grid-lines"></g>
                        <g class="axes"></g>
                        <g class="data-lines"></g>
                        <g class="legend"></g>
                    </svg>
                    <div class="tweet-simulator-stats">
                        <div class="tweet-simulator-impressions">
                            <span>Total Impressions: </span><span class="tweet-simulator-impressions-value">0</span>
                        </div>
                    </div>
                    <div class="tweet-simulator-date"></div>
                </div>
            </div>
        `),
      (this.svg = this.containerElement.querySelector("svg")),
      (this.gridGroup = this.containerElement.querySelector(".grid-lines")),
      (this.axisGroup = this.containerElement.querySelector(".axes")),
      (this.dataGroup = this.containerElement.querySelector(".data-lines")),
      (this.legendGroup = this.containerElement.querySelector(".legend")));
    const e = this.containerElement.querySelector(
      ".tweet-simulator-start-button",
    );
    (e.addEventListener("click", () => {
      ((e.textContent = "Restart"),
        this.stopAnimation(),
        (this.state.currentValues.impressions = 0),
        this.updateStats());
      const s = this.containerElement.querySelector(".tweet-simulator-date");
      (s && (s.textContent = ""), this.startAnimation());
    }),
      (this.elements = {
        container: this.containerElement.querySelector(
          ".tweet-simulator-container",
        ),
        outerContainer: this.containerElement.querySelector(
          ".tweet-simulator-outer-container",
        ),
        statsContainer: this.containerElement.querySelector(
          ".tweet-simulator-stats",
        ),
        startButtonContainer: this.containerElement.querySelector(
          ".tweet-simulator-start-button-container",
        ),
        startButton: e,
        impressionsValue: this.containerElement.querySelector(
          ".tweet-simulator-impressions-value",
        ),
        dateContainer: this.containerElement.querySelector(
          ".tweet-simulator-date",
        ),
        svg: this.svg,
      }));
  }
  setupSVG() {
    window.addEventListener("resize", this.handleResize.bind(this));
  }
  updateSVGViewBox() {
    if (!this.svg || !this.elements.container) return;
    const t = this.elements.container.clientWidth || 600,
      e = this.options.height + 70;
    this.setAttributesNS(this.svg, { viewBox: `0 0 ${t} ${e}` });
  }
  handleResize() {
    if (
      (this.updateSVGViewBox(),
      this.state.currentTime !== null
        ? this.drawFrame(this.state.currentTime)
        : this.drawFrame(0),
      this.elements)
    ) {
      const t = this.getResponsiveFontSize();
      ((this.elements.statsContainer.style.fontSize = `${t}px`),
        (this.elements.dateContainer.style.fontSize = `${t * 0.67}px`));
    }
  }
  startAnimation() {
    if (this.state.isAnimating) return;
    ((this.state.dataPoints = {
      timestamps: [],
      impressions: [],
      cumulativeImpressions: [],
    }),
      this.generateDataPoints(),
      (this.state.isAnimating = !0),
      (this.state.startTime = null),
      (this.state.animationComplete = !1));
    const t = (e) => {
      this.state.startTime || (this.state.startTime = e);
      const s = e - this.state.startTime,
        i = Math.min(s / this.options.animationDuration, 1);
      ((this.state.currentTime = i),
        this.drawFrame(i),
        i < 1
          ? (this.state.animationFrame = requestAnimationFrame(t))
          : (this.state.animationComplete = !0));
    };
    this.state.animationFrame = requestAnimationFrame(t);
  }
  stopAnimation() {
    (this.state.animationFrame &&
      (cancelAnimationFrame(this.state.animationFrame),
      (this.state.animationFrame = null)),
      (this.state.isAnimating = !1));
  }
  drawFrame(t) {
    if (!this.svg) return;
    const e = this.svg.getBoundingClientRect(),
      s = e.width,
      i = e.height,
      n = this.state.dataPoints.timestamps.length,
      a = !this.state.isAnimating && t === 0,
      o = a ? n : Math.max(1, Math.floor(t * n)),
      l = this.state.dataPoints.timestamps.slice(0, o);
    let c = this.state.dataPoints.impressions.slice(0, o);
    (a && (c = c.map(() => 0)),
      !a && o > 0
        ? (this.state.currentValues.impressions =
            this.state.dataPoints.cumulativeImpressions[o - 1])
        : (this.state.currentValues.impressions = 0),
      this.updateStats());
    const h = Math.max(...this.state.dataPoints.impressions, 1),
      r = a ? h : Math.max(...c, 1),
      d = { top: 30, right: 50, bottom: 70, left: 80 };
    (!a && o > 0 && this.updateDateDisplay(l[o - 1]),
      this.drawChart(s, i, d, h, r, c, l, a, o));
  }
  drawChart(t, e, s, i, n, a, o, l, c) {
    var v, w, y, g, L, T, A;
    const h = t - s.left - s.right,
      r = e - s.top - s.bottom,
      d = (C) =>
        C >= 1e6
          ? (C / 1e6).toFixed(1) + "M"
          : C >= 1e3
            ? (C / 1e3).toFixed(0) + "K"
            : C.toFixed(0),
      p = (C, b) => {
        const S = b / 36e5;
        return S <= 24
          ? `${C.getHours()}:00`
          : S <= 72
            ? `${C.getMonth() + 1}/${C.getDate()} ${C.getHours()}h`
            : S <= 30 * 24
              ? `${C.getMonth() + 1}/${C.getDate()}`
              : `${C.getMonth() + 1}/${C.getFullYear().toString().substr(2)}`;
      };
    let m = "";
    if (this.options.gridLines) {
      for (let C = 0; C <= 5; C++) {
        const b = s.top + r * (1 - C / 5);
        m += `<line x1="${s.left}" y1="${b}" x2="${t - s.right}" y2="${b}" stroke-width="1" class="grid-line" />`;
      }
      for (let C = 0; C <= 6; C++) {
        const b = s.left + h * (C / 6);
        m += `<line x1="${b}" y1="${s.top}" x2="${b}" y2="${e - s.bottom}" stroke-width="1" class="grid-line" />`;
      }
    }
    ((m += `<line x1="${s.left}" y1="${s.top}" x2="${s.left}" y2="${e - s.bottom}" stroke-width="1" class="axis-line" />`),
      (m += `<line x1="${s.left}" y1="${e - s.bottom}" x2="${t - s.right}" y2="${e - s.bottom}" stroke-width="1" class="axis-line" />`));
    for (let C = 0; C <= 5; C++) {
      const b = (i * C) / 5,
        S = s.top + r * (1 - C / 5),
        $ = d(b);
      m += `<text x="${s.left - 10}" y="${S}" text-anchor="end" alignment-baseline="middle" font-family="monospace" font-size="${this.getResponsiveFontSize()}px">${$}</text>`;
    }
    if (o.length > 0) {
      const C = o[o.length - 1] - o[0],
        b = o[0];
      for (let S = 0; S <= 6; S++) {
        const $ = S / 6,
          R = s.left + h * $,
          F = new Date(b.getTime() + $ * C),
          k = p(F, C);
        m += `<text x="${R}" y="${e - s.bottom + 30}" text-anchor="middle" alignment-baseline="hanging" font-family="monospace" font-size="${this.getResponsiveFontSize()}px">${k}</text>`;
      }
    }
    if (!l && c >= 1 && o.length >= 1) {
      const C = o[0].getTime(),
        S = (o.length > 1 ? o[o.length - 1].getTime() : C) - C || 1;
      let $ = "M ";
      for (let R = 0; R < o.length; R++) {
        const F = a[R],
          k = o[R].getTime(),
          B = s.left + (S > 0 ? h * ((k - C) / S) : 0),
          G = Math.min(F / n, 1),
          D = s.top + r * (1 - G);
        $ += R === 0 ? `${B},${D}` : ` L ${B},${D}`;
      }
      if (
        (o.length >= 2 &&
          (m += `<path d="${$}" fill="none" stroke="${this.options.impressionsColor}" stroke-width="3" />`),
        o.length <= 30)
      )
        for (let R = 0; R < o.length; R++) {
          const F = a[R],
            k = o[R].getTime(),
            B = s.left + h * ((k - C) / S),
            G = Math.min(F / n, 1),
            D = s.top + r * (1 - G);
          m += `<circle cx="${B}" cy="${D}" r="3" fill="${this.options.impressionsColor}" />`;
        }
    }
    const f = s.left + 20,
      x = s.top + 10;
    ((m += `<rect x="${f}" y="${x}" width="15" height="3" fill="${this.options.impressionsColor}" />`),
      (m += `<text x="${f + 20}" y="${x + 1.5}" text-anchor="start" alignment-baseline="middle" font-family="monospace" font-size="${this.getResponsiveFontSize()}px">Impressions</text>`),
      (this.svg.innerHTML = `
            <g class="grid-lines">${(this.options.gridLines && ((v = m.match(/<line[^>]*class="grid-line"[^>]*\/>/g)) == null ? void 0 : v.join(""))) || ""}</g>
            <g class="axes">${((w = m.match(/<line[^>]*class="axis-line"[^>]*\/>/g)) == null ? void 0 : w.join("")) || ""}${((y = m.match(/<text[^>]*>[^<]*<\/text>/g)) == null ? void 0 : y.join("")) || ""}</g>
            <g class="data-lines">${((g = m.match(/<path[^>]*\/>/g)) == null ? void 0 : g.join("")) || ""}${((L = m.match(/<circle[^>]*\/>/g)) == null ? void 0 : L.join("")) || ""}</g>
            <g class="legend">${((T = m.match(/<rect[^>]*\/>/g)) == null ? void 0 : T.join("")) || ""}${((A = m.match(/<text[^>]*>Impressions<\/text>/g)) == null ? void 0 : A.join("")) || ""}</g>
        `),
      (this.gridGroup = this.svg.querySelector(".grid-lines")),
      (this.axisGroup = this.svg.querySelector(".axes")),
      (this.dataGroup = this.svg.querySelector(".data-lines")),
      (this.legendGroup = this.svg.querySelector(".legend")));
  }
  updateStats() {
    if (!this.elements) return;
    const t = (s) => s.toLocaleString();
    this.elements.impressionsValue.textContent = t(
      this.state.currentValues.impressions,
    );
    const e = this.getResponsiveFontSize();
    this.elements.statsContainer.style.fontSize = `${e}px`;
  }
  updateDateDisplay(t) {
    if (!this.elements || !t) return;
    const e = { year: "numeric", month: "short", day: "numeric" },
      s = t.toLocaleDateString(void 0, e);
    this.elements.dateContainer.textContent = s;
    const i = this.getResponsiveFontSize();
    this.elements.dateContainer.style.fontSize = `${i * 0.67}px`;
  }
  setAttributesNS(t, e) {
    for (const [s, i] of Object.entries(e)) t.setAttribute(s, i);
  }
  destroy() {
    (this.stopAnimation(),
      window.removeEventListener("resize", this.handleResize),
      (this.containerElement.innerHTML = ""));
  }
}
class st {
  constructor(t) {
    ((this.container = document.querySelector(`[data-id="${t}"]`)),
      (this.patterns = [
        [
          [1, 1, 1, 1],
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 1],
        ],
        [
          [0, 1, 1, 0],
          [1, 0, 0, 1],
          [1, 1, 1, 1],
          [1, 0, 0, 1],
          [1, 0, 0, 1],
        ],
        [
          [1, 1, 1, 1],
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 1],
        ],
        [
          [1, 0, 0, 1],
          [1, 0, 0, 1],
          [1, 1, 1, 1],
          [1, 0, 0, 1],
          [1, 0, 0, 1],
        ],
        [
          [1, 1, 1, 1],
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [1, 1, 1, 1],
        ],
        [
          [1, 0, 0, 1],
          [1, 1, 0, 1],
          [1, 0, 1, 1],
          [1, 0, 0, 1],
          [1, 0, 0, 1],
        ],
        [
          [1, 1, 1, 1],
          [1, 0, 0, 0],
          [1, 0, 1, 1],
          [1, 0, 0, 1],
          [1, 1, 1, 1],
        ],
      ]),
      (this.rows = 5),
      (this.colsPerLetter = 4),
      (this.cellDelay = 50),
      (this.gapRatio = 0.08),
      (this.maxCells = Math.max(
        ...this.patterns.map((s) => s.flat().filter((i) => i === 1).length),
      )),
      (this.letterDelay = this.maxCells * this.cellDelay + 100),
      (this.filledCells = []),
      this.setupContainer(),
      this.buildCells(),
      this.updateLayout(),
      window.addEventListener("resize", () => this.updateLayout()));
    const e = this.patterns.length * this.letterDelay + 100;
    setTimeout(() => this.startSwapping(), e);
  }
  totalCols() {
    return (
      this.patterns.length * this.colsPerLetter + (this.patterns.length - 1)
    );
  }
  setupContainer() {
    ((this.container.style.display = "grid"),
      (this.container.style.width = "100%"),
      (this.container.style.maxWidth = "100%"));
  }
  buildCells() {
    const t = this.totalCols();
    for (let e = 0; e < this.rows; e++)
      for (let s = 0; s < t; s++) {
        const i = Math.floor(s / (this.colsPerLetter + 1)),
          n = s % (this.colsPerLetter + 1),
          a = n !== this.colsPerLetter && this.patterns[i][e][n] === 1,
          o = document.createElement("div");
        if (
          ((o.style.aspectRatio = "1"),
          (o.style.transform = "scale(0)"),
          (o.style.transition = "transform .2s ease-out"),
          (o.dataset.row = e),
          (o.dataset.col = s),
          a)
        ) {
          const l =
              this.patterns[i]
                .slice(0, e)
                .reduce((h, r) => h + r.filter((d) => d === 1).length, 0) +
              this.patterns[i][e].slice(0, n).filter((h) => h === 1).length,
            c = i * this.letterDelay + l * this.cellDelay;
          ((o.style.background = I.getRandomColor()),
            (o.dataset.filled = "true"),
            this.filledCells.push(o),
            setTimeout(() => (o.style.transform = "scale(1)"), c));
        }
        this.container.appendChild(o);
      }
  }
  updateLayout() {
    const t = this.container.clientWidth,
      e = this.totalCols(),
      s = this.gapRatio,
      i = t / (e + (e - 1) * s),
      n = i * s;
    ((this.container.style.gridTemplateColumns = `repeat(${e}, ${i}px)`),
      (this.container.style.gridAutoRows = `${i}px`),
      (this.container.style.gap = `${n}px`),
      (this.container.style.marginTop = `${i * 2.545}px`),
      (this.container.style.marginBottom = `${i * 2.545}px`));
  }
  startSwapping() {
    (this.filledCells.forEach((t) => {
      t.style.transition =
        "transform 1s ease-in-out, background 1s ease-in-out";
    }),
      setInterval(() => this.swapRandomPair(), 2e3));
  }
  findNeighbors(t) {
    const e = parseInt(t.dataset.row),
      s = parseInt(t.dataset.col),
      i = [],
      n = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ];
    for (const [a, o] of n) {
      const l = e + a,
        c = s + o;
      if (l < 0 || l >= this.rows || c < 0 || c >= this.totalCols()) continue;
      const h = this.container.querySelector(
        `[data-row="${l}"][data-col="${c}"][data-filled="true"]`,
      );
      h && i.push(h);
    }
    return i;
  }
  swapRandomPair() {
    if (this.filledCells.length < 2) return;
    const t = Math.floor(Math.random() * this.filledCells.length),
      e = this.filledCells[t],
      s = this.findNeighbors(e);
    if (s.length === 0) {
      this.swapRandomPair();
      return;
    }
    const i = s[Math.floor(Math.random() * s.length)];
    this.swapCells(e, i);
  }
  swapCells(t, e) {
    const s = parseInt(t.dataset.row),
      i = parseInt(t.dataset.col),
      n = parseInt(e.dataset.row),
      a = parseInt(e.dataset.col),
      o = t.getBoundingClientRect(),
      l = e.getBoundingClientRect(),
      c = l.left - o.left,
      h = l.top - o.top;
    ((t.style.zIndex = "10"),
      (e.style.zIndex = "10"),
      (t.style.transform = `translate(${c}px, ${h}px)`),
      (e.style.transform = `translate(${-c}px, ${-h}px)`),
      setTimeout(() => {
        ((t.style.transform = ""), (e.style.transform = ""));
        const r = this.container;
        Array.from(r.children);
        const d = Array.from(r.children).indexOf(t),
          p = Array.from(r.children).indexOf(e),
          m = document.createElement("div");
        ((m.style.display = "none"),
          d < p
            ? (r.insertBefore(m, t),
              r.insertBefore(t, e.nextSibling),
              r.insertBefore(e, m.nextSibling))
            : (r.insertBefore(m, e),
              r.insertBefore(e, t.nextSibling),
              r.insertBefore(t, m.nextSibling)),
          r.removeChild(m),
          (t.dataset.row = n),
          (t.dataset.col = a),
          (e.dataset.row = s),
          (e.dataset.col = i),
          (t.style.zIndex = ""),
          (e.style.zIndex = ""));
        const f = this.filledCells.indexOf(t),
          x = this.filledCells.indexOf(e);
        f !== -1 &&
          x !== -1 &&
          ([this.filledCells[f], this.filledCells[x]] = [
            this.filledCells[x],
            this.filledCells[f],
          ]);
      }, 1e3));
  }
}
const it = {
  initializePostgresMode() {
    ((this.postgresMode = !1), this.setupPostgresModeToggle());
  },
  setupPostgresModeToggle() {
    const u = () => {
      const t = top.document.querySelector('iframe[src$="#postgres-toggle"]');
      if (!t || !t.contentWindow) {
        setTimeout(u, 100);
        return;
      }
      const e = t.contentWindow.document.getElementById("caching-pg-toggle");
      if (!e) {
        setTimeout(u, 100);
        return;
      }
      new MutationObserver((i) => {
        i.forEach((n) => {
          if (n.type === "childList" || n.type === "characterData") {
            const a = e.innerHTML == "true";
            ((this.postgresMode = a), this.onPostgresModeChange());
          }
        });
      }).observe(e, { childList: !0, subtree: !0, characterData: !0 });
    };
    u();
  },
  createPostgresSVG(u) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (t.setAttribute("width", "432.071pt"),
      t.setAttribute("height", "445.383pt"),
      t.setAttribute("viewBox", "0 0 432.071 445.383"),
      t.setAttribute("xml:space", "preserve"),
      (t.style.width = `${this.CELL_SIZE * 0.88}px`),
      (t.style.height = `${this.CELL_SIZE * 0.88}px`));
    const e = `
        <g id="orginal" style="fill-rule:nonzero;clip-rule:nonzero;stroke:#000000;stroke-miterlimit:4;">
        </g>
        <g id="Layer_x0020_3" style="fill-rule:nonzero;clip-rule:nonzero;fill:none;stroke:#FFFFFF;stroke-width:12.4651;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;">
        <path style="fill:#000000;stroke:#000000;stroke-width:37.3953;stroke-linecap:butt;stroke-linejoin:miter;" d="M323.205,324.227c2.833-23.601,1.984-27.062,19.563-23.239l4.463,0.392c13.517,0.615,31.199-2.174,41.587-7c22.362-10.376,35.622-27.7,13.572-23.148c-50.297,10.376-53.755-6.655-53.755-6.655c53.111-78.803,75.313-178.836,56.149-203.322    C352.514-5.534,262.036,26.049,260.522,26.869l-0.482,0.089c-9.938-2.062-21.06-3.294-33.554-3.496c-22.761-0.374-40.032,5.967-53.133,15.904c0,0-161.408-66.498-153.899,83.628c1.597,31.936,45.777,241.655,98.47,178.31    c19.259-23.163,37.871-42.748,37.871-42.748c9.242,6.14,20.307,9.272,31.912,8.147l0.897-0.765c-0.281,2.876-0.157,5.689,0.359,9.019c-13.572,15.167-9.584,17.83-36.723,23.416c-27.457,5.659-11.326,15.734-0.797,18.367c12.768,3.193,42.305,7.716,62.268-20.224    l-0.795,3.188c5.325,4.26,4.965,30.619,5.72,49.452c0.756,18.834,2.017,36.409,5.856,46.771c3.839,10.36,8.369,37.05,44.036,29.406c29.809-6.388,52.6-15.582,54.677-101.107"/>
        <path style="fill:${u};stroke:none;" d="M402.395,271.23c-50.302,10.376-53.76-6.655-53.76-6.655c53.111-78.808,75.313-178.843,56.153-203.326c-52.27-66.785-142.752-35.2-144.262-34.38l-0.486,0.087c-9.938-2.063-21.06-3.292-33.56-3.496c-22.761-0.373-40.026,5.967-53.127,15.902    c0,0-161.411-66.495-153.904,83.63c1.597,31.938,45.776,241.657,98.471,178.312c19.26-23.163,37.869-42.748,37.869-42.748c9.243,6.14,20.308,9.272,31.908,8.147l0.901-0.765c-0.28,2.876-0.152,5.689,0.361,9.019c-13.575,15.167-9.586,17.83-36.723,23.416    c-27.459,5.659-11.328,15.734-0.796,18.367c12.768,3.193,42.307,7.716,62.266-20.224l-0.796,3.188c5.319,4.26,9.054,27.711,8.428,48.969c-0.626,21.259-1.044,35.854,3.147,47.254c4.191,11.4,8.368,37.05,44.042,29.406c29.809-6.388,45.256-22.942,47.405-50.555c1.525-19.631,4.976-16.729,5.194-34.28l2.768-8.309c3.192-26.611,0.507-35.196,18.872-31.203l4.463,0.392c13.517,0.615,31.208-2.174,41.591-7c22.358-10.376,35.618-27.7,13.573-23.148z"/>
        <path d="M215.866,286.484c-1.385,49.516,0.348,99.377,5.193,111.495c4.848,12.118,15.223,35.688,50.9,28.045c29.806-6.39,40.651-18.756,45.357-46.051c3.466-20.082,10.148-75.854,11.005-87.281"/>
        <path d="M173.104,38.256c0,0-161.521-66.016-154.012,84.109c1.597,31.938,45.779,241.664,98.473,178.316c19.256-23.166,36.671-41.335,36.671-41.335"/>
        <path d="M260.349,26.207c-5.591,1.753,89.848-34.889,144.087,34.417c19.159,24.484-3.043,124.519-56.153,203.329"/>
        <path style="stroke-linejoin:bevel;" d="M348.282,263.953c0,0,3.461,17.036,53.764,6.653c22.04-4.552,8.776,12.774-13.577,23.155c-18.345,8.514-59.474,10.696-60.146-1.069c-1.729-30.355,21.647-21.133,19.96-28.739c-1.525-6.85-11.979-13.573-18.894-30.338    c-6.037-14.633-82.796-126.849,21.287-110.183c3.813-0.789-27.146-99.002-124.553-100.599c-97.385-1.597-94.19,119.762-94.19,119.762"/>
        <path d="M188.604,274.334c-13.577,15.166-9.584,17.829-36.723,23.417c-27.459,5.66-11.326,15.733-0.797,18.365c12.768,3.195,42.307,7.718,62.266-20.229c6.078-8.509-0.036-22.086-8.385-25.547c-4.034-1.671-9.428-3.765-16.361,3.994z"/>
        <path d="M187.715,274.069c-1.368-8.917,2.93-19.528,7.536-31.942c6.922-18.626,22.893-37.255,10.117-96.339c-9.523-44.029-73.396-9.163-73.436-3.193c-0.039,5.968,2.889,30.26-1.067,58.548c-5.162,36.913,23.488,68.132,56.479,64.938"/>
        <path style="fill:#FFFFFF;stroke-width:4.155;stroke-linecap:butt;stroke-linejoin:miter;" d="M172.517,141.7c-0.288,2.039,3.733,7.48,8.976,8.207c5.234,0.73,9.714-3.522,9.998-5.559c0.284-2.039-3.732-4.285-8.977-5.015c-5.237-0.731-9.719,0.333-9.996,2.367z"/>
        <path style="fill:#FFFFFF;stroke-width:2.0775;stroke-linecap:butt;stroke-linejoin:miter;" d="M331.941,137.543c0.284,2.039-3.732,7.48-8.976,8.207c-5.238,0.73-9.718-3.522-10.005-5.559c-0.277-2.039,3.74-4.285,8.979-5.015c5.239-0.73,9.718,0.333,10.002,2.368z"/>
        <path d="M350.676,123.432c0.863,15.994-3.445,26.888-3.988,43.914c-0.804,24.748,11.799,53.074-7.191,81.435"/>
        <path style="stroke-width:3;" d="M0,60.232"/>
        </g>`;
    return ((t.innerHTML = e), t);
  },
  applyCellStyle(u, t, e = !0) {
    if (this.postgresMode && t) {
      ((u.style.backgroundColor = "transparent"),
        (u.style.border = e ? "none" : ""),
        (u.style.display = "flex"),
        (u.style.alignItems = "center"),
        (u.style.justifyContent = "center"));
      const s = this.createPostgresSVG(t);
      u.appendChild(s);
    } else
      ((u.style.backgroundColor = t || "transparent"),
        e &&
          this.themeColors &&
          (u.style.border = `1px solid ${this.themeColors.componentBorder}`),
        (u.style.display = "flex"),
        (u.style.alignItems = "center"),
        (u.style.justifyContent = "center"));
  },
  onPostgresModeChange() {
    (this.renderCache && this.renderCache(),
      this.renderCaches && this.renderCaches(),
      this.renderDatabase && this.renderDatabase(),
      this.renderDatabaseGrid && this.renderDatabaseGrid());
  },
};
function O(u) {
  Object.assign(u.prototype, it);
}
class j {
  constructor(
    t,
    e = 5,
    s = 6,
    i = 2,
    n = 3,
    a = "Cache",
    o = "Requester",
    l = "Database",
    c = !1,
    h = 1,
  ) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.config = {
      databaseRows: e,
      databaseCols: s,
      cacheRows: i,
      cacheCols: n,
      cacheLabel: a,
      requesterLabel: o,
      databaseLabel: l,
      prewarmCache: !!c,
      spatialDistance: h || 1,
    }),
      (this.paletteColors = I.getColors()),
      (this.BASE_CELL_SIZE = 40),
      (this.BASE_REQUEST_SIZE = 25),
      (this.BASE_MARGIN = 16),
      (this.CELL_SIZE = this.BASE_CELL_SIZE),
      (this.REQUEST_SIZE = this.BASE_REQUEST_SIZE),
      (this.MARGIN = this.BASE_MARGIN),
      (this.cache = []),
      (this.cacheNumbers = []),
      (this.cacheOrder = []),
      (this.roundRobinIndex = 0),
      (this.databaseColors = []),
      (this.databaseNumbers = []),
      (this.activeRequests = []),
      (this.nextRequestId = 1),
      (this.stats = { cacheHits: 0, cacheMisses: 0 }),
      (this.events = new EventTarget()),
      (this.elements = {}),
      this.updateThemeColors(),
      this.initializePostgresMode(),
      this.initialize());
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    if (!this.containerElement) return;
    const t = this.themeColors;
    (this.elements.mainContainer &&
      ((this.elements.mainContainer.style.color = t.text),
      (this.elements.mainContainer.style.backgroundColor = "transparent")),
      this.elements.requester &&
        (this.elements.requester.style.backgroundColor = t.componentBackground),
      this.elements.cache &&
        (this.elements.cache.style.backgroundColor = t.componentBackground),
      this.elements.database &&
        (this.elements.database.style.backgroundColor = t.componentBackground),
      this.containerElement
        .querySelectorAll('[style*="color"]')
        .forEach((i) => {
          i.style.color &&
            i.style.color !== "white" &&
            (i.style.color = t.text);
        }),
      this.containerElement
        .querySelectorAll('[style*="border"]')
        .forEach((i) => {
          i.style.border &&
            i.style.border.includes("cbd5e0") &&
            (i.style.border = `1px solid ${t.componentBorder}`);
        }),
      this.renderCache(),
      this.renderDatabaseGrid());
  }
  initialize() {
    (this.updateSizesForScreenWidth(),
      this.createAnimationStyles(),
      this.createDOMStructure(),
      this.applyStyles(),
      this.generateDatabaseColors(),
      this.initializeCache(),
      this.config.prewarmCache && this.prewarmCache(),
      this.renderCache(),
      this.renderDatabaseGrid(),
      this.updateContainerSizes(),
      this.addEventListeners(),
      this.setupThemeListener());
  }
  createAnimationStyles() {
    const t = `caching-animation-styles-${Math.random().toString(36).substr(2, 9)}`;
    let e = document.getElementById(t);
    if (!e) {
      ((e = document.createElement("style")), (e.id = t));
      const s = `
                /* Force all animated elements onto compositing layers for Safari */
                .appear, .disappear, .pulse, .move, .hit-text,
                .request-circle, .neighbor-marker, .cache-data, .db-data,
                .cache-clone, .requester-data {
                    will-change: transform, opacity;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    -webkit-perspective: 1000px;
                    perspective: 1000px;
                }
                
                /* Keep parent containers on compositing layers too */
                .visualization, .visualizationInner {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                @keyframes appear {
                    0% { transform: translateZ(0) scale(0); opacity: 0; }
                    100% { transform: translateZ(0) scale(1); opacity: 1; }
                }
                
                @keyframes disappear {
                    0% { transform: translateZ(0) scale(1); opacity: 1; }
                    100% { transform: translateZ(0) scale(0); opacity: 0; }
                }
                
                @keyframes pulse {
                    0% { transform: translateZ(0) scale(1); }
                    50% { transform: translateZ(0) scale(0.8); }
                    100% { transform: translateZ(0) scale(1); }
                }
                
                @keyframes hitTextAnimation {
                    0% { transform: translateZ(0) translateY(0); opacity: 0; }
                    20% { transform: translateZ(0) translateY(0); opacity: 1; }
                    80% { transform: translateZ(0) translateY(-20px); opacity: 0.7; }
                    100% { transform: translateZ(0) translateY(-30px); opacity: 0; }
                }
                
                .appear { animation: appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .disappear { animation: disappear 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
                .pulse { animation: pulse 1s ease-in-out; }
                .move { transition: left 0.8s ease-in-out, top 0.8s ease-in-out; }
                .hit-text { animation: hitTextAnimation 1s ease-out forwards; }
                
                /* Remove drop shadows from animation elements */
            `;
      ((e.textContent = s), document.head.appendChild(e));
    }
  }
  createDOMStructure() {
    ((this.containerElement.innerHTML = ""),
      (this.elements.mainContainer = document.createElement("div")),
      this.containerElement.appendChild(this.elements.mainContainer),
      (this.elements.visualization = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.visualization),
      (this.elements.visualizationInner = document.createElement("div")),
      this.elements.visualization.appendChild(this.elements.visualizationInner),
      (this.elements.requesterContainer = document.createElement("div")),
      this.elements.visualizationInner.appendChild(
        this.elements.requesterContainer,
      ),
      (this.elements.requester = document.createElement("div")),
      this.elements.requesterContainer.appendChild(this.elements.requester),
      (this.elements.requesterLabel = document.createElement("div")),
      (this.elements.requesterLabel.textContent = this.config.requesterLabel),
      this.elements.requester.appendChild(this.elements.requesterLabel),
      (this.elements.cacheContainer = document.createElement("div")),
      this.elements.visualizationInner.appendChild(
        this.elements.cacheContainer,
      ),
      (this.elements.cache = document.createElement("div")),
      this.elements.cacheContainer.appendChild(this.elements.cache),
      (this.elements.cacheGrid = document.createElement("div")),
      this.elements.cache.appendChild(this.elements.cacheGrid),
      (this.elements.cacheLabel = document.createElement("div")),
      (this.elements.cacheLabel.textContent = this.config.cacheLabel),
      this.elements.cacheContainer.appendChild(this.elements.cacheLabel),
      (this.elements.databaseContainer = document.createElement("div")),
      this.elements.visualizationInner.appendChild(
        this.elements.databaseContainer,
      ),
      (this.elements.database = document.createElement("div")),
      this.elements.databaseContainer.appendChild(this.elements.database),
      (this.elements.databaseGrid = document.createElement("div")),
      this.elements.database.appendChild(this.elements.databaseGrid),
      (this.elements.databaseLabel = document.createElement("div")),
      (this.elements.databaseLabel.textContent = this.config.databaseLabel),
      this.elements.databaseContainer.appendChild(this.elements.databaseLabel));
  }
  applyStyles() {
    (this.setStyles(this.containerElement, {
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
    }),
      this.setStyles(this.elements.mainContainer, {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0",
        color: this.themeColors.text,
        backgroundColor: "transparent",
      }),
      this.setStyles(this.elements.visualization, {
        position: "relative",
        width: "100%",
        marginBottom: "0",
        overflow: "hidden",
      }),
      this.setStyles(this.elements.visualizationInner, {
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        height: `${420 * (this.SCALE_FACTOR || 1)}px`,
        padding: "0",
      }),
      this.setStyles(this.elements.requesterContainer, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
      this.setStyles(this.elements.requester, {
        backgroundColor: this.themeColors.componentBackground,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s",
        position: "relative",
        userSelect: "none",
        webkitUserSelect: "none",
        mozUserSelect: "none",
        msUserSelect: "none",
      }),
      this.setStyles(this.elements.requesterLabel, {
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)",
        position: "absolute",
        color: this.themeColors.text,
        textAlign: "center",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        userSelect: "none",
        pointerEvents: "none",
      }),
      this.setStyles(this.elements.cacheContainer, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
      this.setStyles(this.elements.cache, {
        backgroundColor: this.themeColors.componentBackground,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        marginBottom: `${15 * (this.SCALE_FACTOR || 1)}px`,
      }),
      this.setStyles(this.elements.cacheLabel, {
        textAlign: "center",
        marginTop: "5px",
        color: this.themeColors.text,
        width: "100%",
        display: "block",
        padding: "5px 0",
        height: "25px",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        userSelect: "none",
        pointerEvents: "none",
      }),
      this.setStyles(this.elements.cacheGrid, {
        display: "grid",
        width: "fit-content",
        height: "fit-content",
        margin: "0 auto",
      }),
      this.setStyles(this.elements.databaseContainer, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
      this.setStyles(this.elements.database, {
        backgroundColor: this.themeColors.componentBackground,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        marginBottom: `${15 * (this.SCALE_FACTOR || 1)}px`,
      }),
      this.setStyles(this.elements.databaseLabel, {
        textAlign: "center",
        marginTop: "5px",
        color: this.themeColors.text,
        width: "100%",
        display: "block",
        padding: "5px 0",
        height: "25px",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        userSelect: "none",
        pointerEvents: "none",
      }),
      this.setStyles(this.elements.databaseGrid, {
        display: "grid",
        width: "fit-content",
        height: "fit-content",
        margin: "0 auto",
      }));
    const t = this.elements.requester;
    (t.addEventListener(
      "mouseenter",
      () => (t.style.backgroundColor = this.themeColors.componentHighlight),
    ),
      t.addEventListener(
        "mouseleave",
        () => (t.style.backgroundColor = this.themeColors.componentBackground),
      ));
  }
  setStyles(t, e) {
    Object.assign(t.style, e);
  }
  updateSizesForScreenWidth() {
    const t = window.innerWidth,
      e = t < 640 ? 0.7 : 1;
    ((this.CELL_SIZE = Math.floor(this.BASE_CELL_SIZE * e)),
      (this.REQUEST_SIZE = Math.floor(this.BASE_REQUEST_SIZE * e)),
      (this.MARGIN = Math.floor(this.BASE_MARGIN * e)),
      (this.SCALE_FACTOR = e),
      (this.BASE_LABEL_FONT_SIZE = t < 640 ? 11 : 19));
  }
  generateDatabaseColors() {
    ((this.databaseColors = []), (this.databaseNumbers = []));
    const t = this.config.databaseRows * this.config.databaseCols;
    for (let e = 0; e < t; e++) this.databaseNumbers.push(e + 1);
    for (let e = 0; e < t; e++) {
      const s = e % this.paletteColors.length;
      this.databaseColors.push(this.paletteColors[s]);
    }
    this.shuffleArray(this.databaseColors);
  }
  shuffleArray(t) {
    for (let e = t.length - 1; e > 0; e--) {
      const s = Math.floor(Math.random() * (e + 1));
      [t[e], t[s]] = [t[s], t[e]];
    }
    return t;
  }
  initializeCache() {
    const t = this.config.cacheRows * this.config.cacheCols;
    ((this.cache = Array(t).fill(null)),
      (this.cacheNumbers = Array(t).fill(null)),
      (this.cacheOrder = Array(t).fill(null)));
  }
  prewarmCache() {
    const t = this.cache.length,
      s = Math.floor(t * 1),
      i = Array.from({ length: this.databaseColors.length }, (n, a) => a);
    this.shuffleArray(i);
    for (let n = 0; n < s && n < i.length; n++) {
      const a = i[n],
        o = this.databaseColors[a],
        l = this.databaseNumbers[a];
      ((this.cache[n] = o),
        (this.cacheNumbers[n] = l),
        this.updateCacheOrder(n, o));
    }
  }
  renderCache() {
    const t = this.elements.cacheGrid;
    ((t.innerHTML = ""),
      this.setStyles(t, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(${this.config.cacheRows}, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(${this.config.cacheCols}, ${this.CELL_SIZE}px)`,
      }));
    for (let e = 0; e < this.cache.length; e++) {
      const s = document.createElement("div"),
        i = this.cache[e],
        n = this.cacheNumbers[e];
      if (
        (this.setStyles(s, {
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          boxSizing: "border-box",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: "bold",
          color: "#FFFFFF",
          fontFamily: "monospace",
          fontSize: `${22.5 * (this.SCALE_FACTOR || 1)}px`,
          boxShadow: "none",
        }),
        s.setAttribute("data-index", e),
        this.applyCellStyle(s, i, !0),
        n !== null)
      )
        if (this.postgresMode && i) {
          const a = document.createElement("div");
          ((a.textContent = n),
            (a.style.position = "absolute"),
            (a.style.top = "50%"),
            (a.style.left = "50%"),
            (a.style.transform = "translate(-50%, -50%)"),
            (a.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`),
            (a.style.fontWeight = "bold"),
            (a.style.color = "#FFFFFF"),
            (a.style.fontFamily = "monospace"),
            (a.style.textShadow =
              "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)"),
            (a.style.pointerEvents = "none"),
            (a.style.zIndex = "10"),
            s.appendChild(a));
        } else s.textContent = n;
      t.appendChild(s);
    }
  }
  getContrastingTextColor(t) {
    if (!t) return "#000000";
    let e, s, i;
    if (t.startsWith("rgb")) {
      const a = t.match(/\d+/g);
      ((e = parseInt(a[0])), (s = parseInt(a[1])), (i = parseInt(a[2])));
    } else if (t.startsWith("#")) {
      const a = t.substring(1);
      ((e = parseInt(a.substring(0, 2), 16)),
        (s = parseInt(a.substring(2, 4), 16)),
        (i = parseInt(a.substring(4, 6), 16)));
    } else return "#000000";
    return (0.299 * e + 0.587 * s + 0.114 * i) / 255 > 0.5
      ? "#000000"
      : "#FFFFFF";
  }
  renderDatabaseGrid() {
    const t = this.elements.databaseGrid;
    ((t.innerHTML = ""),
      this.setStyles(t, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(${this.config.databaseRows}, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(${this.config.databaseCols}, ${this.CELL_SIZE}px)`,
      }));
    for (let e = 0; e < this.databaseColors.length; e++) {
      const s = document.createElement("div"),
        i = this.databaseNumbers[e];
      if (
        (this.setStyles(s, {
          backgroundColor: this.databaseColors[e],
          width: `${this.CELL_SIZE}px`,
          height: `${this.CELL_SIZE}px`,
          cursor: "pointer",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: "bold",
          color: "#FFFFFF",
          fontFamily: "monospace",
          fontSize: `${22.5 * (this.SCALE_FACTOR || 1)}px`,
          boxShadow: "none",
        }),
        s.setAttribute("data-index", e),
        s.setAttribute("data-number", i),
        this.applyCellStyle(s, this.databaseColors[e], !0),
        this.postgresMode && this.databaseColors[e])
      ) {
        const n = document.createElement("div");
        ((n.textContent = i),
          (n.style.position = "absolute"),
          (n.style.top = "50%"),
          (n.style.left = "50%"),
          (n.style.transform = "translate(-50%, -50%)"),
          (n.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`),
          (n.style.fontWeight = "bold"),
          (n.style.color = "#FFFFFF"),
          (n.style.fontFamily = "monospace"),
          (n.style.textShadow =
            "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)"),
          (n.style.pointerEvents = "none"),
          (n.style.zIndex = "10"),
          s.appendChild(n));
      } else s.textContent = i;
      (s.addEventListener("click", (n) => {
        const a = parseInt(n.currentTarget.getAttribute("data-index"));
        this.requestSpecificColor(a);
      }),
        (s.style.userSelect = "none"),
        (s.style.webkitUserSelect = "none"),
        (s.style.mozUserSelect = "none"),
        (s.style.msUserSelect = "none"),
        t.appendChild(s));
    }
  }
  isColorInCache(t) {
    return this.cache.includes(t);
  }
  findDatabaseIndexByColor(t) {
    return this.databaseColors.indexOf(t);
  }
  requestSpecificColor(t) {
    const e = this.databaseColors[t],
      s = this.databaseNumbers[t],
      i = this.getSpatialNeighborIndices(t),
      n = this.elements.requester.getBoundingClientRect(),
      a = this.elements.cache.getBoundingClientRect(),
      o = this.elements.database.getBoundingClientRect(),
      l = this.elements.visualization.getBoundingClientRect(),
      c = { x: n.left - l.left + n.width / 2, y: n.top - l.top + n.height / 2 },
      h = this.nextRequestId++,
      r = `request-${h}`,
      d = document.createElement("div");
    ((d.className = `request-circle ${r}`),
      (d.style.position = "absolute"),
      (d.style.width = `${this.REQUEST_SIZE}px`),
      (d.style.height = `${this.REQUEST_SIZE}px`),
      (d.style.zIndex = "20"),
      (d.style.left = c.x - this.REQUEST_SIZE / 2 + "px"),
      (d.style.top = c.y - this.REQUEST_SIZE / 2 + "px"),
      (d.style.transform = "translateZ(0) scale(0)"),
      (d.style.opacity = "0"),
      (d.style.display = "flex"),
      (d.style.alignItems = "center"),
      (d.style.justifyContent = "center"),
      (d.style.willChange = "transform, opacity"),
      d.setAttribute("data-number", s),
      (d.style.backgroundColor = e),
      (d.style.borderRadius = "50%"));
    const p = document.createElement("div");
    ((p.textContent = s),
      (p.style.position = "absolute"),
      (p.style.top = "50%"),
      (p.style.left = "50%"),
      (p.style.transform = "translate(-50%, -50%)"),
      (p.style.color = "#FFFFFF"),
      (p.style.fontWeight = "bold"),
      (p.style.fontSize = `${16.875 * (this.SCALE_FACTOR || 1)}px`),
      (p.style.fontFamily = "monospace"),
      (p.style.textShadow =
        "1px 1px 2px rgba(0,0,0,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.3)"),
      (p.style.pointerEvents = "none"),
      (p.style.zIndex = "10"),
      d.appendChild(p),
      this.elements.visualization.appendChild(d));
    const m = {
      id: h,
      color: e,
      number: s,
      dbIndex: t,
      neighborIndices: i,
      element: d,
      startTime: Date.now(),
      targetCacheIndex: -1,
      class: r,
    };
    (this.activeRequests.push(m),
      d.classList.add("appear"),
      setTimeout(() => {
        this.checkCache(h, d, e, s, t, i, c, a, o, l);
      }, 300));
  }
  getSpatialNeighborIndices(t) {
    const e = this.config.spatialDistance,
      s = this.databaseNumbers.length,
      i = this.databaseNumbers[t],
      n = [];
    for (let a = 1; a <= e; a++) {
      if (i - a >= 1) {
        const o = this.databaseNumbers.indexOf(i - a);
        o !== -1 && n.push(o);
      }
      if (i + a <= s) {
        const o = this.databaseNumbers.indexOf(i + a);
        o !== -1 && n.push(o);
      }
    }
    return n;
  }
  getCacheCenter(t, e) {
    return {
      x: t.left - e.left + t.width / 2,
      y: t.top - e.top + t.height / 2,
    };
  }
  getCellPosition(t, e, s) {
    const i = Math.floor(t / this.config.cacheCols),
      n = t % this.config.cacheCols,
      a =
        this.config.cacheCols * this.CELL_SIZE +
        (this.config.cacheCols - 1) * this.MARGIN,
      o =
        this.config.cacheRows * this.CELL_SIZE +
        (this.config.cacheRows - 1) * this.MARGIN,
      l = e.left - s.left + (e.width - a) / 2,
      c = e.top - s.top + (e.height - o) / 2,
      h = l + n * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2,
      r = c + i * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2;
    return { x: h, y: r };
  }
  getDatabaseCellPosition(t, e, s) {
    const i = Math.floor(t / this.config.databaseCols),
      n = t % this.config.databaseCols,
      a =
        this.config.databaseCols * this.CELL_SIZE +
        (this.config.databaseCols - 1) * this.MARGIN,
      o =
        this.config.databaseRows * this.CELL_SIZE +
        (this.config.databaseRows - 1) * this.MARGIN,
      l = e.left - s.left + (e.width - a) / 2,
      c = e.top - s.top + (e.height - o) / 2,
      h = l + n * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2,
      r = c + i * (this.CELL_SIZE + this.MARGIN) + this.CELL_SIZE / 2;
    return { x: h, y: r };
  }
  updateContainerSizes() {
    this.updateSizesForScreenWidth();
    const t = this.elements.visualizationInner,
      e = 30,
      s = this.CELL_SIZE + this.MARGIN,
      i = this.config.databaseCols * s + this.MARGIN,
      n = this.config.databaseRows * s + this.MARGIN,
      a = this.config.cacheCols * s + this.MARGIN,
      o = this.config.cacheRows * s + this.MARGIN;
    ((this.elements.database.style.width = i + "px"),
      (this.elements.database.style.height = n + "px"),
      (this.elements.cache.style.width = a + "px"),
      (this.elements.cache.style.height = o + "px"));
    const l = Math.max(n, o),
      c = l + e,
      h = this.CELL_SIZE + this.MARGIN * 2;
    ((this.elements.requesterContainer.style.width = h + "px"),
      (this.elements.requester.style.width = h + "px"),
      (this.elements.requester.style.height = l + "px"));
    const r = (l - o) / 2;
    this.elements.cacheContainer.style.paddingTop = r + "px";
    const d = (l - n) / 2;
    ((this.elements.databaseContainer.style.paddingTop = d + "px"),
      (t.style.height = c + 20 + "px"),
      (t.style.justifyContent = "space-between"),
      this.renderCache(),
      this.renderDatabaseGrid());
    const p = `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`;
    ((this.elements.requesterLabel.style.fontSize = p),
      (this.elements.cacheLabel.style.fontSize = p),
      (this.elements.databaseLabel.style.fontSize = p));
  }
  addEventListeners() {
    (this.elements.requester.addEventListener(
      "click",
      this.handleRequest.bind(this),
    ),
      window.addEventListener("resize", this.updateContainerSizes.bind(this)));
  }
  handleRequest() {
    const t = Math.floor(Math.random() * this.databaseColors.length);
    t !== -1 && this.requestSpecificColor(t);
  }
  checkCache(t, e, s, i, n, a, o, l, c, h) {
    const r = this.cache.indexOf(s);
    let d;
    (r !== -1
      ? (d = this.getCellPosition(r, l, h))
      : (d = this.getCacheCenter(l, h)),
      e.classList.add("move"),
      (e.style.left = d.x - this.REQUEST_SIZE / 2 + "px"),
      (e.style.top = d.y - this.REQUEST_SIZE / 2 + "px"));
    const p = [];
    for (let m = 0; m < a.length; m++) {
      const f = a[m],
        x = this.databaseColors[f];
      this.cache.includes(x) || p.push(f);
    }
    setTimeout(() => {
      r !== -1
        ? (this.stats.cacheHits++,
          this.events.dispatchEvent(
            new CustomEvent("cacheHit", {
              detail: { color: s, number: i, message: "Value found in cache" },
            }),
          ),
          p.length > 0
            ? this.handleCacheHitWithNeighbors(t, e, s, i, r, p, o, l, c, h)
            : this.handleCacheHit(t, e, s, i, r, o, l, h))
        : (this.stats.cacheMisses++,
          this.events.dispatchEvent(
            new CustomEvent("cacheMiss", {
              detail: {
                color: s,
                number: i,
                dbIndex: n,
                message: "Value not found in cache",
              },
            }),
          ),
          this.prepareAndHandleCacheMiss(t, e, s, i, n, a, o, l, c, h));
    }, 500);
  }
  handleCacheHitWithNeighbors(t, e, s, i, n, a, o, l, c, h) {
    (this.loadNeighborsIntoCache(a, l, c, h),
      this.handleCacheHit(t, e, s, i, n, o, l, h));
  }
  loadNeighborsIntoCache(t, e, s, i) {
    t.length !== 0 &&
      t.forEach((n) => {
        const a = this.databaseColors[n],
          o = this.databaseNumbers[n],
          c = `request-${`neighbor-${this.nextRequestId++}`}`,
          h = this.determineCacheSlot(a),
          r = this.getDatabaseCellPosition(n, s, i),
          d = this.getCellPosition(h, e, i),
          p = document.createElement("div");
        if (
          ((p.className = `neighbor-marker ${c}`),
          (p.style.position = "absolute"),
          (p.style.width = `${this.CELL_SIZE}px`),
          (p.style.height = `${this.CELL_SIZE}px`),
          (p.style.zIndex = "15"),
          (p.style.left = r.x - this.CELL_SIZE / 2 + "px"),
          (p.style.top = r.y - this.CELL_SIZE / 2 + "px"),
          (p.style.transform = "translateZ(0) scale(0)"),
          (p.style.opacity = "0"),
          (p.style.display = "flex"),
          (p.style.alignItems = "center"),
          (p.style.justifyContent = "center"),
          (p.style.fontWeight = "bold"),
          (p.style.willChange = "transform, opacity"),
          p.setAttribute("data-number", o),
          this.applyCellStyle(p, a, !1),
          this.postgresMode && a)
        ) {
          const m = document.createElement("div");
          ((m.textContent = o),
            (m.style.position = "absolute"),
            (m.style.top = "50%"),
            (m.style.left = "50%"),
            (m.style.transform = "translate(-50%, -50%)"),
            (m.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`),
            (m.style.fontWeight = "bold"),
            (m.style.color = "#FFFFFF"),
            (m.style.fontFamily = "monospace"),
            (m.style.textShadow =
              "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)"),
            (m.style.pointerEvents = "none"),
            (m.style.zIndex = "10"),
            p.appendChild(m));
        } else
          ((p.textContent = o),
            (p.style.color = "#FFFFFF"),
            (p.style.fontFamily = "monospace"),
            (p.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`));
        (this.elements.visualization.appendChild(p),
          p.classList.add("appear"),
          setTimeout(() => {
            (p.classList.add("move"),
              (p.style.left = d.x - this.CELL_SIZE / 2 + "px"),
              (p.style.top = d.y - this.CELL_SIZE / 2 + "px"),
              setTimeout(() => {
                ((this.cache[h] = a),
                  (this.cacheNumbers[h] = o),
                  this.updateCacheOrder(h, a),
                  this.renderCache(),
                  p.classList.add("disappear"),
                  setTimeout(() => {
                    p.remove();
                  }, 300));
              }, 500));
          }, 100));
      });
  }
  handleCacheHit(t, e, s, i, n, a, o, l) {
    const c = this.activeRequests.find((r) => r.id === t);
    if (!c) return;
    const h = this.getCellPosition(n, o, l);
    setTimeout(() => {
      const r = this.createAnimatedDataElement(
        `cache-data ${c.class}`,
        s,
        i,
        h.x,
        h.y,
        0,
        0,
      );
      ((r.style.zIndex = "10"),
        this.elements.visualization.appendChild(r),
        e.classList.add("disappear"),
        r.classList.add("appear"),
        this.updateCacheOrder(n, s),
        setTimeout(() => {
          (e.remove(),
            r.classList.add("move"),
            (r.style.left = a.x - this.CELL_SIZE / 2 + "px"),
            (r.style.top = a.y - this.CELL_SIZE / 2 + "px"),
            setTimeout(() => {
              (r.classList.add("disappear"),
                setTimeout(() => {
                  (r.remove(),
                    (this.activeRequests = this.activeRequests.filter(
                      (d) => d.id !== t,
                    )));
                }, 300));
            }, 600));
        }, 300));
    }, 400);
  }
  prepareAndHandleCacheMiss(t, e, s, i, n, a, o, l, c, h) {
    const r = this.activeRequests.find((p) => p.id === t);
    if (!r) return;
    const d = this.determineCacheSlot(s);
    ((r.targetCacheIndex = d),
      this.animateToDatabase(t, e, s, i, n, a, o, l, c, h));
  }
  determineCacheSlot(t) {
    for (let s = 0; s < this.cache.length; s++)
      if (this.cache[s] === null) return s;
    const e = this.roundRobinIndex;
    return (
      (this.roundRobinIndex = (this.roundRobinIndex + 1) % this.cache.length),
      e
    );
  }
  animateToDatabase(t, e, s, i, n, a, o, l, c, h) {
    const r = this.activeRequests.find((m) => m.id === t);
    if (!r) return;
    const d = this.getDatabaseCellPosition(n, c, h);
    e &&
      (e.classList.add("move"),
      (e.style.left = d.x - this.REQUEST_SIZE / 2 + "px"),
      (e.style.top = d.y - this.REQUEST_SIZE / 2 + "px"),
      setTimeout(() => {
        (e.classList.add("disappear"),
          setTimeout(() => {
            (e.remove(), p());
          }, 300));
      }, 800));
    const p = () => {
      const m = this.createAnimatedDataElement(
        `db-data ${r.class}`,
        s,
        i,
        d.x,
        d.y,
        0,
        0,
      );
      (this.elements.visualization.appendChild(m),
        m.classList.add("appear"),
        setTimeout(() => {
          (m.classList.add("pulse"),
            setTimeout(() => {
              this.propagateFromDatabase(t, m, s, i, d.x, d.y, a, o, l, c, h);
            }, 800));
        }, 300));
    };
    e || p();
  }
  propagateFromDatabase(t, e, s, i, n, a, o, l, c, h, r) {
    const d = this.activeRequests.find((f) => f.id === t);
    if (!d || d.targetCacheIndex === void 0) return;
    const p = this.getCellPosition(d.targetCacheIndex, c, r),
      m = this.createAnimatedDataElement(
        `cache-clone ${d.class}`,
        s,
        i,
        n,
        a,
        1,
        1,
      );
    (this.elements.visualization.appendChild(m),
      setTimeout(() => {
        (m.classList.add("move"),
          (m.style.left = p.x - this.CELL_SIZE / 2 + "px"),
          (m.style.top = p.y - this.CELL_SIZE / 2 + "px"),
          o && o.length > 0 && this.loadNeighborsIntoCache(o, c, h, r),
          setTimeout(() => {
            ((this.cache[d.targetCacheIndex] = s),
              (this.cacheNumbers[d.targetCacheIndex] = i),
              this.updateCacheOrder(d.targetCacheIndex, s),
              this.renderCache(),
              this.animateDataToRequester(t, m, s, i, p.x, p.y, l));
          }, 800));
      }, 50));
  }
  updateCacheOrder(t, e) {
    const s = this.cacheOrder.indexOf(e);
    (s >= 0 && this.cacheOrder.splice(s, 1), this.cacheOrder.push(e));
  }
  animateDataToRequester(t, e, s, i, n, a, o) {
    const l = this.activeRequests.find((h) => h.id === t);
    if (!l) return;
    const c = this.createAnimatedDataElement(
      `requester-data ${l.class}`,
      s,
      i,
      n,
      a,
      1,
      1,
    );
    (this.elements.visualization.appendChild(c),
      setTimeout(() => {
        (c.classList.add("move"),
          (c.style.left = o.x - this.CELL_SIZE / 2 + "px"),
          (c.style.top = o.y - this.CELL_SIZE / 2 + "px"),
          setTimeout(() => {
            (c.classList.add("disappear"),
              setTimeout(() => {
                (document
                  .querySelectorAll(`.${l.class}`)
                  .forEach((r) => r.remove()),
                  (this.activeRequests = this.activeRequests.filter(
                    (r) => r.id !== t,
                  )));
              }, 300));
          }, 800));
      }, 50));
  }
  createAnimatedDataElement(t, e, s, i, n, a = 0, o = 0) {
    const l = document.createElement("div");
    if (
      ((l.className = t),
      (l.style.position = "absolute"),
      (l.style.zIndex = "20"),
      (l.style.width = `${this.CELL_SIZE}px`),
      (l.style.height = `${this.CELL_SIZE}px`),
      (l.style.left = i - this.CELL_SIZE / 2 + "px"),
      (l.style.top = n - this.CELL_SIZE / 2 + "px"),
      (l.style.transform = `translateZ(0) scale(${a})`),
      (l.style.opacity = o),
      (l.style.display = "flex"),
      (l.style.justifyContent = "center"),
      (l.style.alignItems = "center"),
      (l.style.fontWeight = "bold"),
      (l.style.willChange = "transform, opacity"),
      this.postgresMode && e)
    ) {
      l.style.backgroundColor = "transparent";
      const c = this.createPostgresSVG(e);
      l.appendChild(c);
      const h = document.createElement("div");
      ((h.textContent = s),
        (h.style.position = "absolute"),
        (h.style.top = "50%"),
        (h.style.left = "50%"),
        (h.style.transform = "translate(-50%, -50%)"),
        (h.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`),
        (h.style.fontWeight = "bold"),
        (h.style.color = "#FFFFFF"),
        (h.style.fontFamily = "monospace"),
        (h.style.textShadow =
          "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)"),
        (h.style.pointerEvents = "none"),
        (h.style.zIndex = "10"),
        l.appendChild(h));
    } else
      ((l.style.backgroundColor = e),
        (l.style.color = "#FFFFFF"),
        (l.style.fontFamily = "monospace"),
        (l.style.fontSize = `${22.5 * (this.SCALE_FACTOR || 1)}px`),
        (l.textContent = s));
    return l;
  }
}
O(j);
class N {
  constructor(t, e = 8, s = "lru", i = 2e3) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.config = {
      cacheSize: e,
      algorithm: s.toLowerCase(),
      requestInterval: i,
    }),
      (this.paletteColors = I.getColors()),
      (this.BASE_CELL_SIZE = 45),
      (this.BASE_REQUEST_SIZE = 30),
      (this.BASE_MARGIN = 12),
      (this.BASE_CONTAINER_WIDTH = 800),
      (this.BASE_CONTAINER_HEIGHT = 240),
      (this.CELL_SIZE = this.BASE_CELL_SIZE),
      (this.REQUEST_SIZE = this.BASE_REQUEST_SIZE),
      (this.MARGIN = this.BASE_MARGIN),
      (this.CONTAINER_WIDTH = Math.min(
        this.BASE_CONTAINER_WIDTH,
        window.innerWidth - 40,
      )),
      (this.CONTAINER_HEIGHT = this.BASE_CONTAINER_HEIGHT),
      (this.cache = Array(this.config.cacheSize).fill(null)),
      (this.usageOrder = []),
      (this.activeRequests = []),
      (this.nextRequestId = 1),
      (this.stats = { cacheHits: 0, cacheMisses: 0 }),
      (this.elements = {}),
      (this.requestInterval = null),
      (this.positionLabels = []),
      this.updateThemeColors(),
      this.initializePostgresMode(),
      this.initialize());
  }
  updateSizesForScreenWidth() {
    const t = window.innerWidth,
      e = t < 640 ? 0.7 : 1;
    ((this.CELL_SIZE = Math.floor(this.BASE_CELL_SIZE * e)),
      (this.REQUEST_SIZE = Math.floor(this.BASE_REQUEST_SIZE * e)),
      (this.MARGIN = Math.floor(this.BASE_MARGIN * e)),
      (this.CONTAINER_WIDTH = Math.min(
        Math.floor(this.BASE_CONTAINER_WIDTH * e),
        window.innerWidth - 40,
      )),
      (this.CONTAINER_HEIGHT = Math.floor(this.BASE_CONTAINER_HEIGHT * e)),
      (this.SCALE_FACTOR = e),
      (this.BASE_LABEL_FONT_SIZE = t < 640 ? 16.5 : 19));
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    if (!this.containerElement) return;
    const t = this.themeColors;
    (this.elements.mainContainer &&
      ((this.elements.mainContainer.style.color = t.text),
      (this.elements.mainContainer.style.backgroundColor = "transparent")),
      this.elements.cacheContainer &&
        (this.elements.cacheContainer.style.backgroundColor =
          t.componentBackground),
      this.elements.statsText && (this.elements.statsText.style.color = t.text),
      this.elements.algorithmText &&
        (this.elements.algorithmText.style.color = t.text),
      this.positionLabels.forEach((e) => {
        e.style.color = t.text;
      }),
      this.renderCache());
  }
  initialize() {
    (this.updateSizesForScreenWidth(),
      this.createAnimationStyles(),
      this.createDOMStructure(),
      this.applyStyles(),
      this.renderCache(),
      this.createStaticPositionLabels(),
      this.addEventListeners(),
      this.setupThemeListener(),
      this.startAutomaticRequests());
  }
  createAnimationStyles() {
    const t = `replacement-policy-styles-${Math.random().toString(36).substr(2, 9)}`;
    let e = document.getElementById(t);
    if (!e) {
      ((e = document.createElement("style")), (e.id = t));
      const s = `
                /* Force all animated elements onto compositing layers for Safari */
                .appear, .disappear, .pulse, .move, .slide-in-left, .slide-out-right,
                .request-circle, .cache-item {
                    will-change: transform, opacity;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    -webkit-perspective: 1000px;
                    perspective: 1000px;
                }
                
                /* Keep parent containers on compositing layers too */
                .animationContainer {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                @keyframes appear {
                    0% { transform: translateZ(0) scale(0); opacity: 0; }
                    100% { transform: translateZ(0) scale(1); opacity: 1; }
                }
                
                @keyframes disappear {
                    0% { transform: translateZ(0) scale(1); opacity: 1; }
                    100% { transform: translateZ(0) scale(0); opacity: 0; }
                }
                
                @keyframes slideInFromLeft {
                    0% { transform: translateZ(0) translateX(-100%) scale(1); opacity: 0; }
                    100% { transform: translateZ(0) translateX(0) scale(1); opacity: 1; }
                }
                
                @keyframes slideOutToRight {
                    0% { transform: translateZ(0) translateX(0) scale(1); opacity: 1; }
                    100% { transform: translateZ(0) translateX(200%) scale(1); opacity: 0; }
                }
                
                @keyframes pulse {
                    0% { transform: translateZ(0) scale(1); }
                    50% { transform: translateZ(0) scale(0.8); }
                    100% { transform: translateZ(0) scale(1); }
                }
                
                .appear { animation: appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .disappear { animation: disappear 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
                .slide-in-left { animation: slideInFromLeft 0.4s ease-out forwards; }
                .slide-out-right { animation: slideOutToRight 0.5s ease-in forwards; }
                .pulse { animation: pulse 1s ease-in-out; }
                .move { transition: left 0.4s ease-in-out, top 0.4s ease-in-out; }
                
                .request-circle {
                    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.3) !important;
                }
            `;
      ((e.textContent = s), document.head.appendChild(e));
    }
  }
  createDOMStructure() {
    ((this.containerElement.innerHTML = ""),
      (this.elements.mainContainer = document.createElement("div")),
      this.containerElement.appendChild(this.elements.mainContainer),
      (this.elements.cacheContainer = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.cacheContainer),
      (this.elements.cacheGrid = document.createElement("div")),
      this.elements.cacheContainer.appendChild(this.elements.cacheGrid),
      (this.elements.animationContainer = document.createElement("div")),
      (this.elements.animationContainer.className = "animationContainer"),
      this.elements.mainContainer.appendChild(this.elements.animationContainer),
      (this.elements.statsContainer = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.statsContainer),
      (this.elements.statsText = document.createElement("div")),
      this.elements.statsContainer.appendChild(this.elements.statsText),
      this.updateStatsDisplay());
  }
  applyStyles() {
    (this.setStyles(this.containerElement, {
      width: "100%",
      maxWidth: `${this.CONTAINER_WIDTH}px`,
      margin: "0 auto",
      position: "relative",
      cursor: "pointer",
      userSelect: "none",
      webkitUserSelect: "none",
      mozUserSelect: "none",
      msUserSelect: "none",
    }),
      this.setStyles(this.elements.mainContainer, {
        maxWidth: `${this.CONTAINER_WIDTH}px`,
        margin: "0 auto",
        padding: "0",
        color: this.themeColors.text,
        backgroundColor: "transparent",
        position: "relative",
        height: `${this.CONTAINER_HEIGHT}px`,
      }),
      this.setStyles(this.elements.cacheContainer, {
        position: "absolute",
        left: "50%",
        top: "65px",
        transform: "translateX(-50%)",
        backgroundColor: this.themeColors.componentBackground,
        padding: "10px",
        borderRadius: "0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }));
    const t =
      (this.CELL_SIZE + this.MARGIN) * this.config.cacheSize - this.MARGIN;
    (this.setStyles(this.elements.cacheGrid, {
      display: "flex",
      gap: `${this.MARGIN}px`,
      width: `${t}px`,
      height: `${this.CELL_SIZE}px`,
    }),
      this.setStyles(this.elements.animationContainer, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }),
      this.setStyles(this.elements.statsContainer, {
        position: "absolute",
        left: "0",
        bottom: "0px",
        width: "100%",
        textAlign: "center",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        fontWeight: "bold",
      }),
      this.setStyles(this.elements.statsText, {
        color: this.themeColors.text,
        fontFamily: "monospace",
      }));
  }
  setStyles(t, e) {
    Object.assign(t.style, e);
  }
  renderCache() {
    const t = this.elements.cacheGrid;
    t.innerHTML = "";
    for (let e = 0; e < this.config.cacheSize; e++) {
      const s = this.cache[e],
        i = document.createElement("div");
      (this.setStyles(i, {
        width: `${this.CELL_SIZE}px`,
        height: `${this.CELL_SIZE}px`,
        boxSizing: "border-box",
        position: "relative",
        boxShadow: "none",
        border: `1px solid ${this.themeColors.componentBorder}`,
      }),
        this.applyCellStyle(i, s, !1),
        (i.className = "cache-cell"),
        i.setAttribute("data-index", e),
        i.setAttribute("data-has-item", s ? "true" : "false"),
        t.appendChild(i));
    }
  }
  addEventListeners() {
    (window.addEventListener("beforeunload", () => {
      this.stopAutomaticRequests();
    }),
      window.addEventListener("resize", this.handleResize.bind(this)),
      this.containerElement.addEventListener("click", () => {
        this.makeRequest();
      }));
  }
  createStaticPositionLabels() {
    ((this.elements.labelsContainer = document.createElement("div")),
      this.setStyles(this.elements.labelsContainer, {
        position: "absolute",
        left: "50%",
        top: `${65 + this.CELL_SIZE + 20 + 10}px`,
        transform: "translateX(-50%)",
        display: "flex",
        gap: `${this.MARGIN}px`,
        pointerEvents: "none",
        zIndex: "5",
      }),
      this.elements.mainContainer.appendChild(this.elements.labelsContainer));
    for (let t = 0; t < this.config.cacheSize; t++) {
      const e = document.createElement("div");
      ((e.textContent = t + 1),
        this.setStyles(e, {
          width: `${this.CELL_SIZE}px`,
          textAlign: "center",
          fontSize: `${16 * (this.SCALE_FACTOR || 1)}px`,
          fontWeight: "bold",
          fontFamily: "monospace",
          color: this.themeColors.text,
        }),
        this.positionLabels.push(e),
        this.elements.labelsContainer.appendChild(e));
    }
  }
  handleResize() {
    (this.updateSizesForScreenWidth(),
      this.applyStyles(),
      this.renderCache(),
      this.elements.labelsContainer &&
        ((this.elements.labelsContainer.style.top = `${65 + this.CELL_SIZE + 20 + 10}px`),
        (this.elements.labelsContainer.style.gap = `${this.MARGIN}px`),
        this.positionLabels.forEach((t) => {
          ((t.style.width = `${this.CELL_SIZE}px`),
            (t.style.fontSize = `${16 * (this.SCALE_FACTOR || 1)}px`));
        })));
  }
  startAutomaticRequests() {
    this.requestInterval ||
      (this.requestInterval = setInterval(() => {
        this.makeRequest();
      }, this.config.requestInterval));
  }
  stopAutomaticRequests() {
    this.requestInterval &&
      (clearInterval(this.requestInterval), (this.requestInterval = null));
  }
  makeRequest() {
    let t,
      e = -1,
      s = !1;
    if (
      this.cache.filter((a) => a !== null).length > 3 &&
      Math.random() < 0.5
    ) {
      const a = this.cache
          .map((l, c) => (l !== null ? c : -1))
          .filter((l) => l !== -1),
        o = a[Math.floor(Math.random() * a.length)];
      ((t = this.cache[o]), (e = o), (s = !0));
    } else {
      const a = Math.floor(Math.random() * this.paletteColors.length);
      ((t = this.paletteColors[a]),
        (e = this.findColorInCache(t)),
        (s = e !== -1));
    }
    (this.animateRequest(t, s, e),
      s ? this.stats.cacheHits++ : this.stats.cacheMisses++,
      this.updateStatsDisplay());
  }
  findColorInCache(t) {
    return this.cache.indexOf(t);
  }
  animateRequest(t, e, s) {
    const i = document.createElement("div");
    i.className = "request-circle";
    const n = this.elements.mainContainer.getBoundingClientRect(),
      a = this.elements.cacheContainer.getBoundingClientRect(),
      o = n.width / 2,
      l = a.top - n.top - 45;
    (this.applyAnimationElementStyle(i, t, {
      position: "absolute",
      width: `${this.REQUEST_SIZE}px`,
      height: `${this.REQUEST_SIZE}px`,
      borderRadius: "50%",
      left: `${o - this.REQUEST_SIZE / 2}px`,
      top: `${l - this.REQUEST_SIZE / 2}px`,
      zIndex: "30",
      transform: "scale(0)",
      opacity: "0",
      transition: "all 0.3s ease-out",
    }),
      this.elements.animationContainer.appendChild(i),
      setTimeout(() => {
        ((i.style.transform = "translateZ(0) scale(1)"),
          (i.style.opacity = "1"),
          setTimeout(() => {
            e
              ? this.animateToExistingItem(i, s, t)
              : this.handleNewItemRequest(i, t);
          }, 400));
      }, 10));
  }
  animateToExistingItem(t, e, s) {
    const i = this.elements.cacheGrid.querySelector(`[data-index="${e}"]`);
    if (!i) {
      t.remove();
      return;
    }
    const n = i.getBoundingClientRect(),
      a = this.elements.mainContainer.getBoundingClientRect(),
      o = n.left - a.left + n.width / 2,
      l = n.top - a.top + n.height / 2;
    ((i.style.boxShadow = "none"),
      (t.style.transition = "all 0.4s ease-out"),
      (t.style.left = `${o - this.REQUEST_SIZE / 2}px`),
      (t.style.top = `${l - this.REQUEST_SIZE / 2}px`),
      setTimeout(() => {
        ((t.style.transform = "translateZ(0) scale(0.8)"),
          setTimeout(() => {
            if (
              ((t.style.transform = "translateZ(0) scale(1)"),
              this.config.algorithm === "lru" && e > 0)
            ) {
              const c = [...this.cache],
                h = this.cache[e];
              for (let r = e; r > 0; r--) this.cache[r] = this.cache[r - 1];
              ((this.cache[0] = h),
                this.updateUsageOrder(0),
                this.animateShift(c, () => {
                  this.animateResponse(t, 0, s);
                }));
            } else
              (this.config.algorithm === "lru" &&
                (this.updateUsageOrder(e), this.renderCache()),
                this.animateResponse(t, e, s));
            setTimeout(() => {
              i.style.boxShadow = "";
            }, 300);
          }, 200));
      }, 400));
  }
  handleNewItemRequest(t, e) {
    const s = this.determineTargetCellIndex(),
      i = this.elements.mainContainer.getBoundingClientRect(),
      n = this.elements.cacheContainer.getBoundingClientRect(),
      a = n.left + n.width / 2 - i.left,
      o = n.top - i.top - 30;
    ((t.style.transition = "all 0.4s ease-out"),
      (t.style.left = `${a - this.REQUEST_SIZE / 2}px`),
      (t.style.top = `${o - this.REQUEST_SIZE / 2}px`),
      setTimeout(() => {
        const l = [...this.cache],
          c = !this.cache.includes(null);
        if (this.config.algorithm === "lifo" || this.config.algorithm === "lru")
          if (c) {
            for (let h = this.cache.length - 1; h > 0; h--)
              this.cache[h] = this.cache[h - 1];
            ((this.cache[0] = e),
              this.config.algorithm === "lru" &&
                ((this.usageOrder = this.usageOrder
                  .map((h) => h + 1)
                  .filter((h) => h < this.cache.length)),
                this.updateUsageOrder(0)));
          } else {
            const h = this.cache.lastIndexOf(null);
            for (let r = h; r > 0; r--) this.cache[r] = this.cache[r - 1];
            ((this.cache[0] = e),
              this.config.algorithm === "lru" && this.updateUsageOrder(0));
          }
        else
          ((this.cache[s] = e),
            this.config.algorithm === "lru" && this.updateUsageOrder(s));
        this.animateShift(l, () => {
          const h = this.elements.cacheGrid.querySelector('[data-index="0"]');
          if (h) {
            const r = h.getBoundingClientRect(),
              d = r.left - i.left + r.width / 2,
              p = r.top - i.top + r.height / 2;
            ((t.style.transition = "all 0.4s ease-out"),
              (t.style.left = `${d - this.REQUEST_SIZE / 2}px`),
              (t.style.top = `${p - this.REQUEST_SIZE / 2}px`),
              setTimeout(() => {
                this.animateResponse(t, 0, e);
              }, 400));
          } else t.remove();
        });
      }, 400));
  }
  animateShift(t, e) {
    this.elements.cacheGrid.querySelectorAll("[data-index]").forEach((a) => {
      ((a.style.backgroundColor = "transparent"), (a.style.boxShadow = "none"));
    });
    const i = this.elements.mainContainer.getBoundingClientRect(),
      n = [];
    for (let a = 0; a < this.cache.length; a++) {
      const o = this.cache[a];
      if (!o) continue;
      const l = t.indexOf(o);
      if (l === -1) continue;
      const c = this.elements.cacheGrid.querySelector(`[data-index="${l}"]`),
        h = this.elements.cacheGrid.querySelector(`[data-index="${a}"]`);
      if (!c || !h) continue;
      const r = c.getBoundingClientRect(),
        d = h.getBoundingClientRect(),
        p = this.extractSvgFromCacheCell(l),
        m = document.createElement("div");
      ((m.className = "shifting-item"),
        this.applyAnimationElementStyle(
          m,
          o,
          {
            position: "absolute",
            left: `${r.left - i.left}px`,
            top: `${r.top - i.top}px`,
            zIndex: "15",
            transition: "left 0.5s ease-out, opacity 0.5s ease-out",
          },
          p,
        ),
        this.elements.animationContainer.appendChild(m),
        n.push({ element: m, targetX: d.left - i.left }));
    }
    for (let a = 0; a < t.length; a++) {
      const o = t[a];
      if (o && !this.cache.includes(o)) {
        const l = this.elements.cacheGrid.querySelector(`[data-index="${a}"]`);
        if (!l) continue;
        const c = l.getBoundingClientRect(),
          h = this.extractSvgFromCacheCell(a),
          r = document.createElement("div");
        ((r.className = "evicted-item"),
          this.applyAnimationElementStyle(
            r,
            o,
            {
              position: "absolute",
              left: `${c.left - i.left}px`,
              top: `${c.top - i.top}px`,
              zIndex: "15",
              transition: "left 0.5s ease-out, opacity 0.5s ease-out",
            },
            h,
          ),
          this.elements.animationContainer.appendChild(r),
          setTimeout(() => {
            ((r.style.left = `${i.width + 20}px`), (r.style.opacity = "0"));
          }, 50),
          n.push({ element: r }));
      }
    }
    setTimeout(() => {
      (n.forEach((a) => {
        a.targetX !== void 0 && (a.element.style.left = `${a.targetX}px`);
      }),
        setTimeout(() => {
          (n.forEach((a) => a.element.remove()), this.renderCache(), e && e());
        }, 550));
    }, 50);
  }
  animateResponse(t, e, s) {
    const i = document.createElement("div");
    i.className = "response-element";
    const n = this.elements.cacheGrid.querySelector(`[data-index="${e}"]`);
    if (!n) {
      t.remove();
      return;
    }
    const a = n.getBoundingClientRect(),
      o = this.elements.mainContainer.getBoundingClientRect(),
      l = a.left - o.left,
      c = a.top - o.top;
    (this.applyAnimationElementStyle(i, s, {
      position: "absolute",
      left: `${l}px`,
      top: `${c}px`,
      zIndex: "20",
      opacity: "1",
      transition: "all 0.5s ease-out",
    }),
      this.elements.animationContainer.appendChild(i),
      setTimeout(() => {
        ((i.style.top = `${c - 150}px`),
          (i.style.opacity = "0"),
          (i.style.transform = "translateZ(0) scale(0.7)"),
          (t.style.transition = "all 0.3s ease-out"),
          (t.style.opacity = "0"),
          (t.style.transform = "translateZ(0) scale(0)"),
          setTimeout(() => {
            (i.remove(), t.remove());
          }, 500));
      }, 50));
  }
  handleCacheMiss(t, e) {
    const s = this.activeRequests.find((c) => c.id === t);
    if (!s) return;
    const i = s.element,
      n = this.elements.cacheContainer.getBoundingClientRect(),
      a = this.elements.mainContainer.getBoundingClientRect(),
      o = n.left - a.left + n.width / 2,
      l = n.top - a.top - 20;
    (i.classList.add("move"),
      (i.style.left = `${o - this.REQUEST_SIZE / 2}px`),
      (i.style.top = `${l - this.REQUEST_SIZE / 2}px`),
      setTimeout(() => {
        let c = this.determineTargetCellIndex();
        const h = !this.cache.includes(null);
        if (this.config.algorithm === "lifo" || this.config.algorithm === "lru")
          if (h) {
            const r = [...this.cache];
            for (let d = this.cache.length - 1; d > 0; d--)
              this.cache[d] = this.cache[d - 1];
            ((this.cache[0] = e),
              this.config.algorithm === "lru" &&
                ((this.usageOrder = this.usageOrder
                  .map((d) => d + 1)
                  .filter((d) => d < this.cache.length)),
                this.updateUsageOrder(0)),
              (i.style.zIndex = "20"),
              this.animateShiftItems(r, () => {
                const d =
                  this.elements.cacheGrid.querySelector('[data-index="0"]');
                if (d) {
                  const p = d.getBoundingClientRect(),
                    m = p.left - a.left + p.width / 2,
                    f = p.top - a.top + p.height / 2;
                  ((i.style.zIndex = "20"),
                    (i.style.transition =
                      "left 0.3s ease-in-out, top 0.3s ease-in-out"),
                    (i.style.left = `${m - this.REQUEST_SIZE / 2}px`),
                    (i.style.top = `${f - this.REQUEST_SIZE / 2}px`),
                    setTimeout(() => {
                      (this.animateResponseToRequester(0, e, t),
                        setTimeout(() => {
                          (i.classList.add("disappear"),
                            setTimeout(() => {
                              (i.remove(),
                                (this.activeRequests =
                                  this.activeRequests.filter(
                                    (x) => x.id !== t,
                                  )));
                            }, 300));
                        }, 500));
                    }, 400));
                }
              }));
          } else
            this.shiftCacheContents(0, this.cache.lastIndexOf(null) + 1, () => {
              this.addNewItemToCache(t, e, 0, i);
            });
        else if (this.cache[c] !== null) {
          const p = [...this.cache];
          ((this.cache[c] = e),
            this.config.algorithm === "lru" && this.updateUsageOrder(c),
            (i.style.zIndex = "20"),
            this.animateShiftItems(p, () => {
              const m = this.elements.cacheGrid.querySelector(
                `[data-index="${c}"]`,
              );
              if (m) {
                const f = m.getBoundingClientRect(),
                  x = f.left - a.left + f.width / 2,
                  v = f.top - a.top + f.height / 2;
                ((i.style.zIndex = "20"),
                  (i.style.transition =
                    "left 0.3s ease-in-out, top 0.3s ease-in-out"),
                  (i.style.left = `${x - this.REQUEST_SIZE / 2}px`),
                  (i.style.top = `${v - this.REQUEST_SIZE / 2}px`),
                  setTimeout(() => {
                    (this.animateResponseToRequester(c, e, t),
                      setTimeout(() => {
                        (i.classList.add("disappear"),
                          setTimeout(() => {
                            (i.remove(),
                              (this.activeRequests = this.activeRequests.filter(
                                (w) => w.id !== t,
                              )));
                          }, 300));
                      }, 500));
                  }, 400));
              }
            }));
        } else this.addNewItemToCache(t, e, c, i);
      }, 400));
  }
  determineTargetCellIndex() {
    if (this.config.algorithm === "lifo" || this.config.algorithm === "lru")
      return 0;
    const t = this.cache.indexOf(null);
    return t !== -1 ? t : this.cache.length - 1;
  }
  shiftCacheContents(t, e, s) {
    const i = [...this.cache];
    for (let n = e; n > t; n--) this.cache[n] = this.cache[n - 1];
    ((this.cache[t] = null),
      this.config.algorithm === "lru" &&
        (this.usageOrder = this.usageOrder.map((n) =>
          n >= t && n < e ? n + 1 : n,
        )),
      this.animateShiftItems(i, s));
  }
  animateShiftItems(t, e) {
    this.elements.cacheGrid.querySelectorAll("[data-index]").forEach((a) => {
      ((a.style.backgroundColor = "transparent"), (a.style.boxShadow = "none"));
    });
    const i = this.elements.mainContainer.getBoundingClientRect(),
      n = [];
    for (let a = 0; a < this.cache.length; a++) {
      const o = this.cache[a];
      if (!o) continue;
      const l = t.indexOf(o);
      if (l === -1) continue;
      const c = this.elements.cacheGrid.querySelector(`[data-index="${a}"]`),
        h = this.elements.cacheGrid.querySelector(`[data-index="${l}"]`);
      if (!c || !h) continue;
      const r = c.getBoundingClientRect(),
        d = h.getBoundingClientRect(),
        p = this.extractSvgFromCacheCell(l),
        m = document.createElement("div");
      ((m.className = "shifting-item"),
        this.applyAnimationElementStyle(
          m,
          o,
          {
            position: "absolute",
            left: `${d.left - i.left}px`,
            top: `${d.top - i.top}px`,
            zIndex: "15",
            transition: "left 0.4s ease-out, opacity 0.4s ease-out",
          },
          p,
        ),
        this.elements.animationContainer.appendChild(m),
        n.push({ element: m, targetX: r.left - i.left }));
    }
    for (let a = 0; a < t.length; a++) {
      const o = t[a];
      if (o && !this.cache.includes(o)) {
        const l = this.elements.cacheGrid.querySelector(`[data-index="${a}"]`);
        if (!l) continue;
        const c = l.getBoundingClientRect(),
          h = this.extractSvgFromCacheCell(a),
          r = document.createElement("div");
        ((r.className = "evicted-item"),
          this.applyAnimationElementStyle(
            r,
            o,
            {
              position: "absolute",
              left: `${c.left - i.left}px`,
              top: `${c.top - i.top}px`,
              zIndex: "15",
              transition: "left 0.4s ease-out, opacity 0.4s ease-out",
            },
            h,
          ),
          this.elements.animationContainer.appendChild(r),
          setTimeout(() => {
            ((r.style.left = `${i.width + 20}px`), (r.style.opacity = "0"));
          }, 50),
          n.push({ element: r }));
      }
    }
    setTimeout(() => {
      (n.forEach((a) => {
        a.targetX !== void 0 && (a.element.style.left = `${a.targetX}px`);
      }),
        setTimeout(() => {
          (n.forEach((a) => a.element.remove()), this.renderCache(), e && e());
        }, 450));
    }, 50);
  }
  addNewItemToCache(t, e, s, i) {
    ((this.cache[s] = e),
      this.config.algorithm === "lru" && this.updateUsageOrder(s));
    const n = this.elements.cacheGrid.querySelector(`[data-index="${s}"]`);
    if (!n) return;
    const a = n.getBoundingClientRect(),
      o = this.elements.mainContainer.getBoundingClientRect();
    ((n.style.backgroundColor = "transparent"), (n.style.boxShadow = "none"));
    const l = document.createElement("div");
    l.className = `cache-item new-item-${t}`;
    const c = -this.CELL_SIZE - 20,
      h = a.left - o.left,
      r = a.top - o.top;
    (this.setStyles(l, {
      position: "absolute",
      width: `${this.CELL_SIZE}px`,
      height: `${this.CELL_SIZE}px`,
      backgroundColor: e,
      left: `${c}px`,
      top: `${r}px`,
      zIndex: "15",
      opacity: "1",
      boxShadow: "none",
      transition: "left 0.5s ease-out",
    }),
      this.elements.animationContainer.appendChild(l),
      setTimeout(() => {
        ((l.style.left = `${h}px`),
          i &&
            ((i.style.zIndex = "20"),
            setTimeout(() => {
              ((i.style.transition =
                "left 0.3s ease-in-out, top 0.3s ease-in-out"),
                (i.style.left = `${h + (this.CELL_SIZE - this.REQUEST_SIZE) / 2}px`),
                (i.style.top = `${r + (this.CELL_SIZE - this.REQUEST_SIZE) / 2}px`),
                setTimeout(() => {
                  ((i.style.zIndex = "20"),
                    this.animateResponseToRequester(s, e, t),
                    setTimeout(() => {
                      (i.classList.add("disappear"),
                        setTimeout(() => {
                          i.remove();
                          const d = this.activeRequests.find((p) => p.id === t);
                          (d && d.container && d.container.remove(),
                            (this.activeRequests = this.activeRequests.filter(
                              (p) => p.id !== t,
                            )));
                        }, 300));
                    }, 500));
                }, 400));
            }, 300)),
          setTimeout(() => {
            (l.remove(), this.renderCache());
          }, 550));
      }, 50));
  }
  moveItemToFront(t, e) {
    if (t === 0) {
      e && e();
      return;
    }
    const s = this.cache[t];
    if (!s) {
      e && e();
      return;
    }
    const i = [...this.cache];
    for (let n = t; n > 0; n--) this.cache[n] = this.cache[n - 1];
    ((this.cache[0] = s),
      this.updateUsageOrder(0),
      this.animateShiftItems(i, e));
  }
  updateUsageOrder(t) {
    ((this.usageOrder = this.usageOrder.filter((e) => e !== t)),
      this.usageOrder.push(t));
  }
  handleCacheHit(t, e, s) {
    const i = this.activeRequests.find((r) => r.id === t);
    if (!i) return;
    const n = i.element,
      a = this.elements.cacheGrid.querySelector(`[data-index="${s}"]`);
    if (!a) return;
    const o = a.getBoundingClientRect(),
      l = this.elements.mainContainer.getBoundingClientRect(),
      c = o.left - l.left + o.width / 2,
      h = o.top - l.top + o.height / 2;
    (n.classList.add("move"),
      (n.style.left = `${c - this.REQUEST_SIZE / 2}px`),
      (n.style.top = `${h - this.REQUEST_SIZE / 2}px`),
      setTimeout(() => {
        (n.classList.add("pulse"),
          this.config.algorithm === "lru"
            ? ((n.style.zIndex = "20"),
              this.moveItemToFront(s, () => {
                (this.animateResponseToRequester(0, e, t),
                  setTimeout(() => {
                    (n.classList.add("disappear"),
                      setTimeout(() => {
                        (n.remove(),
                          (this.activeRequests = this.activeRequests.filter(
                            (r) => r.id !== t,
                          )));
                      }, 300));
                  }, 500));
              }))
            : (this.config.algorithm === "lru" &&
                (this.updateUsageOrder(s), this.renderCache()),
              (n.style.zIndex = "20"),
              this.animateResponseToRequester(s, e, t),
              setTimeout(() => {
                (n.classList.add("disappear"),
                  setTimeout(() => {
                    (n.remove(),
                      (this.activeRequests = this.activeRequests.filter(
                        (r) => r.id !== t,
                      )));
                  }, 300));
              }, 500)));
      }, 400));
  }
  animateResponseToRequester(t, e, s) {
    const i = s ? this.activeRequests.find((r) => r.id === s) : null,
      n = document.createElement("div");
    ((n.className = "response-element"),
      s && n.setAttribute("data-request-id", s));
    const a = this.elements.cacheGrid.querySelector(`[data-index="${t}"]`);
    if (!a) return;
    const o = a.getBoundingClientRect(),
      l = this.elements.mainContainer.getBoundingClientRect(),
      c = o.left - l.left,
      h = o.top - l.top;
    (this.setStyles(n, {
      position: "absolute",
      width: `${this.CELL_SIZE}px`,
      height: `${this.CELL_SIZE}px`,
      backgroundColor: e,
      left: `${c}px`,
      top: `${h}px`,
      zIndex: "10",
      opacity: "1",
      boxShadow: "none",
      transition:
        "top 0.5s ease-out, opacity 0.5s ease-out, transform 0.5s ease-out",
    }),
      i && i.container
        ? i.container.appendChild(n)
        : this.elements.animationContainer.appendChild(n),
      setTimeout(() => {
        ((n.style.top = `${h - 150}px`),
          (n.style.opacity = "0"),
          (n.style.transform = "scale(0.7)"),
          setTimeout(() => {
            n.remove();
          }, 500));
      }, 50));
  }
  updateStatsDisplay() {
    const t = this.stats.cacheHits + this.stats.cacheMisses,
      e = t > 0 ? Math.round((this.stats.cacheHits / t) * 100) : 0;
    ((this.elements.statsText.textContent = `Hits: ${this.stats.cacheHits} | Misses: ${this.stats.cacheMisses} | Hit Rate: ${e}%`),
      (this.elements.statsText.style.fontFamily = "monospace"));
  }
  onPostgresModeChange() {
    this.renderCache();
  }
  applyAnimationElementStyle(t, e, s = {}, i = null) {
    const n = { boxShadow: "none", willChange: "transform, opacity", ...s };
    if (
      (s.transform
        ? (n.transform = `translateZ(0) ${s.transform}`)
        : (n.transform = "translateZ(0)"),
      s.width || (n.width = `${this.CELL_SIZE}px`),
      s.height || (n.height = `${this.CELL_SIZE}px`),
      this.postgresMode && e)
    ) {
      ((n.backgroundColor = "transparent"),
        (n.display = "flex"),
        (n.alignItems = "center"),
        (n.justifyContent = "center"),
        this.setStyles(t, n));
      const a = i || this.createPostgresSVG(e);
      (s.width &&
        s.height &&
        ((a.style.width = `${parseInt(s.width) * 0.88}px`),
        (a.style.height = `${parseInt(s.height) * 0.88}px`)),
        t.appendChild(a));
    } else ((n.backgroundColor = e || "transparent"), this.setStyles(t, n));
  }
  extractSvgFromCacheCell(t) {
    if (!this.postgresMode) return null;
    const e = this.elements.cacheGrid.querySelector(`[data-index="${t}"]`);
    if (!e) return null;
    const s = e.querySelector("svg");
    return s ? (s.remove(), s) : null;
  }
}
O(N);
class nt extends N {
  constructor(t, e = 8, s = "time-aware-lru", i = 2e3, n = 1e4) {
    (super(t, e, "lru", i),
      (this.expirationTime = n),
      (this.itemTimers = new Map()),
      (this.timerAnimations = new Map()));
  }
  initialize() {
    this.createTimerStyles();
    const t = this.renderCache.bind(this);
    ((this.renderCache = () => {}),
      super.initialize(),
      (this.elements.timerContainer = document.createElement("div")),
      this.setStyles(this.elements.timerContainer, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "1000",
      }),
      this.elements.mainContainer.appendChild(this.elements.timerContainer),
      (this.renderCache = t),
      this.renderCache(),
      this.createStaticPositionLabels());
  }
  createTimerStyles() {
    const t = "time-aware-lru-styles";
    if (!document.getElementById(t)) {
      const e = document.createElement("style");
      ((e.id = t),
        (e.textContent = `
                @keyframes expireDown {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(100px) scale(0.5); opacity: 0; }
                }
                
                .cache-timer {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    pointer-events: none;
                    z-index: 50;
                }
                
                .shifting-item {
                    position: relative;
                }
                
                .shifting-item .cache-timer {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 50;
                }
                
                .expire-x {
                    position: absolute;
                    color: red;
                    font-size: 48px;
                    font-weight: bold;
                    z-index: 100;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                }
            `),
        document.head.appendChild(e));
    }
  }
  renderCache() {
    (super.renderCache(), this.updateTimers());
  }
  updateTimers() {
    if (this.elements.timerContainer) {
      this.elements.timerContainer.innerHTML = "";
      for (let t = 0; t < this.config.cacheSize; t++) {
        const e = this.cache[t];
        if (e) {
          const s = this.elements.cacheGrid.querySelector(
            `[data-index="${t}"]`,
          );
          s && this.addTimerForCell(s, e, t);
        }
      }
    }
  }
  addTimerForCell(t, e, s) {
    const i = t.getBoundingClientRect(),
      n = this.elements.mainContainer.getBoundingClientRect(),
      a = document.createElement("div");
    ((a.className = "cache-timer"),
      a.setAttribute("data-color", e),
      a.setAttribute("data-index", s));
    const o = 30,
      l = i.left - n.left + i.width / 2,
      c = i.top - n.top + i.height / 2;
    ((a.style.position = "absolute"),
      (a.style.left = `${l - o / 2}px`),
      (a.style.top = `${c - o / 2}px`),
      (a.style.width = `${o}px`),
      (a.style.height = `${o}px`));
    const h = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (h.setAttribute("width", "30"),
      h.setAttribute("height", "30"),
      h.setAttribute("viewBox", "0 0 30 30"));
    const r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    (r.setAttribute("cx", "15"),
      r.setAttribute("cy", "15"),
      r.setAttribute("r", "14"),
      r.setAttribute("fill", "white"),
      r.setAttribute("opacity", "0.9"));
    const d = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    (d.setAttribute("cx", "15"),
      d.setAttribute("cy", "15"),
      d.setAttribute("r", "13"),
      d.setAttribute("fill", "none"),
      d.setAttribute("stroke", "#333"),
      d.setAttribute("stroke-width", "2"));
    const p = document.createElementNS("http://www.w3.org/2000/svg", "line");
    (p.setAttribute("x1", "15"),
      p.setAttribute("y1", "15"),
      p.setAttribute("x2", "15"),
      p.setAttribute("y2", "5"),
      p.setAttribute("stroke", "#333"),
      p.setAttribute("stroke-width", "2"),
      p.setAttribute("stroke-linecap", "round"),
      (p.style.transformOrigin = "15px 15px"),
      h.appendChild(r),
      h.appendChild(d),
      h.appendChild(p),
      a.appendChild(h),
      this.elements.timerContainer.appendChild(a));
    const m = this.timerAnimations.get(e);
    if (m) {
      const f = m.currentTime,
        x = p.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: this.expirationTime, iterations: 1, easing: "linear" },
        );
      x.currentTime = f;
    } else {
      const f = p.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: this.expirationTime, iterations: 1, easing: "linear" },
      );
      this.timerAnimations.set(e, f);
    }
  }
  handleNewItemRequest(t, e) {
    (super.handleNewItemRequest(t, e),
      setTimeout(() => {
        this.cache.includes(e) &&
          !this.itemTimers.has(e) &&
          this.startExpirationTimer(e);
      }, 1e3));
  }
  animateToExistingItem(t, e, s) {
    super.animateToExistingItem(t, e, s);
  }
  startExpirationTimer(t) {
    if (this.itemTimers.has(t)) return;
    const e = Date.now(),
      s = setTimeout(() => {
        this.expireItem(t);
      }, this.expirationTime);
    this.itemTimers.set(t, {
      timeoutId: s,
      startTime: e,
      remainingTime: this.expirationTime,
    });
  }
  clearExpirationTimer(t) {
    const e = this.itemTimers.get(t);
    e && (e.timeoutId && clearTimeout(e.timeoutId), this.itemTimers.delete(t));
    const s = this.timerAnimations.get(t);
    s && (s.cancel(), this.timerAnimations.delete(t));
  }
  expireItem(t) {
    const e = this.cache.indexOf(t);
    if (e === -1) return;
    const s = this.elements.cacheGrid.querySelector(`[data-index="${e}"]`);
    if (!s) return;
    const i = s.getBoundingClientRect(),
      n = this.elements.mainContainer.getBoundingClientRect(),
      a = this.elements.timerContainer.querySelector(
        `.cache-timer[data-color="${t}"]`,
      ),
      o = document.createElement("div");
    ((o.style.position = "absolute"),
      (o.style.left = `${i.left - n.left}px`),
      (o.style.top = `${i.top - n.top}px`),
      (o.style.width = `${this.CELL_SIZE}px`),
      (o.style.height = `${this.CELL_SIZE}px`),
      (o.style.zIndex = "60"));
    const l = document.createElement("div");
    if (
      ((l.style.position = "absolute"),
      (l.style.width = "100%"),
      (l.style.height = "100%"),
      (l.style.boxShadow = "none"),
      this.postgresMode && t)
    ) {
      ((l.style.backgroundColor = "transparent"),
        (l.style.display = "flex"),
        (l.style.alignItems = "center"),
        (l.style.justifyContent = "center"));
      const r = this.createPostgresSVG(t);
      l.appendChild(r);
    } else l.style.backgroundColor = t || "transparent";
    const c = document.createElement("div");
    if (
      ((c.className = "expire-x"),
      (c.textContent = "✕"),
      (c.style.position = "absolute"),
      a)
    ) {
      const r = a.getBoundingClientRect();
      ((a.style.position = "absolute"),
        (a.style.left = `${r.left - i.left}px`),
        (a.style.top = `${r.top - i.top}px`),
        o.appendChild(a));
    }
    (o.appendChild(l),
      o.appendChild(c),
      this.elements.animationContainer.appendChild(o),
      this.clearExpirationTimer(t));
    const h = [...this.cache];
    (this.cache.splice(e, 1),
      this.cache.push(null),
      (this.usageOrder = this.usageOrder
        .filter((r) => r !== e)
        .map((r) => (r > e ? r - 1 : r))),
      (s.style.backgroundColor = "transparent"),
      (s.style.boxShadow = "none"),
      (o.style.animation = "expireDown 0.8s ease-in forwards"),
      setTimeout(() => {
        (o.remove(), this.animateGapCollapse(h, e, () => {}));
      }, 800));
  }
  animateGapCollapse(t, e, s) {
    (this.renderCache(), s && s());
  }
  animateShift(t, e) {
    const s = new Map(),
      i = new Map();
    for (let c = 0; c < t.length; c++) {
      const h = t[c];
      if (h) {
        const r = this.elements.cacheGrid.querySelector(`[data-index="${c}"]`);
        r &&
          r.style.backgroundColor &&
          r.style.backgroundColor !== "transparent" &&
          s.set(h, { backgroundColor: r.style.backgroundColor, oldIndex: c });
        const d = this.elements.timerContainer.querySelector(
          `.cache-timer[data-color="${h}"]`,
        );
        d && i.set(h, d);
      }
    }
    const n = new Set(this.cache.filter((c) => c !== null));
    for (let [c, h] of this.itemTimers)
      if (!n.has(c)) {
        this.clearExpirationTimer(c);
        const r = i.get(c);
        r && r.remove();
      }
    this.elements.cacheGrid.querySelectorAll("[data-index]").forEach((c) => {
      ((c.style.backgroundColor = "transparent"), (c.style.boxShadow = "none"));
    });
    const o = this.elements.mainContainer.getBoundingClientRect(),
      l = [];
    for (let c = 0; c < this.cache.length; c++) {
      const h = this.cache[c];
      if (!h) continue;
      const r = s.get(h);
      if (!r) continue;
      const d = this.elements.cacheGrid.querySelector(
          `[data-index="${r.oldIndex}"]`,
        ),
        p = this.elements.cacheGrid.querySelector(`[data-index="${c}"]`);
      if (!d || !p) continue;
      const m = d.getBoundingClientRect(),
        f = p.getBoundingClientRect(),
        x = this.extractSvgFromCacheCell(r.oldIndex),
        v = document.createElement("div");
      v.className = "shifting-item";
      const w = `
                position: absolute;
                width: ${this.CELL_SIZE}px;
                height: ${this.CELL_SIZE}px;
                left: ${m.left - o.left}px;
                top: ${m.top - o.top}px;
                z-index: 15;
                box-shadow: none;
                transition: left 0.5s ease-out, opacity 0.5s ease-out;
            `;
      if (this.postgresMode && h) {
        v.style.cssText =
          w +
          `
                    background-color: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
        const g = x || this.createPostgresSVG(h);
        v.appendChild(g);
      } else
        v.style.cssText =
          w +
          `
                    background-color: ${h};
                `;
      (this.elements.animationContainer.appendChild(v),
        l.push({
          element: v,
          targetX: f.left - o.left,
          color: h,
          newIndex: c,
        }));
      const y = i.get(h);
      if (y) {
        const L = f.left - o.left + f.width / 2,
          T = f.top - o.top + f.height / 2;
        ((y.style.transition = "left 0.5s ease-out, top 0.5s ease-out"),
          (y.style.left = `${L - 30 / 2}px`),
          (y.style.top = `${T - 30 / 2}px`),
          y.setAttribute("data-index", c));
      }
    }
    for (let [c, h] of s)
      if (!n.has(c)) {
        const r = this.elements.cacheGrid.querySelector(
          `[data-index="${h.oldIndex}"]`,
        );
        if (!r) continue;
        const d = r.getBoundingClientRect(),
          p = this.extractSvgFromCacheCell(h.oldIndex),
          m = document.createElement("div");
        m.className = "evicted-item";
        const f = `
                    position: absolute;
                    width: ${this.CELL_SIZE}px;
                    height: ${this.CELL_SIZE}px;
                    left: ${d.left - o.left}px;
                    top: ${d.top - o.top}px;
                    z-index: 15;
                    box-shadow: none;
                    transition: left 0.5s ease-out, opacity 0.5s ease-out;
                `;
        if (this.postgresMode && c) {
          m.style.cssText =
            f +
            `
                        background-color: transparent;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;
          const x = p || this.createPostgresSVG(c);
          m.appendChild(x);
        } else
          m.style.cssText =
            f +
            `
                        background-color: ${c};
                    `;
        (this.elements.animationContainer.appendChild(m),
          setTimeout(() => {
            ((m.style.left = `${o.width + 20}px`), (m.style.opacity = "0"));
          }, 50),
          l.push({ element: m }));
      }
    setTimeout(() => {
      (l.forEach((c) => {
        c.targetX !== void 0 && (c.element.style.left = `${c.targetX}px`);
      }),
        setTimeout(() => {
          (l.forEach((c) => c.element.remove()),
            i.forEach((c) => {
              c.parentNode && (c.style.transition = "");
            }),
            this.renderCache(),
            e && e());
        }, 550));
    }, 50);
  }
  stopAutomaticRequests() {
    super.stopAutomaticRequests();
    for (let [t, e] of this.itemTimers)
      e.timeoutId && clearTimeout(e.timeoutId);
    (this.itemTimers.clear(), this.timerAnimations.clear());
  }
}
class at {
  constructor(t, e = {}) {
    ((this.container =
      typeof t == "string" ? document.querySelector(`[data-id="${t}"]`) : t),
      (this.width = e.width || 800),
      (this.height = e.height || 300),
      (this.entities = e.entities || [
        { name: "L1", latency: 1, unit: "ns" },
        { name: "L2", latency: 4, unit: "ns" },
        { name: "L3", latency: 40, unit: "ns" },
        { name: "RAM", latency: 80, unit: "ns" },
        { name: "SSD", latency: 100, unit: "us" },
      ]),
      (this.timeScale = 1e-6),
      (this.minTimeScale = 1e-7),
      (this.maxTimeScale = 0.001),
      (this.animations = []),
      (this.baseComponentWidth = 40),
      (this.baseCpuWidth = 150),
      (this.baseBallRadius = 12),
      (this.componentHeight = 50),
      this.updateThemeColors(),
      this.init());
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    if (!this.svg) return;
    const t = this.themeColors;
    (this.svg.querySelectorAll("rect").forEach((n) => {
      n.setAttribute("fill", t.componentBackground);
    }),
      this.svg.querySelectorAll("text").forEach((n) => {
        n.style.fill = t.text;
      }),
      this.slider &&
        (window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? (this.slider.style.backgroundColor = "#374151")
          : (this.slider.style.backgroundColor = "#e5e7eb")),
      this.valueDisplay && (this.valueDisplay.style.color = t.text),
      this.container.querySelectorAll("label").forEach((n) => {
        n.style.color = t.text;
      }));
  }
  init() {
    if (!this.container)
      throw new Error("LatencyVisualization: Container element not found");
    ((this.width = this.container.offsetWidth || 800),
      (this.svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      )),
      this.svg.setAttribute("width", this.width),
      this.svg.setAttribute("height", this.height),
      this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`),
      (this.svg.style.display = "block"),
      (this.svg.style.width = "100%"),
      (this.svg.style.height = "auto"),
      this.container.appendChild(this.svg),
      this.setupComponents(),
      this.setupSlider(),
      this.startAnimations(),
      this.setupThemeListener());
    let t;
    ((this.resizeHandler = () => {
      (clearTimeout(t),
        (t = setTimeout(() => {
          this.handleResize();
        }, 150)));
    }),
      window.addEventListener("resize", this.resizeHandler));
  }
  createSVGElement(t, e = {}) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", t);
    return (
      Object.entries(e).forEach(([i, n]) => {
        s.setAttribute(i, n);
      }),
      s
    );
  }
  setupComponents() {
    const t = Math.min(1, this.width / 800),
      s = this.width < 600;
    s
      ? ((this.cpuBox = {
          x: 0,
          y: 20,
          width: Math.max(80, this.baseCpuWidth * t * 0.7),
          height: this.height - 40,
        }),
        (this.componentWidth = Math.max(25, this.baseComponentWidth * t * 0.7)),
        (this.ballRadius = Math.max(8, this.baseBallRadius * t * 0.8)))
      : ((this.cpuBox = {
          x: 0,
          y: 30,
          width: this.baseCpuWidth * t,
          height: this.height - 60,
        }),
        (this.componentWidth = this.baseComponentWidth * t),
        (this.ballRadius = this.baseBallRadius * t));
    const i = this.createSVGElement("rect", {
      x: this.cpuBox.x,
      y: this.cpuBox.y,
      width: this.cpuBox.width,
      height: this.cpuBox.height,
      fill: this.themeColors.componentBackground,
      stroke: "none",
    });
    this.svg.appendChild(i);
    const n = s ? Math.max(12, 18 * t) + "px" : "18px",
      a = this.createSVGElement("text", {
        x: this.cpuBox.x + this.cpuBox.width / 2,
        y: this.cpuBox.y + this.cpuBox.height / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": n,
        "font-weight": "bold",
      });
    ((a.textContent = "CPU"),
      (a.style.fontFamily = "monospace"),
      (a.style.fill = this.themeColors.text),
      this.svg.appendChild(a));
    const o = I.getColorRange(this.entities.length),
      l = s ? 50 : 80,
      c = s ? 10 : 20,
      h =
        this.width -
        this.cpuBox.x -
        this.cpuBox.width -
        this.componentWidth -
        l,
      r = Math.max(c, h / (this.entities.length - 1)),
      d = this.height / (this.entities.length + 1),
      p = this.cpuBox.y;
    this.entities.forEach((m, f) => {
      m.color = o[f];
      const x = d * (f + 1),
        w = x + this.componentHeight / 2 - p,
        y = p,
        g = this.cpuBox.x + this.cpuBox.width + l + r * f;
      ((m.box = { x: g, y }),
        (m.pathY = x),
        (m.startX = this.cpuBox.x + this.cpuBox.width + this.ballRadius),
        (m.endX = g - this.ballRadius));
      const L = this.createSVGElement("rect", {
        x: g,
        y,
        width: this.componentWidth,
        height: w,
        fill: this.themeColors.componentBackground,
        stroke: "none",
      });
      this.svg.appendChild(L);
      const T = s ? Math.max(9, 15 * t) + "px" : "15px",
        A = this.createSVGElement("text", {
          x: g + this.componentWidth / 2,
          y: y + w / 2,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": T,
          "font-weight": "bold",
        });
      ((A.textContent = m.name),
        (A.style.fontFamily = "monospace"),
        (A.style.fill = this.themeColors.text),
        this.svg.appendChild(A));
      const C = s ? Math.max(10, 16 * t) + "px" : "16px",
        b = s ? 5 : 10,
        S = this.createSVGElement("text", {
          x: this.cpuBox.x + this.cpuBox.width + b,
          y: m.pathY,
          "text-anchor": "start",
          "dominant-baseline": "middle",
          "font-size": C,
        });
      ((S.textContent = `${m.latency}${m.unit}`),
        (S.style.fontFamily = "monospace"),
        (S.style.fill = this.themeColors.text),
        this.svg.appendChild(S),
        (m.ball = this.createSVGElement("circle", {
          cx: m.startX,
          cy: m.pathY,
          r: this.ballRadius,
          fill: m.color,
          stroke: "none",
        })),
        this.svg.appendChild(m.ball));
    });
  }
  setupSlider() {
    const t = `latency-slider-styles-${Math.random().toString(36).substr(2, 9)}`;
    let e = document.getElementById(t);
    e ||
      ((e = document.createElement("style")),
      (e.id = t),
      (e.textContent = `
                .latency-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 2rem;
                    width: 0.7rem;
                    cursor: ew-resize;
                    border: 1px solid rgba(156, 163, 175, 0.7);
                    background-color: #e5e7eb;
                }
                
                .latency-slider::-moz-range-thumb {
                    appearance: none;
                    height: 2rem;
                    width: 0.7rem;
                    cursor: ew-resize;
                    border: 1px solid rgba(156, 163, 175, 0.7);
                    background-color: #e5e7eb;
                }
                
                .latency-slider::-ms-thumb {
                    appearance: none;
                    height: 2rem;
                    width: 0.7rem;
                    cursor: ew-resize;
                    border: 1px solid rgba(156, 163, 175, 0.7);
                    background-color: #e5e7eb;
                }
                
                .latency-slider:hover {
                    opacity: 1;
                }
                
                @media (prefers-color-scheme: dark) {
                    .latency-slider::-webkit-slider-thumb {
                        background-color: #374151;
                    }
                    
                    .latency-slider::-moz-range-thumb {
                        background-color: #374151;
                    }
                    
                    .latency-slider::-ms-thumb {
                        background-color: #374151;
                    }
                }
            `),
      document.head.appendChild(e));
    const s = document.createElement("div");
    ((s.style.marginTop = "20px"),
      (s.style.display = "flex"),
      (s.style.alignItems = "center"),
      (s.style.flexWrap = "nowrap"),
      (s.style.width = "100%"));
    const i = document.createElement("label");
    ((i.textContent = "Time Scale: "),
      (i.style.marginRight = "10px"),
      (i.style.fontSize = "clamp(14px, 2vw, 16px)"),
      (i.style.fontFamily = "monospace"),
      (i.style.flexShrink = "0"),
      (i.style.color = this.themeColors.text),
      s.appendChild(i));
    const n = document.createElement("input");
    ((n.type = "range"),
      (n.className = "latency-slider"),
      (n.min = Math.log10(this.minTimeScale)),
      (n.max = Math.log10(this.maxTimeScale)),
      (n.step = 0.01),
      (n.value = Math.log10(this.timeScale)),
      (n.style.width = "80%"),
      (n.style.flexGrow = "1"),
      (n.style.webkitAppearance = "none"),
      (n.style.appearance = "none"),
      (n.style.height = "10px"),
      (n.style.borderRadius = "99px"),
      (n.style.backgroundColor = "#d3d3d3"),
      (n.style.outline = "none"),
      (n.style.webkitTransition = "0.2s"),
      (n.style.transition = "opacity 0.2s"),
      (n.style.marginTop = "10px"),
      (n.style.marginBottom = "10px"),
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? (n.style.backgroundColor = "#374151")
        : (n.style.backgroundColor = "#e5e7eb"));
    const o = document.createElement("span");
    ((o.style.marginLeft = "10px"),
      (o.style.fontSize = "clamp(14px, 2vw, 16px)"),
      (o.style.fontFamily = "monospace"),
      (o.style.whiteSpace = "nowrap"),
      (o.style.flexShrink = "0"),
      (o.style.color = this.themeColors.text),
      (o.textContent = this.formatTimeScale(this.timeScale)),
      n.addEventListener("input", (l) => {
        ((this.timeScale = Math.pow(10, parseFloat(l.target.value))),
          (o.textContent = this.formatTimeScale(this.timeScale)),
          this.updateAnimationSpeeds());
      }),
      s.appendChild(n),
      s.appendChild(o),
      this.container.appendChild(s),
      (this.slider = n),
      (this.valueDisplay = o));
  }
  formatTimeScale(t) {
    const e = 1 / t;
    return e >= 1e6
      ? `${(e / 1e6).toFixed(0)}M× slower`
      : e >= 1e3
        ? `${(e / 1e3).toFixed(0)}k× slower`
        : `${e.toFixed(0)}× slower`;
  }
  startAnimations() {
    this.entities.forEach((t) => {
      this.animateBall(t);
    });
  }
  animateBall(t) {
    const n = (((t.unit === "us" ? t.latency * 1e3 : t.latency) / 1) * 0.1) / 2,
      a = X.timeline({ repeat: -1 });
    a.to(t.ball, { cx: t.endX, duration: n, ease: "none" }).to(t.ball, {
      cx: t.startX,
      duration: n,
      ease: "none",
    });
    const l = 1e6 / (1 / this.timeScale);
    (a.timeScale(l), (t.timeline = a), this.animations.push(a));
  }
  updateAnimationSpeeds() {
    this.entities.forEach((t) => {
      if (t.timeline) {
        const s = 1e6 / (1 / this.timeScale);
        t.timeline.timeScale(s);
      }
    });
  }
  updateEntities(t) {
    for (
      this.animations.forEach((e) => e.kill()), this.animations = [];
      this.svg.firstChild;
    )
      this.svg.removeChild(this.svg.firstChild);
    ((this.entities = t), this.setupComponents(), this.startAnimations());
  }
  handleResize() {
    const t = this.container.offsetWidth || 800;
    if (!(Math.abs(t - this.width) < 10)) {
      for (
        this.width = t,
          this.svg.setAttribute("width", this.width),
          this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`),
          this.animations.forEach((e) => e.kill()),
          this.animations = [];
        this.svg.firstChild;
      )
        this.svg.removeChild(this.svg.firstChild);
      (this.setupComponents(), this.startAnimations());
    }
  }
  destroy() {
    (this.animations.forEach((t) => t.kill()),
      this.resizeHandler &&
        window.removeEventListener("resize", this.resizeHandler),
      (this.container.innerHTML = ""));
  }
}
class P {
  constructor(t, e = 3, s = 3, i = !1) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.config = {
      databaseRows: e,
      databaseCols: s,
      prewarmCache: !!i,
      requestInterval: 4e3,
    }),
      (this.cacheLocations = [
        { label: "US East", x: 0.2, y: 0.5 },
        { label: "US Central", x: 0.5, y: 0.5 },
        { label: "US West", x: 0.8, y: 0.5 },
      ]),
      (this.paletteColors = I.getColors()),
      (this.BASE_CELL_SIZE = 30),
      (this.BASE_REQUEST_SIZE = 30),
      (this.BASE_MARGIN = 10),
      (this.BASE_MAP_WIDTH = 800),
      (this.BASE_MAP_HEIGHT = 500),
      (this.CELL_SIZE = this.BASE_CELL_SIZE),
      (this.REQUEST_SIZE = this.BASE_REQUEST_SIZE),
      (this.MARGIN = this.BASE_MARGIN),
      (this.MAP_WIDTH = this.BASE_MAP_WIDTH),
      (this.MAP_HEIGHT = this.BASE_MAP_HEIGHT),
      (this.databaseColors = []),
      (this.caches = []),
      (this.requesterPosition = { x: 0.5, y: 0.5 }),
      (this.activeRequests = []),
      (this.nextRequestId = 1),
      (this.elements = { caches: [] }),
      (this.requestInterval = null),
      this.updateThemeColors(),
      this.initializePostgresMode(),
      this.initialize());
  }
  updateSizesForScreenWidth() {
    const t = window.innerWidth,
      e = t < 640 ? 0.7 : 1;
    ((this.CELL_SIZE = Math.floor(this.BASE_CELL_SIZE * e)),
      (this.REQUEST_SIZE = Math.floor(this.BASE_REQUEST_SIZE * e)),
      (this.MARGIN = Math.floor(this.BASE_MARGIN * e)),
      (this.MAP_WIDTH = Math.floor(this.BASE_MAP_WIDTH * e)),
      (this.MAP_HEIGHT = Math.floor(this.BASE_MAP_HEIGHT * e)),
      (this.SCALE_FACTOR = e),
      (this.BASE_LABEL_FONT_SIZE = t < 640 ? 16.5 : 19));
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    if (!this.containerElement) return;
    const t = this.themeColors;
    (this.elements.mapContainer &&
      (this.elements.mapContainer.style.backgroundColor = "transparent"),
      this.elements.database &&
        (this.elements.database.style.backgroundColor = t.componentBackground),
      this.elements.caches.forEach((a) => {
        a.cache && (a.cache.style.backgroundColor = t.componentBackground);
      }),
      this.elements.requester &&
        ((this.elements.requester.style.backgroundColor =
          t.componentBackground),
        (this.elements.requester.style.border = "none")),
      this.containerElement
        .querySelectorAll('[style*="color"]')
        .forEach((a) => {
          a.style.color &&
            !a.style.color.includes("currentColor") &&
            (a.style.color = t.text);
        }),
      this.containerElement.querySelectorAll("button").forEach((a) => {
        ((a.style.backgroundColor = t.componentBackground),
          (a.style.border = `2px solid ${t.componentBorder}`),
          (a.style.color = t.text));
      }),
      this.containerElement.querySelectorAll("svg").forEach((a) => {
        a.style.color = t.text;
      }),
      this.containerElement
        .querySelectorAll('[style*="border"]')
        .forEach((a) => {
          a.style.border &&
            a.style.border.includes("cbd5e0") &&
            (a.style.border = `1px solid ${t.componentBorder}`);
        }),
      this.renderCaches(),
      this.renderDatabaseGrid());
  }
  initialize() {
    (this.updateSizesForScreenWidth(),
      this.createAnimationStyles(),
      this.createDOMStructure(),
      this.applyStyles(),
      this.generateDatabaseColors(),
      this.initializeCaches(),
      this.config.prewarmCache && this.prewarmCaches(),
      this.renderCaches(),
      this.renderDatabaseGrid(),
      this.updateRequesterPositionWithBoundaryCheck(),
      this.addEventListeners(),
      this.setupThemeListener(),
      this.startAutomaticRequests());
  }
  createAnimationStyles() {
    const t = `geo-caching-animation-styles-${Math.random().toString(36).substr(2, 9)}`;
    let e = document.getElementById(t);
    if (!e) {
      ((e = document.createElement("style")), (e.id = t));
      const s = `
                /* Force all animated elements onto compositing layers for Safari */
                .appear, .disappear, .pulse, .move,
                .request-circle, .forward-circle, .response-circle,
                .db-response-circle, .cache-data {
                    will-change: transform, opacity;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    -webkit-perspective: 1000px;
                    perspective: 1000px;
                }
                
                /* Keep parent containers on compositing layers too */
                .mapContainer {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                @keyframes appear {
                    0% { transform: translateZ(0) scale(0); opacity: 0; }
                    100% { transform: translateZ(0) scale(1); opacity: 1; }
                }
                
                @keyframes disappear {
                    0% { transform: translateZ(0) scale(1); opacity: 1; }
                    100% { transform: translateZ(0) scale(0); opacity: 0; }
                }
                
                @keyframes pulse {
                    0% { transform: translateZ(0) scale(1); }
                    50% { transform: translateZ(0) scale(0.8); }
                    100% { transform: translateZ(0) scale(1); }
                }
                
                .appear { animation: appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .disappear { animation: disappear 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
                .pulse { animation: pulse 1s ease-in-out; }
                .move { transition: left 0.4s ease-in-out, top 0.4s ease-in-out; }
                
                /* Remove drop shadows from animation elements */
            `;
      ((e.textContent = s), document.head.appendChild(e));
    }
  }
  createDOMStructure() {
    ((this.containerElement.innerHTML = ""),
      (this.elements.mainContainer = document.createElement("div")),
      this.containerElement.appendChild(this.elements.mainContainer),
      (this.elements.mapContainer = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.mapContainer),
      (this.elements.databaseContainer = document.createElement("div")),
      this.elements.mapContainer.appendChild(this.elements.databaseContainer),
      (this.elements.database = document.createElement("div")),
      this.elements.databaseContainer.appendChild(this.elements.database),
      (this.elements.databaseGrid = document.createElement("div")),
      this.elements.database.appendChild(this.elements.databaseGrid),
      (this.elements.databaseLabel = document.createElement("div")),
      (this.elements.databaseLabel.textContent = "Database"),
      this.elements.databaseContainer.appendChild(this.elements.databaseLabel),
      (this.elements.caches = []));
    for (let n = 0; n < this.cacheLocations.length; n++) {
      const a = document.createElement("div");
      this.elements.mapContainer.appendChild(a);
      const o = document.createElement("div");
      a.appendChild(o);
      const l = document.createElement("div");
      o.appendChild(l);
      const c = document.createElement("div");
      ((c.textContent = this.cacheLocations[n].label),
        a.appendChild(c),
        this.elements.caches.push({
          container: a,
          cache: o,
          grid: l,
          label: c,
        }));
    }
    ((this.elements.requester = document.createElement("div")),
      this.elements.mapContainer.appendChild(this.elements.requester),
      (this.elements.controlsContainer = document.createElement("div")),
      this.elements.mainContainer.appendChild(this.elements.controlsContainer),
      (this.elements.leftButton = document.createElement("button")),
      this.elements.leftButton.setAttribute("data-direction", "left"));
    const t = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (t.setAttribute("width", "24"),
      t.setAttribute("height", "24"),
      t.setAttribute("viewBox", "0 0 24 24"),
      t.setAttribute("fill", "none"),
      t.setAttribute("stroke", "currentColor"),
      t.setAttribute("stroke-width", "3"),
      t.setAttribute("stroke-linecap", "square"));
    const e = document.createElementNS("http://www.w3.org/2000/svg", "path");
    (e.setAttribute("d", "M19 12H5M5 12L12 19M5 12L12 5"),
      t.appendChild(e),
      this.elements.leftButton.appendChild(t),
      this.elements.controlsContainer.appendChild(this.elements.leftButton),
      (this.elements.rightButton = document.createElement("button")),
      this.elements.rightButton.setAttribute("data-direction", "right"));
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (s.setAttribute("width", "24"),
      s.setAttribute("height", "24"),
      s.setAttribute("viewBox", "0 0 24 24"),
      s.setAttribute("fill", "none"),
      s.setAttribute("stroke", "currentColor"),
      s.setAttribute("stroke-width", "3"),
      s.setAttribute("stroke-linecap", "square"));
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    (i.setAttribute("d", "M5 12H19M19 12L12 5M19 12L12 19"),
      s.appendChild(i),
      this.elements.rightButton.appendChild(s),
      this.elements.controlsContainer.appendChild(this.elements.rightButton));
  }
  applyStyles() {
    (this.setStyles(this.containerElement, {
      width: "100%",
      maxWidth: `${this.MAP_WIDTH}px`,
      margin: "0 auto",
    }),
      this.setStyles(this.elements.mainContainer, {
        maxWidth: `${this.MAP_WIDTH}px`,
        margin: "0 auto",
        padding: "0",
        color: this.themeColors.text,
        backgroundColor: "transparent",
        position: "relative",
      }),
      this.setStyles(this.elements.mapContainer, {
        position: "relative",
        width: "100%",
        height: `${this.MAP_HEIGHT}px`,
        marginBottom: "10px",
        backgroundColor: "transparent",
        boxSizing: "border-box",
      }),
      this.setStyles(this.elements.databaseContainer, {
        position: "absolute",
        left: "50%",
        top: "15%",
        transform: "translate(-50%, -50%)",
        zIndex: "3",
      }));
    const t =
        this.config.databaseCols * this.CELL_SIZE +
        (this.config.databaseCols + 1) * this.MARGIN,
      e =
        this.config.databaseRows * this.CELL_SIZE +
        (this.config.databaseRows + 1) * this.MARGIN;
    (this.setStyles(this.elements.database, {
      backgroundColor: this.themeColors.componentBackground,
      padding: "0",
      borderRadius: "0",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      width: `${t}px`,
      height: `${e}px`,
    }),
      this.setStyles(this.elements.databaseGrid, {
        display: "grid",
        width: "fit-content",
        height: "fit-content",
        margin: "0 auto",
      }),
      this.setStyles(this.elements.databaseLabel, {
        textAlign: "center",
        marginTop: "5px",
        fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
        fontFamily: "monospace",
        fontWeight: "bold",
        color: this.themeColors.text,
      }));
    const s = this.REQUEST_SIZE * 1.5;
    (this.setStyles(this.elements.requester, {
      position: "absolute",
      width: `${s * 2}px`,
      height: `${s}px`,
      backgroundColor: this.themeColors.componentBackground,
      borderRadius: "0",
      border: "none",
      left: "50%",
      top: "75%",
      transform: "translate(-50%, -50%)",
      zIndex: "5",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
      fontFamily: "monospace",
      fontWeight: "bold",
      padding: `${this.MARGIN * 0.75}px ${this.MARGIN * 2 * 0.75}px`,
      transition: "left 0.3s ease-in-out",
    }),
      (this.elements.requester.textContent = "Requester"),
      (this.requesterPosition = { x: 0.5, y: 0.75 }));
    for (let n = 0; n < this.elements.caches.length; n++) {
      const a = this.cacheLocations[n],
        o = this.elements.caches[n],
        l = 2 * this.CELL_SIZE + this.MARGIN * 3,
        c = 2 * this.CELL_SIZE + this.MARGIN * 3;
      (this.setStyles(o.container, {
        position: "absolute",
        left: `${a.x * 100}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: "3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }),
        this.setStyles(o.cache, {
          backgroundColor: this.themeColors.componentBackground,
          borderRadius: "0",
          padding: "0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: `${l}px`,
          height: `${c}px`,
        }),
        this.setStyles(o.label, {
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "5px",
          fontSize: `${this.BASE_LABEL_FONT_SIZE * (this.SCALE_FACTOR || 1)}px`,
          fontFamily: "monospace",
          fontWeight: "bold",
          color: this.themeColors.text,
          whiteSpace: "nowrap",
        }),
        this.setStyles(o.grid, {
          display: "grid",
          width: "fit-content",
          height: "fit-content",
          margin: "0 auto",
        }));
    }
    this.setStyles(this.elements.controlsContainer, {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
      position: "absolute",
      bottom: "0",
      left: "0",
      right: "0",
      marginTop: "0",
      paddingBottom: "10px",
    });
    const i = {
      width: `${60 * (this.SCALE_FACTOR || 1)}px`,
      height: `${60 * (this.SCALE_FACTOR || 1)}px`,
      margin: `0 ${15 * (this.SCALE_FACTOR || 1)}px`,
      cursor: "pointer",
      backgroundColor: this.themeColors.componentBackground,
      border: "none",
      borderRadius: "0",
      padding: "5px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      boxShadow: "none",
      userSelect: "none",
      webkitUserSelect: "none",
      mozUserSelect: "none",
      msUserSelect: "none",
    };
    (this.setStyles(this.elements.leftButton, i),
      this.setStyles(this.elements.rightButton, i));
  }
  setStyles(t, e) {
    Object.assign(t.style, e);
  }
  generateDatabaseColors() {
    this.databaseColors = [];
    const t = this.config.databaseRows * this.config.databaseCols;
    for (let e = 0; e < t; e++) {
      const s = e % this.paletteColors.length;
      this.databaseColors.push(this.paletteColors[s]);
    }
    this.shuffleArray(this.databaseColors);
  }
  shuffleArray(t) {
    for (let e = t.length - 1; e > 0; e--) {
      const s = Math.floor(Math.random() * (e + 1));
      [t[e], t[s]] = [t[s], t[e]];
    }
    return t;
  }
  initializeCaches() {
    this.caches = [];
    for (let t = 0; t < this.cacheLocations.length; t++)
      this.caches.push(Array(4).fill(null));
  }
  prewarmCaches() {
    if (!(!Array.isArray(this.caches) || this.caches.length === 0))
      for (let t = 0; t < this.caches.length; t++) {
        const e = this.caches[t].length,
          i = Math.floor(e * 0.75),
          n = Array.from({ length: this.databaseColors.length }, (a, o) => o);
        this.shuffleArray(n);
        for (let a = 0; a < i && a < n.length; a++) {
          const o = n[a],
            l = this.databaseColors[o];
          this.caches[t][a] = l;
        }
      }
  }
  renderCaches() {
    if (Array.isArray(this.caches))
      for (let t = 0; t < this.caches.length; t++) this.renderCacheGrid(t);
  }
  renderCacheGrid(t) {
    if (!Array.isArray(this.caches) || t >= this.caches.length) return;
    const e = this.elements.caches[t].grid,
      s = this.caches[t];
    ((e.innerHTML = ""),
      this.setStyles(e, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(2, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(2, ${this.CELL_SIZE}px)`,
      }));
    for (let i = 0; i < s.length; i++) {
      const n = document.createElement("div");
      (this.setStyles(n, {
        border: s[i] ? "none" : `1px solid ${this.themeColors.componentBorder}`,
        width: `${this.CELL_SIZE}px`,
        height: `${this.CELL_SIZE}px`,
        boxSizing: "border-box",
        boxShadow: "none",
      }),
        n.setAttribute("data-index", i),
        this.applyCellStyle(n, s[i], !s[i]),
        e.appendChild(n));
    }
  }
  renderDatabaseGrid() {
    const t = this.elements.databaseGrid;
    ((t.innerHTML = ""),
      this.setStyles(t, {
        display: "grid",
        gap: `${this.MARGIN}px`,
        padding: `${this.MARGIN}px`,
        gridTemplateRows: `repeat(${this.config.databaseRows}, ${this.CELL_SIZE}px)`,
        gridTemplateColumns: `repeat(${this.config.databaseCols}, ${this.CELL_SIZE}px)`,
      }));
    for (let e = 0; e < this.databaseColors.length; e++) {
      const s = document.createElement("div");
      (this.setStyles(s, {
        width: `${this.CELL_SIZE}px`,
        height: `${this.CELL_SIZE}px`,
        boxSizing: "border-box",
        boxShadow: "none",
      }),
        this.applyCellStyle(s, this.databaseColors[e], !0),
        t.appendChild(s));
    }
  }
  updateRequesterPosition() {
    this.updateRequesterPositionWithBoundaryCheck();
  }
  moveRequester(t) {
    switch (t) {
      case "left":
        this.requesterPosition.x = Math.max(0, this.requesterPosition.x - 0.06);
        break;
      case "right":
        this.requesterPosition.x = Math.min(1, this.requesterPosition.x + 0.06);
        break;
    }
    this.updateRequesterPositionWithBoundaryCheck();
  }
  updateRequesterPositionWithBoundaryCheck() {
    const t = this.elements.mapContainer.offsetWidth || this.MAP_WIDTH,
      e = this.elements.requester.offsetWidth,
      s = t - e / 2,
      i = e / 2;
    let n = this.requesterPosition.x * t;
    ((n = Math.max(i, Math.min(s, n))), (this.requesterPosition.x = n / t));
    const a = 0.75 * this.MAP_HEIGHT;
    ((this.elements.requester.style.left = `${n}px`),
      (this.elements.requester.style.top = `${a}px`));
  }
  startAutomaticRequests() {
    this.requestInterval ||
      (this.makeRequest(),
      (this.requestInterval = setInterval(() => {
        this.makeRequest();
      }, this.config.requestInterval)));
  }
  stopAutomaticRequests() {
    this.requestInterval &&
      (clearInterval(this.requestInterval), (this.requestInterval = null));
  }
  addEventListeners() {
    (this.elements.leftButton.addEventListener("click", () =>
      this.moveRequester("left"),
    ),
      this.elements.rightButton.addEventListener("click", () =>
        this.moveRequester("right"),
      ),
      document.addEventListener("keydown", (t) => {
        switch (t.key) {
          case "ArrowLeft":
            this.moveRequester("left");
            break;
          case "ArrowRight":
            this.moveRequester("right");
            break;
        }
      }),
      window.addEventListener("resize", this.handleResize.bind(this)),
      window.addEventListener("beforeunload", () => {
        this.stopAutomaticRequests();
      }));
  }
  handleResize() {
    (this.updateSizesForScreenWidth(),
      this.applyStyles(),
      this.renderCaches(),
      this.renderDatabaseGrid(),
      this.updateRequesterPositionWithBoundaryCheck());
  }
  getCurrentRequesterPosition() {
    const t = this.elements.requester.getBoundingClientRect(),
      e = this.elements.mapContainer.getBoundingClientRect();
    return {
      x: t.left - e.left + t.width / 2,
      y: t.top - e.top + t.height / 2,
    };
  }
  getCachePosition(t) {
    const e = this.elements.caches[t].cache.getBoundingClientRect(),
      s = this.elements.mapContainer.getBoundingClientRect();
    return {
      x: e.left - s.left + e.width / 2,
      y: e.top - s.top + e.height / 2,
    };
  }
  getCacheCellPosition(t, e) {
    const i = this.elements.caches[t].grid.querySelector(`[data-index="${e}"]`);
    if (!i) return this.getCachePosition(t);
    const n = i.getBoundingClientRect(),
      a = this.elements.mapContainer.getBoundingClientRect();
    return {
      x: n.left - a.left + n.width / 2,
      y: n.top - a.top + n.height / 2,
    };
  }
  getDatabasePosition() {
    const t = this.elements.database.getBoundingClientRect(),
      e = this.elements.mapContainer.getBoundingClientRect();
    return {
      x: t.left - e.left + t.width / 2,
      y: t.top - e.top + t.height / 2,
    };
  }
  findDatabaseIndexByColor(t) {
    return this.databaseColors.indexOf(t);
  }
  getDatabaseCellPosition(t) {
    if (t < 0 || t >= this.databaseColors.length)
      return this.getDatabasePosition();
    const s = this.elements.databaseGrid.querySelectorAll("div");
    if (!s || t >= s.length) return this.getDatabasePosition();
    const n = s[t].getBoundingClientRect(),
      a = this.elements.mapContainer.getBoundingClientRect();
    return {
      x: n.left - a.left + n.width / 2,
      y: n.top - a.top + n.height / 2,
    };
  }
  makeRequest() {
    const t = Math.floor(Math.random() * this.databaseColors.length),
      e = this.databaseColors[t],
      s = this.findNearestCache(),
      i = this.caches[s].includes(e);
    this.animateRequest(e, s, i);
  }
  findNearestCache() {
    const t = [];
    for (let e = 0; e < this.cacheLocations.length; e++) {
      const s = this.cacheLocations[e],
        i = this.calculateDistance(this.requesterPosition, s);
      t.push({ index: e, distance: i });
    }
    return (t.sort((e, s) => e.distance - s.distance), t[0].index);
  }
  calculateDistance(t, e) {
    return Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
  }
  animateRequest(t, e, s) {
    const i = this.getCurrentRequesterPosition(),
      n = this.nextRequestId++,
      a = document.createElement("div");
    ((a.className = `request-circle request-${n}`),
      this.setStyles(a, {
        position: "absolute",
        width: `${this.REQUEST_SIZE / 2}px`,
        height: `${this.REQUEST_SIZE / 2}px`,
        backgroundColor: t,
        borderRadius: "50%",
        zIndex: "10",
        left: `${i.x - this.REQUEST_SIZE / 4}px`,
        top: `${i.y - this.REQUEST_SIZE / 4}px`,
        transform: "translateZ(0) scale(0)",
        opacity: "0",
        boxShadow: "none",
        willChange: "transform, opacity",
      }),
      this.elements.mapContainer.appendChild(a));
    const o = { id: n, color: t, cacheIndex: e, isInCache: s };
    (this.activeRequests.push(o),
      a.classList.add("appear"),
      setTimeout(
        s
          ? () => {
              const l = this.caches[e].indexOf(t),
                c = this.getCacheCellPosition(e, l);
              (a.classList.add("move"),
                (a.style.left = `${c.x - this.REQUEST_SIZE / 4}px`),
                (a.style.top = `${c.y - this.REQUEST_SIZE / 4}px`),
                setTimeout(() => {
                  (this.animateResponseFromCache(n, t, c, i),
                    a.classList.add("disappear"),
                    setTimeout(() => {
                      a.remove();
                    }, 300));
                }, 400));
            }
          : () => {
              const l = this.getCachePosition(e);
              (a.classList.add("move"),
                (a.style.left = `${l.x - this.REQUEST_SIZE / 4}px`),
                (a.style.top = `${l.y - this.REQUEST_SIZE / 4}px`),
                setTimeout(() => {
                  (a.classList.add("pulse"),
                    setTimeout(() => {
                      (this.animateCacheToDatabase(n, t, e, l),
                        a.classList.add("disappear"),
                        setTimeout(() => {
                          a.remove();
                        }, 300));
                    }, 300));
                }, 500));
            },
        300,
      ));
  }
  animateResponseFromCache(t, e, s, i = null) {
    const n = i || this.getCurrentRequesterPosition(),
      a = this.createAnimatedDataElement(
        `response-circle response-${t}`,
        e,
        null,
        s.x,
        s.y,
        0,
        0,
      );
    (this.elements.mapContainer.appendChild(a),
      a.classList.add("appear"),
      setTimeout(() => {
        (a.classList.add("move"),
          (a.style.left = `${n.x - this.CELL_SIZE / 2}px`),
          (a.style.top = `${n.y - this.CELL_SIZE / 2}px`),
          setTimeout(() => {
            (a.classList.add("disappear"),
              setTimeout(() => {
                (a.remove(),
                  (this.activeRequests = this.activeRequests.filter(
                    (o) => o.id !== t,
                  )));
              }, 300));
          }, 400));
      }, 300));
  }
  animateCacheToDatabase(t, e, s, i) {
    const n = this.getDatabasePosition(),
      a = this.findDatabaseIndexByColor(e),
      o = a !== -1 ? this.getDatabaseCellPosition(a) : n,
      l = document.createElement("div");
    ((l.className = `forward-circle forward-${t}`),
      this.setStyles(l, {
        position: "absolute",
        width: `${this.REQUEST_SIZE / 2}px`,
        height: `${this.REQUEST_SIZE / 2}px`,
        backgroundColor: e,
        borderRadius: "50%",
        zIndex: "10",
        left: `${i.x - this.REQUEST_SIZE / 4}px`,
        top: `${i.y - this.REQUEST_SIZE / 4}px`,
        transform: "translateZ(0) scale(0)",
        opacity: "0",
        willChange: "transform, opacity",
      }),
      this.elements.mapContainer.appendChild(l),
      l.classList.add("appear"),
      setTimeout(() => {
        (l.classList.add("move"),
          (l.style.left = `${o.x - this.REQUEST_SIZE / 4}px`),
          (l.style.top = `${o.y - this.REQUEST_SIZE / 4}px`),
          setTimeout(() => {
            (l.classList.add("pulse"),
              setTimeout(() => {
                (l.classList.add("disappear"),
                  setTimeout(() => {
                    l.remove();
                  }, 300));
                const c = this.findTargetCacheSlot(s, e),
                  h = this.findDatabaseIndexByColor(e),
                  r =
                    h !== -1
                      ? this.getDatabaseCellPosition(h)
                      : this.getDatabasePosition(),
                  d = this.getCachePosition(s),
                  p = this.createAnimatedDataElement(
                    `db-response-circle db-response-${t}`,
                    e,
                    null,
                    r.x,
                    r.y,
                    0,
                    0,
                  );
                (this.elements.mapContainer.appendChild(p),
                  p.classList.add("appear"),
                  setTimeout(() => {
                    (p.classList.add("move"),
                      (p.style.left = `${d.x - this.CELL_SIZE / 2}px`),
                      (p.style.top = `${d.y - this.CELL_SIZE / 2}px`),
                      setTimeout(() => {
                        const m = this.getCacheCellPosition(s, c);
                        (p.classList.add("move"),
                          (p.style.left = `${m.x - this.CELL_SIZE / 2}px`),
                          (p.style.top = `${m.y - this.CELL_SIZE / 2}px`),
                          setTimeout(() => {
                            (this.addToCache(s, e),
                              p.classList.add("pulse"),
                              setTimeout(() => {
                                (p.classList.add("disappear"),
                                  setTimeout(() => {
                                    p.remove();
                                  }, 300));
                                const f = this.getCacheCellPosition(s, c);
                                this.animateResponseFromCache(t, e, f);
                              }, 500));
                          }, 300));
                      }, 800));
                  }, 300));
              }, 500));
          }, 800));
      }, 300));
  }
  findTargetCacheSlot(t, e) {
    if (!Array.isArray(this.caches) || t >= this.caches.length) return 0;
    const s = this.caches[t].indexOf(null);
    if (s !== -1) return s;
    if (!this.cacheUsage) {
      this.cacheUsage = [];
      for (let n = 0; n < this.caches.length; n++)
        this.cacheUsage[n] = Array.from(
          { length: this.caches[n].length },
          (a, o) => o,
        );
    }
    return this.cacheUsage[t][0];
  }
  updateCacheUsage(t, e) {
    if (!this.cacheUsage) {
      this.cacheUsage = [];
      for (let i = 0; i < this.caches.length; i++)
        this.cacheUsage[i] = Array.from(
          { length: this.caches[i].length },
          (n, a) => a,
        );
    }
    const s = this.cacheUsage[t].indexOf(e);
    (s !== -1 && this.cacheUsage[t].splice(s, 1), this.cacheUsage[t].push(e));
  }
  addToCache(t, e) {
    if (!Array.isArray(this.caches) || t >= this.caches.length) return;
    const s = this.caches[t].indexOf(null);
    if (s !== -1) ((this.caches[t][s] = e), this.updateCacheUsage(t, s));
    else {
      const i = this.cacheUsage[t][0];
      ((this.caches[t][i] = e), this.updateCacheUsage(t, i));
    }
    this.renderCacheGrid(t);
  }
  createAnimatedDataElement(t, e, s, i, n, a = 0, o = 0) {
    const l = document.createElement("div");
    if (
      ((l.className = t),
      this.setStyles(l, {
        position: "absolute",
        width: `${this.CELL_SIZE}px`,
        height: `${this.CELL_SIZE}px`,
        left: `${i - this.CELL_SIZE / 2}px`,
        top: `${n - this.CELL_SIZE / 2}px`,
        transform: `translateZ(0) scale(${a})`,
        opacity: o,
        zIndex: "10",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: "bold",
        boxShadow: "none",
        willChange: "transform, opacity",
      }),
      this.postgresMode && e)
    ) {
      l.style.backgroundColor = "transparent";
      const c = this.createPostgresSVG(e);
      if ((l.appendChild(c), s != null)) {
        const h = document.createElement("div");
        ((h.textContent = s),
          (h.style.position = "absolute"),
          (h.style.top = "50%"),
          (h.style.left = "50%"),
          (h.style.transform = "translate(-50%, -50%)"),
          (h.style.fontSize = "15px"),
          (h.style.fontWeight = "bold"),
          (h.style.color = "#FFFFFF"),
          (h.style.textShadow =
            "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)"),
          (h.style.pointerEvents = "none"),
          (h.style.zIndex = "10"),
          l.appendChild(h));
      }
    } else
      ((l.style.backgroundColor = e),
        s != null &&
          ((l.textContent = s),
          (l.style.color = this.getContrastingTextColor
            ? this.getContrastingTextColor(e)
            : "#FFFFFF")));
    return l;
  }
}
O(P);
const q = class q {
  constructor(t, e, s = {}) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Stats container element with ID '${t}' not found`);
      return;
    }
    ((this.instanceId = `cache-stats-${q.instanceCounter++}`),
      (this.cacheVizElementId = e),
      (this.statsElements = null),
      (this.options = {
        maxDataPoints: s.maxDataPoints || 22,
        updateInterval: s.updateInterval || 1e3,
        height: s.height || 150,
        width: s.width || "100%",
        barSpacing: s.barSpacing || 2,
        barWidthPercent: s.barWidthPercent || 0.041,
        showLegend: !1,
      }),
      this.updateThemeColors(),
      (this.stats = { hits: 0, misses: 0, hitRate: 0, hitRateHistory: [] }),
      (this.requestHistory = []),
      (this.ROLLING_WINDOW_SIZE = 50),
      (this.prevStats = { hits: 0, misses: 0 }),
      (this.elements = {
        hitsValue: null,
        missesValue: null,
        hitRateValue: null,
      }),
      this.createDOMStructure(),
      this.setupCacheListeners(),
      this.startUpdateInterval(),
      this.setupThemeListener());
  }
  updateThemeColors() {
    const t = _();
    this.themeColors = t;
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme(), this.drawGraph());
    });
  }
  applyTheme() {
    if (!this.containerElement) return;
    const t = this.themeColors;
    ((this.containerElement.style.color = t.text),
      this.graphContainer &&
        ((this.graphContainer.style.backgroundColor = "transparent"),
        (this.graphContainer.style.border = `1px solid ${t.border}`)),
      this.graphContainer.querySelectorAll(".grid-line").forEach((n) => {
        n.style.backgroundColor = t.canvasGrid;
      }),
      this.graphContainer.querySelectorAll(".grid-label").forEach((n) => {
        n.style.color = t.text;
      }),
      this.containerElement.querySelectorAll(".stat-box").forEach((n) => {
        n.style.border = `1px solid ${t.border}`;
      }),
      this.elements.noteContainer &&
        (this.elements.noteContainer.style.color = t.text));
  }
  createDOMStructure() {
    if (
      ((this.containerElement.innerHTML = ""),
      (this.containerElement.style.width =
        typeof this.options.width == "number"
          ? `${this.options.width}px`
          : this.options.width),
      (this.containerElement.style.fontFamily = "monospace"),
      (this.containerElement.style.color = this.themeColors.text),
      this.containerElement.classList.add(this.instanceId),
      !document.getElementById(`${this.instanceId}-styles`))
    ) {
      const i = document.createElement("style");
      ((i.id = `${this.instanceId}-styles`),
        (i.textContent = `
                @media (max-width: 480px) {
                    .${this.instanceId}-stats-container {
                        flex-direction: column !important;
                    }
                    .${this.instanceId}-stats-container > div {
                        flex: 1 1 100% !important;
                        width: 100% !important;
                    }
                }
            `),
        document.head.appendChild(i));
    }
    ((this.graphContainer = document.createElement("div")),
      (this.graphContainer.style.width = "100%"),
      (this.graphContainer.style.height = `${this.options.height}px`),
      (this.graphContainer.style.backgroundColor = "transparent"),
      (this.graphContainer.style.position = "relative"),
      (this.graphContainer.style.marginBottom = "10px"),
      (this.graphContainer.style.border = `1px solid ${this.themeColors.border}`),
      (this.graphContainer.style.boxSizing = "border-box"),
      this.containerElement.appendChild(this.graphContainer),
      (this.canvas = document.createElement("canvas")),
      (this.canvas.id = `${this.instanceId}-canvas`),
      (this.canvas.width = this.graphContainer.clientWidth),
      (this.canvas.height = this.options.height),
      (this.canvas.style.width = "100%"),
      (this.canvas.style.height = "100%"),
      this.graphContainer.appendChild(this.canvas),
      (this.ctx = this.canvas.getContext("2d")),
      this.createGridLines());
    const t = document.createElement("div");
    ((t.style.display = "flex"),
      (t.style.justifyContent = "space-between"),
      (t.style.marginTop = "10px"),
      (t.style.flexWrap = "wrap"),
      (t.style.gap = "10px"),
      (t.className = `${this.instanceId}-stats-container`),
      this.containerElement.appendChild(t),
      this.createStatBox(t, "Hits:", "hitsValue", I.getColor(0)),
      this.createStatBox(t, "Misses:", "missesValue", I.getColor(3)),
      this.createStatBox(t, "Hit Rate:", "hitRateValue", I.getColor(5)));
    const e = document.createElement("div");
    ((e.id = `${this.instanceId}-note`),
      (e.style.textAlign = "center"),
      (e.style.marginTop = "10px"),
      (e.style.fontSize = "14px"),
      (e.style.fontStyle = "italic"),
      (e.style.color = this.themeColors.text),
      (e.style.fontFamily = "monospace"),
      (e.style.height = "20px"),
      (e.style.visibility = "hidden"),
      this.containerElement.appendChild(e),
      (this.elements.noteContainer = e));
    const s = () => {
      ((this.canvas.width = this.graphContainer.clientWidth), this.drawGraph());
    };
    (window.addEventListener("resize", s), (this.resizeHandler = s));
  }
  createGridLines() {
    for (let t = 1; t <= 4; t++) {
      const e = document.createElement("div"),
        s = t * 25;
      if (
        ((e.style.position = "absolute"),
        (e.style.width = "calc(100% - 40px)"),
        (e.style.height = "1px"),
        (e.style.backgroundColor = this.themeColors.canvasGrid),
        (e.className = "grid-line"),
        (e.style.top = `${s}%`),
        (e.style.left = "0"),
        this.graphContainer.appendChild(e),
        t < 4)
      ) {
        const i = document.createElement("div");
        ((i.textContent = `${100 - t * 25}%`),
          (i.style.position = "absolute"),
          (i.style.right = "5px"),
          (i.style.fontSize = "19px"),
          (i.style.lineHeight = "1"),
          (i.style.color = this.themeColors.text),
          (i.className = "grid-label"),
          (i.style.fontFamily = "monospace"),
          (i.style.fontWeight = "bold"),
          (i.style.top = `${s}%`),
          (i.style.transform = "translateY(-50%)"),
          this.graphContainer.appendChild(i));
      }
    }
  }
  createStatBox(t, e, s, i) {
    const n = document.createElement("div");
    ((n.style.padding = "8px"),
      (n.style.border = `1px solid ${this.themeColors.border}`),
      (n.className = "stat-box"),
      (n.style.flex = "1 1 30%"),
      (n.style.minWidth = "150px"),
      (n.style.textAlign = "left"),
      (n.style.boxSizing = "border-box"),
      (n.style.display = "flex"),
      (n.style.justifyContent = "space-between"));
    const a = document.createElement("span");
    ((a.textContent = e),
      (a.style.fontWeight = "bold"),
      (a.style.fontFamily = "monospace"),
      n.appendChild(a));
    const o = `${this.instanceId}-${s}`,
      l = document.createElement("span");
    ((l.id = o),
      (l.textContent = "0"),
      (l.style.color = i),
      (l.style.fontWeight = "bold"),
      (l.style.minWidth = "40px"),
      (l.style.textAlign = "right"),
      (l.style.fontFamily = "monospace"),
      n.appendChild(l),
      (this.elements[s] = l),
      t.appendChild(n));
  }
  setupCacheListeners() {
    (this.findCacheVizElement(),
      this.statsElements ||
        ((this.retryCount = 0),
        (this.retryInterval = setInterval(() => {
          (this.retryCount++,
            this.findCacheVizElement(),
            (this.statsElements || this.retryCount >= 10) &&
              (clearInterval(this.retryInterval), (this.retryInterval = null)));
        }, 500))));
  }
  findCacheVizElement() {
    let t = null,
      e = null;
    if (window.top)
      try {
        const a = window.top.document.querySelectorAll("iframe");
        for (const o of a)
          try {
            const l = o.contentDocument || o.contentWindow.document;
            if (
              ((t = l.querySelector(`[data-id="${this.cacheVizElementId}"]`)),
              t)
            ) {
              e = l;
              break;
            }
          } catch {}
      } catch {}
    if (!t) return;
    const s = e.getElementById(`${this.cacheVizElementId}-hits`),
      i = e.getElementById(`${this.cacheVizElementId}-misses`),
      n = e.getElementById(`${this.cacheVizElementId}-requests`);
    !s ||
      !i ||
      !n ||
      ((this.statsElements = { hits: s, misses: i, requests: n }),
      (this.prevStats.hits = parseInt(s.textContent) || 0),
      (this.prevStats.misses = parseInt(i.textContent) || 0),
      this.setupMutationObservers(),
      this.readStatsFromDOM());
  }
  setupMutationObservers() {
    if (!this.statsElements) return;
    const t = { childList: !0, characterData: !0, subtree: !0 };
    this.observers = [];
    const e = (s) => {
      this.readStatsFromDOM();
    };
    for (const [s, i] of Object.entries(this.statsElements)) {
      const n = new MutationObserver(e);
      (n.observe(i, t), this.observers.push(n));
    }
  }
  readStatsFromDOM() {
    if (!this.statsElements) return;
    const t = parseInt(this.statsElements.hits.textContent) || 0,
      e = parseInt(this.statsElements.misses.textContent) || 0,
      s = t - this.prevStats.hits,
      i = e - this.prevStats.misses;
    if (s > 0 || i > 0) {
      const n = Date.now();
      for (let a = 0; a < s; a++)
        this.requestHistory.push({ type: "hit", timestamp: n });
      for (let a = 0; a < i; a++)
        this.requestHistory.push({ type: "miss", timestamp: n });
      ((this.stats.hits = t),
        (this.stats.misses = e),
        (this.prevStats.hits = t),
        (this.prevStats.misses = e),
        this.updateStats());
    }
  }
  startUpdateInterval() {
    ((this.updateInterval = setInterval(() => {
      this.updateUI();
    }, this.options.updateInterval)),
      window.addEventListener("beforeunload", () => {
        this.stopUpdateInterval();
      }));
  }
  stopUpdateInterval() {
    this.updateInterval &&
      (clearInterval(this.updateInterval), (this.updateInterval = null));
  }
  destroy() {
    (this.stopUpdateInterval(),
      this.retryInterval &&
        (clearInterval(this.retryInterval), (this.retryInterval = null)),
      this.observers &&
        (this.observers.forEach((e) => e.disconnect()), (this.observers = [])),
      this.resizeHandler &&
        window.removeEventListener("resize", this.resizeHandler));
    const t = document.getElementById(`${this.instanceId}-styles`);
    (t && t.remove(),
      (this.elements = null),
      (this.ctx = null),
      (this.canvas = null),
      (this.graphContainer = null),
      this.containerElement && (this.containerElement.innerHTML = ""));
  }
  updateStats() {
    this.requestHistory.length > this.ROLLING_WINDOW_SIZE &&
      (this.requestHistory = this.requestHistory.slice(
        -this.ROLLING_WINDOW_SIZE,
      ));
    const t = this.requestHistory,
      e = t.filter((o) => o.type === "hit").length,
      s = t.filter((o) => o.type === "miss").length,
      i = e + s;
    ((this.stats.hits = e), (this.stats.misses = s));
    const n = i > 0 ? (e / i) * 100 : 0;
    this.stats.hitRate = n;
    const a = Date.now();
    (this.stats.hitRateHistory.push([a, n]),
      this.stats.hitRateHistory.length > this.options.maxDataPoints &&
        this.stats.hitRateHistory.shift(),
      this.updateUI());
  }
  updateUI() {
    (this.elements.hitsValue &&
      (this.elements.hitsValue.textContent = this.stats.hits),
      this.elements.missesValue &&
        (this.elements.missesValue.textContent = this.stats.misses),
      this.elements.hitRateValue &&
        (this.elements.hitRateValue.textContent = `${this.stats.hitRate.toFixed(1)}%`),
      this.elements.noteContainer &&
        (this.requestHistory.length >= this.ROLLING_WINDOW_SIZE
          ? ((this.elements.noteContainer.style.visibility = "visible"),
            (this.elements.noteContainer.textContent = `* Based on last ${this.ROLLING_WINDOW_SIZE} requests`))
          : ((this.elements.noteContainer.style.visibility = "hidden"),
            (this.elements.noteContainer.textContent = ""))),
      this.drawGraph());
  }
  drawGraph() {
    if (!this.ctx || this.stats.hitRateHistory.length < 1) return;
    const t = this.ctx,
      e = this.canvas.width,
      s = this.canvas.height;
    this.barStates || ((this.barStates = []), (this.animationStartTime = null));
    const i = this.stats.hitRateHistory,
      n = e * this.options.barWidthPercent,
      a = Math.min(this.options.maxDataPoints, i.length),
      o = Math.max(0, i.length - a),
      l = this.options.barSpacing,
      c = 60,
      h = [];
    for (let y = 0; y < this.options.maxDataPoints; y++) {
      const g = (this.options.maxDataPoints - 1 - y) * (n + l);
      h.push(e - g - n - c);
    }
    const r = [];
    for (let y = 0; y < a; y++) {
      const g = o + y,
        [L, T] = i[g],
        A = (s * T) / 100,
        C = this.options.maxDataPoints - a + y,
        b = h[C],
        S = s - A,
        $ = this.getColorForHitRate(T);
      r.push({
        x: b,
        y: S,
        barWidth: n,
        barHeight: A,
        color: $,
        timestamp: L,
        hitRate: T,
        isNewBar: !1,
      });
    }
    this.barStates.length < r.length &&
      r.length > 0 &&
      (r[r.length - 1].isNewBar = !0);
    const p = i.length > 0 ? i[i.length - 1][0] : 0,
      m = this.lastProcessedTimestamp !== p;
    if (
      ((this.lastProcessedTimestamp = p),
      i.length > this.barStates.length ||
        this.barStates.length === 0 ||
        this.barStates.length !== r.length ||
        m)
    )
      if (((this.animationStartTime = Date.now()), this.barStates.length === 0))
        this.barStates = r.map((y, g) => {
          const L = { ...y };
          return (g === r.length - 1 && (L.x = e + n), L);
        });
      else if (
        i.length > this.barStates.length ||
        this.stats.hitRateHistory.length >= this.options.maxDataPoints ||
        m
      ) {
        const y = [...this.barStates];
        if (
          ((this.barStates = []),
          this.stats.hitRateHistory.length >= this.options.maxDataPoints)
        )
          for (let g = 0; g < r.length - 1; g++)
            this.barStates.push({
              x: g + 1 < y.length ? y[g + 1].x : y[g].x,
              y: g + 1 < y.length ? y[g + 1].y : y[g].y,
              barWidth: y[g].barWidth,
              barHeight: g + 1 < y.length ? y[g + 1].barHeight : y[g].barHeight,
              color: g + 1 < y.length ? y[g + 1].color : y[g].color,
              targetX: r[g].x,
              targetY: r[g].y,
              targetHeight: r[g].barHeight,
              targetColor: r[g].color,
            });
        else
          for (let g = 0; g < r.length - 1; g++) {
            const L = g < y.length ? y[g] : r[g];
            this.barStates.push({
              ...L,
              targetX: r[g].x,
              targetY: r[g].y,
              targetHeight: r[g].barHeight,
              targetColor: r[g].color,
            });
          }
        this.barStates.push({
          ...r[r.length - 1],
          x: e + n,
          targetX: r[r.length - 1].x,
          targetY: r[r.length - 1].y,
          targetHeight: r[r.length - 1].barHeight,
          targetColor: r[r.length - 1].color,
        });
      } else
        this.barStates.length > r.length &&
          (this.barStates = r.map((y) => ({ ...y })));
    const f = 300,
      x = Date.now(),
      v = this.animationStartTime ? x - this.animationStartTime : f,
      w = Math.min(1, v / f);
    J(t, e, s);
    for (let y = 0; y < this.barStates.length; y++) {
      const g = this.barStates[y];
      (g.targetX !== void 0 &&
        ((g.x = g.x + (g.targetX - g.x) * w),
        (g.y = g.y + (g.targetY - g.y) * w),
        (g.barHeight = g.barHeight + (g.targetHeight - g.barHeight) * w),
        (g.color = g.targetColor),
        w === 1 &&
          (delete g.targetX,
          delete g.targetY,
          delete g.targetHeight,
          delete g.targetColor,
          delete g.isNewBar)),
        (t.fillStyle = g.color),
        t.fillRect(g.x, g.y, g.barWidth, g.barHeight));
    }
    w < 1
      ? requestAnimationFrame(() => this.drawGraph())
      : (this.barStates = r.map((y) => ({ ...y })));
  }
  getColorForHitRate(t) {
    return this.themeColors.componentBackground;
  }
};
H(q, "instanceCounter", 0);
let Z = q;
class ot {
  constructor(t, e = !1, s = null) {
    if (
      ((this.containerElement = document.querySelector(`[data-id="${t}"]`)),
      !this.containerElement)
    ) {
      console.error(`Element with ID '${t}' not found`);
      return;
    }
    ((this.enabled = e),
      (this.onToggle = s),
      this.updateThemeColors(),
      this.createToggle(),
      this.setupThemeListener());
  }
  updateThemeColors() {
    this.themeColors = _();
  }
  setupThemeListener() {
    M((t) => {
      (this.updateThemeColors(), this.applyTheme());
    });
  }
  applyTheme() {
    this.label && (this.label.style.color = this.themeColors.text);
  }
  createToggle() {
    ((this.containerElement.innerHTML = ""),
      (this.globalPGToggleDiv = document.createElement("div")),
      (this.globalPGToggleDiv.id = "caching-pg-toggle"),
      (this.globalPGToggleDiv.style.display = "none"),
      this.containerElement.appendChild(this.globalPGToggleDiv),
      console.log("created"),
      console.log(this.globalPGToggleDiv),
      console.log(this.containerElement));
    const t = document.createElement("div");
    ((t.style.display = "flex"),
      (t.style.alignItems = "center"),
      (t.style.gap = "12px"),
      (t.style.fontFamily = "monospace"),
      (t.style.fontSize = "14px"),
      (t.style.userSelect = "none"));
    const e = document.createElement("span");
    ((e.textContent = "Postgres Mode"),
      (e.style.color = this.themeColors.text));
    const s = document.createElement("div");
    ((s.style.width = "50px"),
      (s.style.height = "24px"),
      (s.style.backgroundColor = this.enabled ? "#4CAF50" : "#ccc"),
      (s.style.borderRadius = "12px"),
      (s.style.position = "relative"),
      (s.style.cursor = "pointer"),
      (s.style.transition = "background-color 0.3s ease"));
    const i = document.createElement("div");
    ((i.style.width = "20px"),
      (i.style.height = "20px"),
      (i.style.backgroundColor = "white"),
      (i.style.borderRadius = "50%"),
      (i.style.position = "absolute"),
      (i.style.top = "2px"),
      (i.style.left = this.enabled ? "28px" : "2px"),
      (i.style.transition = "left 0.3s ease"),
      (i.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)"),
      s.appendChild(i),
      s.addEventListener("click", () => {
        this.toggle();
      }),
      t.appendChild(e),
      t.appendChild(s),
      this.containerElement.appendChild(t),
      (this.track = s),
      (this.circle = i),
      (this.label = e));
  }
  toggle() {
    ((this.enabled = !this.enabled),
      this.updateVisual(),
      (this.globalPGToggleDiv.innerHTML = this.enabled),
      this.onToggle && this.onToggle(this.enabled));
  }
  updateVisual() {
    ((this.track.style.backgroundColor = this.enabled ? "#4CAF50" : "#ccc"),
      (this.circle.style.left = this.enabled ? "28px" : "2px"));
  }
  setState(t) {
    ((this.enabled = t), this.updateVisual());
  }
  getState() {
    return this.enabled;
  }
}
const W = document.querySelector("#app");
if (W) {
  const u = document.URL.split("#")[1];
  if (u) {
    const t = document.createElement("div");
    ((t.dataset.id = u), W.appendChild(t));
  }
}
function E(u) {
  return new Promise((t) => {
    if (document.querySelector(u)) return t(document.querySelector(u));
    const e = new MutationObserver((s) => {
      document.querySelector(u) &&
        (e.disconnect(), t(document.querySelector(u)));
    });
    e.observe(document.documentElement, { childList: !0, subtree: !0 });
  });
}
E('[data-id="title"]').then((u) => {
  new st(u.dataset.id);
});
E('[data-id="tweet-example"]').then((u) => {
  new tt(u.dataset.id, {
    imageName: "karpathy.jpg",
    name: "Andrej Karpathy",
    handle: "karpathy",
    text: "The hottest new programming language is English",
    date: "Jan 24, 2023",
    likes: 43e3,
    retweets: 6900,
    tweetId: "1617979122625712128",
  });
});
E('[data-id="karpathy-tweet-simulator"]').then((u) => {
  new et(u.dataset.id, {
    totalImpressions: 7e6,
    publishDate: "2023-01-24",
    endDate: "2023-02-24",
    height: 250,
    animationDuration: 12e3,
    impressionsColor: I.getColor(0),
  });
});
E('[data-id="cache-0"]').then((u) => {
  new z(
    u.dataset.id,
    3,
    3,
    [{ rows: 3, cols: 1, label: "" }],
    "",
    "",
    "random",
    "automatic",
    !0,
    2e3,
  );
});
E('[data-id="cache-basic"]').then((u) => {
  new z(
    u.dataset.id,
    4,
    3,
    [{ rows: 4, cols: 1, label: "fast + small" }],
    "data requester",
    "slow + large",
    "random",
    "automatic",
    !0,
    4e3,
  );
});
E('[data-id="cache-hit"]').then((u) => {
  new z(
    u.dataset.id,
    3,
    3,
    [{ rows: 3, cols: 1, label: "fast storage" }],
    "requester",
    "slow storage",
    "random",
    "automatic-hit",
    !0,
    2500,
  );
});
E('[data-id="cache-miss"]').then((u) => {
  new z(
    u.dataset.id,
    3,
    3,
    [{ rows: 3, cols: 1, label: "fast storage" }],
    "requester",
    "slow storage",
    "random",
    "automatic-miss",
    !0,
    2500,
  );
});
E('[data-id="cache-hr-low"]').then((u) => {
  new z(
    u.dataset.id,
    4,
    3,
    [{ rows: 3, cols: 1, label: "cache" }],
    "requester",
    "storage",
    "random",
    "automatic",
    !0,
  );
});
E('[data-id="cache-hr-low-stats"]').then((u) => {
  new Z(u.dataset.id, "cache-hr-low", {
    height: 100,
    lineColor: I.getColor(0),
  });
});
E('[data-id="cache-hr-high"]').then((u) => {
  new z(
    u.dataset.id,
    4,
    3,
    [{ rows: 4, cols: 2, label: "cache" }],
    "requester",
    "storage",
    "random",
    "automatic",
    !0,
  );
});
E('[data-id="cache-hr-high-stats"]').then((u) => {
  new Z(u.dataset.id, "cache-hr-high", {
    height: 100,
    lineColor: I.getColor(3),
  });
});
E('[data-id="cache-1"]').then((u) => {
  new z(
    u.dataset.id,
    5,
    2,
    [{ rows: 5, cols: 1, label: "RAM" }],
    "CPU",
    "Hard Drive",
    "random",
    "manual",
  );
});
E('[data-id="cache-2"]').then((u) => {
  new z(
    u.dataset.id,
    5,
    2,
    [
      { rows: 2, cols: 1, label: "CPU Cache" },
      { rows: 5, cols: 1, label: "RAM" },
    ],
    "CPU",
    "Hard Drive",
    "random",
    "manual",
  );
});
E('[data-id="cache-2-stats"]').then((u) => {
  new Z(u.dataset.id, "cache-2", { height: 120, lineColor: I.getColor(2) });
});
E('[data-id="cache-3"]').then((u) => {
  new z(
    u.dataset.id,
    5,
    3,
    [{ rows: 5, cols: 1, label: "Cache" }],
    "App Server",
    "Database",
    "recency",
    "manual",
  );
});
E('[data-id="cache-3-stats"]').then((u) => {
  new Z(u.dataset.id, "cache-3", { height: 100, lineColor: I.getColor(1) });
});
E('[data-id="geo-1"]').then((u) => {
  new P(u.dataset.id, 3, 5, !0);
});
E('[data-id="geo-2"]').then((u) => {
  new P(u.dataset.id, 2, 2, !0);
});
E('[data-id="spatial-locality"]').then((u) => {
  new j(
    u.dataset.id,
    4,
    3,
    4,
    1,
    "Cache with Spatial Locality",
    "Requester",
    "Database",
    !0,
  );
});
E('[data-id="lifo-policy"]').then((u) => {
  new N(u.dataset.id, 7, "lifo", 2500);
});
E('[data-id="lru-policy"]').then((u) => {
  new N(u.dataset.id, 7, "lru", 2500);
});
E('[data-id="time-aware-lru-cache"]').then((u) => {
  new nt(u.dataset.id, 7, "time-aware-lru", 2500, 15e3);
});
E('[data-id="latency-comparison"]').then((u) => {
  new at(u.dataset.id, {
    entities: [
      { name: "L1", latency: 1, unit: "ns", color: "#90EE90" },
      { name: "L2", latency: 4, unit: "ns", color: "#90EE90" },
      { name: "L3", latency: 40, unit: "ns", color: "#90EE90" },
      { name: "RAM", latency: 80, unit: "ns", color: "#FFD700" },
      { name: "SSD", latency: 100, unit: "us", color: "#FFA07A" },
    ],
  });
});
E('[data-id="postgres-toggle"]').then((u) => {
  new ot(u.dataset.id, !1, (t) => {
    console.log("Postgres mode:", t ? "enabled" : "disabled");
  });
});
