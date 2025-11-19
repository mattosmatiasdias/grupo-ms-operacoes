import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Filter, Calendar, Clock, Ship, Factory, Warehouse, Building, BarChart3, Users, UserX, Menu, RefreshCw, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  navios: {
    id: string;
    nome_navio: string;
    carga: string;
  } | null;
  equipamentos: Array<{
    id: string;
    tag: string;
    motorista_operador: string;
    horas_trabalhadas: number;
    grupo_operacao: string;
    hora_inicial: string | null;
    hora_final: string | null;
  }>;
  ajudantes: Array<{
    id: string;
    nome: string;
    hora_inicial: string;
    hora_final: string;
    observacao: string;
    data: string;
  }>;
  ausencias: Array<{
    id: string;
    nome: string;
    justificado: boolean;
    obs: string;
    data: string;
  }>;
}

const RelatorioTransporte = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [operacaoSelecionada, setOperacaoSelecionada] = useState<string>('TODOS');
  const [operacoes, setOperacoes] = useState<OperacaoCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  
  const [dataFiltro, setDataFiltro] = useState('');
  const [horaInicialFiltro, setHoraInicialFiltro] = useState('Todos');
  const [operadorFiltro, setOperadorFiltro] = useState('');

  // Função para corrigir o fuso horário - converte para o fuso local
  const corrigirFusoHorarioData = (dataString: string) => {
    try {
      // Se a data já está no formato YYYY-MM-DD, apenas retorna
      if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dataString;
      }
      
      // Se vem como string completa, extrai a parte da data
      const data = new Date(dataString);
      
      // Corrige o fuso horário adicionando o offset
      const offset = data.getTimezoneOffset();
      data.setMinutes(data.getMinutes() - offset);
      
      return data.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao corrigir fuso horário:', error);
      return dataString;
    }
  };

  // Função para formatar data no formato brasileiro
  const formatarDataBR = (dataString: string) => {
    try {
      const data = new Date(dataString + 'T00:00:00'); // Adiciona horário para evitar problemas de fuso
      return data.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dataString;
    }
  };

  // Buscar a última data disponível no banco de dados
  const buscarUltimaData = async () => {
    try {
      const { data, error } = await supabase
        .from('registro_operacoes')
        .select('data')
        .order('data', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data?.data) {
        // Corrige o fuso horário da data vinda do banco
        return corrigirFusoHorarioData(data.data);
      }
      
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao buscar última data:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  const fetchOperacoes = async (dataEspecifica?: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Iniciando carregamento de operações...');
      
      // Determinar qual data usar para o filtro
      let dataParaFiltrar = dataEspecifica || dataFiltro;
      if (!dataParaFiltrar) {
        dataParaFiltrar = await buscarUltimaData();
        setDataFiltro(dataParaFiltrar);
      }

      console.log('📅 Data para filtrar (corrigida):', dataParaFiltrar);

      // Primeiro, buscar as operações principais
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

      // Aplicar filtro de data diretamente na consulta
      if (dataParaFiltrar) {
        console.log('📅 Aplicando filtro de data na consulta:', dataParaFiltrar);
        queryOperacoes = queryOperacoes.eq('data', dataParaFiltrar);
      }

      const { data: operacoesData, error: operacoesError } = await queryOperacoes
        .order('data', { ascending: false })
        .order('hora_inicial', { ascending: false });

      if (operacoesError) {
        console.error('❌ Erro ao carregar operações:', operacoesError);
        throw new Error(`Erro ao carregar operações: ${operacoesError.message}`);
      }

      if (!operacoesData || operacoesData.length === 0) {
        console.log('📭 Nenhuma operação encontrada para a data:', dataParaFiltrar);
        setOperacoes([]);
        setLoading(false);
        return;
      }

      console.log('✅ Operações carregadas:', operacoesData.length);
      
      // Corrigir fusos horários das datas
      const operacoesComFusoCorrigido = operacoesData.map(op => ({
        ...op,
        data: corrigirFusoHorarioData(op.data)
      }));

      console.log('📊 Datas das operações (corrigidas):', operacoesComFusoCorrigido.map(op => ({ id: op.id, data: op.data, op: op.op })));

      // Buscar dados relacionados para cada operação
      const operacoesCompletas = await Promise.all(
        operacoesComFusoCorrigido.map(async (operacao) => {
          try {
            // Buscar equipamentos
            const { data: equipamentos, error: equipamentosError } = await supabase
              .from('equipamentos')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            if (equipamentosError) {
              console.error(`❌ Erro ao carregar equipamentos para operação ${operacao.id}:`, equipamentosError);
            }

            // Buscar ajudantes e corrigir fusos horários
            const { data: ajudantes, error: ajudantesError } = await supabase
              .from('ajudantes')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            let ajudantesCorrigidos = [];
            if (ajudantes) {
              ajudantesCorrigidos = ajudantes.map(ajudante => ({
                ...ajudante,
                data: corrigirFusoHorarioData(ajudante.data)
              }));
            }

            if (ajudantesError) {
              console.error(`❌ Erro ao carregar ajudantes para operação ${operacao.id}:`, ajudantesError);
            }

            // Buscar ausências e corrigir fusos horários
            const { data: ausencias, error: ausenciasError } = await supabase
              .from('ausencias')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            let ausenciasCorrigidas = [];
            if (ausencias) {
              ausenciasCorrigidas = ausencias.map(ausencia => ({
                ...ausencia,
                data: corrigirFusoHorarioData(ausencia.data)
              }));
            }

            if (ausenciasError) {
              console.error(`❌ Erro ao carregar ausências para operação ${operacao.id}:`, ausenciasError);
            }

            return {
              ...operacao,
              equipamentos: equipamentos || [],
              ajudantes: ajudantesCorrigidos,
              ausencias: ausenciasCorrigidas,
            };
          } catch (error) {
            console.error(`❌ Erro ao carregar dados relacionados para operação ${operacao.id}:`, error);
            return {
              ...operacao,
              equipamentos: [],
              ajudantes: [],
              ausencias: [],
            };
          }
        })
      );

      console.log('✅ Dados carregados:', operacoesCompletas.length, 'operações completas');
      setOperacoes(operacoesCompletas);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar operações:', error);
      setError(error.message || 'Erro desconhecido ao carregar dados');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperacoes();
  }, []); // Carrega apenas uma vez ao montar o componente

  const handleAtualizarDados = async () => {
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
  };

  const handleExecutarSQL = async () => {
    setAtualizando(true);
    try {
      // Executar o comando SQL usando Supabase
      const { data, error } = await supabase.rpc('executar_atualizacao_horarios');
      
      if (error) {
        console.error('❌ Erro ao executar SQL:', error);
        throw new Error(`Erro ao executar comando: ${error.message}`);
      }

      toast({
        title: "Comando executado",
        description: "O comando SQL foi executado com sucesso."
      });

      // Atualizar os dados após executar o SQL
      await fetchOperacoes();
      
    } catch (error: any) {
      console.error('❌ Erro ao executar SQL:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao executar comando SQL",
        variant: "destructive"
      });
    } finally {
      setAtualizando(false);
    }
  };

  const aplicarFiltros = () => {
    console.log('🎯 Aplicando filtros com data:', dataFiltro);
    fetchOperacoes(dataFiltro);
  };

  const limparFiltros = () => {
    setHoraInicialFiltro('Todos');
    setOperadorFiltro('');
    setOperacaoSelecionada('TODOS');
    // Não limpa a dataFiltro, apenas os outros filtros
  };

  const operacoesFiltradas = useMemo(() => {
    let filtered = operacoes;

    console.log('🔍 Aplicando filtros adicionais...');
    console.log('📅 Data filtro:', dataFiltro);
    console.log('📊 Total operações antes dos filtros adicionais:', filtered.length);

    // Filtro por hora inicial (mantido no frontend)
    if (horaInicialFiltro !== 'Todos') {
      filtered = filtered.filter(op => op.hora_inicial === horaInicialFiltro);
      console.log('📊 Após filtro de hora:', filtered.length);
    }
    
    // Filtro por operador (mantido no frontend)
    if (operadorFiltro.trim() !== '') {
      filtered = filtered.filter(op => 
        op.equipamentos.some(eq => 
          eq.motorista_operador?.toLowerCase().includes(operadorFiltro.toLowerCase())
        )
      );
      console.log('📊 Após filtro de operador:', filtered.length);
    }

    console.log('✅ Total de operações filtradas:', filtered.length);
    
    return filtered;
  }, [operacoes, horaInicialFiltro, operadorFiltro, dataFiltro]);

  const totaisPorOperacao = useMemo(() => {
    const totais: { [key: string]: number } = {};
    
    operacoesFiltradas.forEach(op => {
      const totalHoras = op.equipamentos.reduce((sum, eq) => 
        sum + (Number(eq.horas_trabalhadas) || 0), 0
      );
      totais[op.op] = (totais[op.op] || 0) + totalHoras;
    });
    
    return totais;
  }, [operacoesFiltradas]);

  const totaisAjudantesAusencias = useMemo(() => {
    let totalAjudantes = 0;
    let totalAusencias = 0;

    operacoesFiltradas.forEach(op => {
      totalAjudantes += op.ajudantes?.length || 0;
      totalAusencias += op.ausencias?.length || 0;
    });

    console.log('👥 Totais ajudantes/ausências:', { totalAjudantes, totalAusencias });
    
    return { totalAjudantes, totalAusencias };
  }, [operacoesFiltradas]);

  // Agrupar operações por tipo para o menu lateral
  const operacoesPorTipo = useMemo(() => {
    const grupos: { [key: string]: OperacaoCompleta[] } = {};
    
    operacoesFiltradas.forEach(op => {
      if (!grupos[op.op]) {
        grupos[op.op] = [];
      }
      grupos[op.op].push(op);
    });
    
    return grupos;
  }, [operacoesFiltradas]);

  const formatarHoras = (horas: number) => {
    return `${horas.toFixed(2)}h`;
  };

  const getOperacaoIcon = (op: string) => {
    switch (op) {
      case 'NAVIO': return Ship;
      case 'HYDRO': return Factory;
      case 'ALBRAS': return Warehouse;
      case 'SANTOS BRASIL': return Building;
      case 'AJUDANTES': return Users;
      case 'AUSENCIAS': return UserX;
      default: return BarChart3;
    }
  };

  const getOperacaoDisplayName = (op: OperacaoCompleta) => {
    if (op.op === 'NAVIO' && op.navios) {
      return `${op.navios.nome_navio} - ${op.navios.carga}`;
    }
    if (op.op === 'ALBRAS' && op.carga) {
      return `${op.op} - ${op.carga}`;
    }
    return op.op;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Operações</h2>
          <p className="text-blue-200">Buscando dados do sistema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-blue-200 bg-white/10 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-blue-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Erro ao Carregar Dados</h2>
            <p className="text-blue-200 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
      <div className="bg-blue-800/50 backdrop-blur-sm border-b border-blue-600/30 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')} 
                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Relatório de Transporte</h1>
                <p className="text-blue-200 text-sm">
                  {operacoes.length} operações carregadas • {operacoesFiltradas.length} correspondem aos filtros
                  {dataFiltro && ` • Data: ${formatarDataBR(dataFiltro)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleExecutarSQL}
                disabled={atualizando}
                className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-100 font-medium"
              >
                <Database className="h-4 w-4" />
                <span>Atualizar Horários</span>
              </Button>
              <Button 
                onClick={handleAtualizarDados}
                disabled={atualizando}
                className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-100 font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                <span>Atualizar Dados</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => setMenuAberto(!menuAberto)}
                className="md:hidden border-blue-300 text-white hover:bg-white/20"
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

      {/* Filtros */}
      <div className="px-6 py-4 border-b border-blue-600/30 bg-blue-800/30 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-blue-300">
              {dataFiltro ? `Mostrando: ${formatarDataBR(dataFiltro)}` : 'Selecione uma data'}
            </p>
          </div>
          
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

      {/* Cards de Resumo */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {['HYDRO', 'NAVIO', 'ALBRAS', 'SANTOS BRASIL', 'AJUDANTES', 'AUSENCIAS'].map((op) => {
            const Icon = getOperacaoIcon(op);
            let count = 0;
            let label = '';
            let totalHoras = 0;

            if (['HYDRO', 'NAVIO', 'ALBRAS', 'SANTOS BRASIL'].includes(op)) {
              const opsDoTipo = operacoesFiltradas.filter(operacao => operacao.op === op);
              count = opsDoTipo.length;
              totalHoras = opsDoTipo.reduce((sum, operacao) => 
                sum + operacao.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
              );
              label = `${count} ops • ${formatarHoras(totalHoras)}`;
            } else if (op === 'AJUDANTES') {
              count = totaisAjudantesAusencias.totalAjudantes;
              label = `${count} ajudantes`;
            } else if (op === 'AUSENCIAS') {
              count = totaisAjudantesAusencias.totalAusencias;
              label = `${count} ausências`;
            }
            
            return (
              <Card 
                key={op} 
                className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                onClick={() => setOperacaoSelecionada(op)}
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

      {/* Conteúdo Principal */}
      <div className="flex-1 flex px-6 pb-6" style={{ minHeight: 'calc(100vh - 300px)' }}>
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
              <div className="space-y-1 max-h-[calc(100vh-400px)] overflow-y-auto">
                {/* Item Todos */}
                <button
                  onClick={() => setOperacaoSelecionada('TODOS')}
                  className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                    operacaoSelecionada === 'TODOS' 
                      ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                      : 'border-transparent text-blue-200 hover:border-blue-200/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5" />
                      <span className="font-medium">VISÃO GERAL</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                      {operacoesFiltradas.length}
                    </Badge>
                  </div>
                </button>

                {/* Operações por Tipo */}
                {Object.entries(operacoesPorTipo).map(([tipo, ops]) => {
                  const Icon = getOperacaoIcon(tipo);
                  const totalHoras = ops.reduce((sum, op) => 
                    sum + op.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
                  );
                  
                  return (
                    <div key={tipo}>
                      <button
                        onClick={() => setOperacaoSelecionada(tipo)}
                        className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                          operacaoSelecionada === tipo 
                            ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                            : 'border-transparent text-blue-200 hover:border-blue-200/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{tipo}</span>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 mb-1">
                              {ops.length}
                            </Badge>
                            <div className="text-xs text-blue-300">
                              {formatarHoras(totalHoras)}
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {/* IDs das operações - SEMPRE VISÍVEIS */}
                      {ops.map((op) => {
                        const opHoras = op.equipamentos.reduce((sum, eq) => 
                          sum + (Number(eq.horas_trabalhadas) || 0), 0
                        );
                        
                        return (
                          <button
                            key={op.id}
                            onClick={() => setOperacaoSelecionada(op.id)}
                            className={`w-full text-left p-4 pl-12 hover:bg-white/10 transition-all border-l-4 ${
                              operacaoSelecionada === op.id 
                                ? 'bg-blue-400/20 border-blue-200 text-white shadow-inner' 
                                : 'border-transparent text-blue-200 hover:border-blue-200/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">ID: {op.id.slice(0, 8)}...</div>
                                <div className="text-xs text-blue-300">
                                  {formatarDataBR(op.data)} • {op.hora_inicial}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-300/30 mb-1">
                                  {op.equipamentos.length} eqps
                                </Badge>
                                <div className="text-xs text-green-300">
                                  {formatarHoras(opHoras)}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Ajudantes */}
                {totaisAjudantesAusencias.totalAjudantes > 0 && (
                  <button
                    onClick={() => setOperacaoSelecionada('AJUDANTES')}
                    className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                      operacaoSelecionada === 'AJUDANTES' 
                        ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                        : 'border-transparent text-blue-200 hover:border-blue-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">AJUDANTES</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        {totaisAjudantesAusencias.totalAjudantes}
                      </Badge>
                    </div>
                  </button>
                )}

                {/* Ausências */}
                {totaisAjudantesAusencias.totalAusencias > 0 && (
                  <button
                    onClick={() => setOperacaoSelecionada('AUSENCIAS')}
                    className={`w-full text-left p-4 hover:bg-white/10 transition-all border-l-4 ${
                      operacaoSelecionada === 'AUSENCIAS' 
                        ? 'bg-blue-500/20 border-blue-300 text-white shadow-inner' 
                        : 'border-transparent text-blue-200 hover:border-blue-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserX className="h-5 w-5" />
                        <span className="font-medium">AUSÊNCIAS</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        {totaisAjudantesAusencias.totalAusencias}
                      </Badge>
                    </div>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 ml-6 min-w-0">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 h-full">
            <CardContent className="p-6 h-full overflow-auto">
              {/* Visão Geral */}
              {operacaoSelecionada === 'TODOS' && (
                <div className="space-y-6">
                  {Object.entries(operacoesPorTipo).map(([tipo, ops]) => {
                    const Icon = getOperacaoIcon(tipo);
                    const totalHoras = ops.reduce((sum, op) => 
                      sum + op.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
                    );
                    
                    return (
                      <div key={tipo} className="border border-blue-200/30 rounded-lg hover:border-blue-200/50 transition-all">
                        <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-200/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Icon className="h-5 w-5 text-blue-300" />
                              <h3 className="text-lg font-semibold text-white">{tipo}</h3>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                                {ops.length} operação(ões)
                              </Badge>
                            </div>
                            {totalHoras > 0 && (
                              <div className="text-sm text-blue-300">
                                Total: <span className="font-semibold text-green-400">{formatarHoras(totalHoras)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <OperacoesTable 
                          operacoes={ops}
                          getOperacaoDisplayName={getOperacaoDisplayName}
                          formatarDataBR={formatarDataBR}
                        />
                      </div>
                    );
                  })}
                  
                  {totaisAjudantesAusencias.totalAjudantes > 0 && (
                    <div className="border border-blue-200/30 rounded-lg hover:border-blue-200/50 transition-all">
                      <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-200/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-blue-300" />
                            <h3 className="text-lg font-semibold text-white">AJUDANTES</h3>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                              {totaisAjudantesAusencias.totalAjudantes} ajudante(s)
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <AjudantesTable operacoes={operacoesFiltradas} formatarDataBR={formatarDataBR} />
                    </div>
                  )}

                  {totaisAjudantesAusencias.totalAusencias > 0 && (
                    <div className="border border-blue-200/30 rounded-lg hover:border-blue-200/50 transition-all">
                      <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-200/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <UserX className="h-5 w-5 text-blue-300" />
                            <h3 className="text-lg font-semibold text-white">AUSÊNCIAS</h3>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                              {totaisAjudantesAusencias.totalAusencias} ausência(s)
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <AusenciasTable operacoes={operacoesFiltradas} formatarDataBR={formatarDataBR} />
                    </div>
                  )}

                  {operacoesFiltradas.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-blue-300/30 rounded-lg hover:border-blue-300/50 transition-all">
                      <Search className="h-12 w-12 text-blue-300/50 mx-auto mb-4" />
                      <p className="text-lg font-medium text-white mb-2">Nenhuma operação encontrada</p>
                      <p className="text-blue-300 mb-4">Ajuste os filtros ou crie uma nova operação</p>
                      <Button 
                        onClick={() => navigate('/novo-lancamento')}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Operação
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Operação Específica por ID */}
              {operacaoSelecionada && operacaoSelecionada !== 'TODOS' && operacaoSelecionada !== 'AJUDANTES' && operacaoSelecionada !== 'AUSENCIAS' && !['HYDRO', 'NAVIO', 'ALBRAS', 'SANTOS BRASIL'].includes(operacaoSelecionada) && (
                <OperacaoDetalhada 
                  operacao={operacoesFiltradas.find(op => op.id === operacaoSelecionada)}
                  getOperacaoDisplayName={getOperacaoDisplayName}
                  formatarDataBR={formatarDataBR}
                />
              )}

              {/* Operação por Tipo */}
              {['HYDRO', 'NAVIO', 'ALBRAS', 'SANTOS BRASIL'].includes(operacaoSelecionada) && (
                <div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        {(() => {
                          const Icon = getOperacaoIcon(operacaoSelecionada);
                          return <Icon className="h-6 w-6 text-blue-300" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{operacaoSelecionada}</h2>
                        <p className="text-blue-300">
                          {operacoesPorTipo[operacaoSelecionada]?.length || 0} operação(ões) • Total: {formatarHoras(totaisPorOperacao[operacaoSelecionada] || 0)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm bg-blue-500/20 text-blue-300">
                      {operacoesPorTipo[operacaoSelecionada]?.length || 0} registros
                    </Badge>
                  </div>
                  <OperacoesTable 
                    operacoes={operacoesPorTipo[operacaoSelecionada] || []}
                    getOperacaoDisplayName={getOperacaoDisplayName}
                    formatarDataBR={formatarDataBR}
                  />
                </div>
              )}

              {/* Ajudantes */}
              {operacaoSelecionada === 'AJUDANTES' && (
                <div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <Users className="h-6 w-6 text-blue-300" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">AJUDANTES</h2>
                        <p className="text-blue-300">
                          {totaisAjudantesAusencias.totalAjudantes} ajudante(s) registrado(s)
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm bg-blue-500/20 text-blue-300">
                      {totaisAjudantesAusencias.totalAjudantes} registros
                    </Badge>
                  </div>
                  <AjudantesTable operacoes={operacoesFiltradas} formatarDataBR={formatarDataBR} />
                </div>
              )}

              {/* Ausências */}
              {operacaoSelecionada === 'AUSENCIAS' && (
                <div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <UserX className="h-6 w-6 text-blue-300" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">AUSÊNCIAS</h2>
                        <p className="text-blue-300">
                          {totaisAjudantesAusencias.totalAusencias} ausência(s) registrada(s)
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm bg-blue-500/20 text-blue-300">
                      {totaisAjudantesAusencias.totalAusencias} registros
                    </Badge>
                  </div>
                  <AusenciasTable operacoes={operacoesFiltradas} formatarDataBR={formatarDataBR} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Componente para operação detalhada por ID
interface OperacaoDetalhadaProps {
  operacao: OperacaoCompleta | undefined;
  getOperacaoDisplayName: (op: OperacaoCompleta) => string;
  formatarDataBR: (data: string) => string;
}

const OperacaoDetalhada = ({ operacao, getOperacaoDisplayName, formatarDataBR }: OperacaoDetalhadaProps) => {
  if (!operacao) {
    return (
      <div className="text-center py-12">
        <div className="space-y-3">
          <Search className="h-12 w-12 text-blue-300/50 mx-auto" />
          <p className="text-lg font-medium text-white">Operação não encontrada</p>
          <p className="text-blue-300">A operação selecionada não existe ou foi removida</p>
        </div>
      </div>
    );
  }

  const totalHoras = operacao.equipamentos.reduce((sum, eq) => 
    sum + (Number(eq.horas_trabalhadas) || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg">
        <div>
          <h2 className="text-xl font-bold text-white">Operação #{operacao.id.slice(0, 8)}</h2>
          <p className="text-blue-300">
            {getOperacaoDisplayName(operacao)} • {formatarDataBR(operacao.data)}
          </p>
        </div>
        <Badge className="bg-green-500/20 text-green-300 text-lg px-3 py-1">
          Total: {totalHoras.toFixed(1)}h
        </Badge>
      </div>

      <Card className="bg-white/5 border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white">Detalhes da Operação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-blue-200">Data</Label>
              <p className="text-white">{formatarDataBR(operacao.data)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-blue-200">Horário</Label>
              <p className="text-white">{operacao.hora_inicial} - {operacao.hora_final}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-blue-200">Tipo</Label>
              <p className="text-white">{operacao.op}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-blue-200">Observações</Label>
              <p className="text-white">{operacao.observacao || 'Nenhuma'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <OperacoesTable 
        operacoes={[operacao]}
        getOperacaoDisplayName={getOperacaoDisplayName}
        formatarDataBR={formatarDataBR}
      />
    </div>
  );
};

// Componente de Tabela de Operações
interface OperacoesTableProps {
  operacoes: OperacaoCompleta[];
  getOperacaoDisplayName: (op: OperacaoCompleta) => string;
  formatarDataBR: (data: string) => string;
}

const OperacoesTable = ({ operacoes, getOperacaoDisplayName, formatarDataBR }: OperacoesTableProps) => {
  if (operacoes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="space-y-3">
          <Search className="h-12 w-12 text-blue-300/50 mx-auto" />
          <p className="text-lg font-medium text-white">Nenhuma operação encontrada</p>
          <p className="text-blue-300">Os filtros aplicados não retornaram resultados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-blue-500/10">
          <TableRow>
            <TableHead className="font-semibold text-blue-200 py-3">Operação</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Data</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Horário</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Equipamento</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Motorista/Operador</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Horas Trabalhadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operacoes.flatMap((op) => 
            op.equipamentos.map((eq) => {
              const horasTrabalhadas = Number(eq.horas_trabalhadas) || 0;
              
              // VERIFICA SE É HYDRO E SUBSTITUI A OPERAÇÃO PELO grupo_operacao
              const displayOperacao = op.op === 'HYDRO' 
                ? eq.grupo_operacao 
                : getOperacaoDisplayName(op);
              
              return (
                <TableRow key={`${op.id}-${eq.id}`} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      <div>
                        <div className="font-medium text-white">{displayOperacao}</div>
                        {op.observacao && (
                          <div className="text-sm text-blue-300 truncate max-w-xs">{op.observacao}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm font-medium text-white">
                      {formatarDataBR(op.data)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                        {op.hora_inicial}
                      </Badge>
                      <span className="text-blue-400">→</span>
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30">
                        {op.hora_final}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-medium text-white">{eq.tag}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-medium text-white">{eq.motorista_operador}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-center">
                      <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/20 border-0 text-sm font-medium">
                        {horasTrabalhadas.toFixed(1)}h
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// Componente de Tabela de Ajudantes
interface AjudantesTableProps {
  operacoes: OperacaoCompleta[];
  formatarDataBR: (data: string) => string;
}

const AjudantesTable = ({ operacoes, formatarDataBR }: AjudantesTableProps) => {
  const todosAjudantes = operacoes.flatMap(op => 
    op.ajudantes?.map(ajudante => ({
      ...ajudante,
      operacao: op.op,
      dataOperacao: op.data,
      nomeOperacao: op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} - ${op.navios.carga}` : op.op
    })) || []
  );

  if (todosAjudantes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="space-y-3">
          <Users className="h-12 w-12 text-blue-300/50 mx-auto" />
          <p className="text-lg font-medium text-white">Nenhum ajudante encontrado</p>
          <p className="text-blue-300">Não há ajudantes registrados para os filtros aplicados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-blue-500/10">
          <TableRow>
            <TableHead className="font-semibold text-blue-200 py-3">Nome</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Operação</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Data</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Horário</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {todosAjudantes.map((ajudante, index) => (
            <TableRow key={`${ajudante.id}-${index}`} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
              <TableCell className="py-4">
                <div className="font-medium text-white">{ajudante.nome}</div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                  {ajudante.nomeOperacao}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="text-sm text-white">
                  {formatarDataBR(ajudante.data)}
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                    {ajudante.hora_inicial}
                  </Badge>
                  <span className="text-blue-400">→</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30 text-xs">
                    {ajudante.hora_final}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="text-sm text-blue-300 max-w-xs">
                  {ajudante.observacao || 'Sem observações'}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Componente de Tabela de Ausências
interface AusenciasTableProps {
  operacoes: OperacaoCompleta[];
  formatarDataBR: (data: string) => string;
}

const AusenciasTable = ({ operacoes, formatarDataBR }: AusenciasTableProps) => {
  const todasAusencias = operacoes.flatMap(op => 
    op.ausencias?.map(ausencia => ({
      ...ausencia,
      operacao: op.op,
      dataOperacao: op.data,
      nomeOperacao: op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} - ${op.navios.carga}` : op.op
    })) || []
  );

  if (todasAusencias.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="space-y-3">
          <UserX className="h-12 w-12 text-blue-300/50 mx-auto" />
          <p className="text-lg font-medium text-white">Nenhuma ausência encontrada</p>
          <p className="text-blue-300">Não há ausências registradas para os filtros aplicados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-blue-500/10">
          <TableRow>
            <TableHead className="font-semibold text-blue-200 py-3">Nome</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Operação</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Data</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Status</TableHead>
            <TableHead className="font-semibold text-blue-200 py-3">Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {todasAusencias.map((ausencia, index) => (
            <TableRow key={`${ausencia.id}-${index}`} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
              <TableCell className="py-4">
                <div className="font-medium text-white">{ausencia.nome}</div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                  {ausencia.nomeOperacao}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="text-sm text-white">
                  {formatarDataBR(ausencia.data)}
                </div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant={ausencia.justificado ? "default" : "destructive"} className={ausencia.justificado ? "bg-green-500/20 text-green-300 hover:bg-green-500/20 border-green-300/30" : "bg-red-500/20 text-red-300 hover:bg-red-500/20 border-red-300/30"}>
                  {ausencia.justificado ? 'Justificado' : 'Não Justificado'}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="text-sm text-blue-300 max-w-xs">
                  {ausencia.obs || 'Sem observações'}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RelatorioTransporte;