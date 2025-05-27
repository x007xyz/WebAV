import { IClip } from './iclip';

export interface ITextStyle {
  // 基础字体样式
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontColor: string;
  fontStyle: 'italic' | 'underline' | 'bold' | string;
  textAlign: 'left' | 'center' | 'right';

  // 文本间距和行高
  letterSpacing: number;
  lineHeight: number;

  // 描边样式
  stroke?: string;
  strokeWidth?: number;

  // 阴影样式
  shadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowAngle?: number;
  shadowDistance?: number;

  // 容器样式
  padding:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
  wordWrapWidth?: number;
  backgroundColor?: string;

  // 文本换行设置
  breakWords?: boolean;
}

export interface ITextClipOpts {
  type: 'text';
  source: string;
  x?: number;
  y: number;
  text: string;
  style: ITextStyle;
}

export class TextClip implements IClip {
  ready: Promise<{ width: number; height: number; duration: number }>;
  #cvs: OffscreenCanvas = new OffscreenCanvas(1, 1);
  #ctx: OffscreenCanvasRenderingContext2D;
  #opts: ITextClipOpts;
  #lastVF: VideoFrame | null = null;
  #actualWidth: number = 0;
  #actualHeight: number = 0;

  constructor(opts: ITextClipOpts) {
    // 设置默认样式
    const defaultStyle: ITextStyle = {
      fontSize: 30,
      fontFamily: 'Noto Sans SC',
      fontWeight: 'normal',
      fontColor: '#FFF',
      fontStyle: 'normal',
      textAlign: 'center',
      letterSpacing: 0,
      lineHeight: 1.5,
      shadow: true,
      shadowColor: '#000',
      shadowBlur: 4,
      shadowAngle: 45,
      shadowDistance: 2,
      padding: 0,
      breakWords: true,
    };

    this.#opts = {
      type: 'text',
      source: opts.source,
      x: opts.x,
      y: opts.y,
      text: opts.text,
      style: {
        ...defaultStyle,
        ...opts.style,
      },
    };

    this.#ctx = this.#cvs.getContext('2d')!;

    // 计算实际宽高
    const dimensions = this.#calculateDimensions();
    this.#actualWidth = dimensions.width;
    this.#actualHeight = dimensions.height;

    // 重设canvas
    this.#cvs = new OffscreenCanvas(this.#actualWidth, this.#actualHeight);
    this.#ctx = this.#cvs.getContext('2d')!;

    // 渲染文本
    this.#renderText();

