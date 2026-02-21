'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import type { UserProfile } from '@/components/OnboardingFlow';
import type { ScheduleEvent } from '@/components/ScheduleCard';

export default function OnboardingPage() {
  const router = useRouter();

  // Already done? Skip ahead
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.onboarded) router.replace('/schedule');
    }).catch(() => {});
  }, [router]);

  const handleComplete = (user: UserProfile, events: ScheduleEvent[]) => {
    // Stash for the play page, then move on
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('drako_user', JSON.stringify(user));
      sessionStorage.setItem('drako_events', JSON.stringify(events));
    }
    router.push('/play');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
