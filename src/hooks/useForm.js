/**
 * useForm — lightweight form state + validation hook
 *
 * @example
 * const { values, errors, handleChange, validate, reset } = useForm(
 *   { email: '', password: '' },
 *   { email: validateEmail, password: validatePassword }
 * );
 */

import { useState, useCallback } from 'react';

export function useForm(initialValues = {}, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }, [errors]);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (validators[field]) {
      const error = validators[field](values[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }, [validators, values]);

  const validate = useCallback(() => {
    const newErrors = {};
    for (const [field, validator] of Object.entries(validators)) {
      const error = validator(values[field]);
      if (error) newErrors[field] = error;
    }
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(validators).map((k) => [k, true])));
    return Object.keys(newErrors).length === 0;
  }, [validators, values]);

  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldError = useCallback((field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setFieldError,
    setValues,
  };
}