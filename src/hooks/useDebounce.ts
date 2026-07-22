import { useState, useEffect } from "react";

/**
 * Hook de debounce genérico e reutilizável.
 *
 * Retorna o valor atrasado após `delayMs` de inatividade.
 * Enquanto o valor muda dentro da janela, o timer reinicia.
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * // Só executa副作用 quando debouncedSearch mudar
 * useEffect(() => { fetch(`/api/search?q=${debouncedSearch}`); }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
