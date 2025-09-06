import { VisibleSprite } from '@webav/av-cliper';
import { CTRL_KEYS, TCtrlKey } from '../types';
import { createEl, getCvsRatio, getRectCtrls } from '../utils';
import { ESpriteManagerEvt, SpriteManager } from './sprite-manager';

const CloseSvg = `
<svg t="1756779136804" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1456" width="16" height="16">
<path d="M1022.793875 170.063604L852.730271 0 511.396938 341.333333 170.063604 0 0 170.063604l341.333333 341.333334L0 852.730271l170.063604 170.063604 341.333334-340.127208 341.333333 340.127208 170.063604-170.063604-340.127208-341.333333 340.127208-341.333334z" fill="#bfbfbf" p-id="1457"></path>
</svg>
`;

export function renderCtrls(
  container: HTMLElement,
  cvsEl: HTMLCanvasElement,
  sprMng: SpriteManager,
): () => void {
  const cvsRatio = getCvsRatio(cvsEl);
  const observer = new ResizeObserver(() => {
    if (sprMng.activeSprite == null) return;
    syncCtrlElPos(sprMng.activeSprite, cvsEl, rectEl, ctrlsEl);
  });
  observer.observe(cvsEl);

  let lastActSprEvtClear = () => {};
  const { rectEl, ctrlsEl } = createRectAndCtrlEl(container);

  // 添加点击事件处理
  rectEl.addEventListener('pointerdown', (evt) => {
    // 如果点击的是控制点，不处理点击穿透
    if (Object.values(ctrlsEl).includes(evt.target as HTMLElement)) {
      return;
    }

    // 获取相对于 canvas 的坐标，可能需要激活更上层的 sprite
    const cvsRect = cvsEl.getBoundingClientRect();
    const x = (evt.clientX - cvsRect.left) / cvsRatio.w;
    const y = (evt.clientY - cvsRect.top) / cvsRatio.h;
    sprMng.activeSpriteByCoord(x, y);
  });

  const offSprChange = sprMng.on(ESpriteManagerEvt.ActiveSpriteChange, (s) => {
    // 每次变更，需要清理上一个事件监听器
    lastActSprEvtClear();
    if (s == null) {
      rectEl.style.display = 'none';
      return;
    }
    syncCtrlElPos(s, cvsEl, rectEl, ctrlsEl);
    lastActSprEvtClear = s.on('propsChange', () => {
      syncCtrlElPos(s, cvsEl, rectEl, ctrlsEl);
    });
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
  rectEl.classList.add('sprite-rect');
  rectEl.style.cssText = `
    position: absolute;
    z-index: 3;
    pointer-events: auto;
    border: 1px solid #eee;
    box-sizing: border-box;
    display: none;
    cursor: move;
  `;
  const ctrlsEl = Object.fromEntries(
    CTRL_KEYS.map((k) => {
      const d = createEl('div');
      d.classList.add(`ctrl-key-${k}`);
      d.style.cssText = `
        display: none;
        position: absolute;
        border: 1px solid #3ee;
        border-radius: 50%;
        box-sizing: border-box;
        background-color: #fff;
        pointer-events: auto;
        cursor: ${k === 'rotate' ? 'crosshair' : 'default'};
        user-select: none;
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
  cvsEl: HTMLCanvasElement,
  rectEl: HTMLElement,
  ctrlsEl: Record<TCtrlKey, HTMLElement>,
): void {
  if (s.interactable === 'disabled') {
    rectEl.style.display = 'none';
    return;
  }
  rectEl.style.display = '';

  const cvsRatio = getCvsRatio(cvsEl);
  const { x, y, w, h, angle } = s.rect;

  Object.assign(rectEl.style, {
    left: `${x * cvsRatio.w}px`,
    top: `${y * cvsRatio.h}px`,
    width: `${w * cvsRatio.w}px`,
    height: `${h * cvsRatio.h}px`,
    transform: `rotate(${angle}rad)`,
  });

  const ctrlPosMap = getRectCtrls(cvsEl, s.rect);

  for (const k in ctrlsEl) {
    const key = k as TCtrlKey;
    const el = ctrlsEl[key];
    const pos = ctrlPosMap[key];

    if (pos == null) {
      el.style.display = 'none';
      continue;
    }

    const baseStyle: Record<string, string> = {
      width: `${pos.w * cvsRatio.w}px`,
      height: `${pos.h * cvsRatio.h}px`,
      transform: `translate(${pos.x * cvsRatio.w}px, ${pos.y * cvsRatio.h}px)`,
      left: '50%',
      top: '50%',
    };

    let customStyle: Record<string, string> = { display: 'none' };
    el.innerHTML = '';

    switch (s.interactable) {
      case 'interactive':
        customStyle = {
          display: 'block',
          backgroundColor: '#fff',
          border: '1px solid #3ee',
        };
        break;
      case 'selectable':
        if (key !== 'rotate') {
          customStyle = {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
            border: 'none',
          };
          el.innerHTML = CloseSvg;
        }
        break;
    }

    Object.assign(el.style, baseStyle, customStyle);
  }
}
