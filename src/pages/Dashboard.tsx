// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, FilterIcon, Bell, FileText, Ship, BarChart2 } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registra os componentes necessários do Chart.js
ChartJS.register(ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface EquipamentoOperacao {
  id: string;
  local: string; // 'HYDRO', 'ALBRAS', 'NAVIO', 'SANTOS BRASIL'
  tag: string; // Ex: "CB-123", "EST-5"
  hora_inicial: string | null;
  hora_final: string | null;
}

const Dashboard = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOperacao[]>([]);
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [filtroLocal, setFiltroLocal] = useState<string>('Todos');
  const [filtroTipoEquipamento, setFiltroTipoEquipamento] = useState<string>('Todos');

  // Carregar dados do Supabase
  useEffect(() => {
    const fetchEquipamentos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('equipamentos')
          .select('local, tag, hora_inicial, hora_final')
          .eq('hora_inicial IS NOT NULL', true)
          .eq('hora_final IS NOT NULL', true);

        if (error) throw error;

        let filtered = data || [];

        // Filtrar por data
        if (filtroDataInicio || filtroDataFim) {
          filtered = filtered.filter(item => {
            const dataEq = new Date(item.hora_inicial!).toISOString().split('T')[0];
            if (filtroDataInicio && dataEq < filtroDataInicio) return false;
            if (filtroDataFim && dataEq > filtroDataFim) return false;
            return true;
          });
        }

        // Filtrar por local
        if (filtroLocal !== 'Todos') {
          filtered = filtered.filter(eq => eq.local === filtroLocal);
        }

        // Filtrar por tipo de equipamento (prefixo antes do '-')
        if (filtroTipoEquipamento !== 'Todos') {
          filtered = filtered.filter(eq => {
            const prefixo = eq.tag.split('-')[0];
            return prefixo === filtroTipoEquipamento;
          });
        }

        setEquipamentos(filtered);
      } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipamentos();
  }, [filtroDataInicio, filtroDataFim, filtroLocal, filtroTipoEquipamento]);

  // Função auxiliar para calcular diferença em horas entre dois times
  const calcularHorasDiferenca = (inicio: string, fim: string): number => {
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    let totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMinutos < 0) totalMinutos += 24 * 60; // Se passou da meia-noite
    return totalMinutos / 60; // Retorna em horas
  };

  // 🟠 GRÁFICO DE PIZZA: Horas por Local
  const gerarDadosPizza = () => {
    const locais = ['HYDRO', 'ALBRAS', 'NAVIO', 'SANTOS BRASIL'];
    const somasPorLocal = locais.map(local => {
      return equipamentos
        .filter(eq => eq.local === local)
        .reduce((acc, eq) => acc + calcularHorasDiferenca(eq.hora_inicial!, eq.hora_final!), 0);
    });

    const total = somasPorLocal.reduce((a, b) => a + b, 0);
    const porcentagens = somasPorLocal.map(soma => (total > 0 ? (soma / total) * 100 : 0));

    return {
      labels: locais,
      datasets: [
        {
           porcentagens,
          backgroundColor: [
            '#3B82F6', // HYDRO - Azul
            '#EF4444', // ALBRAS - Vermelho
            '#10B981', // NAVIO - Verde
            '#8B5CF6', // SANTOS BRASIL - Roxo
          ],
          borderColor: ['#fff'],
          borderWidth: 1,
        },
      ],
    };
  };

  // 🟢 GRÁFICO DE BARRAS: Horas por Tipo de Equipamento (prefixo)
  const gerarDadosBarras = () => {
    const tipos: Record<string, number> = {};
    equipamentos.forEach(eq => {
      const prefixo = eq.tag.split('-')[0];
      if (!prefixo) return;
      const horas = calcularHorasDiferenca(eq.hora_inicial!, eq.hora_final!);
      tipos[prefixo] = (tipos[prefixo] || 0) + horas;
    });

    const labels = Object.keys(tipos);
    const valores = Object.values(tipos);

    return {
      labels,
      datasets: [
        {
          label: 'Horas Operadas',
           valores,
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1,
        },
      ],
    };
  };

  // Obter todos os tipos únicos de equipamento (prefixos)
  const tiposEquipamentos = Array.from(
    new Set(equipamentos.map(eq => eq.tag.split('-')[0]).filter(Boolean))
  );

  // Filtros disponíveis
  const filtrosLocais = ['Todos', 'HYDRO', 'ALBRAS', 'NAVIO', 'SANTOS BRASIL'];

  // Formatar valor para mostrar como "X.XX h"
  const formatarHoras = (valor: number): string => {
    return `${valor.toFixed(2)} h`;
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-lg opacity-90">{userProfile?.full_name || 'Usuário'}</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/auth'}
          className="text-white hover:bg-white/20"
        >
          Sair
        </Button>
      </div>

      {/* Filtros */}
      <div className="px-6 py-6 space-y-4">
        <Card className="shadow-[var(--shadow-card)] bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Data Início */}
              <div className="space-y-2">
                <Label htmlFor="data-inicio">Data Início</Label>
                <div className="relative">
                  <Input
                    id="data-inicio"
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="data-fim">Data Fim</Label>
                <div className="relative">
                  <Input
                    id="data-fim"
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Local */}
              <div className="space-y-2">
                <Label htmlFor="filtro-local">Local</Label>
                <Select value={filtroLocal} onValueChange={setFiltroLocal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosLocais.map(local => (
                      <SelectItem key={local} value={local}>
                        {local === 'Todos' ? 'Todos os Locais' : local}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Equipamento */}
              <div className="space-y-2">
                <Label htmlFor="filtro-tipo">Tipo Equipamento</Label>
                <Select value={filtroTipoEquipamento} onValueChange={setFiltroTipoEquipamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos os Tipos</SelectItem>
                    {tiposEquipamentos.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Limpar */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiltroDataInicio('');
                    setFiltroDataFim('');
                    setFiltroLocal('Todos');
                    setFiltroTipoEquipamento('Todos');
                  }}
                  className="w-full"
                >
                  <FilterIcon className="h-4 w-4 mr-2" /> Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="px-6 space-y-6">
        {/* Gráfico de Pizza */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Distribuição de Horas por Local</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <div style={{ width: '300px', height: '300px' }}>
                  <Pie data={gerarDadosPizza()} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg min-w-64">
                  <h4 className="font-semibold mb-3">Resumo</h4>
                  {['HYDRO', 'ALBRAS', 'NAVIO', 'SANTOS BRASIL'].map(local => {
                    const total = equipamentos
                      .filter(eq => eq.local === local)
                      .reduce((acc, eq) => acc + calcularHorasDiferenca(eq.hora_inicial!, eq.hora_final!), 0);
                    return (
                      <div key={local} className="flex justify-between py-1">
                        <span>{local}</span>
                        <span className="font-medium">{formatarHoras(total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Total de Horas por Tipo de Equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: '400px' }}>
                <Bar data={gerarDadosBarras()} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-[var(--shadow-card)] bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-sm opacity-90">Total de Equipamentos</h3>
              <p className="text-3xl font-bold mt-2">{equipamentos.length}</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-sm opacity-90">Horas Totais Operadas</h3>
              <p className="text-3xl font-bold mt-2">
                {formatarHoras(
                  equipamentos.reduce(
                    (acc, eq) => acc + calcularHorasDiferenca(eq.hora_inicial!, eq.hora_final!),
                    0
                  )
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-sm opacity-90">Média por Equipamento</h3>
              <p className="text-3xl font-bold mt-2">
                {equipamentos.length > 0
                  ? formatarHoras(
                      equipamentos.reduce(
                        (acc, eq) => acc + calcularHorasDiferenca(eq.hora_inicial!, eq.hora_final!),
                        0
                      ) / equipamentos.length
                    )
                  : '0.00 h'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-sm opacity-90">Locais Ativos</h3>
              <p className="text-3xl font-bold mt-2">
                {new Set(equipamentos.map(eq => eq.local)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* BOTÕES DE ACESSO RÁPIDO */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
          <Card className="shadow-[var(--shadow-card)] hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/relatorio-transporte'}
                className="w-full h-24 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg shadow-md"
              >
                <FileText className="h-8 w-8 mr-3" />
                RELATÓRIO DE TRANSPORTE
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/navios'}
                className="w-full h-24 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg shadow-md"
              >
                <Ship className="h-8 w-8 mr-3" />
                NAVIOS
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/notificacao'}
                className="w-full h-24 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg shadow-md relative"
              >
                {hasUnread && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                <Bell className="h-8 w-8 mr-3" />
                NOTIFICAÇÕES
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;