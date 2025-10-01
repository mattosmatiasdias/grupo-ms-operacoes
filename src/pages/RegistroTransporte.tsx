// src/pages/RegistroTransporte.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
}
interface Navio { id: string; nome_navio: string; carga: string; }
interface OperacaoGrupo { id: string; nome: string; equipamentos: Equipamento[]; }
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; observacao: string; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string; }

const RegistroTransporte = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();

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
    const [isSaving, setIsSaving] = useState(false);

    // Carregar o tipo de operação do state da navegação
    useEffect(() => {
        console.log('Location state recebido:', location.state);
        
        if (location.state?.tipoOperacao) {
            setSelectedOp(location.state.tipoOperacao);
            
            // Se for operação diferente de NAVIO, criar um grupo padrão
            if (location.state.tipoOperacao !== 'NAVIO') {
                setOperacaoGrupos([{
                    id: 'grupo-1',
                    nome: 'Operação Principal',
                    equipamentos: []
                }]);
            }
        } else {
            // Se não veio do Novo Lançamento, mostrar erro e voltar
            toast({
                title: "Erro",
                description: "Tipo de operação não especificado. Por favor, selecione novamente.",
                variant: "destructive"
            });
            navigate('/novo-lancamento');
        }
    }, [location.state, navigate, toast]);

    // Buscar navios apenas se for operação NAVIO
    useEffect(() => {
        if (selectedOp === 'NAVIO') {
            const fetchNavios = async () => {
                const { data, error } = await supabase.from('navios').select('*').eq('concluido', false);
                if (!error) setNavios(data || []);
            };
            fetchNavios();
        }
    }, [selectedOp]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({
                title: "Erro",
                description: "Usuário não autenticado.",
                variant: "destructive"
            });
            return;
        }

        if (!data) {
            toast({
                title: "Erro",
                description: "Data é obrigatória.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        
        try {
            console.log('Iniciando criação da operação:', selectedOp);

            // 1. Criar a operação principal
            const { data: opData, error: opError } = await supabase
                .from('registro_operacoes')
                .insert({ 
                    op: selectedOp, 
                    data, 
                    hora_inicial: horaInicial || null, 
                    hora_final: horaFinal || null, 
                    observacao: observacao.toUpperCase(), 
                    navio_id: selectedNavio || null,
                    user_id: user.id
                })
                .select()
                .single();

            if (opError) {
                console.error('Erro ao criar operação:', opError);
                throw opError;
            }

            const operacaoId = opData.id;
            console.log('Operação criada com ID:', operacaoId);

            // 2. Inserir equipamentos
            let equipamentosParaSalvar: any[] = [];
            
            if (selectedOp === 'NAVIO') {
                equipamentosParaSalvar = equipamentosNavio
                    .filter(eq => eq.tag.trim() !== '')
                    .map((equipamento) => ({
                        registro_operacoes_id: operacaoId,
                        tag: equipamento.tag.toUpperCase(),
                        motorista_operador: equipamento.motorista_operador.toUpperCase(),
                        local: 'NAVIO',
                        grupo_operacao: 'Operação Navio'
                    }));
            } else {
                operacaoGrupos.forEach(grupo => {
                    const equipamentosGrupo = grupo.equipamentos
                        .filter(eq => eq.tag.trim() !== '')
                        .map((equipamento) => ({
                            registro_operacoes_id: operacaoId,
                            tag: equipamento.tag.toUpperCase(),
                            motorista_operador: equipamento.motorista_operador.toUpperCase(),
                            local: selectedOp,
                            grupo_operacao: grupo.nome
                        }));
                    equipamentosParaSalvar.push(...equipamentosGrupo);
                });
            }

            if (equipamentosParaSalvar.length > 0) {
                const { error: equipError } = await supabase
                    .from('equipamentos')
                    .insert(equipamentosParaSalvar);
                if (equipError) throw equipError;
                console.log('Equipamentos inseridos:', equipamentosParaSalvar.length);
            }

            // 3. Inserir ajudantes
            if (ajudantes.length > 0) { 
                const ajudantesData = ajudantes.map((ajudante) => ({ 
                    ...ajudante,
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: ajudante.nome.toUpperCase(),
                    observacao: ajudante.observacao?.toUpperCase() || ''
                })); 
                await supabase.from('ajudantes').insert(ajudantesData); 
                console.log('Ajudantes inseridos:', ajudantes.length);
            }

            // 4. Inserir ausências
            if (ausencias.length > 0) { 
                const ausenciasData = ausencias.map((ausencia) => ({ 
                    ...ausencia,
                    registro_operacoes_id: operacaoId, 
                    data, 
                    local: selectedOp,
                    nome: ausencia.nome.toUpperCase(),
                    obs: ausencia.obs?.toUpperCase() || ''
                })); 
                await supabase.from('ausencias').insert(ausenciasData); 
                console.log('Ausências inseridas:', ausencias.length);
            }

            toast({ 
                title: "Sucesso!", 
                description: `Operação ${selectedOp} criada com sucesso!` 
            });
            navigate('/relatorio-transporte');
            
        } catch (error: any) {
            console.error('Erro ao criar operação:', error);
            toast({ 
                title: "Erro", 
                description: `Não foi possível criar a operação. Detalhes: ${error.message}`,
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Funções de manipulação dos formulários
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
            eq.id === id ? { ...eq, [field]: value.toUpperCase() } : eq
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
                            ? { ...eq, [field]: value.toUpperCase() } 
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
            hora_inicial: horaInicial || '', 
            hora_final: horaFinal || '', 
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

    if (!selectedOp) {
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
                    onClick={() => navigate('/novo-lancamento')} 
                    className="text-white hover:bg-white/20 mr-4"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-white">Nova Operação: {selectedOp}</h1>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                        <div>
                            <Label>DATA *</Label>
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

                {['HYDRO', 'ALBRAS', 'SANTOS BRASIL', 'LINGOTE'].includes(selectedOp) && (
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

                <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white" 
                    disabled={isSaving}
                >
                    {isSaving ? 'Criando Operação...' : `Criar Operação ${selectedOp}`}
                </Button>

                <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/novo-lancamento')}
                    className="w-full"
                >
                    Voltar e Escolher Outro Tipo
                </Button>
            </form>
        </div>
    );
};

export default RegistroTransporte;