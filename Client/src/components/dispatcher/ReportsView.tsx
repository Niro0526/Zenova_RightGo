'use client';
import React, { useState } from 'react';

const FileTextIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const DownloadIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const BarChartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;

export default function ReportsView() {
  const [reportType, setReportType] = useState('daily_summary');
  const [dateRange, setDateRange] = useState('last_7_days');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Report generated and downloaded successfully!');
    }, 1500);
  };

  return (
    <div className="flex flex-col flex-1 p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">
      
      {/* Header */}
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-bold text-[28px] text-[#202D2D] m-0">Reports & Analytics</h1>
          <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">Generate operational reports and view KPIs</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-4">
        {/* Generate Report Panel */}
        <div className="col-span-1 bg-white border border-gray-200 rounded-[10px] p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
            <FileTextIcon /> Generate Report
          </h3>
          
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Report Type</label>
              <select 
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-orange-500 transition-colors"
              >
                <option value="daily_summary">Daily Operations Summary</option>
                <option value="fleet_utilization">Fleet Utilization Report</option>
                <option value="exceptions">Exceptions & Deferrals</option>
                <option value="cost_analysis">Transport Cost Analysis</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Range</label>
              <select 
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-orange-500 transition-colors"
              >
                <option value="today">Today</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>
            
            <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                Reports are generated in PDF format with an attached CSV data export.
              </p>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-6 w-full flex justify-center items-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 rounded-lg font-bold text-sm text-white shadow-sm transition-colors"
          >
            {isGenerating ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : <DownloadIcon />}
            {isGenerating ? 'Generating...' : 'Download Report'}
          </button>
        </div>

        {/* Dashboard / Graphs Panel */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Avg Fleet Utilization</span>
              <div className="text-3xl font-black text-gray-900 mt-2">84.2%</div>
              <div className="text-xs font-semibold text-green-600 mt-2">↑ 2.1% from last week</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">On-Time Delivery</span>
              <div className="text-3xl font-black text-gray-900 mt-2">96.5%</div>
              <div className="text-xs font-semibold text-green-600 mt-2">↑ 0.8% from last week</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deferred Orders</span>
              <div className="text-3xl font-black text-gray-900 mt-2">12</div>
              <div className="text-xs font-semibold text-red-600 mt-2">↓ 4 from last week</div>
            </div>
          </div>

          {/* Graph Placeholder */}
          <div className="bg-white border border-gray-200 rounded-[10px] p-6 shadow-sm flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
              <BarChartIcon /> Fleet Utilization Trend (Last 7 Days)
            </h3>
            
            {/* Mock Graph using pure CSS */}
            <div className="flex-1 min-h-[200px] flex items-end justify-between gap-4 mt-auto pt-8 border-b border-gray-200 pb-2 relative">
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 font-semibold py-2">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              
              <div className="w-8"></div> {/* Spacer for Y-axis */}
              
              <div className="w-full h-full flex items-end justify-between gap-2">
                {[75, 82, 90, 85, 78, 88, 92].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full bg-blue-100 rounded-t-sm relative flex items-end justify-center h-[200px]">
                      <div 
                        className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 group-hover:bg-blue-600" 
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="absolute -top-6 text-[10px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {height}%
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Day {i+1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
