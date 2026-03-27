// src/components/master-drive/DashboardIndicadores.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, AlertTriangle, CheckCircle, Clock, Users, BookOpen, Calendar } from 'lucide-react';
import { Indicadores, Treinamento } from '@/types/masterDrive';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';

interface DashboardIndicadoresProps {
  indicadores: Indicadores;
  treinamentos: Treinamento[];
  loading: boolean;
}

const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6', '#ec489a'];

export const DashboardIndicadores = ({ indicadores, treinamentos, loading }: DashboardIndicadoresProps) => {
  
  // Função para formatar data para exibição no gráfico
  const formatarDataGrafico = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}`;
  };

  // Função para abreviar nomes longos para legendas (mas manter completo no tooltip)
  const abreviarNome = (nome: string, maxLen: number = 25): string => {
    if (nome.length <= maxLen) return nome;
    return nome.substring(0, maxLen - 3) + '...';
  };

  // Processar dados para quantidade de treinamentos por dia
  const treinamentosPorDia = () => {
    const map = new Map<string, { data: string; dataCompleta: string; quantidade: number; participantes: number; horas: number }>();
    
    treinamentos.forEach(t => {
      const dataCompleta = t.data_treinamento;
      const dataFormatada = formatarDataGrafico(dataCompleta);
      
      if (!map.has(dataCompleta)) {
        map.set(dataCompleta, {
          data: dataFormatada,
          dataCompleta: dataCompleta,
          quantidade: 0,
          participantes: 0,
          horas: 0
        });
      }
      
      const item = map.get(dataCompleta)!;
      item.quantidade++;
      item.participantes += t.qtd_participantes;
      
      // Converter carga_horaria_total para horas decimais
      const horasTotal = t.carga_horaria_total.split(':');
      const horasDecimais = parseInt(horasTotal[0]) + parseInt(horasTotal[1]) / 60;
      item.horas += horasDecimais;
    });
    
    return Array.from(map.values()).sort((a, b) => {
      return a.dataCompleta.localeCompare(b.dataCompleta);
    });
  };

  // Processar dados para quantidade de treinamentos por tipo - usando nome completo
  const treinamentosPorTipo = () => {
    const map = new Map<string, { tipo: string; tipoCompleto: string; quantidade: number; horas: number }>();
    
    treinamentos.forEach(t => {
      // Usar nome completo do tipo de treinamento
      const tipoNome = t.tipo_treinamento?.nome || 'Treinamento';
      
      if (!map.has(tipoNome)) {
        map.set(tipoNome, { 
          tipo: abreviarNome(tipoNome, 20), 
          tipoCompleto: tipoNome, 
          quantidade: 0, 
          horas: 0 
        });
      }
      
      const item = map.get(tipoNome)!;
      item.quantidade++;
      
      // Converter carga_horaria_total para horas decimais
      const horasTotal = t.carga_horaria_total.split(':');
      const horasDecimais = parseInt(horasTotal[0]) + parseInt(horasTotal[1]) / 60;
      item.horas += horasDecimais;
    });
    
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade);
  };

  // Processar dados para quantidade de pessoas treinadas por dia
  const pessoasTreinadasPorDia = () => {
    const map = new Map<string, { data: string; dataCompleta: string; participantes: number }>();
    
    treinamentos.forEach(t => {
      const dataCompleta = t.data_treinamento;
      const dataFormatada = formatarDataGrafico(dataCompleta);
      
      if (!map.has(dataCompleta)) {
        map.set(dataCompleta, {
          data: dataFormatada,
          dataCompleta: dataCompleta,
          participantes: 0
        });
      }
      
      map.get(dataCompleta)!.participantes += t.qtd_participantes;
    });
    
    return Array.from(map.values()).sort((a, b) => {
      return a.dataCompleta.localeCompare(b.dataCompleta);
    });
  };

  // Processar dados para horas de treinamento por tipo - usando nome completo
  const horasPorTipo = () => {
    const map = new Map<string, { tipo: string; tipoCompleto: string; horas: number }>();
    
    treinamentos.forEach(t => {
      // Usar nome completo do tipo de treinamento
      const tipoNome = t.tipo_treinamento?.nome || 'Treinamento';
      
      if (!map.has(tipoNome)) {
        map.set(tipoNome, { 
          tipo: abreviarNome(tipoNome, 20), 
          tipoCompleto: tipoNome, 
          horas: 0 
        });
      }
      
      const item = map.get(tipoNome)!;
      const horasTotal = t.carga_horaria_total.split(':');
      const horasDecimais = parseInt(horasTotal[0]) + parseInt(horasTotal[1]) / 60;
      item.horas += horasDecimais;
    });
    
    return Array.from(map.values()).sort((a, b) => b.horas - a.horas);
  };

  const dadosTreinamentosPorDia = treinamentosPorDia();
  const dadosTreinamentosPorTipo = treinamentosPorTipo();
  const dadosPessoasTreinadasPorDia = pessoasTreinadasPorDia();
  const dadosHorasPorTipo = horasPorTipo();

  // Custom tooltip para evitar abreviações
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl max-w-xs">
          <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.payload.tipoCompleto || entry.value.toLocaleString('pt-BR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip para gráficos de pizza
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl max-w-xs">
          <p className="text-slate-300 text-sm font-medium mb-2">{data.tipoCompleto}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString('pt-BR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Formatter para valores dos eixos (sem abreviação)
  const formatYAxis = (value: number) => {
    return value.toString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
            <CardContent className="p-6 h-28" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Indicadores - Cores escuras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700 hover:border-blue-500/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Total Horas</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {indicadores.totalHorasTreinamento.toFixed(1)}h
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {indicadores.totalTreinamentos} treinamentos
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-purple-500/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Participantes</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {indicadores.totalParticipantes}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  colaboradores treinados
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-orange-500/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-400 uppercase tracking-wider">Desvios Totais</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {indicadores.totalDesvios}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ocorrências registradas
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Tratados</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {indicadores.desviosTratados}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {indicadores.desviosAbertos} em aberto
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Quantidade de Treinamentos por Dia */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Treinamentos por Dia
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Quantidade de treinamentos realizados por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosTreinamentosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="data" stroke="#94a3b8" fontSize={12} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    allowDecimals={false}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="quantidade" 
                    name="Quantidade de Treinamentos"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Tipo de Treinamento (Pizza) - com nome completo no tooltip */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-400" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Quantidade de treinamentos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dadosTreinamentosPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosTreinamentosPorTipo}
                      dataKey="quantidade"
                      nameKey="tipo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {dadosTreinamentosPorTipo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend 
                      formatter={(value, entry, index) => {
                        const fullName = dadosTreinamentosPorTipo[index]?.tipoCompleto || value;
                        return <span className="text-slate-300 text-xs" title={fullName}>{abreviarNome(fullName, 18)}</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 3: Quantidade de Pessoas Treinadas por Dia */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Pessoas Treinadas por Dia
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total de participantes por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosPessoasTreinadasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="data" stroke="#94a3b8" fontSize={12} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    allowDecimals={false}
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="participantes" 
                    name="Participantes"
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 4: Horas de Treinamento por Tipo (Pizza) - com nome completo no tooltip */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Horas por Tipo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição de horas totais por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dadosHorasPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosHorasPorTipo}
                      dataKey="horas"
                      nameKey="tipo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent, value }) => `${name}: ${value.toFixed(1)}h (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {dadosHorasPorTipo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend 
                      formatter={(value, entry, index) => {
                        const fullName = dadosHorasPorTipo[index]?.tipoCompleto || value;
                        return <span className="text-slate-300 text-xs" title={fullName}>{abreviarNome(fullName, 18)}</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Colaboradores */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-200">
            Top Colaboradores
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Colaboradores com maior carga horária de treinamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {indicadores.rankingColaboradores.slice(0, 5).map((col, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{col.nome}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400 px-3 py-1">
                  {col.horas.toFixed(1)}h
                </Badge>
              </div>
            ))}
            {indicadores.rankingColaboradores.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                Nenhum dado disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};