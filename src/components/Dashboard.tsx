import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, FileText, Ship, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { userProfile, signOut } = useAuth();
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

      {/* Main Content */}
      <div className="px-6 pb-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Notificação Button */}
          <Card className="w-full shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <Button
                onClick={() => navigate('/notificacao')}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                <Bell className="h-6 w-6 mr-3" />
                NOTIFICAÇÃO
              </Button>
            </CardContent>
          </Card>

          {/* Relatório de Transporte Button */}
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

          {/* Navios Button */}
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