import { useState } from 'react';
import { RequestType, IssueType, MOCK_ORDER_PRODUCTS } from '@/types/ticket';
import {
  RotateCcw, AlertTriangle, HelpCircle, ArrowRight, ArrowLeft,
  CheckCircle2, XCircle, Package, Wrench, AlertOctagon, PackageX,
} from 'lucide-react';

export interface DecisionTreeResult {
  requestType: RequestType;
  orderNumber?: string;
  products?: string[];
  selectedProduct?: string;
  withinReturnWindow?: boolean;
  issueType?: IssueType;
}

interface Props {
  onComplete: (result: DecisionTreeResult) => void;
}

type Step = 'type' | 'return-order' | 'return-window' | 'return-product' | 'complaint-issue';

export const DecisionTree = ({ onComplete }: Props) => {
  const [step, setStep] = useState<Step>('type');
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderProducts, setOrderProducts] = useState<string[]>([]);
  const [withinWindow, setWithinWindow] = useState<boolean | null>(null);

  const progress = step === 'type' ? 1 : step === 'return-order' || step === 'complaint-issue' ? 2 : 3;
  const totalSteps = requestType === 'other' ? 1 : requestType === 'complaint' ? 2 : 3;

  const handleTypeSelect = (type: RequestType) => {
    setRequestType(type);
    if (type === 'return') onComplete({ requestType: 'return' });
    else if (type === 'complaint') setStep('complaint-issue');
    else onComplete({ requestType: 'other' });
  };

  const handleOrderLookup = () => {
    const trimmed = orderNumber.trim().toUpperCase();
    if (!trimmed) { setOrderError('Prosím zadajte číslo objednávky'); return; }
    const order = MOCK_ORDER_PRODUCTS[trimmed];
    if (!order) { setOrderError('Objednávka nenájdená. Skontrolujte údaje a skúste znova.'); return; }
    const orderDate = new Date(order.date);
    const daysDiff = Math.floor((Date.now() - orderDate.getTime()) / 86400000);
    setWithinWindow(daysDiff <= 14);
    setOrderProducts(order.products);
    setOrderError('');
    setStep('return-window');
  };

  const handleProductSelect = (product: string) => {
    onComplete({
      requestType: 'return',
      orderNumber: orderNumber.trim().toUpperCase(),
      products: orderProducts,
      selectedProduct: product,
      withinReturnWindow: withinWindow ?? false,
    });
  };

  const handleIssueSelect = (issueType: IssueType) => {
    onComplete({ requestType: 'complaint', issueType });
  };

  const goBack = () => {
    if (step === 'return-order' || step === 'complaint-issue') {
      setStep('type');
      setRequestType(null);
    } else if (step === 'return-window') setStep('return-order');
    else if (step === 'return-product') setStep('return-window');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Krok {progress} z {totalSteps}</span>
          <span>{Math.round((progress / totalSteps) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(progress / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {step !== 'type' && (
        <button onClick={goBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Späť
        </button>
      )}

      {/* Krok 1: Výber typu */}
      {step === 'type' && (
        <div>
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-heading text-3xl font-bold sm:text-4xl">Ako vám môžeme pomôcť?</h1>
            <p className="text-muted-foreground">Vyberte, čo najlepšie popisuje vašu situáciu</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { type: 'return' as RequestType, title: 'Vrátenie tovaru', desc: 'Vrátenie tovaru v zákonnej 14-dňovej lehote', icon: RotateCcw, color: 'text-info' },
              { type: 'complaint' as RequestType, title: 'Reklamácie', desc: 'Nahláste vadu alebo poškodenie produktu', icon: AlertTriangle, color: 'text-warning' },
              { type: 'other' as RequestType, title: 'Interná požiadavka OZ', desc: 'Interné požiadavky k objednávkam', icon: HelpCircle, color: 'text-muted-foreground' },
            ].map(({ type, title, desc, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className="group flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${color}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mb-1 font-heading text-base font-semibold">{title}</h3>
                <p className="mb-3 text-sm text-muted-foreground">{desc}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Vybrať <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Krok 2a: Vrátenie — Vyhľadanie objednávky */}
      {step === 'return-order' && (
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Package className="h-7 w-7" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">Nájdite svoju objednávku</h2>
            <p className="text-sm text-muted-foreground">Zadajte číslo objednávky, aby sme ju mohli vyhľadať</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Číslo objednávky</label>
              <input
                className={`w-full rounded-lg border bg-background px-3.5 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${orderError ? 'border-destructive' : 'border-input'}`}
                placeholder="napr. ORD-10042"
                value={orderNumber}
                onChange={e => { setOrderNumber(e.target.value); setOrderError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleOrderLookup()}
              />
              {orderError && <p className="mt-1.5 text-xs text-destructive">{orderError}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Skúste: ORD-10042, ORD-10038, ORD-10051, ORD-10055
              </p>
            </div>
            <button
              onClick={handleOrderLookup}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Vyhľadať objednávku <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Krok 2b: Vrátenie — Kontrola okna + výber produktu */}
      {step === 'return-window' && (
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-heading text-2xl font-bold">Objednávka {orderNumber.trim().toUpperCase()}</h2>
          </div>

          <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${withinWindow ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`}>
            {withinWindow
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            }
            <div>
              <p className="text-sm font-medium">
                {withinWindow ? 'V rámci 14-dňovej lehoty na vrátenie' : 'Mimo 14-dňovej lehoty na vrátenie'}
              </p>
              <p className="text-xs text-muted-foreground">
                {withinWindow
                  ? 'Máte nárok na plné vrátenie peňazí.'
                  : 'Stále môžete mať nárok na čiastočné vrátenie alebo výmenu. Váš prípad posúdime.'}
              </p>
            </div>
          </div>

          <p className="mb-3 text-sm font-medium">Ktorý produkt chcete vrátiť?</p>
          <div className="space-y-2">
            {orderProducts.map(product => (
              <button
                key={product}
                onClick={() => handleProductSelect(product)}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{product}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Krok 2c: Reklamácia — Typ problému */}
      {step === 'complaint-issue' && (
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">Čo sa stalo?</h2>
            <p className="text-sm text-muted-foreground">Vyberte typ problému, ktorý máte</p>
          </div>
          <div className="space-y-3">
            {([
              { type: 'damaged' as IssueType, title: 'Poškodený tovar', desc: 'Tovar prišiel zlomený, poškriabaný alebo fyzicky poškodený', icon: AlertOctagon },
              { type: 'missing_part' as IssueType, title: 'Chýbajúci tovar', desc: 'Balík je nekompletný alebo chýbajú časti', icon: PackageX },
              { type: 'wrong_product' as IssueType, title: 'Nesprávny tovar', desc: 'Dostal som iný tovar ako bol objednaný', icon: Wrench },
              { type: 'other_issue' as IssueType, title: 'Iný problém', desc: 'Iný typ problému s objednávkou', icon: HelpCircle },
            ]).map(({ type, title, desc, icon: Icon }) => (
              <button
                key={type}
                onClick={() => handleIssueSelect(type)}
                className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
