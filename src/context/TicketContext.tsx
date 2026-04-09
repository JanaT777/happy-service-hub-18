import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Ticket, TicketStatus, ComplaintStatus, ReturnStatus, OtherStatus, ComplaintItem, ComplaintItemStatus, WarehouseReceiptAudit, AssignedTeam, getAutoAssignment, InfoRequest, ReminderLog, InternalNote, ActivityLogEntry, ActivityAction, STATUS_LABELS } from '@/types/ticket';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/hooks/use-notifications';

interface TicketContextType {
  tickets: Ticket[];
  loading: boolean;
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  updateComplaintStatus: (id: string, complaintStatus: ComplaintStatus) => void;
  updateReturnStatus: (id: string, returnStatus: ReturnStatus) => void;
  updateOtherStatus: (id: string, otherStatus: OtherStatus) => void;
  updateComplaintItemStatus: (ticketId: string, itemIndex: number, itemStatus: ComplaintItemStatus, actionLabel: string) => void;
  setWarehouseReceipt: (id: string, receivedAt: string, agent: string) => void;
  updateAssignment: (id: string, team: AssignedTeam) => void;
  requestInfo: (id: string, message: string, internalNote?: string) => void;
  markInfoProvided: (id: string) => void;
  addInternalNote: (id: string, text: string, author: string) => void;
  getTicket: (id: string) => Ticket | undefined;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

function mkLog(action: ActivityAction, actor: string, details?: string): ActivityLogEntry {
  return { action, actor, timestamp: new Date().toISOString(), details };
}

function appendLog(t: Ticket, log: ActivityLogEntry): ActivityLogEntry[] {
  return [...(t.activityLog || []), log];
}

// ── DB ↔ Ticket mapping ──

function dbRowToTicket(row: any): Ticket {
  return {
    id: row.ticket_code,
    customerEmail: row.customer_email,
    orderNumber: row.order_number || '',
    product: row.product || '',
    description: row.description || '',
    attachments: row.attachments || [],
    requestType: row.request_type,
    status: row.status as TicketStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issueType: row.issue_type || undefined,
    severity: row.severity || undefined,
    suggestedSolution: row.suggested_solution || undefined,
    requestedResolution: row.requested_resolution || undefined,
    complaintItems: row.complaint_items || undefined,
    complaintStatus: row.complaint_status || undefined,
    returnItems: row.return_items || undefined,
    returnStatus: row.return_status || undefined,
    refundMethod: row.refund_method || undefined,
    iban: row.iban || undefined,
    withinReturnWindow: row.within_return_window ?? undefined,
    otherStatus: row.other_status || undefined,
    otherSubtype: row.other_subtype || undefined,
    assignedTo: row.assigned_to || undefined,
    warehouseReceipt: row.warehouse_receipt || undefined,
    infoRequests: row.info_requests || undefined,
    createdBy: row.created_by || undefined,
    source: (row.source as any) || 'customer',
    internalNotes: row.internal_notes || [],
    activityLog: row.activity_log || [],
  };
}

function ticketToDbRow(t: Ticket) {
  return {
    ticket_code: t.id,
    customer_email: t.customerEmail,
    order_number: t.orderNumber || null,
    product: t.product || null,
    description: t.description || null,
    attachments: t.attachments || [],
    request_type: t.requestType,
    status: t.status,
    issue_type: t.issueType || null,
    severity: t.severity || null,
    suggested_solution: t.suggestedSolution || null,
    requested_resolution: t.requestedResolution || null,
    complaint_items: t.complaintItems || null,
    complaint_status: t.complaintStatus || null,
    return_items: t.returnItems || null,
    return_status: t.returnStatus || null,
    refund_method: t.refundMethod || null,
    iban: t.iban || null,
    within_return_window: t.withinReturnWindow ?? null,
    other_status: t.otherStatus || null,
    other_subtype: t.otherSubtype || null,
    assigned_to: t.assignedTo || 'customer_care',
    warehouse_receipt: t.warehouseReceipt || null,
    info_requests: t.infoRequests || [],
    created_by: t.createdBy || null,
    source: t.source || 'customer',
    internal_notes: t.internalNotes || [],
    activity_log: t.activityLog || [],
    needs_info_since: t.status === 'needs_info' && t.infoRequests?.length
      ? t.infoRequests[t.infoRequests.length - 1].requestedAt
      : null,
    needs_info_message: t.status === 'needs_info' && t.infoRequests?.length
      ? t.infoRequests[t.infoRequests.length - 1].message
      : null,
    reminders_sent: t.status === 'needs_info' && t.infoRequests?.length
      ? (t.infoRequests[t.infoRequests.length - 1].remindersSent || 0)
      : 0,
    updated_at: t.updatedAt,
  };
}

// ── Helper: update local + DB ──

function useDbSync() {
  const syncToDb = useCallback(async (ticket: Ticket) => {
    try {
      await supabase.from('tickets').upsert(
        ticketToDbRow(ticket) as any,
        { onConflict: 'ticket_code' } as any
      );
    } catch (e) {
      console.error('Failed to sync ticket to DB:', e);
    }
  }, []);
  return syncToDb;
}

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const syncToDb = useDbSync();

