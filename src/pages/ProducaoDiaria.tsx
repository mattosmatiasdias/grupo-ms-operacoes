// src/pages/ProducaoDiaria.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Menu, X, LogOut, Bell, ArrowLeft, Plus, Ship, BarChart3, Calendar, Package, Anchor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navio, setNavio] = useState<{ nome_navio: string } | null>(null);
  const [registros, setRegistros] = useState<RegistroProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTodosRegistros = useCallback(async () => {
    setLoading(true);
    try {
      if (!navioId) return;
      
      const { data: navioData, error: navioError } = await supabase
        .from('navios')
        .select('nome_navio')
        .eq('id', navioId)
        .single();
      
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
        setRegistros(registrosData);
      } else {
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
      toast({ 
        title: "Erro", 
        description: "Não foi possível carregar os dados.", 
        variant: "destructive" 
      });
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
      toast({ 
        title: "Aviso", 
        description: "É necessário manter pelo menos uma linha.", 
        variant: "default" 
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !navioId) return;
    setIsSaving(true);
    
    try {
      const registrosExistentes = registros.filter(r => r.id && !r.id.startsWith('new-'));
      const registrosNovos = registros.filter(r => !r.id || r.id.startsWith('new-'));

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
          user_id: userProfile.id,
        }));

        const { error: updateError } = await supabase
          .from('registros_producao')
          .upsert(updates);

        if (updateError) throw updateError;
      }

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
          user_id: userProfile.id,
        }));

        const { error: insertError } = await supabase
          .from('registros_producao')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast({ 
        title: "Sucesso!", 
        description: "Todos os registros foram salvos com sucesso." 
      });
      
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

  const totais = registros.reduce((acc, registro) => ({
    tons: acc.tons + (registro.tons_t1 || 0) + (registro.tons_t2 || 0) + (registro.tons_t3 || 0) + (registro.tons_t4 || 0),
    vols: acc.vols + (registro.vols_t1 || 0) + (registro.vols_t2 || 0) + (registro.vols_t3 || 0) + (registro.vols_t4 || 0),
  }), { tons: 0, vols: 0 });

  const totaisTurnos = turnos.map(turno => ({
    tons: registros.reduce((sum, registro) => sum + (registro[turno.tonsKey as keyof RegistroProducao] as number || 0), 0),
    vols: registros.reduce((sum, registro) => sum + (registro[turno.volsKey as keyof RegistroProducao] as number || 0), 0),
  }));

  const menuItems = [
    {
      icon: Ship,
      label: 'NAVIOS',
      path: '/navios',
      color: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-300'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Mobile */}
      <div className="lg:hidden bg-blue-900/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-blue-300 hover:bg-blue-800/50"
              title="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Produção Diária</h1>
              <p className="text-sm text-blue-300">
                {navio?.nome_navio || 'Carregando...'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-blue-300 hover:bg-blue-800/50"
            title="Sair do sistema"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-blue-900/95 backdrop-blur-sm">
          <div className="flex justify-between items-center p-4 border-b border-blue-600/30">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-80px)]">
            <Button
              onClick={() => navigate('/navios')}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Navios
            </Button>

            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full h-16 ${item.color} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative hover:shadow-lg hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-start space-x-4 w-full">
                    <div className={`${item.iconBg} p-3 rounded-lg`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <span className="text-left">{item.label}</span>
                  </div>
                  {item.hasNotification && (
                    <span className="absolute top-3 right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar Desktop */}
        <div className="w-80 bg-blue-900/30 backdrop-blur-sm border-r border-blue-600/30 flex flex-col">
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-orange-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Produção Diária</h1>
                <p className="text-blue-300 text-sm">{navio?.nome_navio || 'Carregando...'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-blue-200/30">
              <p className="text-white font-semibold text-lg">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-300 text-sm mt-1">Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-6 border-b border-blue-600/30">
            <Button
              onClick={() => navigate('/navios')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Navios
            </Button>
          </div>

          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Menu</h3>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full h-16 ${item.color} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative group hover:shadow-lg hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <div className={`${item.iconBg} p-3 rounded-lg group-hover:bg-white/30 transition-colors`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <span className="text-left">{item.label}</span>
                </div>
                {item.hasNotification && (
                  <span className="absolute top-4 right-4 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="p-6 border-t border-blue-600/30">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30 rounded-xl transition-all duration-300 py-3 hover:shadow"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair do Sistema
            </Button>
          </div>
        </div>

        {/* Main Content Desktop */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-blue-800/30 backdrop-blur-sm border-b border-blue-600/30 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Registro de Produção Diária</h2>
                <p className="text-blue-200">Navio: {navio?.nome_navio || 'Carregando...'}</p>
              </div>
              <div className="text-right">
                <div className="text-blue-200 text-sm">Total Geral</div>
                <div className="text-white font-bold">
                  {totais.tons.toFixed(3)} tons • {totais.vols.toFixed(3)} vols
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1">
            <form onSubmit={handleSave}>
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                <CardHeader className="border-b border-blue-200/30">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Registro de Produção</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                      {registros.length} linha(s)
                    </Badge>
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
                                  className="bg-white/5 border-blue-300/30 text-white text-sm h-9 rounded-md mb-2"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-white text-xs block mb-1">Porão</Label>
                                <div className="flex items-center space-x-2">
                                  <Input 
                                    value={registro.porao} 
                                    onChange={(e) => handleRegistroChange(registro.id!, 'porao', e.target.value)}
                                    className="bg-white/5 border-blue-300/30 text-white w-20 font-mono text-center h-9 rounded-md"
                                  />
                                  {registros.length > 1 && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removeLinha(registro.id!)}
                                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-md"
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
                                    className="bg-white/5 border-blue-300/30 text-white text-center h-9 text-sm rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                    className="bg-white/5 border-blue-300/30 text-white text-center h-9 text-sm rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                <div className="text-white font-mono text-sm bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
                                  {((registro.vols_t1 || 0) + (registro.vols_t2 || 0) + (registro.vols_t3 || 0) + (registro.vols_t4 || 0)).toFixed(3)}
                                </div>
                              </div>
                              <div>
                                <Label className="text-white text-xs block">TONS</Label>
                                <div className="text-white font-mono text-sm bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
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
                                <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
                                  {total.vols.toFixed(3)}
                                </div>
                              </div>
                              <div>
                                <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
                                  {total.tons.toFixed(3)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="col-span-2">
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div>
                              <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
                                {totais.vols.toFixed(3)}
                              </div>
                            </div>
                            <div>
                              <div className="text-white font-mono text-sm font-semibold bg-white/10 rounded-md p-2 h-9 flex items-center justify-center border border-blue-300/30">
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
                          className="w-full border-blue-300 text-white hover:bg-white/20 bg-white/10 rounded-md h-12"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Inserir Linha
                        </Button>
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-semibold rounded-md h-12"
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
      </div>

      {/* Mobile Content (quando sidebar fechada) */}
      {!sidebarOpen && (
        <div className="lg:hidden p-4">
          <Button
            onClick={() => navigate('/navios')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4 py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Navios
          </Button>

          {/* Conteúdo principal mobile */}
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardHeader className="border-b border-blue-200/30">
              <CardTitle className="text-white text-lg">
                {navio?.nome_navio || 'Produção'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin"></div>
                  </div>
                  <p className="text-blue-200 mt-2">Carregando registros...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleSave}>
                    <div className="space-y-6 overflow-x-auto">
                      {/* Cabeçalho simplificado para mobile */}
                      <div className="grid grid-cols-4 gap-2 px-2 py-3 bg-blue-600/50 rounded-lg">
                        <div className="col-span-1 text-white font-semibold text-xs">Data/Porão</div>
                        <div className="col-span-3 grid grid-cols-3 gap-1">
                          {turnos.slice(0, 3).map((turno) => (
                            <div key={turno.id} className="text-center text-white font-semibold text-xs">
                              {turno.shortLabel}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conteúdo do formulário mobile... */}
                      {/* (O conteúdo mobile pode ser simplificado ou usar scroll horizontal) */}
                      
                      <div className="space-y-3 pt-4">
                        <Button 
                          type="button" 
                          onClick={addLinha}
                          className="w-full border-blue-300 text-white hover:bg-white/20 bg-white/10 rounded-md h-12 text-sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Linha
                        </Button>
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md h-12"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Salvando...' : 'Salvar Registros'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProducaoDiaria;