import { useState, useEffect } from 'react';
import { apiClient } from '@/api/client.ts';

const appVersion = __APP_VERSION__;

export function VersionInfo({ className = '' }: { className?: string }) {
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ version: string }>('/version')
      .then((res) => setApiVersion(res.data.version))
      .catch(() => setApiVersion(null));
  }, []);

  return (
    <div className={`text-[10px] text-gray-400 ${className}`}>
      App v{appVersion}{apiVersion ? ` / API v${apiVersion}` : ''}
    </div>
  );
}
