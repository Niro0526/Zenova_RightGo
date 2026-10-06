import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import DispatcherMobileNav from '@/components/dispatcher/DispatcherMobileNav';
import RoleTopBar from '@/components/common/RoleTopBar';
import { PlanningProvider } from '@/store/dispatcher/PlanningContext';

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanningProvider>
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#FAFAFA] font-sans">
        <DispatcherSidebar />
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          <RoleTopBar
            name="Dilani Perera"
            role="Chief Dispatcher"
            initials="DP"
            stationId="DISP-01"
            stationName="Peliyagoda Logistics Hub"
            avatarColor="#2563EB"
          />
          <DispatcherMobileNav />
          {children}
        </div>
      </div>
    </PlanningProvider>
  );
}
