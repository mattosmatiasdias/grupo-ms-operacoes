import { useState, useEffect } from 'react'; // ← ADICIONE useEffect
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom'; // ← ADICIONE useNavigate
import { AlertCircle, UserPlus, Loader2 } from 'lucide-react'; // ← ADICIONE Loader2

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // ← ADICIONE este estado
  const { signIn, signUp, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // ← ADICIONE useNavigate

  // Verificar autenticação ao carregar o componente
  useEffect(() => {
    const checkAuthentication = async () => {
      // Se já tem usuário e sessão, redireciona para a página inicial
      if (user && session) {
        navigate('/');
        return;
      }
      
      // Se não tem autenticação, mostra o formulário
      setCheckingAuth(false);
    };

    checkAuthentication();
  }, [user, session, navigate]);

  // Se ainda está verificando autenticação, mostra loading
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se já está autenticado, redireciona (fallback)
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
          // O redirecionamento será feito automaticamente pelo useEffect
          // quando user e session forem atualizados
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
          // Limpa os campos após cadastro bem-sucedido
          setEmail('');
          setPassword('');
          setFullName('');
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
                    placeholder="Seu nome completo"
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
                  placeholder="seu@email.com"
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
                  placeholder="Sua senha"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 text-white"
                style={{ boxShadow: 'var(--shadow-button)' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Entrando..." : "Cadastrando..."}
                  </>
                ) : (
                  isLogin ? "Entrar" : "Cadastrar"
                )}
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
                        <strong> Mattos Matias</strong> ou <strong>Samuel Freitas</strong> para ativação.
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