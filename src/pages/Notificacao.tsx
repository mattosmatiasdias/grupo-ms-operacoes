// src/pages/Notificacao.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notificacao as NotificacaoType } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Notificacao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth(); // Usado para mostrar o autor
  const { loading, notifications, markAsRead, sendNotification, refreshNotifications } = useNotifications();

  // Estados para o formulário de envio
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Efeito para marcar a notificação como lida ao entrar na página
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMessage) {
      toast({ title: "Atenção", description: "Por favor, preencha o título e a mensagem.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await sendNotification(newTitle, newMessage);
      toast({ title: "Sucesso!", description: "Notificação enviada para todos os usuários." });
      setNewTitle('');
      setNewMessage('');
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível enviar a notificação.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex items-center p-4 text-white">
        <Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/20 mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Central de Notificações</h1>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna da Esquerda: Formulário de Envio */}
        <div className="md:col-span-1">
          <Card className="shadow-[var(--shadow-card)] sticky top-4">
            <CardHeader>
              <CardTitle className="text-primary">Enviar Nova Notificação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Manutenção Programada" disabled={isSending} />
                </div>
                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea id="message" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Detalhes do aviso..." rows={5} disabled={isSending} />
                </div>
                <Button type="submit" className="w-full" disabled={isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Enviando...' : 'Enviar para Todos'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita: Lista de Notificações */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white">Notificações Recentes</h2>
          {loading && <p className="text-white/80">Carregando notificações...</p>}
          {!loading && notifications.length === 0 && (
            <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-4"><p className="text-muted-foreground">Nenhuma notificação encontrada.</p></CardContent></Card>
          )}
          {!loading && notifications.map((notif: NotificacaoType) => (
            <Card key={notif.id} className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-primary">{notif.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enviado em: {new Date(notif.created_at).toLocaleString('pt-BR')}
                </p>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{notif.mensagem}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notificacao;