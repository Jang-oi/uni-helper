'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { type TutorialStep, useTutorialStore } from '@/store/tutorial-store';

export function TutorialOverlay() {
  const navigate = useNavigate();
  const { isActive, currentStep, steps, nextStep, prevStep, endTutorial } = useTutorialStore();
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });
  const [spotlightPosition, setSpotlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [targetFound, setTargetFound] = useState(false);

  // 다음 버튼에 대한 참조 생성
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // 현재 단계 정보
  const currentStepData: TutorialStep | undefined = steps.find((step) => step.id === currentStep);

  // 창 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 튜토리얼 단계에 따라 페이지 이동
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    // 페이지 이동이 필요한 경우
    if (currentStepData.page.includes('settings') && !window.location.hash.includes('/settings')) {
      navigate('/settings');
    } else if (currentStepData.page.includes('alerts') && !window.location.hash.includes('/alerts')) {
      navigate('/alerts');
    } else if (currentStepData.page.includes('about') && !window.location.hash.includes('/about')) {
      navigate('/about');
    }

    // 단계가 변경될 때마다 타겟 찾음 상태 초기화
    setTargetFound(false);
  }, [isActive, currentStep, currentStepData, navigate]);

  // 타겟 요소 찾기 및 위치 계산
  useEffect(() => {
    if (!isActive || !currentStepData || targetFound) return;

    const findTargetElement = () => {
      // 마지막 단계(완료 메시지)인 경우 중앙에 표시
      if (currentStep === steps.length) {
        const centerTop = windowSize.height / 2 - 150;
        const centerLeft = windowSize.width / 2 - 150;

        setOverlayPosition({ top: centerTop, left: centerLeft });
        setSpotlightPosition({ top: 0, left: 0, width: 0, height: 0 });
        setTargetFound(true);
        return;
      }

      const element = document.querySelector(currentStepData.target) as HTMLElement;
      if (element) {
        // 요소의 위치와 크기 계산
        const rect = element.getBoundingClientRect();

        // 스포트라이트 위치 설정
        setSpotlightPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // 카드 위치 계산
        let cardTop = 0;
        let cardLeft = 0;

        switch (currentStepData.position) {
          case 'top':
            cardTop = rect.top - 250;
            cardLeft = rect.left + rect.width / 2 - 150;
            break;
          case 'right':
            cardTop = rect.top + rect.height / 2 - 100;
            cardLeft = rect.left + rect.width + 20;
            break;
          case 'bottom':
            cardTop = rect.bottom + 20;
            cardLeft = rect.left + rect.width / 2 - 150;
            break;
          case 'left':
            cardTop = rect.top + rect.height / 2 - 100;
            cardLeft = rect.left - 320;
            break;
        }

        // 화면 경계 체크
        if (cardLeft < 20) cardLeft = 20;
        if (cardLeft + 300 > windowSize.width) cardLeft = windowSize.width - 320;
        if (cardTop < 20) cardTop = 20;
        if (cardTop + 200 > windowSize.height) cardTop = windowSize.height - 220;

        setOverlayPosition({ top: cardTop, left: cardLeft });
        setTargetFound(true);
      } else {
        // 요소를 찾지 못한 경우 0.5초 후 다시 시도
        const timerId = setTimeout(findTargetElement, 500);
        return () => clearTimeout(timerId);
      }
    };

    findTargetElement();
  }, [isActive, currentStep, currentStepData, windowSize, targetFound, steps.length]);

  // 타겟을 찾은 후 다음 버튼에 포커스
  useEffect(() => {
    if (targetFound && nextButtonRef.current) {
      const focusTimer = setTimeout(() => {
        nextButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [targetFound]);

  // 튜토리얼이 활성화되지 않은 경우 렌더링하지 않음
  if (!isActive || !currentStepData) return null;

  // 마지막 단계(완료 메시지)인 경우 스포트라이트 없이 카드만 표시
  const isLastStep = currentStep === steps.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" />

      {/* 스포트라이트 효과 (마지막 단계가 아닌 경우에만) */}
      {!isLastStep &&
        (currentStepData.spotlightShape === 'rectangle' ? (
          // 사각형 스포트라이트
          <div
            className="absolute pointer-events-none"
            style={{
              top: spotlightPosition.top - (currentStepData.spotlightPadding || 5),
              left: spotlightPosition.left - (currentStepData.spotlightPadding || 5),
              width: spotlightPosition.width + (currentStepData.spotlightPadding || 5) * 2,
              height: spotlightPosition.height + (currentStepData.spotlightPadding || 5) * 2,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
            }}
          />
        ) : (
          // 원형 스포트라이트 (기본값)
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: spotlightPosition.top - (currentStepData.spotlightRadius || 100) / 2 + spotlightPosition.height / 2,
              left: spotlightPosition.left - (currentStepData.spotlightRadius || 100) / 2 + spotlightPosition.width / 2,
              width: currentStepData.spotlightRadius || 100,
              height: currentStepData.spotlightRadius || 100,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
              borderRadius: '50%',
              backgroundColor: 'transparent',
            }}
          />
        ))}

      {/* 튜토리얼 카드 */}
      <Card
        className={`absolute pointer-events-auto shadow-lg ${isLastStep ? 'w-[400px]' : 'w-[300px]'}`}
        style={{ top: overlayPosition.top, left: overlayPosition.left }}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={endTutorial} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          {isLastStep && (
            <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-sm font-medium text-primary">
                언제든지 우측 상단의 도움말 버튼을 클릭하여 튜토리얼을 다시 볼 수 있습니다.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {currentStep} / {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" size="sm" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                이전
              </Button>
            )}
            <Button ref={nextButtonRef} size="sm" onClick={nextStep}>
              {currentStep < steps.length ? (
                <>
                  다음
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                '시작하기'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
