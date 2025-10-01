import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X, Factory, Warehouse, Building, Ship } from 'lucide-react';
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
  
  const [equipamentosNavio, setEquipamentosNavio] = useState<Equipamento[]>([]);
  const [operacaoGrupos, setOperacaoGrupos] = useState<OperacaoGrupo[]>([]);
  
  const [ajudantes, setAjudantes] = useState<Array<{id: string, nome: string, hora_inicial: string, hora_final: string, observacao: string}>>([]);
  const [ausencias, setAusencias] = useState<Array<{id: string, nome: string, justificado: boolean, obs: string}>>([]);

  useEffect(() => {
    if (location.state) {
      if (location.state.tipo === 'OPERACAO') {
        setSelectedOp(location.state.operacao);
      } else if (location.state.tipo === 'NAVIO') {
        setSelectedOp('NAVIO');
        setSelectedNavio(location.state.navio);
      }
    } else {
      navigate('/novo-lancamento');
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOp) return;
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

      const { data: operacaoData, error: operacaoError } = await supabase
        .from('registro_operacoes')
        .insert({
          op: selectedOp,
          data,
          hora_inicial: horaInicial,
          hora_final: horaFinal,
          observacao: observacao.toUpperCase(),
          navio_id: selectedOp === 'NAVIO' ? selectedNavio?.id : null,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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
      <div className="bg-blue-800 p-4 flex items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/novo-lancamento')}
          className="text-white hover:bg-white/20 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-white">
          {selectedOp === 'NAVIO' ? 'Operação Navio' : `Operação ${selectedOp}`}
        </h1>
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
              <Label>DATA</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
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