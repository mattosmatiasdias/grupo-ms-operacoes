import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Plus, 
  GraduationCap, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Layout,
  Users,
  User,
  Calendar,
  FileText,
  Search,
  XCircle,
  ChevronDown,
  ChevronUp,
  Bug
} from 'lucide-react';
import { useMasterDrive } from '@/hooks/useMasterDrive';
import { FiltrosMasterDrive } from '@/components/master-drive/FiltrosMasterDrive';
import { DashboardIndicadores } from '@/components/master-drive/DashboardIndicadores';
import { TreinamentoForm } from '@/components/master-drive/TreinamentoForm';
import { TreinamentoCard } from '@/components/master-drive/TreinamentoCard';
import { TreinamentoDetalhesModal } from '@/components/master-drive/TreinamentoDetalhesModal';
import { DesvioForm } from '@/components/master-drive/DesvioForm';

// Função segura para converter qualquer valor para string
const paraString = (valor: any): string => {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return valor.toString();
  if (typeof valor === 'object') {
    // Se for objeto, tenta pegar nome ou label
    if (valor.nome) return valor.nome;
    if (valor.name) return valor.name;
    if (valor.label) return valor.label;
    // Se não tiver nenhum campo amigável, converte para JSON string
    return JSON.stringify(valor);
  }
  return String(valor);
};

