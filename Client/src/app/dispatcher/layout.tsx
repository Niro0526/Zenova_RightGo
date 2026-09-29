import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import DispatcherMobileNav from '@/components/dispatcher/DispatcherMobileNav';
import TopBar from '@/components/common/TopBar';
import { PlanningProvider } from '@/store/dispatcher/PlanningContext';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanningProvider>
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FAFAFA] font-sans">
        <DispatcherSidebar />
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          <TopBar />
          <DispatcherMobileNav />
          {children}
        </div>
      </div>
    </PlanningProvider>
  );
}
