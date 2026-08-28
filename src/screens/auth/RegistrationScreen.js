/**
 * HeartLink RegisterScreen
 * Multi-step registration form (up to 9 steps depending on relationship type).
 *
 * Step 1 (name, email, phone, password) creates and verifies the account on
 * its own — submitting it registers immediately, sends an email verification
 * code, and hands off to VerifyEmailScreen (see handleStep1Register). Once
 * verified, the user lands back on this screen at step 2, authenticated,
 * via AppNavigator's CompleteProfile gate (isProfileComplete:false) — the
 * same "create now, complete profile later" path Google sign-in already
 * uses (googleMode). Steps 2-9 collect the remaining profile fields and
 * submit them via the authenticated PUT /api/users/profile, finishing with
 * isProfileComplete:true (see handleRegister).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';

// import DateTimePicker from '@react-native-community/datetimepicker';

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
import AppStatusBar from 'src/component/common/AppStatusBar';
import DatePickerField from 'src/component/datePicker';
import { AuthAPI, UserAPI } from 'services/ApiServices';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfilePicture } from 'src/utils/uploadImage';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const EDUCATION_OPTIONS = [
  { label: 'High School',         value: 'high_school' },
  { label: 'Diploma / OND',       value: 'diploma' },
  { label: "Bachelor's Degree",   value: 'bachelors' },
  { label: "Master's Degree",     value: 'masters' },
  { label: 'PhD / Doctorate',     value: 'phd' },
  { label: 'Vocational Training', value: 'vocational' },
  { label: 'No Formal Education', value: 'none' },
];
 
const DRINK_OPTIONS = [
  { label: "Don't drink",  value: 'never',        icon: '🚫' },
  { label: 'Socially',     value: 'socially',     icon: '🥂' },
  { label: 'Occasionally', value: 'occasionally', icon: '🍷' },
  { label: 'Regularly',    value: 'regularly',    icon: '🍺' },
];
 
const SMOKE_OPTIONS = [
  { label: "Don't smoke",   value: 'never',        icon: '🚫' },
  { label: 'Occasionally',  value: 'occasionally', icon: '🚬' },
  { label: 'Regularly',     value: 'regularly',    icon: '💨' },
  { label: 'Trying to quit',value: 'quitting',     icon: '💪' },
];
 
const RELIGION_OPTIONS = [
  { label: 'Christianity', value: 'christianity', icon: '✝️' },
  { label: 'Islam',        value: 'islam',        icon: '☪️' },
  { label: 'Hinduism',     value: 'hinduism',     icon: '🕉️' },
  { label: 'Buddhism',     value: 'buddhism',     icon: '☸️' },
  { label: 'Judaism',      value: 'judaism',      icon: '✡️' },
  { label: 'Traditional',  value: 'traditional',  icon: '🌿' },
  { label: 'Agnostic',     value: 'agnostic',     icon: '🤔' },
  { label: 'Atheist',      value: 'atheist',      icon: '⚛️' },
  { label: 'Other',        value: 'other',        icon: '🌍' },
];
 
const INTEREST_OPTIONS = [
  'Travel', 'Music', 'Movies', 'Cooking', 'Sports',
  'Reading', 'Gaming', 'Fitness', 'Art', 'Dancing',
  'Photography', 'Fashion', 'Tech', 'Nature', 'Foodie',
];
 
const LOOKING_FOR_OPTIONS = [
  { label: 'A Man',   value: 'male',   icon: '👨' },
  { label: 'A Woman', value: 'female', icon: '👩' },
  { label: 'Either',  value: 'both',   icon: '👫' },
];
 
const KID_AGE_OPTIONS = [
  'Under 1', '1-3', '4-6', '7-10', '11-14', '15-17', '18+',
];
 
// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i}
          style={[indicatorStyles.bar, i < current ? indicatorStyles.done : indicatorStyles.pending]}
        />
      ))}
    </View>
  );
}
const indicatorStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, marginBottom: Spacing.lg },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  done: { backgroundColor: Colors.primary },
  pending: { backgroundColor: '#E5E7EB' },
});
 
function ChipGroup({ options, value, onChange, error, multi = false }) {
  const isSelected = (v) =>
    multi ? (Array.isArray(value) && value.includes(v)) : value === v;
 
  const handlePress = (v) => {
    if (!multi) { onChange(v); return; }
    const current = Array.isArray(value) ? value : [];
    onChange(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  };
 
  return (
    <View>
      <View style={chipStyles.row}>
        {options.map((opt) => {
          const val = opt.value || opt;
          const lbl = opt.label || opt;
          return (
            <TouchableOpacity
              key={val}
              style={[chipStyles.chip, isSelected(val) && chipStyles.chipActive]}
              onPress={() => handlePress(val)}
              activeOpacity={0.75}
            >
              {opt.icon ? <Text style={chipStyles.icon}>{opt.icon}</Text> : null}
              <Text style={[chipStyles.label, isSelected(val) && chipStyles.labelActive]}>
                {lbl}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={chipStyles.error}>{error}</Text> : null}
    </View>
  );
}
const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: 35, },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: '#E5E7EB', backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  icon: { fontSize: 15 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  labelActive: { color: Colors.white, fontWeight: FontWeight.semibold },
  error: { fontSize: FontSize.xs, color: '#EF4444', marginBottom: Spacing.sm },
});
 
function SectionTitle({ emoji, title, subtitle }) {
  return (
    <View style={sectionStyles.container}>
      {emoji ? <Text style={sectionStyles.emoji}>{emoji}</Text> : null}
      <Text style={sectionStyles.title}>{title}</Text>
      {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  emoji: { fontSize: 36, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
});
 
// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation, route }) {
  const { loginWithToken, updateUser } = useAuth();

  // ── "Complete profile" mode: skip step 1, start from step 2 ───────────────
  // Originally Google-only ("googleMode" — an already-authenticated user
  // whose account exists but has no profile-detail fields yet), this now
  // also covers local email/password and phone accounts (2026-08-27):
  // step 1 (name/email/phone/password) submits immediately on its own (see
  // handleStep1Register below) and creates the account right away, so by
  // the time a user reaches step 2 they're always already authenticated —
  // via Google, or via VerifyEmailScreen/phone-otp login after step 1. The
  // param name stays `googleMode` since AppNavigator's CompleteProfile gate
  // and LoginScreen both already pass it.
  const googleMode  = route?.params?.googleMode  ?? false;
  const googleToken = route?.params?.googleToken ?? null;
  const googleUser  = route?.params?.googleUser  ?? null;

  const [step, setStep]       = useState(googleMode ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
 
  // Step 1
  const step1 = useForm(
    { name: '', email: '', phone: '', password: '' },
    { name: validateName, email: validateEmail, phone: validatePhone, password: validatePassword }
  );
 
  // Step 2
  const step2 = useForm(
    { gender: '', relationshipType: '', dateOfBirth: '', country: '', city: '' },
    {
      gender:           (v) => validateRequired(v, 'Gender'),
      relationshipType: (v) => validateRequired(v, 'Relationship type'),
      dateOfBirth: (v) => {
        if (!v?.trim()) return 'Date of birth is required';
        const age = Math.floor((Date.now() - new Date(v)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) return 'You must be at least 18 years old';
        if (age > 80) return 'Enter a valid date of birth';
        return null;
      },
      country: (v) => validateRequired(v, 'Country'),
      city:    (v) => validateRequired(v, 'City'),
    }
  );
 
  // Steps 3–9 local state
  const [lookingFor,   setLookingFor]   = useState('');
  const [education,    setEducation]    = useState('');
  const [numberOfKids, setNumberOfKids] = useState('');
  const [kidsAges,     setKidsAges]     = useState([]);
  const [drink,        setDrink]        = useState('');
  const [smoke,        setSmoke]        = useState('');
  const [religion,     setReligion]     = useState('');
  // Step 8 — About
  const [profession,   setProfession]   = useState('');
  const [bio,          setBio]          = useState('');
  const [height,       setHeight]       = useState('');
  const [interests,    setInterests]    = useState([]);
  // Step 9 — Photo
  const [photo,        setPhoto]        = useState(null);
 
  const [stepErrors, setStepErrors] = useState({});
  const setErr   = (k, m) => setStepErrors((p) => ({ ...p, [k]: m }));
  const clearErr = (k)    => setStepErrors((p) => ({ ...p, [k]: null }));
 
  const isSingleParent =
    step2.values.relationshipType === 'single_mother' ||
    step2.values.relationshipType === 'single_father';
 
  const totalSteps    = isSingleParent ? 9 : 8; // skip kids step if not single parent
  const firstStep     = googleMode ? 2 : 1;

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goBack = () => {
    if (step <= firstStep) { navigation.goBack(); return; }
    let prev = step - 1;
    if (!isSingleParent && prev === 5) prev = 4; // skip kids step
    setStep(prev);
  };
 
  const goNext = () => {
    let next = step + 1;
    if (!isSingleParent && next === 5) next = 6; // skip kids step
    setStep(next);
  };
 
  // ── Step validation ────────────────────────────────────────────────────────
  const validateCurrentStep = () => {
    switch (step) {
      case 1: return googleMode ? true : step1.validate();
      case 2: return step2.validate();
      case 3:
        if (!lookingFor) { setErr('lookingFor', 'Please select who you are looking for'); return false; }
        clearErr('lookingFor'); return true;
      case 4:
        if (!education) { setErr('education', 'Please select your education level'); return false; }
        clearErr('education'); return true;
      default: return true; // optional steps
    }
  };
 
  const handleNext = () => {
    if (!validateCurrentStep()) return;
    goNext();
  };

  // ── Step 1 submit: create the account immediately ──────────────────────────
  // Previously step 1 was just a local `goNext()` like every other step —
  // the account wasn't created (and no verification email sent) until the
  // very end, after all 9 steps. Now step 1 IS the account-creation step:
  // tapping "Create Account" here registers immediately with just
  // name/email/phone/password, the backend sends the verification code
  // right away, and the remaining profile-detail steps (2-9) are collected
  // afterward — once verified — via the same authenticated
  // "complete your profile" flow Google sign-in already uses (see
  // googleMode above, and handleRegister's profile-completion branch below).
  const handleStep1Register = async () => {
    if (!step1.validate()) return;
    setLoading(true);
    try {
      const data = await AuthAPI.register({
        name:     step1.values.name.trim(),
        email:    step1.values.email.trim().toLowerCase(),
        phone:    step1.values.phone.trim(),
        password: step1.values.password,
      });

      if (data.requiresEmailVerification) {
        if (data.emailSendFailed) {
          Alert.alert(
            'Almost there!',
            'Your account was created, but we could not send the verification email. We\'ll try again automatically on the next screen.',
          );
        }
        navigation.navigate(Routes.VERIFY_EMAIL, {
          email: data.email,
          // register() already sent a code — don't send a redundant second
          // one that would invalidate the code sitting in the user's inbox.
          codeAlreadySent: !data.emailSendFailed,
        });
        return;
      }

      // Phone-only accounts (no email) have nothing to verify here — the
      // backend already issued a token. Log in now; the account is
      // isProfileComplete:false, so the app's own CompleteProfile gate
      // (AppNavigator) takes over from here and lands the user back on
      // this same screen at step 2, authenticated.
      await loginWithToken(data.token, data.user);
    } catch (err) {
      let message = err.message || 'Registration failed. Please try again.';
      if (message.toLowerCase().includes('already')) {
        message = 'This email or phone number is already registered. Please log in instead.';
      }
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };
 
  // ── Image picker ───────────────────────────────────────────────────────────
  const MEDIA_LIMITS = { maxPhotos: 6, maxVideoSeconds: 30 };
  
  const PICKER_OPTIONS = {
    allowsEditing:  true,       // enables crop UI
    aspect:         [4, 5],     // portrait ratio — better for profile photos
    quality:        0.85,
    allowsMultipleSelection: false,
  };


  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:    ['images'],   // ← fixed
        allowsEditing: true,
        aspect:        [4, 5],
        quality:       0.85,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  };
  
  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes:    ['images'],   // ← fixed
        allowsEditing: true,
        aspect:        [4, 5],
        quality:       0.85,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  // ── Agreement modal state ─────────────────────────────────────────────────
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreed, setAgreed] = useState({
    accurate:   false,
    suspension: false,
    terms:      false,
    guidelines: false,
    age:        false,
  });

  const allAgreed = Object.values(agreed).every(Boolean);

  const toggleAgreed = (key) =>
    setAgreed((prev) => ({ ...prev, [key]: !prev[key] }));

  // Opens the modal instead of registering directly
  const handleCreateAccountPress = () => {
    // Reset checkboxes each time modal opens
    setAgreed({ accurate: false, suspension: false, terms: false, guidelines: false, age: false });
    setShowAgreementModal(true);
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setShowAgreementModal(false);
    setLoading(true);
    try {
      const profilePayload = {
        gender:           step2.values.gender,
        relationshipType: step2.values.relationshipType,
        dateOfBirth:      step2.values.dateOfBirth,
        country:          step2.values.country.trim(),
        city:             step2.values.city.trim(),
        lookingFor:       lookingFor || 'both',
        education:        education  || undefined,
        drink:            drink      || undefined,
        smoke:            smoke      || undefined,
        religion:         religion   || undefined,
        profession:       profession.trim() || undefined,
        bio:              bio.trim()        || undefined,
        height:           height ? Number(height) : undefined,
        interests:        interests.length  ? interests : undefined,
        ...(isSingleParent && {
          numberOfKids: numberOfKids ? Number(numberOfKids) : undefined,
          kidsAges:     kidsAges.length ? kidsAges : undefined,
        }),
        // Reaching handleRegister at all means allAgreed was true (the
        // "Agree & Create Account" button is disabled otherwise) — this just
        // carries that fact to the backend, which stamps its own timestamp
        // as the durable consent record rather than trusting one from here.
        agreedToTerms: true,
      };

      if (googleMode) {
        // ── Profile-completion path (Google AND, since 2026-08-27, local
        // email/phone accounts resumed here after step-1 verification) ────────
        // The user already exists in the backend and is usually already
        // authenticated (via VerifyEmailScreen/phone-otp, or a restored
        // session for a Google user who reopened the app mid-flow). Only
        // call loginWithToken when we actually have a fresh token to store —
        // AppNavigator's CompleteProfile gate deliberately passes
        // googleToken:null for an already-authenticated resume, since the
        // real token is already correctly persisted; calling
        // loginWithToken(null, ...) there would overwrite it with null and
        // silently sign the user out the moment this screen finishes.
        const token = googleToken;
        const partialUser = {
          _id:            googleUser?.userId,
          name:           googleUser?.name,
          email:          googleUser?.email,
          profilePicture: googleUser?.profilePicture,
          isProfileComplete: false,
        };
        if (token) {
          await loginWithToken(token, partialUser);
        } else {
          updateUser(partialUser);
        }

        // Now update the full profile on the backend
        await UserAPI.updateProfile({ ...profilePayload, isProfileComplete: true });

        // Upload photo if picked
        if (photo) {
          setUploadProgress('Uploading your photo...');
          try {
            const photoUrl = await uploadProfilePicture(photo);
            await UserAPI.updateProfile({ profilePicture: photoUrl });
            updateUser({ profilePicture: photoUrl });
          } catch {
            // Non-fatal — user can add photo later
          }
        }

        // Mark complete in local store so navigator removes the gate
        updateUser({ isProfileComplete: true });
        return;
      }
      // No else branch: handleRegister only ever runs via the CompleteProfile
      // gate (googleMode), for both Google and local accounts — step 1 now
      // creates and verifies the account on its own (handleStep1Register).

    } catch (err) {
      let message = err.message || 'Registration failed. Please try again.';
      if (message.toLowerCase().includes('already')) {
        message = 'This email or phone number is already registered. Please log in instead.';
        setStep(firstStep);
      }
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };
  // ─────────────────────────────────────────────────────────────────────────
  // Step renderers
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
 
      case 1:
        return (
          <View>
            <SectionTitle emoji="👋" title="Let's get started" subtitle="Create your account to find your perfect match." />
            <Input label="Full Name *" placeholder="Jane Doe"
              value={step1.values.name} onChangeText={(v) => step1.handleChange('name', v)}
              onBlur={() => step1.handleBlur('name')} error={step1.errors.name} autoCapitalize="words" />
            <Input label="Email Address *" placeholder="you@example.com"
              value={step1.values.email} onChangeText={(v) => step1.handleChange('email', v)}
              onBlur={() => step1.handleBlur('email')} error={step1.errors.email}
              keyboardType="email-address" autoCapitalize="none" />
            <Input label="Phone Number *" placeholder="+234 800 000 0000"
              value={step1.values.phone} onChangeText={(v) => step1.handleChange('phone', v)}
              onBlur={() => step1.handleBlur('phone')} error={step1.errors.phone} keyboardType="phone-pad" />
            <Input label="Password *" placeholder="Minimum 8 characters"
              value={step1.values.password} onChangeText={(v) => step1.handleChange('password', v)}
              onBlur={() => step1.handleBlur('password')} error={step1.errors.password} secureTextEntry />
          </View>
        );
 
      case 2:
        return (
          <View>
            <SectionTitle emoji="🙋" title="About you" subtitle="Tell us a bit about yourself." />
            <Text style={styles.fieldLabel}>Gender *</Text>
            <ChipGroup options={GenderOptions} value={step2.values.gender}
              onChange={(v) => step2.handleChange('gender', v)} error={step2.errors.gender} />
            <Text style={styles.fieldLabel}>Relationship Type *</Text>
            <ChipGroup options={RelationshipTypes} value={step2.values.relationshipType}
              onChange={(v) => step2.handleChange('relationshipType', v)} error={step2.errors.relationshipType} />
            <DatePickerField value={step2.values.dateOfBirth}
              onChange={(v) => step2.handleChange('dateOfBirth', v)} error={step2.errors.dateOfBirth} />
            <Input label="Country *" placeholder="e.g. Nigeria"
              value={step2.values.country} onChangeText={(v) => step2.handleChange('country', v)}
              onBlur={() => step2.handleBlur('country')} error={step2.errors.country} autoCapitalize="words" />
            <Input label="City *" placeholder="e.g. Lagos"
              value={step2.values.city} onChangeText={(v) => step2.handleChange('city', v)}
              onBlur={() => step2.handleBlur('city')} error={step2.errors.city} autoCapitalize="words" />
          </View>
        );
 
      case 3:
        return (
          <View>
            <SectionTitle emoji="💕" title="Who are you looking for?" subtitle="This helps us show you the most relevant profiles." />
            <ChipGroup options={LOOKING_FOR_OPTIONS} value={lookingFor}
              onChange={(v) => { setLookingFor(v); clearErr('lookingFor'); }}
              error={stepErrors.lookingFor} />
          </View>
        );
 
      case 4:
        return (
          <View>
            <SectionTitle emoji="🎓" title="Education level" subtitle="What is your highest level of education?" />
            <ChipGroup options={EDUCATION_OPTIONS} value={education}
              onChange={(v) => { setEducation(v); clearErr('education'); }}
              error={stepErrors.education} />
          </View>
        );
 
      case 5: // Only shown for single parents
        return (
          <View>
            <SectionTitle emoji="👶" title="About your kids" subtitle="Help potential matches understand your family situation." />
            <Input label="How many kids do you have?" placeholder="e.g. 2"
              value={numberOfKids} onChangeText={setNumberOfKids} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Kids age range (select all that apply)</Text>
            <ChipGroup
              options={KID_AGE_OPTIONS.map((a) => ({ label: a, value: a }))}
              value={kidsAges} onChange={setKidsAges} multi />
          </View>
        );
 
      case 6:
        return (
          <View>
            <SectionTitle emoji="🌿" title="Your lifestyle" subtitle="Be honest — it helps find your right match." />
            <Text style={styles.fieldLabel}>Do you drink? 🍷</Text>
            <ChipGroup options={DRINK_OPTIONS} value={drink} onChange={setDrink} />
            <Text style={styles.fieldLabel}>Do you smoke? 🚬</Text>
            <ChipGroup options={SMOKE_OPTIONS} value={smoke} onChange={setSmoke} />
          </View>
        );
 
      case 7:
        return (
          <View>
            <SectionTitle emoji="🙏" title="Religion" subtitle="Share your faith or belief system." />
            <ChipGroup options={RELIGION_OPTIONS} value={religion} onChange={setReligion} />
          </View>
        );
 
      case 8:
        return (
          <View>
            <SectionTitle emoji="✨" title="More about you" subtitle="Let people know what makes you unique. Your profession will be shown on your profile." />
 
            {/* Profession — prominent, at the top */}
            <Input
              label="Profession *"
              placeholder="e.g. Doctor, Lawyer, Engineer, Teacher..."
              value={profession}
              onChangeText={setProfession}
              autoCapitalize="words"
            />
            <View style={styles.professionHint}>
              <Text style={styles.professionHintText}>
                💡 Your profile will show: "<Text style={styles.professionExample}>{step1.values.name || 'Your Name'}, {profession || 'your profession'}</Text>"
              </Text>
            </View>
 
            <Input label="Bio" placeholder="Write a short description about yourself..."
              value={bio} onChangeText={setBio} multiline numberOfLines={4} maxLength={500} />
            <Text style={styles.charCount}>{bio.length}/500</Text>
 
            <Input label="Height (cm)" placeholder="e.g. 175"
              value={height} onChangeText={setHeight} keyboardType="numeric" />
 
            <Text style={styles.fieldLabel}>Interests (select all that apply)</Text>
            <ChipGroup
              options={INTEREST_OPTIONS.map((i) => ({ label: i, value: i }))}
              value={interests} onChange={setInterests} multi />
          </View>
        );
 
      case 9:
        return (
          <View>
            <SectionTitle
              emoji="📸"
              title="Add your photo"
              subtitle={`Profiles with photos get 5x more matches. Max ${MEDIA_LIMITS.maxPhotos} photos. You can add more later.`}
            />
       
            {/* Photo preview */}
            <TouchableOpacity
              style={styles.photoBox}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>🤳</Text>
                  <Text style={styles.photoPlaceholderText}>Tap to select a photo</Text>
                  <Text style={styles.photoPlaceholderSub}>Square crop works best (1:1)</Text>
                </View>
              )}
            </TouchableOpacity>
       
            {/* Crop tip — helps users find the crop button */}
            {photo && (
              <View style={styles.cropTip}>
                <Text style={styles.cropTipText}>
                  💡 Tip: When selecting a photo, use the{' '}
                  <Text style={styles.cropTipBold}>crop/edit handles</Text> to adjust,
                  then tap <Text style={styles.cropTipBold}>"Choose"</Text> or{' '}
                  <Text style={styles.cropTipBold}>"Done"</Text> to confirm.
                </Text>
              </View>
            )}
       
            {/* Upload progress */}
            {uploadProgress ? (
              <View style={styles.uploadProgressBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
              </View>
            ) : null}
       
            {/* Action buttons */}
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={pickFromGallery}
                activeOpacity={0.8}
              >
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
       
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={pickFromCamera}
                activeOpacity={0.8}
              >
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
       
              {photo && (
                <TouchableOpacity
                  style={[styles.photoBtn, styles.photoBtnRemove]}
                  onPress={() => setPhoto(null)}
                >
                  <Text style={styles.photoBtnIcon}>🗑️</Text>
                  <Text style={[styles.photoBtnText, { color: '#EF4444' }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
 
      default: return null;
    }
  };
 
  const isLastStep = step === 9;
  const isOptionalStep = step >= 6;
 
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppStatusBar theme="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backText}>← {step <= firstStep ? 'Back' : 'Previous'}</Text>
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepCount}>
            {googleMode
              ? `Step ${step - 1} of ${totalSteps - 1}`
              : `Step ${step} of ${totalSteps}`}
          </Text>
          <StepIndicator current={step - (googleMode ? 1 : 0)} total={totalSteps - (googleMode ? 1 : 0)} />
        </View>
 
        {/* Step content */}
        {renderStep()}
 
        {/* CTA */}
        <Button
          title={
            isLastStep ? 'Create Account  ♥'
            : (step === 1 && !googleMode) ? 'Create Account →'
            : 'Continue →'
          }
          onPress={
            isLastStep ? handleCreateAccountPress
            : (step === 1 && !googleMode) ? handleStep1Register
            : handleNext
          }
          loading={loading}
          size="lg"
          style={styles.actionBtn}
        />
 
        {/* Skip optional steps */}
        {isOptionalStep && !isLastStep && (
          <TouchableOpacity style={styles.skipBtn} onPress={goNext}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        {isLastStep && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleCreateAccountPress}>
            <Text style={styles.skipText}>Skip — add photo later</Text>
          </TouchableOpacity>
        )}
 
        {/* Login link on step 1 only */}
        {step === 1 && (
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(Routes.LOGIN)}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Agreement Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showAgreementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={agreementStyles.overlay}>
          <View style={agreementStyles.sheet}>

            {/* Header */}
            <View style={agreementStyles.header}>
              <Text style={agreementStyles.headerEmoji}>📋</Text>
              <Text style={agreementStyles.headerTitle}>Before You Join</Text>
              <Text style={agreementStyles.headerSub}>
                Please read and agree to the following before creating your account.
              </Text>
            </View>

            <ScrollView
              style={agreementStyles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Condition 1 */}
              <AgreementItem
                checked={agreed.accurate}
                onToggle={() => toggleAgreed('accurate')}
                text="I confirm that all the information I have provided is accurate, real, and truly represents who I am. I understand that providing false information is a violation of HeartLink's policies."
              />

              {/* Condition 2 */}
              <AgreementItem
                checked={agreed.age}
                onToggle={() => toggleAgreed('age')}
                text="I confirm that I am at least 18 years of age. HeartLink is strictly for adults, and creating an account on behalf of a minor is prohibited."
              />

              {/* Condition 3 */}
              <AgreementItem
                checked={agreed.suspension}
                onToggle={() => toggleAgreed('suspension')}
                text="I understand that my account may be suspended or permanently removed if it is reported by multiple users for fake profiles, impersonation, harassment, sending inappropriate content, or any form of abusive behaviour."
              />

              {/* Condition 4 */}
              <AgreementItem
                checked={agreed.guidelines}
                onToggle={() => toggleAgreed('guidelines')}
                text="I agree to treat all HeartLink members with respect and dignity. I will not send unsolicited explicit content, engage in hate speech, bullying, or any behaviour that makes others feel unsafe."
              />

              {/* Condition 5 */}
              <AgreementItem
                checked={agreed.terms}
                onToggle={() => toggleAgreed('terms')}
                text={null}
                customText={
                  <Text style={agreementStyles.itemText}>
                    I have read and agree to HeartLink's{' '}
                    <Text
                      style={agreementStyles.link}
                      // Points at heartlink-terms (see project root), hosted
                      // on GitHub Pages — update this if the repo name or
                      // GitHub username ever changes.
                      onPress={() => Linking.openURL('https://ematech81.github.io/heartlink-terms/terms.html')}
                    >
                      Terms & Conditions
                    </Text>
                    {' '}and{' '}
                    <Text
                      style={agreementStyles.link}
                      onPress={() => Linking.openURL('https://ematech81.github.io/heartlink-terms/privacy.html')}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                }
              />
            </ScrollView>

            {/* Actions */}
            <View style={agreementStyles.actions}>
              <TouchableOpacity
                style={[agreementStyles.agreeBtn, !allAgreed && agreementStyles.agreeBtnDisabled]}
                onPress={handleRegister}
                disabled={!allAgreed || loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={agreementStyles.agreeBtnText}>
                      {allAgreed ? 'Agree & Create Account ♥' : `Agree to all (${Object.values(agreed).filter(Boolean).length}/5)`}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={agreementStyles.cancelBtn}
                onPress={() => setShowAgreementModal(false)}
                activeOpacity={0.7}
              >
                <Text style={agreementStyles.cancelBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ── Agreement checkbox item ────────────────────────────────────────────────────
function AgreementItem({ checked, onToggle, text, customText }) {
  return (
    <TouchableOpacity style={agreementStyles.item} onPress={onToggle} activeOpacity={0.7}>
      <View style={[agreementStyles.checkbox, checked && agreementStyles.checkboxChecked]}>
        {checked && <Text style={agreementStyles.checkmark}>✓</Text>}
      </View>
      {customText
        ? customText
        : <Text style={agreementStyles.itemText}>{text}</Text>
      }
    </TouchableOpacity>
  );
}

const agreementStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  scroll: { flexGrow: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#FF4B7A',
    borderColor: '#FF4B7A',
  },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '700' },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  link: {
    color: '#FF4B7A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actions: { marginTop: 16, gap: 10 },
  agreeBtn: {
    backgroundColor: '#FF4B7A',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  agreeBtnDisabled: { backgroundColor: '#FFB8CC' },
  agreeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: 40 },
 
  backBtn: { marginBottom: Spacing.md },
  backText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textSecondary },
 
  stepHeader: { marginBottom: Spacing.lg },
  stepCount: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: 8, fontWeight: FontWeight.medium },
 
  fieldLabel: { fontSize: 18, FontWeight: FontWeight.semibold, color: Colors.text, marginBottom:16 },
  charCount: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'right', marginTop: -Spacing.sm, marginBottom: Spacing.md },
 
  // Profession hint
  professionHint: {
    backgroundColor: Colors.backgroundGradientStart,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '40',
  },
  professionHintText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  professionExample: { color: Colors.primary, fontWeight: FontWeight.semibold },
 
  actionBtn: { width: '100%', marginTop: Spacing.lg, marginBottom: 10 },
  skipBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  skipText: { fontSize: FontSize.sm, color: Colors.textLight },
 
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginText: { fontSize: FontSize.base, color: Colors.textSecondary },
  loginLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
 
  // Photo
  photoBox: {
    width: '100%', aspectRatio: 1, borderRadius: Radius.xl, overflow: 'hidden',
    marginBottom: Spacing.lg, backgroundColor: '#F9FAFB',
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoIcon: { fontSize: 52 },
  photoPlaceholderText: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  photoPlaceholderSub: { fontSize: FontSize.sm, color: Colors.textLight },
 
  photoActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: Colors.white, ...Shadows.sm,
  },
  photoBtnRemove: { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  photoBtnIcon: { fontSize: 18 },
  photoBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  cropTip: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  cropTipText: {
    fontSize: FontSize.sm,
    color: '#0369A1',
    lineHeight: 20,
  },
  cropTipBold: {
    fontWeight: FontWeight.bold,
    color: '#0369A1',
  },
  uploadProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundGradientStart,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  uploadProgressText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});