<template>
  <div class="recorder-view">
    <div class="recorder-top-controls"></div>
    <div class="recorder-container" v-loading="useSelfStore().deviceOpening">
      <div ref="recorderViewRoot"></div>
      <NoAllowPage
        v-if="
          !useSelfStore().hasCameraPermission || !useSelfStore().hasMicrophonePermission
        "
      />
    </div>
    <div class="recorder-controls">
      <ModeDropdown @change="modeChange" />

      <div class="flex gap-[4px]">
        <div
          class="recorder-mode-control-item"
          v-loading="useSelfStore().microphoneOpening"
          :class="useSelfStore().microphoneOpening ? 'disabled' : ''"
        >
          <div
            class="device-icon"
            :class="[useSelfStore().microphoneOpened ? 'active' : 'cloned']"
            @click="microphoneStateChanged(!useSelfStore().microphoneOpened)"
          >
            <SvgIcon
              name="record-micro"
              width="20"
              height="20"
              :color="useSelfStore().microphoneOpened ? '#2277ff' : '#cccccc'"
            />
          </div>
          <Dropdown
            v-if="
              useSelfStore().devices?.microphones.length &&
              useSelfStore().microphoneOpened
            "
            :options="useSelfStore().devices.microphones"
            labelKey="label"
            valueKey="deviceId"
            @change="microphoneChanged"
          />
        </div>
        <div
          class="recorder-mode-control-item"
          v-loading="useSelfStore().cameraOpening"
          :class="useSelfStore().cameraOpening ? 'disabled' : ''"
        >
          <div
            class="device-icon"
            :class="[useSelfStore().cameraOpened ? 'active' : 'cloned']"
            @click="cameraStateChanged(!useSelfStore().cameraOpened)"
          >
            <SvgIcon
              name="record-camera"
              width="20"
              height="20"
              :color="useSelfStore().cameraOpened ? '#2277ff' : '#cccccc'"
            />
          </div>
          <Dropdown
            v-if="useSelfStore().devices?.cameras.length && useSelfStore().cameraOpened"
            :options="useSelfStore().devices.cameras"
            labelKey="label"
            valueKey="deviceId"
            @change="microphoneChanged"
          />
        </div>
        <div
          class="recorder-mode-control-item"
          v-loading="useSelfStore().screenOpening"
          :class="useSelfStore().screenOpening ? 'disabled' : ''"
        >
          <div
            class="device-icon"
            :class="[useSelfStore().screenOpened ? 'active' : 'cloned']"
            @click="screenStateChanged(!useSelfStore().screenOpened)"
          >
            <SvgIcon
              name="record-screen"
              width="20"
              height="20"
              :color="useSelfStore().screenOpened ? '#2277ff' : '#cccccc'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useSelfStore } from "../models/store";
import RecorderApp from "../models";
import Dropdown from "./RecorderCom/Dropdown.vue";
import NoAllowPage from "./RecorderCom/NoAllowPage.vue";
import ModeDropdown from "./RecorderCom/ModeDropdown.vue";

const recorderViewRoot = ref(null as HTMLElement);

const recorderApp = new RecorderApp();

const currentMode = ref("select-mode");

const microphoneChanged = (microphone: boolean) => {
  console.log("Microphone changed to:", microphone);
};

const cameraScreenOpenedStateChanged = async (state: boolean) => {
  console.log("Camera & Screen state changed to:", state);
  if (!state) {
    await recorderApp.clone("camera");
    await recorderApp.clone("screen");
  } else {
    await recorderApp.open("camera&screen");
  }
};

const microphoneStateChanged = async (state: boolean) => {
  console.log("Microphone State changed to:", state);
  if (!state) await recorderApp.clone("microphone");
  else await recorderApp.open("only-microphone");
};
const cameraStateChanged = async (state: boolean) => {
  console.log("Camera state changed to:", state);

  if (!state) await recorderApp.clone("camera");
  else await recorderApp.open("only-camera");
};
const screenStateChanged = async (state: boolean) => {
  console.log("Screen state changed to:", state);
  if (!state) await recorderApp.clone("screen");
  else await recorderApp.open("only-screen");
};

const modeChange = async (mode: { name: string; value: string }) => {
  console.log("Mode changed to:", mode);
  const _mode = mode.value;
  if (currentMode.value === _mode) return;

  if (_mode === "camera&screen") await cameraScreenOpenedStateChanged(false);
  else if (_mode === "only-camera") await cameraStateChanged(false);
  else if (_mode === "only-screen") await screenStateChanged(false);
  else if (_mode === "only-microphone") await microphoneStateChanged(false);

  currentMode.value = _mode;
  if (_mode === "select-mode") return;

  if (_mode === "only-camera") await cameraStateChanged(true);
  else if (_mode === "only-screen") await screenStateChanged(true);
  else if (_mode === "camera&screen") await cameraScreenOpenedStateChanged(true);
  else if (_mode === "only-microphone") await microphoneStateChanged(true);
};

onMounted(async () => {
  recorderApp.init(recorderViewRoot.value as HTMLElement);
});
</script>

<style lang="scss" scoped>
.recorder-view {
  padding: 20px 40px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-height: 100vh;
  gap: 16px;
  //background-image: linear-gradient(to top, #cd9cf2 0%, #f6f3ff 100%);
  //background-image: linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%);
  //background-image: linear-gradient(-225deg, #e3fdf5 0%, #ffe6fa 100%);

  .recorder-top-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .recorder-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid #cccccc59;
    border-top: 1px solid #cccccc59;
  }
  .recorder-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .recorder-mode-control-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      &:last-child {
        border-right: none;
      }

      &.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .device-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;

        &.active {
          background: rgba(34, 119, 255, 0.1);
          &:hover {
            background: rgba(34, 119, 255, 0.2);
          }
        }
        &.cloned {
          background: rgba(204, 204, 204, 0.1);
          &:hover {
            background: rgba(86, 94, 143, 0.16);
          }
        }
      }
    }
  }
}
</style>
