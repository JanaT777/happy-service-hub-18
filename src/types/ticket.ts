export type RequestType = 'return' | 'complaint' | 'other';

export type TicketStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refund_processing' | 'completed';

export type ComplaintStatus =
  | 'complaint_new'
  | 'complaint_pickup_ordered'
  | 'complaint_received'
  | 'complaint_inspecting'
  | 'complaint_in_progress'
  | 'complaint_waiting_customer'
  | 'complaint_approved'
  | 'complaint_refund_processing'
  | 'complaint_rejected'
  | 'complaint_resolved';

export type ReturnStatus =
  | 'return_submitted'
  | 'return_received'
  | 'return_inspecting'
  | 'return_refund_processing'
  | 'return_completed'
  | 'return_rejected';

export type OtherStatus =
  | 'other_submitted'
  | 'other_in_progress'
  | 'other_completed'
  | 'other_rejected';

export type IssueType = 'damaged' | 'missing_part' | 'wrong_product' | 'wrong_quantity' | 'other_issue';
export type SuggestedSolution = 'exchange' | 'replacement_with_pickup' | 'refund' | 'send_missing' | 'discount';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type RefundMethod = 'bank_transfer' | 'original_payment';

export interface Ticket {
  id: string;
  customerEmail: string;
  orderNumber: string;
  product: string;
  description: string;
  attachments: string[];
  requestType: RequestType;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  refundMethod?: RefundMethod;
  iban?: string;
  withinReturnWindow?: boolean;
  issueType?: IssueType;
  severity?: SeverityLevel;
  suggestedSolution?: SuggestedSolution;
  complaintStatus?: ComplaintStatus;
  returnStatus?: ReturnStatus;
  otherStatus?: OtherStatus;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Nový',
  in_review: 'V preskúmaní',
  approved: 'Schválený',
  rejected: 'Zamietnutý',
  refund_processing: 'Spracovanie vrátenia',
  completed: 'Dokončený',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  complaint_new: 'Reklamácia zaevidovaná',
  complaint_pickup_ordered: 'Objednávka zvozu',
  complaint_received: 'Zásielka evidovaná na sklade',
  complaint_inspecting: 'Kontrola tovaru',
  complaint_in_progress: 'V riešení',
  complaint_waiting_customer: 'Čaká na doplnenie od zákazníka',
  complaint_approved: 'Akceptované',
  complaint_refund_processing: 'Refundácia v procese',
  complaint_rejected: 'Reklamácia zamietnutá',
  complaint_resolved: 'Reklamácia vybavená',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  return_submitted: 'Žiadosť podaná',
  return_received: 'Zásielka evidovaná na sklade',
  return_inspecting: 'Kontrola tovaru',
  return_refund_processing: 'Akceptované – refundácia v procese',
  return_completed: 'Vybavená',
  return_rejected: 'Zamietnuté',
};

export const OTHER_STATUS_LABELS: Record<OtherStatus, string> = {
  other_submitted: 'Požiadavka zaevidovaná',
  other_in_progress: 'V riešení',
  other_completed: 'Vybavená',
  other_rejected: 'Zamietnutá',
};

export const COMPLAINT_STATUS_FLOW: Record<ComplaintStatus, ComplaintStatus[]> = {
  complaint_new: ['complaint_pickup_ordered', 'complaint_in_progress'],
  complaint_pickup_ordered: ['complaint_received'],
  complaint_received: ['complaint_inspecting'],
  complaint_inspecting: ['complaint_in_progress'],
  complaint_in_progress: ['complaint_waiting_customer', 'complaint_approved', 'complaint_rejected'],
  complaint_waiting_customer: ['complaint_in_progress'],
  complaint_approved: ['complaint_refund_processing', 'complaint_resolved'],
  complaint_refund_processing: ['complaint_resolved'],
  complaint_rejected: [],
  complaint_resolved: [],
};

export const RETURN_STATUS_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  return_submitted: ['return_received'],
  return_received: ['return_inspecting'],
  return_inspecting: ['return_refund_processing', 'return_rejected'],
  return_refund_processing: ['return_completed'],
  return_completed: [],
  return_rejected: [],
};

export const OTHER_STATUS_FLOW: Record<OtherStatus, OtherStatus[]> = {
  other_submitted: ['other_in_progress'],
  other_in_progress: ['other_completed', 'other_rejected'],
  other_completed: [],
  other_rejected: [],
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  return: 'Vrátenie produktu',
  complaint: 'Reklamácia produktu',
  other: 'Iná požiadavka',
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  damaged: 'Poškodený tovar',
  missing_part: 'Chýbajúci tovar',
  wrong_product: 'Nesprávny tovar',
  wrong_quantity: 'Nesprávne množstvo',
  other_issue: 'Iný problém',
};

export const SUGGESTED_SOLUTION_LABELS: Record<SuggestedSolution, string> = {
  exchange: 'Výmena produktov',
  replacement_with_pickup: 'Výmena so zvozom',
  refund: 'Vrátenie finančných prostriedkov',
  send_missing: 'Doposlanie chýbajúcich produktov',
  discount: 'Zľava',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: 'Nízka',
  medium: 'Stredná',
  high: 'Vysoká',
  critical: 'Kritická',
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  bank_transfer: 'Bankový prevod',
  original_payment: 'Pôvodná platobná metóda',
};

export const STATUS_FLOW: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['refund_processing', 'completed'],
  rejected: ['completed'],
  refund_processing: ['completed'],
  completed: [],
};

export type PaymentMethod = 'card' | 'bank_transfer' | 'cash';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Platobná karta',
  bank_transfer: 'Bankový prevod',
  cash: 'Dobierka',
};

export interface MockOrderProduct {
  name: string;
  quantity: number;
}

export interface MockOrder {
  customerName: string;
  customerEmail: string;
  products: MockOrderProduct[];
  orderDate: string;
  deliveryDate: string;
  paymentMethod: PaymentMethod;
}

export const MOCK_ORDERS: Record<string, MockOrder> = {
  'ORD-10042': {
    customerName: 'Jana Nováková',
    customerEmail: 'jana@example.com',
    products: [
      { name: 'Bezdrôtové slúchadlá', quantity: 1 },
      { name: 'Obal na telefón', quantity: 2 },
      { name: 'USB kábel', quantity: 3 },
    ],
    orderDate: '2026-03-01',
    deliveryDate: '2026-03-05',
    paymentMethod: 'card',
  },
  'ORD-10038': {
    customerName: 'Marek Horváth',
    customerEmail: 'marek@example.com',
    products: [
      { name: 'Bežecké topánky veľkosť 10', quantity: 1 },
      { name: 'Športové ponožky', quantity: 2 },
    ],
    orderDate: '2026-02-15',
    deliveryDate: '2026-02-20',
    paymentMethod: 'bank_transfer',
  },
  'ORD-10051': {
    customerName: 'Sara Kováčová',
    customerEmail: 'sara@example.com',
    products: [
      { name: 'Inteligentné hodinky', quantity: 1 },
      { name: 'Remienok na hodinky', quantity: 1 },
    ],
    orderDate: '2026-03-06',
    deliveryDate: '2026-03-10',
    paymentMethod: 'cash',
  },
  'ORD-10055': {
    customerName: 'Peter Szabó',
    customerEmail: 'peter@example.com',
    products: [
      { name: 'Stojan na notebook', quantity: 1 },
      { name: 'Klávesnica', quantity: 1 },
      { name: 'Podložka pod myš', quantity: 2 },
    ],
    orderDate: '2026-01-10',
    deliveryDate: '2026-01-15',
    paymentMethod: 'card',
  },
};

// Backward compat helper
export const MOCK_ORDER_PRODUCTS: Record<string, { products: string[]; date: string }> = Object.fromEntries(
  Object.entries(MOCK_ORDERS).map(([k, v]) => [k, { products: v.products.map(p => p.name), date: v.deliveryDate }])
);
