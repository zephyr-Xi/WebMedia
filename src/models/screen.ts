// const errorType = [
//   'AbortError',
//   'InvalidStateError',
//   'NotFoundError',
//   'NotReadableError',
//   'OverconstrainedError',
//   'TypeError'
// ] as const;

// const stream = await navigator.mediaDevices.getDisplayMedia({
//   video: {
//     displaySurface: 'monitor', // 'application' | 'browser' | 'window' | 'monitor'
//     cursor: 'always', // 'always' | 'motion' | 'never'
//     logicalSurface: true, // 捕获逻辑像素
//     width: { max: 1920 },
//     height: { max: 1080 },
//     frameRate: { max: 30 }
//   },
//   audio: true // 尝试捕获系统音频（受浏览器支持限制）
// });
type ConstraintsOptions = {
    video?: MediaTrackConstraints | boolean;
    audio?: MediaTrackConstraints | boolean;
    controller?: CaptureController;
    surface?: 'monitor' | 'window' | 'browser' | 'application';
  };
  
  type ConstraintsParamsType = {
    video?: MediaTrackConstraints | boolean;
    audio?: MediaTrackConstraints | boolean;
    surface?: 'monitor' | 'window' | 'browser' | 'application';
  };
  
  export default class Screen {
    private stream: MediaStream | null = null;
    private controller: CaptureController | null = null;
    private constraints: ConstraintsOptions = {
      video: true,
      audio: false,
      surface: 'browser'
    };
  
    /**
     * 创建 CaptureController（可选）
     */
    private createController() {
      if ('CaptureController' in window && 'setFocusBehavior' in CaptureController.prototype) {
        this.controller = new CaptureController();
        this.controller.setFocusBehavior('no-focus-change');
      }
    }
  
    /**
     * 创建屏幕捕获流
     * @param _constraints 屏幕捕获约束参数
     * @param needController 是否需要 CaptureController
     */
    async create(_constraints?: ConstraintsParamsType, needController = true) {
      Object.assign(this.constraints, _constraints);
  
      if (needController) {
        this.createController();
        (this.constraints as any).controller = this.controller;
      }
  
      try {
        this.stream = await navigator.mediaDevices.getDisplayMedia(this.constraints as any);
      } catch (error: any) {
        console.error('屏幕捕获失败:', error);
        throw error;
      }
    }
  
    /**
     * 获取当前屏幕流
     */
    async getStream() {
      if (!this.stream) throw new Error('ScreenStream 未创建或已关闭，请先调用 create 方法');
      return this.stream;
    }
  
    /**
     * 停止屏幕捕获（关闭所有轨道）
     */
    stop() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  
    /**
     * 销毁：关闭流 + 清空 controller + 重置约束
     */
    destroy() {
      this.stop();
      this.controller = null;
      this.constraints = {
        video: true,
        audio: false,
        surface: 'browser'
      };
    }
  
    /**
     * 当前是否正在录制
     */
    isActive() {
      return !!(this.stream && this.stream.active);
    }
  }