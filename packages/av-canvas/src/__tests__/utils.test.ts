import { Rect } from '@webav/av-cliper';
import { expect, test } from 'vitest';
import { getRectCtrls } from '../utils';

const cvsEl = document.createElement('canvas');

test('ctrls', () => {
  const rect = new Rect(0, 0, 100, 100);

  const ctrls = getRectCtrls(cvsEl, rect);
  expect(
    Object.fromEntries(
      Object.entries(ctrls).map(([key, ctrl]) => [key, stringifyRect(ctrl)]),
    ),
  ).toMatchSnapshot();
});

// 固定比例后，ctrls 将移除 t,b,l,r 控制点
test('fixedAspectRatio', () => {
  const rect = new Rect(0, 0, 100, 100);
  expect(Object.keys(getRectCtrls(cvsEl, rect))).toEqual([
    't',
    'b',
    'l',
    'r',
    'lt',
    'lb',
    'rt',
    'rb',
    'rotate',
  ]);
  rect.fixedAspectRatio = true;
  expect(Object.keys(getRectCtrls(cvsEl, rect))).toEqual([
    'lt',
    'lb',
    'rt',
    'rb',
    'rotate',
  ]);
});

function stringifyRect(rect: Rect) {
  return `{x: ${rect.x}, y: ${rect.y}, w: ${rect.w}, h: ${rect.h}}`;
}
