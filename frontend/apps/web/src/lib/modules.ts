import { useEffect, useState } from "react";
import { api } from "./api";

export interface ModuleCapabilities {
  has_backend: boolean;
  has_frontend: boolean;
  has_infra: boolean;
  extras: string[];
}

export interface ModuleInfo {
  name: string;
  version: string;
  enabled: boolean;
  description?: string;
  capabilities: ModuleCapabilities;
}

interface UseModulesResult {
  modules: ModuleInfo[];
  isLoading: boolean;
  error: string | null;
  isAvailable: (name: string) => boolean;
  refetch: () => void;
}

let _cache: ModuleInfo[] | null = null;
let _promise: Promise<ModuleInfo[]> | null = null;

export function useModules(): UseModulesResult {
  const [modules, setModules] = useState<ModuleInfo[]>(_cache ?? []);
  const [isLoading, setIsLoading] = useState(_cache === null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (_cache) {
      setModules(_cache);
      setIsLoading(false);
      return;
    }
    if (!_promise) {
      _promise = api.get<ModuleInfo[]>("/api/modules").then((data) => {
        _cache = data;
        return data;
      });
    }
    setIsLoading(true);
    _promise
      .then((data) => { setModules(data); setIsLoading(false); })
      .catch((err) => { setError(String(err)); setIsLoading(false); });
  }, [tick]);

  const refetch = () => {
    _cache = null;
    _promise = null;
    setTick((t) => t + 1);
  };

  const isAvailable = (name: string) =>
    modules.some((m) => m.name === name && m.enabled);

  return { modules, isLoading, error, isAvailable, refetch };
}
