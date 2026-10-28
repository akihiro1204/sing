// AudioWorklet: マイク入力を hop サンプル単位にまとめてメインスレッドへ送る。
// 重い解析はここでは行わない（音声スレッドを止めないため）。
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.hop = (options && options.processorOptions && options.processorOptions.hop) || 512;
    this.buf = new Float32Array(this.hop);
    this.fill = 0;
    this.chunkStartFrame = -1;
    this.droppedBlocks = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const ch = input && input[0];
    if (!ch) {
      // 入力が来ないブロック（無音入力・切断）を数える
      this.droppedBlocks++;
      return true;
    }
    let i = 0;
    while (i < ch.length) {
      if (this.fill === 0) this.chunkStartFrame = currentFrame + i;
      const n = Math.min(ch.length - i, this.hop - this.fill);
      this.buf.set(ch.subarray(i, i + n), this.fill);
      this.fill += n;
      i += n;
      if (this.fill === this.hop) {
        const out = this.buf;
        this.port.postMessage({ samples: out, startFrame: this.chunkStartFrame, dropped: this.droppedBlocks }, [out.buffer]);
        this.buf = new Float32Array(this.hop);
        this.fill = 0;
      }
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
