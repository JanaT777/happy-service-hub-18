import { useState, useRef } from 'react';
import { useTickets } from '@/context/TicketContext';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const otherSchema = z.object({
  customerEmail: z.string().trim().email('Prosím zadajte platný email').max(255),
  orderNumber: z.string().trim().min(1, 'Číslo objednávky je povinné').max(50),
  product: z.string().trim().min(1, 'Produkt alebo téma je povinná').max(200),
  description: z.string().trim().min(10, 'Prosím zadajte aspoň 10 znakov').max(2000),
});

interface Props {
  onBack: () => void;
  onSubmit: () => void;
  createdBy?: string;
}

export const OtherRequestForm = ({ onBack, onSubmit, createdBy }: Props) => {
  const { addTicket } = useTickets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ customerEmail: '', orderNumber: '', product: '', description: '' });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error('Súbor je príliš veľký (max 5MB)'); return; }
      const reader = new FileReader();
      reader.onload = () => setAttachments(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = otherSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addTicket({
      customerEmail: result.data.customerEmail,
      orderNumber: result.data.orderNumber,
      product: result.data.product,
      description: result.data.description,
      attachments,
      requestType: 'other',
      ...(createdBy ? { createdBy } : {}),
    });
    toast.success('Požiadavka bola odoslaná!');
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
        <span className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          Iná požiadavka
        </span>
        <h1 className="font-heading text-2xl font-bold">Odošlite vašu požiadavku</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">E-mailová adresa</label>
          <input type="email" className={inputClass('customerEmail')} placeholder="vas@email.com"
            value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} />
          {errors.customerEmail && <p className="mt-1 text-xs text-destructive">{errors.customerEmail}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Číslo objednávky</label>
            <input className={inputClass('orderNumber')} placeholder="ORD-XXXXX"
              value={form.orderNumber} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} />
            {errors.orderNumber && <p className="mt-1 text-xs text-destructive">{errors.orderNumber}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Produkt / Téma</label>
            <input className={inputClass('product')} placeholder="O čo ide?"
              value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
            {errors.product && <p className="mt-1 text-xs text-destructive">{errors.product}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Popis</label>
          <textarea rows={4} className={inputClass('description')}
            placeholder="Prosím podrobne popíšte vašu požiadavku..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Prílohy (voliteľné)</label>
          <div className="flex flex-wrap gap-3">
            {attachments.map((src, i) => (
              <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                  className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <X className="h-5 w-5 text-primary-foreground" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Upload className="h-5 w-5" /><span className="text-[10px]">Nahrať</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Odosielanie...' : 'Odoslať požiadavku'}
        </button>
      </form>
    </div>
  );
};
