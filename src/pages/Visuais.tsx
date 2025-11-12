import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Download, Filter, Calendar, PieChart, ArrowLeft } from 'lucide-react';
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

  // Buscar a última data disponível no banco de dados (da tabela registro_operacoes)
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

  // Obter data de 7 dias atrás (com correção de fuso)
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

  const [dadosGrafico, setDadosGrafico] = useState<ChartData[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  // Locais disponíveis para filtro
  const locais = [
    { value: 'todos', label: 'Todos os Locais' },
    { value: 'HYDRO', label: 'HYDRO' },
    { value: 'NAVIO', label: 'NAVIO' },
    { value: 'ALBRAS', label: 'ALBRAS' },
    { value: 'SANTOS BRASIL', label: 'SANTOS BRASIL' }
  ];

  // Função para buscar dados reais com JOIN entre as tabelas
  const buscarDadosEquipamentos = async () => {
    setCarregando(true);
    
    try {
      console.log('🔍 Buscando dados com JOIN entre tabelas...');
      console.log('📅 Filtros aplicados:', {
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        local: filtros.local
      });

      // Primeiro, buscar as operações que correspondem ao filtro de data
      let queryOperacoes = supabase
        .from('registro_operacoes')
        .select('id, op, data')
        .order('data', { ascending: false });

      // Aplicar filtro de data na tabela registro_operacoes
      if (filtros.dataInicial) {
        const dataInicialCorrigida = corrigirFusoHorarioData(filtros.dataInicial);
        console.log('📅 Aplicando filtro data inicial (corrigida):', dataInicialCorrigida);
        queryOperacoes = queryOperacoes.gte('data', dataInicialCorrigida);
      }

      if (filtros.dataFinal) {
        const dataFinalCorrigida = corrigirFusoHorarioData(filtros.dataFinal);
        console.log('📅 Aplicando filtro data final (corrigida):', dataFinalCorrigida);
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
      console.log('📋 IDs das operações:', operacaoIds);

      // Agora buscar os equipamentos relacionados a essas operações
      let queryEquipamentos = supabase
        .from('equipamentos')
        .select('local, horas_trabalhadas, registro_operacoes_id')
        .in('registro_operacoes_id', operacaoIds);

      // Aplicar filtro de local se necessário
      if (filtros.local !== 'todos') {
        console.log('🏭 Aplicando filtro local:', filtros.local);
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
      console.log('📈 Total de horas:', totalHoras);
      setDadosGrafico(dadosOrdenados);

    } catch (error: any) {
      console.error('❌ Erro ao processar dados:', error);
      // Em caso de erro, definir array vazio
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
    }
  }, [filtros, inicializando]);

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

  // Debug: mostrar dados filtrados no console
  useEffect(() => {
    if (!inicializando) {
      console.log('📈 Dados do gráfico:', dadosGrafico);
      console.log('🧮 Totais:', totais);
      console.log('⚙️ Filtros aplicados:', {
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        dataInicialFormatada: formatarDataBR(filtros.dataInicial),
        dataFinalFormatada: formatarDataBR(filtros.dataFinal),
        local: filtros.local
      });
    }
  }, [dadosGrafico, filtros, inicializando]);

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
                Horas trabalhadas por local - Dados reais das operações
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

      {/* Filtros */}
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
                <p className="text-blue-200 text-sm">Locais com Equipamentos</p>
                <p className="text-3xl font-bold">{dadosGrafico.length}</p>
                <p className="text-blue-200 text-xs">Locais distintos</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-purple-300" />
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
    </div>
  );
};

export default Visuais;