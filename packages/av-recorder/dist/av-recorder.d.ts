/**
 * 录制媒体流 MediaStream，生成 MP4 文件流
 *
 * 如果你期望录制为 WebM 格式，请使用 [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
 *
 * @example
 * const recorder = new AVRecorder(
 * await navigator.mediaDevices.getUserMedia({
 *   video: true,
 *   audio: true,
 * })
 );

 recorder.start() // => ReadableStream
 * @see [录制摄像头](https://webav-tech.github.io/WebAV/demo/4_1-recorder-usermedia)
 */
export declare class AVRecorder {
    #private;
    get state(): TState;
    set state(_: TState);
    on: <Type extends "stateChange">(type: Type, listener: {
        stateChange: (state: TState) => void;
    }[Type]) => (() => void);
    constructor(inputMediaStream: MediaStream, conf?: AVRecorderConf);
    /**
     * 开始录制，返回 MP4 文件流
     * @param timeSlice 控制流输出数据的时间间隔，单位毫秒
     *
     */
    start(timeSlice?: number): ReadableStream<Uint8Array>;
    /**
     * 暂停录制
     */
    pause(): void;
    /**
     * 恢复录制
     */
    resume(): void;
    /**
     * 停止
     */
    stop(): Promise<void>;
}

declare interface AVRecorderConf {
    expectFPS?: number;
    videoCodec?: string;
    bitrate?: number;
}

declare type TState = 'inactive' | 'recording' | 'paused' | 'stopped';

export { }
