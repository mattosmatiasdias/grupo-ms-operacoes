// src/pages/Navios.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Menu, X, LogOut, Bell, Ship, Calendar, Package, Anchor, BarChart3, Plus, Pencil, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Viagem {
  id: string;
  nome_navio: string;
  carga: string | null;
  berco: string | null;
  quantidade_prevista: number | null;
  cbs_total: number | null;
  inicio_operacao: string | null;
  final_operacao: string | null;
  media_cb: number | null;
  concluido: boolean;
  created_at: string;
}

const Navios = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViagens = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setViagens(data || []);
      setLoading(false);
    };
    fetchViagens();
  }, []);

  const formatDate = (dateString: string | null) => 
    dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';

  const getStatusColor = (concluido: boolean) => 
    concluido ? 'bg-blue-500/20 text-blue-300 border-blue-300/30' : 'bg-green-500/20 text-green-300 border-green-300/30';

  const calcularDiasOperacao = (inicio: string | null, final: string | null) => {
    if (!inicio) return 0;
    const inicioDate = new Date(inicio);
    const finalDate = final ? new Date(final) : new Date();
    const diffTime = Math.abs(finalDate.getTime() - inicioDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSignOut = async () => {
    await signOut();
  };

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

  const quickActions = [
    {
      icon: Plus,
      label: 'NOVO NAVIO/VIAGEM',
      path: '/novo-navio',
      color: 'bg-orange-500 hover:bg-orange-600',
      iconBg: 'bg-orange-400/20'
    }
  ];

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
              <h1 className="text-xl font-bold text-white">Gestão de Navios</h1>
              <p className="text-sm text-blue-300">
                {viagens.length} viagens registradas
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
              onClick={() => navigate('/')}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Dashboard
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
            
            <div className="my-4 border-t border-blue-600/30"></div>
            
            <div className="space-y-2">
              <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-2">Ações Rápidas</h3>
              {quickActions.map((action) => (
                <Button
                  key={action.path}
                  onClick={() => {
                    navigate(action.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full h-14 ${action.color} text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-start space-x-3 w-full">
                    <div className={`${action.iconBg} p-2 rounded-lg`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span>{action.label}</span>
                  </div>
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
          {/* Sidebar Header */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Ship className="h-8 w-8 text-purple-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestão de Navios</h1>
                <p className="text-blue-300 text-sm">Sistema de operações</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-blue-200/30">
              <p className="text-white font-semibold text-lg">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-300 text-sm mt-1">Status: <span className="text-green-400 font-medium">Ativo</span></p>
              <p className="text-blue-300 text-sm mt-1">Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="p-6 border-b border-blue-600/30">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Dashboard
            </Button>
          </div>

          {/* Main Menu */}
          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Menu Principal</h3>
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

          {/* Quick Actions */}
          <div className="p-6 border-t border-blue-600/30">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Ações Rápidas</h3>
            {quickActions.map((action) => (
              <Button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`w-full h-14 ${action.color} text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-start space-x-3 w-full">
                  <div className={`${action.iconBg} p-2 rounded-lg`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <span>{action.label}</span>
                </div>
              </Button>
            ))}
          </div>

          {/* Logout */}
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
                <h2 className="text-2xl font-bold text-white">Gestão de Navios</h2>
                <p className="text-blue-200">Sistema de monitoramento de viagens e operações</p>
              </div>
              <Button 
                onClick={() => navigate('/novo-navio')} 
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Navio/Viagem
              </Button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Total de Viagens</p>
                      <p className="text-2xl font-bold text-white">{viagens.length}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <Ship className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Em Andamento</p>
                      <p className="text-2xl font-bold text-white">
                        {viagens.filter(v => !v.concluido).length}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <Calendar className="h-6 w-6 text-green-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Concluídas</p>
                      <p className="text-2xl font-bold text-white">
                        {viagens.filter(v => v.concluido).length}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <Package className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Média CBs</p>
                      <p className="text-2xl font-bold text-white">
                        {viagens.length > 0 
                          ? Math.round(viagens.reduce((acc, v) => acc + (v.media_cb || 0), 0) / viagens.length)
                          : 0
                        }
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <BarChart3 className="h-6 w-6 text-purple-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Viagens */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader className="border-b border-blue-200/30 pb-4">
                <CardTitle className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Ship className="h-5 w-5" />
                  <span>Viagens Registradas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-blue-500/10">
                      <TableRow>
                        <TableHead className="font-semibold text-blue-200 py-3">Navio</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Carga</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Berço</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Quantidade</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">CBs</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Início</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Dias</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3">Status</TableHead>
                        <TableHead className="font-semibold text-blue-200 py-3 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex justify-center">
                              <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin"></div>
                            </div>
                            <p className="text-blue-200 mt-2">Carregando viagens...</p>
                          </TableCell>
                        </TableRow>
                      ) : viagens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="space-y-3">
                              <Ship className="h-12 w-12 text-blue-300/50 mx-auto" />
                              <p className="text-lg font-medium text-white">Nenhuma viagem registrada</p>
                              <p className="text-blue-300">Cadastre a primeira viagem para começar</p>
                              <Button 
                                onClick={() => navigate('/novo-navio')}
                                className="bg-orange-500 hover:bg-orange-600 text-white mt-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Cadastrar Primeira Viagem
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        viagens.map((viagem) => {
                          const diasOperacao = calcularDiasOperacao(viagem.inicio_operacao, viagem.final_operacao);
                          
                          return (
                            <TableRow key={viagem.id} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 rounded-lg bg-blue-500/20">
                                    <Ship className="h-4 w-4 text-blue-300" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{viagem.nome_navio}</div>
                                    {viagem.inicio_operacao && (
                                      <div className="text-xs text-blue-300">
                                        Iniciou: {formatDate(viagem.inicio_operacao)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-medium text-white">{viagem.carga || 'N/A'}</div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-2">
                                  <Anchor className="h-4 w-4 text-blue-300" />
                                  <span className="text-white">{viagem.berco || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-white">
                                  {viagem.quantidade_prevista?.toLocaleString('pt-BR') || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                                  {viagem.cbs_total || 0} CBs
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-sm text-white">
                                  {formatDate(viagem.inicio_operacao)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-300/30">
                                  {diasOperacao} dias
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge 
                                  variant="outline" 
                                  className={getStatusColor(viagem.concluido)}
                                >
                                  {viagem.concluido ? 'Concluído' : 'Em Andamento'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 text-right space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/navio/${viagem.id}/editar`)}
                                  className="border-blue-300 text-white hover:bg-white/20 bg-white/10"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/navio/${viagem.id}/producao`)}
                                  className="border-green-300 text-white hover:bg-green-500/20 bg-green-500/10"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Produção
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Content (quando sidebar fechada) */}
      {!sidebarOpen && (
        <div className="lg:hidden p-4">
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4 py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Dashboard
          </Button>

          <div className="space-y-4">
            {menuItems.map((item) => (
              <Card key={item.path} className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                <CardContent className="p-0">
                  <Button
                    onClick={() => navigate(item.path)}
                    className={`w-full h-16 ${item.color} text-white text-lg font-semibold rounded-lg relative hover:shadow-lg`}
                  >
                    <div className="flex items-center justify-start space-x-3 w-full px-4">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navios;