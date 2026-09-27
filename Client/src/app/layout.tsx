import type { Metadata } from "next";
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], 
});

export const metadata: Metadata = {
  title: "RightGo",
  description: "RightGo Logistics Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className} style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}