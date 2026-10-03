import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { UpdateStatus, useAppUpdater } from "@/hooks/useAppUpdater";
import { AppShell } from "@/components/shell/AppShell";
import { DugoutLayout } from "@/components/dugout/DugoutLayout";
import Games from "./pages/Games";
import GameStats from "./pages/GameStats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function previewUpdateStatus(): UpdateStatus | null {
  if (!import.meta.env.DEV) return null;
  if (new URLSearchParams(window.location.search).get("previewUpdate") !== "1") return null;
  return {
    checking: false,
    available: true,
    downloading: false,
    progress: 0,
    version: "0.1.7",
  };
}

const AppContent = () => {
  const { status: updateStatus, installUpdate, dismissUpdate, checkForUpdate } = useAppUpdater();
  const shownStatus = previewUpdateStatus() ?? updateStatus;

  return (
    <BrowserRouter>
      <AppShell
        updateStatus={shownStatus}
        onInstall={installUpdate}
        onDismiss={dismissUpdate}
        onRetry={checkForUpdate}
      >
        <Routes>
          <Route element={<DugoutLayout />}>
            <Route path="/" element={<span className="sr-only">Squad</span>} />
            <Route path="/depth" element={<span className="sr-only">Depth</span>} />
            <Route path="/lineup" element={<span className="sr-only">Lineup</span>} />
            <Route path="/diamond" element={<span className="sr-only">Diamond</span>} />
          </Route>
          <Route path="/games" element={<Games />} />
          <Route path="/games/:gameId/stats" element={<GameStats />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
