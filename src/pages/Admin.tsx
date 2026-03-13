import { useState } from 'react';
import { useTickets } from '@/context/TicketContext';
import {
  TicketStatus, STATUS_LABELS, REQUEST_TYPE_LABELS, STATUS_FLOW,
  ISSUE_TYPE_LABELS, SEVERITY_LABELS, REFUND_METHOD_LABELS,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, ChevronDown, Clock, Mail, Package, Hash, AlertTriangle, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ALL_STATUSES: TicketStatus[] = ['new', 'in_review', 'approved', 'rejected', 'refund_processing', 'completed'];

const Admin = () => {
  const { tickets, updateTicketStatus } = useTickets();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.id.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q) || t.orderNumber.toLowerCase().includes(q) || t.product.toLowerCase().includes(q);
    }
    return true;
  });

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    updateTicketStatus(id, newStatus);
    toast.success(`Ticket updated to ${STATUS_LABELS[newStatus]}`);
  };

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s).length;
    return acc;
  }, {} as Record<TicketStatus, number>);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Support Dashboard</h1>
        <p className="text-muted-foreground">Manage and resolve customer requests</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(f => f === s ? 'all' : s)}
            className={`rounded-xl border p-3 text-center transition-all ${statusFilter === s ? 'border-primary bg-accent shadow-sm' : 'bg-card hover:bg-secondary'}`}>
            <div className="text-xl font-bold font-heading">{statusCounts[s]}</div>
            <div className="text-[11px] text-muted-foreground">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search by ticket ID, email, order, or product..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">No tickets found.</div>
        )}
        {filtered.map(ticket => {
          const isExpanded = expandedId === ticket.id;
          const nextStatuses = STATUS_FLOW[ticket.status];
          return (
            <div key={ticket.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <button onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                className="flex w-full items-center gap-4 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold">{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {REQUEST_TYPE_LABELS[ticket.requestType]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{ticket.product} — {ticket.description}</p>
                </div>
                <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t bg-secondary/30 p-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> {ticket.customerEmail}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" /> {ticket.orderNumber}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" /> {ticket.product}
                    </div>
                    {ticket.issueType && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" /> {ISSUE_TYPE_LABELS[ticket.issueType]}
                      </div>
                    )}
                    {ticket.severity && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                          ticket.severity === 'critical' ? 'bg-destructive' :
                          ticket.severity === 'high' ? 'bg-warning' :
                          ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                        }`} />
                        Severity: {SEVERITY_LABELS[ticket.severity]}
                      </div>
                    )}
                    {ticket.refundMethod && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Banknote className="h-4 w-4" /> {REFUND_METHOD_LABELS[ticket.refundMethod]}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm">{ticket.description}</p>

                  {ticket.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.attachments.map((src, i) => (
                        <img key={i} src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                      ))}
                    </div>
                  )}

                  {nextStatuses.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      <span className="mr-1 self-center text-xs text-muted-foreground">Actions:</span>
                      {nextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleStatusChange(ticket.id, ns)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            ns === 'approved' || ns === 'completed' ? 'bg-success text-success-foreground hover:bg-success/90' :
                            ns === 'rejected' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
                            ns === 'refund_processing' ? 'bg-primary text-primary-foreground hover:bg-primary/90' :
                            'bg-warning text-warning-foreground hover:bg-warning/90'
                          }`}>
                          {STATUS_LABELS[ns]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
