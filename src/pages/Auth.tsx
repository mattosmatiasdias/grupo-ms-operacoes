import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { AlertCircle, UserPlus } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, session } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (user && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro no Login",
            description: error.message === 'Invalid login credentials' 
              ? "Email ou senha incorretos" 
              : error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo ao sistema"
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: "Erro no Cadastro",
            description: error.message === 'User already registered' 
              ? "Este email já está cadastrado" 
              : error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Sua conta foi criada mas precisa ser ativada. Entre em contato com Mattos Matias ou George Kennedy para ativação."
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Gestão de Operações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 text-white"
                style={{ boxShadow: 'var(--shadow-button)' }}
                disabled={loading}
              >
                {loading ? "Carregando..." : (isLogin ? "Entrar" : "Cadastrar")}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsLogin(!isLogin)}
                  disabled={loading}
                  className="text-secondary hover:text-secondary/80"
                >
                  {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
                </Button>
              </div>

              {!isLogin && (
                <div className="bg-muted p-4 rounded-lg border-l-4 border-secondary">
                  <div className="flex items-start space-x-2">
                    <UserPlus className="h-5 w-5 text-secondary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Ativação de Conta</p>
                      <p className="text-muted-foreground">
                        Após o cadastro, sua conta ficará inativa. Entre em contato com 
                        <strong> Mattos Matias</strong> ou <strong>George Kennedy</strong> para ativação.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;