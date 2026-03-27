import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';




export default function DatePickerField({
  value,
  onChange,
  error,
  label = 'Date of Birth *',
}) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  // Local display state — updates immediately on selection
  const [displayValue, setDisplayValue] = useState(value || null);
 
  // Max = 18 years ago, min = 80 years ago
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 80);
 
  const selectedDate = displayValue
    ? new Date(displayValue)
    : maxDate;
 
  const formatDisplay = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
 
  const saveDate = (date) => {
    const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
    setDisplayValue(formatted);   // update local UI immediately
    onChange(formatted);          // notify parent form
  };
 
  // ── Android ────────────────────────────────────────────────────────────────
  const handleAndroidChange = (event, date) => {
    setShow(false);
    if (event.type === 'dismissed') return; // user cancelled
    if (date) saveDate(date);
  };
 
  // ── iOS — update temp while scrolling ─────────────────────────────────────
  const handleIOSChange = (event, date) => {
    if (date) setTempDate(date);
  };
 
  const handleIOSConfirm = () => {
    const dateToSave = tempDate || selectedDate;
    saveDate(dateToSave);
    setTempDate(null);
    setShow(false);
  };
 
  const handleIOSCancel = () => {
    setTempDate(null);
    setShow(false);
  };
 
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
 
      {/* Trigger button */}
      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setShow(true)}
        activeOpacity={0.75}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Select date of birth"
      >
        <Text style={[styles.value, !displayValue && styles.placeholder]}>
          {displayValue ? formatDisplay(displayValue) : 'Select your date of birth'}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>
 
      {error ? <Text style={styles.error}>{error}</Text> : null}
 
      {/* Android picker */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={minDate}
          onChange={handleAndroidChange}
        />
      )}
 
      {/* iOS modal picker */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          visible={show}
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View style={styles.modalOverlay}>
            {/* Tap backdrop to cancel */}
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={handleIOSCancel}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleIOSCancel}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Date of Birth</Text>
                <TouchableOpacity
                  onPress={handleIOSConfirm}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || selectedDate}
                mode="date"
                display="spinner"
                maximumDate={maxDate}
                minimumDate={minDate}
                onChange={handleIOSChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  fieldError: {
    borderColor: '#EF4444',
  },
  value: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
  },
  placeholder: {
    color: Colors.textLight,
  },
  calendarIcon: {
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
  error: {
    fontSize: FontSize.xs,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },
 
  // iOS Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  modalCancel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  modalDone: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  iosPicker: {
    height: 200,
    backgroundColor: Colors.white,
  },
});