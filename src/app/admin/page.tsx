"use client";

import { useState, useEffect } from "react";
import type { Dataset, SyncStatus, SyncHistoryEntry } from "@/lib/types";

export default function AdminPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = () => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => setDataset(d))
      .catch(() => {});

    fetch("/api/sync")
      .then((r) => r.json())
      .then((d) => {
        setSyncStatus(d.status);
        setSyncHistory(d.history || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, trigger: "manual" }),
      });
      const data = await res.json();
      setSyncMessage(`[${data.status?.toUpperCase()}] ${data.message}`);
      loadData();
    } catch (err: any) {
      setSyncMessage("Error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
              Administrative Control
            </span>
            <span className="text-xs text-slate-500">Google Sheets Synchronization</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Diagnostics & Source Traceability
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time synchronization controls, integrity validation, and sheet health monitors.
          </p>
        </div>

        {/* Sync Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <svg
              className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncing ? "Syncing Google Sheets..." : "Sync Sheets Now"}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-sm">
          {syncMessage}
        </div>
      )}

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Published Version
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">
            v{dataset?.version ?? "—"}
          </span>
          <span className="text-xs text-emerald-600 font-semibold block mt-1">
            ● Active & Serving
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Products
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">
            {dataset?.products.length ?? 0}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            + {dataset?.accessories.length ?? 0} accessories
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Source Connected
          </span>
          <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
            {dataset?.source.label ?? "Google Sheets"}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-1 truncate">
            SHA: {dataset?.source.sha256.slice(0, 12)}...
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Last Verified Sync
          </span>
          <span className="text-xs font-bold text-slate-900 mt-1 block">
            {dataset ? new Date(dataset.created_at).toLocaleTimeString() : "—"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {dataset ? new Date(dataset.created_at).toLocaleDateString() : ""}
          </span>
        </div>
      </div>

      {/* Sheets Health Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Worksheet Structure & Mapping Report</h2>
          <span className="text-xs font-semibold text-slate-500">
            {dataset?.sheets.length} Sheets Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Worksheet Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dimensions</th>
                <th className="p-3">Non-Blank Cells</th>
                <th className="p-3">Records Extracted</th>
                <th className="p-3">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset?.sheets.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="font-mono">{s.name}</span>
                    {s.configured ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700">Configured</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">Auto</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 uppercase font-semibold text-[10px]">{s.kind}</td>
                  <td className="p-3 font-mono text-slate-500">{s.ref || "Empty"}</td>
                  <td className="p-3 font-medium text-slate-700">{s.non_blank_cells}</td>
                  <td className="p-3 font-bold text-blue-600">{s.record_count}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === "ok"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : s.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Issues Log */}
      {dataset && dataset.validation.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Validation & Integrity Notice Log</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {dataset.validation.length} Notice(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {dataset.validation.map((v, i) => (
              <div key={i} className="p-4 flex items-start gap-3 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                    v.level === "error"
                      ? "bg-red-100 text-red-800"
                      : v.level === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {v.code}
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">{v.sheet ? `[${v.sheet}] ` : ""}{v.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Synchronization Audit History</h2>
          <span className="text-xs text-slate-500">Last {syncHistory.length} sync runs</span>
        </div>

        <div className="divide-y divide-slate-100">
          {syncHistory.map((h) => (
            <div key={h.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      h.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : h.status === "no_change"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {h.status}
                  </span>
                  <span className="font-semibold text-slate-900">{h.message}</span>
                </div>
                <p className="text-slate-500">Trigger: {h.trigger} • Started: {new Date(h.started_at).toLocaleString()}</p>
              </div>

              {h.stats && (
                <div className="flex items-center gap-3 font-medium text-slate-600 shrink-0">
                  <span>{h.stats.new_records} new</span>
                  <span>{h.stats.price_changes} price edits</span>
                  <span>{h.stats.offer_changes} offer edits</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
