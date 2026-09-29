import { useEffect, useState } from 'react';

export default function usePipelineAnimation(trigger) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= 4) {
        clearInterval(interval);
      }
    }, 180);

    return () => clearInterval(interval);
  }, [trigger]);

  return step;
}

