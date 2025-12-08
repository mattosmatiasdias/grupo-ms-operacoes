import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, X, Clock, Calendar, Ship, Factory, Warehouse, Building, Users, UserX, Save, AlertCircle } from 'lucide-react';
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
  hora_inicial: string | null;
  hora_final: string | null;
  horas_trabalhadas?: number;
}
interface Navio { id: string; nome_navio: string; carga: string; }
interface OperacaoGrupo { id: string; nome: string; equipamentos: Equipamento[]; }
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
        observacao: a.observacao?.toUpperCase() || '',
        data: opData.data
      })));

      // Carregar ausências
      setAusencias((opData.ausencias || []).map((a: any) => ({
        ...a,
        id: a.id.toString(),
        nome: a.nome?.toUpperCase() || '',
        obs: a.obs?.toUpperCase() || '',
        data: opData.data
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
            motorista_operador: eq.motorista_operador?.toUpperCase() || '',
            hora_inicial: eq.hora_inicial || '',
            hora_final: eq.hora_final || '',
            horas_trabalhadas: eq.horas_trabalhadas || 0
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
              motorista_operador: eq.motorista_operador?.toUpperCase() || '',
              hora_inicial: eq.hora_inicial || '',
              hora_final: eq.hora_final || '',
              horas_trabalhadas: eq.horas_trabalhadas || 0
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

  // Função para calcular horas trabalhadas
  const calcularHorasTrabalhadas = (horaInicial: string, horaFinal: string): number => {
    if (!horaInicial || !horaFinal) return 0;
    
    const [horaIni, minutoIni] = horaInicial.split(':').map(Number);
    const [horaFim, minutoFim] = horaFinal.split(':').map(Number);
    
    const inicio = horaIni + minutoIni / 60;
    const fim = horaFim + minutoFim / 60;
    
    let diferenca = fim - inicio;
    if (diferenca < 0) {
      diferenca += 24; // Tratar turnos que passam da meia-noite
    }
    
    return Math.round(diferenca * 100) / 100; // Arredondar para 2 casas decimais
  };

  // Função para atualizar horas do equipamento
  const atualizarHorasEquipamento = (horaInicial: string, horaFinal: string) => {
    const horas = calcularHorasTrabalhadas(horaInicial, horaFinal);
    return horas;
  };

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
          
          // Calcular horas trabalhadas
          const horasTrabalhadas = atualizarHorasEquipamento(eq.hora_inicial || '', eq.hora_final || '');
          
          return {
            registro_operacoes_id: operacaoId,
            tag: eq.tag.toUpperCase(),
            motorista_operador: eq.motorista_operador.toUpperCase(),
            local: selectedOp === 'NAVIO' ? 'NAVIO' : selectedOp,
            grupo_operacao: grupoOperacao,
            hora_inicial: eq.hora_inicial,
            hora_final: eq.hora_final,
            horas_trabalhadas: horasTrabalhadas,
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
          
          // Calcular horas trabalhadas
          const horasTrabalhadas = atualizarHorasEquipamento(eq.hora_inicial || '', eq.hora_final || '');
          
          const { error: updateError } = await supabase
            .from('equipamentos')
            .update({
              tag: eq.tag.toUpperCase(),
              motorista_operador: eq.motorista_operador.toUpperCase(),
              local: selectedOp === 'NAVIO' ? 'NAVIO' : selectedOp,
              grupo_operacao: grupoOperacao,
              hora_inicial: eq.hora_inicial,
              hora_final: eq.hora_final,
              horas_trabalhadas: horasTrabalhadas,
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
        motorista_operador: '',
        hora_inicial: '',
        hora_final: '',
        horas_trabalhadas: 0
      }); 
    } 
    setEquipamentosNavio([...equipamentosNavio, ...novosEquipamentos]); 
  };

  const updateEquipamentoNavio = (id: string, field: keyof Equipamento, value: string) => { 
    setEquipamentosNavio(equipamentosNavio.map(eq => {
      const updatedEquipamento = { 
        ...eq, 
        [field]: field === 'tag' ? formatTag(value) : value.toUpperCase()
      };
      
      // Se estamos atualizando hora_inicial ou hora_final, recalcular horas
      if (field === 'hora_inicial' || field === 'hora_final') {
        const horasTrabalhadas = atualizarHorasEquipamento(
          field === 'hora_inicial' ? value : eq.hora_inicial || '',
          field === 'hora_final' ? value : eq.hora_final || ''
        );
        updatedEquipamento.horas_trabalhadas = horasTrabalhadas;
      }
      
      return eq.id === id ? updatedEquipamento : eq;
    })); 
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
        motorista_operador: '',
        hora_inicial: '',
        hora_final: '',
        horas_trabalhadas: 0
      }); 
    } 
    setOperacaoGrupos(operacaoGrupos.map(grupo => 
      grupo.id === grupoId 
        ? { ...grupo, equipamentos: [...grupo.equipamentos, ...novosEquipamentos] } 
        : grupo
    )); 
  };

  const updateEquipamentoGrupo = (grupoId: string, equipamentoId: string, field: keyof Equipamento, value: string) => { 
    setOperacaoGrupos(operacaoGrupos.map(grupo => {
      if (grupo.id === grupoId) {
        const equipamentosAtualizados = grupo.equipamentos.map(eq => {
          if (eq.id === equipamentoId) {
            const updatedEquipamento = { 
              ...eq, 
              [field]: field === 'tag' ? formatTag(value) : value.toUpperCase()
            };
            
            // Se estamos atualizando hora_inicial ou hora_final, recalcular horas
            if (field === 'hora_inicial' || field === 'hora_final') {
              const horasTrabalhadas = atualizarHorasEquipamento(
                field === 'hora_inicial' ? value : eq.hora_inicial || '',
                field === 'hora_final' ? value : eq.hora_final || ''
              );
              updatedEquipamento.horas_trabalhadas = horasTrabalhadas;
            }
            
            return updatedEquipamento;
          }
          return eq;
        });
        return { ...grupo, equipamentos: equipamentosAtualizados };
      }
      return grupo;
    })); 
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
      observacao: '',
      data: data
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
      obs: '',
      data: data
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

  const getOperacaoIcon = (op: string) => {
    switch (op) {
      case 'NAVIO': return Ship;
      case 'HYDRO': return Factory;
      case 'ALBRAS': return Warehouse;
      case 'SANTOS BRASIL': return Building;
      case 'AJUDANTES': return Users;
      case 'AUSENCIAS': return UserX;
      default: return AlertCircle;
    }
  };

  const Icon = getOperacaoIcon(selectedOp);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Operação</h2>
          <p className="text-blue-300">Preparando dados para edição...</p>
        </div>
      </div>
    );
  }

  const totalEquipamentos = selectedOp === 'NAVIO' 
    ? equipamentosNavio.length 
    : operacaoGrupos.reduce((total, grupo) => total + grupo.equipamentos.length, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-10">
      {/* Header */}
      <div className="bg-blue-900/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/relatorio-transporte')} 
                className="text-blue-300 hover:bg-blue-800/50"
                title="Cancelar e voltar"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="ml-2">Cancelar</span>
              </Button>
              <h1 className="text-2xl font-bold text-white">Editando Operação</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-sm">
                {totalEquipamentos} equipamentos
              </Badge>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informação da operação */}
      <div className="px-6 py-3 bg-blue-800/30 backdrop-blur-sm border-b border-blue-600/30">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-blue-300">
            {selectedOp} • {new Date(data).toLocaleDateString('pt-BR')} • {horaInicial} - {horaFinal}
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="px-6 space-y-4 mt-6">
        <div className="max-w-7xl mx-auto">
          {/* Dados da Operação */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-300" />
                <span>Dados da Operação</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {selectedOp === 'NAVIO' && ( 
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-200">Selecionar Navio</Label>
                  <Select value={selectedNavio} onValueChange={setSelectedNavio}>
                    <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                      <SelectValue placeholder="Selecione um navio..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-blue-300/30">
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-200">Tipo de Carga *</Label>
                  <Select value={carga} onValueChange={setCarga} required>
                    <SelectTrigger className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300">
                      <SelectValue placeholder="Selecione o tipo de carga" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-blue-300/30">
                      {opcoesCarga.map((cargaItem) => (
                        <SelectItem key={cargaItem} value={cargaItem}>
                          {cargaItem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-300 mt-1">
                    Selecione o tipo de carga para a operação ALBRAS
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>Data</span>
                  </Label>
                  <Input 
                    type="date" 
                    value={data} 
                    onChange={(e) => setData(e.target.value)} 
                    required 
                    className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-300" />
                    <span>Hora Inicial</span>
                  </Label>
                  <Input 
                    type="time" 
                    value={horaInicial} 
                    onChange={(e) => setHoraInicial(e.target.value)} 
                    className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-300" />
                    <span>Hora Final</span>
                  </Label>
                  <Input 
                    type="time" 
                    value={horaFinal} 
                    onChange={(e) => setHoraFinal(e.target.value)} 
                    className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-200">Observação do Turno</Label>
                <Textarea 
                  value={observacao} 
                  onChange={(e) => setObservacao(e.target.value.toUpperCase())} 
                  placeholder="Digite as observações do turno..."
                  className="bg-white/5 border-blue-300/30 text-white min-h-[100px] resize-none focus:border-blue-300"
                />
              </div>
            </CardContent>
          </Card>

          {selectedOp === 'NAVIO' && (
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader className="border-b border-blue-200/30">
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ship className="h-5 w-5 text-blue-300" />
                    <span>Equipamentos do Navio</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
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
                      <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="text-blue-200 text-xs py-3">TAG</TableHead>
                          <TableHead className="text-blue-200 text-xs py-3">Operador/Motorista</TableHead>
                          <TableHead className="text-blue-200 text-xs py-3">Início</TableHead>
                          <TableHead className="text-blue-200 text-xs py-3">Fim</TableHead>
                          <TableHead className="text-blue-200 text-xs py-3">Horas</TableHead>
                          <TableHead className="text-blue-200 text-xs py-3 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipamentosNavio.map(equipamento => (
                          <TableRow key={equipamento.id} className="hover:bg-white/5 border-b border-blue-200/10">
                            <TableCell className="py-3">
                              <Input 
                                placeholder="TAG" 
                                value={equipamento.tag} 
                                onChange={e => updateEquipamentoNavio(equipamento.id, 'tag', e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Input 
                                placeholder="OPERADOR/MOTORISTA" 
                                value={equipamento.motorista_operador} 
                                onChange={e => updateEquipamentoNavio(equipamento.id, 'motorista_operador', e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Input 
                                type="time" 
                                value={equipamento.hora_inicial || ''}
                                onChange={e => updateEquipamentoNavio(equipamento.id, 'hora_inicial', e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Input 
                                type="time" 
                                value={equipamento.hora_final || ''}
                                onChange={e => updateEquipamentoNavio(equipamento.id, 'hora_final', e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                                {equipamento.horas_trabalhadas?.toFixed(1) || '0.0'}h
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeEquipamentoNavio(equipamento.id)}
                                type="button"
                                className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="p-4 border-t border-blue-200/30">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={() => addEquipamentoNavio(1)} 
                      variant="outline"
                      className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      +1 Equipamento
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => addEquipamentoNavio(10)} 
                      variant="outline"
                      className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      +10 Equipamentos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
            <div className="space-y-4">
              {operacaoGrupos.map(grupo => (
                <Card key={grupo.id} className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                  <CardHeader className="border-b border-blue-200/30">
                    <div className="flex items-center justify-between">
                      <Input 
                        className="text-lg font-bold bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-64" 
                        value={grupo.nome} 
                        onChange={e => updateOperacaoGrupo(grupo.id, e.target.value)}
                      />
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                          {grupo.equipamentos.length} equipamentos
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeOperacaoGrupo(grupo.id)}
                          type="button"
                          className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
                          <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                            <TableRow>
                              <TableHead className="text-blue-200 text-xs py-3">TAG</TableHead>
                              <TableHead className="text-blue-200 text-xs py-3">Operador</TableHead>
                              <TableHead className="text-blue-200 text-xs py-3">Início</TableHead>
                              <TableHead className="text-blue-200 text-xs py-3">Fim</TableHead>
                              <TableHead className="text-blue-200 text-xs py-3">Horas</TableHead>
                              <TableHead className="text-blue-200 text-xs py-3 text-center">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupo.equipamentos.map(equipamento => (
                              <TableRow key={equipamento.id} className="hover:bg-white/5 border-b border-blue-200/10">
                                <TableCell className="py-3">
                                  <Input 
                                    placeholder="TAG" 
                                    value={equipamento.tag} 
                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'tag', e.target.value)}
                                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                                  />
                                </TableCell>
                                <TableCell className="py-3">
                                  <Input 
                                    placeholder="OPERADOR" 
                                    value={equipamento.motorista_operador} 
                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'motorista_operador', e.target.value)}
                                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                                  />
                                </TableCell>
                                <TableCell className="py-3">
                                  <Input 
                                    type="time" 
                                    value={equipamento.hora_inicial || ''}
                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'hora_inicial', e.target.value)}
                                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                                  />
                                </TableCell>
                                <TableCell className="py-3">
                                  <Input 
                                    type="time" 
                                    value={equipamento.hora_final || ''}
                                    onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'hora_final', e.target.value)}
                                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                                  />
                                </TableCell>
                                <TableCell className="py-3">
                                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                                    {equipamento.horas_trabalhadas?.toFixed(1) || '0.0'}h
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeEquipamentoGrupo(grupo.id, equipamento.id)}
                                    type="button"
                                    className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="p-4 border-t border-blue-200/30">
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          onClick={() => addEquipamentoGrupo(grupo.id, 1)} 
                          variant="outline"
                          className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          +1 Equipamento
                        </Button>
                        <Button 
                          type="button" 
                          onClick={() => addEquipamentoGrupo(grupo.id, 10)} 
                          variant="outline"
                          className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          +10 Equipamentos
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button 
                type="button" 
                onClick={addOperacaoGrupo} 
                variant="outline" 
                className="w-full bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Operação (Frente de Serviço)
              </Button>
            </div>
          )}

          {/* Ajudantes */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-300" />
                  <span>Ajudantes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                    {ajudantes.length} ajudantes
                  </Badge>
                  <Button 
                    type="button" 
                    onClick={addAjudante} 
                    variant="outline"
                    size="sm"
                    className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajudante
                  </Button>
                </div>
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
                    <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-blue-200 text-xs py-3">Nome</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3">Início</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3">Fim</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3">Observação</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ajudantes.map(ajudante => (
                        <TableRow key={ajudante.id} className="hover:bg-white/5 border-b border-blue-200/10">
                          <TableCell className="py-3">
                            <Input 
                              value={ajudante.nome} 
                              onChange={(e) => updateAjudante(ajudante.id, 'nome', e.target.value)}
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              type="time" 
                              value={ajudante.hora_inicial} 
                              onChange={(e) => updateAjudante(ajudante.id, 'hora_inicial', e.target.value)}
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              type="time" 
                              value={ajudante.hora_final} 
                              onChange={(e) => updateAjudante(ajudante.id, 'hora_final', e.target.value)}
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-24"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              value={ajudante.observacao} 
                              onChange={(e) => updateAjudante(ajudante.id, 'observacao', e.target.value)}
                              placeholder="Observações sobre o ajudante..."
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                            />
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button 
                              type="button" 
                              onClick={() => removeAjudante(ajudante.id)} 
                              size="icon" 
                              variant="ghost"
                              className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                            >
                              <X className="h-4 w-4" />
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

          {/* Ausências */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserX className="h-5 w-5 text-blue-300" />
                  <span>Ausências</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                    {ausencias.length} ausências
                  </Badge>
                  <Button 
                    type="button" 
                    onClick={addAusencia} 
                    variant="outline"
                    size="sm"
                    className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ausência
                  </Button>
                </div>
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
                    <TableHeader className="bg-blue-600/20 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-blue-200 text-xs py-3">Nome</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3">Observação</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3">Status</TableHead>
                        <TableHead className="text-blue-200 text-xs py-3 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ausencias.map(ausencia => (
                        <TableRow key={ausencia.id} className="hover:bg-white/5 border-b border-blue-200/10">
                          <TableCell className="py-3">
                            <Input 
                              value={ausencia.nome} 
                              onChange={(e) => updateAusencia(ausencia.id, 'nome', e.target.value)}
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              value={ausencia.obs} 
                              onChange={(e) => updateAusencia(ausencia.id, 'obs', e.target.value)}
                              placeholder="Motivo da ausência..."
                              className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300 w-full"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={ausencia.justificado} 
                                onCheckedChange={(checked) => updateAusencia(ausencia.id, 'justificado', !!checked)}
                                className="data-[state=checked]:bg-green-500/20 data-[state=checked]:text-green-300 border-blue-300/30"
                              />
                              <Label className="text-blue-200 text-sm">
                                {ausencia.justificado ? 'Justificado' : 'Não Justificado'}
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button 
                              type="button" 
                              onClick={() => removeAusencia(ausencia.id)} 
                              size="icon" 
                              variant="ghost"
                              className="bg-red-500/20 text-red-300 border-red-300/30 hover:bg-red-500/30 hover:text-white"
                            >
                              <X className="h-4 w-4" />
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

          {/* Botão de Salvar */}
          <div className="sticky bottom-0 bg-blue-900/80 backdrop-blur-sm py-4 border-t border-blue-200/30 mt-6">
            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline"
                onClick={() => navigate('/relatorio-transporte')}
                className="bg-blue-500/20 text-blue-300 border-blue-300/30 hover:bg-blue-500/30 hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditarOperacao;