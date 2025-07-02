import { useSelfStore } from './store';

import DeviceManager from './deviceManager';
import PermissionManager from './permissionManager';
import Screen from './screen';
import Camera from './camera';
import Microphone from './microphone';
import ViewController from './viewController';

import type { MediaDevicePermissionName, MediaDevicePermissionStatus } from './permissionManager';

export default class RecorderApp {
  store: ReturnType<typeof useSelfStore> | undefined;
  deviceManager: DeviceManager | undefined;
  permissionManager: PermissionManager | undefined;
  screen: Screen | undefined;
  camera: Camera | undefined;
  microphone: Microphone | undefined;
  viewController: ViewController | undefined;
  viewRoot: HTMLElement | null = null;

  initStore(store: () => any | undefined) {
    if (store) this.store = store();
    else console.warn('Store function is not provided or returned undefined.');
  }

  init(viewRoot: HTMLElement, store?: () => any | undefined) {
    this.initStore(store || (() => useSelfStore()));
    if (!this.store) return;
    this.initPermission(); // 初始化设备权限管理器 开启权限监听更新
    this.initDevice(); // 初始化设备列表管理器  开启设备列表监听更新
    this.initViewController(viewRoot); // 初始化视图控制器
  }

  async clone(device: 'screen' | 'microphone' | 'camera') {
    if (device === 'screen') {
      await this.closeScreen();
    }
    if (device === 'camera') {
      if (!this.camera) return;
      this.camera.destroy(); // 销毁旧的屏幕
    }
    if (device === 'microphone') {
      if (!this.microphone) return;
      this.microphone.stop(); // 销毁旧的麦克风
    }
  }

  async open(
    mode: 'only-screen' | 'only-microphone' | 'camera&screen' | 'only-camera' = 'only-screen'
  ) {
    if (mode === 'only-screen') {
      const openScreenState = await this.openScreen(); // 打开屏幕流
      if (!openScreenState) {
        console.error('xyl recorder app log -- 屏幕流获取失败');
        return;
      }

      const stream = (await this.screen?.getStream()) as any; // 获取屏幕流
      console.info('xyl recorder app log -- 屏幕流获取成功:', stream);
      this.viewController?.render(mode, { screen: stream as MediaStream }); // 渲染屏幕流到视图控制器
      return;
    }
    if (mode === 'only-microphone') {
      const openMicrophoneState = await this.openMicrophone(); // 打开麦克风流
      if (!openMicrophoneState) {
        console.error('xyl recorder app log -- 麦克风流获取失败');
        return;
      }

      const stream = await this.microphone?.getStream(); // 获取麦克风流
      console.info('xyl recorder app log -- 麦克风流获取成功:', stream);
      this.viewController?.render(mode, { microphone: stream as MediaStream }); // 渲染麦克风流到视图控制器
      return;
    }
    if (mode === 'camera&screen') {
      const openScreenState = await this.openScreen(); // 打开屏幕流
      const openCameraState = await this.openCamera(); // 打开摄像头流

      const streams = {
        screen: null as MediaStream | null,
        camera: null as MediaStream | null
      } as any;

      openScreenState && (streams.screen = (await this.screen?.getStream()) as any); // 获取屏幕流
      openCameraState && (streams.camera = (await this.camera?.getStream()) as MediaStream); // 获取摄像头流
      console.log('xyl recorder app log -- 打开屏幕和摄像头流结果:', streams);

      if (!streams.screen || !streams.camera) {
        // 当有一个流获取失败时 只渲染一个视频媒体流
        this.viewController?.render('only-screen', {
          screen: streams?.screen || (streams?.camera as MediaStream)
        }); // 渲染屏幕流到视图控制器
        return;
      }
      this.viewController?.render(mode, streams); // 渲染屏幕流到视图控制器
      return;
    }
    if (mode === 'only-camera') {
      const openCameraState = await this.openCamera(); // 打开摄像头流
      if (!openCameraState) {
        console.error('xyl recorder app log -- 摄像头流获取失败');
        return;
      }
      const stream = await this.camera?.getStream(); // 获取摄像头流
      console.info('xyl recorder app log -- 摄像头流获取成功:', stream);
      this.viewController?.render(mode, { camera: stream as MediaStream }); // 渲染摄像头流到视图控制器
      return;
    }
  }
  // ======= camera ==========

