import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, AlertTriangle, CheckCircle, Clock, Users, BookOpen, Calendar, TrendingUp, Target } from 'lucide-react';
import { Indicadores, Treinamento } from '@/types/masterDrive';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart, LabelList
} from 'recharts';

interface DashboardIndicadoresProps {
  indicadores: Indicadores;
  treinamentos: Treinamento[];
  desvios: any[];
  loading: boolean;
  filtros: any; 
}

// Paleta de cores moderna
const COLORS_TREINAMENTO = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];
const COLORS_DESVIOS = ['#ef4444', '#10b981', '#f97316']; 

export const DashboardIndicadores = ({ indicadores, treinamentos, desvios, loading, filtros }: DashboardIndicadoresProps) => {
  
  // --- Função Auxiliar de Cálculo de Horas ---
  const parseHours = (timeString: string): number => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) + ((minutes || 0) / 60);
  };

  // --- LÓGICA DE FILTRAGEM LOCAL ---
  const aplicarFiltros = (dados: any[], tipo: 'treinamento' | 'desvio') => {
    if (!filtros || Object.keys(filtros).length === 0) return dados;

    return dados.filter((item) => {
      if (filtros.data_inicio) {
        const itemDate = new Date(tipo === 'treinamento' ? item.data_treinamento : item.data_desvio);
        const filterDate = new Date(filtros.data_inicio);
        itemDate.setHours(0,0,0,0);
        filterDate.setHours(0,0,0,0);
        if (itemDate < filterDate) return false;
      }

      if (filtros.data_fim) {
        const itemDate = new Date(tipo === 'treinamento' ? item.data_treinamento : item.data_desvio);
        const filterDate = new Date(filtros.data_fim);
        itemDate.setHours(0,0,0,0);
        filterDate.setHours(0,0,0,0);
        if (itemDate > filterDate) return false;
      }

      if (tipo === 'treinamento' && filtros.tipo_treinamento_id) {
        if (item.tipo_treinamento?.id !== filtros.tipo_treinamento_id && item.tipo_treinamento !== filtros.tipo_treinamento_id) {
           return false;
        }
      }
      
      if (filtros.colaborador_id) {
        if (tipo === 'treinamento') {
            return true; 
        } else {
            if (item.colaborador_id !== filtros.colaborador_id) return false;
        }
      }

      return true;
    });
  };

  // Dados Filtrados
  const dadosTreinamentosFiltrados = aplicarFiltros(treinamentos, 'treinamento');
  const dadosDesviosFiltrados = aplicarFiltros(desvios, 'desvio');

  // --- CÁLCULOS CORRIGIDOS (BASEADOS NA ESTRUTURA DO SEU BANCO) ---

  // 1. Soma das horas de CONTEÚDO (Duração do evento em si)
  // Como o banco guarda o TOTAL (ex: 6h40m), dividimos pelos participantes para achar o tempo da aula
  const somaHorasEventos = dadosTreinamentosFiltrados.reduce((acc, t) => {
    const totalInvested = parseHours(t.carga_horaria_total);
    const participantes = t.qtd_participantes > 0 ? t.qtd_participantes : 1; // Evita divisão por zero
    return acc + (totalInvested / participantes);
  }, 0);

  // 2. Soma das horas da EQUIPE (Total Investido)
  // O banco JÁ guarda o total investido, então basta somar direto
  const somaHorasColaboradores = dadosTreinamentosFiltrados.reduce((acc, t) => acc + parseHours(t.carga_horaria_total), 0);

  // 2.1. Total de colaboradores treinados (Soma de qtd_participantes)
  const totalParticipacoes = dadosTreinamentosFiltrados.reduce((acc, t) => acc + t.qtd_participantes, 0);

  // 3. Média de Horas por Funcionário (Total Investido / Total Participações)
  const mediaHorasPorFuncionario = totalParticipacoes > 0 
    ? (somaHorasColaboradores / totalParticipacoes).toFixed(1) 
    : "0.0";

  // 4. Cálculos de Desvios
  const totalDesviosFiltrados = dadosDesviosFiltrados.length;
  const desviosTratadosFiltrados = dadosDesviosFiltrados.filter(d => d.situacao === 'TRATADO').length;
  const desviosAbertosFiltrados = dadosDesviosFiltrados.filter(d => d.situacao === 'EM_ABERTO').length;

  // --- Processamento de Dados para Gráficos ---
  
  const formatarDataGrafico = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}`;
  };

  const abreviarNome = (nome: string, maxLen: number = 20): string => {
    if (nome.length <= maxLen) return nome;
    return nome.substring(0, maxLen - 3) + '...';
  };

  const treinamentosPorDia = () => {
    const map = new Map<string, { data: string; dataCompleta: string; quantidade: number }>();
    dadosTreinamentosFiltrados.forEach(t => {
      const dataCompleta = t.data_treinamento;
      const dataFormatada = formatarDataGrafico(dataCompleta);
      if (!map.has(dataCompleta)) {
        map.set(dataCompleta, { data: dataFormatada, dataCompleta, quantidade: 0 });
      }
      map.get(dataCompleta)!.quantidade++;
    });
    return Array.from(map.values()).sort((a, b) => a.dataCompleta.localeCompare(b.dataCompleta));
  };

  const treinamentosPorTipo = () => {
    const map = new Map<string, { tipo: string; tipoCompleto: string; quantidade: number }>();
    dadosTreinamentosFiltrados.forEach(t => {
      const tipoNome = t.tipo_treinamento?.nome || 'Outros';
      if (!map.has(tipoNome)) {
        map.set(tipoNome, { tipo: abreviarNome(tipoNome, 15), tipoCompleto: tipoNome, quantidade: 0 });
      }
      map.get(tipoNome)!.quantidade++;
    });
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade);
  };

  const dadosTreinamentosPorDia = treinamentosPorDia();
  const dadosTreinamentosPorTipo = treinamentosPorTipo();

  // --- Processamento de Dados (Desvios) ---

  const desviosPorSituacao = () => {
    const abertos = desviosAbertosFiltrados;
    const tratados = desviosTratadosFiltrados;
    const outros = totalDesviosFiltrados - abertos - tratados;
    
    return [
      { name: 'Em Aberto', value: abertos, color: '#ef4444' },
      { name: 'Tratados', value: tratados, color: '#10b981' },
      { name: 'Outros', value: outros, color: '#f97316' }
    ].filter(item => item.value > 0);
  };

  const desviosPorTipo = () => {
    const map = new Map<string, { tipo: string; quantidade: number }>();
    dadosDesviosFiltrados.forEach(d => {
      const tipo = d.tipo_desvio || 'Não classificado';
      if (!map.has(tipo)) map.set(tipo, { tipo, quantidade: 0 });
      map.get(tipo)!.quantidade++;
    });
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5); 
  };

  const dadosDesviosSituacao = desviosPorSituacao();
  const dadosDesviosTipo = desviosPorTipo();

  // --- Custom Tooltip ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-sm z-50">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-800 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SEÇÃO 1: KPIS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* 1. Total Horas de Eventos (Soma do tempo de aula) */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Horas Aulas</span>
            </div>
            <h3 className="text-3xl font-bold text-white leading-none">{somaHorasEventos.toFixed(1)}<span className="text-lg text-slate-500 ml-1">h</span></h3>
            <p className="text-xs text-slate-400 mt-2">{dadosTreinamentosFiltrados.length} eventos</p>
          </CardContent>
        </Card>

        {/* 2. Horas Equipe (Soma direta do banco - CORRIGIDO) */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Horas Equipe</span>
            </div>
            <h3 className="text-3xl font-bold text-white leading-none">{somaHorasColaboradores.toFixed(0)}<span className="text-lg text-slate-500 ml-1">h</span></h3>
            <p className="text-xs text-slate-400 mt-2">{totalParticipacoes} colaboradores</p>
          </CardContent>
        </Card>

        {/* 3. Média por Funcionário */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md ring-1 ring-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4 text-blue-300" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Média/Func</span>
            </div>
            <h3 className="text-3xl font-bold text-white leading-none">{mediaHorasPorFuncionario}<span className="text-lg text-slate-500 ml-1">h</span></h3>
            <p className="text-xs text-blue-300 mt-2 font-medium">Indicador Chave</p>
          </CardContent>
        </Card>

        {/* 4. Desvios Totais */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Desvios</span>
            </div>
            <h3 className="text-3xl font-bold text-white leading-none">{totalDesviosFiltrados}</h3>
            <p className="text-xs text-slate-400 mt-2">no período</p>
          </CardContent>
        </Card>

        {/* 5. Eficiência */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Resolvidos</span>
            </div>
            <h3 className="text-3xl font-bold text-white leading-none">{desviosTratadosFiltrados}</h3>
            <p className="text-xs text-slate-400 mt-2">{desviosAbertosFiltrados} pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 2: DASHBOARD DE TREINAMENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/40 border-slate-800/50 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Evolução de Treinamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosTreinamentosPorDia}>
                  <defs>
                    <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="data" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                  <Area 
                    type="monotone" 
                    dataKey="quantidade" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorLine)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/50 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-400" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosTreinamentosPorTipo} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="tipo" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                    {dadosTreinamentosPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_TREINAMENTO[index % COLORS_TREINAMENTO.length]} />
                    ))}
                    <LabelList dataKey="quantidade" position="right" fontSize={11} fill="#e2e8f0" fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3: DASHBOARD DE DESVIOS */}
      <div>
        <div className="flex items-center gap-2 mb-3 border-l-4 border-orange-500 pl-3">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Análise de Não Conformidades</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/40 border-slate-800/50 shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-bold text-slate-300 uppercase">Status dos Desvios</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[250px] w-full flex items-center justify-center">
                {dadosDesviosSituacao.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosDesviosSituacao}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent, value }) => (
                          <text fill="#e2e8f0" fontSize={11} fontWeight="bold" textAnchor="middle">
                            {value}
                          </text>
                        )}
                      >
                        {dadosDesviosSituacao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-slate-400 font-medium ml-1">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-xs">Sem desvios registrados</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800/50 shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-bold text-slate-300 uppercase">Top Ocorrências por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[250px] w-full">
                {dadosDesviosTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosDesviosTipo} barSize={30}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="tipo" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} dy={5} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="quantidade" fill="#f97316" radius={[4, 4, 0, 0]}>
                         <LabelList dataKey="quantidade" position="top" fontSize={11} fill="#e2e8f0" fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">Sem dados de tipos</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 4: RANKING */}
      <Card className="bg-slate-900/40 border-slate-800/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Top 5 Engajamento</CardTitle>
          <Users className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {indicadores.rankingColaboradores.slice(0, 5).map((col, index) => {
              const maxHoras = indicadores.rankingColaboradores[0]?.horas || 1;
              const percent = (col.horas / maxHoras) * 100;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-slate-300 truncate pr-2">{col.nome}</p>
                      <span className="text-xs font-bold text-blue-400 shrink-0">{col.horas.toFixed(1)}h</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {indicadores.rankingColaboradores.length === 0 && (
              <p className="text-center text-slate-500 text-xs py-2">Sem dados de ranking</p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};