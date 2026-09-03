import { T as Gt, t as Wt, d as Jt, n as Qt } from "./timer-DWAvo6M8.js";
var Q = "http://www.w3.org/1999/xhtml";
const lt = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: Q,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/",
};
function K(t) {
  var n = (t += ""),
    e = n.indexOf(":");
  return (
    e >= 0 && (n = t.slice(0, e)) !== "xmlns" && (t = t.slice(e + 1)),
    lt.hasOwnProperty(n) ? { space: lt[n], local: t } : t
  );
}
function Zt(t) {
  return function () {
    var n = this.ownerDocument,
      e = this.namespaceURI;
    return e === Q && n.documentElement.namespaceURI === Q
      ? n.createElement(t)
      : n.createElementNS(e, t);
  };
}
function jt(t) {
  return function () {
    return this.ownerDocument.createElementNS(t.space, t.local);
  };
}
function At(t) {
  var n = K(t);
  return (n.local ? jt : Zt)(n);
}
function tn() {}
function rt(t) {
  return t == null
    ? tn
    : function () {
        return this.querySelector(t);
      };
}
function nn(t) {
  typeof t != "function" && (t = rt(t));
  for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)
    for (
      var o = n[i], s = o.length, a = (r[i] = new Array(s)), u, f, c = 0;
      c < s;
      ++c
    )
      (u = o[c]) &&
        (f = t.call(u, u.__data__, c, o)) &&
        ("__data__" in u && (f.__data__ = u.__data__), (a[c] = f));
  return new y(r, this._parents);
}
function en(t) {
  return t == null ? [] : Array.isArray(t) ? t : Array.from(t);
}
function rn() {
  return [];
}
function $t(t) {
  return t == null
    ? rn
    : function () {
        return this.querySelectorAll(t);
      };
}
function sn(t) {
  return function () {
    return en(t.apply(this, arguments));
  };
}
function on(t) {
  typeof t == "function" ? (t = sn(t)) : (t = $t(t));
  for (var n = this._groups, e = n.length, r = [], i = [], o = 0; o < e; ++o)
    for (var s = n[o], a = s.length, u, f = 0; f < a; ++f)
      (u = s[f]) && (r.push(t.call(u, u.__data__, f, s)), i.push(u));
  return new y(r, i);
}
function St(t) {
  return function () {
    return this.matches(t);
  };
}
function kt(t) {
  return function (n) {
    return n.matches(t);
  };
}
var an = Array.prototype.find;
function un(t) {
  return function () {
    return an.call(this.children, t);
  };
}
function fn() {
  return this.firstElementChild;
}
function cn(t) {
  return this.select(t == null ? fn : un(typeof t == "function" ? t : kt(t)));
}
var ln = Array.prototype.filter;
function hn() {
  return Array.from(this.children);
}
function pn(t) {
  return function () {
    return ln.call(this.children, t);
  };
}
function dn(t) {
  return this.selectAll(
    t == null ? hn : pn(typeof t == "function" ? t : kt(t)),
  );
}
function _n(t) {
  typeof t != "function" && (t = St(t));
  for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)
    for (var o = n[i], s = o.length, a = (r[i] = []), u, f = 0; f < s; ++f)
      (u = o[f]) && t.call(u, u.__data__, f, o) && a.push(u);
  return new y(r, this._parents);
}
function Et(t) {
  return new Array(t.length);
}
function gn() {
  return new y(this._enter || this._groups.map(Et), this._parents);
}
function Y(t, n) {
  ((this.ownerDocument = t.ownerDocument),
    (this.namespaceURI = t.namespaceURI),
    (this._next = null),
    (this._parent = t),
    (this.__data__ = n));
}
Y.prototype = {
  constructor: Y,
  appendChild: function (t) {
    return this._parent.insertBefore(t, this._next);
  },
  insertBefore: function (t, n) {
    return this._parent.insertBefore(t, n);
  },
  querySelector: function (t) {
    return this._parent.querySelector(t);
  },
  querySelectorAll: function (t) {
    return this._parent.querySelectorAll(t);
  },
};
function yn(t) {
  return function () {
    return t;
  };
}
function xn(t, n, e, r, i, o) {
  for (var s = 0, a, u = n.length, f = o.length; s < f; ++s)
    (a = n[s]) ? ((a.__data__ = o[s]), (r[s] = a)) : (e[s] = new Y(t, o[s]));
  for (; s < u; ++s) (a = n[s]) && (i[s] = a);
}
function wn(t, n, e, r, i, o, s) {
  var a,
    u,
    f = new Map(),
    c = n.length,
    l = o.length,
    h = new Array(c),
    p;
  for (a = 0; a < c; ++a)
    (u = n[a]) &&
      ((h[a] = p = s.call(u, u.__data__, a, n) + ""),
      f.has(p) ? (i[a] = u) : f.set(p, u));
  for (a = 0; a < l; ++a)
    ((p = s.call(t, o[a], a, o) + ""),
      (u = f.get(p))
        ? ((r[a] = u), (u.__data__ = o[a]), f.delete(p))
        : (e[a] = new Y(t, o[a])));
  for (a = 0; a < c; ++a) (u = n[a]) && f.get(h[a]) === u && (i[a] = u);
}
function vn(t) {
  return t.__data__;
}
function mn(t, n) {
  if (!arguments.length) return Array.from(this, vn);
  var e = n ? wn : xn,
    r = this._parents,
    i = this._groups;
  typeof t != "function" && (t = yn(t));
  for (
    var o = i.length,
      s = new Array(o),
      a = new Array(o),
      u = new Array(o),
      f = 0;
    f < o;
    ++f
  ) {
    var c = r[f],
      l = i[f],
      h = l.length,
      p = bn(t.call(c, c && c.__data__, f, r)),
      d = p.length,
      _ = (a[f] = new Array(d)),
      $ = (s[f] = new Array(d)),
      Kt = (u[f] = new Array(h));
    e(c, l, _, $, Kt, p, n);
    for (var M = 0, q = 0, ft, ct; M < d; ++M)
      if ((ft = _[M])) {
        for (M >= q && (q = M + 1); !(ct = $[q]) && ++q < d; );
        ft._next = ct || null;
      }
  }
  return ((s = new y(s, r)), (s._enter = a), (s._exit = u), s);
}
function bn(t) {
  return typeof t == "object" && "length" in t ? t : Array.from(t);
}
function Nn() {
  return new y(this._exit || this._groups.map(Et), this._parents);
}
function An(t, n, e) {
  var r = this.enter(),
    i = this,
    o = this.exit();
  return (
    typeof t == "function"
      ? ((r = t(r)), r && (r = r.selection()))
      : (r = r.append(t + "")),
    n != null && ((i = n(i)), i && (i = i.selection())),
    e == null ? o.remove() : e(o),
    r && i ? r.merge(i).order() : i
  );
}
function $n(t) {
  for (
    var n = t.selection ? t.selection() : t,
      e = this._groups,
      r = n._groups,
      i = e.length,
      o = r.length,
      s = Math.min(i, o),
      a = new Array(i),
      u = 0;
    u < s;
    ++u
  )
    for (
      var f = e[u], c = r[u], l = f.length, h = (a[u] = new Array(l)), p, d = 0;
      d < l;
      ++d
    )
      (p = f[d] || c[d]) && (h[d] = p);
  for (; u < i; ++u) a[u] = e[u];
  return new y(a, this._parents);
}
function Sn() {
  for (var t = this._groups, n = -1, e = t.length; ++n < e; )
    for (var r = t[n], i = r.length - 1, o = r[i], s; --i >= 0; )
      (s = r[i]) &&
        (o &&
          s.compareDocumentPosition(o) ^ 4 &&
          o.parentNode.insertBefore(s, o),
        (o = s));
  return this;
}
function kn(t) {
  t || (t = En);
  function n(l, h) {
    return l && h ? t(l.__data__, h.__data__) : !l - !h;
  }
  for (
    var e = this._groups, r = e.length, i = new Array(r), o = 0;
    o < r;
    ++o
  ) {
    for (
      var s = e[o], a = s.length, u = (i[o] = new Array(a)), f, c = 0;
      c < a;
      ++c
    )
      (f = s[c]) && (u[c] = f);
    u.sort(n);
  }
  return new y(i, this._parents).order();
}
function En(t, n) {
  return t < n ? -1 : t > n ? 1 : t >= n ? 0 : NaN;
}
function Cn() {
  var t = arguments[0];
  return ((arguments[0] = this), t.apply(null, arguments), this);
}
function Rn() {
  return Array.from(this);
}
function Mn() {
  for (var t = this._groups, n = 0, e = t.length; n < e; ++n)
    for (var r = t[n], i = 0, o = r.length; i < o; ++i) {
      var s = r[i];
      if (s) return s;
    }
  return null;
}
function Tn() {
  let t = 0;
  for (const n of this) ++t;
  return t;
}
function In() {
  return !this.node();
}
function Hn(t) {
  for (var n = this._groups, e = 0, r = n.length; e < r; ++e)
    for (var i = n[e], o = 0, s = i.length, a; o < s; ++o)
      (a = i[o]) && t.call(a, a.__data__, o, i);
  return this;
}
function Fn(t) {
  return function () {
    this.removeAttribute(t);
  };
}
function Xn(t) {
  return function () {
    this.removeAttributeNS(t.space, t.local);
  };
}
function qn(t, n) {
  return function () {
    this.setAttribute(t, n);
  };
}
function Dn(t, n) {
  return function () {
    this.setAttributeNS(t.space, t.local, n);
  };
}
function Ln(t, n) {
  return function () {
    var e = n.apply(this, arguments);
    e == null ? this.removeAttribute(t) : this.setAttribute(t, e);
  };
}
function Pn(t, n) {
  return function () {
    var e = n.apply(this, arguments);
    e == null
      ? this.removeAttributeNS(t.space, t.local)
      : this.setAttributeNS(t.space, t.local, e);
  };
}
function Vn(t, n) {
  var e = K(t);
  if (arguments.length < 2) {
    var r = this.node();
    return e.local ? r.getAttributeNS(e.space, e.local) : r.getAttribute(e);
  }
  return this.each(
    (n == null
      ? e.local
        ? Xn
        : Fn
      : typeof n == "function"
        ? e.local
          ? Pn
          : Ln
        : e.local
          ? Dn
          : qn)(e, n),
  );
}
function Ct(t) {
  return (
    (t.ownerDocument && t.ownerDocument.defaultView) ||
    (t.document && t) ||
    t.defaultView
  );
}
function On(t) {
  return function () {
    this.style.removeProperty(t);
  };
}
function Yn(t, n, e) {
  return function () {
    this.style.setProperty(t, n, e);
  };
}
function Bn(t, n, e) {
  return function () {
    var r = n.apply(this, arguments);
    r == null ? this.style.removeProperty(t) : this.style.setProperty(t, r, e);
  };
}
function zn(t, n, e) {
  return arguments.length > 1
    ? this.each(
        (n == null ? On : typeof n == "function" ? Bn : Yn)(t, n, e ?? ""),
      )
    : R(this.node(), t);
}
function R(t, n) {
  return (
    t.style.getPropertyValue(n) ||
    Ct(t).getComputedStyle(t, null).getPropertyValue(n)
  );
}
function Un(t) {
  return function () {
    delete this[t];
  };
}
function Kn(t, n) {
  return function () {
    this[t] = n;
  };
}
function Gn(t, n) {
  return function () {
    var e = n.apply(this, arguments);
    e == null ? delete this[t] : (this[t] = e);
  };
}
function Wn(t, n) {
  return arguments.length > 1
    ? this.each((n == null ? Un : typeof n == "function" ? Gn : Kn)(t, n))
    : this.node()[t];
}
function Rt(t) {
  return t.trim().split(/^|\s+/);
}
function it(t) {
  return t.classList || new Mt(t);
}
function Mt(t) {
  ((this._node = t), (this._names = Rt(t.getAttribute("class") || "")));
}
Mt.prototype = {
  add: function (t) {
    var n = this._names.indexOf(t);
    n < 0 &&
      (this._names.push(t),
      this._node.setAttribute("class", this._names.join(" ")));
  },
  remove: function (t) {
    var n = this._names.indexOf(t);
    n >= 0 &&
      (this._names.splice(n, 1),
      this._node.setAttribute("class", this._names.join(" ")));
  },
  contains: function (t) {
    return this._names.indexOf(t) >= 0;
  },
};
function Tt(t, n) {
  for (var e = it(t), r = -1, i = n.length; ++r < i; ) e.add(n[r]);
}
function It(t, n) {
  for (var e = it(t), r = -1, i = n.length; ++r < i; ) e.remove(n[r]);
}
function Jn(t) {
  return function () {
    Tt(this, t);
  };
}
function Qn(t) {
  return function () {
    It(this, t);
  };
}
function Zn(t, n) {
  return function () {
    (n.apply(this, arguments) ? Tt : It)(this, t);
  };
}
function jn(t, n) {
  var e = Rt(t + "");
  if (arguments.length < 2) {
    for (var r = it(this.node()), i = -1, o = e.length; ++i < o; )
      if (!r.contains(e[i])) return !1;
    return !0;
  }
  return this.each((typeof n == "function" ? Zn : n ? Jn : Qn)(e, n));
}
function te() {
  this.textContent = "";
}
function ne(t) {
  return function () {
    this.textContent = t;
  };
}
function ee(t) {
  return function () {
    var n = t.apply(this, arguments);
    this.textContent = n ?? "";
  };
}
function re(t) {
  return arguments.length
    ? this.each(t == null ? te : (typeof t == "function" ? ee : ne)(t))
    : this.node().textContent;
}
function ie() {
  this.innerHTML = "";
}
function se(t) {
  return function () {
    this.innerHTML = t;
  };
}
function oe(t) {
  return function () {
    var n = t.apply(this, arguments);
    this.innerHTML = n ?? "";
  };
}
function ae(t) {
  return arguments.length
    ? this.each(t == null ? ie : (typeof t == "function" ? oe : se)(t))
    : this.node().innerHTML;
}
function ue() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function fe() {
  return this.each(ue);
}
function ce() {
  this.previousSibling &&
    this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function le() {
  return this.each(ce);
}
function he(t) {
  var n = typeof t == "function" ? t : At(t);
  return this.select(function () {
    return this.appendChild(n.apply(this, arguments));
  });
}
function pe() {
  return null;
}
function de(t, n) {
  var e = typeof t == "function" ? t : At(t),
    r = n == null ? pe : typeof n == "function" ? n : rt(n);
  return this.select(function () {
    return this.insertBefore(
      e.apply(this, arguments),
      r.apply(this, arguments) || null,
    );
  });
}
function _e() {
  var t = this.parentNode;
  t && t.removeChild(this);
}
function ge() {
  return this.each(_e);
}
function ye() {
  var t = this.cloneNode(!1),
    n = this.parentNode;
  return n ? n.insertBefore(t, this.nextSibling) : t;
}
function xe() {
  var t = this.cloneNode(!0),
    n = this.parentNode;
  return n ? n.insertBefore(t, this.nextSibling) : t;
}
function we(t) {
  return this.select(t ? xe : ye);
}
function ve(t) {
  return arguments.length ? this.property("__data__", t) : this.node().__data__;
}
function me(t) {
  return function (n) {
    t.call(this, n, this.__data__);
  };
}
function be(t) {
  return t
    .trim()
    .split(/^|\s+/)
    .map(function (n) {
      var e = "",
        r = n.indexOf(".");
      return (
        r >= 0 && ((e = n.slice(r + 1)), (n = n.slice(0, r))),
        { type: n, name: e }
      );
    });
}
function Ne(t) {
  return function () {
    var n = this.__on;
    if (n) {
      for (var e = 0, r = -1, i = n.length, o; e < i; ++e)
        ((o = n[e]),
          (!t.type || o.type === t.type) && o.name === t.name
            ? this.removeEventListener(o.type, o.listener, o.options)
            : (n[++r] = o));
      ++r ? (n.length = r) : delete this.__on;
    }
  };
}
function Ae(t, n, e) {
  return function () {
    var r = this.__on,
      i,
      o = me(n);
    if (r) {
      for (var s = 0, a = r.length; s < a; ++s)
        if ((i = r[s]).type === t.type && i.name === t.name) {
          (this.removeEventListener(i.type, i.listener, i.options),
            this.addEventListener(i.type, (i.listener = o), (i.options = e)),
            (i.value = n));
          return;
        }
    }
    (this.addEventListener(t.type, o, e),
      (i = { type: t.type, name: t.name, value: n, listener: o, options: e }),
      r ? r.push(i) : (this.__on = [i]));
  };
}
function $e(t, n, e) {
  var r = be(t + ""),
    i,
    o = r.length,
    s;
  if (arguments.length < 2) {
    var a = this.node().__on;
    if (a) {
      for (var u = 0, f = a.length, c; u < f; ++u)
        for (i = 0, c = a[u]; i < o; ++i)
          if ((s = r[i]).type === c.type && s.name === c.name) return c.value;
    }
    return;
  }
  for (a = n ? Ae : Ne, i = 0; i < o; ++i) this.each(a(r[i], n, e));
  return this;
}
function Ht(t, n, e) {
  var r = Ct(t),
    i = r.CustomEvent;
  (typeof i == "function"
    ? (i = new i(n, e))
    : ((i = r.document.createEvent("Event")),
      e
        ? (i.initEvent(n, e.bubbles, e.cancelable), (i.detail = e.detail))
        : i.initEvent(n, !1, !1)),
    t.dispatchEvent(i));
}
function Se(t, n) {
  return function () {
    return Ht(this, t, n);
  };
}
function ke(t, n) {
  return function () {
    return Ht(this, t, n.apply(this, arguments));
  };
}
function Ee(t, n) {
  return this.each((typeof n == "function" ? ke : Se)(t, n));
}
function* Ce() {
  for (var t = this._groups, n = 0, e = t.length; n < e; ++n)
    for (var r = t[n], i = 0, o = r.length, s; i < o; ++i)
      (s = r[i]) && (yield s);
}
var Ft = [null];
function y(t, n) {
  ((this._groups = t), (this._parents = n));
}
function F() {
  return new y([[document.documentElement]], Ft);
}
function Re() {
  return this;
}
y.prototype = F.prototype = {
  constructor: y,
  select: nn,
  selectAll: on,
  selectChild: cn,
  selectChildren: dn,
  filter: _n,
  data: mn,
  enter: gn,
  exit: Nn,
  join: An,
  merge: $n,
  selection: Re,
  order: Sn,
  sort: kn,
  call: Cn,
  nodes: Rn,
  node: Mn,
  size: Tn,
  empty: In,
  each: Hn,
  attr: Vn,
  style: zn,
  property: Wn,
  classed: jn,
  text: re,
  html: ae,
  raise: fe,
  lower: le,
  append: he,
  insert: de,
  remove: ge,
  clone: we,
  datum: ve,
  on: $e,
  dispatch: Ee,
  [Symbol.iterator]: Ce,
};
function hi(t) {
  return typeof t == "string"
    ? new y([[document.querySelector(t)]], [document.documentElement])
    : new y([[t]], Ft);
}
function st(t, n, e) {
  ((t.prototype = n.prototype = e), (e.constructor = t));
}
function Xt(t, n) {
  var e = Object.create(t.prototype);
  for (var r in n) e[r] = n[r];
  return e;
}
function X() {}
var I = 0.7,
  B = 1 / I,
  C = "\\s*([+-]?\\d+)\\s*",
  H = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
  m = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
  Me = /^#([0-9a-f]{3,8})$/,
  Te = new RegExp(`^rgb\\(${C},${C},${C}\\)$`),
  Ie = new RegExp(`^rgb\\(${m},${m},${m}\\)$`),
  He = new RegExp(`^rgba\\(${C},${C},${C},${H}\\)$`),
  Fe = new RegExp(`^rgba\\(${m},${m},${m},${H}\\)$`),
  Xe = new RegExp(`^hsl\\(${H},${m},${m}\\)$`),
  qe = new RegExp(`^hsla\\(${H},${m},${m},${H}\\)$`),
  ht = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074,
  };
