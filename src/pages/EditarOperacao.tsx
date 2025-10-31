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
interface Equipamento {
  id: string;
  tag: string;
  motorista_operador: string;
  grupo_operacao?: string;
  local?: string;
  created_at?: string;
}
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
    const [carga, setCarga] = useState('');
    const [equipamentosNavio, setEquipamentosNavio] = useState<Equipamento[]>([]);
    const [navios, setNavios] = useState<Navio[]>([]);
    const [selectedNavio, setSelectedNavio] = useState('');
    const [operacaoGrupos, setOperacaoGrupos] = useState<OperacaoGrupo[]>([]);
    const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
    const [ausencias, setAusencias] = useState<Ausencia[]>([]);
    
    // Estado para rastrear IDs originais dos equipamentos
    const [initialEquipamentoIds, setInitialEquipamentoIds] = useState<string[]>([]);

    const opcoesCarga = [
        'COQUE',
        'PICHE', 
        'FLUORETO',
        'ENTULHO',
        'RECHEGO',
        'OUTROS'
    ];

    const carregarDadosOperacao = useCallback(async () => {
        if (!operacaoId) return;
        setLoading(true);
        try {
            const { data: opData, error } = await supabase
                .from('registro_operacoes')
                .select('*, equipamentos(*), ajudantes(*), ausencias(*)')
                .eq('id', operacaoId)
                .single();
            
            if (error) throw error;

            setSelectedOp(opData.op);
            setData(opData.data);
            setHoraInicial(opData.hora_inicial || '');
            setHoraFinal(opData.hora_final || '');
            setObservacao(opData.observacao?.toUpperCase() || '');
            setCarga(opData.carga || '');
            setSelectedNavio(opData.navio_id || '');

            // Carregar ajudantes
            setAjudantes((opData.ajudantes || []).map((a: any) => ({
                ...a,
                id: a.id.toString(),
                nome: a.nome?.toUpperCase() || '',
                observacao: a.observacao?.toUpperCase() || ''
            })));

            // Carregar ausências
            setAusencias((opData.ausencias || []).map((a: any) => ({
                ...a,
                id: a.id.toString(),
                nome: a.nome?.toUpperCase() || '',
                obs: a.obs?.toUpperCase() || ''
            })));

            // Carregar equipamentos e armazenar IDs originais
            if (opData.equipamentos && opData.equipamentos.length > 0) {
                const equipamentosIds = opData.equipamentos.map((eq: any) => eq.id.toString());
                setInitialEquipamentoIds(equipamentosIds);
                
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
            }
        } catch (error) {
            console.error('Erro ao carregar operação:', error);
            toast({ 
                title: "Erro", 
                description: "Não foi possível carregar os dados da operação.", 
                variant: "destructive" 
            });
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

    // Função centralizada para coletar todos os equipamentos da UI
    const coletarEquipamentosDaUI = () => {
        if (selectedOp === 'NAVIO') {
            return equipamentosNavio.filter(eq => eq.tag.trim() !== '');
        } else {
            return operacaoGrupos.flatMap(grupo => 
                grupo.equipamentos.filter(eq => eq.tag.trim() !== '')
            );
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !operacaoId) return;
        setIsSaving(true);
        
        try {
            console.log('=== INÍCIO DA ATUALIZAÇÃO ===');
            console.log('IDs originais dos equipamentos:', initialEquipamentoIds);
            
            // 1. Atualizar a operação principal
            const dadosAtualizacao: any = { 
                op: selectedOp, 
                data, 
                hora_inicial: horaInicial, 
                hora_final: horaFinal, 
                observacao: observacao.toUpperCase(), 
                navio_id: selectedNavio || null,
                updated_at: new Date().toISOString()
            };

            // Adicionar campo carga se for operação ALBRAS
            if (selectedOp === 'ALBRAS') {
                dadosAtualizacao.carga = carga;
            }

            const { error: opError } = await supabase
                .from('registro_operacoes')
                .update(dadosAtualizacao)
                .eq('id', operacaoId);

            if (opError) throw opError;
            console.log('✓ Operação principal atualizada');

            // 2. Coletar todos os equipamentos da UI
            const todosEquipamentosUI = coletarEquipamentosDaUI();
            console.log('Equipamentos coletados da UI:', todosEquipamentosUI.length);

            // 3. Separar equipamentos novos e existentes
            const equipamentosNovos = todosEquipamentosUI.filter(eq => eq.id.toString().startsWith('temp-'));
            const equipamentosExistentes = todosEquipamentosUI.filter(eq => !eq.id.toString().startsWith('temp-'));
            
            console.log('Equipamentos novos:', equipamentosNovos.length);
            console.log('Equipamentos existentes:', equipamentosExistentes.length);

            // 4. Identificar equipamentos para deletar (estavam no banco mas não estão mais na UI)
            const idsNaUI = equipamentosExistentes.map(eq => eq.id);
            const idsParaDeletar = initialEquipamentoIds.filter(id => !idsNaUI.includes(id));
            
            console.log('IDs para deletar:', idsParaDeletar);

            // 5. Executar operações de DELETE
            if (idsParaDeletar.length > 0) {
                const { error: deleteError } = await supabase
                    .from('equipamentos')
                    .delete()
                    .in('id', idsParaDeletar);
                if (deleteError) throw deleteError;
                console.log('✓ Equipamentos deletados:', idsParaDeletar.length);
            }

            // 6. Executar operações de INSERT para equipamentos novos
            if (equipamentosNovos.length > 0) {
                const dadosParaInserir = equipamentosNovos.map(eq => {
                    const grupoOperacao = selectedOp === 'NAVIO' 
                        ? 'Operação Navio' 
                        : operacaoGrupos.find(g => g.equipamentos.some(e => e.id === eq.id))?.nome || 'Operação Principal';
                    
                    return {
                        registro_operacoes_id: operacaoId,
                        tag: eq.tag.toUpperCase(),
                        motorista_operador: eq.motorista_operador.toUpperCase(),
                        local: selectedOp === 'NAVIO' ? 'NAVIO' : selectedOp,
                        grupo_operacao: grupoOperacao,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                });

                const { error: insertError } = await supabase
                    .from('equipamentos')
                    .insert(dadosParaInserir);
                if (insertError) throw insertError;
                console.log('✓ Equipamentos inseridos:', equipamentosNovos.length);
            }

            // 7. Executar operações de UPDATE para equipamentos existentes
            if (equipamentosExistentes.length > 0) {
                const updatePromises = equipamentosExistentes.map(async (eq) => {
                    const grupoOperacao = selectedOp === 'NAVIO' 
                        ? 'Operação Navio' 
                        : operacaoGrupos.find(g => g.equipamentos.some(e => e.id === eq.id))?.nome || 'Operação Principal';
                    
                    const { error: updateError } = await supabase
                        .from('equipamentos')
                        .update({
                            tag: eq.tag.toUpperCase(),
                            motorista_operador: eq.motorista_operador.toUpperCase(),
                            local: selectedOp === 'NAVIO' ? 'NAVIO' : selectedOp,
                            grupo_operacao: grupoOperacao,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', eq.id);
                    if (updateError) throw updateError;
                });
                await Promise.all(updatePromises);
                console.log('✓ Equipamentos atualizados:', equipamentosExistentes.length);
            }

            // 8. Gerenciar ajudantes (delete/insert)
            await supabase.from('ajudantes').delete().eq('registro_operacoes_id', operacaoId);
            if (ajudantes.length > 0) { 
                const ajudantesData = ajudantes.map(({ id, ...rest }) => ({ 
                    ...rest, 
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: rest.nome.toUpperCase(),
                    observacao: rest.observacao?.toUpperCase() || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })); 
                await supabase.from('ajudantes').insert(ajudantesData); 
                console.log('✓ Ajudantes atualizados:', ajudantes.length);
            }

            // 9. Gerenciar ausências (delete/insert)
            await supabase.from('ausencias').delete().eq('registro_operacoes_id', operacaoId);
            if (ausencias.length > 0) { 
                const ausenciasData = ausencias.map(({ id, ...rest }) => ({ 
                    ...rest, 
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: rest.nome.toUpperCase(),
                    obs: rest.obs?.toUpperCase() || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })); 
                await supabase.from('ausencias').insert(ausenciasData); 
                console.log('✓ Ausências atualizadas:', ausencias.length);
            }

            console.log('=== ATUALIZAÇÃO CONCLUÍDA COM SUCESSO ===');
            toast({ 
                title: "Sucesso!", 
                description: "Operação atualizada com sucesso." 
            });
            navigate('/relatorio-transporte');
            
        } catch (error: any) {
            console.error('Erro ao salvar operação:', error);
            toast({ 
                title: "Erro", 
                description: `Não foi possível salvar as alterações. Detalhes: ${error.message || error.toString()}`, 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Funções de manipulação dos formulários
    const formatTag = (tag: string) => tag.toUpperCase();

    const addEquipamentoNavio = (count = 1) => { 
        const novosEquipamentos = []; 
        for (let i = 0; i < count; i++) { 
            novosEquipamentos.push({ 
                id: `temp-${Date.now()}-${i}`, 
                tag: '', 
                motorista_operador: '' 
            }); 
        } 
        setEquipamentosNavio([...equipamentosNavio, ...novosEquipamentos]); 
    };

    const updateEquipamentoNavio = (id: string, field: keyof Equipamento, value: string) => { 
        setEquipamentosNavio(equipamentosNavio.map(eq => 
            eq.id === id ? { ...eq, [field]: field === 'tag' ? formatTag(value) : value.toUpperCase() } : eq
        )); 
    };

    const removeEquipamentoNavio = (id: string) => { 
        setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id)); 
    };

    const addOperacaoGrupo = () => { 
        setOperacaoGrupos([...operacaoGrupos, { 
            id: `grupo-${Date.now()}`, 
            nome: `Operação ${operacaoGrupos.length + 1}`, 
            equipamentos: [] 
        }]); 
    };

    const updateOperacaoGrupo = (id: string, newName: string) => { 
        setOperacaoGrupos(operacaoGrupos.map(op => 
            op.id === id ? { ...op, nome: newName.toUpperCase() } : op
        )); 
    };

    const removeOperacaoGrupo = (id: string) => { 
        setOperacaoGrupos(operacaoGrupos.filter(op => op.id !== id)); 
    };

    const addEquipamentoGrupo = (grupoId: string, count = 1) => { 
        const novosEquipamentos = []; 
        for (let i = 0; i < count; i++) { 
            novosEquipamentos.push({ 
                id: `temp-${Date.now()}-${i}`, 
                tag: '', 
                motorista_operador: '' 
            }); 
        } 
        setOperacaoGrupos(operacaoGrupos.map(grupo => 
            grupo.id === grupoId 
                ? { ...grupo, equipamentos: [...grupo.equipamentos, ...novosEquipamentos] } 
                : grupo
        )); 
    };

    const updateEquipamentoGrupo = (grupoId: string, equipamentoId: string, field: keyof Equipamento, value: string) => { 
        setOperacaoGrupos(operacaoGrupos.map(grupo => 
            grupo.id === grupoId 
                ? { 
                    ...grupo, 
                    equipamentos: grupo.equipamentos.map(eq => 
                        eq.id === equipamentoId 
                            ? { ...eq, [field]: field === 'tag' ? formatTag(value) : value.toUpperCase() } 
                            : eq
                    ) 
                } 
                : grupo
        )); 
    };

    const removeEquipamentoGrupo = (grupoId: string, equipamentoId: string) => { 
        setOperacaoGrupos(operacaoGrupos.map(grupo => 
            grupo.id === grupoId 
                ? { ...grupo, equipamentos: grupo.equipamentos.filter(eq => eq.id !== equipamentoId) } 
                : grupo
        )); 
    };

    const addAjudante = () => { 
        setAjudantes([...ajudantes, { 
            id: `temp-${Date.now()}`, 
            nome: '', 
            hora_inicial: '', 
            hora_final: '', 
            observacao: '' 
        }]); 
    };

    const updateAjudante = (id: string, field: keyof Ajudante, value: string) => { 
        setAjudantes(ajudantes.map(ajudante => 
            ajudante.id === id 
                ? { ...ajudante, [field]: ['nome', 'observacao'].includes(field) ? value.toUpperCase() : value } 
                : ajudante
        )); 
    };

    const removeAjudante = (id: string) => { 
        setAjudantes(ajudantes.filter(ajudante => ajudante.id !== id)); 
    };

    const addAusencia = () => { 
        setAusencias([...ausencias, { 
            id: `temp-${Date.now()}`, 
            nome: '', 
            justificado: false, 
            obs: '' 
        }]); 
    };

    const updateAusencia = (id: string, field: keyof Ausencia, value: string | boolean) => { 
        setAusencias(ausencias.map(ausencia => 
            ausencia.id === id 
                ? { 
                    ...ausencia, 
                    [field]: typeof value === 'string' && ['nome', 'obs'].includes(field) 
                        ? value.toUpperCase() 
                        : value 
                } 
                : ausencia
        )); 
    };

    const removeAusencia = (id: string) => { 
        setAusencias(ausencias.filter(ausencia => ausencia.id !== id)); 
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                <div className="text-white text-xl">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700">
            <div className="bg-blue-800 p-4 flex items-center">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/relatorio-transporte')} 
                    className="text-white hover:bg-white/20 mr-4"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-white">Editando Operação: {selectedOp}</h1>
            </div>
            
            <form onSubmit={handleUpdate} className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Operação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {selectedOp === 'NAVIO' && ( 
                            <div>
                                <Label>Selecionar Navio</Label>
                                <Select value={selectedNavio} onValueChange={setSelectedNavio}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um navio..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {navios.map((navio) => (
                                            <SelectItem key={navio.id} value={navio.id}>
                                                {navio.nome_navio} - {navio.carga}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div> 
                        )}

                        {selectedOp === 'ALBRAS' && (
                            <div>
                                <Label>Tipo de Carga *</Label>
                                <Select value={carga} onValueChange={setCarga} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de carga" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {opcoesCarga.map((cargaItem) => (
                                            <SelectItem key={cargaItem} value={cargaItem}>
                                                {cargaItem}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Selecione o tipo de carga para a operação ALBRAS
                                </p>
                            </div>
                        )}

                        <div>
                            <Label>DATA</Label>
                            <Input 
                                type="date" 
                                value={data} 
                                onChange={(e) => setData(e.target.value)} 
                                required 
                            />
                        </div>
                        <div>
                            <Label>HORA INICIAL</Label>
                            <Input 
                                type="time" 
                                value={horaInicial} 
                                onChange={(e) => setHoraInicial(e.target.value)} 
                            />
                        </div>
                        <div>
                            <Label>HORA FINAL</Label>
                            <Input 
                                type="time" 
                                value={horaFinal} 
                                onChange={(e) => setHoraFinal(e.target.value)} 
                            />
                        </div>
                        <div>
                            <Label>Observação do Turno</Label>
                            <Textarea 
                                value={observacao} 
                                onChange={(e) => setObservacao(e.target.value.toUpperCase())} 
                                placeholder="Digite as observações do turno..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {selectedOp === 'NAVIO' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipamentos do Navio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {equipamentosNavio.map(equipamento => (
                                    <div key={equipamento.id} className="flex items-center gap-2">
                                        <Input 
                                            placeholder="TAG" 
                                            value={equipamento.tag} 
                                            onChange={e => updateEquipamentoNavio(equipamento.id, 'tag', e.target.value)} 
                                        />
                                        <Input 
                                            placeholder="OPERADOR/MOTORISTA" 
                                            value={equipamento.motorista_operador} 
                                            onChange={e => updateEquipamentoNavio(equipamento.id, 'motorista_operador', e.target.value)} 
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeEquipamentoNavio(equipamento.id)}
                                            type="button"
                                        >
                                            <X className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button 
                                    type="button" 
                                    onClick={() => addEquipamentoNavio(1)} 
                                    className="flex-1"
                                >
                                    +1 Equipamento
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={() => addEquipamentoNavio(10)} 
                                    variant="secondary" 
                                    className="flex-1"
                                >
                                    +10 Equipamentos
                                </Button>
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
                                            onChange={e => updateOperacaoGrupo(grupo.id, e.target.value)} 
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeOperacaoGrupo(grupo.id)}
                                            type="button"
                                        >
                                            <X className="h-5 w-5 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {grupo.equipamentos.map(equipamento => (
                                            <div key={equipamento.id} className="flex items-center gap-2">
                                                <Input 
                                                    placeholder="TAG" 
                                                    value={equipamento.tag} 
                                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'tag', e.target.value)} 
                                                />
                                                <Input 
                                                    placeholder="OPERADOR" 
                                                    value={equipamento.motorista_operador} 
                                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'motorista_operador', e.target.value)} 
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => removeEquipamentoGrupo(grupo.id, equipamento.id)}
                                                    type="button"
                                                >
                                                    <X className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button 
                                            type="button" 
                                            onClick={() => addEquipamentoGrupo(grupo.id, 1)} 
                                            size="sm" 
                                            className="flex-1"
                                        >
                                            +1 Equipamento
                                        </Button>
                                        <Button 
                                            type="button" 
                                            onClick={() => addEquipamentoGrupo(grupo.id, 10)} 
                                            size="sm" 
                                            variant="secondary" 
                                            className="flex-1"
                                        >
                                            +10 Equipamentos
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button 
                            type="button" 
                            onClick={addOperacaoGrupo} 
                            variant="outline" 
                            className="w-full"
                        >
                            Adicionar Operação (Frente de Serviço)
                        </Button>
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
                        {ajudantes.length === 0 && (
                            <p className="text-center text-muted-foreground">Nenhum ajudante adicionado.</p>
                        )}
                        {ajudantes.map(ajudante => (
                            <Card key={ajudante.id} className="p-4 relative">
                                <Button 
                                    type="button" 
                                    onClick={() => removeAjudante(ajudante.id)} 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute top-1 right-1 h-7 w-7"
                                >
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
                                        <Textarea 
                                            value={ajudante.observacao} 
                                            onChange={(e) => updateAjudante(ajudante.id, 'observacao', e.target.value)} 
                                            placeholder="Observações sobre o ajudante..."
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
                        {ausencias.length === 0 && (
                            <p className="text-center text-muted-foreground">Nenhuma ausência registrada.</p>
                        )}
                        {ausencias.map(ausencia => (
                            <Card key={ausencia.id} className="p-4 relative">
                                <Button 
                                    type="button" 
                                    onClick={() => removeAusencia(ausencia.id)} 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute top-1 right-1 h-7 w-7"
                                >
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                                <div className="space-y-2">
                                    <div>
                                        <Label>Nome do Ausente</Label>
                                        <Input 
                                            value={ausencia.nome} 
                                            onChange={(e) => updateAusencia(ausencia.id, 'nome', e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label>Observação</Label>
                                        <Textarea 
                                            value={ausencia.obs} 
                                            onChange={(e) => updateAusencia(ausencia.id, 'obs', e.target.value)} 
                                            placeholder="Motivo da ausência..."
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

                <Button type="submit" className="w-full mt-4" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </form>
        </div>
    );
};

export default EditarOperacao;