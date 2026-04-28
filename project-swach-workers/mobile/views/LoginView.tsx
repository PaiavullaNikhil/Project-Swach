import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { Truck, User, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const workerImage = require('../assets/animated-swach-worker.jpg');

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
          timeout: 10000 
      });
      setWorker(response.data);
      
      const vResponse = await axios.get(`${API_URL}/worker/vehicles`, { 
          params: { worker_id: cleanId, ward: response.data.ward },
          timeout: 10000 
      });
      const allVehicles = vResponse.data;
      setVehicles(allVehicles);
      
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
      <View style={[styles.vehicleIcon, selectedVehicle?.plate_number === item.plate_number && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Truck color={selectedVehicle?.plate_number === item.plate_number ? '#fff' : COLORS.primary} size={22} />
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={[styles.plate, selectedVehicle?.plate_number === item.plate_number && {color: '#fff'}]}>{item.plate_number}</Text>
        <Text style={[styles.type, selectedVehicle?.plate_number === item.plate_number && {color: 'rgba(255,255,255,0.7)'}]}>{item.vehicle_type}</Text>
      </View>
      {selectedVehicle?.plate_number === item.plate_number && <CheckCircle2 color="#fff" size={20} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Simple Gradient Background */}
      <LinearGradient
        colors={['#0F172A', '#1E40AF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Image source={workerImage} style={styles.workerIllustration} />
            <Text style={styles.title}>Project Swach</Text>
            <Text style={styles.subtitle}>Logistics Worker Portal</Text>
          </View>

          {step === 'id' ? (
            <View style={[styles.section, { paddingHorizontal: 32 }]}>
              <Text style={styles.label}>Worker ID</Text>
              <View style={styles.inputWrapper}>
                <User color="#94A3B8" size={20} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Enter your ID"
                  placeholderTextColor="#94A3B8"
                  value={workerId}
                  onChangeText={setWorkerId}
                  autoCapitalize="characters"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.primaryBtn, !workerId && styles.btnDisabled]} 
                onPress={handleVerifyId}
                disabled={loading || !workerId}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Login</Text>
                      <View style={styles.arrowIcon}>
                        <ArrowRight color="#fff" size={18} strokeWidth={3} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.section, { paddingHorizontal: 32 }]}>
              <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeText}>Hello, {worker?.name.split(' ')[0]}</Text>
                <Text style={styles.sublabel}>Select your vehicle for the shift</Text>
              </View>
              
              <FlatList 
                data={vehicles}
                renderItem={renderVehicle}
                keyExtractor={item => item.plate_number}
                style={styles.vehicleList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No available vehicles found.</Text>}
              />

              <TouchableOpacity 
                style={[styles.primaryBtn, !selectedVehicle && styles.btnDisabled, { marginTop: 12 }]} 
                onPress={() => onLogin(worker, selectedVehicle)}
                disabled={!selectedVehicle}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.btnText}>Start Shift</Text>
                  <CheckCircle2 color="#fff" size={20} />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.backLink} onPress={() => setStep('id')}>
                <Text style={styles.backLinkText}>Switch Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  workerIllustration: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginBottom: 24,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1E293B', 
    letterSpacing: -0.8 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#64748B', 
    fontWeight: '600', 
    marginTop: 4,
    letterSpacing: 0.2
  },
  section: { width: '100%' },
  label: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#334155', 
    marginBottom: 8, 
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    height: 60, 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1E293B' 
  },
  primaryBtn: { 
    height: 60, 
    borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    letterSpacing: 0.2 
  },
  arrowIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 10
  },
  welcomeHeader: { marginBottom: 20 },
  welcomeText: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginBottom: 4 
  },
  sublabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  vehicleList: { maxHeight: 240, marginBottom: 8 },
  vehicleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    backgroundColor: '#F8FAFC', 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  vehicleCardActive: { 
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  vehicleIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  vehicleInfo: { flex: 1 },
  plate: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  type: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', padding: 20 },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { 
    color: '#64748B', 
    fontSize: 14, 
    fontWeight: '600',
    textDecorationLine: 'underline'
  }
});

