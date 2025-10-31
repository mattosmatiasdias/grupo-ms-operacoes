import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil, Eye, Download, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OperacaoCompleta {
  id: string;
  op: string;
  data: string;
  created_at: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string | null;
  carga: string | null;
  navios: {
    nome_navio: string;
    carga: string;
  } | null;
  equipamentos: any[];
  ajudantes: any[];
  ausencias: any[];
}

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
    
    // FUNÇÃO PARA COPIAR OPERAÇÃO - CORRIGIDA
    const handleCopyOperation = async (op: OperacaoCompleta) => {
        try {
            // Validar se a operação tem dados copiáveis
            if (!op.equipamentos || op.equipamentos.length === 0) {
                toast({
                    title: "Atenção",
                    description: "Esta operação não possui equipamentos para copiar.",
                    variant: "destructive"
                });
                return;
            }

            // Preparar dados para copiar COM TIMESTAMP
            const dadosParaCopiar = {
                tipo: op.op === 'NAVIO' ? 'NAVIO' : 'OPERACAO',
                operacao: op.op,
                navio: op.navios,
                carga: op.carga,
                equipamentos: op.equipamentos || [],
                ajudantes: op.ajudantes || [],
                ausencias: op.ausencias || [],
                observacao: op.observacao || '',
                hora_inicial: op.hora_inicial || '',
                hora_final: op.hora_final || '',
                timestamp: Date.now(), // Para expiração
                data_operacao: op.data // Data original da operação
            };

            // Salvar no localStorage para usar no formulário
            localStorage.setItem('operacao_copiada', JSON.stringify(dadosParaCopiar));
            
            // Navegar DIRETAMENTE para o formulário pré-carregado
            if (op.op === 'NAVIO') {
                navigate('/formulario-operacao', { 
                    state: { 
                        tipo: 'NAVIO', 
                        navio: op.navios,
                        dadosCopiados: dadosParaCopiar
                    } 
                });
            } else {
                navigate('/formulario-operacao', { 
                    state: { 
                        tipo: 'OPERACAO', 
                        operacao: op.op,
                        dadosCopiados: dadosParaCopiar
                    } 
                });
            }

            toast({
                title: "✅ Operação Copiada!",
                description: `Dados de ${op.op} carregados no formulário.`
            });

        } catch (error) {
            console.error('Erro ao copiar operação:', error);
            toast({
                title: "❌ Erro",
                description: "Não foi possível copiar a operação.",
                variant: "destructive"
            });
        }
    };

    const handleExportSinglePDF = async (op: OperacaoCompleta) => {
      try {
        console.log('📱 Iniciando geração de PDF para Android...');
        
        const doc = new jsPDF();
        const dataFormatada = new Date(op.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const nomeUsuario = userProfile?.full_name || 'N/A';
        
        let nomeOperacao = op.op;
        if (op.op === 'NAVIO' && op.navios) {
          nomeOperacao = `${op.navios.nome_navio} (${op.navios.carga})`;
        } else if (op.op === 'ALBRAS' && op.carga) {
          nomeOperacao = `${op.op} - ${op.carga}`;
        }

        // Cabeçalho
        doc.setFontSize(18);
        doc.text(`Relatório da Operação: ${nomeOperacao}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Data: ${dataFormatada} | Horário: ${op.hora_inicial} - ${op.hora_final}`, 14, 30);
        doc.text(`Gerado por: ${nomeUsuario}`, 14, 36);

        let finalY = 40;

        // Tabela de Equipamentos
        if (op.equipamentos.length > 0) {
          autoTable(doc, {
            startY: finalY + 5,
            head: [['Grupo', 'TAG', 'Operador/Motorista']],
            body: op.equipamentos.map(eq => [eq.grupo_operacao || 'Principal', eq.tag, eq.motorista_operador]),
            didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
          });
        }

        // MÉTODO ESPECIAL PARA ANDROID
        console.log('📄 Gerando PDF para Android...');
        
        // Método 1: Tentar abrir em nova janela com interface amigável
        const pdfDataUri = doc.output('datauristring');
        const fileName = `relatorio_${nomeOperacao.replace(/[^a-zA-Z0-9]/g, '_')}_${op.data}.pdf`;
        
        // Criar nova janela com interface de download
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório PDF - ${nomeOperacao}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Arial', sans-serif;
                    }
                    body {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 15px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 400px;
                        width: 100%;
                    }
                    .icon {
                        font-size: 48px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #333;
                        margin-bottom: 10px;
                        font-size: 24px;
                    }
                    .info {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 15px 0;
                        text-align: left;
                    }
                    .info p {
                        margin: 5px 0;
                        color: #555;
                    }
                    .download-btn {
                        display: block;
                        width: 100%;
                        padding: 15px;
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 18px;
                        font-weight: bold;
                        margin: 20px 0;
                        border: none;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    .download-btn:hover {
                        transform: translateY(-2px);
                    }
                    .tips {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        padding: 10px;
                        border-radius: 5px;
                        margin-top: 15px;
                        font-size: 12px;
                        color: #856404;
                    }
                    .pdf-preview {
                        margin: 20px 0;
                        border: 2px dashed #ddd;
                        border-radius: 10px;
                        padding: 10px;
                    }
                    iframe {
                        width: 100%;
                        height: 400px;
                        border: none;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📄</div>
                    <h1>Relatório PDF Pronto!</h1>
                    
                    <div class="info">
                        <p><strong>Operação:</strong> ${nomeOperacao}</p>
                        <p><strong>Data:</strong> ${dataFormatada}</p>
                        <p><strong>Horário:</strong> ${op.hora_inicial} - ${op.hora_final}</p>
                        <p><strong>Gerado por:</strong> ${nomeUsuario}</p>
                    </div>

                    <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                        📥 BAIXAR PDF AGORA
                    </a>

                    <div class="pdf-preview">
                        <iframe src="${pdfDataUri}"></iframe>
                    </div>

                    <div class="tips">
                        <p><strong>💡 Dicas para Android:</strong></p>
                        <p>• Clique no botão "BAIXAR PDF" acima</p>
                        <p>• Ou use o menu do navegador → "Fazer download"</p>
                        <p>• O PDF será salvo na pasta "Downloads"</p>
                    </div>

                    <script>
                        // Focar no botão de download
                        document.querySelector('.download-btn').focus();
                        
                        // Log para debug
                        console.log('📱 PDF pronto para download:', '${fileName}');
                    </script>
                </div>
            </body>
            </html>
          `);
          
          newWindow.document.close();
        } else {
          // Fallback: Método direto
          console.log('🔄 Usando fallback de download...');
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        toast({
          title: "✅ PDF Gerado com Sucesso!",
          description: "O relatório foi aberto em nova janela para download."
        });

        console.log('🎉 PDF gerado com sucesso!');

      } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        toast({
          title: "❌ Erro ao Gerar PDF",
          description: "Não foi possível gerar o PDF. Tente novamente ou use um computador.",
          variant: "destructive"
        });
      }
    };

    const handleViewOperation = (op: OperacaoCompleta) => {
        navigate(`/operacao/${op.id}/visualizar`);
    };

    return (
        <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
            <div className="flex items-center justify-between p-4 text-white">
              <div className="flex items-center">
                <Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/20 mr-4">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">RELATÓRIO DE TRANSPORTE</h1>
              </div>
            </div>
            
            <div className="px-4 mb-4">
              <Card className="shadow-[var(--shadow-card)]">
                <CardContent className="p-4 flex justify-between items-center">
                  <span className="text-foreground font-medium">Gestão de Operações</span>
                  <Button variant="outline" size="sm" onClick={() => navigate('/')} className="text-primary border-primary hover:bg-primary hover:text-white">
                    Voltar ao Menu
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="px-4 mb-4">
              <Button onClick={() => navigate('/novo-lancamento')} className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold" style={{ boxShadow: 'var(--shadow-button)' }}>
                <Plus className="h-5 w-5 mr-2" />Novo Lançamento
              </Button>
            </div>
            
            <div className="px-4 mb-4">
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle>Registros Salvos</CardTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">Data:</label>
                      <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="mt-1" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">Local:</label>
                      <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Todos">Todos</SelectItem>
                          <SelectItem value="NAVIO">NAVIO</SelectItem>
                          <SelectItem value="HYDRO">HYDRO</SelectItem>
                          <SelectItem value="ALBRAS">ALBRAS</SelectItem>
                          <SelectItem value="SANTOS BRASIL">SANTOS BRASIL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">Horário de Início:</label>
                      <Select value={selectedHoraInicial} onValueChange={setSelectedHoraInicial}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Todos">Todos os Horários</SelectItem>
                          <SelectItem value="07:00:00">07:00</SelectItem>
                          <SelectItem value="19:00:00">19:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
            
            <div className="px-4">
                <Card className="shadow-[var(--shadow-card)]">
                    <CardContent className="p-0">
                        <div className="p-4">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Operação</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Horário</TableHead>
                                            <TableHead>Local</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center">
                                                    Carregando...
                                                </TableCell>
                                            </TableRow>
                                        ) : operacoes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                    Nenhum registro encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            operacoes.map((op) => {
                                                const createdAt = new Date(op.created_at).getTime();
                                                const now = new Date().getTime();
                                                const isEditable = (now - createdAt) < 24 * 60 * 60 * 1000;
                                                
                                                // Definir nome para exibição
                                                let nomeExibicao = op.op;
                                                if (op.op === 'NAVIO' && op.navios) {
                                                  nomeExibicao = `${op.navios.nome_navio} (${op.navios.carga})`;
                                                } else if (op.op === 'ALBRAS' && op.carga) {
                                                  nomeExibicao = `${op.op} - ${op.carga}`;
                                                }
                                                
                                                return (
                                                    <TableRow key={op.id}>
                                                        <TableCell className="font-medium">
                                                            {nomeExibicao}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(op.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                        </TableCell>
                                                        <TableCell>
                                                            {op.hora_inicial} - {op.hora_final}
                                                        </TableCell>
                                                        <TableCell>
                                                            {op.equipamentos[0]?.local || 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={() => handleViewOperation(op)}
                                                                    title="Visualizar lançamento"
                                                                >
                                                                    <Eye className="h-4 w-4"/>
                                                                </Button>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={() => handleExportSinglePDF(op)}
                                                                    title="Baixar PDF do lançamento"
                                                                >
                                                                    <Download className="h-4 w-4"/>
                                                                </Button>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={() => handleCopyOperation(op)}
                                                                    title="Copiar operação para novo lançamento"
                                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                                >
                                                                    <Copy className="h-4 w-4"/>
                                                                </Button>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    disabled={!isEditable} 
                                                                    onClick={() => navigate(`/operacao/${op.id}/editar`)}
                                                                    title={isEditable ? 'Editar lançamento' : 'Edição bloqueada'}
                                                                >
                                                                    <Pencil className="h-4 w-4"/>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RelatorioTransporte;