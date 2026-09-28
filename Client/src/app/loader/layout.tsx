import Sidebar from '@/components/loader/Sidebar';
import BottomNavBar from '@/components/loader/BottomNavBar';

export default function LoaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#F9FAFB] font-poppins text-[#202D2D]">
      <Sidebar />
      {children}
      <BottomNavBar />
    </div>
  );
}
