import mp4box, {
  AudioTrackOpts,
  ESDSBoxParser,
  MP4ABoxParser,
  MP4ArrayBuffer,
  MP4File,
  MP4Info,
  MP4Sample,
  TrakBoxParser,
  VideoTrackOpts,
} from '@webav/mp4box.js';
import { file } from 'opfs-tools';
import { DEFAULT_AUDIO_CONF } from '../clips';

export function extractFileConfig(file: MP4File, info: MP4Info) {
  const vTrack = info.videoTracks[0];
  const rs: {
    videoTrackConf?: VideoTrackOpts;
    videoDecoderConf?: Parameters<VideoDecoder['configure']>[0];
    audioTrackConf?: AudioTrackOpts;
    audioDecoderConf?: Parameters<AudioDecoder['configure']>[0];
  } = {};
  if (vTrack != null) {
    const videoDesc = parseVideoCodecDesc(file.getTrackById(vTrack.id))?.buffer;
    const { descKey, type } = vTrack.codec.startsWith('avc1')
      ? { descKey: 'avcDecoderConfigRecord', type: 'avc1' }
      : vTrack.codec.startsWith('hvc1')
        ? { descKey: 'hevcDecoderConfigRecord', type: 'hvc1' }
        : { descKey: '', type: '' };
    if (descKey !== '') {
      rs.videoTrackConf = {
        timescale: vTrack.timescale,
        duration: vTrack.duration,
        width: vTrack.video.width,
        height: vTrack.video.height,
        brands: info.brands,
        type,
        [descKey]: videoDesc,
      };
    }

    rs.videoDecoderConf = {
      codec: vTrack.codec,
      codedHeight: vTrack.video.height,
      codedWidth: vTrack.video.width,
      description: videoDesc as ArrayBuffer,
    };
  }

  const aTrack = info.audioTracks[0];
  if (aTrack != null) {
    const esdsBox = getESDSBoxFromMP4File(file);
    const audioInfo = esdsBox == null ? {} : parseAudioInfoFromESDSBox(esdsBox);

    rs.audioTrackConf = {
      timescale: aTrack.timescale,
      samplerate: audioInfo.sampleRate ?? aTrack.audio.sample_rate,
      channel_count: audioInfo.numberOfChannels ?? aTrack.audio.channel_count,
      hdlr: 'soun',
      type: aTrack.codec.startsWith('mp4a') ? 'mp4a' : aTrack.codec,
      description: esdsBox,
    };

    rs.audioDecoderConf = {
      codec: audioInfo.codec ?? DEFAULT_AUDIO_CONF.codec,
      numberOfChannels:
        audioInfo.numberOfChannels ?? aTrack.audio.channel_count,
      sampleRate: audioInfo.sampleRate ?? aTrack.audio.sample_rate,
    };
  }
  return rs;
}

// track is H.264, H.265 or VPX.
function parseVideoCodecDesc(track: TrakBoxParser): Uint8Array | undefined {
  for (const entry of track.mdia.minf.stbl.stsd.entries) {
    // @ts-expect-error
    const box = entry.avcC ?? entry.hvcC ?? entry.av1C ?? entry.vpcC;
    if (box != null) {
      const stream = new mp4box.DataStream(
        undefined,
        0,
        mp4box.DataStream.BIG_ENDIAN,
      );
      box.write(stream);
      return new Uint8Array(stream.buffer.slice(8)); // Remove the box header.
    }
  }
  return undefined;
}

function getESDSBoxFromMP4File(file: MP4File, codec = 'mp4a') {
  const mp4aBox = file.moov?.traks
    .map((t) => t.mdia.minf.stbl.stsd.entries)
    .flat()
    .find(({ type }) => type === codec) as MP4ABoxParser;

  return mp4aBox?.esds;
}

