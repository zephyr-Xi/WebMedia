export type MediaDevicePermissionName = 'microphone' | 'camera';
export type MediaDevicePermissionStatus = 'granted' | 'denied' | 'prompt';

interface PermissionStatusWithChange extends PermissionStatus {
  onchange: ((this: PermissionStatus, ev: Event) => any) | null;
}

export default class PermissionManager {
  async query(name: MediaDevicePermissionName): Promise<PermissionStatusWithChange | null> {
    if (!navigator.permissions || !navigator.permissions.query) {
      console.warn('xyl recorder app log 当前环境不支持 Permissions API');
      return null;
    }

    try {
      const status = (await navigator.permissions.query({
        name
      } as any)) as PermissionStatusWithChange;
      return status;
    } catch (err) {
      console.error(`xyl recorder app log 查询权限 "${name}" 失败:`, err);
      return null;
    }
  }

  /**
   * 申请媒体权限
   */
  async request(name: MediaDevicePermissionName): Promise<MediaDevicePermissionStatus> {
    const constraints: MediaStreamConstraints =
      name === 'camera' ? { video: true } : { audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (err: any) {
      this.handleError(err);
      if (err?.name === 'NotAllowedError') return 'denied';
      if (err?.name === 'NotFoundError') return 'denied';
      console.error(`xyl recorder app log 申请 "${name}" 权限异常:`, err);
      throw err;
    }
  }

  handleError(err: any) {
    switch (err.name) {
      case 'NotAllowedError':
        console.info('xyl recorder app log 您拒绝了摄像头或麦克风权限，请前往浏览器设置重新授权。');
        break;
      case 'PermissionDeniedError':
        console.info('xyl recorder app log 您拒绝了摄像头或麦克风权限，请前往浏览器设置重新授权。');
        break;
      case 'NotFoundError':
        console.info('xyl recorder app log 未检测到设备，请检查硬件连接。');
        break;
      case 'DevicesNotFoundError':
        console.info('xyl recorder app log 未检测到设备，请检查硬件连接。');
        break;
      case 'NotReadableError':
        console.info('xyl recorder app log 设备被占用或硬件异常，请关闭其他占用设备的软件。');
        break;
      case 'TrackStartError':
        console.info('xyl recorder app log 设备被占用或硬件异常，请关闭其他占用设备的软件。');
        break;
      default:
        console.info('xyl recorder app log 获取媒体设备权限失败，请尝试刷新页面或更换浏览器。');
    }
  }
  /**
   * 监听权限变化
   */
  async watch(
    name: MediaDevicePermissionName | Array<MediaDevicePermissionName>,
    callback: (name: MediaDevicePermissionName, state: MediaDevicePermissionStatus) => void
  ): Promise<void> {
    let ns = [] as MediaDevicePermissionName[];
    if (!Array.isArray(name)) ns = [name];
    else ns = name;
    if (ns.length === 0) {
      console.warn('xyl recorder app log 没有提供要监听的权限名称');
      return;
    }

    ns.forEach(async n => {
      const status = await this.query(n);
      if (status) {
        callback(n, status.state as MediaDevicePermissionStatus);
        status.onchange = () => callback(n, status.state as MediaDevicePermissionStatus);
      } else {
        console.warn(`xyl recorder app log 无法查询权限 "${n}" 的状态`);
      }
    });
  }
}