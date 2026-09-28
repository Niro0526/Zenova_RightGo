import DriverNav from '@/components/driver/DriverNav';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#F9FAFB] font-poppins text-[#202D2D]">
      <DriverNav />
      {children}
    </div>
  );
}
