import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Download, Filter, Calendar, PieChart, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Interface para os dados do gráfico
interface ChartData {
  local: string;
  horas: number;
  quantidade: number;
  porcentagem: number;
}

// Interface para simular registros da tabela equipamentos
interface EquipamentoSimulado {
  id: string;
  local: string;
  horas_trabalhadas: number;
  created_at: string;
}

const Visuais = () => {
  const navigate = useNavigate();
  
  // Obter data atual no formato YYYY-MM-DD
  const getDataAtual = () => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  };

  // Obter data de 7 dias atrás
  const getDataInicialPadrao = () => {
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);
    return seteDiasAtras.toISOString().split('T')[0];
  };

  const [filtros, setFiltros] = useState({
    dataInicial: getDataInicialPadrao(),
    dataFinal: getDataAtual(),
    local: 'todos'
  });

  const [dadosGrafico, setDadosGrafico] = useState<ChartData[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Locais disponíveis para filtro
  const locais = [
    { value: 'todos', label: 'Todos os Locais' },
    { value: 'HYDRO', label: 'HYDRO' },
    { value: 'NAVIO', label: 'NAVIO' },
    { value: 'ALBRAS', label: 'ALBRAS' },
    { value: 'SANTOS BRASIL', label: 'SANTOS BRASIL' }
  ];

  // Simular dados da tabela equipamentos (substituir pela API real)
  const simularDadosEquipamentos = (): EquipamentoSimulado[] => {
    const equipamentos: EquipamentoSimulado[] = [];
    const locaisDisponiveis = ['HYDRO', 'NAVIO', 'ALBRAS', 'SANTOS BRASIL'];
    
    // Gerar dados para os últimos 30 dias
    for (let i = 0; i < 100; i++) {
      const local = locaisDisponiveis[Math.floor(Math.random() * locaisDisponiveis.length)];
      const horas = parseFloat((Math.random() * 12 + 4).toFixed(1)); // 4-16 horas
      const diasAtras = Math.floor(Math.random() * 30);
      const data = new Date();
      data.setDate(data.getDate() - diasAtras);
      
      equipamentos.push({
        id: `eq-${i}`,
        local,
        horas_trabalhadas: horas,
        created_at: data.toISOString().split('T')[0]
      });
    }

    // Adicionar alguns dados específicos para garantir valores consistentes
    equipamentos.push(
      { id: 'eq-hydro-1', local: 'HYDRO', horas_trabalhadas: 8.5, created_at: getDataAtual() },
      { id: 'eq-hydro-2', local: 'HYDRO', horas_trabalhadas: 7.0, created_at: getDataAtual() },
      { id: 'eq-navio-1', local: 'NAVIO', horas_trabalhadas: 6.0, created_at: getDataAtual() },
      { id: 'eq-albras-1', local: 'ALBRAS', horas_trabalhadas: 9.5, created_at: getDataAtual() },
      { id: 'eq-santos-1', local: 'SANTOS BRASIL', horas_trabalhadas: 8.0, created_at: getDataAtual() }
    );

    return equipamentos;
  };

  // Função para processar dados com filtros aplicados
  const processarDadosComFiltros = (equipamentos: EquipamentoSimulado[]) => {
    let equipamentosFiltrados = [...equipamentos];

    // Aplicar filtro de data
    if (filtros.dataInicial) {
      equipamentosFiltrados = equipamentosFiltrados.filter(eq => 
        eq.created_at >= filtros.dataInicial
      );
    }

    if (filtros.dataFinal) {
      equipamentosFiltrados = equipamentosFiltrados.filter(eq => 
        eq.created_at <= filtros.dataFinal
      );
    }

    // Aplicar filtro de local
    if (filtros.local !== 'todos') {
      equipamentosFiltrados = equipamentosFiltrados.filter(eq => 
        eq.local === filtros.local
      );
    }

    // Agrupar por local e calcular totais
    const agrupadoPorLocal = equipamentosFiltrados.reduce((acc, equipamento) => {
      if (!acc[equipamento.local]) {
        acc[equipamento.local] = {
          horas: 0,
          quantidade: 0
        };
      }
      
      acc[equipamento.local].horas += equipamento.horas_trabalhadas;
      acc[equipamento.local].quantidade += 1;
      
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

    return dadosComPorcentagem.sort((a, b) => b.horas - a.horas);
  };

  // Função para buscar dados das horas trabalhadas da tabela equipamentos
  const buscarHorasTrabalhadas = async () => {
    setCarregando(true);
    
    try {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 800));

      // EM PRODUÇÃO: Substituir por chamada real à API
      /*
      const response = await fetch('/api/dashboard/horas-equipamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataInicial: filtros.dataInicial,
          dataFinal: filtros.dataFinal,
          local: filtros.local === 'todos' ? null : filtros.local
        })
      });

      const dados = await response.json();
      setDadosGrafico(dados);
      */

      // SIMULAÇÃO: Usar dados simulados e aplicar filtros
      const equipamentosSimulados = simularDadosEquipamentos();
      const dadosProcessados = processarDadosComFiltros(equipamentosSimulados);
      setDadosGrafico(dadosProcessados);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      // Em caso de erro, usar dados simulados
      const equipamentosSimulados = simularDadosEquipamentos();
      const dadosProcessados = processarDadosComFiltros(equipamentosSimulados);
      setDadosGrafico(dadosProcessados);
    } finally {
      setCarregando(false);
    }
  };

  // Buscar dados quando o componente montar
  useEffect(() => {
    buscarHorasTrabalhadas();
  }, []);

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    buscarHorasTrabalhadas();
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      dataInicial: getDataInicialPadrao(),
      dataFinal: getDataAtual(),
      local: 'todos'
    });
    // Não buscar automaticamente ao limpar - usuário precisa clicar em aplicar
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
    'bg-cyan-500'
  ];

  // Calcular totais
  const totais = dadosGrafico.reduce((acc, item) => ({
    horas: acc.horas + item.horas,
    quantidade: acc.quantidade + item.quantidade
  }), { horas: 0, quantidade: 0 });

  // Debug: mostrar dados filtrados no console
  useEffect(() => {
    console.log('Dados do gráfico:', dadosGrafico);
    console.log('Totais:', totais);
  }, [dadosGrafico]);

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
                Horas trabalhadas por local - Dados da tabela Equipamentos
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
            Filtros - Equipamentos
          </CardTitle>
          <CardDescription className="text-blue-200">
            Filtre as horas trabalhadas da tabela de equipamentos
            {filtros.dataInicial && filtros.dataFinal && (
              <span className="block text-orange-300 mt-1">
                Período: {new Date(filtros.dataInicial).toLocaleDateString('pt-BR')} até {new Date(filtros.dataFinal).toLocaleDateString('pt-BR')}
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
                max={filtros.dataFinal || getDataAtual()}
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
                max={getDataAtual()}
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
            Horas Trabalhadas - Equipamentos
            {carregando && (
              <span className="text-orange-400 text-sm font-normal">(Atualizando...)</span>
            )}
          </CardTitle>
          <CardDescription className="text-blue-200">
            Distribuição das horas trabalhadas por local (coluna horas_trabalhadas)
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
              <div className="text-white animate-pulse">Carregando dados dos equipamentos...</div>
            </div>
          ) : dadosGrafico.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-center">
                <p>Nenhum dado encontrado para os filtros aplicados</p>
                <p className="text-sm text-blue-200 mt-2">
                  Tente ajustar as datas ou selecionar outro local
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
                          className={`absolute inset-0 rounded-full ${cores[index]} opacity-80`}
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
                        <div className={`w-4 h-4 rounded ${cores[index]}`} />
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