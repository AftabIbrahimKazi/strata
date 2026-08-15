"use client";

import { useState, type ReactNode } from "react";

type Tab = { id: string; label: string; content: ReactNode };

export default function FrameworkTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <ul className="nav nav-tabs mb-4" role="tablist">
        {tabs.map((t) => (
          <li className="nav-item" key={t.id}>
            <button
              type="button"
              role="tab"
              aria-selected={active === t.id}
              className={`nav-link ${active === t.id ? "active" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content">
        {tabs.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            hidden={active !== t.id}
            className={`tab-pane ${active === t.id ? "active" : ""}`}
          >
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
