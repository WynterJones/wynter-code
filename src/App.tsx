import { AppShell } from "@/components/layout/AppShell";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <AppShell />;
}

export default App;
