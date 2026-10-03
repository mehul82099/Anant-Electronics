"use client";

import type { ProductRecord } from "@/lib/types";

interface SourceInspectModalProps {
  product: ProductRecord | null;
  onClose: () => void;
}

export function SourceInspectModal({ product, onClose }: SourceInspectModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                100% Traceable
              </span>
              <span className="text-xs font-medium text-slate-500">
                {product.source_sheet} • Row {product.source_row}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              Source Diagnostics: {product.model}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Source Sheet</span>
              <span className="font-bold text-slate-900">{product.source_sheet}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Source Row</span>
              <span className="font-bold text-slate-900">Row {product.source_row}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Fingerprint</span>
              <span className="font-mono text-xs font-bold text-slate-700">{product.fingerprint}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Sync Version</span>
              <span className="font-bold text-slate-900">v{product.sync_version}</span>
            </div>
          </div>

          {/* Exact Raw Cells Table */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2">Exact Spreadsheet Cells (A1 Formats):</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Address</th>
                    <th className="p-2.5">Mapped Field</th>
                    <th className="p-2.5">Raw Cell Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(product.source_cells).map(([addr, raw]) => {
                    const col = addr.replace(/\d+/, "");
                    const matchedField = Object.entries(product.source_columns).find(([, c]) => c === col)?.[0] || "Custom / Raw Cell";

                    return (
                      <tr key={addr} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-600 bg-blue-50/30">{addr}</td>
                        <td className="p-2.5 font-medium text-slate-600 capitalize">{matchedField.replace(/_/g, " ")}</td>
                        <td className="p-2.5 font-mono text-slate-900">
                          {raw === null ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : (
                            JSON.stringify(raw)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs text-slate-600">
            <p><strong>First Seen:</strong> {new Date(product.first_seen_at).toLocaleString()}</p>
            <p><strong>Last Changed:</strong> {new Date(product.last_changed_at).toLocaleString()}</p>
            <p><strong>Last Verified:</strong> {new Date(product.last_synced_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a
            href="https://docs.google.com/spreadsheets/d/1sj8ptmZ_dSUVC9IvsMdPt_wkgAnMmYXCAO0qYUmFkTs/edit"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Open Google Sheet</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
