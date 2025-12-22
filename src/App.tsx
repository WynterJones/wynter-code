import { AppShell } from "@/components/layout/AppShell";
import { useEffect } from "react";
import { useAppFont } from "@/hooks/useAppFont";

function App() {
  useAppFont();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <AppShell />;
}

export default App;
