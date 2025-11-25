import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Filter, Download, Search, Calendar, CheckCircle, XCircle, Clock, Truck, Edit, Trash2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VistoriaEquipamento {
  id: string;
  tag: string;
  tag_generico: string;
  local: string;
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
  const [activeTab, setActiveTab] = useState<'hydro' | 'albras' | 'equipamentos'>('hydro');
  const [equipamentos, setEquipamentos] = useState<VistoriaEquipamento[]>([]);
  const [vistoriasHydro, setVistoriasHydro] = useState<VistoriaRegistro[]>([]);
  const [vistoriasAlbras, setVistoriasAlbras] = useState<VistoriaRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    local: ''
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
      if (activeTab === 'hydro') {
        const { data, error } = await supabase
          .from('vt_hydro')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setVistoriasHydro(data || []);
      } else if (activeTab === 'albras') {
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

  // Aplicar filtros
  const vistoriasFiltradas = (activeTab === 'hydro' ? vistoriasHydro : vistoriasAlbras).filter(vistoria => {
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

      const tableName = activeTab === 'hydro' ? 'vt_hydro' : 'vt_albras';
      
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
      const tableName = activeTab === 'hydro' ? 'vt_hydro' : 'vt_albras';
      
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
          local: novoEquipamento.local 
        }]);

      if (error) throw error;

      await carregarEquipamentos();
      setShowFormEquipamento(false);
      setNovoEquipamento({
        tag: '',
        local: ''
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
          local: editandoEquipamento.local 
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
    if (activeTab !== 'equipamentos') {
      carregarVistorias();
    }
  }, [activeTab]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-6">
      {/* Header */}
      <div className="mb-8">
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
              <h1 className="text-3xl font-bold text-white mb-2">Controle de Vistorias</h1>
              <p className="text-blue-200">
                Gerenciamento de vistorias de equipamentos - HYDRO e ALBRAS
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowFormEquipamento(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Truck className="h-4 w-4 mr-2" />
              Cadastrar Equipamento
            </Button>
            {activeTab !== 'equipamentos' && (
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

      {/* Tabs */}
      <Card className="mb-6 bg-white/10 backdrop-blur-sm border-blue-200/30">
        <CardContent className="p-0">
          <div className="flex border-b border-blue-200/30">
            <button
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all ${
                activeTab === 'hydro'
                  ? 'text-white bg-blue-500/30 border-b-2 border-blue-400'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('hydro')}
            >
              Vistorias HYDRO
            </button>
            <button
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all ${
                activeTab === 'albras'
                  ? 'text-white bg-green-500/30 border-b-2 border-green-400'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('albras')}
            >
              Vistorias ALBRAS
            </button>
            <button
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all ${
                activeTab === 'equipamentos'
                  ? 'text-white bg-purple-500/30 border-b-2 border-purple-400'
                  : 'text-blue-200 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('equipamentos')}
            >
              Equipamentos
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Busca (apenas para vistorias) */}
      {activeTab !== 'equipamentos' && (
        <Card className="mb-6 bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
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

      {/* Conteúdo das Tabs */}
      {activeTab === 'equipamentos' ? (
        /* Tab Equipamentos */
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader>
            <CardTitle className="text-white">
              Equipamentos Cadastrados
              <span className="text-blue-200 text-sm font-normal ml-2">
                ({equipamentos.length} equipamentos)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipamentos.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-white text-center">
                  <p>Nenhum equipamento cadastrado</p>
                  <p className="text-sm text-blue-200 mt-2">
                    Clique em "Cadastrar Equipamento" para adicionar o primeiro
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-blue-200/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-purple-500/20 hover:bg-purple-500/20">
                      <TableHead className="text-white">TAG</TableHead>
                      <TableHead className="text-white">TAG Genérica</TableHead>
                      <TableHead className="text-white">Local</TableHead>
                      <TableHead className="text-white text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipamentos.map((equipamento) => (
                      <TableRow key={equipamento.id} className="border-blue-200/30 hover:bg-white/5">
                        <TableCell className="text-white font-medium">{equipamento.tag}</TableCell>
                        <TableCell className="text-white">{equipamento.tag_generico}</TableCell>
                        <TableCell className="text-white">{equipamento.local || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditandoEquipamento(equipamento)}
                              className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => excluirEquipamento(equipamento.id)}
                              className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
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
      ) : (
        /* Tab Vistorias */
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader>
            <CardTitle className="text-white">
              {activeTab === 'hydro' ? 'Vistorias HYDRO' : 'Vistorias ALBRAS'} 
              <span className="text-blue-200 text-sm font-normal ml-2">
                ({vistoriasFiltradas.length} registros)
              </span>
            </CardTitle>
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
                      <TableHead className="text-white text-right">Ações</TableHead>
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
                        <TableCell className="text-right">
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

      {/* Modal Nova Vistoria */}
      {showFormVistoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Nova Vistoria - {activeTab === 'hydro' ? 'HYDRO' : 'ALBRAS'}</CardTitle>
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
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-2xl">
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

      {/* Modal Cadastrar Equipamento */}
      {showFormEquipamento && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Cadastrar Novo Equipamento</CardTitle>
              <CardDescription>Adicione um novo equipamento para vistoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200/30 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Editar Equipamento</CardTitle>
              <CardDescription>Atualize os dados do equipamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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