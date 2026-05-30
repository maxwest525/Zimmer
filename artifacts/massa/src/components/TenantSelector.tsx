import { useState, useRef, useEffect } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { PROJECTS } from "@/data/mock";

function statusDot(status: string) {
  if (status === "running") return "#34d399";
  if (status === "needs-review" || status === "idle" || status === "queued") return "#f59e0b";
  if (status === "failed") return "#f87171";
  if (status === "complete") return "#60a5fa";
  return "#9ca3af";
}

export function TenantSelector() {
  const { selectedTenantId, setSelectedTenantId } = useTenant();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const projects = PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
  }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedTenantId);
  const label = selectedProject ? selectedProject.name : "All Projects";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(52,211,153,0.04)",
          border: "1px solid rgba(52,211,153,0.15)",
          borderRadius: 4,
          padding: "5px 10px 5px 8px",
          cursor: "pointer",
          color: c.text,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", Menlo, monospace',
          whiteSpace: "nowrap",
          transition: "border-color 0.15s, background 0.15s",
          maxWidth: 180,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(52,211,153,0.35)";
          e.currentTarget.style.background = "rgba(52,211,153,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(52,211,153,0.15)";
          e.currentTarget.style.background = "rgba(52,211,153,0.04)";
        }}
      >
        {selectedProject && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: statusDot(selectedProject.status),
              flexShrink: 0,
              boxShadow: selectedProject.status === "running" ? `0 0 4px ${statusDot(selectedProject.status)}` : "none",
            }}
          />
        )}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 120,
          }}
        >
          {label}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: c.panel,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              setSelectedTenantId(null);
              setOpen(false);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: selectedTenantId === null ? "rgba(52,211,153,0.06)" : "transparent",
              border: "none",
              borderBottom: `1px solid ${c.border}`,
              cursor: "pointer",
              color: selectedTenantId === null ? c.green : c.text,
              fontSize: 11,
              fontWeight: selectedTenantId === null ? 700 : 500,
              fontFamily: '"JetBrains Mono", Menlo, monospace',
              textAlign: "left",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(52,211,153,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                selectedTenantId === null ? "rgba(52,211,153,0.06)" : "transparent";
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.5, flexShrink: 0 }}
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            All Projects
          </button>

          {projects.map((project) => {
            const isSelected = selectedTenantId === project.id;
            return (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedTenantId(project.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: isSelected ? "rgba(52,211,153,0.06)" : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${c.borderDim}`,
                  cursor: "pointer",
                  color: isSelected ? c.green : c.text,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: '"JetBrains Mono", Menlo, monospace',
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(52,211,153,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "rgba(52,211,153,0.06)"
                    : "transparent";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: statusDot(project.status),
                    flexShrink: 0,
                    boxShadow: project.status === "running" ? `0 0 4px ${statusDot(project.status)}` : "none",
                  }}
                />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {project.name}
                </span>
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={c.green}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
