import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom data fetching hook with race-condition prevention, tab focus refresh, and optional polling.
 *
 * @param {Function} fetcherFn - Async function returning data or { data, meta }
 * @param {Array} deps - Dependency array to trigger refetch
 * @param {Object} options - Options object: { pollMs }
 * @returns {{ data: any, meta: any, loading: boolean, error: any, refetch: Function }}
 */
export function useFetch(fetcherFn, deps = [], options = {}) {
  const { pollMs } = options;
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a stable ref to the fetcher function
  const fetcherRef = useRef(fetcherFn);
  useEffect(() => {
    fetcherRef.current = fetcherFn;
  });

  // Track an active request counter for manual/focus refetches
  const activeRequestId = useRef(0);

  const executeFetch = useCallback(async (isBackground = false) => {
    const requestId = ++activeRequestId.current;

    if (!isBackground) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetcherRef.current();

      // Discard stale responses if another request started
      if (requestId === activeRequestId.current) {
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          setData(result.data);
          setMeta(result.meta);
        } else {
          setData(result);
          setMeta(null);
        }
        setLoading(false);
      }
    } catch (err) {
      if (requestId === activeRequestId.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    return executeFetch(false);
  }, [executeFetch]);

  // Main fetch effect on deps change with cancellation flag
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    const currentId = ++activeRequestId.current;

    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled && currentId === activeRequestId.current) {
          if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
            setData(result.data);
            setMeta(result.meta);
          } else {
            setData(result);
            setMeta(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && currentId === activeRequestId.current) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Tab focus listener to refetch on focus
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeFetch(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [executeFetch]);

  // Polling interval if pollMs is provided
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return;

    const intervalId = setInterval(() => {
      executeFetch(true);
    }, pollMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollMs, executeFetch]);

  return { data, meta, loading, error, refetch };
}

export default useFetch;
