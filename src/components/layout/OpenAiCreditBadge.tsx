import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../../services/api';

interface OpenAiUsageSummary {
  aiEnabled: boolean;
  billingAvailable: boolean;
  spentUsd: number | null;
  limitUsd?: number | null;
  since: string;
  fetchedAt: string;
  error: string | null;
}

const REFRESH_MS = 10 * 60 * 1000;

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

/** Gasto de OpenAI del mes mostrado en el header, junto al selector de tema. */
export const OpenAiCreditBadge = () => {
  const [usage, setUsage] = useState<OpenAiUsageSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/ai/usage');
        if (!cancelled) setUsage(res.data as OpenAiUsageSummary);
      } catch {
        // non-critical
      }
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!usage || !usage.aiEnabled) return null;

  const sinceLabel = new Date(usage.since).toLocaleDateString('es-EC', { timeZone: 'UTC' });
  let label: string;
  let title: string;

  if (!usage.billingAvailable) {
    label = 'IA activa';
    title = 'Configura OPENAI_ADMIN_KEY en el backend para ver el gasto de OpenAI.';
  } else if (usage.error || usage.spentUsd === null) {
    label = 'Gasto IA: N/D';
    title = `No se pudo consultar OpenAI: ${usage.error ?? 'sin datos'}`;
  } else {
    const limitUsd = Number.isFinite(usage.limitUsd) ? (usage.limitUsd as number) : null;
    label = `Gasto IA: ${formatUsd(usage.spentUsd)}${limitUsd !== null ? `/${formatUsd(limitUsd)}` : ''}`;
    title = `Gastado en OpenAI este mes (desde ${sinceLabel})${
      limitUsd !== null ? ` de un límite mensual de ${formatUsd(limitUsd)}` : ''
    }. Actualizado: ${new Date(usage.fetchedAt).toLocaleTimeString('es-EC')}`;
  }

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-200 dark:bg-white/5 dark:border-white/10"
      title={title}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};
