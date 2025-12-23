import { AppShell } from "@/components/layout/AppShell";
import { ColorPickerWindow } from "@/components/colorpicker/ColorPickerWindow";
import { useEffect, useState } from "react";
import { useAppFont } from "@/hooks/useAppFont";

function App() {
  useAppFont();
  const [isColorPickerWindow, setIsColorPickerWindow] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    // Check if this is the color picker window
    setIsColorPickerWindow(window.location.pathname === "/color-picker");
  }, []);

  // Render color picker window if on that route
  if (isColorPickerWindow) {
    return <ColorPickerWindow />;
  }

  return <AppShell />;
}

export default App;
