export default class Camera {
    private stream: MediaStream | null = null;
  
    async create() {
      if (this.stream) {
        return Promise.resolve(this.stream);
      }
  
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { min: 480, ideal: 1280, max: 1920 },
            height: { min: 288, ideal: 720, max: 1080 }
          },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
      } catch (error: any) {
        console.error('摄像头流创建失败:', error);
        throw error;
      }
    }
  
    async getStream() {
      if (!this.stream) throw new Error('摄像头流未创建，请先调用 create()');
  
      return this.stream;
    }
  
    destroy() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  
    isActive(): boolean {
      return !!(this.stream && this.stream.active);
    }
  }