// Componente de visualização de funcionários isolado e CORRIGIDO
const FuncionariosView = ({ 
  colaboradores, 
  treinamentos, 
  loading, 
  onNovoTreinamento 
}: any) => {
  const [searchFuncionario, setSearchFuncionario] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dadosProcessados, setDadosProcessados] = useState<any[]>([]);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatarData = (dataString: string): string => {
    if (!dataString) return 'Data não informada';
    try {
      const date = new Date(dataString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStr = paraString(status);
    const statusUpper = statusStr.toUpperCase();
    
    if (statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO') {
      return <Badge className="bg-emerald-600">Concluído</Badge>;
    }
    if (statusUpper === 'EM_ANDAMENTO') {
      return <Badge className="bg-blue-600">Em Andamento</Badge>;
    }
    if (statusUpper === 'PENDENTE') {
      return <Badge className="bg-yellow-600">Pendente</Badge>;
    }
    if (statusUpper === 'REPROVADO') {
      return <Badge className="bg-red-600">Reprovado</Badge>;
    }
    return <Badge variant="secondary">Não Iniciado</Badge>;
  };

  useEffect(() => {
    try {
      setErroLocal(null);
      
      // Validação segura
      if (!colaboradores || !Array.isArray(colaboradores) || colaboradores.length === 0) {
        setDadosProcessados([]);
        return;
      }
      
      if (!treinamentos || !Array.isArray(treinamentos) || treinamentos.length === 0) {
        setDadosProcessados([]);
        return;
      }

      const mapa = new Map();
      
      // Inicializar colaboradores - CONVERTENDO OBJETOS PARA STRING
      colaboradores.forEach(colab => {
        if (colab && colab.id) {
          mapa.set(colab.id, {
            id: colab.id,
            nome: paraString(colab.nome_completo || colab.nome || 'Nome não informado'),
            cargo: paraString(colab.cargo || ''),
            departamento: paraString(colab.departamento || ''),
            treinamentos: []
          });
        }
      });
      
      // Processar treinamentos
      treinamentos.forEach(treino => {
        if (!treino) return;
        
        let participantes = [];
        if (treino.participantes && Array.isArray(treino.participantes)) {
          participantes = treino.participantes;
        } else if (treino.colaboradores && Array.isArray(treino.colaboradores)) {
          participantes = treino.colaboradores;
        }
        
        participantes.forEach(participante => {
          if (!participante) return;
          
          const colabId = participante.id || participante.colaborador_id || participante.colaboradorId;
          if (!colabId || !mapa.has(colabId)) return;
          
          mapa.get(colabId).treinamentos.push({
            id: treino.id || Math.random().toString(),
            nome: paraString(treino.nome || treino.titulo || 'Treinamento'),
            tipo: paraString(treino.tipo_treinamento || treino.tipo || 'Não especificado'),
            descricao: paraString(treino.descricao || ''),
            data: treino.data_realizacao || treino.data_criacao || new Date().toISOString(),
            cargaHoraria: treino.carga_horaria || 0,
            status: paraString(participante.status || 'PENDENTE'),
            dataConclusao: participante.data_conclusao || null,
            nota: paraString(participante.nota || '')
          });
        });
      });
      
      // Filtrar e ordenar
      let resultados = Array.from(mapa.values()).filter(item => item.treinamentos.length > 0);
      
      if (searchFuncionario.trim()) {
        const search = searchFuncionario.toLowerCase();
        resultados = resultados.filter(item => 
          item.nome.toLowerCase().includes(search) ||
          item.cargo.toLowerCase().includes(search) ||
          item.departamento.toLowerCase().includes(search)
        );
      }
      
      resultados.forEach(item => {
        item.treinamentos.sort((a: any, b: any) => 
          new Date(b.data).getTime() - new Date(a.data).getTime()
        );
      });
      
      setDadosProcessados(resultados);
      
    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setErroLocal(error.message || 'Erro ao processar dados');
      setDadosProcessados([]);
    }
  }, [colaboradores, treinamentos, searchFuncionario]);

  if (erroLocal) {
    return (
      <div className="text-center py-20 bg-red-900/20 rounded-xl border border-red-700/50 p-8">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">Erro ao Carregar Dados</h3>
        <p className="text-slate-400">{erroLocal}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-6"
        >
          Recarregar Página
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (dadosProcessados.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-900/30 rounded-xl">
        <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-300">
          {searchFuncionario ? 'Nenhum funcionário encontrado' : 'Nenhum treinamento registrado'}
        </h3>
        <p className="text-slate-500 mt-2">
          {searchFuncionario 
            ? 'Tente outro nome, cargo ou departamento' 
            : 'Cadastre treinamentos para visualizar o histórico.'}
        </p>
        {!searchFuncionario && (
          <Button onClick={onNovoTreinamento} variant="outline" className="mt-6">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Primeiro Treinamento
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Pesquisar funcionário..."
            value={searchFuncionario}
            onChange={(e) => setSearchFuncionario(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white"
          />
          {searchFuncionario && (
            <button onClick={() => setSearchFuncionario('')} className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <XCircle className="h-4 w-4 text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>
      </div>

      {dadosProcessados.map((colab) => {
        const isExpanded = expandedCards.has(colab.id);
        
        return (
          <Card key={colab.id} className="bg-slate-900/40 border-slate-800">
            <div 
              className="cursor-pointer hover:bg-slate-800/30 transition-colors p-6"
              onClick={() => toggleCard(colab.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <User className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{colab.nome}</h3>
                    <div className="flex gap-3 mt-1">
                      {colab.cargo && colab.cargo !== '' && (
                        <span className="text-xs text-slate-400">📋 {colab.cargo}</span>
                      )}
                      <span className="text-xs text-purple-400">🎓 {colab.treinamentos.length} treinamento(s)</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            
            {isExpanded && (
              <CardContent className="pt-0 pb-6 px-6">
                <div className="space-y-3">
                  {colab.treinamentos.map((treino: any, idx: number) => (
                    <div key={`${colab.id}_${idx}`} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-purple-400" />
                            {treino.nome}
                          </h4>
                          {treino.tipo && treino.tipo !== 'Não especificado' && treino.tipo !== '' && (
                            <p className="text-xs text-slate-400 mt-1">Tipo: {treino.tipo}</p>
                          )}
                        </div>
                        {getStatusBadge(treino.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">Realização: {formatarData(treino.data)}</span>
                        </div>
                        {treino.dataConclusao && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs">Conclusão: {formatarData(treino.dataConclusao)}</span>
                          </div>
                        )}
                        {treino.nota && treino.nota !== '' && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <FileText className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs">Nota: {treino.nota}</span>
                          </div>
                        )}
                      </div>
                      
                      {treino.descricao && treino.descricao !== '' && (
                        <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-700/50">
                          {treino.descricao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// Componente principal
export default function MasterDrive() {
  const navigate = useNavigate();
  
  const hookData = useMasterDrive();
  
  const {
    loading = false,
    colaboradores = [],
    tiposTreinamento = [],
    treinamentos = [],
    desvios = [],
    indicadores = {},
    filtros = {},
    setFiltros = () => {},
    adicionarTreinamento = async () => {},
    atualizarTreinamento = async () => {},
    excluirTreinamento = async () => {},
    adicionarDesvio = async () => {},
    tratarDesvio = async () => {},
    carregarDadosBase = async () => {}
  } = hookData;

  const [treinamentoFormOpen, setTreinamentoFormOpen] = useState(false);
  const [desvioFormOpen, setDesvioFormOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<any>(null);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);

  const handleLimparFiltros = () => setFiltros({});
  
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
    try {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    } catch {
      return '';
    }
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
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Treinamentos</span>
              <span className="text-sm font-bold text-white">{treinamentos?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Desvios Abertos</span>
              <span className={`text-sm font-bold ${desvios?.filter(d => d?.situacao === 'EM_ABERTO').length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {desvios?.filter(d => d?.situacao === 'EM_ABERTO').length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="p-4 md:p-6">
        <Tabs defaultValue="por-funcionario" className="w-full space-y-6">
          
          <TabsList className="bg-slate-900 border border-slate-800 w-full md:w-auto h-auto p-1 grid grid-cols-1 md:grid-cols-4">
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
            <TabsTrigger value="por-funcionario" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-3 px-4 justify-start gap-2">
              <Users className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase leading-none">Por Funcionário</div>
                <div className="text-[10px] opacity-70 mt-1">Histórico Individual</div>
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

          {/* ABA 1 */}
          <TabsContent value="visao-gerencial" className="space-y-6 mt-0">
            <div className="mb-4 pb-4 border-b border-slate-800/50">
              <h2 className="text-2xl font-bold text-white">Painel de Indicadores</h2>
            </div>
            <DashboardIndicadores 
              indicadores={indicadores} 
              treinamentos={treinamentos || []}
              desvios={desvios || []} 
              loading={loading} 
              filtros={filtros} 
            />
          </TabsContent>

          {/* ABA 2 */}
          <TabsContent value="treinamentos" className="space-y-6 mt-0">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">Base de Treinamentos</h2>
              </div>
              <Button onClick={() => setTreinamentoFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
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
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : treinamentos.length === 0 ? (
              <div className="text-center py-20">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-300">Nenhum treinamento encontrado</h3>
                <Button onClick={() => setTreinamentoFormOpen(true)} variant="outline" className="mt-6">
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

          {/* ABA 3 - CORRIGIDA */}
          <TabsContent value="por-funcionario" className="space-y-6 mt-0">
            <div className="mb-4 pb-4 border-b border-slate-800/50">
              <h2 className="text-2xl font-bold text-white">Treinamentos por Funcionário</h2>
              <p className="text-slate-400 text-sm">Histórico completo de capacitações por colaborador</p>
            </div>

            <FuncionariosView 
              colaboradores={colaboradores}
              treinamentos={treinamentos}
              loading={loading}
              onNovoTreinamento={() => setTreinamentoFormOpen(true)}
            />
          </TabsContent>

          {/* ABA 4 */}
          <TabsContent value="desvios" className="space-y-6 mt-0">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">Registro de Não Conformidades</h2>
              </div>
              <Button onClick={() => setDesvioFormOpen(true)} variant="outline" className="border-orange-600/50 text-orange-400">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrar Desvio
              </Button>
            </div>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
                ) : desvios.length === 0 ? (
                  <div className="text-center py-20">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg font-medium text-slate-300">Nenhum desvio registrado</h3>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {desvios.map((desvio) => (
                      <div key={desvio.id} className="p-5 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              {getSituacaoBadge(desvio.situacao)}
                              <span className="text-xs text-slate-500">{formatarDataSimples(desvio.data_desvio)}</span>
                            </div>
                            <h4 className="text-white font-medium">{desvio.colaborador?.nome_completo || 'Colaborador'}</h4>
                            <p className="text-slate-400 text-sm mt-1">{desvio.descricao}</p>
                          </div>
                          {desvio.situacao === 'EM_ABERTO' && (
                            <Button size="sm" onClick={() => {
                              const tratamento = prompt('Descreva a ação corretiva:');
                              if (tratamento) tratarDesvio(desvio.id, new Date().toISOString().split('T')[0], tratamento);
                            }} className="bg-emerald-600 hover:bg-emerald-700">
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