// src/pages/MasterDrive.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Clock,
  BookOpen,
  Filter
} from 'lucide-react';
import { useMasterDrive } from '@/hooks/useMasterDrive';
import { FiltrosMasterDrive } from '@/components/master-drive/FiltrosMasterDrive';
import { DashboardIndicadores } from '@/components/master-drive/DashboardIndicadores';
import { TreinamentoForm } from '@/components/master-drive/TreinamentoForm';
import { TreinamentoCard } from '@/components/master-drive/TreinamentoCard';
import { TreinamentoDetalhesModal } from '@/components/master-drive/TreinamentoDetalhesModal';
import { DesvioForm } from '@/components/master-drive/DesvioForm';
import { RelatorioGeral } from '@/components/master-drive/RelatorioGeral';

// Função para converter interval do PostgreSQL para horas decimais
const converterIntervalParaHoras = (interval: any): number => {
  if (!interval) return 0;
  if (typeof interval === 'number') return interval;
  if (typeof interval === 'string') {
    // Formato HH:MM:SS
    const match = interval.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = parseInt(match[2]);
      return horas + (minutos / 60);
    }
    // Tenta extrair número direto
    const num = parseFloat(interval);
    if (!isNaN(num)) return num;
  }
  return 0;
};

const formatarCargaHoraria = (horas: number): string => {
  if (horas === 0) return '';
  if (horas < 1) {
    const minutos = Math.round(horas * 60);
    return `${minutos}min`;
  }
  if (horas === Math.floor(horas)) {
    return `${horas}h`;
  }
  return `${horas.toFixed(1)}h`;
};

