// 视图控制器 负责根据模式选择控制录制容器内的媒体流渲染
// 目前支持模式 ：仅摄像头（单）、仅麦克风、仅屏幕（单）、单摄像头&单屏幕
// 后续可以扩展为多摄像头、多麦克风、多屏幕等模式
import SoundWave from './soundWave';

type ViewModeType = 'only-camera' | 'only-microphone' | 'only-screen' | 'camera&screen';
type NodeType = 'video' | 'canvas';
type NodeAttributesType = Partial<Record<string, any>>;
type NodeStylesType = Partial<CSSStyleDeclaration>;
type AudioWaveNodeAttributesType = {
  fillStyle: string;
  spacing: number;
  barWidth: number;
};

export default class ViewController {
  private root: HTMLElement | null = null;
  private nodes = new Map<string, HTMLElement>(); // 用于存储不同类型的节点
  private mode: ViewModeType = 'only-camera'; // 默认模式为仅摄像头
  private nodeCrtFnMap = new Map<
    NodeType,
    (nodeAttributes?: NodeAttributesType, styles?: NodeStylesType) => HTMLElement
  >();

  constructor(root: HTMLElement | null) {
    if (!root) {
      throw new Error('ViewController requires a valid root element.');
    }
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Root must be an instance of HTMLElement.');
    }
    this.root = root;
    this.setNodeCrtFnMap();
  }

  setNodeCrtFnMap() {
    this.nodeCrtFnMap.set('video', this._createVideoNode.bind(this));
    this.nodeCrtFnMap.set('canvas', this._createCanvasNode.bind(this));
  }

  setMode(mode: ViewModeType) {
    if (this.mode === mode) return; // 如果模式没有变化，则不进行任何操作
    this.mode = mode;
  }

  render(
    mode: ViewModeType,
    streams: {
      camera?: MediaStream;
      screen?: MediaStream;
      microphone?: MediaStream;
    } | null
  ) {
    if (!this.root || !streams || !mode)
      throw new Error('ViewController requires a valid root element, streams, and mode.');

    this.setMode(mode); // 设置当前模式
    this.root.innerHTML = ''; // 清空当前内容

    if (this.mode === 'only-camera' || this.mode === 'only-screen') {
      if (!streams.camera && !streams.screen) throw new Error('至少需要提供摄像头或屏幕流');

      const _stream = this.mode === 'only-camera' ? streams.camera : streams.screen;
      const node = this.renderVideoStream(_stream as MediaStream) as HTMLVideoElement;

      this.root.appendChild(node);
      return;
    }
    if (this.mode === 'only-microphone') {
      if (!streams.microphone) throw new Error('需要提供麦克风流');

      const node = this.renderAudioWaveStream(streams.microphone as MediaStream);
      this.root.appendChild(node);
      return;
    }

    if (this.mode === 'camera&screen') {
      if (!streams.camera || !streams.screen) throw new Error('需要同时提供摄像头和屏幕流');

      const screenNode = this.renderVideoStream(streams.screen as MediaStream);
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      sleep(1000); // 确保屏幕流加载完成
      const cameraNode = this.renderVideoStream(
        streams.camera as MediaStream,
        {},
        {
          width: '200px',
          height: '150px',
          position: 'absolute',
          right: '0',
          bottom: '0',
          zIndex: 1000
        }
      );
      this.root.appendChild(cameraNode as HTMLVideoElement);
      this.root.appendChild(screenNode as HTMLVideoElement);
      this.root.style.position = 'relative'; // 确保根元素是相对定位的
      return;
    }

    throw new Error(`Unsupported mode: ${mode}`);
  }

  renderVideoStream(
    screenStream: MediaStream | null,
    nodeAttributes: NodeAttributesType = {},
    styles: NodeStylesType = {}
  ) {
    if (!screenStream) throw new Error('屏幕流未提供或不可用');

    const node = this._createNode('video', 'element', nodeAttributes, styles) as HTMLVideoElement;
    node.srcObject = screenStream;
    (node as HTMLVideoElement).load(); // 确保视频加载
    return node;
  }

  renderAudioWaveStream(
    microphoneStream: MediaStream | null,
    nodeAttributes: NodeAttributesType = {},
    styles: NodeStylesType = {}
  ) {
    if (!microphoneStream) throw new Error('麦克风流未提供或不可用');

    const node = this._createNode(
      'canvas',
      'element',
      { ...nodeAttributes },
      styles
    ) as HTMLCanvasElement;

    const audioWave = new SoundWave(node, {
      fillStyle: '#73dbc0',
      spacing: 16,
      barWidth: 10
    });
    audioWave.handleStreamToShow(microphoneStream);
    return node;
  }

  // 创建节点的统一入口 可选放回节点id或者节点对象
  _createNode(
    type: NodeType,
    resType: 'id' | 'element', // 返回类型：id 或 element
    nodeAttributes: NodeAttributesType = {},
    styles: NodeStylesType = {}
  ): string | HTMLElement {
    if (!this.nodeCrtFnMap.has(type)) throw new Error(`Unsupported node type: ${type}`);

    const node =
      this.nodeCrtFnMap.get(type)?.call(this, nodeAttributes, styles) ||
      document.createElement('div');
    const id = node.id;
    this.nodes.set(id, node); // 存储节点以便后续使用

    return resType === 'element' ? node : id;
  }

  // 创建视频节点 用于渲染摄像头流、屏幕流等
  _createVideoNode(
    nodeAttributes: NodeAttributesType = {},
    styles: NodeStylesType = {}
  ): HTMLVideoElement {
    const video = document.createElement('video');

    Object.entries({
      id: `node-video-${Date.now()}`,
      muted: 'true',
      autoplay: 'true',
      playsinline: 'true',
      ...nodeAttributes
    }).forEach(([key, value]) => value != null && video.setAttribute(key, value));

    Object.assign(video.style, styles);

    return video;
  }

  // 创建画布节点 用于渲染音频波形等
  _createCanvasNode(
    nodeAttributes: NodeAttributesType = {},
    styles: NodeStylesType = {}
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    Object.entries({ ...{ id: `node-canvas-${Date.now()}` }, ...nodeAttributes }).forEach(
      ([key, value]) => value != null && canvas.setAttribute(key, value)
    );

    Object.assign(canvas.style, styles);

    return canvas;
  }
} 