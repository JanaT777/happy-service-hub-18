export type RequestType = 'return' | 'complaint' | 'other';

export type TicketStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refund_processing' | 'completed';

export interface Ticket {
  id: string;
  customerEmail: string;
  orderNumber: string;
  product: string;
  description: string;
  attachments: string[]; // base64 data URLs
  requestType: RequestType;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  refund_processing: 'Refund Processing',
  completed: 'Completed',
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  return: 'Product Return',
  complaint: 'Product Complaint',
  other: 'Other Request',
};

export const STATUS_FLOW: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['refund_processing', 'completed'],
  rejected: ['completed'],
  refund_processing: ['completed'],
  completed: [],
};
