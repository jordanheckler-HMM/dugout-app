import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEcosystemInit } from "@/hooks/useEcosystemInit";
import { useAppUpdater } from "@/hooks/useAppUpdater";
import { UpdateBanner } from "@/components/UpdateBanner";
import Index from "./pages/Index";
import Games from "./pages/Games";
import GameStats from "./pages/GameStats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Inner app component that uses hooks
 */
const AppContent = () => {
  // Initialize ecosystem directory on startup
  useEcosystemInit();

  // Check for app updates
  const { status: updateStatus, installUpdate, dismissUpdate } = useAppUpdater();

  return (
    <>
      <UpdateBanner
        status={updateStatus}
        onInstall={installUpdate}
        onDismiss={dismissUpdate}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:gameId/stats" element={<GameStats />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
