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

  // Leading days of next month to complete standard grid
  const remainingSlots = 7 - (calendarGrid.length % 7);
  if (remainingSlots < 7) {
    for (let d = 1; d <= remainingSlots; d++) {
      calendarGrid.push({
        day: d,
        isCurrentMonth: false,
        key: `next-${d}`
      });
    }
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
          {/* Top Bar: Month Year Dropdown + Up/Down Arrows */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.arrowsRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.arrowIcon}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.arrowIcon}>↓</Text>
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

              <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Select Year</Text>
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

              {/* Day Grid Matrix */}
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
                <TouchableOpacity onPress={handleSelectToday}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  calendarCard: {
    width: 295,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#475569',
    marginLeft: 6
  },
  arrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  arrowBtn: {
    padding: 4
  },
  arrowIcon: {
    fontSize: 16,
    color: '#334155',
    fontWeight: 'bold'
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  dayBox: {
    width: 267 / 7,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
    borderRadius: 4
  },
  selectedDayBox: {
    backgroundColor: '#1a73e8'
  },
  dayNumText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500'
  },
  otherMonthText: {
    color: '#cbd5e1'
  },
  selectedDayNumText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  footerRow: {
    marginTop: 8,
    alignItems: 'flex-end',
    paddingRight: 6
  },
  todayBtnText: {
    fontSize: 13,
    color: '#1a73e8',
    fontWeight: '700'
  },
  dropdownView: {
    paddingVertical: 6
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  monthOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  monthOption: {
    width: '22%',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  monthOptionActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8'
  },
  monthOptionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600'
  },
  monthOptionTextActive: {
    color: '#ffffff'
  },
  yearScroll: {
    flexDirection: 'row',
    marginTop: 4
  },
  yearPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginRight: 6
  },
  yearPillActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8'
  },
  yearPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600'
  },
  yearPillTextActive: {
    color: '#ffffff'
  }
});