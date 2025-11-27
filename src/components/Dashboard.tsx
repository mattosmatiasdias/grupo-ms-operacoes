import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, FileText, Ship, LogOut, BarChart3, Menu, X, Calendar, ClipboardCheck, Car, AlertTriangle, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Dashboard = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    {
      icon: FileText,
      label: 'RELATÓRIO DE TRANSPORTE',
      path: '/relatorio-transporte',
      color: 'from-green-600 to-green-700',
      hoverColor: 'from-green-700 to-green-800'
    },
    {
      icon: Ship,
      label: 'NAVIOS',
      path: '/navios',
      color: 'from-purple-600 to-purple-700',
      hoverColor: 'from-purple-700 to-purple-800'
    },
    {
      icon: Calendar,
      label: 'ESCALAS',
      path: '/escalas',
      color: 'from-cyan-600 to-cyan-700',
      hoverColor: 'from-cyan-700 to-cyan-800'
    },
    {
      icon: ClipboardCheck,
      label: 'VISTORIAS',
      path: '/vistorias',
      color: 'from-teal-600 to-teal-700',
      hoverColor: 'from-teal-700 to-teal-800'
    },
    {
      icon: Car,
      label: 'MASTER DRIVE',
      path: '/master-drive',
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'from-blue-700 to-blue-800'
    },
    {
      icon: AlertTriangle,
      label: 'OCORRÊNCIAS',
      path: '/ocorrencias',
      color: 'from-indigo-600 to-indigo-700',
      hoverColor: 'from-indigo-700 to-indigo-800'
    },
    {
      icon: Bell,
      label: 'NOTIFICAÇÕES',
      path: '/notificacao',
      color: 'from-violet-600 to-violet-700',
      hoverColor: 'from-violet-700 to-violet-800',
      hasNotification: hasUnread
    },
    {
      icon: Building2,
      label: 'RDO SANTOS BRASIL',
      path: '/rdo-santos-brasil',
      color: 'from-red-600 to-red-700',
      hoverColor: 'from-red-700 to-red-800'
    },
    {
      icon: BarChart3,
      label: 'VISUAIS E DASHBOARD',
      path: '/visuais',
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'from-orange-600 to-orange-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header Mobile */}
      <div className="lg:hidden flex justify-between items-center p-4 text-white bg-blue-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/20 p-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Gestão de Operações</h1>
            <p className="text-sm opacity-90">{userProfile?.full_name || 'Usuário'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="text-white hover:bg-white/20 p-2"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-blue-900/95 backdrop-blur-sm">
          <div className="flex justify-between items-center p-4 border-b border-blue-700">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white/20 p-2"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full h-16 bg-gradient-to-r ${item.color} hover:${item.hoverColor} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
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
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar Desktop */}
        <div className="w-80 bg-blue-800/50 backdrop-blur-sm border-r border-blue-600/30 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestão de Operações</h1>
                <p className="text-blue-200 text-sm">( versão 5.5)</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-200 text-sm">Status: <span className="text-green-400">Ativo</span></p>
              <p className="text-blue-200 text-sm">Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Main Menu */}
          <div className="flex-1 p-6 space-y-3">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Menu Principal</h3>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full h-16 bg-gradient-to-r ${item.color} hover:${item.hoverColor} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative group hover:scale-105 hover:shadow-xl`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                    <item.icon className="h-5 w-5" />
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

          {/* Logout */}
          <div className="p-6 border-t border-blue-600/30">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full text-white hover:bg-white/20 border border-white/30 rounded-xl transition-all duration-300 py-3"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair do Sistema
            </Button>
          </div>
        </div>

        {/* Main Content Desktop */}
        <div className="flex-1 flex flex-col">
          {/* Welcome Section */}
          <div className="bg-white/5 backdrop-blur-sm border-b border-blue-600/30 p-8">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-bold text-white mb-4">
                Bem-vindo, {userProfile?.full_name || 'Usuário'}!
              </h2>
              <p className="text-xl text-blue-200">
                Sistema de gestão de operações, navios e relatórios integrados
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Operações Hoje</p>
                      <p className="text-3xl font-bold">12</p>
                    </div>
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                      <FileText className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-green-200/30 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Navios Ativos</p>
                      <p className="text-3xl font-bold">3</p>
                    </div>
                    <div className="bg-green-500/20 p-3 rounded-xl">
                      <Ship className="h-6 w-6 text-green-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-red-200/30 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">RDOs Santos Brasil</p>
                      <p className="text-3xl font-bold">5</p>
                    </div>
                    <div className="bg-red-500/20 p-3 rounded-xl">
                      <Building2 className="h-6 w-6 text-red-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Atividade Recente</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-500/20 p-2 rounded">
                        <FileText className="h-4 w-4 text-green-400" />
                      </div>
                      <span className="text-white">Novo relatório de transporte</span>
                    </div>
                    <span className="text-blue-200 text-sm">há 2 horas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-500/20 p-2 rounded">
                        <Ship className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-white">Navio atualizado</span>
                    </div>
                    <span className="text-blue-200 text-sm">há 4 horas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-teal-500/20 p-2 rounded">
                        <ClipboardCheck className="h-4 w-4 text-teal-400" />
                      </div>
                      <span className="text-white">Nova vistoria registrada</span>
                    </div>
                    <span className="text-blue-200 text-sm">há 1 dia</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden p-4">
        <div className="space-y-4">
          {menuItems.map((item) => (
            <Card key={item.path} className="w-full shadow-lg">
              <CardContent className="p-0">
                <Button
                  onClick={() => navigate(item.path)}
                  className={`w-full h-16 bg-gradient-to-r ${item.color} hover:${item.hoverColor} text-white text-lg font-semibold rounded-lg relative`}
                >
                  {item.hasNotification && (
                    <span className="absolute top-3 right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  <item.icon className="h-6 w-6 mr-3" />
                  {item.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;