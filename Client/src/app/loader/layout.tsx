import Sidebar from '@/components/loader/Sidebar';
import BottomNavBar from '@/components/loader/BottomNavBar';
import RoleTopBar from '@/components/common/RoleTopBar';

export default function LoaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#F9FAFB] font-poppins text-[#202D2D]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen md:pl-[220px] lg:pl-[240px] overflow-y-auto">
        <RoleTopBar
          name="Rohan Kulatunga"
          role="Dock Loading Lead"
          initials="RK"
          stationId="BAY-04"
          stationName="Bay 4 Loading Dock"
          avatarColor="#059669"
        />
        <main className="flex-1 pb-16 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
}
