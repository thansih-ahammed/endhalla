import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCounsellorBaseUrl } from '../../utils/config';
import { BookingRecord } from '../../utils/bookings';

export interface CounsellorProfile {
  _id: string;
  userId?: string;
  fullName: string;
  phone: string;
  gender?: string;
  title?: string;
  avatar?: string;
  areasOfFocus: string[];
  experienceYears: number;
  languages: string[];
  rates: { chat: number; voice: number; video: number };
  certificates?: string[];
  rating: number;
  reviewCount: number;
  bio?: string;
  availableSlots: string[];
  approvalStatus?: string;
  isVerified?: boolean;
  isOnboardingComplete?: boolean;
  hasFreeSessionOffer?: boolean;
  freeSessionDurationText?: string;
}

export interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  /** Already formatted by the backend, e.g. "₹18,000" */
  totalEarnings: string;
  rating: number;
  reviewCount: number;
}

export interface DashboardOverviewResponse {
  success: boolean;
  stats: DashboardStats;
  upcomingBookings: BookingRecord[];
}

export interface SendCounsellorOtpRequest {
  phone: string;
}

export interface VerifyCounsellorOtpRequest {
  phone: string;
  otp: string;
}

export interface OnboardingRequest {
  phone: string;
  fullName?: string;
  gender?: string;
  areasOfFocus?: string[];
  experienceYears?: number;
  languages?: string[];
  rates?: { chat: number; voice: number; video: number };
  certificates?: string[];
  bio?: string;
}

export interface UpdateSettingsRequest {
  phone: string;
  rates?: { chat: number; voice: number; video: number };
  availableSlots?: string[];
}

export interface CallTokenResponse {
  success: boolean;
  apiKey: string;
  token: string;
  callId: string;
  userId: string;
  userName: string;
}

export interface ChatTokenResponse {
  success: boolean;
  apiKey: string;
  token: string;
  userId: string;
  userName: string;
}

const dynamicBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const baseUrl = getCounsellorBaseUrl();
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      headers.set('Content-Type', 'application/json');
      const token = (getState() as any).auth?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  });
  return rawBaseQuery(args, api, extraOptions);
};

export const counsellorApi = createApi({
  reducerPath: 'counsellorApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['CounsellorProfile', 'Dashboard', 'Booking'],
  endpoints: (builder) => ({
    // Auth & Onboarding Endpoints
    sendCounsellorOTP: builder.mutation<{ success: boolean; message: string; otp?: string }, SendCounsellorOtpRequest>({
      query: (body) => ({
        url: '/auth/send-otp',
        method: 'POST',
        body,
      }),
    }),
    verifyCounsellorOTP: builder.mutation<{ success: boolean; token: string; counsellor: any; user: any }, VerifyCounsellorOtpRequest>({
      query: (body) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CounsellorProfile', 'Dashboard'],
    }),
    completeOnboarding: builder.mutation<{ success: boolean; message: string; data: any }, OnboardingRequest>({
      query: (body) => ({
        url: '/auth/onboarding',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CounsellorProfile', 'Dashboard'],
    }),
    getCounsellorProfile: builder.query<{ success: boolean; data: CounsellorProfile }, string>({
      query: (phone) => `/auth/profile/${phone}`,
      providesTags: ['CounsellorProfile'],
    }),
    updateCounsellorPushToken: builder.mutation<{ success: boolean }, string>({
      query: (token) => ({
        url: '/auth/push-token',
        method: 'PUT',
        body: { token },
      }),
    }),

    // Dashboard Endpoints
    getDashboardOverview: builder.query<DashboardOverviewResponse, string>({
      query: (phone) => `/dashboard/overview/${phone}`,
      providesTags: ['Dashboard'],
    }),
    updateCounsellorSettings: builder.mutation<{ success: boolean; message: string; data: CounsellorProfile }, UpdateSettingsRequest>({
      query: (body) => ({
        url: '/dashboard/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CounsellorProfile', 'Dashboard'],
    }),

    // Booking / video-call endpoints
    getCounsellorBookingById: builder.query<{ success: boolean; data: BookingRecord }, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),
    getCounsellorCallToken: builder.query<CallTokenResponse, string>({
      query: (bookingId) => `/bookings/${bookingId}/call-token`,
    }),
    endCounsellorCall: builder.mutation<{ success: boolean }, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/call/end`,
        method: 'POST',
      }),
    }),
    getCounsellorChatToken: builder.query<ChatTokenResponse, void>({
      query: () => '/chat/token',
    }),
    getCounsellorChatChannel: builder.query<{ success: boolean; channelId: string }, string>({
      query: (bookingId) => `/bookings/${bookingId}/chat-channel`,
    }),
  }),
});

export const {
  useSendCounsellorOTPMutation,
  useVerifyCounsellorOTPMutation,
  useCompleteOnboardingMutation,
  useGetCounsellorProfileQuery,
  useUpdateCounsellorPushTokenMutation,
  useGetDashboardOverviewQuery,
  useUpdateCounsellorSettingsMutation,
  useGetCounsellorBookingByIdQuery,
  useLazyGetCounsellorCallTokenQuery,
  useEndCounsellorCallMutation,
  useGetCounsellorChatTokenQuery,
  useLazyGetCounsellorChatTokenQuery,
  useLazyGetCounsellorChatChannelQuery,
} = counsellorApi;
