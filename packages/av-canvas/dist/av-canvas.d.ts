import { ICombinatorOpts } from '@webav/av-cliper';
import { VisibleSprite } from '@webav/av-cliper';

/**
 *
 * 一个可交互的画布，让用户添加各种素材，支持基础交互（拖拽、缩放、旋转、时间偏移）
 *
 * 用于在 Web 环境中实现视频剪辑、直播推流工作台功能
 *
 * @description
 *
 - 添加/删除素材（视频、音频、图片、文字）
 - 分割（裁剪）素材
 - 控制素材在视频中的空间属性（坐标、旋转、缩放）
 - 控制素材在视频中的时间属性（偏移、时长）
 - 实时预览播放
 - 纯浏览器环境生成视频

 * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
 * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
 * @example
 * const avCvs = new AVCanvas(document.querySelector('#app'), {
 *   bgColor: '#333',
 *   width: 1920,
 *   height: 1080,
 * });
 *
 */
export declare class AVCanvas {
    #private;
    on: <Type extends "activeSpriteChange" | "playing" | "timeupdate" | "paused">(type: Type, listener: {
        timeupdate: (time: number) => void;
        paused: () => void;
        playing: () => void;
        activeSpriteChange: (sprite: VisibleSprite | null) => void;
    }[Type]) => (() => void);
    /**
     * 创建 `AVCanvas` 类的实例。
     * @param attchEl - 要添加画布的元素。
     * @param opts - 画布的选项
     * @param opts.bgColor - 画布的背景颜色。
     * @param opts.width - 画布的宽度。
     * @param opts.height - 画布的高度。
     */
    constructor(attchEl: HTMLElement, opts: {
        bgColor: string;
    } & IResolution);
    /**
     * 每 33ms 更新一次画布，绘制已添加的 Sprite
     * @param opts - 播放选项
     * @param opts.start - 开始播放的时间（单位：微秒）
     * @param [opts.end] - 结束播放的时间（单位：微秒）。如果未指定，则播放到最后一个 Sprite 的结束时间
     * @param [opts.playbackRate] - 播放速率。1 表示正常速度，2 表示两倍速度，0.5 表示半速等。如果未指定，则默认为 1
     * @throws 如果开始时间大于等于结束时间或小于 0，则抛出错误
     */
    play(opts: {
        start: number;
        end?: number;
        playbackRate?: number;
    }): void;
    /**
     * 暂停播放，画布内容不再更新
     */
    pause(): void;
    /**
     * 预览 `AVCanvas` 指定时间的图像帧
     */
    previewFrame(time: number): void;
    /**
     * 获取当前帧的截图图像 返回的是一个base64
     */
    captureImage(): string;
    get activeSprite(): VisibleSprite | null;
    set activeSprite(s: VisibleSprite | null);
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
    addSprite: SpriteManager['addSprite'];
    /**
     * 删除 {@link VisibleSprite}
     * @param args
     * @returns
     * @example
     * const sprite = new VisibleSprite();
     * avCvs.removeSprite(sprite);
     */
    removeSprite: SpriteManager['removeSprite'];
    /**
     * 销毁实例
     */
    destroy(): void;
    /**
     * 合成所有素材的图像与音频，返回实时媒体流 `MediaStream`
     *
     * 可用于 WebRTC 推流，或由 {@link [AVRecorder](../../av-recorder/classes/AVRecorder.html)} 录制生成视频文件
     *
     * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
     *
     */
    captureStream(): MediaStream;
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
    createCombinator(opts?: ICombinatorOpts): Promise<any>;
    /**
     * 设置背景图片
     * @param image 背景图片（ImageBitmap、HTMLImageElement 或 URL）
     * @param options 可选配置（如拉伸模式、透明度等）
     */
    setBackgroundImage(image: ImageBitmap | HTMLImageElement | string, options?: {
        mode?: 'cover' | 'contain' | 'stretch' | 'repeat';
        opacity?: number;
        blur?: number;
    }): Promise<void>;
    /**
     * 更新背景图片的模糊效果或透明度
     * @param options 可选配置（模式、透明度、模糊度）
     */
    updateBackgroundOptions(options?: {
        mode?: 'cover' | 'contain' | 'stretch' | 'repeat';
        opacity?: number;
        blur?: number;
    }): Promise<void>;
    /**
     * 清除背景图片，恢复使用纯色背景
     */
    clearBackgroundImage(): void;
}

declare enum ESpriteManagerEvt {
    ActiveSpriteChange = "activeSpriteChange",
    AddSprite = "addSprite"
}

/**
 * 分辨率（尺寸）
 */
declare interface IResolution {
    width: number;
    height: number;
}

declare class SpriteManager {
    #private;
    on: <Type extends ESpriteManagerEvt>(type: Type, listener: {
        addSprite: (s: VisibleSprite) => void;
        activeSpriteChange: (s: VisibleSprite | null) => void;
    }[Type]) => (() => void);
    get activeSprite(): VisibleSprite | null;
    set activeSprite(s: VisibleSprite | null);
    addSprite(vs: VisibleSprite): Promise<void>;
    removeSprite(spr: VisibleSprite): void;
    getSprites(filter?: {
        time: boolean;
    }): VisibleSprite[];
    updateRenderTime(time: number): void;
    destroy(): void;
}

export { }
