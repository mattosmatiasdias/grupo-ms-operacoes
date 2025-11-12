// src/pages/EditarNavio.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ProducaoDia {
  data: string;
  total_tons: number;
}

const EditarNavio = () => {
  const { id: navioId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [producaoPorDia, setProducaoPorDia] = useState<ProducaoDia[]>([]);

  const fetchNavio = useCallback(async () => {
    if (!navioId) return;
    setLoading(true);
    
    try {
      // Buscar dados do navio
      const { data: navioData, error: navioError } = await supabase.from('navios').select('*').eq('id', navioId).single();
      if (navioError || !navioData) {
        toast({ title: "Erro", description: "Navio não encontrado.", variant: "destructive" });
        navigate('/navios');
        return;
      }

      navioData.inicio_operacao = navioData.inicio_operacao ? new Date(navioData.inicio_operacao).toISOString().slice(0, 16) : '';
      navioData.final_operacao = navioData.final_operacao ? new Date(navioData.final_operacao).toISOString().slice(0, 16) : '';
      setFormData(navioData);

      // Buscar produção por dia
      const { data: producaoData, error: producaoError } = await supabase
        .from('registros_producao')
        .select('data, tons_t1, tons_t2, tons_t3, tons_t4')
        .eq('navio_id', navioId)
        .order('data', { ascending: true });

      if (!producaoError && producaoData) {
        // Agrupar produção por dia
        const producaoAgrupada = producaoData.reduce((acc: {[key: string]: number}, registro) => {
          const data = registro.data;
          const totalDia = (registro.tons_t1 || 0) + (registro.tons_t2 || 0) + (registro.tons_t3 || 0) + (registro.tons_t4 || 0);
          
          if (!acc[data]) {
            acc[data] = 0;
          }
          acc[data] += totalDia;
          return acc;
        }, {});

        // Converter para array e formatar
        const producaoArray = Object.entries(producaoAgrupada).map(([data, total_tons]) => ({
          data: new Date(data).toLocaleDateString('pt-BR'),
          total_tons: Number(total_tons.toFixed(3))
        }));

        setProducaoPorDia(producaoArray);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [navioId, navigate, toast]);

  useEffect(() => {
    fetchNavio();
  }, [fetchNavio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, concluido: checked }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navioId) return;
    setIsSaving(true);
    try {
      const { id, created_at, updated_at, user_id, ...updateData } = formData;
      if (updateData.inicio_operacao === '') updateData.inicio_operacao = null;
      if (updateData.final_operacao === '') updateData.final_operacao = null;

      const { error } = await supabase.from('navios').update(updateData).eq('id', navioId);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Dados do navio atualizados." });
      navigate('/navios');
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast({ title: "Erro", description: (error as Error).message || "Não foi possível atualizar os dados.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular totais para o gráfico
  const totalGeral = producaoPorDia.reduce((sum, dia) => sum + dia.total_tons, 0);
  const maxProducao = Math.max(...producaoPorDia.map(dia => dia.total_tons), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="text-blue-200 mt-2">Carregando dados do navio...</p>
        </div>
      </div>
    );
  }

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
                Voltar para Navios
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Viagem</h1>
                <p className="text-blue-200 text-sm">
                  {formData.nome_navio || 'Carregando...'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-blue-200 text-sm">Total Produzido</div>
              <div className="text-white font-bold">
                {totalGeral.toFixed(3)} tons
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSave}>
          {/* Card Dados da Viagem */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 mb-6">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white">Dados da Viagem</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_navio" className="text-white text-sm">Nome do Navio*</Label>
                  <Input 
                    id="nome_navio" 
                    value={formData.nome_navio || ''} 
                    onChange={handleChange} 
                    required 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carga" className="text-white text-sm">Carga</Label>
                  <Input 
                    id="carga" 
                    value={formData.carga || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="berco" className="text-white text-sm">Berço</Label>
                  <Input 
                    id="berco" 
                    value={formData.berco || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade_prevista" className="text-white text-sm">Quantidade Prevista</Label>
                  <Input 
                    id="quantidade_prevista" 
                    type="number" 
                    step="0.01" 
                    value={formData.quantidade_prevista || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cbs_total" className="text-white text-sm">Total de CBs</Label>
                  <Input 
                    id="cbs_total" 
                    type="number" 
                    value={formData.cbs_total || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media_cb" className="text-white text-sm">Média por CB</Label>
                  <Input 
                    id="media_cb" 
                    type="number" 
                    step="0.0001" 
                    value={formData.media_cb || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inicio_operacao" className="text-white text-sm">Início da Operação</Label>
                  <Input 
                    id="inicio_operacao" 
                    type="datetime-local" 
                    value={formData.inicio_operacao || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_operacao" className="text-white text-sm">Final da Operação</Label>
                  <Input 
                    id="final_operacao" 
                    type="datetime-local" 
                    value={formData.final_operacao || ''} 
                    onChange={handleChange} 
                    className="bg-white/5 border-blue-300/30 text-white"
                  />
                </div>
                <div className="space-y-2 flex items-center">
                  <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-blue-300/30">
                    <Switch 
                      id="concluido" 
                      checked={formData.concluido} 
                      onCheckedChange={handleSwitchChange} 
                    />
                    <Label htmlFor="concluido" className="text-white text-sm cursor-pointer">
                      Marcado como Concluído
                    </Label>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-semibold rounded-lg h-12"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando Alterações...
                    </>
                  ) : (
                    'Salvar Alterações da Viagem'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Produção por Dia */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Produção por Dia</span>
                <span className="text-blue-300 text-sm font-normal">
                  {producaoPorDia.length} dia(s) com registro
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {producaoPorDia.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-blue-300/50 mx-auto mb-4" />
                  <p className="text-white text-lg mb-2">Nenhum dado de produção</p>
                  <p className="text-blue-200">
                    Não há registros de produção para este navio
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Gráfico de Barras */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-semibold">Toneladas por Dia</h3>
                      <div className="text-blue-200 text-sm">
                        Máximo: {maxProducao.toFixed(3)} tons
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {producaoPorDia.map((dia, index) => {
                        const porcentagem = maxProducao > 0 ? (dia.total_tons / maxProducao) * 100 : 0;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white font-medium">{dia.data}</span>
                              <span className="text-blue-200">{dia.total_tons.toFixed(3)} tons</span>
                            </div>
                            <div className="w-full bg-blue-900/50 rounded-full h-4">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-orange-600 h-4 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${porcentagem}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tabela de Dados */}
                  <div className="border border-blue-300/30 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 bg-blue-600/50 border-b border-blue-400/50">
                      <div className="col-span-8 p-3 text-white font-semibold text-sm">Data</div>
                      <div className="col-span-4 p-3 text-white font-semibold text-sm text-right">Toneladas</div>
                    </div>
                    {producaoPorDia.map((dia, index) => (
                      <div 
                        key={index} 
                        className={`grid grid-cols-12 ${
                          index < producaoPorDia.length - 1 ? 'border-b border-blue-300/20' : ''
                        } ${index % 2 === 0 ? 'bg-white/5' : 'bg-white/3'}`}
                      >
                        <div className="col-span-8 p-3 text-white text-sm">{dia.data}</div>
                        <div className="col-span-4 p-3 text-white text-sm text-right font-mono">
                          {dia.total_tons.toFixed(3)}
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="grid grid-cols-12 bg-blue-600/30 border-t border-blue-400/50">
                      <div className="col-span-8 p-3 text-white font-semibold text-sm">Total Geral</div>
                      <div className="col-span-4 p-3 text-white font-semibold text-sm text-right font-mono">
                        {totalGeral.toFixed(3)} tons
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default EditarNavio;