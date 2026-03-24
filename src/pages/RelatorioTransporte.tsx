import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Plus, Search, Filter, Calendar, Clock, Ship, Factory, Warehouse, Building, 
  BarChart3, Users, UserX, Menu, RefreshCw, Database, Eye, Loader2, LucideIcon, 
  Download, FileText, X, Package, ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// --- 1. INTERFACES E TIPOS ---
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
  tag_generico?: string;
  categoria_nome?: string;
  local?: string;
  horas_operando?: number;
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
  centro_resultado?: string;
  navios: Navio | null;
  equipamentos: Equipamento[];
  ajudantes: Ajudante[];
  ausencias: Ausencia[];
}

interface RelatorioItem {
  registro_id: string;
  operacao: string;
  carga_operacao: string;
  data: string;
  hora_inicial: string;
  hora_final: string;
  centro_resultado: string;
  observacao: string;
  equipamento_id: string;
  tag: string;
  tag_generico: string;
  categoria_nome: string;
  local: string;
  motorista_operador: string;
  horas_trabalhadas: number;
  horas_operando: number;
}

// --- 2. FUNÇÕES DE UTILIDADE ---
const corrigirFusoHorarioData = (dataString: string): string => {
  try {
    if (!dataString || dataString.match(/^\d{4}-\d{2}-\d{2}$/)) return dataString;
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return dataString;
    const offset = data.getTimezoneOffset();
    data.setMinutes(data.getMinutes() - offset);
    return data.toISOString().split('T')[0];
  } catch (error) {
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
    return dataString;
  }
};

const formatarHoras = (totalHoras: number): string => {
  if (totalHoras === 0) return '0h';
  return `${totalHoras.toFixed(1)}h`;
};

const getOperacaoIcon = (op: string): LucideIcon => {
  switch (op) {
    case 'NAVIO': return Ship;
    case 'ALBRAS': return Factory;
    case 'SANTOS BRASIL': return Warehouse;
    case 'HYDRO': return Building;
    default: return BarChart3;
  }
};

const ordenarPorNome = <T extends { nome: string }>(array: T[]): T[] => {
  return [...array].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
};

const ordenarEquipamentosPorOperador = (equipamentos: Equipamento[]): Equipamento[] => {
  return [...equipamentos].sort((a, b) => 
    (a.motorista_operador || '').localeCompare((b.motorista_operador || ''), 'pt-BR', { sensitivity: 'base' })
  );
};

// --- 3. COMPONENTES AUXILIARES ---

interface ModalRelatorioProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (dataInicial: string, dataFinal: string) => Promise<void>;
  loading: boolean;
}

