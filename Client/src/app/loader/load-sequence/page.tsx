import type { Metadata } from 'next';
import LoadSequence from '@/components/loader/LoadSequence';

export const metadata: Metadata = {
  title: 'Load Sequence | RightGo',
  description: 'Loading sequence for trip PEL-R04 / S1-T001.',
};

export default function LoadSequencePage() {
  return <LoadSequence />;
}
