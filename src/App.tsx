import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TicketProvider } from "@/context/TicketContext";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import AdminDetail from "./pages/AdminDetail.tsx";
import TrackRequest from "./pages/TrackRequest.tsx";
import CRM from "./pages/CRM.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

// HMR anchor v4
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TicketProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppHeader />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/track" element={<TrackRequest />} />
              <Route path="/login" element={<Login />} />

              {/* CC Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['cc_admin']}>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/:id" element={
                <ProtectedRoute allowedRoles={['cc_admin']}>
                  <AdminDetail />
                </ProtectedRoute>
              } />

              {/* CRM routes */}
              <Route path="/crm" element={
                <ProtectedRoute allowedRoles={['crm']}>
                  <CRM />
                </ProtectedRoute>
              } />
              <Route path="/crm/:id" element={
                <ProtectedRoute allowedRoles={['crm']}>
                  <AdminDetail />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TicketProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
