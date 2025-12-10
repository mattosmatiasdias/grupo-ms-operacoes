import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Filter, Calendar, Clock, Ship, Factory, Warehouse, Building, BarChart3, Users, UserX, Menu, RefreshCw, Database, EyeOff, Loader2, LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// 1. Interfaces e Tipos
interface Navio {
  id: string;
  nome_navio: string;
  carga: string;
}

interface Equipamento {
  id: string;
  tag: string;
  motorista_operador: string;
  horas_trabalhadas: number;
  grupo_operacao: string;
  hora_inicial: string | null;
  hora_final: string | null;
}

interface Ajudante {
  id: string;
  nome: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string;
  data: string;
}

interface Ausencia {
  id: string;
  nome: string;
  justificado: boolean;
  obs: string;
  data: string;
}

interface OperacaoCompleta {
  id: string;
  op: string;
  data: string;
  created_at: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string | null;
  carga: string | null;
  navio_id: string | null;
  navios: Navio | null;
  equipamentos: Equipamento[];
  ajudantes: Ajudante[];
  ausencias: Ausencia[];
}

// 2. Funções de Utilidade
const corrigirFusoHorarioData = (dataString: string): string => {
  try {
    if (!dataString || dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dataString;
    }
    const data = new Date(dataString);
    if (isNaN(data.getTime())) {
      return dataString;
    }
    const offset = data.getTimezoneOffset();
    data.setMinutes(data.getMinutes() - offset);
    return data.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao corrigir fuso horário:', error);
    return dataString;
  }
};

const formatarDataBR = (dataString: string): string => {
  try {
    if (!dataString) return 'Data inválida';
    const data = new Date(dataString + 'T00:00:00');
    if (isNaN(data.getTime())) return dataString;
    return data.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dataString;
  }
};

const formatarHoras = (totalHoras: number): string => {
  if (totalHoras === 0) return '0h';
  return `${totalHoras.toFixed(1)}h`;
};

const getOperacaoIcon = (op: string): LucideIcon => {
  switch (op) {
    case 'NAVIO':
      return Ship;
    case 'ALBRAS':
      return Factory;
    case 'SANTOS BRASIL':
      return Warehouse;
    case 'HYDRO':
      return Building;
    default:
      return BarChart3;
  }
};

