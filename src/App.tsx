import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Import de TODAS as páginas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Notificacao from "./pages/Notificacao";

// Páginas do sistema de 'Relatório de Transporte'
import RelatorioTransporte from "./pages/RelatorioTransporte";
import NovoLancamento from "./pages/NovoLancamento";
import Operacao from "./pages/Operacao";

// Páginas do sistema de 'Gestão de Navios'
import Navios from "./pages/Navios";
import NovoNavio from "./pages/NovoNavio";
import ProducaoDiaria from "./pages/ProducaoDiaria";
import EditarNavio from "./pages/EditarNavio";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas principais */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/notificacao" element={<Notificacao />} />

            {/* Rotas do sistema de 'Relatório de Transporte' */}
            <Route path="/relatorio-transporte" element={<RelatorioTransporte />} />
            <Route path="/novo-lancamento" element={<NovoLancamento />} />
            <Route path="/operacao/:tipo" element={<Operacao />} />

            {/* Rotas do sistema de 'Gestão de Navios' */}
            <Route path="/navios" element={<Navios />} />
            <Route path="/novo-navio" element={<NovoNavio />} />
            <Route path="/navio/:id/editar" element={<EditarNavio />} />
            <Route path="/navio/:id/producao" element={<ProducaoDiaria />} />
            
            {/* Rota de erro 404 sempre por último */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;