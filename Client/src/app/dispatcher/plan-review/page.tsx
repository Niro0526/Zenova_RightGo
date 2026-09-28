'use client';

import Planning from '@/components/dispatcher/PlanningView';

// Legacy URL, preserved — Plan Review is now the final stage of Planning.
export default function PlanReviewPage() {
  return <Planning initialStage="review" />;
}
