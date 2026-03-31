import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, TicketStatus, ComplaintStatus, ReturnStatus, OtherStatus, ReturnItem, ComplaintItem, ComplaintItemStatus, COMPLAINT_TYPE_SUGGESTED_SOLUTION, ComplaintType, SuggestedSolution, WarehouseReceiptAudit, AssignedTeam, getAutoAssignment } from '@/types/ticket';

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
      status: 'new',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
  ]);

  // Items always start as item_new — warehouse workflow handles progression
  const processNewItems = (items: ComplaintItem[]): ComplaintItem[] => {
    return items.map(item => ({ ...item, itemStatus: 'item_new' as ComplaintItemStatus }));
  };

  const addTicket = useCallback((data: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>): string => {
    const now = new Date().toISOString();
    const ticketId = `TK-${generateId()}`;
    const complaintItems = data.requestType === 'complaint' && data.complaintItems
      ? processNewItems(data.complaintItems)
      : data.complaintItems;

    const assignedTo = data.assignedTo || getAutoAssignment(data);
    setTickets(prev => [{
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
    }, ...prev]);
    return ticketId;
  }, []);

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

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  return (
    <TicketContext.Provider value={{ tickets, addTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus, updateComplaintItemStatus, setWarehouseReceipt, updateAssignment, getTicket }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};
