// RightGo Offline Fallback Page
// Shown by the Service Worker when user navigates while offline
// and no cached version of the page is available.
// This page itself is pre-cached during SW install.

export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RightGo - Offline</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
          }
          .icon {
            width: 72px;
            height: 72px;
            background: #1e293b;
            border: 2px solid #334155;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            color: #f1f5f9;
            margin-bottom: 8px;
          }
          p {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.6;
            max-width: 280px;
            margin: 0 auto 32px;
          }
          .info-box {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 20px;
            max-width: 320px;
            width: 100%;
            margin-bottom: 28px;
          }
          .info-box h2 {
            font-size: 13px;
            font-weight: 700;
            color: #22c55e;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 12px;
          }
          .info-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 6px 0;
            font-size: 13px;
            color: #cbd5e1;
            border-bottom: 1px solid #1e2d3f;
            text-align: left;
          }
          .info-item:last-child { border-bottom: none; }
          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22c55e;
            margin-top: 6px;
            flex-shrink: 0;
          }
          button {
            background: #f97316;
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            max-width: 280px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #1e293b;
            border: 1px solid #22c55e33;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: #22c55e;
            margin-bottom: 20px;
          }
          .badge-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </head>
      <body>
        <div className="icon">📦</div>
        <div className="badge">
          <span className="badge-dot"></span>
          Offline Mode Active
        </div>
        <h1>You&apos;re Offline</h1>
        <p>
          No internet connection detected. Your delivery data is safe in local storage and will sync automatically when you reconnect.
        </p>

        <div className="info-box">
          <h2>✓ Still Available Offline</h2>
          <div className="info-item">
            <span className="dot"></span>
            <span>View your assigned stops and orders</span>
          </div>
          <div className="info-item">
            <span className="dot"></span>
            <span>Mark deliveries complete (saves to device)</span>
          </div>
          <div className="info-item">
            <span className="dot"></span>
            <span>Report delivery issues and discrepancies</span>
          </div>
          <div className="info-item">
            <span className="dot"></span>
            <span>Auto-syncs to server when connected</span>
          </div>
        </div>

        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </body>
    </html>
  );
}
