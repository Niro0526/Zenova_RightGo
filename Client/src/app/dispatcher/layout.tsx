import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import DispatcherMobileNav from '@/components/dispatcher/DispatcherMobileNav';
import DispatcherTopbar from '@/components/dispatcher/DispatcherTopbar';
import { PlanningProvider } from '@/store/dispatcher/PlanningContext';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanningProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#F9FAFB] font-sans">
        {/* Fixed sidebar — desktop only */}
        <DispatcherSidebar />

        {/* Main area: offset by 240px on desktop, full-width on mobile */}
        <div className="flex flex-1 flex-col md:ml-[240px] min-h-0 overflow-hidden w-full">
          {/* Mobile nav at the top on small screens */}
          <DispatcherMobileNav />
          {/* Sticky topbar */}
          <DispatcherTopbar />
          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PlanningProvider>
  );
}
