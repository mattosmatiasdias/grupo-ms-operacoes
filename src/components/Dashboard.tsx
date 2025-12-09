// src/components/Dashboard.tsx (versão padronizada)
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, FileText, Ship, LogOut, BarChart3, Menu, X, Calendar, ClipboardCheck, Car, AlertTriangle, Building2, Percent } from 'lucide-react';
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
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-300'
    },
    {
      icon: Ship,
      label: 'NAVIOS',
      path: '/navios',
      color: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-300'
    },
    {
      icon: Calendar,
      label: 'ESCALAS',
      path: '/escalas',
      color: 'bg-cyan-600 hover:bg-cyan-700',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-300'
    },
    {
      icon: ClipboardCheck,
      label: 'VISTORIAS',
      path: '/vistorias',
      color: 'bg-teal-600 hover:bg-teal-700',
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-300'
    },
    {
      icon: Car,
      label: 'MASTER DRIVE',
      path: '/master-drive',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-300'
    },
    {
      icon: AlertTriangle,
      label: 'OCORRÊNCIAS',
      path: '/ocorrencias',
      color: 'bg-orange-600 hover:bg-orange-700',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-300'
    },
    {
      icon: Percent,
      label: 'RATEIOS',
      path: '/rateios',
      color: 'bg-amber-600 hover:bg-amber-700',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-300'
    },
    {
      icon: Bell,
      label: 'NOTIFICAÇÕES',
      path: '/notificacao',
      color: 'bg-violet-600 hover:bg-violet-700',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-300',
      hasNotification: hasUnread
    },
    {
      icon: Building2,
      label: 'RDO SANTOS BRASIL',
      path: '/santos-brasil',
      color: 'bg-red-600 hover:bg-red-700',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-300'
    },
    {
      icon: BarChart3,
      label: 'VISUAIS E DASHBOARD',
      path: '/visuais',
      color: 'bg-green-600 hover:bg-green-700',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-300'
    }
  ];

  const quickActions = [
    {
      icon: FileText,
      label: 'NOVO LANÇAMENTO',
      path: '/novo-lancamento',
      color: 'bg-cyan-500 hover:bg-cyan-600',
      iconBg: 'bg-cyan-400/20'
    },
    {
      icon: Building2,
      label: 'NOVO RDO SANTOS BRASIL',
      path: '/santos-brasil/novo',
      color: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-400/20'
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
              <h1 className="text-xl font-bold text-white">Gestão de Operações</h1>
              <p className="text-sm text-blue-300">{userProfile?.full_name || 'Usuário'}</p>
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
            {/* Menu Principal Mobile */}
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
            
            {/* Separador */}
            <div className="my-4 border-t border-blue-600/30"></div>
            
            {/* Ações Rápidas Mobile */}
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
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestão de Operações</h1>
                <p className="text-blue-300 text-sm">(versão 15.2)</p>
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
          {/* Welcome Section */}
          <div className="bg-blue-800/30 backdrop-blur-sm border-b border-blue-600/30 p-8">
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-4">
                Bem-vindo, <span className="text-blue-300">{userProfile?.full_name || 'Usuário'}</span>!
              </h2>
              <p className="text-lg text-blue-200">
                Sistema de gestão de operações, navios e relatórios integrados
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Operações Hoje</p>
                      <p className="text-3xl font-bold text-white">12</p>
                      <p className="text-xs text-blue-300 mt-1">+2 em relação a ontem</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <FileText className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Navios Ativos</p>
                      <p className="text-3xl font-bold text-white">3</p>
                      <p className="text-xs text-blue-300 mt-1">Todos em operação</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <Ship className="h-6 w-6 text-purple-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-200">Rateios Pendentes</p>
                      <p className="text-3xl font-bold text-white">8</p>
                      <p className="text-xs text-blue-300 mt-1">Aguardando processamento</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/20">
                      <Percent className="h-6 w-6 text-amber-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader className="pb-3 border-b border-blue-200/30">
                <CardTitle className="text-xl font-semibold text-white">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-500/20 p-3 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Novo relatório de transporte</p>
                        <p className="text-sm text-blue-300">Operação HYDRO - Área 82</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-300/30 text-xs">
                      há 2 horas
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-amber-500/20 p-3 rounded-lg">
                        <Percent className="h-4 w-4 text-amber-300" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Rateio processado</p>
                        <p className="text-sm text-blue-300">BM-001 - ALBRAS COQUE</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-300/30 text-xs">
                      há 3 horas
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-500/20 p-3 rounded-lg">
                        <Ship className="h-4 w-4 text-purple-300" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Navio atualizado</p>
                        <p className="text-sm text-blue-300">LCA/UFO MAY2010 - 0.5%</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-300/30 text-xs">
                      há 4 horas
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Content (quando sidebar fechada) */}
      {!sidebarOpen && (
        <div className="lg:hidden p-4">
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

// Componente Badge para o Dashboard
const Badge = ({ variant = 'default', className, children }: { variant?: 'default' | 'outline', className?: string, children: React.ReactNode }) => {
  const baseStyles = 'px-2 py-1 rounded-md text-xs font-medium';
  const variantStyles = variant === 'outline' 
    ? 'border' 
    : 'bg-blue-500 text-white';
  
  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`}>
      {children}
    </span>
  );
};

// Componente CardHeader para o Dashboard
const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <div className={`px-6 pt-6 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`}>
      {children}
    </h3>
  );
};

export default Dashboard;