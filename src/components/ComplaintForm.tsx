import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  MOCK_ORDERS, MockOrder, MockOrderProduct,
  ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_SUGGESTED_SOLUTION,
  RequestedResolution, REQUESTED_RESOLUTION_LABELS,
  ComplaintItem,
} from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import { OrderSelector } from '@/components/OrderSelector';
import {
  ArrowLeft, ArrowRight, Loader2, Search, Package,
  User, Mail, CalendarDays, Camera, PackageX, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const COMPLAINT_TYPES: ComplaintType[] = [
  'damaged_in_transport',
  'not_delivered',
  'wrong_title',
  'manufacturing_defect',
];

interface SelectedProduct {
  name: string;
  maxQty: number;
  qty: number;
  complaintReason: ComplaintType | null;
  requestedResolution: RequestedResolution | null;
  photoFile: File | null;
  issueDescription: string;
}

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
  createdBy?: string;
}

type Step = 'lookup' | 'products' | 'confirm' | 'submitted';

export const ComplaintForm = ({ treeResult, onBack, onSubmit, createdBy }: Props) => {
  const { addTicket } = useTickets();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('lookup');
  const [ticketId, setTicketId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [foundOrderNumber, setFoundOrderNumber] = useState('');

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [iban, setIban] = useState('');
  const [damagedOnDelivery, setDamagedOnDelivery] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Overall wizard: Step 1 = type selection (done), Step 2 = this form, Step 3 = confirm/submitted
  const overallStep = step === 'confirm' || step === 'submitted' ? 3 : 2;

  const isCRM = !!createdBy;

  const selectOrder = (orderNum: string, orderData: MockOrder) => {
    setOrder(orderData);
    setFoundOrderNumber(orderNum);
    setSelectedProducts(orderData.products.map(p => ({
      name: p.name,
      maxQty: p.quantity,
      qty: 0,
      complaintReason: null,
      requestedResolution: null,
      photoFile: null,
      issueDescription: '',
    })));
    setStep('products');
  };

  const handleCRMSelect = (orderNum: string, orderData: MockOrder) => {
    selectOrder(orderNum, orderData);
  };

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
    selectOrder(trimmed, found);
    setLookupError('');
  };

  const updateProduct = (name: string, updates: Partial<SelectedProduct>) => {
    setSelectedProducts(prev => prev.map(p =>
      p.name === name ? { ...p, ...updates } : p
    ));
  };

  const activeProducts = selectedProducts.filter(p => p.qty > 0);

  const validateAndConfirm = () => {
    const newErrors: Record<string, string> = {};

    if (activeProducts.length === 0) {
      toast.error('Zadajte množstvo aspoň pri jednom produkte.');
      return;
    }

    activeProducts.forEach(p => {
      if (!p.complaintReason) {
        newErrors[`${p.name}_reason`] = 'Vyberte dôvod reklamácie.';
      }
      if (!p.requestedResolution) {
        newErrors[`${p.name}_resolution`] = 'Vyberte požadované riešenie.';
      }
      if (!p.issueDescription.trim()) {
        newErrors[`${p.name}_issue`] = 'Popíšte problém.';
      }
      if (!p.photoFile) {
        newErrors[`${p.name}_photo`] = 'Fotografia je povinná.';
      }
    });

    if (damagedOnDelivery === null) {
      newErrors.damagedOnDelivery = 'Prosím odpovedzte na túto otázku.';
    }

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
    if (!order || activeProducts.length === 0) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    const complaintItems: ComplaintItem[] = activeProducts.map(p => ({
      productName: p.name,
      quantity: p.qty,
      complaintReason: p.complaintReason!,
      requestedResolution: p.requestedResolution!,
      itemStatus: 'item_new' as const,
    }));

    const firstItem = activeProducts[0];
    const suggestedSolution = COMPLAINT_TYPE_SUGGESTED_SOLUTION[firstItem.complaintReason!];

    const id = addTicket({
      customerEmail: order.customerEmail,
      orderNumber: foundOrderNumber,
      product: activeProducts.map(p => `${p.name} (${p.qty}×)`).join(', '),
      description: activeProducts.map(p => `${p.name}: ${p.issueDescription}`).join('; '),
      attachments: [],
      requestType: 'complaint',
      issueType: firstItem.complaintReason!,
      suggestedSolution,
      requestedResolution: firstItem.requestedResolution!,
      complaintItems,
      iban: iban.replace(/\s/g, '').toUpperCase(),
      ...(createdBy ? { createdBy } : {}),
    });

    setTicketId(id);
    toast.success('Reklamácia bola odoslaná!');
    setSubmitting(false);
    setStep('submitted');
  };

  const goBack = () => {
    if (step === 'confirm') setStep('products');
    else if (step === 'products') { setStep('lookup'); setOrder(null); setSelectedProducts([]); }
    else onBack();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  const selectClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={goBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Späť
      </button>

      {/* Progress — overall wizard */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Krok {overallStep} z 3</span>
          <span>{Math.round((overallStep / 3) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(overallStep / 3) * 100}%` }} />
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

      {/* Sub-step: Order lookup (part of overall Step 2) */}
      {step === 'lookup' && (
        <div className="space-y-4">
          {isCRM ? (
            <OrderSelector
              onSelect={handleCRMSelect}
              selectedOrderNumber={foundOrderNumber || undefined}
              error={lookupError || undefined}
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Sub-step: Per-item complaint details (part of overall Step 2) */}
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

          {/* Per-item blocks */}
          <div>
            <p className="mb-3 text-sm font-medium">Ktorý produkt reklamujete?</p>
            <div className="space-y-4">
              {selectedProducts.map(product => {
                const isActive = product.qty > 0;

                return (
                  <div key={product.name} className={`rounded-xl border transition-all ${isActive ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
                    {/* Product header */}
                    <div className="flex items-center gap-3 p-4">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-sm font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">obj. {product.maxQty}×</span>
                    </div>

                    {/* Item inputs */}
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      {/* Quantity */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Reklamované množstvo
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={product.maxQty}
                          value={product.qty}
                          onChange={e => {
                            const val = Math.max(0, Math.min(product.maxQty, Number(e.target.value) || 0));
                            updateProduct(product.name, { qty: val });
                          }}
                          className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <span className="ml-2 text-xs text-muted-foreground">max {product.maxQty}</span>
                      </div>

                      {isActive && (
                        <>
                          {/* Complaint reason */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Dôvod reklamácie <span className="text-destructive">*</span>
                            </label>
                            <select
                              value={product.complaintReason || ''}
                              onChange={e => {
                                updateProduct(product.name, { complaintReason: (e.target.value || null) as ComplaintType | null });
                                setErrors(prev => { const { [`${product.name}_reason`]: _, ...rest } = prev; return rest; });
                              }}
                              className={selectClass(`${product.name}_reason`)}
                            >
                              <option value="">— Vyberte dôvod —</option>
                              {COMPLAINT_TYPES.map(type => (
                                <option key={type} value={type}>{COMPLAINT_TYPE_LABELS[type]}</option>
                              ))}
                            </select>
                            {errors[`${product.name}_reason`] && <p className="mt-1 text-xs text-destructive">{errors[`${product.name}_reason`]}</p>}
                          </div>

                          {/* Issue description */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Popis problému <span className="text-destructive">*</span>
                            </label>
                            <textarea
                              rows={2}
                              value={product.issueDescription}
                              onChange={e => {
                                updateProduct(product.name, { issueDescription: e.target.value });
                                setErrors(prev => { const { [`${product.name}_issue`]: _, ...rest } = prev; return rest; });
                              }}
                              placeholder="Popíšte, čo sa stalo s produktom..."
                              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[`${product.name}_issue`] ? 'border-destructive' : 'border-input'}`}
                            />
                            {errors[`${product.name}_issue`] && <p className="mt-1 text-xs text-destructive">{errors[`${product.name}_issue`]}</p>}
                          </div>

                          {/* Requested resolution */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Požadované riešenie <span className="text-destructive">*</span>
                            </label>
                            <select
                              value={product.requestedResolution || ''}
                              onChange={e => {
                                updateProduct(product.name, { requestedResolution: (e.target.value || null) as RequestedResolution | null });
                                setErrors(prev => { const { [`${product.name}_resolution`]: _, ...rest } = prev; return rest; });
                              }}
                              className={selectClass(`${product.name}_resolution`)}
                            >
                              <option value="">— Vyberte riešenie —</option>
                              {(['resend', 'exchange', 'refund'] as RequestedResolution[]).map(res => (
                                <option key={res} value={res}>{REQUESTED_RESOLUTION_LABELS[res]}</option>
                              ))}
                            </select>
                            {errors[`${product.name}_resolution`] && <p className="mt-1 text-xs text-destructive">{errors[`${product.name}_resolution`]}</p>}
                          </div>

                          {/* Photo upload — always required */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Fotografia <span className="text-destructive">*</span>
                            </label>
                            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs transition-colors hover:border-primary/40 ${
                              errors[`${product.name}_photo`] ? 'border-destructive' : 'border-input'
                            }`}>
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {product.photoFile ? product.photoFile.name : 'Nahrajte fotografiu produktu'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0] || null;
                                  updateProduct(product.name, { photoFile: file });
                                  setErrors(prev => { const { [`${product.name}_photo`]: _, ...rest } = prev; return rest; });
                                }}
                              />
                            </label>
                            {errors[`${product.name}_photo`] && <p className="mt-1 text-xs text-destructive">{errors[`${product.name}_photo`]}</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Damaged on delivery? */}
          <div>
            <p className="mb-2 text-sm font-medium">Bol balík poškodený pri doručení?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDamagedOnDelivery(true); setErrors(prev => { const { damagedOnDelivery: _, ...rest } = prev; return rest; }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  damagedOnDelivery === true
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                <PackageX className="h-4 w-4" />
                Áno, bol poškodený
              </button>
              <button
                type="button"
                onClick={() => { setDamagedOnDelivery(false); setErrors(prev => { const { damagedOnDelivery: _, ...rest } = prev; return rest; }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  damagedOnDelivery === false
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                Nie, nebol
              </button>
            </div>
            {errors.damagedOnDelivery && <p className="mt-1.5 text-xs text-destructive">{errors.damagedOnDelivery}</p>}
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
      {step === 'confirm' && order && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Zákazník:</span> {order.customerName}</p>
              <p><span className="text-muted-foreground">E-mail:</span> {order.customerEmail}</p>
              <p><span className="text-muted-foreground">Objednávka:</span> {foundOrderNumber}</p>
              <p><span className="text-muted-foreground">Poškodený balík pri doručení:</span> {damagedOnDelivery ? 'Áno' : 'Nie'}</p>
            </div>
            <div className="border-t pt-3 space-y-3">
              {activeProducts.map(p => (
                <div key={p.name} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">({p.qty}×)</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
                    <p>Dôvod: {p.complaintReason ? COMPLAINT_TYPE_LABELS[p.complaintReason] : '—'}</p>
                    <p>Popis: {p.issueDescription || '—'}</p>
                    <p>Riešenie: {p.requestedResolution ? REQUESTED_RESOLUTION_LABELS[p.requestedResolution] : '—'}</p>
                    {p.photoFile && <p>📷 {p.photoFile.name}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">IBAN:</span> {iban}
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

      {/* Step 3: Submitted confirmation */}
      {step === 'submitted' && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">Vaša požiadavka bola prijatá</h2>
            <p className="mt-2 text-muted-foreground">Prijali sme vašu reklamáciu a budeme vás informovať o jej stave.</p>
          </div>

          <div className="rounded-xl border bg-card p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Číslo požiadavky</span>
              <span className="font-heading text-lg font-bold text-primary">{ticketId}</span>
            </div>
            <div className="border-t pt-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Typ:</span> Reklamácia</p>
              <p><span className="text-muted-foreground">Objednávka:</span> {foundOrderNumber}</p>
              <p><span className="text-muted-foreground">Produkty:</span> {activeProducts.map(p => `${p.name} (${p.qty}×)`).join(', ')}</p>
              <p><span className="text-muted-foreground">Stav:</span> <span className="inline-flex items-center rounded-full bg-info/15 border border-info/30 px-2 py-0.5 text-xs font-semibold text-info">Prijaté</span></p>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Priebeh spracovania</p>
              <div className="flex items-center gap-2">
                {['Prijaté', 'V procese', 'Vyriešené'].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{i + 1}</div>
                    <span className={`text-xs ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    {i < 2 && <div className="h-0.5 w-4 bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/track')}
              className="flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Search className="h-4 w-4" />
              Sledovať požiadavku
            </button>
            <button
              onClick={onBack}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Odoslať ďalšiu požiadavku
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
