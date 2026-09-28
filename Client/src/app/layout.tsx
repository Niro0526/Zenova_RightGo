import type { Metadata } from "next";
import './globals.css';

export const metadata: Metadata = {
  title: 'RightGo Pulse - Store Operations',
  description: 'RightGo Store Manager and Logistics Operations Console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
