import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, X, Factory, Warehouse, Building, Ship, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Navio {
  id: string;
  nome_navio: string;
  carga: string;
}

interface Equipamento {
  id: string;
  tag: string;
  motorista_operador: string;
  grupo_operacao?: string;
}

interface OperacaoGrupo {
  id: string;
  nome: string;
  equipamentos: Equipamento[];
}

const FormularioOperacao = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedOp, setSelectedOp] = useState<'HYDRO' | 'ALBRAS' | 'SANTOS BRASIL' | 'NAVIO' | ''>('');
  const [selectedNavio, setSelectedNavio] = useState<Navio | null>(null);
  const [data, setData] = useState('');
  const [horaInicial, setHoraInicial] = useState('');
  const [horaFinal, setHoraFinal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [carga, setCarga] = useState('');
  
  const [equipamentosNavio, setEquipamentosNavio] = useState<Equipamento[]>([]);
  const [operacaoGrupos, setOperacaoGrupos] = useState<OperacaoGrupo[]>([]);
  
  const [ajudantes, setAjudantes] = useState<Array<{id: string, nome: string, hora_inicial: string, hora_final: string, observacao: string}>>([]);
  const [ausencias, setAusencias] = useState<Array<{id: string, nome: string, justificado: boolean, obs: string}>>([]);

  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [ultimaOperacao, setUltimaOperacao] = useState<any>(null);
  const [dadosCopiados, setDadosCopiados] = useState<any>(null);

  const opcoesCarga = [
    'COQUE',
    'PICHE', 
    'FLUORETO',
    'ENTULHO',
    'RECHEGO',
    'OUTROS'
  ];

  useEffect(() => {
    // Verificar se há dados copiados vindo da navegação
    if (location.state?.dadosCopiados) {
      console.log('📋 Dados copiados recebidos:', location.state.dadosCopiados);
      aplicarDadosCopiados(location.state.dadosCopiados);
      setDadosCopiados(location.state.dadosCopiados);
    }

    if (location.state) {
      if (location.state.tipo === 'OPERACAO') {
        setSelectedOp(location.state.operacao);
        buscarUltimaOperacao(location.state.operacao);
      } else if (location.state.tipo === 'NAVIO') {
        setSelectedOp('NAVIO');
        setSelectedNavio(location.state.navio);
        buscarUltimaOperacao('NAVIO');
      }
    } else {
      navigate('/novo-lancamento');
    }
  }, [location, navigate]);

  // FUNÇÃO PARA APLICAR DADOS COPIADOS - CORRIGIDA
  const aplicarDadosCopiados = (dados: any) => {
    console.log('🔄 Aplicando dados copiados:', dados);
    
    // Aplicar dados básicos da operação
    setHoraInicial(dados.hora_inicial || '');
    setHoraFinal(dados.hora_final || '');
    setObservacao(dados.observacao || '');
    setCarga(dados.carga || '');

    // Aplicar equipamentos baseado no tipo de operação
    if (dados.tipo === 'NAVIO') {
      const novosEquipamentos = (dados.equipamentos || []).map((eq: any, index: number) => ({
        id: `temp-copied-${Date.now()}-${index}`,
        tag: eq.tag || '',
        motorista_operador: eq.motorista_operador || ''
      }));
      setEquipamentosNavio(novosEquipamentos);
      console.log('🚢 Equipamentos de navio aplicados:', novosEquipamentos.length);
    } else {
      // Para operações HYDRO, ALBRAS, SANTOS BRASIL
      const gruposUnicos = [...new Set((dados.equipamentos || []).map((eq: any) => eq.grupo_operacao || 'Operação Principal'))];
      
      const novosGrupos: OperacaoGrupo[] = gruposUnicos.map((grupoNome, grupoIndex) => ({
        id: `grupo-copied-${Date.now()}-${grupoIndex}`,
        nome: grupoNome,
        equipamentos: (dados.equipamentos || [])
          .filter((eq: any) => (eq.grupo_operacao || 'Operação Principal') === grupoNome)
          .map((eq: any, eqIndex: number) => ({
            id: `temp-copied-${Date.now()}-${grupoIndex}-${eqIndex}`,
            tag: eq.tag || '',
            motorista_operador: eq.motorista_operador || ''
          }))
      }));
      
      setOperacaoGrupos(novosGrupos);
      console.log('🏭 Grupos de operação aplicados:', novosGrupos.length);
    }

    // Aplicar ajudantes
    const novosAjudantes = (dados.ajudantes || []).map((aj: any, index: number) => ({
      id: `ajudante-copied-${Date.now()}-${index}`,
      nome: aj.nome || '',
      hora_inicial: aj.hora_inicial || '',
      hora_final: aj.hora_final || '',
      observacao: aj.observacao || ''
    }));
    setAjudantes(novosAjudantes);
    console.log('👥 Ajudantes aplicados:', novosAjudantes.length);

    // Aplicar ausências
    const novasAusencias = (dados.ausencias || []).map((au: any, index: number) => ({
      id: `ausencia-copied-${Date.now()}-${index}`,
      nome: au.nome || '',
      justificado: au.justificado || false,
      obs: au.obs || ''
    }));
    setAusencias(novasAusencias);
    console.log('❌ Ausências aplicadas:', novasAusencias.length);

    // Limpar dados copiados do localStorage após uso
    localStorage.removeItem('operacao_copiada');
    
    toast({
      title: "✅ Dados Copiados!",
      description: `Operação ${dados.operacao} carregada com sucesso.`
    });
  };

  const buscarUltimaOperacao = async (tipoOperacao: string) => {
    try {
      const { data: operacoes, error } = await supabase
        .from('registro_operacoes')
        .select(`
          *,
          equipamentos (*),
          ajudantes (*),
          ausencias (*)
        `)
        .eq('op', tipoOperacao)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (operacoes && operacoes.length > 0) {
        setUltimaOperacao(operacoes[0]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar última operação:', error);
    }
  };

  const mostrarConfirmacaoCopiar = () => {
    if (ultimaOperacao) {
      setShowConfirmacao(true);
    } else {
      toast({
        title: "Atenção",
        description: "Não há operações anteriores para copiar.",
        variant: "destructive"
      });
    }
  };

  const copiarDadosOperacao = () => {
    if (!ultimaOperacao) return;

    setData(ultimaOperacao.data);
    setHoraInicial(ultimaOperacao.hora_inicial);
    setHoraFinal(ultimaOperacao.hora_final);
    setObservacao(ultimaOperacao.observacao);
    
    if (ultimaOperacao.carga) {
      setCarga(ultimaOperacao.carga);
    }

    if (selectedOp === 'NAVIO') {
      const novosEquipamentos = (ultimaOperacao.equipamentos || []).map((eq: any, index: number) => ({
        id: `temp-copied-${Date.now()}-${index}`,
        tag: eq.tag,
        motorista_operador: eq.motorista_operador
      }));
      setEquipamentosNavio(novosEquipamentos);
    } else {
      const gruposUnicos = [...new Set((ultimaOperacao.equipamentos || []).map((eq: any) => eq.grupo_operacao))];
      
      const novosGrupos: OperacaoGrupo[] = gruposUnicos.map((grupoNome, grupoIndex) => ({
        id: `grupo-copied-${Date.now()}-${grupoIndex}`,
        nome: grupoNome,
        equipamentos: (ultimaOperacao.equipamentos || [])
          .filter((eq: any) => eq.grupo_operacao === grupoNome)
          .map((eq: any, eqIndex: number) => ({
            id: `temp-copied-${Date.now()}-${grupoIndex}-${eqIndex}`,
            tag: eq.tag,
            motorista_operador: eq.motorista_operador
          }))
      }));
      
      setOperacaoGrupos(novosGrupos);
    }

    const novosAjudantes = (ultimaOperacao.ajudantes || []).map((aj: any, index: number) => ({
      id: `ajudante-copied-${Date.now()}-${index}`,
      nome: aj.nome,
      hora_inicial: aj.hora_inicial,
      hora_final: aj.hora_final,
      observacao: aj.observacao
    }));
    setAjudantes(novosAjudantes);

    const novasAusencias = (ultimaOperacao.ausencias || []).map((au: any, index: number) => ({
      id: `ausencia-copied-${Date.now()}-${index}`,
      nome: au.nome,
      justificado: au.justificado,
      obs: au.obs
    }));
    setAusencias(novasAusencias);

    toast({
      title: "Sucesso!",
      description: "Dados copiados com sucesso."
    });

    setShowConfirmacao(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOp) return;
    
    if (selectedOp === 'ALBRAS' && !carga) {
      toast({
        title: "Atenção",
        description: "Selecione o tipo de carga para a operação ALBRAS.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      let todosEquipamentos: Equipamento[] = [];
      
      if (selectedOp === 'NAVIO') {
        todosEquipamentos = equipamentosNavio.filter(eq => eq.tag.trim() !== '');
      } else {
        todosEquipamentos = operacaoGrupos.flatMap(grupo => 
          grupo.equipamentos.filter(eq => eq.tag.trim() !== '')
        );
      }

      const dadosOperacao: any = {
        op: selectedOp,
        data,
        hora_inicial: horaInicial,
        hora_final: horaFinal,
        observacao: observacao.toUpperCase(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (selectedOp === 'ALBRAS') {
        dadosOperacao.carga = carga;
      }

      if (selectedOp === 'NAVIO') {
        dadosOperacao.navio_id = selectedNavio?.id;
      }

      const { data: operacaoData, error: operacaoError } = await supabase
        .from('registro_operacoes')
        .insert(dadosOperacao)
        .select()
        .single();

      if (operacaoError) throw operacaoError;

      const operacaoId = operacaoData.id;

      if (todosEquipamentos.length > 0) {
        const equipamentosData = todosEquipamentos.map(eq => {
          let grupoOperacao = 'Operação Principal';
          
          if (selectedOp === 'NAVIO') {
            grupoOperacao = 'Operação Navio';
          } else {
            const grupo = operacaoGrupos.find(g => 
              g.equipamentos.some(e => e.id === eq.id)
            );
            grupoOperacao = grupo?.nome || 'Operação Principal';
          }
          
          return {
            registro_operacoes_id: operacaoId,
            tag: eq.tag.toUpperCase(),
            motorista_operador: eq.motorista_operador.toUpperCase(),
            local: selectedOp,
            grupo_operacao: grupoOperacao,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        const { error: equipError } = await supabase
          .from('equipamentos')
          .insert(equipamentosData);
        if (equipError) throw equipError;
      }

      if (ajudantes.length > 0) {
        const ajudantesData = ajudantes
          .filter(aj => aj.nome.trim() !== '')
          .map(aj => ({
            registro_operacoes_id: operacaoId,
            nome: aj.nome.toUpperCase(),
            hora_inicial: aj.hora_inicial,
            hora_final: aj.hora_final,
            local: selectedOp,
            observacao: aj.observacao.toUpperCase(),
            data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        if (ajudantesData.length > 0) {
          const { error: ajudError } = await supabase
            .from('ajudantes')
            .insert(ajudantesData);
          if (ajudError) throw ajudError;
        }
      }

      if (ausencias.length > 0) {
        const ausenciasData = ausencias
          .filter(au => au.nome.trim() !== '')
          .map(au => ({
            registro_operacoes_id: operacaoId,
            nome: au.nome.toUpperCase(),
            justificado: au.justificado,
            obs: au.obs.toUpperCase(),
            data,
            local: selectedOp,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        if (ausenciasData.length > 0) {
          const { error: ausError } = await supabase
            .from('ausencias')
            .insert(ausenciasData);
          if (ausError) throw ausError;
        }
      }

      toast({
        title: "Sucesso!",
        description: "Operação registrada com sucesso."
      });
      navigate('/relatorio-transporte');
    } catch (error: any) {
      console.error('Erro ao salvar operação:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar a operação. Detalhes: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const updateEquipamentoNavio = (id: string, field: string, value: string) => {
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

  const updateEquipamentoGrupo = (grupoId: string, equipamentoId: string, field: string, value: string) => {
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
      hora_inicial: '',
      hora_final: '',
      observacao: ''
    }]);
  };

  const updateAjudante = (id: string, field: string, value: string) => {
    setAjudantes(ajudantes.map(aj =>
      aj.id === id ? { ...aj, [field]: ['nome', 'observacao'].includes(field) ? value.toUpperCase() : value } : aj
    ));
  };

  const removeAjudante = (id: string) => {
    setAjudantes(ajudantes.filter(aj => aj.id !== id));
  };

  const addAusencia = () => {
    setAusencias([...ausencias, {
      id: `temp-${Date.now()}`,
      nome: '',
      justificado: false,
      obs: ''
    }]);
  };

  const updateAusencia = (id: string, field: string, value: string | boolean) => {
    setAusencias(ausencias.map(au =>
      au.id === id ? {
        ...au,
        [field]: typeof value === 'string' && ['nome', 'obs'].includes(field) ? value.toUpperCase() : value
      } : au
    ));
  };

  const removeAusencia = (id: string) => {
    setAusencias(ausencias.filter(au => au.id !== id));
  };

  const getOpIcon = (op: string) => {
    switch (op) {
      case 'HYDRO': return <Factory className="h-6 w-6" />;
      case 'ALBRAS': return <Warehouse className="h-6 w-6" />;
      case 'SANTOS BRASIL': return <Building className="h-6 w-6" />;
      case 'NAVIO': return <Ship className="h-6 w-6" />;
      default: return <Factory className="h-6 w-6" />;
    }
  };

  const getTituloOperacao = () => {
    if (selectedOp === 'NAVIO' && selectedNavio) {
      return `${selectedNavio.nome_navio} - ${selectedNavio.carga}`;
    }
    if (selectedOp === 'ALBRAS' && carga) {
      return `${selectedOp} - ${carga}`;
    }
    return selectedOp;
  };

  if (!selectedOp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 relative">
      {showConfirmacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <p className="text-lg font-medium mb-2">Deseja copiar os dados da última operação?</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copiarDadosOperacao}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Sim
                </Button>
                <Button
                  onClick={() => setShowConfirmacao(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Não
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-blue-800 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/novo-lancamento')}
            className="text-white hover:bg-white/20 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">
            {selectedOp === 'NAVIO' ? 'Operação Navio' : `Operação ${selectedOp}`}
            {dadosCopiados && (
              <span className="ml-2 text-sm bg-green-600 px-2 py-1 rounded">
                📋 Dados Copiados
              </span>
            )}
          </h1>
        </div>
        
        {ultimaOperacao && (
          <Button
            onClick={mostrarConfirmacaoCopiar}
            variant="outline"
            className="text-white border-white hover:bg-white/20"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Última Operação
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getOpIcon(selectedOp)}
              {getTituloOperacao()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label>DATA *</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            {selectedOp === 'ALBRAS' && (
              <div>
                <Label>Tipo de Carga *</Label>
                <Select value={carga} onValueChange={setCarga} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de carga" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesCarga.map((cargaItem) => (
                      <SelectItem key={cargaItem} value={cargaItem}>
                        {cargaItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione o tipo de carga para a operação ALBRAS
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div>
              <Label>Observação do Turno</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Digite as observações do turno..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {selectedOp === 'NAVIO' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Equipamentos do Navio</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => addEquipamentoNavio(1)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" /> +1
                  </Button>
                  <Button
                    type="button"
                    onClick={() => addEquipamentoNavio(10)}
                    variant="secondary"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" /> +10
                  </Button>
                </div>
              </div>
              {equipamentosNavio.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {equipamentosNavio.length} equipamento(s) carregado(s)
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {equipamentosNavio.map(equipamento => (
                  <div key={equipamento.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Input
                      placeholder="TAG do equipamento"
                      value={equipamento.tag}
                      onChange={e => updateEquipamentoNavio(equipamento.id, 'tag', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="OPERADOR/MOTORISTA"
                      value={equipamento.motorista_operador}
                      onChange={e => updateEquipamentoNavio(equipamento.id, 'motorista_operador', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEquipamentoNavio(equipamento.id)}
                      type="button"
                      className="shrink-0"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              {equipamentosNavio.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum equipamento adicionado. Clique em "+1" ou "+10" para adicionar.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {['HYDRO', 'ALBRAS', 'SANTOS BRASIL'].includes(selectedOp) && (
          <div className="space-y-4">
            {operacaoGrupos.map(grupo => (
              <Card key={grupo.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Input
                      className="text-lg font-bold border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
                      value={grupo.nome}
                      onChange={e => updateOperacaoGrupo(grupo.id, e.target.value)}
                      placeholder="Nome da operação..."
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
                  {grupo.equipamentos.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {grupo.equipamentos.length} equipamento(s) neste grupo
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {grupo.equipamentos.map(equipamento => (
                      <div key={equipamento.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Input
                          placeholder="TAG do equipamento"
                          value={equipamento.tag}
                          onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'tag', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="OPERADOR"
                          value={equipamento.motorista_operador}
                          onChange={e => updateEquipamentoGrupo(grupo.id, equipamento.id, 'motorista_operador', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEquipamentoGrupo(grupo.id, equipamento.id)}
                          type="button"
                          className="shrink-0"
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
              <Plus className="h-4 w-4 mr-2" />
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
            {ajudantes.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {ajudantes.length} ajudante(s) carregado(s)
              </p>
            )}
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
                  className="absolute top-2 right-2 h-7 w-7"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
                <div className="space-y-3">
                  <div>
                    <Label>Nome do Ajudante</Label>
                    <Input
                      value={ajudante.nome}
                      onChange={(e) => updateAjudante(ajudante.id, 'nome', e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Horário Início</Label>
                      <Input
                        type="time"
                        value={ajudante.hora_inicial}
                        onChange={(e) => updateAjudante(ajudante.id, 'hora_inicial', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Horário Fim</Label>
                      <Input
                        type="time"
                        value={ajudante.hora_final}
                        onChange={(e) => updateAjudante(ajudante.id, 'hora_final', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
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
            {ausencias.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {ausencias.length} ausência(s) carregada(s)
              </p>
            )}
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
                  className="absolute top-2 right-2 h-7 w-7"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
                <div className="space-y-3">
                  <div>
                    <Label>Nome do Ausente</Label>
                    <Input
                      value={ausencia.nome}
                      onChange={(e) => updateAusencia(ausencia.id, 'nome', e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Observação/Motivo</Label>
                    <Textarea
                      value={ausencia.obs}
                      onChange={(e) => updateAusencia(ausencia.id, 'obs', e.target.value)}
                      placeholder="Motivo da ausência..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ausencia.justificado}
                      onChange={(e) => updateAusencia(ausencia.id, 'justificado', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label className="text-sm font-medium">Ausência Justificada</Label>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 bg-gradient-to-br from-blue-900 to-blue-700 p-4 -mx-4 mt-6 border-t border-blue-600">
          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando Operação...
              </div>
            ) : (
              `Salvar Operação - ${getTituloOperacao()}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormularioOperacao;