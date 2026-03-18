export type RequestType = 'return' | 'complaint' | 'other';

export type TicketStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refund_processing' | 'completed';

export type ComplaintStatus = 'complaint_new' | 'complaint_in_progress' | 'complaint_approved' | 'complaint_rejected' | 'complaint_resolved';

export type IssueType = 'damaged' | 'missing_part' | 'wrong_product' | 'other_issue';
export type SuggestedSolution = 'exchange' | 'refund' | 'send_missing';
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
  withinReturnWindow?: boolean;
  issueType?: IssueType;
  severity?: SeverityLevel;
  suggestedSolution?: SuggestedSolution;
  complaintStatus?: ComplaintStatus;
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
  complaint_new: 'Nová',
  complaint_in_progress: 'V riešení',
  complaint_approved: 'Schválená',
  complaint_rejected: 'Zamietnutá',
  complaint_resolved: 'Vybavená',
};

export const COMPLAINT_STATUS_FLOW: Record<ComplaintStatus, ComplaintStatus[]> = {
  complaint_new: ['complaint_in_progress'],
  complaint_in_progress: ['complaint_approved', 'complaint_rejected'],
  complaint_approved: ['complaint_resolved'],
  complaint_rejected: ['complaint_resolved'],
  complaint_resolved: [],
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
  other_issue: 'Iný problém',
};

export const SUGGESTED_SOLUTION_LABELS: Record<SuggestedSolution, string> = {
  exchange: 'Výmena produktov',
  refund: 'Vrátenie finančných prostriedkov',
  send_missing: 'Doposlanie chýbajúcich produktov',
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

export const MOCK_ORDER_PRODUCTS: Record<string, { products: string[]; date: string }> = {
  'ORD-10042': { products: ['Bezdrôtové slúchadlá', 'Obal na telefón', 'USB kábel'], date: '2026-03-05' },
  'ORD-10038': { products: ['Bežecké topánky veľkosť 10', 'Športové ponožky'], date: '2026-02-20' },
  'ORD-10051': { products: ['Inteligentné hodinky', 'Remienok na hodinky'], date: '2026-03-10' },
  'ORD-10055': { products: ['Stojan na notebook', 'Klávesnica', 'Podložka pod myš'], date: '2026-01-15' },
};
