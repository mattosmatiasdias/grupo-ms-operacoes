import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, EyeOff, ChevronLeft, ChevronRight, Pencil, FileDown, Ship, Factory, Warehouse, Building, Users, UserX, Calendar, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces para Tipagem
interface Equipamento { 
  id: string; 
  tag: string; 
  motorista_operador: string; 
  grupo_operacao: string;
  horas_trabalhadas: number;
  hora_inicial: string | null;
  hora_final: string | null;
}
interface Navio { 
  id: string; 
  nome_navio: string; 
  carga: string; 
}
interface OperacaoGrupo { 
  id: string; 
  nome: string; 
  equipamentos: Equipamento[]; 
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
  navios: {
    nome_navio: string;
    carga: string;
  } | null;
  equipamentos: Equipamento[];
  ajudantes: Ajudante[];
  ausencias: Ausencia[];
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

  // Função para corrigir o fuso horário
  const corrigirFusoHorarioData = (dataString: string) => {
    try {
      if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dataString;
      }
      const data = new Date(dataString);
      const offset = data.getTimezoneOffset();
      data.setMinutes(data.getMinutes() - offset);
      return data.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao corrigir fuso horário:', error);
      return dataString;
    }
  };

  // Função para formatar data no formato brasileiro
  const formatarDataBR = (dataString: string) => {
    try {
      const data = new Date(dataString + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dataString;
    }
  };

  // Função para formatar hora (remove segundos se existirem)
  const formatarHora = (hora: string | null) => {
    if (!hora) return 'N/A';
    return hora.includes(':') ? hora.substring(0, 5) : hora;
  };

  const carregarDadosOperacao = useCallback(async () => {
    if (!operacaoId) return;
    setLoading(true);
    try {
      // Primeiro carrega a operação atual para obter a data
      const { data: opAtual, error: opAtualError } = await supabase
        .from('registro_operacoes')
        .select('data')
        .eq('id', operacaoId)
        .single();

      if (opAtualError) throw opAtualError;

      const dataOperacao = corrigirFusoHorarioData(opAtual.data);

      // Carrega todas as operações do mesmo dia para navegação
      const { data: todasOperacoes, error: operacoesError } = await supabase
        .from('registro_operacoes')
        .select('*, equipamentos(*), navios(nome_navio, carga), ajudantes(*), ausencias(*)')
        .eq('data', dataOperacao)
        .order('hora_inicial', { ascending: true });

      if (operacoesError) throw operacoesError;
      setOperacoesList(todasOperacoes || []);

      // Encontra o índice da operação atual
      if (todasOperacoes) {
        const index = todasOperacoes.findIndex(op => op.id === operacaoId);
        setCurrentIndex(index >= 0 ? index : 0);
      }

      // Carrega os dados completos da operação atual
      const { data: opData, error } = await supabase
        .from('registro_operacoes')
        .select('*, equipamentos(*), ajudantes(*), ausencias(*), navios(nome_navio, carga)')
        .eq('id', operacaoId)
        .single();
        
      if (error) throw error;
      
      setSelectedOp(opData.op);
      setData(corrigirFusoHorarioData(opData.data));
      setHoraInicial(opData.hora_inicial || '');
      setHoraFinal(opData.hora_final || '');
      setObservacao(opData.observacao || '');
      setSelectedNavio(opData.navio_id || '');
      setAjudantes(opData.ajudantes.map((a: any) => ({ 
        ...a, 
        id: a.id.toString(),
        data: corrigirFusoHorarioData(a.data)
      })) || []);
      setAusencias(opData.ausencias.map((a: any) => ({ 
        ...a, 
        id: a.id.toString(),
        data: corrigirFusoHorarioData(a.data)
      })) || []);
      
      if (opData.navios) {
        setNavioInfo(opData.navios);
      }

      if (opData.op === 'NAVIO') {
        setEquipamentosNavio(opData.equipamentos.map((eq: any) => ({ 
          ...eq, 
          id: eq.id.toString(),
          hora_inicial: eq.hora_inicial ? formatarHora(eq.hora_inicial) : null,
          hora_final: eq.hora_final ? formatarHora(eq.hora_final) : null
        })) || []);
      } else {
        const grupos: { [key: string]: Equipamento[] } = {};
        opData.equipamentos.forEach((eq: any) => {
          const grupo = eq.grupo_operacao || 'Operação Principal';
          if (!grupos[grupo]) grupos[grupo] = [];
          grupos[grupo].push({ 
            ...eq, 
            id: eq.id.toString(),
            hora_inicial: eq.hora_inicial ? formatarHora(eq.hora_inicial) : null,
            hora_final: eq.hora_final ? formatarHora(eq.hora_final) : null
          });
        });
        setOperacaoGrupos(Object.keys(grupos).map(nome => ({ 
          id: `grupo-${nome}`, 
          nome, 
          equipamentos: grupos[nome] 
        })));
      }
    } catch (error) {
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

    // Cabeçalho com estilo similar ao sistema
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138); // Azul escuro
    doc.text(`Relatório da Operação: ${nomeOperacao}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Azul cinza
    doc.text(`Data: ${dataFormatada} | Horário: ${horaInicial} - ${horaFinal}`, 14, 30);
    doc.text(`Gerado por: ${nomeUsuario} | Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

    let finalY = 42;

    // Informações da Operação
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text("Informações da Operação:", 14, finalY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Tipo: ${selectedOp}`, 14, finalY + 6);
    doc.text(`Data: ${dataFormatada}`, 14, finalY + 12);
    doc.text(`Horário: ${horaInicial} - ${horaFinal}`, 14, finalY + 18);
    
    if (selectedOp === 'NAVIO' && navioInfo) {
      doc.text(`Navio: ${navioInfo.nome_navio}`, 14, finalY + 24);
      doc.text(`Carga: ${navioInfo.carga}`, 14, finalY + 30);
      finalY += 36;
    } else {
      finalY += 24;
    }

    if (observacao) {
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text("Observação Geral:", 14, finalY + 6);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const splitObservacao = doc.splitTextToSize(observacao, 180);
      doc.text(splitObservacao, 14, finalY + 12);
      finalY += 12 + (splitObservacao.length * 5);
    }

    // Tabela de Equipamentos
    const equipamentos = selectedOp === 'NAVIO' ? equipamentosNavio : operacaoGrupos.flatMap(g => g.equipamentos);
    if (equipamentos.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text("Equipamentos:", 14, finalY + 10);
      
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Grupo', 'TAG', 'Operador/Motorista', 'Início', 'Fim', 'Horas']],
        headStyles: {
          fillColor: [30, 58, 138], // Azul escuro
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        body: equipamentos.map(eq => [
          eq.grupo_operacao || (selectedOp === 'NAVIO' ? 'Navio' : selectedOp),
          eq.tag,
          eq.motorista_operador,
          eq.hora_inicial || 'N/A',
          eq.hora_final || 'N/A',
          `${eq.horas_trabalhadas?.toFixed(1) || '0.0'}h`
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 30 }, // Grupo
          1: { cellWidth: 30 }, // TAG
          2: { cellWidth: 40 }, // Operador
          3: { cellWidth: 25 }, // Início
          4: { cellWidth: 25 }, // Fim
          5: { cellWidth: 25 }  // Horas
        },
        didDrawPage: (data) => { 
          finalY = data.cursor?.y || finalY; 
        }
      });
      
      // Adicionar total de horas
      const totalHoras = equipamentos.reduce((total, eq) => total + (eq.horas_trabalhadas || 0), 0);
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text(`Total de horas trabalhadas: ${totalHoras.toFixed(1)}h`, 14, finalY + 10);
      finalY += 15;
    }
    
    // Tabela de Ajudantes
    if (ajudantes.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text("Ajudantes:", 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Ajudante', 'Data', 'Início', 'Fim', 'Observação']],
        headStyles: {
          fillColor: [59, 130, 246], // Azul mais claro
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        body: ajudantes.map(a => [
          a.nome,
          formatarDataBR(a.data),
          a.hora_inicial,
          a.hora_final,
          a.observacao || ''
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Nome
          1: { cellWidth: 30 }, // Data
          2: { cellWidth: 25 }, // Início
          3: { cellWidth: 25 }, // Fim
          4: { cellWidth: 60 }  // Observação
        },
        didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
      });
      
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text(`Total de ajudantes: ${ajudantes.length}`, 14, finalY + 10);
      finalY += 15;
    }
    
    // Tabela de Ausências
    if (ausencias.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text("Ausências:", 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Ausente', 'Data', 'Justificado', 'Observação']],
        headStyles: {
          fillColor: [239, 68, 68], // Vermelho para ausências
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        body: ausencias.map(a => [
          a.nome,
          formatarDataBR(a.data),
          a.justificado ? 'Sim' : 'Não',
          a.obs || ''
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Nome
          1: { cellWidth: 30 }, // Data
          2: { cellWidth: 25 }, // Justificado
          3: { cellWidth: 85 }  // Observação
        },
        didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
      });
      
      const justificadas = ausencias.filter(a => a.justificado).length;
      const naoJustificadas = ausencias.length - justificadas;
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text(`Total de ausências: ${ausencias.length} (${justificadas} justificadas, ${naoJustificadas} não justificadas)`, 14, finalY + 10);
    }
    
    // Adicionar número de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`relatorio_${nomeOperacao.replace(/\s+/g, '_')}_${data}.pdf`);
    toast({
      title: "PDF Gerado",
      description: "Relatório exportado com sucesso!"
    });
  };

  const isEditable = () => {
    if (!operacoesList[currentIndex]) return false;
    const createdAt = new Date(operacoesList[currentIndex].created_at).getTime();
    const now = new Date().getTime();
    return (now - createdAt) < 24 * 60 * 60 * 1000;
  };

  const getOperacaoIcon = (op: string) => {
    switch (op) {
      case 'NAVIO': return Ship;
      case 'HYDRO': return Factory;
      case 'ALBRAS': return Warehouse;
      case 'SANTOS BRASIL': return Building;
      case 'AJUDANTES': return Users;
      case 'AUSENCIAS': return UserX;
      default: return Search;
    }
  };

  const calcularTotalHoras = () => {
    const equipamentos = selectedOp === 'NAVIO' ? equipamentosNavio : operacaoGrupos.flatMap(g => g.equipamentos);
    return equipamentos.reduce((total, eq) => total + (eq.horas_trabalhadas || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Operação</h2>
          <p className="text-blue-200">Buscando dados do sistema...</p>
        </div>
      </div>
    );
  }

  const Icon = getOperacaoIcon(selectedOp);
  const totalHoras = calcularTotalHoras();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 pb-10">
      {/* Header */}
      <div className="bg-blue-800/50 backdrop-blur-sm border-b border-blue-600/30 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/relatorio-transporte')} 
                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar ao Relatório
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Visualizando Operação</h1>
                <p className="text-blue-200 text-sm">
                  {selectedOp} • {formatarDataBR(data)} • {horaInicial} - {horaFinal}
                  {navioInfo && ` • ${navioInfo.nome_navio} - ${navioInfo.carga}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-500/20 text-green-300 text-lg px-3 py-1">
                Total: {totalHoras.toFixed(1)}h
              </Badge>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Navegação e Ações */}
      <div className="px-6 py-4">
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigateToOperation('prev')}
                disabled={operacoesList.length <= 1}
                className="text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-blue-300 px-3 py-1 bg-blue-500/10 rounded-md">
                {currentIndex + 1} de {operacoesList.length}
              </span>
              <Button 
                variant="outline"
                onClick={() => navigateToOperation('next')}
                disabled={operacoesList.length <= 1}
                className="text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={handleExportPDF}
                className="text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30"
              >
                <FileDown className="h-4 w-4 mr-1" />
                Exportar PDF
              </Button>
              <Button 
                variant="default"
                onClick={() => navigate(`/operacao/${operacaoId}/editar`)}
                disabled={!isEditable()}
                title={isEditable() ? 'Editar operação' : 'Edição bloqueada (24h)'}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar Operação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="px-6 space-y-4">
        {/* Dados da Operação */}
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader className="border-b border-blue-200/30">
            <CardTitle className="text-white flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-300" />
              <span>Dados da Operação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {selectedOp === 'NAVIO' && navioInfo && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-200">Navio</Label>
                <Input 
                  value={`${navioInfo.nome_navio} - ${navioInfo.carga}`} 
                  readOnly 
                  className="bg-white/5 border-blue-300/30 text-white"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                  <Search className="h-4 w-4 text-blue-300" />
                  <span>Operação</span>
                </Label>
                <Input 
                  value={selectedOp} 
                  readOnly 
                  className="bg-white/5 border-blue-300/30 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <span>Data</span>
                </Label>
                <Input 
                  type="date" 
                  value={data} 
                  readOnly 
                  className="bg-white/5 border-blue-300/30 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-300" />
                  <span>Horário</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="time" 
                    value={horaInicial} 
                    readOnly 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                  <span className="text-blue-400">→</span>
                  <Input 
                    type="time" 
                    value={horaFinal} 
                    readOnly 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-blue-200">Observação do Turno</Label>
              <Textarea 
                value={observacao || "Nenhuma observação registrada"} 
                readOnly 
                className="bg-white/5 border-blue-300/30 text-white min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipamentos */}
        {selectedOp === 'NAVIO' ? (
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Ship className="h-5 w-5 text-blue-300" />
                  <span>Equipamentos do Navio</span>
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                  {equipamentosNavio.length} equipamentos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {equipamentosNavio.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-blue-300">Nenhum equipamento registrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-blue-500/10">
                      <TableRow>
                        <TableHead className="font-semibold text-blue-200 py-3">TAG</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Operador/Motorista</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Grupo</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Início</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Fim</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3 text-right">Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipamentosNavio.map(eq => (
                        <TableRow key={eq.id} className="hover:bg-white/5 border-blue-200/10">
                          <TableCell className="py-4">
                            <div className="font-medium text-white">{eq.tag}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium text-white">{eq.motorista_operador}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                              {eq.grupo_operacao || 'Navio'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                              {eq.hora_inicial || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-300/30">
                              {eq.hora_final || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <Badge className="bg-green-500/20 text-green-300">
                              {eq.horas_trabalhadas?.toFixed(1) || '0.0'}h
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          ['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
            <div className="space-y-4">
              {operacaoGrupos.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                  <CardContent className="pt-6">
                    <p className="text-center text-blue-300 py-4">Nenhuma operação registrada.</p>
                  </CardContent>
                </Card>
              ) : (
                operacaoGrupos.map(grupo => (
                  <Card key={grupo.id} className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                    <CardHeader className="border-b border-blue-200/30">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{grupo.nome}</h3>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {grupo.equipamentos.length} equipamentos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {grupo.equipamentos.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-blue-300">Nenhum equipamento neste grupo.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-blue-500/10">
                              <TableRow>
                                <TableHead className="font-semibold text-blue-200 py-3">TAG</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Operador</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Início</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Fim</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3 text-right">Horas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grupo.equipamentos.map(eq => (
                                <TableRow key={eq.id} className="hover:bg-white/5 border-blue-200/10">
                                  <TableCell className="py-4">
                                    <div className="font-medium text-white">{eq.tag}</div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="font-medium text-white">{eq.motorista_operador}</div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                                      {eq.hora_inicial || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-300/30">
                                      {eq.hora_final || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4 text-right">
                                    <Badge className="bg-green-500/20 text-green-300">
                                      {eq.horas_trabalhadas?.toFixed(1) || '0.0'}h
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )
        )}

        {/* Ajudantes */}
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader className="border-b border-blue-200/30">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-300" />
                <span>Ajudantes</span>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {ajudantes.length} ajudantes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ajudantes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-blue-300">Nenhum ajudante registrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-blue-500/10">
                    <TableRow>
                      <TableHead className="font-semibold text-blue-200 py-3">Nome</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Data</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Horário</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajudantes.map(ajudante => (
                      <TableRow key={ajudante.id} className="hover:bg-white/5 border-blue-200/10">
                        <TableCell className="py-4">
                          <div className="font-medium text-white">{ajudante.nome}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm text-white">
                            {formatarDataBR(ajudante.data)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                              {ajudante.hora_inicial}
                            </Badge>
                            <span className="text-blue-400">→</span>
                            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30 text-xs">
                              {ajudante.hora_final}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm text-blue-300 max-w-xs">
                            {ajudante.observacao || 'Sem observações'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ausências */}
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader className="border-b border-blue-200/30">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserX className="h-5 w-5 text-blue-300" />
                <span>Ausências</span>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {ausencias.length} ausências
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ausencias.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-blue-300">Nenhuma ausência registrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-blue-500/10">
                    <TableRow>
                      <TableHead className="font-semibold text-blue-200 py-3">Nome</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Data</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Status</TableHead>
                      <TableHead className="font-semibold text-blue-200 py-3">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ausencias.map(ausencia => (
                      <TableRow key={ausencia.id} className="hover:bg-white/5 border-blue-200/10">
                        <TableCell className="py-4">
                          <div className="font-medium text-white">{ausencia.nome}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm text-white">
                            {formatarDataBR(ausencia.data)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant={ausencia.justificado ? "default" : "destructive"} 
                            className={
                              ausencia.justificado 
                                ? "bg-green-500/20 text-green-300 hover:bg-green-500/20 border-green-300/30" 
                                : "bg-red-500/20 text-red-300 hover:bg-red-500/20 border-red-300/30"
                            }
                          >
                            {ausencia.justificado ? 'Justificado' : 'Não Justificado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm text-blue-300 max-w-xs">
                            {ausencia.obs || 'Sem observações'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisualizarOperacao;