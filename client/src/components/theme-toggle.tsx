import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return "fas fa-sun";
      case "dark":
        return "fas fa-moon";
      default:
        return "fas fa-desktop";
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case "light":
        return "Switch to dark mode";
      case "dark":
        return "Switch to system mode";
      default:
        return "Switch to light mode";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={getTooltip()}
      className="relative"
      data-testid="button-theme-toggle"
    >
      <i className={`${getIcon()} text-lg transition-all duration-300`}></i>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}