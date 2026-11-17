import type { FC } from "react";

export type TabKey =
  | "visualize"
  | "step_trace"
  | "examples"
  | "analysis"
  | "complexity"
  | "code_insights";

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  hasSteps?: boolean;
}

export const TabBar: FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  hasSteps,
}) => {
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "visualize", label: "Visualize", icon: "◉" },
    { key: "step_trace", label: "Step Trace", icon: "⌁" },
    { key: "examples", label: "Examples", icon: "▤" },
    { key: "analysis", label: "Analysis", icon: "◎" },
    { key: "complexity", label: "Complexity", icon: "ϟ" },
    { key: "code_insights", label: "Code Insights", icon: "⌘" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        borderBottom: "1px solid var(--lc-border)",
        backgroundColor: "var(--lc-bg-primary)",
        padding: "0 8px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 12px",
              background: "none",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--lc-accent-orange)"
                : "2px solid transparent",
              color: isActive
                ? "var(--lc-text-primary)"
                : "var(--lc-text-secondary)",
              fontWeight: isActive ? 600 : 500,
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 150ms ease, border-color 150ms ease",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--lc-text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--lc-text-secondary)";
              }
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.key === "visualize" && hasSteps && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--lc-accent-orange)",
                  display: "inline-block",
                }}
                title="Visualization steps available"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
