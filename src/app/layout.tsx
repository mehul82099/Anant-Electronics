import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Anant Electronics – Live Mobile Price & Customer Presentation",
  description: "Live mobile pricing, bank offers, cashbacks and customer presentation for Anant Electronics. Powered directly by Google Sheets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Anant Electronics • Source of Truth: Google Sheets</p>
        </footer>
      </body>
    </html>
  );
}
