'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import type { UserProfile } from '@/components/OnboardingFlow';
import type { ScheduleEvent } from '@/components/ScheduleCard';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fresh = searchParams.get('fresh');

  // Already done? Skip ahead (unless ?fresh=1)
  useEffect(() => {
    if (fresh) {
      // Clear old cookie for a fresh start
      document.cookie = 'drako_user_id=; path=/; max-age=0';
      return;
    }
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.onboarded) router.replace('/schedule');
    }).catch(() => {});
  }, [router, fresh]);

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
