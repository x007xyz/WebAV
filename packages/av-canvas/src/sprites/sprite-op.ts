import { Rect } from '@webav/av-cliper';
import { debounce } from '@webav/internal-utils';
import { CTRL_KEYS, ICvsRatio, IPoint, TCtrlKey } from '../types';
import { createEl, getCvsRatio } from '../utils';
import { ESpriteManagerEvt, SpriteManager } from './sprite-manager';

/**
 * 鼠标点击，激活 sprite
 */
export function activeSprite(
  cvsEl: HTMLCanvasElement,
  sprMng: SpriteManager,
): () => void {
  const onCvsMouseDown = (evt: MouseEvent): void => {
    if (evt.button !== 0) return;
    // 如果点击的是控制元素，不处理选择逻辑
    if ((evt.target as HTMLElement) !== cvsEl) return;

    const cvsRatio = getCvsRatio(cvsEl);
    const { offsetX, offsetY } = evt;
    const ofx = offsetX / cvsRatio.w;
    const ofy = offsetY / cvsRatio.h;

    sprMng.activeSpriteByCoord(ofx, ofy);
  };

  cvsEl.addEventListener('pointerdown', onCvsMouseDown);

  return () => {
    cvsEl.removeEventListener('pointerdown', onCvsMouseDown);
  };
}

/**
 * 让sprite可以被拖拽移动、缩放和旋转
 */
export function draggabelSprite(
  cvsEl: HTMLCanvasElement,
  sprMng: SpriteManager,
  container: HTMLElement,
): () => void {
  let startX = 0;
  let startY = 0;
  let startRect: Rect | null = null;

  const refline = createRefline(cvsEl, container);

  // 查找控制 sprite 的 DOM 元素，在 renderCtrls 中创建并添加到 container 中
  const rectEl = container.querySelector('.sprite-rect') as HTMLElement;
  if (!rectEl) throw Error('sprite-rect DOM Node not found');

  // 移动sprite的处理函数
  const onRectMouseDown = (evt: MouseEvent): void => {
    if (evt.button !== 0 || sprMng.activeSprite == null) return;

    const hitSpr = sprMng.activeSprite;
    const { clientX, clientY } = evt;

    startRect = hitSpr.rect.clone();
    refline.magneticEffect(hitSpr.rect.x, hitSpr.rect.y, hitSpr.rect);

    startX = clientX;
    startY = clientY;
    window.addEventListener('pointermove', onMouseMove);
    window.addEventListener('pointerup', clearWindowEvt);

    evt.stopPropagation();
  };

  const cvsRatio = getCvsRatio(cvsEl);
  const onMouseMove = (evt: MouseEvent): void => {
    if (sprMng.activeSprite == null || startRect == null) return;

    const { clientX, clientY } = evt;
    let expectX = startRect.x + (clientX - startX) / cvsRatio.w;
    let expectY = startRect.y + (clientY - startY) / cvsRatio.h;

    updateRectWithSafeMargin(
      sprMng.activeSprite.rect,
      cvsEl,
      refline.magneticEffect(expectX, expectY, sprMng.activeSprite.rect),
    );
  };

  const clearWindowEvt = (): void => {
    refline.hide();
    window.removeEventListener('pointermove', onMouseMove);
    window.removeEventListener('pointerup', clearWindowEvt);
  };

  // 初始设置
  rectEl.addEventListener('pointerdown', onRectMouseDown);
  cvsEl.addEventListener('pointerdown', onRectMouseDown);
  const offCtrlEvt = setupCtrlEvents(cvsEl, rectEl, sprMng);

  return () => {
    refline.destroy();
    clearWindowEvt();
    rectEl.removeEventListener('pointerdown', onRectMouseDown);
    cvsEl.removeEventListener('pointerdown', onRectMouseDown);
    offCtrlEvt();
  };
}

