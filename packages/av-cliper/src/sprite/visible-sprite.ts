import { BaseSprite } from './base-sprite';
import { IClip } from '../clips';
import { Log } from '@fly-cut/internal-utils';
import { changePCMPlaybackRate } from '../av-utils';

/**
 * 包装 {@link IClip} 给素材扩展坐标、层级、透明度等信息，用于 {@link [AVCanvas](../../av-canvas/classes/AVCanvas.html)} 响应用户交互
 *
 * 跟 {@link OffscreenSprite} 非常相似，应用场景不同
 *
 * @example
 * const spr = new VisibleSprite(
 *   new MP4Clip((await fetch('<mp4 url>')).body),
 * );
 * spr.opacity = 0.5 // 半透明
 * spr.rect.x = 100 // x 坐标偏移 100 像素
 * spr.time.offset = 10e6 // 视频第 10s 开始绘制素材
 *
 * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
 *
 */
export class VisibleSprite extends BaseSprite {
  #clip: IClip;
  getClip() {
    return this.#clip;
  }

  /**
   * 元素是否可见，用于不想删除，期望临时隐藏 Sprite 的场景
   */
  visible = true;

  /**
   * 元素是否可选择
   */
  selectable = true;

  constructor(clip: IClip) {
    super();
    this.#clip = clip;
    this.ready = clip.ready.then(({ width, height, duration }) => {
      this.rect.w = this.rect.w === 0 ? width : this.rect.w;
      this.rect.h = this.rect.h === 0 ? height : this.rect.h;
      this.time.duration =
        this.time.duration === 0 ? duration : this.time.duration;
    });
  }

  // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
  #lastVf: VideoFrame | ImageBitmap | null = null;
  #lastAudio: Float32Array[] = [];
  #ticking = false;
  #update(time: number) {
    if (this.#ticking) return;
    this.#ticking = true;
    this.#clip
      .tick(time * this.time.playbackRate)
      .then(({ video, audio }) => {
        if (video != null) {
          this.#lastVf?.close();
          this.#lastVf = video ?? null;
        }
        this.#lastAudio = audio ?? [];
        if (audio != null && this.time.playbackRate !== 1) {
          this.#lastAudio = audio.map((pcm) =>
            changePCMPlaybackRate(pcm, this.time.playbackRate),
          );
        }
      })
      .finally(() => {
        this.#ticking = false;
      });
  }

  /**
   * 提前准备指定 time 的帧
   */
  preFrame(time: number) {
    if (this.#lastTime === time) return;
    this.#update(time);
    this.#lastTime = time;
  }

  #lastTime = -1;

  resetLastTime() {
    this.#lastTime = -1;
  }

  // 在 VisibleSprite 类中添加
  #aspectRatio: { width: number; height: number } | null = null;
  #originalDimensions: { width: number; height: number } | null = null;
  // 存储裁剪区域的信息
  #cropRegion: {
    sx: number;
    sy: number;
    sWidth: number;
    sHeight: number;
  } | null = null;

  // 在 VisibleSprite 类中修改
  /**
   * 设置裁剪为固定宽高比，或设置为空使用原始比例
   * @param width 宽度比例，传入 null 或 undefined 使用原始比例
   * @param height 高度比例，传入 null 或 undefined 使用原始比例
   */
  setAspectRatio(width: number | null, height: number | null): void {
    // 如果任一参数为空，则清除宽高比设置
    if (width == null || height == null) {
      this.#aspectRatio = null;
      this.#cropRegion = null;

      // 恢复原始尺寸（如果有记录）
      if (this.#originalDimensions) {
        this.rect.w = this.#originalDimensions.width;
        this.rect.h = this.#originalDimensions.height;
      }
      return;
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Aspect ratio values must be positive');
    }

    // 保存原始尺寸（如果未保存）
    if (!this.#originalDimensions) {
      this.#originalDimensions = {
        width: this.rect.w,
        height: this.rect.h,
      };
    }

    this.#aspectRatio = { width, height };

    // 计算裁剪区域
    this.#calculateCropRegion();

    // 根据新的宽高比调整当前尺寸
    this.#adjustDimensionsToAspectRatio();
  }

  /**
   * 计算基于宽高比的裁剪区域
   */
  #calculateCropRegion(): void {
    if (!this.#aspectRatio || !this.#clip.meta) return;

    const sourceWidth = this.#clip.meta.width;
    const sourceHeight = this.#clip.meta.height;
    const targetRatio = this.#aspectRatio.width / this.#aspectRatio.height;
    const sourceRatio = sourceWidth / sourceHeight;

    let cropWidth, cropHeight, sx, sy;

    if (sourceRatio > targetRatio) {
      // 源视频更宽，需要裁剪左右两边
      cropHeight = sourceHeight;
      cropWidth = sourceHeight * targetRatio;
      sx = (sourceWidth - cropWidth) / 2;
      sy = 0;
    } else {
      // 源视频更高，需要裁剪上下两边
      cropWidth = sourceWidth;
      cropHeight = sourceWidth / targetRatio;
      sx = 0;
      sy = (sourceHeight - cropHeight) / 2;
    }

    this.#cropRegion = {
      sx,
      sy,
      sWidth: cropWidth,
      sHeight: cropHeight,
    };
  }

  /**
   * 根据设置的宽高比调整尺寸
   */
  #adjustDimensionsToAspectRatio(): void {
    if (!this.#aspectRatio || !this.#originalDimensions) return;

    const targetRatio = this.#aspectRatio.width / this.#aspectRatio.height;

    // 保持与原始尺寸相近的面积，但调整为目标宽高比
    const originalArea =
      this.#originalDimensions.width * this.#originalDimensions.height;
    const newHeight = Math.sqrt(originalArea / targetRatio);
    const newWidth = newHeight * targetRatio;

    this.rect.w = newWidth;
    this.rect.h = newHeight;
  }

  getAspectRatio(): { width: number; height: number } | null {
    return this.#aspectRatio ? { ...this.#aspectRatio } : null;
  }

  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    time: number,
    anchor: { x: number; y: number },
  ): { audio: Float32Array[] } {
    this.animate(time);
    super._render(ctx, anchor);
    const { w, h, x, y } = this.rect;
    // 暂时删除this.#lastTime !== time的判断
    // if (this.#lastTime !== time) this.#update(time);
    this.#update(time);
    this.#lastTime = time;

    const audio = this.#lastAudio;
    this.#lastAudio = [];
    const video = this.#lastVf;
    if (video != null) {
      if (this.#cropRegion) {
        const { sx, sy, sWidth, sHeight } = this.#cropRegion;
        ctx.drawImage(
          video,
          sx,
          sy,
          sWidth,
          sHeight, // 源区域
          x,
          y,
          w,
          h,
        );
      } else {
        ctx.drawImage(video, x, y, w, h);
      }
    }

    return { audio };
  }

  copyStateTo<T extends BaseSprite>(target: T): void {
    super.copyStateTo(target);
    if (target instanceof VisibleSprite) {
      target.visible = this.visible;
      if (this.#aspectRatio) {
        target.setAspectRatio(
          this.#aspectRatio.width,
          this.#aspectRatio.height,
        );
      }
    }
  }

  #destroyed = false;
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;

    Log.info('VisibleSprite destroy');
    super.destroy();
    this.#lastVf?.close();
    this.#lastVf = null;
    // this.#clip.destroy();
  }
}
