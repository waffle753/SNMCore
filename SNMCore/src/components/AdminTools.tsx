import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.236:4000';

type Mode = 'event' | 'announcement';

export default function AdminTools() {
  const [mode, setMode] = useState<Mode>('event');
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState('2026-09-25');
  const [startTime, setStartTime] = useState('08:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setMessage('');
    setEventDate('2026-09-25');
    setStartTime('08:00');
    setLocation('');
  };

  const save = async () => {
    if (!title.trim() || (mode === 'event' && !eventDate.trim()) || (mode === 'announcement' && !message.trim())) {
      Alert.alert('Missing details', mode === 'event' ? 'Enter an event title and date.' : 'Enter an announcement title and message.');
      return;
    }

    setSaving(true);
    try {
      const endpoint = mode === 'event' ? '/api/events' : '/api/announcements';
      const body = mode === 'event'
        ? { title, eventDate, startTime, location, announcementMessage: message }
        : { title, message, audience: 'all' };
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken() || ''}`,
        },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let result: { message?: string } = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Backend returned a non-JSON response (${response.status}). Restart the backend server.`);
      }
      if (!response.ok) {
        throw new Error(result.message || 'Unable to save this item.');
      }
      setVisible(false);
      reset();
      Alert.alert('Saved', mode === 'event' ? 'Event added successfully.' : 'Announcement published successfully.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to connect to the backend.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.eyebrow}>ADMIN TOOLS</Text>
            <Text style={styles.panelTitle}>Manage school updates</Text>
          </View>
          <Ionicons name="settings-outline" size={22} color={colors.RED} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={() => { setMode('event'); setVisible(true); }}>
            <Ionicons name="calendar-outline" size={20} color={colors.RED} />
            <Text style={styles.actionText}>Add event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => { setMode('announcement'); setVisible(true); }}>
            <Ionicons name="megaphone-outline" size={20} color={colors.RED} />
            <Text style={styles.actionText}>Announcement</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{mode === 'event' ? 'Add event' : 'New announcement'}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.TEXT_GRAY} />
              </TouchableOpacity>
            </View>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
            {mode === 'event' ? (
              <>
                <TextInput value={eventDate} onChangeText={setEventDate} placeholder="Date: YYYY-MM-DD" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
                <TextInput value={startTime} onChangeText={setStartTime} placeholder="Start time: HH:MM" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
                <TextInput value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} />
                <TextInput value={message} onChangeText={setMessage} placeholder="Optional announcement" placeholderTextColor={colors.TEXT_GRAY} style={[styles.input, styles.multiline]} multiline />
              </>
            ) : (
              <TextInput value={message} onChangeText={setMessage} placeholder="Announcement message" placeholderTextColor={colors.TEXT_GRAY} style={[styles.input, styles.multiline]} multiline />
            )}
            <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: colors.WHITE, shadowColor: colors.RED, shadowOpacity: 0.07, shadowRadius: 9, elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.RED, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  panelTitle: { marginTop: 4, color: colors.DARK, fontSize: 16, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, minHeight: 62, borderRadius: 13, backgroundColor: colors.SOFT_GOLD, padding: 12, justifyContent: 'center' },
  actionText: { marginTop: 5, color: colors.DARK, fontSize: 11, fontWeight: '900' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36, 22, 25, 0.35)' },
  modal: { padding: 20, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.CREAM },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.DARK, fontSize: 20, fontWeight: '900' },
  input: { minHeight: 46, marginBottom: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 13 },
  multiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  saveButton: { height: 48, marginTop: 4, borderRadius: 14, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.WHITE, fontSize: 13, fontWeight: '900' },
});