// 为控制点添加事件处理
function setupCtrlEvents(
  cvsEl: HTMLCanvasElement,
  rectEl: HTMLElement,
  sprMng: SpriteManager,
) {
  // 获取所有控制点元素
  const ctrlElements = Array.from(rectEl.children) as HTMLElement[];

  const cvsRatio = getCvsRatio(cvsEl);
  // 鼠标按下对应的节点，进行对应的操作（旋转、缩放）
  ctrlElements.forEach((ctrlEl, index) => {
    const ctrlKey = CTRL_KEYS[index];
    ctrlEl.addEventListener('pointerdown', (evt: MouseEvent) => {
      if (evt.button !== 0 || sprMng.activeSprite == null) return;

      const { clientX, clientY } = evt;

      if (ctrlKey === 'rotate') {
        rotateRect(
          sprMng.activeSprite.rect,
          cntMap2Outer(sprMng.activeSprite.rect.center, cvsRatio, cvsEl),
        );
      } else {
        scaleRect({
          sprRect: sprMng.activeSprite.rect,
          ctrlKey,
          startX: clientX,
          startY: clientY,
          cvsRatio,
          cvsEl,
        });
      }

      evt.stopPropagation();
    });
  });

  ctrlElements[CTRL_KEYS.indexOf('rotate')].style.cursor = 'crosshair';

  // 根据角度，动态调整每个控制节点的鼠标样式
  const curStyles = [
    'ns-resize',
    'nesw-resize',
    'ew-resize',
    'nwse-resize',
    'ns-resize',
    'nesw-resize',
    'ew-resize',
    'nwse-resize',
  ];
  const curInitIdx = {
    t: 0,
    rt: 1,
    r: 2,
    rb: 3,
    b: 4,
    lb: 5,
    l: 6,
    lt: 7,
  };

  let offPropsEvt = () => {};
  const offActSprEvt = sprMng.on(ESpriteManagerEvt.ActiveSpriteChange, (s) => {
    offPropsEvt();
    if (s == null) return;

    const updateCursorStyle = debounce(function () {
      const { angle } = s.rect;
      const oa = angle < 0 ? angle + 2 * Math.PI : angle;

      ctrlElements.forEach((ctrlEl, index) => {
        const ctrlKey = CTRL_KEYS[index];
        if (ctrlKey === 'rotate') return;
        // 每个控制点的初始样式（idx） + 旋转角度导致的偏移，即为新鼠标样式
        // 每旋转45°，偏移+1，以此在curStyles中循环
        const idx =
          (curInitIdx[ctrlKey] +
            Math.floor((oa + Math.PI / 8) / (Math.PI / 4))) %
          8;
        ctrlEl.style.cursor = curStyles[idx];
      });
    }, 300);

    offPropsEvt = s.on('propsChange', (props) => {
      if (props.rect?.angle == null) return;
      updateCursorStyle();
    });

    updateCursorStyle();
  });
  return () => {
    offPropsEvt();
    offActSprEvt();
  };
}

/**
 * 缩放 sprite
 */
