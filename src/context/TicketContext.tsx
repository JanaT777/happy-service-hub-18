import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, ComplaintStatus, ReturnStatus, OtherStatus, ReturnItem, ComplaintItem, ComplaintItemStatus, COMPLAINT_TYPE_SUGGESTED_SOLUTION, ComplaintType, SuggestedSolution, WarehouseReceiptAudit, AssignedTeam, getAutoAssignment, InfoRequest, ReminderLog } from '@/types/ticket';
import { supabase } from '@/integrations/supabase/client';

interface TicketContextType {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  updateComplaintStatus: (id: string, complaintStatus: ComplaintStatus) => void;
  updateReturnStatus: (id: string, returnStatus: ReturnStatus) => void;
  updateOtherStatus: (id: string, otherStatus: OtherStatus) => void;
  updateComplaintItemStatus: (ticketId: string, itemIndex: number, itemStatus: ComplaintItemStatus, actionLabel: string) => void;
  setWarehouseReceipt: (id: string, receivedAt: string, agent: string) => void;
  updateAssignment: (id: string, team: AssignedTeam) => void;
  requestInfo: (id: string, message: string, internalNote?: string) => void;
  markInfoProvided: (id: string) => void;
  getTicket: (id: string) => Ticket | undefined;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'TK-A1B2C3',
      customerEmail: 'jana@example.com',
      orderNumber: 'ORD-10042',
      product: 'Bezdrôtové slúchadlá (1×), Obal na telefón (2×)',
      description: 'Ľavé slúchadlo prestalo fungovať po 2 týždňoch používania. Obaly boli poškodené v preprave.',
      attachments: [],
      requestType: 'complaint',
      issueType: 'manufacturing_defect',
      severity: 'high',
      suggestedSolution: 'exchange',
      requestedResolution: 'refund',
      complaintItems: [
        { productName: 'Bezdrôtové slúchadlá', quantity: 1, complaintReason: 'manufacturing_defect', requestedResolution: 'refund', itemStatus: 'item_new' },
        { productName: 'Obal na telefón', quantity: 2, complaintReason: 'damaged_in_transport', requestedResolution: 'exchange', itemStatus: 'item_new' },
      ],
      complaintStatus: 'complaint_new',
      assignedTo: 'customer_care',
      status: 'new',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'TK-D4E5F6',
      customerEmail: 'marek@example.com',
      orderNumber: 'ORD-10038',
      product: 'Bežecké topánky veľkosť 10, Športové ponožky',
      returnItems: [
        { name: 'Bežecké topánky veľkosť 10', quantity: 1 },
        { name: 'Športové ponožky', quantity: 2 },
      ],
      description: 'Doručená nesprávna veľkosť. Objednal som veľkosť 10, dostal som veľkosť 8.',
      attachments: [],
      requestType: 'return',
      refundMethod: 'original_payment',
      withinReturnWindow: true,
      returnStatus: 'return_submitted',
      assignedTo: 'sklad',
      status: 'new',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'TK-G7H8I9',
      customerEmail: 'sara@example.com',
      orderNumber: 'ORD-10051',
      product: 'Inteligentné hodinky',
      description: 'Môžem zmeniť doručovaciu adresu pre moju čakajúcu objednávku?',
      attachments: [],
      requestType: 'other',
      otherStatus: 'other_submitted',
      assignedTo: 'customer_care',
      status: 'new',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
  ]);

  // Items always start as item_new — warehouse workflow handles progression
  const processNewItems = (items: ComplaintItem[]): ComplaintItem[] => {
    return items.map(item => ({ ...item, itemStatus: 'item_new' as ComplaintItemStatus }));
  };

  // Sync ticket to DB (upsert for reminder tracking)
  const syncTicketToDb = useCallback(async (ticket: Ticket) => {
    try {
      await supabase.from('tickets').upsert({
        ticket_code: ticket.id,
        customer_email: ticket.customerEmail,
        order_number: ticket.orderNumber,
        status: ticket.status,
        request_type: ticket.requestType,
        description: ticket.description,
        needs_info_since: ticket.status === 'needs_info' && ticket.infoRequests?.length
          ? ticket.infoRequests[ticket.infoRequests.length - 1].requestedAt
          : null,
        needs_info_message: ticket.status === 'needs_info' && ticket.infoRequests?.length
          ? ticket.infoRequests[ticket.infoRequests.length - 1].message
          : null,
        reminders_sent: ticket.status === 'needs_info' && ticket.infoRequests?.length
          ? (ticket.infoRequests[ticket.infoRequests.length - 1].remindersSent || 0)
          : 0,
        updated_at: ticket.updatedAt,
      }, { onConflict: 'ticket_code' } as any);
    } catch (e) {
      console.error('Failed to sync ticket to DB:', e);
    }
  }, []);

  // Fetch reminder logs from DB for a ticket
  const fetchDbReminders = useCallback(async (ticketCode: string): Promise<ReminderLog[]> => {
    try {
      const { data } = await supabase
        .from('ticket_reminder_log')
        .select('*')
        .eq('ticket_code', ticketCode)
        .order('sent_at', { ascending: true });
      return (data || []).map((r: any) => ({
        sentAt: r.sent_at,
        reminderNumber: r.reminder_number,
        message: r.message,
      }));
    } catch {
      return [];
    }
  }, []);

  // Poll DB for reminder updates every 30s
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      setTickets(prev => {
        // Check each needs_info ticket for DB updates
        prev.forEach(async (t) => {
          if (t.status !== 'needs_info' && t.status !== 'suspended') return;
          try {
            const { data: dbTicket } = await supabase
              .from('tickets')
              .select('*')
              .eq('ticket_code', t.id)
              .single();
            if (!dbTicket) return;

            const dbReminders = await fetchDbReminders(t.id);
            
            // Update local state if DB has newer data
            if (dbTicket.status === 'suspended' && t.status !== 'suspended') {
              setTickets(p => p.map(ticket => {
                if (ticket.id !== t.id) return ticket;
                const lastReq = ticket.infoRequests?.[ticket.infoRequests.length - 1];
                if (!lastReq) return { ...ticket, status: 'suspended' as TicketStatus, updatedAt: dbTicket.updated_at };
                const updatedReq = {
                  ...lastReq,
                  remindersSent: dbTicket.reminders_sent,
                  lastReminderAt: dbTicket.last_reminder_at,
                  reminders: dbReminders,
                };
                return {
                  ...ticket,
                  status: 'suspended' as TicketStatus,
                  infoRequests: [...(ticket.infoRequests?.slice(0, -1) || []), updatedReq],
                  updatedAt: dbTicket.updated_at,
                };
              }));
            } else if (dbTicket.reminders_sent > (t.infoRequests?.[t.infoRequests.length - 1]?.remindersSent || 0)) {
              setTickets(p => p.map(ticket => {
                if (ticket.id !== t.id) return ticket;
                const lastReq = ticket.infoRequests?.[ticket.infoRequests.length - 1];
                if (!lastReq) return ticket;
                const updatedReq = {
                  ...lastReq,
                  remindersSent: dbTicket.reminders_sent,
                  lastReminderAt: dbTicket.last_reminder_at,
                  reminders: dbReminders,
                };
                return {
                  ...ticket,
                  infoRequests: [...(ticket.infoRequests?.slice(0, -1) || []), updatedReq],
                  updatedAt: dbTicket.updated_at,
                };
              }));
            }
          } catch (e) {
            console.error('Poll error:', e);
          }
        });
        return prev;
      });
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchDbReminders]);

  const addTicket = useCallback((data: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>): string => {
    const now = new Date().toISOString();
    const ticketId = `TK-${generateId()}`;
    const complaintItems = data.requestType === 'complaint' && data.complaintItems
      ? processNewItems(data.complaintItems)
      : data.complaintItems;

    const assignedTo = data.assignedTo || getAutoAssignment(data);
    const newTicket: Ticket = {
      ...data,
      id: ticketId,
      status: 'new' as TicketStatus,
      complaintItems,
      complaintStatus: data.requestType === 'complaint' ? 'complaint_new' as ComplaintStatus : undefined,
      returnStatus: data.requestType === 'return' ? 'return_submitted' as ReturnStatus : undefined,
      otherStatus: data.requestType === 'other' ? 'other_submitted' as OtherStatus : undefined,
      assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    setTickets(prev => [newTicket, ...prev]);
    // Sync to DB
    syncTicketToDb(newTicket);
    return ticketId;
  }, [syncTicketToDb]);

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const updateComplaintStatus = useCallback((id: string, complaintStatus: ComplaintStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, complaintStatus, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const updateReturnStatus = useCallback((id: string, returnStatus: ReturnStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, returnStatus, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const updateOtherStatus = useCallback((id: string, otherStatus: OtherStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, otherStatus, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const updateComplaintItemStatus = useCallback((ticketId: string, itemIndex: number, itemStatus: ComplaintItemStatus, actionLabel: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId || !t.complaintItems) return t;
      const updatedItems = t.complaintItems.map((item, i) => {
        if (i !== itemIndex) return item;
        const logEntry = {
          action: actionLabel,
          newStatus: itemStatus,
          agent: 'Agent',
          timestamp: new Date().toISOString(),
        };
        return {
          ...item,
          itemStatus,
          actionHistory: [...(item.actionHistory || []), logEntry],
        };
      });
      return { ...t, complaintItems: updatedItems, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const setWarehouseReceipt = useCallback((id: string, receivedAt: string, agent: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const receipt: WarehouseReceiptAudit = { receivedAt, recordedBy: agent, recordedAt: now };
      // Auto-advance complaint status to received/inspecting
      let updates: Partial<Ticket> = { warehouseReceipt: receipt, updatedAt: now };
      if (t.requestType === 'complaint') {
        updates.complaintStatus = 'complaint_received';
      } else if (t.requestType === 'return') {
        updates.returnStatus = 'return_received';
      }
      return { ...t, ...updates };
    }));
  }, []);

  const updateAssignment = useCallback((id: string, team: AssignedTeam) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, assignedTo: team, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const requestInfo = useCallback((id: string, message: string, internalNote?: string) => {
    const now = new Date().toISOString();
    const entry: InfoRequest = { message, internalNote, requestedAt: now, requestedBy: 'Agent', remindersSent: 0, reminders: [] };
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updates: Partial<Ticket> = {
        infoRequests: [...(t.infoRequests || []), entry],
        status: 'needs_info' as TicketStatus,
        updatedAt: now,
      };
      if (t.requestType === 'complaint') updates.complaintStatus = 'complaint_waiting_customer';
      return { ...t, ...updates };
    }));
  }, []);

  const markInfoProvided = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updatedRequests = (t.infoRequests || []).map((r, i, arr) =>
        i === arr.length - 1 && !r.resolvedAt ? { ...r, resolvedAt: now } : r
      );
      const updates: Partial<Ticket> = {
        infoRequests: updatedRequests,
        status: 'in_review' as TicketStatus,
        updatedAt: now,
      };
      if (t.requestType === 'complaint') updates.complaintStatus = 'complaint_in_progress';
      return { ...t, ...updates };
    }));
  }, []);

  // ---- Automatic reminder lifecycle ----
  // For demo: 48h = 48*3600*1000, 96h = 96*3600*1000, 7 days = 7*24*3600*1000
  const REMINDER_1_MS = 48 * 60 * 60 * 1000;
  const REMINDER_2_MS = 96 * 60 * 60 * 1000;
  const SUSPEND_MS = 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    const interval = setInterval(() => {
      setTickets(prev => {
        let changed = false;
        const updated = prev.map(t => {
          if (t.status !== 'needs_info') return t;
          const reqs = t.infoRequests;
          if (!reqs || reqs.length === 0) return t;
          const lastReq = reqs[reqs.length - 1];
          if (lastReq.resolvedAt) return t; // already resolved

          const elapsed = Date.now() - new Date(lastReq.requestedAt).getTime();
          const remindersSent = lastReq.remindersSent || 0;

          // Suspend after 7 days
          if (elapsed >= SUSPEND_MS) {
            changed = true;
            return {
              ...t,
              status: 'suspended' as TicketStatus,
              updatedAt: new Date().toISOString(),
            };
          }

          // Send reminder 2 after 96h
          if (remindersSent < 2 && elapsed >= REMINDER_2_MS) {
            changed = true;
            const now = new Date().toISOString();
            const reminder: ReminderLog = {
              sentAt: now,
              reminderNumber: 2,
              message: 'Stále čakáme na doplnenie informácií k vašej požiadavke. Prosíme, doplňte požadované údaje, aby sme mohli pokračovať.',
            };
            const updatedReq = { ...lastReq, remindersSent: 2, lastReminderAt: now, reminders: [...(lastReq.reminders || []), reminder] };
            return {
              ...t,
              infoRequests: [...reqs.slice(0, -1), updatedReq],
              updatedAt: now,
            };
          }

          // Send reminder 1 after 48h
          if (remindersSent < 1 && elapsed >= REMINDER_1_MS) {
            changed = true;
            const now = new Date().toISOString();
            const reminder: ReminderLog = {
              sentAt: now,
              reminderNumber: 1,
              message: 'Stále čakáme na doplnenie informácií k vašej požiadavke. Prosíme, doplňte požadované údaje, aby sme mohli pokračovať.',
            };
            const updatedReq = { ...lastReq, remindersSent: 1, lastReminderAt: now, reminders: [...(lastReq.reminders || []), reminder] };
            return {
              ...t,
              infoRequests: [...reqs.slice(0, -1), updatedReq],
              updatedAt: now,
            };
          }

          return t;
        });
        return changed ? updated : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  return (
    <TicketContext.Provider value={{ tickets, addTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus, updateComplaintItemStatus, setWarehouseReceipt, updateAssignment, requestInfo, markInfoProvided, getTicket }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};
