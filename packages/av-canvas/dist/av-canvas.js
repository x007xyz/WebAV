var St = Object.defineProperty;
var mt = (e) => {
  throw TypeError(e);
};
var vt = (e, t, r) => t in e ? St(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var q = (e, t, r) => vt(e, typeof t != "symbol" ? t + "" : t, r), dt = (e, t, r) => t.has(e) || mt("Cannot " + r);
var n = (e, t, r) => (dt(e, t, "read from private field"), r ? r.call(e) : t.get(e)), m = (e, t, r) => t.has(e) ? mt("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), b = (e, t, r, i) => (dt(e, t, "write to private field"), i ? i.call(e, r) : t.set(e, r), r), Y = (e, t, r) => (dt(e, t, "access private method"), r);
import { Rect as H, Log as G, MediaStreamClip as Ct, Combinator as Mt, OffscreenSprite as kt } from "@webav/av-cliper";
import { EventTool as ft, workerTimer as It } from "@webav/internal-utils";
const At = [
  "t",
  "b",
  "l",
  "r",
  "lt",
  "lb",
  "rt",
  "rb",
  "rotate"
];
function _(e) {
  return document.createElement(e);
}
function Tt(e) {
  let t = 16;
  const r = new ResizeObserver((s) => {
    const o = s[0];
    o != null && (t = 10 / (o.contentRect.width / e.width));
  });
  r.observe(e);
  function i(s) {
    const { w: o, h } = s, a = t, c = a / 2, l = o / 2, d = h / 2, u = a * 1.5, f = u / 2;
    return {
      ...s.fixedAspectRatio ? {} : {
        t: new H(-c, -d - c, a, a, s),
        b: new H(-c, d - c, a, a, s),
        l: new H(-l - c, -c, a, a, s),
        r: new H(l - c, -c, a, a, s)
      },
      lt: new H(-l - c, -d - c, a, a, s),
      lb: new H(-l - c, d - c, a, a, s),
      rt: new H(l - c, -d - c, a, a, s),
      rb: new H(l - c, d - c, a, a, s),
      rotate: new H(-f, -d - a * 2 - f, u, u, s)
    };
  }
  return {
    rectCtrlsGetter: i,
    destroy: () => {
      r.disconnect();
    }
  };
}
var J = /* @__PURE__ */ ((e) => (e.ActiveSpriteChange = "activeSpriteChange", e.AddSprite = "addSprite", e))(J || {}), T, V, U, E;
class zt {
  constructor() {
    m(this, T, []);
    m(this, V, null);
    m(this, U, new ft());
    q(this, "on", n(this, U).on);
    m(this, E, 0);
  }
  get activeSprite() {
    return n(this, V);
  }
  set activeSprite(t) {
    t !== n(this, V) && (b(this, V, t), n(this, U).emit("activeSpriteChange", t));
  }
  async addSprite(t) {
    await t.ready, n(this, T).push(t), b(this, T, n(this, T).sort((r, i) => r.zIndex - i.zIndex)), t.on("propsChange", (r) => {
      r.zIndex != null && b(this, T, n(this, T).sort((i, s) => i.zIndex - s.zIndex));
    }), n(this, U).emit("addSprite", t);
  }
  removeSprite(t) {
    n(this, V) === t && (this.activeSprite = null), b(this, T, n(this, T).filter((r) => r !== t)), t.destroy();
  }
  getSprites(t = { time: !0 }) {
    return n(this, T).filter(
      (r) => r.visible && (t.time ? n(this, E) >= r.time.offset && n(this, E) <= r.time.offset + r.time.duration : !0)
    );
  }
  updateRenderTime(t) {
    b(this, E, t);
    const r = this.activeSprite;
    r != null && (t < r.time.offset || t > r.time.offset + r.time.duration) && (this.activeSprite = null);
  }
  destroy() {
    n(this, U).destroy(), n(this, T).forEach((t) => t.destroy()), b(this, T, []);
  }
}
T = new WeakMap(), V = new WeakMap(), U = new WeakMap(), E = new WeakMap();
function Ot(e, t, r, i) {
  const s = {
    w: t.clientWidth / t.width,
    h: t.clientHeight / t.height
  }, o = new ResizeObserver(() => {
    s.w = t.clientWidth / t.width, s.h = t.clientHeight / t.height, r.activeSprite != null && lt(
      r.activeSprite,
      a,
      c,
      s,
      i
    );
  });
  o.observe(t);
  let h = () => {
  };
  const { rectEl: a, ctrlsEl: c } = Lt(e), l = r.on(J.ActiveSpriteChange, (d) => {
    if (h(), d == null) {
      a.style.display = "none";
      return;
    }
    lt(d, a, c, s, i), h = d.on("propsChange", () => {
      lt(d, a, c, s, i);
    }), a.style.display = "";
  });
  return () => {
    o.disconnect(), l(), a.remove(), h();
  };
}
function Lt(e) {
  const t = _("div");
  t.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 1px solid #eee;
    box-sizing: border-box;
    display: none;
  `;
  const r = Object.fromEntries(
    At.map((i) => {
      const s = _("div");
      return s.style.cssText = `
        display: none;
        position: absolute;
        border: 1px solid #3ee; border-radius: 50%;
        box-sizing: border-box;
        background-color: #fff;
      `, [i, s];
    })
  );
  return Object.values(r).forEach((i) => t.appendChild(i)), e.appendChild(t), {
    rectEl: t,
    ctrlsEl: r
  };
}
function lt(e, t, r, i, s) {
  const { x: o, y: h, w: a, h: c, angle: l } = e.rect;
  Object.assign(t.style, {
    left: `${o * i.w}px`,
    top: `${h * i.h}px`,
    width: `${a * i.w}px`,
    height: `${c * i.h}px`,
    rotate: `${l}rad`
  }), Object.entries(s(e.rect)).forEach(([d, { x: u, y: f, w: p, h: g }]) => {
    Object.assign(r[d].style, {
      display: "block",
      left: "50%",
      top: "50%",
      width: `${p * i.w}px`,
      height: `${g * i.h}px`,
      // border 1px, 所以要 -1
      transform: `translate(${u * i.w}px, ${f * i.h}px)`
    });
  });
}
function Rt(e, t, r) {
  const i = {
    w: e.clientWidth / e.width,
    h: e.clientHeight / e.height
  }, s = new ResizeObserver(() => {
    i.w = e.clientWidth / e.width, i.h = e.clientHeight / e.height;
  });
  s.observe(e);
  const o = (h) => {
    if (h.button !== 0) return;
    const { offsetX: a, offsetY: c } = h, l = a / i.w, d = c / i.h;
    if (t.activeSprite != null) {
      const [u] = Object.entries(r(t.activeSprite.rect)).find(
        ([, f]) => f.checkHit(l, d)
      ) ?? [];
      if (u != null) return;
    }
    t.activeSprite = t.getSprites().reverse().find((u) => u.visible && u.rect.checkHit(l, d)) ?? null;
  };
  return e.addEventListener("pointerdown", o), () => {
    s.disconnect(), e.removeEventListener("pointerdown", o);
  };
}
function Wt(e, t, r, i) {
  const s = {
    w: e.clientWidth / e.width,
    h: e.clientHeight / e.height
  }, o = new ResizeObserver(() => {
    s.w = e.clientWidth / e.width, s.h = e.clientHeight / e.height;
  });
  o.observe(e);
  let h = 0, a = 0, c = null;
  const l = Xt(e, r);
  let d = null;
  const u = (g) => {
    if (g.button !== 0 || t.activeSprite == null) return;
    d = t.activeSprite;
    const { offsetX: v, offsetY: M, clientX: y, clientY: w } = g;
    Bt({
      rect: d.rect,
      offsetX: v,
      offsetY: M,
      clientX: y,
      clientY: w,
      cvsRatio: s,
      cvsEl: e,
      rectCtrlsGetter: i
    }) || (c = d.rect.clone(), l.magneticEffect(d.rect.x, d.rect.y, d.rect), h = y, a = w, window.addEventListener("pointermove", f), window.addEventListener("pointerup", p));
  }, f = (g) => {
    if (d == null || c == null) return;
    const { clientX: v, clientY: M } = g;
    let y = c.x + (v - h) / s.w, w = c.y + (M - a) / s.h;
    bt(
      d.rect,
      e,
      l.magneticEffect(y, w, d.rect)
    );
  };
  e.addEventListener("pointerdown", u);
  const p = () => {
    l.hide(), window.removeEventListener("pointermove", f), window.removeEventListener("pointerup", p);
  };
  return () => {
    o.disconnect(), l.destroy(), p(), e.removeEventListener("pointerdown", u);
  };
}
function Ht({
  sprRect: e,
  startX: t,
  startY: r,
  ctrlKey: i,
  cvsRatio: s,
  cvsEl: o
}) {
  const h = e.clone(), a = (l) => {
    const { clientX: d, clientY: u } = l, f = (d - t) / s.w, p = (u - r) / s.h, g = i.length === 1 ? $t : Pt, { x: v, y: M, w: y, h: w } = h, j = Math.atan2(w, y), { incW: it, incH: nt, incS: F, rotateAngle: ut } = g({
      deltaX: f,
      deltaY: p,
      angle: e.angle,
      ctrlKey: i,
      diagonalAngle: j
    }), I = 10;
    let R = y, N = w, rt = h.fixedScaleCenter ? it * 2 : it, st = h.fixedScaleCenter ? nt * 2 : nt, B = F;
    const pt = Math.sqrt(w ** 2 + y ** 2), wt = Math.sqrt((I * (w / y)) ** 2 + I ** 2);
    switch (i) {
      case "l":
        R = Math.max(y + rt, I), B = Math.min(F, y - I);
        break;
      case "r":
        R = Math.max(y + rt, I), B = Math.max(F, I - y);
        break;
      case "b":
        N = Math.max(w + st, I), B = Math.min(F, w - I);
        break;
      case "t":
        N = Math.max(w + st, I), B = Math.max(F, I - w);
        break;
      case "lt":
      case "lb":
        R = Math.max(y + rt, I), N = R === I ? w / y * R : w + st, B = Math.min(F, pt - wt);
        break;
      case "rt":
      case "rb":
        R = Math.max(y + rt, I), N = R === I ? w / y * R : w + st, B = Math.max(F, wt - pt);
        break;
    }
    let ct = v, ht = M;
    if (h.fixedScaleCenter)
      ct = v + y / 2 - R / 2, ht = M + w / 2 - N / 2;
    else {
      const yt = B / 2 * Math.cos(ut) + v + y / 2, xt = B / 2 * Math.sin(ut) + M + w / 2;
      ct = yt - R / 2, ht = xt - N / 2;
    }
    bt(e, o, {
      x: ct,
      y: ht,
      w: R,
      h: N
    });
  }, c = () => {
    window.removeEventListener("pointermove", a), window.removeEventListener("pointerup", c);
  };
  window.addEventListener("pointermove", a), window.addEventListener("pointerup", c);
}
function $t({
  deltaX: e,
  deltaY: t,
  angle: r,
  ctrlKey: i
}) {
  let s = 0, o = 0, h = 0, a = r;
  return i === "l" || i === "r" ? (s = e * Math.cos(r) + t * Math.sin(r), o = s * (i === "l" ? -1 : 1)) : (i === "t" || i === "b") && (a = r - Math.PI / 2, s = e * Math.cos(a) + t * Math.sin(a), h = s * (i === "b" ? -1 : 1)), { incW: o, incH: h, incS: s, rotateAngle: a };
}
function Pt({
  deltaX: e,
  deltaY: t,
  angle: r,
  ctrlKey: i,
  diagonalAngle: s
}) {
  const o = (i === "lt" || i === "rb" ? 1 : -1) * s + r, h = e * Math.cos(o) + t * Math.sin(o), a = i === "lt" || i === "lb" ? -1 : 1, c = h * Math.cos(s) * a, l = h * Math.sin(s) * a;
  return { incW: c, incH: l, incS: h, rotateAngle: o };
}
function Bt({
  rect: e,
  cvsRatio: t,
  offsetX: r,
  offsetY: i,
  clientX: s,
  clientY: o,
  cvsEl: h,
  rectCtrlsGetter: a
}) {
  const c = r / t.w, l = i / t.h, [d] = Object.entries(a(e)).find(
    ([, u]) => u.checkHit(c, l)
  ) ?? [];
  return d == null ? !1 : (d === "rotate" ? Yt(e, Dt(e.center, t, h)) : Ht({
    sprRect: e,
    ctrlKey: d,
    startX: s,
    startY: o,
    cvsRatio: t,
    cvsEl: h
  }), !0);
}
function Yt(e, t) {
  const r = ({ clientX: s, clientY: o }) => {
    const h = s - t.x, a = o - t.y, c = Math.atan2(a, h) + Math.PI / 2;
    e.angle = c;
  }, i = () => {
    window.removeEventListener("pointermove", r), window.removeEventListener("pointerup", i);
  };
  window.addEventListener("pointermove", r), window.addEventListener("pointerup", i);
}
function Dt(e, t, r) {
  const i = e.x * t.w, s = e.y * t.h, { left: o, top: h } = r.getBoundingClientRect();
  return {
    x: i + o,
    y: s + h
  };
}
function bt(e, t, r) {
  const i = { x: e.x, y: e.y, w: e.w, h: e.h, ...r }, s = t.width * 0.05, o = t.height * 0.05;
  i.x < -i.w + s ? i.x = -i.w + s : i.x > t.width - s && (i.x = t.width - s), i.y < -i.h + o ? i.y = -i.h + o : i.y > t.height - o && (i.y = t.height - o), e.x = i.x, e.y = i.y, e.w = i.w, e.h = i.h;
}
function Xt(e, t) {
  const r = "display: none; position: absolute;", i = { w: 0, h: 0, x: 0, y: 0 }, s = {
    vertMiddle: {
      ...i,
      h: 100,
      x: 50,
      ref: { prop: "x", val: ({ w: c }) => (e.width - c) / 2 }
    },
    horMiddle: {
      ...i,
      w: 100,
      y: 50,
      ref: { prop: "y", val: ({ h: c }) => (e.height - c) / 2 }
    },
    top: {
      ...i,
      w: 100,
      ref: { prop: "y", val: () => 0 }
    },
    bottom: {
      ...i,
      w: 100,
      y: 100,
      ref: { prop: "y", val: ({ h: c }) => e.height - c }
    },
    left: {
      ...i,
      h: 100,
      ref: { prop: "x", val: () => 0 }
    },
    right: {
      ...i,
      h: 100,
      x: 100,
      ref: { prop: "x", val: ({ w: c }) => e.width - c }
    }
  }, o = _("div");
  o.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    box-sizing: border-box;
  `;
  const h = Object.fromEntries(
    Object.entries(s).map(([c, { w: l, h: d, x: u, y: f }]) => {
      const p = _("div");
      return p.style.cssText = `
        ${r}
        border-${l > 0 ? "top" : "left"}: 1px solid #3ee;
        top: ${f}%; left: ${u}%;
        ${u === 100 ? "margin-left: -1px" : ""};
        ${f === 100 ? "margin-top: -1px" : ""};
        width: ${l}%; height: ${d}%;
      `, o.appendChild(p), [c, p];
    })
  );
  t.appendChild(o);
  const a = 6 / (900 / e.width);
  return {
    magneticEffect(c, l, d) {
      const u = { x: c, y: l };
      let f, p = { x: !1, y: !1 };
      for (f in s) {
        const { prop: g, val: v } = s[f].ref;
        if (p[g]) continue;
        const M = v(d);
        Math.abs(d[g] - M) <= a && Math.abs(d[g] - (g === "x" ? c : l)) <= a ? (u[g] = M, h[f].style.display = "block", p[g] = !0) : h[f].style.display = "none";
      }
      return u;
    },
    hide() {
      Object.values(h).forEach((c) => c.style.display = "none");
    },
    destroy() {
      o.remove();
    }
  };
}
function jt(e, t, r) {
  const i = {
    w: e.clientWidth / e.width,
    h: e.clientHeight / e.height
  }, s = new ResizeObserver(() => {
    i.w = e.clientWidth / e.width, i.h = e.clientHeight / e.height;
  });
  s.observe(e);
  const o = e.style;
  let h = t.activeSprite;
  t.on(J.ActiveSpriteChange, (p) => {
    h = p, p == null && (o.cursor = "");
  });
  let a = !1;
  const c = ({ offsetX: p, offsetY: g }) => {
    a = !0;
    const v = p / i.w, M = g / i.h;
    (h == null ? void 0 : h.rect.checkHit(v, M)) === !0 && o.cursor === "" && (o.cursor = "move");
  }, l = () => {
    a = !1;
  }, d = [
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize"
  ], u = { t: 0, rt: 1, r: 2, rb: 3, b: 4, lb: 5, l: 6, lt: 7 }, f = (p) => {
    if (h == null || a) return;
    const { offsetX: g, offsetY: v } = p, M = g / i.w, y = v / i.h, [w] = Object.entries(r(h.rect)).find(
      ([, j]) => j.checkHit(M, y)
    ) ?? [];
    if (w != null) {
      if (w === "rotate") {
        o.cursor = "crosshair";
        return;
      }
      const j = h.rect.angle, it = j < 0 ? j + 2 * Math.PI : j, nt = (u[w] + Math.floor((it + Math.PI / 8) / (Math.PI / 4))) % 8;
      o.cursor = d[nt];
      return;
    }
    if (h.rect.checkHit(M, y)) {
      o.cursor = "move";
      return;
    }
    o.cursor = "";
  };
  return e.addEventListener("pointermove", f), e.addEventListener("pointerdown", c), window.addEventListener("pointerup", l), () => {
    s.disconnect(), e.removeEventListener("pointermove", f), e.removeEventListener("pointerdown", c), window.removeEventListener("pointerup", l);
  };
}
const Ft = {
  sampleRate: 48e3,
  channelCount: 2,
  codec: "mp4a.40.2"
};
function Nt(e) {
  const t = _("canvas");
  return t.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  `, t.width = e.width, t.height = e.height, t;
}
var S, x, k, Q, Z, K, $, tt, z, A, W, P, L, ot, at, C, D, X, gt, O, et;
class Qt {
  /**
   * 创建 `AVCanvas` 类的实例。
   * @param attchEl - 要添加画布的元素。
   * @param opts - 画布的选项
   * @param opts.bgColor - 画布的背景颜色。
   * @param opts.width - 画布的宽度。
   * @param opts.height - 画布的高度。
   */
  constructor(t, r) {
    m(this, L);
    m(this, S);
    m(this, x);
    m(this, k);
    m(this, Q, !1);
    m(this, Z, []);
    m(this, K);
    m(this, $, new ft());
    q(this, "on", n(this, $).on);
    m(this, tt);
    m(this, z, {
      mode: "cover",
      opacity: 1,
      blur: 0
    });
    // 在 AVCanvas 类中添加
    m(this, A, null);
    m(this, W, null);
    m(this, P, 0);
    m(this, C, new AudioContext());
    m(this, D, n(this, C).createMediaStreamDestination());
    m(this, X, /* @__PURE__ */ new Set());
    m(this, O, {
      start: 0,
      end: 0,
      // paused state when step equal 0
      step: 0,
      // step: (1000 / 30) * 1000,
      audioPlayAt: 0
    });
    m(this, et, /* @__PURE__ */ new WeakMap());
    /**
     * 添加 {@link VisibleSprite}
     * @param args {@link VisibleSprite}
     * @example
     * const sprite = new VisibleSprite(
     *   new ImgClip({
     *     type: 'image/gif',
     *     stream: (await fetch('https://xx.gif')).body!,
     *   }),
     * );
     */
    q(this, "addSprite", async (t) => {
      n(this, C).state === "suspended" && n(this, C).resume().catch(G.error);
      const r = t.getClip();
      if (r instanceof Ct && r.audioTrack != null) {
        const i = n(this, C).createMediaStreamSource(
          new MediaStream([r.audioTrack])
        );
        i.connect(n(this, D)), n(this, et).set(t, i);
      }
      await n(this, x).addSprite(t), t.preFrame(0);
    });
    /**
     * 删除 {@link VisibleSprite}
     * @param args
     * @returns
     * @example
     * const sprite = new VisibleSprite();
     * avCvs.removeSprite(sprite);
     */
    q(this, "removeSprite", (t) => {
      var r;
      (r = n(this, et).get(t)) == null || r.disconnect(), n(this, x).removeSprite(t);
    });
    b(this, tt, r), b(this, S, Nt(r));
    const i = n(this, S).getContext("2d", { alpha: !1 });
    if (i == null) throw Error("canvas context is null");
    b(this, k, i);
    const s = _("div");
    s.style.cssText = "width: 100%; height: 100%; position: relative; overflow: hidden;", s.appendChild(n(this, S)), t.appendChild(s), Ut(n(this, C)).connect(n(this, D)), b(this, x, new zt());
    const { rectCtrlsGetter: o, destroy: h } = Tt(
      n(this, S)
    );
    n(this, Z).push(
      h,
      // 鼠标样式、控制 sprite 依赖 activeSprite，
      // activeSprite 需要在他们之前监听到 mousedown 事件 (代码顺序需要靠前)
      Rt(n(this, S), n(this, x), o),
      jt(n(this, S), n(this, x), o),
      Wt(
        n(this, S),
        n(this, x),
        s,
        o
      ),
      Ot(s, n(this, S), n(this, x), o),
      n(this, x).on(J.AddSprite, (u) => {
        const { rect: f } = u;
        f.x === 0 && f.y === 0 && (f.x = (n(this, S).width - f.w) / 2, f.y = (n(this, S).height - f.h) / 2);
      }),
      ft.forwardEvent(n(this, x), n(this, $), [
        J.ActiveSpriteChange
      ])
    );
    let a = n(this, P), c = performance.now(), l = 0;
    const d = 1e3 / 30;
    b(this, K, It(() => {
      if (!((performance.now() - c) / (d * l) < 1)) {
        if (l += 1, n(this, k).fillStyle = r.bgColor, n(this, k).fillRect(0, 0, n(this, S).width, n(this, S).height), n(this, A)) {
          const { width: u, height: f } = n(this, S), { mode: p, opacity: g } = n(this, z);
          switch (n(this, k).save(), g !== 1 && (n(this, k).globalAlpha = g), p) {
            case "cover":
              Et(
                n(this, k),
                n(this, A),
                0,
                0,
                u,
                f
              );
              break;
            case "contain":
              _t(
                n(this, k),
                n(this, A),
                0,
                0,
                u,
                f
              );
              break;
            case "stretch":
              n(this, k).drawImage(n(this, A), 0, 0, u, f);
              break;
            case "repeat":
              const v = n(this, k).createPattern(
                n(this, A),
                "repeat"
              );
              v && (n(this, k).fillStyle = v, n(this, k).fillRect(0, 0, u, f));
              break;
          }
        }
        Y(this, L, gt).call(this), a !== n(this, P) && (a = n(this, P), n(this, $).emit("timeupdate", Math.round(a)));
      }
    }, d));
  }
  /**
   * 每 33ms 更新一次画布，绘制已添加的 Sprite
   * @param opts - 播放选项
   * @param opts.start - 开始播放的时间（单位：微秒）
   * @param [opts.end] - 结束播放的时间（单位：微秒）。如果未指定，则播放到最后一个 Sprite 的结束时间
   * @param [opts.playbackRate] - 播放速率。1 表示正常速度，2 表示两倍速度，0.5 表示半速等。如果未指定，则默认为 1
   * @throws 如果开始时间大于等于结束时间或小于 0，则抛出错误
   */
  play(t) {
    const r = n(this, x).getSprites({ time: !1 }).map((s) => s.time.offset + s.time.duration), i = t.end ?? (r.length > 0 ? Math.max(...r) : 1 / 0);
    if (t.start >= i || t.start < 0)
      throw Error(
        `Invalid time parameter, ${JSON.stringify({ start: t.start, end: i })}`
      );
    Y(this, L, ot).call(this, t.start), n(this, x).getSprites({ time: !1 }).forEach((s) => {
      const { offset: o, duration: h } = s.time, a = n(this, P) - o;
      s.preFrame(a > 0 && a < h ? a : 0);
    }), n(this, O).start = t.start, n(this, O).end = i, n(this, O).step = (t.playbackRate ?? 1) * (1e3 / 30) * 1e3, n(this, C).resume(), n(this, O).audioPlayAt = 0, n(this, $).emit("playing"), G.info("AVCanvs play by:", n(this, O));
  }
  /**
   * 暂停播放，画布内容不再更新
   */
  pause() {
    Y(this, L, at).call(this);
  }
  /**
   * 预览 `AVCanvas` 指定时间的图像帧
   */
  previewFrame(t) {
    Y(this, L, ot).call(this, t), Y(this, L, at).call(this);
  }
  /**
   * 获取当前帧的截图图像 返回的是一个base64
   */
  captureImage() {
    return n(this, S).toDataURL();
  }
  get activeSprite() {
    return n(this, x).activeSprite;
  }
  set activeSprite(t) {
    n(this, x).activeSprite = t;
  }
  /**
   * 销毁实例
   */
  destroy() {
    var t;
    n(this, Q) || (b(this, Q, !0), n(this, C).close(), n(this, D).disconnect(), n(this, $).destroy(), n(this, K).call(this), (t = n(this, S).parentElement) == null || t.remove(), n(this, Z).forEach((r) => r()), n(this, X).clear(), n(this, x).destroy());
  }
  /**
   * 合成所有素材的图像与音频，返回实时媒体流 `MediaStream`
   *
   * 可用于 WebRTC 推流，或由 {@link [AVRecorder](../../av-recorder/classes/AVRecorder.html)} 录制生成视频文件
   *
   * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
   *
   */
  captureStream() {
    n(this, C).state === "suspended" && n(this, C).resume().catch(G.error);
    const t = new MediaStream(
      n(this, S).captureStream().getTracks().concat(n(this, D).stream.getTracks())
    );
    return G.info(
      "AVCanvas.captureStream, tracks:",
      t.getTracks().map((r) => r.kind)
    ), t;
  }
  /**
   * 创建一个视频合成器 {@link [Combinator](../../av-cliper/classes/Combinator.html)} 实例，用于将当前画布添加的 Sprite 导出为视频文件流
   *
   * @param opts - 创建 Combinator 的可选参数
   * @throws 如果没有添加素材，会抛出错误
   *
   * @example
   * avCvs.createCombinator().output() // => ReadableStream
   *
   * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
   */
  async createCombinator(t = {}) {
    G.info("AVCanvas.createCombinator, opts:", t);
    const r = new Mt({ ...n(this, tt), ...t }), i = n(this, x).getSprites({ time: !1 });
    if (i.length === 0) throw Error("No sprite added");
    for (const s of i) {
      const o = new kt(s.getClip());
      o.time = { ...s.time }, s.copyStateTo(o), await r.addSprite(o);
    }
    return r;
  }
  /**
   * 设置背景图片
   * @param image 背景图片（ImageBitmap、HTMLImageElement 或 URL）
   * @param options 可选配置（如拉伸模式、透明度等）
   */
  async setBackgroundImage(t, r = {}) {
    let i;
    if (typeof t == "string") {
      const o = await (await fetch(t)).blob();
      i = await createImageBitmap(o);
    } else t instanceof HTMLImageElement ? i = await createImageBitmap(t) : i = t;
    if (b(this, W, i), b(this, z, {
      mode: r.mode || "cover",
      opacity: r.opacity !== void 0 ? r.opacity : 1,
      blur: r.blur !== void 0 ? r.blur : 0
    }), n(this, z).blur > 0) {
      const s = new OffscreenCanvas(
        i.width,
        i.height
      ), o = s.getContext("2d");
      o ? (o.filter = `blur(${n(this, z).blur}px)`, o.drawImage(i, 0, 0), b(this, A, await createImageBitmap(s))) : b(this, A, i);
    } else
      b(this, A, i);
  }
  /**
   * 更新背景图片的模糊效果或透明度
   * @param options 可选配置（模式、透明度、模糊度）
   */
  async updateBackgroundOptions(t = {}) {
    if (n(this, W) && (t.mode !== void 0 && (n(this, z).mode = t.mode), t.opacity !== void 0 && (n(this, z).opacity = t.opacity), t.blur !== void 0 && (n(this, z).blur = t.blur), t.blur !== void 0))
      if (n(this, z).blur > 0) {
        const r = new OffscreenCanvas(
          n(this, W).width,
          n(this, W).height
        ), i = r.getContext("2d");
        i && (i.filter = `blur(${n(this, z).blur}px)`, i.drawImage(n(this, W), 0, 0), b(this, A, await createImageBitmap(r)));
      } else
        b(this, A, n(this, W));
  }
  /**
   * 清除背景图片，恢复使用纯色背景
   */
  clearBackgroundImage() {
    b(this, A, null), b(this, W, null);
  }
}
S = new WeakMap(), x = new WeakMap(), k = new WeakMap(), Q = new WeakMap(), Z = new WeakMap(), K = new WeakMap(), $ = new WeakMap(), tt = new WeakMap(), z = new WeakMap(), A = new WeakMap(), W = new WeakMap(), P = new WeakMap(), L = new WeakSet(), ot = function(t) {
  b(this, P, t), n(this, x).updateRenderTime(t);
}, at = function() {
  const t = n(this, O).step !== 0;
  n(this, O).step = 0, t && (n(this, $).emit("paused"), n(this, C).suspend());
  for (const r of n(this, X))
    r.stop(), r.disconnect();
  n(this, X).clear();
}, C = new WeakMap(), D = new WeakMap(), X = new WeakMap(), gt = function() {
  var c;
  const t = n(this, k);
  let r = n(this, P);
  const { start: i, end: s, step: o, audioPlayAt: h } = n(this, O);
  o !== 0 && r >= i && r < s ? r += o : Y(this, L, at).call(this), Y(this, L, ot).call(this, r);
  const a = [];
  for (const l of n(this, x).getSprites()) {
    t.save();
    const { audio: d } = l.render(t, r - l.time.offset);
    t.restore(), a.push(d);
  }
  if (t.resetTransform(), o !== 0) {
    const l = Math.max(n(this, C).currentTime, h), d = Vt(
      a,
      n(this, C)
    );
    let u = 0;
    for (const f of d)
      f.start(l), f.connect(n(this, C).destination), f.connect(n(this, D)), n(this, X).add(f), f.onended = () => {
        f.disconnect(), n(this, X).delete(f);
      }, u = Math.max(u, ((c = f.buffer) == null ? void 0 : c.duration) ?? 0);
    n(this, O).audioPlayAt = l + u;
  }
}, O = new WeakMap(), et = new WeakMap();
function Vt(e, t) {
  const r = [];
  if (e.length === 0) return r;
  for (const [i, s] of e) {
    if (i == null || i.length <= 0) continue;
    const o = t.createBuffer(
      2,
      i.length,
      Ft.sampleRate
    );
    o.copyToChannel(i, 0), o.copyToChannel(s ?? i, 1);
    const h = t.createBufferSource();
    h.buffer = o, r.push(h);
  }
  return r;
}
function Ut(e) {
  const t = e.createOscillator(), r = new Float32Array([0, 0]), i = new Float32Array([0, 0]), s = e.createPeriodicWave(r, i, {
    disableNormalization: !0
  });
  return t.setPeriodicWave(s), t.start(), t;
}
function Et(e, t, r, i, s, o) {
  const h = t.width / t.height, a = s / o;
  let c = s, l = o, d = 0, u = 0;
  a > h ? (l = s / t.width * t.height, u = (o - l) / 2) : (c = o / t.height * t.width, d = (s - c) / 2), e.drawImage(t, r + d, i + u, c, l);
}
function _t(e, t, r, i, s, o) {
  const h = t.width / t.height, a = s / o;
  let c = s, l = o, d = 0, u = 0;
  a < h ? (l = s / t.width * t.height, u = (o - l) / 2) : (c = o / t.height * t.width, d = (s - c) / 2), e.drawImage(t, r + d, i + u, c, l);
}
export {
  Qt as AVCanvas
};
//# sourceMappingURL=av-canvas.js.map