function scaleRect({
  sprRect,
  startX,
  startY,
  ctrlKey,
  cvsRatio,
  cvsEl,
}: {
  sprRect: Rect;
  startX: number;
  startY: number;
  ctrlKey: TCtrlKey;
  cvsRatio: ICvsRatio;
  cvsEl: HTMLCanvasElement;
}): void {
  const startRect = sprRect.clone();

  const onMouseMove = (evt: MouseEvent): void => {
    const { clientX, clientY } = evt;
    const deltaX = (clientX - startX) / cvsRatio.w;
    const deltaY = (clientY - startY) / cvsRatio.h;

    // 对角线上的点是等比例缩放，key 的长度为 2
    const scaler = ctrlKey.length === 1 ? stretchScale : fixedRatioScale;
    const { x, y, w, h } = startRect;
    // rect 对角线角度
    const diagonalAngle = Math.atan2(h, w);
    const { incW, incH, incS, rotateAngle } = scaler({
      deltaX,
      deltaY,
      angle: sprRect.angle,
      ctrlKey,
      diagonalAngle,
    });

    // 最小宽高缩放限定
    const minSize = 10;
    let newW = w;
    let newH = h;
    // 中心点缩放时，宽高增量是原来的两倍
    let newIncW = startRect.fixedScaleCenter ? incW * 2 : incW;
    let newIncH = startRect.fixedScaleCenter ? incH * 2 : incH;
    // 最小长度缩放限定
    let newIncS = incS;
    // 起始对角线长度
    const startS = Math.sqrt(h ** 2 + w ** 2);
    // 最小对角线长度
    const minS = Math.sqrt((minSize * (h / w)) ** 2 + minSize ** 2);
    switch (ctrlKey) {
      // 非等比例缩放时，变化的增量范围 由原宽高跟 minSize 的差值决定
      // 非等比例缩放时，根据ctrlKey的不同，固定宽高中的一个，另一个根据增量计算，并考虑最小值限定
      case 'l':
        newW = Math.max(w + newIncW, minSize);
        newIncS = Math.min(incS, w - minSize);
        break;
      case 'r':
        newW = Math.max(w + newIncW, minSize);
        newIncS = Math.max(incS, minSize - w);
        break;
      case 'b':
        newH = Math.max(h + newIncH, minSize);
        newIncS = Math.min(incS, h - minSize);
        break;
      case 't':
        newH = Math.max(h + newIncH, minSize);
        newIncS = Math.max(incS, minSize - h);
        break;
      // 等比例缩放时，变化（对角线长度）的增量范围由原对角线长度跟 minSize 对角线的差值决定
      // 等比例缩放时，某一边达到最小值时保持宽高比例不变
      case 'lt':
      case 'lb':
        newW = Math.max(w + newIncW, minSize);
        newH = newW === minSize ? (h / w) * newW : h + newIncH;
        newIncS = Math.min(incS, startS - minS);
        break;
      case 'rt':
      case 'rb':
        newW = Math.max(w + newIncW, minSize);
        newH = newW === minSize ? (h / w) * newW : h + newIncH;
        newIncS = Math.max(incS, minS - startS);
        break;
    }
    let newX = x;
    let newY = y;
    if (startRect.fixedScaleCenter) {
      newX = x + w / 2 - newW / 2;
      newY = y + h / 2 - newH / 2;
    } else {
      const newCenterX = (newIncS / 2) * Math.cos(rotateAngle) + x + w / 2;
      const newCenterY = (newIncS / 2) * Math.sin(rotateAngle) + y + h / 2;
      newX = newCenterX - newW / 2;
      newY = newCenterY - newH / 2;
    }

    updateRectWithSafeMargin(sprRect, cvsEl, {
      x: newX,
      y: newY,
      w: newW,
      h: newH,
    });
  };

  const clearWindowEvt = (): void => {
    window.removeEventListener('pointermove', onMouseMove);
    window.removeEventListener('pointerup', clearWindowEvt);
  };
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('pointerup', clearWindowEvt);
}

/**
 * 拉伸缩放, 上t 下b 左l 右r
 */
function stretchScale({
  deltaX,
  deltaY,
  angle,
  ctrlKey,
}: {
  deltaX: number;
  deltaY: number;
  angle: number;
  ctrlKey: TCtrlKey;
}): {
  incW: number;
  incH: number;
  incS: number;
  rotateAngle: number;
} {
  // 计算矩形增加的宽度
  let incS = 0;
  let incW = 0;
  let incH = 0;
  let rotateAngle = angle;
  if (ctrlKey === 'l' || ctrlKey === 'r') {
    incS = deltaX * Math.cos(angle) + deltaY * Math.sin(angle);
    // l 缩放是反向的
    incW = incS * (ctrlKey === 'l' ? -1 : 1);
  } else if (ctrlKey === 't' || ctrlKey === 'b') {
    // 计算矩形增加的宽度，旋转坐标系让x轴与角度重合，鼠标位置在x轴的投影（x值）即为增加的高度
    rotateAngle = angle - Math.PI / 2;
    incS = deltaX * Math.cos(rotateAngle) + deltaY * Math.sin(rotateAngle);
    incH = incS * (ctrlKey === 'b' ? -1 : 1);
  }

  return { incW, incH, incS, rotateAngle };
}

