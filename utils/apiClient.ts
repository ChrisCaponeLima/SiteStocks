/**
 * Garante que a URL seja absoluta no lado do servidor (SSR)
 * para resolver corretamente chamadas useFetch/fetch para a API local.
 *
 * @param path O caminho relativo da API (ex: /api/cotista/summary).
 * @returns A URL completa (ex: http://localhost:3000/api/...) ou relativa (/api/...) no cliente.
 */
export function apiUrl(path: string): string {
    // 🛑 CRÍTICO: Idealmente, usar useRuntimeConfig().public.apiBase aqui.
    // Usando a condicional process.server para solução imediata e elegante.
    const base = process.server 
        ? 'http://localhost:3000' 
        : '';
        
    // Garante que o path comece com '/'
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${base}${sanitizedPath}`;
}