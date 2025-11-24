import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CompileQuestionnaire from "./pages/CompileQuestionnaire";
import Guide from "./pages/Guide";
import Analysis from "./pages/Analysis";
import Admin from "./pages/Admin";
import Footer from "./pages/Footer";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import { Loader2 } from "lucide-react"; // opzionale per spinner
import FinalReport from "./pages/FinalReport";

const queryClient = new QueryClient();
const base = import.meta.env.MODE === "production" ? "/questHub" : "/";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route path="/login" element={<Login />} />

    <Route
      path="/dashboard"
      element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/compile"
      element={
        <RequireAuth>
          <CompileQuestionnaire />
        </RequireAuth>
      }
    />
    <Route
      path="/analysis"
      element={
        <RequireAuth>
          <Analysis />
        </RequireAuth>
      }
    />
    <Route
      path="/admin"
      element={
        <RequireAuth>
          <Admin />
        </RequireAuth>
      }
    />
    <Route
      path="/guide"
      element={
        <RequireAuth>
          <Guide />
        </RequireAuth>
      }
    />
    <Route path="/final-report" element={<FinalReport />} />
    <Route path="*" element={<NotFound />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/cookies" element={<CookiePolicy />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={base}>
          <AppRoutes />
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;