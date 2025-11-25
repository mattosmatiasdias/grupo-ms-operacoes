import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Download, Filter, Calendar, PieChart, ArrowLeft, Ship, Package, Clock, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Interface para os dados do gráfico
interface ChartData {
  local: string;
  horas: number;
  quantidade: number;
  porcentagem: number;
}

// Interface para dados dos navios
interface NavioData {
  id: string;
  nome_navio: string;
  carga: string;
  berco: string;
  quantidade_prevista: number;
  cbs_total: number;
  inicio_operacao: string;
  final_operacao: string;
  media_cb: number;
  concluido: boolean;
  horas_totais: number;
  quantidade_equipamentos: number;
  diaria: number;
}

const Visuais = () => {
  const navigate = useNavigate();
  
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
      const data = new Date(dataString + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dataString;
    }
  };

  // Função para formatar data e hora
  const formatarDataHoraBR = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return data.toLocaleString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data/hora:', error);
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
        return corrigirFusoHorarioData(data.data);
      }
      
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao buscar última data:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Obter data de 7 dias atrás
  const getDataInicialPadrao = async () => {
    try {
      const dataAtual = new Date();
      const seteDiasAtras = new Date(dataAtual);
      seteDiasAtras.setDate(dataAtual.getDate() - 7);
      return corrigirFusoHorarioData(seteDiasAtras.toISOString());
    } catch (error) {
      console.error('Erro ao obter data inicial:', error);
      const dataAtual = new Date();
      dataAtual.setDate(dataAtual.getDate() - 7);
      return dataAtual.toISOString().split('T')[0];
    }
  };

  const [filtros, setFiltros] = useState({
    dataInicial: '',
    dataFinal: '',
    local: 'todos'
  });

  const [filtrosNavios, setFiltrosNavios] = useState({
    status: 'todos',
    berco: 'todos',
    carga: 'todos'
  });

  const [dadosGrafico, setDadosGrafico] = useState<ChartData[]>([]);
  const [dadosNavios, setDadosNavios] = useState<NavioData[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoNavios, setCarregandoNavios] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  // Locais disponíveis para filtro
  const locais = [
    { value: 'todos', label: 'Todos os Locais' },
    { value: 'HYDRO', label: 'HYDRO' },
    { value: 'NAVIO', label: 'NAVIO' },
    { value: 'ALBRAS', label: 'ALBRAS' },
    { value: 'SANTOS BRASIL', label: 'SANTOS BRASIL' }
  ];

  // Filtros para navios
  const statusNavios = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'ativo', label: 'Em Operação' },
    { value: 'concluido', label: 'Concluídos' }
  ];

  const bercos = [
    { value: 'todos', label: 'Todos os Berços' },
    { value: 'BERÇO 1', label: 'BERÇO 1' },
    { value: 'BERÇO 2', label: 'BERÇO 2' },
    { value: 'BERÇO 3', label: 'BERÇO 3' }
  ];

  const cargas = [
    { value: 'todos', label: 'Todos os Tipos' },
    { value: 'ALUMINA', label: 'ALUMINA' },
    { value: 'CARVÃO', label: 'CARVÃO' },
    { value: 'COQUE', label: 'COQUE' },
    { value: 'BAUXITA', label: 'BAUXITA' }
  ];

  // Função para buscar dados dos navios
  const buscarDadosNavios = async () => {
    setCarregandoNavios(true);
    
    try {
      console.log('🚢 Buscando dados dos navios...');
      
      let queryNavios = supabase
        .from('navios')
        .select('*')
        .order('inicio_operacao', { ascending: false });

      // Aplicar filtro de status
      if (filtrosNavios.status !== 'todos') {
        queryNavios = queryNavios.eq('concluido', filtrosNavios.status === 'concluido');
      }

      // Aplicar filtro de berço
      if (filtrosNavios.berco !== 'todos') {
        queryNavios = queryNavios.eq('berco', filtrosNavios.berco);
      }

      // Aplicar filtro de carga
      if (filtrosNavios.carga !== 'todos') {
        queryNavios = queryNavios.eq('carga', filtrosNavios.carga);
      }

      const { data: navios, error: errorNavios } = await queryNavios;

      if (errorNavios) {
        console.error('❌ Erro ao buscar navios:', errorNavios);
        throw new Error(`Erro ao buscar navios: ${errorNavios.message}`);
      }

      console.log('✅ Navios encontrados:', navios?.length || 0);

      if (!navios || navios.length === 0) {
        setDadosNavios([]);
        return;
      }

      // Para cada navio, buscar operações relacionadas e calcular totais
      const naviosComTotais = await Promise.all(
        navios.map(async (navio) => {
          // Buscar operações deste navio
          const { data: operacoes, error: errorOperacoes } = await supabase
            .from('registro_operacoes')
            .select(`
              id,
              equipamentos (
                horas_trabalhadas
              )
            `)
            .eq('navio_id', navio.id);

          if (errorOperacoes) {
            console.error(`❌ Erro ao buscar operações do navio ${navio.nome_navio}:`, errorOperacoes);
          }

          // Calcular totais
          let horasTotais = 0;
          let quantidadeEquipamentos = 0;

          if (operacoes) {
            operacoes.forEach(operacao => {
              if (operacao.equipamentos && operacao.equipamentos.length > 0) {
                operacao.equipamentos.forEach(equipamento => {
                  horasTotais += Number(equipamento.horas_trabalhadas) || 0;
                  quantidadeEquipamentos += 1;
                });
              }
            });
          }

          // Calcular diária (horas totais / quantidade de equipamentos)
          const diaria = quantidadeEquipamentos > 0 ? horasTotais / quantidadeEquipamentos : 0;

          return {
            ...navio,
            horas_totais: parseFloat(horasTotais.toFixed(1)),
            quantidade_equipamentos: quantidadeEquipamentos,
            diaria: parseFloat(diaria.toFixed(1))
          };
        })
      );

      console.log('📊 Navios processados:', naviosComTotais);
      setDadosNavios(naviosComTotais);

    } catch (error: any) {
      console.error('❌ Erro ao processar dados dos navios:', error);
      setDadosNavios([]);
    } finally {
      setCarregandoNavios(false);
    }
  };

  // Função para buscar dados reais com JOIN entre as tabelas
  const buscarDadosEquipamentos = async () => {
    setCarregando(true);
    
    try {
      console.log('🔍 Buscando dados com JOIN entre tabelas...');

      // Primeiro, buscar as operações que correspondem ao filtro de data
      let queryOperacoes = supabase
        .from('registro_operacoes')
        .select('id, op, data')
        .order('data', { ascending: false });

      // Aplicar filtro de data na tabela registro_operacoes
      if (filtros.dataInicial) {
        const dataInicialCorrigida = corrigirFusoHorarioData(filtros.dataInicial);
        queryOperacoes = queryOperacoes.gte('data', dataInicialCorrigida);
      }

      if (filtros.dataFinal) {
        const dataFinalCorrigida = corrigirFusoHorarioData(filtros.dataFinal);
        queryOperacoes = queryOperacoes.lte('data', dataFinalCorrigida);
      }

      const { data: operacoes, error: errorOperacoes } = await queryOperacoes;

      if (errorOperacoes) {
        console.error('❌ Erro ao buscar operações:', errorOperacoes);
        throw new Error(`Erro ao buscar operações: ${errorOperacoes.message}`);
      }

      console.log('✅ Operações encontradas:', operacoes?.length || 0);

      if (!operacoes || operacoes.length === 0) {
        console.log('📭 Nenhuma operação encontrada para os filtros de data');
        setDadosGrafico([]);
        return;
      }

      // Extrair os IDs das operações encontradas
      const operacaoIds = operacoes.map(op => op.id);

      // Agora buscar os equipamentos relacionados a essas operações
      let queryEquipamentos = supabase
        .from('equipamentos')
        .select('local, horas_trabalhadas, registro_operacoes_id')
        .in('registro_operacoes_id', operacaoIds);

      // Aplicar filtro de local se necessário
      if (filtros.local !== 'todos') {
        queryEquipamentos = queryEquipamentos.eq('local', filtros.local);
      }

      const { data: equipamentos, error: errorEquipamentos } = await queryEquipamentos;

      if (errorEquipamentos) {
        console.error('❌ Erro ao buscar equipamentos:', errorEquipamentos);
        throw new Error(`Erro ao buscar equipamentos: ${errorEquipamentos.message}`);
      }

      console.log('✅ Equipamentos encontrados:', equipamentos?.length || 0);

      if (!equipamentos || equipamentos.length === 0) {
        console.log('📭 Nenhum equipamento encontrado para as operações filtradas');
        setDadosGrafico([]);
        return;
      }

      // Agrupar por local e calcular totais
      const agrupadoPorLocal = equipamentos.reduce((acc, equipamento) => {
        const local = equipamento.local || 'NÃO INFORMADO';
        
        if (!acc[local]) {
          acc[local] = {
            horas: 0,
            quantidade: 0
          };
        }
        
        acc[local].horas += Number(equipamento.horas_trabalhadas) || 0;
        acc[local].quantidade += 1;
        
        return acc;
      }, {} as Record<string, { horas: number; quantidade: number }>);

      // Converter para array e calcular porcentagens
      const dadosArray = Object.entries(agrupadoPorLocal).map(([local, dados]) => ({
        local,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade
      }));

      // Calcular total de horas para as porcentagens
      const totalHoras = dadosArray.reduce((sum, item) => sum + item.horas, 0);

      // Adicionar porcentagens
      const dadosComPorcentagem = dadosArray.map(item => ({
        ...item,
        porcentagem: totalHoras > 0 ? Math.round((item.horas / totalHoras) * 100) : 0
      }));

      const dadosOrdenados = dadosComPorcentagem.sort((a, b) => b.horas - a.horas);
      
      setDadosGrafico(dadosOrdenados);

    } catch (error: any) {
      console.error('❌ Erro ao processar dados:', error);
      setDadosGrafico([]);
    } finally {
      setCarregando(false);
    }
  };

  // Inicializar datas padrão quando o componente montar
  useEffect(() => {
    const inicializarDatas = async () => {
      setInicializando(true);
      try {
        const dataFinal = await buscarUltimaData();
        const dataInicial = await getDataInicialPadrao();
        
        setFiltros({
          dataInicial,
          dataFinal,
          local: 'todos'
        });

        console.log('📅 Datas inicializadas:', { dataInicial, dataFinal });
      } catch (error) {
        console.error('Erro ao inicializar datas:', error);
      } finally {
        setInicializando(false);
      }
    };

    inicializarDatas();
  }, []);

  // Buscar dados quando as datas forem inicializadas ou filtros mudarem
  useEffect(() => {
    if (!inicializando && filtros.dataInicial && filtros.dataFinal) {
      buscarDadosEquipamentos();
      buscarDadosNavios();
    }
  }, [filtros, inicializando]);

  // Buscar dados dos navios quando filtros de navios mudarem
  useEffect(() => {
    if (!inicializando) {
      buscarDadosNavios();
    }
  }, [filtrosNavios]);

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    buscarDadosEquipamentos();
  };

  // Função para limpar filtros
  const limparFiltros = async () => {
    const dataFinal = await buscarUltimaData();
    const dataInicial = await getDataInicialPadrao();
    
    setFiltros({
      dataInicial,
      dataFinal,
      local: 'todos'
    });
  };

  // Função para limpar filtros de navios
  const limparFiltrosNavios = () => {
    setFiltrosNavios({
      status: 'todos',
      berco: 'todos',
      carga: 'todos'
    });
  };

  // Função para retornar ao menu principal
  const retornarAoMenu = () => {
    navigate('/');
  };

  // Cores para o gráfico
  const cores = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

  // Calcular totais
  const totais = dadosGrafico.reduce((acc, item) => ({
    horas: acc.horas + item.horas,
    quantidade: acc.quantidade + item.quantidade
  }), { horas: 0, quantidade: 0 });

  // Calcular totais dos navios
  const totaisNavios = dadosNavios.reduce((acc, navio) => ({
    horas: acc.horas + navio.horas_totais,
    equipamentos: acc.equipamentos + navio.quantidade_equipamentos,
    navios: acc.navios + 1
  }), { horas: 0, equipamentos: 0, navios: 0 });

  if (inicializando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Dashboard</h2>
          <p className="text-blue-200">Inicializando dados do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              onClick={retornarAoMenu}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Visuais e Dashboard</h1>
              <p className="text-blue-200">
                Horas trabalhadas por local e informações detalhadas dos navios
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/30">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros Principais */}
      <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros - Operações e Equipamentos
          </CardTitle>
          <CardDescription className="text-blue-200">
            Filtre as horas trabalhadas por data da operação
            {filtros.dataInicial && filtros.dataFinal && (
              <span className="block text-orange-300 mt-1">
                Período: {formatarDataBR(filtros.dataInicial)} até {formatarDataBR(filtros.dataFinal)}
                {dadosGrafico.length > 0 && (
                  <span className="text-green-300 ml-2">
                    • {totais.quantidade} equipamentos • {totais.horas.toFixed(1)} horas totais
                  </span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Data Inicial */}
            <div className="space-y-2">
              <Label htmlFor="dataInicial" className="text-white">Data Inicial</Label>
              <Input
                id="dataInicial"
                type="date"
                value={filtros.dataInicial}
                onChange={(e) => setFiltros({ ...filtros, dataInicial: e.target.value })}
                className="bg-white/5 border-blue-300/30 text-white"
                max={filtros.dataFinal}
              />
            </div>

            {/* Data Final */}
            <div className="space-y-2">
              <Label htmlFor="dataFinal" className="text-white">Data Final</Label>
              <Input
                id="dataFinal"
                type="date"
                value={filtros.dataFinal}
                onChange={(e) => setFiltros({ ...filtros, dataFinal: e.target.value })}
                className="bg-white/5 border-blue-300/30 text-white"
                min={filtros.dataInicial}
              />
            </div>

            {/* Local */}
            <div className="space-y-2">
              <Label htmlFor="local" className="text-white">Local</Label>
              <Select value={filtros.local} onValueChange={(value) => setFiltros({ ...filtros, local: value })}>
                <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locais.map((local) => (
                    <SelectItem key={local.value} value={local.value}>
                      {local.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-end gap-2">
              <Button 
                onClick={aplicarFiltros}
                className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
                disabled={carregando}
              >
                <Filter className="h-4 w-4 mr-2" />
                {carregando ? 'Aplicando...' : 'Aplicar Filtros'}
              </Button>
              <Button 
                onClick={limparFiltros}
                variant="outline"
                className="border-blue-300/30 text-white hover:bg-white/10"
                disabled={carregando}
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Horas Trabalhadas</p>
                <p className="text-3xl font-bold">{totais.horas.toFixed(1)}h</p>
                <p className="text-blue-200 text-xs">Soma de horas_trabalhadas</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-green-200/30 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Equipamentos</p>
                <p className="text-3xl font-bold">{totais.quantidade}</p>
                <p className="text-blue-200 text-xs">Registros filtrados</p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-purple-200/30 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Navios em Operação</p>
                <p className="text-3xl font-bold">
                  {dadosNavios.filter(n => !n.concluido).length}
                </p>
                <p className="text-blue-200 text-xs">Ativos no sistema</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Ship className="h-6 w-6 text-purple-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-orange-200/30 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Média por Equipamento</p>
                <p className="text-3xl font-bold">
                  {totais.quantidade > 0 ? (totais.horas / totais.quantidade).toFixed(1) : '0'}h
                </p>
                <p className="text-blue-200 text-xs">Horas por equipamento</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <PieChart className="h-6 w-6 text-orange-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Horas Trabalhadas por Local */}
      <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Horas Trabalhadas - Operações
            {carregando && (
              <span className="text-orange-400 text-sm font-normal">(Atualizando...)</span>
            )}
          </CardTitle>
          <CardDescription className="text-blue-200">
            Distribuição das horas trabalhadas por local (filtrado por data da operação)
            {totais.horas > 0 && (
              <span className="text-green-300 ml-2">
                Soma total: {totais.horas.toFixed(1)} horas
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-white animate-pulse">Carregando dados das operações...</div>
            </div>
          ) : dadosGrafico.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-center">
                <p>Nenhum dado encontrado para os filtros aplicados</p>
                <p className="text-sm text-blue-200 mt-2">
                  Não houve operações registradas neste período
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de Pizza Visual */}
              <div className="flex justify-center items-center">
                <div className="relative w-64 h-64">
                  {/* Gráfico de Pizza */}
                  <div className="absolute inset-0 rounded-full border-4 border-white/20">
                    {dadosGrafico.map((item, index) => {
                      const porcentagemAcumulada = dadosGrafico
                        .slice(0, index)
                        .reduce((acc, curr) => acc + curr.porcentagem, 0);
                      
                      return (
                        <div
                          key={item.local}
                          className={`absolute inset-0 rounded-full ${cores[index % cores.length]} opacity-80`}
                          style={{
                            clipPath: `conic-gradient(from ${porcentagemAcumulada * 3.6}deg, transparent 0, transparent ${item.porcentagem * 3.6}deg, #0000 0)`
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Centro do gráfico */}
                  <div className="absolute inset-8 bg-blue-900/80 rounded-full backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-2xl font-bold">{totais.horas.toFixed(1)}h</div>
                      <div className="text-blue-200 text-sm">Total Horas</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legenda e Detalhes */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {dadosGrafico.map((item, index) => (
                    <div key={item.local} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${cores[index % cores.length]}`} />
                        <div>
                          <span className="text-white font-medium">{item.local}</span>
                          <div className="text-blue-200 text-xs">
                            {item.quantidade} equipamento{item.quantidade !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{item.horas.toFixed(1)}h</div>
                        <div className="text-blue-200 text-sm">
                          {item.porcentagem}% do total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totais */}
                <div className="border-t border-white/20 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-blue-200 text-sm">Total de Horas</div>
                      <div className="text-white text-xl font-bold">{totais.horas.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-blue-200 text-sm">Total de Equipamentos</div>
                      <div className="text-white text-xl font-bold">{totais.quantidade}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Navios - AGORA ABAIXO DO DASHBOARD EXISTENTE */}
      <Card className="bg-white/10 backdrop-blur-sm border-green-200/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Informações dos Navios
            {carregandoNavios && (
              <span className="text-orange-400 text-sm font-normal">(Atualizando...)</span>
            )}
          </CardTitle>
          <CardDescription className="text-blue-200">
            Dados detalhados dos navios em operação
            {totaisNavios.navios > 0 && (
              <span className="text-green-300 ml-2">
                • {totaisNavios.navios} navios • {totaisNavios.equipamentos} equipamentos • {totaisNavios.horas.toFixed(1)} horas totais
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros de Navios */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-white">Status</Label>
              <Select 
                value={filtrosNavios.status} 
                onValueChange={(value) => setFiltrosNavios({ ...filtrosNavios, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-green-300/30 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusNavios.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Berço */}
            <div className="space-y-2">
              <Label htmlFor="berco" className="text-white">Berço</Label>
              <Select 
                value={filtrosNavios.berco} 
                onValueChange={(value) => setFiltrosNavios({ ...filtrosNavios, berco: value })}
              >
                <SelectTrigger className="bg-white/5 border-green-300/30 text-white">
                  <SelectValue placeholder="Berço" />
                </SelectTrigger>
                <SelectContent>
                  {bercos.map((berco) => (
                    <SelectItem key={berco.value} value={berco.value}>
                      {berco.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Carga */}
            <div className="space-y-2">
              <Label htmlFor="carga" className="text-white">Carga</Label>
              <Select 
                value={filtrosNavios.carga} 
                onValueChange={(value) => setFiltrosNavios({ ...filtrosNavios, carga: value })}
              >
                <SelectTrigger className="bg-white/5 border-green-300/30 text-white">
                  <SelectValue placeholder="Carga" />
                </SelectTrigger>
                <SelectContent>
                  {cargas.map((carga) => (
                    <SelectItem key={carga.value} value={carga.value}>
                      {carga.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-end gap-2">
              <Button 
                onClick={limparFiltrosNavios}
                variant="outline"
                className="border-green-300/30 text-white hover:bg-white/10"
                disabled={carregandoNavios}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Grid de Navios */}
          {carregandoNavios ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-white animate-pulse">Carregando dados dos navios...</div>
            </div>
          ) : dadosNavios.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-white text-center">
                <p>Nenhum navio encontrado para os filtros aplicados</p>
                <p className="text-sm text-blue-200 mt-2">
                  Tente ajustar os filtros de status, berço ou carga
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {dadosNavios.map((navio) => (
                <Card key={navio.id} className="bg-white/5 border-green-300/20 hover:border-green-300/40 transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">{navio.nome_navio}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            navio.concluido 
                              ? 'bg-gray-500/30 text-gray-300' 
                              : 'bg-green-500/30 text-green-300'
                          }`}>
                            {navio.concluido ? 'Concluído' : 'Em Operação'}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-blue-500/30 text-blue-300 text-xs">
                            {navio.berco}
                          </span>
                        </div>
                      </div>
                      <Package className="h-8 w-8 text-green-300" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-200">Carga:</span>
                        <span className="text-white font-medium">{navio.carga}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-blue-200">Quantidade Prevista:</span>
                        <span className="text-white font-medium">{navio.quantidade_prevista}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-blue-200">CBS Total:</span>
                        <span className="text-white font-medium">{navio.cbs_total}</span>
                      </div>

                      <div className="border-t border-white/20 pt-3">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-white/5 rounded-lg p-2">
                            <Clock className="h-4 w-4 text-blue-300 mx-auto mb-1" />
                            <div className="text-white text-sm font-bold">{navio.horas_totais}h</div>
                            <div className="text-blue-200 text-xs">Horas Totais</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <Users className="h-4 w-4 text-green-300 mx-auto mb-1" />
                            <div className="text-white text-sm font-bold">{navio.quantidade_equipamentos}</div>
                            <div className="text-blue-200 text-xs">Equipamentos</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-orange-300 text-sm font-bold">{navio.diaria}h</div>
                        <div className="text-blue-200 text-xs">Média Diária por Equipamento</div>
                      </div>

                      {navio.inicio_operacao && (
                        <div className="text-xs text-blue-200">
                          Início: {formatarDataHoraBR(navio.inicio_operacao)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Visuais;