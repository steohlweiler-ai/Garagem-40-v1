
export class AuthError extends Error {
    public code: number | string;
    constructor(message = 'Authentication error', code?: number | string) {
        super(message);
        this.name = 'AuthError';
        this.code = code ?? 'AUTH_ERROR';
    }
}

export class CircuitOpenError extends Error {
    constructor(message = 'Circuit open for endpoint') {
        super(message);
        this.name = 'CircuitOpenError';
    }
}

export class NetworkError extends Error {
    constructor(message = 'Network error') {
        super(message);
        this.name = 'NetworkError';
    }
}

export class TimeoutError extends Error {
    constructor(message = 'Timeout error') {
        super(message);
        this.name = 'TimeoutError';
    }
}