st(X, E, {
  copy(t) {
    return Object.assign(new this.constructor(), this, t);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: pt,
  formatHex: pt,
  formatHex8: De,
  formatHsl: Le,
  formatRgb: dt,
  toString: dt,
});
function pt() {
  return this.rgb().formatHex();
}
function De() {
  return this.rgb().formatHex8();
}
function Le() {
  return qt(this).formatHsl();
}
function dt() {
  return this.rgb().formatRgb();
}
function E(t) {
  var n, e;
  return (
    (t = (t + "").trim().toLowerCase()),
    (n = Me.exec(t))
      ? ((e = n[1].length),
        (n = parseInt(n[1], 16)),
        e === 6
          ? _t(n)
          : e === 3
            ? new g(
                ((n >> 8) & 15) | ((n >> 4) & 240),
                ((n >> 4) & 15) | (n & 240),
                ((n & 15) << 4) | (n & 15),
                1,
              )
            : e === 8
              ? D(
                  (n >> 24) & 255,
                  (n >> 16) & 255,
                  (n >> 8) & 255,
                  (n & 255) / 255,
                )
              : e === 4
                ? D(
                    ((n >> 12) & 15) | ((n >> 8) & 240),
                    ((n >> 8) & 15) | ((n >> 4) & 240),
                    ((n >> 4) & 15) | (n & 240),
                    (((n & 15) << 4) | (n & 15)) / 255,
                  )
                : null)
      : (n = Te.exec(t))
        ? new g(n[1], n[2], n[3], 1)
        : (n = Ie.exec(t))
          ? new g((n[1] * 255) / 100, (n[2] * 255) / 100, (n[3] * 255) / 100, 1)
          : (n = He.exec(t))
            ? D(n[1], n[2], n[3], n[4])
            : (n = Fe.exec(t))
              ? D(
                  (n[1] * 255) / 100,
                  (n[2] * 255) / 100,
                  (n[3] * 255) / 100,
                  n[4],
                )
              : (n = Xe.exec(t))
                ? xt(n[1], n[2] / 100, n[3] / 100, 1)
                : (n = qe.exec(t))
                  ? xt(n[1], n[2] / 100, n[3] / 100, n[4])
                  : ht.hasOwnProperty(t)
                    ? _t(ht[t])
                    : t === "transparent"
                      ? new g(NaN, NaN, NaN, 0)
                      : null
  );
}
function _t(t) {
  return new g((t >> 16) & 255, (t >> 8) & 255, t & 255, 1);
}
function D(t, n, e, r) {
  return (r <= 0 && (t = n = e = NaN), new g(t, n, e, r));
}
function Pe(t) {
  return (
    t instanceof X || (t = E(t)),
    t ? ((t = t.rgb()), new g(t.r, t.g, t.b, t.opacity)) : new g()
  );
}
function Z(t, n, e, r) {
  return arguments.length === 1 ? Pe(t) : new g(t, n, e, r ?? 1);
}
function g(t, n, e, r) {
  ((this.r = +t), (this.g = +n), (this.b = +e), (this.opacity = +r));
}
st(
  g,
  Z,
  Xt(X, {
    brighter(t) {
      return (
        (t = t == null ? B : Math.pow(B, t)),
        new g(this.r * t, this.g * t, this.b * t, this.opacity)
      );
    },
    darker(t) {
      return (
        (t = t == null ? I : Math.pow(I, t)),
        new g(this.r * t, this.g * t, this.b * t, this.opacity)
      );
    },
    rgb() {
      return this;
    },
    clamp() {
      return new g(k(this.r), k(this.g), k(this.b), z(this.opacity));
    },
    displayable() {
      return (
        -0.5 <= this.r &&
        this.r < 255.5 &&
        -0.5 <= this.g &&
        this.g < 255.5 &&
        -0.5 <= this.b &&
        this.b < 255.5 &&
        0 <= this.opacity &&
        this.opacity <= 1
      );
    },
    hex: gt,
    formatHex: gt,
    formatHex8: Ve,
    formatRgb: yt,
    toString: yt,
  }),
);
function gt() {
  return `#${S(this.r)}${S(this.g)}${S(this.b)}`;
}
function Ve() {
  return `#${S(this.r)}${S(this.g)}${S(this.b)}${S((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function yt() {
  const t = z(this.opacity);
  return `${t === 1 ? "rgb(" : "rgba("}${k(this.r)}, ${k(this.g)}, ${k(this.b)}${t === 1 ? ")" : `, ${t})`}`;
}
function z(t) {
  return isNaN(t) ? 1 : Math.max(0, Math.min(1, t));
}
function k(t) {
  return Math.max(0, Math.min(255, Math.round(t) || 0));
}
function S(t) {
  return ((t = k(t)), (t < 16 ? "0" : "") + t.toString(16));
}
function xt(t, n, e, r) {
  return (
    r <= 0
      ? (t = n = e = NaN)
      : e <= 0 || e >= 1
        ? (t = n = NaN)
        : n <= 0 && (t = NaN),
    new x(t, n, e, r)
  );
}
function qt(t) {
  if (t instanceof x) return new x(t.h, t.s, t.l, t.opacity);
  if ((t instanceof X || (t = E(t)), !t)) return new x();
  if (t instanceof x) return t;
  t = t.rgb();
  var n = t.r / 255,
    e = t.g / 255,
    r = t.b / 255,
    i = Math.min(n, e, r),
    o = Math.max(n, e, r),
    s = NaN,
    a = o - i,
    u = (o + i) / 2;
  return (
    a
      ? (n === o
          ? (s = (e - r) / a + (e < r) * 6)
          : e === o
            ? (s = (r - n) / a + 2)
            : (s = (n - e) / a + 4),
        (a /= u < 0.5 ? o + i : 2 - o - i),
        (s *= 60))
      : (a = u > 0 && u < 1 ? 0 : s),
    new x(s, a, u, t.opacity)
  );
}
function Oe(t, n, e, r) {
  return arguments.length === 1 ? qt(t) : new x(t, n, e, r ?? 1);
}
function x(t, n, e, r) {
  ((this.h = +t), (this.s = +n), (this.l = +e), (this.opacity = +r));
}
st(
  x,
  Oe,
  Xt(X, {
    brighter(t) {
      return (
        (t = t == null ? B : Math.pow(B, t)),
        new x(this.h, this.s, this.l * t, this.opacity)
      );
    },
    darker(t) {
      return (
        (t = t == null ? I : Math.pow(I, t)),
        new x(this.h, this.s, this.l * t, this.opacity)
      );
    },
    rgb() {
      var t = (this.h % 360) + (this.h < 0) * 360,
        n = isNaN(t) || isNaN(this.s) ? 0 : this.s,
        e = this.l,
        r = e + (e < 0.5 ? e : 1 - e) * n,
        i = 2 * e - r;
      return new g(
        W(t >= 240 ? t - 240 : t + 120, i, r),
        W(t, i, r),
        W(t < 120 ? t + 240 : t - 120, i, r),
        this.opacity,
      );
    },
    clamp() {
      return new x(wt(this.h), L(this.s), L(this.l), z(this.opacity));
    },
    displayable() {
      return (
        ((0 <= this.s && this.s <= 1) || isNaN(this.s)) &&
        0 <= this.l &&
        this.l <= 1 &&
        0 <= this.opacity &&
        this.opacity <= 1
      );
    },
    formatHsl() {
      const t = z(this.opacity);
      return `${t === 1 ? "hsl(" : "hsla("}${wt(this.h)}, ${L(this.s) * 100}%, ${L(this.l) * 100}%${t === 1 ? ")" : `, ${t})`}`;
    },
  }),
);
function wt(t) {
  return ((t = (t || 0) % 360), t < 0 ? t + 360 : t);
}
function L(t) {
  return Math.max(0, Math.min(1, t || 0));
}
function W(t, n, e) {
  return (
    (t < 60
      ? n + ((e - n) * t) / 60
      : t < 180
        ? e
        : t < 240
          ? n + ((e - n) * (240 - t)) / 60
          : n) * 255
  );
}
const ot = (t) => () => t;
function Ye(t, n) {
  return function (e) {
    return t + e * n;
  };
}
function Be(t, n, e) {
  return (
    (t = Math.pow(t, e)),
    (n = Math.pow(n, e) - t),
    (e = 1 / e),
    function (r) {
      return Math.pow(t + r * n, e);
    }
  );
}
function ze(t) {
  return (t = +t) == 1
    ? Dt
    : function (n, e) {
        return e - n ? Be(n, e, t) : ot(isNaN(n) ? e : n);
      };
}
function Dt(t, n) {
  var e = n - t;
  return e ? Ye(t, e) : ot(isNaN(t) ? n : t);
}
const U = (function t(n) {
  var e = ze(n);
  function r(i, o) {
    var s = e((i = Z(i)).r, (o = Z(o)).r),
      a = e(i.g, o.g),
      u = e(i.b, o.b),
      f = Dt(i.opacity, o.opacity);
    return function (c) {
      return (
        (i.r = s(c)),
        (i.g = a(c)),
        (i.b = u(c)),
        (i.opacity = f(c)),
        i + ""
      );
    };
  }
  return ((r.gamma = t), r);
})(1);
function Ue(t, n) {
  n || (n = []);
  var e = t ? Math.min(n.length, t.length) : 0,
    r = n.slice(),
    i;
  return function (o) {
    for (i = 0; i < e; ++i) r[i] = t[i] * (1 - o) + n[i] * o;
    return r;
  };
}
function Ke(t) {
  return ArrayBuffer.isView(t) && !(t instanceof DataView);
}
function Ge(t, n) {
  var e = n ? n.length : 0,
    r = t ? Math.min(e, t.length) : 0,
    i = new Array(r),
    o = new Array(e),
    s;
  for (s = 0; s < r; ++s) i[s] = Pt(t[s], n[s]);
  for (; s < e; ++s) o[s] = n[s];
  return function (a) {
    for (s = 0; s < r; ++s) o[s] = i[s](a);
    return o;
  };
}
function We(t, n) {
  var e = new Date();
  return (
    (t = +t),
    (n = +n),
    function (r) {
      return (e.setTime(t * (1 - r) + n * r), e);
    }
  );
}
function v(t, n) {
  return (
    (t = +t),
    (n = +n),
    function (e) {
      return t * (1 - e) + n * e;
    }
  );
}
function Je(t, n) {
  var e = {},
    r = {},
    i;
  ((t === null || typeof t != "object") && (t = {}),
    (n === null || typeof n != "object") && (n = {}));
  for (i in n) i in t ? (e[i] = Pt(t[i], n[i])) : (r[i] = n[i]);
  return function (o) {
    for (i in e) r[i] = e[i](o);
    return r;
  };
}
var j = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
  J = new RegExp(j.source, "g");
function Qe(t) {
  return function () {
    return t;
  };
}
function Ze(t) {
  return function (n) {
    return t(n) + "";
  };
}
function Lt(t, n) {
  var e = (j.lastIndex = J.lastIndex = 0),
    r,
    i,
    o,
    s = -1,
    a = [],
    u = [];
  for (t = t + "", n = n + ""; (r = j.exec(t)) && (i = J.exec(n)); )
    ((o = i.index) > e &&
      ((o = n.slice(e, o)), a[s] ? (a[s] += o) : (a[++s] = o)),
      (r = r[0]) === (i = i[0])
        ? a[s]
          ? (a[s] += i)
          : (a[++s] = i)
        : ((a[++s] = null), u.push({ i: s, x: v(r, i) })),
      (e = J.lastIndex));
  return (
    e < n.length && ((o = n.slice(e)), a[s] ? (a[s] += o) : (a[++s] = o)),
    a.length < 2
      ? u[0]
        ? Ze(u[0].x)
        : Qe(n)
      : ((n = u.length),
        function (f) {
          for (var c = 0, l; c < n; ++c) a[(l = u[c]).i] = l.x(f);
          return a.join("");
        })
  );
}
function Pt(t, n) {
  var e = typeof n,
    r;
  return n == null || e === "boolean"
    ? ot(n)
    : (e === "number"
        ? v
        : e === "string"
          ? (r = E(n))
            ? ((n = r), U)
            : Lt
          : n instanceof E
            ? U
            : n instanceof Date
              ? We
              : Ke(n)
                ? Ue
                : Array.isArray(n)
                  ? Ge
                  : (typeof n.valueOf != "function" &&
                        typeof n.toString != "function") ||
                      isNaN(n)
                    ? Je
                    : v)(t, n);
}
var vt = 180 / Math.PI,
  tt = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1,
  };
function Vt(t, n, e, r, i, o) {
  var s, a, u;
  return (
    (s = Math.sqrt(t * t + n * n)) && ((t /= s), (n /= s)),
    (u = t * e + n * r) && ((e -= t * u), (r -= n * u)),
    (a = Math.sqrt(e * e + r * r)) && ((e /= a), (r /= a), (u /= a)),
    t * r < n * e && ((t = -t), (n = -n), (u = -u), (s = -s)),
    {
      translateX: i,
      translateY: o,
      rotate: Math.atan2(n, t) * vt,
      skewX: Math.atan(u) * vt,
      scaleX: s,
      scaleY: a,
    }
  );
}
var P;
function je(t) {
  const n = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(
    t + "",
  );
  return n.isIdentity ? tt : Vt(n.a, n.b, n.c, n.d, n.e, n.f);
}
function tr(t) {
  return t == null ||
    (P || (P = document.createElementNS("http://www.w3.org/2000/svg", "g")),
    P.setAttribute("transform", t),
    !(t = P.transform.baseVal.consolidate()))
    ? tt
    : ((t = t.matrix), Vt(t.a, t.b, t.c, t.d, t.e, t.f));
}
function Ot(t, n, e, r) {
  function i(f) {
    return f.length ? f.pop() + " " : "";
  }
  function o(f, c, l, h, p, d) {
    if (f !== l || c !== h) {
      var _ = p.push("translate(", null, n, null, e);
      d.push({ i: _ - 4, x: v(f, l) }, { i: _ - 2, x: v(c, h) });
    } else (l || h) && p.push("translate(" + l + n + h + e);
  }
  function s(f, c, l, h) {
    f !== c
      ? (f - c > 180 ? (c += 360) : c - f > 180 && (f += 360),
        h.push({ i: l.push(i(l) + "rotate(", null, r) - 2, x: v(f, c) }))
      : c && l.push(i(l) + "rotate(" + c + r);
  }
  function a(f, c, l, h) {
    f !== c
      ? h.push({ i: l.push(i(l) + "skewX(", null, r) - 2, x: v(f, c) })
      : c && l.push(i(l) + "skewX(" + c + r);
  }
  function u(f, c, l, h, p, d) {
    if (f !== l || c !== h) {
      var _ = p.push(i(p) + "scale(", null, ",", null, ")");
      d.push({ i: _ - 4, x: v(f, l) }, { i: _ - 2, x: v(c, h) });
    } else (l !== 1 || h !== 1) && p.push(i(p) + "scale(" + l + "," + h + ")");
  }
  return function (f, c) {
    var l = [],
      h = [];
    return (
      (f = t(f)),
      (c = t(c)),
      o(f.translateX, f.translateY, c.translateX, c.translateY, l, h),
      s(f.rotate, c.rotate, l, h),
      a(f.skewX, c.skewX, l, h),
      u(f.scaleX, f.scaleY, c.scaleX, c.scaleY, l, h),
      (f = c = null),
      function (p) {
        for (var d = -1, _ = h.length, $; ++d < _; ) l[($ = h[d]).i] = $.x(p);
        return l.join("");
      }
    );
  };
}
var nr = Ot(je, "px, ", "px)", "deg)"),
  er = Ot(tr, ", ", ")", ")");
function mt(t, n, e) {
  var r = new Gt();
  return (
    (n = n == null ? 0 : +n),
    r.restart(
      (i) => {
        (r.stop(), t(i + n));
      },
      n,
      e,
    ),
    r
  );
}
var rr = Jt("start", "end", "cancel", "interrupt"),
  ir = [],
  Yt = 0,
  bt = 1,
  nt = 2,
  V = 3,
  Nt = 4,
  et = 5,
  O = 6;
function G(t, n, e, r, i, o) {
  var s = t.__transition;
  if (!s) t.__transition = {};
  else if (e in s) return;
  sr(t, e, {
    name: n,
    index: r,
    group: i,
    on: rr,
    tween: ir,
    time: o.time,
    delay: o.delay,
    duration: o.duration,
    ease: o.ease,
    timer: null,
    state: Yt,
  });
}
function at(t, n) {
  var e = w(t, n);
  if (e.state > Yt) throw new Error("too late; already scheduled");
  return e;
}
function b(t, n) {
  var e = w(t, n);
  if (e.state > V) throw new Error("too late; already running");
  return e;
}
function w(t, n) {
  var e = t.__transition;
  if (!e || !(e = e[n])) throw new Error("transition not found");
  return e;
}
function sr(t, n, e) {
  var r = t.__transition,
    i;
  ((r[n] = e), (e.timer = Wt(o, 0, e.time)));
  function o(f) {
    ((e.state = bt),
      e.timer.restart(s, e.delay, e.time),
      e.delay <= f && s(f - e.delay));
  }
  function s(f) {
    var c, l, h, p;
    if (e.state !== bt) return u();
    for (c in r)
      if (((p = r[c]), p.name === e.name)) {
        if (p.state === V) return mt(s);
        p.state === Nt
          ? ((p.state = O),
            p.timer.stop(),
            p.on.call("interrupt", t, t.__data__, p.index, p.group),
            delete r[c])
          : +c < n &&
            ((p.state = O),
            p.timer.stop(),
            p.on.call("cancel", t, t.__data__, p.index, p.group),
            delete r[c]);
      }
    if (
      (mt(function () {
        e.state === V &&
          ((e.state = Nt), e.timer.restart(a, e.delay, e.time), a(f));
      }),
      (e.state = nt),
      e.on.call("start", t, t.__data__, e.index, e.group),
      e.state === nt)
    ) {
      for (
        e.state = V, i = new Array((h = e.tween.length)), c = 0, l = -1;
        c < h;
        ++c
      )
        (p = e.tween[c].value.call(t, t.__data__, e.index, e.group)) &&
          (i[++l] = p);
      i.length = l + 1;
    }
  }
  function a(f) {
    for (
      var c =
          f < e.duration
            ? e.ease.call(null, f / e.duration)
            : (e.timer.restart(u), (e.state = et), 1),
        l = -1,
        h = i.length;
      ++l < h;
    )
      i[l].call(t, c);
    e.state === et && (e.on.call("end", t, t.__data__, e.index, e.group), u());
  }
  function u() {
    ((e.state = O), e.timer.stop(), delete r[n]);
    for (var f in r) return;
    delete t.__transition;
  }
}
function or(t, n) {
  var e = t.__transition,
    r,
    i,
    o = !0,
    s;
  if (e) {
    n = n == null ? null : n + "";
    for (s in e) {
      if ((r = e[s]).name !== n) {
        o = !1;
        continue;
      }
      ((i = r.state > nt && r.state < et),
        (r.state = O),
        r.timer.stop(),
        r.on.call(i ? "interrupt" : "cancel", t, t.__data__, r.index, r.group),
        delete e[s]);
    }
    o && delete t.__transition;
  }
}
function ar(t) {
  return this.each(function () {
    or(this, t);
  });
}
function ur(t, n) {
  var e, r;
  return function () {
    var i = b(this, t),
      o = i.tween;
    if (o !== e) {
      r = e = o;
      for (var s = 0, a = r.length; s < a; ++s)
        if (r[s].name === n) {
          ((r = r.slice()), r.splice(s, 1));
          break;
        }
    }
    i.tween = r;
  };
}
function fr(t, n, e) {
  var r, i;
  if (typeof e != "function") throw new Error();
  return function () {
    var o = b(this, t),
      s = o.tween;
    if (s !== r) {
      i = (r = s).slice();
      for (var a = { name: n, value: e }, u = 0, f = i.length; u < f; ++u)
        if (i[u].name === n) {
          i[u] = a;
          break;
        }
      u === f && i.push(a);
    }
    o.tween = i;
  };
}
function cr(t, n) {
  var e = this._id;
  if (((t += ""), arguments.length < 2)) {
    for (var r = w(this.node(), e).tween, i = 0, o = r.length, s; i < o; ++i)
      if ((s = r[i]).name === t) return s.value;
    return null;
  }
  return this.each((n == null ? ur : fr)(e, t, n));
}
function ut(t, n, e) {
  var r = t._id;
  return (
    t.each(function () {
      var i = b(this, r);
      (i.value || (i.value = {}))[n] = e.apply(this, arguments);
    }),
    function (i) {
      return w(i, r).value[n];
    }
  );
}
function Bt(t, n) {
  var e;
  return (
    typeof n == "number"
      ? v
      : n instanceof E
        ? U
        : (e = E(n))
          ? ((n = e), U)
          : Lt
  )(t, n);
}
function lr(t) {
  return function () {
    this.removeAttribute(t);
  };
}
function hr(t) {
  return function () {
    this.removeAttributeNS(t.space, t.local);
  };
}
function pr(t, n, e) {
  var r,
    i = e + "",
    o;
  return function () {
    var s = this.getAttribute(t);
    return s === i ? null : s === r ? o : (o = n((r = s), e));
  };
}
function dr(t, n, e) {
  var r,
    i = e + "",
    o;
  return function () {
    var s = this.getAttributeNS(t.space, t.local);
    return s === i ? null : s === r ? o : (o = n((r = s), e));
  };
}
function _r(t, n, e) {
  var r, i, o;
  return function () {
    var s,
      a = e(this),
      u;
    return a == null
      ? void this.removeAttribute(t)
      : ((s = this.getAttribute(t)),
        (u = a + ""),
        s === u
          ? null
          : s === r && u === i
            ? o
            : ((i = u), (o = n((r = s), a))));
  };
}
function gr(t, n, e) {
  var r, i, o;
  return function () {
    var s,
      a = e(this),
      u;
    return a == null
      ? void this.removeAttributeNS(t.space, t.local)
      : ((s = this.getAttributeNS(t.space, t.local)),
        (u = a + ""),
        s === u
          ? null
          : s === r && u === i
            ? o
            : ((i = u), (o = n((r = s), a))));
  };
}
function yr(t, n) {
  var e = K(t),
    r = e === "transform" ? er : Bt;
  return this.attrTween(
    t,
    typeof n == "function"
      ? (e.local ? gr : _r)(e, r, ut(this, "attr." + t, n))
      : n == null
        ? (e.local ? hr : lr)(e)
        : (e.local ? dr : pr)(e, r, n),
  );
}
function xr(t, n) {
  return function (e) {
    this.setAttribute(t, n.call(this, e));
  };
}
function wr(t, n) {
  return function (e) {
    this.setAttributeNS(t.space, t.local, n.call(this, e));
  };
}
function vr(t, n) {
  var e, r;
  function i() {
    var o = n.apply(this, arguments);
    return (o !== r && (e = (r = o) && wr(t, o)), e);
  }
  return ((i._value = n), i);
}
function mr(t, n) {
  var e, r;
  function i() {
    var o = n.apply(this, arguments);
    return (o !== r && (e = (r = o) && xr(t, o)), e);
  }
  return ((i._value = n), i);
}
function br(t, n) {
  var e = "attr." + t;
  if (arguments.length < 2) return (e = this.tween(e)) && e._value;
  if (n == null) return this.tween(e, null);
  if (typeof n != "function") throw new Error();
  var r = K(t);
  return this.tween(e, (r.local ? vr : mr)(r, n));
}
function Nr(t, n) {
  return function () {
    at(this, t).delay = +n.apply(this, arguments);
  };
}
function Ar(t, n) {
  return (
    (n = +n),
    function () {
      at(this, t).delay = n;
    }
  );
}
function $r(t) {
  var n = this._id;
  return arguments.length
    ? this.each((typeof t == "function" ? Nr : Ar)(n, t))
    : w(this.node(), n).delay;
}
function Sr(t, n) {
  return function () {
    b(this, t).duration = +n.apply(this, arguments);
  };
}
function kr(t, n) {
  return (
    (n = +n),
    function () {
      b(this, t).duration = n;
    }
  );
}
function Er(t) {
  var n = this._id;
  return arguments.length
    ? this.each((typeof t == "function" ? Sr : kr)(n, t))
    : w(this.node(), n).duration;
}
function Cr(t, n) {
  if (typeof n != "function") throw new Error();
  return function () {
    b(this, t).ease = n;
  };
}
function Rr(t) {
  var n = this._id;
  return arguments.length ? this.each(Cr(n, t)) : w(this.node(), n).ease;
}
function Mr(t, n) {
  return function () {
    var e = n.apply(this, arguments);
    if (typeof e != "function") throw new Error();
    b(this, t).ease = e;
  };
}
function Tr(t) {
  if (typeof t != "function") throw new Error();
  return this.each(Mr(this._id, t));
}
function Ir(t) {
  typeof t != "function" && (t = St(t));
  for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)
    for (var o = n[i], s = o.length, a = (r[i] = []), u, f = 0; f < s; ++f)
      (u = o[f]) && t.call(u, u.__data__, f, o) && a.push(u);
  return new A(r, this._parents, this._name, this._id);
}
function Hr(t) {
  if (t._id !== this._id) throw new Error();
  for (
    var n = this._groups,
      e = t._groups,
      r = n.length,
      i = e.length,
      o = Math.min(r, i),
      s = new Array(r),
      a = 0;
    a < o;
    ++a
  )
    for (
      var u = n[a], f = e[a], c = u.length, l = (s[a] = new Array(c)), h, p = 0;
      p < c;
      ++p
    )
      (h = u[p] || f[p]) && (l[p] = h);
  for (; a < r; ++a) s[a] = n[a];
  return new A(s, this._parents, this._name, this._id);
}
function Fr(t) {
  return (t + "")
    .trim()
    .split(/^|\s+/)
    .every(function (n) {
      var e = n.indexOf(".");
      return (e >= 0 && (n = n.slice(0, e)), !n || n === "start");
    });
}
function Xr(t, n, e) {
  var r,
    i,
    o = Fr(n) ? at : b;
  return function () {
    var s = o(this, t),
      a = s.on;
    (a !== r && (i = (r = a).copy()).on(n, e), (s.on = i));
  };
}
function qr(t, n) {
  var e = this._id;
  return arguments.length < 2
    ? w(this.node(), e).on.on(t)
    : this.each(Xr(e, t, n));
}
function Dr(t) {
  return function () {
    var n = this.parentNode;
    for (var e in this.__transition) if (+e !== t) return;
    n && n.removeChild(this);
  };
}
function Lr() {
  return this.on("end.remove", Dr(this._id));
}
function Pr(t) {
  var n = this._name,
    e = this._id;
  typeof t != "function" && (t = rt(t));
  for (var r = this._groups, i = r.length, o = new Array(i), s = 0; s < i; ++s)
    for (
      var a = r[s], u = a.length, f = (o[s] = new Array(u)), c, l, h = 0;
      h < u;
      ++h
    )
      (c = a[h]) &&
        (l = t.call(c, c.__data__, h, a)) &&
        ("__data__" in c && (l.__data__ = c.__data__),
        (f[h] = l),
        G(f[h], n, e, h, f, w(c, e)));
  return new A(o, this._parents, n, e);
}
function Vr(t) {
  var n = this._name,
    e = this._id;
  typeof t != "function" && (t = $t(t));
  for (var r = this._groups, i = r.length, o = [], s = [], a = 0; a < i; ++a)
    for (var u = r[a], f = u.length, c, l = 0; l < f; ++l)
      if ((c = u[l])) {
        for (
          var h = t.call(c, c.__data__, l, u),
            p,
            d = w(c, e),
            _ = 0,
            $ = h.length;
          _ < $;
          ++_
        )
          (p = h[_]) && G(p, n, e, _, h, d);
        (o.push(h), s.push(c));
      }
  return new A(o, s, n, e);
}
var Or = F.prototype.constructor;
function Yr() {
  return new Or(this._groups, this._parents);
}
function Br(t, n) {
  var e, r, i;
  return function () {
    var o = R(this, t),
      s = (this.style.removeProperty(t), R(this, t));
    return o === s ? null : o === e && s === r ? i : (i = n((e = o), (r = s)));
  };
}
function zt(t) {
  return function () {
    this.style.removeProperty(t);
  };
}
function zr(t, n, e) {
  var r,
    i = e + "",
    o;
  return function () {
    var s = R(this, t);
    return s === i ? null : s === r ? o : (o = n((r = s), e));
  };
}
function Ur(t, n, e) {
  var r, i, o;
  return function () {
    var s = R(this, t),
      a = e(this),
      u = a + "";
    return (
      a == null && (u = a = (this.style.removeProperty(t), R(this, t))),
      s === u ? null : s === r && u === i ? o : ((i = u), (o = n((r = s), a)))
    );
  };
}
function Kr(t, n) {
  var e,
    r,
    i,
    o = "style." + n,
    s = "end." + o,
    a;
  return function () {
    var u = b(this, t),
      f = u.on,
      c = u.value[o] == null ? a || (a = zt(n)) : void 0;
    ((f !== e || i !== c) && (r = (e = f).copy()).on(s, (i = c)), (u.on = r));
  };
}
function Gr(t, n, e) {
  var r = (t += "") == "transform" ? nr : Bt;
  return n == null
    ? this.styleTween(t, Br(t, r)).on("end.style." + t, zt(t))
    : typeof n == "function"
      ? this.styleTween(t, Ur(t, r, ut(this, "style." + t, n))).each(
          Kr(this._id, t),
        )
      : this.styleTween(t, zr(t, r, n), e).on("end.style." + t, null);
}
function Wr(t, n, e) {
  return function (r) {
    this.style.setProperty(t, n.call(this, r), e);
  };
}
function Jr(t, n, e) {
  var r, i;
  function o() {
    var s = n.apply(this, arguments);
    return (s !== i && (r = (i = s) && Wr(t, s, e)), r);
  }
  return ((o._value = n), o);
}
function Qr(t, n, e) {
  var r = "style." + (t += "");
  if (arguments.length < 2) return (r = this.tween(r)) && r._value;
  if (n == null) return this.tween(r, null);
  if (typeof n != "function") throw new Error();
  return this.tween(r, Jr(t, n, e ?? ""));
}
function Zr(t) {
  return function () {
    this.textContent = t;
  };
}
function jr(t) {
  return function () {
    var n = t(this);
    this.textContent = n ?? "";
  };
}
function ti(t) {
  return this.tween(
    "text",
    typeof t == "function"
      ? jr(ut(this, "text", t))
      : Zr(t == null ? "" : t + ""),
  );
}
function ni(t) {
  return function (n) {
    this.textContent = t.call(this, n);
  };
}
function ei(t) {
  var n, e;
  function r() {
    var i = t.apply(this, arguments);
    return (i !== e && (n = (e = i) && ni(i)), n);
  }
  return ((r._value = t), r);
}
function ri(t) {
  var n = "text";
  if (arguments.length < 1) return (n = this.tween(n)) && n._value;
  if (t == null) return this.tween(n, null);
  if (typeof t != "function") throw new Error();
  return this.tween(n, ei(t));
}
function ii() {
  for (
    var t = this._name,
      n = this._id,
      e = Ut(),
      r = this._groups,
      i = r.length,
      o = 0;
    o < i;
    ++o
  )
    for (var s = r[o], a = s.length, u, f = 0; f < a; ++f)
      if ((u = s[f])) {
        var c = w(u, n);
        G(u, t, e, f, s, {
          time: c.time + c.delay + c.duration,
          delay: 0,
          duration: c.duration,
          ease: c.ease,
        });
      }
  return new A(r, this._parents, t, e);
}
function si() {
  var t,
    n,
    e = this,
    r = e._id,
    i = e.size();
  return new Promise(function (o, s) {
    var a = { value: s },
      u = {
        value: function () {
          --i === 0 && o();
        },
      };
    (e.each(function () {
      var f = b(this, r),
        c = f.on;
      (c !== t &&
        ((n = (t = c).copy()),
        n._.cancel.push(a),
        n._.interrupt.push(a),
        n._.end.push(u)),
        (f.on = n));
    }),
      i === 0 && o());
  });
}
var oi = 0;
function A(t, n, e, r) {
  ((this._groups = t), (this._parents = n), (this._name = e), (this._id = r));
}
function Ut() {
  return ++oi;
}
var N = F.prototype;
A.prototype = {
  constructor: A,
  select: Pr,
  selectAll: Vr,
  selectChild: N.selectChild,
  selectChildren: N.selectChildren,
  filter: Ir,
  merge: Hr,
  selection: Yr,
  transition: ii,
  call: N.call,
  nodes: N.nodes,
  node: N.node,
  size: N.size,
  empty: N.empty,
  each: N.each,
  on: qr,
  attr: yr,
  attrTween: br,
  style: Gr,
  styleTween: Qr,
  text: ti,
  textTween: ri,
  remove: Lr,
  tween: cr,
  delay: $r,
  duration: Er,
  ease: Rr,
  easeVarying: Tr,
  end: si,
  [Symbol.iterator]: N[Symbol.iterator],
};
function ai(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}
var ui = { time: null, delay: 0, duration: 250, ease: ai };
function fi(t, n) {
  for (var e; !(e = t.__transition) || !(e = e[n]); )
    if (!(t = t.parentNode)) throw new Error(`transition ${n} not found`);
  return e;
}
function ci(t) {
  var n, e;
  t instanceof A
    ? ((n = t._id), (t = t._name))
    : ((n = Ut()), ((e = ui).time = Qt()), (t = t == null ? null : t + ""));
  for (var r = this._groups, i = r.length, o = 0; o < i; ++o)
    for (var s = r[o], a = s.length, u, f = 0; f < a; ++f)
      (u = s[f]) && G(u, t, n, f, s, e || fi(u, n));
  return new A(r, this._parents, t, n);
}
F.prototype.interrupt = ar;
F.prototype.transition = ci;
function T(t, n, e) {
  ((this.k = t), (this.x = n), (this.y = e));
}
T.prototype = {
  constructor: T,
  scale: function (t) {
    return t === 1 ? this : new T(this.k * t, this.x, this.y);
  },
  translate: function (t, n) {
    return (t === 0) & (n === 0)
      ? this
      : new T(this.k, this.x + this.k * t, this.y + this.k * n);
  },
  apply: function (t) {
    return [t[0] * this.k + this.x, t[1] * this.k + this.y];
  },
  applyX: function (t) {
    return t * this.k + this.x;
  },
  applyY: function (t) {
    return t * this.k + this.y;
  },
  invert: function (t) {
    return [(t[0] - this.x) / this.k, (t[1] - this.y) / this.k];
  },
  invertX: function (t) {
    return (t - this.x) / this.k;
  },
  invertY: function (t) {
    return (t - this.y) / this.k;
  },
  rescaleX: function (t) {
    return t.copy().domain(t.range().map(this.invertX, this).map(t.invert, t));
  },
  rescaleY: function (t) {
    return t.copy().domain(t.range().map(this.invertY, this).map(t.invert, t));
  },
  toString: function () {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  },
};
T.prototype;
export { v as a, Pt as i, hi as s };
