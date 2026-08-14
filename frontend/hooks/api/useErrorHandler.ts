import { useCallback } from 'react';
import { useToast } from '@/components/toast';

export interface ErrorDetails {
  [key: string]: string | string[];
}

export interface FormattedError {
  message: string;
  details: string[];
  isValidationError: boolean;
}

/**
 * Hook for centralized error handling and formatting
 * Formats API errors consistently across the application
 * @returns formatError function to format errors
 * 
 * @example
 * ```tsx
 * const { formatError } = useErrorHandler();
 * 
 * try {
 *   // API call
 * } catch (err) {
 *   const formatted = formatError(err);
 *   console.log(formatted.message);
 *   console.log(formatted.details);
 *   showToast(formatted.message, 'error');
 * }
 * ```
 */
export function useErrorHandler() {
  const { showToast } = useToast();

  const formatError = useCallback((err: any): FormattedError => {
    let message = 'An unexpected error occurred';
    let details: string[] = [];
    let isValidationError = false;

    if (err instanceof Error) {
      // Parse error message which may contain structured error info
      const errorText = err.message || '';
      
      // Check if error message contains validation details
      if (errorText.includes('\n• ')) {
        isValidationError = true;
        const parts = errorText.split('\n');
        message = parts[0];
        details = parts
          .slice(1)
          .filter(line => line.startsWith('• '))
          .map(line => line.substring(2));
      } else {
        message = errorText;
      }
    } else if (typeof err === 'string') {
      message = err;
    } else if (err && typeof err === 'object') {
      // Handle structured error objects
      if ('message' in err && typeof err.message === 'string') {
        message = err.message;
      }
      
      if ('errors' in err && typeof err.errors === 'object' && err.errors !== null) {
        isValidationError = true;
        const errorDetails = err.errors as ErrorDetails;
        details = Object.entries(errorDetails)
          .map(([key, value]) => {
            const errorValue = Array.isArray(value) ? value.join(', ') : value;
            return `${key}: ${errorValue}`;
          });
      }
    }

    return {
      message,
      details,
      isValidationError,
    };
  }, []);

  const handleError = useCallback((err: any, customMessage?: string) => {
    const formatted = formatError(err);
    const displayMessage = customMessage || formatted.message || 'Operation failed';
    
    showToast(displayMessage, formatted.isValidationError ? 'warning' : 'error');
    
    if (formatted.details.length > 0) {
      console.error('Validation Errors:', formatted.details);
    }
    
    return formatted;
  }, [formatError, showToast]);

  return {
    formatError,
    handleError,
  };
}
