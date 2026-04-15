import { useCallback, useEffect, useState } from 'react';

import { dataPath } from '../lib/routing';
import type { JournalSummary, ManifestData, PaperIndexItem, PaperRecord, TrendsData } from '../types/data';

interface SiteDataState {
  manifest: ManifestData | null;
  journals: JournalSummary[];
  papers: PaperIndexItem[];
  trends: TrendsData | null;
  isLoading: boolean;
  error: string | null;
}

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(dataPath(path));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return (await response.json()) as T;
};

export const useSiteData = () => {
  const [state, setState] = useState<SiteDataState>({
    manifest: null,
    journals: [],
    papers: [],
    trends: null,
    isLoading: true,
    error: null
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const manifest = await fetchJson<ManifestData>('/data/manifest.json');
      const [journals, papers, trends] = await Promise.all([
        fetchJson<JournalSummary[]>(manifest.paths.journals),
        fetchJson<PaperIndexItem[]>(manifest.paths.papersIndex),
        fetchJson<TrendsData>(manifest.paths.trends)
      ]);

      setState({
        manifest,
        journals,
        papers,
        trends,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
};

export const usePaperDetail = (paperId: string) => {
  const [paper, setPaper] = useState<PaperRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const detail = await fetchJson<PaperRecord>(`/data/papers/${paperId}.json`);
      setPaper(detail);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { paper, isLoading, error, reload: load };
};
