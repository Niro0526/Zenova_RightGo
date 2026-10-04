import Sidebar from '@/components/loader/Sidebar';
import BottomNavBar from '@/components/loader/BottomNavBar';
import RoleTopBar from '@/components/common/RoleTopBar';

export default function LoaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F9FAFB] font-poppins text-[#202D2D]">
      {/* 1. Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full md:pl-[220px] lg:pl-[240px] overflow-hidden">
        
        {/* Fixed TopBar (Never Scrolls Away) */}
        <RoleTopBar
          name="Loader Lead"
          role="Dock Loading Lead"
          initials="LL"
          stationId="BAY-04"
          stationName="Bay 4 Loading Dock"
          avatarColor="#059669"
        />

        {/* Scrollable Page Body (Vertical Only, No Horizontal Scroll) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNavBar />
    </div>
  );
}