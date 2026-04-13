import { useState, useEffect } from 'react';

const appVersion = __APP_VERSION__;

export function VersionInfo({ className = '' }: { className?: string }) {
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_URL as string)?.replace(/\/api\/v1$/, '') ?? '';
    fetch(`${baseUrl}/version`)
      .then((res) => res.json())
      .then((data: { version: string }) => setApiVersion(data.version))
      .catch(() => setApiVersion(null));
  }, []);

  return (
    <div className={`text-[10px] text-gray-400 ${className}`}>
      App v{appVersion}{apiVersion ? ` / API v${apiVersion}` : ''}
    </div>
  );
}