/**
 * 等比例缩放
 */
function fixedRatioScale({
  deltaX,
  deltaY,
  angle,
  ctrlKey,
  diagonalAngle,
}: {
  deltaX: number;
  deltaY: number;
  angle: number;
  ctrlKey: TCtrlKey;
  diagonalAngle: number;
}): {
  incW: number;
  incH: number;
  incS: number;
  rotateAngle: number;
} {
  // 坐标系旋转角度， lb->rt的对角线的初始角度为负数，所以需要乘以-1
  const rotateAngle =
    (ctrlKey === 'lt' || ctrlKey === 'rb' ? 1 : -1) * diagonalAngle + angle;
  // 旋转坐标系让x轴与对角线重合，鼠标位置在x轴的投影（x值）即为增加的长度
  const incS = deltaX * Math.cos(rotateAngle) + deltaY * Math.sin(rotateAngle);
  // lb lt 缩放值是反向
  const coefficient = ctrlKey === 'lt' || ctrlKey === 'lb' ? -1 : 1;
  // 等比例缩放，增加宽高等于长度乘以对应的角度函数
  // 因为等比例缩放，中心及被拖拽的点，一定在对角线上
  const incW = incS * Math.cos(diagonalAngle) * coefficient;
  const incH = incS * Math.sin(diagonalAngle) * coefficient;

  return { incW, incH, incS, rotateAngle };
}

/**
 * 监听拖拽事件，将鼠标坐标转换为旋转角度
 * 旋转时，rect的坐标不变
 */
function rotateRect(rect: Rect, outCnt: IPoint): void {
  const onMove = ({ clientX, clientY }: MouseEvent): void => {
    // 映射为 中心点坐标系
    const x = clientX - outCnt.x;
    const y = clientY - outCnt.y;
    // 旋转控制点在正上方，与 x 轴是 -90°， 所以需要加上 Math.PI / 2
    const angle = Math.atan2(y, x) + Math.PI / 2;
    rect.angle = angle;
  };
  const clear = (): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', clear);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', clear);
}

/**
 * canvas 内部（resolution）坐标映射成外部（DOM）坐标
 */
function cntMap2Outer(
  cnt: IPoint,
  cvsRatio: ICvsRatio,
  cvsEl: HTMLElement,
): IPoint {
  const x = cnt.x * cvsRatio.w;
  const y = cnt.y * cvsRatio.h;

  const { left, top } = cvsEl.getBoundingClientRect();
  return {
    x: x + left,
    y: y + top,
  };
}

/**
 * 限制安全范围，避免 sprite 完全超出边界
 */
function updateRectWithSafeMargin(
  rect: Rect,
  cvsEl: HTMLCanvasElement,
  value: Partial<Pick<Rect, 'x' | 'y' | 'w' | 'h'>>,
) {
  const newState = { x: rect.x, y: rect.y, w: rect.w, h: rect.h, ...value };
  const safeWidth = cvsEl.width * 0.05;
  const safeHeight = cvsEl.height * 0.05;
  if (newState.x < -newState.w + safeWidth) {
    newState.x = -newState.w + safeWidth;
  } else if (newState.x > cvsEl.width - safeWidth) {
    newState.x = cvsEl.width - safeWidth;
  }
  if (newState.y < -newState.h + safeHeight) {
    newState.y = -newState.h + safeHeight;
  } else if (newState.y > cvsEl.height - safeHeight) {
    newState.y = cvsEl.height - safeHeight;
  }
  rect.x = newState.x;
  rect.y = newState.y;
  rect.w = newState.w;
  rect.h = newState.h;
}

/**
 * 创建四周+中线参考线, 靠近具有磁吸效果
 */
