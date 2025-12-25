import { AppShell } from "@/components/layout/AppShell";
import { ColorPickerWindow } from "@/components/colorpicker/ColorPickerWindow";
import { MagnifierWindow } from "@/components/colorpicker/MagnifierWindow";
import { FloatingWebcamWindow, CostTrackingPopup } from "@/components/tools/webcam";
import { useEffect, useState } from "react";
import { useAppFont } from "@/hooks/useAppFont";

type WindowType = "main" | "color-picker" | "color-magnifier" | "floating-webcam" | "webcam-cost-popup";

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
    } else if (path === "/floating-webcam") {
      setWindowType("floating-webcam");
    } else if (path === "/webcam-cost-popup") {
      setWindowType("webcam-cost-popup");
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

  if (windowType === "floating-webcam") {
    return <FloatingWebcamWindow />;
  }

  if (windowType === "webcam-cost-popup") {
    return <CostTrackingPopup />;
  }

  return <AppShell />;
}

export default App;
