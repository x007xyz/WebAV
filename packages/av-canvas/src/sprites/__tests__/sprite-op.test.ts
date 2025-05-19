import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MockVisibleSprite, crtMSEvt4Offset } from '../../__tests__/test-utils';
import { createEl } from '../../utils';
import { renderCtrls } from '../render-ctrl';
import { SpriteManager } from '../sprite-manager';
import { draggabelSprite } from '../sprite-op';

const cvsRatio = { w: 1, h: 1 };
let sprMng = new SpriteManager();

let cvsEl: HTMLCanvasElement;
let clearRenderCtrls = () => {};
beforeEach(() => {
  sprMng = new SpriteManager();
  cvsEl = createEl('canvas') as HTMLCanvasElement;
  cvsEl.style.cssText = 'width: 1280px; height: 720px';
  cvsEl.width = 1280;
  cvsEl.height = 720;
  document.body.appendChild(cvsEl);
  clearRenderCtrls = renderCtrls(document.body, cvsEl, sprMng);
});
afterEach(() => {
  clearRenderCtrls();
  cvsEl.remove();
});

describe('draggabelSprite', () => {
  test('canvas on pointerdown', () => {
    const spyAEL = vi.spyOn(cvsEl, 'addEventListener');
    const spyREL = vi.spyOn(cvsEl, 'removeEventListener');

    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    expect(spyAEL).toBeCalledWith('pointerdown', expect.any(Function));
    expect(clear).toBeInstanceOf(Function);

    clear();
    expect(spyREL).toBeCalledWith('pointerdown', expect.any(Function));
  });

  test('window on mouse event', async () => {
    const spyAEL = vi.spyOn(window, 'addEventListener');
    const spyREL = vi.spyOn(window, 'removeEventListener');
    const vs = new MockVisibleSprite();
    vi.spyOn(vs.rect, 'checkHit').mockReturnValue(true);
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(new MouseEvent('pointerdown'));

    expect(spyAEL).toBeCalledTimes(2);
    expect(spyAEL).toHaveBeenNthCalledWith(
      1,
      'pointermove',
      expect.any(Function),
    );
    expect(spyAEL).toHaveBeenNthCalledWith(
      2,
      'pointerup',
      expect.any(Function),
    );

    clear();
    expect(spyREL).toHaveBeenNthCalledWith(
      1,
      'pointermove',
      expect.any(Function),
    );
    expect(spyREL).toHaveBeenNthCalledWith(
      2,
      'pointerup',
      expect.any(Function),
    );
  });

  test('move sprite', async () => {
    const vs = new MockVisibleSprite();
    vs.rect.x = 100;
    vs.rect.y = 100;
    vs.rect.w = 100;
    vs.rect.h = 100;

    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;

    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 110, 110));

    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 100,
        clientY: 100,
      }),
    );
    expect(vs.rect.x).toBe(200);
    expect(vs.rect.y).toBe(200);

    // 鼠标移动超出边界
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 10000,
        clientY: 10000,
      }),
    );
    // 5% 安全边界
    expect(vs.rect.x).toBe(cvsEl.width - cvsEl.width * 0.05);
    expect(vs.rect.y).toBe(cvsEl.height - cvsEl.height * 0.05);

    clear();
  });
});

