import { RequestType } from '@/types/ticket';
import { RotateCcw, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';

const options: { type: RequestType; title: string; description: string; icon: React.ElementType; examples: string[] }[] = [
  {
    type: 'return',
    title: 'Product Return',
    description: 'Request a return or exchange for a purchased item.',
    icon: RotateCcw,
    examples: ['Wrong size/color', 'Changed my mind', 'Defective on arrival'],
  },
  {
    type: 'complaint',
    title: 'Product Complaint',
    description: 'Report an issue or defect with a product you received.',
    icon: AlertTriangle,
    examples: ['Product not working', 'Missing parts', 'Quality issues'],
  },
  {
    type: 'other',
    title: 'Other Request',
    description: 'Any other customer service inquiry or question.',
    icon: HelpCircle,
    examples: ['Shipping question', 'Account issue', 'General inquiry'],
  },
];

export const DecisionTree = ({ onSelect }: { onSelect: (type: RequestType) => void }) => (
  <div className="mx-auto max-w-3xl px-4 py-12">
    <div className="mb-10 text-center">
      <h1 className="mb-3 font-heading text-3xl font-bold sm:text-4xl">How can we help you?</h1>
      <p className="text-muted-foreground">Select the type of request that best describes your situation.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {options.map(({ type, title, description, icon: Icon, examples }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className="group flex flex-col rounded-xl border bg-card p-6 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="mb-1 font-heading text-lg font-semibold">{title}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
          <ul className="mb-4 space-y-1">
            {examples.map(ex => (
              <li key={ex} className="text-xs text-muted-foreground">• {ex}</li>
            ))}
          </ul>
          <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Select <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      ))}
    </div>
  </div>
);
