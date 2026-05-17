"use client";

import { useState, useRef, useEffect } from "react";
import { US_STATES } from "@/data/us-cities";

interface Props {
  value: string; // abbreviation
  onChange: (abbr: string) => void;
}

const inputCls =
  "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500";

export function StateSelect({ value, onChange }: Props) {
  const selected = US_STATES.find((s) => s.abbr === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = US_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.abbr.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selected) setQuery("");
        else setQuery(selected.name);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [selected]);

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const li = listRef.current.children[activeIdx] as HTMLElement;
      li?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) select(filtered[activeIdx].abbr, filtered[activeIdx].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function select(abbr: string, name: string) {
    onChange(abbr);
    setQuery(name);
    setOpen(false);
    setActiveIdx(-1);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className={inputCls}
        placeholder="Search state (e.g. Virginia or VA)"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl max-h-56 overflow-y-auto"
        >
          {filtered.map((s, i) => (
            <li
              key={s.abbr}
              onMouseDown={() => select(s.abbr, s.name)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                i === activeIdx ? "bg-gray-700" : "hover:bg-gray-800"
              }`}
            >
              <span>{s.name}</span>
              <span className="text-gray-500 text-xs ml-2">{s.abbr}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
