import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { COMPONENT_LABELS, getHealth } from '../api/health.ts';

const CHECK_INTERVAL_MS = 60_000;

export const ApiStatusBanner: React.FC = () => {
  const { data, error } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: CHECK_INTERVAL_MS,
    retry: false,
  });

  const unavailable = data
    ? Object.entries(data.componentes)
        .filter(([, component]) => component.status !== 'ok')
        .map(([name]) => COMPONENT_LABELS[name] ?? name)
    : [];

  const message = error
    ? errorMessage(error)
    : unavailable.length > 0
    ? `Serviços indisponíveis: ${unavailable.join(', ')}. As funções que dependem deles podem falhar.`
    : null;

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[#fffbeb] border-b border-[#fcd34d] px-4 py-2 text-xs font-medium text-[#78350f] flex items-center justify-center gap-2 text-center"
    >
      <span className="material-symbols-outlined text-[18px] text-[#d97706]">warning</span>
      <span>{message}</span>
    </div>
  );
};
