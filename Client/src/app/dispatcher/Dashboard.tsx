import React from 'react';
import Link from 'next/link';

const IconDashboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconCalendar = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconClipboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconDatabase = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconPlay = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
const IconBarChart = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const Thermometer = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
  </svg>
);

const Slash = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
  </svg>
);

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const Sidebar = () => (
  <aside className="flex flex-col w-[280px] bg-[#171c21] text-white py-8 px-5 flex-shrink-0 font-sans box-border">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
      </div>
      <div className="flex flex-col">
        <h2 className="font-bold text-[22px] text-white m-0 leading-none">RightGo</h2>
        <span className="font-medium text-[10px] text-gray-400 mt-1 tracking-wider uppercase">Precision, in motion</span>
      </div>
    </div>
    
    <div className="flex items-center p-3 bg-[#282f37] rounded-xl mb-8 gap-3">
      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-semibold text-sm text-gray-200">SJ</div>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-sm text-white m-0">Sarah Jenkins</p>
        <span className="bg-orange-500 text-white text-[10px] font-bold py-[2px] px-1.5 rounded w-fit uppercase">Dispatcher</span>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <Link href="/dispatcher" className="flex flex-row items-center p-3 rounded-lg gap-3 text-white font-medium text-sm cursor-pointer transition-all duration-200 no-underline bg-orange-500 hover:bg-orange-600">
        <IconDashboard /> Dashboard
      </Link>
      <Link href="/dispatcher/orders" className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconList /> Orders
      </Link>
      <Link href="/dispatcher/planning" className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconCalendar /> Planning
      </Link>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconClipboard /> Plan Review
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconDatabase /> Decision Ledger
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconPlay /> Live Operations
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconBarChart /> Future Capacity
      </div>
    </div>
  </aside>
);

export default function Dashboard() {
  return (
    <div className="flex flex-row min-h-screen bg-[#FAFAFA] font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 p-10 gap-8 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto">
        
        {/* Header Block */}
        <div className="flex flex-row justify-between items-start w-full">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[28px] text-[#202D2D] leading-[42px] m-0">Dashboard</h1>
            <div className="flex flex-col gap-2 mt-1">
              <h2 className="font-medium text-[14px] text-[#485563] m-0">Run Date: 8 January 2026 · 85 Total S1 Orders</h2>
              <div className="flex flex-row items-center py-1.5 px-2.5 gap-2 bg-[#FFF4ED] border border-[#F97316] rounded-md w-fit">
                <span className="font-bold text-[11px] text-[#F97316] uppercase">S1 PEAK DAY</span>
                <span className="font-semibold text-xs text-[#F97316]">Peliyagoda Depot</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center py-3 px-4 gap-3 bg-[#FFF4ED] border border-[#F97316] rounded-lg mt-2">
            <AlertTriangle className="text-[#F97316]" />
            <span className="font-semibold text-[13px] text-[#F97316]">Today's Limit: 85 Orders · 38 Fleet Entries · 77 Normal Parking</span>
          </div>
        </div>

        {/* Plan Readiness Row (4 Metrics) */}
        <div className="flex flex-row gap-5 w-full">
          {/* Confirmed */}
          <div className="flex flex-col p-5 gap-3 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">CONFIRMED</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[48px]">85</span>
            <span className="font-normal text-xs text-[#485563]">Total S1 orders</span>
          </div>
          {/* Assigned */}
          <div className="flex flex-col p-5 gap-3 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">ASSIGNED</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[48px]">64</span>
            <span className="font-normal text-xs text-[#485563]">Allocated to trips</span>
          </div>
          {/* Deferred */}
          <div className="flex flex-col p-5 gap-3 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">DEFERRED</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[48px]">12</span>
            <span className="font-normal text-xs text-[#485563]">With documented reason</span>
          </div>
          {/* Unresolved */}
          <div className="flex flex-col p-5 gap-3 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">UNRESOLVED</span>
            <span className="font-bold text-[32px] text-red-500 leading-[48px]">9</span>
            <span className="font-normal text-xs text-[#485563]">Awaiting decision</span>
          </div>
        </div>

        {/* Needs Attention Now Section */}
        <div className="flex flex-col gap-4 w-full mt-2">
          <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Needs Attention Now</h2>
          <div className="flex flex-col gap-3 w-full">
            
            {/* Alert 1 */}
            <div className="flex flex-row items-center p-5 gap-4 bg-[#FFF4ED] border border-[#F97316] shadow-sm rounded-lg">
              <Clock className="text-[#F97316] flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">9 unresolved orders awaiting assignment decisions</span>
                <span className="font-normal text-[13px] text-[#485563]">Review the unresolved queue before the next dispatch wave to keep the reconciliation rule intact.</span>
              </div>
              <Link href="/dispatcher/orders" className="flex flex-row items-center gap-2 cursor-pointer no-underline group hover:opacity-80 transition-opacity">
                <span className="font-semibold text-sm text-[#F97316]">Review Orders</span>
                <ArrowRight className="text-[#F97316] transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Alert 2 */}
            <div className="flex flex-row items-center p-5 gap-4 bg-[#FFFBEB] border border-amber-500 shadow-sm rounded-lg">
              <Thermometer className="text-amber-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">2 outlets have repeated service gaps flagged from yesterday</span>
                <span className="font-normal text-[13px] text-[#485563]">These outlets were deferred yesterday and still need a documented reason or a revised trip assignment.</span>
              </div>
              <div className="flex flex-row items-center gap-2 cursor-pointer">
                <span className="font-semibold text-sm text-amber-500">Review Deferred</span>
                <ArrowRight className="text-amber-500" />
              </div>
            </div>

            {/* Alert 3 */}
            <div className="flex flex-row items-center p-5 gap-4 bg-[#FEF2F2] border border-red-500 shadow-sm rounded-lg">
              <Slash className="text-red-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">Loading readiness is pending for 3 trips</span>
                <span className="font-normal text-[13px] text-[#485563]">Confirm vehicle fit, dock readiness, and trip manifests before releasing these trips to live operations.</span>
              </div>
              <div className="flex flex-row items-center gap-2 cursor-pointer">
                <span className="font-semibold text-sm text-red-500">Review Loading</span>
                <ArrowRight className="text-red-500" />
              </div>
            </div>

          </div>
        </div>

        {/* Live Execution Status */}
        <div className="flex flex-col gap-4 w-full mt-2 pb-10">
          <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Live Execution Status</h2>
          <div className="flex flex-row gap-5 w-full">
            
            {/* Live Card 1 */}
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">28</span>
                <span className="font-medium text-[13px] text-[#485563]">Available Fleet</span>
              </div>
            </div>

            {/* Live Card 2 */}
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">10</span>
                <span className="font-medium text-[13px] text-[#485563]">Fleet in Workshop</span>
              </div>
            </div>

            {/* Live Card 3 */}
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">85</span>
                <span className="font-medium text-[13px] text-[#485563]">Total Orders</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
