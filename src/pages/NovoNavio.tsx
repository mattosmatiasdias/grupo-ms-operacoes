// src/pages/NovoNavio.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, Ship, Calendar, Package, Anchor, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const NovoNavio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_navio: '',
    carga: '',
    berco: '',
    quantidade_prevista: '',
    cbs_total: '',
    inicio_operacao: '',
    final_operacao: '',
    media_cb: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_navio || !user) {
      toast({ title: "Erro", description: "O nome do navio é obrigatório.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('navios').insert({
        nome_navio: formData.nome_navio,
        carga: formData.carga || null,
        berco: formData.berco || null,
        quantidade_prevista: formData.quantidade_prevista ? parseFloat(formData.quantidade_prevista) : null,
        cbs_total: formData.cbs_total ? parseInt(formData.cbs_total) : null,
        inicio_operacao: formData.inicio_operacao || null,
        final_operacao: formData.final_operacao || null,
        media_cb: formData.media_cb ? parseFloat(formData.media_cb) : null,
        user_id: user.id,
        concluido: false,
      });
      if (error) throw error;

      // Salvar equipamentos associados
      if (equipamentosNavio.length > 0) {
        const equipamentosParaSalvar = equipamentosNavio.filter(eq => eq.tag).map(eq => ({
          navio_id: null,
          local: 'NAVIO',
          tag: eq.tag,
          motorista_operador: eq.motorista_operador,
          grupo_operacao: 'Operação Navio',
          hora_inicial: eq.hora_inicial || null,
          hora_final: eq.hora_final || null,
        }));
        await supabase.from('equipamentos').insert(equipamentosParaSalvar);
      }

      toast({ title: "Sucesso!", description: "Navio/Viagem registrada." });
      navigate('/navios');
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar a viagem.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Equipamentos ---
  const [equipamentosNavio, setEquipamentosNavio] = useState<Array<{id: string, tag: string, motorista_operador: string, hora_inicial?: string, hora_final?: string}>>([]);

  const addEquipamentoNavio = (count = 1) => {
    const n = [];
    for (let i = 0; i < count; i++) {
      n.push({
        id: `${Date.now()}-${i}`,
        tag: '',
        motorista_operador: '',
        hora_inicial: '',
        hora_final: '',
      });
    }
    setEquipamentosNavio([...equipamentosNavio, ...n]);
  };

  const updateEquipamentoNavio = (id: string, field: keyof typeof equipamentosNavio[0], value: string) => {
    setEquipamentosNavio(equipamentosNavio.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  const removeEquipamentoNavio = (id: string) => {
    setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
      <div className="bg-blue-800/50 backdrop-blur-sm border-b border-blue-600/30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/navios')} 
                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Cadastrar Novo Navio/Viagem</h1>
                <p className="text-blue-200 text-sm">
                  Preencha os dados da nova viagem
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Dados da Viagem */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <Ship className="h-5 w-5" />
                <span>Dados da Viagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="nome_navio" className="text-white flex items-center space-x-2">
                    <Ship className="h-4 w-4 text-blue-300" />
                    <span>Nome do Navio *</span>
                  </Label>
                  <Input 
                    id="nome_navio" 
                    value={formData.nome_navio} 
                    onChange={handleChange} 
                    required 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="Ex: Navio Cargueiro A"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="carga" className="text-white flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-300" />
                    <span>Carga</span>
                  </Label>
                  <Input 
                    id="carga" 
                    value={formData.carga} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="Tipo de carga"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="berco" className="text-white flex items-center space-x-2">
                    <Anchor className="h-4 w-4 text-blue-300" />
                    <span>Berço</span>
                  </Label>
                  <Input 
                    id="berco" 
                    value={formData.berco} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="Número do berço"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="quantidade_prevista" className="text-white">
                    Quantidade Prevista
                  </Label>
                  <Input 
                    id="quantidade_prevista" 
                    type="number" 
                    step="0.01" 
                    value={formData.quantidade_prevista} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="cbs_total" className="text-white">
                    Total de CBs
                  </Label>
                  <Input 
                    id="cbs_total" 
                    type="number" 
                    value={formData.cbs_total} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="media_cb" className="text-white flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-blue-300" />
                    <span>Média por CB</span>
                  </Label>
                  <Input 
                    id="media_cb" 
                    type="number" 
                    step="0.0001" 
                    value={formData.media_cb} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    placeholder="0.0000"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="inicio_operacao" className="text-white flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>Início da Operação</span>
                  </Label>
                  <Input 
                    id="inicio_operacao" 
                    type="datetime-local" 
                    value={formData.inicio_operacao} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="final_operacao" className="text-white flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>Final da Operação</span>
                  </Label>
                  <Input 
                    id="final_operacao" 
                    type="datetime-local" 
                    value={formData.final_operacao} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-200/30">
                <Button 
                  type="submit" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-semibold"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Viagem'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos Associados */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Equipamentos Associados</span>
                <span className="text-blue-300 text-sm font-normal">
                  ({equipamentosNavio.length} equipamentos)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {equipamentosNavio.map((eq, index) => (
                  <div key={eq.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-blue-200/20">
                    <div className="text-blue-300 text-sm font-medium w-8">
                      #{index + 1}
                    </div>
                    <Input 
                      placeholder="Tag (Ex: CB-123, EST-5)" 
                      value={eq.tag} 
                      onChange={(e) => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} 
                      className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    />
                    <Input 
                      placeholder="Operador/Motorista" 
                      value={eq.motorista_operador} 
                      onChange={(e) => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} 
                      className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                    />
                    <div className="flex items-center gap-2">
                      <Input 
                        type="time" 
                        placeholder="Início" 
                        value={eq.hora_inicial || ''} 
                        onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_inicial', e.target.value)} 
                        className="w-28 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                      <span className="text-blue-300">-</span>
                      <Input 
                        type="time" 
                        placeholder="Fim" 
                        value={eq.hora_final || ''} 
                        onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_final', e.target.value)} 
                        className="w-28 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeEquipamentoNavio(eq.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {equipamentosNavio.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-blue-300/30 rounded-lg">
                    <Package className="h-12 w-12 text-blue-300/50 mx-auto mb-3" />
                    <p className="text-blue-300 mb-2">Nenhum equipamento adicionado</p>
                    <p className="text-blue-300/70 text-sm">Adicione equipamentos que atuarão nesta viagem</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-blue-200/30">
                <Button 
                  type="button" 
                  onClick={() => addEquipamentoNavio(1)} 
                  className="flex-1 border-blue-300 text-white hover:bg-white/20 bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  +1 Equipamento
                </Button>
                <Button 
                  type="button" 
                  onClick={() => addEquipamentoNavio(10)} 
                  variant="outline"
                  className="flex-1 border-blue-300 text-white hover:bg-white/20 bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  +10 Equipamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default NovoNavio;