function createRefline(cvsEl: HTMLCanvasElement, container: HTMLElement) {
  const reflineBaseCSS = `display: none; position: absolute;`;
  const baseSettings = { w: 0, h: 0, x: 0, y: 0 } as const;
  const reflineSettings: Record<
    'top' | 'bottom' | 'left' | 'right' | 'vertMiddle' | 'horMiddle',
    {
      // 四周加中线参考线，它们的坐标、宽高只能是 0 ｜ 50 ｜ 100
      w: 0 | 50 | 100;
      h: 0 | 50 | 100;
      x: 0 | 50 | 100;
      y: 0 | 50 | 100;
      ref: { prop: 'x' | 'y'; val: (rect: Rect) => number };
    }
  > = {
    vertMiddle: {
      ...baseSettings,
      h: 100,
      x: 50,
      ref: { prop: 'x', val: ({ w }) => (cvsEl.width - w) / 2 },
    },
    horMiddle: {
      ...baseSettings,
      w: 100,
      y: 50,
      ref: { prop: 'y', val: ({ h }) => (cvsEl.height - h) / 2 },
    },
    top: {
      ...baseSettings,
      w: 100,
      ref: { prop: 'y', val: () => 0 },
    },
    bottom: {
      ...baseSettings,
      w: 100,
      y: 100,
      ref: { prop: 'y', val: ({ h }) => cvsEl.height - h },
    },
    left: {
      ...baseSettings,
      h: 100,
      ref: { prop: 'x', val: () => 0 },
    },
    right: {
      ...baseSettings,
      h: 100,
      x: 100,
      ref: { prop: 'x', val: ({ w }) => cvsEl.width - w },
    },
  } as const;

  const lineWrap = createEl('div');
  lineWrap.style.cssText = `
    position: absolute;
    z-index: 4;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    box-sizing: border-box;
  `;
  const reflineEls = Object.fromEntries(
    Object.entries(reflineSettings).map(([key, { w, h, x, y }]) => {
      const lineEl = createEl('div');
      lineEl.style.cssText = `
        ${reflineBaseCSS}
        border-${w > 0 ? 'top' : 'left'}: 1px solid #3ee;
        top: ${y}%; left: ${x}%;
        ${x === 100 ? 'margin-left: -1px' : ''};
        ${y === 100 ? 'margin-top: -1px' : ''};
        width: ${w}%; height: ${h}%;
      `;
      lineWrap.appendChild(lineEl);
      return [key, lineEl];
    }),
  ) as Record<keyof typeof reflineSettings, HTMLDivElement>;
  container.appendChild(lineWrap);

  const magneticDistance = 6 / (900 / cvsEl.width);
  return {
    magneticEffect(expectX: number, expectY: number, rect: Rect) {
      const retVal = { x: expectX, y: expectY };

      // 记录每个维度(x,y)的最小距离和对应的参考线
      const minDist = { x: magneticDistance, y: magneticDistance };

      type RefLineKey = keyof typeof reflineEls;
      const activeReflines = { x: '', y: '' } as {
        x: RefLineKey | '';
        y: RefLineKey | '';
      };

      // 隐藏所有参考线，稍后会显示激活的参考线
      Object.values(reflineEls).forEach((el) => (el.style.display = 'none'));

      // 遍历所有参考线
      for (const reflineKey in reflineSettings) {
        const { prop, val } =
          reflineSettings[reflineKey as keyof typeof reflineSettings].ref;
        const refVal = val(rect);
        const currentVal = prop === 'x' ? expectX : expectY;

        // 计算与参考线的距离
        const dist = Math.abs(currentVal - refVal);

        // 在磁吸范围内，且比当前记录的最小距离更近
        if (dist <= magneticDistance && dist < minDist[prop]) {
          minDist[prop] = dist;
          retVal[prop] = refVal;
          activeReflines[prop] = reflineKey as RefLineKey;
        }
      }

      // 显示激活的参考线
      if (activeReflines.x) {
        reflineEls[activeReflines.x].style.display = 'block';
      }
      if (activeReflines.y) {
        reflineEls[activeReflines.y].style.display = 'block';
      }

      return retVal;
    },
    hide() {
      Object.values(reflineEls).forEach((el) => (el.style.display = 'none'));
    },
    destroy() {
      lineWrap.remove();
    },
  };
}
