// src/components/auth/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Se não tem usuário nem sessão, redireciona para login
    if (!user && !session) {
      navigate('/auth');
      return;
    }

    // Se tem usuário e sessão, permite o acesso
    setIsLoading(false);
  }, [user, session, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};