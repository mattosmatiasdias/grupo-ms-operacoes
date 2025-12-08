// src/pages/Rateios.tsx (versão completa com novas opções e botão fornecedor)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Search, 
  Percent, 
  FileText, 
  Building2, 
  DollarSign,
  Calendar,
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  Save,
  Printer,
  UserPlus,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipos TypeScript
type FornecedorRateio = {
  id: string;
  nome_fornecedor: string;
  created_at: string;
  updated_at: string;
};

type BMRateio = {
  id: string;
  fornecedor_id: string;
  numero_bm: string;
  valor_bm: number;
  periodo_bm_start: string;
  periodo_bm_end: string;
  periodo_referencia_start: string;
  periodo_referencia_end: string;
  created_at: string;
  updated_at: string;
  fornecedores_rateio?: {
    nome_fornecedor: string;
  };
};

type Rateio = {
  id: string;
  bm_id: string;
  centro_resultado: string;
  valor_rateado: number;
  porcentagem_rateio: number;
  created_at: string;
  updated_at: string;
  bms_rateio?: {
    numero_bm: string;
    fornecedores_rateio?: {
      nome_fornecedor: string;
    };
  };
};

// Períodos de referência fixos
const PERIODOS_REFERENCIA = [
  { label: '16/11/2025 a 15/12/2025', start: '2025-11-16', end: '2025-12-15' },
  { label: '16/12/2025 a 15/01/2026', start: '2025-12-16', end: '2026-01-15' },
  { label: '16/01/2026 a 15/02/2026', start: '2026-01-16', end: '2026-02-15' },
  { label: '16/02/2026 a 15/03/2026', start: '2026-02-16', end: '2026-03-15' },
  { label: '16/03/2026 a 15/04/2026', start: '2026-03-16', end: '2026-04-15' },
  { label: '16/04/2026 a 15/05/2026', start: '2026-04-16', end: '2026-05-15' },
  { label: '16/05/2026 a 15/06/2026', start: '2026-05-16', end: '2026-06-15' },
  { label: '16/06/2026 a 15/07/2026', start: '2026-06-16', end: '2026-07-15' },
  { label: '16/07/2026 a 15/08/2026', start: '2026-07-16', end: '2026-08-15' },
  { label: '16/08/2026 a 15/09/2026', start: '2026-08-16', end: '2026-09-15' },
  { label: '16/09/2026 a 15/10/2026', start: '2026-09-16', end: '2026-10-15' },
  { label: '16/10/2026 a 15/11/2026', start: '2026-10-16', end: '2026-11-15' },
  { label: '16/11/2026 a 15/12/2026', start: '2026-11-16', end: '2026-12-15' },
];

// Centros de resultado atualizados com as novas opções
const centrosResultado = [
  'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA',
  'ALBRAS - COQUE, PICHE E FLUORETO',
  'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO',
  'SANTOS BRASIL - PRANCHA',
  'HYDRO - BACIA ÁREA 82',
  'FAZENDA',
  'MANUTENÇÃO',
  'SESMT',
  'MS GRANEIS',
  'ORÇAMENTOS',
  'DP/RH',
  'DIRETORIA',
  'ADMINISTRAÇÃO CENTRAL'
];

