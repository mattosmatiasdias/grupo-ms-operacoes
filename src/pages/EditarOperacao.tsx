// src/pages/EditarOperacao.tsx
import { useEffect, useState, useCallback } from 'react';
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

// Interfaces para Tipagem
interface Equipamento { id: string; tag: string; motorista_operador: string; }
interface Navio { id: string; nome_navio: string; carga: string; }
interface OperacaoGrupo { id: string; nome: string; equipamentos: Equipamento[]; }
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; observacao: string; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string; }

const EditarOperacao = () => {
    const { id: operacaoId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    // Estados do formulário
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedOp, setSelectedOp] = useState('');
    const [data, setData] = useState('');
    const [horaInicial, setHoraInicial] = useState('');
    const [horaFinal, setHoraFinal] = useState('');
    const [observacao, setObservacao] = useState('');
    const [equipamentosNavio, setEquipamentosNavio] = useState<Equipamento[]>([]);
    const [navios, setNavios] = useState<Navio[]>([]);
    const [selectedNavio, setSelectedNavio] = useState('');
    const [operacaoGrupos, setOperacaoGrupos] = useState<OperacaoGrupo[]>([]);
    const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
    const [ausencias, setAusencias] = useState<Ausencia[]>([]);

    const carregarDadosOperacao = useCallback(async () => {
        if (!operacaoId) return;
        setLoading(true);
        try {
            const { data: opData, error } = await supabase.from('registro_operacoes').select('*, equipamentos(*), ajudantes(*), ausencias(*)').eq('id', operacaoId).single();
            if (error) throw error;

            // Converte todos os campos de texto para maiúsculas ao carregar
            setSelectedOp(opData.op);
            setData(opData.data);
            setHoraInicial(opData.hora_inicial || '');
            setHoraFinal(opData.hora_final || '');
            setObservacao(opData.observacao?.toUpperCase() || '');
            setSelectedNavio(opData.navio_id || '');

            setAjudantes((opData.ajudantes || []).map((a: any) => ({
                ...a,
                id: a.id.toString(),
                nome: a.nome?.toUpperCase() || '',
                observacao: a.observacao?.toUpperCase() || ''
            })));

            setAusencias((opData.ausencias || []).map((a: any) => ({
                ...a,
                id: a.id.toString(),
                nome: a.nome?.toUpperCase() || '',
                obs: a.obs?.toUpperCase() || ''
            })));

            if (opData.op === 'NAVIO') {
                setEquipamentosNavio((opData.equipamentos || []).map((eq: any) => ({
                    ...eq,
                    id: eq.id.toString(),
                    tag: eq.tag?.toUpperCase() || '',
                    motorista_operador: eq.motorista_operador?.toUpperCase() || ''
                })));
            } else {
                const grupos: { [key: string]: Equipamento[] } = {};
                opData.equipamentos.forEach((eq: any) => {
                    const grupo = eq.grupo_operacao || 'Operação Principal';
                    if (!grupos[grupo]) grupos[grupo] = [];
                    grupos[grupo].push({
                        ...eq,
                        id: eq.id.toString(),
                        tag: eq.tag?.toUpperCase() || '',
                        motorista_operador: eq.motorista_operador?.toUpperCase() || ''
                    });
                });
                setOperacaoGrupos(Object.keys(grupos).map(nome => ({
                    id: `grupo-${nome}`,
                    nome,
                    equipamentos: grupos[nome]
                })));
            }
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível carregar os dados da operação.", variant: "destructive" });
            navigate('/relatorio-transporte');
        } finally {
            setLoading(false);
        }
    }, [operacaoId, navigate, toast]);

    const fetchNavios = useCallback(async () => {
        const { data, error } = await supabase.from('navios').select('*').eq('concluido', false);
        if (!error) setNavios(data || []);
    }, []);

    useEffect(() => {
        carregarDadosOperacao();
        fetchNavios();
    }, [carregarDadosOperacao, fetchNavios]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !operacaoId) return;
        setIsSaving(true);
        try {
            await supabase.from('registro_operacoes').update({ 
                op: selectedOp, 
                data, 
                hora_inicial: horaInicial, 
                hora_final: horaFinal, 
                observacao: observacao.toUpperCase(), 
                navio_id: selectedNavio || null 
            }).eq('id', operacaoId);

            await supabase.from('equipamentos').delete().eq('registro_operacoes_id', operacaoId);
            let equipamentosParaSalvar: any[] = [];
            if (selectedOp === 'NAVIO') { 
                equipamentosParaSalvar = equipamentosNavio.filter(eq => eq.tag).map(({ id, ...rest }) => ({ 
                    ...rest, 
                    registro_operacoes_id: operacaoId, 
                    local: 'NAVIO', 
                    grupo_operacao: 'Operação Navio' 
                })); 
            } else { 
                operacaoGrupos.forEach(g => { 
                    const eG = g.equipamentos.filter(eq => eq.tag).map(({ id, ...rest }) => ({ 
                        ...rest, 
                        registro_operacoes_id: operacaoId, 
                        local: selectedOp, 
                        grupo_operacao: g.nome 
                    })); 
                    equipamentosParaSalvar.push(...eG); 
                }); 
            }
            if (equipamentosParaSalvar.length > 0) { 
                await supabase.from('equipamentos').insert(equipamentosParaSalvar); 
            }

            await supabase.from('ajudantes').delete().eq('registro_operacoes_id', operacaoId);
            if (ajudantes.length > 0) { 
                const ajudantesData = ajudantes.map(({ id, ...rest }) => ({ 
                    ...rest, 
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: rest.nome.toUpperCase(),
                    observacao: rest.observacao?.toUpperCase() || ''
                })); 
                await supabase.from('ajudantes').insert(ajudantesData); 
            }

            await supabase.from('ausencias').delete().eq('registro_operacoes_id', operacaoId);
            if (ausencias.length > 0) { 
                const ausenciasData = ausencias.map(({ id, ...rest }) => ({ 
                    ...rest, 
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: rest.nome.toUpperCase(),
                    obs: rest.obs?.toUpperCase() || ''
                })); 
                await supabase.from('ausencias').insert(ausenciasData); 
            }

            toast({ title: "Sucesso!", description: "Operação atualizada com sucesso." });
            navigate('/relatorio-transporte');
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Funções de manipulação dos formulários
    const addEquipamentoNavio = (count = 1) => { 
        const n = []; 
        for (let i = 0; i < count; i++) { 
            n.push({ id: `${Date.now()}-${i}`, tag: '', motorista_operador: '' }); 
        } 
        setEquipamentosNavio([...equipamentosNavio, ...n]); 
    };
    const updateEquipamentoNavio = (id: string, field: keyof Equipamento, value: string) => { 
        setEquipamentosNavio(equipamentosNavio.map(eq => eq.id === id ? { ...eq, [field]: value.toUpperCase() } : eq)); 
    };
    const removeEquipamentoNavio = (id: string) => { 
        setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id)); 
    };

    const addOperacaoGrupo = () => { 
        setOperacaoGrupos([...operacaoGrupos, { id: Date.now().toString(), nome: `Operação ${operacaoGrupos.length + 1}`, equipamentos: [] }]); 
    };
    const updateOperacaoGrupo = (id: string, newName: string) => { 
        setOperacaoGrupos(operacaoGrupos.map(op => op.id === id ? { ...op, nome: newName.toUpperCase() } : op)); 
    };
    const removeOperacaoGrupo = (id: string) => { 
        setOperacaoGrupos(operacaoGrupos.filter(op => op.id !== id)); 
    };

    const addEquipamentoGrupo = (grupoId: string, count = 1) => { 
        const nG = operacaoGrupos.map(g => { 
            if (g.id === grupoId) { 
                const nE = []; 
                for (let i = 0; i < count; i++) { 
                    nE.push({ id: `${Date.now()}-${i}`, tag: '', motorista_operador: '' }); 
                } 
                return { ...g, equipamentos: [...g.equipamentos, ...nE] }; 
            } 
            return g; 
        }); 
        setOperacaoGrupos(nG); 
    };
    const updateEquipamentoGrupo = (gId: string, eqId: string, f: keyof Equipamento, v: string) => { 
        const nG = operacaoGrupos.map(g => { 
            if (g.id === gId) { 
                const uE = g.equipamentos.map(eq => eq.id === eqId ? { ...eq, [f]: v.toUpperCase() } : eq); 
                return { ...g, equipamentos: uE }; 
            } 
            return g; 
        }); 
        setOperacaoGrupos(nG); 
    };
    const removeEquipamentoGrupo = (gId: string, eqId: string) => { 
        const nG = operacaoGrupos.map(g => { 
            if (g.id === gId) { 
                return { ...g, equipamentos: g.equipamentos.filter(eq => eq.id !== eqId) }; 
            } 
            return g; 
        }); 
        setOperacaoGrupos(nG); 
    };

    const addAjudante = () => setAjudantes([...ajudantes, { id: Date.now().toString(), nome: '', hora_inicial: '', hora_final: '', observacao: '' }]);
    const updateAjudante = (id: string, field: keyof Ajudante, value: string) => 
        setAjudantes(ajudantes.map(a => a.id === id ? { ...a, [field]: value.toUpperCase() } : a));

    const removeAjudante = (id: string) => setAjudantes(ajudantes.filter(a => a.id !== id));

    const addAusencia = () => setAusencias([...ausencias, { id: Date.now().toString(), nome: '', justificado: false, obs: '' }]);
    const updateAusencia = (id: string, field: keyof Ausencia, value: string | boolean) => {
        if (field === 'nome' || field === 'obs') {
            setAusencias(ausencias.map(a => a.id === id ? { ...a, [field]: (value as string).toUpperCase() } : a));
        } else {
            setAusencias(ausencias.map(a => a.id === id ? { ...a, [field]: value } : a));
        }
    };
    const removeAusencia = (id: string) => setAusencias(ausencias.filter(a => a.id !== id));

    if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}><p className="text-white">Carregando dados para edição...</p></div>;

    return (
        <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
            <div className="flex items-center p-4 text-white">
                <Button variant="ghost" onClick={() => navigate('/relatorio-transporte')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
                <h1 className="text-xl font-bold">Editando Operação: {selectedOp}</h1>
            </div>
            <form onSubmit={handleUpdate} className="p-4 space-y-4">
                <Card><CardHeader><CardTitle>Dados da Operação</CardTitle></CardHeader><CardContent className="space-y-4 pt-4">
                    {selectedOp === 'NAVIO' && ( 
                        <div>
                            <Label>Selecionar Navio</Label>
                            <Select value={selectedNavio} onValueChange={setSelectedNavio}>
                                <SelectTrigger><SelectValue placeholder="Selecione um navio..." /></SelectTrigger>
                                <SelectContent>
                                    {navios.map((navio) => (
                                        <SelectItem key={navio.id} value={navio.id}>{navio.nome_navio} - {navio.carga}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div> 
                    )}
                    <div>
                        <Label>DATA</Label>
                        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
                    </div>
                    <div>
                        <Label>HORA INICIAL</Label>
                        <Input type="time" value={horaInicial} onChange={(e) => setHoraInicial(e.target.value)} />
                    </div>
                    <div>
                        <Label>HORA FINAL</Label>
                        <Input type="time" value={horaFinal} onChange={(e) => setHoraFinal(e.target.value)} />
                    </div>
                    <div>
                        <Label>Observação do Turno</Label>
                        <Textarea 
                            value={observacao} 
                            onChange={(e) => setObservacao(e.target.value.toUpperCase())} 
                        />
                    </div>
                </CardContent></Card>

                {selectedOp === 'NAVIO' && (
                    <Card>
                        <CardHeader><CardTitle>Equipamentos do Navio</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {equipamentosNavio.map(eq => (
                                    <div key={eq.id} className="flex items-center gap-2">
                                        <Input 
                                            placeholder="TAG" 
                                            value={eq.tag} 
                                            onChange={e => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} 
                                        />
                                        <Input 
                                            placeholder="OPERADOR/MOTORISTA" 
                                            value={eq.motorista_operador} 
                                            onChange={e => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} 
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeEquipamentoNavio(eq.id)}>
                                            <X className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button type="button" onClick={() => addEquipamentoNavio(1)} className="flex-1">+1 Equipamento</Button>
                                <Button type="button" onClick={() => addEquipamentoNavio(10)} variant="secondary" className="flex-1">+10 Equipamentos</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
                    <div className="space-y-4">
                        {operacaoGrupos.map(grupo => (
                            <Card key={grupo.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <Input 
                                            className="text-lg font-bold border-0 shadow-none focus-visible:ring-0 p-0" 
                                            value={grupo.nome} 
                                            onChange={e => updateOperacaoGrupo(grupo.id, e.target.value.toUpperCase())} 
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeOperacaoGrupo(grupo.id)}>
                                            <X className="h-5 w-5 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {grupo.equipamentos.map(eq => (
                                            <div key={eq.id} className="flex items-center gap-2">
                                                <Input 
                                                    placeholder="TAG" 
                                                    value={eq.tag} 
                                                    onChange={e => updateEquipamentoGrupo(grupo.id, eq.id, 'tag', e.target.value)} 
                                                />
                                                <Input 
                                                    placeholder="OPERADOR" 
                                                    value={eq.motorista_operador} 
                                                    onChange={e => updateEquipamentoGrupo(grupo.id, eq.id, 'motorista_operador', e.target.value)} 
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeEquipamentoGrupo(grupo.id, eq.id)}>
                                                    <X className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button type="button" onClick={() => addEquipamentoGrupo(grupo.id, 1)} size="sm" className="flex-1">+1 Equipamento</Button>
                                        <Button type="button" onClick={() => addEquipamentoGrupo(grupo.id, 10)} size="sm" variant="secondary" className="flex-1">+10 Equipamentos</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button type="button" onClick={addOperacaoGrupo} variant="outline" className="w-full">Adicionar Operação (Frente de Serviço)</Button>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Ajudantes</CardTitle>
                            <Button type="button" onClick={addAjudante} size="sm">
                                <Plus className="h-4 w-4 mr-2" />Ajudante
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {ajudantes.length === 0 && <p className="text-center text-muted-foreground">Nenhum ajudante adicionado.</p>}
                        {ajudantes.map(ajudante => (
                            <Card key={ajudante.id} className="p-4 relative">
                                <Button type="button" onClick={() => removeAjudante(ajudante.id)} size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7">
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                                <div className="space-y-2">
                                    <div>
                                        <Label>Nome</Label>
                                        <Input 
                                            value={ajudante.nome} 
                                            onChange={(e) => updateAjudante(ajudante.id, 'nome', e.target.value)} 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label>Início</Label>
                                            <Input 
                                                type="time" 
                                                value={ajudante.hora_inicial} 
                                                onChange={(e) => updateAjudante(ajudante.id, 'hora_inicial', e.target.value)} 
                                            />
                                        </div>
                                        <div>
                                            <Label>Fim</Label>
                                            <Input 
                                                type="time" 
                                                value={ajudante.hora_final} 
                                                onChange={(e) => updateAjudante(ajudante.id, 'hora_final', e.target.value)} 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Observação</Label>
                                        <Input 
                                            value={ajudante.observacao} 
                                            onChange={(e) => updateAjudante(ajudante.id, 'observacao', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Ausências</CardTitle>
                            <Button type="button" onClick={addAusencia} size="sm">
                                <Plus className="h-4 w-4 mr-2" />Ausência
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {ausencias.length === 0 && <p className="text-center text-muted-foreground">Nenhuma ausência adicionada.</p>}
                        {ausencias.map(ausencia => (
                            <Card key={ausencia.id} className="p-4 relative">
                                <Button type="button" onClick={() => removeAusencia(ausencia.id)} size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7">
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                                <div className="space-y-2">
                                    <div>
                                        <Label>Nome</Label>
                                        <Input 
                                            value={ausencia.nome} 
                                            onChange={(e) => updateAusencia(ausencia.id, 'nome', e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label>Observação</Label>
                                        <Input 
                                            value={ausencia.obs} 
                                            onChange={(e) => updateAusencia(ausencia.id, 'obs', e.target.value)} 
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            checked={ausencia.justificado} 
                                            onCheckedChange={(checked) => updateAusencia(ausencia.id, 'justificado', !!checked)} 
                                        />
                                        <Label>Justificado</Label>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full h-12 bg-accent hover:bg-accent/90" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </form>
        </div>
    );
};

export default EditarOperacao;