import { Rect } from '@webav/av-cliper';
import { ICvsRatio, RectCtrls } from './types';

export function createEl(tagName: string): HTMLElement {
  return document.createElement(tagName);
}

const rectGetterCache = new WeakMap<
  HTMLCanvasElement,
  (rect: Rect) => RectCtrls
>();
/**
 * 根据 canvas 创建该画布上的 Sprite 控制点生成器
 * 因为控制点的大小需要根据画布的大小动态调整
 */
export function getRectCtrls(cvsEl: HTMLCanvasElement, rect: Rect) {
  if (rectGetterCache.has(cvsEl)) {
    return rectGetterCache.get(cvsEl)!(rect);
  }

  let ctrlSize = 10;
  const cvsResizeOb = new ResizeObserver((entries) => {
    const fisrtEntry = entries[0];
    if (fisrtEntry == null) return;
    ctrlSize = 10 / (fisrtEntry.contentRect.width / cvsEl.width);
  });
  cvsResizeOb.observe(cvsEl);
  function rectCtrlsGetter(rect: Rect): RectCtrls {
    const { w, h } = rect;
    // 控制点元素大小, 以 分辨率 为基准
    const sz = ctrlSize;
    // half size
    const hfSz = sz / 2;
    const hfW = w / 2;
    const hfH = h / 2;
    // rotate size
    const rtSz = sz * 1.5;
    const hfRtSz = rtSz / 2;
    // ctrl 坐标是相对于 sprite 中心点
    const tblr = rect.fixedAspectRatio
      ? {}
      : {
          t: new Rect(-hfSz, -hfH - hfSz, sz, sz, rect),
          b: new Rect(-hfSz, hfH - hfSz, sz, sz, rect),
          l: new Rect(-hfW - hfSz, -hfSz, sz, sz, rect),
          r: new Rect(hfW - hfSz, -hfSz, sz, sz, rect),
        };
    return {
      ...tblr,
      lt: new Rect(-hfW - hfSz, -hfH - hfSz, sz, sz, rect),
      lb: new Rect(-hfW - hfSz, hfH - hfSz, sz, sz, rect),
      rt: new Rect(hfW - hfSz, -hfH - hfSz, sz, sz, rect),
      rb: new Rect(hfW - hfSz, hfH - hfSz, sz, sz, rect),
      rotate: new Rect(-hfRtSz, -hfH - sz * 2 - hfRtSz, rtSz, rtSz, rect),
    };
  }
  rectGetterCache.set(cvsEl, rectCtrlsGetter);
  return rectCtrlsGetter(rect);
}

// 复用 canvas 比例的获取，避免重复 observer
const cvsRatioCache = new WeakMap<HTMLCanvasElement, ICvsRatio>();
export function getCvsRatio(cvsEl: HTMLCanvasElement): ICvsRatio {
  if (cvsRatioCache.has(cvsEl)) {
    return cvsRatioCache.get(cvsEl)!;
  }

  const cvsRatio = {
    w: cvsEl.clientWidth / cvsEl.width,
    h: cvsEl.clientHeight / cvsEl.height,
  };
  const observer = new ResizeObserver(() => {
    cvsRatio.w = cvsEl.clientWidth / cvsEl.width;
    cvsRatio.h = cvsEl.clientHeight / cvsEl.height;
  });
  observer.observe(cvsEl);
  cvsRatioCache.set(cvsEl, cvsRatio);
  return cvsRatio;
}
