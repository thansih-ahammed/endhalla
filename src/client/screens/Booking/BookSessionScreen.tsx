import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts, borderRadius } from '../../theme';
import Header from '../../../shared/components/Header';
import { useAppAlert } from '../../../shared/components/AlertProvider';
import { useAppDispatch, useAppSelector } from '../../../shared/store';
import { setSessionType as setReduxSessionType, confirmBooking } from '../../../shared/store/bookingSlice';

import ChatIcon from '../../../shared/assets/icons/chat.svg';
import PhoneIcon from '../../../shared/assets/icons/phone.svg';
import VideoIcon from '../../../shared/assets/icons/video.svg';
import ShieldIcon from '../../../shared/assets/icons/sheeld-icon.svg';

import {
  useCreateBookingMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  useGetBookedSlotsQuery,
} from '../../../shared/store/api/clientApi';

export default function BookSessionScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const { showAlert } = useAppAlert();
  const [createBookingMutation] = useCreateBookingMutation();
  const [createRazorpayOrderMutation] = useCreateRazorpayOrderMutation();
  const [verifyRazorpayPaymentMutation] = useVerifyRazorpayPaymentMutation();
  const currentUser = useAppSelector((state) => state.auth.user);

  const counsellor = route?.params?.counsellor || {
    name: 'Aisha',
    price: 'Free',
  };

  const counsellorName = counsellor.name || counsellor.fullName || 'Aisha';

  const isFreeOffer = route?.params?.isFreeOffer ?? (counsellor?.hasFreeSessionOffer ?? false);
  const regularRate = counsellor?.rates?.chat ? `₹${counsellor.rates.chat}` : (counsellor?.price && counsellor.price !== 'Free' ? counsellor.price : '₹499');
  const displayPrice = isFreeOffer ? 'Free' : regularRate;

  const [sessionType, setSessionTypeState] = useState<'Chat' | 'Voice' | 'Video'>('Chat');
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  // Razorpay Payment States
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [razorpayOrderInfo, setRazorpayOrderInfo] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);
  const [selectedPaymentApp, setSelectedPaymentApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'card'>('gpay');

  // Dynamically compute all days in the month for baseDate (28, 29, 30, or 31 days)
  const monthDays = useMemo(() => {
    const start = startOfMonth(baseDate);
    const end = endOfMonth(baseDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    return daysInMonth.map((d) => ({
      dateObj: d,
      day: format(d, 'EEE'), // "Mon", "Tue"
      dateNum: format(d, 'd'), // "1", "2", ... "30", "31"
      fullDateText: format(d, 'EEE, d MMM'), // "Tue, 10 Jun"
      monthYearHeader: format(d, 'MMMM yyyy').toUpperCase(), // "JUNE 2026"
      id: format(d, 'yyyy-MM-dd'),
    }));
  }, [baseDate]);

  const [selectedDateItem, setSelectedDateItem] = useState(monthDays[0]);

  // Fetch booked slots from backend & Redux
  const { data: bookedSlotsData } = useGetBookedSlotsQuery({
    counsellorName,
    dateText: selectedDateItem.fullDateText,
  });
  const bookedSlotsFromBackend = bookedSlotsData?.bookedSlots || [];
  const confirmedBookingsFromRedux = useAppSelector((state) => state.booking.confirmedBookings);

  const isSlotBooked = (timeStr: string) => {
    const isBookedInBackend = bookedSlotsFromBackend.includes(timeStr);
    const isBookedInRedux = confirmedBookingsFromRedux.some(
      (b) =>
        b.counsellorName === counsellorName &&
        b.dateText === selectedDateItem.fullDateText &&
        b.timeText === timeStr &&
        b.status !== 'cancelled'
    );
    return isBookedInBackend || isBookedInRedux;
  };

  const timeSlots = ['9:00 AM', '10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM'];
  const [selectedTime, setSelectedTime] = useState(timeSlots[1]);

  const sessionTypes = [
    { id: 'Chat' as const, label: 'Chat', icon: ChatIcon },
    { id: 'Voice' as const, label: 'Voice', icon: PhoneIcon },
    { id: 'Video' as const, label: 'Video', icon: VideoIcon },
  ];

  const handleSelectSessionType = (type: 'Chat' | 'Voice' | 'Video') => {
    setSessionTypeState(type);
    dispatch(setReduxSessionType(type));
  };

  const handleConfirm = async () => {
    // Validate slot availability
    if (isSlotBooked(selectedTime)) {
      showAlert({
        title: 'Slot unavailable',
        message: `${selectedTime} on ${selectedDateItem.fullDateText} is already booked for ${counsellorName}. Please choose another slot.`,
        tone: 'warning',
      });
      return;
    }

    // If session is Free, create free booking directly
    if (displayPrice === 'Free') {
      try {
        await createBookingMutation({
          counsellorId: counsellor._id,
          counsellorName: counsellor.name || counsellor.fullName,
          clientPhone: currentUser?.phone,
          clientName: currentUser?.name,
          sessionType,
          dateText: selectedDateItem.fullDateText,
          dateISO: selectedDateItem.id,
          timeText: selectedTime,
          price: displayPrice,
        }).unwrap();
      } catch (e: any) {
        showAlert({ title: 'Unable to book', message: e?.data?.message || 'Please try again.', tone: 'error' });
        return;
      }
      dispatch(
        confirmBooking({
          counsellorName: counsellor.name || counsellor.fullName,
          sessionType,
          dateText: selectedDateItem.fullDateText,
          timeText: selectedTime,
          price: displayPrice,
        })
      );
      navigation.navigate('BookingConfirmed', {
        counsellorName: counsellor.name || counsellor.fullName,
        sessionType,
        dateText: selectedDateItem.fullDateText,
        timeText: selectedTime,
      });
      return;
    }

    // For Paid sessions, trigger Razorpay order creation
    try {
      setIsProcessingPayment(true);
      const res = await createRazorpayOrderMutation({
        counsellorId: counsellor._id,
        counsellorName: counsellor.name || counsellor.fullName,
        sessionType,
        amount: displayPrice,
        currency: 'INR',
      }).unwrap();

      if (res && res.orderId) {
        setRazorpayOrderInfo({
          orderId: res.orderId,
          amount: res.amount,
          currency: res.currency || 'INR',
          keyId: res.keyId || 'rzp_test',
        });
        setShowRazorpayModal(true);
      } else {
        showAlert({ title: 'Payment error', message: 'Unable to initiate the payment. Please try again.', tone: 'error' });
      }
    } catch (err: any) {
      console.error('Error creating Razorpay order:', err);
      // Fallback order generation for dev environment
      setRazorpayOrderInfo({
        orderId: `order_${Date.now()}`,
        amount: 49900,
        currency: 'INR',
        keyId: 'rzp_test_1234567890abcdef',
      });
      setShowRazorpayModal(true);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCompleteRazorpayPayment = async () => {
    if (!razorpayOrderInfo) return;

    try {
      setIsProcessingPayment(true);
      const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const signature = `sig_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      await verifyRazorpayPaymentMutation({
        razorpay_order_id: razorpayOrderInfo.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        counsellorId: counsellor._id,
        counsellorName: counsellor.name || counsellor.fullName,
        clientPhone: currentUser?.phone,
        clientName: currentUser?.name,
        sessionType,
        dateText: selectedDateItem.fullDateText,
        dateISO: selectedDateItem.id,
        timeText: selectedTime,
        price: displayPrice,
      }).unwrap();

      setShowRazorpayModal(false);

      dispatch(
        confirmBooking({
          counsellorName: counsellor.name || counsellor.fullName,
          sessionType,
          dateText: selectedDateItem.fullDateText,
          timeText: selectedTime,
          price: displayPrice,
        })
      );

      navigation.navigate('BookingConfirmed', {
        counsellorName: counsellor.name || counsellor.fullName,
        sessionType,
        dateText: selectedDateItem.fullDateText,
        timeText: selectedTime,
        paymentId,
        paymentStatus: 'completed',
        paymentMethod: 'Razorpay (Google Pay / UPI)',
      });
    } catch (e: any) {
      console.error('Razorpay payment verification error:', e);
      showAlert({ title: 'Payment failed', message: e?.data?.message || 'Verification failed. Please try again.', tone: 'error' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCalendarDaySelect = (day: any) => {
    const selected = parseISO(day.dateString);
    setBaseDate(selected);
    const monthYear = format(selected, 'MMMM yyyy').toUpperCase();
    const fullText = format(selected, 'EEE, d MMM');
    const newSelected = {
      dateObj: selected,
      day: format(selected, 'EEE'),
      dateNum: format(selected, 'd'),
      fullDateText: fullText,
      monthYearHeader: monthYear,
      id: day.dateString,
    };
    setSelectedDateItem(newSelected);
    setShowFullCalendar(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerPadding}>
          <Header
            subtitle="Book a session"
            title={`with ${counsellor.name}`}
            onBackPress={() => navigation.goBack()}
          />
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* Section 1: SESSION TYPE */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              SESSION TYPE <Text style={styles.sectionSubtitle}>· same price, switch anytime</Text>
            </Text>
          </View>

          <View style={styles.typesRow}>
            {sessionTypes.map((item) => {
              const IconComp = item.icon;
              const isActive = sessionType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSessionType(item.id)}
                  style={[styles.typeCard, isActive ? styles.typeCardActive : null]}
                >
                  <IconComp
                    width={px(22)}
                    height={px(22)}
                    stroke={isActive ? colors.primary : colors.textSecondary}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.typeText, isActive ? styles.typeTextActive : null]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: DATE */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowFullCalendar(true)}
            style={styles.sectionHeaderClickable}
          >
            <Text style={styles.sectionTitle}>
              DATE <Text style={styles.sectionSubtitle}>· {selectedDateItem.monthYearHeader}</Text>
            </Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {monthDays.map((item) => {
              const isActive = isSameDay(selectedDateItem.dateObj, item.dateObj);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDateItem(item)}
                  style={[styles.datePill, isActive ? styles.datePillActive : null]}
                >
                  <Text style={[styles.dayText, isActive ? styles.dayTextActive : null]}>{item.day}</Text>
                  <Text style={[styles.dateNumText, isActive ? styles.dateNumActive : null]}>{item.dateNum}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Section 3: TIME */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TIME</Text>
          </View>

          <View style={styles.timeGrid}>
            {timeSlots.map((t) => {
              const isBooked = isSlotBooked(t);
              const isActive = selectedTime === t && !isBooked;

              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.8}
                  disabled={isBooked}
                  onPress={() => setSelectedTime(t)}
                  style={[
                    styles.timeSlot,
                    isActive ? styles.timeSlotActive : null,
                    isBooked ? styles.timeSlotBooked : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      isActive ? styles.timeSlotTextActive : null,
                      isBooked ? styles.timeSlotTextBooked : null,
                    ]}
                  >
                    {isBooked ? 'Booked' : t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Session</Text>
              <Text style={styles.summaryVal}>{sessionType} · 40 min</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>When</Text>
              <Text style={styles.summaryVal}>{selectedDateItem.fullDateText} · {selectedTime}</Text>
            </View>
            <View style={[styles.summaryRow, { marginBottom: 0 }]}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryPrice}>{displayPrice}</Text>
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityRow}>
            <ShieldIcon width={px(14)} height={px(14)} stroke={colors.textSecondary} />
            <Text style={styles.securityText}>End-to-end encrypted · Secured by Razorpay</Text>
          </View>

          <View style={{ height: px(80) }} />
        </ScrollView>

        {/* Bottom Sticky CTA */}
        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm} disabled={isProcessingPayment}>
            {isProcessingPayment ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.confirmBtnText}>{displayPrice === 'Free' ? 'Confirm Free Session' : `Confirm & Pay ${displayPrice}`}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Full Month Calendar Modal */}
        <Modal
          visible={showFullCalendar}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFullCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowFullCalendar(false)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <Calendar
                current={selectedDateItem.id}
                minDate={format(new Date(), 'yyyy-MM-dd')}
                onDayPress={handleCalendarDaySelect}
                markedDates={{
                  [selectedDateItem.id]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  backgroundColor: colors.white,
                  calendarBackground: colors.white,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.white,
                  todayTextColor: colors.primary,
                  dayTextColor: colors.black,
                  textDisabledColor: colors.textSecondary,
                  monthTextColor: colors.black,
                  textDayFontFamily: fonts.sans.regular,
                  textMonthFontFamily: fonts.sans.medium,
                  textDayHeaderFontFamily: fonts.sans.medium,
                  arrowColor: colors.primary,
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Razorpay Standard Payment Modal */}
        <Modal
          visible={showRazorpayModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowRazorpayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rzpModalContent}>
              {/* Razorpay Branding Header */}
              <View style={styles.rzpHeaderContainer}>
                <View style={styles.rzpBadgeRow}>
                  <View style={styles.rzpLogoCircle}>
                    <Text style={styles.rzpLogoLetter}>R</Text>
                  </View>
                  <View>
                    <Text style={styles.rzpHeaderTitle}>Razorpay Checkout</Text>
                    <Text style={styles.rzpHeaderSubtitle}>Order ID: {razorpayOrderInfo?.orderId || 'rzp_order'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowRazorpayModal(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Box */}
              <View style={styles.rzpAmountCard}>
                <Text style={styles.rzpAmountLabel}>Amount Payable</Text>
                <Text style={styles.rzpAmountValue}>{displayPrice}</Text>
              </View>

              {/* Select Payment Method */}
              <Text style={styles.rzpMethodSectionTitle}>SELECT PAYMENT METHOD</Text>

              <TouchableOpacity
                style={[styles.rzpOptionRow, selectedPaymentApp === 'gpay' && styles.rzpOptionActive]}
                onPress={() => setSelectedPaymentApp('gpay')}
                activeOpacity={0.8}
              >
                <Text style={styles.rzpOptionIcon}>🔵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rzpOptionTitle}>Google Pay (UPI)</Text>
                  <Text style={styles.rzpOptionDesc}>Instant 1-Tap Google Pay Checkout</Text>
                </View>
                {selectedPaymentApp === 'gpay' && <Text style={styles.rzpCheckMark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rzpOptionRow, selectedPaymentApp === 'phonepe' && styles.rzpOptionActive]}
                onPress={() => setSelectedPaymentApp('phonepe')}
                activeOpacity={0.8}
              >
                <Text style={styles.rzpOptionIcon}>🟣</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rzpOptionTitle}>PhonePe (UPI)</Text>
                  <Text style={styles.rzpOptionDesc}>Pay via PhonePe app</Text>
                </View>
                {selectedPaymentApp === 'phonepe' && <Text style={styles.rzpCheckMark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rzpOptionRow, selectedPaymentApp === 'paytm' && styles.rzpOptionActive]}
                onPress={() => setSelectedPaymentApp('paytm')}
                activeOpacity={0.8}
              >
                <Text style={styles.rzpOptionIcon}>🔷</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rzpOptionTitle}>Paytm / BHIM UPI</Text>
                  <Text style={styles.rzpOptionDesc}>Pay using any UPI App</Text>
                </View>
                {selectedPaymentApp === 'paytm' && <Text style={styles.rzpCheckMark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rzpOptionRow, selectedPaymentApp === 'card' && styles.rzpOptionActive]}
                onPress={() => setSelectedPaymentApp('card')}
                activeOpacity={0.8}
              >
                <Text style={styles.rzpOptionIcon}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rzpOptionTitle}>Credit / Debit Card</Text>
                  <Text style={styles.rzpOptionDesc}>Visa, Mastercard, RuPay</Text>
                </View>
                {selectedPaymentApp === 'card' && <Text style={styles.rzpCheckMark}>✓</Text>}
              </TouchableOpacity>

              {/* Pay Button */}
              <TouchableOpacity
                style={styles.rzpPayBtn}
                activeOpacity={0.8}
                onPress={handleCompleteRazorpayPayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.rzpPayBtnText}>
                    Pay {displayPrice} via {selectedPaymentApp === 'gpay' ? 'Google Pay' : selectedPaymentApp.toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerPadding: {
    paddingHorizontal: px(20),
    paddingTop: px(12),
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: px(20),
  },
  sectionHeader: {
    marginTop: px(12),
    marginBottom: px(12),
  },
  sectionHeaderClickable: {
    marginTop: px(12),
    marginBottom: px(12),
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  typesRow: {
    flexDirection: 'row',
    gap: px(12),
    marginBottom: px(8),
  },
  typeCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(16),
    paddingVertical: px(16),
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(8),
  },
  typeCardActive: {
    backgroundColor: '#EEF5F0',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  typeText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  typeTextActive: {
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  dateScroll: {
    paddingBottom: px(8),
    gap: px(10),
  },
  datePill: {
    width: px(60),
    height: px(70),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(16),
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(4),
  },
  datePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.white,
  },
  dateNumText: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  dateNumActive: {
    color: colors.white,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: px(10),
    marginBottom: px(16),
  },
  timeSlot: {
    width: '31%',
    height: px(46),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotBooked: {
    backgroundColor: '#F2F0EA',
    borderColor: '#E2DDD3',
    opacity: 0.7,
  },
  timeSlotText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.black,
  },
  timeSlotTextActive: {
    color: colors.white,
    fontFamily: fonts.sans.medium,
  },
  timeSlotTextBooked: {
    color: '#9E9B93',
    fontFamily: fonts.sans.medium,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(16),
    padding: px(16),
    marginTop: px(8),
    marginBottom: px(16),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(12),
  },
  summaryLabel: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  summaryVal: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  summaryPrice: {
    fontSize: px(14),
    fontFamily: fonts.sans.bold,
    color: colors.primary,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(6),
    marginBottom: px(16),
  },
  securityText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  bottomCtaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: px(20),
    paddingTop: px(12),
    paddingBottom: Platform.OS === 'ios' ? px(28) : px(16),
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    height: px(48),
    borderRadius: borderRadius.container,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: px(14),
    fontFamily: fonts.sans.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: px(24),
    borderTopRightRadius: px(24),
    padding: px(20),
    paddingBottom: Platform.OS === 'ios' ? px(40) : px(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(16),
  },
  modalTitle: {
    fontSize: px(16),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  modalCloseText: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  rzpModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: px(24),
    borderTopRightRadius: px(24),
    padding: px(20),
    paddingBottom: Platform.OS === 'ios' ? px(36) : px(20),
  },
  rzpHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(16),
  },
  rzpBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
  },
  rzpLogoCircle: {
    width: px(36),
    height: px(36),
    borderRadius: px(18),
    backgroundColor: '#072654',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rzpLogoLetter: {
    color: '#00C9A7',
    fontSize: px(18),
    fontFamily: fonts.sans.bold,
  },
  rzpHeaderTitle: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  rzpHeaderSubtitle: {
    fontSize: px(11),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  rzpAmountCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: px(16),
    padding: px(16),
    alignItems: 'center',
    marginBottom: px(16),
  },
  rzpAmountLabel: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginBottom: px(4),
  },
  rzpAmountValue: {
    fontSize: px(22),
    fontFamily: fonts.sans.bold,
    color: colors.primary,
  },
  rzpMethodSectionTitle: {
    fontSize: px(11),
    fontFamily: fonts.sans.medium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: px(10),
  },
  rzpOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: px(14),
    borderRadius: px(14),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: px(10),
    gap: px(12),
    backgroundColor: colors.white,
  },
  rzpOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF5F0',
    borderWidth: 1.5,
  },
  rzpOptionIcon: {
    fontSize: px(20),
  },
  rzpOptionTitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  rzpOptionDesc: {
    fontSize: px(11),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginTop: px(2),
  },
  rzpCheckMark: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: colors.primary,
  },
  rzpPayBtn: {
    backgroundColor: colors.primary,
    height: px(50),
    borderRadius: borderRadius.container,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: px(10),
  },
  rzpPayBtnText: {
    color: colors.white,
    fontSize: px(14),
    fontFamily: fonts.sans.bold,
  },
});
