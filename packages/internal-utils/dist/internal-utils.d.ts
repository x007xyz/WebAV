import { MP4File } from '@webav/mp4box.js';

/**
 * 自动读取流并处理每个数据块。
 *
 * @template ST - 可读流的类型。
 * @param stream - 要读取的流。
 * @param cbs - 回调函数对象。
 * @param cbs.onChunk - 当读取到新的数据块时调用的函数。该函数接收一个参数，即数据块，并返回一个 Promise。
 * @param cbs.onDone - 当读取完所有数据块时调用的函数。
 * @returns - 返回一个函数，调用该函数可以停止读取流。
 *
 * @example
 * const stream = getSomeReadableStream();
 * const onChunk = async (chunk) => {
 *   console.log('New chunk:', chunk);
 * };
 * const onDone = () => {
 *   console.log('Done reading stream');
 * };
 * const stopReading = autoReadStream(stream, { onChunk, onDone });
 * // Later...
 * stopReading();
 */
export declare function autoReadStream<ST extends ReadableStream>(stream: ST, cbs: {
    onChunk: ST extends ReadableStream<infer DT> ? (chunk: DT) => Promise<void> : never;
    onDone: () => void;
}): () => void;

declare type EventKey = string | symbol;

/**
 * 事件工具类
 *
 * @example
 * const evtTool = new EventTool<{
 *   timeupdate: (time: number) => void;
 *   paused: () => void;
 *   playing: () => void;
 * }>()
 * evtTool.on('paused', () => {})
 * evtTool.emit('paused')
 */
export declare class EventTool<T extends EventToolType> {
    #private;
    /**
     * 在两个 EventTool 实例间转发消息
     * @param from
     * @param to
     * @param evtTypes 需转发的消息类型
     *
     * @example
     * EventTool.forwardEvent(from, to, ['evtName']),
     */
    static forwardEvent<T1 extends EventToolType, T2 extends EventToolType, EvtType extends (keyof T1 | [keyof T1, keyof T2])[]>(from: {
        on: EventTool<T1>['on'];
    }, to: {
        emit: EventTool<T2>['emit'];
    }, evtTypes: EvtType): () => void;
    /**
     * 监听 EventType 中定义的事件
     */
    on: <Type extends keyof T>(type: Type, listener: T[Type]) => (() => void);
    /**
     * 监听事件，首次触发后自动移除监听
     *
     * 期望回调一次的事件，使用 once; 期望多次回调使用 on
     */
    once: <Type extends keyof T>(type: Type, listener: T[Type]) => (() => void);
    /**
     * 触发事件
     * @param type
     * @param args
     * @returns
     */
    emit: <Type extends keyof T>(type: Type, ...args: Type extends string ? T[Type] extends (...args: any[]) => any ? Parameters<T[Type]> : never : never) => void;
    destroy(): void;
}

declare type EventToolType = Record<EventKey, (...args: any[]) => any>;

/**
 * 将 mp4box file 转换为文件流，用于上传服务器或存储到本地
 * @param file - MP4 文件实例 {@link MP4File}。
 * @param timeSlice - 时间片，用于控制流的发送速度。
 * @param onCancel - 当返回的流被取消时触发该回调函数
 */
export declare function file2stream(file: MP4File, timeSlice: number, onCancel?: () => void): {
    /**
     * 可读流，流的数据是 `Uint8Array`
     */
    stream: ReadableStream<Uint8Array>;
    /**
     * 流的生产者主动停止向流中输出数据，可向消费者传递错误信息
     */
    stop: (err?: Error) => void;
};

/**
 * 定义 recodemux 函数的配置选项
 */
declare interface IRecodeMuxOpts {
    /**
     * 视频配置选项，如果为 null 则不处理视频。
     */
    video: {
        width: number;
        height: number;
        expectFPS: number;
        codec: string;
        bitrate: number;
        /**
         * 不安全，随时可能废弃
         */
        __unsafe_hardwareAcceleration__?: HardwareAcceleration;
    } | null;
    /**
     * 音频配置选项，如果为 null 则不处理音频。
     */
    audio: {
        codec: 'opus' | 'aac';
        sampleRate: number;
        channelCount: number;
    } | null;
    /**
     * 预设时长，不代表 track 实际时长
     */
    duration?: number;
    metaDataTags?: Record<string, string>;
}

/**
 * 全局日志对象，将日志内容写入 OPFS 临时文件
 */
export declare const Log: {
    /**
     * 生成一个 log 实例，所有输出前都会附加 tag
     *
     * @example
     * const log = Log.create('<prefix>')
     * log.info('xxx') // '<prefix> xxx'
     */
    create: (tag: string) => {
        [k: string]: (...args: any[]) => void;
    };
    /**
     * 将所有日志导出为一个字符串
     *
     * @example
     * Log.dump() // => [level][time]  内容...
     *
     */
    dump(): Promise<string>;
    debug: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    info: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    warn: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    error: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    /**
     * 设置记录日志的级别
     *
     * @example
     * Log.setLogLevel(Log.warn) // 记录 warn，error 日志
     */
    setLogLevel: <T extends Function>(logfn: T) => void;
};

/**
 * 处理音视频的编码和解码。
 * @param opts - 编码音视频数据的配置
 */
export declare function recodemux(opts: IRecodeMuxOpts): {
    /**
     * 编码视频帧
     */
    encodeVideo: (frame: VideoFrame, options: VideoEncoderEncodeOptions, gopId?: number) => void;
    /**
     * 编码音频数据
     */
    encodeAudio: (data: AudioData) => void;
    /**
     * close 编码器，停止任务
     */
    close: TCleanFn;
    /**
     * 清空编码器队列
     */
    flush: () => Promise<void>;
    /**
     * mp4box 实例
     */
    mp4file: MP4File;
    /**
     * 返回队列长度（背压），用于控制生产视频的进度，队列过大会会占用大量显存
     */
    getEncodeQueueSize: () => number;
};

declare type TCleanFn = () => void;

/**
 * 专门解决页面长时间处于后台时，定时器不（或延迟）执行的问题
 *
 * 跟 `setInterval` 很相似，⚠️ 但 time 会有一定偏差，请优先使用 `setInterval`
 *
 * @see [JS 定时器时长控制细节](https://hughfenghen.github.io/posts/2023/06/15/timer-delay/)
 */
export declare const workerTimer: (handler: () => void, time: number) => (() => void);

export { }
