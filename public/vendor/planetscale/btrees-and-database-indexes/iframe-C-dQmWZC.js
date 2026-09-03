import "./modulepreload-polyfill-B5Qt9EMX.js";
/* empty css               */ import { s as x } from "./transform-tHp9KnZo.js";
import {
  o as F,
  a as W,
  l as K,
  b as j,
  m as Y,
  c as D,
} from "./line-CEF1yL-R.js";
import { q as g } from "./quad-DIO_O7IL.js";
import "./timer-DWAvo6M8.js";
function U(o, e) {
  let t;
  if (e === void 0)
    for (const s of o)
      s != null && (t > s || (t === void 0 && s >= s)) && (t = s);
  else {
    let s = -1;
    for (let i of o)
      (i = e(i, ++s, o)) != null &&
        (t > i || (t === void 0 && i >= i)) &&
        (t = i);
  }
  return t;
}
const q = document.querySelector("#app");
if (q) {
  const o = document.URL.split("#")[1];
  if (o) {
    const e = document.createElement("div");
    ((e.dataset.id = o), q.appendChild(e));
  }
}
class X {
  constructor() {
    ((this.keyCount = 0), (this.insertStats = []));
  }
  insert(e, t) {
    this.root.clearAttributes();
    const s = this.root.insert(e, t);
    (this.keyCount++,
      s.length > 0 && (this.root = s[1]),
      this.insertStats.push(this.usedForInsertIds()));
  }
  remove(e) {}
  highlightLookup(e) {
    (this.root.clearAttributes(), this.root.highlightLookup(e));
  }
  print() {
    this.root.print();
  }
  clear() {
    this.root.clearAttributes();
  }
  usedForInsertIds() {
    return this.root.usedForInsertIds();
  }
  incrementalSearch(e) {
    return this.root.incrementalSearch(e);
  }
}
let G = 1;
class M {
  constructor(e) {
    ((this.order = e),
      (this.elements = []),
      (this.children = []),
      (this.highlight = !1),
      (this.usedForInsert = !1),
      (this.parent = null),
      (this.id = G++));
  }
  isLeaf() {
    return this.children.length == 0;
  }
  remove(e) {}
  nodeContainsKey(e) {
    for (let t = 0; t < this.elements.length; t++)
      if (this.elements[t].key == e) return !0;
    return !1;
  }
  insertKVIntoNodeSplit(e, t, s) {
    this.insertKVIntoNodeHasSpace(e, t, s);
    const i = Math.floor(this.elements.length / 2),
      a = this.elements[i],
      r = new M(this.order);
    return (
      (r.elements = this.elements.slice(i + 1)),
      (r.children = this.children.slice(i + 1)),
      (this.elements = this.elements.slice(0, i)),
      (this.children = this.children.slice(0, i + 1)),
      (this.usedForInsert = !0),
      (r.usedForInsert = !0),
      [this, r, a]
    );
  }
  insertKVIntoNodeHasSpace(e, t, s) {
    this.usedForInsert = !0;
    let i = 0;
    for (; i < this.elements.length && e >= this.elements[i].key; ) i++;
    return (
      s && this.children.splice(i + 1, 0, s),
      this.elements.splice(i, 0, { key: e, value: t, highlight: !1 }),
      this.children.length == 1 &&
        this.children.splice(0, 0, new M(this.order)),
      []
    );
  }
  needsSplitToInsert() {
    return this.elements.length == this.order;
  }
  handleRootReplacement(e) {
    const t = new M(this.order);
    return (
      (t.usedForInsert = !0),
      t.elements.push(e[2]),
      (e[0].parent = t),
      (e[1].parent = t),
      t.children.push(e[0]),
      t.children.push(e[1]),
      [t, t, void 0]
    );
  }
  insert(e, t) {
    if (this.nodeContainsKey(e)) return [];
    if (this.children.length != 0) {
      let s = [];
      e < this.elements[0].key && (s = this.children[0].insert(e, t));
      for (let i = 0; i < this.elements.length; i++) {
        if (i == this.elements.length - 1 && e >= this.elements[i].key) {
          s = this.children[i + 1].insert(e, t);
          break;
        }
        if (e >= this.elements[i].key && e < this.elements[i + 1].key) {
          s = this.children[i + 1].insert(e, t);
          break;
        }
      }
      if (s.length != 0)
        if (((s[1].parent = this), this.needsSplitToInsert())) {
          const i = this.insertKVIntoNodeSplit(s[2].key, s[2].value, s[1]);
          return this.parent == null ? this.handleRootReplacement(i) : i;
        } else return this.insertKVIntoNodeHasSpace(s[2].key, s[2].value, s[1]);
      return ((this.usedForInsert = !0), []);
    } else {
      if (this.elements.length < this.order)
        return this.insertKVIntoNodeHasSpace(e, t);
      const s = this.insertKVIntoNodeSplit(e, t, void 0);
      return this.parent == null ? this.handleRootReplacement(s) : s;
    }
  }
  clearAttributes() {
    ((this.usedForInsert = !1), (this.highlight = !1));
    for (let e = 0; e < this.elements.length; e++)
      this.elements[e].highlight = !1;
    for (let e = 0; e < this.children.length; e++)
      this.children[e].clearAttributes();
  }
  usedForInsertIds() {
    let e = [];
    for (let t = 0; t < this.children.length; t++)
      e = e.concat(this.children[t].usedForInsertIds());
    return this.usedForInsert ? e.concat([this.id]) : e;
  }
  highlightLookup(e) {
    this.highlight = !1;
    for (let t = 0; t < this.children.length; t++)
      this.children[t].highlightLookup(e);
    for (let t = 0; t < this.elements.length; t++)
      this.elements[t].highlight = !1;
    for (let t = 0; t < this.elements.length; t++)
      e.includes(this.elements[t].value) &&
        ((this.elements[t].highlight = !0), (this.highlight = !0));
  }
  print() {
    for (let e = 0; e < this.children.length; e++) this.children[e].print();
    for (let e = 0; e < this.elements.length; e++)
      console.log(
        "KVH " +
          this.elements[e].key +
          " " +
          this.elements[e].value +
          " " +
          this.elements[e].highlight,
      );
  }
  incrementalSearch(e) {
    if (this.highlight == !1) return ((this.highlight = !0), !1);
    for (let t = 0; t < this.elements.length; t++) {
      if (e == this.elements[t].key)
        return ((this.elements[t].highlight = !0), !0);
      if (this.elements[t].highlight == !1)
        return ((this.elements[t].highlight = !0), !1);
      if (e < this.elements[0].key)
        return this.children.length == 0
          ? !0
          : this.children[0].incrementalSearch(e);
      if (t == this.elements.length - 1 && e >= this.elements[t].key)
        return this.children.length == 0
          ? !0
          : this.children[t + 1].incrementalSearch(e);
      if (e >= this.elements[t].key && e < this.elements[t + 1].key)
        return this.children.length == 0
          ? !0
          : this.children[t + 1].incrementalSearch(e);
    }
    return !0;
  }
}
class Q extends X {
  constructor(e) {
    (super(),
      (this.order = e),
      (this.root = new M(this.order)),
      this.root.clearAttributes());
  }
}
let J = 1;
class R {
  constructor(e, t) {
    ((this.innerOrder = e),
      (this.leafOrder = t),
      (this.elements = []),
      (this.children = []),
      (this.highlight = !1),
      (this.usedForInsert = !1),
      (this.parent = null),
      (this.id = J++),
      (this.nextPage = void 0),
      (this.prevPage = void 0));
  }
  isLeaf() {
    return this.children.length == 0;
  }
  remove(e) {
    if (this.children.length != 0) {
      let t = 0,
        s = 0;
      for (; s < this.elements.length; s++)
        if (s == this.elements.length - 1 && e >= this.elements[s].key) {
          t = this.children[s].remove(e);
          break;
        } else if (e >= this.elements[s].key && e < this.elements[s + 1].key) {
          t = this.children[s].remove(e);
          break;
        }
      if (t == 0)
        return (
          this.elements.splice(s, 1),
          this.children.splice(s, 1),
          this.elements.length
        );
    } else {
      for (let t = 0; t < this.elements.length; t++)
        if (this.elements[t].key == e)
          return (this.elements.splice(t, 1), this.elements.length);
      return this.elements.length;
    }
  }
  nodeContainsKey(e) {
    for (let t = 0; t < this.elements.length; t++)
      if (this.elements[t].key == e) return !0;
    return !1;
  }
  insertKVIntoNodeSplit(e, t, s) {
    const i = this.children.length == 0 ? this.leafOrder : this.innerOrder;
    let a = Math.ceil(i / 2);
    this.splitPercent &&
      ((a = Math.ceil(i * (this.splitPercent / 100))),
      a == i && e < this.elements[a - 1].key && a--);
    const r = new R(this.innerOrder, this.leafOrder);
    return (
      (r.splitPercent = this.splitPercent),
      (r.elements = this.elements.slice(a, i + 1)),
      (r.children = this.children.slice(a, i + 1)),
      (r.prevPage = this),
      this.nextPage && (this.nextPage.prevPage = r),
      (this.elements = this.elements.slice(0, a)),
      (this.children = this.children.slice(0, a)),
      (r.nextPage = this.nextPage),
      (this.nextPage = r),
      r.elements.length != 0 && e < r.elements[0].key
        ? ((this.usedForInsert = !0), this.insertKVIntoNodeHasSpace(e, t, s))
        : ((r.usedForInsert = !0), r.insertKVIntoNodeHasSpace(e, t, s)),
      [this, r]
    );
  }
  insertKVIntoNodeHasSpace(e, t, s) {
    this.usedForInsert = !0;
    let i = 0;
    for (; i < this.elements.length && e >= this.elements[i].key; ) i++;
    return (
      this.elements.splice(i, 0, { key: e, value: t, highlight: !1 }),
      s && this.children.splice(i, 0, s),
      []
    );
  }
  needsSplitToInsert() {
    const e = this.children.length == 0 ? this.leafOrder : this.innerOrder;
    return this.elements.length == e;
  }
  handleRootReplacement(e) {
    const t = new R(this.innerOrder, this.leafOrder);
    return (
      (t.splitPercent = this.splitPercent),
      (t.usedForInsert = !0),
      t.elements.push({
        key: this.elements[0].key,
        value: this.elements[0].value,
        highlight: this.elements[0].highlight,
      }),
      t.elements.push({
        key: e[1].elements[0].key,
        value: e[1].elements[0].value,
        highlight: e[1].elements[0].highlight,
      }),
      t.children.push(this),
      (this.parent = t),
      t.children.push(e[1]),
      (e[1].parent = t),
      [t, t]
    );
  }
  insert(e, t) {
    if (this.children.length != 0) {
      let s = [];
      for (let i = 0; i < this.elements.length; i++) {
        if (i == this.elements.length - 1 && e >= this.elements[i].key) {
          s = this.children[i].insert(e, t);
          break;
        }
        if (i == 0 && e < this.elements[i].key) {
          ((this.elements[i].key = e), (s = this.children[i].insert(e, t)));
          break;
        }
        if (e >= this.elements[i].key && e < this.elements[i + 1].key) {
          s = this.children[i].insert(e, t);
          break;
        }
      }
      if (s.length != 0)
        if (((s[1].parent = this), this.needsSplitToInsert())) {
          const i = this.insertKVIntoNodeSplit(
            s[1].elements[0].key,
            s[1].elements[0].value,
            s[1],
          );
          return this.parent == null ? this.handleRootReplacement(i) : i;
        } else
          return this.insertKVIntoNodeHasSpace(
            s[1].elements[0].key,
            s[1].elements[0].value,
            s[1],
          );
      return ((this.usedForInsert = !0), []);
    } else {
      if (this.nodeContainsKey(e)) return [];
      if (this.elements.length < this.leafOrder)
        return this.insertKVIntoNodeHasSpace(e, t);
      const s = this.insertKVIntoNodeSplit(e, t);
      return this.parent == null ? this.handleRootReplacement(s) : s;
    }
  }
  setSplitPercent(e) {
    this.splitPercent = e;
    for (let t = 0; t < this.children.length; t++)
      this.children[t].setSplitPercent(e);
  }
  clearAttributes() {
    ((this.usedForInsert = !1), (this.highlight = !1));
    for (let e = 0; e < this.elements.length; e++)
      this.elements[e].highlight = !1;
    for (let e = 0; e < this.children.length; e++)
      this.children[e].clearAttributes();
  }
  usedForInsertIds() {
    let e = [];
    for (let t = 0; t < this.children.length; t++)
      e = e.concat(this.children[t].usedForInsertIds());
    return this.usedForInsert ? e.concat([this.id]) : e;
  }
  highlightLookup(e) {
    this.highlight = !1;
    for (let t = 0; t < this.children.length; t++)
      this.children[t].highlightLookup(e);
    if (this.children.length == 0) {
      for (let t = 0; t < this.elements.length; t++)
        this.elements[t].highlight = !1;
      for (let t = 0; t < this.elements.length; t++)
        e.includes(this.elements[t].value) &&
          ((this.elements[t].highlight = !0), (this.highlight = !0));
    }
  }
  print() {
    for (let e = 0; e < this.children.length; e++) this.children[e].print();
    for (let e = 0; e < this.elements.length; e++)
      console.log(
        "KVH " +
          this.elements[e].key +
          " " +
          this.elements[e].value +
          " " +
          this.elements[e].highlight,
      );
  }
  incrementalSearch(e) {
    if (this.highlight == !1) return ((this.highlight = !0), !1);
    for (let t = 0; t < this.elements.length; t++) {
      if (e == this.elements[t].key && this.children.length == 0)
        return ((this.elements[t].highlight = !0), !0);
      if (e < this.elements[t].key && this.children.length == 0)
        return ((this.elements[t].highlight = !0), !0);
      if (this.elements[t].highlight == !1)
        return ((this.elements[t].highlight = !0), !1);
      if (this.children.length > t) {
        if (t == 0 && e < this.elements[t].key)
          return this.children[t].incrementalSearch(e);
        if (t == this.elements.length - 1 && e >= this.elements[t].key)
          return this.children[t].incrementalSearch(e);
        if (e >= this.elements[t].key && e < this.elements[t + 1].key)
          return this.children[t].incrementalSearch(e);
      }
    }
    return !0;
  }
}
class $ extends X {
  constructor(e, t) {
    (super(),
      (this.innerOrder = e),
      (this.leafOrder = t),
      (this.root = new R(this.innerOrder, this.leafOrder)),
      this.root.clearAttributes());
  }
  remove(e) {
    (this.root.clearAttributes(), this.root.remove(e));
  }
  setSplitPercent(e) {
    this.root.setSplitPercent(e);
  }
}
class Z {
  constructor(e, t, s, i) {
    ((this.parentId = e),
      (this.myId = t),
      (this.notify = []),
      (this.title = i.title),
      (this.valueIncrementor = i.startingValue),
      (this.innerNodeOrder = i.startingInnerNodeSize),
      (this.leafNodeOrder = i.startingLeafNodeSize),
      (this.insertHistory = i.inserts),
      (this.levelCoords = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      (this.nodeHeight = 29),
      (this.kvWidth = 31),
      (this.levelSeperation = 100),
      (this.topPadding = 25),
      (this.showNeighbors = i.showNeighbors),
      (this.mode = i.mode),
      (this.dom = s),
      (this.menuDom = s.getElementsByClassName("menu")[0]),
      (this.splitPercent = i.splitPercentStart),
      this.createTree(),
      (this.drawingWidth = s.getBoundingClientRect().width),
      (this.animateSearchInProgress = !1),
      i.height == "auto"
        ? (this.drawingHeight = "70vh")
        : (this.drawingHeight = i.height),
      this.resetSvg(),
      window.addEventListener(
        "resize",
        function (a) {
          ((this.drawingWidth = this.dom.getBoundingClientRect().width),
            this.update());
        }.bind(this),
        !1,
      ));
  }
  addNotify(e) {
    this.notify.push(e);
  }
  sendNotifications() {
    for (const e of this.notify) e();
  }
  createTree() {
    (this.mode == "bplustree"
      ? ((this.tree = new $(this.innerNodeOrder, this.leafNodeOrder)),
        this.tree.setSplitPercent(this.splitPercent))
      : this.mode == "btree"
        ? (this.tree = new Q(this.innerNodeOrder))
        : alert("invalid tree mode"),
      this.sendNotifications());
  }
  resetSvg() {
    this.svg = x("#" + this.dom.id)
      .append("svg")
      .attr("width", "100%")
      .attr("class", "btreeSVG")
      .attr("height", this.drawingHeight);
  }
  addListener(e, t) {
    const s = this.dom.getElementsByClassName(e);
    s.length && s[0].addEventListener("click", t.bind(this), !1);
  }
  processInsert(e, t) {
    (this.tree.insert(e, t), this.sendNotifications());
  }
  addInnerNodeSize(e) {
    const t =
      `
         <span class="subMenu valsPerNode">` +
      (e.mode == "btree"
        ? `<div class="${e.innerNodeColor} subMenuTitle">Keys per node</div>`
        : `<div class="${e.innerNodeColor} subMenuTitle">Keys per inner node</div>`) +
      `
           <button class="${e.innerNodeColor} btreeMenuElement btreeButton innerNodeOrderMinus pm">-</button>
           <input type="text" class="${e.innerNodeColor} btreeMenuElement innerNodeOrder" value="${e.startingInnerNodeSize}" readonly="readonly">
           <button class="${e.innerNodeColor} btreeMenuElement btreeButton innerNodeOrderPlus pm">+</button>
         </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("innerNodeOrderMinus", function () {
        if ((this.innerNodeOrder--, this.innerNodeOrder < 2)) {
          this.innerNodeOrder = 2;
          return;
        }
        this.createTree();
        for (let s = 0; s < this.insertHistory.length; s += 1)
          this.processInsert(
            this.insertHistory[s][0],
            this.insertHistory[s][1],
          );
        (this.svg.remove(),
          this.resetSvg(),
          this.update(),
          (this.dom.getElementsByClassName("innerNodeOrder")[0].value =
            this.innerNodeOrder));
      }),
      this.addListener("innerNodeOrderPlus", function () {
        if ((this.innerNodeOrder++, this.innerNodeOrder > 10)) {
          this.innerNodeOrder = 10;
          return;
        }
        this.createTree();
        for (let s = 0; s < this.insertHistory.length; s += 1)
          this.processInsert(
            this.insertHistory[s][0],
            this.insertHistory[s][1],
          );
        (this.svg.remove(),
          this.resetSvg(),
          this.update(),
          (this.dom.getElementsByClassName("innerNodeOrder")[0].value =
            this.innerNodeOrder));
      }));
  }
  addLeafNodeSize(e) {
    const t = `
      <span class="subMenu valsPerNode">
        <div class="${e.leafNodeColor} subMenuTitle">Keys per leaf node</div>
        <button class="${e.leafNodeColor} btreeMenuElement btreeButton minusButton pm">-</button>
        <input type="text" class="${e.leafNodeColor} btreeMenuElement btreeOrder" value="${e.startingLeafNodeSize}" readonly="readonly">
        <button class="${e.leafNodeColor} btreeMenuElement btreeButton plusButton pm">+</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("minusButton", function () {
        if ((this.leafNodeOrder--, this.leafNodeOrder < 2)) {
          this.leafNodeOrder = 2;
          return;
        }
        this.createTree();
        for (let s = 0; s < this.insertHistory.length; s += 1)
          this.processInsert(
            this.insertHistory[s][0],
            this.insertHistory[s][1],
          );
        (this.svg.remove(),
          this.resetSvg(),
          this.update(),
          (this.dom.getElementsByClassName("btreeOrder")[0].value =
            this.leafNodeOrder));
      }),
      this.addListener("plusButton", function () {
        if ((this.leafNodeOrder++, this.leafNodeOrder > 10)) {
          this.leafNodeOrder = 10;
          return;
        }
        this.createTree();
        for (let s = 0; s < this.insertHistory.length; s += 1)
          this.processInsert(
            this.insertHistory[s][0],
            this.insertHistory[s][1],
          );
        (this.svg.remove(),
          this.resetSvg(),
          this.update(),
          (this.dom.getElementsByClassName("btreeOrder")[0].value =
            this.leafNodeOrder));
      }));
  }
  addSearchRange(e) {
    const t = `<span class="subMenu range">
        <div class="${e.searchColor} subMenuTitle">Find a range of values</div>
        <div style="display:inline-block;">
          <div style="display:inline-block;">
            <button class="${e.searchColor} btreeMenuElement btreeButton minusButtonRangeBottom pm">-</button>
            <input type="text" class="${e.searchColor} btreeMenuElement rangeBottom" value="${e.searchBegin}" readonly="readonly">
            <button class="${e.searchColor} btreeMenuElement btreeButton plusButtonRangeBottom pm">+</button>
          </div>
          <div style="display:inline-block;">
            <button class="${e.searchColor} btreeMenuElement btreeButton minusButtonRangeTop pm">-</button>
            <input type="text" class="${e.searchColor} btreeMenuElement rangeTop" value="${e.searchEnd}" readonly="readonly">
            <button class="${e.searchColor} btreeMenuElement btreeButton plusButtonRangeTop pm">+</button>
          </div>
          <button class="${e.searchColor} btreeMenuElement btreeButton searchButton">Find</button>
        </div>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("minusButtonRangeBottom", function () {
        let s = this.dom.getElementsByClassName("rangeBottom")[0];
        (this.dom.getElementsByClassName("rangeTop")[0],
          s.value != 1 && s.value--);
      }),
      this.addListener("plusButtonRangeBottom", function () {
        let s = this.dom.getElementsByClassName("rangeBottom")[0],
          i = this.dom.getElementsByClassName("rangeTop")[0];
        s.value != 999 && (s.value == i.value && i.value++, s.value++);
      }),
      this.addListener("minusButtonRangeTop", function () {
        let s = this.dom.getElementsByClassName("rangeBottom")[0],
          i = this.dom.getElementsByClassName("rangeTop")[0];
        i.value != 1 && (i.value == s.value && s.value--, i.value--);
      }),
      this.addListener("plusButtonRangeTop", function () {
        let s = this.dom.getElementsByClassName("rangeTop")[0];
        s.value >= 999 || s.value++;
      }),
      this.addListener("searchButton", function () {
        let s = Number(this.dom.getElementsByClassName("rangeBottom")[0].value),
          i = Number(this.dom.getElementsByClassName("rangeTop")[0].value);
        const a = [];
        for (; s <= i; ) (a.push("v" + s), s++);
        (this.tree.highlightLookup(a), this.update());
      }));
  }
  addSearchSingle(e) {
    const t = `<span class="subMenu range">
        <div class="${e.searchColor} subMenuTitle">Search for a key</div>
        <div style="display:inline-block;">
          <div style="display:inline-block;">
            <button class="${e.searchColor} btreeMenuElement btreeButton minusButtonSingleBottom pm">-</button>
            <input type="text" class="${e.searchColor} btreeMenuElement singleBottom" value="${e.searchBegin}">
            <button class="${e.searchColor} btreeMenuElement btreeButton plusButtonSingleBottom pm">+</button>
          </div>
          <button class="${e.searchColor} btreeMenuElement btreeButton searchSingleButton">Search</button>
        </div>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("minusButtonSingleBottom", function () {
        let s = this.dom.getElementsByClassName("singleBottom")[0];
        s.value--;
      }),
      this.addListener("plusButtonSingleBottom", function () {
        let s = this.dom.getElementsByClassName("singleBottom")[0];
        s.value++;
      }),
      this.addListener("searchSingleButton", function () {
        let s = Number(
          this.dom.getElementsByClassName("singleBottom")[0].value,
        );
        (this.animateSearch(s), this.update());
      }));
  }
  addInsert(e) {
    const t = `
      <span class="subMenu keys">
        <div class="${e.insertColor} subMenuTitle">Add a key</div>
        <button class="${e.insertColor} btreeMenuElement btreeButton minusButtonKey pm">-</button>
        <input type="text" class="${e.insertColor} btreeMenuElement valueToAdd" value="${e.insertSequentialBegin}">
        <button class="${e.insertColor} btreeMenuElement btreeButton plusButtonKey pm">+</button>
        <button class="${e.insertColor} btreeMenuElement btreeButton addButton">Add</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("minusButtonKey", function () {
        let s = this.dom.getElementsByClassName("valueToAdd")[0];
        s.value != 1 && s.value--;
      }),
      this.addListener("plusButtonKey", function () {
        let s = this.dom.getElementsByClassName("valueToAdd")[0];
        s.value != 999 && s.value++;
      }),
      this.addListener("addButton", function () {
        const s = this.dom.getElementsByClassName("valueToAdd")[0],
          i = Number(s.value),
          a = "v" + this.valueIncrementor++;
        (this.insertHistory.push([i, a]),
          this.processInsert(i, a),
          s.value++,
          this.update());
      }));
  }
  addColor(e) {
    this.menuDom.insertAdjacentHTML(
      "beforeend",
      `
      <span class="color">
        <span class="colorInner" onclick="toggleColor()">
          <svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 512 512">
          <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
          <path d="M0 64C0 28.7 28.7 0 64 0L352 0c35.3 0 64 28.7 64 64l0 64c0 35.3-28.7 64-64 64L64 192c-35.3 0-64-28.7-64-64L0 64zM160 352c0-17.7 14.3-32 32-32l0-16c0-44.2 35.8-80 80-80l144 0c17.7 0 32-14.3 32-32l0-32 0-90.5c37.3 13.2 64 48.7 64 90.5l0 32c0 53-43 96-96 96l-144 0c-8.8 0-16 7.2-16 16l0 16c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32l0-128z"/>
          </svg>
        </span>
      </span>`,
    );
  }
  addSplitPercent(e) {
    const t = [25, 50, 75, 100];
    let s = `<span class="subMenu splitPercent">  <div class="${e.splitPercentColor} subMenuTitle">Node split percentage</div>`;
    for (const a of t)
      s += `<button class="${e.splitPercentColor} subMenuElement btreeButton splitPercentButton splitPercent${a}">${a}%</button>`;
    ((s += "</span>"), this.menuDom.insertAdjacentHTML("beforeend", s));
    let i = this.dom.getElementsByClassName("splitPercent50")[0];
    if ((this.dom.getElementsByClassName("splitPercent50")[0], i)) {
      i.classList.add("splitPercentButtonSelected");
      for (const a of t) {
        const r = this.dom.getElementsByClassName("splitPercent" + a)[0];
        r.addEventListener(
          "click",
          function () {
            for (const n of this.dom.getElementsByClassName(
              "splitPercentButton",
            ))
              n.classList.remove("splitPercentButtonSelected");
            (r.classList.add("splitPercentButtonSelected"),
              (this.splitPercent = a),
              this.tree.setSplitPercent(a));
          }.bind(this),
          !1,
        );
      }
    }
  }
  addTitle(e) {
    const t = `<span class="mainTitle">${e.title}</span>`;
    this.menuDom.insertAdjacentHTML("beforeend", t);
  }
  addInfo(e) {
    this.menuDom.insertAdjacentHTML(
      "beforeend",
      `<span class="info">
      <span class="infoInner" onclick="openModal('infoModal')">i</span>
      </span>`,
    );
  }
  addInsertRandom(e) {
    const t = `
      <span class="subMenu keys">
        <div class="${e.insertColor} subMenuTitle">Add random key</div>
        <button class="${e.insertColor} btreeMenuElement btreeButton addRandomKeyButton">Add random</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("addRandomKeyButton", function () {
        const s = Math.floor(Math.random() * 1e3),
          i = "v" + this.valueIncrementor++;
        (this.insertHistory.push([s, i]),
          this.processInsert(s, i),
          this.update());
      }));
  }
  addInsertSequential(e) {
    const t = `
      <span class="subMenu keys">
        <div class="${e.insertColor} subMenuTitle">Add sequential key</div>
        <input type="text" class="${e.insertColor} btreeMenuElement valueToAddSequential" value="${e.insertSequentialBegin}">
        <button class="${e.insertColor} btreeMenuElement btreeButton addSequentialKeyButton">Add</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("addSequentialKeyButton", function () {
        const s = this.dom.getElementsByClassName("valueToAddSequential")[0],
          i = Number(s.value),
          a = "v" + this.valueIncrementor++;
        (this.insertHistory.push([i, a]),
          this.processInsert(i, a),
          s.value++,
          this.update());
      }));
  }
  addPlayButton(e) {
    const t =
      `
      <span class="subMenu playButton">` +
      (e.playOnly
        ? ""
        : `<div class="${e.searchColor} subMenuTitle"> &nbsp; </div>`) +
      `<button class="${e.playColor} btreeButton playButton"> ${e.playButtonLabel} </button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("playButton", function () {
        (this.createTree(),
          this.svg.remove(),
          this.resetSvg(),
          this.update(),
          this.animateAdd(this.insertHistory));
      }));
  }
  addResetButton(e) {
    const t = `
      <span class="subMenu resetButton">
        <div class="${e.searchColor} subMenuTitle"> &nbsp; </div>
        <button class="${e.removeColor} btreeButton resetButton">Reset</button>
      </span>`;
    (this.menuDom.insertAdjacentHTML("beforeend", t),
      this.addListener("resetButton", function () {
        ((this.insertHistory = []),
          this.createTree(),
          this.svg.remove(),
          this.resetSvg(),
          this.update());
      }));
  }
  addRemove(e) {
    const t = `
      <br/>
      <span class="subMenu clickToRemove">
        <div class="${e.removeColor} subMenuTitle clickToRemove">Click keys to remove</div>
      </span>`;
    this.menuDom.insertAdjacentHTML("beforeend", t);
  }
  remove(e) {
    this.tree.remove(e);
    for (let t = 0; t < this.insertHistory.length; t++)
      if (this.insertHistory[t][0] == e) {
        this.insertHistory.splice(t, 1);
        break;
      }
    this.update();
  }
  getNeighborX(e, t) {
    let s = e.x * (this.drawingWidth / (this.levelCoords[e.level] + 1));
    const i =
      (e.children.length == 0
        ? this.kvWidth * this.leafNodeOrder + 12
        : this.kvWidth * this.innerNodeOrder + 12) / 2;
    return ((s += t == "left" ? -i : i), s);
  }
  getXForNode(e) {
    return e.x * (this.drawingWidth / (this.levelCoords[e.level] + 1));
  }
  getYForNode(e) {
    return this.topPadding + (e.level - 1) * this.levelSeperation;
  }
  notBTreeIsLeaf(e) {
    return this.mode != "btree" && e.children.length == 0;
  }
  halfWidth(e) {
    return (
      (this.notBTreeIsLeaf(e.source)
        ? this.kvWidth * this.leafNodeOrder
        : this.kvWidth * this.innerNodeOrder) / 2
    );
  }
  isBTreeNotLeaf(e) {
    return this.mode == "btree" || e.children.length != 0;
  }
  isBTreeOrLeaf(e) {
    return this.mode == "btree" || e.children.length == 0;
  }
  update() {
    ((this.animationSpeed = 400 * (1 / (ee() / 100))),
      this.svg
        .append("marker")
        .attr("id", "arrowheadE")
        .attr("markerWidth", "10")
        .attr("markerHeight", "10")
        .attr("refX", 7)
        .attr("refY", 3)
        .attr("fill", "#AAA")
        .attr("orient", "auto")
        .attr("markerUnits", "strokeWidth")
        .append("path")
        .attr("d", "M0,0 L0,6 L7,3 z"),
      this.svg
        .append("marker")
        .attr("id", "arrowheadS")
        .attr("markerWidth", "10")
        .attr("markerHeight", "10")
        .attr("refX", 0)
        .attr("refY", 3)
        .attr("fill", "#AAA")
        .attr("orient", "auto")
        .attr("markerUnits", "strokeWidth")
        .append("path")
        .attr("d", "M7,0 L7,6 L0,3 z"));
    let s = this.flatten(this.tree.root),
      i = [];
    if (this.showNeighbors) {
      let r = function ({ source: l, target: h }) {
          return "M " + l.x + " " + l.y + " L " + h.x + " " + h.y;
        },
        n = [];
      (s.forEach((l) => {
        l.nextPage && n.push({ source: l, target: l.nextPage });
      }),
        this.svg
          .selectAll(".neighbor")
          .data(n, (l) => l.source.id + "-" + l.target.id)
          .join(
            (l) =>
              l
                .append("path")
                .attr("class", "neighbor")
                .attr("visibility", (h) =>
                  this.getNeighborX(h.source, "right") <
                  this.getNeighborX(h.target, "left")
                    ? "visible"
                    : "hidden",
                )
                .attr("marker-end", "url(#arrowheadE)")
                .attr("marker-start", "url(#arrowheadS)")
                .style("stroke-width", 1)
                .style("stroke", "#AAA")
                .attr(
                  "d",
                  (h) =>
                    `M${this.getXForNode(h.source)},${this.getYForNode(h.source)}`,
                ),
            (l) =>
              l.attr("visibility", (h) =>
                this.getNeighborX(h.source, "right") <
                this.getNeighborX(h.target, "left")
                  ? "visible"
                  : "hidden",
              ),
            (l) =>
              l.call((h) =>
                h
                  .transition()
                  .ease(g)
                  .duration(this.animationSpeed)
                  .style("opacity", (v) => 0)
                  .remove(),
              ),
          )
          .transition()
          .ease(g)
          .duration(this.animationSpeed)
          .attr("d", (l) => {
            const h = {
                x: this.getNeighborX(l.source, "right"),
                y:
                  15.5 +
                  (this.topPadding +
                    (l.source.level - 1) * this.levelSeperation),
              },
              v = {
                x: this.getNeighborX(l.target, "left"),
                y:
                  15.5 +
                  (this.topPadding +
                    (l.target.level - 1) * this.levelSeperation),
              };
            return r({ source: h, target: v });
          }));
    }
    (s.forEach((r) => {
      r.isLeaf() ||
        r.children.forEach((n) => {
          i.push({ source: r, target: n });
        });
    }),
      this.svg
        .selectAll(".link")
        .data(i, (r) => r.source.id + "-" + r.target.id)
        .join(
          (r) =>
            r
              .append("path")
              .attr("class", "link")
              .style("stroke-width", 1)
              .style("stroke", "var(--text-secondary)")
              .style("opacity", 0)
              .attr(
                "d",
                (n) =>
                  `M${this.getXForNode(n.source)},${this.getYForNode(n.source)}`,
              ),
          (r) => r,
          (r) =>
            r.call((n) =>
              n
                .transition()
                .ease(g)
                .duration(this.animationSpeed)
                .style("opacity", (l) => 0)
                .remove(),
            ),
        )
        .transition()
        .ease(g)
        .duration(this.animationSpeed)
        .style("opacity", 1)
        .attr("d", (r) => {
          let n =
              r.source.children.length == r.source.elements.length ? -11 : -26,
            l = this.mode == "btree" ? 23 : 0;
          const h = {
              x:
                r.source.x *
                  (this.drawingWidth / (this.levelCoords[r.source.level] + 1)) -
                this.halfWidth(r) +
                r.target.childIndex * this.kvWidth +
                10 +
                this.kvWidth / 2 +
                n,
              y:
                28 +
                (this.topPadding +
                  (r.source.level - 1) * this.levelSeperation) +
                l,
            },
            v = {
              x:
                r.target.x *
                (this.drawingWidth / (this.levelCoords[r.target.level] + 1)),
              y: this.topPadding + (r.target.level - 1) * this.levelSeperation,
            };
          return a({ source: h, target: v });
        }),
      this.svg
        .selectAll(".node")
        .data(s, (r) => "node-" + r.id)
        .join(
          (r) => {
            let n = r
              .append("g")
              .attr("class", "node")
              .attr(
                "transform",
                (l) =>
                  `translate(${this.getXForNode(l)},${this.getYForNode(l)})`,
              );
            return (
              n
                .append("rect")
                .attr("class", "nodeRect")
                .style("stroke-width", 1)
                .style("stroke", (l) =>
                  l.highlight
                    ? "#1e9de7"
                    : l.usedForInsert
                      ? "#27b648"
                      : "#ccc",
                )
                .style("fill", (l) =>
                  l.highlight
                    ? "#ddf2ff"
                    : l.usedForInsert
                      ? "#effff3"
                      : "white",
                )
                .attr(
                  "width",
                  (l) =>
                    (this.isBTreeNotLeaf(l)
                      ? this.kvWidth * this.innerNodeOrder
                      : this.kvWidth * this.leafNodeOrder) + 12,
                )
                .attr("height", (l) =>
                  this.isBTreeOrLeaf(l) ? 52 : this.nodeHeight,
                )
                .attr("rx", 5)
                .attr("x", 0)
                .attr("y", 0),
              n
                .selectAll(".nodeKeyCell")
                .data(
                  (l) => l.elements,
                  (l, h) => "k-" + l.key + "--" + l.highlight,
                )
                .join((l) =>
                  l
                    .append("text")
                    .attr("class", "nodeKeyCell")
                    .style("font-weight", "700")
                    .style("cursor", "pointer")
                    .attr("dx", (h, v) => 10 + this.kvWidth * v)
                    .attr("dy", -1)
                    .on("click", (h, v) => this.remove(v.key))
                    .text((h) => "" + h.key),
                )
                .transition()
                .ease(g)
                .duration(this.animationSpeed)
                .style("fill", (l) => (l.highlight ? "#1e9de7" : "#black"))
                .attr("dy", 19)
                .text((l) => "" + l.key)
                .attr("dx", (l, h) => 10 + this.kvWidth * h),
              n
                .selectAll(".nodeValCell")
                .data(
                  (l) => (this.isBTreeOrLeaf(l) ? l.elements : []),
                  (l, h) => "k-" + l.key + "--" + l.highlight,
                )
                .join((l) =>
                  l
                    .append("text")
                    .attr("class", "nodeValCell")
                    .style("font-weight", "200")
                    .attr("dx", (h, v) => 10 + this.kvWidth * v)
                    .attr("dy", 20)
                    .text((h) => "" + h.value),
                )
                .transition()
                .ease(g)
                .duration(this.animationSpeed)
                .style("fill", (l) => (l.highlight ? "#1e9de7" : "#black"))
                .attr("dy", 40)
                .text((l) => "" + l.value)
                .attr("dx", (l, h) => 10 + this.kvWidth * h),
              n
            );
          },
          (r) => (
            r
              .selectAll(".nodeRect")
              .transition()
              .ease(g)
              .duration(this.animationSpeed)
              .attr("height", (n) =>
                this.isBTreeOrLeaf(n) ? 52 : this.nodeHeight,
              )
              .attr(
                "width",
                (n) =>
                  (this.isBTreeNotLeaf(n)
                    ? this.kvWidth * this.innerNodeOrder
                    : this.kvWidth * this.leafNodeOrder) + 12,
              )
              .style("stroke-width", (n) => 1)
              .style("stroke", (n) =>
                n.highlight ? "#1e9de7" : n.usedForInsert ? "#27b648" : "#ccc",
              )
              .style("fill", (n) =>
                n.highlight ? "#ddf2ff" : n.usedForInsert ? "#effff3" : "white",
              ),
            r
              .selectAll(".nodeKeyCell")
              .data(
                (n) => n.elements,
                (n, l) => "k-" + n.key + "--" + n.highlight,
              )
              .join(
                (n) =>
                  n
                    .append("text")
                    .attr("class", "nodeKeyCell")
                    .style("font-weight", "700")
                    .style("cursor", "pointer")
                    .attr("dx", (l, h) => 10 + this.kvWidth * h)
                    .attr("dy", -1)
                    .on("click", (l, h) => {
                      this.remove(h.key);
                    })
                    .text((l) => l.key),
                (n) => n,
                (n) => {
                  n.call((l) =>
                    l
                      .transition()
                      .ease(g)
                      .duration(this.animationSpeed)
                      .attr("dy", 39)
                      .style("fill", "#d92038")
                      .style("opacity", 0)
                      .remove(),
                  );
                },
              )
              .transition()
              .ease(g)
              .duration(this.animationSpeed)
              .attr("dy", (n) =>
                n.highlight && this.animateSearchInProgress ? -7 : 19,
              )
              .style("fill", (n) => (n.highlight ? "#1e9de7" : "black"))
              .style("fill", (n) => (n.highlight ? "#1e9de7" : "black"))
              .text((n) => n.key)
              .attr("dx", (n, l) => 10 + this.kvWidth * l),
            r
              .selectAll(".nodeValCell")
              .data(
                (n) => (this.isBTreeOrLeaf(n) ? n.elements : []),
                (n, l) => "k-" + n.key + "--" + n.highlight,
              )
              .join(
                (n) =>
                  n
                    .append("text")
                    .attr("class", "nodeValCell")
                    .style("font-weight", "200")
                    .attr("dx", (l, h) => 10 + this.kvWidth * h)
                    .attr("dy", 20)
                    .text((l) => "" + l.value),
                (n) => n,
                (n) => {
                  n.call((l) =>
                    l
                      .transition()
                      .ease(g)
                      .duration(this.animationSpeed)
                      .attr("dy", 60)
                      .style("fill", "#d92038")
                      .style("opacity", (h) => 0)
                      .remove(),
                  );
                },
              )
              .transition()
              .ease(g)
              .duration(this.animationSpeed)
              .attr("dy", 40)
              .style("fill", (n) => (n.highlight ? "#1e9de7" : "black"))
              .text((n) => n.value)
              .attr("dx", (n, l) => 10 + this.kvWidth * l),
            r
          ),
          (r) => {
            (r
              .selectAll(".nodeRect")
              .transition()
              .ease(g)
              .duration(this.animationSpeed / 2)
              .style("fill", (n) => "#ffe5e9")
              .style("stroke", (n) => "#d92038"),
              r.call((n) =>
                n
                  .transition()
                  .ease(g)
                  .duration(this.animationSpeed * 2)
                  .style("opacity", (l) => 0)
                  .remove(),
              ));
          },
        )
        .transition()
        .ease(g)
        .duration(this.animationSpeed)
        .attr("transform", (r) => {
          const n =
              r.x * (this.drawingWidth / (this.levelCoords[r.level] + 1)) -
              ((this.notBTreeIsLeaf(r)
                ? this.kvWidth * this.leafNodeOrder
                : this.kvWidth * this.innerNodeOrder) +
                12) /
                2,
            l = this.topPadding + (r.level - 1) * this.levelSeperation;
          return "translate(" + n + "," + l + ")";
        }),
      this.svg
        .selectAll(".dot")
        .data(i, (r) => r.source.id + "-" + r.target.id)
        .join(
          (r) =>
            r
              .append("ellipse")
              .attr("class", "dot")
              .style("fill", "var(--text-secondary)")
              .attr("cx", (n) => this.getXForNode(n.source))
              .attr("cy", (n) => this.getYForNode(n.source))
              .attr("rx", 2.5)
              .attr("ry", 2.5),
          (r) => r,
          (r) =>
            r.call((n) =>
              n
                .transition()
                .ease(g)
                .duration(this.animationSpeed / 2)
                .remove(),
            ),
        )
        .transition()
        .ease(g)
        .duration(this.animationSpeed)
        .attr("cx", (r) => {
          let n =
            r.source.children.length == r.source.elements.length ? -11 : -26;
          return (
            r.source.x *
              (this.drawingWidth / (this.levelCoords[r.source.level] + 1)) -
            this.halfWidth(r) +
            r.target.childIndex * this.kvWidth +
            10 +
            this.kvWidth / 2 +
            n
          );
        })
        .attr("cy", (r) => {
          let n = this.mode == "btree" ? 23 : 0;
          return (
            29 +
            (this.topPadding + (r.source.level - 1) * this.levelSeperation) +
            n
          );
        }));
    function a({ source: r, target: n }) {
      return (
        "M" +
        r.x +
        "," +
        r.y +
        "C" +
        r.x +
        "," +
        (r.y + n.y) / 2 +
        "," +
        n.x +
        "," +
        (r.y + n.y) / 2 +
        "," +
        n.x +
        "," +
        n.y
      );
    }
  }
  recurse(e, t, s, i) {
    if (
      e != null &&
      ((e.childIndex = i),
      (e.level = t),
      this.levelCoords[t]++,
      (e.x = this.levelCoords[t]),
      s.push(e),
      !e.isLeaf())
    ) {
      let a = 0;
      e.children.forEach((r) => {
        (this.recurse(r, t + 1, s, a), a++);
      });
    }
  }
  flatten(e) {
    this.levelCoords = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const t = [];
    return (this.recurse(e, 1, t), t);
  }
  animateAdd(e) {
    this.delayAdd(e, 0);
  }
  delayAdd(e, t) {
    t >= e.length ||
      (this.tree.insert(e[t][0], e[t][1]),
      this.update(),
      t < e.length &&
        setTimeout(this.delayAdd.bind(this), this.animationSpeed, e, t + 1));
  }
  animateSearch(e) {
    this.animateSearchInProgress = !0;
    const t = this.tree.incrementalSearch(e);
    (this.update(),
      t
        ? setTimeout(
            (() => {
              (this.tree.root.clearAttributes(),
                this.update(),
                (this.animateSearchInProgress = !1));
            }).bind(this),
            2e3,
          )
        : setTimeout(
            this.animateSearch.bind(this),
            this.animationSpeed + 25,
            e,
          ));
  }
}
const _ = "Off";
function I(o, e, t) {
  (t.searchBegin || (t.searchBegin = 0),
    t.searchEnd || (t.searchEnd = 20),
    t.playButtonLabel || (t.playButtonLabel = "Play"),
    t.insertSequentialBegin || (t.insertSequentialBegin = 100),
    t.startingValue || (t.startingValue = 1),
    t.splitPercentStart || (t.splitPercentStart = 50));
  const s = [
    "insertColor",
    "searchColor",
    "innerNodeColor",
    "leafNodeColor",
    "splitPercentColor",
    "removeColor",
    "playColor",
  ];
  for (const n of s) !t.colorStart && t[n] && (t[n] = t[n] + _);
  const i =
    `<div id="${e}" class="` +
    (t.border ? "outerContainer" : "") +
    ` sharedOuterContainer">
    <div class="backgroundBlur" onclick="closeModal('infoModal')"></div>
    <div class="infoModal">
    <div class="infoModalContent">
      <h2> What is a B tree?</h2>
      <p>
      The B-trees and B+trees play a crucial role in many pieces of software, particularly databases.
      Major DBMSs including MySQL, Postgres, MongoDB, and many others rely B+trees to perform efficient data lookups.
      They are often used for what is known as an <i>index</i> &mdash; a structure than can be used to efficiently find individual entries in huge data sets.
      </p>
      <p>
      If you're already familiar with B+trees, you might notice that the B+tree on <code>bplustree.app</code> looks a bit odd.
      The Number of keys is equal to the number of children and each level also is a linked list.
      The great thing about data structures is anyone can tweak them to fit their precise needs.
      This specific B+tree is loosely modeled after the variant used for <a class="btreeA" href="https://blog.jcole.us/2013/01/10/btree-index-structures-in-innodb/">MySQL InnoDB indexes</a>.
      </p>
      <p>
      Wanna learn more about how B+trees are use in databases?
      Check out the <a class="btreeA" href="https://planetscale.com/blog/btrees-and-database-indexes">detailed blog post</a>.
      </p>
    </div>
    </div>
    <div class="supermenu">
      <div class="menu">
      </div>
    </div>
    <div id="bplus-tree">
    </div>`;
  document.querySelector(`[data-id="${o}"]`).innerHTML = i;
  const a = document.getElementById(e),
    r = new Z(o, e, a, t);
  return (
    t.menu &&
      (t.info && r.addInfo(t),
      t.showTitle && r.addTitle(t),
      t.splitPercent && r.addSplitPercent(t),
      t.innerNodeSize && r.addInnerNodeSize(t),
      t.leafNodeSize && r.addLeafNodeSize(t),
      t.searchRange && r.addSearchRange(t),
      t.searchSingle && r.addSearchSingle(t),
      t.insert && r.addInsert(t),
      t.color && r.addColor(t),
      t.insertSequential && r.addInsertSequential(t),
      t.insertRandom && r.addInsertRandom(t),
      t.playButton && r.addPlayButton(t),
      t.resetButton && r.addResetButton(t),
      t.remove && r.addRemove(t)),
    t.playButton || r.animateAdd(t.inserts),
    r.update(),
    r
  );
}
function ee() {
  const o = top.document.querySelector('iframe[src$="#btree-speed-adjuster"]');
  if (!o) return 100;
  const e = o.contentWindow.document.getElementById(
    "btree-global-animation-speed",
  );
  return e != null && e.textContent ? parseFloat(e.textContent) : 100;
}
function te(o, e) {
  const t = [50, 75, 100, 150, 200];
  let s = `
    <div id="btree-global-animation-speed" style="display:none">100</div>
    <div class="menuPercent" style="width:100%" id="${e}">
    <div class="subMenuTitle">Change the animation speed</div>
    <div class="subMenu subMenuPercent">
    <div style="display:flex;">`;
  for (const i of t)
    s += `<button class="btreeButtonPercent" id="percent${i}">${i}%</button>`;
  ((s += "</div></div></div>"),
    (document.querySelector(`[data-id="${o}"]`).innerHTML = s),
    document
      .getElementById("percent100")
      .classList.add("btreeButtonPercentSelected"));
  for (const i of t) {
    const a = document.getElementById("percent" + i);
    a.addEventListener("click", function () {
      for (const r of document.getElementsByClassName("btreeButtonPercent"))
        r.classList.remove("btreeButtonPercentSelected");
      (a.classList.add("btreeButtonPercentSelected"),
        (document.getElementById("btree-global-animation-speed").textContent =
          String(i)));
    });
  }
}
class se {
  constructor(e, t, s) {
    ((this.trees = s), (this.parentId = e), (this.myId = t));
    for (let i of this.trees) i.treeVis.addNotify(this.updateBars.bind(this));
    (this.create(), this.updateBars());
  }
  create() {
    let e = `
      <div class="menu menuBar" style="width:100%">
        <div class="subMenuTitle">Unique nodes visited on previous 5 inserts</div>
        <div class="btreeMenuElement btreeMenuElementBar" id="${this.myId}"></div>
      </div>`;
    ((document.querySelector(`[data-id="${parentId}"]`).innerHTML = e),
      (this.svg = x("#" + this.myId)
        .append("svg")
        .attr("width", "100%")
        .attr("class", "barChartSVG")
        .attr("height", this.trees.length * 40)));
  }
  updateBars() {
    let e = 0,
      t = [];
    for (const a of this.trees) {
      const r = a.label;
      let n = new Set();
      for (
        let l = a.treeVis.tree.insertStats.length - 1;
        l > a.treeVis.tree.insertStats.length - 6 && l >= 0;
        l--
      ) {
        const h = a.treeVis.tree.insertStats[l];
        for (const v of h) n.add(v);
      }
      ((e = n.size > e ? n.size : e), t.push([r, n.size]));
    }
    const s = document.getElementById(this.myId).getBoundingClientRect().width,
      i = Math.min(s, (s - 40) / e);
    (this.svg
      .selectAll(".barRowInsert")
      .data(t, (a, r) => a[0])
      .join(
        (a) =>
          a
            .append("rect")
            .transition()
            .ease(g)
            .duration(250)
            .attr("width", (r) => r[1] * i),
        (a) =>
          a
            .transition()
            .ease(g)
            .duration(250)
            .attr("width", (r) => r[1] * i),
        (a) =>
          a.call((r) =>
            r
              .transition()
              .ease(g)
              .duration(500)
              .style("opacity", (n) => 0)
              .remove(),
          ),
      )
      .attr("class", "barRowInsert")
      .attr("height", 35)
      .style("stroke-width", 1)
      .style("stroke", (a) => "#27b648")
      .style("fill", (a) => "#effff3")
      .attr("rx", 5)
      .attr("x", 10)
      .attr("y", (a, r) => r * 40 + 2),
      this.svg
        .selectAll(".barLabelInsert")
        .data(t, (a, r) => a[0])
        .join(
          (a) =>
            a
              .append("text")
              .transition()
              .ease(g)
              .duration(250)
              .attr("dy", (r, n) => n * 40 + 25)
              .text((r) => "" + r[0] + " (" + r[1] + ")"),
          (a) =>
            a
              .transition()
              .ease(g)
              .duration(250)
              .text((r) => "" + r[0] + " (" + r[1] + ")")
              .attr("dy", (r, n) => n * 40 + 25),
          (a) =>
            a.call((r) =>
              r
                .transition()
                .ease(g)
                .duration(250)
                .style("opacity", (n) => 0)
                .remove(),
            ),
        )
        .attr("class", "barLabelInsert")
        .style("font-weight", "200")
        .style("cursor", "pointer")
        .attr("fill", "var(--gray-500)")
        .style("font-weight", "700")
        .attr("dx", (a, r) => 20));
  }
}
function B(o) {
  return new Promise((e) => {
    if (document.querySelector(o)) return e(document.querySelector(o));
    const t = new MutationObserver((s) => {
      document.querySelector(o) &&
        (t.disconnect(), e(document.querySelector(o)));
    });
    t.observe(document.body, { childList: !0, subtree: !0 });
  });
}
function re() {
  I("btree", "btree-inner", {
    height: 410,
    mode: "btree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !0,
    startingLeafNodeSize: 3,
    startingInnerNodeSize: 3,
    insert: !1,
    insertRandom: !0,
    insertSequential: !0,
    search: !1,
    remove: !1,
    info: !1,
    showNeighbors: !1,
    playButton: !1,
    resetButton: !0,
    border: !0,
    insertColor: "green",
    searchColor: "",
    innerNodeColor: "purple",
    leafNodeColor: "",
    removeColor: "",
    color: !1,
    colorStart: !0,
    inserts: [],
  });
}
B('[data-id="btree"]').then((o) => {
  re();
});
function ie() {
  te("btree-speed-adjuster", "btree-speed-adjuster-inner");
}
B('[data-id="btree-speed-adjuster"]').then((o) => {
  ie();
});
function ne() {
  I("btree-search", "btree-search-inner", {
    height: 310,
    mode: "btree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !1,
    startingLeafNodeSize: 3,
    startingInnerNodeSize: 3,
    insert: !1,
    insertRandom: !1,
    insertSequential: !1,
    searchRange: !1,
    searchSingle: !0,
    searchBegin: 114,
    remove: !1,
    info: !1,
    showNeighbors: !1,
    playButton: !1,
    resetButton: !1,
    border: !0,
    insertColor: "green",
    searchColor: "blue",
    innerNodeColor: "",
    leafNodeColor: "",
    removeColor: "",
    color: !1,
    colorStart: !0,
    inserts: [
      [100, "v0"],
      [101, "v0"],
      [102, "v0"],
      [103, "v0"],
      [104, "v0"],
      [105, "v0"],
      [106, "v0"],
      [107, "v0"],
      [108, "v0"],
      [109, "v0"],
      [110, "v1"],
      [111, "v0"],
      [112, "v1"],
      [113, "v1"],
      [114, "v1"],
    ],
  });
}
B('[data-id="btree-search"]').then((o) => {
  ne();
});
function le() {
  I("bplustree", "bplustree-inner", {
    height: 410,
    mode: "bplustree",
    title: "",
    menu: !0,
    leafNodeSize: !0,
    innerNodeSize: !0,
    startingLeafNodeSize: 4,
    startingInnerNodeSize: 4,
    insert: !1,
    insertRandom: !0,
    insertSequential: !0,
    search: !1,
    remove: !1,
    info: !1,
    showNeighbors: !0,
    playButton: !1,
    resetButton: !0,
    border: !0,
    insertColor: "green",
    searchColor: "",
    innerNodeColor: "purple",
    leafNodeColor: "orange",
    removeColor: "",
    color: !1,
    colorStart: !0,
    inserts: [],
  });
}
B('[data-id="bplustree"]').then((o) => {
  le();
});
function ae() {
  I("bplustree-search", "bplustree-search-inner", {
    height: 310,
    mode: "bplustree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !1,
    startingLeafNodeSize: 3,
    startingInnerNodeSize: 3,
    insert: !1,
    insertRandom: !1,
    insertSequential: !1,
    searchRange: !1,
    searchSingle: !0,
    searchBegin: 132,
    remove: !1,
    info: !1,
    showNeighbors: !0,
    playButton: !1,
    resetButton: !1,
    border: !0,
    insertColor: "green",
    searchColor: "blue",
    innerNodeColor: "",
    leafNodeColor: "",
    removeColor: "",
    color: !1,
    colorStart: !0,
    inserts: [
      [100, "v0"],
      [110, "v1"],
      [120, "v2"],
      [130, "v3"],
      [101, "v4"],
      [111, "v5"],
      [121, "v6"],
      [131, "v7"],
      [102, "v8"],
      [112, "v9"],
      [122, "v10"],
      [132, "v11"],
    ],
  });
}
B('[data-id="bplustree-search"]').then((o) => {
  ae();
});
function oe() {
  const e = I("bplustree-random", "bplustree-random-inner", {
      height: 410,
      mode: "bplustree",
      title: "B+tree with random inserts",
      showTitle: !1,
      menu: !0,
      leafNodeSize: !1,
      innerNodeSize: !1,
      startingLeafNodeSize: 4,
      startingInnerNodeSize: 4,
      insert: !1,
      insertRandom: !0,
      insertSequential: !1,
      search: !1,
      remove: !1,
      info: !1,
      showNeighbors: !0,
      playButton: !1,
      resetButton: !0,
      border: !0,
      splitPercent: !0,
      insertColor: "green",
      searchColor: "",
      innerNodeColor: "",
      leafNodeColor: "",
      removeColor: "",
      splitPercentColor: "yellow",
      color: !1,
      colorStart: !0,
      inserts: [],
    }),
    s = I("bplustree-sequential", "bplustree-sequential-inner", {
      height: 410,
      mode: "bplustree",
      title: "B+tree with sequential inserts",
      showTitle: !1,
      menu: !0,
      leafNodeSize: !1,
      innerNodeSize: !1,
      startingLeafNodeSize: 4,
      startingInnerNodeSize: 4,
      insert: !1,
      insertRandom: !1,
      insertSequential: !0,
      search: !1,
      remove: !1,
      info: !1,
      showNeighbors: !0,
      playButton: !1,
      resetButton: !0,
      border: !0,
      splitPercent: !0,
      insertColor: "green",
      searchColor: "",
      innerNodeColor: "",
      leafNodeColor: "",
      removeColor: "",
      splitPercentColor: "yellow",
      color: !1,
      colorStart: !0,
      inserts: [],
    });
  new se("bplustree-insert-bar-chart", "bplustree-insert-bar-chart-inner", [
    { label: "B+tree with random inserts", treeVis: e },
    { label: "B+tree with sequential inserts", treeVis: s },
  ]);
}
B('[data-id="bplustree-sequential"]').then((o) => {
  oe();
});
function he() {
  I(
    "bplustree-sequential-range-search",
    "bplustree-sequential-range-search-inner",
    {
      height: 410,
      mode: "bplustree",
      title: "",
      menu: !0,
      leafNodeSize: !1,
      innerNodeSize: !1,
      startingLeafNodeSize: 4,
      startingInnerNodeSize: 4,
      startingValue: 20,
      insert: !1,
      insertRandom: !1,
      insertSequential: !0,
      insertSequentialBegin: 120,
      searchRange: !0,
      searchBegin: 4,
      searchEnd: 7,
      remove: !1,
      info: !1,
      showNeighbors: !0,
      playButton: !1,
      resetButton: !1,
      border: !0,
      insertColor: "green",
      searchColor: "blue",
      innerNodeColor: "",
      leafNodeColor: "",
      removeColor: "",
      color: !1,
      colorStart: !0,
      inserts: [
        [100, "v0"],
        [101, "v1"],
        [102, "v2"],
        [103, "v3"],
        [104, "v4"],
        [105, "v5"],
        [106, "v6"],
        [107, "v7"],
        [108, "v8"],
        [109, "v9"],
        [110, "v10"],
      ],
    },
  );
}
B('[data-id="bplustree-sequential-range-search"]').then((o) => {
  he();
});
function de() {
  I("bplustree-random-range-search", "bplustree-random-range-search-inner", {
    height: 410,
    mode: "bplustree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !1,
    startingLeafNodeSize: 4,
    startingInnerNodeSize: 4,
    startingValue: 20,
    insert: !1,
    insertRandom: !0,
    insertSequential: !1,
    searchRange: !0,
    searchBegin: 4,
    searchEnd: 7,
    remove: !1,
    info: !1,
    showNeighbors: !0,
    playButton: !1,
    resetButton: !1,
    border: !0,
    insertColor: "green",
    searchColor: "blue",
    innerNodeColor: "",
    leafNodeColor: "",
    removeColor: "",
    color: !1,
    colorStart: !0,
    inserts: [
      [204, "v0"],
      [15, "v1"],
      [418, "v2"],
      [103, "v3"],
      [150, "v4"],
      [605, "v5"],
      [517, "v6"],
      [907, "v7"],
      [719, "v8"],
      [113, "v9"],
      [910, "v10"],
      [511, "v11"],
      [780, "v12"],
      [560, "v13"],
      [474, "v14"],
      [870, "v15"],
    ],
  });
}
B('[data-id="bplustree-random-range-search"]').then((o) => {
  de();
});
function ue() {
  const e = `
  <div id="depthBarCharContainer" class="outerContainer">
    <div id="depthBarChartVis"></div>
    <div class="slidecontainer">
      <span class="sliderLabel purple">Keys per inner node: <span id="keysPerInnerNode"></span></span>
      <input type="range" min="2" max="200" value="100" class="slider sliderKeysPerInnerNode" id="keysPerInnerNodeSlider">
    </div>
    <div class="slidecontainer">
      <span class="sliderLabel orange" >Keys per leaf node: <span id="keysPerLeafNode"></span></span>
      <input type="range" min="2" max="200" value="100" class="slider sliderKeysPerLeafNode" id="keysPerLeafNodeSlider">
    </div>
  </div>`;
  document.querySelector('[data-id="bplustree-depth-line"]').innerHTML = e;
  var t = document.getElementById("keysPerInnerNodeSlider"),
    s = document.getElementById("keysPerInnerNode");
  ((s.innerHTML = t.value),
    (t.oninput = function () {
      ((s.innerHTML = this.value), (b = this.value), c());
    }));
  var i = document.getElementById("keysPerLeafNodeSlider"),
    a = document.getElementById("keysPerLeafNode");
  ((a.innerHTML = i.value),
    (i.oninput = function () {
      ((a.innerHTML = this.value), (C = this.value), c());
    }));
  function r(d) {
    return d > 1e12
      ? Math.round(d / 1e12) + "tr"
      : d > 1e9
        ? Math.round(d / 1e9) + "bi"
        : d > 1e6
          ? Math.round(d / 1e6) + "mi"
          : d > 1e3
            ? Math.round(d / 1e3) + "k"
            : d + " ";
  }
  let n = 1;
  const l = [],
    h = [],
    v = [];
  let E = 0;
  for (; n <= 2e12; )
    ((n *= 2), l.push(n), h.push(r(n)), E % 4 == 0 && v.push(r(n)), E++);
  let b = 100,
    C = 100;
  window.addEventListener("resize", function (d) {
    c();
  });
  var T = document
      .getElementById("depthBarCharContainer")
      .getBoundingClientRect().width,
    m = { top: 35, right: 20, bottom: 50, left: 50 },
    N = T - m.left - m.right,
    P = 320 - m.top - m.bottom,
    S = x("#depthBarChartVis")
      .append("svg")
      .attr("width", N + m.left + m.right)
      .attr("height", P + m.top + m.bottom)
      .append("g")
      .attr("transform", "translate(" + m.left + "," + m.top + ")");
  const A = [];
  for (let d = 0; d < l.length; d++) A.push((N / l.length) * d);
  var L = F().range(A),
    V = W().scale(L);
  S.append("g")
    .attr("transform", "translate(0," + P + ")")
    .attr("class", "depthXaxis");
  var w = K().range([P, 0]),
    z = j().scale(w);
  (S.append("g").attr("class", "depthYaxis"),
    S.append("text")
      .attr("class", "yLabel")
      .attr("text-anchor", "beginning")
      .style("font-size", "14px")
      .attr("fill", "var(--text-primary)")
      .attr("x", 15)
      .attr("y", 10)
      .text("Depth of B+tree"),
    S.append("text")
      .attr("class", "xLabel")
      .attr("text-anchor", "beginning")
      .style("font-size", "14px")
      .attr("fill", "var(--text-primary)")
      .attr("x", 0)
      .attr("y", 270)
      .text("Nodes in (full) B+tree"));
  function c() {
    const d = document.getElementById("depthBarCharContainer");
    if (!d) return;
    ((N = d.getBoundingClientRect().width - m.left - m.right),
      x("#depthBarChartVis").attr("width", N + m.left + m.right),
      x("#depthBarChartVis")
        .selectAll("svg")
        .attr("width", N + m.left + m.right));
    const p = [];
    for (let u = 0; u < l.length; u++) p.push((N / l.length) * u);
    const y = [];
    for (const u of l) {
      let O = 0;
      if (u <= C) O = 1;
      else {
        let H = 1;
        for (; b ** H * C < u; ) H++;
        O = H + 1;
      }
      y.push({ numKeys: u, depth: O });
    }
    (L.domain(h),
      L.range(p),
      S.selectAll(".depthXaxis")
        .transition()
        .duration(250)
        .call(V.tickValues(v)),
      w.domain([
        U(y, function (u) {
          return u.depth;
        }),
        Y(y, function (u) {
          return u.depth;
        }),
      ]),
      S.selectAll(".depthYaxis").transition().duration(250).call(z));
    var k = S.selectAll(".lineTest").data([y], function (u) {
      return u.numKeys;
    });
    k.enter()
      .append("path")
      .attr("class", "lineTest")
      .merge(k)
      .transition()
      .duration(250)
      .attr(
        "d",
        D()
          .x(function (u) {
            return L(u.numKeys);
          })
          .y(function (u) {
            return w(u.depth);
          }),
      )
      .attr("fill", "none")
      .attr("stroke", "#27b648")
      .attr("stroke-width", 4);
  }
  c();
}
B('[data-id="bplustree-depth-line"]').then((o) => {
  ue();
});
function ce() {
  let e = [],
    t = [];
  const s = `
  <div id="insertVisContainer" class="outerContainer">
    <div id="insertVis"></div>
    <div class="slidecontainer">
      <span class="sliderLabel yellow">Split Percentage: <span id="splitPercentagePV"></span>%</span>
      <input type="range" min="20" max="100" value="50" class="slider sliderSplitPercentagePV" id="splitPercentagePVSlider">
    </div>
  </div>`;
  document.querySelector(
    '[data-id="bplustree-inserts-nodes-visited"]',
  ).innerHTML = s;
  var i = document.getElementById("splitPercentagePVSlider"),
    a = document.getElementById("splitPercentagePV");
  ((a.innerHTML = i.value),
    (i.oninput = function () {
      ((a.innerHTML = this.value),
        (v = this.value),
        (e = l(N)),
        (t = h(N)),
        w());
    }));
  function r(c) {
    let d = new Set();
    for (let f = c.length - 1; f > 0 && f > c.length - 6; f--)
      for (let p of c[f]) d.add(p);
    return d.size;
  }
  function n(c) {
    const d = [];
    for (let f = 0; f < c.length; f++) c[f] % 25 == 0 && d.push(c[f]);
    return d;
  }
  function l(c) {
    const d = [],
      f = new $(c, c);
    f.setSplitPercent(v);
    for (let p = 1; p <= 400; p += 1)
      if ((f.insert(p + " ", "v"), p % 2 == 0)) {
        const y = r(f.insertStats);
        d.push({ inserts: p, nodesVisited: y });
      }
    return d;
  }
  function h(c) {
    const d = [],
      f = new $(c, c);
    f.setSplitPercent(v);
    for (let p = 1; p <= 400; p += 1)
      if ((f.insert(Math.floor(Math.random() * 250), "v"), p % 2 == 0)) {
        const y = r(f.insertStats);
        d.push({ inserts: p, nodesVisited: y });
      }
    return d;
  }
  let v = 50;
  const E = document
    .getElementById("insertVisContainer")
    .getBoundingClientRect().width;
  var b = { top: 35, right: 20, bottom: 50, left: 50 },
    C = E - b.left - b.right,
    T = 320 - b.top - b.bottom,
    m = x("#insertVis")
      .append("svg")
      .attr("width", C + b.left + b.right)
      .attr("height", T + b.top + b.bottom)
      .append("g")
      .attr("transform", "translate(" + b.left + "," + b.top + ")");
  window.addEventListener("resize", function (c) {
    w();
  });
  const N = 10;
  ((e = l(N)), (t = h(N)));
  const P = [];
  for (let c = 0; c < e.length; c++) P.push((C / e.length) * c);
  var S = F().range(P),
    A = W().scale(S);
  m.append("g")
    .attr("transform", "translate(0," + T + ")")
    .attr("class", "depthXaxis");
  var L = K().range([T, 0]),
    V = j().scale(L);
  (m.append("g").attr("class", "depthYaxis"),
    m
      .append("text")
      .attr("class", "yLabel")
      .attr("text-anchor", "beginning")
      .style("font-size", "14px")
      .attr("fill", "var(--text-primary)")
      .attr("x", 15)
      .attr("y", 10)
      .text("# of nodes visited in previous 5 inserts"),
    m
      .append("text")
      .attr("class", "xLabel")
      .attr("text-anchor", "beginning")
      .style("font-size", "14px")
      .attr("fill", "var(--text-primary)")
      .attr("x", 5)
      .attr("y", 270)
      .text("400 key insert sequence"));
  function w() {
    const c = document.getElementById("insertVisContainer");
    if (!c) return;
    ((C = c.getBoundingClientRect().width - b.left - b.right),
      x("#insertVis").attr("width", C + b.left + b.right),
      x("#depthBarChartVis")
        .selectAll("svg")
        .attr("width", C + b.left + b.right));
    const f = [];
    for (let u = 0; u < e.length; u++) f.push((C / e.length) * u);
    const p = [];
    let y = 0;
    for (let u = 0; u < e.length; u++)
      (e[u].nodesVisited > y && (y = e[u].nodesVisited),
        t[u].nodesVisited > y && (y = t[u].nodesVisited),
        p.push(e[u].inserts));
    const k = n(p);
    (S.domain(p),
      S.range(f),
      m
        .selectAll(".depthXaxis")
        .transition()
        .duration(250)
        .call(A.tickValues(k)),
      L.domain([0, y + 1]),
      m.selectAll(".depthYaxis").transition().duration(250).call(V),
      z(m, "lineSequential", "#27b648", e),
      z(m, "lineRandom", "#1e9de7", t));
  }
  function z(c, d, f, p) {
    var y = c.selectAll("." + d).data([p], function (k) {
      return k.inserts;
    });
    y.enter()
      .append("path")
      .attr("class", d)
      .merge(y)
      .transition()
      .duration(250)
      .attr(
        "d",
        D()
          .x(function (k) {
            return S(k.inserts);
          })
          .y(function (k) {
            return L(k.nodesVisited);
          }),
      )
      .attr("fill", "none")
      .attr("stroke", f)
      .attr("stroke-width", 2);
  }
  w();
}
B('[data-id="bplustree-inserts-nodes-visited"]').then((o) => {
  ce();
});
function me() {
  I("bplustree-key-size-large", "bplustree-key-size-large-inner", {
    height: 310,
    mode: "bplustree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !1,
    startingLeafNodeSize: 4,
    startingInnerNodeSize: 4,
    insert: !1,
    insertRandom: !1,
    insertSequential: !1,
    insertSequentialBegin: 120,
    search: !1,
    remove: !1,
    info: !1,
    showNeighbors: !0,
    playOnly: !0,
    playButton: !0,
    playButtonLabel: "Play insertion sequence",
    resetButton: !1,
    border: !0,
    insertColor: "",
    searchColor: "",
    innerNodeColor: "",
    leafNodeColor: "",
    removeColor: "red",
    splitPercentColor: "",
    playColor: "green",
    color: !1,
    colorStart: !0,
    inserts: [
      [100, "v0"],
      [101, "v1"],
      [102, "v2"],
      [103, "v3"],
      [104, "v4"],
      [105, "v5"],
      [106, "v6"],
      [107, "v7"],
      [108, "v8"],
      [109, "v9"],
      [110, "v10"],
      [111, "v11"],
      [112, "v12"],
      [113, "v13"],
      [114, "v14"],
      [115, "v15"],
      [116, "v16"],
      [117, "v17"],
      [118, "v18"],
      [119, "v19"],
    ],
  });
}
B('[data-id="bplustree-key-size-large"]').then((o) => {
  me();
});
function fe() {
  I("bplustree-key-size-small", "bplustree-key-size-small-inner", {
    height: 210,
    mode: "bplustree",
    title: "",
    menu: !0,
    leafNodeSize: !1,
    innerNodeSize: !1,
    startingLeafNodeSize: 6,
    startingInnerNodeSize: 6,
    insert: !1,
    insertRandom: !1,
    insertSequential: !1,
    insertSequentialBegin: 120,
    search: !1,
    remove: !1,
    info: !1,
    showNeighbors: !0,
    playOnly: !0,
    playButton: !0,
    playButtonLabel: "Play insertion sequence",
    resetButton: !1,
    border: !0,
    insertColor: "",
    searchColor: "",
    innerNodeColor: "",
    leafNodeColor: "",
    removeColor: "red",
    splitPercentColor: "",
    playColor: "green",
    color: !1,
    colorStart: !0,
    inserts: [
      [100, "v0"],
      [101, "v1"],
      [102, "v2"],
      [103, "v3"],
      [104, "v4"],
      [105, "v5"],
      [106, "v6"],
      [107, "v7"],
      [108, "v8"],
      [109, "v9"],
      [110, "v10"],
      [111, "v11"],
      [112, "v12"],
      [113, "v13"],
      [114, "v14"],
      [115, "v15"],
      [116, "v16"],
      [117, "v17"],
      [118, "v18"],
      [119, "v19"],
    ],
  });
}
B('[data-id="bplustree-key-size-small"]').then((o) => {
  fe();
});
