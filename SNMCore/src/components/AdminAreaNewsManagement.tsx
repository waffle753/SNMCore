import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';
type Mode = 'areas' | 'news';
type Facility = { facility_id: number; facility_name: string };
type Area = { area_id: number; facility_id: number; facility_name: string; area_name: string; description: string | null; status: 'active' | 'inactive' };
type Announcement = { announcement_id: number; title: string; message: string; external_url: string | null; audience: 'all' | 'faculty' | 'student'; status: 'draft' | 'published' | 'archived'; created_by_name: string | null; created_at: string };
type Props = { mode: Mode };
const authHeaders = () => ({ Authorization: `Bearer ${getAuthToken() || ''}` });

export default function AdminAreaNewsManagement({ mode }: Props) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [areaName, setAreaName] = useState('');
  const [description, setDescription] = useState('');
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementExternalUrl, setAnnouncementExternalUrl] = useState('');
  const [audience, setAudience] = useState<Announcement['audience']>('all');

  const loadFacilities = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/facilities`, { headers: authHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load facilities.');
    setFacilities(result);
    return result as Facility[];
  }, []);
  const loadAreas = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/areas?includeInactive=true`, { headers: authHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load areas.');
    setAreas(result);
  }, []);
  const loadAnnouncements = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/admin/announcements`, { headers: authHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load announcements.');
    setAnnouncements(result);
  }, []);

  const load = useCallback(async () => {
    try {
      if (mode === 'areas') {
        const activeFacilities = await loadFacilities();
        setFacilityId((current) => current ?? activeFacilities[0]?.facility_id ?? null);
        await loadAreas();
      } else {
        await loadAnnouncements();
      }
    } catch (error) {
      Alert.alert('Load failed', error instanceof Error ? error.message : 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [loadAreas, loadAnnouncements, loadFacilities, mode]);

  useEffect(() => { void load(); }, [load]);

  const openAreaEditor = (area?: Area) => {
    setEditingId(area?.area_id ?? null);
    setAreaName(area?.area_name ?? '');
    setDescription(area?.description ?? '');
    setFacilityId(area?.facility_id ?? facilities[0]?.facility_id ?? null);
    setEditorVisible(true);
  };
  const saveArea = async () => {
    if (!areaName.trim()) return Alert.alert('Missing information', 'Enter an area name.');
    if (!facilityId) return Alert.alert('Missing facility', 'Add or activate a facility first.');
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/areas${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaName: areaName.trim(), description: description.trim(), ...(!editingId && { facilityId }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save area.');
      setEditorVisible(false);
      setAreaName('');
      setDescription('');
      setEditingId(null);
      await loadAreas();
    } catch (error) {
      Alert.alert('Area save failed', error instanceof Error ? error.message : 'Unable to save area.');
    } finally { setSaving(false); }
  };
  const toggleArea = async (area: Area) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/areas/${area.area_id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: area.status === 'active' ? 'inactive' : 'active' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update area.');
      await loadAreas();
    } catch (error) {
      Alert.alert('Area update failed', error instanceof Error ? error.message : 'Unable to update area.');
    }
  };

  const openAnnouncementEditor = (announcement?: Announcement) => {
    setSelectedAnnouncement(announcement ?? null);
    setAnnouncementTitle(announcement?.title ?? '');
    setAnnouncementMessage(announcement?.message ?? '');
    setAnnouncementExternalUrl(announcement?.external_url ?? '');
    setAudience(announcement?.audience ?? 'all');
    setEditorVisible(true);
  };
  const saveAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return Alert.alert('Missing information', 'Enter a title and announcement message.');
    setSaving(true);
    try {
      const response = await fetch(selectedAnnouncement ? `${API_URL}/api/admin/announcements/${selectedAnnouncement.announcement_id}` : `${API_URL}/api/announcements`, {
        method: selectedAnnouncement ? 'PATCH' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: announcementTitle.trim(), message: announcementMessage.trim(), externalUrl: announcementExternalUrl.trim(), audience }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save announcement.');
      setEditorVisible(false);
      await loadAnnouncements();
    } catch (error) {
      Alert.alert('Announcement save failed', error instanceof Error ? error.message : 'Unable to save announcement.');
    } finally { setSaving(false); }
  };
  const changeAnnouncementStatus = async (announcement: Announcement, status: Announcement['status']) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/announcements/${announcement.announcement_id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update announcement.');
      await loadAnnouncements();
    } catch (error) {
      Alert.alert('Announcement update failed', error instanceof Error ? error.message : 'Unable to update announcement.');
    }
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingId(null);
    setSelectedAnnouncement(null);
  };

  return (
    <View>
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>ADMIN</Text>
          <Text style={styles.title}>{mode === 'areas' ? 'Manage Areas' : 'Manage Announcement / News'}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => mode === 'areas' ? openAreaEditor() : openAnnouncementEditor()}>
          <Ionicons name="add" size={18} color={colors.WHITE} />
          <Text style={styles.primaryButtonText}>{mode === 'areas' ? 'Add area' : 'New post'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={colors.RED} style={styles.loader} /> : mode === 'areas' ? (
        areas.length ? areas.map((area) => (
          <View key={area.area_id} style={styles.itemCard}>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{area.area_name}</Text>
              <Text style={styles.meta}>{area.facility_name}{area.description ? ` · ${area.description}` : ''}</Text>
            </View>
            <Text style={[styles.status, area.status === 'inactive' && styles.inactive]}>{area.status}</Text>
            <TouchableOpacity accessibilityLabel={`Edit ${area.area_name}`} onPress={() => openAreaEditor(area)} style={styles.iconButton}><Ionicons name="create-outline" size={19} color={colors.RED} /></TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`${area.status === 'active' ? 'Deactivate' : 'Activate'} ${area.area_name}`} onPress={() => toggleArea(area)} style={styles.iconButton}><Ionicons name={area.status === 'active' ? 'eye-off-outline' : 'checkmark-circle-outline'} size={19} color={colors.RED} /></TouchableOpacity>
          </View>
        )) : <EmptyState text="No areas yet. Add an area to a facility." />
      ) : announcements.length ? announcements.map((announcement) => (
        <View key={announcement.announcement_id} style={styles.itemCard}>
          <View style={styles.itemBody}>
            <Text style={styles.itemTitle}>{announcement.title}</Text>
            <Text style={styles.message} numberOfLines={3}>{announcement.message}</Text>
            <Text style={styles.meta}>{announcement.audience === 'all' ? 'Everyone' : announcement.audience} · {announcement.created_by_name || 'Admin'}</Text>
          </View>
          <View style={styles.newsActions}>
            <Text style={[styles.status, announcement.status !== 'published' && styles.inactive]}>{announcement.status}</Text>
            <TouchableOpacity accessibilityLabel="Edit announcement" onPress={() => openAnnouncementEditor(announcement)} style={styles.iconButton}><Ionicons name="create-outline" size={19} color={colors.RED} /></TouchableOpacity>
            {announcement.status !== 'published' && <TouchableOpacity accessibilityLabel="Publish announcement" onPress={() => changeAnnouncementStatus(announcement, 'published')} style={styles.iconButton}><Ionicons name="paper-plane-outline" size={18} color={colors.RED} /></TouchableOpacity>}
            {announcement.status !== 'archived' && <TouchableOpacity accessibilityLabel="Archive announcement" onPress={() => changeAnnouncementStatus(announcement, 'archived')} style={styles.iconButton}><Ionicons name="archive-outline" size={18} color={colors.RED} /></TouchableOpacity>}
          </View>
        </View>
      )) : <EmptyState text="No announcements or news posts yet." />}

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{mode === 'areas' ? editingId ? 'Edit area' : 'Add area' : selectedAnnouncement ? 'Edit post' : 'New announcement / news'}</Text>
              <TouchableOpacity onPress={closeEditor}><Ionicons name="close" size={22} color={colors.TEXT_GRAY} /></TouchableOpacity>
            </View>
            {mode === 'areas' ? <>
              <Text style={styles.fieldLabel}>Facility</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroller}>
                {facilities.map((facility) => <TouchableOpacity key={facility.facility_id} style={[styles.option, facilityId === facility.facility_id && styles.optionActive]} onPress={() => setFacilityId(facility.facility_id)}><Text style={[styles.optionText, facilityId === facility.facility_id && styles.optionTextActive]}>{facility.facility_name}</Text></TouchableOpacity>)}
              </ScrollView>
              <Text style={styles.fieldLabel}>Area name</Text>
              <TextInput value={areaName} onChangeText={setAreaName} placeholder="e.g. Basketball Court" placeholderTextColor={colors.TEXT_GRAY} maxLength={150} style={styles.input} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional details" placeholderTextColor={colors.TEXT_GRAY} multiline style={[styles.input, styles.multiline]} />
              <TouchableOpacity style={styles.saveButton} onPress={saveArea} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : editingId ? 'Save area' : 'Add area'}</Text></TouchableOpacity>
            </> : <>
              <TextInput value={announcementTitle} onChangeText={setAnnouncementTitle} placeholder="Title" placeholderTextColor={colors.TEXT_GRAY} maxLength={200} style={styles.input} />
              <TextInput value={announcementMessage} onChangeText={setAnnouncementMessage} placeholder="Announcement or news text" placeholderTextColor={colors.TEXT_GRAY} multiline style={[styles.input, styles.multiline]} />
              <TextInput value={announcementExternalUrl} onChangeText={setAnnouncementExternalUrl} placeholder="Optional link (https://...)" placeholderTextColor={colors.TEXT_GRAY} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} />
              <Text style={styles.fieldLabel}>Audience</Text>
              <View style={styles.audienceRow}>{(['all', 'faculty', 'student'] as const).map((option) => <TouchableOpacity key={option} style={[styles.option, audience === option && styles.optionActive]} onPress={() => setAudience(option)}><Text style={[styles.optionText, audience === option && styles.optionTextActive]}>{option === 'all' ? 'Everyone' : option}</Text></TouchableOpacity>)}</View>
              <TouchableOpacity style={styles.saveButton} onPress={saveAnnouncement} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : selectedAnnouncement ? 'Save changes' : 'Publish announcement'}</Text></TouchableOpacity>
            </>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.empty}><Ionicons name="file-tray-outline" size={24} color={colors.GOLD} /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 14, gap: 8 },
  eyebrow: { color: colors.RED, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 3, color: colors.DARK, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  primaryButton: { height: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.RED, flexDirection: 'row', alignItems: 'center', gap: 3 },
  primaryButtonText: { color: colors.WHITE, fontSize: 10, fontWeight: '900' },
  loader: { marginVertical: 25 },
  itemCard: { marginBottom: 9, padding: 12, borderRadius: 13, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(143,23,40,0.08)' },
  itemBody: { flex: 1 },
  itemTitle: { color: colors.DARK, fontSize: 12, fontWeight: '900' },
  meta: { marginTop: 4, color: colors.TEXT_GRAY, fontSize: 9 },
  message: { marginTop: 4, color: colors.TEXT_GRAY, fontSize: 10, lineHeight: 15 },
  status: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.SOFT_GOLD, color: colors.RED, fontSize: 8, fontWeight: '900', textTransform: 'capitalize' },
  inactive: { backgroundColor: 'rgba(143,23,40,0.1)' },
  iconButton: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  newsActions: { alignItems: 'center', gap: 2 },
  empty: { padding: 24, borderRadius: 14, backgroundColor: colors.WHITE, alignItems: 'center' },
  emptyText: { marginTop: 8, color: colors.TEXT_GRAY, fontSize: 11, textAlign: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,22,25,0.4)' },
  modal: { padding: 20, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.CREAM },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.DARK, fontSize: 18, fontWeight: '900', flex: 1 },
  fieldLabel: { marginTop: 8, marginBottom: 6, color: colors.DARK, fontSize: 11, fontWeight: '900' },
  input: { minHeight: 44, marginBottom: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 12 },
  multiline: { minHeight: 88, paddingTop: 10, textAlignVertical: 'top' },
  optionScroller: { maxHeight: 42 },
  audienceRow: { flexDirection: 'row', gap: 7 },
  option: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.WHITE, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  optionActive: { backgroundColor: colors.RED },
  optionText: { color: colors.TEXT_GRAY, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  optionTextActive: { color: colors.WHITE },
  saveButton: { height: 46, marginTop: 16, borderRadius: 11, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.WHITE, fontSize: 12, fontWeight: '900' },
});
