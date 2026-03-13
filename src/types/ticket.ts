export type RequestType = 'return' | 'complaint' | 'other';

export type TicketStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refund_processing' | 'completed';

export type IssueType = 'damaged' | 'missing_part' | 'wrong_product';
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
  // Return-specific
  refundMethod?: RefundMethod;
  withinReturnWindow?: boolean;
  // Complaint-specific
  issueType?: IssueType;
  severity?: SeverityLevel;
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

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  damaged: 'Damaged Product',
  missing_part: 'Missing Parts',
  wrong_product: 'Wrong Product Received',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  bank_transfer: 'Bank Transfer',
  original_payment: 'Original Payment Method',
};

export const STATUS_FLOW: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['refund_processing', 'completed'],
  rejected: ['completed'],
  refund_processing: ['completed'],
  completed: [],
};

// Mock products for order lookup
export const MOCK_ORDER_PRODUCTS: Record<string, { products: string[]; date: string }> = {
  'ORD-10042': { products: ['Wireless Headphones', 'Phone Case', 'USB Cable'], date: '2026-03-05' },
  'ORD-10038': { products: ['Running Shoes Size 10', 'Sports Socks'], date: '2026-02-20' },
  'ORD-10051': { products: ['Smart Watch', 'Watch Band'], date: '2026-03-10' },
  'ORD-10055': { products: ['Laptop Stand', 'Keyboard', 'Mouse Pad'], date: '2026-01-15' },
};
