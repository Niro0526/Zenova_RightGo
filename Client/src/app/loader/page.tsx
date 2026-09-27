import type { Metadata } from 'next';
import LoaderWorkspace from './workspace';

export const metadata: Metadata = {
  title: 'Load Sequence | RightGo',
  description: 'RightGo loader workspace for trip PEL-R04 / S1-T001.',
};

export default function LoaderPage() {
  return <LoaderWorkspace />;
}
