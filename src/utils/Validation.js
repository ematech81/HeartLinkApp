/**
 * HeartLink Validation Utilities
 */

import { Validation } from "src/constants/appConstants";


export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !email.trim()) return 'Email is required';
  if (!re.test(email.trim())) return 'Enter a valid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < Validation.minPasswordLength)
    return `Password must be at least ${Validation.minPasswordLength} characters`;
  return null;
};

export const validatePhone = (phone) => {
  const re = /^\+?[1-9]\d{7,14}$/;
  if (!phone || !phone.trim()) return 'Phone number is required';
  if (!re.test(phone.replace(/\s/g, '')))
    return 'Enter a valid phone number (e.g. +234 800 000 0000)';
  return null;
};

export const validateName = (name) => {
  if (!name || !name.trim()) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 60) return 'Name must be under 60 characters';
  return null;
};

export const validateDateOfBirth = (dob) => {
  if (!dob || !dob.trim()) return 'Date of birth is required';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 'Enter a valid date (YYYY-MM-DD)';
  const age = Math.floor((Date.now() - date) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < Validation.minAge)
    return `You must be at least ${Validation.minAge} years old`;
  if (age > Validation.maxAge)
    return 'Enter a valid date of birth';
  return null;
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && !value.trim()))
    return `${fieldName} is required`;
  return null;
};

export const validateBio = (bio) => {
  if (!bio) return null; // optional
  if (bio.length > Validation.maxBioLength)
    return `Bio must be under ${Validation.maxBioLength} characters`;
  return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

/**
 * Run multiple validators on a form object at once.
 * Returns an object of { fieldName: errorMessage }.
 *
 * @example
 * const errors = validateForm({
 *   email:    [form.email,    validateEmail],
 *   password: [form.password, validatePassword],
 * });
 */
export const validateForm = (fields) => {
  const errors = {};
  for (const [key, [value, ...validators]] of Object.entries(fields)) {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors[key] = error;
        break;
      }
    }
  }
  return errors;
};


// export const validateConfirmPassword = (password, confirmPassword) => {
//   if (!confirmPassword) return 'Please confirm your password';
//   if (password !== confirmPassword) return 'Passwords do not match';
//   return null;
// };

export const hasErrors = (errors) =>
  Object.values(errors).some((e) => e !== null && e !== undefined);

