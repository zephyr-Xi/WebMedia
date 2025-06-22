const DEVICE_CAMERA_KEY = 'videoinput'; // 摄像头设备类型
const DEVICE_MICROPHONE_KEY = 'audioinput'; // 麦克风设备类型
const DEVICE_SPEAKER_KEY = 'audiooutput'; // 扬声器设备类型

type DeviceStateType = 'authorized' | 'unauthorized' | 'unknown'; // 设备状态类型
// 设备状态校验条件
// 已授权设备（有 deviceId 和 label）
// 未授权设备（无 label 或 deviceId）

type ExtendedMediaDeviceInfo = MediaDeviceInfo & {
  state?: DeviceStateType; // Add an optional 'authorized' property
};

type DevicesType = {
  cameras: ExtendedMediaDeviceInfo[];
  microphones: ExtendedMediaDeviceInfo[];
  speakers: ExtendedMediaDeviceInfo[];
};

export default class DeviceManager {
  private devices: MediaDeviceInfo[] = [];
  private cameraDevices: MediaDeviceInfo[] = [];
  private microphoneDevices: MediaDeviceInfo[] = [];
  private speakerDevices: MediaDeviceInfo[] = [];
  private first = false; // 是否第一次获取设备

  constructor(callback: (devices: DevicesType | null) => void) {
    // 检测浏览器支持情况
    if (!this.detectBrowserSupport()) throw new Error('browser_not_support');
    // 初始化时设置为 true，表示第一次获取设备
    this.first = true;
    this.onDeviceChange(callback);
  }

  // 获取所有设备
  async getDevices(): Promise<DevicesType | null> {
    if (!navigator?.mediaDevices?.enumerateDevices) return null;
    try {
      this.devices = await navigator.mediaDevices.enumerateDevices();
      console.info('获取媒体设备列表:', this.devices);
      const devicesGroup = this.setDevicesAuthorizedStatus();
      this.cameraDevices = devicesGroup.cameras;
      this.microphoneDevices = devicesGroup.microphones;
      this.speakerDevices = devicesGroup.speakers;
      return {
        cameras: this.cameraDevices,
        microphones: this.microphoneDevices,
        speakers: this.speakerDevices
      };
    } catch (error) {
      console.error('Error getting devices:', error);
      throw error;
    }
  }

  // 刷新设备列表
  refreshDevices(callback: (devices: DevicesType | null) => void) {
    this.getDevices().then(devices => callback(devices));
  }

  // 监听设备变化
  onDeviceChange(callback: (devices: DevicesType | null) => void) {
    if (this.first) {
      console.info('Device change listener already set, skipping...');
      this.refreshDevices(callback);
      this.first = false; // 重置为 false，确保只在第一次调用时获取设备
      return;
    }
    console.log('Listening for device changes...');
    if (!navigator.mediaDevices) {
      console.warn('Device change events are not supported in this browser.');
      return;
    }
    navigator.mediaDevices.ondevicechange = () => {
      console.info('Device change detected, updating device list...');
      this.refreshDevices(callback);
    };
  }

  // 设置设备授权状态
  setDevicesAuthorizedStatus(): DevicesType {
    if (!this.devices || this.devices.length === 0) {
      return {
        cameras: [] as ExtendedMediaDeviceInfo[],
        microphones: [] as ExtendedMediaDeviceInfo[],
        speakers: [] as ExtendedMediaDeviceInfo[]
      };
    }

    const cameras = [] as MediaDeviceInfo[];
    const microphones = [] as MediaDeviceInfo[];
    const speakers = [] as MediaDeviceInfo[];

    console.info('xyl recorder app log -- 设备列表:', this.devices);

    this.devices.forEach((device: ExtendedMediaDeviceInfo) => {
      if (device.kind === DEVICE_CAMERA_KEY) {
        device.state = this.isUnauthorizedDevice(device) ? 'unauthorized' : 'authorized';
        cameras.push(device);
      } else if (device.kind === DEVICE_MICROPHONE_KEY) {
        device.state = this.isUnauthorizedDevice(device) ? 'unauthorized' : 'authorized';
        microphones.push(device);
      } else if (device.kind === DEVICE_SPEAKER_KEY) {
        device.state = this.isUnauthorizedDevice(device) ? 'unauthorized' : 'authorized';
        speakers.push(device);
      }
    });

    return { cameras, microphones, speakers } as DevicesType;
  }

  // 判断设备是否未授权
  isUnauthorizedDevice(device: MediaDeviceInfo): boolean {
    return !device.deviceId || !device.label;
  }

  detectBrowserSupport() {
    const support = {
      enumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      audioOutput: 'setSinkId' in HTMLMediaElement.prototype
    };

    if (!support.enumerateDevices || !support.getUserMedia) {
      console.info('当前浏览器不支持媒体设备访问，请使用最新版本的 Chrome、Edge 或 Firefox。');
      return false;
    }

    return support;
  }
}
