import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  ticketCode: string;
  type: string;
  message: string;
  recipientType: 'admin' | 'customer';
  recipientEmail?: string;
  isRead: boolean;
  createdAt: string;
}

function mapRow(row: any): AppNotification {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    type: row.type,
    message: row.message,
    recipientType: row.recipient_type,
    recipientEmail: row.recipient_email || undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export function useNotifications(recipientType: 'admin' | 'customer', recipientEmail?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_type', recipientType)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recipientType === 'customer' && recipientEmail) {
      query = query.eq('recipient_email', recipientEmail);
    }

    const { data } = await query;
    setNotifications((data || []).map(mapRow));
    setLoading(false);
  }, [recipientType, recipientEmail]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true } as any).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [notifications]);

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

export async function createNotification(params: {
  ticketId?: string;
  ticketCode: string;
  type: string;
  message: string;
  recipientType: 'admin' | 'customer';
  recipientEmail?: string;
}) {
  await supabase.from('notifications').insert({
    ticket_id: params.ticketId || null,
    ticket_code: params.ticketCode,
    type: params.type,
    message: params.message,
    recipient_type: params.recipientType,
    recipient_email: params.recipientEmail || null,
  } as any);
}
