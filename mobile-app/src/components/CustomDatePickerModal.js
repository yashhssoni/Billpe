import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  title = "Select Date"
}) {
  const initial = selectedDate ? new Date(selectedDate) : new Date();
  const validInitial = !isNaN(initial.getTime()) ? initial : new Date();

  const [currentYear, setCurrentYear] = useState(validInitial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validInitial.getMonth());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      const d = selectedDate ? new Date(selectedDate) : new Date();
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
      setDropdownOpen(false);
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onSelectDate(`${currentYear}-${mStr}-${dStr}`);
    onClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    onSelectDate(`${y}-${m}-${d}`);
    onClose();
  };

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarGrid = [];

  // Trailing days from previous month
  for (let i = firstDayWeekIndex - 1; i >= 0; i--) {
    calendarGrid.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      key: `prev-${i}`
    });
  }

  // Active days of current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarGrid.push({
      day: d,
      isCurrentMonth: true,
      key: `curr-${d}`
    });
  }

  // Leading days of next month to complete standard grid (multiple of 7)
  const totalSlots = Math.ceil(calendarGrid.length / 7) * 7;
  const remainingSlots = totalSlots - calendarGrid.length;
  for (let d = 1; d <= remainingSlots; d++) {
    calendarGrid.push({
      day: d,
      isCurrentMonth: false,
      key: `next-${d}`
    });
  }

  const baseYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = baseYear - 10; y <= baseYear + 5; y++) {
    yearOptions.push(y);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
          {/* Top Bar: Title + Month Year Selector Toggle */}
          <View style={styles.topHeaderRow}>
            <Text style={styles.modalMainTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <View style={styles.arrowsRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
                <Text style={styles.arrowIcon}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
                <Text style={styles.arrowIcon}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Month / Year Selector View */}
          {dropdownOpen ? (
            <View style={styles.dropdownView}>
              <Text style={styles.sectionHeader}>Select Month</Text>
              <View style={styles.monthOptionsGrid}>
                {MONTH_NAMES.map((name, idx) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthOption, currentMonth === idx && styles.monthOptionActive]}
                    onPress={() => {
                      setCurrentMonth(idx);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.monthOptionText, currentMonth === idx && styles.monthOptionTextActive]}>
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Select Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                {yearOptions.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearPill, currentYear === y && styles.yearPillActive]}
                    onPress={() => {
                      setCurrentYear(y);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.yearPillText, currentYear === y && styles.yearPillTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <>
              {/* Day Labels Row */}
              <View style={styles.weekDaysRow}>
                {WEEK_DAYS.map(day => (
                  <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>

              {/* Day Grid Matrix (Percentage based width taaki Saturday cut na ho) */}
              <View style={styles.daysGrid}>
                {calendarGrid.map((item) => {
                  const mStr = String(currentMonth + 1).padStart(2, '0');
                  const dStr = String(item.day).padStart(2, '0');
                  const formatted = `${currentYear}-${mStr}-${dStr}`;
                  const isSelected = item.isCurrentMonth && selectedDate === formatted;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      disabled={!item.isCurrentMonth}
                      onPress={() => handleSelectDay(item.day)}
                      style={[
                        styles.dayBox,
                        isSelected && styles.selectedDayBox
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text style={[
                        styles.dayNumText,
                        !item.isCurrentMonth && styles.otherMonthText,
                        isSelected && styles.selectedDayNumText
                      ]}>
                        {item.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bottom Row: Today Button */}
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={handleSelectToday} style={styles.todayBtn}>
                  <Text style={styles.todayBtnText}>Today</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  calendarCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  modalMainTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff'
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94a3b8',
    padding: 4
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8'
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#38bdf8',
    marginLeft: 6
  },
  arrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  arrowBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  arrowIcon: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 'bold'
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  weekDayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  dayBox: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 8
  },
  selectedDayBox: {
    backgroundColor: '#10b981'
  },
  dayNumText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  otherMonthText: {
    color: '#475569'
  },
  selectedDayNumText: {
    color: '#0f172a',
    fontWeight: 'bold'
  },
  footerRow: {
    marginTop: 14,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10
  },
  todayBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  todayBtnText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: 'bold'
  },
  dropdownView: {
    paddingVertical: 4
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  monthOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  monthOption: {
    width: '31%',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  monthOptionActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  monthOptionText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600'
  },
  monthOptionTextActive: {
    color: '#0f172a',
    fontWeight: 'bold'
  },
  yearScroll: {
    flexDirection: 'row',
    marginTop: 4
  },
  yearPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    marginRight: 6
  },
  yearPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  yearPillText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600'
  },
  yearPillTextActive: {
    color: '#0f172a',
    fontWeight: 'bold'
  }
});