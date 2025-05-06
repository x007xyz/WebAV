var vi = Object.defineProperty;
var Je = (s) => {
  throw TypeError(s);
};
var Si = (s, t, e) => t in s ? vi(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var S = (s, t, e) => Si(s, typeof t != "symbol" ? t + "" : t, e), Fe = (s, t, e) => t.has(s) || Je("Cannot " + e);
var n = (s, t, e) => (Fe(s, t, "read from private field"), e ? e.call(s) : t.get(s)), d = (s, t, e) => t.has(s) ? Je("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(s) : t.set(s, e), h = (s, t, e, i) => (Fe(s, t, "write to private field"), i ? i.call(s, e) : t.set(s, e), e), O = (s, t, e) => (Fe(s, t, "access private method"), e);
import wt from "@webav/mp4box.js";
import { workerTimer as Ti, Log as A, autoReadStream as ze, file2stream as oi, EventTool as Ve, recodemux as Ai } from "@webav/internal-utils";
import { Log as Bn } from "@webav/internal-utils";
import * as ki from "wave-resampler";
import { tmpfile as Ee, write as Pe } from "opfs-tools";
function Ii(s) {
  return document.createElement(s);
}
function Fi(s, t) {
  const e = Ii("pre");
  e.style.cssText = `margin: 0; ${t}; visibility: hidden; position: fixed;`, e.textContent = s, document.body.appendChild(e);
  const { width: i, height: r } = e.getBoundingClientRect();
  e.remove(), e.style.visibility = "visible";
  const a = new Image();
  a.width = i, a.height = r;
  const o = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${i}" height="${r}">
    <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${e.outerHTML}</div>
    </foreignObject>
    </svg>
  `.replace(/\t/g, "").replace(/#/g, "%23");
  return a.src = `data:image/svg+xml;charset=utf-8,${o}`, a;
}
async function kn(s, t) {
  const e = Fi(s, t);
  await new Promise((a) => {
    e.onload = a;
  });
  const i = new OffscreenCanvas(e.width, e.height), r = i.getContext("2d");
  return r == null || r.drawImage(e, 0, 0, e.width, e.height), await createImageBitmap(i);
}
function Ri(s) {
  const t = new Float32Array(
    s.map((i) => i.length).reduce((i, r) => i + r)
  );
  let e = 0;
  for (const i of s)
    t.set(i, e), e += i.length;
  return t;
}
function Ei(s) {
  const t = [];
  for (let e = 0; e < s.length; e += 1)
    for (let i = 0; i < s[e].length; i += 1)
      t[i] == null && (t[i] = []), t[i].push(s[e][i]);
  return t.map(Ri);
}
function ci(s) {
  if (s.format === "f32-planar") {
    const t = [];
    for (let e = 0; e < s.numberOfChannels; e += 1) {
      const i = s.allocationSize({ planeIndex: e }), r = new ArrayBuffer(i);
      s.copyTo(r, { planeIndex: e }), t.push(new Float32Array(r));
    }
    return t;
  } else if (s.format === "f32") {
    const t = new ArrayBuffer(s.allocationSize({ planeIndex: 0 }));
    return s.copyTo(t, { planeIndex: 0 }), Di(new Float32Array(t), s.numberOfChannels);
  } else if (s.format === "s16") {
    const t = new ArrayBuffer(s.allocationSize({ planeIndex: 0 }));
    return s.copyTo(t, { planeIndex: 0 }), Pi(new Int16Array(t), s.numberOfChannels);
  }
  throw Error("Unsupported audio data format");
}
function Pi(s, t) {
  const e = s.length / t, i = Array.from(
    { length: t },
    () => new Float32Array(e)
  );
  for (let r = 0; r < e; r++)
    for (let a = 0; a < t; a++) {
      const o = s[r * t + a];
      i[a][r] = o / 32768;
    }
  return i;
}
function Di(s, t) {
  const e = s.length / t, i = Array.from(
    { length: t },
    () => new Float32Array(e)
  );
  for (let r = 0; r < e; r++)
    for (let a = 0; a < t; a++)
      i[a][r] = s[r * t + a];
  return i;
}
function Le(s) {
  return Array(s.numberOfChannels).fill(0).map((t, e) => s.getChannelData(e));
}
async function Bi(s, t) {
  var o;
  const e = {
    type: t,
    data: s
  }, i = new ImageDecoder(e);
  await Promise.all([i.completed, i.tracks.ready]);
  let r = ((o = i.tracks.selectedTrack) == null ? void 0 : o.frameCount) ?? 1;
  const a = [];
  for (let c = 0; c < r; c += 1)
    a.push((await i.decode({ frameIndex: c })).image);
  return a;
}
function Ye(s) {
  var i, r;
  const t = Math.max(...s.map((a) => {
    var o;
    return ((o = a[0]) == null ? void 0 : o.length) ?? 0;
  })), e = new Float32Array(t * 2);
  for (let a = 0; a < t; a++) {
    let o = 0, c = 0;
    for (let l = 0; l < s.length; l++) {
      const m = ((i = s[l][0]) == null ? void 0 : i[a]) ?? 0, u = ((r = s[l][1]) == null ? void 0 : r[a]) ?? m;
      o += m, c += u;
    }
    e[a] = o, e[a + t] = c;
  }
  return e;
}
async function Oi(s, t, e) {
  const i = s.length, r = Array(e.chanCount).fill(0).map(() => new Float32Array(0));
  if (i === 0) return r;
  const a = Math.max(...s.map((m) => m.length));
  if (a === 0) return r;
  if (globalThis.OfflineAudioContext == null)
    return s.map(
      (m) => new Float32Array(
        ki.resample(m, t, e.rate, {
          method: "sinc",
          LPF: !1
        })
      )
    );
  const o = new globalThis.OfflineAudioContext(
    e.chanCount,
    a * e.rate / t,
    e.rate
  ), c = o.createBufferSource(), l = o.createBuffer(i, a, t);
  return s.forEach((m, u) => l.copyToChannel(m, u)), c.buffer = l, c.connect(o.destination), c.start(), Le(await o.startRendering());
}
function Ue(s) {
  return new Promise((t) => {
    const e = Ti(() => {
      e(), t();
    }, s);
  });
}
function De(s, t, e) {
  const i = e - t, r = new Float32Array(i);
  let a = 0;
  for (; a < i; )
    r[a] = s[(t + a) % s.length], a += 1;
  return r;
}
function li(s, t) {
  const e = Math.floor(s.length / t), i = new Float32Array(e);
  for (let r = 0; r < e; r++) {
    const a = r * t, o = Math.floor(a), c = a - o;
    o + 1 < s.length ? i[r] = s[o] * (1 - c) + s[o + 1] * c : i[r] = s[o];
  }
  return i;
}
const T = {
  sampleRate: 48e3,
  channelCount: 2,
  codec: "mp4a.40.2"
};
function Ne(s, t) {
  const e = t.videoTracks[0], i = {};
  if (e != null) {
    const a = _i(s.getTrackById(e.id)).buffer, { descKey: o, type: c } = e.codec.startsWith("avc1") ? { descKey: "avcDecoderConfigRecord", type: "avc1" } : e.codec.startsWith("hvc1") ? { descKey: "hevcDecoderConfigRecord", type: "hvc1" } : { descKey: "", type: "" };
    o !== "" && (i.videoTrackConf = {
      timescale: e.timescale,
      duration: e.duration,
      width: e.video.width,
      height: e.video.height,
      brands: t.brands,
      type: c,
      [o]: a
    }), i.videoDecoderConf = {
      codec: e.codec,
      codedHeight: e.video.height,
      codedWidth: e.video.width,
      description: a
    };
  }
  const r = t.audioTracks[0];
  if (r != null) {
    const a = je(s);
    i.audioTrackConf = {
      timescale: r.timescale,
      samplerate: r.audio.sample_rate,
      channel_count: r.audio.channel_count,
      hdlr: "soun",
      type: r.codec.startsWith("mp4a") ? "mp4a" : r.codec,
      description: je(s)
    }, i.audioDecoderConf = {
      codec: r.codec.startsWith("mp4a") ? T.codec : r.codec,
      numberOfChannels: r.audio.channel_count,
      sampleRate: r.audio.sample_rate,
      ...a == null ? {} : Mi(a)
    };
  }
  return i;
}
function _i(s) {
  for (const t of s.mdia.minf.stbl.stsd.entries) {
    const e = t.avcC ?? t.hvcC ?? t.av1C ?? t.vpcC;
    if (e != null) {
      const i = new wt.DataStream(
        void 0,
        0,
        wt.DataStream.BIG_ENDIAN
      );
      return e.write(i), new Uint8Array(i.buffer.slice(8));
    }
  }
  throw Error("avcC, hvcC, av1C or VPX not found");
}
function je(s, t = "mp4a") {
  var i;
  const e = (i = s.moov) == null ? void 0 : i.traks.map((r) => r.mdia.minf.stbl.stsd.entries).flat().find(({ type: r }) => r === t);
  return e == null ? void 0 : e.esds;
}
function Mi(s) {
  var c;
  const t = (c = s.esd.descs[0]) == null ? void 0 : c.descs[0];
  if (t == null) return {};
  const [e, i] = t.data, r = ((e & 7) << 1) + (i >> 7), a = (i & 127) >> 3;
  return {
    sampleRate: [
      96e3,
      88200,
      64e3,
      48e3,
      44100,
      32e3,
      24e3,
      22050,
      16e3,
      12e3,
      11025,
      8e3,
      7350
    ][r],
    numberOfChannels: a
  };
}
async function zi(s, t, e) {
  const i = wt.createFile(!1);
  i.onReady = (a) => {
    var l, m;
    t({ mp4boxFile: i, info: a });
    const o = (l = a.videoTracks[0]) == null ? void 0 : l.id;
    o != null && i.setExtractionOptions(o, "video", { nbSamples: 100 });
    const c = (m = a.audioTracks[0]) == null ? void 0 : m.id;
    c != null && i.setExtractionOptions(c, "audio", { nbSamples: 100 }), i.start();
  }, i.onSamples = e, await r();
  async function r() {
    let a = 0;
    const o = 30 * 1024 * 1024;
    for (; ; ) {
      const c = await s.read(o, {
        at: a
      });
      if (c.byteLength === 0) break;
      c.fileStart = a;
      const l = i.appendBuffer(c);
      if (l == null) break;
      a = l;
    }
    i.stop();
  }
}
let He = 0;
function Re(s) {
  return s.kind === "file" && s.createReader instanceof Function;
}
var Ce, Yt, jt, L, E, W, Qt, U, rt, Ot, bt, X, B, _t;
const yt = class yt {
  constructor(t, e = {}) {
    d(this, Ce, He++);
    d(this, Yt, A.create(`MP4Clip id:${n(this, Ce)},`));
    S(this, "ready");
    d(this, jt, !1);
    d(this, L, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0,
      audioSampleRate: 0,
      audioChanCount: 0
    });
    d(this, E);
    d(this, W, []);
    d(this, Qt, 1);
    d(this, U, []);
    d(this, rt, []);
    d(this, Ot, null);
    d(this, bt, null);
    d(this, X, {
      video: null,
      audio: null
    });
    d(this, B, { audio: !0 });
    /**
     * 拦截 {@link MP4Clip.tick} 方法返回的数据，用于对图像、音频数据二次处理
     * @param time 调用 tick 的时间
     * @param tickRet tick 返回的数据
     *
     * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
     */
    S(this, "tickInterceptor", async (t, e) => e);
    d(this, _t, new AbortController());
    if (!(t instanceof ReadableStream) && !Re(t) && !Array.isArray(t.videoSamples))
      throw Error("Illegal argument");
    h(this, B, { audio: !0, ...e }), h(this, Qt, typeof e.audio == "object" && "volume" in e.audio ? e.audio.volume : 1);
    const i = async (r) => (await Pe(n(this, E), r), n(this, E));
    h(this, E, Re(t) ? t : "localFile" in t ? t.localFile : Ee()), this.ready = (t instanceof ReadableStream ? i(t).then(
      (r) => Ke(r, n(this, B))
    ) : Re(t) ? Ke(t, n(this, B)) : Promise.resolve(t)).then(
      async ({ videoSamples: r, audioSamples: a, decoderConf: o, headerBoxPos: c }) => {
        h(this, U, r), h(this, rt, a), h(this, X, o), h(this, W, c);
        const { videoFrameFinder: l, audioFrameFinder: m } = Li(
          {
            video: o.video == null ? null : {
              ...o.video,
              hardwareAcceleration: n(this, B).__unsafe_hardwareAcceleration__
            },
            audio: o.audio
          },
          await n(this, E).createReader(),
          r,
          a,
          n(this, B).audio !== !1 ? n(this, Qt) : 0
        );
        return h(this, Ot, l), h(this, bt, m), h(this, L, Vi(o, r, a)), n(this, Yt).info("MP4Clip meta:", n(this, L)), { ...n(this, L) };
      }
    );
  }
  get meta() {
    return { ...n(this, L) };
  }
  /**
   * 提供视频头（box: ftyp, moov）的二进制数据
   * 使用任意 mp4 demxer 解析即可获得详细的视频信息
   * 单元测试包含使用 mp4box.js 解析示例代码
   */
  async getFileHeaderBinData() {
    await this.ready;
    const t = await n(this, E).getOriginFile();
    if (t == null) throw Error("MP4Clip localFile is not origin file");
    return await new Blob(
      n(this, W).map(
        ({ start: e, size: i }) => t.slice(e, e + i)
      )
    ).arrayBuffer();
  }
  /**
   * 获取素材指定时刻的图像帧、音频数据
   * @param time 微秒
   */
  async tick(t) {
    var r, a, o;
    if (t >= n(this, L).duration)
      return await this.tickInterceptor(t, {
        audio: await ((r = n(this, bt)) == null ? void 0 : r.find(t)) ?? [],
        state: "done"
      });
    const [e, i] = await Promise.all([
      ((a = n(this, bt)) == null ? void 0 : a.find(t)) ?? [],
      (o = n(this, Ot)) == null ? void 0 : o.find(t)
    ]);
    return i == null ? await this.tickInterceptor(t, {
      audio: e,
      state: "success"
    }) : await this.tickInterceptor(t, {
      video: i,
      audio: e,
      state: "success"
    });
  }
  /**
   * 生成缩略图，默认每个关键帧生成一个 100px 宽度的缩略图。
   *
   * @param imgWidth 缩略图宽度，默认 100
   * @param opts Partial<ThumbnailOpts>
   * @returns Promise<Array<{ ts: number; img: Blob }>>
   */
  async thumbnails(t = 100, e) {
    n(this, _t).abort(), h(this, _t, new AbortController());
    const i = n(this, _t).signal;
    await this.ready;
    const r = "generate thumbnails aborted";
    if (i.aborted) throw Error(r);
    const { width: a, height: o } = n(this, L), c = Wi(
      t,
      Math.round(o * (t / a)),
      { quality: 0.1, type: "image/png" }
    );
    return new Promise(
      async (l, m) => {
        let u = [];
        const w = n(this, X).video;
        if (w == null || n(this, U).length === 0) {
          p();
          return;
        }
        i.addEventListener("abort", () => {
          m(Error(r));
        });
        async function p() {
          i.aborted || l(
            await Promise.all(
              u.map(async (b) => ({
                ts: b.ts,
                img: await b.img
              }))
            )
          );
        }
        function x(b) {
          u.push({
            ts: b.timestamp,
            img: c(b)
          });
        }
        const { start: f = 0, end: y = n(this, L).duration, step: g } = e ?? {};
        if (g) {
          let b = f;
          const C = new hi(
            await n(this, E).createReader(),
            n(this, U),
            {
              ...w,
              hardwareAcceleration: n(this, B).__unsafe_hardwareAcceleration__
            }
          );
          for (; b <= y && !i.aborted; ) {
            const v = await C.find(b);
            v && x(v), b += g;
          }
          C.destroy(), p();
        } else
          await Yi(
            n(this, U),
            n(this, E),
            w,
            i,
            { start: f, end: y },
            (b, C) => {
              b != null && x(b), C && p();
            }
          );
      }
    );
  }
  async split(t) {
    if (await this.ready, t <= 0 || t >= n(this, L).duration)
      throw Error('"time" out of bounds');
    const [e, i] = Xi(
      n(this, U),
      t
    ), [r, a] = Gi(
      n(this, rt),
      t
    ), o = new yt(
      {
        localFile: n(this, E),
        videoSamples: e ?? [],
        audioSamples: r ?? [],
        decoderConf: n(this, X),
        headerBoxPos: n(this, W)
      },
      n(this, B)
    ), c = new yt(
      {
        localFile: n(this, E),
        videoSamples: i ?? [],
        audioSamples: a ?? [],
        decoderConf: n(this, X),
        headerBoxPos: n(this, W)
      },
      n(this, B)
    );
    return await Promise.all([o.ready, c.ready]), [o, c];
  }
  async clone() {
    await this.ready;
    const t = new yt(
      {
        localFile: n(this, E),
        videoSamples: [...n(this, U)],
        audioSamples: [...n(this, rt)],
        decoderConf: n(this, X),
        headerBoxPos: n(this, W)
      },
      n(this, B)
    );
    return await t.ready, t.tickInterceptor = this.tickInterceptor, t;
  }
  /**
   * 拆分 MP4Clip 为仅包含视频轨道和音频轨道的 MP4Clip
   * @returns Mp4CLip[]
   */
  async splitTrack() {
    await this.ready;
    const t = [];
    if (n(this, U).length > 0) {
      const e = new yt(
        {
          localFile: n(this, E),
          videoSamples: [...n(this, U)],
          audioSamples: [],
          decoderConf: {
            video: n(this, X).video,
            audio: null
          },
          headerBoxPos: n(this, W)
        },
        n(this, B)
      );
      await e.ready, e.tickInterceptor = this.tickInterceptor, t.push(e);
    }
    if (n(this, rt).length > 0) {
      const e = new yt(
        {
          localFile: n(this, E),
          videoSamples: [],
          audioSamples: [...n(this, rt)],
          decoderConf: {
            audio: n(this, X).audio,
            video: null
          },
          headerBoxPos: n(this, W)
        },
        n(this, B)
      );
      await e.ready, e.tickInterceptor = this.tickInterceptor, t.push(e);
    }
    return t;
  }
  destroy() {
    var t, e;
    n(this, jt) || (n(this, Yt).info("MP4Clip destroy"), h(this, jt, !0), (t = n(this, Ot)) == null || t.destroy(), (e = n(this, bt)) == null || e.destroy());
  }
};
Ce = new WeakMap(), Yt = new WeakMap(), jt = new WeakMap(), L = new WeakMap(), E = new WeakMap(), W = new WeakMap(), Qt = new WeakMap(), U = new WeakMap(), rt = new WeakMap(), Ot = new WeakMap(), bt = new WeakMap(), X = new WeakMap(), B = new WeakMap(), _t = new WeakMap();
let Qe = yt;
function Vi(s, t, e) {
  const i = {
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0
  };
  s.video != null && t.length > 0 && (i.width = s.video.codedWidth ?? 0, i.height = s.video.codedHeight ?? 0), s.audio != null && e.length > 0 && (i.audioSampleRate = T.sampleRate, i.audioChanCount = T.channelCount);
  let r = 0, a = 0;
  if (t.length > 0)
    for (let o = t.length - 1; o >= 0; o--) {
      const c = t[o];
      if (!c.deleted) {
        r = c.cts + c.duration;
        break;
      }
    }
  if (e.length > 0) {
    const o = e.at(-1);
    a = o.cts + o.duration;
  }
  return i.duration = Math.max(r, a), i;
}
function Li(s, t, e, i, r) {
  return {
    audioFrameFinder: r === 0 || s.audio == null || i.length === 0 ? null : new Ni(
      t,
      i,
      s.audio,
      {
        volume: r,
        targetSampleRate: T.sampleRate
      }
    ),
    videoFrameFinder: s.video == null || e.length === 0 ? null : new hi(
      t,
      e,
      s.video
    )
  };
}
async function Ke(s, t = {}) {
  let e = null;
  const i = { video: null, audio: null };
  let r = [], a = [], o = [], c = -1, l = -1;
  const m = await s.createReader();
  await zi(
    m,
    (p) => {
      e = p.info;
      const x = p.mp4boxFile.ftyp;
      o.push({ start: x.start, size: x.size });
      const f = p.mp4boxFile.moov;
      o.push({ start: f.start, size: f.size });
      let { videoDecoderConf: y, audioDecoderConf: g } = Ne(
        p.mp4boxFile,
        p.info
      );
      i.video = y ?? null, i.audio = g ?? null, y == null && g == null && A.error("MP4Clip no video and audio track"), A.info(
        "mp4BoxFile moov ready",
        {
          ...p.info,
          tracks: null,
          videoTracks: null,
          audioTracks: null
        },
        i
      );
    },
    (p, x, f) => {
      if (x === "video") {
        c === -1 && (c = f[0].dts);
        for (const y of f)
          r.push(w(y, c, "video"));
      } else if (x === "audio" && t.audio) {
        l === -1 && (l = f[0].dts);
        for (const y of f)
          a.push(w(y, l, "audio"));
      }
    }
  ), await m.close();
  const u = r.at(-1) ?? a.at(-1);
  if (e == null)
    throw Error("MP4Clip stream is done, but not emit ready");
  if (u == null)
    throw Error("MP4Clip stream not contain any sample");
  return Oe(r), A.info("mp4 stream parsed"), {
    videoSamples: r,
    audioSamples: a,
    decoderConf: i,
    headerBoxPos: o
  };
  function w(p, x = 0, f) {
    const y = f === "video" && p.is_sync ? Ji(p.data, p.description.type) : -1;
    let g = p.offset, b = p.size;
    return y >= 0 && (g += y, b -= y), {
      ...p,
      is_idr: y >= 0,
      offset: g,
      size: b,
      cts: (p.cts - x) / p.timescale * 1e6,
      dts: (p.dts - x) / p.timescale * 1e6,
      duration: p.duration / p.timescale * 1e6,
      timescale: 1e6,
      // 音频数据量可控，直接保存在内存中
      data: f === "video" ? null : p.data
    };
  }
}
var F, xt, Ct, Kt, vt, G, _, at, St, Mt, qt, zt, ot, Zt, Tt, te;
class hi {
  constructor(t, e, i) {
    d(this, F, null);
    d(this, xt, 0);
    d(this, Ct, { abort: !1, st: performance.now() });
    S(this, "find", async (t) => {
      (n(this, F) == null || n(this, F).state === "closed" || t <= n(this, xt) || t - n(this, xt) > 3e6) && n(this, Tt).call(this, t), n(this, Ct).abort = !0, h(this, xt, t), h(this, Ct, { abort: !1, st: performance.now() });
      const e = await n(this, zt).call(this, t, n(this, F), n(this, Ct));
      return h(this, Mt, 0), e;
    });
    // fix VideoFrame duration is null
    d(this, Kt, 0);
    d(this, vt, !1);
    d(this, G, 0);
    d(this, _, []);
    d(this, at, 0);
    d(this, St, 0);
    d(this, Mt, 0);
    d(this, qt, !1);
    d(this, zt, async (t, e, i) => {
      if (e == null || e.state === "closed" || i.abort) return null;
      if (n(this, _).length > 0) {
        const r = n(this, _)[0];
        return t < r.timestamp ? null : (n(this, _).shift(), t > r.timestamp + (r.duration ?? 0) ? (r.close(), await n(this, zt).call(this, t, e, i)) : (!n(this, qt) && n(this, _).length < 10 && n(this, Zt).call(this, e).catch((a) => {
          throw h(this, qt, !0), n(this, Tt).call(this, t), a;
        }), r));
      }
      if (n(this, ot) || n(this, at) < n(this, St) && e.decodeQueueSize > 0) {
        if (performance.now() - i.st > 6e3)
          throw Error(
            `MP4Clip.tick video timeout, ${JSON.stringify(n(this, te).call(this))}`
          );
        h(this, Mt, n(this, Mt) + 1), await Ue(15);
      } else {
        if (n(this, G) >= this.samples.length)
          return null;
        try {
          await n(this, Zt).call(this, e);
        } catch (r) {
          throw n(this, Tt).call(this, t), r;
        }
      }
      return await n(this, zt).call(this, t, e, i);
    });
    d(this, ot, !1);
    d(this, Zt, async (t) => {
      var r, a;
      if (n(this, ot) || t.decodeQueueSize > 600) return;
      let e = n(this, G) + 1;
      if (e > this.samples.length) return;
      h(this, ot, !0);
      let i = !1;
      for (; e < this.samples.length; e++) {
        const o = this.samples[e];
        if (!i && !o.deleted && (i = !0), o.is_idr) break;
      }
      if (i) {
        const o = this.samples.slice(n(this, G), e);
        if (((r = o[0]) == null ? void 0 : r.is_idr) !== !0)
          A.warn("First sample not idr frame");
        else {
          const c = performance.now(), l = await di(o, this.localFileReader), m = performance.now() - c;
          if (m > 1e3) {
            const u = o[0], w = o.at(-1), p = w.offset + w.size - u.offset;
            A.warn(
              `Read video samples time cost: ${Math.round(m)}ms, file chunk size: ${p}`
            );
          }
          if (t.state === "closed") return;
          h(this, Kt, ((a = l[0]) == null ? void 0 : a.duration) ?? 0), Be(t, l, {
            onDecodingError: (u) => {
              if (n(this, vt))
                throw u;
              n(this, at) === 0 && (h(this, vt, !0), A.warn("Downgrade to software decode"), n(this, Tt).call(this));
            }
          }), h(this, St, n(this, St) + l.length);
        }
      }
      h(this, G, e), h(this, ot, !1);
    });
    d(this, Tt, (t) => {
      var i, r;
      if (h(this, ot, !1), n(this, _).forEach((a) => a.close()), h(this, _, []), t == null || t === 0)
        h(this, G, 0);
      else {
        let a = 0;
        for (let o = 0; o < this.samples.length; o++) {
          const c = this.samples[o];
          if (c.is_idr && (a = o), !(c.cts < t)) {
            h(this, G, a);
            break;
          }
        }
      }
      h(this, St, 0), h(this, at, 0), ((i = n(this, F)) == null ? void 0 : i.state) !== "closed" && ((r = n(this, F)) == null || r.close());
      const e = {
        ...this.conf,
        ...n(this, vt) ? { hardwareAcceleration: "prefer-software" } : {}
      };
      h(this, F, new VideoDecoder({
        output: (a) => {
          if (h(this, at, n(this, at) + 1), a.timestamp === -1) {
            a.close();
            return;
          }
          let o = a;
          a.duration == null && (o = new VideoFrame(a, {
            duration: n(this, Kt)
          }), a.close()), n(this, _).push(o);
        },
        error: (a) => {
          if (a.message.includes("Codec reclaimed due to inactivity")) {
            h(this, F, null), A.warn(a.message);
            return;
          }
          const o = `VideoFinder VideoDecoder err: ${a.message}, config: ${JSON.stringify(e)}, state: ${JSON.stringify(n(this, te).call(this))}`;
          throw A.error(o), Error(o);
        }
      })), n(this, F).configure(e);
    });
    d(this, te, () => {
      var t, e;
      return {
        time: n(this, xt),
        decState: (t = n(this, F)) == null ? void 0 : t.state,
        decQSize: (e = n(this, F)) == null ? void 0 : e.decodeQueueSize,
        decCusorIdx: n(this, G),
        sampleLen: this.samples.length,
        inputCnt: n(this, St),
        outputCnt: n(this, at),
        cacheFrameLen: n(this, _).length,
        softDeocde: n(this, vt),
        clipIdCnt: He,
        sleepCnt: n(this, Mt),
        memInfo: ui()
      };
    });
    S(this, "destroy", () => {
      var t, e;
      ((t = n(this, F)) == null ? void 0 : t.state) !== "closed" && ((e = n(this, F)) == null || e.close()), h(this, F, null), n(this, Ct).abort = !0, n(this, _).forEach((i) => i.close()), h(this, _, []), this.localFileReader.close();
    });
    this.localFileReader = t, this.samples = e, this.conf = i;
  }
}
F = new WeakMap(), xt = new WeakMap(), Ct = new WeakMap(), Kt = new WeakMap(), vt = new WeakMap(), G = new WeakMap(), _ = new WeakMap(), at = new WeakMap(), St = new WeakMap(), Mt = new WeakMap(), qt = new WeakMap(), zt = new WeakMap(), ot = new WeakMap(), Zt = new WeakMap(), Tt = new WeakMap(), te = new WeakMap();
function Ui(s, t) {
  for (let e = 0; e < t.length; e++) {
    const i = t[e];
    if (s >= i.cts && s < i.cts + i.duration)
      return e;
    if (i.cts > s) break;
  }
  return 0;
}
var ee, ie, N, At, J, et, M, Vt, ne, se, ve, Se;
class Ni {
  constructor(t, e, i, r) {
    d(this, ee, 1);
    d(this, ie);
    d(this, N, null);
    d(this, At, { abort: !1, st: performance.now() });
    S(this, "find", async (t) => {
      const e = t <= n(this, J) || t - n(this, J) > 1e5;
      (n(this, N) == null || n(this, N).state === "closed" || e) && n(this, ve).call(this), e && (h(this, J, t), h(this, et, Ui(t, this.samples))), n(this, At).abort = !0;
      const i = t - n(this, J);
      h(this, J, t), h(this, At, { abort: !1, st: performance.now() });
      const r = await n(this, ne).call(this, Math.ceil(i * (n(this, ie) / 1e6)), n(this, N), n(this, At));
      return h(this, Vt, 0), r;
    });
    d(this, J, 0);
    d(this, et, 0);
    d(this, M, {
      frameCnt: 0,
      data: []
    });
    d(this, Vt, 0);
    d(this, ne, async (t, e = null, i) => {
      if (e == null || i.abort || e.state === "closed" || t === 0)
        return [];
      const r = n(this, M).frameCnt - t;
      if (r > 0)
        return r < T.sampleRate / 10 && n(this, se).call(this, e), qe(n(this, M), t);
      if (e.decoding) {
        if (performance.now() - i.st > 3e3)
          throw i.abort = !0, Error(
            `MP4Clip.tick audio timeout, ${JSON.stringify(n(this, Se).call(this))}`
          );
        h(this, Vt, n(this, Vt) + 1), await Ue(15);
      } else {
        if (n(this, et) >= this.samples.length - 1)
          return qe(n(this, M), n(this, M).frameCnt);
        n(this, se).call(this, e);
      }
      return n(this, ne).call(this, t, e, i);
    });
    d(this, se, (t) => {
      if (t.decodeQueueSize > 10) return;
      const i = [];
      let r = n(this, et);
      for (; r < this.samples.length; ) {
        const a = this.samples[r];
        if (r += 1, !a.deleted && (i.push(a), i.length >= 10))
          break;
      }
      h(this, et, r), t.decode(
        i.map(
          (a) => new EncodedAudioChunk({
            type: "key",
            timestamp: a.cts,
            duration: a.duration,
            data: a.data
          })
        )
      );
    });
    d(this, ve, () => {
      var t;
      h(this, J, 0), h(this, et, 0), h(this, M, {
        frameCnt: 0,
        data: []
      }), (t = n(this, N)) == null || t.close(), h(this, N, Hi(
        this.conf,
        {
          resampleRate: T.sampleRate,
          volume: n(this, ee)
        },
        (e) => {
          n(this, M).data.push(e), n(this, M).frameCnt += e[0].length;
        }
      ));
    });
    d(this, Se, () => {
      var t, e;
      return {
        time: n(this, J),
        decState: (t = n(this, N)) == null ? void 0 : t.state,
        decQSize: (e = n(this, N)) == null ? void 0 : e.decodeQueueSize,
        decCusorIdx: n(this, et),
        sampleLen: this.samples.length,
        pcmLen: n(this, M).frameCnt,
        clipIdCnt: He,
        sleepCnt: n(this, Vt),
        memInfo: ui()
      };
    });
    S(this, "destroy", () => {
      h(this, N, null), n(this, At).abort = !0, h(this, M, {
        frameCnt: 0,
        data: []
      }), this.localFileReader.close();
    });
    this.localFileReader = t, this.samples = e, this.conf = i, h(this, ee, r.volume), h(this, ie, r.targetSampleRate);
  }
}
ee = new WeakMap(), ie = new WeakMap(), N = new WeakMap(), At = new WeakMap(), J = new WeakMap(), et = new WeakMap(), M = new WeakMap(), Vt = new WeakMap(), ne = new WeakMap(), se = new WeakMap(), ve = new WeakMap(), Se = new WeakMap();
function Hi(s, t, e) {
  let i = 0, r = 0;
  const a = (u) => {
    if (r += 1, u.length !== 0) {
      if (t.volume !== 1)
        for (const w of u)
          for (let p = 0; p < w.length; p++) w[p] *= t.volume;
      u.length === 1 && (u = [u[0], u[0]]), e(u);
    }
  }, o = $i(a), c = t.resampleRate !== s.sampleRate;
  let l = new AudioDecoder({
    output: (u) => {
      const w = ci(u);
      c ? o(
        () => Oi(w, u.sampleRate, {
          rate: t.resampleRate,
          chanCount: u.numberOfChannels
        })
      ) : a(w), u.close();
    },
    error: (u) => {
      u.message.includes("Codec reclaimed due to inactivity") || m("MP4Clip AudioDecoder err", u);
    }
  });
  l.configure(s);
  function m(u, w) {
    const p = `${u}: ${w.message}, state: ${JSON.stringify(
      {
        qSize: l.decodeQueueSize,
        state: l.state,
        inputCnt: i,
        outputCnt: r
      }
    )}`;
    throw A.error(p), Error(p);
  }
  return {
    decode(u) {
      i += u.length;
      try {
        for (const w of u) l.decode(w);
      } catch (w) {
        m("decode audio chunk error", w);
      }
    },
    close() {
      l.state !== "closed" && l.close();
    },
    get decoding() {
      return i > r && l.decodeQueueSize > 0;
    },
    get state() {
      return l.state;
    },
    get decodeQueueSize() {
      return l.decodeQueueSize;
    }
  };
}
function $i(s) {
  const t = [];
  let e = 0;
  function i(o, c) {
    t[c] = o, r();
  }
  function r() {
    const o = t[e];
    o != null && (s(o), e += 1, r());
  }
  let a = 0;
  return (o) => {
    const c = a;
    a += 1, o().then((l) => i(l, c)).catch((l) => i(l, c));
  };
}
function qe(s, t) {
  const e = [new Float32Array(t), new Float32Array(t)];
  let i = 0, r = 0;
  for (; r < s.data.length; ) {
    const [a, o] = s.data[r];
    if (i + a.length > t) {
      const c = t - i;
      e[0].set(a.subarray(0, c), i), e[1].set(o.subarray(0, c), i), s.data[r][0] = a.subarray(c, a.length), s.data[r][1] = o.subarray(c, o.length);
      break;
    } else
      e[0].set(a, i), e[1].set(o, i), i += a.length, r++;
  }
  return s.data = s.data.slice(r), s.frameCnt -= t, e;
}
async function di(s, t) {
  const e = s[0], i = s.at(-1);
  if (i == null) return [];
  const r = i.offset + i.size - e.offset;
  if (r < 3e7) {
    const a = new Uint8Array(
      await t.read(r, { at: e.offset })
    );
    return s.map((o) => {
      const c = o.offset - e.offset;
      return new EncodedVideoChunk({
        type: o.is_sync ? "key" : "delta",
        timestamp: o.cts,
        duration: o.duration,
        data: a.subarray(c, c + o.size)
      });
    });
  }
  return await Promise.all(
    s.map(async (a) => new EncodedVideoChunk({
      type: a.is_sync ? "key" : "delta",
      timestamp: a.cts,
      duration: a.duration,
      data: await t.read(a.size, {
        at: a.offset
      })
    }))
  );
}
function Wi(s, t, e) {
  const i = new OffscreenCanvas(s, t), r = i.getContext("2d");
  return async (a) => (r.drawImage(a, 0, 0, s, t), a.close(), await i.convertToBlob(e));
}
function Xi(s, t) {
  if (s.length === 0) return [];
  let e = 0, i = 0, r = -1;
  for (let l = 0; l < s.length; l++) {
    const m = s[l];
    if (r === -1 && t < m.cts && (r = l - 1), m.is_idr)
      if (r === -1)
        e = l;
      else {
        i = l;
        break;
      }
  }
  const a = s[r];
  if (a == null) throw Error("Not found video sample by time");
  const o = s.slice(0, i === 0 ? s.length : i).map((l) => ({ ...l }));
  for (let l = e; l < o.length; l++) {
    const m = o[l];
    t < m.cts && (m.deleted = !0, m.cts = -1);
  }
  Oe(o);
  const c = s.slice(a.is_idr ? r : e).map((l) => ({ ...l, cts: l.cts - t }));
  for (const l of c)
    l.cts < 0 && (l.deleted = !0, l.cts = -1);
  return Oe(c), [o, c];
}
function Gi(s, t) {
  if (s.length === 0) return [];
  let e = -1;
  for (let a = 0; a < s.length; a++) {
    const o = s[a];
    if (!(t > o.cts)) {
      e = a;
      break;
    }
  }
  if (e === -1) throw Error("Not found audio sample by time");
  const i = s.slice(0, e).map((a) => ({ ...a })), r = s.slice(e).map((a) => ({ ...a, cts: a.cts - t }));
  return [i, r];
}
function Be(s, t, e) {
  let i = 0;
  if (s.state === "configured") {
    for (; i < t.length; i++) s.decode(t[i]);
    s.flush().catch((r) => {
      if (!(r instanceof Error)) throw r;
      if (r.message.includes("Decoding error") && e.onDecodingError != null) {
        e.onDecodingError(r);
        return;
      }
      if (!r.message.includes("Aborted due to close"))
        throw r;
    });
  }
}
function Ji(s, t) {
  if (t !== "avc1" && t !== "hvc1") return 0;
  const e = new DataView(s.buffer);
  let i = 0;
  for (; i < s.byteLength - 4; ) {
    if (t === "avc1" && (e.getUint8(i + 4) & 31) === 5)
      return i;
    if (t === "hvc1") {
      const r = e.getUint8(i + 4) >> 1 & 63;
      if (r === 19 || r === 20) return i;
    }
    i += e.getUint32(i) + 4;
  }
  return -1;
}
async function Yi(s, t, e, i, r, a) {
  const o = await t.createReader(), c = await di(
    s.filter(
      (u) => !u.deleted && u.is_sync && u.cts >= r.start && u.cts <= r.end
    ),
    o
  );
  if (c.length === 0 || i.aborted) return;
  let l = 0;
  Be(m(), c, {
    onDecodingError: (u) => {
      A.warn("thumbnailsByKeyFrame", u), l === 0 ? Be(m(!0), c, {
        onDecodingError: (w) => {
          o.close(), A.error("thumbnailsByKeyFrame retry soft deocde", w);
        }
      }) : (a(null, !0), o.close());
    }
  });
  function m(u = !1) {
    const w = {
      ...e,
      ...u ? { hardwareAcceleration: "prefer-software" } : {}
    }, p = new VideoDecoder({
      output: (x) => {
        l += 1;
        const f = l === c.length;
        a(x, f), f && (o.close(), p.state !== "closed" && p.close());
      },
      error: (x) => {
        const f = `thumbnails decoder error: ${x.message}, config: ${JSON.stringify(w)}, state: ${JSON.stringify(
          {
            qSize: p.decodeQueueSize,
            state: p.state,
            outputCnt: l,
            inputCnt: c.length
          }
        )}`;
        throw A.error(f), Error(f);
      }
    });
    return i.addEventListener("abort", () => {
      o.close(), p.state !== "closed" && p.close();
    }), p.configure(w), p;
  }
}
function Oe(s) {
  let t = 0, e = null;
  for (const i of s)
    if (!i.deleted) {
      if (i.is_sync && (t += 1), t >= 2) break;
      (e == null || i.cts < e.cts) && (e = i);
    }
  e != null && e.cts < 2e5 && (e.duration += e.cts, e.cts = 0);
}
function ui() {
  try {
    const s = performance.memory;
    return {
      jsHeapSizeLimit: s.jsHeapSizeLimit,
      totalJSHeapSize: s.totalJSHeapSize,
      usedJSHeapSize: s.usedJSHeapSize,
      percentUsed: (s.usedJSHeapSize / s.jsHeapSizeLimit).toFixed(3),
      percentTotal: (s.totalJSHeapSize / s.jsHeapSizeLimit).toFixed(3)
    };
  } catch {
    return {};
  }
}
var P, z, I, Te, fi;
const gt = class gt {
  /**
   * 静态图片可使用流、ImageBitmap 初始化
   *
   * 动图需要使用 VideoFrame[] 或提供图片类型
   */
  constructor(t) {
    d(this, Te);
    S(this, "ready");
    d(this, P, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0
    });
    d(this, z, null);
    d(this, I, []);
    S(this, "tickInterceptor", async (t, e) => e);
    const e = (i) => (h(this, z, i), n(this, P).width = i.width, n(this, P).height = i.height, n(this, P).duration = 1 / 0, { ...n(this, P) });
    if (t instanceof ReadableStream)
      this.ready = new Response(t).blob().then((i) => createImageBitmap(i)).then(e);
    else if (t instanceof ImageBitmap)
      this.ready = Promise.resolve(e(t));
    else if (Array.isArray(t) && t.every((i) => i instanceof VideoFrame)) {
      h(this, I, t);
      const i = n(this, I)[0];
      if (i == null) throw Error("The frame count must be greater than 0");
      h(this, P, {
        width: i.displayWidth,
        height: i.displayHeight,
        duration: n(this, I).reduce(
          (r, a) => r + (a.duration ?? 0),
          0
        )
      }), this.ready = Promise.resolve({ ...n(this, P), duration: 1 / 0 });
    } else if ("type" in t)
      this.ready = O(this, Te, fi).call(this, t.stream, t.type).then(() => ({
        width: n(this, P).width,
        height: n(this, P).height,
        duration: 1 / 0
      }));
    else
      throw Error("Illegal arguments");
  }
  /**
   * ⚠️ 静态图片的 duration 为 Infinity
   *
   * 使用 Sprite 包装时需要将它的 duration 设置为有限数
   *
   */
  get meta() {
    return { ...n(this, P) };
  }
  async tick(t) {
    if (n(this, z) != null)
      return await this.tickInterceptor(t, {
        video: await createImageBitmap(n(this, z)),
        state: "success"
      });
    const e = t % n(this, P).duration;
    return await this.tickInterceptor(t, {
      video: (n(this, I).find(
        (i) => e >= i.timestamp && e <= i.timestamp + (i.duration ?? 0)
      ) ?? n(this, I)[0]).clone(),
      state: "success"
    });
  }
  async split(t) {
    if (await this.ready, n(this, z) != null)
      return [
        new gt(await createImageBitmap(n(this, z))),
        new gt(await createImageBitmap(n(this, z)))
      ];
    let e = -1;
    for (let a = 0; a < n(this, I).length; a++) {
      const o = n(this, I)[a];
      if (!(t > o.timestamp)) {
        e = a;
        break;
      }
    }
    if (e === -1) throw Error("Not found frame by time");
    const i = n(this, I).slice(0, e).map((a) => new VideoFrame(a)), r = n(this, I).slice(e).map(
      (a) => new VideoFrame(a, {
        timestamp: a.timestamp - t
      })
    );
    return [new gt(i), new gt(r)];
  }
  async clone() {
    await this.ready;
    const t = n(this, z) == null ? n(this, I).map((e) => e.clone()) : await createImageBitmap(n(this, z));
    return new gt(t);
  }
  destroy() {
    var t;
    A.info("ImgClip destroy"), (t = n(this, z)) == null || t.close(), n(this, I).forEach((e) => e.close());
  }
};
P = new WeakMap(), z = new WeakMap(), I = new WeakMap(), Te = new WeakSet(), fi = async function(t, e) {
  h(this, I, await Bi(t, e));
  const i = n(this, I)[0];
  if (i == null) throw Error("No frame available in gif");
  h(this, P, {
    duration: n(this, I).reduce((r, a) => r + (a.duration ?? 0), 0),
    width: i.codedWidth,
    height: i.codedHeight
  }), A.info("ImgClip ready:", n(this, P));
};
let Ze = gt;
var kt, it, ct, Y, Ae, mi, lt, j;
const tt = class tt {
  /**
   *
   * @param dataSource 音频文件流
   * @param opts 音频配置，控制音量、是否循环
   */
  constructor(t, e = {}) {
    d(this, Ae);
    S(this, "ready");
    d(this, kt, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0
    });
    d(this, it, new Float32Array());
    d(this, ct, new Float32Array());
    d(this, Y);
    /**
     * 拦截 {@link AudioClip.tick} 方法返回的数据，用于对音频数据二次处理
     * @param time 调用 tick 的时间
     * @param tickRet tick 返回的数据
     *
     * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
     */
    S(this, "tickInterceptor", async (t, e) => e);
    // 微秒
    d(this, lt, 0);
    d(this, j, 0);
    h(this, Y, {
      loop: !1,
      volume: 1,
      ...e
    }), this.ready = O(this, Ae, mi).call(this, t).then(() => ({
      // audio 没有宽高，无需绘制
      width: 0,
      height: 0,
      duration: e.loop ? 1 / 0 : n(this, kt).duration
    }));
  }
  /**
   * 音频元信息
   *
   * ⚠️ 注意，这里是转换后（标准化）的元信息，非原始音频元信息
   */
  get meta() {
    return {
      ...n(this, kt),
      sampleRate: T.sampleRate,
      chanCount: 2
    };
  }
  /**
   * 获取音频素材完整的 PCM 数据
   */
  getPCMData() {
    return [n(this, it), n(this, ct)];
  }
  /**
   * 返回上次与当前时刻差对应的音频 PCM 数据；
   *
   * 若差值超过 3s 或当前时间小于上次时间，则重置状态
   * @example
   * tick(0) // => []
   * tick(1e6) // => [leftChanPCM(1s), rightChanPCM(1s)]
   *
   */
  async tick(t) {
    if (!n(this, Y).loop && t >= n(this, kt).duration)
      return await this.tickInterceptor(t, { audio: [], state: "done" });
    const e = t - n(this, lt);
    if (t < n(this, lt) || e > 3e6)
      return h(this, lt, t), h(this, j, Math.ceil(
        n(this, lt) / 1e6 * T.sampleRate
      )), await this.tickInterceptor(t, {
        audio: [new Float32Array(0), new Float32Array(0)],
        state: "success"
      });
    h(this, lt, t);
    const i = Math.ceil(
      e / 1e6 * T.sampleRate
    ), r = n(this, j) + i, a = n(this, Y).loop ? [
      De(n(this, it), n(this, j), r),
      De(n(this, ct), n(this, j), r)
    ] : [
      n(this, it).slice(n(this, j), r),
      n(this, ct).slice(n(this, j), r)
    ];
    return h(this, j, r), await this.tickInterceptor(t, { audio: a, state: "success" });
  }
  /**
   * 按指定时间切割，返回前后两个音频素材
   * @param time 时间，单位微秒
   */
  async split(t) {
    await this.ready;
    const e = Math.ceil(t / 1e6 * T.sampleRate), i = new tt(
      this.getPCMData().map((a) => a.slice(0, e)),
      n(this, Y)
    ), r = new tt(
      this.getPCMData().map((a) => a.slice(e)),
      n(this, Y)
    );
    return [i, r];
  }
  async clone() {
    await this.ready;
    const t = new tt(this.getPCMData(), n(this, Y));
    return await t.ready, t;
  }
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    h(this, it, new Float32Array(0)), h(this, ct, new Float32Array(0)), A.info("---- audioclip destroy ----");
  }
};
kt = new WeakMap(), it = new WeakMap(), ct = new WeakMap(), Y = new WeakMap(), Ae = new WeakSet(), mi = async function(t) {
  tt.ctx == null && (tt.ctx = new AudioContext({
    sampleRate: T.sampleRate
  }));
  const e = performance.now(), i = t instanceof ReadableStream ? await ji(t, tt.ctx) : t;
  A.info("Audio clip decoded complete:", performance.now() - e);
  const r = n(this, Y).volume;
  if (r !== 1)
    for (const a of i)
      for (let o = 0; o < a.length; o += 1) a[o] *= r;
  n(this, kt).duration = i[0].length / T.sampleRate * 1e6, h(this, it, i[0]), h(this, ct, i[1] ?? n(this, it)), A.info(
    "Audio clip convert to AudioData, time:",
    performance.now() - e
  );
}, lt = new WeakMap(), j = new WeakMap(), S(tt, "ctx", null);
let ti = tt;
async function ji(s, t) {
  const e = await new Response(s).arrayBuffer();
  return Le(await t.decodeAudioData(e));
}
var It, re, Lt, Ut;
const ke = class ke {
  constructor(t) {
    S(this, "ready");
    d(this, It, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0
    });
    d(this, re, () => {
    });
    /**
     * 实时流的音轨
     */
    S(this, "audioTrack");
    d(this, Lt, null);
    d(this, Ut);
    h(this, Ut, t), this.audioTrack = t.getAudioTracks()[0] ?? null, n(this, It).duration = 1 / 0;
    const e = t.getVideoTracks()[0];
    e != null ? (e.contentHint = "motion", this.ready = new Promise((i) => {
      h(this, re, Qi(e, (r) => {
        n(this, It).width = r.width, n(this, It).height = r.height, h(this, Lt, r), i(this.meta);
      }));
    })) : this.ready = Promise.resolve(this.meta);
  }
  get meta() {
    return {
      ...n(this, It)
    };
  }
  async tick() {
    return {
      video: n(this, Lt) == null ? null : await createImageBitmap(n(this, Lt)),
      audio: [],
      state: "success"
    };
  }
  async split() {
    return [await this.clone(), await this.clone()];
  }
  async clone() {
    return new ke(n(this, Ut).clone());
  }
  destroy() {
    n(this, Ut).getTracks().forEach((t) => t.stop()), n(this, re).call(this);
  }
};
It = new WeakMap(), re = new WeakMap(), Lt = new WeakMap(), Ut = new WeakMap(), S(ke, "ctx", null);
let ei = ke;
function Qi(s, t) {
  let e = !1, i;
  return ze(
    new MediaStreamTrackProcessor({
      track: s
    }).readable,
    {
      onChunk: async (r) => {
        if (!e) {
          const { displayHeight: a, displayWidth: o } = r, c = o ?? 0, l = a ?? 0, m = new OffscreenCanvas(c, l);
          i = m.getContext("2d"), t(m), e = !0;
        }
        i.drawImage(r, 0, 0), r.close();
      },
      onDone: async () => {
      }
    }
  );
}
var R, ae, V, Q, K, D, nt, st, Ie, pi;
const Jt = class Jt {
  constructor(t, e) {
    d(this, Ie);
    S(this, "ready");
    d(this, R, []);
    d(this, ae, {
      width: 0,
      height: 0,
      duration: 0
    });
    d(this, V, {
      color: "#FFF",
      textBgColor: null,
      type: "srt",
      fontSize: 30,
      letterSpacing: null,
      bottomOffset: 30,
      fontFamily: "Noto Sans SC",
      strokeStyle: "#000",
      lineWidth: null,
      lineCap: null,
      lineJoin: null,
      textShadow: {
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: "#000"
      },
      videoWidth: 1280,
      videoHeight: 720
    });
    d(this, Q);
    d(this, K);
    d(this, D, null);
    d(this, nt, 0);
    d(this, st, 0);
    var l;
    if (h(this, R, Array.isArray(t) ? t : Ki(t).map(({ start: m, end: u, text: w }) => ({
      start: m * 1e6,
      end: u * 1e6,
      text: w
    }))), n(this, R).length === 0) throw Error("No subtitles content");
    h(this, V, Object.assign(n(this, V), e)), h(this, st, e.textBgColor == null ? 0 : (e.fontSize ?? 50) * 0.2);
    const { fontSize: i, fontFamily: r, videoWidth: a, videoHeight: o, letterSpacing: c } = n(this, V);
    h(this, nt, i + n(this, st) * 2), h(this, Q, new OffscreenCanvas(a, o)), h(this, K, n(this, Q).getContext("2d")), n(this, K).font = `${i}px ${r}`, n(this, K).textAlign = "center", n(this, K).textBaseline = "top", n(this, K).letterSpacing = c ?? "0px", h(this, ae, {
      width: a,
      height: o,
      duration: ((l = n(this, R).at(-1)) == null ? void 0 : l.end) ?? 0
    }), this.ready = Promise.resolve(this.meta);
  }
  get meta() {
    return { ...n(this, ae) };
  }
  /**
   * @see {@link IClip.tick}
   */
  async tick(t) {
    var a, o;
    if (n(this, D) != null && t >= n(this, D).timestamp && t <= n(this, D).timestamp + (n(this, D).duration ?? 0))
      return { video: n(this, D).clone(), state: "success" };
    let e = 0;
    for (; e < n(this, R).length && !(t <= n(this, R)[e].end); e += 1)
      ;
    const i = n(this, R)[e] ?? n(this, R).at(-1);
    if (t > i.end) return { state: "done" };
    if (t < i.start) {
      n(this, K).clearRect(0, 0, n(this, Q).width, n(this, Q).height);
      const c = new VideoFrame(n(this, Q), {
        timestamp: t,
        // 直到下个字幕出现的时机
        duration: i.start - t
      });
      return (a = n(this, D)) == null || a.close(), h(this, D, c), { video: c.clone(), state: "success" };
    }
    O(this, Ie, pi).call(this, i.text);
    const r = new VideoFrame(n(this, Q), {
      timestamp: t,
      duration: i.end - t
    });
    return (o = n(this, D)) == null || o.close(), h(this, D, r), { video: r.clone(), state: "success" };
  }
  /**
   * @see {@link IClip.split}
   */
  async split(t) {
    await this.ready;
    let e = -1;
    for (let c = 0; c < n(this, R).length; c++) {
      const l = n(this, R)[c];
      if (!(t > l.start)) {
        e = c;
        break;
      }
    }
    if (e === -1) throw Error("Not found subtitle by time");
    const i = n(this, R).slice(0, e).map((c) => ({ ...c }));
    let r = i.at(-1), a = null;
    r != null && r.end > t && (a = {
      start: 0,
      end: r.end - t,
      text: r.text
    }, r.end = t);
    const o = n(this, R).slice(e).map((c) => ({ ...c, start: c.start - t, end: c.end - t }));
    return a != null && o.unshift(a), [
      new Jt(i, n(this, V)),
      new Jt(o, n(this, V))
    ];
  }
  /**
   * @see {@link IClip.clone}
   */
  async clone() {
    return new Jt(n(this, R).slice(0), n(this, V));
  }
  /**
   * 通过时间戳，修改字幕内容
   * @param subtitle SubtitleStruct
   * @returns
   */
  updateSubtitle(t) {
    n(this, R).forEach((e) => {
      e.start === t.start && e.end === t.end && (e.text = t.text);
    });
  }
  /**
   * 获取字幕距离底部的偏移距离
   * @returns 当前的bottomOffset值（像素）
   */
  getBottomOffset() {
    return n(this, V).bottomOffset;
  }
  /**
   * 设置字幕距离底部的偏移距离
   * @param value 新的bottomOffset值（像素）
   */
  setBottomOffset(t) {
    var e;
    if (typeof t != "number" || t < 0)
      throw new Error("bottomOffset must be a non-negative number");
    n(this, V).bottomOffset = t, (e = n(this, D)) == null || e.close(), h(this, D, null);
  }
  /**
   * @see {@link IClip.destroy}
   */
  destroy() {
    var t;
    (t = n(this, D)) == null || t.close();
  }
};
R = new WeakMap(), ae = new WeakMap(), V = new WeakMap(), Q = new WeakMap(), K = new WeakMap(), D = new WeakMap(), nt = new WeakMap(), st = new WeakMap(), Ie = new WeakSet(), pi = function(t) {
  A.info("renderTxt", t);
  const e = t.split(`
`).reverse().map((g) => g.trim()), { width: i, height: r } = n(this, Q), {
    color: a,
    fontSize: o,
    textBgColor: c,
    textShadow: l,
    strokeStyle: m,
    lineWidth: u,
    lineCap: w,
    lineJoin: p,
    bottomOffset: x
  } = n(this, V), f = n(this, K);
  f.clearRect(0, 0, i, r), f.globalAlpha = 0.6;
  let y = x;
  for (const g of e) {
    const b = f.measureText(g), C = i / 2;
    c != null && (f.shadowOffsetX = 0, f.shadowOffsetY = 0, f.shadowBlur = 0, f.fillStyle = c, f.globalAlpha = 0.5, f.fillRect(
      C - b.actualBoundingBoxLeft - n(this, st),
      r - y - n(this, nt),
      b.width + n(this, st) * 2,
      n(this, nt)
    )), f.shadowColor = l.color, f.shadowOffsetX = l.offsetX, f.shadowOffsetY = l.offsetY, f.shadowBlur = l.blur, f.globalAlpha = 1, m != null && (f.lineWidth = u ?? o / 6, w != null && (f.lineCap = w), p != null && (f.lineJoin = p), f.strokeStyle = m, f.strokeText(
      g,
      C,
      r - y - n(this, nt) + n(this, st)
    )), f.fillStyle = a, f.fillText(
      g,
      C,
      r - y - n(this, nt) + n(this, st)
    ), y += n(this, nt) + o * 0.2;
  }
};
let ii = Jt;
function ni(s) {
  const t = s.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (t == null) throw Error(`time format error: ${s}`);
  const e = Number(t[1]), i = Number(t[2]), r = Number(t[3]), a = Number(t[4]);
  return e * 60 * 60 + i * 60 + r + a / 1e3;
}
function Ki(s) {
  return s.split(/\r|\n/).map((t) => t.trim()).filter((t) => t.length > 0).map((t) => ({
    lineStr: t,
    match: t.match(
      /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
    )
  })).filter(
    ({ lineStr: t }, e, i) => {
      var r;
      return !(/^\d+$/.test(t) && ((r = i[e + 1]) == null ? void 0 : r.match) != null);
    }
  ).reduce(
    (t, { lineStr: e, match: i }) => {
      if (i == null) {
        const r = t.at(-1);
        if (r == null) return t;
        r.text += r.text.length === 0 ? e : `
${e}`;
      } else
        t.push({
          start: ni(i[1]),
          end: ni(i[2]),
          text: ""
        });
      return t;
    },
    []
  );
}
var oe;
class wi {
  constructor() {
    S(this, "readable");
    S(this, "writable");
    d(this, oe, 0);
    const t = wt.createFile();
    let e = !1;
    this.readable = new ReadableStream(
      {
        start: (i) => {
          t.onReady = (a) => {
            var l, m;
            const o = (l = a.videoTracks[0]) == null ? void 0 : l.id;
            o != null && t.setExtractionOptions(o, "video", { nbSamples: 100 });
            const c = (m = a.audioTracks[0]) == null ? void 0 : m.id;
            c != null && t.setExtractionOptions(c, "audio", { nbSamples: 100 }), i.enqueue({ chunkType: "ready", data: { info: a, file: t } }), t.start();
          };
          const r = {};
          t.onSamples = (a, o, c) => {
            i.enqueue({
              chunkType: "samples",
              data: { id: a, type: o, samples: c.map((l) => ({ ...l })) }
            }), r[a] = (r[a] ?? 0) + c.length, t.releaseUsedSamples(a, r[a]);
          }, t.onFlush = () => {
            i.close();
          };
        },
        cancel: () => {
          t.stop(), e = !0;
        }
      },
      {
        // 每条消息 100 个 samples
        highWaterMark: 50
      }
    ), this.writable = new WritableStream({
      write: async (i) => {
        if (e) {
          this.writable.abort();
          return;
        }
        const r = i.buffer;
        r.fileStart = n(this, oe), h(this, oe, n(this, oe) + r.byteLength), t.appendBuffer(r);
      },
      close: () => {
        var i;
        t.flush(), t.stop(), (i = t.onFlush) == null || i.call(t);
      }
    });
  }
}
oe = new WeakMap();
function qi(s) {
  let t = 0;
  const e = s.boxes, i = [];
  let r = 0;
  async function a() {
    const f = x(e, t);
    t = e.length, i.forEach(({ track: y, id: g }) => {
      const b = y.samples.at(-1);
      b != null && (r = Math.max(r, b.cts + b.duration)), s.releaseUsedSamples(g, y.samples.length), y.samples = [];
    }), s.mdats = [], s.moofs = [], f != null && await (u == null ? void 0 : u.write(f));
  }
  let o = [];
  function c() {
    if (o.length > 0) return !0;
    const f = e.findIndex((y) => y.type === "moov");
    if (f === -1) return !1;
    if (o = e.slice(0, f + 1), t = f + 1, i.length === 0)
      for (let y = 1; ; y += 1) {
        const g = s.getTrackById(y);
        if (g == null) break;
        i.push({ track: g, id: y });
      }
    return !0;
  }
  let l = 0;
  const m = Ee();
  let u = null;
  const w = (async () => {
    u = await m.createWriter(), l = self.setInterval(() => {
      c() && a();
    }, 100);
  })();
  let p = !1;
  return async () => {
    if (p) throw Error("File exported");
    if (p = !0, await w, clearInterval(l), !c() || u == null) return null;
    s.flush(), await a(), await (u == null ? void 0 : u.close());
    const f = o.find((b) => b.type === "moov");
    if (f == null) return null;
    f.mvhd.duration = r;
    const y = Ee(), g = x(o, 0);
    return await Pe(y, g), await Pe(y, m, { overwrite: !1 }), await y.stream();
  };
  function x(f, y) {
    if (y >= f.length) return null;
    const g = new wt.DataStream();
    g.endianness = wt.DataStream.BIG_ENDIAN;
    for (let b = y; b < f.length; b++)
      f[b] !== null && (f[b].write(g), delete f[b]);
    return new Uint8Array(g.buffer);
  }
}
function Zi(s) {
  const t = new ArrayBuffer(s.byteLength);
  s.copyTo(t);
  const e = s.timestamp;
  return {
    duration: s.duration ?? 0,
    dts: e,
    cts: e,
    is_sync: s.type === "key",
    data: t
  };
}
async function tn(s) {
  const t = wt.createFile(), e = qi(t);
  await en(s, t);
  const i = await e();
  if (i == null) throw Error("Can not generate file from streams");
  return i;
}
async function en(s, t) {
  let e = 0, i = 0, r = 0, a = 0, o = 0, c = 0, l = null, m = null;
  for (const u of s)
    await new Promise(async (w) => {
      ze(u.pipeThrough(new wi()), {
        onDone: w,
        onChunk: async ({ chunkType: p, data: x }) => {
          if (p === "ready") {
            const { videoTrackConf: f, audioTrackConf: y } = Ne(
              x.file,
              x.info
            );
            e === 0 && f != null && (e = t.addTrack(f)), a === 0 && y != null && (a = t.addTrack(y));
          } else if (p === "samples") {
            const { type: f, samples: y } = x, g = f === "video" ? e : a, b = f === "video" ? i : o, C = f === "video" ? r : c;
            y.forEach((k) => {
              t.addSample(g, k.data, {
                duration: k.duration,
                dts: k.dts + b,
                cts: k.cts + C,
                is_sync: k.is_sync
              });
            });
            const v = y.at(-1);
            if (v == null) return;
            f === "video" ? l = v : f === "audio" && (m = v);
          }
        }
      });
    }), l != null && (i += l.dts, r += l.cts), m != null && (o += m.dts, c += m.cts);
}
async function In(s) {
  return await tn([s]);
}
function nn(s) {
  let t = [];
  const e = new AudioDecoder({
    output: (i) => {
      t.push(i);
    },
    error: A.error
  });
  return e.configure(s), {
    decode: async (i) => {
      i.forEach((a) => {
        e.decode(
          new EncodedAudioChunk({
            type: a.is_sync ? "key" : "delta",
            timestamp: 1e6 * a.cts / a.timescale,
            duration: 1e6 * a.duration / a.timescale,
            data: a.data
          })
        );
      }), await e.flush();
      const r = t;
      return t = [], r;
    },
    close: () => {
      e.close();
    }
  };
}
function sn(s, t) {
  const e = {
    codec: s.codec,
    sampleRate: s.sampleRate,
    numberOfChannels: s.numberOfChannels
  }, i = new AudioEncoder({
    output: (o) => {
      t(Zi(o));
    },
    error: (o) => {
      A.error("AudioEncoder error:", o, ", config:", e);
    }
  });
  i.configure(e);
  let r = null;
  function a(o, c) {
    return new AudioData({
      timestamp: c,
      numberOfChannels: s.numberOfChannels,
      numberOfFrames: o.length / s.numberOfChannels,
      sampleRate: s.sampleRate,
      format: "f32-planar",
      data: o
    });
  }
  return {
    encode: async (o, c) => {
      r != null && i.encode(a(r.data, r.ts)), r = { data: o, ts: c };
    },
    stop: async () => {
      r != null && (rn(r.data, s.numberOfChannels, s.sampleRate), i.encode(a(r.data, r.ts)), r = null), await i.flush(), i.close();
    }
  };
}
function rn(s, t, e) {
  const i = s.length - 1, r = Math.min(e / 2, i);
  for (let a = 0; a < r; a++)
    for (let o = 1; o <= t; o++)
      s[Math.floor(i / o) - a] *= a / r;
}
function Fn(s, t) {
  A.info("mixinMP4AndAudio, opts:", {
    volume: t.volume,
    loop: t.loop
  });
  const e = wt.createFile(), { stream: i, stop: r } = oi(e, 500);
  let a = null, o = null, c = [], l = 0, m = 0, u = 0, w = !0, p = T.sampleRate;
  ze(s.pipeThrough(new wi()), {
    onDone: async () => {
      await (o == null ? void 0 : o.stop()), a == null || a.close(), r();
    },
    onChunk: async ({ chunkType: g, data: b }) => {
      if (g === "ready") {
        const { videoTrackConf: C, audioTrackConf: v, audioDecoderConf: k } = Ne(b.file, b.info);
        l === 0 && C != null && (l = e.addTrack(C));
        const $ = v ?? {
          timescale: 1e6,
          samplerate: p,
          channel_count: T.channelCount,
          hdlr: "soun",
          name: "SoundHandler",
          type: "mp4a"
        };
        m === 0 && (m = e.addTrack($), p = (v == null ? void 0 : v.samplerate) ?? p, w = v != null);
        const Ci = new AudioContext({ sampleRate: p });
        c = Le(
          await Ci.decodeAudioData(
            await new Response(t.stream).arrayBuffer()
          )
        ), k != null && (a = nn(k)), o = sn(
          k ?? {
            codec: $.type === "mp4a" ? T.codec : $.type,
            numberOfChannels: $.channel_count,
            sampleRate: $.samplerate
          },
          (Ge) => e.addSample(m, Ge.data, Ge)
        );
      } else if (g === "samples") {
        const { id: C, type: v, samples: k } = b;
        if (v === "video") {
          k.forEach(($) => e.addSample(C, $.data, $)), w || await f(k);
          return;
        }
        v === "audio" && await y(k);
      }
    }
  });
  function x(g) {
    const b = c.map(
      (C) => t.loop ? De(C, u, u + g) : C.slice(u, u + g)
    );
    if (u += g, t.volume !== 1)
      for (const C of b)
        for (let v = 0; v < C.length; v++) C[v] *= t.volume;
    return b;
  }
  async function f(g) {
    const b = g[0], C = g[g.length - 1], v = Math.floor(
      (C.cts + C.duration - b.cts) / C.timescale * p
    ), k = Ye([x(v)]);
    k.length !== 0 && (o == null || o.encode(
      k,
      b.cts / b.timescale * 1e6
    ));
  }
  async function y(g) {
    if (a == null) return;
    const b = (await a.decode(g)).map(
      ci
    ), C = Ei(b), v = x(C[0].length), k = g[0];
    o == null || o.encode(
      // 2. 混合输入的音频
      Ye([C, v]),
      k.cts / k.timescale * 1e6
    );
  }
  return i;
}
const an = `#version 300 es
  layout (location = 0) in vec4 a_position;
  layout (location = 1) in vec2 a_texCoord;
  out vec2 v_texCoord;
  void main () {
    gl_Position = a_position;
    v_texCoord = a_texCoord;
  }
`, on = `#version 300 es
precision mediump float;
out vec4 FragColor;
in vec2 v_texCoord;

uniform sampler2D frameTexture;
uniform vec3 keyColor;

// 色度的相似度计算
uniform float similarity;
// 透明度的平滑度计算
uniform float smoothness;
// 降低绿幕饱和度，提高抠图准确度
uniform float spill;

vec2 RGBtoUV(vec3 rgb) {
  return vec2(
    rgb.r * -0.169 + rgb.g * -0.331 + rgb.b *  0.5    + 0.5,
    rgb.r *  0.5   + rgb.g * -0.419 + rgb.b * -0.081  + 0.5
  );
}

void main() {
  // 获取当前像素的rgba值
  vec4 rgba = texture(frameTexture, v_texCoord);
  // 计算当前像素与绿幕像素的色度差值
  vec2 chromaVec = RGBtoUV(rgba.rgb) - RGBtoUV(keyColor);
  // 计算当前像素与绿幕像素的色度距离（向量长度）, 越相像则色度距离越小
  float chromaDist = sqrt(dot(chromaVec, chromaVec));
  // 设置了一个相似度阈值，baseMask为负，则表明是绿幕，为正则表明不是绿幕
  float baseMask = chromaDist - similarity;
  // 如果baseMask为负数，fullMask等于0；baseMask为正数，越大，则透明度越低
  float fullMask = pow(clamp(baseMask / smoothness, 0., 1.), 1.5);
  rgba.a = fullMask; // 设置透明度
  // 如果baseMask为负数，spillVal等于0；baseMask为整数，越小，饱和度越低
  float spillVal = pow(clamp(baseMask / spill, 0., 1.), 1.5);
  float desat = clamp(rgba.r * 0.2126 + rgba.g * 0.7152 + rgba.b * 0.0722, 0., 1.); // 计算当前像素的灰度值
  rgba.rgb = mix(vec3(desat, desat, desat), rgba.rgb, spillVal);
  FragColor = rgba;
}
`, cn = [-1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1, 1], ln = [0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1];
function hn(s, t, e) {
  const i = si(s, s.VERTEX_SHADER, t), r = si(s, s.FRAGMENT_SHADER, e), a = s.createProgram();
  if (s.attachShader(a, i), s.attachShader(a, r), s.linkProgram(a), !s.getProgramParameter(a, s.LINK_STATUS))
    throw Error(
      s.getProgramInfoLog(a) ?? "Unable to initialize the shader program"
    );
  return a;
}
function si(s, t, e) {
  const i = s.createShader(t);
  if (s.shaderSource(i, e), s.compileShader(i), !s.getShaderParameter(i, s.COMPILE_STATUS)) {
    const r = s.getShaderInfoLog(i);
    throw s.deleteShader(i), Error(r ?? "An error occurred compiling the shaders");
  }
  return i;
}
function dn(s, t, e) {
  s.bindTexture(s.TEXTURE_2D, e), s.texImage2D(s.TEXTURE_2D, 0, s.RGBA, s.RGBA, s.UNSIGNED_BYTE, t), s.drawArrays(s.TRIANGLES, 0, 6);
}
function un(s) {
  const t = s.createTexture();
  if (t == null) throw Error("Create WebGL texture error");
  s.bindTexture(s.TEXTURE_2D, t);
  const e = 0, i = s.RGBA, r = 1, a = 1, o = 0, c = s.RGBA, l = s.UNSIGNED_BYTE, m = new Uint8Array([0, 0, 255, 255]);
  return s.texImage2D(
    s.TEXTURE_2D,
    e,
    i,
    r,
    a,
    o,
    c,
    l,
    m
  ), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MAG_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MIN_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_S, s.CLAMP_TO_EDGE), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_T, s.CLAMP_TO_EDGE), t;
}
function fn(s) {
  const t = "document" in globalThis ? globalThis.document.createElement("canvas") : new OffscreenCanvas(s.width, s.height);
  t.width = s.width, t.height = s.height;
  const e = t.getContext("webgl2", {
    premultipliedAlpha: !1,
    alpha: !0
  });
  if (e == null) throw Error("Cant create gl context");
  const i = hn(e, an, on);
  e.useProgram(i), e.uniform3fv(
    e.getUniformLocation(i, "keyColor"),
    s.keyColor.map((l) => l / 255)
  ), e.uniform1f(
    e.getUniformLocation(i, "similarity"),
    s.similarity
  ), e.uniform1f(
    e.getUniformLocation(i, "smoothness"),
    s.smoothness
  ), e.uniform1f(e.getUniformLocation(i, "spill"), s.spill);
  const r = e.createBuffer();
  e.bindBuffer(e.ARRAY_BUFFER, r), e.bufferData(e.ARRAY_BUFFER, new Float32Array(cn), e.STATIC_DRAW);
  const a = e.getAttribLocation(i, "a_position");
  e.vertexAttribPointer(
    a,
    2,
    e.FLOAT,
    !1,
    Float32Array.BYTES_PER_ELEMENT * 2,
    0
  ), e.enableVertexAttribArray(a);
  const o = e.createBuffer();
  e.bindBuffer(e.ARRAY_BUFFER, o), e.bufferData(
    e.ARRAY_BUFFER,
    new Float32Array(ln),
    e.STATIC_DRAW
  );
  const c = e.getAttribLocation(i, "a_texCoord");
  return e.vertexAttribPointer(
    c,
    2,
    e.FLOAT,
    !1,
    Float32Array.BYTES_PER_ELEMENT * 2,
    0
  ), e.enableVertexAttribArray(c), e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, 1), { cvs: t, gl: e };
}
function mn(s) {
  return s instanceof VideoFrame ? { width: s.codedWidth, height: s.codedHeight } : { width: s.width, height: s.height };
}
function pn(s) {
  const e = new OffscreenCanvas(1, 1).getContext("2d");
  e.drawImage(s, 0, 0);
  const {
    data: [i, r, a]
  } = e.getImageData(0, 0, 1, 1);
  return [i, r, a];
}
const Rn = (s) => {
  let t = null, e = null, i = s.keyColor, r = null;
  return async (a) => {
    if ((t == null || e == null || r == null) && (i == null && (i = pn(a)), { cvs: t, gl: e } = fn({
      ...mn(a),
      keyColor: i,
      ...s
    }), r = un(e)), dn(e, a, r), globalThis.VideoFrame != null && a instanceof globalThis.VideoFrame) {
      const o = new VideoFrame(t, {
        alpha: "keep",
        timestamp: a.timestamp,
        duration: a.duration ?? void 0
      });
      return a.close(), o;
    }
    return createImageBitmap(t, {
      imageOrientation: a instanceof ImageBitmap ? "flipY" : "none"
    });
  };
};
var ce, le, he, de, ue, fe, ht, Bt, dt;
const $e = class $e {
  constructor(t, e, i, r, a) {
    d(this, ht);
    d(this, ce, new Ve());
    /**
     * 监听属性变更事件
     * @example
     * rect.on('propsChange', (changedProps) => {})
     */
    S(this, "on", n(this, ce).on);
    d(this, le, 0);
    d(this, he, 0);
    d(this, de, 0);
    d(this, ue, 0);
    d(this, fe, 0);
    /**
     * 如果当前实例是 Rect 控制点之一，`master` 将指向该 Rect
     *
     * 控制点的坐标是相对于它的 `master` 定位
     */
    d(this, dt, null);
    /**
     * 是否保持固定宽高比例，禁止变形缩放
     *
     * 值为 true 时，将缺少上下左右四个控制点
     */
    S(this, "fixedAspectRatio", !1);
    /**
     * 是否固定中心点进行缩放
     * 值为 true 时，固定中心点不变进行缩放
     * 值为 false 时，固定对角点不变进行缩放
     */
    S(this, "fixedScaleCenter", !1);
    this.x = t ?? 0, this.y = e ?? 0, this.w = i ?? 0, this.h = r ?? 0, h(this, dt, a ?? null);
  }
  /**
   * x 坐标
   */
  get x() {
    return n(this, le);
  }
  set x(t) {
    O(this, ht, Bt).call(this, "x", t);
  }
  get y() {
    return n(this, he);
  }
  /**
   * y 坐标
   */
  set y(t) {
    O(this, ht, Bt).call(this, "y", t);
  }
  /**
   * 宽
   */
  get w() {
    return n(this, de);
  }
  set w(t) {
    O(this, ht, Bt).call(this, "w", t);
  }
  /**
   * 高
   */
  get h() {
    return n(this, ue);
  }
  set h(t) {
    O(this, ht, Bt).call(this, "h", t);
  }
  /**
   * 旋转角度
   * @see [MDN Canvas rotate](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/rotate)
   */
  get angle() {
    return n(this, fe);
  }
  set angle(t) {
    O(this, ht, Bt).call(this, "angle", t);
  }
  /**
   * 根据坐标、宽高计算出来的矩形中心点
   */
  get center() {
    const { x: t, y: e, w: i, h: r } = this;
    return { x: t + i / 2, y: e + r / 2 };
  }
  clone() {
    const { x: t, y: e, w: i, h: r } = this, a = new $e(t, e, i, r, n(this, dt));
    return a.angle = this.angle, a.fixedAspectRatio = this.fixedAspectRatio, a.fixedScaleCenter = this.fixedScaleCenter, a;
  }
  /**
   * 检测目标坐标是否命中当前实例
   * @param tx 目标点 x 坐标
   * @param ty 目标点 y 坐标
   */
  checkHit(t, e) {
    var y, g;
    let { angle: i, center: r, x: a, y: o, w: c, h: l } = this;
    const m = ((y = n(this, dt)) == null ? void 0 : y.center) ?? r, u = ((g = n(this, dt)) == null ? void 0 : g.angle) ?? i;
    n(this, dt) == null && (a = a - m.x, o = o - m.y);
    const w = t - m.x, p = e - m.y;
    let x = w, f = p;
    return u !== 0 && (x = w * Math.cos(u) + p * Math.sin(u), f = p * Math.cos(u) - w * Math.sin(u)), !(x < a || x > a + c || f < o || f > o + l);
  }
};
ce = new WeakMap(), le = new WeakMap(), he = new WeakMap(), de = new WeakMap(), ue = new WeakMap(), fe = new WeakMap(), ht = new WeakSet(), Bt = function(t, e) {
  const i = this[t] !== e;
  switch (t) {
    case "x":
      h(this, le, e);
      break;
    case "y":
      h(this, he, e);
      break;
    case "w":
      h(this, de, e);
      break;
    case "h":
      h(this, ue, e);
      break;
    case "angle":
      h(this, fe, e);
      break;
  }
  i && n(this, ce).emit("propsChange", { [t]: e });
}, dt = new WeakMap();
let _e = $e;
var me, Ft, Nt, ut, q;
class yi {
  constructor() {
    /**
     * 控制素材在视频中的空间属性（坐标、旋转、缩放）
     */
    S(this, "rect", new _e());
    /**
     * 控制素材在的时间偏移、时长、播放速率，常用于剪辑场景时间轴（轨道）模块
     * duration 不能大于引用 {@link IClip} 的时长，单位 微秒
     *
     * playbackRate 控制当前素材的播放速率，1 表示正常播放；
     * **注意**
     *    1. 设置 playbackRate 时需要主动修正 duration
     *    2. 音频使用最简单的插值算法来改变速率，所以改变速率后音调会产生变化，自定义算法请使用 {@link MP4Clip.tickInterceptor} 配合实现
     *
     */
    d(this, me, {
      offset: 0,
      duration: 0,
      playbackRate: 1
    });
    d(this, Ft, new Ve());
    /**
     * 监听属性变更事件
     * @example
     * sprite.on('propsChange', (changedProps) => {})
     */
    S(this, "on", n(this, Ft).on);
    d(this, Nt, 0);
    /**
     * 不透明度
     */
    S(this, "opacity", 1);
    /**
     * 水平或垂直方向翻转素材
     */
    S(this, "flip", null);
    d(this, ut, null);
    d(this, q, null);
    /**
     * @see {@link IClip.ready}
     */
    S(this, "ready", Promise.resolve());
    this.rect.on("propsChange", (t) => {
      n(this, Ft).emit("propsChange", { rect: t });
    });
  }
  get time() {
    return n(this, me);
  }
  set time(t) {
    Object.assign(n(this, me), t);
  }
  get zIndex() {
    return n(this, Nt);
  }
  /**
   * 控制素材间的层级关系，zIndex 值较小的素材会被遮挡
   */
  set zIndex(t) {
    const e = n(this, Nt) !== t;
    h(this, Nt, t), e && n(this, Ft).emit("propsChange", { zIndex: t });
  }
  _render(t) {
    const {
      rect: { center: e, angle: i }
    } = this;
    t.setTransform(
      // 水平 缩放、倾斜
      this.flip === "horizontal" ? -1 : 1,
      0,
      // 垂直 倾斜、缩放
      0,
      this.flip === "vertical" ? -1 : 1,
      // 坐标原点偏移 x y
      e.x,
      e.y
    ), t.rotate((this.flip == null ? 1 : -1) * i), t.globalAlpha = this.opacity;
  }
  /**
   * 给素材添加动画，使用方法参考 css animation
   *
   * @example
   * sprite.setAnimation(
   *   {
   *     '0%': { x: 0, y: 0 },
   *     '25%': { x: 1200, y: 680 },
   *     '50%': { x: 1200, y: 0 },
   *     '75%': { x: 0, y: 680 },
   *     '100%': { x: 0, y: 0 },
   *   },
   *   { duration: 4e6, iterCount: 1 },
   * );
   *
   * @see [视频水印动画](https://webav-tech.github.io/WebAV/demo/2_1-concat-video)
   */
  setAnimation(t, e) {
    h(this, ut, Object.entries(t).map(([i, r]) => {
      const a = { from: 0, to: 100 }[i] ?? Number(i.slice(0, -1));
      if (isNaN(a) || a > 100 || a < 0)
        throw Error("keyFrame must between 0~100");
      return [a / 100, r];
    })), h(this, q, Object.assign({}, n(this, q), {
      duration: e.duration,
      delay: e.delay ?? 0,
      iterCount: e.iterCount ?? 1 / 0
    }));
  }
  /**
   * 如果当前 sprite 已被设置动画，将 sprite 的动画属性设定到指定时间的状态
   */
  animate(t) {
    if (n(this, ut) == null || n(this, q) == null || t < n(this, q).delay)
      return;
    const e = wn(
      t,
      n(this, ut),
      n(this, q)
    );
    for (const i in e)
      switch (i) {
        case "opacity":
          this.opacity = e[i];
          break;
        case "x":
        case "y":
        case "w":
        case "h":
        case "angle":
          this.rect[i] = e[i];
          break;
      }
  }
  /**
   * 将当前 sprite 的属性赋值到目标
   *
   * 用于 clone，或 {@link VisibleSprite} 与 {@link OffscreenSprite} 实例间的类型转换
   */
  copyStateTo(t) {
    h(t, ut, n(this, ut)), h(t, q, n(this, q)), t.zIndex = this.zIndex, t.opacity = this.opacity, t.flip = this.flip, t.rect = this.rect.clone(), t.time = { ...this.time };
  }
  destroy() {
    n(this, Ft).destroy();
  }
}
me = new WeakMap(), Ft = new WeakMap(), Nt = new WeakMap(), ut = new WeakMap(), q = new WeakMap();
function wn(s, t, e) {
  const i = s - e.delay;
  if (i / e.duration >= e.iterCount) return {};
  const r = i % e.duration, a = i === e.duration ? 1 : r / e.duration, o = t.findIndex((x) => x[0] >= a);
  if (o === -1) return {};
  const c = t[o - 1], l = t[o], m = l[1];
  if (c == null) return m;
  const u = c[1], w = {}, p = (a - c[0]) / (l[0] - c[0]);
  for (const x in m) {
    const f = x;
    u[f] != null && (w[f] = (m[f] - u[f]) * p + u[f]);
  }
  return w;
}
var Rt, ft, pe;
const We = class We extends yi {
  constructor(e) {
    super();
    d(this, Rt);
    // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
    d(this, ft, null);
    d(this, pe, !1);
    h(this, Rt, e), this.ready = e.ready.then(({ width: i, height: r, duration: a }) => {
      this.rect.w = this.rect.w === 0 ? i : this.rect.w, this.rect.h = this.rect.h === 0 ? r : this.rect.h, this.time.duration = this.time.duration === 0 ? a : this.time.duration;
    });
  }
  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  async offscreenRender(e, i) {
    var p;
    const r = i * this.time.playbackRate;
    this.animate(r), super._render(e);
    const { w: a, h: o } = this.rect, { video: c, audio: l, state: m } = await n(this, Rt).tick(r);
    let u = l ?? [];
    if (l != null && this.time.playbackRate !== 1 && (u = l.map(
      (x) => li(x, this.time.playbackRate)
    )), m === "done")
      return {
        audio: u,
        done: !0
      };
    const w = c ?? n(this, ft);
    return w != null && e.drawImage(w, -a / 2, -o / 2, a, o), c != null && ((p = n(this, ft)) == null || p.close(), h(this, ft, c)), {
      audio: u,
      done: !1
    };
  }
  async clone() {
    const e = new We(await n(this, Rt).clone());
    return await e.ready, this.copyStateTo(e), e;
  }
  destroy() {
    var e;
    n(this, pe) || (h(this, pe, !0), A.info("OffscreenSprite destroy"), super.destroy(), (e = n(this, ft)) == null || e.close(), h(this, ft, null), n(this, Rt).destroy());
  }
};
Rt = new WeakMap(), ft = new WeakMap(), pe = new WeakMap();
let ri = We;
var Ht, mt, Et, $t, we, Me, Pt, ye;
const Xe = class Xe extends yi {
  constructor(e) {
    super();
    d(this, we);
    d(this, Ht);
    /**
     * 元素是否可见，用于不想删除，期望临时隐藏 Sprite 的场景
     */
    S(this, "visible", !0);
    // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
    d(this, mt, null);
    d(this, Et, []);
    d(this, $t, !1);
    d(this, Pt, -1);
    d(this, ye, !1);
    h(this, Ht, e), this.ready = e.ready.then(({ width: i, height: r, duration: a }) => {
      this.rect.w = this.rect.w === 0 ? i : this.rect.w, this.rect.h = this.rect.h === 0 ? r : this.rect.h, this.time.duration = this.time.duration === 0 ? a : this.time.duration;
    });
  }
  getClip() {
    return n(this, Ht);
  }
  /**
   * 提前准备指定 time 的帧
   */
  preFrame(e) {
    n(this, Pt) !== e && (O(this, we, Me).call(this, e), h(this, Pt, e));
  }
  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  render(e, i) {
    this.animate(i), super._render(e);
    const { w: r, h: a } = this.rect;
    n(this, Pt) !== i && O(this, we, Me).call(this, i), h(this, Pt, i);
    const o = n(this, Et);
    h(this, Et, []);
    const c = n(this, mt);
    return c != null && e.drawImage(c, -r / 2, -a / 2, r, a), { audio: o };
  }
  copyStateTo(e) {
    super.copyStateTo(e), e instanceof Xe && (e.visible = this.visible);
  }
  destroy() {
    var e;
    n(this, ye) || (h(this, ye, !0), A.info("VisibleSprite destroy"), super.destroy(), (e = n(this, mt)) == null || e.close(), h(this, mt, null));
  }
};
Ht = new WeakMap(), mt = new WeakMap(), Et = new WeakMap(), $t = new WeakMap(), we = new WeakSet(), Me = function(e) {
  n(this, $t) || (h(this, $t, !0), n(this, Ht).tick(e * this.time.playbackRate).then(({ video: i, audio: r }) => {
    var a;
    i != null && ((a = n(this, mt)) == null || a.close(), h(this, mt, i ?? null)), h(this, Et, r ?? []), r != null && this.time.playbackRate !== 1 && h(this, Et, r.map(
      (o) => li(o, this.time.playbackRate)
    ));
  }).finally(() => {
    h(this, $t, !1);
  }));
}, Pt = new WeakMap(), ye = new WeakMap();
let ai = Xe, yn = 0;
async function gi(s) {
  s() > 50 && (await Ue(15), await gi(s));
}
var Z, ge, H, Wt, be, xe, Dt, Xt, pt, Gt, bi, xi;
class En {
  /**
   * 根据配置创建合成器实例
   * @param opts ICombinatorOpts
   */
  constructor(t = {}) {
    d(this, Gt);
    d(this, Z, A.create(`id:${yn++},`));
    d(this, ge, !1);
    d(this, H, []);
    d(this, Wt);
    d(this, be);
    // 中断输出
    d(this, xe, null);
    d(this, Dt);
    d(this, Xt);
    d(this, pt, new Ve());
    S(this, "on", n(this, pt).on);
    const { width: e = 0, height: i = 0 } = t;
    h(this, Wt, new OffscreenCanvas(e, i));
    const r = n(this, Wt).getContext("2d", { alpha: !1 });
    if (r == null) throw Error("Can not create 2d offscreen context");
    h(this, be, r), h(this, Dt, Object.assign(
      {
        bgColor: "#000",
        width: 0,
        height: 0,
        videoCodec: "avc1.42E032",
        audio: !0,
        bitrate: 5e6,
        fps: 30,
        metaDataTags: null
      },
      t
    )), h(this, Xt, e * i > 0);
  }
  /**
   * 检测当前环境的兼容性
   * @param args.videoCodec 指定视频编码格式，默认 avc1.42E032
   * @param args.width 指定视频宽度，默认 1920
   * @param args.height 指定视频高度，默认 1080
   * @param args.bitrate 指定视频比特率，默认 5e6
   */
  static async isSupported(t = {}) {
    return (self.OffscreenCanvas != null && self.VideoEncoder != null && self.VideoDecoder != null && self.VideoFrame != null && self.AudioEncoder != null && self.AudioDecoder != null && self.AudioData != null && ((await self.VideoEncoder.isConfigSupported({
      codec: t.videoCodec ?? "avc1.42E032",
      width: t.width ?? 1920,
      height: t.height ?? 1080,
      bitrate: t.bitrate ?? 7e6
    })).supported ?? !1) && (await self.AudioEncoder.isConfigSupported({
      codec: T.codec,
      sampleRate: T.sampleRate,
      numberOfChannels: T.channelCount
    })).supported) ?? !1;
  }
  /**
   * 添加用于合成视频的 Sprite，视频时长默认取所有素材 duration 字段的最大值
   * @param os Sprite
   * @param opts.main 如果 main 为 true，视频时长为该素材的 duration 值
   */
  async addSprite(t, e = {}) {
    const i = {
      rect: Cn(["x", "y", "w", "h"], t.rect),
      time: { ...t.time },
      zIndex: t.zIndex
    };
    n(this, Z).info("Combinator add sprite", i);
    const r = await t.clone();
    n(this, Z).info("Combinator add sprite ready"), n(this, H).push(
      Object.assign(r, {
        main: e.main ?? !1,
        expired: !1
      })
    ), n(this, H).sort((a, o) => a.zIndex - o.zIndex);
  }
  /**
   * 输出视频文件二进制流
   */
  output() {
    if (n(this, H).length === 0) throw Error("No sprite added");
    const t = n(this, H).find((l) => l.main), e = t != null ? t.time.offset + t.time.duration : Math.max(
      ...n(this, H).map((l) => l.time.offset + l.time.duration)
    );
    if (e === 1 / 0)
      throw Error(
        "Unable to determine the end time, please specify a main sprite, or limit the duration of ImgClip, AudioCli"
      );
    e === -1 && n(this, Z).warn(
      "Unable to determine the end time, process value don't update"
    ), n(this, Z).info(`start combinate video, maxTime:${e}`);
    const i = O(this, Gt, bi).call(this, e);
    let r = performance.now();
    const a = O(this, Gt, xi).call(this, i, e, {
      onProgress: (l) => {
        n(this, Z).debug("OutputProgress:", l), n(this, pt).emit("OutputProgress", l);
      },
      onEnded: async () => {
        await i.flush(), n(this, Z).info(
          "===== output ended =====, cost:",
          performance.now() - r
        ), n(this, pt).emit("OutputProgress", 1), this.destroy();
      },
      onError: (l) => {
        n(this, pt).emit("error", l), c(l), this.destroy();
      }
    });
    h(this, xe, () => {
      a(), i.close(), c();
    });
    const { stream: o, stop: c } = oi(
      i.mp4file,
      500,
      this.destroy
    );
    return o;
  }
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    var t;
    n(this, ge) || (h(this, ge, !0), (t = n(this, xe)) == null || t.call(this), n(this, pt).destroy());
  }
}
Z = new WeakMap(), ge = new WeakMap(), H = new WeakMap(), Wt = new WeakMap(), be = new WeakMap(), xe = new WeakMap(), Dt = new WeakMap(), Xt = new WeakMap(), pt = new WeakMap(), Gt = new WeakSet(), bi = function(t) {
  const { fps: e, width: i, height: r, videoCodec: a, bitrate: o, audio: c, metaDataTags: l } = n(this, Dt);
  return Ai({
    video: n(this, Xt) ? {
      width: i,
      height: r,
      expectFPS: e,
      codec: a,
      bitrate: o,
      __unsafe_hardwareAcceleration__: n(this, Dt).__unsafe_hardwareAcceleration__
    } : null,
    audio: c === !1 ? null : {
      codec: "aac",
      sampleRate: T.sampleRate,
      channelCount: T.channelCount
    },
    duration: t,
    metaDataTags: l
  });
}, xi = function(t, e, {
  onProgress: i,
  onEnded: r,
  onError: a
}) {
  let o = 0;
  const c = { aborted: !1 };
  let l = null;
  (async () => {
    const { fps: p, bgColor: x, audio: f } = n(this, Dt), y = Math.round(1e6 / p), g = n(this, be), b = gn({
      ctx: g,
      bgColor: x,
      sprites: n(this, H),
      aborter: c
    }), C = bn({
      remux: t,
      ctx: g,
      cvs: n(this, Wt),
      outputAudio: f,
      hasVideoTrack: n(this, Xt),
      timeSlice: y,
      fps: p
    });
    let v = 0;
    for (; ; ) {
      if (l != null) return;
      if (c.aborted || e !== -1 && v > e || n(this, H).length === 0) {
        w(), await r();
        return;
      }
      o = v / e;
      const { audios: k, mainSprDone: $ } = await b(v);
      if ($) {
        w(), await r();
        return;
      }
      if (c.aborted) return;
      C(v, k), v += y, await gi(t.getEncodeQueueSize);
    }
  })().catch((p) => {
    l = p, n(this, Z).error(p), w(), a(p);
  });
  const u = setInterval(() => {
    i(o);
  }, 500), w = () => {
    c.aborted || (c.aborted = !0, clearInterval(u), n(this, H).forEach((p) => p.destroy()));
  };
  return w;
};
function gn(s) {
  const { ctx: t, bgColor: e, sprites: i, aborter: r } = s, { width: a, height: o } = t.canvas;
  return async (c) => {
    t.fillStyle = e, t.fillRect(0, 0, a, o);
    const l = [];
    let m = !1;
    for (const u of i) {
      if (r.aborted) break;
      if (c < u.time.offset || u.expired) continue;
      t.save();
      const { audio: w, done: p } = await u.offscreenRender(t, c - u.time.offset);
      l.push(w), t.restore(), (u.time.duration > 0 && c > u.time.offset + u.time.duration || p) && (u.main && (m = !0), u.destroy(), u.expired = !0);
    }
    return {
      audios: l,
      mainSprDone: m
    };
  };
}
function bn(s) {
  const { ctx: t, cvs: e, outputAudio: i, remux: r, hasVideoTrack: a, timeSlice: o } = s, { width: c, height: l } = e;
  let m = 0;
  const u = Math.floor(3 * s.fps), w = xn(1024);
  return (p, x) => {
    if (i !== !1)
      for (const f of w(p, x)) r.encodeAudio(f);
    if (a) {
      const f = new VideoFrame(e, {
        duration: o,
        timestamp: p
      });
      r.encodeVideo(f, {
        keyFrame: m % u === 0
      }), t.resetTransform(), t.clearRect(0, 0, c, l), m += 1;
    }
  };
}
function xn(s) {
  const t = s * T.channelCount, e = new Float32Array(t * 3);
  let i = 0, r = 0;
  const a = s / T.sampleRate * 1e6, o = new Float32Array(t), c = (l) => {
    let m = 0;
    const u = Math.floor(i / t), w = [];
    for (let p = 0; p < u; p++)
      w.push(
        new AudioData({
          timestamp: r,
          numberOfChannels: T.channelCount,
          numberOfFrames: s,
          sampleRate: T.sampleRate,
          format: "f32",
          data: e.subarray(m, m + t)
        })
      ), m += t, r += a;
    for (e.set(e.subarray(m, i), 0), i -= m; l - r > a; )
      w.push(
        new AudioData({
          timestamp: r,
          numberOfChannels: T.channelCount,
          numberOfFrames: s,
          sampleRate: T.sampleRate,
          format: "f32",
          data: o
        })
      ), r += a;
    return w;
  };
  return (l, m) => {
    var w, p;
    const u = Math.max(...m.map((x) => {
      var f;
      return ((f = x[0]) == null ? void 0 : f.length) ?? 0;
    }));
    for (let x = 0; x < u; x++) {
      let f = 0, y = 0;
      for (let g = 0; g < m.length; g++) {
        const b = ((w = m[g][0]) == null ? void 0 : w[x]) ?? 0, C = ((p = m[g][1]) == null ? void 0 : p[x]) ?? b;
        f += b, y += C;
      }
      e[i] = f, e[i + 1] = y, i += 2;
    }
    return c(l);
  };
}
function Cn(s, t) {
  return s.reduce(
    (e, i) => (e[i] = t[i], e),
    {}
  );
}
export {
  ti as AudioClip,
  En as Combinator,
  ii as EmbedSubtitlesClip,
  Ze as ImgClip,
  Bn as Log,
  Qe as MP4Clip,
  ei as MediaStreamClip,
  ri as OffscreenSprite,
  _e as Rect,
  ai as VisibleSprite,
  Rn as createChromakey,
  tn as fastConcatMP4,
  In as fixFMP4Duration,
  Fn as mixinMP4AndAudio,
  kn as renderTxt2ImgBitmap
};
//# sourceMappingURL=av-cliper.js.map
