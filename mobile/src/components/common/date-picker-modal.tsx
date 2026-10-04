import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/use-theme';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Check,
  RotateCcw,
} from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // Format: YYYY-MM-DD
  onSelectDate: (date: string) => void;
  title?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DatePickerModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'Select Transaction Date',
}: DatePickerModalProps) {
  const { colors, isDark } = useAppTheme();

  // Parse initial selected date or fallback to today
  const parseDateString = (str: string) => {
    if (!str) return new Date();
    const parts = str.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  const initialDate = parseDateString(selectedDate);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [currentSelected, setCurrentSelected] = useState(selectedDate);

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      const d = parseDateString(selectedDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setCurrentSelected(selectedDate);
    }
  }, [visible, selectedDate]);

  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${padZero(month + 1)}-${padZero(day)}`;
  };

  const todayStr = () => {
    const now = new Date();
    return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const yesterdayStr = () => {
    const yesterday = new Date(Date.now() - 86400000);
    return formatDateStr(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  };

  const daysAgoStr = (days: number) => {
    const d = new Date(Date.now() - 86400000 * days);
    return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDateStr = formatDateStr(viewYear, viewMonth, day);
    setCurrentSelected(newDateStr);
  };

  const handleApply = () => {
    onSelectDate(currentSelected);
    onClose();
  };

  const handleQuickSelect = (dateStr: string) => {
    const parsed = parseDateString(dateStr);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    setCurrentSelected(dateStr);
  };

  // Calendar Grid calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Generate calendar cells (6 rows of 7 days = 42 cells)
  const calendarCells: {
    day: number;
    monthOffset: -1 | 0 | 1;
    dateStr: string;
  }[] = [];

  // 1. Fill previous month tail
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({
      day,
      monthOffset: -1,
      dateStr: formatDateStr(prevYear, prevMonthIdx, day),
    });
  }

  // 2. Fill current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      monthOffset: 0,
      dateStr: formatDateStr(viewYear, viewMonth, d),
    });
  }

  // 3. Fill next month head to complete grid
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({
      day: d,
      monthOffset: 1,
      dateStr: formatDateStr(nextYear, nextMonthIdx, d),
    });
  }

  const today = todayStr();

  // Friendly human readable date format for header preview
  const formatFriendlyPreview = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.cardElevated,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
                <View style={styles.headerTitleGroup}>
                  <View
                    style={[
                      styles.headerIconCircle,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <CalendarIcon size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.subtitle, { color: colors.primary }]}>
                      {formatFriendlyPreview(currentSelected)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor:
                        currentSelected === today ? colors.primaryLight : colors.inputBg,
                      borderColor:
                        currentSelected === today ? colors.primary : colors.inputBorder,
                    },
                  ]}
                  onPress={() => handleQuickSelect(today)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color:
                          currentSelected === today ? colors.primary : colors.textSecondary,
                        fontWeight: currentSelected === today ? '700' : '500',
                      },
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor:
                        currentSelected === yesterdayStr()
                          ? colors.primaryLight
                          : colors.inputBg,
                      borderColor:
                        currentSelected === yesterdayStr()
                          ? colors.primary : colors.inputBorder,
                    },
                  ]}
                  onPress={() => handleQuickSelect(yesterdayStr())}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color:
                          currentSelected === yesterdayStr()
                            ? colors.primary
                            : colors.textSecondary,
                        fontWeight: currentSelected === yesterdayStr() ? '700' : '500',
                      },
                    ]}
                  >
                    Yesterday
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor:
                        currentSelected === daysAgoStr(7)
                          ? colors.primaryLight
                          : colors.inputBg,
                      borderColor:
                        currentSelected === daysAgoStr(7)
                          ? colors.primary : colors.inputBorder,
                    },
                  ]}
                  onPress={() => handleQuickSelect(daysAgoStr(7))}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color:
                          currentSelected === daysAgoStr(7)
                            ? colors.primary
                            : colors.textSecondary,
                        fontWeight: currentSelected === daysAgoStr(7) ? '700' : '500',
                      },
                    ]}
                  >
                    7 Days Ago
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Month Navigation */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  style={[
                    styles.navArrowBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.monthYearContainer}>
                  <Text style={[styles.monthYearText, { color: colors.text }]}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={[
                    styles.navArrowBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Day of week labels */}
              <View style={styles.weekDaysRow}>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <View key={idx} style={styles.weekDayCol}>
                    <Text
                      style={[
                        styles.weekDayText,
                        {
                          color:
                            idx === 0 || idx === 6
                              ? colors.textMuted
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Days Grid */}
              <View style={styles.gridContainer}>
                {calendarCells.map((cell, idx) => {
                  const isCurrentMonth = cell.monthOffset === 0;
                  const isSelected = cell.dateStr === currentSelected;
                  const isTodayCell = cell.dateStr === today;

                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      style={[
                        styles.dayCell,
                        isSelected && [
                          styles.dayCellSelected,
                          { backgroundColor: colors.primary },
                        ],
                        !isSelected && isTodayCell && [
                          styles.dayCellToday,
                          { borderColor: colors.primary },
                        ],
                      ]}
                      onPress={() => {
                        if (cell.monthOffset === -1) {
                          handlePrevMonth();
                        } else if (cell.monthOffset === 1) {
                          handleNextMonth();
                        }
                        setCurrentSelected(cell.dateStr);
                      }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isSelected
                              ? colors.primaryText
                              : isCurrentMonth
                              ? colors.text
                              : colors.textMuted,
                            fontWeight: isSelected ? '800' : isTodayCell ? '700' : '500',
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleApply}
                >
                  <Check size={16} color={colors.primaryText} style={{ marginRight: 6 }} />
                  <Text style={[styles.applyBtnText, { color: colors.primaryText }]}>
                    Select Date
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 11,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearContainer: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  dayCellSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