  // ── Load tickets from DB on mount ──
  useEffect(() => {
    const loadTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          setTickets(data.map(dbRowToTicket));
        } else {
          // Seed demo data if DB is empty
          const seeds = getSeedTickets();
          setTickets(seeds);
          // Persist seeds to DB
          for (const t of seeds) {
            await supabase.from('tickets').upsert(
              ticketToDbRow(t) as any,
              { onConflict: 'ticket_code' } as any
            );
          }
        }
      } catch (e) {
        console.error('Failed to load tickets:', e);
        setTickets(getSeedTickets());
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  // ── Poll DB for reminder updates every 30s ──
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: dbTickets } = await supabase
          .from('tickets')
          .select('*')
          .in('status', ['needs_info', 'suspended']);
        if (!dbTickets) return;

        for (const dbRow of dbTickets) {
          const dbReminders = await fetchDbReminders(dbRow.ticket_code);
          setTickets(prev => prev.map(t => {
            if (t.id !== dbRow.ticket_code) return t;
            const lastReq = t.infoRequests?.[t.infoRequests.length - 1];
            if (!lastReq) {
              if (dbRow.status === 'suspended' && t.status !== 'suspended') {
                return { ...t, status: 'suspended' as TicketStatus, updatedAt: dbRow.updated_at };
              }
              return t;
            }
            const needsUpdate =
              dbRow.status === 'suspended' && t.status !== 'suspended' ||
              dbRow.reminders_sent > (lastReq.remindersSent || 0);
            if (!needsUpdate) return t;
            const updatedReq = {
              ...lastReq,
              remindersSent: dbRow.reminders_sent,
              lastReminderAt: dbRow.last_reminder_at,
              reminders: dbReminders,
            };
            return {
              ...t,
              status: dbRow.status as TicketStatus,
              infoRequests: [...(t.infoRequests?.slice(0, -1) || []), updatedReq],
              updatedAt: dbRow.updated_at,
            };
          }));
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  // ── Helper to update local state + sync to DB ──
  const updateAndSync = useCallback((id: string, updater: (t: Ticket) => Ticket) => {
    setTickets(prev => {
      const updated = prev.map(t => t.id === id ? updater(t) : t);
      const ticket = updated.find(t => t.id === id);
      if (ticket) syncToDb(ticket);
      return updated;
    });
  }, [syncToDb]);

  const addTicket = useCallback(async (data: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const ticketId = `TK-${generateId()}`;
    const complaintItems = data.requestType === 'complaint' && data.complaintItems
      ? data.complaintItems.map(item => ({ ...item, itemStatus: 'item_new' as ComplaintItemStatus }))
      : data.complaintItems;

    const assignedTo = data.assignedTo || getAutoAssignment(data);
    const actor = data.source === 'crm' ? (data.createdBy || 'OZ') : 'Zákazník';
    const createdLog = mkLog('ticket_created', actor, `Typ: ${data.requestType}`);
    const newTicket: Ticket = {
      ...data,
      id: ticketId,
      status: 'new' as TicketStatus,
      complaintItems,
      complaintStatus: data.requestType === 'complaint' ? 'complaint_new' as ComplaintStatus : undefined,
      returnStatus: data.requestType === 'return' ? 'return_submitted' as ReturnStatus : undefined,
      otherStatus: data.requestType === 'other' ? 'other_submitted' as OtherStatus : undefined,
      assignedTo,
      activityLog: [createdLog],
      createdAt: now,
      updatedAt: now,
    };
    setTickets(prev => [newTicket, ...prev]);
    await syncToDb(newTicket);

    // Notify admin about new ticket
    createNotification({
      ticketCode: ticketId,
      type: 'new_ticket',
      message: `Nový tiket: ${REQUEST_TYPE_LABELS[data.requestType]} od ${data.customerEmail}`,
      recipientType: 'admin',
    });

    return ticketId;
  }, [syncToDb]);

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    const now = new Date().toISOString();
    updateAndSync(id, t => ({ ...t, status, updatedAt: now, activityLog: appendLog(t, mkLog('status_changed', 'Agent', `→ ${STATUS_LABELS[status]}`)) }));
  }, [updateAndSync]);

  const updateComplaintStatus = useCallback((id: string, complaintStatus: ComplaintStatus) => {
    updateAndSync(id, t => ({ ...t, complaintStatus, updatedAt: new Date().toISOString() }));
  }, [updateAndSync]);

  const updateReturnStatus = useCallback((id: string, returnStatus: ReturnStatus) => {
    updateAndSync(id, t => ({ ...t, returnStatus, updatedAt: new Date().toISOString() }));
  }, [updateAndSync]);

  const updateOtherStatus = useCallback((id: string, otherStatus: OtherStatus) => {
    updateAndSync(id, t => ({ ...t, otherStatus, updatedAt: new Date().toISOString() }));
  }, [updateAndSync]);

  const updateComplaintItemStatus = useCallback((ticketId: string, itemIndex: number, itemStatus: ComplaintItemStatus, actionLabel: string) => {
    updateAndSync(ticketId, t => {
      if (!t.complaintItems) return t;
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
      return { ...t, complaintItems: updatedItems, updatedAt: new Date().toISOString(), activityLog: appendLog(t, mkLog('item_status_changed', 'Agent', actionLabel)) };
    });
  }, [updateAndSync]);

  const setWarehouseReceipt = useCallback((id: string, receivedAt: string, agent: string) => {
    const now = new Date().toISOString();
    updateAndSync(id, t => {
      const receipt: WarehouseReceiptAudit = { receivedAt, recordedBy: agent, recordedAt: now };
      let updates: Partial<Ticket> = { warehouseReceipt: receipt, updatedAt: now, activityLog: appendLog(t, mkLog('warehouse_receipt', agent, `Prijaté: ${receivedAt}`)) };
      if (t.requestType === 'complaint') updates.complaintStatus = 'complaint_received';
      else if (t.requestType === 'return') updates.returnStatus = 'return_received';
      return { ...t, ...updates };
    });
  }, [updateAndSync]);

  const updateAssignment = useCallback((id: string, team: AssignedTeam) => {
    updateAndSync(id, t => ({ ...t, assignedTo: team, updatedAt: new Date().toISOString(), activityLog: appendLog(t, mkLog('assignment_changed', 'Agent', `→ ${team}`)) }));
  }, [updateAndSync]);

  const requestInfo = useCallback((id: string, message: string, internalNote?: string) => {
    const now = new Date().toISOString();
    const entry: InfoRequest = { message, internalNote, requestedAt: now, requestedBy: 'Agent', remindersSent: 0, reminders: [] };
    updateAndSync(id, t => {
      const updates: Partial<Ticket> = {
        infoRequests: [...(t.infoRequests || []), entry],
        status: 'needs_info' as TicketStatus,
        updatedAt: now,
        activityLog: appendLog(t, mkLog('info_requested', 'Agent', message)),
      };
      if (t.requestType === 'complaint') updates.complaintStatus = 'complaint_waiting_customer';
      return { ...t, ...updates };
    });
  }, [updateAndSync]);

  const markInfoProvided = useCallback((id: string) => {
    const now = new Date().toISOString();
    updateAndSync(id, t => {
      const updatedRequests = (t.infoRequests || []).map((r, i, arr) =>
        i === arr.length - 1 && !r.resolvedAt ? { ...r, resolvedAt: now } : r
      );
      const updates: Partial<Ticket> = {
        infoRequests: updatedRequests,
        status: 'in_review' as TicketStatus,
        updatedAt: now,
        activityLog: appendLog(t, mkLog('info_provided', 'Agent', 'Informácie doplnené')),
      };
      if (t.requestType === 'complaint') updates.complaintStatus = 'complaint_in_progress';
      return { ...t, ...updates };
    });
  }, [updateAndSync]);

  const addInternalNote = useCallback((id: string, text: string, author: string) => {
    const now = new Date().toISOString();
    const note: InternalNote = { text, author, createdAt: now };
    updateAndSync(id, t => ({
      ...t,
      internalNotes: [...(t.internalNotes || []), note],
      updatedAt: now,
      activityLog: appendLog(t, mkLog('note_added', author, text.length > 60 ? text.slice(0, 60) + '…' : text)),
    }));
  }, [updateAndSync]);

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  return (
    <TicketContext.Provider value={{ tickets, loading, addTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus, updateComplaintItemStatus, setWarehouseReceipt, updateAssignment, requestInfo, markInfoProvided, addInternalNote, getTicket }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};

// ── Helpers ──

async function fetchDbReminders(ticketCode: string): Promise<ReminderLog[]> {
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
}

function getSeedTickets(): Ticket[] {
  return [
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
      source: 'customer',
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
      source: 'customer',
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
      source: 'customer',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
  ];
}
