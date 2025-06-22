interface CONFIG {
    fillStyle: string;
    spacing: number;
    barWidth?: number;
    visualType?: 'bar2' | 'bar1';
    fftSize?: number;
  }
  
  export default class SoundWave {
    private waveFn = {
      bar1: this.drawWaveBarStyleBase.bind(this),
      bar2: this.drawWaveBarStyleMirror.bind(this)
    };
  
    public source: MediaStreamAudioSourceNode | null = null; // for detective
    private audioCtx!: AudioContext;
    private analyser!: AnalyserNode;
    private canvas!: HTMLCanvasElement;
    private canvasCtx!: CanvasRenderingContext2D;
    private NORMALIZED_FREQUENCY_RANGE = 255;
    private drawVisual!: any;
    private visualType: 'bar2' | 'bar1' = 'bar2';
    private barWidth = 8;
    private fillStyle = '#DF00BB';
    private spacing = 8;
    private fftSize = 2048;
    private freqDataArrayTemp: Uint8Array = new Uint8Array();
    private streamId = '';
    private isInit = false;
  
    constructor(canvas: HTMLCanvasElement, config: CONFIG) {
      this.initCanvas(canvas);
      this.updateConfig(config);
      this.freqDataArrayTemp = new Uint8Array(this.fftSize / 2);
    }
  
    public updateConfig(config: CONFIG) {
      Object.assign(this, config);
      // this.canvasCtx.fillStyle = this.fillStyle;
      this.canvasCtx.fillStyle = 'transparent';
    }
  
    private initCanvas(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      this.canvasCtx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }
  
    public intAnalyser() {
      console.log('debugger: init sound wave');
      try {
        this.audioCtx = new window.AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.minDecibels = -80; //-120;
        this.analyser.maxDecibels = -10;
        this.analyser.smoothingTimeConstant = 0.9; //0.8
        this.isInit = true;
      } catch (error) {
        this.isInit = true;
        console.error('wave init error again', error);
      }
    }
  
    public handleStreamToShow(stream: MediaStream, isTimeLine = false) {
      if (!stream.getTracks().length) {
        this.source = null;
        console.log('音频缺乏轨道');
        return;
      }
      if (!this.isInit) {
        this.intAnalyser();
      }
      if (!this.streamId) {
        this.streamId = stream.id;
      }
      // dynamic update stream and source
      if (stream.id !== this.streamId || !this.source) {
        this.streamId = stream.id;
        this.source = this.audioCtx.createMediaStreamSource(stream);
        const numOfChannels = stream.getTracks().length;
        console.log('total num of channels', numOfChannels);
        const merger = this.audioCtx.createChannelMerger(numOfChannels);
        // this.isNeedMerge = false;
        stream.getTracks().forEach((audioTrack, i) => {
          const ms = new MediaStream();
          ms.addTrack(audioTrack);
          this.source = this.audioCtx.createMediaStreamSource(ms);
          this.source.connect(merger, 0, i);
        });
  
        merger.connect(this.analyser);
      }
      if (isTimeLine) {
        this.renderByTimeTick();
      } else {
        this.visualize();
      }
    }
  
    public reset() {
      this.source = null;
    }
  
    private visualize() {
      const { width, height } = this.canvas;
      this.canvasCtx.clearRect(0, 0, width, height);
      const bufferLength = this.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const draw = () => {
        this.drawVisual = requestAnimationFrame(draw);
        this.canvasCtx.clearRect(0, 0, width, height);
        this.analyser.getByteTimeDomainData(dataArray);
        this.canvasCtx.fillStyle = this.fillStyle;
        if (this.visualType.includes('bar')) {
          const freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);
          const barCount = freqDataArray.length;
          this.analyser.getByteFrequencyData(freqDataArray);
          for (let i = 0; i < barCount; i += 1) {
            this.waveFn[this.visualType](i, freqDataArray[i], height);
          }
        }
      };
      draw();
    }
  
    public renderByTimeTick(isPlaying = true) {
      const { width, height } = this.canvas;
      this.analyser.fftSize = this.fftSize;
      this.canvasCtx.clearRect(0, 0, width, height);
      if (this.visualType.includes('bar')) {
        const freqDataArray = isPlaying
          ? new Uint8Array(this.analyser.frequencyBinCount)
          : this.freqDataArrayTemp;
        if (isPlaying) {
          this.analyser.getByteFrequencyData(freqDataArray);
          this.freqDataArrayTemp = freqDataArray;
        }
        const barCount = freqDataArray.length;
        for (let i = 0; i < barCount; i += 1) {
          this.waveFn[this.visualType](i, freqDataArray[i], height);
        }
      }
    }
  
    drawStaticFreqData() {
      const { width, height } = this.canvas;
      this.canvasCtx.clearRect(0, 0, width, height);
      const freqDataArray = this.freqDataArrayTemp;
      const barCount = freqDataArray.length;
      for (let i = 0; i < barCount; i += 1) {
        this.waveFn[this.visualType](i, freqDataArray[i], height);
      }
    }
  
    private drawWaveBarStyleBase(i: number, frequency: number, layerHeight: number) {
      const SPACING = this.spacing;
      const percentageOfFreq = frequency / this.NORMALIZED_FREQUENCY_RANGE;
      const { barWidth } = this;
      const tempH = percentageOfFreq * layerHeight;
      const barHeight = tempH < 10 ? 10 : tempH;
      console.log();
      const bY = layerHeight - barHeight;
      const bX = i * (barWidth + SPACING);
      this.canvasCtx.fillRect(bX, bY, barWidth, barHeight);
    }
  
    private drawWaveBarStyleMirror(i: number, frequency: number, layerHeight: number) {
      const SPACING = this.spacing;
      const percentageOfFreq = frequency / this.NORMALIZED_FREQUENCY_RANGE;
      const per = 0.5;
      const OFFSET = layerHeight / 2;
      const { barWidth } = this;
      const tempH = percentageOfFreq * layerHeight * per;
      const barHeight = tempH < 15 ? 15 : tempH;
      const bY = layerHeight - barHeight;
      const bX = i * (barWidth + SPACING);
      this.canvasCtx.fillRect(bX, bY - OFFSET, barWidth, barHeight);
      this.canvasCtx.fillRect(bX, OFFSET, barWidth, barHeight);
    }
  
    // close draw for record
    public close() {
      cancelAnimationFrame(this.drawVisual);
    }
  } 