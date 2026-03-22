/**
 * HeartLink RegisterScreen
 * 2-step registration form.
 * Step 1: name, email, phone, password
 * Step 2: gender, relationship type, DOB, country, city
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { FontSize, FontWeight, TextStyles }  from 'src/constants/topography';
import { Spacing, Radius, Shadows } from 'src/constants/layout';
import { Routes, GenderOptions, RelationshipTypes }  from 'src/constants/appConstants';
import { useForm } from 'src/hooks/useForm';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateDateOfBirth,
  validateRequired,
}  from 'utils/Validation';
import Button from 'src/component/common/Button';
import Input from 'src/component/common/Input';
import { useAuth } from 'src/store/authStore';
import Colors from 'src/constants/Colors';



// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            stepStyles.bar,
            i < current ? stepStyles.done : i === current - 1 ? stepStyles.active : stepStyles.pending,
          ]}
        />
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, marginBottom: Spacing.lg },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  done: { backgroundColor: Colors.primary },
  active: { backgroundColor: Colors.primary },
  pending: { backgroundColor: '#E5E7EB' },
});

// ─── Chip selector ────────────────────────────────────────────────────────────
function ChipGroup({ options, value, onChange, error }) {
  return (
    <View>
      <View style={chipStyles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[chipStyles.chip, value === opt.value && chipStyles.chipActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={chipStyles.icon}>{opt.icon}</Text>
            <Text style={[chipStyles.label, value === opt.value && chipStyles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={chipStyles.error}>{error}</Text>}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundGradientStart,
  },
  icon: { fontSize: 16 },
  label: { ...TextStyles.label, color: Colors.textSecondary },
  labelActive: { color: Colors.primary },
  error: { fontSize: FontSize.xs, color: '#EF4444', marginBottom: Spacing.sm },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { register, isLoading } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1 form
  const step1 = useForm(
    { name: '', email: '', phone: '', password: '' },
    {
      name: validateName,
      email: validateEmail,
      phone: validatePhone,
      password: validatePassword,
    }
  );

  // Step 2 form
  const step2 = useForm(
    { gender: '', relationshipType: '', dateOfBirth: '', country: '', city: '' },
    {
      gender: (v) => validateRequired(v, 'Gender'),
      relationshipType: (v) => validateRequired(v, 'Relationship type'),
      dateOfBirth: validateDateOfBirth,
      country: (v) => validateRequired(v, 'Country'),
      city: (v) => validateRequired(v, 'City'),
    }
  );

  const goNext = () => {
    if (!step1.validate()) return;
    setStep(2);
  };

  const handleRegister = async () => {
    if (!step2.validate()) return;
    const payload = { ...step1.values, ...step2.values };
    const result = await register(payload);
    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
        >
          <Text style={styles.backText}>← {step === 1 ? 'Back' : 'Previous'}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Step {step} of 2 — {step === 1 ? 'Basic Info' : 'About You'}</Text>
          <StepIndicator current={step} total={2} />
        </View>

        {/* Step 1 */}
        {step === 1 && (
          <View>
            <Input
              label="Full Name *"
              placeholder="Jane Doe"
              value={step1.values.name}
              onChangeText={(v) => step1.handleChange('name', v)}
              onBlur={() => step1.handleBlur('name')}
              error={step1.errors.name}
              autoCapitalize="words"
            />
            <Input
              label="Email Address *"
              placeholder="you@example.com"
              value={step1.values.email}
              onChangeText={(v) => step1.handleChange('email', v)}
              onBlur={() => step1.handleBlur('email')}
              error={step1.errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Phone Number *"
              placeholder="+234 800 000 0000"
              value={step1.values.phone}
              onChangeText={(v) => step1.handleChange('phone', v)}
              onBlur={() => step1.handleBlur('phone')}
              error={step1.errors.phone}
              keyboardType="phone-pad"
            />
            <Input
              label="Password *"
              placeholder="Minimum 8 characters"
              value={step1.values.password}
              onChangeText={(v) => step1.handleChange('password', v)}
              onBlur={() => step1.handleBlur('password')}
              error={step1.errors.password}
              secureTextEntry
            />
            <Button title="Continue →" onPress={goNext} size="lg" style={styles.actionBtn} />
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View>
            <Text style={styles.fieldLabel}>Gender *</Text>
            <ChipGroup
              options={GenderOptions}
              value={step2.values.gender}
              onChange={(v) => step2.handleChange('gender', v)}
              error={step2.errors.gender}
            />

            <Text style={styles.fieldLabel}>Relationship Type *</Text>
            <ChipGroup
              options={RelationshipTypes}
              value={step2.values.relationshipType}
              onChange={(v) => step2.handleChange('relationshipType', v)}
              error={step2.errors.relationshipType}
            />

            <Input
              label="Date of Birth *"
              placeholder="YYYY-MM-DD  (e.g. 1995-08-20)"
              value={step2.values.dateOfBirth}
              onChangeText={(v) => step2.handleChange('dateOfBirth', v)}
              onBlur={() => step2.handleBlur('dateOfBirth')}
              error={step2.errors.dateOfBirth}
              keyboardType="numeric"
            />
            <Input
              label="Country *"
              placeholder="e.g. Nigeria"
              value={step2.values.country}
              onChangeText={(v) => step2.handleChange('country', v)}
              onBlur={() => step2.handleBlur('country')}
              error={step2.errors.country}
              autoCapitalize="words"
            />
            <Input
              label="City *"
              placeholder="e.g. Lagos"
              value={step2.values.city}
              onChangeText={(v) => step2.handleChange('city', v)}
              onBlur={() => step2.handleBlur('city')}
              error={step2.errors.city}
              autoCapitalize="words"
            />

            <Button
              title="Create Account  ♥"
              onPress={handleRegister}
              loading={isLoading}
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate(Routes.LOGIN)}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: Spacing.lg,
  },
  backText: {
    ...TextStyles.bodyMedium,
    color: Colors.textSecondary,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...TextStyles.label,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textTransform: 'none',
  },
  actionBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loginText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  loginLink: {
    ...TextStyles.bodyMedium,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});