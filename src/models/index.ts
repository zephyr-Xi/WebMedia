import { useSelfStore } from './store';

import DeviceManager from './deviceManager';
import PermissionManager from './permissionManager';
import Screen from './screen';
import Microphone from './microphone';
import ViewController from './viewController';

import type { MediaDevicePermissionName, MediaDevicePermissionStatus } from './permissionManager';

export default class RecorderApp {
  store: ReturnType<typeof useSelfStore> | undefined;
  deviceManager: DeviceManager | undefined;
  permissionManager: PermissionManager | undefined;
  screen: Screen | undefined;
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

  async open(mode: 'only-screen' | 'only-microphone' | 'camera&screen' = 'only-screen') {
    if (mode === 'only-screen') {
      await this.openScreen(); // 打开屏幕流
      const stream = (await this.screen?.getStream()) as any; // 获取屏幕流
      console.info('xyl recorder app log -- 屏幕流获取成功:', stream);

      if (!stream) {
        console.error('xyl recorder app log -- 屏幕流获取失败');
        return;
      }
      console.info('xyl recorder app log -- 屏幕流获取成功:', stream);
      this.viewController?.render(mode, { screen: stream as MediaStream }); // 渲染屏幕流到视图控制器
      return;
    }
    if (mode === 'only-microphone') {
      await this.openMicrophone(); // 打开麦克风流
      const stream = await this.microphone?.getStream(); // 获取麦克风流
      if (!stream) {
        console.error('xyl recorder app log -- 麦克风流获取失败');
        return;
      }
      console.info('xyl recorder app log -- 麦克风流获取成功:', stream);
      this.viewController?.render(mode, { microphone: stream as MediaStream }); // 渲染麦克风流到视图控制器
      return;
    }
    if (mode === 'camera&screen') {
      await this.openCamera(); // 打开摄像头流
      // const res = await Promise.allSettled([
      //   this.openScreen() // 打开屏幕
      //   // this.openCamera() // 打开摄像头流
      // ]);
      // console.log('xyl recorder app log -- 打开屏幕和摄像头流结果:', res);
      // const streams = {
      //   screenStream: null as MediaStream | null,
      //   cameraStream: null as MediaStream | null
      // } as any;
      // res.forEach(async (r, i) => {
      //   if (r.status === 'fulfilled') {
      //     console.info('xyl recorder app log -- 打开流成功:', r.value);
      //     if (i === 0) {
      //       streams.screenStream = (await this.screen?.getStream()) as any; // 获取屏幕流
      //     } else {
      //       streams.cameraStream = r.value as MediaStream; // 第二个是摄像头流
      //     }
      //   }
      // });
      // if (!streams.screenStream || !streams.cameraStream) {
      //   this.viewController?.render('only-screen', {
      //     screen: streams?.screenStream || (streams?.cameraStream as MediaStream)
      //   }); // 渲染屏幕流到视图控制器
      //   return;
      // }
      // this.viewController?.render(mode, streams); // 渲染屏幕流到视图控制器
      // return;
    }
  }
  // ======= camera ==========

  async openCamera() {
    if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
    this.store.cameraStatus = 'opening'; // 设置摄像头状态为打开中

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      console.log('xyl recorder app log -- 摄像头流已打开:', stream);
      return stream;
    } catch (error) {
      console.error('xyl recorder app log -- 摄像头流打开失败:', error);
      this.store.cameraStatus = 'init'; // 设置摄像头状态为初始化
    }
  }

  // ======= microphone ==========

  async openMicrophone() {
    if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
    this.store.microphoneStatus = 'opening'; // 设置屏幕状态为打开中

    if (!this.microphone) this.microphone = new Microphone();
    await this.microphone.start();

    this.store.microphoneStatus = 'opened'; // 设置屏幕状态为已打开
  }

  // ======== Screen ===========
  async openScreen() {
    if (!this.store) throw new Error('Store is not initialized. Please call init() first.');
    this.store.screenStatus = 'opening'; // 设置屏幕状态为打开中

    if (!this.screen) this.screen = new Screen();
    this.screen.isActive() && this.screen.destroy(); // 清除旧的屏幕流
    await this.screen.create();

    console.info('xyl recorder app log -- 屏幕流已打开:');
    this.store.screenStatus = 'opened'; // 设置屏幕状态为已打开
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