describe('scale sprite', () => {
  test('drag right ctrl', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;

    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);

    // 获取控制点DOM元素
    const rectEl = document.querySelector('.sprite-rect') as HTMLElement;
    expect(rectEl).not.toBeNull();

    const ctrlEl = rectEl.querySelector('.ctrl-key-r') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 50,
      }),
    );

    // 模拟移动
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 200, // 向右移动100px
        clientY: 50,
      }),
    );

    // 拖拽 right ctrl 缩放 rect 的宽度
    expect(vs.rect.w).toBe(100 + 100 / cvsRatio.w);

    clear();
  });

  test('drag rb(bottom right) ctrl', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;

    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);

    const ctrlEl = document.querySelector('.ctrl-key-rb') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    // 模拟移动
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 200, // 向右移动100px
        clientY: 200, // 向下移动100px
      }),
    );

    const { x, y, w, h } = vs.rect;
    expect({ x, y, w, h }).toEqual({
      x: 0,
      y: 0,
      w: 200,
      h: 200,
    });

    clear();
  });

  test('drag right ctrl below min size', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.x = 100;
    vs.rect.y = 100;
    vs.rect.w = 100;
    vs.rect.h = 100;
    vs.rect.angle = 30 * (Math.PI / 180);
    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 150, 150));
    expect(sprMng.activeSprite).toBe(vs);

    window.dispatchEvent(new MouseEvent('pointerup'));

    const ctrlEl = document.querySelector('.ctrl-key-r') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 50,
      }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: -100,
        clientY: -100,
      }),
    );
    // 拖拽 right ctrl 缩放 rect 的宽度
    expect(vs.rect.w).toBe(10);
    expect(vs.rect.h).toBe(100);
    expect(Math.round(vs.rect.x)).toBe(106);
    expect(Math.round(vs.rect.y)).toBe(78);
    clear();
  });

  test('drag top ctrl below min size', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;
    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 50, 50));
    expect(sprMng.activeSprite).toBe(vs);

    window.dispatchEvent(new MouseEvent('pointerup'));

    const ctrlEl = document.querySelector('.ctrl-key-t') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 50,
        clientY: 0,
      }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 50,
        clientY: 100,
      }),
    );
    // 拖拽 top ctrl 缩放 rect 的高度
    expect(vs.rect.w).toBe(100);
    expect(vs.rect.h).toBe(10);
    expect(Math.round(vs.rect.x)).toBe(0);
    expect(Math.round(vs.rect.y)).toBe(90);
    clear();
  });

  test('drag rb(bottom right) ctrl below min size', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.x = 100;
    vs.rect.y = 100;
    vs.rect.w = 100;
    vs.rect.h = 100;
    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 50, 50));
    expect(sprMng.activeSprite).toBe(vs);

    window.dispatchEvent(new MouseEvent('pointerup'));
    const ctrlEl = document.querySelector('.ctrl-key-rb') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 200,
        clientY: 200,
      }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 0,
        clientY: 0,
      }),
    );
    // 拖拽 bottom right ctrl 缩放 rect 的宽度和高度
    expect(vs.rect.w).toBe(10);
    expect(vs.rect.h).toBe(10);
    expect(Math.round(vs.rect.x)).toBe(100);
    expect(Math.round(vs.rect.y)).toBe(100);
    clear();
  });

  test('drag left ctrl with fixedScaleCenter', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;
    vs.rect.fixedScaleCenter = true;

    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 0, 0));
    expect(sprMng.activeSprite).toBe(vs);

    window.dispatchEvent(new MouseEvent('pointerup'));

    const ctrlEl = document.querySelector('.ctrl-key-l') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 0,
        clientY: 50,
      }),
    );

    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 10,
        clientY: 0,
      }),
    );
    // 拖拽 left ctrl 缩放 rect 的宽度和高度
    expect(vs.rect.x).toBe(10);
    expect(vs.rect.w).toBe(80);
    expect(vs.rect.h).toBe(100);

    clear();
  });

  test('drag bottom ctrl with fixedScaleCenter', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;
    vs.rect.fixedScaleCenter = true;

    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);
    cvsEl.dispatchEvent(crtMSEvt4Offset('pointerdown', 0, 0));
    expect(sprMng.activeSprite).toBe(vs);

    window.dispatchEvent(new MouseEvent('pointerup'));

    const ctrlEl = document.querySelector('.ctrl-key-b') as HTMLElement;
    ctrlEl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 50,
        clientY: 100,
      }),
    );

    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 50,
        clientY: 90,
      }),
    );
    // 拖拽 bottom ctrl 缩放 rect 的宽度和高度
    expect(vs.rect.y).toBe(10);
    expect(vs.rect.w).toBe(100);
    expect(vs.rect.h).toBe(80);

    clear();
  });
});

describe('rotate sprite', () => {
  test('rotate sprite', async () => {
    const vs = new MockVisibleSprite();
    await sprMng.addSprite(vs);
    sprMng.activeSprite = vs;
    vs.rect.w = 100;
    vs.rect.h = 100;

    // 激活 sprite
    const clear = draggabelSprite(cvsEl, sprMng, document.body);

    // 获取控制点DOM元素
    const rectEl = document.querySelector('.sprite-rect') as HTMLElement;
    expect(rectEl).not.toBeNull();

    // 获取rotate控制点（通常是最后一个子元素）
    const rotateCtrl = rectEl.children[
      rectEl.children.length - 1
    ] as HTMLElement;

    // 在rotate控制点上触发pointerdown事件
    rotateCtrl.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 50,
        clientY: 0,
      }),
    );

    // 模拟移动
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 100,
        clientY: 100,
      }),
    );

    expect(vs.rect.angle.toFixed(2)).toBe('2.36');

    // 再次移动到不同位置
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 150, // 改变位置，确保角度变化
        clientY: 200,
      }),
    );

    // 检查角度是否继续改变
    expect(vs.rect.angle.toFixed(2)).not.toBe('2.36');

    clear();
  });
});
