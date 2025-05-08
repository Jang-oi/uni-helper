import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // 모니터링 및 설정 상태
  isMonitoring: boolean;
  isElectronAvailable: boolean; // Electron 환경 여부를 저장할 상태 추가

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;
  // 함수들
  setLoading: (isLoading: boolean, message?: string) => void;
  setMonitoring: (isMonitoring: boolean) => void;
  setElectronAvailable: (isAvailable: boolean) => void;
  syncMonitoringStatus: () => Promise<void>; // 새로운 함수 추가
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      loadingMessage: '',
      isMonitoring: false,
      isElectronAvailable: false,
      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
      setMonitoring: (isMonitoring) => set({ isMonitoring }),
      setElectronAvailable: (isAvailable) => set({ isElectronAvailable: isAvailable }),
      syncMonitoringStatus: async () => {
        const { isElectronAvailable } = get();
        if (!isElectronAvailable) return;

        try {
          const status = await window.electron.invoke('get-monitoring-status');
          set({ isMonitoring: status.isMonitoring });
        } catch (error) {
          console.error('모니터링 상태 동기화 실패:', error);
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        // 영구 저장할 상태만 선택
        isMonitoring: state.isMonitoring,
      }),
    },
  ),
);
