import { IClip, VisibleSprite } from '@webav/av-cliper';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AVCanvas } from '../av-canvas';
import { createEl } from '../utils';
import { crtMSEvt4Offset } from './test-utils';

let container: HTMLDivElement;
let avCvs: AVCanvas;
beforeEach(() => {
  container = createEl('div') as HTMLDivElement;
  container.style.cssText = `
    width: 1280px;
    height: 720px;
  `;
  document.body.appendChild(container);
  avCvs = new AVCanvas(container, {
    width: 1280,
    height: 720,
    bgColor: '#333',
  });
});

afterEach(() => {
  container.remove();
  avCvs.destroy();
});

class MockClip implements IClip {
  tick = async () => {
    return { audio: [], state: 'success' as const };
  };
  meta = { width: 0, height: 0, duration: 0 };
  ready = Promise.resolve(this.meta);
  clone = async () => {
    return new MockClip() as this;
  };
  destroy = () => {};
  split = async (_: number) => [new MockClip(), new MockClip()] as [this, this];
}

test('captureStream', () => {
  const ms = avCvs.captureStream();
  expect(ms).toBeInstanceOf(MediaStream);
});

test('dynamic ctrl elements cusor', async () => {
  const vs = new VisibleSprite(new MockClip());
  vs.rect.x = 100;
  vs.rect.y = 100;
  vs.rect.w = 100;
  vs.rect.h = 100;
  await avCvs.addSprite(vs);
  const cvsEl = container.querySelector('canvas') as HTMLCanvasElement;

  vi.useFakeTimers();
  // 点击激活 sprite
  cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 110, 110));
  window.dispatchEvent(crtMSEvt4Offset('pointerup', 110, 110));

  // 等待防抖处理完成
  vi.advanceTimersByTime(500);

  // 获取控制点元素
  const rectEl = container.querySelector('.sprite-rect') as HTMLElement;
  // 检查矩形区域的鼠标样式
  expect(rectEl.style.cursor).toBe('move');

  // 检查左上角控制点的鼠标样式
  const ltCtrl = rectEl.querySelector('.ctrl-key-lt') as HTMLElement;
  expect(ltCtrl.style.cursor).toBe('nwse-resize');

  // 检查右上角控制点的鼠标样式
  const rtCtrl = rectEl.querySelector('.ctrl-key-rt') as HTMLElement;
  expect(rtCtrl.style.cursor).toBe('nesw-resize');

  // 检查旋转控制点的鼠标样式
  const rotateCtrl = rectEl.querySelector('.ctrl-key-rotate') as HTMLElement;
  expect(rotateCtrl.style.cursor).toBe('crosshair');

  // 旋转 sprite 并检查控制点鼠标样式是否相应变化
  vs.rect.angle = Math.PI / 4; // 旋转45度

  vi.advanceTimersByTime(500);

  // 旋转45度后，控制点的鼠标样式应该变化
  expect(ltCtrl.style.cursor).toBe('ns-resize');
  expect(rtCtrl.style.cursor).toBe('ew-resize');

  vi.useRealTimers();
});

test('AVCanvas events', async () => {
  const onPaused = vi.fn();
  const onPlaying = vi.fn();
  avCvs.on('paused', onPaused);
  avCvs.on('playing', onPlaying);

  avCvs.play({ start: 0, end: 10e6 });
  expect(onPlaying).toBeCalledTimes(1);
  avCvs.pause();
  expect(onPaused).toBeCalledTimes(1);
  avCvs.play({ start: 0, end: 10e6 });
  expect(onPlaying).toBeCalledTimes(2);
  avCvs.previewFrame(5e6);
  expect(onPaused).toBeCalledTimes(2);
});
