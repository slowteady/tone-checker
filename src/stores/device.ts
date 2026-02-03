import { create } from 'zustand';

type DeviceIdStore = {
  deviceId: string;
  setDeviceId: (deviceId: string) => void;
};

export const useDeviceIdStore = create<DeviceIdStore>((set) => ({
  deviceId: '',
  setDeviceId: (deviceId: string) => set({ deviceId }),
}));