const Rateios = () => {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState<FornecedorRateio[]>([]);
  const [bms, setBms] = useState<BMRateio[]>([]);
  const [rateios, setRateios] = useState<Rateio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'fornecedor' | 'bm' | 'rateio'>('bm');
  
  // Estados para edição
  const [editingBM, setEditingBM] = useState<BMRateio | null>(null);
  const [showRateioDialog, setShowRateioDialog] = useState(false);
  const [selectedBMForRateio, setSelectedBMForRateio] = useState<BMRateio | null>(null);
  
  // Estados para filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [filtroBM, setFiltroBM] = useState<string>('todos');
  const [filtroCentroResultado, setFiltroCentroResultado] = useState<string>('todos');
  
  // Estados para formulários
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome_fornecedor: ''
  });
  
  const [novoBM, setNovoBM] = useState({
    fornecedor_id: '',
    numero_bm: '',
    valor_bm: '',
    periodo_bm_start: '',
    periodo_bm_end: '',
    periodo_referencia: ''
  });
  
  const [novoRateio, setNovoRateio] = useState({
    bm_id: '',
    centro_resultado: '',
    valor_rateado: '',
    porcentagem_rateio: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar fornecedores
      const { data: fornecedoresData } = await supabase
        .from('fornecedores_rateio')
        .select('*')
        .order('nome_fornecedor', { ascending: true });
      
      setFornecedores(fornecedoresData || []);
      
      // Carregar BMs com join no fornecedor
      const { data: bmsData } = await supabase
        .from('bms_rateio')
        .select(`
          *,
          fornecedores_rateio (
            nome_fornecedor
          )
        `)
        .order('created_at', { ascending: false });
      
      if (bmsData) {
        const bmsProcessados = bmsData.map(bm => ({
          ...bm,
          fornecedor_nome: Array.isArray(bm.fornecedores_rateio) 
            ? bm.fornecedores_rateio[0]?.nome_fornecedor
            : (bm.fornecedores_rateio as any)?.nome_fornecedor || 'N/A'
        }));
        setBms(bmsProcessados);
      }
      
      // Carregar rateios
      const { data: rateiosData } = await supabase
        .from('rateios')
        .select(`
          *,
          bms_rateio (
            numero_bm,
            fornecedores_rateio (
              nome_fornecedor
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (rateiosData) {
        const rateiosProcessados = rateiosData.map(rateio => {
          const bmInfo = Array.isArray(rateio.bms_rateio) ? rateio.bms_rateio[0] : rateio.bms_rateio;
          const fornecedorInfo = Array.isArray(bmInfo?.fornecedores_rateio) 
            ? bmInfo?.fornecedores_rateio[0] 
            : bmInfo?.fornecedores_rateio;
          
          return {
            ...rateio,
            bm_numero: bmInfo?.numero_bm || 'N/A',
            fornecedor_nome: fornecedorInfo?.nome_fornecedor || 'N/A'
          };
        });
        setRateios(rateiosProcessados);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      return format(parseISO(dataString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataString;
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const calcularSaldoBM = (bm: BMRateio) => {
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const totalRateado = rateiosBM.reduce((sum, r) => sum + r.valor_rateado, 0);
    return bm.valor_bm - totalRateado;
  };

  const calcularPorcentagemRateada = (bm: BMRateio) => {
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const totalRateado = rateiosBM.reduce((sum, r) => sum + r.valor_rateado, 0);
    return bm.valor_bm > 0 ? (totalRateado / bm.valor_bm) * 100 : 0;
  };

  // Função para iniciar edição de BM
  const iniciarEdicaoBM = (bm: BMRateio) => {
    setEditingBM(bm);
    setNovoBM({
      fornecedor_id: bm.fornecedor_id,
      numero_bm: bm.numero_bm,
      valor_bm: bm.valor_bm.toString(),
      periodo_bm_start: bm.periodo_bm_start,
      periodo_bm_end: bm.periodo_bm_end,
      periodo_referencia: PERIODOS_REFERENCIA.find(p => 
        p.start === bm.periodo_referencia_start && p.end === bm.periodo_referencia_end
      )?.label || ''
    });
    setFormType('bm');
    setShowForm(true);
  };

  // Função para atualizar BM
  const handleAtualizarBM = async () => {
    if (!editingBM) return;
    
    if (!novoBM.fornecedor_id || !novoBM.numero_bm || !novoBM.valor_bm || !novoBM.periodo_referencia) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === novoBM.periodo_referencia);
      if (!periodoSelecionado) {
        alert('Selecione um período de referência válido');
        return;
      }
      
      const { error } = await supabase
        .from('bms_rateio')
        .update({
          fornecedor_id: novoBM.fornecedor_id,
          numero_bm: novoBM.numero_bm,
          valor_bm: parseFloat(novoBM.valor_bm),
          periodo_referencia_start: periodoSelecionado.start,
          periodo_referencia_end: periodoSelecionado.end,
          periodo_bm_start: novoBM.periodo_bm_start,
          periodo_bm_end: novoBM.periodo_bm_end,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingBM.id);
      
      if (error) throw error;
      
      setEditingBM(null);
      setNovoBM({
        fornecedor_id: '',
        numero_bm: '',
        valor_bm: '',
        periodo_bm_start: '',
        periodo_bm_end: '',
        periodo_referencia: ''
      });
      setShowForm(false);
      alert('BM atualizado com sucesso!');
      carregarDados();
      
    } catch (error: any) {
      console.error('Erro ao atualizar BM:', error);
      alert('Erro ao atualizar BM');
    }
  };

  // Função para abrir modal de rateio
  const abrirModalRateio = (bm: BMRateio) => {
    setSelectedBMForRateio(bm);
    setNovoRateio({
      bm_id: bm.id,
      centro_resultado: '',
      valor_rateado: '',
      porcentagem_rateio: ''
    });
    setShowRateioDialog(true);
  };

  // Função para calcular valor com base na porcentagem
  const calcularValorPorPorcentagem = () => {
    if (!selectedBMForRateio || !novoRateio.porcentagem_rateio) return;
    
    const porcentagem = parseFloat(novoRateio.porcentagem_rateio);
    if (!isNaN(porcentagem)) {
      const valorCalculado = (selectedBMForRateio.valor_bm * porcentagem) / 100;
      setNovoRateio(prev => ({
        ...prev,
        valor_rateado: valorCalculado.toFixed(2)
      }));
    }
  };

  // Função para calcular porcentagem com base no valor
  const calcularPorcentagemPorValor = () => {
    if (!selectedBMForRateio || !novoRateio.valor_rateado) return;
    
    const valor = parseFloat(novoRateio.valor_rateado);
    if (!isNaN(valor)) {
      const porcentagemCalculada = (valor / selectedBMForRateio.valor_bm) * 100;
      setNovoRateio(prev => ({
        ...prev,
        porcentagem_rateio: porcentagemCalculada.toFixed(2)
      }));
    }
  };

  // Função para aplicar rateio
  const aplicarRateio = async () => {
    if (!selectedBMForRateio || !novoRateio.centro_resultado || (!novoRateio.valor_rateado && !novoRateio.porcentagem_rateio)) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      const valorRateado = novoRateio.valor_rateado 
        ? parseFloat(novoRateio.valor_rateado)
        : (selectedBMForRateio.valor_bm * parseFloat(novoRateio.porcentagem_rateio)) / 100;
      
      if (isNaN(valorRateado) || valorRateado <= 0) {
        alert('Valor a ratear deve ser maior que zero');
        return;
      }
      
      // Calcular saldo disponível
      const saldo = calcularSaldoBM(selectedBMForRateio);
      
      if (valorRateado > saldo) {
        alert(`Valor excede o saldo disponível. Saldo: ${formatarMoeda(saldo)}`);
        return;
      }
      
      const porcentagem = (valorRateado / selectedBMForRateio.valor_bm) * 100;
      
      const { error } = await supabase
        .from('rateios')
        .insert([{
          bm_id: selectedBMForRateio.id,
          centro_resultado: novoRateio.centro_resultado,
          valor_rateado: valorRateado,
          porcentagem_rateio: parseFloat(porcentagem.toFixed(2))
        }]);
      
      if (error) throw error;
      
      setShowRateioDialog(false);
      setSelectedBMForRateio(null);
      setNovoRateio({
        bm_id: '',
        centro_resultado: '',
        valor_rateado: '',
        porcentagem_rateio: ''
      });
      
      alert('Rateio aplicado com sucesso!');
      carregarDados();
      
    } catch (error: any) {
      console.error('Erro ao aplicar rateio:', error);
      alert('Erro ao aplicar rateio');
    }
  };

  // Função para excluir BM
  const handleExcluirBM = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este BM? Todos os rateios associados também serão excluídos.')) return;
    
    try {
      const { error } = await supabase
        .from('bms_rateio')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      alert('BM excluído com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir BM:', error);
      alert('Erro ao excluir BM');
    }
  };

  // Função para excluir rateio
  const handleExcluirRateio = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este rateio?')) return;
    
    try {
      const { error } = await supabase
        .from('rateios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      alert('Rateio excluído com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir rateio:', error);
      alert('Erro ao excluir rateio');
    }
  };

  // Função para gerar PDF do rateio de um BM
  const gerarPDFRateioBM = (bm: BMRateio) => {
    const doc = new jsPDF();
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const saldo = calcularSaldoBM(bm);
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Rateio - Boletim de Medição', 20, 20);
    
    // Informações do BM
    doc.setFontSize(12);
    doc.text(`BM Número: ${bm.numero_bm}`, 20, 35);
    doc.text(`Fornecedor: ${bm.fornecedor_nome || 'N/A'}`, 20, 42);
    doc.text(`Valor Total: ${formatarMoeda(bm.valor_bm)}`, 20, 49);
    doc.text(`Período Referência: ${formatarData(bm.periodo_referencia_start)} a ${formatarData(bm.periodo_referencia_end)}`, 20, 56);
    doc.text(`Data de Criação: ${formatarData(bm.created_at)}`, 20, 63);
    
    // Tabela de Rateios
    const tableData = rateiosBM.map((rateio, index) => [
      (index + 1).toString(),
      rateio.centro_resultado,
      formatarMoeda(rateio.valor_rateado),
      `${rateio.porcentagem_rateio.toFixed(2)}%`,
      formatarData(rateio.created_at)
    ]);
    
    autoTable(doc, {
      startY: 75,
      head: [['#', 'Centro de Resultado', 'Valor Rateado', 'Porcentagem', 'Data Rateio']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Resumo
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Rateado: ${formatarMoeda(bm.valor_bm - saldo)}`, 20, finalY);
    doc.text(`Saldo Disponível: ${formatarMoeda(saldo)}`, 20, finalY + 7);
    
    // Data de impressão
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, finalY + 20);
    
    // Salvar PDF
    doc.save(`rateio-bm-${bm.numero_bm}.pdf`);
  };

  // Função para cadastrar fornecedor
  const handleCadastrarFornecedor = async () => {
    if (!novoFornecedor.nome_fornecedor.trim()) {
      alert('Informe o nome do fornecedor');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('fornecedores_rateio')
        .insert([{ nome_fornecedor: novoFornecedor.nome_fornecedor }]);
      
      if (error) throw error;
      
      setNovoFornecedor({ nome_fornecedor: '' });
      alert('Fornecedor cadastrado com sucesso!');
      carregarDados();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
      alert('Erro ao cadastrar fornecedor');
    }
  };

  // Função para cadastrar BM
  const handleCadastrarBM = async () => {
    // Validações
    if (!novoBM.fornecedor_id || !novoBM.numero_bm || !novoBM.valor_bm || !novoBM.periodo_referencia) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      const valorBM = parseFloat(novoBM.valor_bm);
      if (isNaN(valorBM) || valorBM <= 0) {
        alert('Valor do BM deve ser maior que zero');
        return;
      }
      
      // Verificar se o BM já existe
      const { data: bmExistente } = await supabase
        .from('bms_rateio')
        .select('numero_bm')
        .eq('numero_bm', novoBM.numero_bm)
        .single();
      
      if (bmExistente) {
        alert('Já existe um BM com este número!');
        return;
      }
      
      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === novoBM.periodo_referencia);
      if (!periodoSelecionado) {
        alert('Selecione um período de referência válido');
        return;
      }
      
      const bmData = {
        fornecedor_id: novoBM.fornecedor_id,
        numero_bm: novoBM.numero_bm,
        valor_bm: valorBM,
        periodo_bm_start: novoBM.periodo_bm_start || new Date().toISOString().split('T')[0],
        periodo_bm_end: novoBM.periodo_bm_end || new Date().toISOString().split('T')[0],
        periodo_referencia_start: periodoSelecionado.start,
        periodo_referencia_end: periodoSelecionado.end
      };
      
      const { error } = await supabase
        .from('bms_rateio')
        .insert([bmData]);
      
      if (error) throw error;
      
      setNovoBM({
        fornecedor_id: '',
        numero_bm: '',
        valor_bm: '',
        periodo_bm_start: '',
        periodo_bm_end: '',
        periodo_referencia: ''
      });
      setShowForm(false);
      alert('BM cadastrado com sucesso!');
      
      // Recarregar dados
      setTimeout(() => {
        carregarDados();
      }, 500);
      
    } catch (error: any) {
      console.error('Erro ao cadastrar BM:', error);
      alert(`Erro ao cadastrar BM: ${error.message || 'Erro desconhecido'}`);
    }
  };

  // Filtros combinados
  const bmsFiltrados = bms.filter(bm => {
    // Filtro por período
    if (filtroPeriodo !== 'todos') {
      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === filtroPeriodo);
      if (periodoSelecionado && 
          (bm.periodo_referencia_start !== periodoSelecionado.start || 
           bm.periodo_referencia_end !== periodoSelecionado.end)) {
        return false;
      }
    }
    
    // Filtro por fornecedor
    if (filtroFornecedor !== 'todos' && bm.fornecedor_id !== filtroFornecedor) {
      return false;
    }
    
    // Filtro por número BM
    if (filtroBM !== 'todos' && bm.numero_bm !== filtroBM) {
      return false;
    }
    
    // Filtro por termo de busca
    if (searchTerm && 
        !bm.numero_bm.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(bm.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    
    return true;
  });

  const rateiosFiltrados = rateios.filter(rateio => {
    const bmCorrespondente = bms.find(b => b.id === rateio.bm_id);
    
    // Filtro por centro de resultado
    if (filtroCentroResultado !== 'todos' && rateio.centro_resultado !== filtroCentroResultado) {
      return false;
    }
    
    // Filtro por período (via BM)
    if (filtroPeriodo !== 'todos' && bmCorrespondente) {
      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === filtroPeriodo);
      if (periodoSelecionado && 
          (bmCorrespondente.periodo_referencia_start !== periodoSelecionado.start || 
           bmCorrespondente.periodo_referencia_end !== periodoSelecionado.end)) {
        return false;
      }
    }
    
    // Filtro por fornecedor (via BM)
    if (filtroFornecedor !== 'todos' && bmCorrespondente && bmCorrespondente.fornecedor_id !== filtroFornecedor) {
      return false;
    }
    
    // Filtro por BM
    if (filtroBM !== 'todos' && rateio.bm_id !== filtroBM) {
      return false;
    }
    
    // Filtro por termo de busca
    if (searchTerm && 
        !rateio.centro_resultado.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !rateio.bm_numero?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-blue-900/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')} 
                className="text-blue-300 hover:bg-blue-800/50"
                title="Voltar para Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="ml-2">Dashboard</span>
              </Button>
              <h1 className="text-2xl font-bold text-white">Módulo de Rateios</h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Botão Atualizar */}
              <Button
                variant="outline"
                onClick={carregarDados}
                className="border-blue-300 text-white hover:bg-white/20"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              {/* Botão Cadastrar Fornecedor */}
              <Button 
                onClick={() => {
                  setFormType('fornecedor');
                  setShowForm(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Fornecedor
              </Button>
              
              {/* Botão Novo BM */}
              <Button 
                onClick={() => {
                  setFormType('bm');
                  setShowForm(true);
                  setEditingBM(null);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo BM
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Fornecedores</p>
                  <p className="text-2xl font-bold text-white">{fornecedores.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Users className="h-6 w-6 text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Total BMs</p>
                  <p className="text-2xl font-bold text-white">{bms.length}</p>
                  <p className="text-xs text-blue-300 mt-1">
                    {bmsFiltrados.length} filtrado(s)
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <FileText className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Total Rateios</p>
                  <p className="text-2xl font-bold text-white">{rateios.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/20">
                  <Percent className="h-6 w-6 text-amber-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Centros Resultado</p>
                  <p className="text-2xl font-bold text-white">{centrosResultado.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <Building2 className="h-6 w-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 border-b border-blue-600/30 bg-blue-800/30 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-300" />
              <span>Período Referência</span>
            </Label>
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os períodos</SelectItem>
                {PERIODOS_REFERENCIA.map((periodo) => (
                  <SelectItem key={periodo.label} value={periodo.label}>
                    {periodo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-300" />
              <span>Fornecedor</span>
            </Label>
            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
              <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                <SelectValue placeholder="Todos os fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os fornecedores</SelectItem>
                {fornecedores.map((fornecedor) => (
                  <SelectItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome_fornecedor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-300" />
              <span>Número BM</span>
            </Label>
            <Select value={filtroBM} onValueChange={setFiltroBM}>
              <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                <SelectValue placeholder="Todos os BMs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os BMs</SelectItem>
                {bms.map((bm) => (
                  <SelectItem key={bm.id} value={bm.id}>
                    {bm.numero_bm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-300" />
              <span>Centro Resultado</span>
            </Label>
            <Select value={filtroCentroResultado} onValueChange={setFiltroCentroResultado}>
              <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                <SelectValue placeholder="Todos os centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os centros</SelectItem>
                {centrosResultado.map((centro) => (
                  <SelectItem key={centro} value={centro}>
                    {centro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white opacity-0">Pesquisa</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 h-4 w-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-10 bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/70"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Formulário (BM e Fornecedor) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-blue-300/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">
                  {editingBM ? 'Editar BM' : 
                   formType === 'fornecedor' ? 'Cadastrar Fornecedor' : 
                   formType === 'bm' ? 'Cadastrar BM' : 'Realizar Rateio'}
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBM(null);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {formType === 'fornecedor' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome_fornecedor" className="text-blue-200">
                      Nome do Fornecedor *
                    </Label>
                    <Input
                      id="nome_fornecedor"
                      value={novoFornecedor.nome_fornecedor}
                      onChange={(e) => setNovoFornecedor({ nome_fornecedor: e.target.value })}
                      className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      placeholder="Digite o nome do fornecedor"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="h-10 border-blue-300 text-white hover:bg-white/20"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCadastrarFornecedor}
                      className="h-10 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Cadastrar Fornecedor
                    </Button>
                  </div>
                </div>
              ) : formType === 'bm' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fornecedor_id" className="text-blue-200">
                      Fornecedor *
                    </Label>
                    <Select
                      value={novoBM.fornecedor_id}
                      onValueChange={(value) => setNovoBM({...novoBM, fornecedor_id: value})}
                    >
                      <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-blue-300/30">
                        {fornecedores.map((fornecedor) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome_fornecedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numero_bm" className="text-blue-200">
                        Número BM *
                      </Label>
                      <Input
                        id="numero_bm"
                        value={novoBM.numero_bm}
                        onChange={(e) => setNovoBM({...novoBM, numero_bm: e.target.value})}
                        className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                        placeholder="Ex: BM-001"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="valor_bm" className="text-blue-200">
                        Valor BM *
                      </Label>
                      <Input
                        id="valor_bm"
                        value={novoBM.valor_bm}
                        onChange={(e) => setNovoBM({...novoBM, valor_bm: e.target.value})}
                        className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                        placeholder="0,00"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="periodo_referencia" className="text-blue-200">
                      Período de Referência *
                    </Label>
                    <Select
                      value={novoBM.periodo_referencia}
                      onValueChange={(value) => setNovoBM({...novoBM, periodo_referencia: value})}
                    >
                      <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-blue-300/30">
                        {PERIODOS_REFERENCIA.map((periodo) => (
                          <SelectItem key={periodo.label} value={periodo.label}>
                            {periodo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="periodo_bm_start" className="text-blue-200">
                        Data Início BM
                      </Label>
                      <Input
                        id="periodo_bm_start"
                        type="date"
                        value={novoBM.periodo_bm_start}
                        onChange={(e) => setNovoBM({...novoBM, periodo_bm_start: e.target.value})}
                        className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="periodo_bm_end" className="text-blue-200">
                        Data Fim BM
                      </Label>
                      <Input
                        id="periodo_bm_end"
                        type="date"
                        value={novoBM.periodo_bm_end}
                        onChange={(e) => setNovoBM({...novoBM, periodo_bm_end: e.target.value})}
                        className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingBM(null);
                      }}
                      className="h-10 border-blue-300 text-white hover:bg-white/20"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={editingBM ? handleAtualizarBM : handleCadastrarBM}
                      className="h-10 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingBM ? 'Atualizar BM' : 'Cadastrar BM'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Rateio */}
      <Dialog open={showRateioDialog} onOpenChange={setShowRateioDialog}>
        <DialogContent className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Realizar Rateio</DialogTitle>
          </DialogHeader>
          
          {selectedBMForRateio && (
            <div className="space-y-4">
              <div className="bg-blue-600/20 p-3 rounded-lg">
                <p className="text-sm text-blue-200">BM Selecionado:</p>
                <p className="font-semibold text-white">{selectedBMForRateio.numero_bm}</p>
                <p className="text-sm text-white">Valor Total: {formatarMoeda(selectedBMForRateio.valor_bm)}</p>
                <p className="text-sm text-blue-300">Saldo Disponível: {formatarMoeda(calcularSaldoBM(selectedBMForRateio))}</p>
              </div>
              
              <div>
                <Label htmlFor="centro_resultado" className="text-blue-200">
                  Centro de Resultado *
                </Label>
                <Select
                  value={novoRateio.centro_resultado}
                  onValueChange={(value) => setNovoRateio({...novoRateio, centro_resultado: value})}
                >
                  <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                    <SelectValue placeholder="Selecione o centro" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-blue-300/30">
                    {centrosResultado.map((centro) => (
                      <SelectItem key={centro} value={centro}>
                        {centro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="porcentagem_rateio" className="text-blue-200">
                    Porcentagem (%)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="porcentagem_rateio"
                      value={novoRateio.porcentagem_rateio}
                      onChange={(e) => setNovoRateio({...novoRateio, porcentagem_rateio: e.target.value})}
                      className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      placeholder="Ex: 25"
                      type="number"
                      step="0.01"
                    />
                    <Button
                      type="button"
                      onClick={calcularValorPorPorcentagem}
                      className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      Calcular
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="valor_rateado" className="text-blue-200">
                    Valor (R$)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="valor_rateado"
                      value={novoRateio.valor_rateado}
                      onChange={(e) => setNovoRateio({...novoRateio, valor_rateado: e.target.value})}
                      className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      placeholder="0,00"
                      type="number"
                      step="0.01"
                    />
                    <Button
                      type="button"
                      onClick={calcularPorcentagemPorValor}
                      className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      Calcular
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRateioDialog(false)}
                  className="h-10 border-blue-300 text-white hover:bg-white/20"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={aplicarRateio}
                  className="h-10 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Aplicar Rateio
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conteúdo Principal */}
      <div className="flex px-6 pb-6 gap-6">
        {/* Seção de BMs */}
        <div className="flex-1">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 h-full">
            <CardHeader className="border-b border-blue-200/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Boletins de Medição (BMs)</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                    {bmsFiltrados.length} registros
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="text-blue-200 text-xs py-3">Número BM</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Fornecedor</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Valor</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Período Referência</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Status</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : bmsFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <p className="text-white">Nenhum BM encontrado com os filtros atuais</p>
                          <Button 
                            onClick={() => {
                              setFormType('bm');
                              setShowForm(true);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white mt-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Cadastrar Primeiro BM
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bmsFiltrados.map((bm) => {
                        const saldo = calcularSaldoBM(bm);
                        const porcentagem = calcularPorcentagemRateada(bm);
                        
                        return (
                          <TableRow key={bm.id} className="hover:bg-white/5 border-b border-blue-200/10">
                            <TableCell className="font-medium text-white py-3">
                              {bm.numero_bm}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-white">{bm.fornecedor_nome || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-white font-medium">
                                {formatarMoeda(bm.valor_bm)}
                              </div>
                              {saldo < bm.valor_bm && (
                                <div className="text-xs text-blue-300">
                                  Rateado: {formatarMoeda(bm.valor_bm - saldo)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-sm text-white">
                                {formatarData(bm.periodo_referencia_start)} a {formatarData(bm.periodo_referencia_end)}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              {saldo === 0 ? (
                                <Badge className="bg-green-500/20 text-green-300 border-green-300/30 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Total Rateado
                                </Badge>
                              ) : porcentagem > 0 ? (
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {porcentagem.toFixed(0)}% Rateado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-300/30 text-xs">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => abrirModalRateio(bm)}
                                className="bg-amber-500/20 text-amber-300 border-amber-300/30 hover:bg-amber-500/30 hover:text-white"
                                disabled={saldo <= 0}
                              >
                                <Percent className="h-3 w-3 mr-1" />
                                Ratear
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => iniciarEdicaoBM(bm)}
                                className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => gerarPDFRateioBM(bm)}
                                className="bg-green-500/20 text-green-300 border-green-300/30 hover:bg-green-500/30 hover:text-white"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleExcluirBM(bm.id)}
                                className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Rateios */}
        <div className="flex-1">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 h-full">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <Percent className="h-5 w-5" />
                <span>Rateios Realizados</span>
                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-300/30">
                  {rateiosFiltrados.length} registros
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="text-blue-200 text-xs py-3">BM</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Fornecedor</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Centro Resultado</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Valor Rateado</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Porcentagem</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3">Data</TableHead>
                      <TableHead className="text-blue-200 text-xs py-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateiosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <p className="text-white">Nenhum rateio encontrado com os filtros atuais</p>
                          <p className="text-blue-300 text-sm mt-2">
                            Selecione um BM e clique em "Ratear" para criar o primeiro rateio
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rateiosFiltrados.map((rateio) => (
                        <TableRow key={rateio.id} className="hover:bg-white/5 border-b border-blue-200/10">
                          <TableCell className="font-medium text-white py-3">
                            {rateio.bm_numero || 'N/A'}
                          </TableCell>
                          <TableCell className="text-white py-3">
                            {rateio.fornecedor_nome || 'N/A'}
                          </TableCell>
                          <TableCell className="text-white py-3">
                            {rateio.centro_resultado}
                          </TableCell>
                          <TableCell className="text-white font-medium py-3">
                            {formatarMoeda(rateio.valor_rateado)}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                              {rateio.porcentagem_rateio.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-sm py-3">
                            {formatarData(rateio.created_at)}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExcluirRateio(rateio.id)}
                              className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Rateios;