const ModalRelatorio: React.FC<ModalRelatorioProps> = ({ isOpen, onClose, onDownload, loading }) => {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  useEffect(() => {
    if (isOpen) {
      const hoje = new Date();
      const umMesAtras = new Date();
      umMesAtras.setDate(hoje.getDate() - 30);
      setDataFinal(hoje.toISOString().split('T')[0]);
      setDataInicial(umMesAtras.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    if (!dataInicial || !dataFinal) { alert('Selecione ambas as datas.'); return; }
    if (new Date(dataInicial) > new Date(dataFinal)) { alert('Data inválida.'); return; }
    await onDownload(dataInicial, dataFinal);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Download de Relatório
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Data Inicial</Label>
            <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="bg-slate-950 border-slate-700 text-white focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Data Final</Label>
            <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="bg-slate-950 border-slate-700 text-white focus:ring-blue-500" />
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
             <p className="text-xs text-blue-400">
               Período: <span className="font-semibold text-blue-300">
                 {dataInicial ? formatarDataBR(dataInicial) : '--'} até {dataFinal ? formatarDataBR(dataFinal) : '--'}
               </span>
             </p>
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancelar</Button>
          <Button onClick={handleDownload} disabled={loading || !dataInicial || !dataFinal} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><Download className="h-4 w-4 mr-2" /> Baixar</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface HeaderControlesProps {
  navigate: ReturnType<typeof useNavigate>;
  handleAtualizarDados: () => Promise<void>;
  handleExecutarSQL: () => Promise<void>;
  handleOpenModalRelatorio: () => void;
  atualizando: boolean;
}

const HeaderControles: React.FC<HeaderControlesProps> = ({ 
  navigate, handleAtualizarDados, handleExecutarSQL, handleOpenModalRelatorio, atualizando 
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950 backdrop-blur-md border-b border-slate-800 shadow-lg" style={{ zoom: 0.78 }}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 h-8 px-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-medium text-sm">Dashboard</span>
          </Button>
          <div className="h-5 w-px bg-slate-800 hidden md:block"></div>
          <h1 className="text-lg font-bold text-white tracking-tight">Relatório de Operações</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenModalRelatorio} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-8 px-3">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline text-sm">Relatório</span>
          </Button>
          
          <Button onClick={handleExecutarSQL} disabled={atualizando} variant="secondary" className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white h-8 px-3">
            {atualizando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
            <span className="ml-1.5 hidden lg:inline text-sm">SQL</span>
          </Button>
          
          <Button onClick={handleAtualizarDados} disabled={atualizando} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${atualizando ? 'animate-spin' : ''}`} />
          </Button>

          <Button onClick={() => navigate('/novo-lancamento')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/20 h-8 px-3">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-sm">Nova Op.</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

interface FiltrosAreaProps {
  dataFiltro: string;
  setDataFiltro: (data: string) => void;
  horaInicialFiltro: string;
  setHoraInicialFiltro: (hora: string) => void;
  operadorFiltro: string;
  setOperadorFiltro: (operador: string) => void;
  aplicarFiltros: () => void;
  limparFiltros: () => void;
  formatarDataBR: (data: string) => string;
}

const FiltrosArea: React.FC<FiltrosAreaProps> = ({
  dataFiltro, setDataFiltro, horaInicialFiltro, setHoraInicialFiltro, operadorFiltro, setOperadorFiltro,
  aplicarFiltros, limparFiltros, formatarDataBR
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 backdrop-blur-sm" style={{ zoom: 0.78 }}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</Label>
            <div className="flex gap-2">
              <Input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} 
                className="bg-slate-950 border-slate-700 text-white h-8 text-sm focus-visible:ring-blue-500" />
              <Button onClick={aplicarFiltros} className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Turno</Label>
            <Select value={horaInicialFiltro} onValueChange={setHoraInicialFiltro}>
              <SelectTrigger className="h-8 bg-slate-950 border-slate-700 text-white text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="07:00:00">Manhã (07:00)</SelectItem>
                <SelectItem value="19:00:00">Noite (19:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operador</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
              <Input type="text" value={operadorFiltro} onChange={(e) => setOperadorFiltro(e.target.value)} 
                placeholder="Buscar nome..." className="pl-8 bg-slate-950 border-slate-700 text-white h-8 text-sm focus-visible:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
             <Button onClick={aplicarFiltros} className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-3 text-sm">Filtrar</Button>
             <Button onClick={limparFiltros} variant="outline" className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-3 text-sm">Limpar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResumoCardsProps {
  operacoesFiltradas: OperacaoCompleta[];
  setOperacaoSelecionada: (op: string) => void;
  setOperacaoIdSelecionado: (id: string | null) => void;
  loading: boolean;
}

const ResumoCards: React.FC<ResumoCardsProps> = ({ operacoesFiltradas, setOperacaoSelecionada, setOperacaoIdSelecionado, loading }) => {
  const tiposOperacao = ['HYDRO', 'ALBRAS', 'SANTOS BRASIL', 'NAVIO'];

  if (loading) {
    return (
      <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ zoom: 0.78 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  const totaisPorTipo = tiposOperacao.reduce((acc, tipo) => {
    const opsDoTipo = operacoesFiltradas.filter(op => op.op === tipo);
    const count = opsDoTipo.length;
    const totalHoras = opsDoTipo.reduce((sum, op) => sum + op.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0);
    acc[tipo] = { count, totalHoras };
    return acc;
  }, {} as Record<string, { count: number, totalHoras: number }>);

  return (
    <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ zoom: 0.78 }}>
      {tiposOperacao.map((tipo) => {
        const Icon = getOperacaoIcon(tipo);
        const data = totaisPorTipo[tipo] || { count: 0, totalHoras: 0 };
        
        return (
          <Card key={tipo} 
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 transition-all cursor-pointer group shadow-lg"
            onClick={() => { setOperacaoSelecionada(tipo); setOperacaoIdSelecionado(null); }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{tipo}</p>
                  <p className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{data.count}</p>
                  <p className="text-xs text-slate-500 font-mono">{formatarHoras(data.totalHoras)}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                  <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// TABELA DE OPERAÇÃO (Principal) - CORRIGIDA (Bloqueio Triplo)
const TabelaOperacao: React.FC<{ 
  operacao: OperacaoCompleta | null; 
  formatarDataBR: (d: string) => string; 
  formatarHoras: (h: number) => string;
}> = ({ operacao, formatarDataBR, formatarHoras }) => {
  if (!operacao) {
    return (
      <Card className="h-full bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-xl">
        <div className="text-center p-6">
          <div className="bg-slate-800 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <Search className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="text-base font-medium text-slate-200 mb-1">Nenhuma operação selecionada</h3>
          <p className="text-xs text-slate-500">Selecione um item na lista lateral para ver os detalhes.</p>
        </div>
      </Card>
    );
  }

  const displayName = operacao.op === 'NAVIO' && operacao.navios 
    ? `${operacao.navios.nome_navio} - ${operacao.navios.carga}`
    : operacao.op;

  const equipamentosPorGrupo = operacao.equipamentos.reduce((acc, eq) => {
    const grupo = eq.grupo_operacao || 'Sem grupo';
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(eq);
    return acc;
  }, {} as Record<string, Equipamento[]>);

  Object.keys(equipamentosPorGrupo).forEach(grupo => {
    equipamentosPorGrupo[grupo].sort((a, b) => (a.motorista_operador || '').localeCompare((b.motorista_operador || ''), 'pt-BR'));
  });

  return (
    <Card className="h-full bg-slate-900 border border-slate-800 flex flex-col shadow-xl">
      <CardHeader className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-white mb-3 truncate pr-3">{displayName}</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="block text-[10px] text-slate-500 mb-0.5">Data</span>
                <span className="font-medium text-slate-300 text-sm">{formatarDataBR(operacao.data)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-0.5">Início</span>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal text-xs px-2 py-0.5">
                  {operacao.hora_inicial}
                </Badge>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-0.5">Fim</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal text-xs px-2 py-0.5">
                  {operacao.hora_final}
                </Badge>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-0.5">Total Horas</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {operacao.equipamentos.reduce((s, e) => s + (Number(e.horas_trabalhadas)||0), 0).toFixed(1)}h
                </span>
              </div>
            </div>
            {operacao.observacao && (
              <div className="mt-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Observações</span>
                <p className="text-xs text-slate-300 leading-relaxed">{operacao.observacao}</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 p-0 bg-slate-900">
        {operacao.equipamentos.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-32 text-slate-500">
             <Package className="h-6 w-6 mb-1.5 opacity-50" />
             <p className="text-xs">Nenhum equipamento vinculado</p>
           </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {Object.entries(equipamentosPorGrupo).map(([grupo, eqs]) => (
              <div key={grupo} className="p-3 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800 px-2 py-0.5 text-xs">
                    {grupo}
                  </Badge>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {eqs.length} itens • {formatarHoras(eqs.reduce((a,b) => a + (Number(b.horas_trabalhadas)||0), 0))}
                  </span>
                </div>
                {/* Wrapper com fundo explícito e Table com fundo explícito */}
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
                  <Table className="bg-slate-900">
                    <TableHeader className="bg-slate-950">
                      <TableRow className="bg-slate-950 border-slate-800 hover:bg-slate-950">
                        <TableHead className="text-slate-400 font-medium text-[10px] py-1.5 pl-2 bg-slate-950">Tag</TableHead>
                        <TableHead className="text-slate-400 font-medium text-[10px] py-1.5 bg-slate-950">Operador</TableHead>
                        <TableHead className="text-slate-400 font-medium text-[10px] py-1.5 text-right pr-2 bg-slate-950">Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-slate-900">
                      {eqs.map(eq => (
                        <TableRow key={eq.id} className="bg-slate-900 hover:bg-slate-800/30 transition-colors border-slate-800">
                          <TableCell className="py-1.5 pl-2 bg-transparent">
                            <code className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 border border-slate-700 font-mono">
                              {eq.tag}
                            </code>
                          </TableCell>
                          <TableCell className="py-1.5 bg-transparent">
                            <span className="text-xs text-slate-300 font-medium">
                              {eq.motorista_operador || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 text-right pr-2 bg-transparent">
                            <span className="font-mono text-emerald-400 text-xs font-bold">
                              {eq.horas_trabalhadas}h
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// TABELA DE AJUDANTES E AUSÊNCIAS (Lado Direito) - CORRIGIDA (Bloqueio Triplo)
const PainelLateral: React.FC<{ ajudantes: Ajudante[], ausencias: Ausencia[] }> = ({ ajudantes, ausencias }) => {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Ajudantes */}
      <Card className="flex-1 bg-slate-900 border border-slate-800 flex flex-col shadow-lg">
        <CardHeader className="p-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <CardTitle className="text-sm font-semibold text-slate-200">Ajudantes</CardTitle>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">{ajudantes.length}</Badge>
        </CardHeader>
        {/* Wrapper e Table com fundo explícito */}
        <div className="flex-1 p-0 bg-slate-900">
          <Table className="bg-slate-900">
            <TableHeader className="bg-slate-950">
              <TableRow className="bg-slate-950 hover:bg-slate-950 border-slate-800">
                <TableHead className="text-[9px] uppercase text-slate-500 py-1.5 pl-2 font-medium bg-slate-950">Nome</TableHead>
                <TableHead className="text-[9px] uppercase text-slate-500 py-1.5 text-right pr-2 font-medium bg-slate-950">Turno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-slate-900 divide-y divide-slate-800">
              {ordenarPorNome(ajudantes).map(a => (
                <TableRow key={a.id} className="bg-slate-900 hover:bg-slate-800/20 border-slate-800">
                  <TableCell className="py-1.5 pl-2 bg-transparent">
                    <span className="text-xs text-slate-300 font-medium">{a.nome}</span>
                  </TableCell>
                  <TableCell className="py-1.5 text-right pr-2 bg-transparent">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">
                        {a.hora_inicial}
                      </span>
                      <span className="text-[9px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">
                        {a.hora_final}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {ajudantes.length === 0 && (
                 <TableRow className="bg-slate-900">
                   <TableCell colSpan={2} className="text-center py-3 text-[10px] text-slate-500 bg-transparent">
                     Nenhum registro
                   </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Ausências */}
      <Card className="flex-1 bg-slate-900 border border-slate-800 flex flex-col shadow-lg">
        <CardHeader className="p-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <CardTitle className="text-sm font-semibold text-slate-200">Ausências</CardTitle>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{ausencias.length}</Badge>
        </CardHeader>
        {/* Wrapper e Table com fundo explícito */}
        <div className="flex-1 p-0 bg-slate-900">
           <Table className="bg-slate-900">
            <TableHeader className="bg-slate-950">
              <TableRow className="bg-slate-950 hover:bg-slate-950 border-slate-800">
                <TableHead className="text-[9px] uppercase text-slate-500 py-1.5 pl-2 font-medium bg-slate-950">Nome</TableHead>
                <TableHead className="text-[9px] uppercase text-slate-500 py-1.5 text-center font-medium bg-slate-950">Justif.</TableHead>
                <TableHead className="text-[9px] uppercase text-slate-500 py-1.5 pr-2 font-medium bg-slate-950">Obs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-slate-900 divide-y divide-slate-800">
              {ordenarPorNome(ausencias).map(aus => (
                <TableRow key={aus.id} className="bg-slate-900 hover:bg-slate-800/20 border-slate-800">
                  <TableCell className="py-1.5 pl-2 bg-transparent">
                    <span className="text-xs text-slate-300 font-medium">{aus.nome}</span>
                  </TableCell>
                  <TableCell className="py-1.5 text-center bg-transparent">
                     {aus.justificado ? (
                       <Badge className="h-4 px-1 bg-emerald-500/10 text-emerald-400 border-0 text-[9px] font-medium">
                         SIM
                       </Badge>
                     ) : (
                       <Badge className="h-4 px-1 bg-red-500/10 text-red-400 border-0 text-[9px] font-medium">
                         NÃO
                       </Badge>
                     )}
                  </TableCell>
                  <TableCell className="py-1.5 pr-2 bg-transparent">
                    <span className="text-[9px] text-slate-500" title={aus.obs}>
                      {aus.obs || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
               {ausencias.length === 0 && (
                 <TableRow className="bg-slate-900">
                   <TableCell colSpan={3} className="text-center py-3 text-[10px] text-slate-500 bg-transparent">
                     Nenhum registro
                   </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const RelatorioTransporte = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [operacaoSelecionada, setOperacaoSelecionada] = useState<string>('TODOS');
  const [operacaoIdSelecionado, setOperacaoIdSelecionado] = useState<string | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  
  const [dataFiltro, setDataFiltro] = useState('');
  const [horaInicialFiltro, setHoraInicialFiltro] = useState('Todos');
  const [operadorFiltro, setOperadorFiltro] = useState('');

  const [filtroAplicado, setFiltroAplicado] = useState({ data: '', hora: 'Todos', operador: '' });
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set(['TODOS']));

  const toggleGrupo = (grupo: string) => {
    setGruposExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(grupo)) {
        novo.delete(grupo);
      } else {
        novo.add(grupo);
      }
      return novo;
    });
  };

  const buscarUltimaData = useCallback(async (): Promise<string> => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('registro_operacoes').select('data').order('data', { ascending: false }).limit(1).maybeSingle();
      if (error || !data?.data) return hoje;
      return corrigirFusoHorarioData(data.data) || hoje;
    } catch { return new Date().toISOString().split('T')[0]; }
  }, []);

  useEffect(() => {
    const init = async () => {
      const ultimaData = await buscarUltimaData();
      setDataFiltro(ultimaData);
      setFiltroAplicado(prev => ({ ...prev, data: ultimaData }));
    };
    init();
  }, [buscarUltimaData]);

  const fetchOperacoes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let dataParaFiltrar = filtroAplicado.data || new Date().toISOString().split('T')[0];
      if (!filtroAplicado.data) {
        setFiltroAplicado(prev => ({ ...prev, data: dataParaFiltrar }));
        setDataFiltro(dataParaFiltrar);
      }

      let query = supabase.from('registro_operacoes').select(`*, navios ( id, nome_navio, carga )`).eq('data', dataParaFiltrar).order('data', { ascending: false }).order('hora_inicial', { ascending: false });
      
      const { data: opsData, error: opsError } = await query;
      if (opsError) throw new Error(opsError.message);
      if (!opsData?.length) { setOperacoes([]); return; }

      const opsCompletas = await Promise.all(opsData.map(async (op) => {
        const [eqRes, ajRes, auRes] = await Promise.all([
          supabase.from('equipamentos').select('*').eq('registro_operacoes_id', op.id),
          supabase.from('ajudantes').select('*').eq('registro_operacoes_id', op.id),
          supabase.from('ausencias').select('*').eq('registro_operacoes_id', op.id)
        ]);
        return {
          ...op, data: corrigirFusoHorarioData(op.data),
          equipamentos: ordenarEquipamentosPorOperador(eqRes.data || []),
          ajudantes: ordenarPorNome((ajRes.data || []).map(a => ({...a, data: corrigirFusoHorarioData(a.data)}))),
          ausencias: ordenarPorNome((auRes.data || []).map(a => ({...a, data: corrigirFusoHorarioData(a.data)})))
        } as OperacaoCompleta;
      }));

      setOperacoes(opsCompletas);
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [filtroAplicado.data, toast]);

  useEffect(() => { if (filtroAplicado.data) fetchOperacoes(); }, [filtroAplicado, fetchOperacoes]);

  // Função corrigida para gerar relatório CSV completo
  const gerarRelatorioCSV = async (dataInicial: string, dataFinal: string) => {
    setGerandoRelatorio(true);
    
    try {
      // Corrigir fusos horários das datas
      const dataInicialCorrigida = corrigirFusoHorarioData(dataInicial);
      const dataFinalCorrigida = corrigirFusoHorarioData(dataFinal);

      console.log('Buscando dados para o relatório:', dataInicialCorrigida, 'até', dataFinalCorrigida);

      // Buscar dados completos com relacionamentos
      const { data: relatorioData, error } = await supabase
        .from('registro_operacoes')
        .select(`
          *,
          navios (
            nome_navio,
            carga
          ),
          equipamentos (
            id,
            tag,
            tag_generico,
            categoria_nome,
            local,
            motorista_operador,
            horas_trabalhadas,
            horas_operando
          )
        `)
        .gte('data', dataInicialCorrigida)
        .lte('data', dataFinalCorrigida)
        .order('data', { ascending: true });

      if (error) {
        console.error('Erro na query:', error);
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      console.log('Dados encontrados:', relatorioData?.length || 0, 'operações');

      if (!relatorioData || relatorioData.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: `Não há operações no período de ${formatarDataBR(dataInicialCorrigida)} a ${formatarDataBR(dataFinalCorrigida)}`,
          variant: "destructive"
        });
        return;
      }

      // Processar os dados conforme o SQL fornecido
      const dadosProcessados: RelatorioItem[] = [];

      relatorioData.forEach(operacao => {
        const equipamentos = operacao.equipamentos || [];
        
        equipamentos.forEach(equipamento => {
          const item: RelatorioItem = {
            registro_id: operacao.id,
            operacao: operacao.op === 'NAVIO' && operacao.navios
              ? `${operacao.navios.nome_navio} - ${operacao.navios.carga}`
              : operacao.op,
            carga_operacao: operacao.op === 'NAVIO' && operacao.navios
              ? operacao.navios.carga
              : operacao.carga || '',
            data: operacao.data,
            hora_inicial: operacao.hora_inicial || '',
            hora_final: operacao.hora_final || '',
            centro_resultado: operacao.centro_resultado || '',
            observacao: operacao.observacao || '',
            equipamento_id: equipamento.id,
            tag: equipamento.tag || '',
            tag_generico: equipamento.tag_generico || '',
            categoria_nome: equipamento.categoria_nome || '',
            local: equipamento.local || '',
            motorista_operador: equipamento.motorista_operador || '',
            horas_trabalhadas: equipamento.horas_trabalhadas || 0,
            horas_operando: equipamento.horas_operando || 0
          };
          
          dadosProcessados.push(item);
        });
      });

      console.log('Dados processados:', dadosProcessados.length, 'registros');

      // Gerar CSV com cabeçalho completo
      const cabecalho = [
        'Registro ID',
        'Operação',
        'Carga Operação',
        'Data',
        'Hora Inicial',
        'Hora Final',
        'Centro Resultado',
        'Observação',
        'Equipamento ID',
        'Tag',
        'Tag Genérico',
        'Categoria',
        'Local',
        'Motorista/Operador',
        'Horas Trabalhadas',
        'Horas Operando'
      ];

      const linhas = dadosProcessados.map(item => [
        item.registro_id,
        item.operacao,
        item.carga_operacao,
        item.data,
        item.hora_inicial,
        item.hora_final,
        item.centro_resultado,
        item.observacao,
        item.equipamento_id,
        item.tag,
        item.tag_generico,
        item.categoria_nome,
        item.local,
        item.motorista_operador,
        item.horas_trabalhadas.toString(),
        item.horas_operando.toString()
      ]);

      const csvContent = [
        cabecalho.join(','),
        ...linhas.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Criar e baixar o arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_operacoes_${dataInicialCorrigida}_${dataFinalCorrigida}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Relatório gerado",
        description: `Relatório de ${formatarDataBR(dataInicialCorrigida)} a ${formatarDataBR(dataFinalCorrigida)} baixado com sucesso.`,
      });

      setModalRelatorioOpen(false);

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive"
      });
    } finally {
      setGerandoRelatorio(false);
    }
  };

  const handleAtualizarDados = useCallback(async () => {
    setAtualizando(true);
    try { await fetchOperacoes(); toast({ title: "Atualizado" }); } finally { setAtualizando(false); }
  }, [fetchOperacoes, toast]);

  const handleExecutarSQL = useCallback(async () => {
    setAtualizando(true);
    try {
      await supabase.rpc('executar_atualizacao_horarios');
      await fetchOperacoes();
      toast({ title: "SQL Executado" });
    } catch { toast({ title: "Erro SQL", variant: "destructive" }); } finally { setAtualizando(false); }
  }, [fetchOperacoes, toast]);

  const aplicarFiltros = () => setFiltroAplicado({ data: dataFiltro, hora: horaInicialFiltro, operador: operadorFiltro });
  const limparFiltros = async () => {
    const ud = await buscarUltimaData();
    setDataFiltro(ud); setHoraInicialFiltro('Todos'); setOperadorFiltro('');
    setFiltroAplicado({ data: ud, hora: 'Todos', operador: '' });
    setOperacaoIdSelecionado(null); setOperacaoSelecionada('TODOS');
  };

  const operacoesFiltradas = useMemo(() => operacoes.filter(op => {
    const matchHora = filtroAplicado.hora === 'Todos' || op.hora_inicial === filtroAplicado.hora;
    const matchOp = !filtroAplicado.operador || op.equipamentos.some(e => e.motorista_operador?.toLowerCase().includes(filtroAplicado.operador.toLowerCase()));
    return matchHora && matchOp;
  }), [operacoes, filtroAplicado]);

  const operacoesPorTipo = useMemo(() => {
    return operacoesFiltradas.reduce((acc, op) => {
      const chave = op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} - ${op.navios.carga}` : op.op;
      acc[chave] = acc[chave] || [];
      acc[chave].push(op);
      return acc;
    }, {} as Record<string, OperacaoCompleta[]>);
  }, [operacoesFiltradas]);

  const operacaoAtual = useMemo(() => 
    operacaoIdSelecionado ? operacoesFiltradas.find(o => o.id === operacaoIdSelecionado) || null : null, 
  [operacoesFiltradas, operacaoIdSelecionado]);

  return (
    <>
      {/* CORREÇÃO DE FUNDO BRANCO: Força o body a ter o fundo escuro e remove margens */}
      <style>{`body { margin: 0; background-color: #020617; }`}</style>
      
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-visible">
        <HeaderControles 
          navigate={navigate} handleAtualizarDados={handleAtualizarDados} 
          handleExecutarSQL={handleExecutarSQL} handleOpenModalRelatorio={() => setModalRelatorioOpen(true)} atualizando={atualizando} 
        />
        
        <ModalRelatorio isOpen={modalRelatorioOpen} onClose={() => setModalRelatorioOpen(false)} onDownload={gerarRelatorioCSV} loading={gerandoRelatorio} />
        
        <FiltrosArea 
          dataFiltro={dataFiltro} setDataFiltro={setDataFiltro}
          horaInicialFiltro={horaInicialFiltro} setHoraInicialFiltro={setHoraInicialFiltro}
          operadorFiltro={operadorFiltro} setOperadorFiltro={setOperadorFiltro}
          aplicarFiltros={aplicarFiltros} limparFiltros={limparFiltros} formatarDataBR={formatarDataBR}
        />

        <ResumoCards 
          operacoesFiltradas={operacoesFiltradas} 
          setOperacaoSelecionada={setOperacaoSelecionada} setOperacaoIdSelecionado={setOperacaoIdSelecionado} loading={loading} 
        />

        <div className="flex w-full" style={{ height: 'calc(100vh - 190px)', zoom: 0.78 }}>
          {/* Sidebar Lista */}
          <div className="w-[400px] flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lista de Operações</h2>
            </div>
            <div className="flex-1 p-2 space-y-1 overflow-y-auto bg-slate-900">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleGrupo('TODOS')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex-shrink-0"
                >
                  {gruposExpandidos.has('TODOS') ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                <button 
                  onClick={() => { setOperacaoSelecionada('TODOS'); setOperacaoIdSelecionado(null); }} 
                  className={`flex-1 text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    operacaoSelecionada === 'TODOS' && !operacaoIdSelecionado 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="font-medium">Todas Operações</span>
                  <Badge variant="secondary" className={`${
                    operacaoSelecionada === 'TODOS' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-800 text-slate-400'
                  } text-[9px] h-4 px-1.5 ml-2 flex-shrink-0`}>
                    {operacoesFiltradas.length}
                  </Badge>
                </button>
              </div>

              {gruposExpandidos.has('TODOS') && operacaoSelecionada === 'TODOS' && (
                <div className="mt-1 ml-7 pl-2 border-l border-slate-700 space-y-1">
                  {operacoesFiltradas.map(op => {
                    const isActive = operacaoIdSelecionado === op.id;
                    const label = op.op === 'NAVIO' && op.navios 
                      ? `${formatarDataBR(op.data)} - ${op.hora_inicial} - ${op.navios.nome_navio}` 
                      : `${op.data} - ${op.hora_inicial}`;
                    
                    return (
                      <button key={op.id} onClick={() => setOperacaoIdSelecionado(op.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] flex justify-between items-center transition-colors ${
                          isActive 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}>
                        <span className="truncate pr-2">{label}</span>
                        <span className="font-mono text-[9px] text-slate-500 flex-shrink-0">{formatarHoras(op.equipamentos.reduce((a,b)=>a+(Number(b.horas_trabalhadas)||0),0))}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {Object.entries(operacoesPorTipo).map(([tipo, ops]) => {
                const Icon = getOperacaoIcon(tipo.startsWith('NAVIO') ? 'NAVIO' : tipo);
                const isExpanded = gruposExpandidos.has(tipo);
                
                return (
                  <div key={tipo} className="mt-1">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleGrupo(tipo)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button 
                        onClick={() => { setOperacaoSelecionada(tipo); setOperacaoIdSelecionado(null); }}
                        className={`flex-1 text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          operacaoSelecionada === tipo && !operacaoIdSelecionado 
                            ? 'bg-slate-800 text-white border border-slate-700' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="truncate font-medium text-xs">{tipo}</span>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-400 text-[9px] h-4 px-1.5 ml-2 flex-shrink-0">{ops.length}</Badge>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-1 ml-7 pl-2 border-l border-slate-700 space-y-1">
                        {ops.map(op => {
                           const isActive = operacaoIdSelecionado === op.id;
                           const label = op.op === 'NAVIO' && op.navios 
                             ? `${formatarDataBR(op.data)} - ${op.hora_inicial}` 
                             : `${op.data} - ${op.hora_inicial}`;
                           
                           return (
                             <button key={op.id} onClick={() => setOperacaoIdSelecionado(op.id)}
                               className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] flex justify-between items-center transition-colors ${
                                 isActive 
                                   ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                   : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                             }`}>
                               <span className="truncate pr-2">{label}</span>
                               <span className="font-mono text-[9px] text-slate-500 flex-shrink-0">{formatarHoras(op.equipamentos.reduce((a,b)=>a+(Number(b.horas_trabalhadas)||0),0))}</span>
                             </button>
                           );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 p-4">
            {loading && operacoesFiltradas.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <Loader2 className="h-6 w-6 animate-spin mb-3 text-blue-500" />
                 <p className="text-xs">Carregando operações...</p>
               </div>
            ) : error ? (
               <div className="flex items-center justify-center h-full text-red-400 flex-col gap-2">
                 <span className="text-xs">Erro ao carregar dados</span>
                 <Button onClick={handleAtualizarDados} variant="outline" size="sm" className="h-7 text-xs px-2">Tentar novamente</Button>
               </div>
            ) : (
              <div className="flex-1 flex gap-4 min-h-0">
                 <div className="flex-[3] min-w-0">
                   <TabelaOperacao operacao={operacaoAtual} formatarDataBR={formatarDataBR} formatarHoras={formatarHoras} />
                 </div>
                 <div className="flex-1 min-w-[280px] max-w-[380px]">
                   <PainelLateral ajudantes={operacaoAtual?.ajudantes || []} ausencias={operacaoAtual?.ausencias || []} />
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RelatorioTransporte;