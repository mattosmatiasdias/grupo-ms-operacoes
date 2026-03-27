// src/pages/MasterDrive.tsx

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
  Loader2
} from 'lucide-react';
import { useMasterDrive } from '@/hooks/useMasterDrive';
import { FiltrosMasterDrive } from '@/components/master-drive/FiltrosMasterDrive';
import { DashboardIndicadores } from '@/components/master-drive/DashboardIndicadores';
import { TreinamentoForm } from '@/components/master-drive/TreinamentoForm';
import { TreinamentoCard } from '@/components/master-drive/TreinamentoCard';
import { TreinamentoDetalhesModal } from '@/components/master-drive/TreinamentoDetalhesModal';
import { DesvioForm } from '@/components/master-drive/DesvioForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-6 py-4">
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
                <h1 className="text-xl font-bold text-white">Master Drive</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gestão de treinamentos e indicadores operacionais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setTreinamentoFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Treinamento
            </Button>
            <Button
              onClick={() => setDesvioFormOpen(true)}
              variant="outline"
              className="border-orange-600 text-orange-400 hover:bg-orange-600/10"
              size="sm"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Registrar Desvio
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="p-6 space-y-6">
        {/* Filtros */}
        <FiltrosMasterDrive
          filtros={filtros}
          setFiltros={setFiltros}
          colaboradores={colaboradores}
          tiposTreinamento={tiposTreinamento}
          onLimpar={handleLimparFiltros}
        />

        {/* Dashboard com Indicadores */}
        <DashboardIndicadores 
          indicadores={indicadores} 
          treinamentos={treinamentos}
          loading={loading} 
        />

        {/* Tabs para Listagens */}
        <Tabs defaultValue="treinamentos" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="treinamentos" className="data-[state=active]:bg-slate-800">
              <GraduationCap className="h-4 w-4 mr-2" />
              Treinamentos ({treinamentos.length})
            </TabsTrigger>
            <TabsTrigger value="desvios" className="data-[state=active]:bg-slate-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Desvios ({desvios.length})
            </TabsTrigger>
          </TabsList>

          {/* Lista de Treinamentos em Cards */}
          <TabsContent value="treinamentos" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : treinamentos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum treinamento encontrado</p>
                <Button
                  variant="link"
                  onClick={() => setTreinamentoFormOpen(true)}
                  className="mt-2"
                >
                  Registrar primeiro treinamento
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Lista de Desvios */}
          <TabsContent value="desvios" className="mt-4">
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-200">
                  Histórico de Desvios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                  </div>
                ) : desvios.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum desvio encontrado</p>
                    <Button
                      variant="link"
                      onClick={() => setDesvioFormOpen(true)}
                      className="mt-2"
                    >
                      Registrar primeiro desvio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {desvios.map((desvio) => (
                      <div
                        key={desvio.id}
                        className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 hover:border-orange-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getSituacaoBadge(desvio.situacao)}
                              <span className="text-xs text-slate-500">
                                {formatarDataSimples(desvio.data_desvio)}
                              </span>
                              {desvio.tipo_desvio && (
                                <Badge variant="outline" className="text-orange-400 border-orange-500/50">
                                  {desvio.tipo_desvio}
                                </Badge>
                              )}
                            </div>
                            <p className="text-white font-medium mb-1">
                              {desvio.colaborador?.nome_completo || 'Colaborador não identificado'}
                            </p>
                            <p className="text-slate-400 text-sm mb-2">
                              {desvio.descricao}
                            </p>
                            {desvio.responsavel && (
                              <p className="text-xs text-slate-500">
                                Responsável: {desvio.responsavel}
                              </p>
                            )}
                            {desvio.data_tratamento && (
                              <p className="text-xs text-emerald-500 mt-1">
                                Tratado em: {formatarDataSimples(desvio.data_tratamento)}
                              </p>
                            )}
                          </div>
                          {desvio.situacao === 'EM_ABERTO' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const tratamento = prompt('Descreva o tratamento realizado:');
                                if (tratamento) {
                                  tratarDesvio(desvio.id, new Date().toISOString().split('T')[0], tratamento);
                                }
                              }}
                              className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
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

      {/* Modais */}
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