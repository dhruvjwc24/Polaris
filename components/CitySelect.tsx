"use client";

import { useState, useRef, useEffect } from "react";
import { CITIES_BY_STATE } from "@/data/us-cities";

interface Props {
  stateAbbr: string;
  value: string[];
  onChange: (cities: string[]) => void;
}

const inputCls =
  "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500";

export function CitySelect({ stateAbbr, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allCities = CITIES_BY_STATE[stateAbbr] ?? [];
  const filtered = allCities.filter(
    (c) =>
      c.toLowerCase().includes(query.toLowerCase()) && !value.includes(c)
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const li = listRef.current.children[activeIdx] as HTMLElement;
      li?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  function add(city: string) {
    if (!value.includes(city)) onChange([...value, city]);
    setQuery("");
    setOpen(false);
    setActiveIdx(-1);
  }

  function remove(city: string) {
    onChange(value.filter((c) => c !== city));
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
      if (activeIdx >= 0 && filtered[activeIdx]) add(filtered[activeIdx]);
      else if (filtered.length === 1) add(filtered[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  if (!stateAbbr) return null;

  return (
    <div ref={containerRef}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((city) => (
            <span
              key={city}
              className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-0.5 text-xs text-gray-200"
            >
              {city}
              <button
                type="button"
                onClick={() => remove(city)}
                className="text-gray-500 hover:text-gray-200 leading-none ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          className={inputCls}
          placeholder={value.length === 0 ? "Search cities..." : "Add another city..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl max-h-56 overflow-y-auto"
          >
            {filtered.map((city, i) => (
              <li
                key={city}
                onMouseDown={() => add(city)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === activeIdx ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
              >
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
