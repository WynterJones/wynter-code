import { AppShell } from "@/components/layout/AppShell";
import { ColorPickerWindow } from "@/components/colorpicker/ColorPickerWindow";
import { MagnifierWindow } from "@/components/colorpicker/MagnifierWindow";
import { useEffect, useState } from "react";
import { useAppFont } from "@/hooks/useAppFont";

type WindowType = "main" | "color-picker" | "color-magnifier";

function App() {
  useAppFont();
  const [windowType, setWindowType] = useState<WindowType>("main");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    // Check window type based on path
    const path = window.location.pathname;
    if (path === "/color-picker") {
      setWindowType("color-picker");
    } else if (path === "/color-magnifier") {
      setWindowType("color-magnifier");
    } else {
      setWindowType("main");
    }
  }, []);

  // Render appropriate window based on type
  if (windowType === "color-picker") {
    return <ColorPickerWindow />;
  }

  if (windowType === "color-magnifier") {
    return <MagnifierWindow />;
  }

  return <AppShell />;
}

export default App;
