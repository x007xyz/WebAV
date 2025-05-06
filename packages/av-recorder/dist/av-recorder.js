var L = Object.defineProperty;
var P = (t) => {
  throw TypeError(t);
};
var N = (t, e, s) => e in t ? L(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s;
var y = (t, e, s) => N(t, typeof e != "symbol" ? e + "" : e, s), D = (t, e, s) => e.has(t) || P("Cannot " + s);
var r = (t, e, s) => (D(t, e, "read from private field"), s ? s.call(t) : e.get(t)), a = (t, e, s) => e.has(t) ? P("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), i = (t, e, s, o) => (D(t, e, "write to private field"), o ? o.call(t, s) : e.set(t, s), s);
import { EventTool as W, Log as M, recodemux as _, autoReadStream as E, file2stream as q } from "@webav/internal-utils";
var c, w, l, m, g;
class U {
  constructor(e, s = {}) {
    a(this, c, "inactive");
    a(this, w, new W());
    y(this, "on", r(this, w).on);
    a(this, l);
    a(this, m);
    a(this, g, () => {
    });
    i(this, l, B(e, s)), i(this, m, new H(r(this, l).video.expectFPS));
  }
  get state() {
    return r(this, c);
  }
  set state(e) {
    throw new Error("state is readonly");
  }
  /**
   * 开始录制，返回 MP4 文件流
   * @param timeSlice 控制流输出数据的时间间隔，单位毫秒
   *
   */
  start(e = 500) {
    if (r(this, c) === "stopped") throw Error("AVRecorder is stopped");
    M.info("AVRecorder.start recoding");
    const { streams: s } = r(this, l);
    if (s.audio == null && s.video == null)
      throw new Error("No available tracks in MediaStream");
    const { stream: o, exit: u } = J(
      { timeSlice: e, ...r(this, l) },
      r(this, m),
      () => {
        this.stop();
      }
    );
    return r(this, g).call(this), i(this, g, u), o;
  }
  /**
   * 暂停录制
   */
  pause() {
    i(this, c, "paused"), r(this, m).pause(), r(this, w).emit("stateChange", r(this, c));
  }
  /**
   * 恢复录制
   */
  resume() {
    if (r(this, c) === "stopped") throw Error("AVRecorder is stopped");
    i(this, c, "recording"), r(this, m).play(), r(this, w).emit("stateChange", r(this, c));
  }
  /**
   * 停止
   */
  async stop() {
    r(this, c) !== "stopped" && (i(this, c, "stopped"), r(this, g).call(this));
  }
}
c = new WeakMap(), w = new WeakMap(), l = new WeakMap(), m = new WeakMap(), g = new WeakMap();
function B(t, e) {
  const s = {
    bitrate: 3e6,
    expectFPS: 30,
    videoCodec: "avc1.42E032",
    ...e
  }, { streams: o, width: u, height: C, sampleRate: R, channelCount: p } = G(t);
  return {
    video: {
      width: u ?? 1280,
      height: C ?? 720,
      expectFPS: s.expectFPS,
      codec: s.videoCodec
    },
    audio: {
      codec: "aac",
      sampleRate: R ?? 44100,
      channelCount: p ?? 2
    },
    bitrate: s.bitrate,
    streams: o
  };
}
function G(t) {
  const e = t.getVideoTracks()[0], s = { streams: {} };
  e != null && (Object.assign(s, e.getSettings()), s.streams.video = new MediaStreamTrackProcessor({
    track: e
  }).readable);
  const o = t.getAudioTracks()[0];
  return o != null && (Object.assign(s, o.getSettings()), M.info("AVRecorder recording audioConf:", s), s.streams.audio = new MediaStreamTrackProcessor({
    track: o
  }).readable), s;
}
var h, f, v, d, T, k;
class H {
  constructor(e) {
    // 当前帧的偏移时间，用于计算帧的 timestamp
    a(this, h, performance.now());
    // 编码上一帧的时间，用于计算出当前帧的持续时长
    a(this, f, r(this, h));
    // 用于限制 帧率
    a(this, v, 0);
    // 如果为true，则暂停编码数据
    // 取消暂停时，需要减去
    a(this, d, !1);
    // 触发暂停的时间，用于计算暂停持续了多久
    a(this, T, 0);
    // 间隔多少帧生成一个关键帧
    a(this, k, 30);
    this.expectFPS = e, i(this, k, Math.floor(e * 3));
  }
  start() {
    i(this, h, performance.now()), i(this, f, r(this, h));
  }
  play() {
    r(this, d) && (i(this, d, !1), i(this, h, r(this, h) + (performance.now() - r(this, T))), i(this, f, r(this, f) + (performance.now() - r(this, T))));
  }
  pause() {
    r(this, d) || (i(this, d, !0), i(this, T, performance.now()));
  }
  transfromVideo(e) {
    const s = performance.now(), o = s - r(this, h);
    if (r(this, d) || // 避免帧率超出期望太高
    r(this, v) / o * 1e3 > this.expectFPS) {
      e.close();
      return;
    }
    const u = new VideoFrame(e, {
      // timestamp 单位 微秒
      timestamp: o * 1e3,
      duration: (s - r(this, f)) * 1e3
    });
    return i(this, f, s), i(this, v, r(this, v) + 1), e.close(), {
      vf: u,
      opts: { keyFrame: r(this, v) % r(this, k) === 0 }
    };
  }
  transformAudio(e) {
    if (r(this, d)) {
      e.close();
      return;
    }
    return e;
  }
}
h = new WeakMap(), f = new WeakMap(), v = new WeakMap(), d = new WeakMap(), T = new WeakMap(), k = new WeakMap();
function J(t, e, s) {
  let o = null, u = null;
  const [C, R] = [
    t.streams.video != null,
    t.streams.audio != null && t.audio != null
  ], p = _({
    video: C ? { ...t.video, bitrate: t.bitrate ?? 3e6 } : null,
    audio: R ? t.audio : null
  });
  let A = !1;
  if (C) {
    let n = null, V = 0;
    const F = (S) => {
      clearTimeout(V), n == null || n.close(), n = S;
      const b = e.transfromVideo(S.clone());
      b != null && (p.encodeVideo(b.vf, b.opts), V = self.setTimeout(() => {
        if (n == null) return;
        const I = new VideoFrame(n, {
          timestamp: n.timestamp + 1e6,
          duration: 1e6
        });
        F(I);
      }, 1e3));
    };
    e.start();
    const z = E(t.streams.video, {
      onChunk: async (S) => {
        if (A) {
          S.close();
          return;
        }
        F(S);
      },
      onDone: () => {
      }
    });
    o = () => {
      z(), clearTimeout(V), n == null || n.close();
    };
  }
  R && (u = E(t.streams.audio, {
    onChunk: async (n) => {
      if (A) {
        n.close();
        return;
      }
      e.transformAudio(n) != null && p.encodeAudio(n);
    },
    onDone: () => {
    }
  }));
  const { stream: j, stop: O } = q(
    p.mp4file,
    t.timeSlice,
    () => {
      x(), s();
    }
  );
  function x() {
    A = !0, o == null || o(), u == null || u(), p.close(), O();
  }
  return { exit: x, stream: j };
}
export {
  U as AVRecorder
};
//# sourceMappingURL=av-recorder.js.map
