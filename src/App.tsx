import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ABCCurve from "./pages/ABCCurve";
import Financial from "./pages/Financial";
import TelegramSettings from "./pages/TelegramSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/catalogo/:id" element={<ProductDetail />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/curva-abc" element={<ABCCurve />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/telegram" element={<TelegramSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
