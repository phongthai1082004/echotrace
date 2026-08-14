import { useState, useCallback, useRef, useEffect } from 'react';

export type ValidationRule<T> = (value: any, formValues: T) => string | null;
export type ValidatorMap<T> = Partial<Record<keyof T, ValidationRule<T>[]>>;

export interface UseFormOptions<T> {
  initialValues: T;
  validators?: ValidatorMap<T>;
  onSubmit?: (values: T) => void | Promise<void>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseFormResult<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
  
  // Methods
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  reset: (newValues?: Partial<T>) => void;
  validate: () => Partial<Record<keyof T, string>>;
}

/**
 * Hook for form state management and validation
 * @param options - Form configuration
 * @returns Form state and handlers
 * 
 * @example
 * ```tsx
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validators: {
 *     email: [
 *       (value) => !value ? 'Email is required' : null,
 *       (value) => !value.includes('@') ? 'Invalid email' : null,
 *     ],
 *     password: [
 *       (value) => !value ? 'Password is required' : null,
 *       (value) => value.length < 8 ? 'Min 8 characters' : null,
 *     ],
 *   },
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   },
 * });
 * 
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input
 *       name="email"
 *       value={form.values.email}
 *       onChange={form.handleChange}
 *       onBlur={form.handleBlur}
 *     />
 *     {form.errors.email && <span>{form.errors.email}</span>}
 *   </form>
 * );
 * ```
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validators = {},
  onSubmit,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValuesRef = useRef(initialValues);

  const isDirty = useRef(false);
  const isDirtyValue = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);

  // Validate a single field
  const validateField = useCallback((fieldName: keyof T, fieldValue: any): string | null => {
    const fieldValidators = validators[fieldName];
    
    if (!fieldValidators || fieldValidators.length === 0) {
      return null;
    }

    for (const validator of fieldValidators) {
      const error = validator(fieldValue, values);
      if (error) return error;
    }

    return null;
  }, [validators, values]);

  // Validate all fields
  const validate = useCallback((): Partial<Record<keyof T, string>> => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(values).forEach((fieldName) => {
      const key = fieldName as keyof T;
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return newErrors;
  }, [values, validateField]);

  // Handle field change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setValues(prev => ({
      ...prev,
      [name]: fieldValue,
    }));

    isDirty.current = true;

    if (validateOnChange && touched[name as keyof T]) {
      const error = validateField(name as keyof T, fieldValue);
      setErrors(prev => ({
        ...prev,
        [name]: error || undefined,
      }));
    }
  }, [validateOnChange, validateField, touched]);

  // Handle field blur
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    const key = name as keyof T;

    setTouched(prev => ({
      ...prev,
      [key]: true,
    }));

    if (validateOnBlur) {
      const error = validateField(key, values[key]);
      setErrors(prev => ({
        ...prev,
        [key]: error || undefined,
      }));
    }
  }, [validateOnBlur, validateField, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
      isDirty.current = false;
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, onSubmit]);

  // Set field value programmatically
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
    isDirty.current = true;
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name: keyof T, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [name]: error || undefined,
    }));
  }, []);

  // Reset form to initial state
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValuesRef.current, ...newValues } : initialValuesRef.current;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    isDirty.current = false;
    initialValuesRef.current = resetValues;
  }, []);

  return {
    values,
    errors,
    touched,
    isDirty: isDirtyValue,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
    validate,
  };
}
