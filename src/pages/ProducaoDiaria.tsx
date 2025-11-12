// src/pages/ProducaoDiaria.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, Ship, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RegistroProducao {
  id?: string;
  porao: string;
  tons_t1?: number; vols_t1?: number;
  tons_t2?: number; vols_t2?: number;
  tons_t3?: number; vols_t3?: number;
  tons_t4?: number; vols_t4?: number;
  data: string;
}

const ProducaoDiaria = () => {
  const { id: navioId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [navio, setNavio] = useState<{ nome_navio: string } | null>(null);
  const [registros, setRegistros] = useState<RegistroProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTodosRegistros = useCallback(async () => {
    setLoading(true);
    try {
      if (!navioId) return;
      
      const { data: navioData, error: navioError } = await supabase.from('navios').select('nome_navio').eq('id', navioId).single();
      if (navioError) throw navioError;
      setNavio(navioData);
      
      const { data: registrosData, error } = await supabase
        .from('registros_producao')
        .select('*')
        .eq('navio_id', navioId)
        .order('data', { ascending: false })
        .order('porao');
      
      if (error) throw error;
      
      if (registrosData && registrosData.length > 0) {
        console.log('Todos os dados carregados:', registrosData);
        setRegistros(registrosData);
      } else {
        console.log('Nenhum dado encontrado, criando linha padrão');
        const dataAtual = new Date().toISOString().split('T')[0];
        setRegistros([{ 
          id: `new-${Date.now()}`, 
          porao: '#01', 
          tons_t1: 0, vols_t1: 0, 
          tons_t2: 0, vols_t2: 0, 
          tons_t3: 0, vols_t3: 0, 
          tons_t4: 0, vols_t4: 0,
          data: dataAtual
        }]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [navioId, toast]);

  useEffect(() => {
    fetchTodosRegistros();
  }, [fetchTodosRegistros]);

  const handleRegistroChange = (id: string, field: keyof RegistroProducao, value: string) => {
    if (field === 'porao') {
      setRegistros(prev => prev.map(r => r.id === id ? { ...r, [field]: value.toUpperCase() } : r));
    } else if (field === 'data') {
      setRegistros(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    } else {
      const numValue = value === '' ? 0 : Number(value);
      setRegistros(prev => prev.map(r => r.id === id ? { ...r, [field]: numValue } : r));
    }
  };

  const addLinha = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    const nextPoraoNumber = registros.length + 1;
    setRegistros(prev => [...prev, { 
      id: `new-${Date.now()}`, 
      porao: `#${String(nextPoraoNumber).padStart(2, '0')}`, 
      tons_t1: 0, vols_t1: 0, 
      tons_t2: 0, vols_t2: 0, 
      tons_t3: 0, vols_t3: 0, 
      tons_t4: 0, vols_t4: 0,
      data: dataAtual
    }]);
  };

  const removeLinha = (id: string) => {
    if (registros.length > 1) {
      setRegistros(prev => prev.filter(r => r.id !== id));
    } else {
      toast({ title: "Aviso", description: "É necessário manter pelo menos uma linha.", variant: "default" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !navioId) return;
    setIsSaving(true);
    
    try {
      // Separar registros existentes e novos
      const registrosExistentes = registros.filter(r => r.id && !r.id.startsWith('new-'));
      const registrosNovos = registros.filter(r => !r.id || r.id.startsWith('new-'));
      
      console.log('Registros existentes:', registrosExistentes);
      console.log('Registros novos:', registrosNovos);

      // Atualizar registros existentes
      if (registrosExistentes.length > 0) {
        const updates = registrosExistentes.map(registro => ({
          id: registro.id,
          porao: registro.porao,
          tons_t1: registro.tons_t1 || 0,
          vols_t1: registro.vols_t1 || 0,
          tons_t2: registro.tons_t2 || 0,
          vols_t2: registro.vols_t2 || 0,
          tons_t3: registro.tons_t3 || 0,
          vols_t3: registro.vols_t3 || 0,
          tons_t4: registro.tons_t4 || 0,
          vols_t4: registro.vols_t4 || 0,
          data: registro.data,
          navio_id: navioId,
          user_id: user.id,
        }));

        const { error: updateError } = await supabase
          .from('registros_producao')
          .upsert(updates);

        if (updateError) {
          console.error('Erro ao atualizar:', updateError);
          throw updateError;
        }
      }

      // Inserir novos registros
      if (registrosNovos.length > 0) {
        const inserts = registrosNovos.map(registro => ({
          porao: registro.porao,
          tons_t1: registro.tons_t1 || 0,
          vols_t1: registro.vols_t1 || 0,
          tons_t2: registro.tons_t2 || 0,
          vols_t2: registro.vols_t2 || 0,
          tons_t3: registro.tons_t3 || 0,
          vols_t3: registro.vols_t3 || 0,
          tons_t4: registro.tons_t4 || 0,
          vols_t4: registro.vols_t4 || 0,
          data: registro.data,
          navio_id: navioId,
          user_id: user.id,
        }));

        const { error: insertError } = await supabase
          .from('registros_producao')
          .insert(inserts);

        if (insertError) {
          console.error('Erro ao inserir:', insertError);
          throw insertError;
        }
      }

      toast({ 
        title: "Sucesso!", 
        description: "Todos os registros foram salvos com sucesso." 
      });
      
      // Recarregar os dados para obter os IDs atualizados
      await fetchTodosRegistros();
      
    } catch (error: any) {
      console.error('Erro completo ao salvar:', error);
      toast({ 
        title: "Erro ao salvar", 
        description: error.message || "Não foi possível salvar os dados.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const turnos = [
    { id: 1, label: "07h às 13h", shortLabel: "07-13", tonsKey: "tons_t1", volsKey: "vols_t1" },
    { id: 2, label: "13h às 19h", shortLabel: "13-19", tonsKey: "tons_t2", volsKey: "vols_t2" },
    { id: 3, label: "19h às 01h", shortLabel: "19-01", tonsKey: "tons_t3", volsKey: "vols_t3" },
    { id: 4, label: "01h às 07h", shortLabel: "01-07", tonsKey: "tons_t4", volsKey: "vols_t4" },
  ];

  // Calcular totais
  const totais = registros.reduce((acc, registro) => ({
    tons: acc.tons + (registro.tons_t1 || 0) + (registro.tons_t2 || 0) + (registro.tons_t3 || 0) + (registro.tons_t4 || 0),
    vols: acc.vols + (registro.vols_t1 || 0) + (registro.vols_t2 || 0) + (registro.vols_t3 || 0) + (registro.vols_t4 || 0),
  }), { tons: 0, vols: 0 });

  // Calcular totais por turno
  const totaisTurnos = turnos.map(turno => ({
    tons: registros.reduce((sum, registro) => sum + (registro[turno.tonsKey as keyof RegistroProducao] as number || 0), 0),
    vols: registros.reduce((sum, registro) => sum + (registro[turno.volsKey as keyof RegistroProducao] as number || 0), 0),
  }));

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
                <h1 className="text-2xl font-bold text-white">Produção - Todos os Registros</h1>
                <p className="text-blue-200 text-sm">
                  {navio?.nome_navio || 'Carregando...'} • {registros.length} registros
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-blue-200 text-sm">Total Geral</div>
                <div className="text-white font-bold">
                  {totais.tons.toFixed(3)} tons • {totais.vols.toFixed(3)} vols
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSave}>
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Registro de Produção</span>
                <span className="text-blue-300 text-sm font-normal">
                  {registros.length} linha(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin"></div>
                  </div>
                  <p className="text-blue-200 mt-2">Carregando registros...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cabeçalho da Tabela */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-blue-600/50 rounded-lg">
                    <div className="col-span-2 text-white font-semibold text-sm flex items-center">
                      Data e Porão
                    </div>
                    {turnos.map((turno) => (
                      <div key={turno.id} className="col-span-2 text-center text-white font-semibold text-sm">
                        <div>{turno.label}</div>
                        <div className="text-blue-200 text-xs font-normal mt-1">{turno.shortLabel}</div>
                      </div>
                    ))}
                    <div className="col-span-2 text-center text-white font-semibold text-sm">TOTAL 24 horas</div>
                  </div>

                  {/* Linhas dos Porões */}
                  {registros.map(registro => (
                    <div key={registro.id} className="grid grid-cols-12 gap-2 items-center p-4 bg-white/5 rounded-lg border border-blue-200/20">
                      {/* Data e Porão */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Label className="text-white text-xs block mb-1">Data</Label>
                            <Input 
                              type="date" 
                              value={registro.data} 
                              onChange={(e) => handleRegistroChange(registro.id!, 'data', e.target.value)}
                              className="bg-white/5 border-blue-300/30 text-white text-sm h-9 rounded-none mb-2"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-white text-xs block mb-1">Porão</Label>
                            <div className="flex items-center space-x-2">
                              <Input 
                                value={registro.porao} 
                                onChange={(e) => handleRegistroChange(registro.id!, 'porao', e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white w-20 font-mono text-center h-9 rounded-none"
                              />
                              {registros.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeLinha(registro.id!)}
                                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-none"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Turnos */}
                      {turnos.map(turno => (
                        <div key={turno.id} className="col-span-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-white text-xs block text-center">VOLS</Label>
                              <Input 
                                type="number" 
                                step="0.001" 
                                value={registro[turno.volsKey as keyof RegistroProducao] as number || 0} 
                                onChange={(e) => handleRegistroChange(registro.id!, turno.volsKey as keyof RegistroProducao, e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white text-center h-9 text-sm rounded-none"
                                placeholder="0.000"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-white text-xs block text-center">TONS</Label>
                              <Input 
                                type="number" 
                                step="0.001" 
                                value={registro[turno.tonsKey as keyof RegistroProducao] as number || 0} 
                                onChange={(e) => handleRegistroChange(registro.id!, turno.tonsKey as keyof RegistroProducao, e.target.value)}
                                className="bg-white/5 border-blue-300/30 text-white text-center h-9 text-sm rounded-none"
                                placeholder="0.000"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Total 24 horas */}
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div>
                            <Label className="text-white text-xs block">VOLS</Label>
                            <div className="text-white font-mono text-sm bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                              {((registro.vols_t1 || 0) + (registro.vols_t2 || 0) + (registro.vols_t3 || 0) + (registro.vols_t4 || 0)).toFixed(3)}
                            </div>
                          </div>
                          <div>
                            <Label className="text-white text-xs block">TONS</Label>
                            <div className="text-white font-mono text-sm bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                              {((registro.tons_t1 || 0) + (registro.tons_t2 || 0) + (registro.tons_t3 || 0) + (registro.tons_t4 || 0)).toFixed(3)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Linha de Totais */}
                  <div className="grid grid-cols-12 gap-2 items-center p-4 bg-blue-600/30 rounded-lg border border-blue-300/30">
                    <div className="col-span-2 text-white font-semibold text-sm flex items-center">TOTAL GERAL</div>
                    {totaisTurnos.map((total, index) => (
                      <div key={index} className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div>
                            <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                              {total.vols.toFixed(3)}
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                              {total.tons.toFixed(3)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="col-span-2">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                            {totais.vols.toFixed(3)}
                          </div>
                        </div>
                        <div>
                          <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-none p-2 h-9 flex items-center justify-center border border-blue-300/30">
                            {totais.tons.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="space-y-4 pt-6">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={addLinha}
                      className="w-full border-blue-300 text-white hover:bg-white/20 bg-white/10 rounded-none h-12"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Inserir Linha
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-semibold rounded-none h-12"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Todos os Registros'
                      )}
                    </Button>
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

export default ProducaoDiaria;