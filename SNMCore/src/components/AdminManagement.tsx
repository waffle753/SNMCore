import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.236:4000';

type ManagedUser = { user_id: number; full_name: string; email: string; role: 'admin' | 'faculty' | 'student'; is_active: boolean };
type RequestItem = {
  request_id: number;
  subject: string;
  description: string | null;
  requester_name: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected';
  event_start_datetime: string | null;
  event_end_datetime: string | null;
  event_location_type: string | null;
  event_facility_name: string | null;
  event_area_name: string | null;
  event_location_name: string | null;
};

type ModalMode = 'add' | 'edit' | null;
type AdminManagementMode = 'users' | 'eventRequests' | 'all';
type StudentInformationForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  gender: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  course: string;
  department: string;
  yearLevel: string;
  section: string;
  schoolYear: string;
  semester: string;
};
const emptyStudentInformation = (): StudentInformationForm => ({
  firstName: '', middleName: '', lastName: '', suffix: '', dateOfBirth: '', gender: '',
  street: '', barangay: '', city: '', province: '', postalCode: '', course: '',
  department: '', yearLevel: '', section: '', schoolYear: '', semester: '',
});
const studentInformationFields: { key: keyof StudentInformationForm; label: string; required?: boolean }[] = [
  { key: 'firstName', label: 'First name', required: true },
  { key: 'middleName', label: 'Middle name' },
  { key: 'lastName', label: 'Last name', required: true },
  { key: 'suffix', label: 'Suffix' },
  { key: 'dateOfBirth', label: 'Date of birth (YYYY-MM-DD)', required: true },
  { key: 'gender', label: 'Gender', required: true },
  { key: 'street', label: 'Street' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'course', label: 'Course', required: true },
  { key: 'department', label: 'Department' },
  { key: 'yearLevel', label: 'Year level', required: true },
  { key: 'section', label: 'Section' },
  { key: 'schoolYear', label: 'School year', required: true },
  { key: 'semester', label: 'Semester', required: true },
];

const requestHeaders = () => ({ Authorization: `Bearer ${getAuthToken() || ''}` });

