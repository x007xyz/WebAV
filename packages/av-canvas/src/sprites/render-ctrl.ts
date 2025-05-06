import { CTRL_KEYS, ICvsRatio, RectCtrls, TCtrlKey } from '../types';
import { createEl } from '../utils';
import { VisibleSprite, Rect } from '@fly-cut/av-cliper';
import { ESpriteManagerEvt, SpriteManager } from './sprite-manager';

export function renderCtrls(
  container: HTMLElement,
  cvsEl: HTMLCanvasElement,
  sprMng: SpriteManager,
  rectCtrlsGetter: (rect: Rect) => RectCtrls,
): () => void {
  const cvsRatio = {
    w: cvsEl.clientWidth / cvsEl.width,
    h: cvsEl.clientHeight / cvsEl.height,
  };

  const observer = new ResizeObserver(() => {
    cvsRatio.w = cvsEl.clientWidth / cvsEl.width;
    cvsRatio.h = cvsEl.clientHeight / cvsEl.height;

    if (sprMng.activeSprite == null) return;
    syncCtrlElPos(
      sprMng.activeSprite,
      rectEl,
      ctrlsEl,
      cvsRatio,
      rectCtrlsGetter,
    );
  });

  observer.observe(cvsEl);

  let lastActSprEvtClear = () => {};
  const { rectEl, ctrlsEl } = createRectAndCtrlEl(container);
  const offSprChange = sprMng.on(ESpriteManagerEvt.ActiveSpriteChange, (s) => {
    // 每次变更，需要清理上一个事件监听器
    lastActSprEvtClear();
    if (s == null) {
      rectEl.style.display = 'none';
      return;
    }
    syncCtrlElPos(s, rectEl, ctrlsEl, cvsRatio, rectCtrlsGetter);
    lastActSprEvtClear = s.on('propsChange', () => {
      syncCtrlElPos(s, rectEl, ctrlsEl, cvsRatio, rectCtrlsGetter);
    });
    rectEl.style.display = '';
  });

  return () => {
    observer.disconnect();
    offSprChange();
    rectEl.remove();
    lastActSprEvtClear();
  };
}

function createRectAndCtrlEl(container: HTMLElement): {
  rectEl: HTMLElement;
  ctrlsEl: Record<TCtrlKey, HTMLElement>;
} {
  const rectEl = createEl('div');
  rectEl.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 1px solid #eee;
    box-sizing: border-box;
    display: none;
  `;
  const ctrlsEl = Object.fromEntries(
    CTRL_KEYS.map((k) => {
      const d = createEl('div');
      d.style.cssText = `
        display: none;
        position: absolute;
        border: 1px solid #3ee; border-radius: 50%;
        box-sizing: border-box;
        background-color: #fff;
      `;
      return [k, d];
    }),
  ) as Record<TCtrlKey, HTMLElement>;

  Object.values(ctrlsEl).forEach((d) => rectEl.appendChild(d));
  container.appendChild(rectEl);
  return {
    rectEl,
    ctrlsEl,
  };
}

function syncCtrlElPos(
  s: VisibleSprite,
  rectEl: HTMLElement,
  ctrlsEl: Record<TCtrlKey, HTMLElement>,
  cvsRatio: ICvsRatio,
  rectCtrlsGetter: (rect: Rect) => RectCtrls,
): void {
  const { x, y, w, h, angle } = s.rect;
  Object.assign(rectEl.style, {
    left: `${x * cvsRatio.w}px`,
    top: `${y * cvsRatio.h}px`,
    width: `${w * cvsRatio.w}px`,
    height: `${h * cvsRatio.h}px`,
    rotate: `${angle}rad`,
  });
  Object.entries(rectCtrlsGetter(s.rect)).forEach(([k, { x, y, w, h }]) => {
    // ctrl 是相对中心点定位的
    Object.assign(ctrlsEl[k as TCtrlKey].style, {
      display: 'block',
      left: '50%',
      top: '50%',
      width: `${w * cvsRatio.w}px`,
      height: `${h * cvsRatio.h}px`,
      // border 1px, 所以要 -1
      transform: `translate(${x * cvsRatio.w}px, ${y * cvsRatio.h}px)`,
    });
  });
}