  async openCamera() {
    try {
      if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
      this.store.cameraStatus = 'opening'; // 设置摄像头状态为打开中

      if (!this.camera) this.camera = new Camera();
      this.camera.isActive() && this.camera.destroy(); // 清除旧的摄像头流
      await this.camera.create();

      console.info('xyl recorder app log -- 摄像头流已打开:');
      this.store.cameraStatus = 'opened'; // 设置摄像头状态为已打开
      return true;
    } catch (error) {
      console.error('xyl recorder app log -- 摄像头流打开失败:', error);
      if (this.store) this.store.cameraStatus = 'init'; // 设置摄像头状态为已关闭
      return false;
    }
  }

  // ======= microphone ==========

  async openMicrophone() {
    try {
      if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
      this.store.microphoneStatus = 'opening'; // 设置麦克风状态为打开中

      if (!this.microphone) this.microphone = new Microphone();
      await this.microphone.start();

      this.store.microphoneStatus = 'opened'; // 设置麦克风状态为已打开
      return true;
    } catch (error) {
      console.error('xyl recorder app log -- 麦克风流打开失败:', error);
      if (this.store) this.store.microphoneStatus = 'init';
      return false;
    }
  }

  // ======== Screen ===========
  async openScreen() {
    try {
      if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
      this.store.screenStatus = 'opening'; // 设置屏幕状态为打开中

      if (!this.screen) this.screen = new Screen();
      this.screen.isActive() && this.screen.destroy(); // 清除旧的屏幕流
      await this.screen.create();
      // this.screen.on('inactive', () => console.info('xyl recorder app log -- 屏幕流已关闭'));
      // this.screen.on('addtrack', (e: any) =>
        // console.info('xyl recorder app log -- 屏幕流添加轨道:', e)
      // );
      // this.screen.on('removetrack', (e: any) =>
        // console.info('xyl recorder app log -- 屏幕流移除轨道:', e)
      // );

      console.info('xyl recorder app log -- 屏幕流已打开:');
      this.store.screenStatus = 'opened'; // 设置屏幕状态为已打开
      return true;
    } catch (error) {
      console.error('xyl recorder app log -- 屏幕流打开失败:', error);
      if (this.store) this.store.screenStatus = 'init'; // 设置屏幕状态为已关闭
      return false;
    }
  }

  closeScreen() {
    if (!this.screen) return;
    this.screen.destroy();
    this.store!.screenStream = null; // 清除屏幕流
    this.store!.screenStatus = 'init'; // 设置屏幕状态为已关闭
    console.info('xyl recorder app log -- 屏幕流已关闭');
  }

  // ======= view Controller =========
  initViewController(root: HTMLElement | null) {
    if (!root) {
      throw new Error('ViewController requires a valid root element.');
    }
    if (this.viewController) return;
    this.viewController = new ViewController(root);
    console.info('xyl recorder app log -- 视图控制器已初始化');
  }

  // ======== Permission 相关操作 ========
  initPermission() {
    this.permissionManager = new PermissionManager();
    this.permissionManager.watch(['camera', 'microphone'], (name: any, state: any) => {
      this.savePermissionData(name, state);
      this.refreshDevices(); // 权限更新之后重新刷新设备列表
    });
  }

  savePermissionData(name: MediaDevicePermissionName, state: MediaDevicePermissionStatus) {
    console.info(`xyl recorder app log -- 保存权限数据: ${name} - ${state}`);
    if (!this.store) return;
    this.store.permission[name] = state;
    console.info(
      `xyl recorder app log -- 权限数据已保存: ${name} - ${this.store.permission[name]}`
    );
  }

  // ======= Device 相关操作 ========

  initDevice() {
    this.deviceManager = new DeviceManager(this.saveDevicesData.bind(this));
  }

  // 获取设备列表
  refreshDevices() {
    if (!this.deviceManager) return;
    this.deviceManager.refreshDevices(this.saveDevicesData.bind(this));
  }

  saveDevicesData(data: any) {
    console.info('xyl recorder app log -- 保存设备数据:', data);
    if (!this.store) return;
    this.store.devices = data;
  }
}