import { decodeImg } from '../av-utils';
import { Log } from '@fly-cut/internal-utils';
import { IClip } from './iclip';

type AnimateImgType = 'avif' | 'webp' | 'png' | 'gif';

/**
 * 图像素材，支持动图
 *
 * 普通文字可通过 {@link renderTxt2ImgBitmap} 转换成图片素材
 *
 * @example
 * new ImgClip((await fetch('<img url>')).body);
 *
 * @example
 * new ImgClip(
 *   await renderTxt2ImgBitmap(
 *     '水印',
 *    `font-size:40px; color: white; text-shadow: 2px 2px 6px red;`,
 *   )
 * )
 *
 * @see [视频合成](https://webav-tech.github.io/WebAV/demo/2_1-concat-video)
 */
export class ImgClip implements IClip {
  ready: IClip['ready'];

  #meta = {
    // 微秒
    duration: 0,
    width: 0,
    height: 0,
  };

  /**
   * ⚠️ 静态图片的 duration 为 Infinity
   *
   * 使用 Sprite 包装时需要将它的 duration 设置为有限数
   *
   */
  get meta() {
    return { ...this.#meta };
  }

  #img: ImageBitmap | null = null;

  #frames: VideoFrame[] = [];

  /**
   * 静态图片可使用流、ImageBitmap 初始化
   *
   * 动图需要使用 VideoFrame[] 或提供图片类型
   */
  constructor(
    dataSource:
      | ReadableStream
      | ImageBitmap
      | VideoFrame[]
      | { type: `image/${AnimateImgType}`; stream: ReadableStream },
  ) {
    const initWithImgBitmap = (imgBitmap: ImageBitmap) => {
      this.#img = imgBitmap;
      this.#meta.width = imgBitmap.width;
      this.#meta.height = imgBitmap.height;
      this.#meta.duration = Infinity;
      return { ...this.#meta };
    };

    if (dataSource instanceof ReadableStream) {
      this.ready = new Response(dataSource)
        .blob()
        .then((data) => createImageBitmap(data))
        .then(initWithImgBitmap);
    } else if (dataSource instanceof ImageBitmap) {
      this.ready = Promise.resolve(initWithImgBitmap(dataSource));
    } else if (
      Array.isArray(dataSource) &&
      dataSource.every((it) => it instanceof VideoFrame)
    ) {
      this.#frames = dataSource;
      const frame = this.#frames[0];
      if (frame == null) throw Error('The frame count must be greater than 0');
      this.#meta = {
        width: frame.displayWidth,
        height: frame.displayHeight,
        duration: this.#frames.reduce(
          (acc, cur) => acc + (cur.duration ?? 0),
          0,
        ),
      };
      this.ready = Promise.resolve({ ...this.#meta, duration: Infinity });
    } else if ('type' in dataSource) {
      this.ready = this.#initAnimateImg(
        dataSource.stream,
        dataSource.type,
      ).then(() => ({
        width: this.#meta.width,
        height: this.#meta.height,
        duration: Infinity,
      }));
    } else {
      throw Error('Illegal arguments');
    }
  }

  async #initAnimateImg(
    stream: ReadableStream,
    type: `image/${AnimateImgType}`,
  ) {
    this.#frames = await decodeImg(stream, type);
    const firstVf = this.#frames[0];
    if (firstVf == null) throw Error('No frame available in gif');

    this.#meta = {
      duration: this.#frames.reduce((acc, cur) => acc + (cur.duration ?? 0), 0),
      width: firstVf.codedWidth,
      height: firstVf.codedHeight,
    };
    Log.info('ImgClip ready:', this.#meta);
  }

  tickInterceptor: <T extends Awaited<ReturnType<ImgClip['tick']>>>(
    time: number,
    tickRet: T,
  ) => Promise<T> = async (_, tickRet) => tickRet;

  async tick(time: number): Promise<{
    video: ImageBitmap | VideoFrame;
    state: 'success';
  }> {
    if (this.#img != null) {
      return await this.tickInterceptor(time, {
        video: await createImageBitmap(this.#img),
        state: 'success',
      });
    }
    const tt = time % this.#meta.duration;
    return await this.tickInterceptor(time, {
      video: (
        this.#frames.find(
          (f) => tt >= f.timestamp && tt <= f.timestamp + (f.duration ?? 0),
        ) ?? this.#frames[0]
      ).clone(),
      state: 'success',
    });
  }

  async split(time: number) {
    await this.ready;
    if (this.#img != null) {
      return [
        new ImgClip(await createImageBitmap(this.#img)),
        new ImgClip(await createImageBitmap(this.#img)),
      ] as [this, this];
    }
    let hitIdx = -1;
    for (let i = 0; i < this.#frames.length; i++) {
      const vf = this.#frames[i];
      if (time > vf.timestamp) continue;
      hitIdx = i;
      break;
    }
    if (hitIdx === -1) throw Error('Not found frame by time');
    const preSlice = this.#frames
      .slice(0, hitIdx)
      .map((vf) => new VideoFrame(vf));
    const postSlice = this.#frames.slice(hitIdx).map(
      (vf) =>
        new VideoFrame(vf, {
          timestamp: vf.timestamp - time,
        }),
    );
    return [new ImgClip(preSlice), new ImgClip(postSlice)] as [this, this];
  }

  async clone() {
    await this.ready;
    const data =
      this.#img == null
        ? this.#frames.map((vf) => vf.clone())
        : await createImageBitmap(this.#img);
    return new ImgClip(data) as this;
  }

  destroy(): void {
    Log.info('ImgClip destroy');
    this.#img?.close();
    this.#frames.forEach((f) => f.close());
  }
}
