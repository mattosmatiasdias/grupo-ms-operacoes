import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  GraduationCap, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Layout, // Ícone compatível
  List,   // Ícone compatível
  Users
} from 'lucide-react';
import { useMasterDrive } from '@/hooks/useMasterDrive';
import { FiltrosMasterDrive } from '@/components/master-drive/FiltrosMasterDrive';
import { DashboardIndicadores } from '@/components/master-drive/DashboardIndicadores';
import { TreinamentoForm } from '@/components/master-drive/TreinamentoForm';
import { TreinamentoCard } from '@/components/master-drive/TreinamentoCard';
import { TreinamentoDetalhesModal } from '@/components/master-drive/TreinamentoDetalhesModal';
import { DesvioForm } from '@/components/master-drive/DesvioForm';

export default function MasterDrive() {
  const navigate = useNavigate();
  const {
    loading,
    colaboradores,
    tiposTreinamento,
    treinamentos,
    desvios,
    indicadores,
    filtros,
    setFiltros,
    adicionarTreinamento,
    atualizarTreinamento,
    excluirTreinamento,
    adicionarDesvio,
    tratarDesvio,
    carregarDadosBase
  } = useMasterDrive();

  const [treinamentoFormOpen, setTreinamentoFormOpen] = useState(false);
  const [desvioFormOpen, setDesvioFormOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<any>(null);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);

  const handleLimparFiltros = () => {
    setFiltros({});
  };

  const handleCardClick = (treinamento: any) => {
    setSelectedTreinamento(treinamento);
    setDetalhesModalOpen(true);
  };

  const handleEditTreinamento = async (updatedData: any, participantesIds: string[]) => {
    if (selectedTreinamento) {
      await atualizarTreinamento(selectedTreinamento.id, updatedData, participantesIds);
      setDetalhesModalOpen(false);
      setSelectedTreinamento(null);
    }
  };

  const handleDeleteTreinamento = async () => {
    if (selectedTreinamento) {
      await excluirTreinamento(selectedTreinamento.id);
      setDetalhesModalOpen(false);
      setSelectedTreinamento(null);
    }
  };

  const formatarDataSimples = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const getSituacaoBadge = (situacao: string) => {
    switch (situacao) {
      case 'EM_ABERTO':
        return <Badge variant="destructive" className="bg-red-600">Em Aberto</Badge>;
      case 'TRATADO':
        return <Badge variant="default" className="bg-emerald-600">Tratado</Badge>;
      default:
        return <Badge variant="secondary">Cancelado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header Simplificado e Global */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-indigo-400" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Master Drive</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestão de competências e indicadores de performance
              </p>
            </div>
          </div>
          
          {/* Badges de Resumo Rápido no Header */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Treinamentos</span>
              <span className="text-sm font-bold text-white">{treinamentos.length}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Desvios Abertos</span>
              <span className={`text-sm font-bold ${desvios.filter(d => d.situacao === 'EM_ABERTO').length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {desvios.filter(d => d.situacao === 'EM_ABERTO').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Abas */}
      <main className="p-4 md:p-6">
        <Tabs defaultValue="visao-gerencial" className="w-full space-y-6">
          
          {/* Navegação das Abas */}
          <TabsList className="bg-slate-900 border border-slate-800 w-full md:w-auto h-auto p-1 grid grid-cols-1 md:grid-cols-3">
            <TabsTrigger value="visao-gerencial" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-3 px-4 justify-start gap-2">
              <Layout className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase leading-none">Visão Executiva</div>
                <div className="text-[10px] opacity-70 mt-1">KPIs e Gráficos</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="treinamentos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 px-4 justify-start gap-2">
              <GraduationCap className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase leading-none">Gestão de Treinamentos</div>
                <div className="text-[10px] opacity-70 mt-1">Cadastrar e Listar</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="desvios" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white py-3 px-4 justify-start gap-2">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase leading-none">Gestão de Desvios</div>
                <div className="text-[10px] opacity-70 mt-1">Registrar e Tratar</div>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: Visão Executiva (Focada em Apresentação/Print) */}
          <TabsContent value="visao-gerencial" className="space-y-6 mt-0">
            <div className="mb-4 pb-4 border-b border-slate-800/50 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">Painel de Indicadores</h2>
                <p className="text-slate-400 text-sm">Visão consolidada de performance e não conformidades.</p>
              </div>
              {/* Indicador visual de filtros ativos */}
              {filtros && Object.keys(filtros).length > 0 && (
                <div className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                  Filtros Ativos Aplicados
                </div>
              )}
            </div>
            
            {/* COMPONENTE DASHBOARD RECEBENDO FILTROS */}
            <DashboardIndicadores 
              indicadores={indicadores} 
              treinamentos={treinamentos}
              desvios={desvios} 
              loading={loading} 
              filtros={filtros} 
            />
          </TabsContent>

          {/* ABA 2: Gestão de Treinamentos (Operacional) */}
          <TabsContent value="treinamentos" className="space-y-6 mt-0">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">Base de Treinamentos</h2>
                <p className="text-slate-400 text-sm">Gerencie os registros de capacitação da equipe.</p>
              </div>
              <Button
                onClick={() => setTreinamentoFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto shadow-lg shadow-blue-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Treinamento
              </Button>
            </div>

            <FiltrosMasterDrive
              filtros={filtros}
              setFiltros={setFiltros}
              colaboradores={colaboradores}
              tiposTreinamento={tiposTreinamento}
              onLimpar={handleLimparFiltros}
            />

            {loading ? (
              <div className="flex justify-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : treinamentos.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-300">Nenhum treinamento encontrado</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Comece registrando um novo treinamento para preencher a base de dados.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setTreinamentoFormOpen(true)}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primeiro Treinamento
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {treinamentos.map((treinamento) => (
                  <TreinamentoCard
                    key={treinamento.id}
                    treinamento={treinamento}
                    onClick={() => handleCardClick(treinamento)}
                    onEdit={() => handleCardClick(treinamento)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA 3: Gestão de Desvios (Operacional) */}
          <TabsContent value="desvios" className="space-y-6 mt-0">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">Registro de Não Conformidades</h2>
                <p className="text-slate-400 text-sm">Acompanhe desvios e planos de ação.</p>
              </div>
              <Button
                onClick={() => setDesvioFormOpen(true)}
                variant="outline"
                className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10 hover:text-orange-300 w-full md:w-auto"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrar Desvio
              </Button>
            </div>

            <Card className="bg-slate-900/40 border-slate-800 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : desvios.length === 0 ? (
                  <div className="text-center py-20">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg font-medium text-slate-300">Nenhum desvio registrado</h3>
                    <p className="text-slate-500 mt-2">O histórico de não conformidades aparecerá aqui.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {desvios.map((desvio, index) => (
                      <div
                        key={desvio.id}
                        className={`p-5 hover:bg-slate-800/50 transition-colors ${index === 0 ? 'rounded-t-xl' : ''} ${index === desvios.length - 1 ? 'rounded-b-xl' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              {getSituacaoBadge(desvio.situacao)}
                              <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                                {formatarDataSimples(desvio.data_desvio)}
                              </span>
                              {desvio.tipo_desvio && (
                                <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/5">
                                  {desvio.tipo_desvio}
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-white font-medium truncate text-lg">
                              {desvio.colaborador?.nome_completo || 'Colaborador não identificado'}
                            </h4>
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                              {desvio.descricao}
                            </p>
                            
                            <div className="mt-3 flex items-center gap-6 text-xs text-slate-500">
                              {desvio.responsavel && (
                                <span className="flex items-center gap-1">
                                  <span>Responsável:</span> 
                                  <span className="text-slate-300">{desvio.responsavel}</span>
                                </span>
                              )}
                              {desvio.data_tratamento && (
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <CheckCircle className="h-3 w-3" />
                                  Tratado em: {formatarDataSimples(desvio.data_tratamento)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {desvio.situacao === 'EM_ABERTO' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                const tratamento = prompt('Descreva a ação corretiva realizada:');
                                if (tratamento) {
                                  tratarDesvio(desvio.id, new Date().toISOString().split('T')[0], tratamento);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 shrink-0 shadow-lg shadow-emerald-900/20"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Tratar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modais Globais */}
      <TreinamentoForm
        open={treinamentoFormOpen}
        onOpenChange={setTreinamentoFormOpen}
        colaboradores={colaboradores}
        tiposTreinamento={tiposTreinamento}
        onSubmit={adicionarTreinamento}
        onColaboradorCadastrado={carregarDadosBase}
      />

      <TreinamentoDetalhesModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        treinamento={selectedTreinamento}
        tiposTreinamento={tiposTreinamento}
        colaboradores={colaboradores}
        onSave={handleEditTreinamento}
        onDelete={handleDeleteTreinamento}
      />

      <DesvioForm
        open={desvioFormOpen}
        onOpenChange={setDesvioFormOpen}
        colaboradores={colaboradores}
        onSubmit={adicionarDesvio}
      />
    </div>
  );
}