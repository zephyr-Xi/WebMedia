import { defineStore } from 'pinia';
import type { MediaDevicePermissionName, MediaDevicePermissionStatus } from './permissionManager';

export const useSelfStore = defineStore('self', {
  state: () => {
    return {
      devices: {
        microphones: [],
        cameras: [],
        speakers: []
      },
      permission: {
        camera: 'denied' as MediaDevicePermissionStatus,
        microphone: 'denied' as MediaDevicePermissionStatus
      } as Record<MediaDevicePermissionName, MediaDevicePermissionStatus>,
      // 媒体流
      cameraStream: null as MediaStream | null,
      screenStream: null as MediaStream | null,
      microphoneStream: null as MediaStream | null,
      // 设备状态
      cameraStatus: 'init' as 'init' | 'opening' | 'opened' | 'closing' | 'closed',
      microphoneStatus: 'init' as 'init' | 'opening' | 'opened' | 'closing' | 'closed',
      screenStatus: 'init' as 'init' | 'opening' | 'opened' | 'closing' | 'closed'
    };
  },
  getters: {
    hasCameraPermission: state => state.permission.camera === 'granted',
    hasMicrophonePermission: state => state.permission.microphone === 'granted',
    cameraOpening: state => state.cameraStatus === 'opening',
    microphoneOpening: state => state.microphoneStatus === 'opening',
    screenOpening: state => state.screenStatus === 'opening',
    deviceOpening: state =>
      state.cameraStatus === 'opening' ||
      state.microphoneStatus === 'opening' ||
      state.screenStatus === 'opening',
    deviceOpened: state =>
      state.cameraStatus === 'opened' ||
      state.microphoneStatus === 'opened' ||
      state.screenStatus === 'opened',
    cameraOpened: state => state.cameraStatus === 'opened',
    microphoneOpened: state => state.microphoneStatus === 'opened',
    screenOpened: state => state.screenStatus === 'opened',
    cameraAndScreenOpened: state =>
      (state.cameraStatus === 'opened' || state.cameraStatus === 'opening') &&
      (state.screenStatus === 'opened' || state.screenStatus === 'opening')
  }
});