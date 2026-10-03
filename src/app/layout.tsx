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
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-3 font-semibold text-slate-700">
            <span>Customer Enquiry:</span>
            <a
              href="tel:7726077261"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              📞 +91 77260 77261
            </a>
            <span>•</span>
            <a
              href="https://wa.me/917726077261?text=Hi%20Anant%20Electronics%2C%20I%20have%20an%20enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold"
            >
              💬 WhatsApp: 7726077261
            </a>
          </div>
          <p>© {new Date().getFullYear()} Anant Electronics • Source of Truth: Google Sheets</p>
        </footer>
      </body>
    </html>
  );
}