    this.ready = Promise.resolve({
      width: this.#actualWidth,
      height: this.#actualHeight,
      duration: Infinity,
    });
  }

  get meta() {
    return {
      width: this.#actualWidth,
      height: this.#actualHeight,
      duration: Infinity,
    };
  }

  #setFontForContext(ctx: OffscreenCanvasRenderingContext2D) {
    const { fontSize, fontFamily, fontWeight, fontStyle, textAlign } =
      this.#opts.style;

    // 设置字体
    const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.font = fontString;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';
  }

  #setFont() {
    this.#setFontForContext(this.#ctx);
  }

  #calculateLineWidth(
    line: string,
    ctx: OffscreenCanvasRenderingContext2D,
    letterSpacing: number,
  ): number {
    if (letterSpacing === 0) {
      return ctx.measureText(line).width;
    }

    const chars = line.split('');
    return chars.reduce((width, char, index) => {
      const charWidth = ctx.measureText(char).width;
      return width + charWidth + (index < chars.length - 1 ? letterSpacing : 0);
    }, 0);
  }

  #calculateWrappedLines(
    text: string,
    maxWidth: number,
    ctx: OffscreenCanvasRenderingContext2D,
    letterSpacing: number,
  ): string[] {
    const { breakWords = true } = this.#opts.style;
    const lines: string[] = [];

    // 首先按照换行符分割文本
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push('');
        continue;
      }

      if (!breakWords) {
        // 传统的按空格分词换行逻辑
        const words = paragraph.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const lineWidth = this.#calculateLineWidth(
            testLine,
            ctx,
            letterSpacing,
          );

          if (lineWidth > maxWidth && currentLine) {
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
        // 逐字符检查并换行
        let currentLine = '';
        const chars = Array.from(paragraph); // 使用Array.from正确处理Unicode字符

        for (const char of chars) {
          const testLine = currentLine + char;
          const lineWidth = this.#calculateLineWidth(
            testLine,
            ctx,
            letterSpacing,
          );

          if (lineWidth > maxWidth && currentLine) {
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

  #calculateDimensions(): { width: number; height: number } {
    const {
      text,
      style: { fontSize, lineHeight, letterSpacing, wordWrapWidth, padding },
    } = this.#opts;

    // 初始化临时canvas和上下文用于测量
    const tempCanvas = new OffscreenCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d')!;

    // 设置用于测量的字体
    this.#setFontForContext(tempCtx);

    // 计算padding值
    let paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0;

    if (typeof padding === 'number') {
      paddingTop = paddingRight = paddingBottom = paddingLeft = padding;
    } else if (padding) {
      paddingTop = padding.top || 0;
      paddingRight = padding.right || 0;
      paddingBottom = padding.bottom || 0;
      paddingLeft = padding.left || 0;
    }

    // 计算文本行
    const lines = wordWrapWidth
      ? this.#calculateWrappedLines(
          text,
          wordWrapWidth - paddingLeft - paddingRight,
          tempCtx,
          letterSpacing,
        )
      : text.split('\n');
    console.log('lines', lines);
    // 计算最大宽度
    let maxWidth = 0;
    for (const line of lines) {
      const lineWidth = this.#calculateLineWidth(line, tempCtx, letterSpacing);
      maxWidth = Math.max(maxWidth, lineWidth);
    }

    // 计算总高度
    const totalHeight = lines.length * fontSize * lineHeight;

    // 设置最终尺寸
    let finalWidth = wordWrapWidth || maxWidth + paddingLeft + paddingRight;

    console.log('finalWidth', finalWidth);
    let finalHeight = totalHeight + paddingTop + paddingBottom;

    // 确保最小尺寸
    finalWidth = Math.max(finalWidth, fontSize);
    finalHeight = Math.max(finalHeight, fontSize);

    return { width: finalWidth, height: finalHeight };
  }

  #renderText() {
    const {
      text,
      style: {
        backgroundColor,
        shadow,
        shadowColor,
        shadowBlur,
        shadowAngle,
        shadowDistance,
        fontSize,
        lineHeight,
        letterSpacing,
        wordWrapWidth,
        padding,
        fontColor,
        stroke,
        strokeWidth,
      },
    } = this.#opts;

    const ctx = this.#ctx;

    // 设置字体
    this.#setFont();

    // 清除画布
    ctx.clearRect(0, 0, this.#actualWidth, this.#actualHeight);

    // 如果有背景色，绘制背景
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, this.#actualWidth, this.#actualHeight);
    }

    // 计算padding值
    let paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0;

    if (typeof padding === 'number') {
      paddingTop = paddingRight = paddingBottom = paddingLeft = padding;
    } else if (padding) {
      paddingTop = padding.top || 0;
      paddingRight = padding.right || 0;
      paddingBottom = padding.bottom || 0;
      paddingLeft = padding.left || 0;
    }

    // 设置文本阴影
    if (shadow) {
      const offsetX =
        (shadowDistance || 2) * Math.cos((shadowAngle || 45) * (Math.PI / 180));
      const offsetY =
        (shadowDistance || 2) * Math.sin((shadowAngle || 45) * (Math.PI / 180));

      ctx.shadowColor = shadowColor || '#000';
      ctx.shadowOffsetX = offsetX;
      ctx.shadowOffsetY = offsetY;
      ctx.shadowBlur = shadowBlur || 4;
    } else {
      // 取消阴影
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    }

    // 计算文本行
    const lines = wordWrapWidth
      ? this.#calculateWrappedLines(
          text,
          wordWrapWidth - paddingLeft - paddingRight,
          ctx,
          letterSpacing,
        )
      : text.split('\n');

    // 计算文本块的总高度
    const totalTextHeight = lines.length * fontSize * lineHeight;

    // 计算起始位置（在文本画布内居中）
    let startX = paddingLeft;
    if (this.#opts.style.textAlign === 'center') {
      startX = this.#actualWidth / 2;
    } else if (this.#opts.style.textAlign === 'right') {
      startX = this.#actualWidth - paddingRight;
    }

    // 计算起始Y位置（考虑paddingTop和paddingBottom）
    const availableHeight = this.#actualHeight - paddingTop - paddingBottom;
    const startY =
      paddingTop + (availableHeight - totalTextHeight) / 2 + fontSize / 2;

    // 逐行渲染文本
    lines.forEach((line, index) => {
      const lineY = startY + index * (fontSize * lineHeight);
      this.#renderTextLine(line, startX, lineY);
    });
  }

  #renderTextLine(line: string, x: number, y: number) {
    const { letterSpacing, stroke, strokeWidth, fontColor } = this.#opts.style;

    const ctx = this.#ctx;

    // 如果有字间距，需要逐字渲染
    if (letterSpacing !== 0) {
      let currentX = x;
      const chars = line.split('');

      // 计算文本总宽度（包括字间距）
      const totalWidth = chars.reduce((width, char, index) => {
        const charWidth = ctx.measureText(char).width;
        return (
          width + charWidth + (index < chars.length - 1 ? letterSpacing : 0)
        );
      }, 0);

      // 根据textAlign调整起始位置
      if (this.#opts.style.textAlign === 'center') {
        currentX = x - totalWidth / 2;
      } else if (this.#opts.style.textAlign === 'right') {
        currentX = x - totalWidth;
      }

      chars.forEach((char, i) => {
        // 如果有描边，先绘制描边
        if (stroke) {
          ctx.lineWidth = strokeWidth || this.#opts.style.fontSize / 6;
          ctx.strokeStyle = stroke;
          ctx.strokeText(char, currentX, y);
        }

        // 绘制填充文本
        ctx.fillStyle = fontColor;
        ctx.fillText(char, currentX, y);

        // 更新X位置
        currentX += ctx.measureText(char).width + letterSpacing;
      });
    } else {
      // 使用Canvas原生的文本对齐功能
      ctx.textAlign = this.#opts.style.textAlign;

      // 如果有描边，先绘制描边
      if (stroke) {
        ctx.lineWidth = strokeWidth || this.#opts.style.fontSize / 6;
        ctx.strokeStyle = stroke;
        ctx.strokeText(line, x, y);
      }

      // 绘制填充文本
      ctx.fillStyle = fontColor;
      ctx.fillText(line, x, y);
    }
  }

  async tick(time: number) {
    // 如果已经有帧且时间戳相同，返回克隆帧
    if (this.#lastVF && time === this.#lastVF.timestamp) {
      return { video: this.#lastVF.clone(), state: 'success' as const };
    }

    // 创建新的视频帧
    const vf = new VideoFrame(this.#cvs, { timestamp: time });
    this.#lastVF?.close();
    this.#lastVF = vf;

    return { video: vf.clone(), state: 'success' as const };
  }

  async clone() {
    return new TextClip(this.#opts) as this;
  }

  /**
   * 更新文本样式
   * @param style 新的样式配置，将与现有样式合并
   */
  setStyle(style: Partial<ITextStyle>) {
    // 合并新样式与现有样式
    this.#opts.style = {
      ...this.#opts.style,
      ...style,
    };

    // 重新计算尺寸
    const dimensions = this.#calculateDimensions();
    this.#actualWidth = dimensions.width;
    this.#actualHeight = dimensions.height;

    // 重设canvas
    this.#cvs = new OffscreenCanvas(this.#actualWidth, this.#actualHeight);
    this.#ctx = this.#cvs.getContext('2d')!;

    // 重新渲染文本
    this.#renderText();

    // 关闭之前的帧
    this.#lastVF?.close();
    this.#lastVF = null;

    // 更新 ready Promise
    this.ready = Promise.resolve({
      width: this.#actualWidth,
      height: this.#actualHeight,
      duration: Infinity,
    });

    return this;
  }

  /**
   * 更新文本内容
   * @param text 新的文本内容
   */
  setText(text: string) {
    this.#opts.text = text;

    // 重新计算尺寸
    const dimensions = this.#calculateDimensions();
    this.#actualWidth = dimensions.width;
    this.#actualHeight = dimensions.height;

    // 重设canvas
    this.#cvs = new OffscreenCanvas(this.#actualWidth, this.#actualHeight);
    this.#ctx = this.#cvs.getContext('2d')!;

    // 重新渲染文本
    this.#renderText();

    // 关闭之前的帧
    this.#lastVF?.close();
    this.#lastVF = null;

    // 更新 ready Promise
    this.ready = Promise.resolve({
      width: this.#actualWidth,
      height: this.#actualHeight,
      duration: Infinity,
    });

    return this;
  }

  destroy() {
    this.#lastVF?.close();
    this.#lastVF = null;
  }
}
