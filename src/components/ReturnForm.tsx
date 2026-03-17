import { useState, useRef } from 'react';
import { useTickets } from '@/context/TicketContext';
import { RefundMethod, REFUND_METHOD_LABELS } from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Banknote, CreditCard } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const returnSchema = z.object({
  customerEmail: z.string().trim().email('Prosím zadajte platný email').max(255),
  description: z.string().trim().min(10, 'Prosím zadajte aspoň 10 znakov').max(2000),
});

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
}

export const ReturnForm = ({ treeResult, onBack, onSubmit }: Props) => {
  const { addTicket } = useTickets();
  const [form, setForm] = useState({ customerEmail: '', description: '' });
  const [refundMethod, setRefundMethod] = useState<RefundMethod | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = returnSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (!refundMethod) {
      setErrors(prev => ({ ...prev, refundMethod: 'Prosím vyberte spôsob vrátenia peňazí' }));
      return;
    }
    setErrors({});
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addTicket({
      customerEmail: result.data.customerEmail,
      orderNumber: treeResult.orderNumber || '',
      product: treeResult.selectedProduct || '',
      description: result.data.description,
      attachments: [],
      requestType: 'return',
      refundMethod,
      withinReturnWindow: treeResult.withinReturnWindow,
    });
    toast.success('Žiadosť o vrátenie bola odoslaná!');
    setSubmitting(false);
    onSubmit();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Začať odznova
      </button>

      <div className="mb-6">
        <span className="mb-2 inline-block rounded-full bg-info/15 border border-info/30 px-3 py-1 text-xs font-semibold text-info">
          Vrátenie produktu
        </span>
        <h1 className="font-heading text-2xl font-bold">Dokončite žiadosť o vrátenie</h1>
      </div>

      {/* Súhrnná karta */}
      <div className="mb-6 rounded-xl border bg-secondary/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Objednávka</span>
          <span className="font-medium">{treeResult.orderNumber}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Produkt</span>
          <span className="font-medium">{treeResult.selectedProduct}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Lehota na vrátenie</span>
          <span className={`flex items-center gap-1 font-medium ${treeResult.withinReturnWindow ? 'text-success' : 'text-warning'}`}>
            {treeResult.withinReturnWindow ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {treeResult.withinReturnWindow ? 'Oprávnený' : 'Vyžaduje posúdenie'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">E-mailová adresa</label>
          <input
            type="email"
            className={inputClass('customerEmail')}
            placeholder="vas@email.com"
            value={form.customerEmail}
            onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
          />
          {errors.customerEmail && <p className="mt-1 text-xs text-destructive">{errors.customerEmail}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Dôvod vrátenia</label>
          <textarea
            rows={3}
            className={inputClass('description')}
            placeholder="Povedzte nám, prečo chcete vrátiť tento produkt..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Preferovaný spôsob vrátenia peňazí</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { method: 'bank_transfer' as RefundMethod, icon: Banknote, desc: 'Vrátenie na bankový účet (3-5 pracovných dní)' },
              { method: 'original_payment' as RefundMethod, icon: CreditCard, desc: 'Vrátenie pôvodnou platobnou metódou (1-3 pracovné dni)' },
            ]).map(({ method, icon: Icon, desc }) => (
              <button
                key={method}
                type="button"
                onClick={() => { setRefundMethod(method); setErrors(e => { const { refundMethod: _, ...rest } = e; return rest; }); }}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  refundMethod === method ? 'border-primary bg-accent shadow-sm' : 'border-input bg-card hover:border-primary/30'
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${refundMethod === method ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{REFUND_METHOD_LABELS[method]}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.refundMethod && <p className="mt-1.5 text-xs text-destructive">{errors.refundMethod}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Odosielanie...' : 'Odoslať žiadosť o vrátenie'}
        </button>
      </form>
    </div>
  );
};
