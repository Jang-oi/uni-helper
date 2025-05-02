import { create } from 'zustand';

interface AppState {
  // 모니터링 및 설정 상태
  isMonitoring: boolean;
  isElectronAvailable: boolean; // Electron 환경 여부를 저장할 상태 추가

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 액션
  setMonitoring: (status: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setElectronAvailable: (isAvailable: boolean) => void; // Electron 환경 설정 함수
}

export const useAppStore = create<AppState>((set) => ({
  isMonitoring: false,
  isElectronAvailable: false,
  isLoading: false,
  loadingMessage: '',

  setMonitoring: (isMonitoring) => set({ isMonitoring }),
  setElectronAvailable: (isAvailable) => set({ isElectronAvailable: isAvailable }),
  setLoading: (isLoading, message) => set({ isLoading, loadingMessage: isLoading ? message : '' }),
}));
