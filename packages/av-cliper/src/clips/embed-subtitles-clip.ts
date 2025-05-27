import { Log } from '@fly-cut/internal-utils';
import { IClip } from './iclip';
import { ITextStyle } from './text-clip';

interface SubtitleStruct {
  start: number;
  end: number;
  text: string;
}

interface IEmbedSubtitlesOpts {
  type?: 'srt';
  width: number;
  height: number;
  style?: Partial<ITextStyle>;
}

/**
 * 嵌入式字幕，将字幕（目前仅支持 SRT 格式）嵌入视频画面中
 */
export class EmbedSubtitlesClip implements IClip {
  ready: IClip['ready'];
  #subtitles: SubtitleStruct[] = [];
  #meta = {
    width: 0,
    height: 0,
    duration: 0,
  };

  get meta() {
    return { ...this.#meta };
  }

  #defaultStyle: Required<ITextStyle> = {
    fontSize: 30,
    fontFamily: 'Noto Sans SC',
    fontWeight: 'normal',
    fontColor: '#FFF',
    fontStyle: 'normal',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 1.5,
    stroke: '#000',
    strokeWidth: 5,
    shadow: true,
    shadowColor: '#000',
    shadowBlur: 4,
    shadowAngle: 45,
    shadowDistance: 2,
    padding: 0,
    backgroundColor: '',
    wordWrapWidth: 0,
    breakWords: true,
  };

  #opts: {
    type: 'srt';
    width: number;
    height: number;
    style: Required<ITextStyle>;
  };

  #cvs: OffscreenCanvas = new OffscreenCanvas(1, 1);
  #ctx: OffscreenCanvasRenderingContext2D = this.#cvs.getContext('2d')!;
  #lastVF: VideoFrame | null = null;
  #lineHeight = 0;
  #linePadding = 0;

  constructor(content: string | SubtitleStruct[], opts: IEmbedSubtitlesOpts) {
    this.#subtitles = Array.isArray(content)
      ? content
      : parseSrt(content).map(({ start, end, text }) => ({
          start: start * 1e6,
          end: end * 1e6,
          text,
        }));
    if (this.#subtitles.length === 0) throw Error('No subtitles content');

    this.#opts = {
      type: 'srt',
      width: opts.width,
      height: opts.height,
      style: {
        ...this.#defaultStyle,
        ...opts.style,
      },
    };

    // 初始化画布和上下文
    this.#initCanvas();

    this.#meta = {
      width: this.#opts.width,
      height: this.#opts.height,
      duration: this.#subtitles.at(-1)?.end ?? 0,
    };

    this.ready = Promise.resolve(this.meta);
  }

  /**
   * 初始化画布和上下文
   */
  #initCanvas() {
    const style = this.#opts.style;

    // 计算padding
    let paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0;

    if (typeof style.padding === 'number') {
      paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
    } else if (style.padding) {
      paddingTop = style.padding.top || 0;
      paddingRight = style.padding.right || 0;
      paddingBottom = style.padding.bottom || 0;
      paddingLeft = style.padding.left || 0;
    }

    // 保存padding值供后续使用
    this.#linePadding = Math.max(paddingLeft, paddingRight);
    // 行高只需要考虑字体大小和行间距
    this.#lineHeight = style.fontSize * style.lineHeight;

    // 初始化画布
    this.#cvs = new OffscreenCanvas(this.#opts.width, this.#opts.height);
    this.#ctx = this.#cvs.getContext('2d')!;

    // 设置字体
    this.#setFont();
  }

  /**
   * 设置字体样式
   */
  #setFont() {
    const {
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      textAlign,
      letterSpacing,
    } = this.#opts.style;
    const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    this.#ctx.font = fontString;
    this.#ctx.textAlign = textAlign;
    this.#ctx.textBaseline = 'middle';
    this.#ctx.letterSpacing = `${letterSpacing}px`;
  }

  /**
   * 计算单行文本的宽度
   */
  #calculateLineWidth(line: string): number {
    const { letterSpacing } = this.#opts.style;
    if (letterSpacing === 0) {
      return this.#ctx.measureText(line).width;
    }

    const chars = line.split('');
    return chars.reduce((width, char, index) => {
      const charWidth = this.#ctx.measureText(char).width;
      return width + charWidth + (index < chars.length - 1 ? letterSpacing : 0);
    }, 0);
  }

  /**
   * 计算文本换行
   */
  #calculateWrappedLines(text: string): string[] {
    const { wordWrapWidth, breakWords = true } = this.#opts.style;
    if (!wordWrapWidth) return text.split('\n');

    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push('');
        continue;
      }

      if (!breakWords) {
        // 按词换行
        const words = paragraph.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const lineWidth = this.#calculateLineWidth(testLine);

          if (lineWidth > wordWrapWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }
      } else {
        // 按字符换行
        let currentLine = '';
        const chars = Array.from(paragraph);

        for (const char of chars) {
          const testLine = currentLine + char;
          const lineWidth = this.#calculateLineWidth(testLine);

          if (lineWidth > wordWrapWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }
      }
    }

    return lines;
  }

  /**
   * 渲染文本
   */
  #renderText(text: string) {
    const { width, height } = this.#cvs;
    const style = this.#opts.style;
    const ctx = this.#ctx;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 计算文本行
    const lines = this.#calculateWrappedLines(text);

    // 计算padding
    let paddingTop = 0,
      paddingBottom = 0;
    if (typeof style.padding === 'number') {
      paddingTop = paddingBottom = style.padding;
    } else if (style.padding) {
      paddingTop = style.padding.top || 0;
      paddingBottom = style.padding.bottom || 0;
    }

    // 计算文本块的总高度（包含上下padding）
    const totalTextHeight = lines.length * this.#lineHeight;
    const totalHeight = totalTextHeight + paddingTop + paddingBottom;

    // 计算起始Y位置（从底部向上，考虑padding）
    const startY = height - paddingBottom - totalTextHeight;

    // 逐行渲染文本
    lines.forEach((line, index) => {
      const lineY = startY + index * this.#lineHeight + this.#lineHeight / 2;
      this.#renderTextLine(line, width / 2, lineY);
    });
  }

  /**
   * 渲染单行文本
   */
  #renderTextLine(line: string, x: number, y: number) {
    const { style } = this.#opts;
    const ctx = this.#ctx;

    // 绘制背景，只在明确设置了背景色且不为空字符串时才绘制
    if (style.backgroundColor && style.backgroundColor !== '') {
      const txtMeas = ctx.measureText(line);
      const bgWidth = txtMeas.width + this.#linePadding * 2;
      const bgHeight = this.#lineHeight;
      const bgX = x - bgWidth / 2;
      const bgY = y - bgHeight / 2;

      ctx.fillStyle = style.backgroundColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    }

    // 设置阴影
    if (style.shadow) {
      ctx.shadowColor = style.shadowColor;
      const offsetX =
        style.shadowDistance * Math.cos(style.shadowAngle * (Math.PI / 180));
      const offsetY =
        style.shadowDistance * Math.sin(style.shadowAngle * (Math.PI / 180));
      ctx.shadowOffsetX = offsetX;
      ctx.shadowOffsetY = offsetY;
      ctx.shadowBlur = style.shadowBlur;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;

    // 绘制描边
    if (style.stroke) {
      ctx.lineWidth = style.strokeWidth;
      ctx.strokeStyle = style.stroke;
      ctx.strokeText(line, x, y);
    }

    // 绘制文本
    ctx.fillStyle = style.fontColor;
    ctx.fillText(line, x, y);
  }

  /**
   * 更新字幕样式
   */
  setStyle(style: Partial<ITextStyle>) {
    this.#opts.style = {
      ...this.#opts.style,
      ...style,
    };

    // 重新初始化画布
    this.#initCanvas();

    // 清除缓存帧
    this.#lastVF?.close();
    this.#lastVF = null;
  }

  /**
   * @see {@link IClip.tick}
   */
  async tick(time: number): Promise<{
    video?: VideoFrame;
    audio?: Float32Array[];
    state: 'success' | 'done';
  }> {
    if (
      this.#lastVF != null &&
      time >= this.#lastVF.timestamp &&
      time <= this.#lastVF.timestamp + (this.#lastVF.duration ?? 0)
    ) {
      return { video: this.#lastVF.clone(), state: 'success' };
    }

    let i = 0;
    for (; i < this.#subtitles.length; i += 1) {
      if (time <= this.#subtitles[i].end) break;
    }

    const it = this.#subtitles[i] ?? this.#subtitles.at(-1);
    if (time > it.end) return { state: 'done' };
    if (time < it.start) {
      // 此时无字幕内容，清空画布
      this.#ctx.clearRect(0, 0, this.#cvs.width, this.#cvs.height);
      const vf = new VideoFrame(this.#cvs, {
        timestamp: time,
        // 直到下个字幕出现的时机
        duration: it.start - time,
      });
      this.#lastVF?.close();
      this.#lastVF = vf;

      return { video: vf.clone(), state: 'success' };
    }

    this.#renderText(it.text);

    const vf = new VideoFrame(this.#cvs, {
      timestamp: time,
      duration: it.end - time,
    });
    this.#lastVF?.close();
    this.#lastVF = vf;

    return { video: vf.clone(), state: 'success' };
  }

  /**
   * @see {@link IClip.split}
   */
  async split(time: number) {
    await this.ready;
    let hitIdx = -1;
    for (let i = 0; i < this.#subtitles.length; i++) {
      const sub = this.#subtitles[i];
      if (time > sub.start) continue;
      hitIdx = i;
      break;
    }
    if (hitIdx === -1) throw Error('Not found subtitle by time');
    const preSlice = this.#subtitles.slice(0, hitIdx).map((s) => ({ ...s }));
    let preLastIt = preSlice.at(-1);
    let postFirstIt = null;
    // 切割时间命中字幕区间，需要将当前字幕元素拆成前后两份
    if (preLastIt != null && preLastIt.end > time) {
      postFirstIt = {
        start: 0,
        end: preLastIt.end - time,
        text: preLastIt.text,
      };

      preLastIt.end = time;
    }
    const postSlice = this.#subtitles
      .slice(hitIdx)
      .map((s) => ({ ...s, start: s.start - time, end: s.end - time }));
    if (postFirstIt != null) postSlice.unshift(postFirstIt);
    return [
      new EmbedSubtitlesClip(preSlice, {
        width: this.#opts.width,
        height: this.#opts.height,
        style: this.#opts.style,
      }),
      new EmbedSubtitlesClip(postSlice, {
        width: this.#opts.width,
        height: this.#opts.height,
        style: this.#opts.style,
      }),
    ] as [this, this];
  }

  /**
   * @see {@link IClip.clone}
   */
  async clone() {
    return new EmbedSubtitlesClip(this.#subtitles.slice(0), {
      width: this.#opts.width,
      height: this.#opts.height,
      style: this.#opts.style,
    }) as this;
  }

  /**
   * 通过时间戳，修改字幕内容
   */
  updateSubtitle(subtitle: SubtitleStruct) {
    this.#subtitles.forEach((s) => {
      if (s.start === subtitle.start && s.end === subtitle.end) {
        s.text = subtitle.text;
      }
    });
  }

  /**
   * 删除指定的字幕并更新后续字幕的时间戳
   */
  deleteSubtitle(subtitle: SubtitleStruct): SubtitleStruct[] {
    const deleteIndex = this.#subtitles.findIndex(
      (s) => s.start === subtitle.start && s.end === subtitle.end,
    );

    if (deleteIndex === -1) {
      return this.#subtitles;
    }

    const deletedDuration = subtitle.end - subtitle.start;
    this.#subtitles.splice(deleteIndex, 1);

    // 更新删除位置之后所有字幕的时间戳
    for (let i = deleteIndex; i < this.#subtitles.length; i++) {
      this.#subtitles[i].start -= deletedDuration;
      this.#subtitles[i].end -= deletedDuration;
    }

    // 更新总时长
    this.#meta.duration = this.#subtitles.at(-1)?.end ?? 0;

    // 清除缓存帧
    this.#lastVF?.close();
    this.#lastVF = null;

    return [...this.#subtitles];
  }

  /**
   * @see {@link IClip.destroy}
   */
  destroy() {
    this.#lastVF?.close();
  }
}

// SRT字幕格式解析
function srtTimeToSeconds(time: string) {
  const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (match == null) throw Error(`time format error: ${time}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 60 * 60 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseSrt(srt: string) {
  return srt
    .split(/\r|\n/)
    .map((s) => s.trim())
    .filter((str) => str.length > 0)
    .map((s) => ({
      lineStr: s,
      match: s.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/),
    }))
    .filter(
      ({ lineStr }, idx, source) =>
        !(/^\d+$/.test(lineStr) && source[idx + 1]?.match != null),
    )
    .reduce(
      (acc, { lineStr, match }) => {
        if (match == null) {
          const last = acc.at(-1);
          if (last == null) return acc;

          last.text += last.text.length === 0 ? lineStr : `\n${lineStr}`;
        } else {
          acc.push({
            start: srtTimeToSeconds(match[1]),
            end: srtTimeToSeconds(match[2]),
            text: '',
          });
        }

        return acc;
      },
      [] as Array<{
        start: number;
        end: number;
        text: string;
      }>,
    );
}
