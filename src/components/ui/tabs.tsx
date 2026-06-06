"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultValue,
}: {
  items: TabItem[];
  defaultValue?: string;
}) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 border-b">
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active === it.value}
            onClick={() => setActive(it.value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
              active === it.value
                ? "border-s4s-blue text-s4s-blue"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it) => (
        <div key={it.value} role="tabpanel" hidden={active !== it.value}>
          {it.content}
        </div>
      ))}
    </div>
  );
}
