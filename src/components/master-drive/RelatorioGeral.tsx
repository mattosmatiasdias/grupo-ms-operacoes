// src/components/master-drive/RelatorioGeral.tsx
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, BookOpen, Calendar, TrendingUp, Target, CheckCircle, BarChart3, LineChart } from 'lucide-react';
import { Treinamento, ColaboradorTreinado, Colaborador } from '@/types/masterDrive';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface RelatorioGeralProps {
  treinamentos: Treinamento[];
  colaboradoresTreinados: ColaboradorTreinado[];
  colaboradores: Colaborador[];
  anoReferencia?: number;
}

// Função para formatar carga horária
const formatarCargaHoraria = (horas: number): string => {
  if (!horas && horas !== 0) return '0h';
  if (horas === 0) return '0h';
  if (horas < 1) {
    const minutos = Math.round(horas * 60);
    return `${minutos}min`;
  }
  if (horas === Math.floor(horas)) return `${horas}h`;
  return `${horas.toFixed(1)}h`;
};

// Função segura para converter string de horas para número
const converterHorasParaNumero = (cargaHoraria: string | number | undefined): number => {
  if (!cargaHoraria) return 0;
  if (typeof cargaHoraria === 'number') return cargaHoraria;
  if (typeof cargaHoraria === 'string') {
    const match = cargaHoraria.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      return parseInt(match[1]) + parseInt(match[2]) / 60;
    }
    const num = parseFloat(cargaHoraria);
    if (!isNaN(num)) return num;
  }
  return 0;
};

