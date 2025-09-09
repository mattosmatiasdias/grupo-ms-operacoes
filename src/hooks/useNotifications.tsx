// src/hooks/useNotifications.tsx

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Interface para definir o formato de uma notificação
export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacao[]>([]); // Agora é uma lista
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotificationState = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Pega as 10 notificações mais recentes
      const { data: notificationData, error: notificationError } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationError) throw notificationError;
      
      setNotifications(notificationData || []);
      
      const latestNotification = notificationData?.[0];

      if (!latestNotification) {
        setHasUnread(false);
        return;
      }

      // 2. Verifica se o usuário atual já leu a notificação MAIS recente
      const { data: readData, error: readError } = await supabase
        .from('notificacoes_lidas')
        .select('id')
        .eq('notificacao_id', latestNotification.id)
        .eq('user_id', user.id)
        .single();

      if (readError && readError.code !== 'PGRST116') {
        throw readError;
      }
      setHasUnread(!readData);

    } catch (error) {
      console.error("Erro ao buscar estado da notificação:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotificationState();
  }, [fetchNotificationState]);

  const markAsRead = async () => {
    const latestNotification = notifications?.[0];
    if (!user || !latestNotification || !hasUnread) return;

    try {
      const { error } = await supabase
        .from('notificacoes_lidas')
        .insert({ notificacao_id: latestNotification.id, user_id: user.id });
      if (error) throw error;
      setHasUnread(false);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Função para enviar uma nova notificação
  const sendNotification = async (title: string, message: string) => {
    if (!user || !title || !message) {
      throw new Error("Título e mensagem são obrigatórios.");
    }

    const { error } = await supabase
      .from('notificacoes')
      .insert({
        titulo: title,
        mensagem: message,
        autor_id: user.id,
      });

    if (error) {
      throw error;
    }

    // Após enviar, atualiza a lista de notificações para todos
    await fetchNotificationState();
  };

  return { loading, notifications, hasUnread, markAsRead, sendNotification, refreshNotifications: fetchNotificationState };
};