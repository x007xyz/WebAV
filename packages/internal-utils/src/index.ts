export { EventTool } from './event-tool';
export { workerTimer } from './worker-timer';
export { autoReadStream, file2stream } from './stream-utils';
export { recodemux } from './recodemux';
export { Log } from './log';

/**
 * 函数节流
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  wait: number,
): (...rest: Parameters<F>) => undefined | ReturnType<F> {
  let lastTime: number;
  return function (this: any, ...rest) {
    if (lastTime == null || performance.now() - lastTime > wait) {
      lastTime = performance.now();
      return func.apply(this, rest);
    }
  };
}

/**
 * 函数防抖
 * 在指定时间内多次调用，只执行最后一次
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number,
): (...rest: Parameters<F>) => void {
  let timer = 0;

  return function (this: any, ...args: Parameters<F>): void {
    // 清除之前的定时器
    if (timer !== 0) clearTimeout(timer);

    // 设置新的定时器
    timer = setTimeout(() => {
      func.apply(this, args);
    }, wait) as unknown as number;
  };
}
