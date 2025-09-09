import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Equipamento {
  id: string;
  local: string;
  tag: string;
  motorista_operador: string;
  carga: string;
  horas_operando?: number;
}

const Operacao = () => {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedOp, setSelectedOp] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicial, setHoraInicial] = useState('');
  const [horaFinal, setHoraFinal] = useState('');
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [navios, setNavios] = useState([]);
  const [showNavioSelect, setShowNavioSelect] = useState(false);
  const [selectedNavio, setSelectedNavio] = useState('');
  
  const getTipoLabel = () => {
    switch (tipo) {
      case 'hidrato-carvao-bauxita':
        return 'HIDRATO, CARVÃO, BAUXITA';
      case 'coque-piche-fluoreto':
        return 'COQUE, PICHE, FLUORETO';
      case 'lingote':
        return 'LINGOTE';
      case 'carga-geral-tarugo':
        return 'CARGA GERAL, TARUGO';
      default:
        return 'OPERAÇÃO';
    }
  };

  useEffect(() => {
    if (tipo === 'hidrato-carvao-bauxita') {
      fetchNavios();
    }
  }, [tipo]);

  const fetchNavios = async () => {
    try {
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .eq('concluido', false);

      if (error) throw error;
      setNavios(data || []);
    } catch (error) {
      console.error('Error fetching navios:', error);
    }
  };

  const handleOpSelect = (op: string) => {
    setSelectedOp(op);
    if (op === 'NAVIO') {
      setShowNavioSelect(true);
    } else {
      setShowNavioSelect(false);
      setSelectedNavio('');
    }
  };

  const addEquipamento = () => {
    const newEquipamento: Equipamento = {
      id: Date.now().toString(),
      local: '',
      tag: '',
      motorista_operador: '',
      carga: selectedOp === 'HYDRO' ? 'N/A' : ''
    };
    setEquipamentos([...equipamentos, newEquipamento]);
  };

  const updateEquipamento = (id: string, field: keyof Equipamento, value: string) => {
    setEquipamentos(equipamentos.map(eq => 
      eq.id === id ? { ...eq, [field]: value } : eq
    ));
  };

  const removeEquipamento = (id: string) => {
    setEquipamentos(equipamentos.filter(eq => eq.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // Validate required fields
      if (!selectedOp || !data || !horaInicial) {
        toast({
          title: "Erro",
          description: "Preencha os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Validate equipamentos
      for (const eq of equipamentos) {
        if (!eq.tag || !eq.local) {
          toast({
            title: "Erro",
            description: "TAG e Local são obrigatórios para todos os equipamentos",
            variant: "destructive"
          });
          return;
        }
      }

      // Create registro_operacoes
      const { data: operacao, error: operacaoError } = await supabase
        .from('registro_operacoes')
        .insert({
          op: selectedOp,
          data,
          hora_inicial: horaInicial,
          hora_final: horaFinal || null,
          user_id: user.id
        })
        .select()
        .single();

      if (operacaoError) throw operacaoError;

      // Create equipamentos
      if (equipamentos.length > 0) {
        const equipamentosData = equipamentos.map(eq => ({
          registro_operacoes_id: operacao.id,
          local: eq.local,
          tag: eq.tag,
          motorista_operador: eq.motorista_operador,
          carga: eq.carga,
          horas_operando: eq.horas_operando
        }));

        const { error: equipamentosError } = await supabase
          .from('equipamentos')
          .insert(equipamentosData);

        if (equipamentosError) throw equipamentosError;
      }

      toast({
        title: "Sucesso!",
        description: "Operação salva com sucesso"
      });

      navigate('/relatorio-transporte');

    } catch (error) {
      console.error('Error saving operation:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar operação",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex items-center p-4 text-white">
        <Button
          variant="ghost"
          onClick={() => navigate('/novo-lancamento')}
          className="text-white hover:bg-white/20 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">{getTipoLabel()}</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Operation Type Selection */}
        {tipo === 'hidrato-carvao-bauxita' && !selectedOp && (
          <div className="space-y-4">
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <Button
                  onClick={() => handleOpSelect('HYDRO')}
                  className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                  style={{ boxShadow: 'var(--shadow-button)' }}
                >
                  HYDRO (N/A)
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <Button
                  onClick={() => handleOpSelect('NAVIO')}
                  className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                  style={{ boxShadow: 'var(--shadow-button)' }}
                >
                  NAVIO
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navio Selection */}
        {showNavioSelect && (
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Selecionar Navio</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedNavio} onValueChange={setSelectedNavio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um navio" />
                </SelectTrigger>
                <SelectContent>
                  {navios.map((navio: any) => (
                    <SelectItem key={navio.id} value={navio.id}>
                      {navio.nome_navio} - {navio.carga}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Operation Form */}
        {(selectedOp || tipo !== 'hidrato-carvao-bauxita') && (
          <>
            {/* Operation Data Header */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Dados da Operação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="data">DATA</Label>
                    <Input
                      id="data"
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="horaInicial">HORA INICIAL</Label>
                    <Input
                      id="horaInicial"
                      type="time"
                      value={horaInicial}
                      onChange={(e) => setHoraInicial(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="horaFinal">HORA FINAL</Label>
                    <Input
                      id="horaFinal"
                      type="time"
                      value={horaFinal}
                      onChange={(e) => setHoraFinal(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Operação 1</CardTitle>
                  <Button
                    onClick={addEquipamento}
                    size="sm"
                    className="bg-secondary hover:bg-secondary/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    + Equipamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>LOCAL DE OPERAÇÃO</Label>
                  <Input placeholder="Digite o local de operação" />
                </div>

                {equipamentos.map((equipamento) => (
                  <Card key={equipamento.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Equipamento</h4>
                        <Button
                          onClick={() => removeEquipamento(equipamento.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>TAG *</Label>
                          <Input
                            value={equipamento.tag}
                            onChange={(e) => updateEquipamento(equipamento.id, 'tag', e.target.value)}
                            placeholder="TAG obrigatório"
                          />
                        </div>
                        <div>
                          <Label>OPERADOR</Label>
                          <Input
                            value={equipamento.motorista_operador}
                            onChange={(e) => updateEquipamento(equipamento.id, 'motorista_operador', e.target.value)}
                            placeholder="Nome do operador"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 flex gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addEquipamento}
                          className="flex-1"
                        >
                          + Equipamento
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          + Adicionar 10
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {equipamentos.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum equipamento adicionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              Guardar Operação
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Operacao;