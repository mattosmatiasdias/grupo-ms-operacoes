import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// --- Interfaces para Tipagem ---
interface OperacaoCompleta {
  id: string;
  op: string;
  data: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string | null;
  navios: {
    nome_navio: string;
    carga: string;
  } | null;
  equipamentos: {
    local: string;
    carga: string;
    tag: string;
    motorista_operador: string;
    grupo_operacao: string;
  }[];
}
interface Ajudante { id: string; nome: string; hora_inicial: string; hora_final: string; local: string; observacao: string | null; }
interface Ausencia { id: string; nome: string; justificado: boolean; obs: string | null; }

// --- Função auxiliar para calcular horas ---
const calcularHoras = (inicio: string, fim: string): string => {
  if (!inicio || !fim) return "N/A";
  try {
    const dataBase = "1970-01-01T";
    const horaInicio = new Date(dataBase + inicio + "Z").getTime();
    const horaFim = new Date(dataBase + fim + "Z").getTime();
    if (horaFim <= horaInicio) {
        const diffMs = (horaFim + 24 * 60 * 60 * 1000) - horaInicio;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours.toFixed(2);
    }
    const diffMs = horaFim - horaInicio;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  } catch (e) { return "N/A"; }
};

const RelatorioTransporte = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLocal, setSelectedLocal] = useState('Todos');
    const [operacoes, setOperacoes] = useState<OperacaoCompleta[]>([]);
    const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
    const [ausencias, setAusencias] = useState<Ausencia[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const operacoesQuery = supabase.from('registro_operacoes').select('*, equipamentos(*), navios(nome_navio, carga)').eq('data', selectedDate);
                const ajudantesQuery = supabase.from('ajudantes').select('*').eq('data', selectedDate);
                const ausenciasQuery = supabase.from('ausencias').select('*').eq('data', selectedDate);
                
                const [ { data: operacoesData, error: operacoesError }, { data: ajudantesData, error: ajudantesError }, { data: ausenciasData, error: ausenciasError }, ] = await Promise.all([operacoesQuery, ajudantesQuery, ausenciasQuery]);
                if (operacoesError || ajudantesError || ausenciasError) throw operacoesError || ajudantesError || ausenciasError;
                
                const operacoesFiltradas = selectedLocal === 'Todos' ? operacoesData || [] : (operacoesData || []).filter(op => op.equipamentos.some(eq => eq.local === selectedLocal));
                setOperacoes(operacoesFiltradas);
                setAjudantes(ajudantesData || []);
                setAusencias(ausenciasData || []);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
                toast({ title: "Erro", description: "Não foi possível carregar os relatórios.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate, selectedLocal, toast]);

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
            <div className="px-4 mb-4"><Card className="shadow-[var(--shadow-card)]"><CardHeader><CardTitle>Registros Salvos</CardTitle><div className="flex flex-col sm:flex-row gap-4 pt-4"><div className="flex-1"><label className="text-sm text-muted-foreground">Data:</label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1" /></div><div className="flex-1"><label className="text-sm text-muted-foreground">Local:</label><Select value={selectedLocal} onValueChange={setSelectedLocal}><SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="NAVIO">NAVIO</SelectItem><SelectItem value="HYDRO">HYDRO</SelectItem></SelectContent></Select></div></div></CardHeader></Card></div>
            
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
                                        <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Operação</TableHead><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Local</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {loading ? <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow> : operacoes.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow> : operacoes.map((op) => (
                                                <Collapsible key={op.id} asChild>
                                                    <>
                                                        <TableRow>
                                                            <TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="sm" disabled={op.equipamentos.length === 0}><ChevronsUpDown className="h-4 w-4" /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger></TableCell>
                                                            <TableCell className="font-medium">{op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} (${op.navios.carga})` : op.op}</TableCell>
                                                            <TableCell>{new Date(op.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                                            <TableCell>{op.hora_inicial} - {op.hora_final}</TableCell>
                                                            <TableCell>{op.equipamentos[0]?.local || 'N/A'}</TableCell>
                                                        </TableRow>
                                                        <CollapsibleContent asChild>
                                                            <TableRow><TableCell colSpan={5} className="p-0"><div className="p-4 bg-muted/50"><h4 className="font-semibold mb-2">Equipamentos da Operação:</h4><Table><TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>TAG</TableHead><TableHead>Operador/Motorista</TableHead></TableRow></TableHeader><TableBody>{op.equipamentos.map((eq, index) => (<TableRow key={index}><TableCell>{eq.grupo_operacao || 'N/A'}</TableCell><TableCell>{eq.tag}</TableCell><TableCell>{eq.motorista_operador}</TableCell></TableRow>))}</TableBody></Table></div></TableCell></TableRow>
                                                        </CollapsibleContent>
                                                    </>
                                                </Collapsible>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            <TabsContent value="ajudantes" className="p-4">
                                <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Local</TableHead><TableHead>Horas</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow> : ajudantes.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum ajudante registrado.</TableCell></TableRow> : ajudantes.map((ajudante) => (<TableRow key={ajudante.id}><TableCell>{ajudante.nome}</TableCell><TableCell>{ajudante.hora_inicial}</TableCell><TableCell>{ajudante.hora_final}</TableCell><TableCell>{ajudante.local}</TableCell><TableCell>{calcularHoras(ajudante.hora_inicial, ajudante.hora_final)}</TableCell></TableRow>))}</TableBody></Table></div>
                            </TabsContent>
                            <TabsContent value="ausencias" className="p-4">
                                <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Justificado</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow> : ausencias.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma ausência registrada.</TableCell></TableRow> : ausencias.map((ausencia) => (<TableRow key={ausencia.id}><TableCell>{ausencia.nome}</TableCell><TableCell>{ausencia.justificado ? 'Sim' : 'Não'}</TableCell><TableCell>{ausencia.obs}</TableCell></TableRow>))}</TableBody></Table></div>
                            </TabsContent>
                            <TabsContent value="observacoes" className="p-4">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Operação</TableHead><TableHead>Horário</TableHead><TableHead>Observação do Turno</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {loading ? <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow> : operacoes.filter(op => op.observacao).length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma observação de turno registrada.</TableCell></TableRow> : operacoes.filter(op => op.observacao).map((op) => (
                                                <TableRow key={op.id}>
                                                    <TableCell className="font-medium">{op.op === 'NAVIO' && op.navios ? `${op.navios.nome_navio} (${op.navios.carga})` : op.op}</TableCell>
                                                    <TableCell>{op.hora_inicial} - {op.hora_final}</TableCell>
                                                    <TableCell className="whitespace-pre-wrap">{op.observacao}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RelatorioTransporte;