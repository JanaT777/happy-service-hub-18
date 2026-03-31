import { useState } from 'react';
import { DecisionTree, DecisionTreeResult } from '@/components/DecisionTree';
import { ReturnForm } from '@/components/ReturnForm';
import { ComplaintForm } from '@/components/ComplaintForm';
import { OtherRequestForm } from '@/components/OtherRequestForm';

const Index = () => {
  const [treeResult, setTreeResult] = useState<DecisionTreeResult | null>(null);

  const reset = () => { setTreeResult(null); };

  if (!treeResult) {
    return <DecisionTree onComplete={setTreeResult} />;
  }

  if (treeResult.requestType === 'return') {
    return <ReturnForm treeResult={treeResult} onBack={reset} onSubmit={reset} />;
  }

  if (treeResult.requestType === 'complaint') {
    return <ComplaintForm treeResult={treeResult} onBack={reset} onSubmit={reset} />;
  }

  return <OtherRequestForm onBack={reset} onSubmit={reset} />;
};

export default Index;
