import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil, FileDown, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces para Tipagem ---
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
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; local: string; observacao: string | null; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string | null; }

const calcularHoras = (inicio: string, fim: string): string => { /* ...código existente sem alterações... */ };

const RelatorioTransporte = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLocal, setSelectedLocal] = useState('Todos');
    const [selectedHoraInicial, setSelectedHoraInicial] = useState('Todos');
    const [operacoes, setOperacoes] = useState<OperacaoCompleta[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // A query agora busca todos os dados relacionados de uma vez
                const { data: operacoesData, error: operacoesError } = await supabase
                    .from('registro_operacoes')
                    .select('*, equipamentos(*), navios(nome_navio, carga), ajudantes(*), ausencias(*)')
                    .eq('data', selectedDate);

                if (operacoesError) throw operacoesError;

                let operacoesFiltradas = operacoesData || [];
                if (selectedLocal !== 'Todos') {
                    operacoesFiltradas = operacoesFiltradas.filter(op => op.op === selectedLocal || op.equipamentos.some(eq => eq.local === selectedLocal));
                }
                if (selectedHoraInicial !== 'Todos') {
                    operacoesFiltradas = operacoesFiltradas.filter(op => op.hora_inicial === selectedHoraInicial);
                }
                
                setOperacoes(operacoesFiltradas);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
                toast({ title: "Erro", description: "Não foi possível carregar os relatórios.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate, selectedLocal, selectedHoraInicial, toast]);
    
    // --- NOVA FUNÇÃO PARA GERAR O PDF INDIVIDUAL ---
    const handleExportSinglePDF = (op: OperacaoCompleta) => {
        const doc = new jsPDF();
        const dataFormatada = new Date(op.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const nomeUsuario = userProfile?.full_name || 'N/A';
        const nomeOperacao = op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} (${op.navios.carga})` : op.op;

        // Cabeçalho
        doc.setFontSize(18);
        doc.text(`Relatório da Operação: ${nomeOperacao}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Data: ${dataFormatada} | Horário: ${op.hora_inicial} - ${op.hora_final}`, 14, 30);
        doc.text(`Gerado por: ${nomeUsuario}`, 14, 36);

        let finalY = 40; // Posição inicial para a primeira tabela

        // Tabela de Equipamentos
        if (op.equipamentos.length > 0) {
            autoTable(doc, {
                startY: finalY + 5,
                head: [['Grupo', 'TAG', 'Operador/Motorista']],
                body: op.equipamentos.map(eq => [eq.grupo_operacao, eq.tag, eq.motorista_operador]),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Tabela de Ajudantes
        if (op.ajudantes.length > 0) {
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Ajudante', 'Início', 'Fim', 'Observação']],
                body: op.ajudantes.map(a => [a.nome, a.hora_inicial, a.hora_final, a.observacao]),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Tabela de Ausências
        if (op.ausencias.length > 0) {
             autoTable(doc, {
                startY: finalY + 10,
                head: [['Ausente', 'Justificado', 'Observação']],
                body: op.ausencias.map(a => [a.nome, a.justificado ? 'Sim' : 'Não', a.obs]),
                didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
            });
        }
        
        // Observação Geral
        if (op.observacao) {
            doc.setFontSize(12);
            doc.text("Observação Geral do Turno:", 14, finalY + 15);
            doc.setFontSize(10);
            doc.text(op.observacao, 14, finalY + 20, { maxWidth: 180 });
        }
        
        doc.save(`relatorio_${nomeOperacao}_${op.data}.pdf`);
    };

    // --- FUNÇÃO PARA VISUALIZAR OPERAÇÃO ---
    const handleViewOperation = (op: OperacaoCompleta) => {
        // Navega para a página de visualização passando o ID da operação
        navigate(`/operacao/${op.id}/visualizar`);
    };

    return (
        <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
            <div className="flex items-center justify-between p-4 text-white">
              <div className="flex items-center">
                <Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
                <h1 className="text-xl font-bold">RELATÓRIO DE TRANSPORTE</h1>
              </div>
            </div>
            <div className="px-4 mb-4"><Card className="shadow-[var(--shadow-card)]"><CardContent className="p-4 flex justify-between items-center"><span className="text-foreground font-medium">Gestão de Operações</span><Button variant="outline" size="sm" onClick={() => navigate('/')} className="text-primary border-primary hover:bg-primary hover:text-white">Voltar ao Menu</Button></CardContent></Card></div>
            <div className="px-4 mb-4"><Button onClick={() => navigate('/novo-lancamento')} className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold" style={{ boxShadow: 'var(--shadow-button)' }}><Plus className="h-5 w-5 mr-2" />Novo Lançamento</Button></div>
            
            <div className="px-4 mb-4">
              <Card className="shadow-[var(--shadow-card)]"><CardHeader><CardTitle>Registros Salvos</CardTitle><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="flex-1"><label className="text-sm text-muted-foreground">Data:</label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1" /></div>
                <div className="flex-1"><label className="text-sm text-muted-foreground">Local:</label><Select value={selectedLocal} onValueChange={setSelectedLocal}><SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="NAVIO">NAVIO</SelectItem><SelectItem value="HYDRO">HYDRO</SelectItem><SelectItem value="ALBRAS">ALBRAS</SelectItem><SelectItem value="SANTOS BRASIL">SANTOS BRASIL</SelectItem></SelectContent></Select></div>
                <div className="flex-1"><label className="text-sm text-muted-foreground">Horário de Início:</label><Select value={selectedHoraInicial} onValueChange={setSelectedHoraInicial}><SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os Horários</SelectItem><SelectItem value="07:00:00">07:00</SelectItem><SelectItem value="19:00:00">19:00</SelectItem></SelectContent></Select></div>
              </div></CardHeader></Card>
            </div>
            
            <div className="px-4">
                <Card className="shadow-[var(--shadow-card)]">
                    <CardContent className="p-0">
                        <Tabs defaultValue="operacoes" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="operacoes">Operações</TabsTrigger>
                                <TabsTrigger value="ajudantes">Ajudantes</TabsTrigger>
                                <TabsTrigger value="ausencias">Ausências</TabsTrigger>
                                <TabsTrigger value="observacoes">Observações</TabsTrigger>
                            </TabsList>
                            <TabsContent value="operacoes" className="p-4">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Operação</TableHead><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Local</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {loading ? <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow> 
                                            : operacoes.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow> 
                                            : operacoes.map((op) => {
                                                const createdAt = new Date(op.created_at).getTime();
                                                const now = new Date().getTime();
                                                const isEditable = (now - createdAt) < 24 * 60 * 60 * 1000;
                                                return (
                                                    <TableRow key={op.id}>
                                                        <TableCell className="font-medium">{op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} (${op.navios.carga})` : op.op}</TableCell>
                                                        <TableCell>{new Date(op.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                                        <TableCell>{op.hora_inicial} - {op.hora_final}</TableCell>
                                                        <TableCell>{op.equipamentos[0]?.local || 'N/A'}</TableCell>
                                                        <TableCell className="text-right flex justify-end gap-2">
                                                            <Button variant="outline" size="sm" onClick={() => handleViewOperation(op)} title="Visualizar lançamento">
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => handleExportSinglePDF(op)} title="Baixar PDF do lançamento">
                                                                <FileDown className="h-4 w-4"/>
                                                            </Button>
                                                            <Button variant="outline" size="sm" disabled={!isEditable} onClick={() => navigate(`/operacao/${op.id}/editar`)} title={isEditable ? 'Editar lançamento' : 'Edição bloqueada'}>
                                                                <Pencil className="h-4 w-4"/>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            {/* O restante das abas permanece o mesmo */}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RelatorioTransporte;