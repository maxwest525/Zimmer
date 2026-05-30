import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 16 }: ThemeToggleProps) {
  const { isDark, toggleTheme, colors } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "transparent",
        border: `1px solid ${colors.border}`,
        color: colors.muted,
        cursor: "pointer",
        transition: "color 0.15s, background 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.green;
        e.currentTarget.style.borderColor = colors.green;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.muted;
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
