import { create } from 'zustand';

interface AppState {
  // 모니터링 및 설정 상태
  isMonitoring: boolean;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 액션
  setMonitoring: (status: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isMonitoring: false,
  isLoading: false,
  loadingMessage: '',

  setMonitoring: (status) => set({ isMonitoring: status }),
  setLoading: (isLoading, message) => set({ isLoading, loadingMessage: isLoading ? message : '' }),
}));
