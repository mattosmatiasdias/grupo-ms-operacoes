import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, session, loading, isActive } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Conta Inativa</h1>
          <p>Sua conta ainda não foi ativada. Entre em contato com Mattos Matias ou George Kennedy.</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
