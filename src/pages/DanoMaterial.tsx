// src/pages/DanoMaterial.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Wrench, Filter, Plus, Save, Loader2, X } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';

const formatarMoeda = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatarMoedaCurta = (v: number) => {
  if (v >= 1000000) return 'R$' + (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return 'R$' + (v / 1000).toFixed(0) + 'k';
  return 'R$' + v.toFixed(0);
};
const extrairTagGenerico = (tag: string) => tag.replace(/[^a-zA-Z]/g, '').toUpperCase();

const TAG_COLORS: Record<string, string> = {
  'CB': '#ff6b84', 'CM': '#ff9556', 'RE': '#fdb944', 'PC': '#5fa4ff',
  'BC': '#c4aaff', 'VA': '#22e8aa', 'ES': '#e879f9', 'MO': '#22d4c8',
  'CP': '#60a5fa', 'CPT': '#ff9556'
};
const DEFAULT_COLORS = ['#ff6b84', '#ff9556', '#fdb944', '#5fa4ff', '#c4aaff', '#22e8aa', '#e879f9', '#22d4c8', '#60a5fa', '#94a3b8'];
const getTagColor = (tag: string, i?: number) => TAG_COLORS[tag] || DEFAULT_COLORS[(i || 0) % DEFAULT_COLORS.length];

// Label personalizado para valores COMPLETOS nos gráficos
const renderValorCompleto = (props: any) => {
  const { x, y, width, value } = props;
  if (value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 8} fill="#f5f0f2" fontSize={10} fontWeight={700} textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
      {formatarMoeda(value)}
    </text>
  );
};

const renderQuantidade = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text x={x + width / 2} y={y - 8} fill="#f5f0f2" fontSize={12} fontWeight={700} textAnchor="middle">
      {value}
    </text>
  );
};

const renderTagValor = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text x={x + width + 6} y={y + 4} fill="#f5f0f2" fontSize={10} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
      {formatarMoeda(value)}
    </text>
  );
};

