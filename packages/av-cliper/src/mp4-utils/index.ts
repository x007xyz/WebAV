import mp4box, {
  MP4File,
  MP4Sample,
  SampleOpts,
  TrakBoxParser,
} from '@webav/mp4box.js';
import { autoReadStream, file2stream, Log } from '@fly-cut/internal-utils';
import {
  extractPCM4AudioData,
  extractPCM4AudioBuffer,
  mixinPCM,
  ringSliceFloat32Array,
  concatPCMFragments,
} from '../av-utils';
import { DEFAULT_AUDIO_CONF } from '../clips';
import { SampleTransform } from './sample-transform';
import { extractFileConfig } from './mp4box-utils';
import { tmpfile, write } from 'opfs-tools';

function fixMP4BoxFileDuration(
  inMP4File: MP4File,
): () => Promise<ReadableStream<Uint8Array> | null> {
  let sendedBoxIdx = 0;
  const boxes = inMP4File.boxes;
  const tracks: Array<{ track: TrakBoxParser; id: number }> = [];
  let totalDuration = 0;

  async function write2TmpFile() {
    const buf = box2Buf(boxes, sendedBoxIdx);
    sendedBoxIdx = boxes.length;
    // 释放引用，避免内存泄露
    // todo: use unsafeReleaseMP4BoxFile
    tracks.forEach(({ track, id }) => {
      const s = track.samples.at(-1);
      if (s != null)
        totalDuration = Math.max(totalDuration, s.cts + s.duration);

      inMP4File.releaseUsedSamples(id, track.samples.length);
      track.samples = [];
    });
    inMP4File.mdats = [];
    inMP4File.moofs = [];
    if (buf != null) await tmpFileWriter?.write(buf);
  }

  let moovPrevBoxes: typeof boxes = [];
  function moovBoxReady() {
    if (moovPrevBoxes.length > 0) return true;

    const moovIdx = boxes.findIndex((box) => box.type === 'moov');
    if (moovIdx === -1) return false;

    moovPrevBoxes = boxes.slice(0, moovIdx + 1);
    sendedBoxIdx = moovIdx + 1;

    if (tracks.length === 0) {
      for (let i = 1; true; i += 1) {
        const track = inMP4File.getTrackById(i);
        if (track == null) break;
        tracks.push({ track, id: i });
      }
    }

    return true;
  }

  let timerId = 0;
  // 把 moov 之外的 box 先写入临时文件，待更新 duration 之后再拼接临时文件
  const postFile = tmpfile();
  let tmpFileWriter: Awaited<
    ReturnType<ReturnType<typeof tmpfile>['createWriter']>
  > | null = null;

  const initPromise = (async () => {
    tmpFileWriter = await postFile.createWriter();

    timerId = self.setInterval(() => {
      if (!moovBoxReady()) return;
      write2TmpFile();
    }, 100);
  })();

  let stoped = false;
  return async () => {
    if (stoped) throw Error('File exported');
    stoped = true;

    await initPromise;
    clearInterval(timerId);

    if (!moovBoxReady() || tmpFileWriter == null) return null;
    inMP4File.flush();
    await write2TmpFile();
    await tmpFileWriter?.close();

    const moov = moovPrevBoxes.find((box) => box.type === 'moov') as
      | typeof inMP4File.moov
      | undefined;
    if (moov == null) return null;

    moov.mvhd.duration = totalDuration;

    const rsFile = tmpfile();
    const buf = box2Buf(moovPrevBoxes, 0)!;
    await write(rsFile, buf);
    await write(rsFile, postFile, { overwrite: false });

    return await rsFile.stream();
  };

  function box2Buf(source: typeof boxes, startIdx: number): Uint8Array | null {
    if (startIdx >= source.length) return null;

    const ds = new mp4box.DataStream();
    ds.endianness = mp4box.DataStream.BIG_ENDIAN;

    for (let i = startIdx; i < source.length; i++) {
      if (source[i] === null) continue;
      source[i].write(ds);
      delete source[i];
    }
    return new Uint8Array(ds.buffer);
  }
}

/**
 * EncodedAudioChunk | EncodedVideoChunk 转换为 MP4 addSample 需要的参数
 */
