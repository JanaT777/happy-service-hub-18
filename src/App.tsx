import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TicketProvider } from "@/context/TicketContext";
import { AppHeader } from "@/components/AppHeader";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import AdminDetail from "./pages/AdminDetail.tsx";
import TrackRequest from "./pages/TrackRequest.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TicketProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppHeader />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/track" element={<TrackRequest />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:id" element={<AdminDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TicketProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