// Gerar períodos de 16 ao 15 do mês seguinte
const gerarPeriodos = (ano: number): { label: string; inicio: Date; fim: Date; ordem: number }[] => {
  const periodos = [];
  
  const periodosConfig = [
    { mesInicio: 11, anoInicio: 2025, mesFim: 0, anoFim: 2026, label: "DEZ/JAN", ordem: 1 },
    { mesInicio: 0, anoInicio: 2026, mesFim: 1, anoFim: 2026, label: "JAN/FEV", ordem: 2 },
    { mesInicio: 1, anoInicio: 2026, mesFim: 2, anoFim: 2026, label: "FEV/MAR", ordem: 3 },
    { mesInicio: 2, anoInicio: 2026, mesFim: 3, anoFim: 2026, label: "MAR/ABR", ordem: 4 },
    { mesInicio: 3, anoInicio: 2026, mesFim: 4, anoFim: 2026, label: "ABR/MAI", ordem: 5 },
    { mesInicio: 4, anoInicio: 2026, mesFim: 5, anoFim: 2026, label: "MAI/JUN", ordem: 6 },
    { mesInicio: 5, anoInicio: 2026, mesFim: 6, anoFim: 2026, label: "JUN/JUL", ordem: 7 },
    { mesInicio: 6, anoInicio: 2026, mesFim: 7, anoFim: 2026, label: "JUL/AGO", ordem: 8 },
    { mesInicio: 7, anoInicio: 2026, mesFim: 8, anoFim: 2026, label: "AGO/SET", ordem: 9 },
    { mesInicio: 8, anoInicio: 2026, mesFim: 9, anoFim: 2026, label: "SET/OUT", ordem: 10 },
    { mesInicio: 9, anoInicio: 2026, mesFim: 10, anoFim: 2026, label: "OUT/NOV", ordem: 11 },
    { mesInicio: 10, anoInicio: 2026, mesFim: 11, anoFim: 2026, label: "NOV/DEZ", ordem: 12 },
    { mesInicio: 11, anoInicio: 2026, mesFim: 0, anoFim: 2027, label: "DEZ/JAN", ordem: 13 }
  ];
  
  for (const config of periodosConfig) {
    const dataInicio = new Date(config.anoInicio, config.mesInicio, 16);
    const dataFim = new Date(config.anoFim, config.mesFim, 15);
    
    periodos.push({
      label: config.label,
      inicio: dataInicio,
      fim: dataFim,
      ordem: config.ordem
    });
  }
  
  return periodos;
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-sm z-50">
        <p className="font-bold text-slate-300 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function RelatorioGeral({ treinamentos, colaboradoresTreinados, colaboradores, anoReferencia = 2026 }: RelatorioGeralProps) {
  
  const periodos = useMemo(() => gerarPeriodos(anoReferencia), [anoReferencia]);
  
  // ===== VALORES ACUMULADOS (ANO TODO - SEM FILTRO) =====
  const valoresAcumulados = useMemo(() => {
    try {
      // Horas Aulas = soma da carga_horaria_base (duração do curso)
      const horasAulasTotal = (treinamentos || []).reduce((sum, t) => {
        return sum + converterHorasParaNumero(t?.carga_horaria_base);
      }, 0);
      
      // Horas Investidas = soma das horas individuais dos colaboradores
      const horasInvestidasTotal = (colaboradoresTreinados || []).reduce((sum, c) => sum + (c?.carga_horaria || 0), 0);
      
      // Total de Treinamentos
      const treinamentosTotal = (treinamentos || []).length;
      
      // Colaboradores únicos treinados
      const colaboradoresUnicos = new Set((colaboradoresTreinados || []).map(c => c?.colaborador_id).filter(Boolean)).size;
      
      // Total de participações
      const participacoesTotal = (colaboradoresTreinados || []).length;
      
      // Média de horas por colaborador
      const mediaHorasPorColab = colaboradoresUnicos > 0 ? horasInvestidasTotal / colaboradoresUnicos : 0;
      
      return {
        horasAulas: horasAulasTotal,
        horasInvestidas: horasInvestidasTotal,
        treinamentos: treinamentosTotal,
        colaboradores: colaboradoresUnicos,
        participacoes: participacoesTotal,
        mediaHoras: mediaHorasPorColab
      };
    } catch (err) {
      console.error("Erro ao calcular valores acumulados:", err);
      return {
        horasAulas: 0,
        horasInvestidas: 0,
        treinamentos: 0,
        colaboradores: 0,
        participacoes: 0,
        mediaHoras: 0
      };
    }
  }, [treinamentos, colaboradoresTreinados]);

  // ===== DADOS POR PERÍODO (apenas com valores) =====
  const dadosPorPeriodo = useMemo(() => {
    try {
      const todosPeriodos = periodos.map(periodo => {
        // Treinamentos no período
        const treinosNoPeriodo = (treinamentos || []).filter(t => {
          if (!t?.data_treinamento) return false;
          try {
            const data = new Date(t.data_treinamento);
            return data >= periodo.inicio && data <= periodo.fim;
          } catch {
            return false;
          }
        });
        
        // Colaboradores treinados no período
        const colabsNoPeriodo = (colaboradoresTreinados || []).filter(c => {
          if (!c?.data_treinamento) return false;
          try {
            const data = new Date(c.data_treinamento);
            return data >= periodo.inicio && data <= periodo.fim;
          } catch {
            return false;
          }
        });
        
        // Horas Aulas = soma da carga_horaria_base
        const horasAulas = treinosNoPeriodo.reduce((sum, t) => 
          sum + converterHorasParaNumero(t?.carga_horaria_base), 0);
        
        // Horas Investidas = soma das horas individuais
        const horasInvestidas = colabsNoPeriodo.reduce((sum, c) => sum + (c?.carga_horaria || 0), 0);
        
        return {
          periodo: periodo.label,
          ordem: periodo.ordem,
          horasAulas: horasAulas,
          horasInvestidas: horasInvestidas,
          quantidadeTreinamentos: treinosNoPeriodo.length,
          quantidadeParticipacoes: colabsNoPeriodo.length
        };
      });
      
      // Filtrar apenas períodos que têm pelo menos um valor > 0
      const filtrados = todosPeriodos.filter(p => 
        p.horasAulas > 0 || 
        p.horasInvestidas > 0 || 
        p.quantidadeTreinamentos > 0 || 
        p.quantidadeParticipacoes > 0
      );
      
      // Ordenar por ordem
      return filtrados.sort((a, b) => a.ordem - b.ordem);
    } catch (err) {
      console.error("Erro ao calcular dados por período:", err);
      return [];
    }
  }, [treinamentos, colaboradoresTreinados, periodos]);

  // ===== COLABORADORES POR FUNÇÃO (ACUMULADO) =====
  const colaboradoresPorFuncao = useMemo(() => {
    try {
      const funcoes = ['TRUCK', 'CARRETEIRO', 'PIPA', 'OPERADOR', 'AJUDANTE'];
      
      const colaboradoresUnicosPorFuncao: Record<string, Set<string>> = {};
      funcoes.forEach(f => { colaboradoresUnicosPorFuncao[f] = new Set(); });
      
      (colaboradoresTreinados || []).forEach(c => {
        const funcao = (c?.colaborador_funcao || '').toUpperCase();
        if (colaboradoresUnicosPorFuncao[funcao] && c?.colaborador_id) {
          colaboradoresUnicosPorFuncao[funcao].add(c.colaborador_id);
        }
      });
      
      const total = new Set((colaboradoresTreinados || []).map(c => c?.colaborador_id).filter(Boolean)).size;
      const maxFunc = Math.max(...Object.values(colaboradoresUnicosPorFuncao).map(s => s.size), 1);
      
      const cores: Record<string, string> = {
        TRUCK: '#00d4aa',
        CARRETEIRO: '#0ea5e9',
        PIPA: '#f59e0b',
        OPERADOR: '#ef4444',
        AJUDANTE: '#8b5cf6'
      };
      
      const resultado = funcoes.map(funcao => ({
        nome: funcao,
        quantidade: colaboradoresUnicosPorFuncao[funcao].size,
        percentualBarra: total > 0 ? (colaboradoresUnicosPorFuncao[funcao].size / maxFunc) * 100 : 0,
        percentualTotal: total > 0 ? (colaboradoresUnicosPorFuncao[funcao].size / total) * 100 : 0,
        cor: cores[funcao] || '#6b7280'
      }));
      
      return { dados: resultado, total };
    } catch (err) {
      console.error("Erro ao calcular colaboradores por função:", err);
      return { dados: [], total: 0 };
    }
  }, [colaboradoresTreinados]);

  // ===== TÓPICOS PRINCIPAIS (ACUMULADO) =====
  const topicosPrincipais = useMemo(() => {
    try {
      const topicos: Record<string, { horas: number; participacoes: number }> = {};
      
      (colaboradoresTreinados || []).forEach(c => {
        const topico = c?.topico || 'Outros';
        if (!topicos[topico]) {
          topicos[topico] = { horas: 0, participacoes: 0 };
        }
        topicos[topico].horas += c?.carga_horaria || 0;
        topicos[topico].participacoes++;
      });
      
      const lista = Object.entries(topicos)
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 5);
      
      const maxHoras = Math.max(...lista.map(l => l.horas), 1);
      
      return lista.map(topico => ({
        ...topico,
        percentualBarra: (topico.horas / maxHoras) * 100
      }));
    } catch (err) {
      console.error("Erro ao calcular tópicos principais:", err);
      return [];
    }
  }, [colaboradoresTreinados]);

  // Validar se temos dados
  const temDados = (treinamentos && treinamentos.length > 0) || (colaboradoresTreinados && colaboradoresTreinados.length > 0);

  if (!temDados) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-xl">
        <BookOpen className="h-16 w-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300">Nenhum dado disponível</h3>
        <p className="text-slate-500 mt-2">Cadastre treinamentos para visualizar o relatório.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* TÍTULO */}
      <div>
        <h2 className="text-2xl font-bold text-white">Relatório Geral</h2>
        <p className="text-slate-400 text-sm mt-1">Análise completa de treinamentos e capacitações - Ano {anoReferencia}</p>
      </div>

      {/* SEÇÃO 1: KPIS PRINCIPAIS (ACUMULADO DO ANO) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-1 bg-emerald-500 rounded-full" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Acumulado do Ano {anoReferencia}</h3>
          <span className="text-[10px] text-slate-500">(Todos os períodos)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Horas Aulas */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Horas Aulas</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{formatarCargaHoraria(valoresAcumulados.horasAulas)}</h3>
              <p className="text-xs text-slate-400 mt-2">{valoresAcumulados.treinamentos} eventos</p>
            </CardContent>
          </Card>

          {/* 2. Horas Investidas */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-teal-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Horas Investidas</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{formatarCargaHoraria(valoresAcumulados.horasInvestidas)}</h3>
              <p className="text-xs text-slate-400 mt-2">Soma horas por colaborador</p>
            </CardContent>
          </Card>

          {/* 3. Treinamentos */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Treinamentos</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{valoresAcumulados.treinamentos}</h3>
              <p className="text-xs text-slate-400 mt-2">Total de treinamentos</p>
            </CardContent>
          </Card>

          {/* 4. Colaboradores Treinados */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Colaboradores</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{valoresAcumulados.colaboradores}</h3>
              <p className="text-xs text-slate-400 mt-2">Colaboradores únicos</p>
            </CardContent>
          </Card>

          {/* 5. Participações */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-4 w-4 text-rose-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Participações</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{valoresAcumulados.participacoes}</h3>
              <p className="text-xs text-slate-400 mt-2">Inscrições em treinamentos</p>
            </CardContent>
          </Card>

          {/* 6. Média Horas/Colab */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md ring-1 ring-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Média/Colab</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-none">{formatarCargaHoraria(valoresAcumulados.mediaHoras)}</h3>
              <p className="text-xs text-purple-400 mt-2 font-medium">Indicador Chave</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 2: GRÁFICOS DE HORAS (LADO A LADO) */}
      {dadosPorPeriodo.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Evolução de Horas Aulas */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <LineChart className="h-4 w-4 text-emerald-400" />
                Evolução de Horas Aulas
              </CardTitle>
              <p className="text-xs text-slate-500">Carga horária dos treinamentos por período</p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={dadosPorPeriodo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="periodo" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => formatarCargaHoraria(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                      formatter={(value) => <span className="text-slate-400">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="horasAulas"
                      name="Horas Aulas"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#1e293b' }}
                      activeDot={{ r: 7 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Evolução de Horas Investidas */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <LineChart className="h-4 w-4 text-blue-400" />
                Evolução de Horas Investidas
              </CardTitle>
              <p className="text-xs text-slate-500">Soma de horas por colaborador por período</p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={dadosPorPeriodo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="periodo" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => formatarCargaHoraria(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                      formatter={(value) => <span className="text-slate-400">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="horasInvestidas"
                      name="Horas Investidas"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#1e293b' }}
                      activeDot={{ r: 7 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SEÇÃO 3: GRÁFICOS DE QUANTIDADES (LADO A LADO) */}
      {dadosPorPeriodo.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 3: Evolução de Treinamentos */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Evolução de Treinamentos
              </CardTitle>
              <p className="text-xs text-slate-500">Quantidade de treinamentos realizados por período</p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={dadosPorPeriodo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="periodo" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                      formatter={(value) => <span className="text-slate-400">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="quantidadeTreinamentos"
                      name="Quantidade de Treinamentos"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#1e293b' }}
                      activeDot={{ r: 7 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 4: Evolução de Participações */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-rose-400" />
                Evolução de Participações
              </CardTitle>
              <p className="text-xs text-slate-500">Quantidade de inscrições em treinamentos por período</p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={dadosPorPeriodo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="periodo" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                      formatter={(value) => <span className="text-slate-400">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="quantidadeParticipacoes"
                      name="Quantidade de Participações"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ fill: '#f43f5e', r: 5, strokeWidth: 2, stroke: '#1e293b' }}
                      activeDot={{ r: 7 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SEÇÃO 4: FUNÇÕES E TÓPICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Colaboradores por Função */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              Colaboradores por Função
            </CardTitle>
            <p className="text-xs text-slate-500">Distribuição única por função</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {colaboradoresPorFuncao.dados.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              colaboradoresPorFuncao.dados.map((funcao) => (
                <div key={funcao.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: funcao.cor }} />
                      <span className="text-slate-300">{funcao.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-sm">{funcao.quantidade}</span>
                      <span className="text-slate-500 text-xs">{funcao.percentualTotal.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, funcao.percentualBarra)}%`, backgroundColor: funcao.cor }}
                    />
                  </div>
                </div>
              ))
            )}
            <div className="pt-3 mt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Total Colabs Treinados</span>
              <span className="text-2xl font-bold text-emerald-400">{colaboradoresPorFuncao.total}</span>
            </div>
          </CardContent>
        </Card>

        {/* Principais Tópicos */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              Principais Tópicos (Horas Investidas)
            </CardTitle>
            <p className="text-xs text-slate-500">Ranking por carga horária acumulada</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topicosPrincipais.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              topicosPrincipais.map((topico, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 text-xs line-clamp-1 flex-1 mr-2">{topico.nome}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold text-sm">{formatarCargaHoraria(topico.horas)}</span>
                      <span className="text-slate-500 text-xs">{topico.participacoes} part.</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.min(100, topico.percentualBarra)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
            <div className="pt-3 mt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Total Horas Investidas</span>
              <span className="text-2xl font-bold text-blue-400">{formatarCargaHoraria(valoresAcumulados.horasInvestidas)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}