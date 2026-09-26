import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';

type LocationType = 'indoor' | 'outdoor' | 'off_campus';
type SpaceType = 'specific_area' | 'entire_facility';
type Facility = { facility_id: number; facility_name: string; description?: string | null; status?: 'active' | 'inactive' };
type Area = { area_id: number; area_name: string };
type EventItem = {
  event_id: number;
  event_name: string;
  purpose: string | null;
  expected_attendees: number | null;
  location_type: LocationType | null;
  facility_id: number | null;
  facility_name: string | null;
  area_id: number | null;
  area_name: string | null;
  space_type: SpaceType | null;
  location_name: string | null;
  start_datetime: string;
  end_datetime: string;
  status: string;
  created_by_name: string | null;
  created_at: string | null;
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

type StatusFilter = 'all' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const datePart = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const timePart = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
const dateValue = (date: string, time = '09:00') => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};
const displayDate = (value: string) => value
  ? dateValue(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : 'Choose date';
const displayTime = (value: string) => value
  ? dateValue('2026-01-01', value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  : 'Choose time';

const emptyForm = (): EventForm => {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return ({
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
  });
};

const headers = () => ({ Authorization: `Bearer ${getAuthToken() || ''}` });
const formatDateTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};
const eventLocation = (event: EventItem) => event.location_type === 'indoor'
  ? `${event.facility_name || 'Facility'}${event.area_name ? ` - ${event.area_name}` : ' - Entire facility'}`
  : event.location_name || 'Location not set';

type AdminEventManagementProps = {
  mode?: 'all' | 'events' | 'facilities';
};

export default function AdminEventManagement({ mode = 'all' }: AdminEventManagementProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [managedFacilities, setManagedFacilities] = useState<Facility[]>([]);
  const [facilityEditorVisible, setFacilityEditorVisible] = useState(false);
  const [facilityEditingId, setFacilityEditingId] = useState<number | null>(null);
  const [facilityName, setFacilityName] = useState('');
  const [facilityDescription, setFacilityDescription] = useState('');
  const [facilitySaving, setFacilitySaving] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [activePicker, setActivePicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<EventItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const loadEvents = useCallback(async (searchValue = '') => {
    const response = await fetch(`${API_URL}/api/admin/events?search=${encodeURIComponent(searchValue)}`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load events.');
    setEvents(result);
  }, []);

  const loadFacilities = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/facilities`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load facilities.');
    setFacilities(result);
  }, []);

  const loadManagedFacilities = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/facilities?includeInactive=true`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load facilities.');
    setManagedFacilities(result);
  }, []);

  useEffect(() => {
    Promise.all([loadFacilities(), loadManagedFacilities()])
      .catch((error: unknown) => Alert.alert('Load failed', error instanceof Error ? error.message : 'Unable to load facilities.'))
      .finally(() => setLoading(false));
  }, [loadFacilities, loadManagedFacilities]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEvents(search).catch((error: unknown) => Alert.alert('Search failed', responseMessage(error)));
    }, 250);
    return () => clearTimeout(timer);
  }, [loadEvents, search]);

  useEffect(() => {
    if (!form.facilityId || form.locationType !== 'indoor') {
      setAreas([]);
      return;
    }
    fetch(`${API_URL}/api/admin/facilities/${form.facilityId}/areas`, { headers: headers() })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load areas.');
        setAreas(result);
      })
      .catch((error: unknown) => Alert.alert('Load failed', error instanceof Error ? error.message : 'Unable to load areas.'));
  }, [form.facilityId, form.locationType]);

  const updateForm = (patch: Partial<EventForm>) => setForm((current) => ({ ...current, ...patch }));
  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter((event) => event.status === statusFilter);

  const closeForm = () => {
    setFormVisible(false);
    setActivePicker(null);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleDateTimeChange = (event: DateTimePickerEvent, selectedValue?: Date) => {
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }
    if (!selectedValue || !activePicker) return;
    if (activePicker.endsWith('Date')) {
      updateForm({ [activePicker]: datePart(selectedValue) });
    } else {
      updateForm({ [activePicker]: timePart(selectedValue) });
    }
    if (event.type === 'set' && process.env.EXPO_OS === 'android') setActivePicker(null);
  };

  const openFacilityEditor = (facility?: Facility) => {
    setFacilityEditingId(facility?.facility_id ?? null);
    setFacilityName(facility?.facility_name ?? '');
    setFacilityDescription(facility?.description ?? '');
    setFacilityEditorVisible(true);
  };

  const saveFacility = async () => {
    if (!facilityName.trim()) return Alert.alert('Missing information', 'Enter a facility name.');
    setFacilitySaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/facilities${facilityEditingId ? `/${facilityEditingId}` : ''}`, {
        method: facilityEditingId ? 'PATCH' : 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityName: facilityName.trim(), description: facilityDescription.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save facility.');
      setFacilityEditorVisible(false);
      setFacilityEditingId(null);
      setFacilityName('');
      setFacilityDescription('');
      await Promise.all([loadFacilities(), loadManagedFacilities()]);
    } catch (error) {
      Alert.alert('Facility save failed', responseMessage(error));
    } finally {
      setFacilitySaving(false);
    }
  };

  const toggleFacilityStatus = async (facility: Facility) => {
    const nextStatus = facility.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`${API_URL}/api/admin/facilities/${facility.facility_id}`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update facility status.');
      await Promise.all([loadFacilities(), loadManagedFacilities()]);
      if (form.facilityId === facility.facility_id && nextStatus === 'inactive') updateForm({ facilityId: null, areaId: null });
    } catch (error) {
      Alert.alert('Facility update failed', responseMessage(error));
    }
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormVisible(true);
  };

  const openEdit = async (event: EventItem) => {
    const start = new Date(event.start_datetime.replace(' ', 'T'));
    const end = new Date(event.end_datetime.replace(' ', 'T'));
    setEditingId(event.event_id);
    setForm({
      eventName: event.event_name,
      purpose: event.purpose || '',
      expectedAttendees: event.expected_attendees == null ? '' : String(event.expected_attendees),
      locationType: event.location_type || 'indoor',
      facilityId: event.facility_id,
      spaceType: event.space_type || 'specific_area',
      areaId: event.area_id,
      locationName: event.location_name || '',
      startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
    });
    setFormVisible(true);
  };

  const saveEvent = async () => {
    if (!form.eventName.trim()) return Alert.alert('Missing information', 'Enter an event name.');
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      return Alert.alert('Missing schedule', 'Enter start date, start time, end date, and end time.');
    }
    const startsAt = new Date(`${form.startDate}T${form.startTime}:00`);
    const endsAt = new Date(`${form.endDate}T${form.endTime}:00`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return Alert.alert('Invalid schedule', 'End date and time must be later than start date and time.');
    }
    if (form.locationType === 'indoor' && (!form.facilityId || (form.spaceType === 'specific_area' && !form.areaId))) {
      return Alert.alert('Missing location', 'Select a facility and booking area.');
    }
    if (form.locationType !== 'indoor' && !form.locationName.trim()) {
      return Alert.alert('Missing location', 'Enter the event location name.');
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/events${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          eventName: form.eventName.trim(),
          purpose: form.purpose.trim(),
          expectedAttendees: form.expectedAttendees || null,
          locationName: form.locationName.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save event.');
      closeForm();
      await loadEvents(search);
    } catch (error) {
      Alert.alert('Save failed', responseMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const cancelEvent = (event: EventItem) => Alert.alert('Cancel event?', `Cancel ${event.event_name}? It will remain in records and no longer block this space.`, [
    { text: 'Keep event', style: 'cancel' },
    { text: 'Cancel event', style: 'destructive', onPress: async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/events/${event.event_id}/cancel`, { method: 'PATCH', headers: headers() });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to cancel event.');
        await loadEvents(search);
      } catch (error) {
        Alert.alert('Cancel failed', responseMessage(error));
      }
    } },
  ]);

  return (
    <View>
      {mode !== 'facilities' && <>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>ADMIN</Text>
          <Text style={styles.title}>Event Management</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Create event" style={styles.createButton} onPress={openCreate}>
          <Ionicons name="add" size={19} color={colors.WHITE} />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.TEXT_GRAY} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search events or locations"
          placeholderTextColor={colors.TEXT_GRAY}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.TEXT_GRAY} /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['all', 'scheduled', 'ongoing', 'completed', 'cancelled'] as const).map((filter) => (
          <TouchableOpacity key={filter} style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]} onPress={() => setStatusFilter(filter)}>
            <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </>}

      {mode !== 'events' && <>
      <View style={styles.facilityHeader}>
        <View>
          <Text style={styles.sectionTitle}>Facilities ({managedFacilities.length})</Text>
          <Text style={styles.facilityHint}>Active facilities appear in event location options.</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Add facility" style={styles.facilityAddButton} onPress={() => openFacilityEditor()}>
          <Ionicons name="add" size={17} color={colors.WHITE} />
          <Text style={styles.facilityAddText}>Add</Text>
        </TouchableOpacity>
      </View>
      {managedFacilities.map((facility) => (
        <View key={facility.facility_id} style={styles.facilityRow}>
          <View style={styles.facilityBody}>
            <Text style={styles.facilityName}>{facility.facility_name}</Text>
            {facility.description ? <Text style={styles.facilityHint}>{facility.description}</Text> : null}
          </View>
          <Text style={[styles.facilityStatus, facility.status === 'inactive' && styles.cancelledStatus]}>{facility.status}</Text>
          <TouchableOpacity accessibilityLabel={`Edit ${facility.facility_name}`} onPress={() => openFacilityEditor(facility)} style={styles.facilityIconButton}><Ionicons name="create-outline" size={18} color={colors.RED} /></TouchableOpacity>
          <TouchableOpacity accessibilityLabel={`${facility.status === 'active' ? 'Deactivate' : 'Activate'} ${facility.facility_name}`} onPress={() => toggleFacilityStatus(facility)} style={styles.facilityIconButton}><Ionicons name={facility.status === 'active' ? 'eye-off-outline' : 'checkmark-circle-outline'} size={18} color={colors.RED} /></TouchableOpacity>
        </View>
      ))}
      </>}

      {mode !== 'facilities' && (loading ? <ActivityIndicator color={colors.RED} style={styles.loader} /> : filteredEvents.length ? filteredEvents.map((event) => (
        <View key={event.event_id} style={styles.eventCard}>
          <View style={styles.eventTop}>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>{event.event_name}</Text>
              <Text style={styles.eventLocation}>{eventLocation(event)}</Text>
            </View>
            <Text style={[styles.status, event.status === 'cancelled' && styles.cancelledStatus]}>{event.status}</Text>
          </View>
          <Text style={styles.eventDate}>{formatDateTime(event.start_datetime)} - {formatDateTime(event.end_datetime)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setDetailsEvent(event)}><Ionicons name="eye-outline" size={15} color={colors.RED} /><Text style={styles.actionText}>View</Text></TouchableOpacity>
            {event.status !== 'cancelled' && <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(event)}><Ionicons name="create-outline" size={15} color={colors.RED} /><Text style={styles.actionText}>Edit</Text></TouchableOpacity>}
            {event.status !== 'cancelled' && <TouchableOpacity style={styles.actionButton} onPress={() => cancelEvent(event)}><Ionicons name="close-circle-outline" size={15} color={colors.RED} /><Text style={styles.actionText}>Cancel</Text></TouchableOpacity>}
          </View>
        </View>
      )) : <View style={styles.empty}><Ionicons name="calendar-outline" size={24} color={colors.GOLD} /><Text style={styles.emptyText}>No events found.</Text></View>)}

      {mode !== 'facilities' && <Modal visible={formVisible} animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit event' : 'Create event'}</Text>
            <TouchableOpacity accessibilityLabel="Close" onPress={closeForm}><Ionicons name="close" size={24} color={colors.DARK} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
            <FieldLabel label="Event name" />
            <TextInput value={form.eventName} onChangeText={(eventName) => updateForm({ eventName })} placeholder="Event name" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
            <FieldLabel label="Purpose" />
            <TextInput value={form.purpose} onChangeText={(purpose) => updateForm({ purpose })} placeholder="Purpose (optional)" placeholderTextColor={colors.TEXT_GRAY} style={[styles.input, styles.multiline]} multiline />
            <FieldLabel label="Expected attendees" />
            <TextInput value={form.expectedAttendees} onChangeText={(expectedAttendees) => updateForm({ expectedAttendees })} placeholder="Number (optional)" placeholderTextColor={colors.TEXT_GRAY} keyboardType="number-pad" style={styles.input} />

            <FieldLabel label="Location type" />
            <ChoiceRow options={[['indoor', 'Indoor'], ['outdoor', 'Outdoor'], ['off_campus', 'Off Campus']]} value={form.locationType} onSelect={(value) => updateForm({ locationType: value as LocationType, facilityId: null, areaId: null, locationName: '' })} />
            {form.locationType === 'indoor' ? <>
              <FieldLabel label="Facility" />
              <ChoiceDropdown options={facilities.map((facility) => ({ value: facility.facility_id, label: facility.facility_name }))} value={form.facilityId} placeholder="Select a facility" onSelect={(value) => updateForm({ facilityId: value, areaId: null })} />
              <FieldLabel label="Booking type" />
              <ChoiceRow options={[["specific_area", 'Specific area'], ['entire_facility', 'Entire facility']]} value={form.spaceType} onSelect={(value) => updateForm({ spaceType: value as SpaceType, areaId: null })} />
              {form.spaceType === 'specific_area' ? <>
                <FieldLabel label="Area" />
                <ChoiceDropdown options={areas.map((area) => ({ value: area.area_id, label: area.area_name }))} value={form.areaId} placeholder={form.facilityId ? 'Select an area' : 'Select a facility first'} onSelect={(value) => updateForm({ areaId: value })} />
              </> : null}
            </> : <>
              <FieldLabel label="Location name" />
              <TextInput value={form.locationName} onChangeText={(locationName) => updateForm({ locationName })} placeholder={form.locationType === 'outdoor' ? 'School Grounds' : 'Venue name'} placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
            </>}

            <FieldLabel label="Start date" />
            <DateTimeField icon="calendar-outline" value={displayDate(form.startDate)} onPress={() => setActivePicker('startDate')} />
            <FieldLabel label="Start time" />
            <DateTimeField icon="time-outline" value={displayTime(form.startTime)} onPress={() => setActivePicker('startTime')} />
            <FieldLabel label="End date" />
            <DateTimeField icon="calendar-outline" value={displayDate(form.endDate)} onPress={() => setActivePicker('endDate')} />
            <FieldLabel label="End time" />
            <DateTimeField icon="time-outline" value={displayTime(form.endTime)} onPress={() => setActivePicker('endTime')} />
            {activePicker && <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={dateValue(
                  activePicker === 'startDate' ? form.startDate : activePicker === 'endDate' ? form.endDate : activePicker === 'startTime' ? form.startDate : form.endDate,
                  activePicker === 'startTime' ? form.startTime : activePicker === 'endTime' ? form.endTime : '09:00'
                )}
                mode={activePicker.endsWith('Date') ? 'date' : 'time'}
                display="spinner"
                onChange={handleDateTimeChange}
              />
              <TouchableOpacity style={styles.pickerDone} onPress={() => setActivePicker(null)}><Text style={styles.pickerDoneText}>Done</Text></TouchableOpacity>
            </View>}
            <TouchableOpacity style={styles.saveButton} onPress={saveEvent} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create scheduled event'}</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>}

      {mode !== 'events' && <Modal visible={facilityEditorVisible} transparent animationType="slide" onRequestClose={() => setFacilityEditorVisible(false)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.facilityEditor}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{facilityEditingId ? 'Edit facility' : 'Add facility'}</Text><TouchableOpacity onPress={() => setFacilityEditorVisible(false)}><Ionicons name="close" size={22} color={colors.DARK} /></TouchableOpacity></View>
            <FieldLabel label="Facility name" />
            <TextInput value={facilityName} onChangeText={setFacilityName} placeholder="e.g. Gym" placeholderTextColor={colors.TEXT_GRAY} maxLength={150} style={styles.input} />
            <FieldLabel label="Description" />
            <TextInput value={facilityDescription} onChangeText={setFacilityDescription} placeholder="Optional details" placeholderTextColor={colors.TEXT_GRAY} multiline style={[styles.input, styles.multiline]} />
            <TouchableOpacity style={styles.saveButton} onPress={saveFacility} disabled={facilitySaving}><Text style={styles.saveText}>{facilitySaving ? 'Saving...' : facilityEditingId ? 'Save facility' : 'Add facility'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {mode !== 'facilities' && <Modal visible={detailsEvent !== null} transparent animationType="fade" onRequestClose={() => setDetailsEvent(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Event details</Text><TouchableOpacity onPress={() => setDetailsEvent(null)}><Ionicons name="close" size={22} color={colors.DARK} /></TouchableOpacity></View>
            {detailsEvent && <>
              <Text style={styles.detailName}>{detailsEvent.event_name}</Text>
              <Detail label="Location" value={eventLocation(detailsEvent)} />
              {detailsEvent.space_type && <Detail label="Booking type" value={detailsEvent.space_type === 'entire_facility' ? 'Entire facility' : 'Specific area'} />}
              <Detail label="Start" value={formatDateTime(detailsEvent.start_datetime)} />
              <Detail label="End" value={formatDateTime(detailsEvent.end_datetime)} />
              {detailsEvent.purpose && <Detail label="Purpose" value={detailsEvent.purpose} />}
              {detailsEvent.expected_attendees != null && <Detail label="Expected attendees" value={String(detailsEvent.expected_attendees)} />}
              <Detail label="Status" value={detailsEvent.status} />
              {detailsEvent.created_by_name && <Detail label="Created by" value={detailsEvent.created_by_name} />}
              {detailsEvent.created_at && <Detail label="Created" value={formatDateTime(detailsEvent.created_at)} />}
            </>}
          </View>
        </View>
      </Modal>}
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
  return <View style={styles.choiceRow}>{options.map(([option, label]) => <TouchableOpacity key={option} style={[styles.choice, value === option && styles.choiceActive]} onPress={() => onSelect(option)}><Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>)}</View>;
}

function ChoiceDropdown({ options, value, placeholder, onSelect }: { options: { value: number; label: string }[]; value: number | null; placeholder: string; onSelect: (value: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.dropdownWrap}>
    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setExpanded((current) => !current)} disabled={!options.length}>
      <Text style={[styles.dropdownValue, !selected && styles.placeholder]}>{selected?.label || placeholder}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.RED} />
    </TouchableOpacity>
    {expanded && options.length > 0 && <ScrollView style={styles.dropdownOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {options.map((option) => <TouchableOpacity key={option.value} style={[styles.dropdownOption, value === option.value && styles.dropdownOptionActive]} onPress={() => { onSelect(option.value); setExpanded(false); }}>
        <Text style={[styles.dropdownOptionText, value === option.value && styles.dropdownOptionTextActive]}>{option.label}</Text>
        {value === option.value && <Ionicons name="checkmark" size={16} color={colors.WHITE} />}
      </TouchableOpacity>)}
    </ScrollView>}
  </View>;
}

function DateTimeField({ icon, value, onPress }: { icon: 'calendar-outline' | 'time-outline'; value: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.dateTimeField} onPress={onPress}>
    <Ionicons name={icon} size={18} color={colors.RED} />
    <Text style={styles.dateTimeValue}>{value}</Text>
    <Ionicons name="chevron-down" size={16} color={colors.TEXT_GRAY} />
  </TouchableOpacity>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 12 },
  eyebrow: { color: colors.RED, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 3, color: colors.DARK, fontSize: 18, fontWeight: '900' },
  createButton: { height: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.RED, flexDirection: 'row', alignItems: 'center', gap: 4 },
  createText: { color: colors.WHITE, fontSize: 12, fontWeight: '900' },
  searchBox: { height: 44, marginBottom: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(143,23,40,0.08)' },
  searchInput: { flex: 1, color: colors.DARK, fontSize: 12 },
  filterRow: { gap: 7, paddingBottom: 12 },
  filterChip: { minHeight: 30, paddingHorizontal: 11, justifyContent: 'center', borderRadius: 9, backgroundColor: colors.WHITE },
  filterChipActive: { backgroundColor: colors.RED },
  filterText: { color: colors.TEXT_GRAY, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  filterTextActive: { color: colors.WHITE },
  facilityHeader: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.DARK, fontSize: 13, fontWeight: '900' },
  facilityHint: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 9 },
  facilityAddButton: { height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.RED, flexDirection: 'row', alignItems: 'center', gap: 3 },
  facilityAddText: { color: colors.WHITE, fontSize: 10, fontWeight: '900' },
  facilityRow: { minHeight: 49, marginBottom: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 8 },
  facilityBody: { flex: 1 },
  facilityName: { color: colors.DARK, fontSize: 11, fontWeight: '900' },
  facilityStatus: { color: colors.RED, fontSize: 8, fontWeight: '900', textTransform: 'capitalize' },
  facilityIconButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  loader: { marginVertical: 24 },
  eventCard: { marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: colors.WHITE, borderWidth: 1, borderColor: 'rgba(143,23,40,0.08)' },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  eventBody: { flex: 1 },
  eventTitle: { color: colors.DARK, fontSize: 14, fontWeight: '900' },
  eventLocation: { marginTop: 4, color: colors.TEXT_GRAY, fontSize: 11 },
  status: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.SOFT_GOLD, color: colors.RED, fontSize: 9, fontWeight: '900', textTransform: 'capitalize' },
  cancelledStatus: { backgroundColor: 'rgba(143,23,40,0.1)' },
  eventDate: { marginTop: 9, color: colors.TEXT_GRAY, fontSize: 10 },
  actions: { flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(143,23,40,0.08)' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.RED, fontSize: 10, fontWeight: '800' },
  empty: { padding: 24, alignItems: 'center', borderRadius: 14, backgroundColor: colors.WHITE },
  emptyText: { marginTop: 8, color: colors.TEXT_GRAY, fontSize: 12 },
  modalScreen: { flex: 1, paddingTop: 58, backgroundColor: colors.CREAM },
  modalHeader: { minHeight: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.DARK, fontSize: 20, fontWeight: '900' },
  formContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: { marginTop: 8, marginBottom: 6, color: colors.DARK, fontSize: 11, fontWeight: '900' },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 12 },
  multiline: { minHeight: 76, paddingTop: 10, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 7 },
  choice: { flex: 1, minHeight: 40, padding: 8, borderRadius: 9, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(143,23,40,0.08)' },
  choiceActive: { backgroundColor: colors.RED, borderColor: colors.RED },
  choiceText: { color: colors.TEXT_GRAY, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  choiceTextActive: { color: colors.WHITE },
  dropdownWrap: { zIndex: 2 },
  dropdownTrigger: { minHeight: 46, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(143,23,40,0.12)' },
  dropdownValue: { color: colors.DARK, fontSize: 12, fontWeight: '700' },
  dropdownOptions: { maxHeight: 190, marginTop: 4, padding: 5, borderRadius: 10, backgroundColor: colors.WHITE, borderWidth: 1, borderColor: 'rgba(143,23,40,0.12)' },
  dropdownOption: { minHeight: 40, paddingHorizontal: 10, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownOptionActive: { backgroundColor: colors.RED },
  dropdownOptionText: { color: colors.DARK, fontSize: 11, fontWeight: '700' },
  dropdownOptionTextActive: { color: colors.WHITE },
  placeholder: { color: colors.TEXT_GRAY, fontSize: 11 },
  dateTimeField: { height: 46, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(143,23,40,0.12)' },
  dateTimeValue: { flex: 1, color: colors.DARK, fontSize: 12, fontWeight: '700' },
  datePickerWrap: { marginTop: 8, padding: 8, borderRadius: 12, backgroundColor: colors.WHITE },
  pickerDone: { alignSelf: 'flex-end', minHeight: 34, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 8, backgroundColor: colors.RED },
  pickerDoneText: { color: colors.WHITE, fontSize: 11, fontWeight: '900' },
  saveButton: { height: 48, marginTop: 20, borderRadius: 12, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.WHITE, fontSize: 13, fontWeight: '900' },
  detailBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(36,22,25,0.45)' },
  detailCard: { padding: 18, borderRadius: 16, backgroundColor: colors.CREAM },
  facilityEditor: { padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.CREAM },
  detailName: { marginTop: 12, marginBottom: 8, color: colors.RED, fontSize: 18, fontWeight: '900' },
  detailRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(143,23,40,0.08)' },
  detailLabel: { color: colors.TEXT_GRAY, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { marginTop: 3, color: colors.DARK, fontSize: 12, fontWeight: '700' },
});