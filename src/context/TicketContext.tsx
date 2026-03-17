import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, TicketStatus } from '@/types/ticket';

interface TicketContextType {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
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
      product: 'Bezdrôtové slúchadlá',
      description: 'Ľavé slúchadlo prestalo fungovať po 2 týždňoch používania.',
      attachments: [],
      requestType: 'complaint',
      issueType: 'damaged',
      severity: 'high',
      status: 'new',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'TK-D4E5F6',
      customerEmail: 'marek@example.com',
      orderNumber: 'ORD-10038',
      product: 'Bežecké topánky veľkosť 10',
      description: 'Doručená nesprávna veľkosť. Objednal som veľkosť 10, dostal som veľkosť 8.',
      attachments: [],
      requestType: 'return',
      refundMethod: 'original_payment',
      withinReturnWindow: true,
      status: 'in_review',
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
      status: 'approved',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
  ]);

  const addTicket = useCallback((data: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setTickets(prev => [{
      ...data,
      id: `TK-${generateId()}`,
      status: 'new' as TicketStatus,
      createdAt: now,
      updatedAt: now,
    }, ...prev]);
  }, []);

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  return (
    <TicketContext.Provider value={{ tickets, addTicket, updateTicketStatus, getTicket }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};
