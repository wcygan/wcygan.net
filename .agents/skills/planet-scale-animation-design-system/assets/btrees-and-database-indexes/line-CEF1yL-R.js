import { a as _n, i as kn } from "./transform-tHp9KnZo.js";
function O(n, t) {
  return n == null || t == null
    ? NaN
    : n < t
      ? -1
      : n > t
        ? 1
        : n >= t
          ? 0
          : NaN;
}
function wn(n, t) {
  return n == null || t == null
    ? NaN
    : t < n
      ? -1
      : t > n
        ? 1
        : t >= n
          ? 0
          : NaN;
}
function cn(n) {
  let t, r, e;
  n.length !== 2
    ? ((t = O), (r = (s, o) => O(n(s), o)), (e = (s, o) => n(s) - o))
    : ((t = n === O || n === wn ? n : $n), (r = n), (e = n));
  function i(s, o, u = 0, d = s.length) {
    if (u < d) {
      if (t(o, o) !== 0) return d;
      do {
        const c = (u + d) >>> 1;
        r(s[c], o) < 0 ? (u = c + 1) : (d = c);
      } while (u < d);
    }
    return u;
  }
  function a(s, o, u = 0, d = s.length) {
    if (u < d) {
      if (t(o, o) !== 0) return d;
      do {
        const c = (u + d) >>> 1;
        r(s[c], o) <= 0 ? (u = c + 1) : (d = c);
      } while (u < d);
    }
    return u;
  }
  function f(s, o, u = 0, d = s.length) {
    const c = i(s, o, u, d - 1);
    return c > u && e(s[c - 1], o) > -e(s[c], o) ? c - 1 : c;
  }
  return { left: i, center: f, right: a };
}
function $n() {
  return 0;
}
function bn(n) {
  return n === null ? NaN : +n;
}
const xn = cn(O),
  vn = xn.right;
cn(bn).center;
class nn extends Map {
  constructor(t, r = Sn) {
    if (
      (super(),
      Object.defineProperties(this, {
        _intern: { value: new Map() },
        _key: { value: r },
      }),
      t != null)
    )
      for (const [e, i] of t) this.set(e, i);
  }
  get(t) {
    return super.get(tn(this, t));
  }
  has(t) {
    return super.has(tn(this, t));
  }
  set(t, r) {
    return super.set(Nn(this, t), r);
  }
  delete(t) {
    return super.delete(An(this, t));
  }
}
function tn({ _intern: n, _key: t }, r) {
  const e = t(r);
  return n.has(e) ? n.get(e) : r;
}
function Nn({ _intern: n, _key: t }, r) {
  const e = t(r);
  return n.has(e) ? n.get(e) : (n.set(e, r), r);
}
function An({ _intern: n, _key: t }, r) {
  const e = t(r);
  return (n.has(e) && ((r = n.get(e)), n.delete(e)), r);
}
function Sn(n) {
  return n !== null && typeof n == "object" ? n.valueOf() : n;
}
const Pn = Math.sqrt(50),
  zn = Math.sqrt(10),
  En = Math.sqrt(2);
