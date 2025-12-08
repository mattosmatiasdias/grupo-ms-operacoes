// src/pages/EditarNavio.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';
import { Menu, X, LogOut, Bell, ArrowLeft, Ship, BarChart3, Calendar, Anchor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProducaoDia {
  data: string;
  total_tons: number;
}

const EditarNavio = () => {
  const { id: navioId } = useParams();
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [producaoPorDia, setProducaoPorDia] = useState<ProducaoDia[]>([]);

  const fetchNavio = useCallback(async () => {
    if (!navioId) return;
    setLoading(true);
    
    try {
      const { data: navioData, error: navioError } = await supabase
        .from('navios')
        .select('*')
        .eq('id', navioId)
        .single();
      
      if (navioError || !navioData) {
        toast({ 
          title: "Erro", 
          description: "Navio não encontrado.", 
          variant: "destructive" 
        });
        navigate('/navios');
        return;
      }

      navioData.inicio_operacao = navioData.inicio_operacao 
        ? new Date(navioData.inicio_operacao).toISOString().slice(0, 16) 
        : '';
      navioData.final_operacao = navioData.final_operacao 
        ? new Date(navioData.final_operacao).toISOString().slice(0, 16) 
        : '';
      setFormData(navioData);

      const { data: producaoData, error: producaoError } = await supabase
        .from('registros_producao')
        .select('data, tons_t1, tons_t2, tons_t3, tons_t4')
        .eq('navio_id', navioId)
        .order('data', { ascending: true });

      if (!producaoError && producaoData) {
        const producaoAgrupada = producaoData.reduce((acc: {[key: string]: number}, registro) => {
          const data = registro.data;
          const totalDia = (registro.tons_t1 || 0) + (registro.tons_t2 || 0) + 
                          (registro.tons_t3 || 0) + (registro.tons_t4 || 0);
          
          if (!acc[data]) acc[data] = 0;
          acc[data] += totalDia;
          return acc;
        }, {});

        const producaoArray = Object.entries(producaoAgrupada).map(([data, total_tons]) => ({
          data: new Date(data).toLocaleDateString('pt-BR'),
          total_tons: Number(total_tons.toFixed(3))
        }));

        setProducaoPorDia(producaoArray);
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

      const { error } = await supabase
        .from('navios')
        .update(updateData)
        .eq('id', navioId);
      
      if (error) throw error;

      toast({ 
        title: "Sucesso!", 
        description: "Dados do navio atualizados." 
      });
      navigate('/navios');
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast({ 
        title: "Erro", 
        description: (error as Error).message || "Não foi possível atualizar os dados.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalGeral = producaoPorDia.reduce((sum, dia) => sum + dia.total_tons, 0);
  const maxProducao = Math.max(...producaoPorDia.map(dia => dia.total_tons), 0);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="text-blue-200 mt-2">Carregando dados do navio...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-white">Editar Navio</h1>
              <p className="text-sm text-blue-300">{formData.nome_navio}</p>
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
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Ship className="h-8 w-8 text-purple-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Navio</h1>
                <p className="text-blue-300 text-sm">{formData.nome_navio}</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-blue-200/30">
              <p className="text-white font-semibold text-lg">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-300 text-sm mt-1">Status: <span className="text-green-400 font-medium">Ativo</span></p>
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
                <h2 className="text-2xl font-bold text-white">Editar Viagem</h2>
                <p className="text-blue-200">{formData.nome_navio}</p>
              </div>
              <div className="text-right">
                <div className="text-blue-200 text-sm">Total Produzido</div>
                <div className="text-white font-bold">
                  {totalGeral.toFixed(3)} tons
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
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
                        className="bg-white/5 border-blue-300/30 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cbs_total" className="text-white text-sm">Total de CBs</Label>
                      <Input 
                        id="cbs_total" 
                        type="number" 
                        value={formData.cbs_total || ''} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="bg-white/5 border-blue-300/30 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg border border-blue-300/30 w-full">
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
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30">
                      {producaoPorDia.length} dia(s) com registro
                    </Badge>
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

          {/* Formulário mobile simplificado */}
          <form onSubmit={handleSave}>
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 mb-4">
              <CardHeader className="border-b border-blue-200/30">
                <CardTitle className="text-white">Dados da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_navio_mobile" className="text-white text-sm">Nome do Navio*</Label>
                    <Input 
                      id="nome_navio_mobile" 
                      value={formData.nome_navio || ''} 
                      onChange={handleChange} 
                      required 
                      className="bg-white/5 border-blue-300/30 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="carga_mobile" className="text-white text-sm">Carga</Label>
                      <Input 
                        id="carga_mobile" 
                        value={formData.carga || ''} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="berco_mobile" className="text-white text-sm">Berço</Label>
                      <Input 
                        id="berco_mobile" 
                        value={formData.berco || ''} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white"
                      />
                    </div>
                  </div>
                  
                  {/* Botão Salvar mobile */}
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg h-12 mt-4"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}
    </div>
  );
};

export default EditarNavio;