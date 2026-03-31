import { useState, useMemo, useRef, useEffect } from 'react';
import { MOCK_ORDERS, MockOrder } from '@/types/ticket';
import { Search, Package, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderSelectorProps {
  onSelect: (orderNumber: string, order: MockOrder) => void;
  selectedOrderNumber?: string;
  error?: string;
}

const orderEntries = Object.entries(MOCK_ORDERS);

export const OrderSelector = ({ onSelect, selectedOrderNumber, error }: OrderSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return orderEntries;
    const q = search.toLowerCase();
    return orderEntries.filter(([num, order]) =>
      num.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q) || order.customerEmail.toLowerCase().includes(q)
    );
  }, [search]);

  const selectedOrder = selectedOrderNumber ? MOCK_ORDERS[selectedOrderNumber] : null;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-medium">
        Vyberte objednávku <span className="text-destructive">*</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
          error ? 'border-destructive' : 'border-input',
          !selectedOrder && 'text-muted-foreground'
        )}
      >
        {selectedOrder ? (
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedOrderNumber}</span>
            <span className="text-muted-foreground">– {selectedOrder.customerName}</span>
          </span>
        ) : (
          <span>Vyhľadajte a vyberte objednávku...</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-card shadow-lg">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Hľadať podľa č. objednávky alebo mena..."
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Žiadne objednávky neboli nájdené.</p>
            )}
            {filtered.map(([num, order]) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  onSelect(num, order);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                  selectedOrderNumber === num && 'bg-primary/10'
                )}
              >
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{num}</span>
                    <span className="text-xs text-muted-foreground">{order.orderDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {order.customerName} · {order.customerEmail}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {order.products.map(p => `${p.name} (${p.quantity}×)`).join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