function H(n, t, r) {
  const e = (t - n) / Math.max(0, r),
    i = Math.floor(Math.log10(e)),
    a = e / Math.pow(10, i),
    f = a >= Pn ? 10 : a >= zn ? 5 : a >= En ? 2 : 1;
  let s, o, u;
  return (
    i < 0
      ? ((u = Math.pow(10, -i) / f),
        (s = Math.round(n * u)),
        (o = Math.round(t * u)),
        s / u < n && ++s,
        o / u > t && --o,
        (u = -u))
      : ((u = Math.pow(10, i) * f),
        (s = Math.round(n / u)),
        (o = Math.round(t / u)),
        s * u < n && ++s,
        o * u > t && --o),
    o < s && 0.5 <= r && r < 2 ? H(n, t, r * 2) : [s, o, u]
  );
}
function Fn(n, t, r) {
  if (((t = +t), (n = +n), (r = +r), !(r > 0))) return [];
  if (n === t) return [n];
  const e = t < n,
    [i, a, f] = e ? H(t, n, r) : H(n, t, r);
  if (!(a >= i)) return [];
  const s = a - i + 1,
    o = new Array(s);
  if (e)
    if (f < 0) for (let u = 0; u < s; ++u) o[u] = (a - u) / -f;
    else for (let u = 0; u < s; ++u) o[u] = (a - u) * f;
  else if (f < 0) for (let u = 0; u < s; ++u) o[u] = (i + u) / -f;
  else for (let u = 0; u < s; ++u) o[u] = (i + u) * f;
  return o;
}
function G(n, t, r) {
  return ((t = +t), (n = +n), (r = +r), H(n, t, r)[2]);
}
function Tn(n, t, r) {
  ((t = +t), (n = +n), (r = +r));
  const e = t < n,
    i = e ? G(t, n, r) : G(n, t, r);
  return (e ? -1 : 1) * (i < 0 ? 1 / -i : i);
}
function _t(n, t) {
  let r;
  if (t === void 0)
    for (const e of n)
      e != null && (r < e || (r === void 0 && e >= e)) && (r = e);
  else {
    let e = -1;
    for (let i of n)
      (i = t(i, ++e, n)) != null &&
        (r < i || (r === void 0 && i >= i)) &&
        (r = i);
  }
  return r;
}
function jn(n) {
  return n;
}
var B = 1,
  D = 2,
  Y = 3,
  C = 4,
  en = 1e-6;
function Ln(n) {
  return "translate(" + n + ",0)";
}
function Cn(n) {
  return "translate(0," + n + ")";
}
function Rn(n) {
  return (t) => +n(t);
}
function In(n, t) {
  return (
    (t = Math.max(0, n.bandwidth() - t * 2) / 2),
    n.round() && (t = Math.round(t)),
    (r) => +n(r) + t
  );
}
function qn() {
  return !this.__axis;
}
function ln(n, t) {
  var r = [],
    e = null,
    i = null,
    a = 6,
    f = 6,
    s = 3,
    o = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5,
    u = n === B || n === C ? -1 : 1,
    d = n === C || n === D ? "x" : "y",
    c = n === B || n === Y ? Ln : Cn;
  function h(l) {
    var M = e ?? (t.ticks ? t.ticks.apply(t, r) : t.domain()),
      v = i ?? (t.tickFormat ? t.tickFormat.apply(t, r) : jn),
      w = Math.max(a, 0) + s,
      k = t.range(),
      $ = +k[0] + o,
      _ = +k[k.length - 1] + o,
      b = (t.bandwidth ? In : Rn)(t.copy(), o),
      g = l.selection ? l.selection() : l,
      A = g.selectAll(".domain").data([null]),
      x = g.selectAll(".tick").data(M, t).order(),
      z = x.exit(),
      E = x.enter().append("g").attr("class", "tick"),
      S = x.select("line"),
      m = x.select("text");
    ((A = A.merge(
      A.enter()
        .insert("path", ".tick")
        .attr("class", "domain")
        .attr("stroke", "currentColor"),
    )),
      (x = x.merge(E)),
      (S = S.merge(
        E.append("line")
          .attr("stroke", "currentColor")
          .attr(d + "2", u * a),
      )),
      (m = m.merge(
        E.append("text")
          .attr("fill", "currentColor")
          .attr(d, u * w)
          .attr("dy", n === B ? "0em" : n === Y ? "0.71em" : "0.32em"),
      )),
      l !== g &&
        ((A = A.transition(l)),
        (x = x.transition(l)),
        (S = S.transition(l)),
        (m = m.transition(l)),
        (z = z
          .transition(l)
          .attr("opacity", en)
          .attr("transform", function (y) {
            return isFinite((y = b(y)))
              ? c(y + o)
              : this.getAttribute("transform");
          })),
        E.attr("opacity", en).attr("transform", function (y) {
          var p = this.parentNode.__axis;
          return c((p && isFinite((p = p(y))) ? p : b(y)) + o);
        })),
      z.remove(),
      A.attr(
        "d",
        n === C || n === D
          ? f
            ? "M" + u * f + "," + $ + "H" + o + "V" + _ + "H" + u * f
            : "M" + o + "," + $ + "V" + _
          : f
            ? "M" + $ + "," + u * f + "V" + o + "H" + _ + "V" + u * f
            : "M" + $ + "," + o + "H" + _,
      ),
      x.attr("opacity", 1).attr("transform", function (y) {
        return c(b(y) + o);
      }),
      S.attr(d + "2", u * a),
      m.attr(d, u * w).text(v),
      g
        .filter(qn)
        .attr("fill", "none")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", n === D ? "start" : n === C ? "end" : "middle"),
      g.each(function () {
        this.__axis = b;
      }));
  }
  return (
    (h.scale = function (l) {
      return arguments.length ? ((t = l), h) : t;
    }),
    (h.ticks = function () {
      return ((r = Array.from(arguments)), h);
    }),
    (h.tickArguments = function (l) {
      return arguments.length
        ? ((r = l == null ? [] : Array.from(l)), h)
        : r.slice();
    }),
    (h.tickValues = function (l) {
      return arguments.length
        ? ((e = l == null ? null : Array.from(l)), h)
        : e && e.slice();
    }),
    (h.tickFormat = function (l) {
      return arguments.length ? ((i = l), h) : i;
    }),
    (h.tickSize = function (l) {
      return arguments.length ? ((a = f = +l), h) : a;
    }),
    (h.tickSizeInner = function (l) {
      return arguments.length ? ((a = +l), h) : a;
    }),
    (h.tickSizeOuter = function (l) {
      return arguments.length ? ((f = +l), h) : f;
    }),
    (h.tickPadding = function (l) {
      return arguments.length ? ((s = +l), h) : s;
    }),
    (h.offset = function (l) {
      return arguments.length ? ((o = +l), h) : o;
    }),
    h
  );
}
function kt(n) {
  return ln(Y, n);
}
function wt(n) {
  return ln(C, n);
}
function Vn(n, t) {
  return (
    (n = +n),
    (t = +t),
    function (r) {
      return Math.round(n * (1 - r) + t * r);
    }
  );
}
const Q = Math.PI,
  U = 2 * Q,
  P = 1e-6,
  On = U - P;