// Função para ordenar por nome em ordem alfabética
const ordenarPorNome = <T extends { nome: string }>(array: T[]): T[] => {
  return [...array].sort((a, b) => 
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
};

// Função para ordenar equipamentos por motorista_operador
const ordenarEquipamentosPorOperador = (equipamentos: Equipamento[]): Equipamento[] => {
  return [...equipamentos].sort((a, b) => 
    (a.motorista_operador || '').localeCompare((b.motorista_operador || ''), 'pt-BR', { sensitivity: 'base' })
  );
};

// 3. Custom Hook
const useTransporteData = () => {
  const { toast } = useToast();
  
  // Estado Principal
  const [operacaoSelecionada, setOperacaoSelecionada] = useState<string>('TODOS');
  const [operacaoIdSelecionado, setOperacaoIdSelecionado] = useState<string | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  
  // Estado de Filtro
  const [dataFiltro, setDataFiltro] = useState('');
  const [horaInicialFiltro, setHoraInicialFiltro] = useState('Todos');
  const [operadorFiltro, setOperadorFiltro] = useState('');

  // Estado de Filtro Aplicado
  const [filtroAplicado, setFiltroAplicado] = useState({
    data: '',
    hora: 'Todos',
    operador: '',
  });

  // Função para buscar última data de forma segura
  const buscarUltimaData = useCallback(async (): Promise<string> => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('registro_operacoes')
        .select('data')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar última data:', error);
        return hoje;
      }

      if (data?.data) {
        const dataCorrigida = corrigirFusoHorarioData(data.data);
        return dataCorrigida || hoje;
      }
      
      return hoje;
    } catch (error) {
      console.error('Erro inesperado ao buscar última data:', error);
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Inicializar dataFiltro com a data de hoje
  useEffect(() => {
    const inicializarData = async () => {
      const ultimaData = await buscarUltimaData();
      setDataFiltro(ultimaData);
      setFiltroAplicado(prev => ({ ...prev, data: ultimaData }));
    };
    inicializarData();
  }, [buscarUltimaData]);

  const fetchOperacoes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let dataParaFiltrar = filtroAplicado.data;
      
      // Se não tiver data filtro aplicada, usa a data atual
      if (!dataParaFiltrar) {
        dataParaFiltrar = new Date().toISOString().split('T')[0];
        setFiltroAplicado(prev => ({ ...prev, data: dataParaFiltrar }));
        setDataFiltro(dataParaFiltrar);
      }

      // Construir query base
      let queryOperacoes = supabase
        .from('registro_operacoes')
        .select(`
          *,
          navios (
            id,
            nome_navio,
            carga
          )
        `);

      // Aplicar filtro de data se existir
      if (dataParaFiltrar) {
        queryOperacoes = queryOperacoes.eq('data', dataParaFiltrar);
      }

      // Executar query
      const { data: operacoesData, error: operacoesError } = await queryOperacoes
        .order('data', { ascending: false })
        .order('hora_inicial', { ascending: false });

      if (operacoesError) {
        throw new Error(`Erro ao carregar operações: ${operacoesError.message}`);
      }

      // Se não houver dados, limpar e retornar
      if (!operacoesData || operacoesData.length === 0) {
        setOperacoes([]);
        setLoading(false);
        return;
      }
      
      // Corrigir fuso horário das datas
      const operacoesComFusoCorrigido = operacoesData.map(op => ({
        ...op,
        data: corrigirFusoHorarioData(op.data)
      }));

      // Buscar dados relacionados para cada operação
      const operacoesCompletas = await Promise.all(
        operacoesComFusoCorrigido.map(async (operacao) => {
          try {
            const [equipamentosResult, ajudantesResult, ausenciasResult] = await Promise.all([
              supabase.from('equipamentos').select('*').eq('registro_operacoes_id', operacao.id),
              supabase.from('ajudantes').select('*').eq('registro_operacoes_id', operacao.id),
              supabase.from('ausencias').select('*').eq('registro_operacoes_id', operacao.id)
            ]);

            // Corrigir fusos horários
            const ajudantesCorrigidos = ajudantesResult.data ? ajudantesResult.data.map(ajudante => ({
              ...ajudante,
              data: corrigirFusoHorarioData(ajudante.data)
            })) : [];

            const ausenciasCorrigidas = ausenciasResult.data ? ausenciasResult.data.map(ausencia => ({
              ...ausencia,
              data: corrigirFusoHorarioData(ausencia.data)
            })) : [];

            // Ordenar ajudantes e ausências alfabeticamente
            const ajudantesOrdenados = ordenarPorNome(ajudantesCorrigidos);
            const ausenciasOrdenadas = ordenarPorNome(ausenciasCorrigidas);
            const equipamentosOrdenados = ordenarEquipamentosPorOperador(equipamentosResult.data || []);

            return {
              ...operacao,
              equipamentos: equipamentosOrdenados,
              ajudantes: ajudantesOrdenados,
              ausencias: ausenciasOrdenadas,
            } as OperacaoCompleta;
          } catch (error) {
            console.error(`Erro ao carregar dados para operação ${operacao.id}:`, error);
            return {
              ...operacao,
              equipamentos: [],
              ajudantes: [],
              ausencias: [],
            } as OperacaoCompleta;
          }
        })
      );

      setOperacoes(operacoesCompletas);
      
    } catch (e: any) {
      console.error('Erro ao buscar operações:', e);
      setError(e.message || 'Erro desconhecido ao carregar dados');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [filtroAplicado.data, toast]);

  // Efeito para carregar dados quando o filtro aplicado muda
  useEffect(() => {
    if (filtroAplicado.data) {
      fetchOperacoes();
    }
  }, [filtroAplicado, fetchOperacoes]);

  // Funções de Ação
  const handleAtualizarDados = useCallback(async () => {
    setAtualizando(true);
    try {
      await fetchOperacoes();
      toast({
        title: "Dados atualizados",
        description: "Os dados foram atualizados com sucesso."
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setAtualizando(false);
    }
  }, [fetchOperacoes, toast]);

  const handleExecutarSQL = useCallback(async () => {
    setAtualizando(true);
    try {
      const { error } = await supabase.rpc('executar_atualizacao_horarios');
      
      if (error) {
        throw new Error(`Erro ao executar comando: ${error.message}`);
      }

      toast({
        title: "Comando executado",
        description: "O comando SQL foi executado com sucesso."
      });
      await fetchOperacoes();
    } catch (e: any) {
      console.error('Erro ao executar SQL:', e);
      toast({
        title: "Erro ao executar comando",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setAtualizando(false);
    }
  }, [fetchOperacoes, toast]);

  const aplicarFiltros = useCallback(() => {
    setFiltroAplicado({
      data: dataFiltro,
      hora: horaInicialFiltro,
      operador: operadorFiltro,
    });
  }, [dataFiltro, horaInicialFiltro, operadorFiltro]);

  const limparFiltros = useCallback(async () => {
    const ultimaData = await buscarUltimaData();
    setDataFiltro(ultimaData);
    setHoraInicialFiltro('Todos');
    setOperadorFiltro('');
    setFiltroAplicado({
      data: ultimaData,
      hora: 'Todos',
      operador: '',
    });
    setOperacaoIdSelecionado(null);
    setOperacaoSelecionada('TODOS');
  }, [buscarUltimaData]);

  // 4. Cálculos e Filtros (useMemo)
  const operacoesFiltradas = useMemo(() => {
    return operacoes.filter(op => {
      // Filtro de Hora Inicial (Turno)
      const filtroHora = filtroAplicado.hora === 'Todos' || op.hora_inicial === filtroAplicado.hora;
      
      // Filtro de Operador (Busca em equipamentos)
      const filtroOperador = !filtroAplicado.operador || 
        op.equipamentos.some(eq => 
          eq.motorista_operador?.toLowerCase().includes(filtroAplicado.operador.toLowerCase())
        );

      return filtroHora && filtroOperador;
    });
  }, [operacoes, filtroAplicado]);

  const operacoesPorTipo = useMemo(() => {
    return operacoesFiltradas.reduce((acc, op) => {
      // Para NAVIO, usar nome do navio + carga como chave
      if (op.op === 'NAVIO' && op.navios) {
        const chave = `${op.navios.nome_navio} - ${op.navios.carga}`;
        acc[chave] = acc[chave] || [];
        acc[chave].push(op);
      } else {
        // Para outros tipos, usar apenas o tipo
        acc[op.op] = acc[op.op] || [];
        acc[op.op].push(op);
      }
      return acc;
    }, {} as Record<string, OperacaoCompleta[]>);
  }, [operacoesFiltradas]);

  // 5. Retorno do Hook
  return {
    // Estado
    operacaoSelecionada,
    setOperacaoSelecionada,
    operacaoIdSelecionado,
    setOperacaoIdSelecionado,
    operacoes,
    loading,
    error,
    atualizando,
    
    // Estado de Filtro
    dataFiltro,
    setDataFiltro,
    horaInicialFiltro,
    setHoraInicialFiltro,
    operadorFiltro,
    setOperadorFiltro,
    
    // Funções de Ação
    handleAtualizarDados,
    handleExecutarSQL,
    aplicarFiltros,
    limparFiltros,
    
    // Dados Calculados
    operacoesFiltradas,
    operacoesPorTipo,
    
    // Utilidades
    formatarHoras,
    formatarDataBR,
    getOperacaoIcon,
    
    // Filtro aplicado atual
    filtroAplicado,
  };
};

// Componente HeaderControles
interface HeaderControlesProps extends ReturnType<typeof useTransporteData> {
  navigate: ReturnType<typeof useNavigate>;
  menuAberto: boolean;
  setMenuAberto: (aberto: boolean) => void;
}

const HeaderControles: React.FC<HeaderControlesProps> = ({ 
  navigate, 
  menuAberto, 
  setMenuAberto, 
  handleAtualizarDados, 
  handleExecutarSQL, 
  atualizando 
}) => {
  return (
    <div className="bg-blue-900/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-blue-300 hover:bg-blue-800/50"
              title="Voltar para Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="ml-2">Dashboard</span>
            </Button>
            <h1 className="text-2xl font-bold text-white">Relatório de Operações</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleExecutarSQL} 
              disabled={atualizando}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              title="Executar Atualização de Horários (SQL)"
            >
              {atualizando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              SQL
            </Button>
            
            <Button 
              onClick={handleAtualizarDados} 
              disabled={atualizando}
              variant="outline"
              className="border-blue-300 text-white hover:bg-white/20"
              title="Atualizar Dados"
            >
              {atualizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setMenuAberto(!menuAberto)}
              className="md:hidden border-blue-300 text-white hover:bg-white/20"
              title="Alternar Menu Lateral"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={() => navigate('/novo-lancamento')} 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Operação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente FiltrosArea
interface FiltrosAreaProps extends ReturnType<typeof useTransporteData> {}

const FiltrosArea: React.FC<FiltrosAreaProps> = ({
  dataFiltro,
  setDataFiltro,
  horaInicialFiltro,
  setHoraInicialFiltro,
  operadorFiltro,
  setOperadorFiltro,
  aplicarFiltros,
  limparFiltros,
  formatarDataBR,
}) => {
  return (
    <div className="px-6 py-4 border-b border-blue-600/30 bg-blue-800/30 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Filtro de Data */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-300" />
            <span>Data da Operação</span>
          </Label>
          <div className="flex space-x-2">
            <Input 
              type="date" 
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300 transition-colors"
            />
            <Button 
              onClick={aplicarFiltros}
              className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
              title="Buscar dados para a data selecionada"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-blue-300">
            {dataFiltro ? `Mostrando: ${formatarDataBR(dataFiltro)}` : 'Selecione uma data'}
          </p>
        </div>
        
        {/* Filtro de Turno */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-300" />
            <span>Turno</span>
          </Label>
          <Select value={horaInicialFiltro} onValueChange={setHoraInicialFiltro}>
            <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
              <SelectValue placeholder="Todos os turnos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Turnos</SelectItem>
              <SelectItem value="07:00:00">Manhã (07:00)</SelectItem>
              <SelectItem value="19:00:00">Noite (19:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filtro de Operador */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white flex items-center space-x-2">
            <Search className="h-4 w-4 text-blue-300" />
            <span>Operador</span>
          </Label>
          <Input 
            type="text"
            value={operadorFiltro}
            onChange={(e) => setOperadorFiltro(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300 transition-colors"
          />
        </div>
        
        {/* Botão Aplicar Filtros */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white opacity-0">Ações</Label>
          <Button 
            onClick={aplicarFiltros}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium"
          >
            <Filter className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>
        </div>

        {/* Botão Limpar Filtros */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white opacity-0">Limpar</Label>
          <Button 
            onClick={limparFiltros}
            className="w-full h-10 bg-gray-600 hover:bg-gray-700 text-white font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente ResumoCards
interface ResumoCardsProps {
  operacoesFiltradas: OperacaoCompleta[];
  setOperacaoSelecionada: (op: string) => void;
  setOperacaoIdSelecionado: (id: string | null) => void;
  loading: boolean;
}

const ResumoCards: React.FC<ResumoCardsProps> = ({
  operacoesFiltradas,
  setOperacaoSelecionada,
  setOperacaoIdSelecionado,
  loading,
}) => {
  const tiposOperacao = ['HYDRO', 'ALBRAS', 'SANTOS BRASIL'];
  
  const formatarHoras = (totalHoras: number): string => {
    if (totalHoras === 0) return '0h';
    return `${totalHoras.toFixed(1)}h`;
  };

  const getOperacaoIcon = (op: string): LucideIcon => {
    switch (op) {
      case 'ALBRAS':
        return Factory;
      case 'SANTOS BRASIL':
        return Warehouse;
      case 'HYDRO':
        return Building;
      default:
        return BarChart3;
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-blue-300/20 rounded animate-pulse"></div>
                    <div className="h-6 w-8 bg-blue-300/20 rounded animate-pulse"></div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <div className="h-6 w-6 bg-blue-300/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calcular totais para cada tipo
  const totaisPorTipo = tiposOperacao.reduce((acc, tipo) => {
    const opsDoTipo = operacoesFiltradas.filter(op => op.op === tipo);
    const count = opsDoTipo.length;
    const totalHoras = opsDoTipo.reduce((sum, operacao) => 
      sum + operacao.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
    );
    
    // Para NAVIO, calcular separadamente
    const naviosOps = operacoesFiltradas.filter(op => op.op === 'NAVIO');
    const naviosCount = naviosOps.length;
    const naviosTotalHoras = naviosOps.reduce((sum, operacao) => 
      sum + operacao.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
    );

    acc[tipo] = { count, totalHoras };
    acc['NAVIO'] = { count: naviosCount, totalHoras: naviosTotalHoras };
    
    return acc;
  }, {} as Record<string, { count: number, totalHoras: number }>);

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card NAVIO */}
        <Card 
          className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          onClick={() => {
            setOperacaoSelecionada('NAVIO');
            setOperacaoIdSelecionado(null);
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">NAVIO</p>
                <p className="text-2xl font-bold text-white">{totaisPorTipo['NAVIO']?.count || 0}</p>
                <p className="text-xs text-blue-300">
                  {totaisPorTipo['NAVIO']?.count || 0} ops • {formatarHoras(totaisPorTipo['NAVIO']?.totalHoras || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Ship className="h-6 w-6 text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards dos outros tipos */}
        {tiposOperacao.map((op) => {
          const Icon = getOperacaoIcon(op);
          const { count = 0, totalHoras = 0 } = totaisPorTipo[op] || {};
          const label = `${count} ops • ${formatarHoras(totalHoras)}`;
          
          return (
            <Card 
              key={op} 
              className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              onClick={() => {
                setOperacaoSelecionada(op);
                setOperacaoIdSelecionado(null);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-200">{op}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-blue-300">{label}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <Icon className="h-6 w-6 text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Componente TabelaOperacao
interface TabelaOperacaoProps {
  operacao: OperacaoCompleta | null;
  formatarDataBR: (data: string) => string;
  formatarHoras: (horas: number) => string;
}

const TabelaOperacao: React.FC<TabelaOperacaoProps> = ({ 
  operacao, 
  formatarDataBR, 
  formatarHoras 
}) => {
  const navigate = useNavigate();
  
  if (!operacao) {
    return (
      <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white">Selecione uma operação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-300">Clique em uma operação no menu lateral para ver os detalhes.</p>
        </CardContent>
      </Card>
    );
  }

  const totalHoras = operacao.equipamentos.reduce((sum, eq) => 
    sum + (Number(eq.horas_trabalhadas) || 0), 0
  );

  const displayName = operacao.op === 'NAVIO' && operacao.navios 
    ? `${operacao.navios.nome_navio} - ${operacao.navios.carga}`
    : operacao.op;

  // Agrupar equipamentos por grupo_operacao e ordenar alfabeticamente dentro de cada grupo
  const equipamentosPorGrupo = operacao.equipamentos.reduce((acc, eq) => {
    const grupo = eq.grupo_operacao || 'Sem grupo';
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    acc[grupo].push(eq);
    return acc;
  }, {} as Record<string, Equipamento[]>);

  // Ordenar equipamentos dentro de cada grupo por motorista_operador
  Object.keys(equipamentosPorGrupo).forEach(grupo => {
    equipamentosPorGrupo[grupo] = equipamentosPorGrupo[grupo].sort((a, b) => 
      (a.motorista_operador || '').localeCompare((b.motorista_operador || ''), 'pt-BR', { sensitivity: 'base' })
    );
  });

  return (
    <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <CardTitle className="text-white text-lg truncate">{displayName}</CardTitle>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <p className="text-xs text-blue-300">Data</p>
                <p className="text-sm font-medium text-white">{formatarDataBR(operacao.data)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-300">Início</p>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                  {operacao.hora_inicial}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-blue-300">Final</p>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30 text-xs">
                  {operacao.hora_final}
                </Badge>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div>
                <p className="text-xs text-blue-300">Total de Horas</p>
                <p className="text-lg font-bold text-green-300">{formatarHoras(totalHoras)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-300">Total Equipamentos</p>
                <p className="text-lg font-bold text-white">{operacao.equipamentos.length}</p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate(`/operacao/${operacao.id}/visualizar`)}
                className="text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30"
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
            </div>
            {operacao.observacao && (
              <div className="mt-2">
                <p className="text-xs text-blue-300">Observações</p>
                <p className="text-sm text-white">{operacao.observacao}</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
        <div className="mt-4 flex-1 min-h-0">
          <h4 className="text-sm font-semibold text-blue-200 mb-2">
            Equipamentos por Grupo de Operação ({operacao.equipamentos.length})
          </h4>
          {operacao.equipamentos.length === 0 ? (
            <p className="text-sm text-blue-300">Nenhum equipamento registrado</p>
          ) : (
            <div className="overflow-auto h-full">
              {Object.entries(equipamentosPorGrupo).map(([grupo, equipamentos]) => {
                const horasGrupo = equipamentos.reduce((sum, eq) => sum + (Number(eq.horas_trabalhadas) || 0), 0);
                
                return (
                  <div key={grupo} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-2 p-2 bg-blue-600/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-500/30 text-blue-200 border-blue-300/50">
                          {grupo}
                        </Badge>
                        <span className="text-xs text-blue-300">
                          {equipamentos.length} equipamento{equipamentos.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 text-xs">
                        {formatarHoras(horasGrupo)}
                      </Badge>
                    </div>
                    
                    <div className="border border-blue-200/20 rounded-lg overflow-hidden mb-4">
                      <Table>
                        <TableHeader className="bg-blue-600/20">
                          <TableRow>
                            <TableHead className="text-blue-200 text-xs py-2 w-1/4">Tag</TableHead>
                            <TableHead className="text-blue-200 text-xs py-2 w-1/2">Motorista/Operador</TableHead>
                            <TableHead className="text-blue-200 text-xs py-2 w-1/4 text-right">Horas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipamentos.map((eq) => (
                            <TableRow key={eq.id} className="hover:bg-white/5 border-b border-blue-200/10 last:border-b-0">
                              <TableCell className="py-2">
                                <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-300/30 text-xs whitespace-nowrap">
                                  {eq.tag}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2">
                                <p className="text-sm text-white">{eq.motorista_operador}</p>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                                  {Number(eq.horas_trabalhadas).toFixed(1)}h
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente TabelaAjudantes
interface TabelaAjudantesProps {
  ajudantes: Ajudante[];
}

const TabelaAjudantes: React.FC<TabelaAjudantesProps> = ({ ajudantes }) => {
  // Ordenar ajudantes alfabeticamente
  const ajudantesOrdenados = useMemo(() => {
    return ordenarPorNome(ajudantes);
  }, [ajudantes]);

  if (ajudantesOrdenados.length === 0) {
    return (
      <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white">Ajudantes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-300">Nenhum ajudante registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white">Ajudantes ({ajudantesOrdenados.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0">
        <div className="overflow-auto h-full border border-blue-200/20 rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-blue-600/20 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="text-blue-200 text-xs py-3 w-2/3">Nome</TableHead>
                <TableHead className="text-blue-200 text-xs py-3 w-1/6">Início</TableHead>
                <TableHead className="text-blue-200 text-xs py-3 w-1/6">Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajudantesOrdenados.map((ajudante) => (
                <TableRow key={ajudante.id} className="hover:bg-white/5 border-b border-blue-200/10">
                  <TableCell className="py-3">
                    <p className="text-sm text-white truncate">{ajudante.nome}</p>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs whitespace-nowrap">
                      {ajudante.hora_inicial}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30 text-xs whitespace-nowrap">
                      {ajudante.hora_final}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente TabelaAusencias
interface TabelaAusenciasProps {
  ausencias: Ausencia[];
}

const TabelaAusencias: React.FC<TabelaAusenciasProps> = ({ ausencias }) => {
  // Ordenar ausências alfabeticamente
  const ausenciasOrdenadas = useMemo(() => {
    return ordenarPorNome(ausencias);
  }, [ausencias]);

  if (ausenciasOrdenadas.length === 0) {
    return (
      <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white">Ausências</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-300">Nenhuma ausência registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-white/10 backdrop-blur-sm border-blue-200/30 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white">Ausências ({ausenciasOrdenadas.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0">
        <div className="overflow-auto h-full border border-blue-200/20 rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-blue-600/20 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="text-blue-200 text-xs py-3 w-2/3">Nome</TableHead>
                <TableHead className="text-blue-200 text-xs py-3 w-1/6">Status</TableHead>
                <TableHead className="text-blue-200 text-xs py-3 w-1/6">Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ausenciasOrdenadas.map((ausencia) => (
                <TableRow key={ausencia.id} className="hover:bg-white/5 border-b border-blue-200/10">
                  <TableCell className="py-3">
                    <p className="text-sm text-white truncate">{ausencia.nome}</p>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant={ausencia.justificado ? "default" : "destructive"} 
                      className={ausencia.justificado 
                        ? "bg-green-500/20 text-green-300 border-green-300/30 text-xs whitespace-nowrap" 
                        : "bg-red-500/20 text-red-300 border-red-300/30 text-xs whitespace-nowrap"}>
                      {ausencia.justificado ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="text-xs text-blue-300 truncate">
                      {ausencia.obs || '-'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente Principal (RelatorioTransporte)
const RelatorioTransporte = () => {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(true);
  
  const {
    operacaoSelecionada,
    setOperacaoSelecionada,
    operacaoIdSelecionado,
    setOperacaoIdSelecionado,
    loading,
    error,
    operacoesFiltradas,
    operacoesPorTipo,
    formatarDataBR,
    getOperacaoIcon,
    dataFiltro,
    filtroAplicado,
    ...hookProps
  } = useTransporteData();

  // Encontra a operação selecionada
  const operacaoAtual = useMemo(() => {
    if (operacaoIdSelecionado) {
      return operacoesFiltradas.find(op => op.id === operacaoIdSelecionado) || null;
    }
    return null;
  }, [operacoesFiltradas, operacaoIdSelecionado]);

  const formatarHoras = useCallback((totalHoras: number): string => {
    if (totalHoras === 0) return '0h';
    return `${totalHoras.toFixed(1)}h`;
  }, []);

  const renderConteudoPrincipal = () => {
    if (loading && operacoesFiltradas.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full min-h-[400px] text-white">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Carregando dados...</p>
          <p className="text-sm text-blue-300 mt-2">Buscando operações para {formatarDataBR(dataFiltro)}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="space-y-3">
            <div className="h-12 w-12 text-red-400 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.282 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white">Erro ao carregar dados</p>
            <p className="text-red-400">{error}</p>
            <Button 
              onClick={hookProps.handleAtualizarDados}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    if (operacoesFiltradas.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="space-y-3">
            <Search className="h-12 w-12 text-blue-300/50 mx-auto" />
            <p className="text-lg font-medium text-white">Nenhuma operação encontrada</p>
            <p className="text-blue-300">
              Não há dados para os filtros aplicados em {formatarDataBR(dataFiltro)}
            </p>
            <Button 
              variant="outline"
              onClick={() => navigate('/novo-lancamento')}
              className="mt-4 text-blue-300 border-blue-300 hover:bg-blue-500/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Nova Operação
            </Button>
          </div>
        </div>
      );
    }

    if (!operacaoAtual && operacaoIdSelecionado) {
      return (
        <div className="text-center py-12">
          <div className="space-y-3">
            <UserX className="h-12 w-12 text-blue-300/50 mx-auto" />
            <p className="text-lg font-medium text-white">Operação não encontrada</p>
            <p className="text-blue-300">
              A operação selecionada pode ter sido removida ou não existe mais.
            </p>
            <Button 
              variant="outline"
              onClick={() => setOperacaoIdSelecionado(null)}
              className="mt-4 text-blue-300 border-blue-300 hover:bg-blue-500/20"
            >
              Voltar para lista
            </Button>
          </div>
        </div>
      );
    }

    // Layout com 2 colunas: Coluna 1 (operacao) e Coluna 2 (ajudantes + ausências)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1: Tabela da Operação */}
        <div className="lg:col-span-2">
          <TabelaOperacao 
            operacao={operacaoAtual}
            formatarDataBR={formatarDataBR}
            formatarHoras={formatarHoras}
          />
        </div>

        {/* Coluna 2: Ajudantes e Ausências em coluna vertical */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Ajudantes acima */}
          <div className="flex-1">
            <TabelaAjudantes 
              ajudantes={operacaoAtual?.ajudantes || []}
            />
          </div>
          
          {/* Ausências abaixo */}
          <div className="flex-1">
            <TabelaAusencias 
              ausencias={operacaoAtual?.ausencias || []}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-auto">
      {/* Header e Controles */}
      <HeaderControles 
        navigate={navigate}
        menuAberto={menuAberto}
        setMenuAberto={setMenuAberto}
        {...hookProps}
      />

      {/* Filtros */}
      <FiltrosArea 
        dataFiltro={dataFiltro}
        setDataFiltro={hookProps.setDataFiltro}
        horaInicialFiltro={hookProps.horaInicialFiltro}
        setHoraInicialFiltro={hookProps.setHoraInicialFiltro}
        operadorFiltro={hookProps.operadorFiltro}
        setOperadorFiltro={hookProps.setOperadorFiltro}
        aplicarFiltros={hookProps.aplicarFiltros}
        limparFiltros={hookProps.limparFiltros}
        formatarDataBR={formatarDataBR}
      />

      {/* Cards de Resumo */}
      <ResumoCards 
        operacoesFiltradas={operacoesFiltradas}
        setOperacaoSelecionada={setOperacaoSelecionada}
        setOperacaoIdSelecionado={setOperacaoIdSelecionado}
        loading={loading}
      />

      {/* Conteúdo Principal */}
      <div className="flex px-6 pb-6 gap-6 min-h-[600px]">
        {/* Menu Lateral */}
        <div className={`${menuAberto ? 'w-80' : 'w-0'} transition-all duration-300 flex-shrink-0 ${!menuAberto && 'overflow-hidden'}`}>
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                <span>Operações</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                    {operacoesFiltradas.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMenuAberto(false)}
                    className="md:hidden text-white hover:bg-white/20"
                  >
                    ×
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 h-[calc(100vh-450px)] overflow-y-auto">
                {/* Item Todos */}
                <button
                  onClick={() => {
                    setOperacaoSelecionada('TODOS');
                    setOperacaoIdSelecionado(null);
                  }}
                  className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                    operacaoSelecionada === 'TODOS' && !operacaoIdSelecionado
                      ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                      : 'border-transparent text-blue-200 hover:border-blue-200/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5" />
                      <span className="font-medium">TODAS OPERAÇÕES</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                      {operacoesFiltradas.length}
                    </Badge>
                  </div>
                </button>

                {/* Operações por Tipo (visão agrupada) */}
                {Object.entries(operacoesPorTipo).map(([tipo, ops]) => {
                  const Icon = getOperacaoIcon(tipo.startsWith('NAVIO') ? 'NAVIO' : tipo);
                  const totalHoras = ops.reduce((sum, op) => 
                    sum + op.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
                  );
                  
                  return (
                    <div key={tipo}>
                      {/* Cabeçalho do tipo */}
                      <button
                        onClick={() => {
                          setOperacaoSelecionada(tipo);
                          setOperacaoIdSelecionado(null);
                        }}
                        className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                          operacaoSelecionada === tipo && !operacaoIdSelecionado
                            ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                            : 'border-transparent text-blue-200 hover:border-blue-200/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium truncate">{tipo}</span>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 mb-1">
                              {ops.length}
                            </Badge>
                            <p className="text-xs text-blue-300">{formatarHoras(totalHoras)}</p>
                          </div>
                        </div>
                      </button>

                      {/* Lista de operações individuais */}
                      {operacaoSelecionada === tipo && (
                        <div className="ml-4 space-y-1 border-l border-blue-300/20">
                          {ops.map((op) => {
                            const opTotalHoras = op.equipamentos.reduce((sum, eq) => 
                              sum + (Number(eq.horas_trabalhadas) || 0), 0
                            );
                            
                            const displayName = op.op === 'NAVIO' && op.navios 
                              ? `${formatarDataBR(op.data)} • ${op.hora_inicial}`
                              : `${formatarDataBR(op.data)} • ${op.hora_inicial}`;
                            
                            return (
                              <button
                                key={op.id}
                                onClick={() => {
                                  setOperacaoIdSelecionado(op.id);
                                }}
                                className={`w-full text-left p-3 hover:bg-white/5 transition-all ${
                                  operacaoIdSelecionado === op.id
                                    ? 'bg-blue-400/20 text-white' 
                                    : 'text-blue-200'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="truncate max-w-[180px]">
                                    <p className="text-sm font-medium truncate">
                                      {displayName}
                                    </p>
                                    {op.op !== 'NAVIO' && op.equipamentos.length > 0 && (
                                      <p className="text-xs text-blue-300 truncate">
                                        {op.equipamentos[0]?.grupo_operacao || 'Sem grupo'}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className="bg-green-500/20 text-green-300 text-xs">
                                    {formatarHoras(opTotalHoras)}
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área de Visualização Principal */}
        <div className="flex-1 overflow-hidden">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">
                {operacaoIdSelecionado 
                  ? `Operação ${operacaoAtual ? (operacaoAtual.op === 'NAVIO' && operacaoAtual.navios 
                    ? `${operacaoAtual.navios.nome_navio} - ${operacaoAtual.navios.carga}`
                    : operacaoAtual.op) : ''}`
                  : operacaoSelecionada === 'TODOS' 
                    ? 'Todas as Operações' 
                    : `Operações - ${operacaoSelecionada}`}
              </CardTitle>
              <p className="text-sm text-blue-300">
                {dataFiltro ? `Dados de ${formatarDataBR(dataFiltro)}` : 'Selecione uma data para filtrar'}
                {operacaoIdSelecionado && operacaoAtual && (
                  <span className="ml-2">
                    • {formatarDataBR(operacaoAtual.data)} • {operacaoAtual.hora_inicial} - {operacaoAtual.hora_final}
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="p-6 min-h-[500px]">
              {renderConteudoPrincipal()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RelatorioTransporte;