export default function AdminManagement({ mode = 'all' }: { mode?: AdminManagementMode }) {
  const [students, setStudents] = useState<ManagedUser[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [studentModal, setStudentModal] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ManagedUser['role']>('student');
  const [studentInformation, setStudentInformation] = useState<StudentInformationForm>(emptyStudentInformation);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    try {
      const headers = requestHeaders();
      const [studentsResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/students`, { headers }),
        fetch(`${API_URL}/api/admin/requests`, { headers }),
      ]);
      if (studentsResponse.ok) {
        const responseText = await studentsResponse.text();
        setStudents(JSON.parse(responseText));
      }
      if (requestsResponse.ok) {
        const responseText = await requestsResponse.text();
        setRequests(JSON.parse(responseText));
      }
    } catch {
      Alert.alert('Load failed', 'Unable to load admin data.');
    }
  };

  useEffect(() => { loadData(); }, []);

  const closeStudentModal = () => {
    setStudentModal(null);
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('student');
    setStudentInformation(emptyStudentInformation());
  };

  const saveStudent = async () => {
    const creatingStudent = studentModal === 'add' && role === 'student';
    if ((!creatingStudent && !name.trim()) || !email.trim() || (studentModal === 'add' && !password)) {
      Alert.alert('Missing details', 'Name and email are required. New students also need a password.');
      return;
    }
    setBusy(true);
    try {
      const isEdit = studentModal === 'edit';
      const response = await fetch(
        `${API_URL}/api/admin/students${isEdit ? `/${editingId}` : ''}`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { ...requestHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: name,
            email,
            password: password || undefined,
            role,
            ...(!isEdit && role === 'student' ? { studentInformation } : {}),
          }),
        }
      );
      const responseText = await response.text();
      let result: { message?: string } = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Backend returned a non-JSON response (${response.status}). Restart the backend server.`);
      }
      if (!response.ok) throw new Error(result.message || 'Unable to save student.');
      closeStudentModal();
      await loadData();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to save student.');
    } finally { setBusy(false); }
  };

  const deactivateStudent = (student: ManagedUser) => {
    Alert.alert('Deactivate user?', `Deactivate ${student.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await fetch(`${API_URL}/api/admin/students/${student.user_id}`, { method: 'DELETE', headers: requestHeaders() });
        await loadData();
      } },
    ]);
  };

  const reviewRequest = async (request: RequestItem, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`${API_URL}/api/admin/requests/${request.request_id}`, {
        method: 'PATCH',
        headers: { ...requestHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await response.text();
      let result: { message?: string } = {};
      try {
        result = JSON.parse(body);
      } catch {
        throw new Error(`Backend returned a non-JSON response (HTTP ${response.status}).`);
      }
      if (!response.ok) throw new Error(result.message || 'Unable to update this request.');
      await loadData();
    } catch (error) {
      Alert.alert('Review failed', error instanceof Error ? error.message : 'Unable to update this request.');
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ADMIN CONTROL CENTER</Text>
          <Text style={styles.title}>{mode === 'eventRequests' ? 'Event requests' : mode === 'users' ? 'Manage users' : 'People and requests'}</Text>
        </View>
        <Ionicons name={mode === 'eventRequests' ? 'calendar-outline' : 'people-circle-outline'} size={26} color={colors.RED} />
      </View>

      {mode !== 'eventRequests' ? <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Users ({students.length})</Text>
        <TouchableOpacity style={styles.smallButton} onPress={() => setStudentModal('add')}>
          <Ionicons name="add" size={16} color={colors.WHITE} />
          <Text style={styles.smallButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {students.map((student) => (
        <View key={student.user_id} style={styles.row}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{student.full_name.charAt(0)}</Text></View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{student.full_name}</Text>
            <Text style={styles.rowMeta}>{student.email} • {student.role}</Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingId(student.user_id); setName(student.full_name); setEmail(student.email); setRole(student.role); setStudentModal('edit'); }}>
            <Ionicons name="create-outline" size={20} color={colors.RED} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deactivateStudent(student)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color={colors.RED} />
          </TouchableOpacity>
        </View>
      ))}
      </> : null}

      {mode !== 'users' ? <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Event requests ({requests.filter((request) => request.request_type === 'event').length})</Text>
      </View>
      {requests.some((request) => request.request_type === 'event') ? requests.filter((request) => request.request_type === 'event').map((request) => (
        <View key={request.request_id} style={styles.requestCard}>
          <View style={styles.requestHeading}>
            <View style={styles.requestHeadingBody}>
              <Text style={styles.rowTitle}>{request.subject}</Text>
              <Text style={styles.rowMeta}>{request.requester_name} • {request.request_type}</Text>
            </View>
            <Text style={styles.requestStatus}>{request.status}</Text>
          </View>
          {request.description ? <Text style={styles.description}>{request.description}</Text> : null}
          {request.event_start_datetime ? (
            <Text style={styles.description}>
              {request.event_location_type === 'indoor'
                ? `${request.event_facility_name || 'Facility'}${request.event_area_name ? ` • ${request.event_area_name}` : ''}`
                : request.event_location_name || 'Location not set'}
              {'\n'}{request.event_start_datetime} – {request.event_end_datetime}
            </Text>
          ) : null}
          {request.status === 'pending' ? (
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={() => reviewRequest(request, 'rejected')}><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
              <TouchableOpacity style={styles.approveButton} onPress={() => reviewRequest(request, 'approved')}><Text style={styles.approveText}>Approve</Text></TouchableOpacity>
            </View>
          ) : null}
        </View>
      )) : <Text style={styles.empty}>No event requests yet.</Text>}
      </> : null}

      <Modal visible={studentModal !== null} transparent animationType="slide" onRequestClose={closeStudentModal}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{studentModal === 'add' ? 'Create account' : 'Update account'}</Text><TouchableOpacity onPress={closeStudentModal}><Ionicons name="close" size={22} color={colors.TEXT_GRAY} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!(studentModal === 'add' && role === 'student') ? <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.TEXT_GRAY} style={styles.input} /> : null}
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.TEXT_GRAY} keyboardType="email-address" style={styles.input} />
            <TextInput value={password} onChangeText={setPassword} placeholder={studentModal === 'add' ? 'Temporary password' : 'New password (optional)'} placeholderTextColor={colors.TEXT_GRAY} secureTextEntry style={styles.input} />
            {studentModal === 'add' && role === 'student' ? <>
              <Text style={styles.studentInfoHeading}>Student personal information</Text>
              {studentInformationFields.slice(0, 6).map((field) => (
                <TextInput
                  key={field.key}
                  value={studentInformation[field.key]}
                  onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                  placeholder={`${field.label}${field.required ? ' *' : ' (optional)'}`}
                  placeholderTextColor={colors.TEXT_GRAY}
                  autoCapitalize={field.key === 'dateOfBirth' ? 'none' : 'words'}
                  keyboardType={field.key === 'dateOfBirth' ? 'numbers-and-punctuation' : 'default'}
                  style={styles.input}
                />
              ))}
              <Text style={styles.studentInfoHeading}>Address (optional)</Text>
              {studentInformationFields.slice(6, 11).map((field) => (
                <TextInput
                  key={field.key}
                  value={studentInformation[field.key]}
                  onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                  placeholder={field.label}
                  placeholderTextColor={colors.TEXT_GRAY}
                  style={styles.input}
                />
              ))}
              <Text style={styles.studentInfoHeading}>Academic information</Text>
              {studentInformationFields.slice(11).map((field) => (
                <TextInput
                  key={field.key}
                  value={studentInformation[field.key]}
                  onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                  placeholder={`${field.label}${field.required ? ' *' : ' (optional)'}`}
                  placeholderTextColor={colors.TEXT_GRAY}
                  style={styles.input}
                />
              ))}
            </> : null}
            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleOptions}>
              {(['student', 'faculty', 'admin'] as const).map((option) => (
                <TouchableOpacity key={option} style={[styles.roleOption, role === option && styles.roleOptionActive]} onPress={() => setRole(option)}>
                  <Text style={[styles.roleOptionText, role === option && styles.roleOptionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveStudent} disabled={busy}><Text style={styles.saveText}>{busy ? 'Saving...' : 'Save user'}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: colors.WHITE, shadowColor: colors.RED, shadowOpacity: 0.07, shadowRadius: 9, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.RED, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 4, color: colors.DARK, fontSize: 16, fontWeight: '900' },
  sectionHeader: { marginTop: 18, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.DARK, fontSize: 14, fontWeight: '900' },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 10, backgroundColor: colors.RED },
  smallButtonText: { color: colors.WHITE, fontSize: 11, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(143,23,40,0.08)' },
  avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.RED, fontWeight: '900' },
  rowBody: { flex: 1, marginHorizontal: 10 },
  rowTitle: { color: colors.DARK, fontSize: 12, fontWeight: '900' },
  rowMeta: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 10 },
  deleteButton: { marginLeft: 12 },
  requestCard: { marginBottom: 8, padding: 12, borderRadius: 13, backgroundColor: colors.SOFT_GOLD },
  description: { marginTop: 6, color: colors.TEXT_GRAY, fontSize: 11 },
  requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  requestHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requestHeadingBody: { flex: 1 },
  requestStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.SOFT_GOLD, color: colors.RED, fontSize: 9, fontWeight: '900', textTransform: 'capitalize' },
  rejectButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.WHITE },
  rejectText: { color: colors.RED, fontSize: 11, fontWeight: '900' },
  approveButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.RED },
  approveText: { color: colors.WHITE, fontSize: 11, fontWeight: '900' },
  empty: { color: colors.TEXT_GRAY, fontSize: 11 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,22,25,0.35)' },
  modal: { maxHeight: '92%', padding: 20, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.CREAM },
  modalScroll: { flexShrink: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.DARK, fontSize: 20, fontWeight: '900' },
  input: { height: 46, marginBottom: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 13 },
  roleLabel: { marginBottom: 7, color: colors.DARK, fontSize: 12, fontWeight: '900' },
  studentInfoHeading: { marginTop: 8, marginBottom: 9, color: colors.RED, fontSize: 12, fontWeight: '900' },
  roleOptions: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.WHITE, alignItems: 'center' },
  roleOptionActive: { backgroundColor: colors.RED },
  roleOptionText: { color: colors.TEXT_GRAY, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  roleOptionTextActive: { color: colors.WHITE },
  saveButton: { height: 48, borderRadius: 14, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.WHITE, fontSize: 13, fontWeight: '900' },
});
