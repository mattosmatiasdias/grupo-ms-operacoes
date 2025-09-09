import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RelatorioTransporte from "./pages/RelatorioTransporte";
import NovoLancamento from "./pages/NovoLancamento";
import Operacao from "./pages/Operacao";
import NotFound from "./pages/NotFound";

// --- IMPORTS FALTANTES ADICIONADOS AQUI ---
import Notificacao from "./pages/Notificacao";
import Navios from "./pages/Navios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/relatorio-transporte" element={<RelatorioTransporte />} />
            <Route path="/novo-lancamento" element={<NovoLancamento />} />
            <Route path="/operacao/:tipo" element={<Operacao />} />
            
            {/* --- ROTAS FALTANTES ADICIONADAS AQUI --- */}
            <Route path="/notificacao" element={<Notificacao />} />
            <Route path="/navios" element={<Navios />} />
            
            {/* Rota de erro 404 sempre por último */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;