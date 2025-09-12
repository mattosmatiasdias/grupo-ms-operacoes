import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, EyeOff, ChevronLeft, ChevronRight, Pencil, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces para Tipagem
interface Equipamento { id: string; tag: string; motorista_operador: string; grupo_operacao: string; }
interface Navio { id: string; nome_navio: string; carga: string; }
interface OperacaoGrupo { id: string; nome: string; equipamentos: Equipamento[]; }
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; observacao: string; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string; }
interface OperacaoCompleta {
  id: string;
  op: string;
  data: string;
  created_at: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string | null;
  navios: {
    nome_navio: string;
    carga: string;
  } | null;
  equipamentos: any[];
  ajudantes: any[];
  ausencias: any[];
}

const VisualizarOperacao = () => {
    const { id: operacaoId } = useParams();
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    // Estados do formulário
    const [loading, setLoading] = useState(true);
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
    const [navioInfo, setNavioInfo] = useState<{nome_navio: string, carga: string} | null>(null);
    const [operacoesList, setOperacoesList] = useState<OperacaoCompleta[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const carregarDadosOperacao = useCallback(async () => {
        if (!operacaoId) return;
        setLoading(true);
        try {
            // Carrega todas as operações do mesmo dia para navegação
            const { data: todasOperacoes, error: operacoesError } = await supabase
                .from('registro_operacoes')
                .select('*, equipamentos(*), navios(nome_navio, carga), ajudantes(*), ausencias(*)')
                .eq('data', data || new Date().toISOString().split('T')[0])
                .order('hora_inicial', { ascending: true });

            if (operacoesError) throw operacoesError;
            setOperacoesList(todasOperacoes || []);

            // Encontra o índice da operação atual
            if (todasOperacoes) {
                const index = todasOperacoes.findIndex(op => op.id === operacaoId);
                setCurrentIndex(index >= 0 ? index : 0);
            }

            const { data: opData, error } = await supabase
                .from('registro_operacoes')
                .select('*, equipamentos(*), ajudantes(*), ausencias(*), navios(nome_navio, carga)')
                .eq('id', operacaoId)
                .single();
                
            if (error) throw error;
            
            setSelectedOp(opData.op);
            setData(opData.data);
            setHoraInicial(opData.hora_inicial || '');
            setHoraFinal(opData.hora_final || '');
            setObservacao(opData.observacao || '');
            setSelectedNavio(opData.navio_id || '');
            setAjudantes(opData.ajudantes.map((a: any) => ({ ...a, id: a.id.toString() })) || []);
            setAusencias(opData.ausencias.map((a: any) => ({ ...a, id: a.id.toString() })) || []);
            
            if (opData.navios) {
                setNavioInfo(opData.navios);
            }

            if (opData.op === 'NAVIO') {
                setEquipamentosNavio(opData.equipamentos.map((eq: any) => ({ ...eq, id: eq.id.toString() })) || []);
            } else {
                const grupos: { [key: string]: Equipamento[] } = {};
                opData.equipamentos.forEach((eq: any) => {
                    const grupo = eq.grupo_operacao || 'Operação Principal';
                    if (!grupos[grupo]) grupos[grupo] = [];
                    grupos[grupo].push({ ...eq, id: eq.id.toString() });
                });
                setOperacaoGrupos(Object.keys(grupos).map(nome => ({ id: `grupo-${nome}`, nome, equipamentos: grupos[nome] })));
            }
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível carregar os dados da operação.", variant: "destructive" });
            navigate('/relatorio-transporte');
        } finally {
            setLoading(false);
        }
    }, [operacaoId, navigate, toast, data]);

    useEffect(() => {
        carregarDadosOperacao();
    }, [carregarDadosOperacao]);

    const navigateToOperation = (direction: 'prev' | 'next') => {
        if (operacoesList.length === 0) return;

        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % operacoesList.length;
        } else {
            newIndex = (currentIndex - 1 + operacoesList.length) % operacoesList.length;
        }

        const nextOperation = operacoesList[newIndex];
        navigate(`/operacao/${nextOperation.id}/visualizar`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
        const nomeUsuario = userProfile?.full_name || 'N/A';
        const nomeOperacao = selectedOp === 'NAVIO' && navioInfo ? `${navioInfo.nome_navio} (${navioInfo.carga})` : selectedOp;

        // Cabeçalho
        doc.setFontSize(18);
        doc.text(`Relatório da Operação: ${nomeOperacao}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Data: ${dataFormatada} | Horário: ${horaInicial} - ${horaFinal}`, 14, 30);
        doc.text(`Gerado por: ${nomeUsuario}`, 14, 36);

        let finalY = 40;

        // Tabela de Equipamentos
        const equipamentos = selectedOp === 'NAVIO' ? equipamentosNavio : operacaoGrupos.flatMap(g => g.equipamentos);
        if (equipamentos.length > 0) {
            autoTable(doc, {
                startY: finalY + 5,
                head: [['Grupo', 'TAG', 'Operador/Motorista']],
                body: equipamentos.map(eq => [
                    eq.grupo_operacao || 'Navio',
                    eq.tag,
                    eq.motorista_operador
                ]),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Tabela de Ajudantes
        if (ajudantes.length > 0) {
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Ajudante', 'Início', 'Fim', 'Observação']],
                body: ajudantes.map(a => [a.nome, a.hora_inicial, a.hora_final, a.observacao || '']),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Tabela de Ausências
        if (ausencias.length > 0) {
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Ausente', 'Justificado', 'Observação']],
                body: ausencias.map(a => [a.nome, a.justificado ? 'Sim' : 'Não', a.obs || '']),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Observação Geral
        if (observacao) {
            doc.setFontSize(12);
            doc.text("Observação Geral do Turno:", 14, finalY + 15);
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(observacao, 180);
            doc.text(splitText, 14, finalY + 20);
        }
        
        doc.save(`relatorio_${nomeOperacao}_${data}.pdf`);
    };

    const isEditable = () => {
        if (!operacoesList[currentIndex]) return false;
        const createdAt = new Date(operacoesList[currentIndex].created_at).getTime();
        const now = new Date().getTime();
        return (now - createdAt) < 24 * 60 * 60 * 1000;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}><p className="text-white">Carregando dados para visualização...</p></div>;

    return (
        <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
            <div className="flex items-center p-4 text-white">
                <Button variant="ghost" onClick={() => navigate('/relatorio-transporte')} className="text-white hover:bg-white/20 mr-4">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">Visualizando Operação: {selectedOp}</h1>
            </div>

            {/* Botões de Navegação e Ações */}
            <div className="px-4 mb-4">
                <Card className="bg-white/90">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigateToOperation('prev')}
                                disabled={operacoesList.length <= 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {currentIndex + 1} de {operacoesList.length}
                            </span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigateToOperation('next')}
                                disabled={operacoesList.length <= 1}
                            >
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleExportPDF}
                            >
                                <FileDown className="h-4 w-4 mr-1" />
                                Exportar PDF
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => navigate(`/operacao/${operacaoId}/editar`)}
                                disabled={!isEditable()}
                                title={isEditable() ? 'Editar operação' : 'Edição bloqueada (24h)'}
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Operação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {selectedOp === 'NAVIO' && navioInfo && (
                            <div>
                                <Label>Navio</Label>
                                <Input 
                                    value={`${navioInfo.nome_navio} - ${navioInfo.carga}`} 
                                    readOnly 
                                    className="bg-muted"
                                />
                            </div>
                        )}
                        <div>
                            <Label>Operação</Label>
                            <Input value={selectedOp} readOnly className="bg-muted" />
                        </div>
                        <div>
                            <Label>DATA</Label>
                            <Input type="date" value={data} readOnly className="bg-muted" />
                        </div>
                        <div>
                            <Label>HORA INICIAL</Label>
                            <Input type="time" value={horaInicial} readOnly className="bg-muted" />
                        </div>
                        <div>
                            <Label>HORA FINAL</Label>
                            <Input type="time" value={horaFinal} readOnly className="bg-muted" />
                        </div>
                        <div>
                            <Label>Observação do Turno</Label>
                            <Textarea value={observacao || "Nenhuma observação"} readOnly className="bg-muted min-h-[100px]" />
                        </div>
                    </CardContent>
                </Card>
                
                {selectedOp === 'NAVIO' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipamentos do Navio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {equipamentosNavio.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">Nenhum equipamento registrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {equipamentosNavio.map(eq => (
                                        <div key={eq.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                            <Input 
                                                placeholder="TAG" 
                                                value={eq.tag} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                            <Input 
                                                placeholder="OPERADOR/MOTORISTA" 
                                                value={eq.motorista_operador} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
                    <div className="space-y-4">
                        {operacaoGrupos.length === 0 ? (
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-center text-muted-foreground py-4">Nenhuma operação registrada.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            operacaoGrupos.map(grupo => (
                                <Card key={grupo.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold">{grupo.nome}</h3>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {grupo.equipamentos.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-2">Nenhum equipamento neste grupo.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {grupo.equipamentos.map(eq => (
                                                    <div key={eq.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                                        <Input 
                                                            placeholder="TAG" 
                                                            value={eq.tag} 
                                                            readOnly 
                                                            className="border-0 bg-transparent" 
                                                        />
                                                        <Input 
                                                            placeholder="OPERADOR" 
                                                            value={eq.motorista_operador} 
                                                            readOnly 
                                                            className="border-0 bg-transparent" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Ajudantes</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {ajudantes.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Nenhum ajudante registrado.</p>
                        ) : (
                            ajudantes.map(ajudante => (
                                <Card key={ajudante.id} className="p-4 bg-muted/30">
                                    <div className="space-y-2">
                                        <div>
                                            <Label>Nome</Label>
                                            <Input 
                                                value={ajudante.nome} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label>Início</Label>
                                                <Input 
                                                    type="time" 
                                                    value={ajudante.hora_inicial} 
                                                    readOnly 
                                                    className="border-0 bg-transparent" 
                                                />
                                            </div>
                                            <div>
                                                <Label>Fim</Label>
                                                <Input 
                                                    type="time" 
                                                    value={ajudante.hora_final} 
                                                    readOnly 
                                                    className="border-0 bg-transparent" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Observação</Label>
                                            <Input 
                                                value={ajudante.observacao || "Nenhuma observação"} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Ausências</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {ausencias.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Nenhuma ausência registrada.</p>
                        ) : (
                            ausencias.map(ausencia => (
                                <Card key={ausencia.id} className="p-4 bg-muted/30">
                                    <div className="space-y-2">
                                        <div>
                                            <Label>Nome</Label>
                                            <Input 
                                                value={ausencia.nome} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                        </div>
                                        <div>
                                            <Label>Observação</Label>
                                            <Input 
                                                value={ausencia.obs || "Nenhuma observação"} 
                                                readOnly 
                                                className="border-0 bg-transparent" 
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                checked={ausencia.justificado} 
                                                disabled 
                                                className="data-[state=checked]:bg-muted-foreground"
                                            />
                                            <Label>Justificado</Label>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default VisualizarOperacao;