function chunk2MP4SampleOpts(
  chunk: EncodedAudioChunk | EncodedVideoChunk,
): SampleOpts & {
  data: ArrayBuffer;
} {
  const buf = new ArrayBuffer(chunk.byteLength);
  chunk.copyTo(buf);
  const dts = chunk.timestamp;
  return {
    duration: chunk.duration ?? 0,
    dts,
    cts: dts,
    is_sync: chunk.type === 'key',
    data: buf,
  };
}

/**
 * 快速拼接多个mp4 文件流，要求所有 mp4 的属性一致，
 * 属性包括（不限于）：音视频编码格式、分辨率、采样率
 *
 * @param streams 一个包含 Uint8Array 的可读流数组。
 * @returns 返回一个 Promise，该 Promise 在解析时返回一个包含合并后的 MP4 数据的可读流。
 * @throws 如果无法从流生成文件，将抛出错误。
 *
 * @example
 * const streams = [stream1, stream2, stream3];
 * const resultStream = await fastConcatMP4(streams);
 */
export async function fastConcatMP4(
  streams: ReadableStream<Uint8Array>[],
): Promise<ReadableStream<Uint8Array>> {
  const outfile = mp4box.createFile();

  const dumpFile = fixMP4BoxFileDuration(outfile);
  await concatStreamsToMP4BoxFile(streams, outfile);
  const outStream = await dumpFile();
  if (outStream == null) throw Error('Can not generate file from streams');
  return outStream;
}

async function concatStreamsToMP4BoxFile(
  streams: ReadableStream<Uint8Array>[],
  outfile: MP4File,
) {
  let vTrackId = 0;
  let vDTS = 0;
  let vCTS = 0;
  let aTrackId = 0;
  let aDTS = 0;
  let aCTS = 0;
  // ts bug, 不能正确识别类型
  let lastVSamp: any = null;
  let lastASamp: any = null;
  for (const stream of streams) {
    await new Promise<void>(async (resolve) => {
      autoReadStream(stream.pipeThrough(new SampleTransform()), {
        onDone: resolve,
        onChunk: async ({ chunkType, data }) => {
          if (chunkType === 'ready') {
            const { videoTrackConf, audioTrackConf } = extractFileConfig(
              data.file,
              data.info,
            );
            if (vTrackId === 0 && videoTrackConf != null) {
              vTrackId = outfile.addTrack(videoTrackConf);
            }
            if (aTrackId === 0 && audioTrackConf != null) {
              aTrackId = outfile.addTrack(audioTrackConf);
            }
          } else if (chunkType === 'samples') {
            const { type, samples } = data;
            const trackId = type === 'video' ? vTrackId : aTrackId;
            const offsetDTS = type === 'video' ? vDTS : aDTS;
            const offsetCTS = type === 'video' ? vCTS : aCTS;

            samples.forEach((s) => {
              outfile.addSample(trackId, s.data, {
                duration: s.duration,
                dts: s.dts + offsetDTS,
                cts: s.cts + offsetCTS,
                is_sync: s.is_sync,
              });
            });

            const lastSamp = samples.at(-1);
            if (lastSamp == null) return;
            if (type === 'video') {
              lastVSamp = lastSamp;
            } else if (type === 'audio') {
              lastASamp = lastSamp;
            }
          }
        },
      });
    });
    if (lastVSamp != null) {
      vDTS += lastVSamp.dts;
      vCTS += lastVSamp.cts;
    }
    if (lastASamp != null) {
      aDTS += lastASamp.dts;
      aCTS += lastASamp.cts;
    }
  }
}

/**
 * 为 WebAV 生成的 fmp4 文件设置正确的时长值
 */
export async function fixFMP4Duration(
  stream: ReadableStream<Uint8Array>,
): Promise<ReadableStream<Uint8Array>> {
  return await fastConcatMP4([stream]);
}

/**
 * 创建 MP4 音频样本解码器。
 * @param adConf - 音频解码器配置参数 {@link AudioDecoderConfig}。
 * @returns 返回一个对象，包含 `decode` 和 `close` 方法。
 * - `decode` 方法用于解码 MP4 音频样本，返回解码后的音频数据数组。
 * - `close` 方法用于关闭音频解码器。
 */
