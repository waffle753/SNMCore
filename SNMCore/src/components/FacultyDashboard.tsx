import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../constants/theme';
import { getAuthToken, getAuthUser } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';

type LocationType = 'indoor' | 'outdoor' | 'off_campus';
type SpaceType = 'specific_area' | 'entire_facility';
type Facility = { facility_id: number; facility_name: string };
type Area = { area_id: number; area_name: string };
type EventRequest = {
  request_id: number;
  subject: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  event_start_datetime: string | null;
  event_end_datetime: string | null;
  event_location_type: LocationType | null;
  event_facility_name: string | null;
  event_area_name: string | null;
  event_space_type: SpaceType | null;
  event_location_name: string | null;
  created_at: string;
};
type EventForm = {
  eventName: string;
  purpose: string;
  expectedAttendees: string;
  locationType: LocationType;
  facilityId: number | null;
  spaceType: SpaceType;
  areaId: number | null;
  locationName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};
type Profile = { id: number; name: string; email: string; role: 'admin' | 'faculty' | 'student' };
type PickerField = 'startDate' | 'startTime' | 'endDate' | 'endTime';
const datePart = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const timePart = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
const dateValue = (date: string, time = '09:00') => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};
const emptyForm = (): EventForm => {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    eventName: '',
    purpose: '',
    expectedAttendees: '',
    locationType: 'indoor',
    facilityId: null,
    spaceType: 'specific_area',
    areaId: null,
    locationName: '',
    startDate: datePart(start),
    startTime: timePart(start),
    endDate: datePart(end),
    endTime: timePart(end),
  };
};
const headers = () => ({ Authorization: `Bearer ${getAuthToken() || ''}` });
const readApiResponse = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
  const body = await response.text();
  let result: T & { message?: string };
  try {
    result = JSON.parse(body) as T & { message?: string };
  } catch {
    throw new Error(`${fallbackMessage} (HTTP ${response.status}; backend returned a non-JSON response).`);
  }
  if (!response.ok) throw new Error(result.message || `${fallbackMessage} (HTTP ${response.status}).`);
  return result;
};
const fetchEventRequests = async (): Promise<EventRequest[]> => {
  const response = await fetch(`${API_URL}/api/event-requests/mine`, { headers: headers() });
  return readApiResponse<EventRequest[]>(response, 'Unable to load your event requests.');
};
const fetchRequestFacilities = async (): Promise<Facility[]> => {
  const response = await fetch(`${API_URL}/api/facilities`, { headers: headers() });
  return readApiResponse<Facility[]>(response, 'Unable to load facilities.');
};
const fetchProfile = async (): Promise<Profile> => {
  const response = await fetch(`${API_URL}/api/profile`, { headers: headers() });
  const result: Profile & { message?: string } = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load profile.');
  return result;
};
const formatDateTime = (value: string | null) => {
  if (!value) return 'Schedule pending';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function FacultyDashboard() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [requestLoadError, setRequestLoadError] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityLoadError, setFacilityLoadError] = useState('');
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaLoadError, setAreaLoadError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(getAuthUser() || null);
  const [loading, setLoading] = useState(true);
  const [requestVisible, setRequestVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [picker, setPicker] = useState<PickerField | null>(null);
  const currentUser = getAuthUser();

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await fetchEventRequests());
      setRequestLoadError('');
    } catch (error) {
      setRequestLoadError(responseMessage(error));
      throw error;
    }
  }, []);

  const refreshFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    setFacilityLoadError('');
    try {
      setFacilities(await fetchRequestFacilities());
    } catch (error) {
      setFacilityLoadError(responseMessage(error));
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        fetchEventRequests(),
        fetchRequestFacilities(),
        fetchProfile(),
      ]);
      if (!active) return;

      const [requestsResult, facilitiesResult, profileResult] = results;
      if (requestsResult.status === 'fulfilled') {
        setRequests(requestsResult.value);
        setRequestLoadError('');
      } else {
        setRequestLoadError(responseMessage(requestsResult.reason));
      }
      if (facilitiesResult.status === 'fulfilled') {
        setFacilities(facilitiesResult.value);
        setFacilityLoadError('');
      } else {
        setFacilityLoadError(responseMessage(facilitiesResult.reason));
      }
      setFacilitiesLoading(false);
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form.facilityId || form.locationType !== 'indoor') {
      setAreaLoadError('');
      return;
    }
    let active = true;
    setAreas([]);
    setAreaLoadError('');
    fetch(`${API_URL}/api/facilities/${form.facilityId}/areas`, { headers: headers() })
      .then((response) => readApiResponse<Area[]>(response, 'Unable to load facility areas.'))
      .then((result) => {
        if (active) {
          setAreas(result);
          setAreaLoadError('');
        }
      })
      .catch((error: unknown) => { if (active) setAreaLoadError(responseMessage(error)); });
    return () => { active = false; };
  }, [form.facilityId, form.locationType]);

  const updateForm = (patch: Partial<EventForm>) => setForm((current) => ({ ...current, ...patch }));
  const closeRequest = () => {
    setRequestVisible(false);
    setPicker(null);
    setForm(emptyForm());
    setAreas([]);
  };
  const handleDateTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setPicker(null);
      return;
    }
    if (!selected || !picker) return;
    updateForm({ [picker]: picker.endsWith('Date') ? datePart(selected) : timePart(selected) });
    if (process.env.EXPO_OS === 'android') setPicker(null);
  };

  const submitRequest = async () => {
    if (!form.eventName.trim()) return Alert.alert('Missing information', 'Enter an event name.');
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      return Alert.alert('Missing schedule', 'Choose a start and end date and time.');
    }
    if (form.locationType === 'indoor' && (!form.facilityId || (form.spaceType === 'specific_area' && !form.areaId))) {
      return Alert.alert('Missing location', 'Select a facility and booking area.');
    }
    if (form.locationType !== 'indoor' && !form.locationName.trim()) {
      return Alert.alert('Missing location', 'Enter the event location name.');
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/event-requests`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          eventName: form.eventName.trim(),
          purpose: form.purpose.trim(),
          expectedAttendees: form.expectedAttendees || null,
          locationName: form.locationName.trim(),
        }),
      });
      await readApiResponse<{ requestId: number; status: string }>(response, 'Unable to submit event request.');
      closeRequest();
      await loadRequests();
      Alert.alert('Request submitted', 'Your event request is pending admin review.');
    } catch (error) {
      Alert.alert('Request failed', responseMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
        <View style={styles.pageHeading}>
          <Text style={styles.eyebrow}>FACULTY</Text>
          <Text style={styles.title}>Event requests</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <View style={styles.profileAvatar}><Ionicons name="person-outline" size={22} color={colors.RED} /></View>
          <View style={styles.welcomeBody}>
            <Text style={styles.welcomeTitle}>Welcome, {profile?.name || currentUser?.name || 'Faculty'}</Text>
            <Text style={styles.welcomeText}>View events, request an event, and track your requests.</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={24} color={colors.RED} />
            <Text style={styles.actionTitle}>Event calendar</Text>
            <Text style={styles.actionText}>View official events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => { setForm(emptyForm()); setAreas([]); setAreaLoadError(''); setRequestVisible(true); void refreshFacilities(); }}>
            <Ionicons name="add-circle-outline" size={24} color={colors.RED} />
            <Text style={styles.actionTitle}>Request event</Text>
            <Text style={styles.actionText}>Send for admin approval</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My event requests</Text>
            <Text style={styles.sectionSubtitle}>Only you can see these requests.</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Refresh requests" onPress={() => void loadRequests().catch((error: unknown) => Alert.alert('Refresh failed', responseMessage(error)))}>
            <Ionicons name="refresh-outline" size={21} color={colors.RED} />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color={colors.RED} style={styles.loader} /> : requestLoadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.RED} />
            <Text style={styles.errorText}>{requestLoadError}</Text>
            <TouchableOpacity onPress={() => void loadRequests().catch(() => {})}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length ? (
          requests.map((request) => (
            <View key={request.request_id} style={styles.requestCard}>
              <View style={styles.requestTop}>
                <Text style={styles.requestTitle}>{request.subject}</Text>
                <StatusBadge status={request.status} />
              </View>
              <Text style={styles.requestMeta}>
                {request.event_location_type === 'indoor'
                  ? `${request.event_facility_name || 'Facility'}${request.event_area_name ? ` • ${request.event_area_name}` : ''}`
                  : request.event_location_name || 'Location not set'}
              </Text>
              <Text style={styles.requestMeta}>
                Schedule {formatDateTime(request.event_start_datetime)} – {formatDateTime(request.event_end_datetime)}
              </Text>
              {request.description ? <Text style={styles.requestPurpose}>{request.description}</Text> : null}
              <Text style={styles.requestDate}>Submitted {formatDateTime(request.created_at)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={24} color={colors.TEXT_GRAY} />
            <Text style={styles.emptyText}>No event requests yet. Submit one when you need an event scheduled.</Text>
          </View>
        )}

        </ScrollView>

      <Modal visible={requestVisible} animationType="slide" onRequestClose={closeRequest}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalEyebrow}>FACULTY EVENT REQUEST</Text><Text style={styles.modalTitle}>Request an event</Text></View>
            <TouchableOpacity onPress={closeRequest}><Ionicons name="close" size={24} color={colors.DARK} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <FieldLabel label="Event name" />
            <TextInput value={form.eventName} onChangeText={(value) => updateForm({ eventName: value })} placeholder="e.g. Department seminar" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} maxLength={255} />
            <FieldLabel label="Purpose or details (optional)" />
            <TextInput value={form.purpose} onChangeText={(value) => updateForm({ purpose: value })} placeholder="Tell the admin team about your event" placeholderTextColor={colors.TEXT_GRAY} style={[styles.input, styles.multilineInput]} multiline />
            <FieldLabel label="Expected attendees (optional)" />
            <TextInput value={form.expectedAttendees} onChangeText={(value) => updateForm({ expectedAttendees: value.replace(/[^0-9]/g, '') })} keyboardType="number-pad" placeholder="Number of attendees" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />

            <FieldLabel label="Location type" />
            <ChoiceRow options={[[ 'indoor', 'Indoor' ], ['outdoor', 'Outdoor'], ['off_campus', 'Off campus']]} value={form.locationType} onSelect={(value) => { setAreas([]); setAreaLoadError(''); updateForm({ locationType: value as LocationType, facilityId: null, areaId: null }); }} />
            {form.locationType === 'indoor' ? <>
              <FieldLabel label="Facility" />
              <View style={styles.optionList}>
                {facilities.map((facility) => (
                  <ChoiceButton key={facility.facility_id} label={facility.facility_name} selected={form.facilityId === facility.facility_id} onPress={() => { setAreas([]); updateForm({ facilityId: facility.facility_id, areaId: null }); }} />
                ))}
              </View>
              {facilitiesLoading ? <ActivityIndicator color={colors.RED} /> : facilityLoadError ? <Text style={styles.errorText}>{facilityLoadError}</Text> : !facilities.length ? <Text style={styles.helperText}>No active facilities are available.</Text> : null}
              <FieldLabel label="Booking type" />
              <ChoiceRow options={[['specific_area', 'Specific area'], ['entire_facility', 'Entire facility']]} value={form.spaceType} onSelect={(value) => updateForm({ spaceType: value as SpaceType, areaId: null })} />
              {form.spaceType === 'specific_area' ? <>
                <FieldLabel label="Area" />
                <View style={styles.optionList}>
                  {areas.map((area) => (
                    <ChoiceButton key={area.area_id} label={area.area_name} selected={form.areaId === area.area_id} onPress={() => updateForm({ areaId: area.area_id })} />
                  ))}
                </View>
                {areaLoadError ? <Text style={styles.errorText}>{areaLoadError}</Text> : form.facilityId && !areas.length ? <Text style={styles.helperText}>No active areas in this facility.</Text> : null}
              </> : null}
            </> : <>
              <FieldLabel label="Location name" />
              <TextInput value={form.locationName} onChangeText={(value) => updateForm({ locationName: value })} placeholder="Enter event location" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} maxLength={255} />
            </>}

            <FieldLabel label="Start date and time" />
            <View style={styles.dateTimeRow}>
              <DateTimeField icon="calendar-outline" value={form.startDate} onPress={() => setPicker('startDate')} />
              <DateTimeField icon="time-outline" value={form.startTime} onPress={() => setPicker('startTime')} />
            </View>
            <FieldLabel label="End date and time" />
            <View style={styles.dateTimeRow}>
              <DateTimeField icon="calendar-outline" value={form.endDate} onPress={() => setPicker('endDate')} />
              <DateTimeField icon="time-outline" value={form.endTime} onPress={() => setPicker('endTime')} />
            </View>
            {picker ? <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={dateValue(form[picker.endsWith('Date') ? picker : picker === 'startTime' ? 'startDate' : 'endDate'], form[picker.endsWith('Time') ? picker : picker === 'startDate' ? 'startTime' : 'endTime'])}
                mode={picker.endsWith('Date') ? 'date' : 'time'}
                onChange={handleDateTimeChange}
              />
              {Platform.OS === 'ios' ? <TouchableOpacity style={styles.pickerDone} onPress={() => setPicker(null)}><Text style={styles.pickerDoneText}>Done</Text></TouchableOpacity> : null}
            </View> : null}
            <Text style={styles.reviewHint}>An administrator must approve your request before it appears on the official calendar.</Text>
            <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={() => void submitRequest()} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.WHITE} /> : <Text style={styles.primaryButtonText}>Submit request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

function responseMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to connect to the backend.';
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function ChoiceRow({ options, value, onSelect }: { options: [string, string][]; value: string; onSelect: (value: string) => void }) {
  return <View style={styles.choiceRow}>{options.map(([option, label]) => (
    <TouchableOpacity key={option} style={[styles.choice, value === option && styles.choiceActive]} onPress={() => onSelect(option)}>
      <Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  ))}</View>;
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.choiceButton, selected && styles.choiceButtonActive]} onPress={onPress}>
    <Text style={[styles.choiceButtonText, selected && styles.choiceTextActive]}>{label}</Text>
    {selected ? <Ionicons name="checkmark" size={15} color={colors.WHITE} /> : null}
  </TouchableOpacity>;
}

function DateTimeField({ icon, value, onPress }: { icon: 'calendar-outline' | 'time-outline'; value: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.dateTimeField} onPress={onPress}>
    <Ionicons name={icon} size={17} color={colors.RED} />
    <Text style={styles.dateTimeValue}>{value}</Text>
    <Ionicons name="chevron-down" size={15} color={colors.TEXT_GRAY} />
  </TouchableOpacity>;
}

function StatusBadge({ status }: { status: EventRequest['status'] }) {
  return <Text style={[styles.statusBadge, status === 'approved' && styles.approvedBadge, status === 'rejected' && styles.rejectedBadge]}>
    {status}
  </Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.CREAM },
  pageHeading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  eyebrow: { color: colors.RED, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 5, color: colors.DARK, fontSize: 22, fontWeight: '900' },
  content: { padding: 16, paddingBottom: 24 },
  welcomeCard: { padding: 17, borderRadius: 18, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  profileAvatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  welcomeBody: { flex: 1 },
  welcomeTitle: { color: colors.DARK, fontSize: 16, fontWeight: '900' },
  welcomeText: { marginTop: 4, color: colors.TEXT_GRAY, fontSize: 11, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionCard: { flex: 1, minHeight: 112, padding: 15, borderRadius: 16, backgroundColor: colors.SOFT_GOLD },
  actionTitle: { marginTop: 10, color: colors.DARK, fontSize: 13, fontWeight: '900' },
  actionText: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 10 },
  sectionHeader: { marginTop: 25, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.DARK, fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 10 },
  loader: { marginVertical: 25 },
  requestCard: { marginBottom: 10, padding: 14, borderRadius: 15, backgroundColor: colors.WHITE, elevation: 2 },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  requestTitle: { flex: 1, color: colors.DARK, fontSize: 14, fontWeight: '900' },
  statusBadge: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.SOFT_GOLD, color: colors.RED, fontSize: 9, fontWeight: '900', textTransform: 'capitalize' },
  approvedBadge: { backgroundColor: '#E3F3E7', color: '#24723A' },
  rejectedBadge: { backgroundColor: '#F8E4E4', color: colors.RED },
  requestMeta: { marginTop: 7, color: colors.TEXT_GRAY, fontSize: 10 },
  requestPurpose: { marginTop: 8, color: colors.DARK, fontSize: 11, lineHeight: 16 },
  requestDate: { marginTop: 9, color: colors.TEXT_GRAY, fontSize: 9 },
  emptyCard: { minHeight: 115, padding: 18, borderRadius: 15, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 8, color: colors.TEXT_GRAY, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  errorCard: { padding: 16, borderRadius: 15, backgroundColor: colors.WHITE, alignItems: 'center' },
  errorText: { marginTop: 8, color: colors.TEXT_GRAY, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  retryText: { marginTop: 10, color: colors.RED, fontSize: 11, fontWeight: '900' },
  modalScreen: { flex: 1, paddingTop: 54, backgroundColor: colors.CREAM },
  modalHeader: { minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: colors.RED, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  modalTitle: { color: colors.DARK, fontSize: 19, fontWeight: '900' },
  formContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 35 },
  fieldLabel: { marginTop: 14, marginBottom: 7, color: colors.DARK, fontSize: 11, fontWeight: '900' },
  input: { minHeight: 45, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(143,23,40,0.12)', borderRadius: 11, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 12 },
  multilineInput: { minHeight: 80, paddingTop: 11, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 7 },
  choice: { flex: 1, minHeight: 37, paddingHorizontal: 7, borderRadius: 9, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center' },
  choiceActive: { backgroundColor: colors.RED },
  choiceText: { color: colors.TEXT_GRAY, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  choiceTextActive: { color: colors.WHITE },
  optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 4 },
  choiceButtonActive: { backgroundColor: colors.RED },
  choiceButtonText: { color: colors.DARK, fontSize: 10, fontWeight: '700' },
  helperText: { marginTop: 6, color: colors.TEXT_GRAY, fontSize: 10 },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateTimeField: { flex: 1, minHeight: 43, paddingHorizontal: 9, borderRadius: 10, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  dateTimeValue: { flex: 1, color: colors.DARK, fontSize: 10, fontWeight: '700' },
  pickerWrapper: { marginTop: 8, padding: 8, borderRadius: 12, backgroundColor: colors.WHITE },
  pickerDone: { minHeight: 35, alignItems: 'flex-end', justifyContent: 'center' },
  pickerDoneText: { color: colors.RED, fontSize: 12, fontWeight: '900' },
  reviewHint: { marginTop: 16, color: colors.TEXT_GRAY, fontSize: 10, lineHeight: 15 },
  primaryButton: { minHeight: 46, marginTop: 16, borderRadius: 12, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.WHITE, fontSize: 12, fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
});
