import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Swach | Admin Dashboard",
  description: "Live oversight and analytics for Project Swach",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="flex min-h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
