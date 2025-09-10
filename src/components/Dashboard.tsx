import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, FileText, Ship, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">Bem vindo</h1>
          <p className="text-lg opacity-90">{userProfile?.full_name || 'Usuário'}</p>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="text-white hover:bg-white/20"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sair
        </Button>
      </div>

      {/* Main Content com os 3 botões e links corretos */}
      <div className="px-6 pb-6">
        <div className="max-w-md mx-auto space-y-4">
          
          <Card className="w-full shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <Button
                onClick={() => navigate('/notificacao')}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg relative"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                {hasUnread && (
                  <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                <Bell className="h-6 w-6 mr-3" />
                NOTIFICAÇÕES
              </Button>
            </CardContent>
          </Card>

          <Card className="w-full shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <Button
                onClick={() => navigate('/relatorio-transporte')}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                <FileText className="h-6 w-6 mr-3" />
                RELATÓRIO DE TRANSPORTE
              </Button>
            </CardContent>
          </Card>

          <Card className="w-full shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <Button
                onClick={() => navigate('/navios')}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                <Ship className="h-6 w-6 mr-3" />
                NAVIOS
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;