function dn(n) {
  this._ += n[0];
  for (let t = 1, r = n.length; t < r; ++t) this._ += arguments[t] + n[t];
}
function Hn(n) {
  let t = Math.floor(n);
  if (!(t >= 0)) throw new Error(`invalid digits: ${n}`);
  if (t > 15) return dn;
  const r = 10 ** t;
  return function (e) {
    this._ += e[0];
    for (let i = 1, a = e.length; i < a; ++i)
      this._ += Math.round(arguments[i] * r) / r + e[i];
  };
}
class Xn {
  constructor(t) {
    ((this._x0 = this._y0 = this._x1 = this._y1 = null),
      (this._ = ""),
      (this._append = t == null ? dn : Hn(t)));
  }
  moveTo(t, r) {
    this._append`M${(this._x0 = this._x1 = +t)},${(this._y0 = this._y1 = +r)}`;
  }
  closePath() {
    this._x1 !== null &&
      ((this._x1 = this._x0), (this._y1 = this._y0), this._append`Z`);
  }
  lineTo(t, r) {
    this._append`L${(this._x1 = +t)},${(this._y1 = +r)}`;
  }
  quadraticCurveTo(t, r, e, i) {
    this._append`Q${+t},${+r},${(this._x1 = +e)},${(this._y1 = +i)}`;
  }
  bezierCurveTo(t, r, e, i, a, f) {
    this
      ._append`C${+t},${+r},${+e},${+i},${(this._x1 = +a)},${(this._y1 = +f)}`;
  }
  arcTo(t, r, e, i, a) {
    if (((t = +t), (r = +r), (e = +e), (i = +i), (a = +a), a < 0))
      throw new Error(`negative radius: ${a}`);
    let f = this._x1,
      s = this._y1,
      o = e - t,
      u = i - r,
      d = f - t,
      c = s - r,
      h = d * d + c * c;
    if (this._x1 === null) this._append`M${(this._x1 = t)},${(this._y1 = r)}`;
    else if (h > P)
      if (!(Math.abs(c * o - u * d) > P) || !a)
        this._append`L${(this._x1 = t)},${(this._y1 = r)}`;
      else {
        let l = e - f,
          M = i - s,
          v = o * o + u * u,
          w = l * l + M * M,
          k = Math.sqrt(v),
          $ = Math.sqrt(h),
          _ = a * Math.tan((Q - Math.acos((v + h - w) / (2 * k * $))) / 2),
          b = _ / $,
          g = _ / k;
        (Math.abs(b - 1) > P && this._append`L${t + b * d},${r + b * c}`,
          this
            ._append`A${a},${a},0,0,${+(c * l > d * M)},${(this._x1 = t + g * o)},${(this._y1 = r + g * u)}`);
      }
  }
  arc(t, r, e, i, a, f) {
    if (((t = +t), (r = +r), (e = +e), (f = !!f), e < 0))
      throw new Error(`negative radius: ${e}`);
    let s = e * Math.cos(i),
      o = e * Math.sin(i),
      u = t + s,
      d = r + o,
      c = 1 ^ f,
      h = f ? i - a : a - i;
    (this._x1 === null
      ? this._append`M${u},${d}`
      : (Math.abs(this._x1 - u) > P || Math.abs(this._y1 - d) > P) &&
        this._append`L${u},${d}`,
      e &&
        (h < 0 && (h = (h % U) + U),
        h > On
          ? this
              ._append`A${e},${e},0,1,${c},${t - s},${r - o}A${e},${e},0,1,${c},${(this._x1 = u)},${(this._y1 = d)}`
          : h > P &&
            this
              ._append`A${e},${e},0,${+(h >= Q)},${c},${(this._x1 = t + e * Math.cos(a))},${(this._y1 = r + e * Math.sin(a))}`));
  }
  rect(t, r, e, i) {
    this
      ._append`M${(this._x0 = this._x1 = +t)},${(this._y0 = this._y1 = +r)}h${(e = +e)}v${+i}h${-e}Z`;
  }
  toString() {
    return this._;
  }
}
function Zn(n) {
  return Math.abs((n = Math.round(n))) >= 1e21
    ? n.toLocaleString("en").replace(/,/g, "")
    : n.toString(10);
}
function X(n, t) {
  if (
    (r = (n = t ? n.toExponential(t - 1) : n.toExponential()).indexOf("e")) < 0
  )
    return null;
  var r,
    e = n.slice(0, r);
  return [e.length > 1 ? e[0] + e.slice(2) : e, +n.slice(r + 1)];
}
function L(n) {
  return ((n = X(Math.abs(n))), n ? n[1] : NaN);
}
function Bn(n, t) {
  return function (r, e) {
    for (
      var i = r.length, a = [], f = 0, s = n[0], o = 0;
      i > 0 &&
      s > 0 &&
      (o + s + 1 > e && (s = Math.max(1, e - o)),
      a.push(r.substring((i -= s), i + s)),
      !((o += s + 1) > e));
    )
      s = n[(f = (f + 1) % n.length)];
    return a.reverse().join(t);
  };
}
function Dn(n) {
  return function (t) {
    return t.replace(/[0-9]/g, function (r) {
      return n[+r];
    });
  };
}
var Gn =
  /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function Z(n) {
  if (!(t = Gn.exec(n))) throw new Error("invalid format: " + n);
  var t;
  return new K({
    fill: t[1],
    align: t[2],
    sign: t[3],
    symbol: t[4],
    zero: t[5],
    width: t[6],
    comma: t[7],
    precision: t[8] && t[8].slice(1),
    trim: t[9],
    type: t[10],
  });
}
Z.prototype = K.prototype;
function K(n) {
  ((this.fill = n.fill === void 0 ? " " : n.fill + ""),
    (this.align = n.align === void 0 ? ">" : n.align + ""),
    (this.sign = n.sign === void 0 ? "-" : n.sign + ""),
    (this.symbol = n.symbol === void 0 ? "" : n.symbol + ""),
    (this.zero = !!n.zero),
    (this.width = n.width === void 0 ? void 0 : +n.width),
    (this.comma = !!n.comma),
    (this.precision = n.precision === void 0 ? void 0 : +n.precision),
    (this.trim = !!n.trim),
    (this.type = n.type === void 0 ? "" : n.type + ""));
}
K.prototype.toString = function () {
  return (
    this.fill +
    this.align +
    this.sign +
    this.symbol +
    (this.zero ? "0" : "") +
    (this.width === void 0 ? "" : Math.max(1, this.width | 0)) +
    (this.comma ? "," : "") +
    (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) +
    (this.trim ? "~" : "") +
    this.type
  );
};
function Yn(n) {
  n: for (var t = n.length, r = 1, e = -1, i; r < t; ++r)
    switch (n[r]) {
      case ".":
        e = i = r;
        break;
      case "0":
        (e === 0 && (e = r), (i = r));
        break;
      default:
        if (!+n[r]) break n;
        e > 0 && (e = 0);
        break;
    }
  return e > 0 ? n.slice(0, e) + n.slice(i + 1) : n;
}
var mn;
function Qn(n, t) {
  var r = X(n, t);
  if (!r) return n + "";
  var e = r[0],
    i = r[1],
    a = i - (mn = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1,
    f = e.length;
  return a === f
    ? e
    : a > f
      ? e + new Array(a - f + 1).join("0")
      : a > 0
        ? e.slice(0, a) + "." + e.slice(a)
        : "0." + new Array(1 - a).join("0") + X(n, Math.max(0, t + a - 1))[0];
}
function rn(n, t) {
  var r = X(n, t);
  if (!r) return n + "";
  var e = r[0],
    i = r[1];
  return i < 0
    ? "0." + new Array(-i).join("0") + e
    : e.length > i + 1
      ? e.slice(0, i + 1) + "." + e.slice(i + 1)
      : e + new Array(i - e.length + 2).join("0");
}
const un = {
  "%": (n, t) => (n * 100).toFixed(t),
  b: (n) => Math.round(n).toString(2),
  c: (n) => n + "",
  d: Zn,
  e: (n, t) => n.toExponential(t),
  f: (n, t) => n.toFixed(t),
  g: (n, t) => n.toPrecision(t),
  o: (n) => Math.round(n).toString(8),
  p: (n, t) => rn(n * 100, t),
  r: rn,
  s: Qn,
  X: (n) => Math.round(n).toString(16).toUpperCase(),
  x: (n) => Math.round(n).toString(16),
};
function an(n) {
  return n;
}
var on = Array.prototype.map,
  fn = [
    "y",
    "z",
    "a",
    "f",
    "p",
    "n",
    "µ",
    "m",
    "",
    "k",
    "M",
    "G",
    "T",
    "P",
    "E",
    "Z",
    "Y",
  ];
function Un(n) {
  var t =
      n.grouping === void 0 || n.thousands === void 0
        ? an
        : Bn(on.call(n.grouping, Number), n.thousands + ""),
    r = n.currency === void 0 ? "" : n.currency[0] + "",
    e = n.currency === void 0 ? "" : n.currency[1] + "",
    i = n.decimal === void 0 ? "." : n.decimal + "",
    a = n.numerals === void 0 ? an : Dn(on.call(n.numerals, String)),
    f = n.percent === void 0 ? "%" : n.percent + "",
    s = n.minus === void 0 ? "−" : n.minus + "",
    o = n.nan === void 0 ? "NaN" : n.nan + "";
  function u(c) {
    c = Z(c);
    var h = c.fill,
      l = c.align,
      M = c.sign,
      v = c.symbol,
      w = c.zero,
      k = c.width,
      $ = c.comma,
      _ = c.precision,
      b = c.trim,
      g = c.type;
    (g === "n"
      ? (($ = !0), (g = "g"))
      : un[g] || (_ === void 0 && (_ = 12), (b = !0), (g = "g")),
      (w || (h === "0" && l === "=")) && ((w = !0), (h = "0"), (l = "=")));
    var A =
        v === "$"
          ? r
          : v === "#" && /[boxX]/.test(g)
            ? "0" + g.toLowerCase()
            : "",
      x = v === "$" ? e : /[%p]/.test(g) ? f : "",
      z = un[g],
      E = /[defgprs%]/.test(g);
    _ =
      _ === void 0
        ? 6
        : /[gprs]/.test(g)
          ? Math.max(1, Math.min(21, _))
          : Math.max(0, Math.min(20, _));
    function S(m) {
      var y = A,
        p = x,
        F,
        W,
        R;
      if (g === "c") ((p = z(m) + p), (m = ""));
      else {
        m = +m;
        var I = m < 0 || 1 / m < 0;
        if (
          ((m = isNaN(m) ? o : z(Math.abs(m), _)),
          b && (m = Yn(m)),
          I && +m == 0 && M !== "+" && (I = !1),
          (y = (I ? (M === "(" ? M : s) : M === "-" || M === "(" ? "" : M) + y),
          (p =
            (g === "s" ? fn[8 + mn / 3] : "") +
            p +
            (I && M === "(" ? ")" : "")),
          E)
        ) {
          for (F = -1, W = m.length; ++F < W; )
            if (((R = m.charCodeAt(F)), 48 > R || R > 57)) {
              ((p = (R === 46 ? i + m.slice(F + 1) : m.slice(F)) + p),
                (m = m.slice(0, F)));
              break;
            }
        }
      }
      $ && !w && (m = t(m, 1 / 0));
      var q = y.length + m.length + p.length,
        N = q < k ? new Array(k - q + 1).join(h) : "";
      switch (
        ($ && w && ((m = t(N + m, N.length ? k - p.length : 1 / 0)), (N = "")),
        l)
      ) {
        case "<":
          m = y + m + p + N;
          break;
        case "=":
          m = y + N + m + p;
          break;
        case "^":
          m = N.slice(0, (q = N.length >> 1)) + y + m + p + N.slice(q);
          break;
        default:
          m = N + y + m + p;
          break;
      }
      return a(m);
    }
    return (
      (S.toString = function () {
        return c + "";
      }),
      S
    );
  }
  function d(c, h) {
    var l = u(((c = Z(c)), (c.type = "f"), c)),
      M = Math.max(-8, Math.min(8, Math.floor(L(h) / 3))) * 3,
      v = Math.pow(10, -M),
      w = fn[8 + M / 3];
    return function (k) {
      return l(v * k) + w;
    };
  }
  return { format: u, formatPrefix: d };
}
var V, gn, pn;
Jn({ thousands: ",", grouping: [3], currency: ["$", ""] });
function Jn(n) {
  return ((V = Un(n)), (gn = V.format), (pn = V.formatPrefix), V);
}
function Kn(n) {
  return Math.max(0, -L(Math.abs(n)));
}
function Wn(n, t) {
  return Math.max(
    0,
    Math.max(-8, Math.min(8, Math.floor(L(t) / 3))) * 3 - L(Math.abs(n)),
  );
}
function nt(n, t) {
  return (
    (n = Math.abs(n)),
    (t = Math.abs(t) - n),
    Math.max(0, L(t) - L(n)) + 1
  );
}
function Mn(n, t) {
  switch (arguments.length) {
    case 0:
      break;
    case 1:
      this.range(n);
      break;
    default:
      this.range(t).domain(n);
      break;
  }
  return this;
}
const sn = Symbol("implicit");
function tt() {
  var n = new nn(),
    t = [],
    r = [],
    e = sn;
  function i(a) {
    let f = n.get(a);
    if (f === void 0) {
      if (e !== sn) return e;
      n.set(a, (f = t.push(a) - 1));
    }
    return r[f % r.length];
  }
  return (
    (i.domain = function (a) {
      if (!arguments.length) return t.slice();
      ((t = []), (n = new nn()));
      for (const f of a) n.has(f) || n.set(f, t.push(f) - 1);
      return i;
    }),
    (i.range = function (a) {
      return arguments.length ? ((r = Array.from(a)), i) : r.slice();
    }),
    (i.unknown = function (a) {
      return arguments.length ? ((e = a), i) : e;
    }),
    (i.copy = function () {
      return tt(t, r).unknown(e);
    }),
    Mn.apply(i, arguments),
    i
  );
}
function et(n) {
  return function () {
    return n;
  };
}
function rt(n) {
  return +n;
}
var hn = [0, 1];
function j(n) {
  return n;
}
function J(n, t) {
  return (t -= n = +n)
    ? function (r) {
        return (r - n) / t;
      }
    : et(isNaN(t) ? NaN : 0.5);
}
function it(n, t) {
  var r;
  return (
    n > t && ((r = n), (n = t), (t = r)),
    function (e) {
      return Math.max(n, Math.min(t, e));
    }
  );
}
function ut(n, t, r) {
  var e = n[0],
    i = n[1],
    a = t[0],
    f = t[1];
  return (
    i < e ? ((e = J(i, e)), (a = r(f, a))) : ((e = J(e, i)), (a = r(a, f))),
    function (s) {
      return a(e(s));
    }
  );
}
function at(n, t, r) {
  var e = Math.min(n.length, t.length) - 1,
    i = new Array(e),
    a = new Array(e),
    f = -1;
  for (
    n[e] < n[0] && ((n = n.slice().reverse()), (t = t.slice().reverse()));
    ++f < e;
  )
    ((i[f] = J(n[f], n[f + 1])), (a[f] = r(t[f], t[f + 1])));
  return function (s) {
    var o = vn(n, s, 1, e) - 1;
    return a[o](i[o](s));
  };
}
function ot(n, t) {
  return t
    .domain(n.domain())
    .range(n.range())
    .interpolate(n.interpolate())
    .clamp(n.clamp())
    .unknown(n.unknown());
}
function ft() {
  var n = hn,
    t = hn,
    r = kn,
    e,
    i,
    a,
    f = j,
    s,
    o,
    u;
  function d() {
    var h = Math.min(n.length, t.length);
    return (
      f !== j && (f = it(n[0], n[h - 1])),
      (s = h > 2 ? at : ut),
      (o = u = null),
      c
    );
  }
  function c(h) {
    return h == null || isNaN((h = +h))
      ? a
      : (o || (o = s(n.map(e), t, r)))(e(f(h)));
  }
  return (
    (c.invert = function (h) {
      return f(i((u || (u = s(t, n.map(e), _n)))(h)));
    }),
    (c.domain = function (h) {
      return arguments.length ? ((n = Array.from(h, rt)), d()) : n.slice();
    }),
    (c.range = function (h) {
      return arguments.length ? ((t = Array.from(h)), d()) : t.slice();
    }),
    (c.rangeRound = function (h) {
      return ((t = Array.from(h)), (r = Vn), d());
    }),
    (c.clamp = function (h) {
      return arguments.length ? ((f = h ? !0 : j), d()) : f !== j;
    }),
    (c.interpolate = function (h) {
      return arguments.length ? ((r = h), d()) : r;
    }),
    (c.unknown = function (h) {
      return arguments.length ? ((a = h), c) : a;
    }),
    function (h, l) {
      return ((e = h), (i = l), d());
    }
  );
}
function st() {
  return ft()(j, j);
}
function ht(n, t, r, e) {
  var i = Tn(n, t, r),
    a;
  switch (((e = Z(e ?? ",f")), e.type)) {
    case "s": {
      var f = Math.max(Math.abs(n), Math.abs(t));
      return (
        e.precision == null && !isNaN((a = Wn(i, f))) && (e.precision = a),
        pn(e, f)
      );
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      e.precision == null &&
        !isNaN((a = nt(i, Math.max(Math.abs(n), Math.abs(t))))) &&
        (e.precision = a - (e.type === "e"));
      break;
    }
    case "f":
    case "%": {
      e.precision == null &&
        !isNaN((a = Kn(i))) &&
        (e.precision = a - (e.type === "%") * 2);
      break;
    }
  }
  return gn(e);
}
function ct(n) {
  var t = n.domain;
  return (
    (n.ticks = function (r) {
      var e = t();
      return Fn(e[0], e[e.length - 1], r ?? 10);
    }),
    (n.tickFormat = function (r, e) {
      var i = t();
      return ht(i[0], i[i.length - 1], r ?? 10, e);
    }),
    (n.nice = function (r) {
      r == null && (r = 10);
      var e = t(),
        i = 0,
        a = e.length - 1,
        f = e[i],
        s = e[a],
        o,
        u,
        d = 10;
      for (
        s < f && ((u = f), (f = s), (s = u), (u = i), (i = a), (a = u));
        d-- > 0;
      ) {
        if (((u = G(f, s, r)), u === o)) return ((e[i] = f), (e[a] = s), t(e));
        if (u > 0) ((f = Math.floor(f / u) * u), (s = Math.ceil(s / u) * u));
        else if (u < 0)
          ((f = Math.ceil(f * u) / u), (s = Math.floor(s * u) / u));
        else break;
        o = u;
      }
      return n;
    }),
    n
  );
}
function lt() {
  var n = st();
  return (
    (n.copy = function () {
      return ot(n, lt());
    }),
    Mn.apply(n, arguments),
    ct(n)
  );
}
function T(n) {
  return function () {
    return n;
  };
}
function dt(n) {
  let t = 3;
  return (
    (n.digits = function (r) {
      if (!arguments.length) return t;
      if (r == null) t = null;
      else {
        const e = Math.floor(r);
        if (!(e >= 0)) throw new RangeError(`invalid digits: ${r}`);
        t = e;
      }
      return n;
    }),
    () => new Xn(t)
  );
}
function mt(n) {
  return typeof n == "object" && "length" in n ? n : Array.from(n);
}
function yn(n) {
  this._context = n;
}
yn.prototype = {
  areaStart: function () {
    this._line = 0;
  },
  areaEnd: function () {
    this._line = NaN;
  },
  lineStart: function () {
    this._point = 0;
  },
  lineEnd: function () {
    ((this._line || (this._line !== 0 && this._point === 1)) &&
      this._context.closePath(),
      (this._line = 1 - this._line));
  },
  point: function (n, t) {
    switch (((n = +n), (t = +t), this._point)) {
      case 0:
        ((this._point = 1),
          this._line ? this._context.lineTo(n, t) : this._context.moveTo(n, t));
        break;
      case 1:
        this._point = 2;
      default:
        this._context.lineTo(n, t);
        break;
    }
  },
};
function gt(n) {
  return new yn(n);
}
function pt(n) {
  return n[0];
}
function Mt(n) {
  return n[1];
}
function $t(n, t) {
  var r = T(!0),
    e = null,
    i = gt,
    a = null,
    f = dt(s);
  ((n = typeof n == "function" ? n : n === void 0 ? pt : T(n)),
    (t = typeof t == "function" ? t : t === void 0 ? Mt : T(t)));
  function s(o) {
    var u,
      d = (o = mt(o)).length,
      c,
      h = !1,
      l;
    for (e == null && (a = i((l = f()))), u = 0; u <= d; ++u)
      (!(u < d && r((c = o[u]), u, o)) === h &&
        ((h = !h) ? a.lineStart() : a.lineEnd()),
        h && a.point(+n(c, u, o), +t(c, u, o)));
    if (l) return ((a = null), l + "" || null);
  }
  return (
    (s.x = function (o) {
      return arguments.length
        ? ((n = typeof o == "function" ? o : T(+o)), s)
        : n;
    }),
    (s.y = function (o) {
      return arguments.length
        ? ((t = typeof o == "function" ? o : T(+o)), s)
        : t;
    }),
    (s.defined = function (o) {
      return arguments.length
        ? ((r = typeof o == "function" ? o : T(!!o)), s)
        : r;
    }),
    (s.curve = function (o) {
      return arguments.length ? ((i = o), e != null && (a = i(e)), s) : i;
    }),
    (s.context = function (o) {
      return arguments.length
        ? (o == null ? (e = a = null) : (a = i((e = o))), s)
        : e;
    }),
    s
  );
}
export {
  kt as a,
  wt as b,
  $t as c,
  T as d,
  gt as e,
  mt as f,
  cn as g,
  lt as l,
  _t as m,
  tt as o,
  dt as w,
  pt as x,
  Mt as y,
};