// Componente de visualização de funcionários
const FuncionariosView = ({ 
  colaboradores, 
  treinamentos, 
  tiposTreinamento,
  loading, 
  onNovoTreinamento 
}: any) => {
  const [searchFuncionario, setSearchFuncionario] = useState('');
  const [filtroTopico, setFiltroTopico] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
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
    const statusStr = status || 'CONCLUIDO';
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

  // Extrair tópicos únicos dos treinamentos
  const topicosDisponiveis = useMemo(() => {
    const topicos = new Set<string>();
    
    if (treinamentos && Array.isArray(treinamentos)) {
      treinamentos.forEach((treino: any) => {
        const topico = treino.topico_treinamento;
        if (topico && typeof topico === 'string' && topico.trim() !== '') {
          topicos.add(topico.trim());
        }
      });
    }
    
    return Array.from(topicos).sort();
  }, [treinamentos]);

  // Limpar filtros
  const limparFiltros = () => {
    setSearchFuncionario('');
    setFiltroTopico('todos');
    setFiltroTipo('todos');
  };

  useEffect(() => {
    try {
      setErroLocal(null);
      
      if (!colaboradores || !Array.isArray(colaboradores) || colaboradores.length === 0) {
        setDadosProcessados([]);
        return;
      }
      
      if (!treinamentos || !Array.isArray(treinamentos) || treinamentos.length === 0) {
        setDadosProcessados([]);
        return;
      }

      const mapa = new Map();
      
      // Inicializar colaboradores
      colaboradores.forEach(colab => {
        if (colab && colab.id) {
          mapa.set(colab.id, {
            id: colab.id,
            nome: colab.nome_completo || colab.nome || 'Nome não informado',
            cargo: colab.funcao_atual || colab.cargo || '',
            departamento: colab.departamento || '',
            cargaHorariaTotal: 0,
            treinamentos: [] as any[],
            treinamentosIds: new Set()
          });
        }
      });
      
      // Processar treinamentos
      treinamentos.forEach(treino => {
        if (!treino) return;
        
        const topicoTreino = treino.topico_treinamento || '';
        const tipoTreino = treino.tipo_treinamento?.nome || '';
        const cargaHoraria = converterIntervalParaHoras(treino.carga_horaria_base || treino.carga_horaria_total);
        
        // Aplicar filtros
        if (filtroTopico !== 'todos' && topicoTreino !== filtroTopico) return;
        if (filtroTipo !== 'todos' && tipoTreino !== filtroTipo) return;
        
        const participantes = treino.participantes || [];
        
        participantes.forEach((participante: any) => {
          if (!participante) return;
          
          const colabId = participante.id;
          if (!colabId || !mapa.has(colabId)) return;
          
          const colaboradorData = mapa.get(colabId);
          const treinamentoId = treino.id;
          
          if (colaboradorData.treinamentosIds.has(treinamentoId)) return;
          
          const treinamentoInfo = {
            id: treinamentoId,
            nome: treino.topico_treinamento || `Treinamento ${treino.id.substring(0, 8)}`,
            topico: topicoTreino,
            tipo: tipoTreino,
            descricao: treino.observacoes || '',
            data: treino.data_treinamento,
            cargaHoraria: cargaHoraria,
            status: 'CONCLUIDO',
            dataConclusao: null,
            nota: ''
          };
          
          colaboradorData.treinamentos.push(treinamentoInfo);
          colaboradorData.treinamentosIds.add(treinamentoId);
          colaboradorData.cargaHorariaTotal += cargaHoraria;
        });
      });
      
      let resultados = Array.from(mapa.values())
        .filter(item => item.treinamentos.length > 0)
        .map(({ treinamentosIds, ...rest }) => rest);
      
      if (searchFuncionario.trim()) {
        const search = searchFuncionario.toLowerCase();
        resultados = resultados.filter(item => 
          item.nome.toLowerCase().includes(search) ||
          item.cargo.toLowerCase().includes(search)
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
  }, [colaboradores, treinamentos, searchFuncionario, filtroTopico, filtroTipo]);

  if (erroLocal) {
    return (
      <div className="text-center py-20 bg-red-900/20 rounded-xl border border-red-700/50 p-8">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">Erro ao Carregar Dados</h3>
        <p className="text-slate-400">{erroLocal}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6">Recarregar</Button>
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

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Funcionário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Nome, cargo ou departamento..."
                  value={searchFuncionario}
                  onChange={(e) => setSearchFuncionario(e.target.value)}
                  className="pl-9 h-9 bg-slate-950 border-slate-700 text-white text-sm"
                />
                {searchFuncionario && (
                  <button onClick={() => setSearchFuncionario('')} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <XCircle className="h-4 w-4 text-slate-500 hover:text-slate-300" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Tópico</Label>
              <Select value={filtroTopico} onValueChange={setFiltroTopico}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-white text-sm">
                  <SelectValue placeholder="Todos os tópicos" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                  <SelectItem value="todos">Todos os tópicos</SelectItem>
                  {topicosDisponiveis.map((topico) => (
                    <SelectItem key={topico} value={topico}>{topico}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-white text-sm">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposTreinamento?.map((tipo: any) => (
                    <SelectItem key={tipo.id} value={tipo.nome}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={limparFiltros} variant="outline" className="h-9 w-full border-slate-700 text-slate-400 hover:text-white">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {dadosProcessados.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl">
          <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300">
            {searchFuncionario || filtroTopico !== 'todos' || filtroTipo !== 'todos' 
              ? 'Nenhum funcionário encontrado' 
              : 'Nenhum treinamento registrado'}
          </h3>
          <p className="text-slate-500 mt-2">
            {searchFuncionario || filtroTopico !== 'todos' || filtroTipo !== 'todos'
              ? 'Tente outros filtros'
              : 'Cadastre treinamentos para visualizar o histórico.'}
          </p>
        </div>
      ) : (
        dadosProcessados.map((colab) => {
          const isExpanded = expandedCards.has(colab.id);
          
          return (
            <Card key={colab.id} className="bg-slate-900/40 border-slate-800 overflow-hidden">
              <div 
                className="cursor-pointer hover:bg-slate-800/30 transition-colors p-5"
                onClick={() => toggleCard(colab.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-purple-500/20 rounded-xl">
                      <User className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{colab.nome}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {colab.cargo && colab.cargo !== '' && (
                          <span className="text-xs text-slate-400">📋 {colab.cargo}</span>
                        )}
                        <span className="text-xs text-purple-400">🎓 {colab.treinamentos.length} treinamento(s)</span>
                        {colab.cargaHorariaTotal > 0 ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatarCargaHoraria(colab.cargaHorariaTotal)} total
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">⏱️ Sem horas registradas</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              
              {isExpanded && (
                <CardContent className="pt-0 pb-5 px-5">
                  <div className="space-y-3">
                    {colab.treinamentos.map((treino: any, idx: number) => (
                      <div key={`${colab.id}_${idx}`} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-purple-400" />
                              {treino.nome}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {treino.topico && treino.topico !== '' ? (
                                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[9px] h-5 flex items-center gap-1">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  {treino.topico}
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-700/30 text-slate-500 border-slate-600 text-[9px] h-5 flex items-center gap-1">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  Sem tópico
                                </Badge>
                              )}
                              {treino.tipo && treino.tipo !== '' && (
                                <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-[9px] h-5">
                                  {treino.tipo}
                                </Badge>
                              )}
                              {treino.cargaHoraria > 0 && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] h-5 flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatarCargaHoraria(treino.cargaHoraria)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(treino.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">Realização: {formatarData(treino.data)}</span>
                          </div>
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
        })
      )}
    </div>
  );
};

// Componente principal
export default function MasterDrive() {
  const navigate = useNavigate();
  
  const {
    loading = false,
    colaboradores = [],
    tiposTreinamento = [],
    treinamentos = [],
    colaboradoresTreinados = [],
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-indigo-400" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Master Drive</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Gestão de competências e indicadores de performance</p>
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
        <Tabs defaultValue="visao-gerencial" className="w-full space-y-6">
          
          <TabsList className="bg-slate-900 border border-slate-800 w-full md:w-auto h-auto p-1 grid grid-cols-1 md:grid-cols-5">
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
            <TabsTrigger value="relatorio-geral" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white py-3 px-4 justify-start gap-2">
              <FileText className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase leading-none">Relatório Geral</div>
                <div className="text-[10px] opacity-70 mt-1">Análise Completa</div>
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

          {/* ABA 1: Visão Executiva */}
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

          {/* ABA 2: Gestão de Treinamentos */}
          <TabsContent value="treinamentos" className="space-y-6 mt-0">
            <div className="flex justify-between items-center mb-2">
              <div><h2 className="text-xl font-bold text-white">Base de Treinamentos</h2></div>
              <Button onClick={() => setTreinamentoFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Novo Treinamento
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
                  <Plus className="h-4 w-4 mr-2" /> Registrar Primeiro Treinamento
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

          {/* ABA 3 - Por Funcionário */}
          <TabsContent value="por-funcionario" className="space-y-6 mt-0">
            <div className="mb-4 pb-4 border-b border-slate-800/50">
              <h2 className="text-2xl font-bold text-white">Treinamentos por Funcionário</h2>
              <p className="text-slate-400 text-sm">Histórico completo de capacitações por colaborador</p>
            </div>

            <FuncionariosView 
              colaboradores={colaboradores}
              treinamentos={treinamentos}
              tiposTreinamento={tiposTreinamento}
              loading={loading}
              onNovoTreinamento={() => setTreinamentoFormOpen(true)}
            />
          </TabsContent>

          {/* ABA 4 - Relatório Geral */}
          <TabsContent value="relatorio-geral" className="space-y-6 mt-0">
            <RelatorioGeral 
              treinamentos={treinamentos || []}
              colaboradoresTreinados={colaboradoresTreinados || []}
              colaboradores={colaboradores || []}
              anoReferencia={2026}
            />
          </TabsContent>

          {/* ABA 5: Gestão de Desvios */}
          <TabsContent value="desvios" className="space-y-6 mt-0">
            <div className="flex justify-between items-center mb-2">
              <div><h2 className="text-xl font-bold text-white">Registro de Não Conformidades</h2></div>
              <Button onClick={() => setDesvioFormOpen(true)} variant="outline" className="border-orange-600/50 text-orange-400">
                <AlertTriangle className="h-4 w-4 mr-2" /> Registrar Desvio
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
                              <CheckCircle className="h-4 w-4 mr-2" /> Tratar
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