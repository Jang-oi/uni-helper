import { create } from 'zustand';

// 튜토리얼 단계 정의
export type TutorialStep = {
  id: number;
  target: string; // 하이라이트할 요소의 CSS 선택자
  title: string;
  page: string; // 있어야할 페이지
  description: string;
  position: 'top' | 'right' | 'bottom' | 'left';
  spotlightRadius?: number; // 스포트라이트 원의 반지름 (픽셀)
  spotlightShape?: 'circle' | 'rectangle'; // 스포트라이트 모양 (기본값: circle)
  spotlightPadding?: number; // 요소 주변 여백 (픽셀, 사각형 모드에서 사용)
  tabValue?: string; // 선택해야 할 탭 값
};

// 튜토리얼 스토어 상태 타입
interface TutorialState {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  completedTutorial: boolean;

  // 액션
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setCompletedTutorial: (completed: boolean) => void;
}

// 튜토리얼 단계 정의
const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    target: '[data-tutorial="settings-page"]',
    title: '설정 페이지',
    page: 'settings',
    description: '이 페이지에서 서포트 접속 정보와 알림 설정을 구성할 수 있습니다.',
    position: 'right',
    spotlightRadius: 300,
    spotlightShape: 'rectangle',
    spotlightPadding: 20,
    tabValue: 'account',
  },
  {
    id: 2,
    target: '[data-tutorial="username-input"]',
    title: '아이디 입력',
    page: 'settings',
    description: '서포트 아이디를 입력하세요.',
    position: 'bottom',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'account',
  },
  {
    id: 3,
    target: '[data-tutorial="password-input"]',
    title: '비밀번호 입력',
    page: 'settings',
    description: '서포트 비밀번호를 입력하세요.',
    position: 'bottom',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'account',
  },
  {
    id: 4,
    target: '[data-tutorial="interval-input"]',
    title: '확인 주기 설정',
    page: 'settings',
    description: '접수 건 확인 주기를 분 단위로 설정하세요.',
    position: 'bottom',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'account',
  },
  {
    id: 5,
    target: '[data-tutorial="notification-switch"]',
    title: '알림 설정',
    page: 'settings',
    description: '새로운 접수 건이나 고객사 답변으로 변경 시 알림을 받을지 설정합니다.',
    position: 'bottom',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 15,
    tabValue: 'notifications',
  },
  {
    id: 6,
    target: '[data-tutorial="startup-switch"]',
    title: '시작 프로그램 설정',
    page: 'settings',
    description: '컴퓨터 시작 시 프로그램을 자동으로 실행 할지 설정합니다.',
    position: 'bottom',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 15,
    tabValue: 'system',
  },
  {
    id: 7,
    target: '[data-tutorial="monitoring-button"]',
    title: '모니터링 시작/중지',
    page: 'settings',
    description: '이 버튼을 클릭하여 모니터링을 시작하거나 중지할 수 있습니다.',
    position: 'left',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'account',
  },
  {
    id: 8,
    target: '[data-tutorial="alerts-nav"]',
    title: '알림 페이지',
    page: 'alerts',
    description: '이 메뉴를 클릭하면 알림 페이지로 이동합니다.',
    position: 'right',
    spotlightRadius: 100,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
  },
  {
    id: 9,
    target: '[data-tutorial="alerts-tabs"]',
    title: '알림 탭',
    page: 'alerts',
    description: '전체 알림과 내 처리 건을 구분하여 볼 수 있습니다.',
    position: 'left',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'all',
  },
  {
    id: 10,
    target: '[data-tutorial="alerts-tabs"]',
    title: '내 처리 건',
    page: 'alerts',
    description: '내가 담당하고 있는 처리 건만 확인할 수 있습니다.',
    position: 'left',
    spotlightRadius: 150,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
    tabValue: 'personal',
  },
  {
    id: 11,
    target: '[data-tutorial="about-nav"]',
    title: '프로그램 정보',
    page: 'about',
    description: '이 메뉴를 클릭하면 프로그램 정보 및 업데이트 페이지로 이동합니다.',
    position: 'right',
    spotlightRadius: 100,
    spotlightShape: 'rectangle',
    spotlightPadding: 10,
  },
  {
    id: 12,
    target: '[data-tutorial="about-page"]',
    title: '프로그램 정보 및 업데이트',
    page: 'about',
    description: '이 페이지에서 프로그램 버전을 확인하고 업데이트를 관리할 수 있습니다.',
    position: 'bottom',
    spotlightRadius: 300,
    spotlightShape: 'rectangle',
    spotlightPadding: 20,
  },
  {
    id: 13,
    target: '[data-tutorial="settings-page"]',
    title: '튜토리얼 완료!',
    page: 'settings',
    description:
      '축하합니다! 이제 프로그램의 모든 기능을 사용할 준비가 되었습니다. 모니터링을 시작하려면 설정 페이지에서 로그인 정보를 입력하고 모니터링 시작 버튼을 클릭하세요.',
    position: 'bottom',
    spotlightRadius: 0,
    spotlightShape: 'rectangle',
    spotlightPadding: 0,
    tabValue: 'account',
  },
];

// 튜토리얼 스토어 생성
export const useTutorialStore = create<TutorialState>((set) => ({
  isActive: false,
  currentStep: 1,
  steps: tutorialSteps,
  completedTutorial: false,

  startTutorial: () => set({ isActive: true, currentStep: 1 }),
  endTutorial: () => set({ isActive: false }),
  nextStep: () =>
    set((state) => {
      if (state.currentStep < state.steps.length) {
        return { currentStep: state.currentStep + 1 };
      } else {
        // 마지막 단계에서는 튜토리얼 종료 및 완료 상태 설정
        return { isActive: false, completedTutorial: true };
      }
    }),
  prevStep: () =>
    set((state) => {
      if (state.currentStep > 1) {
        return { currentStep: state.currentStep - 1 };
      }
      return state;
    }),
  setCompletedTutorial: (completed) => set({ completedTutorial: completed }),
}));
