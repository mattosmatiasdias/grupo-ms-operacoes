// src/App.tsx (ATUALIZADO - removidas todas as rotas de escalas)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Import de TODAS as páginas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Notificacao from "./pages/Notificacao";
import Visuais from "./pages/Visuais";

// Páginas do sistema de 'Relatório de Transporte'
import RelatorioTransporte from "./pages/RelatorioTransporte";
import NovoLancamento from "./pages/NovoLancamento";
import FormularioOperacao from "./pages/FormularioOperacao";
import EditarOperacao from "./pages/EditarOperacao";
import VisualizarOperacao from "./pages/VisualizarOperacao";

// Páginas do sistema de 'Gestão de Navios'
import Navios from "./pages/Navios";
import NovoNavio from "./pages/NovoNavio";
import ProducaoDiaria from "./pages/ProducaoDiaria";
import EditarNavio from "./pages/EditarNavio";

// Página do RDO Santos Brasil
import RdoSantosBrasil from "./pages/RdoSantosBrasil";

// Página do módulo de Vistorias
import Vistorias from "./pages/Vistorias";

// Página do módulo de Rateios
import Rateios from "./pages/Rateios";

// NOVO MÓDULO - Homem Hora
import HomemHora from "./pages/HomemHora";

// NOVO MÓDULO - Contratos
import Contratos from "./pages/Contratos";
import ContractDetail from "./pages/ContractDetail";

// Página de Boletim de Medição (BM)
import BMForm from "./pages/BMForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rota pública - Acesso livre */}
            <Route path="/auth" element={<Auth />} />

            {/* Rotas protegidas - Requerem autenticação */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />

            <Route path="/notificacao" element={
              <ProtectedRoute>
                <Notificacao />
              </ProtectedRoute>
            } />

            <Route path="/visuais" element={
              <ProtectedRoute>
                <Visuais />
              </ProtectedRoute>
            } />

            {/* Rotas do sistema de 'Relatório de Transporte' */}
            <Route path="/relatorio-transporte" element={
              <ProtectedRoute>
                <RelatorioTransporte />
              </ProtectedRoute>
            } />

            <Route path="/novo-lancamento" element={
              <ProtectedRoute>
                <NovoLancamento />
              </ProtectedRoute>
            } />

            <Route path="/formulario-operacao" element={
              <ProtectedRoute>
                <FormularioOperacao />
              </ProtectedRoute>
            } />

            <Route path="/operacao/:id/editar" element={
              <ProtectedRoute>
                <EditarOperacao />
              </ProtectedRoute>
            } />

            <Route path="/operacao/:id/visualizar" element={
              <ProtectedRoute>
                <VisualizarOperacao />
              </ProtectedRoute>
            } />

            {/* Rotas do sistema de 'Gestão de Navios' */}
            <Route path="/navios" element={
              <ProtectedRoute>
                <Navios />
              </ProtectedRoute>
            } />

            <Route path="/novo-navio" element={
              <ProtectedRoute>
                <NovoNavio />
              </ProtectedRoute>
            } />

            <Route path="/navio/:id/editar" element={
              <ProtectedRoute>
                <EditarNavio />
              </ProtectedRoute>
            } />

            <Route path="/navio/:id/producao" element={
              <ProtectedRoute>
                <ProducaoDiaria />
              </ProtectedRoute>
            } />

            {/* Rota do RDO Santos Brasil */}
            <Route path="/santos-brasil" element={
              <ProtectedRoute>
                <RdoSantosBrasil />
              </ProtectedRoute>
            } />

            {/* Rota do módulo de Vistorias */}
            <Route path="/vistorias" element={
              <ProtectedRoute>
                <Vistorias />
              </ProtectedRoute>
            } />

            {/* Rota do módulo de Rateios */}
            <Route path="/rateios" element={
              <ProtectedRoute>
                <Rateios />
              </ProtectedRoute>
            } />

            {/* NOVA ROTA - Homem Hora */}
            <Route path="/homem-hora" element={
              <ProtectedRoute>
                <HomemHora />
              </ProtectedRoute>
            } />

            {/* NOVAS ROTAS - Contratos BM */}
            <Route path="/contratos" element={
              <ProtectedRoute>
                <Contratos />
              </ProtectedRoute>
            } />

            <Route path="/contrato/:id" element={
              <ProtectedRoute>
                <ContractDetail />
              </ProtectedRoute>
            } />

            {/* ROTAS DO BOLETIM DE MEDIÇÃO */}
            <Route path="/contrato/:id/bm/novo" element={
              <ProtectedRoute>
                <BMForm />
              </ProtectedRoute>
            } />

            <Route path="/contrato/:id/bm/:bmId" element={
              <ProtectedRoute>
                <BMForm />
              </ProtectedRoute>
            } />

            {/* Redirecionar rotas não encontradas para auth */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;