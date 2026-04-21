import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Truck, User, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';

interface LoginViewProps {
  onLogin: (worker: any, vehicle: any) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [workerId, setWorkerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'id' | 'vehicle'>('id');
  const [worker, setWorker] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const handleVerifyId = async () => {
    const cleanId = workerId.trim();
    if (!cleanId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/worker/login/${cleanId}`, {
          timeout: 10000 // 10 second timeout
      });
      setWorker(response.data);
      
      // Fetch vehicles next for the specific ward
      console.log(`[LOG] Fetching isolated vehicles for worker: ${cleanId}`);
      const vResponse = await axios.get(`${API_URL}/worker/vehicles`, { 
          params: { worker_id: cleanId, ward: response.data.ward },
          timeout: 10000 
      });
      const allVehicles = vResponse.data;
      console.log(`[LOG] Found ${allVehicles.length} vehicles:`, allVehicles);
      setVehicles(allVehicles);
      
      // Auto-select assigned vehicle if it exists
      if (response.data.assigned_vehicle_id) {
          const assigned = allVehicles.find((v: any) => v.plate_number === response.data.assigned_vehicle_id);
          if (assigned) {
              setSelectedVehicle(assigned);
          }
      }
      
      if (allVehicles.length === 0) {
          Alert.alert("Notice", "No available vehicles found in your ward. Check with Admin.");
      }
      
      setStep('vehicle');
    } catch (e: any) {
      console.log("Login sequence error:", e);
      let msg = "ID verify failed or server is unreachable.";
      if (e.code === 'ECONNABORTED' || !e.response) {
          msg = "Connection timed out. Ensure backend is running on port 8001.";
      } else if (e.response?.status === 404) {
          msg = `ID "${cleanId}" not recognized.`;
      } else if (e.message) {
          msg = e.message;
      }
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderVehicle = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.vehicleCard, selectedVehicle?.plate_number === item.plate_number && styles.vehicleCardActive]}
      onPress={() => setSelectedVehicle(item)}
    >
      <View style={styles.vehicleIcon}>
        <Truck color={selectedVehicle?.plate_number === item.plate_number ? '#fff' : COLORS.primary} size={24} />
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={[styles.plate, selectedVehicle?.plate_number === item.plate_number && {color: '#fff'}]}>{item.plate_number}</Text>
        <Text style={[styles.type, selectedVehicle?.plate_number === item.plate_number && {color: 'rgba(255,255,255,0.7)'}]}>{item.vehicle_type}</Text>
      </View>
      {selectedVehicle?.plate_number === item.plate_number && <CheckCircle2 color="#fff" size={20} />}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
            <View style={styles.logoCircle}>
                <Truck color="#fff" size={32} />
            </View>
            <Text style={styles.title}>Project Swach</Text>
            <Text style={styles.subtitle}>Unified Worker Portal</Text>
        </View>

        {step === 'id' ? (
          <View style={styles.section}>
            <Text style={styles.label}>Enter Worker ID</Text>
            <View style={styles.inputContainer}>
                <User color={COLORS.textMuted} size={20} style={styles.inputIcon} />
                <TextInput 
                    style={styles.input}
                    placeholder="W-001"
                    placeholderTextColor="#999"
                    value={workerId}
                    onChangeText={setWorkerId}
                    autoCapitalize="characters"
                />
            </View>
            <TouchableOpacity 
                style={[styles.btn, !workerId && styles.btnDisabled]} 
                onPress={handleVerifyId}
                disabled={loading || !workerId}
            >
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                        <Text style={styles.btnText}>VERIFY IDENTITY</Text>
                        <ArrowRight color="#fff" size={20} />
                    </>
                )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={{ marginBottom: 16 }}>
                <Text style={styles.welcomeText}>Welcome, {worker?.name}</Text>
                <Text style={styles.label}>Select your vehicle for today:</Text>
            </View>
            
            <FlatList 
                data={vehicles}
                renderItem={renderVehicle}
                keyExtractor={item => item.plate_number}
                style={styles.vehicleList}
                ListEmptyComponent={<Text style={styles.emptyText}>No available vehicles found in your ward.</Text>}
            />

            <TouchableOpacity 
                style={[styles.btn, !selectedVehicle && styles.btnDisabled, { marginTop: 20 }]} 
                onPress={() => onLogin(worker, selectedVehicle)}
                disabled={!selectedVehicle}
            >
                <Text style={styles.btnText}>START SHIFT</Text>
                <CheckCircle2 color="#fff" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.backLink} onPress={() => setStep('id')}>
                <Text style={styles.backLinkText}>Not you? Switch account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 30, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12 },
  header: { alignItems: 'center', marginBottom: 30 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  section: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginLeft: 4 },
  welcomeText: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 16, fontWeight: '600', color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  vehicleList: { maxHeight: 200 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F3F4F6', marginBottom: 12 },
  vehicleCardActive: { backgroundColor: COLORS.primary },
  vehicleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  vehicleInfo: { flex: 1 },
  plate: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  type: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, fontStyle: 'italic', padding: 20 },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }
});
