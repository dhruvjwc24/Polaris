"use client";

import { useState } from "react";

interface TableSection {
  name: string;
  rows: Record<string, unknown>[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 120);
  const str = String(value);
  return str.length > 120 ? str.slice(0, 120) + "…" : str;
}

function Table({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p className="text-gray-600 text-sm px-4 pb-4">No rows</p>;

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto border-t border-gray-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900">
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-gray-300 whitespace-nowrap font-mono">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableViewer({ tables }: { tables: TableSection[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function toggle(name: string) {
    setOpen((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="flex flex-col gap-3">
      {tables.map((t) => (
        <div key={t.name} className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(t.name)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-900 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-gray-200">{t.name}</span>
              <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                {t.rows.length} {t.rows.length === 1 ? "row" : "rows"}
              </span>
            </div>
            <span className="text-gray-600 text-sm">{open[t.name] ? "▲" : "▼"}</span>
          </button>
          {open[t.name] && <Table rows={t.rows} />}
        </div>
      ))}
    </div>
  );
}
