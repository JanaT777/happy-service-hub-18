import { useState } from 'react';
import { DecisionTree } from '@/components/DecisionTree';
import { TicketForm } from '@/components/TicketForm';
import { RequestType } from '@/types/ticket';

const Index = () => {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <svg className="h-10 w-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-3 font-heading text-3xl font-bold">Request Submitted!</h1>
        <p className="mb-8 text-muted-foreground">
          We've received your request and will get back to you within 24 hours.
        </p>
        <button
          onClick={() => { setSelectedType(null); setSubmitted(false); }}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  if (!selectedType) {
    return <DecisionTree onSelect={setSelectedType} />;
  }

  return (
    <TicketForm
      requestType={selectedType}
      onBack={() => setSelectedType(null)}
      onSubmit={() => setSubmitted(true)}
    />
  );
};

export default Index;
