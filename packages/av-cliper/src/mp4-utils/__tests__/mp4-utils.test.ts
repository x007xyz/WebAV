import { autoReadStream, file2stream } from '@webav/internal-utils';
import mp4box from '@webav/mp4box.js';
import { file, write } from 'opfs-tools';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import {
  createVFRotater,
  parseMatrix,
  quickParseMP4File,
} from '../mp4box-utils';

beforeAll(() => {
  vi.useFakeTimers();
});

describe('file2stream', () => {
  test('enqueue data to stream', () => {
    const file = mp4box.createFile();
    file.boxes.push(
      // @ts-expect-error
      ...Array(5)
        .fill(0)
        .map((_, idx) => ({
          type: ['ftyp', 'moov', 'moof', 'mdat'][idx],
          write: (ds: any) => {
            ds.writeUint8Array(new Uint8Array([1]));
          },
        })),
    );

    const { stop, stream } = file2stream(file, 500);
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(stop).toBeInstanceOf(Function);

    vi.advanceTimersByTime(500);

    autoReadStream(stream, {
      onChunk: async (chunk) => {
        expect(chunk).toEqual(new Uint8Array([1, 1, 1, 1, 1]));
      },
      onDone: () => {},
    });
    // 内存引用被清理
    expect([...file.boxes]).toEqual(Array(5).fill(undefined));
  });

  test('stop stream', () => {
    const file = mp4box.createFile();
    // @ts-expect-error
    file.boxes = Array(5)
      .fill(0)
      .map(() => ({ write: vi.fn(), data: new ArrayBuffer(0) }));
    vi.spyOn(file, 'flush');
    vi.spyOn(globalThis, 'clearInterval');

    const { stop } = file2stream(file, 500);
    stop();

    expect(file.flush).toBeCalled();
    expect(vi.getTimerCount()).toBe(1);
    expect(globalThis.clearInterval).toBeCalled();
  });

  test('cancel stream', () => {
    const file = mp4box.createFile();
    // @ts-expect-error
    file.boxes = Array(5)
      .fill(0)
      .map(() => ({ write: vi.fn(), data: new ArrayBuffer(0) }));
    vi.spyOn(file, 'flush');
    vi.spyOn(globalThis, 'clearInterval');

    const spyCancel = vi.fn();
    const { stream } = file2stream(file, 500, spyCancel);
    stream.cancel();

    expect(globalThis.clearInterval).toBeCalled();
    expect(spyCancel).toBeCalled();
  });
});

const mp4_123 = `//${location.host}/video/123.mp4`;
test('quickParseMP4File', async () => {
  const f = file('/unit-test/123.mp4');
  await write(f, (await fetch(mp4_123)).body!);
  const reader = await f.createReader();
  let sampleCount = 0;
  await quickParseMP4File(
    reader,
    ({ info }) => {
      expect(info.timescale).toBe(1000);
      expect(info.duration).toBe(1024);
      expect(info.isFragmented).toBe(false);
      expect(info.tracks.length).toBe(2);
    },
    (_, __, samples) => {
      sampleCount += samples.length;
    },
  );
  expect(sampleCount).toBe(40);
  await reader.close();
});

test('vfRotater can be rotate VideoFrame instance', () => {
  const vf = new VideoFrame(new Uint8Array(200 * 100 * 4), {
    codedHeight: 100,
    codedWidth: 200,
    format: 'RGBA',
    timestamp: 0,
  });

  // Test 90 degree rotation
  const rotater90 = createVFRotater(200, 100, 90);
  const rotatedVF90 = rotater90(vf.clone());
  expect(rotatedVF90).not.toBeNull();
  if (rotatedVF90 == null) throw new Error('must not be null');
  expect(rotatedVF90.codedWidth).toBe(100);
  expect(rotatedVF90.codedHeight).toBe(200);
  rotatedVF90.close();

  // Test 180 degree rotation
  const rotater180 = createVFRotater(200, 100, 180);
  const rotatedVF180 = rotater180(vf.clone());
  expect(rotatedVF180).not.toBeNull();
  if (rotatedVF180 == null) throw new Error('must not be null');
  expect(rotatedVF180.codedWidth).toBe(200);
  expect(rotatedVF180.codedHeight).toBe(100);
  rotatedVF180.close();

  // Test 270 degree rotation
  const rotater270 = createVFRotater(200, 100, 270);
  const rotatedVF270 = rotater270(vf.clone());
  expect(rotatedVF270).not.toBeNull();
  if (rotatedVF270 == null) throw new Error('must not be null');
  expect(rotatedVF270.codedWidth).toBe(100);
  expect(rotatedVF270.codedHeight).toBe(200);
  rotatedVF270.close();

  // Test 0 degree rotation
  const rotater0 = createVFRotater(200, 100, 0);
  const vfClone = vf.clone();
  const rotatedVF0 = rotater0(vfClone);
  // For 0 rotation, it should return the original frame
  expect(rotatedVF0).toBe(vfClone);
  rotatedVF0?.close();

  vf.close();
});

describe('parseMatrix', () => {
  test('should throw error for invalid matrix length', () => {
    const matrix = new Int32Array(8);
    expect(parseMatrix(matrix)).toEqual({});
  });

  test('should parse 0 degree rotation matrix', () => {
    const matrix = new Int32Array([65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]);
    const result = parseMatrix(matrix);
    expect(result.rotationDeg).toBe(0);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
    expect(result.translateX).toBe(0);
    expect(result.translateY).toBe(0);
  });

  test('should parse 90 degree rotation matrix', () => {
    // matrix for 90 deg rotation
    const matrix = new Int32Array([
      0, 65536, 0, -65536, 0, 0, 0, 0, 1073741824,
    ]);
    const result = parseMatrix(matrix);
    expect(result.rotationDeg).toBe(-90);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });

  test('should parse 180 degree rotation matrix', () => {
    const matrix = new Int32Array([
      -65536, 0, 0, 0, -65536, 0, 0, 0, 1073741824,
    ]);
    const result = parseMatrix(matrix);
    expect(result.rotationDeg).toBe(180);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });

  test('should parse 270 degree rotation matrix', () => {
    const matrix = new Int32Array([
      0, -65536, 0, 65536, 0, 0, 0, 0, 1073741824,
    ]);
    const result = parseMatrix(matrix);
    expect(result.rotationDeg).toBe(90);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });

  test('should parse matrix with translation', () => {
    const width = 1920;
    const height = 1080;
    // 180 deg rotation + translation
    const matrix = new Int32Array([
      -65536,
      0,
      0,
      0,
      -65536,
      0,
      width * 65536,
      height * 65536,
      1073741824,
    ]);
    const result = parseMatrix(matrix);
    expect(result.rotationDeg).toBe(180);
    expect(result.translateX).toBe(width);
    expect(result.translateY).toBe(height);
  });
});
