import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Download, Filter, Calendar, PieChart, ArrowLeft, Clock, Users } from 'lucide-react';
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

const Visuais = () => {
  const navigate = useNavigate();
  
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

  // Função para obter o período de 16 a 15 do mês seguinte com base na data atual
  const getPeriodoPadrao = () => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
    
    let dataInicial, dataFinal;
    
    // Se o dia atual é 16 ou maior, o período atual é 16 do mês atual a 15 do próximo mês
    if (hoje.getDate() >= 16) {
      dataInicial = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-16`;
      
      // Calcular próxima data: 15 do próximo mês
      let proximoMes = mesAtual + 1;
      let proximoAno = anoAtual;
      if (proximoMes > 12) {
        proximoMes = 1;
        proximoAno = anoAtual + 1;
      }
      dataFinal = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-15`;
    } 
    // Se o dia atual é 15 ou menor, o período atual é 16 do mês anterior a 15 do mês atual
    else {
      let mesAnterior = mesAtual - 1;
      let anoAnterior = anoAtual;
      if (mesAnterior < 1) {
        mesAnterior = 12;
        anoAnterior = anoAtual - 1;
      }
      dataInicial = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-16`;
      dataFinal = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-15`;
    }
    
    return { dataInicial, dataFinal };
  };

  // Função para obter períodos disponíveis para seleção (últimos 6 períodos)
  const getPeriodosDisponiveis = () => {
    const periodos = [];
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    // Gerar últimos 6 períodos (incluindo o atual)
    for (let i = 0; i < 6; i++) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes < 1) {
        mes += 12;
        ano -= 1;
      }
      
      const dataInicial = `${ano}-${String(mes).padStart(2, '0')}-16`;
      
      // Calcular data final (15 do próximo mês)
      let proximoMes = mes + 1;
      let proximoAno = ano;
      if (proximoMes > 12) {
        proximoMes = 1;
        proximoAno = ano + 1;
      }
      const dataFinal = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-15`;
      
      periodos.push({
        value: `${dataInicial}_${dataFinal}`,
        label: `${formatarDataBR(dataInicial)} a ${formatarDataBR(dataFinal)}`
      });
    }
    
    return periodos;
  };

  const [filtros, setFiltros] = useState({
    periodo: '', // Formato: "YYYY-MM-DD_YYYY-MM-DD"
    local: 'todos'
  });

  const [dadosGrafico, setDadosGrafico] = useState<ChartData[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [periodos, setPeriodos] = useState<{value: string, label: string}[]>([]);

  // Locais disponíveis para filtro
  const locais = [
    { value: 'todos', label: 'Todos os Locais' },
    { value: 'HYDRO', label: 'HYDRO' },
    { value: 'ALBRAS', label: 'ALBRAS' },
    { value: 'SANTOS BRASIL', label: 'SANTOS BRASIL' },
    { value: 'NÃO INFORMADO', label: 'Não Informado' }
  ];

  // Inicializar períodos quando o componente montar
  useEffect(() => {
    const inicializar = async () => {
      setInicializando(true);
      try {
        // Obter períodos disponíveis
        const periodosDisponiveis = getPeriodosDisponiveis();
        setPeriodos(periodosDisponiveis);
        
        // Definir período atual como padrão
        const periodoPadrao = getPeriodoPadrao();
        const periodoAtual = `${periodoPadrao.dataInicial}_${periodoPadrao.dataFinal}`;
        
        setFiltros({
          periodo: periodoAtual,
          local: 'todos'
        });

        console.log('📅 Período inicializado:', periodoAtual);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      } finally {
        setInicializando(false);
      }
    };

    inicializar();
  }, []);

  // Função para buscar dados reais com JOIN entre as tabelas
  const buscarDadosEquipamentos = async () => {
    setCarregando(true);
    
    try {
      if (!filtros.periodo) {
        console.log('❌ Período não selecionado');
        setDadosGrafico([]);
        return;
      }

      // Extrair datas do período selecionado
      const [dataInicial, dataFinal] = filtros.periodo.split('_');
      
      console.log('🔍 Buscando dados para período:', {
        dataInicial: formatarDataBR(dataInicial),
        dataFinal: formatarDataBR(dataFinal),
        local: filtros.local
      });

      // Primeiro, buscar as operações que correspondem ao filtro de data
      let queryOperacoes = supabase
        .from('registro_operacoes')
        .select('id, op, data')
        .gte('data', dataInicial)
        .lte('data', dataFinal)
        .order('data', { ascending: false });

      const { data: operacoes, error: errorOperacoes } = await queryOperacoes;

      if (errorOperacoes) {
        console.error('❌ Erro ao buscar operações:', errorOperacoes);
        throw new Error(`Erro ao buscar operações: ${errorOperacoes.message}`);
      }

      console.log('✅ Operações encontradas:', operacoes?.length || 0);

      if (!operacoes || operacoes.length === 0) {
        console.log('📭 Nenhuma operação encontrada para o período selecionado');
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
      
      console.log('📊 Dados processados:', dadosOrdenados);
      setDadosGrafico(dadosOrdenados);

    } catch (error: any) {
      console.error('❌ Erro ao processar dados:', error);
      setDadosGrafico([]);
    } finally {
      setCarregando(false);
    }
  };

  // Buscar dados quando filtros mudarem
  useEffect(() => {
    if (!inicializando && filtros.periodo) {
      buscarDadosEquipamentos();
    }
  }, [filtros, inicializando]);

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    buscarDadosEquipamentos();
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    const periodoPadrao = getPeriodoPadrao();
    const periodoAtual = `${periodoPadrao.dataInicial}_${periodoPadrao.dataFinal}`;
    
    setFiltros({
      periodo: periodoAtual,
      local: 'todos'
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
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Operações</h1>
              <p className="text-blue-200">
                Análise de horas trabalhadas por local - Período: 16 a 15 do mês seguinte
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
            Filtros - Período e Local
          </CardTitle>
          <CardDescription className="text-blue-200">
            Selecione o período (16 a 15) e local para análise das horas trabalhadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Período */}
            <div className="space-y-2">
              <Label htmlFor="periodo" className="text-white">Período (16 a 15)</Label>
              <Select 
                value={filtros.periodo} 
                onValueChange={(value) => setFiltros({ ...filtros, periodo: value })}
              >
                <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((periodo) => (
                    <SelectItem key={periodo.value} value={periodo.value}>
                      {periodo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtros.periodo && (
                <p className="text-orange-300 text-xs mt-1">
                  Período selecionado
                </p>
              )}
            </div>

            {/* Local */}
            <div className="space-y-2">
              <Label htmlFor="local" className="text-white">Local</Label>
              <Select 
                value={filtros.local} 
                onValueChange={(value) => setFiltros({ ...filtros, local: value })}
              >
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
                disabled={carregando || !filtros.periodo}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                <p className="text-blue-200 text-xs">Registros no período</p>
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
                <p className="text-blue-200 text-sm">Média por Equipamento</p>
                <p className="text-3xl font-bold">
                  {totais.quantidade > 0 ? (totais.horas / totais.quantidade).toFixed(1) : '0'}h
                </p>
                <p className="text-blue-200 text-xs">Horas por equipamento</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <PieChart className="h-6 w-6 text-purple-300" />
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
            Distribuição de Horas Trabalhadas
            {carregando && (
              <span className="text-orange-400 text-sm font-normal">(Atualizando...)</span>
            )}
          </CardTitle>
          <CardDescription className="text-blue-200">
            {filtros.periodo && (
              <>
                Período: {formatarDataBR(filtros.periodo.split('_')[0])} a {formatarDataBR(filtros.periodo.split('_')[1])}
                {totais.horas > 0 && (
                  <span className="text-green-300 ml-2">
                    • {totais.quantidade} equipamentos • {totais.horas.toFixed(1)} horas totais
                  </span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!filtros.periodo ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-center">
                <p>Selecione um período para visualizar os dados</p>
                <p className="text-sm text-blue-200 mt-2">
                  Os períodos seguem o padrão de 16 a 15 do mês seguinte
                </p>
              </div>
            </div>
          ) : carregando ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Carregando dados das operações...</p>
              </div>
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
                      <Clock className="h-4 w-4 text-blue-300 mx-auto mb-2" />
                      <div className="text-blue-200 text-sm">Total de Horas</div>
                      <div className="text-white text-xl font-bold">{totais.horas.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <Users className="h-4 w-4 text-green-300 mx-auto mb-2" />
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

      {/* Tabela Detalhada */}
      <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detalhamento por Local
          </CardTitle>
          <CardDescription className="text-blue-200">
            Análise detalhada das horas trabalhadas em cada local
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!filtros.periodo ? (
            <div className="text-center py-8 text-blue-200">
              Selecione um período para ver os detalhes
            </div>
          ) : dadosGrafico.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4">Local</th>
                    <th className="text-right py-3 px-4">Equipamentos</th>
                    <th className="text-right py-3 px-4">Horas Trabalhadas</th>
                    <th className="text-right py-3 px-4">Porcentagem</th>
                    <th className="text-right py-3 px-4">Média por Equip.</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosGrafico.map((item, index) => (
                    <tr key={item.local} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${cores[index % cores.length]}`} />
                          {item.local}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium">{item.quantidade}</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-bold">{item.horas.toFixed(1)}h</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-blue-400 h-2 rounded-full"
                              style={{ width: `${item.porcentagem}%` }}
                            />
                          </div>
                          <span className="w-8 text-right">{item.porcentagem}%</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-orange-300 font-medium">
                          {item.quantidade > 0 ? (item.horas / item.quantidade).toFixed(1) : '0'}h
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de totais */}
                  <tr className="bg-white/10 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="text-right py-3 px-4">{totais.quantidade}</td>
                    <td className="text-right py-3 px-4">{totais.horas.toFixed(1)}h</td>
                    <td className="text-right py-3 px-4">100%</td>
                    <td className="text-right py-3 px-4">
                      {totais.quantidade > 0 ? (totais.horas / totais.quantidade).toFixed(1) : '0'}h
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Visuais;