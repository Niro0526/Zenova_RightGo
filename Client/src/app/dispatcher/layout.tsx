import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import { PlanningProvider } from '@/store/dispatcher/PlanningContext';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanningProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA] font-sans">
        <DispatcherSidebar />
        <div className="flex flex-col flex-1 h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </PlanningProvider>
  );
}