const DanoMaterial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoId, setPeriodoId] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ data: new Date().toISOString().split('T')[0], tag: '', avaria: '', acao: '', custo: '' });

  const carregar = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('DM_Periodos').select('*').order('data_inicio', { ascending: true });
      const { data: o } = await supabase.from('DM_Ocorrencias').select('*').order('data_ocorrencia', { ascending: true });
      setPeriodos(p || []);
      const mapa = new Map((p || []).map(x => [x.id, x.label]));
      setOcorrencias((o || []).map(x => ({ ...x, periodo_label: mapa.get(x.periodo_id) || '?' })));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.tag || !f.custo || !f.data) return;
    const gen = extrairTagGenerico(f.tag);
    const dataObj = new Date(f.data + 'T00:00:00');
    const per = periodos.find((p: any) => dataObj >= new Date(p.data_inicio + 'T00:00:00') && dataObj <= new Date(p.data_fim + 'T00:00:00'));
    if (!per) { toast({ title: 'Data fora dos períodos', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await supabase.from('DM_Ocorrencias').insert({
        data_ocorrencia: f.data, tag: f.tag.toUpperCase(), tag_generico: gen,
        avaria: f.avaria || null, acao: f.acao || null, custo: parseFloat(f.custo), periodo_id: per.id
      });
      toast({ title: 'Salvo!' });
      setF({ data: new Date().toISOString().split('T')[0], tag: '', avaria: '', acao: '', custo: '' });
      setShowForm(false);
      carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtradas = periodoId === 'todos' ? ocorrencias : ocorrencias.filter((o: any) => o.periodo_id === periodoId);
  const total = filtradas.reduce((s: number, o: any) => s + o.custo, 0);
  const qtd = filtradas.length;
  const media = qtd > 0 ? total / qtd : 0;
  const tags = new Set(filtradas.map((o: any) => o.tag_generico)).size;

  const dadosGraficoPeriodo = periodos.map((p: any) => {
    const oc = ocorrencias.filter((o: any) => o.periodo_id === p.id);
    return {
      name: p.label,
      custo: oc.reduce((s: number, o: any) => s + o.custo, 0),
      quantidade: oc.length
    };
  });

  const dadosTagGen = (() => {
    const mapa = new Map<string, { custo: number; qtd: number }>();
    filtradas.forEach((o: any) => {
      const at = mapa.get(o.tag_generico) || { custo: 0, qtd: 0 };
      mapa.set(o.tag_generico, { custo: at.custo + o.custo, qtd: at.qtd + 1 });
    });
    return Array.from(mapa.entries())
      .map(([name, d]) => ({ name, custo: d.custo, quantidade: d.qtd }))
      .sort((a, b) => b.custo - a.custo);
  })();

  const variacao = periodos.map((p: any, i: number) => {
    const oc = ocorrencias.filter((o: any) => o.periodo_id === p.id);
    const custo = oc.reduce((s: number, o: any) => s + o.custo, 0);
    const q = oc.length;
    if (i === 0) return { label: p.label, qtd: q, custo, isFirst: true };
    const ant = ocorrencias.filter((o: any) => o.periodo_id === periodos[i-1].id);
    const custoAnt = ant.reduce((s: number, o: any) => s + o.custo, 0);
    const qAnt = ant.length;
    const vCusto = custo - custoAnt;
    const vPct = custoAnt > 0 ? (vCusto / custoAnt) * 100 : 0;
    return { label: p.label, qtd: q, custo, varQtd: q - qAnt, varCusto: vCusto, varPct: vPct, isFirst: false };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-slate-200">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.name === 'Quantidade' ? entry.value : formatarMoeda(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1440px] mx-auto flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/')} variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800"><ArrowLeft className="h-5 w-5 mr-2" />Voltar</Button>
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-lg"><Wrench className="w-5 h-5 text-red-400" /></div>
              <div><h1 className="text-xl font-bold text-white">Dano Material</h1><p className="text-xs text-slate-400">2026</p></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowForm(!showForm)} className="bg-red-600 hover:bg-red-700 text-white h-9 text-sm"><Plus className="h-4 w-4 mr-2" />Nova</Button>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">DM</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto p-6 space-y-6">
        {showForm && (
          <Card className="bg-slate-900/40 border-slate-800 border-l-2 border-l-red-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-slate-200">Nova Ocorrência</CardTitle>
                <Button onClick={() => setShowForm(false)} variant="ghost" size="icon" className="text-slate-400"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={salvar} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-slate-400">Data *</Label><Input type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} className="bg-slate-950 border-slate-700 text-white" required /></div>
                  <div><Label className="text-xs text-slate-400">TAG *</Label><Input placeholder="CB-86" value={f.tag} onChange={e => setF({...f, tag: e.target.value})} className="bg-slate-950 border-slate-700 text-white font-mono" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-slate-400">Avaria</Label><Input placeholder="Avaria" value={f.avaria} onChange={e => setF({...f, avaria: e.target.value})} className="bg-slate-950 border-slate-700 text-white" /></div>
                  <div><Label className="text-xs text-slate-400">Ação</Label><Input placeholder="Ação" value={f.acao} onChange={e => setF({...f, acao: e.target.value})} className="bg-slate-950 border-slate-700 text-white" /></div>
                </div>
                <div><Label className="text-xs text-slate-400">Custo *</Label><Input type="number" step="0.01" placeholder="0,00" value={f.custo} onChange={e => setF({...f, custo: e.target.value})} className="bg-slate-950 border-slate-700 text-white" required /></div>
                <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Salvar</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase mr-2">Período:</span>
              <Button onClick={() => setPeriodoId('todos')} variant={periodoId === 'todos' ? 'default' : 'outline'} className={periodoId === 'todos' ? 'bg-red-600 h-8 text-xs' : 'border-slate-700 text-slate-400 h-8 text-xs'}>Todos</Button>
              {periodos.map((p: any) => (
                <Button key={p.id} onClick={() => setPeriodoId(p.id)} variant={periodoId === p.id ? 'default' : 'outline'} className={periodoId === p.id ? 'bg-red-600 h-8 text-xs' : 'border-slate-700 text-slate-400 h-8 text-xs'}>{p.label}</Button>
              ))}
              <Badge variant="outline" className="border-slate-700 text-slate-400 ml-auto">{filtradas.length} registros</Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800 p-4 border-t-2 border-t-red-500">
            <p className="text-xs text-slate-500">Custo total</p>
            <h3 className="text-lg font-bold text-red-400 mt-1">{formatarMoeda(total)}</h3>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4 border-t-2 border-t-amber-500">
            <p className="text-xs text-slate-500">Ocorrências</p>
            <h3 className="text-lg font-bold text-amber-400 mt-1">{qtd}</h3>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4 border-t-2 border-t-blue-500">
            <p className="text-xs text-slate-500">Custo médio</p>
            <h3 className="text-lg font-bold text-white mt-1">{formatarMoeda(media)}</h3>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4 border-t-2 border-t-orange-500">
            <p className="text-xs text-slate-500">Tipo de Equipamento</p>
            <h3 className="text-lg font-bold text-orange-400 mt-1">{tags}</h3>
          </Card>
        </div>

        {/* GRÁFICO 1: Custo por Período - VALORES COMPLETOS */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Custo por Período</CardTitle>
            <CardDescription className="text-xs text-slate-500">Valor total de danos materiais em cada período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoPeriodo} margin={{ top: 40, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: '#cbd5e1' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatarMoeda(v)} width={110} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="custo" name="Custo" fill="#ff6b84" radius={[6, 6, 0, 0]} maxBarSize={80}>
                    <LabelList content={renderValorCompleto} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO 2: Quantidade por Período */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Ocorrências por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoPeriodo} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: '#cbd5e1' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="quantidade" name="Quantidade" fill="#5fa4ff" radius={[6, 6, 0, 0]} maxBarSize={80}>
                    <LabelList content={renderQuantidade} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* GRÁFICO 3: TAG Genérico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Distribuição por Tipo de Equipamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosTagGen} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={85} dataKey="custo">
                      {dadosTagGen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTagColor(entry.name, index)} stroke="#0f0c0c" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Ranking por Tipo de Equipamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosTagGen} layout="vertical" barSize={20} margin={{ right: 110 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatarMoeda(v)} width={100} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tick={{ fill: '#cbd5e1' }} width={35} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="custo" name="Custo" radius={[0, 4, 4, 0]}>
                      {dadosTagGen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTagColor(entry.name, index)} />
                      ))}
                      <LabelList content={renderTagValor} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE VARIAÇÃO */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Variação período a período</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-3 text-xs text-slate-400">Período</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-400">Ocorr.</th>
                  <th className="text-right py-3 px-3 text-xs text-slate-400">Custo total</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-400">Var. qtd</th>
                  <th className="text-right py-3 px-3 text-xs text-slate-400">Var. custo</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-400">% Var.</th>
                </tr>
              </thead>
              <tbody>
                {variacao.map((v: any) => (
                  <tr key={v.label} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-xs font-semibold text-slate-200">{v.label}</td>
                    <td className="py-3 px-3 text-center text-xs text-slate-300">{v.qtd}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-200">{formatarMoeda(v.custo)}</td>
                    <td className="py-3 px-3 text-center">
                      {v.isFirst ? '—' : v.varQtd >= 0 ? <Badge className="bg-red-500/20 text-red-400 text-xs">+{v.varQtd}</Badge> : <Badge className="bg-green-500/20 text-green-400 text-xs">{v.varQtd}</Badge>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs" style={{ color: v.isFirst ? '#94a3b8' : v.varCusto >= 0 ? '#ff6b84' : '#22e8aa' }}>
                      {v.isFirst ? '—' : (v.varCusto >= 0 ? '+' : '') + formatarMoeda(v.varCusto)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {v.isFirst ? <Badge className="bg-slate-800 text-slate-400 text-xs">1º período</Badge> : v.varPct >= 0 ? <Badge className="bg-red-500/20 text-red-400 text-xs">+{v.varPct.toFixed(1)}%</Badge> : <Badge className="bg-green-500/20 text-green-400 text-xs">{v.varPct.toFixed(1)}%</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* LISTA DE OCORRÊNCIAS */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader><CardTitle className="text-sm text-slate-200">Ocorrências ({filtradas.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Data</th>
                  <th className="text-left py-2 px-2 text-xs text-slate-400">TAG</th>
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Gen</th>
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Período</th>
                  <th className="text-left py-2 px-2 text-xs text-slate-400">Avaria</th>
                  <th className="text-right py-2 px-2 text-xs text-slate-400">Custo</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.sort((a: any, b: any) => b.custo - a.custo).map((o: any) => (
                  <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-2 text-xs">{o.data_ocorrencia?.split('-').reverse().join('/')}</td>
                    <td className="py-2 px-2"><span className="font-mono text-xs font-semibold" style={{ color: getTagColor(o.tag_generico) }}>{o.tag}</span></td>
                    <td className="py-2 px-2"><Badge style={{ backgroundColor: getTagColor(o.tag_generico) + '20', color: getTagColor(o.tag_generico) }} className="text-xs">{o.tag_generico}</Badge></td>
                    <td className="py-2 px-2"><Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">{o.periodo_label}</Badge></td>
                    <td className="py-2 px-2 text-xs text-slate-400 max-w-[150px] truncate">{o.avaria || '—'}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-slate-200">{formatarMoeda(o.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DanoMaterial;