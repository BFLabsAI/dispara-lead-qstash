// Network error handling utilities for better user experience

export interface NetworkError {
  message: string;
  isNetworkError: boolean;
  isRetryable: boolean;
  suggestedAction: string;
}

export const parseNetworkError = (error: any): NetworkError => {
  const errorMessage = error?.message || 'Erro desconhecido';
  const errorStatus = error?.status;
  const errorCode = error?.code;

  // QUIC protocol errors
  if (errorMessage.includes('QUIC') || errorMessage.includes('net::ERR_QUIC')) {
    return {
      message: 'Erro de protocolo de conexão',
      isNetworkError: true,
      isRetryable: true,
      suggestedAction: 'Verifique sua conexão com a internet e tente novamente.'
    };
  }

  // Connection timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return {
      message: 'Tempo limite de conexão excedido',
      isNetworkError: true,
      isRetryable: true,
      suggestedAction: 'A conexão está lenta. Verifique sua internet e tente novamente.'
    };
  }

  // Network unreachable
  if (errorMessage.includes('network') || errorMessage.includes('NetworkError') || errorStatus === 0) {
    return {
      message: 'Sem conexão com a internet',
      isNetworkError: true,
      isRetryable: true,
      suggestedAction: 'Verifique sua conexão com a internet.'
    };
  }

  // Server errors (5xx)
  if (errorStatus >= 500 && errorStatus < 600) {
    return {
      message: 'Erro interno do servidor',
      isNetworkError: false,
      isRetryable: true,
      suggestedAction: 'O servidor está temporariamente indisponível. Tente novamente em alguns instantes.'
    };
  }

  // Rate limiting (429)
  if (errorStatus === 429) {
    return {
      message: 'Muitas requisições realizadas',
      isNetworkError: false,
      isRetryable: true,
      suggestedAction: 'Aguarde alguns momentos antes de tentar novamente.'
    };
  }

  // Client errors (4xx)
  if (errorStatus >= 400 && errorStatus < 500) {
    return {
      message: 'Erro na requisição',
      isNetworkError: false,
      isRetryable: false,
      suggestedAction: 'Verifique os dados enviados e tente novamente.'
    };
  }

  // Database connection errors
  if (errorMessage.includes('database') || errorMessage.includes('connection')) {
    return {
      message: 'Erro de conexão com o banco de dados',
      isNetworkError: true,
      isRetryable: true,
      suggestedAction: 'Não foi possível conectar ao banco de dados. Tente novamente.'
    };
  }

  // Default error
  return {
    message: errorMessage,
    isNetworkError: false,
    isRetryable: false,
    suggestedAction: 'Se o problema persistir, contate o suporte.'
  };
};

export const getRetryDelay = (attemptNumber: number, baseDelay: number = 1000): number => {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
};

export const shouldRetry = (error: any, attemptNumber: number, maxRetries: number): boolean => {
  if (attemptNumber >= maxRetries) {
    return false;
  }

  const parsedError = parseNetworkError(error);
  return parsedError.isRetryable;
};