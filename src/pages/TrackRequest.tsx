import { useState } from 'react';
import { z } from 'zod';
import { useTickets } from '@/context/TicketContext';
import { STATUS_LABELS, REQUEST_TYPE_LABELS, SEVERITY_LABELS, REFUND_METHOD_LABELS, ISSUE_TYPE_LABELS, Ticket } from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Search, Mail, Hash, Package, AlertTriangle, Banknote, Clock, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const searchSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }).max(255),
  orderNumber: z.string().trim().min(1, { message: 'Please enter an order number' }).max(50),
});

const STATUS_ORDER = ['new', 'in_review', 'approved', 'rejected', 'refund_processing', 'completed'] as const;

const StatusTimeline = ({ ticket }: { ticket: Ticket }) => {
  const currentIdx = STATUS_ORDER.indexOf(ticket.status);
  // Build a relevant path based on ticket flow
  const isRejected = ticket.status === 'rejected';
  const hasRefund = ticket.requestType === 'return' || ticket.status === 'refund_processing';
  
  let path = ['new', 'in_review'];
  if (isRejected) {
    path.push('rejected');
  } else {
    path.push('approved');
    if (hasRefund) path.push('refund_processing');
    path.push('completed');
  }

  return (
    <div className="flex flex-wrap items-center gap-1 py-3">
      {path.map((step, i) => {
        const stepIdx = STATUS_ORDER.indexOf(step as any);
        const isDone = stepIdx < currentIdx || (stepIdx === currentIdx && step === 'completed');
        const isCurrent = step === ticket.status;
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isCurrent ? 'border-primary bg-primary/10 text-primary' :
              isDone ? 'border-success/30 bg-success/10 text-success' :
              'border-border bg-muted/50 text-muted-foreground'
            }`}>
              {isDone ? <CheckCircle2 className="h-3 w-3" /> : isCurrent ? <Clock className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {STATUS_LABELS[step as keyof typeof STATUS_LABELS]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TrackRequest = () => {
  const { tickets } = useTickets();
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [results, setResults] = useState<Ticket[] | null>(null);
  const [errors, setErrors] = useState<{ email?: string; orderNumber?: string }>({});
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = searchSchema.safeParse({ email, orderNumber });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.errors.forEach(err => {
        const field = err.path[0] as keyof typeof errors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSearched(true);
    const found = tickets.filter(
      t => t.customerEmail.toLowerCase() === parsed.data.email.toLowerCase() &&
           t.orderNumber.toLowerCase() === parsed.data.orderNumber.toLowerCase()
    );
    setResults(found);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Track Your Request</h1>
        <p className="mt-1 text-muted-foreground">Enter your email and order number to check the status of your request.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.email ? 'border-destructive' : ''}`} />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Order Number</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
                placeholder="ORD-XXXXX"
                className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.orderNumber ? 'border-destructive' : ''}`} />
            </div>
            {errors.orderNumber && <p className="mt-1 text-xs text-destructive">{errors.orderNumber}</p>}
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full gap-2">
          <Search className="h-4 w-4" /> Look Up Request
        </Button>
      </form>

      {searched && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="rounded-xl border bg-card py-12 text-center">
              <p className="text-muted-foreground">No requests found for this email and order number.</p>
              <p className="mt-1 text-sm text-muted-foreground">Please double-check your details and try again.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{results.length} request{results.length > 1 ? 's' : ''} found</p>
              {results.map(ticket => (
                <div key={ticket.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-heading text-sm font-bold">{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {REQUEST_TYPE_LABELS[ticket.requestType]}
                      </span>
                    </div>

                    <StatusTimeline ticket={ticket} />

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4 shrink-0" /> {ticket.product}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" /> Submitted {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </div>
                      {ticket.issueType && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertTriangle className="h-4 w-4 shrink-0" /> {ISSUE_TYPE_LABELS[ticket.issueType]}
                        </div>
                      )}
                      {ticket.severity && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                            ticket.severity === 'critical' ? 'bg-destructive' :
                            ticket.severity === 'high' ? 'bg-warning' :
                            ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                          }`} />
                          {SEVERITY_LABELS[ticket.severity]}
                        </div>
                      )}
                      {ticket.refundMethod && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Banknote className="h-4 w-4 shrink-0" /> {REFUND_METHOD_LABELS[ticket.refundMethod]}
                        </div>
                      )}
                    </div>

                    <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm">{ticket.description}</p>

                    <p className="mt-2 text-xs text-muted-foreground">Last updated: {format(new Date(ticket.updatedAt), 'MMM d, yyyy · h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TrackRequest;
