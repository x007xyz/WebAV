var N = Object.defineProperty;
var E = (e) => {
  throw TypeError(e);
};
var P = (e, t, n) => t in e ? N(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var R = (e, t, n) => P(e, typeof t != "symbol" ? t + "" : t, n), Q = (e, t, n) => t.has(e) || E("Cannot " + n);
var z = (e, t, n) => (Q(e, t, "read from private field"), n ? n.call(e) : t.get(e)), M = (e, t, n) => t.has(e) ? E("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n);
import T from "@webav/mp4box.js";
var A;
class H {
  constructor() {
    M(this, A, /* @__PURE__ */ new Map());
    /**
     * 监听 EventType 中定义的事件
     */
    R(this, "on", (t, n) => {
      const r = z(this, A).get(t) ?? /* @__PURE__ */ new Set();
      return r.add(n), z(this, A).has(t) || z(this, A).set(t, r), () => {
        r.delete(n), r.size === 0 && z(this, A).delete(t);
      };
    });
    /**
     * 监听事件，首次触发后自动移除监听
     *
     * 期望回调一次的事件，使用 once; 期望多次回调使用 on
     */
    R(this, "once", (t, n) => {
      const r = this.on(t, (...o) => {
        r(), n(...o);
      });
      return r;
    });
    /**
     * 触发事件
     * @param type
     * @param args
     * @returns
     */
    R(this, "emit", (t, ...n) => {
      const r = z(this, A).get(t);
      r != null && r.forEach((o) => o(...n));
    });
  }
  /**
   * 在两个 EventTool 实例间转发消息
   * @param from
   * @param to
   * @param evtTypes 需转发的消息类型
   *
   * @example
   * EventTool.forwardEvent(from, to, ['evtName']),
   */
  static forwardEvent(t, n, r) {
    const o = r.map((s) => {
      const [a, i] = Array.isArray(s) ? s : [s, s];
      return t.on(a, (...d) => {
        n.emit(i, ...d);
      });
    });
    return () => {
      o.forEach((s) => s());
    };
  }
  destroy() {
    z(this, A).clear();
  }
}
A = new WeakMap();
const J = () => {
  let e, t = 16.6;
  self.onmessage = (n) => {
    n.data.event === "start" && (self.clearInterval(e), e = self.setInterval(() => {
      self.postMessage({});
    }, t)), n.data.event === "stop" && self.clearInterval(e);
  };
}, j = () => {
  const e = new Blob([`(${J.toString()})()`]), t = URL.createObjectURL(e);
  return new Worker(t);
}, k = /* @__PURE__ */ new Map();
let I = 1, B = null;
globalThis.Worker != null && (B = j(), B.onmessage = () => {
  I += 1;
  for (const [e, t] of k)
    if (I % e === 0) for (const n of t) n();
});
const q = (e, t) => {
  const n = Math.round(t / 16.6), r = k.get(n) ?? /* @__PURE__ */ new Set();
  return r.add(e), k.set(n, r), k.size === 1 && r.size === 1 && (B == null || B.postMessage({ event: "start" })), () => {
    r.delete(e), r.size === 0 && k.delete(n), k.size === 0 && (I = 0, B == null || B.postMessage({ event: "stop" }));
  };
};
function ae(e, t) {
  let n = !1;
  async function r() {
    const o = e.getReader();
    for (; !n; ) {
      const { value: s, done: a } = await o.read();
      if (a) {
        t.onDone();
        return;
      }
      await t.onChunk(s);
    }
    o.releaseLock(), await e.cancel();
  }
  return r().catch(console.error), () => {
    n = !0;
  };
}
function ce(e, t, n) {
  let r = 0, o = 0;
  const s = e.boxes;
  let a = !1;
  const i = () => {
    var m;
    if (!a)
      if (s.find((y) => y.type === "moof") != null)
        a = !0;
      else
        return null;
    if (o >= s.length) return null;
    const l = new T.DataStream();
    l.endianness = T.DataStream.BIG_ENDIAN;
    let h = o;
    try {
      for (; h < s.length; )
        s[h].write(l), delete s[h], h += 1;
    } catch (y) {
      const x = s[h];
      throw y instanceof Error && x != null ? Error(
        `${y.message} | deltaBuf( boxType: ${x.type}, boxSize: ${x.size}, boxDataLen: ${((m = x.data) == null ? void 0 : m.length) ?? -1})`
      ) : y;
    }
    return W(e), o = s.length, new Uint8Array(l.buffer);
  };
  let d = !1, c = !1, u = null;
  return {
    stream: new ReadableStream({
      start(l) {
        r = self.setInterval(() => {
          const h = i();
          h != null && !c && l.enqueue(h);
        }, t), u = (h) => {
          if (clearInterval(r), e.flush(), h != null) {
            l.error(h);
            return;
          }
          const m = i();
          m != null && !c && l.enqueue(m), c || l.close();
        }, d && u();
      },
      cancel() {
        c = !0, clearInterval(r), n == null || n();
      }
    }),
    stop: (l) => {
      d || (d = !0, u == null || u(l));
    }
  };
}
function W(e) {
  if (e.moov != null) {
    for (var t = 0; t < e.moov.traks.length; t++)
      e.moov.traks[t].samples = [];
    e.mdats = [], e.moofs = [];
  }
}
const U = (e, t) => {
  const n = new Uint8Array(8);
  new DataView(n.buffer).setUint32(0, t);
  for (let o = 0; o < 4; o++)
    n[4 + o] = e.charCodeAt(o);
  return n;
}, F = () => {
  const e = new TextEncoder(), t = e.encode("mdta"), n = e.encode("mp4 handler"), r = 32 + n.byteLength + 1, o = new Uint8Array(r), s = new DataView(o.buffer);
  return o.set(U("hdlr", r), 0), s.setUint32(8, 0), o.set(t, 16), o.set(n, 32), o;
}, G = (e) => {
  const t = new TextEncoder(), n = t.encode("mdta"), r = e.map((c) => {
    const u = t.encode(c), g = 8 + u.byteLength, l = new Uint8Array(g);
    return new DataView(l.buffer).setUint32(0, g), l.set(n, 4), l.set(u, 4 + n.byteLength), l;
  }), s = 16 + r.reduce((c, u) => c + u.byteLength, 0), a = new Uint8Array(s), i = new DataView(a.buffer);
  a.set(U("keys", s), 0), i.setUint32(8, 0), i.setUint32(12, e.length);
  let d = 16;
  for (const c of r)
    a.set(c, d), d += c.byteLength;
  return a;
}, K = (e) => {
  const t = new TextEncoder(), n = t.encode("data"), r = Object.entries(e).map(([d, c], u) => {
    const g = u + 1, l = t.encode(c), h = 24 + l.byteLength, m = new Uint8Array(h), y = new DataView(m.buffer);
    return y.setUint32(0, h), y.setUint32(4, g), y.setUint32(8, 16 + l.byteLength), m.set(n, 12), y.setUint32(16, 1), m.set(l, 24), m;
  }), s = 8 + r.reduce((d, c) => d + c.byteLength, 0), a = new Uint8Array(s);
  a.set(U("ilst", s), 0);
  let i = 8;
  for (const d of r)
    a.set(d, i), i += d.byteLength;
  return a;
}, X = (e) => {
  const t = F(), n = G(Object.keys(e)), r = K(e), o = t.length + n.length + r.length, s = new Uint8Array(o);
  return s.set(t, 0), s.set(n, t.length), s.set(r, t.length + n.length), s;
};
function Y(e) {
  return e instanceof Error ? String(e) : typeof e == "object" ? JSON.stringify(e, (t, n) => n instanceof Error ? String(n) : n) : String(e);
}
function Z() {
  const e = /* @__PURE__ */ new Date();
  return `${e.getHours()}:${e.getMinutes()}:${e.getSeconds()}.${e.getMilliseconds()}`;
}
let C = 1;
const O = [], V = ["debug", "info", "warn", "error"].reduce(
  (e, t, n) => Object.assign(e, {
    [t]: (...r) => {
      C <= n && (console[t](...r), O.push({
        lvName: t,
        timeStr: Z(),
        args: r
      }));
    }
  }),
  {}
), $ = /* @__PURE__ */ new Map(), S = {
  /**
   * 设置记录日志的级别
   *
   * @example
   * Log.setLogLevel(Log.warn) // 记录 warn，error 日志
   */
  setLogLevel: (e) => {
    C = $.get(e) ?? 1;
  },
  ...V,
  /**
   * 生成一个 log 实例，所有输出前都会附加 tag
   *
   * @example
   * const log = Log.create('<prefix>')
   * log.info('xxx') // '<prefix> xxx'
   */
  create: (e) => Object.fromEntries(
    Object.entries(V).map(([t, n]) => [
      t,
      (...r) => n(e, ...r)
    ])
  ),
  /**
   * 将所有日志导出为一个字符串
   *
   * @example
   * Log.dump() // => [level][time]  内容...
   *
   */
  async dump() {
    return O.reduce(
      (e, { lvName: t, timeStr: n, args: r }) => e + `[${t}][${n}]  ${r.map((o) => Y(o)).join(" ")}
`,
      ""
    );
  }
};
$.set(S.debug, 0);
$.set(S.info, 1);
$.set(S.warn, 2);
$.set(S.error, 3);
(async function() {
  await Promise.resolve(), !(globalThis.navigator == null || globalThis.document == null) && (S.info(
    `@webav version: 1.1.1, date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`
  ), S.info(globalThis.navigator.userAgent), document.addEventListener("visibilitychange", () => {
    S.info(`visibilitychange: ${document.visibilityState}`);
  }), "PressureObserver" in globalThis && new PressureObserver((n) => {
    S.info(
      `cpu state change: ${JSON.stringify(n.map((r) => r.state))}`
    );
  }).observe("cpu"));
})();
function ie(e) {
  S.info("recodemux opts:", e);
  const t = T.createFile(), n = new H(), r = (d, c) => {
    const g = d.add("udta").add("meta");
    g.data = X(c), g.size = g.data.byteLength;
  };
  let o = !1;
  const s = () => {
    t.moov == null || o || (o = !0, e.metaDataTags != null && r(t.moov, e.metaDataTags), e.duration != null && (t.moov.mvhd.duration = e.duration));
  };
  n.once("VideoReady", s), n.once("AudioReady", s);
  let a = e.video != null ? ee(e.video, t, n) : null, i = e.audio != null ? ne(e.audio, t, n) : null;
  return e.video == null && n.emit("VideoReady"), e.audio == null && n.emit("AudioReady"), {
    encodeVideo: (d, c) => {
      a == null || a.encode(d, c), d.close();
    },
    encodeAudio: (d) => {
      if (i != null)
        try {
          i.encode(d), d.close();
        } catch (c) {
          const u = `encode audio chunk error: ${c.message}, state: ${JSON.stringify(
            {
              qSize: i.encodeQueueSize,
              state: i.state
            }
          )}`;
          throw S.error(u), Error(u);
        }
    },
    getEncodeQueueSize: () => (a == null ? void 0 : a.encodeQueueSize) ?? (i == null ? void 0 : i.encodeQueueSize) ?? 0,
    flush: async () => {
      await Promise.all([
        a == null ? void 0 : a.flush(),
        (i == null ? void 0 : i.state) === "configured" ? i.flush() : null
      ]);
    },
    close: () => {
      n.destroy(), a == null || a.close(), (i == null ? void 0 : i.state) === "configured" && i.close();
    },
    mp4file: t
  };
}
function ee(e, t, n) {
  const r = {
    // 微秒
    timescale: 1e6,
    width: e.width,
    height: e.height,
    brands: ["isom", "iso2", "avc1", "mp42", "mp41"],
    avcDecoderConfigRecord: null,
    name: "Track created with WebAV"
  };
  let o = -1, s = !1;
  n.once("AudioReady", () => {
    s = !0;
  });
  const a = {
    encoder0: [],
    encoder1: []
  }, i = (w, b, p) => {
    var f;
    if (o === -1 && p != null) {
      const v = (f = p.decoderConfig) == null ? void 0 : f.description;
      te(v), r.avcDecoderConfigRecord = v, o = t.addTrack(r), n.emit("VideoReady"), S.info("VideoEncoder, video track ready, trackId:", o);
    }
    a[w].push(L(b));
  };
  let d = "encoder1", c = 0;
  const u = Math.floor(1e3 / e.expectFPS * 1e3);
  function g() {
    if (!s) return;
    const w = d === "encoder1" ? "encoder0" : "encoder1", b = a[d], p = a[w];
    if (b.length === 0 && p.length === 0) return;
    let f = b[0];
    if (f != null && (!f.is_sync || f.cts - c < u)) {
      const D = l(b);
      D > c && (c = D);
    }
    const v = p[0];
    if (v != null && v.is_sync && v.cts - c < u) {
      d = w, g();
      return;
    }
    if (f != null && f.is_sync && (v != null && v.is_sync))
      if (f.cts <= v.cts) {
        const D = l(b);
        D > c && (c = D);
      } else {
        d = w, g();
        return;
      }
  }
  function l(w) {
    let b = -1, p = 0;
    for (; p < w.length; p++) {
      const f = w[p];
      if (p > 0 && f.is_sync) break;
      t.addSample(o, f.data, f), b = f.cts + f.duration;
    }
    return w.splice(0, p), b;
  }
  const h = q(g, 15), m = _(
    e,
    (w, b) => i("encoder0", w, b)
  ), y = _(
    e,
    (w, b) => i("encoder1", w, b)
  );
  let x = 0;
  return {
    get encodeQueueSize() {
      return m.encodeQueueSize + y.encodeQueueSize;
    },
    encode: (w, b) => {
      try {
        b.keyFrame && (x += 1), (x % 2 === 0 ? m : y).encode(w, b);
      } catch (p) {
        const f = `encode video frame error: ${p.message}, state: ${JSON.stringify(
          {
            ts: w.timestamp,
            keyFrame: b.keyFrame,
            duration: w.duration,
            gopId: x
          }
        )}`;
        throw S.error(f), Error(f);
      }
    },
    flush: async () => {
      await Promise.all([
        m.state === "configured" ? await m.flush() : null,
        y.state === "configured" ? await y.flush() : null
      ]), h(), g();
    },
    close: () => {
      m.state === "configured" && m.close(), y.state === "configured" && y.close();
    }
  };
}
function te(e) {
  const t = new Uint8Array(e);
  t[2].toString(2).slice(-2).includes("1") && (t[2] = 0);
}
function _(e, t) {
  const n = {
    codec: e.codec,
    framerate: e.expectFPS,
    hardwareAcceleration: e.__unsafe_hardwareAcceleration__,
    // 码率
    bitrate: e.bitrate,
    width: e.width,
    height: e.height,
    // H264 不支持背景透明度
    alpha: "discard",
    // macos 自带播放器只支持avc
    avc: { format: "avc" }
    // mp4box.js 无法解析 annexb 的 mimeCodec ，只会显示 avc1
    // avc: { format: 'annexb' }
  }, r = new VideoEncoder({
    error: (o) => {
      const s = `VideoEncoder error: ${o.message}, config: ${JSON.stringify(n)}, state: ${JSON.stringify(
        {
          qSize: r.encodeQueueSize,
          state: r.state
        }
      )}`;
      throw S.error(s), Error(s);
    },
    output: t
  });
  return r.configure(n), r;
}
function ne(e, t, n) {
  const r = {
    timescale: 1e6,
    samplerate: e.sampleRate,
    channel_count: e.channelCount,
    hdlr: "soun",
    type: e.codec === "aac" ? "mp4a" : "Opus",
    name: "Track created with WebAV"
  };
  let o = -1, s = [], a = !1;
  n.once("VideoReady", () => {
    a = !0, s.forEach((c) => {
      const u = L(c);
      t.addSample(o, u.data, u);
    }), s = [];
  });
  const i = {
    codec: e.codec === "aac" ? "mp4a.40.2" : "opus",
    sampleRate: e.sampleRate,
    numberOfChannels: e.channelCount,
    bitrate: 128e3
  }, d = new AudioEncoder({
    error: (c) => {
      const u = `AudioEncoder error: ${c.message}, config: ${JSON.stringify(
        i
      )}, state: ${JSON.stringify({
        qSize: d.encodeQueueSize,
        state: d.state
      })}`;
      throw S.error(u), Error(u);
    },
    output: (c, u) => {
      var g;
      if (o === -1) {
        const l = (g = u.decoderConfig) == null ? void 0 : g.description;
        o = t.addTrack({
          ...r,
          description: l == null ? void 0 : re(l)
        }), n.emit("AudioReady"), S.info("AudioEncoder, audio track ready, trackId:", o);
      }
      if (a) {
        const l = L(c);
        t.addSample(o, l.data, l);
      } else
        s.push(c);
    }
  });
  return d.configure(i), d;
}
function re(e) {
  const t = e.byteLength, n = new Uint8Array([
    0,
    // version 0
    0,
    0,
    0,
    // flags
    3,
    // descriptor_type
    23 + t,
    // length
    0,
    // 0x01, // es_id
    2,
    // es_id
    0,
    // stream_priority
    4,
    // descriptor_type
    18 + t,
    // length
    64,
    // codec : mpeg4_audio
    21,
    // stream_type
    0,
    0,
    0,
    // buffer_size
    0,
    0,
    0,
    0,
    // maxBitrate
    0,
    0,
    0,
    0,
    // avgBitrate
    5,
    // descriptor_type
    t,
    ...new Uint8Array(e instanceof ArrayBuffer ? e : e.buffer),
    6,
    1,
    2
  ]), r = new T.BoxParser.esdsBox(n.byteLength);
  return r.hdr_size = 0, r.parse(new T.DataStream(n, 0, T.DataStream.BIG_ENDIAN)), r;
}
function L(e) {
  const t = new ArrayBuffer(e.byteLength);
  e.copyTo(t);
  const n = e.timestamp;
  return {
    duration: e.duration ?? 0,
    dts: n,
    cts: n,
    is_sync: e.type === "key",
    data: t
  };
}
export {
  H as EventTool,
  S as Log,
  ae as autoReadStream,
  ce as file2stream,
  ie as recodemux,
  q as workerTimer
};
//# sourceMappingURL=internal-utils.js.map
