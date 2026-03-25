/**
 * BSPApiError — thrown when the registry API returns a non-2xx status.
 */
export class BSPApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly retryable: boolean = false,
    ) {
        super(message)
        this.name = 'BSPApiError'
    }
}

/**
 * HttpClient — thin fetch wrapper for BSP registry API calls.
 * Node 18+ native fetch is used; no external dependency required.
 */
export class HttpClient {
    constructor(
        private readonly baseUrl: string,
        private readonly timeoutMs: number = 30_000,
    ) {}

    async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeoutMs),
        })
        return this.parseResponse<T>(res)
    }

    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            signal: AbortSignal.timeout(this.timeoutMs),
        })
        return this.parseResponse<T>(res)
    }

    async delete<T>(path: string, body?: Record<string, unknown>): Promise<T> {
        const options: RequestInit = {
            method: 'DELETE',
            signal: AbortSignal.timeout(this.timeoutMs),
        }
        if (body) {
            options.headers = { 'Content-Type': 'application/json' }
            options.body = JSON.stringify(body)
        }
        const res = await fetch(`${this.baseUrl}${path}`, options)
        return this.parseResponse<T>(res)
    }

    private async parseResponse<T>(res: Response): Promise<T> {
        let data: any
        try {
            data = await res.json()
        } catch {
            throw new BSPApiError(`Non-JSON response from registry (HTTP ${res.status})`, res.status)
        }

        if (!res.ok) {
            const retryable = res.status === 429 || res.status >= 500
            throw new BSPApiError(
                data?.error ?? `Request failed with status ${res.status}`,
                res.status,
                retryable,
            )
        }

        return data as T
    }

    /** Returns the registry API base URL for a given BSP environment. */
    static defaultBaseUrl(env: 'mainnet' | 'testnet' | 'local'): string {
        switch (env) {
            case 'mainnet': return 'https://api.biologicalsovereigntyprotocol.com'
            case 'testnet': return 'https://api-testnet.biologicalsovereigntyprotocol.com'
            case 'local':   return 'http://localhost:3000'
        }
    }
}
