import { useState, useRef } from 'react';
import { useTickets } from '@/context/TicketContext';
import { SeverityLevel, SEVERITY_LABELS, ISSUE_TYPE_LABELS, IssueType, SuggestedSolution, SUGGESTED_SOLUTION_LABELS } from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import { ArrowLeft, Upload, X, Loader2, Camera, ArrowRight, RefreshCw, Banknote, Package } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const complaintSchema = z.object({
  customerEmail: z.string().trim().email('Prosím zadajte platný email').max(255),
  orderNumber: z.string().trim().min(1, 'Číslo objednávky je povinné').max(50).regex(/^ORD-\d+$/i, 'Formát: ORD-XXXXX'),
  product: z.string().trim().min(1, 'Názov produktu je povinný').max(200),
  description: z.string().trim().min(10, 'Prosím zadajte aspoň 10 znakov').max(2000),
});

const severityOptions: { level: SeverityLevel; color: string; desc: string }[] = [
  { level: 'low', color: 'border-success/40 bg-success/10 text-success', desc: 'Drobná kozmetická chyba' },
  { level: 'medium', color: 'border-info/40 bg-info/10 text-info', desc: 'Funkčný, ale obmedzený' },
  { level: 'high', color: 'border-warning/40 bg-warning/10 text-warning', desc: 'Výrazná strata funkčnosti' },
  { level: 'critical', color: 'border-destructive/40 bg-destructive/10 text-destructive', desc: 'Úplne nepoužiteľný / bezpečnosť' },
];

// Map issue types to suggested solutions
const ISSUE_SOLUTIONS: Record<IssueType, SuggestedSolution[]> = {
  damaged: ['exchange', 'refund'],
  missing_part: ['send_missing', 'refund'],
  wrong_product: ['exchange', 'refund'],
  other_issue: ['exchange', 'refund', 'send_missing'],
};

const SOLUTION_ICONS: Record<SuggestedSolution, typeof RefreshCw> = {
  exchange: RefreshCw,
  refund: Banknote,
  send_missing: Package,
};

// Fields that are relevant per issue type
const ISSUE_FIELDS: Record<IssueType, { showSeverity: boolean; descPlaceholder: string; showPhoto: boolean }> = {
  damaged: {
    showSeverity: true,
    descPlaceholder: 'Popíšte poškodenie – kedy ste ho zistili, aký je rozsah?',
    showPhoto: true,
  },
  missing_part: {
    showSeverity: false,
    descPlaceholder: 'Čo presne chýba? Uveďte zoznam chýbajúcich položiek.',
    showPhoto: false,
  },
  wrong_product: {
    showSeverity: false,
    descPlaceholder: 'Čo ste objednali a čo ste dostali?',
    showPhoto: true,
  },
  other_issue: {
    showSeverity: false,
    descPlaceholder: 'Prosím podrobne popíšte váš problém.',
    showPhoto: false,
  },
};

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
}

type FormStep = 'details' | 'solution';

export const ComplaintForm = ({ treeResult, onBack, onSubmit }: Props) => {
  const { addTicket } = useTickets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<FormStep>('details');
  const [form, setForm] = useState({ customerEmail: '', orderNumber: '', product: '', description: '' });
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [selectedSolution, setSelectedSolution] = useState<SuggestedSolution | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const issueType = treeResult.issueType || 'other_issue';
  const fieldConfig = ISSUE_FIELDS[issueType];
  const solutions = ISSUE_SOLUTIONS[issueType];

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

  const validateAndGoToSolution = () => {
    const result = complaintSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (fieldConfig.showSeverity && !severity) {
      setErrors(prev => ({ ...prev, severity: 'Prosím vyberte úroveň závažnosti' }));
      return;
    }
    setErrors({});
    setStep('solution');
  };

  const handleSubmit = async () => {
    if (!selectedSolution) { toast.error('Prosím vyberte riešenie'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addTicket({
      customerEmail: form.customerEmail,
      orderNumber: form.orderNumber,
      product: form.product,
      description: form.description,
      attachments,
      requestType: 'complaint',
      issueType,
      severity: severity || undefined,
    });
    toast.success('Reklamácia bola odoslaná!');
    setSubmitting(false);
    onSubmit();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  const stepNumber = step === 'details' ? 1 : 2;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={step === 'solution' ? () => setStep('details') : onBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {step === 'solution' ? 'Späť na detaily' : 'Začať odznova'}
      </button>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Krok {stepNumber} z 2</span>
          <span>{stepNumber * 50}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${stepNumber * 50}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">
            Reklamácia
          </span>
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {ISSUE_TYPE_LABELS[issueType]}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold">
          {step === 'details' ? 'Vyplňte detaily reklamácie' : 'Vyberte požadované riešenie'}
        </h1>
      </div>

      {/* Step 1: Details */}
      {step === 'details' && (
        <div className="space-y-5">
          {/* Photo upload - only for relevant issue types */}
          {fieldConfig.showPhoto && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-accent/50 p-5">
              <div className="flex items-start gap-3">
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Nahrajte fotografie problému</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Fotografie nám pomôžu posúdiť a vyriešiť vašu reklamáciu rýchlejšie.
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
                      <span className="text-[10px]">Pridať foto</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <label className="mb-1.5 block text-sm font-medium">Produkt</label>
              <input className={inputClass('product')} placeholder="Názov produktu"
                value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
              {errors.product && <p className="mt-1 text-xs text-destructive">{errors.product}</p>}
            </div>
          </div>

          {/* Severity - only for damaged items */}
          {fieldConfig.showSeverity && (
            <div>
              <label className="mb-2 block text-sm font-medium">Úroveň závažnosti</label>
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
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">Popíšte problém</label>
            <textarea rows={4} className={inputClass('description')}
              placeholder={fieldConfig.descPlaceholder}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          <button
            type="button"
            onClick={validateAndGoToSolution}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Pokračovať <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Solution suggestion */}
      {step === 'solution' && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Na základe vášho problému ({ISSUE_TYPE_LABELS[issueType].toLowerCase()}) vám odporúčame tieto riešenia:
          </p>

          <div className="space-y-3">
            {solutions.map(solution => {
              const Icon = SOLUTION_ICONS[solution];
              const isSelected = selectedSolution === solution;
              return (
                <button
                  key={solution}
                  type="button"
                  onClick={() => setSelectedSolution(solution)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-input bg-card hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{SUGGESTED_SOLUTION_LABELS[solution]}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {isSelected && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedSolution}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Odosielanie...' : 'Odoslať reklamáciu'}
          </button>
        </div>
      )}
    </div>
  );
};