function createMP4AudioSampleDecoder(
  adConf: Parameters<AudioDecoder['configure']>[0],
) {
  let cacheAD: AudioData[] = [];
  const adDecoder = new AudioDecoder({
    output: (ad) => {
      cacheAD.push(ad);
    },
    error: Log.error,
  });
  adDecoder.configure(adConf);

  return {
    decode: async (ss: MP4Sample[]) => {
      ss.forEach((s) => {
        adDecoder.decode(
          new EncodedAudioChunk({
            type: s.is_sync ? 'key' : 'delta',
            timestamp: (1e6 * s.cts) / s.timescale,
            duration: (1e6 * s.duration) / s.timescale,
            data: s.data,
          }),
        );
      });

      await adDecoder.flush();

      const rs = cacheAD;
      cacheAD = [];

      return rs;
    },
    close: () => {
      adDecoder.close();
    },
  };
}

// 音频编码与解码API有很大区别，
// 是因为编码中途调用 AudioEncoder.flush ，会导致声音听起来卡顿
function createMP4AudioSampleEncoder(
  aeConf: Parameters<AudioEncoder['configure']>[0],
  onOutput: (s: ReturnType<typeof chunk2MP4SampleOpts>) => void,
) {
  const encoderConf = {
    codec: aeConf.codec,
    sampleRate: aeConf.sampleRate,
    numberOfChannels: aeConf.numberOfChannels,
  } as const;

  const adEncoder = new AudioEncoder({
    output: (chunk) => {
      onOutput(chunk2MP4SampleOpts(chunk));
    },
    error: (err) => {
      Log.error('AudioEncoder error:', err, ', config:', encoderConf);
    },
  });

  adEncoder.configure(encoderConf);

  // 保留一个音频数据，用于最后做声音淡出
  let lastData: { data: Float32Array; ts: number } | null = null;

  function createAD(data: Float32Array, ts: number) {
    return new AudioData({
      timestamp: ts,
      numberOfChannels: aeConf.numberOfChannels,
      numberOfFrames: data.length / aeConf.numberOfChannels,
      sampleRate: aeConf.sampleRate,
      format: 'f32-planar',
      data,
    });
  }
  return {
    encode: async (data: Float32Array, ts: number) => {
      if (lastData != null) {
        adEncoder.encode(createAD(lastData.data, lastData.ts));
      }
      lastData = { data, ts };
    },
    stop: async () => {
      if (lastData != null) {
        // 副作用修改数据
        audioFade(lastData.data, aeConf.numberOfChannels, aeConf.sampleRate);
        adEncoder.encode(createAD(lastData.data, lastData.ts));
        lastData = null;
      }
      await adEncoder.flush();
      adEncoder.close();
    },
  };
}

/**
 * 音频线性淡出，避免 POP 声
 * 副作用调整音量值
 */
function audioFade(pcmData: Float32Array, chanCnt: number, sampleRate: number) {
  const dataLen = pcmData.length - 1;
  // 避免超出边界，最长 500ms 的淡出时间
  const fadeLen = Math.min(sampleRate / 2, dataLen);
  for (let i = 0; i < fadeLen; i++) {
    for (let j = 1; j <= chanCnt; j++) {
      // 从尾部开始，调整每个声道音量值
      pcmData[Math.floor(dataLen / j) - i] *= i / fadeLen;
    }
  }
}

/**
 * 视频配音；混合 MP4 与音频文件，仅重编码音频，视频轨道不变
 * @param mp4Stream - MP4 流
 * @param audio - 音频信息
 * @param audio.stream - 音频数据流
 * @param audio.volume - 音频音量
 * @param audio.loop - 音频时长小于视频时，是否循环使用音频流
 * @returns 输出混合后的音频流
 */