// 从 ESDS Box 中解析出音频配置信息，解决封装层音频信息标识错误，导致解码异常
function parseAudioInfoFromESDSBox(esds: ESDSBoxParser): {
  codec?: string;
  sampleRate?: number;
  numberOfChannels?: number;
} {
  let codec = 'mp4a';
  const decConfDesc = esds.esd.descs[0];
  if (decConfDesc == null) return {};
  codec += '.' + decConfDesc.oti.toString(16);

  const decSpecInfo = decConfDesc.descs[0];
  if (decSpecInfo == null) return { codec };

  // ref: https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Audio_Specific_Config
  const audioObjectType = (decSpecInfo.data[0] & 0xf8) >> 3;
  codec += '.' + audioObjectType;

  const [byte1, byte2] = decSpecInfo.data;
  // sampleRate 是第一字节后 3bit + 第二字节前 1bit
  const sampleRateIdx = ((byte1 & 0x07) << 1) + (byte2 >> 7);
  // numberOfChannels 是第二字节 [2, 5] 4bit
  const numberOfChannels = (byte2 & 0x7f) >> 3;
  const sampleRateEnum = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
    8000, 7350,
  ] as const;

  return {
    codec,
    sampleRate: sampleRateEnum[sampleRateIdx],
    numberOfChannels,
  };
}

/**
 * 快速解析 mp4 文件，如果是非 fMP4 格式，会优先解析 moov box（略过 mdat）避免占用过多内存
 */
export async function quickParseMP4File(
  reader: Awaited<ReturnType<ReturnType<typeof file>['createReader']>>,
  onReady: (data: { mp4boxFile: MP4File; info: MP4Info }) => void,
  onSamples: (
    id: number,
    sampleType: 'video' | 'audio',
    samples: MP4Sample[],
  ) => void,
) {
  const mp4boxFile = mp4box.createFile(false);
  mp4boxFile.onReady = (info) => {
    onReady({ mp4boxFile, info });
    const vTrackId = info.videoTracks[0]?.id;
    if (vTrackId != null)
      mp4boxFile.setExtractionOptions(vTrackId, 'video', { nbSamples: 100 });

    const aTrackId = info.audioTracks[0]?.id;
    if (aTrackId != null)
      mp4boxFile.setExtractionOptions(aTrackId, 'audio', { nbSamples: 100 });

    mp4boxFile.start();
  };
  mp4boxFile.onSamples = onSamples;

  await parse();

  async function parse() {
    let cursor = 0;
    const maxReadSize = 30 * 1024 * 1024;
    while (true) {
      const data = (await reader.read(maxReadSize, {
        at: cursor,
      })) as MP4ArrayBuffer;
      if (data.byteLength === 0) break;
      data.fileStart = cursor;
      const nextPos = mp4boxFile.appendBuffer(data);
      if (nextPos == null) break;
      cursor = nextPos;
    }

    mp4boxFile.stop();
  }
}

export function parseMatrix(matrix?: Int32Array) {
  if (matrix?.length !== 9) return {};

  const signedMatrix = new Int32Array(matrix.buffer);

  // 提取并转成浮点数
  const a = signedMatrix[0] / 65536.0;
  const b = signedMatrix[1] / 65536.0;
  const c = signedMatrix[3] / 65536.0;
  const d = signedMatrix[4] / 65536.0;
  const tx = signedMatrix[6] / 65536.0; // 一般是 0
  const ty = signedMatrix[7] / 65536.0; // 一般是 0
  const w = signedMatrix[8] / (1 << 30); // 一般是 1

  // 缩放
  const scaleX = Math.sqrt(a * a + c * c);
  const scaleY = Math.sqrt(b * b + d * d);

  // 旋转角度（弧度）
  const rotationRad = Math.atan2(c, a);
  const rotationDeg = (rotationRad * 180) / Math.PI;

  return {
    scaleX,
    scaleY,
    rotationRad,
    rotationDeg,
    translateX: tx,
    translateY: ty,
    perspective: w,
  };
}

/**
 * 旋转 VideoFrame
 */
export function createVFRotater(
  width: number,
  height: number,
  rotationDeg: number,
) {
  const normalizedRotation = (Math.round(rotationDeg / 90) * 90 + 360) % 360;
  if (normalizedRotation === 0) return (vf: VideoFrame | null) => vf;

  const rotatedWidth =
    normalizedRotation === 90 || normalizedRotation === 270 ? height : width;
  const rotatedHeight =
    normalizedRotation === 90 || normalizedRotation === 270 ? width : height;

  const canvas = new OffscreenCanvas(rotatedWidth, rotatedHeight);
  const ctx = canvas.getContext('2d')!;

  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate((-normalizedRotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  return (vf: VideoFrame | null) => {
    if (vf == null) return null;

    ctx.drawImage(vf, 0, 0);
    const newVF = new VideoFrame(canvas, {
      timestamp: vf.timestamp,
      duration: vf.duration ?? undefined,
    });
    vf.close();
    return newVF;
  };
}
