"use client";

import { useState, useEffect } from "react";
import type { Dataset } from "@/lib/types";

export default function CalendarPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => {
        setDataset(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cal = dataset?.calendar;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            Store Operations
          </span>
          <span className="text-xs text-slate-500">Live Schedule</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
          {cal?.title || "No Week Off Store Calendar"}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Official store working hours, special holiday operations and weekly schedule.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {cal?.entries.map((entry, idx) => (
          <div key={idx} className="p-5 hover:bg-slate-50 transition-colors flex items-start gap-4">
            <div className="w-28 shrink-0">
              {entry.date_display ? (
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-center">
                  <span className="font-black text-blue-800 text-sm block leading-tight">
                    {entry.date_display}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  NOTICE
                </span>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                {entry.text_raw}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
