import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // 모니터링 및 설정 상태
  isMonitoring: boolean;
  isElectronAvailable: boolean; // Electron 환경 여부를 저장할 상태 추가

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;
  // 업데이트 관련 상태
  updateStatus: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'confirm';
  updateInfo: any | null;
  downloadProgress: number;
  // 함수들
  setLoading: (isLoading: boolean, message?: string) => void;
  setMonitoring: (isMonitoring: boolean) => void;
  setElectronAvailable: (isAvailable: boolean) => void;
  setUpdateStatus: (status: AppState['updateStatus']) => void;
  setUpdateInfo: (info: any | null) => void;
  setDownloadProgress: (progress: number) => void;
  syncMonitoringStatus: () => Promise<void>; // 새로운 함수 추가
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      loadingMessage: '',
      isMonitoring: false,
      isElectronAvailable: false,
      // 업데이트 관련 상태 초기값
      updateStatus: 'idle',
      updateInfo: null,
      downloadProgress: 0,
      // 기존 함수들
      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
      setMonitoring: (isMonitoring) => set({ isMonitoring }),
      setElectronAvailable: (isAvailable) => set({ isElectronAvailable: isAvailable }),
      // 업데이트 관련 함수
      setUpdateStatus: (updateStatus) => set({ updateStatus }),
      setUpdateInfo: (updateInfo) => set({ updateInfo }),
      setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
      // 모니터링 상태 동기화 함수
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
        updateStatus: state.updateStatus,
        updateInfo: state.updateInfo,
        downloadProgress: state.downloadProgress,
      }),
    },
  ),
);
