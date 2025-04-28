import { create } from 'zustand';

interface AppState {
  // 모니터링 및 설정 상태
  isMonitoring: boolean;
  isSavingSettings: boolean;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 액션
  setMonitoring: (status: boolean) => void;
  setSavingSettings: (status: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;

  // 현재 처리 중인지 확인하는 getter
  get isProcessing(): boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  isMonitoring: false,
  isSavingSettings: false,
  isLoading: false,
  loadingMessage: '',

  setMonitoring: (status) => set({ isMonitoring: status }),
  setSavingSettings: (status) => set({ isSavingSettings: status }),

  setLoading: (isLoading, message = '처리 중입니다...') => set({ isLoading, loadingMessage: isLoading ? message : '' }),

  get isProcessing() {
    return get().isMonitoring || get().isSavingSettings;
  },
}));
