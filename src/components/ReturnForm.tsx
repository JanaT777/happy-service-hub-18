import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import { MOCK_ORDERS, MockOrder, MockOrderProduct, PAYMENT_METHOD_LABELS } from '@/types/ticket';
import { DecisionTreeResult } from '@/components/DecisionTree';
import {
  ArrowLeft, ArrowRight, Loader2, Search, Package,
  User, Mail, CalendarDays, CreditCard, CheckCircle2,
  Banknote, CheckCircle, XCircle, Truck,
} from 'lucide-react';
import { toast } from 'sonner';

interface SelectedProduct {
  name: string;
  maxQty: number;
  qty: number;
}

interface Props {
  treeResult: DecisionTreeResult;
  onBack: () => void;
  onSubmit: () => void;
}

type Step = 'lookup' | 'products' | 'confirm' | 'submitted';

export const ReturnForm = ({ treeResult, onBack, onSubmit }: Props) => {
  const { addTicket } = useTickets();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('lookup');
  const [ticketId, setTicketId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [foundOrderNumber, setFoundOrderNumber] = useState('');
  const [withinWindow, setWithinWindow] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [description, setDescription] = useState('');
  const [iban, setIban] = useState('');
  const [alreadySent, setAlreadySent] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // IBAN is always required for returns (refund is always a possible outcome)
  const needsIban = true;

  // Overall wizard: Step 1 = type selection (done), Step 2 = this form, Step 3 = confirm
  const overallStep = step === 'confirm' || step === 'submitted' ? 3 : 2;

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
    const deliveryDate = new Date(found.deliveryDate);
    const daysDiff = Math.floor((Date.now() - deliveryDate.getTime()) / 86400000);
    setWithinWindow(daysDiff <= 14);
    setOrder(found);
    setFoundOrderNumber(trimmed);
    setLookupError('');
    setStep('products');
  };

  const toggleProduct = (product: MockOrderProduct) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.name === product.name);
      if (exists) return prev.filter(p => p.name !== product.name);
      return [...prev, { name: product.name, maxQty: product.quantity, qty: 1 }];
    });
  };

  const updateQty = (name: string, qty: number) => {
    setSelectedProducts(prev => prev.map(p => p.name === name ? { ...p, qty } : p));
  };

  const validateAndConfirm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedProducts.length === 0) {
      toast.error('Vyberte aspoň jeden produkt.');
      return;
    }
    if (alreadySent === null) {
      newErrors.alreadySent = 'Prosím odpovedzte na túto otázku.';
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
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addTicket({
      customerEmail: order!.customerEmail,
      orderNumber: foundOrderNumber,
      product: selectedProducts.map(p => `${p.name} (${p.qty}×)`).join(', '),
      description,
      attachments: [],
      requestType: 'return',
      refundMethod: order!.paymentMethod === 'card' ? 'original_payment' : 'bank_transfer',
      withinReturnWindow: withinWindow,
      returnItems: selectedProducts.map(p => ({ name: p.name, quantity: p.qty })),
      iban: iban.replace(/\s/g, '').toUpperCase(),
    });
    toast.success('Žiadosť o vrátenie bola odoslaná!');
    setSubmitting(false);
    onSubmit();
  };

  const goBack = () => {
    if (step === 'confirm') setStep('products');
    else if (step === 'products') { setStep('lookup'); setOrder(null); setSelectedProducts([]); }
    else onBack();
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? 'border-destructive' : 'border-input'}`;

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
        <span className="mb-2 inline-block rounded-full bg-info/15 border border-info/30 px-3 py-1 text-xs font-semibold text-info">
          Vrátenie tovaru
        </span>
        <h1 className="font-heading text-2xl font-bold">
          {step === 'lookup' && 'Vyhľadajte svoju objednávku'}
          {step === 'products' && 'Vyberte produkty na vrátenie'}
          {step === 'confirm' && 'Skontrolujte a odošlite'}
        </h1>
      </div>

      {/* Sub-step: Order lookup (part of overall Step 2) */}
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

      {/* Sub-step: Product selection + details (part of overall Step 2) */}
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
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Platba: {PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
            </div>
          </div>

          {/* Return window notice */}
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${withinWindow ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`}>
            {withinWindow
              ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
            <div>
              <p className="text-sm font-medium">
                {withinWindow ? 'V rámci 14-dňovej lehoty na vrátenie' : 'Mimo 14-dňovej lehoty na vrátenie'}
              </p>
              <p className="text-xs text-muted-foreground">
                {withinWindow
                  ? 'Máte nárok na plné vrátenie peňazí.'
                  : 'Stále môžete mať nárok na čiastočné vrátenie. Váš prípad posúdime.'}
              </p>
            </div>
          </div>

          {/* Refund method info */}
          <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <div>
              <p className="text-sm font-medium">
                {order.paymentMethod === 'card'
                  ? 'Vrátenie na pôvodnú platobnú metódu'
                  : 'Vrátenie na bankový účet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.paymentMethod === 'card'
                  ? 'Platba bola uskutočnená kartou – peniaze vrátime na rovnakú kartu (1-3 pracovné dni).'
                  : `Platba bola uskutočnená ${order.paymentMethod === 'cash' ? 'dobierkou' : 'bankovým prevodom'} – na vrátenie potrebujeme váš IBAN.`}
              </p>
            </div>
          </div>

          {/* Product selection */}
          <div>
            <p className="mb-3 text-sm font-medium">Ktoré produkty chcete vrátiť?</p>
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

                    {selected && product.quantity > 1 && (
                      <div className="border-t px-4 pb-4 pt-3">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Množstvo na vrátenie</label>
                        <select
                          value={selected.qty}
                          onChange={e => updateQty(product.name, Number(e.target.value))}
                          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: product.quantity }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Already sent package? */}
          <div>
            <p className="mb-2 text-sm font-medium">Už ste balík odoslali?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setAlreadySent(true); setErrors(prev => { const { alreadySent: _, ...rest } = prev; return rest; }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  alreadySent === true
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Truck className="h-4 w-4" />
                Áno, už som odoslal/a
              </button>
              <button
                type="button"
                onClick={() => { setAlreadySent(false); setErrors(prev => { const { alreadySent: _, ...rest } = prev; return rest; }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  alreadySent === false
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                Nie, ešte nie
              </button>
            </div>
            {errors.alreadySent && <p className="mt-1.5 text-xs text-destructive">{errors.alreadySent}</p>}
          </div>

          {/* IBAN - conditional */}
          {needsIban && (
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
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Dôvod vrátenia (nepovinný údaj)</label>
            <textarea
              rows={3}
              className={inputClass('description')}
              placeholder="Povedzte nám, prečo chcete vrátiť tento produkt..."
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(prev => { const { description: _, ...rest } = prev; return rest; }); }}
            />
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
              <p><span className="text-muted-foreground">Vrátenie:</span> {order.paymentMethod === 'card' ? 'Na pôvodnú kartu' : 'Na bankový účet'}</p>
              <p><span className="text-muted-foreground">Balík odoslaný:</span> {alreadySent ? 'Áno' : 'Nie'}</p>
            </div>
            <div className="border-t pt-3 space-y-2">
              {selectedProducts.map(p => (
                <div key={p.name} className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">({p.qty}×)</span>
                </div>
              ))}
            </div>
            {needsIban && (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">IBAN:</span> {iban}
              </div>
            )}
            {description && (
              <div className="border-t pt-3 text-sm">
                <span className="text-muted-foreground">Dôvod:</span> {description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Odosielanie...' : 'Odoslať žiadosť o vrátenie'}
          </button>
        </div>
      )}
    </div>
  );
};
