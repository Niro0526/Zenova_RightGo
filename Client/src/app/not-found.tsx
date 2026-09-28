import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
      <h1 className="text-3xl font-bold text-[#202D2D]">404 - Page Not Found</h1>
      <p className="text-sm text-[#64748B] mt-2 max-w-md">
        The requested page could not be located.
      </p>
      <Link
        href="/dispatcher/planning"
        className="mt-4 rounded-lg bg-[#F97316] px-4 py-2 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors"
      >
        Return to Planning
      </Link>
    </div>
  );
}
