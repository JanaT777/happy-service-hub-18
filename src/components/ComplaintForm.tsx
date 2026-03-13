import { useState, useRef } from 'react';
import { useTickets } from '@/context/TicketContext';
import { SeverityLevel, SEVERITY_LABELS, ISSUE_TYPE_LABELS, IssueType } from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import { ArrowLeft, Upload, X, Loader2, AlertTriangle, Camera } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const complaintSchema = z.object({
  customerEmail: z.string().trim().email('Please enter a valid email').max(255),
  orderNumber: z.string().trim().min(1, 'Order number is required').max(50).regex(/^ORD-\d+$/i, 'Format: ORD-XXXXX'),
  product: z.string().trim().min(1, 'Product name is required').max(200),
  description: z.string().trim().min(10, 'Please provide at least 10 characters').max(2000),
});

const severityOptions: { level: SeverityLevel; color: string; desc: string }[] = [
  { level: 'low', color: 'border-success/40 bg-success/10 text-success', desc: 'Minor cosmetic issue' },
  { level: 'medium', color: 'border-info/40 bg-info/10 text-info', desc: 'Functional but impaired' },
  { level: 'high', color: 'border-warning/40 bg-warning/10 text-warning', desc: 'Major functionality lost' },
  { level: 'critical', color: 'border-destructive/40 bg-destructive/10 text-destructive', desc: 'Completely unusable / safety' },
];

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
}

export const ComplaintForm = ({ treeResult, onBack, onSubmit }: Props) => {
  const { addTicket } = useTickets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ customerEmail: '', orderNumber: '', product: '', description: '' });
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
      const reader = new FileReader();
      reader.onload = () => setAttachments(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = complaintSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (!severity) { setErrors(prev => ({ ...prev, severity: 'Please select a severity level' })); return; }
    setErrors({});
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addTicket({
      customerEmail: result.data.customerEmail,
      orderNumber: result.data.orderNumber,
      product: result.data.product,
      description: result.data.description,
      attachments,
      requestType: 'complaint',
      issueType: treeResult.issueType,
      severity,
    });
    toast.success('Complaint submitted!');
    setSubmitting(false);
    onSubmit();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Start over
      </button>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">
            Product Complaint
          </span>
          {treeResult.issueType && (
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {ISSUE_TYPE_LABELS[treeResult.issueType]}
            </span>
          )}
        </div>
        <h1 className="font-heading text-2xl font-bold">Report Your Issue</h1>
      </div>

      {/* Photo upload prompt */}
      <div className="mb-6 rounded-xl border border-dashed border-primary/30 bg-accent/50 p-5">
        <div className="flex items-start gap-3">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Upload photos of the issue</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Photos help us assess and resolve your complaint faster. Show the damage, missing parts, or wrong product.
            </p>
            <div className="flex flex-wrap gap-3">
              {attachments.map((src, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                    className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-5 w-5 text-primary-foreground" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                <span className="text-[10px]">Add Photo</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email Address</label>
          <input type="email" className={inputClass('customerEmail')} placeholder="you@example.com"
            value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} />
          {errors.customerEmail && <p className="mt-1 text-xs text-destructive">{errors.customerEmail}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Order Number</label>
            <input className={inputClass('orderNumber')} placeholder="ORD-XXXXX"
              value={form.orderNumber} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} />
            {errors.orderNumber && <p className="mt-1 text-xs text-destructive">{errors.orderNumber}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Product</label>
            <input className={inputClass('product')} placeholder="Product name"
              value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
            {errors.product && <p className="mt-1 text-xs text-destructive">{errors.product}</p>}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Severity Level</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {severityOptions.map(({ level, color, desc }) => (
              <button
                key={level}
                type="button"
                onClick={() => { setSeverity(level); setErrors(e => { const { severity: _, ...rest } = e; return rest; }); }}
                className={`rounded-lg border p-3 text-center transition-all ${
                  severity === level ? color + ' shadow-sm' : 'border-input bg-card hover:bg-secondary'
                }`}
              >
                <div className="text-sm font-semibold">{SEVERITY_LABELS[level]}</div>
                <div className="text-[10px] text-muted-foreground">{desc}</div>
              </button>
            ))}
          </div>
          {errors.severity && <p className="mt-1.5 text-xs text-destructive">{errors.severity}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Describe the Issue</label>
          <textarea rows={4} className={inputClass('description')}
            placeholder="Please describe the problem in detail. What did you expect vs what happened?"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
        </div>

        <button
          type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
};
