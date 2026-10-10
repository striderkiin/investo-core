import { useCallback, useEffect, useState } from 'react';

// Loads data once and again whenever reload() is called.
export const useLoad = <T,>(load: () => Promise<T>, deps: unknown[] = []) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    run()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Could not load.'));
    return () => {
      active = false;
    };
  }, [run, tick]);

  return { data, error, reload: () => setTick((t) => t + 1) };
};
