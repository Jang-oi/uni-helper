import { useEffect } from 'react';

import { HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useTutorialStore } from '@/store/tutorial-store';

export function TutorialButton() {
  const { startTutorial, completedTutorial, setCompletedTutorial } = useTutorialStore();

  // 로컬 스토리지에서 튜토리얼 완료 상태 불러오기
  useEffect(() => {
    const completed = localStorage.getItem('tutorial-completed') === 'true';
    setCompletedTutorial(completed);
  }, [setCompletedTutorial]);

  // 튜토리얼 시작 핸들러
  const handleStartTutorial = () => {
    startTutorial();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleStartTutorial} className="relative" data-tutorial="tutorial-button">
            <HelpCircle className="h-5 w-5" />
            {!completedTutorial && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>튜토리얼 시작하기</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