export function mixinMP4AndAudio(
  mp4Stream: ReadableStream<Uint8Array>,
  audio: {
    stream: ReadableStream<Uint8Array>;
    volume: number;
    loop: boolean;
  },
) {
  Log.info('mixinMP4AndAudio, opts:', {
    volume: audio.volume,
    loop: audio.loop,
  });

  const outfile = mp4box.createFile();
  const { stream: outStream, stop: stopOut } = file2stream(outfile, 500);

  let audioSampleDecoder: ReturnType<
    typeof createMP4AudioSampleDecoder
  > | null = null;

  let audioSampleEncoder: ReturnType<
    typeof createMP4AudioSampleEncoder
  > | null = null;

  let inputAudioPCM: Float32Array[] = [];

  let vTrackId = 0;
  let aTrackId = 0;
  let audioOffset = 0;
  let mp4HasAudio = true;
  let sampleRate = DEFAULT_AUDIO_CONF.sampleRate as number;
  autoReadStream(mp4Stream.pipeThrough(new SampleTransform()), {
    onDone: async () => {
      await audioSampleEncoder?.stop();
      audioSampleDecoder?.close();
      stopOut();
    },
    onChunk: async ({ chunkType, data }) => {
      if (chunkType === 'ready') {
        const { videoTrackConf, audioTrackConf, audioDecoderConf } =
          extractFileConfig(data.file, data.info);
        if (vTrackId === 0 && videoTrackConf != null) {
          vTrackId = outfile.addTrack(videoTrackConf);
        }

        const safeAudioTrackConf = audioTrackConf ?? {
          timescale: 1e6,
          samplerate: sampleRate,
          channel_count: DEFAULT_AUDIO_CONF.channelCount,
          hdlr: 'soun',
          name: 'SoundHandler',
          type: 'mp4a',
        };
        if (aTrackId === 0) {
          aTrackId = outfile.addTrack(safeAudioTrackConf);
          sampleRate = audioTrackConf?.samplerate ?? sampleRate;
          mp4HasAudio = audioTrackConf == null ? false : true;
        }
        const audioCtx = new AudioContext({ sampleRate });
        inputAudioPCM = extractPCM4AudioBuffer(
          await audioCtx.decodeAudioData(
            await new Response(audio.stream).arrayBuffer(),
          ),
        );

        if (audioDecoderConf != null) {
          audioSampleDecoder = createMP4AudioSampleDecoder(audioDecoderConf);
        }
        audioSampleEncoder = createMP4AudioSampleEncoder(
          audioDecoderConf ?? {
            codec:
              safeAudioTrackConf.type === 'mp4a'
                ? DEFAULT_AUDIO_CONF.codec
                : safeAudioTrackConf.type,
            numberOfChannels: safeAudioTrackConf.channel_count,
            sampleRate: safeAudioTrackConf.samplerate,
          },
          (s) => outfile.addSample(aTrackId, s.data, s),
        );
      } else if (chunkType === 'samples') {
        const { id, type, samples } = data;
        if (type === 'video') {
          samples.forEach((s) => outfile.addSample(id, s.data, s));

          if (!mp4HasAudio) await addInputAudio2Track(samples);
          return;
        }

        if (type === 'audio') await mixinAudioSampleAndInputPCM(samples);
      }
    },
  });

  function getInputAudioSlice(len: number) {
    const rs = inputAudioPCM.map((chanBuf) =>
      audio.loop
        ? ringSliceFloat32Array(chanBuf, audioOffset, audioOffset + len)
        : chanBuf.slice(audioOffset, audioOffset + len),
    );
    audioOffset += len;

    if (audio.volume !== 1) {
      for (const buf of rs)
        for (let i = 0; i < buf.length; i++) buf[i] *= audio.volume;
    }

    return rs;
  }

  async function addInputAudio2Track(vdieoSamples: MP4Sample[]) {
    const firstSamp = vdieoSamples[0];
    const lastSamp = vdieoSamples[vdieoSamples.length - 1];
    const pcmLength = Math.floor(
      ((lastSamp.cts + lastSamp.duration - firstSamp.cts) /
        lastSamp.timescale) *
        sampleRate,
    );
    const audioDataBuf = mixinPCM([getInputAudioSlice(pcmLength)]);
    if (audioDataBuf.length === 0) return;
    audioSampleEncoder?.encode(
      audioDataBuf,
      (firstSamp.cts / firstSamp.timescale) * 1e6,
    );
  }

  async function mixinAudioSampleAndInputPCM(samples: MP4Sample[]) {
    if (audioSampleDecoder == null) return;

    // 1. 先解码mp4音频
    // [[chan0, chan1], [chan0, chan1]...]
    const pcmFragments = (await audioSampleDecoder.decode(samples)).map(
      extractPCM4AudioData,
    );
    // [chan0, chan1]
    const mp4AudioPCM = concatPCMFragments(pcmFragments);
    const inputAudioPCM = getInputAudioSlice(mp4AudioPCM[0].length);
    const firstSamp = samples[0];

    // 3. 重编码音频
    audioSampleEncoder?.encode(
      // 2. 混合输入的音频
      mixinPCM([mp4AudioPCM, inputAudioPCM]),
      (firstSamp.cts / firstSamp.timescale) * 1e6,
    );
  }

  return outStream;
}
