import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Plus, Filter, Download, Search, Calendar, CheckCircle, 
  XCircle, Clock, Truck, Edit, Trash2, Check, X, 
  Building2, Factory, Settings 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VistoriaEquipamento {
  id: string;
  tag: string;
  tag_generico: string;
  local: string;
  modelo: string;
  ano: string;
  placa_serie: string;
  chassi: string;
  numero_motor: string;
  renavam: string;
}

interface VistoriaRegistro {
  id: string;
  tag: string;
  centro_custo: string;
  previsto: 'Previsto' | 'Não previsto';
  data_vencimento_vistoria: string;
  data_realizacao_vistoria: string;
  status: 'Aprovado' | 'Reprovado' | 'Pendente';
  motivo_reprovacao: string;
  created_at: string;
}

const Vistorias = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'hydro' | 'albras' | 'equipamentos'>('hydro');
  const [equipamentos, setEquipamentos] = useState<VistoriaEquipamento[]>([]);
  const [vistoriasHydro, setVistoriasHydro] = useState<VistoriaRegistro[]>([]);
  const [vistoriasAlbras, setVistoriasAlbras] = useState<VistoriaRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchEquipamentos, setSearchEquipamentos] = useState('');

  // Filtros
  const [filtros, setFiltros] = useState({
    status: 'todos',
    previsto: 'todos',
    mes: 'todos'
  });

  // Formulário para nova vistoria
  const [novaVistoria, setNovaVistoria] = useState({
    tag: '',
    centro_custo: '',
    previsto: 'Não previsto' as 'Previsto' | 'Não previsto',
    data_vencimento_vistoria: '',
    data_realizacao_vistoria: '',
    status: 'Pendente' as 'Aprovado' | 'Reprovado' | 'Pendente',
    motivo_reprovacao: ''
  });

  // Formulário para edição de vistoria
  const [editandoVistoria, setEditandoVistoria] = useState<VistoriaRegistro | null>(null);

  // Formulário para novo equipamento
  const [novoEquipamento, setNovoEquipamento] = useState({
    tag: '',
    local: '',
    modelo: '',
    ano: '',
    placa_serie: '',
    chassi: '',
    numero_motor: '',
    renavam: ''
  });

  // Formulário para edição de equipamento
  const [editandoEquipamento, setEditandoEquipamento] = useState<VistoriaEquipamento | null>(null);

  const [showFormVistoria, setShowFormVistoria] = useState(false);
  const [showFormEquipamento, setShowFormEquipamento] = useState(false);

  // Carregar equipamentos
  const carregarEquipamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('vt_equipamentos')
        .select('*')
        .order('tag');

      if (error) throw error;
      setEquipamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  };

  // Carregar vistorias
  const carregarVistorias = async () => {
    setLoading(true);
    try {
      if (activeSection === 'hydro') {
        const { data, error } = await supabase
          .from('vt_hydro')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setVistoriasHydro(data || []);
      } else if (activeSection === 'albras') {
        const { data, error } = await supabase
          .from('vt_albras')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setVistoriasAlbras(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar vistorias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros para vistorias
  const vistoriasFiltradas = (activeSection === 'hydro' ? vistoriasHydro : vistoriasAlbras).filter(vistoria => {
    const matchesSearch = vistoria.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vistoria.centro_custo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filtros.status === 'todos' || vistoria.status === filtros.status;
    const matchesPrevisto = filtros.previsto === 'todos' || vistoria.previsto === filtros.previsto;
    
    // Filtro por mês
    let matchesMes = true;
    if (filtros.mes !== 'todos' && vistoria.data_vencimento_vistoria) {
      const dataVencimento = new Date(vistoria.data_vencimento_vistoria);
      const mesVencimento = dataVencimento.toLocaleString('pt-BR', { month: 'long' });
      matchesMes = mesVencimento.toLowerCase() === filtros.mes.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesPrevisto && matchesMes;
  });

  // Aplicar filtro para equipamentos
  const equipamentosFiltrados = equipamentos.filter(equipamento => {
    return equipamento.tag.toLowerCase().includes(searchEquipamentos.toLowerCase()) ||
           equipamento.tag_generico.toLowerCase().includes(searchEquipamentos.toLowerCase()) ||
           equipamento.modelo?.toLowerCase().includes(searchEquipamentos.toLowerCase()) ||
           equipamento.placa_serie?.toLowerCase().includes(searchEquipamentos.toLowerCase());
  });

  // Verificar se TAG existe na tabela de equipamentos
  const tagExiste = (tag: string) => {
    return equipamentos.some(equip => equip.tag === tag);
  };

  // Obter informações do equipamento pela TAG
  const getEquipamentoInfo = (tag: string) => {
    return equipamentos.find(equip => equip.tag === tag);
  };

  // Salvar nova vistoria
  const salvarVistoria = async () => {
    try {
      if (!tagExiste(novaVistoria.tag)) {
        alert('TAG não encontrada! Cadastre o equipamento primeiro.');
        return;
      }

      const tableName = activeSection === 'hydro' ? 'vt_hydro' : 'vt_albras';
      
      const { error } = await supabase
        .from(tableName)
        .insert([{
          ...novaVistoria,
          data_realizacao_vistoria: novaVistoria.data_realizacao_vistoria || null
        }]);

      if (error) throw error;

      await carregarVistorias();
      setShowFormVistoria(false);
      setNovaVistoria({
        tag: '',
        centro_custo: '',
        previsto: 'Não previsto',
        data_vencimento_vistoria: '',
        data_realizacao_vistoria: '',
        status: 'Pendente',
        motivo_reprovacao: ''
      });
    } catch (error) {
      console.error('Erro ao salvar vistoria:', error);
    }
  };

  // Atualizar vistoria
  const atualizarVistoria = async () => {
    if (!editandoVistoria) return;

    try {
      const tableName = activeSection === 'hydro' ? 'vt_hydro' : 'vt_albras';
      
      const { error } = await supabase
        .from(tableName)
        .update({
          ...editandoVistoria,
          data_realizacao_vistoria: editandoVistoria.data_realizacao_vistoria || null
        })
        .eq('id', editandoVistoria.id);

      if (error) throw error;

      await carregarVistorias();
      setEditandoVistoria(null);
    } catch (error) {
      console.error('Erro ao atualizar vistoria:', error);
    }
  };

  // Extrair tag genérica
  const extrairTagGenerica = (tag: string) => {
    const match = tag.match(/^[A-Za-z]+/);
    return match ? match[0] : tag;
  };

  // Salvar novo equipamento
  const salvarEquipamento = async () => {
    try {
      const tagGenerica = extrairTagGenerica(novoEquipamento.tag);
      
      const { error } = await supabase
        .from('vt_equipamentos')
        .insert([{ 
          tag: novoEquipamento.tag, 
          tag_generico: tagGenerica, 
          local: novoEquipamento.local,
          modelo: novoEquipamento.modelo,
          ano: novoEquipamento.ano,
          placa_serie: novoEquipamento.placa_serie,
          chassi: novoEquipamento.chassi,
          numero_motor: novoEquipamento.numero_motor,
          renavam: novoEquipamento.renavam
        }]);

      if (error) throw error;

      await carregarEquipamentos();
      setShowFormEquipamento(false);
      setNovoEquipamento({
        tag: '',
        local: '',
        modelo: '',
        ano: '',
        placa_serie: '',
        chassi: '',
        numero_motor: '',
        renavam: ''
      });
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
    }
  };

  // Atualizar equipamento
  const atualizarEquipamento = async () => {
    if (!editandoEquipamento) return;

    try {
      const tagGenerica = extrairTagGenerica(editandoEquipamento.tag);
      
      const { error } = await supabase
        .from('vt_equipamentos')
        .update({ 
          tag: editandoEquipamento.tag, 
          tag_generico: tagGenerica, 
          local: editandoEquipamento.local,
          modelo: editandoEquipamento.modelo,
          ano: editandoEquipamento.ano,
          placa_serie: editandoEquipamento.placa_serie,
          chassi: editandoEquipamento.chassi,
          numero_motor: editandoEquipamento.numero_motor,
          renavam: editandoEquipamento.renavam
        })
        .eq('id', editandoEquipamento.id);

      if (error) throw error;

      await carregarEquipamentos();
      setEditandoEquipamento(null);
    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error);
    }
  };

  // Excluir equipamento
  const excluirEquipamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;

    try {
      const { error } = await supabase
        .from('vt_equipamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await carregarEquipamentos();
    } catch (error) {
      console.error('Erro ao excluir equipamento:', error);
    }
  };

  useEffect(() => {
    carregarEquipamentos();
    if (activeSection !== 'equipamentos') {
      carregarVistorias();
    }
  }, [activeSection]);

  const meses = [
    'todos', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Reprovado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Pendente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const formatarData = (data: string) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const menuItems = [
    {
      id: 'hydro',
      label: 'Vistorias HYDRO',
      icon: Building2,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'from-blue-700 to-blue-800'
    },
    {
      id: 'albras',
      label: 'Vistorias ALBRAS',
      icon: Factory,
      color: 'from-green-600 to-green-700',
      hoverColor: 'from-green-700 to-green-800'
    },
    {
      id: 'equipamentos',
      label: 'Cadastro de Equipamentos',
      icon: Settings,
      color: 'from-purple-600 to-purple-700',
      hoverColor: 'from-purple-700 to-purple-800'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
      <div className="p-6 border-b border-blue-600/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Sistema de Vistorias</h1>
              <p className="text-blue-200">
                Controle completo de vistorias e equipamentos
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowFormEquipamento(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Truck className="h-4 w-4 mr-2" />
              Novo Equipamento
            </Button>
            {activeSection !== 'equipamentos' && (
              <Button 
                onClick={() => setShowFormVistoria(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Vistoria
              </Button>
            )}
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/30">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Menu Lateral */}
        <div className="w-64 bg-blue-800/50 backdrop-blur-sm border-r border-blue-600/30">
          <div className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full h-16 bg-gradient-to-r ${item.color} hover:${item.hoverColor} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative group hover:scale-105 hover:shadow-xl ${
                  activeSection === item.id ? 'ring-2 ring-white ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-start space-x-3 w-full">
                  <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-left text-sm">{item.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 p-6">
          {/* Filtros e Busca (apenas para vistorias) */}
          {activeSection !== 'equipamentos' && (
            <Card className="mb-6 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros e Busca - {activeSection === 'hydro' ? 'HYDRO' : 'ALBRAS'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="search" className="text-white">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="search"
                        placeholder="Buscar por TAG ou Centro de Custo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/5 border-blue-300/30 text-white pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="status" className="text-white">Status</Label>
                    <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                      <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                        <SelectItem value="Reprovado">Reprovado</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="previsto" className="text-white">Previsto</Label>
                    <Select value={filtros.previsto} onValueChange={(value) => setFiltros({ ...filtros, previsto: value })}>
                      <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                        <SelectValue placeholder="Previsto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Previsto">Previsto</SelectItem>
                        <SelectItem value="Não previsto">Não Previsto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="mes" className="text-white">Mês de Vencimento</Label>
                    <Select value={filtros.mes} onValueChange={(value) => setFiltros({ ...filtros, mes: value })}>
                      <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map(mes => (
                          <SelectItem key={mes} value={mes}>
                            {mes === 'todos' ? 'Todos os meses' : mes.charAt(0).toUpperCase() + mes.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Busca para Equipamentos */}
          {activeSection === 'equipamentos' && (
            <Card className="mb-6 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Equipamentos
                </CardTitle>
                <CardDescription className="text-blue-200">
                  Pesquise por TAG, modelo, placa ou número de série
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="search_equipamentos" className="text-white">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="search_equipamentos"
                        placeholder="Buscar por TAG, modelo, placa, série..."
                        value={searchEquipamentos}
                        onChange={(e) => setSearchEquipamentos(e.target.value)}
                        className="bg-white/5 border-blue-300/30 text-white pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchEquipamentos('')}
                      className="border-blue-300/30 text-white hover:bg-white/10 w-full"
                    >
                      Limpar Busca
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conteúdo das Seções */}
          {activeSection === 'equipamentos' ? (
            /* Seção Equipamentos */
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">
                  Cadastro de Equipamentos
                  <span className="text-blue-200 text-sm font-normal ml-2">
                    ({equipamentosFiltrados.length} de {equipamentos.length} equipamentos)
                    {searchEquipamentos && (
                      <span className="text-orange-300"> • Filtrado por: "{searchEquipamentos}"</span>
                    )}
                  </span>
                </CardTitle>
                <CardDescription className="text-blue-200">
                  Gerencie todos os equipamentos disponíveis para vistoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                {equipamentosFiltrados.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-white text-center">
                      <p>
                        {searchEquipamentos 
                          ? 'Nenhum equipamento encontrado para a busca' 
                          : 'Nenhum equipamento cadastrado'
                        }
                      </p>
                      <p className="text-sm text-blue-200 mt-2">
                        {searchEquipamentos 
                          ? 'Tente ajustar os termos da busca' 
                          : 'Clique em "Novo Equipamento" para adicionar o primeiro'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-blue-200/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-purple-500/20 hover:bg-purple-500/20">
                          <TableHead className="text-white">Equipamento</TableHead>
                          <TableHead className="text-white">TAG</TableHead>
                          <TableHead className="text-white">Modelo</TableHead>
                          <TableHead className="text-white">Ano</TableHead>
                          <TableHead className="text-white">Placa/Série</TableHead>
                          <TableHead className="text-white">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipamentosFiltrados.map((equipamentoFiltrado) => {
                          // Buscar o equipamento completo na lista original
                          const equipamentoCompleto = equipamentos.find(e => e.id === equipamentoFiltrado.id);
                          
                          return (
                            <TableRow key={equipamentoFiltrado.id} className="border-blue-200/30 hover:bg-white/5">
                              <TableCell className="text-white font-medium">
                                <div>
                                  <div>{equipamentoFiltrado.tag_generico}</div>
                                  <div className="text-sm text-blue-200">{equipamentoFiltrado.local || 'Sem local'}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-white">{equipamentoFiltrado.tag}</TableCell>
                              <TableCell className="text-white">{equipamentoFiltrado.modelo || '-'}</TableCell>
                              <TableCell className="text-white">{equipamentoFiltrado.ano || '-'}</TableCell>
                              <TableCell className="text-white">{equipamentoFiltrado.placa_serie || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (equipamentoCompleto) {
                                        setEditandoEquipamento(equipamentoCompleto);
                                      }
                                    }}
                                    className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => excluirEquipamento(equipamentoFiltrado.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Excluir
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Seção Vistorias */
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">
                  {activeSection === 'hydro' ? 'Vistorias HYDRO' : 'Vistorias ALBRAS'} 
                  <span className="text-blue-200 text-sm font-normal ml-2">
                    ({vistoriasFiltradas.length} registros)
                  </span>
                </CardTitle>
                <CardDescription className="text-blue-200">
                  Controle de vistorias realizadas e pendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-white animate-pulse">Carregando vistorias...</div>
                  </div>
                ) : vistoriasFiltradas.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-white text-center">
                      <p>Nenhuma vistoria encontrada</p>
                      <p className="text-sm text-blue-200 mt-2">
                        {searchTerm || filtros.status !== 'todos' || filtros.previsto !== 'todos' || filtros.mes !== 'todos' 
                          ? 'Tente ajustar os filtros de busca' 
                          : 'Clique em "Nova Vistoria" para adicionar a primeira'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-blue-200/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-500/20 hover:bg-blue-500/20">
                          <TableHead className="text-white">TAG</TableHead>
                          <TableHead className="text-white">Centro de Custo</TableHead>
                          <TableHead className="text-white">Previsto</TableHead>
                          <TableHead className="text-white">Data Vencimento</TableHead>
                          <TableHead className="text-white">Data Realização</TableHead>
                          <TableHead className="text-white">Status</TableHead>
                          <TableHead className="text-white">Motivo Reprovação</TableHead>
                          <TableHead className="text-white">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vistoriasFiltradas.map((vistoria) => (
                          <TableRow key={vistoria.id} className="border-blue-200/30 hover:bg-white/5">
                            <TableCell className="text-white font-medium">{vistoria.tag}</TableCell>
                            <TableCell className="text-white">{vistoria.centro_custo}</TableCell>
                            <TableCell className="text-white">{vistoria.previsto}</TableCell>
                            <TableCell className="text-white">{formatarData(vistoria.data_vencimento_vistoria)}</TableCell>
                            <TableCell className="text-white">{formatarData(vistoria.data_realizacao_vistoria)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(vistoria.status)}
                                <span className={`font-medium ${
                                  vistoria.status === 'Aprovado' ? 'text-green-400' :
                                  vistoria.status === 'Reprovado' ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                  {vistoria.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-white max-w-xs truncate">
                              {vistoria.motivo_reprovacao || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditandoVistoria(vistoria)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Nova Vistoria */}
      {showFormVistoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-gray-900">Nova Vistoria - {activeSection === 'hydro' ? 'HYDRO' : 'ALBRAS'}</CardTitle>
              <CardDescription>Preencha os dados da nova vistoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">TAG do Equipamento *</Label>
                  <div className="relative">
                    <Input
                      id="tag"
                      value={novaVistoria.tag}
                      onChange={(e) => setNovaVistoria({ ...novaVistoria, tag: e.target.value })}
                      placeholder="Ex: CB-100"
                      className={`pr-10 ${
                        novaVistoria.tag && !tagExiste(novaVistoria.tag) 
                          ? 'border-red-500 focus:border-red-500' 
                          : novaVistoria.tag && tagExiste(novaVistoria.tag)
                          ? 'border-green-500 focus:border-green-500'
                          : ''
                      }`}
                    />
                    {novaVistoria.tag && (
                      <div className="absolute right-3 top-3">
                        {tagExiste(novaVistoria.tag) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {novaVistoria.tag && !tagExiste(novaVistoria.tag) && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      TAG não cadastrada! Cadastre o equipamento primeiro.
                    </p>
                  )}
                  {novaVistoria.tag && tagExiste(novaVistoria.tag) && (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Equipamento encontrado: {getEquipamentoInfo(novaVistoria.tag)?.tag_generico}
                      {getEquipamentoInfo(novaVistoria.tag)?.local && ` - ${getEquipamentoInfo(novaVistoria.tag)?.local}`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="centro_custo">Centro de Custo *</Label>
                  <Input
                    id="centro_custo"
                    value={novaVistoria.centro_custo}
                    onChange={(e) => setNovaVistoria({ ...novaVistoria, centro_custo: e.target.value })}
                    placeholder="Ex: OP. PORTUARIA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previsto">Previsto</Label>
                  <Select 
                    value={novaVistoria.previsto} 
                    onValueChange={(value: 'Previsto' | 'Não previsto') => 
                      setNovaVistoria({ ...novaVistoria, previsto: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Previsto">Previsto</SelectItem>
                      <SelectItem value="Não previsto">Não Previsto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={novaVistoria.status} 
                    onValueChange={(value: 'Aprovado' | 'Reprovado' | 'Pendente') => 
                      setNovaVistoria({ ...novaVistoria, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Aprovado">Aprovado</SelectItem>
                      <SelectItem value="Reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Data Vencimento *</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={novaVistoria.data_vencimento_vistoria}
                    onChange={(e) => setNovaVistoria({ ...novaVistoria, data_vencimento_vistoria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_realizacao">Data Realização (Opcional)</Label>
                  <Input
                    id="data_realizacao"
                    type="date"
                    value={novaVistoria.data_realizacao_vistoria}
                    onChange={(e) => setNovaVistoria({ ...novaVistoria, data_realizacao_vistoria: e.target.value })}
                  />
                </div>

                {novaVistoria.status === 'Reprovado' && (
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="motivo_reprovacao">Motivo da Reprovação *</Label>
                    <Input
                      id="motivo_reprovacao"
                      value={novaVistoria.motivo_reprovacao}
                      onChange={(e) => setNovaVistoria({ ...novaVistoria, motivo_reprovacao: e.target.value })}
                      placeholder="Descreva o motivo da reprovação..."
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFormVistoria(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={salvarVistoria}
                  disabled={
                    !novaVistoria.tag || 
                    !novaVistoria.centro_custo || 
                    !novaVistoria.data_vencimento_vistoria || 
                    !tagExiste(novaVistoria.tag) ||
                    (novaVistoria.status === 'Reprovado' && !novaVistoria.motivo_reprovacao)
                  }
                >
                  Salvar Vistoria
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Editar Vistoria */}
      {editandoVistoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-gray-900">Editar Vistoria</CardTitle>
              <CardDescription>Atualize os dados da vistoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_tag">TAG do Equipamento</Label>
                  <Input
                    id="edit_tag"
                    value={editandoVistoria.tag}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-sm text-gray-500">
                    TAG: {getEquipamentoInfo(editandoVistoria.tag)?.tag_generico}
                    {getEquipamentoInfo(editandoVistoria.tag)?.local && ` - ${getEquipamentoInfo(editandoVistoria.tag)?.local}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_centro_custo">Centro de Custo *</Label>
                  <Input
                    id="edit_centro_custo"
                    value={editandoVistoria.centro_custo}
                    onChange={(e) => setEditandoVistoria({ ...editandoVistoria, centro_custo: e.target.value })}
                    placeholder="Ex: OP. PORTUARIA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_previsto">Previsto</Label>
                  <Select 
                    value={editandoVistoria.previsto} 
                    onValueChange={(value: 'Previsto' | 'Não previsto') => 
                      setEditandoVistoria({ ...editandoVistoria, previsto: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Previsto">Previsto</SelectItem>
                      <SelectItem value="Não previsto">Não Previsto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select 
                    value={editandoVistoria.status} 
                    onValueChange={(value: 'Aprovado' | 'Reprovado' | 'Pendente') => 
                      setEditandoVistoria({ ...editandoVistoria, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Aprovado">Aprovado</SelectItem>
                      <SelectItem value="Reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_data_vencimento">Data Vencimento *</Label>
                  <Input
                    id="edit_data_vencimento"
                    type="date"
                    value={editandoVistoria.data_vencimento_vistoria}
                    onChange={(e) => setEditandoVistoria({ ...editandoVistoria, data_vencimento_vistoria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_data_realizacao">Data Realização (Opcional)</Label>
                  <Input
                    id="edit_data_realizacao"
                    type="date"
                    value={editandoVistoria.data_realizacao_vistoria || ''}
                    onChange={(e) => setEditandoVistoria({ ...editandoVistoria, data_realizacao_vistoria: e.target.value })}
                  />
                </div>

                {editandoVistoria.status === 'Reprovado' && (
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="edit_motivo_reprovacao">Motivo da Reprovação *</Label>
                    <Input
                      id="edit_motivo_reprovacao"
                      value={editandoVistoria.motivo_reprovacao}
                      onChange={(e) => setEditandoVistoria({ ...editandoVistoria, motivo_reprovacao: e.target.value })}
                      placeholder="Descreva o motivo da reprovação..."
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setEditandoVistoria(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={atualizarVistoria}
                  disabled={!editandoVistoria.centro_custo || !editandoVistoria.data_vencimento_vistoria || (editandoVistoria.status === 'Reprovado' && !editandoVistoria.motivo_reprovacao)}
                >
                  Atualizar Vistoria
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Novo Equipamento */}
      {showFormEquipamento && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-gray-900">Cadastrar Novo Equipamento</CardTitle>
              <CardDescription>Preencha todos os dados do equipamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag_equipamento">TAG do Equipamento *</Label>
                  <Input
                    id="tag_equipamento"
                    value={novoEquipamento.tag}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, tag: e.target.value })}
                    placeholder="Ex: CB-100, BTT-01, PC-28"
                  />
                  <p className="text-sm text-gray-500">
                    TAG genérica será extraída automaticamente: {novoEquipamento.tag ? extrairTagGenerica(novoEquipamento.tag) : '-'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local">Local (Opcional)</Label>
                  <Input
                    id="local"
                    value={novoEquipamento.local}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, local: e.target.value })}
                    placeholder="Ex: Pátio Principal, Almoxarifado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={novoEquipamento.modelo}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, modelo: e.target.value })}
                    placeholder="Ex: Caterpillar 320D"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    value={novoEquipamento.ano}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, ano: e.target.value })}
                    placeholder="Ex: 2018"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="placa_serie">Placa ou Número de Série</Label>
                  <Input
                    id="placa_serie"
                    value={novoEquipamento.placa_serie}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, placa_serie: e.target.value })}
                    placeholder="Ex: ABC1234 ou 123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chassi">Chassi</Label>
                  <Input
                    id="chassi"
                    value={novoEquipamento.chassi}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, chassi: e.target.value })}
                    placeholder="Ex: 9BWZZZ377VT004251"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_motor">Número do Motor</Label>
                  <Input
                    id="numero_motor"
                    value={novoEquipamento.numero_motor}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, numero_motor: e.target.value })}
                    placeholder="Ex: C7.1-0123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="renavam">RENAVAM</Label>
                  <Input
                    id="renavam"
                    value={novoEquipamento.renavam}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, renavam: e.target.value })}
                    placeholder="Ex: 12345678901"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFormEquipamento(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={salvarEquipamento}
                  disabled={!novoEquipamento.tag}
                >
                  Cadastrar Equipamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Editar Equipamento */}
      {editandoEquipamento && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-gray-900">Editar Equipamento</CardTitle>
              <CardDescription>Atualize os dados do equipamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_tag_equipamento">TAG do Equipamento *</Label>
                  <Input
                    id="edit_tag_equipamento"
                    value={editandoEquipamento.tag}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, tag: e.target.value })}
                    placeholder="Ex: CB-100, BTT-01, PC-28"
                  />
                  <p className="text-sm text-gray-500">
                    TAG genérica será extraída automaticamente: {editandoEquipamento.tag ? extrairTagGenerica(editandoEquipamento.tag) : '-'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_local">Local (Opcional)</Label>
                  <Input
                    id="edit_local"
                    value={editandoEquipamento.local}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, local: e.target.value })}
                    placeholder="Ex: Pátio Principal, Almoxarifado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_modelo">Modelo</Label>
                  <Input
                    id="edit_modelo"
                    value={editandoEquipamento.modelo}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, modelo: e.target.value })}
                    placeholder="Ex: Caterpillar 320D"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_ano">Ano</Label>
                  <Input
                    id="edit_ano"
                    value={editandoEquipamento.ano}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, ano: e.target.value })}
                    placeholder="Ex: 2018"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_placa_serie">Placa ou Número de Série</Label>
                  <Input
                    id="edit_placa_serie"
                    value={editandoEquipamento.placa_serie}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, placa_serie: e.target.value })}
                    placeholder="Ex: ABC1234 ou 123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_chassi">Chassi</Label>
                  <Input
                    id="edit_chassi"
                    value={editandoEquipamento.chassi}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, chassi: e.target.value })}
                    placeholder="Ex: 9BWZZZ377VT004251"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_numero_motor">Número do Motor</Label>
                  <Input
                    id="edit_numero_motor"
                    value={editandoEquipamento.numero_motor}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, numero_motor: e.target.value })}
                    placeholder="Ex: C7.1-0123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_renavam">RENAVAM</Label>
                  <Input
                    id="edit_renavam"
                    value={editandoEquipamento.renavam}
                    onChange={(e) => setEditandoEquipamento({ ...editandoEquipamento, renavam: e.target.value })}
                    placeholder="Ex: 12345678901"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setEditandoEquipamento(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={atualizarEquipamento}
                  disabled={!editandoEquipamento.tag}
                >
                  Atualizar Equipamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Vistorias;