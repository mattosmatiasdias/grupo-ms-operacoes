import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// --- Interfaces para Tipagem ---
interface Equipamento { id: string; tag: string; motorista_operador: string; }
interface Navio { id: string; nome_navio: string; carga: string; }
interface OperacaoGrupo { id: string; nome: string; equipamentos: Equipamento[]; }
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; observacao: string; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string; }

const Operacao = () => {
    const { tipo } = useParams<{ tipo: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    // --- ESTADOS DE CONTROLE DO FLUXO PASSO A PASSO ---
    const [step, setStep] = useState(1);
    const [newOperacaoId, setNewOperacaoId] = useState<string | null>(null);

    // --- ESTADOS GERAIS DO FORMULÁRIO ---
    const [isSaving, setIsSaving] = useState(false);
    const [selectedOp, setSelectedOp] = useState('');
    const [data, setData] = useState(new Date().toISOString().split('T')[0]);
    const [horaInicial, setHoraInicial] = useState('');
    const [horaFinal, setHoraFinal] = useState('');
    const [observacao, setObservacao] = useState('');

    // Estados para NAVIO
    const [equipamentosNavio, setEquipamentosNavio] = useState<Equipamento[]>([]);
    const [navios, setNavios] = useState<Navio[]>([]);
    const [selectedNavio, setSelectedNavio] = useState('');

    // Estados para HYDRO / ALBRAS / SANTOS BRASIL
    const [operacaoGrupos, setOperacaoGrupos] = useState<OperacaoGrupo[]>([]);

    // Estados para Ajudantes e Ausências
    const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
    const [ausencias, setAusencias] = useState<Ausencia[]>([]);

    useEffect(() => {
        if (['hidrato-carvao-bauxita', 'coque-piche-fluoreto', 'lingote'].includes(tipo ?? '')) {
            fetchNavios();
        } 
        else if (tipo === 'carga-geral-tarugo') {
            const opName = 'SANTOS BRASIL';
            setSelectedOp(opName);
            setOperacaoGrupos([{ id: Date.now().toString(), nome: 'Operação 1', equipamentos: [] }]);
        }
    }, [tipo]);

    const fetchNavios = async () => {
      try {
        const { data, error } = await supabase.from('navios').select('*').eq('concluido', false);
        if (error) throw error;
        setNavios(data || []);
      } catch (error) { console.error('Error fetching navios:', error); }
    };
    const getTipoLabel = () => {
      switch (tipo) {
        case 'hidrato-carvao-bauxita': return 'HIDRATO, CARVÃO, BAUXITA';
        case 'coque-piche-fluoreto': return 'COQUE, PICHE, FLUORETO';
        case 'lingote': return 'LINGOTE';
        case 'carga-geral-tarugo': return 'CARGA GERAL, TARUGO';
        default: return 'OPERAÇÃO';
      }
    };
    const handleOpSelect = (op: string) => {
        setSelectedOp(op);
        if (['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(op)) {
            setOperacaoGrupos([{ id: Date.now().toString(), nome: 'Operação 1', equipamentos: [] }]);
        }
    };
    
    const addEquipamentoNavio = (count = 1) => { const n = []; for (let i = 0; i < count; i++) { n.push({ id: `${Date.now()}-${i}`, tag: '', motorista_operador: '' }); } setEquipamentosNavio([...equipamentosNavio, ...n]); };
    const updateEquipamentoNavio = (id: string, field: keyof Equipamento, value: string) => { setEquipamentosNavio(equipamentosNavio.map(eq => eq.id === id ? { ...eq, [field]: value } : eq)); };
    const removeEquipamentoNavio = (id: string) => { setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id)); };
    const addOperacaoGrupo = () => { setOperacaoGrupos([...operacaoGrupos, { id: Date.now().toString(), nome: `Operação ${operacaoGrupos.length + 1}`, equipamentos: [] }]); };
    const updateOperacaoGrupo = (id: string, newName: string) => { setOperacaoGrupos(operacaoGrupos.map(op => op.id === id ? { ...op, nome: newName } : op)); };
    const removeOperacaoGrupo = (id: string) => { setOperacaoGrupos(operacaoGrupos.filter(op => op.id !== id)); };
    const addEquipamentoGrupo = (grupoId: string, count = 1) => { const nG = operacaoGrupos.map(g => { if (g.id === grupoId) { const nE = []; for (let i = 0; i < count; i++) { nE.push({ id: `${Date.now()}-${i}`, tag: '', motorista_operador: '' }); } return { ...g, equipamentos: [...g.equipamentos, ...nE] }; } return g; }); setOperacaoGrupos(nG); };
    const updateEquipamentoGrupo = (gId: string, eqId: string, f: keyof Equipamento, v: string) => { const nG = operacaoGrupos.map(g => { if (g.id === gId) { const uE = g.equipamentos.map(eq => eq.id === eqId ? { ...eq, [f]: v } : eq); return { ...g, equipamentos: uE }; } return g; }); setOperacaoGrupos(nG); };
    const removeEquipamentoGrupo = (gId: string, eqId: string) => { const nG = operacaoGrupos.map(g => { if (g.id === gId) { return { ...g, equipamentos: g.equipamentos.filter(eq => eq.id !== eqId) }; } return g; }); setOperacaoGrupos(nG); };
    const addAjudante = () => setAjudantes([...ajudantes, { id: Date.now().toString(), nome: '', hora_inicial: '', hora_final: '', observacao: '' }]);
    const updateAjudante = (id: string, field: keyof Ajudante, value: string) => setAjudantes(ajudantes.map(a => a.id === id ? { ...a, [field]: value } : a));
    const removeAjudante = (id: string) => setAjudantes(ajudantes.filter(a => a.id !== id));
    const addAusencia = () => setAusencias([...ausencias, { id: Date.now().toString(), nome: '', justificado: false, obs: '' }]);
    const updateAusencia = (id: string, field: keyof Ausencia, value: string | boolean) => setAusencias(ausencias.map(a => a.id === id ? { ...a, [field]: value } : a));
    const removeAusencia = (id: string) => setAusencias(ausencias.filter(a => a.id !== id));

    const handleSaveStep1 = async () => {
        if (!user || !selectedOp || !data || !horaInicial) { toast({ title: "Erro", description: "Preencha os campos de operação, data e hora inicial.", variant: "destructive" }); return; }
        setIsSaving(true);
        try {
            const { data: operacao, error: operacaoError } = await supabase.from('registro_operacoes').insert({ op: selectedOp, data, hora_inicial: horaInicial, hora_final: horaFinal || null, user_id: user.id, observacao: observacao }).select().single();
            if (operacaoError) throw operacaoError;
            setNewOperacaoId(operacao.id);
            let equipamentosParaSalvar: any[] = [];
            if (selectedOp === 'NAVIO') { equipamentosParaSalvar = equipamentosNavio.filter(eq => eq.tag).map(eq => ({ registro_operacoes_id: operacao.id, local: 'NAVIO', tag: eq.tag, motorista_operador: eq.motorista_operador, grupo_operacao: 'Operação Navio' })); }
            else if (['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp)) { operacaoGrupos.forEach(g => { const eG = g.equipamentos.filter(eq => eq.tag).map(eq => ({ registro_operacoes_id: operacao.id, local: selectedOp, tag: eq.tag, motorista_operador: eq.motorista_operador, grupo_operacao: g.nome })); equipamentosParaSalvar.push(...eG); }); }
            if (equipamentosParaSalvar.length > 0) { const { error } = await supabase.from('equipamentos').insert(equipamentosParaSalvar); if (error) throw error; }
            toast({ title: "Passo 1 Concluído", description: "Operação principal salva." });
            setStep(2);
        } catch (error) { console.error(error); toast({ title: "Erro ao salvar Passo 1", variant: "destructive" }); }
        finally { setIsSaving(false); }
    };
    const handleSaveStep2 = async () => {
        if (!newOperacaoId || ajudantes.length === 0) { setStep(3); return; }
        setIsSaving(true);
        try {
            const ajudantesData = ajudantes.map(a => ({ registro_operacoes_id: newOperacaoId, nome: a.nome, data, hora_inicial: a.hora_inicial, hora_final: a.hora_final, local: selectedOp, observacao: a.observacao }));
            const { error } = await supabase.from('ajudantes').insert(ajudantesData);
            if (error) throw error;
            toast({ title: "Passo 2 Concluído", description: "Ajudantes salvos." });
            setStep(3);
        } catch (error) { console.error(error); toast({ title: "Erro ao salvar Passo 2", variant: "destructive" }); }
        finally { setIsSaving(false); }
    };
    const handleSaveStep3 = async () => {
        if (!newOperacaoId || ausencias.length === 0) { toast({ title: "Finalizado!", description: "Lançamento concluído." }); navigate('/relatorio-transporte'); return; }
        setIsSaving(true);
        try {
            const ausenciasData = ausencias.map(a => ({ registro_operacoes_id: newOperacaoId, nome: a.nome, data, justificado: a.justificado, obs: a.obs, local: selectedOp }));
            const { error } = await supabase.from('ausencias').insert(ausenciasData);
            if (error) throw error;
            toast({ title: "Finalizado!", description: "Lançamento concluído." });
            navigate('/relatorio-transporte');
        } catch (error) { console.error(error); toast({ title: "Erro ao salvar Passo 3", variant: "destructive" }); }
        finally { setIsSaving(false); }
    };
    
    return (
      <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
        <div className="flex items-center p-4 text-white">
            <Button variant="ghost" onClick={() => step === 1 ? navigate('/novo-lancamento') : setStep(step - 1)} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold">{getTipoLabel()} - Passo {step} de 3</h1>
        </div>
        <div className="px-4 space-y-4">
            {step === 1 && (
                <>
                    {!selectedOp && (
                        <>
                            {tipo === 'hidrato-carvao-bauxita' && (
                                <div className="space-y-4">
                                    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-0"><Button onClick={() => handleOpSelect('HYDRO')} className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg">HYDRO</Button></CardContent></Card>
                                    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-0"><Button onClick={() => handleOpSelect('NAVIO')} className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg">NAVIO</Button></CardContent></Card>
                                </div>
                            )}
                            {(tipo === 'coque-piche-fluoreto' || tipo === 'lingote') && (
                                <div className="space-y-4">
                                    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-0"><Button onClick={() => handleOpSelect('ALBRAS')} className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg">ALBRAS</Button></CardContent></Card>
                                    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-0"><Button onClick={() => handleOpSelect('NAVIO')} className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg">NAVIO</Button></CardContent></Card>
                                </div>
                            )}
                        </>
                    )}
                    {selectedOp && (
                        <>
                            <Card className="shadow-[var(--shadow-card)]">
                                <CardHeader><CardTitle>Dados da Operação</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {selectedOp === 'NAVIO' && ( <div><Label>Selecionar Navio</Label><Select value={selectedNavio} onValueChange={setSelectedNavio}><SelectTrigger><SelectValue placeholder="Selecione um navio..." /></SelectTrigger><SelectContent>{navios.map((navio) => (<SelectItem key={navio.id} value={navio.id}>{navio.nome_navio} - {navio.carga}</SelectItem>))}</SelectContent></Select></div> )}
                                    <div><Label>DATA</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
                                    <div><Label>HORA INICIAL</Label><Input type="time" value={horaInicial} onChange={(e) => setHoraInicial(e.target.value)} /></div>
                                    <div><Label>HORA FINAL</Label><Input type="time" value={horaFinal} onChange={(e) => setHoraFinal(e.target.value)} /></div>
                                    <div><Label htmlFor="observacao-turno">Observação do Turno (Opcional)</Label><Textarea id="observacao-turno" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Alguma observação geral sobre a operação ou o turno..." /></div>
                                </CardContent>
                            </Card>
                            {selectedOp === 'NAVIO' && (
                                <Card className="shadow-[var(--shadow-card)]">
                                    <CardHeader><CardTitle>Equipamentos do Navio</CardTitle></CardHeader>
                                    <CardContent><div className="space-y-2">{equipamentosNavio.map(eq => (<div key={eq.id} className="flex items-center gap-2"><Input placeholder="TAG" value={eq.tag} onChange={e => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} /><Input placeholder="OPERADOR/MOTORISTA" value={eq.motorista_operador} onChange={e => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} /><Button variant="ghost" size="icon" onClick={() => removeEquipamentoNavio(eq.id)}><X className="h-4 w-4 text-red-500" /></Button></div>))}</div><div className="flex gap-2 mt-4"><Button onClick={() => addEquipamentoNavio(1)} className="flex-1">+1 Equipamento</Button><Button onClick={() => addEquipamentoNavio(10)} variant="secondary" className="flex-1">+10 Equipamentos</Button></div></CardContent>
                                </Card>
                            )}
                            {['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
                                <div className="space-y-4">
                                    {operacaoGrupos.map(grupo => (<Card key={grupo.id} className="shadow-[var(--shadow-card)]"><CardHeader><div className="flex items-center justify-between"><Input className="text-lg font-bold border-0 shadow-none focus-visible:ring-0 p-0" value={grupo.nome} onChange={e => updateOperacaoGrupo(grupo.id, e.target.value)} /><Button variant="ghost" size="icon" onClick={() => removeOperacaoGrupo(grupo.id)}><X className="h-5 w-5 text-red-500" /></Button></div></CardHeader><CardContent><div className="space-y-2">{grupo.equipamentos.map(eq => (<div key={eq.id} className="flex items-center gap-2"><Input placeholder="TAG" value={eq.tag} onChange={e => updateEquipamentoGrupo(grupo.id, eq.id, 'tag', e.target.value)} /><Input placeholder="OPERADOR" value={eq.motorista_operador} onChange={e => updateEquipamentoGrupo(grupo.id, eq.id, 'motorista_operador', e.target.value)} /><Button variant="ghost" size="icon" onClick={() => removeEquipamentoGrupo(grupo.id, eq.id)}><X className="h-4 w-4 text-red-500" /></Button></div>))}</div><div className="flex gap-2 mt-4"><Button onClick={() => addEquipamentoGrupo(grupo.id, 1)} size="sm" className="flex-1">+1 Equipamento</Button><Button onClick={() => addEquipamentoGrupo(grupo.id, 10)} size="sm" variant="secondary" className="flex-1">+10 Equipamentos</Button></div></CardContent></Card>))}
                                    <Button onClick={addOperacaoGrupo} variant="outline" className="w-full">Adicionar Operação (Frente de Serviço)</Button>
                                </div>
                            )}
                            <Button onClick={handleSaveStep1} disabled={isSaving} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold">{isSaving ? 'Salvando...' : 'Próximo: Ajudantes'}</Button>
                        </>
                    )}
                </>
            )}
            {step === 2 && (
                <>
                    <Card className="shadow-[var(--shadow-card)]">
                        <CardHeader><div className="flex justify-between items-center"><CardTitle>Adicionar Ajudantes</CardTitle><Button onClick={addAjudante} size="sm"><Plus className="h-4 w-4 mr-2" />Ajudante</Button></div></CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {ajudantes.length === 0 && <p className="text-center text-muted-foreground">Nenhum ajudante adicionado.</p>}
                            {ajudantes.map(ajudante => (<Card key={ajudante.id} className="p-4 relative"><Button onClick={() => removeAjudante(ajudante.id)} size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7"><X className="h-4 w-4 text-red-500" /></Button><div className="space-y-2"><div><Label>Nome do Ajudante</Label><Input value={ajudante.nome} onChange={(e) => updateAjudante(ajudante.id, 'nome', e.target.value)} /></div><div className="grid grid-cols-2 gap-2"><div><Label>Hora Inicial</Label><Input type="time" value={ajudante.hora_inicial} onChange={(e) => updateAjudante(ajudante.id, 'hora_inicial', e.target.value)} /></div><div><Label>Hora Final</Label><Input type="time" value={ajudante.hora_final} onChange={(e) => updateAjudante(ajudante.id, 'hora_final', e.target.value)} /></div></div><div><Label>Observação</Label><Input value={ajudante.observacao} onChange={(e) => updateAjudante(ajudante.id, 'observacao', e.target.value)} /></div></div></Card>))}
                        </CardContent>
                    </Card>
                    <Button onClick={handleSaveStep2} disabled={isSaving} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold">{isSaving ? 'Salvando...' : 'Próximo: Ausências'}</Button>
                    <Button onClick={() => setStep(3)} variant="ghost" className="w-full text-white/80">Pular</Button>
                </>
            )}
            {step === 3 && (
                <>
                    <Card className="shadow-[var(--shadow-card)]">
                        <CardHeader><div className="flex justify-between items-center"><CardTitle>Adicionar Ausências</CardTitle><Button onClick={addAusencia} size="sm"><Plus className="h-4 w-4 mr-2" />Ausência</Button></div></CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {ausencias.length === 0 && <p className="text-center text-muted-foreground">Nenhuma ausência adicionada.</p>}
                            {ausencias.map(ausencia => (<Card key={ausencia.id} className="p-4 relative"><Button onClick={() => removeAusencia(ausencia.id)} size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7"><X className="h-4 w-4 text-red-500" /></Button><div className="space-y-2"><div><Label>Nome do Ausente</Label><Input value={ausencia.nome} onChange={(e) => updateAusencia(ausencia.id, 'nome', e.target.value)} /></div><div><Label>Observação</Label><Input value={ausencia.obs} onChange={(e) => updateAusencia(ausencia.id, 'obs', e.target.value)} /></div><div className="flex items-center space-x-2"><Checkbox checked={ausencia.justificado} onCheckedChange={(checked) => updateAusencia(ausencia.id, 'justificado', !!checked)} /><Label>Justificado</Label></div></div></Card>))}
                        </CardContent>
                    </Card>
                    <Button onClick={handleSaveStep3} disabled={isSaving} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold">{isSaving ? 'Salvando...' : 'Finalizar Lançamento'}</Button>
                    <Button onClick={() => navigate('/relatorio-transporte')} variant="ghost" className="w-full text-white/80">Pular e Finalizar</Button>
                </>
            )}
        </div>
      </div>
    );
};

export default Operacao;