import { useState } from 'react';
import { useTickets } from '@/context/TicketContext';
import {
  MOCK_ORDERS, MockOrder, MockOrderProduct,
  ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_SUGGESTED_SOLUTION,
  COMPLAINT_TYPE_PHOTO_REQUIRED, SuggestedSolution, IssueType,
} from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import {
  ArrowLeft, ArrowRight, Loader2, Search, Package,
  User, Mail, CalendarDays, CheckCircle2, Camera,
} from 'lucide-react';
import { toast } from 'sonner';

const COMPLAINT_TYPES: ComplaintType[] = [
  'damaged_in_transport',
  'not_delivered',
  'wrong_title',
  'manufacturing_defect',
  'wrong_quantity',
];

interface SelectedProduct {
  name: string;
  maxQty: number;
  qty: number;
  photoFile: File | null;
}

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
}

type Step = 'lookup' | 'products' | 'confirm';

export const ComplaintForm = ({ treeResult, onBack, onSubmit }: Props) => {
  const { addTicket } = useTickets();

  const [step, setStep] = useState<Step>('lookup');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [foundOrderNumber, setFoundOrderNumber] = useState('');

  const [complaintType, setComplaintType] = useState<ComplaintType | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [iban, setIban] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const photoRequired = complaintType ? COMPLAINT_TYPE_PHOTO_REQUIRED[complaintType] : false;

  const handleLookup = () => {
    const trimmed = orderNumber.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmed || !trimmedEmail) {
      setLookupError('Vyplňte číslo objednávky aj e-mail.');
      return;
    }
    const found = MOCK_ORDERS[trimmed];
    if (!found || found.customerEmail.toLowerCase() !== trimmedEmail) {
      setLookupError('Objednávka nenájdená. Skontrolujte údaje a skúste znova.');
      return;
    }
    setOrder(found);
    setFoundOrderNumber(trimmed);
    setLookupError('');
    setStep('products');
  };

  const toggleProduct = (product: MockOrderProduct) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.name === product.name);
      if (exists) return prev.filter(p => p.name !== product.name);
      return [...prev, { name: product.name, maxQty: product.quantity, qty: 1, photoFile: null }];
    });
  };

  const updateProductQty = (name: string, qty: number) => {
    setSelectedProducts(prev => prev.map(p => p.name === name ? { ...p, qty } : p));
  };

  const updateProductPhoto = (name: string, file: File | null) => {
    setSelectedProducts(prev => prev.map(p => p.name === name ? { ...p, photoFile: file } : p));
  };

  const validateAndConfirm = () => {
    const newErrors: Record<string, string> = {};
    if (!complaintType) {
      newErrors.complaintType = 'Vyberte typ reklamácie.';
    }
    if (selectedProducts.length === 0) {
      toast.error('Vyberte aspoň jeden produkt.');
      return;
    }
    if (photoRequired) {
      selectedProducts.forEach(p => {
        if (!p.photoFile) {
          newErrors[`${p.name}_photo`] = 'Fotografia je povinná pre tento typ reklamácie.';
        }
      });
    }
    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Popíšte problém aspoň 10 znakmi.';
    }
    // IBAN always collected for complaints (refund is always a possible outcome)
    const trimmedIban = iban.replace(/\s/g, '').toUpperCase();
    if (!trimmedIban) {
      newErrors.iban = 'IBAN je povinný.';
    } else if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(trimmedIban)) {
      newErrors.iban = 'Neplatný formát IBAN (napr. SK31 1200 0000 1987 4263 7541).';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!complaintType || !order) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    const suggestedSolution = COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType];

    for (const p of selectedProducts) {
      addTicket({
        customerEmail: order.customerEmail,
        orderNumber: foundOrderNumber,
        product: `${p.name} (${p.qty}×)`,
        description,
        attachments: [],
        requestType: 'complaint',
        issueType: complaintType as IssueType,
        suggestedSolution,
        iban: iban.replace(/\s/g, '').toUpperCase(),
      });
    }
    toast.success('Reklamácia bola odoslaná!');
    setSubmitting(false);
    onSubmit();
  };

  const stepNumber = step === 'lookup' ? 1 : step === 'products' ? 2 : 3;
  const goBack = () => {
    if (step === 'confirm') setStep('products');
    else if (step === 'products') { setStep('lookup'); setOrder(null); setSelectedProducts([]); setComplaintType(null); }
    else onBack();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={goBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Späť
      </button>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Krok {stepNumber} z 3</span>
          <span>{Math.round((stepNumber / 3) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(stepNumber / 3) * 100}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <span className="mb-2 inline-block rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">
          Reklamácia
        </span>
        <h1 className="font-heading text-2xl font-bold">
          {step === 'lookup' && 'Vyhľadajte svoju objednávku'}
          {step === 'products' && 'Podrobnosti reklamácie'}
          {step === 'confirm' && 'Skontrolujte a odošlite'}
        </h1>
      </div>

      {/* Step 1: Order lookup */}
      {step === 'lookup' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Číslo objednávky</label>
            <input
              className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${lookupError ? 'border-destructive' : 'border-input'}`}
              placeholder="napr. ORD-10042"
              value={orderNumber}
              onChange={e => { setOrderNumber(e.target.value); setLookupError(''); }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-mailová adresa</label>
            <input
              type="email"
              className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${lookupError ? 'border-destructive' : 'border-input'}`}
              placeholder="vas@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setLookupError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
          </div>
          {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
          <p className="text-xs text-muted-foreground">
            Skúste: ORD-10042 / jana@example.com, ORD-10038 / marek@example.com
          </p>
          <button
            onClick={handleLookup}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" /> Vyhľadať objednávku
          </button>
        </div>
      )}

      {/* Step 2: Complaint type + product selection */}
      {step === 'products' && order && (
        <div className="space-y-6">
          {/* Order info */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{order.customerEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Doručené: {order.deliveryDate}</span>
            </div>
          </div>

          {/* Complaint type selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Typ reklamácie <span className="text-destructive">*</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {COMPLAINT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setComplaintType(type);
                    setErrors(prev => { const { complaintType: _, ...rest } = prev; return rest; });
                  }}
                  className={`rounded-xl border p-3 text-left text-sm font-medium transition-all ${
                    complaintType === type
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-input bg-card text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {COMPLAINT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            {errors.complaintType && <p className="mt-1 text-xs text-destructive">{errors.complaintType}</p>}
          </div>

          {/* Product selection */}
          <div>
            <p className="mb-3 text-sm font-medium">Vyberte produkty na reklamáciu:</p>
            <div className="space-y-3">
              {order.products.map(product => {
                const selected = selectedProducts.find(p => p.name === product.name);
                return (
                  <div key={product.name} className={`rounded-xl border transition-all ${selected ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{product.quantity}×</span>
                    </button>

                    {selected && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-3">
                        {/* Quantity */}
                        {product.quantity > 1 && (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Množstvo</label>
                            <select
                              value={selected.qty}
                              onChange={e => updateProductQty(product.name, Number(e.target.value))}
                              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {Array.from({ length: product.quantity }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {/* Photo upload - conditional based on complaint type */}
                        {photoRequired && (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Fotografia <span className="text-destructive">*</span>
                            </label>
                            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs transition-colors hover:border-primary/40 ${
                              errors[`${product.name}_photo`] ? 'border-destructive' : 'border-input'
                            }`}>
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {selected.photoFile ? selected.photoFile.name : 'Nahrajte fotografiu'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0] || null;
                                  updateProductPhoto(product.name, file);
                                  setErrors(prev => { const { [`${product.name}_photo`]: _, ...rest } = prev; return rest; });
                                }}
                              />
                            </label>
                            {errors[`${product.name}_photo`] && <p className="mt-1 text-xs text-destructive">{errors[`${product.name}_photo`]}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* IBAN */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">IBAN pre vrátenie peňazí <span className="text-destructive">*</span></label>
            <input
              className={inputClass('iban')}
              placeholder="SK00 0000 0000 0000 0000 0000"
              value={iban}
              onChange={e => { setIban(e.target.value); setErrors(prev => { const { iban: _, ...rest } = prev; return rest; }); }}
            />
            <p className="mt-1 text-xs text-muted-foreground">Použije sa na vrátenie peňazí v prípade schválenia</p>
            {errors.iban && <p className="mt-1 text-xs text-destructive">{errors.iban}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Dôvod reklamácie <span className="text-destructive">*</span></label>
            <textarea
              rows={3}
              className={inputClass('description')}
              placeholder="Popíšte problém s vybranými produktmi..."
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(prev => { const { description: _, ...rest } = prev; return rest; }); }}
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          <button
            type="button"
            onClick={validateAndConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Pokračovať <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirm' && order && complaintType && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Zákazník:</span> {order.customerName}</p>
              <p><span className="text-muted-foreground">E-mail:</span> {order.customerEmail}</p>
              <p><span className="text-muted-foreground">Objednávka:</span> {foundOrderNumber}</p>
              <p><span className="text-muted-foreground">Typ reklamácie:</span> {COMPLAINT_TYPE_LABELS[complaintType]}</p>
            </div>
            <div className="border-t pt-3 space-y-2">
              {selectedProducts.map(p => (
                <div key={p.name} className="flex flex-wrap items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">({p.qty}×)</span>
                  {p.photoFile && <span className="rounded bg-accent px-2 py-0.5 text-xs">📷 {p.photoFile.name}</span>}
                </div>
              ))}
            </div>
            <div className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">IBAN:</span> {iban}
            </div>
            <div className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">Popis:</span> {description}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
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
