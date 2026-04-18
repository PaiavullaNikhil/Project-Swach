import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { MapPin, Navigation, CheckCircle, Clock, Truck, Trash2 } from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';

interface ActiveTaskViewProps {
  task: any;
  workerHash: string;
  vehicleNumber: string;
  onGoBack: () => void;
  onRefreshedTask: (task: any) => void;
  onProceedToCapture: () => void;
}

export default function ActiveTaskView({ task, workerHash, vehicleNumber, onGoBack, onRefreshedTask, onProceedToCapture }: ActiveTaskViewProps) {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  React.useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;
    
    const startWatching = async () => {
      if (task.worker_status === 'On the way') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // 1. Instant load from cache
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) setUserLocation(lastLoc);

        // 2. Start live watching for movement AND rotation (heading)
        watchSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 10000    // Or every 10 seconds
          },
          async (loc) => {
            setUserLocation(loc);
            // Sync with backend for citizen tracking
            try {
              const geoData = new FormData();
              geoData.append('lat', loc.coords.latitude.toString());
              geoData.append('lon', loc.coords.longitude.toString());
              await axios.post(`${API_URL}/worker/location/${workerHash}`, geoData);
            } catch (e) {
              console.log("Location sync failed", e);
            }
          }
        );
      }
    };

    startWatching();

    return () => {
      if (watchSubscription) watchSubscription.remove();
    };
  }, [task.worker_status]);

  const handleAction = async (action: 'accept' | 'status', payloadValue?: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      let url = '';
      if (action === 'accept') {
        url = `${API_URL}/worker/accept/${task._id}`;
        formData.append('user_hash', workerHash);
        formData.append('vehicle_number', vehicleNumber);
      } else {
        url = `${API_URL}/worker/status/${task._id}`;
        formData.append('status', payloadValue!);
      }

      await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      // Update local task state optimistically or by refetching
      const updatedTask = { ...task };
      if (action === 'accept') {
        updatedTask.worker_status = 'Assigned';
        updatedTask.worker_id = workerHash;
      } else {
        updatedTask.worker_status = payloadValue;
      }
      onRefreshedTask(updatedTask);
      
    } catch (e: any) {
      console.log("Action error", e.response?.data || e.message);
      Alert.alert("Error", "Could not complete action.");
    } finally {
      setLoading(false);
    }
  };

  const isAssignedToMe = task.worker_id === workerHash;
  const isAssignedToOther = task.worker_id && task.worker_id !== workerHash;

  return (
    <View style={styles.container}>
      {task.worker_status === 'On the way' && userLocation ? (
        // --- FULL SCREEN NAVIGATION UI ---
        <>
          <MapView 
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: (userLocation.coords.latitude + task.location?.coordinates[1]) / 2,
              longitude: (userLocation.coords.longitude + task.location?.coordinates[0]) / 2,
              latitudeDelta: Math.max(Math.abs(userLocation.coords.latitude - task.location?.coordinates[1]) * 1.5, 0.01),
              longitudeDelta: Math.max(Math.abs(userLocation.coords.longitude - task.location?.coordinates[0]) * 1.5, 0.01),
            }}
          >
            <Marker 
              coordinate={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }} 
              title="You"
              anchor={{ x: 0.5, y: 0.5 }}
              image={require('../assets/truck.png')}
              rotation={userLocation.coords.heading || 0}
              flat={true}
            />
            
            <Marker 
              coordinate={{ latitude: task.location?.coordinates[1], longitude: task.location?.coordinates[0] }} 
              title="Cleanup Site"
              anchor={{ x: 0.5, y: 0.5 }}
              image={require('../assets/trash.png')}
            />
            
            <Polyline
              coordinates={[
                { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
                { latitude: task.location?.coordinates[1], longitude: task.location?.coordinates[0] }
              ]}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              lineDashPattern={[5, 10]}
            />
          </MapView>
          
          <View style={styles.floatingDashboard}>
             <View style={styles.dashboardHeader}>
                <Text style={styles.dashboardTitle}>Navigating to Cleanup Site</Text>
             </View>
             
             <TouchableOpacity 
                style={[styles.btnOutline, { borderColor: COLORS.success, backgroundColor: COLORS.success }]} 
                onPress={() => handleAction('status', 'Work in progress')}
                disabled={loading}>
                <Clock size={18} color="#fff" />
                <Text style={[styles.btnOutlineText, {color: '#fff'}]}>Arrived - Mark In Progress</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // --- STANDARD WORKFLOW UI ---
        <ScrollView>
          <Image source={{ uri: task.photo_url }} style={styles.heroImage} />
          
          <View style={styles.content}>
            <Text style={styles.title}>{task.ward}</Text>
            <Text style={styles.subtitle}>{task.mla || 'Local Area'}</Text>
            
            <View style={styles.statsCard}>
               <View style={styles.statLine}><MapPin size={16} color={COLORS.textMuted}/><Text style={styles.statText}>Lat: {task.location?.coordinates[1].toFixed(5)}, Lon: {task.location?.coordinates[0].toFixed(5)}</Text></View>
               <View style={styles.statLine}><Clock size={16} color={COLORS.textMuted}/><Text style={styles.statText}>Reported: {new Date(task.timestamp).toLocaleString()}</Text></View>
            </View>

            <Text style={styles.sectionTitle}>Task Workflow</Text>
            
            {!task.worker_id && (
               <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={() => handleAction('accept')} disabled={loading}>
                   <Text style={styles.btnText}>1. Accept Task</Text>
               </TouchableOpacity>
            )}

            {isAssignedToOther && (
               <View style={styles.bannerError}>
                   <Text style={{ color: '#fff' }}>This task is assigned to another worker.</Text>
               </View>
            )}

            {isAssignedToMe && (
              <View style={styles.workflowBox}>
                  {task.worker_status === 'Assigned' && (
                    <TouchableOpacity 
                        style={[styles.btnOutline, task.worker_status === 'On the way' && styles.btnActive]} 
                        onPress={() => handleAction('status', 'On the way')}
                        disabled={loading}>
                        <Navigation size={18} color={task.worker_status === 'On the way' ? '#fff' : COLORS.primary} />
                        <Text style={[styles.btnOutlineText, task.worker_status === 'On the way' && {color: '#fff'}]}>2. Start Navigation</Text>
                    </TouchableOpacity>
                  )}

                  {task.worker_status === 'Work in progress' && (
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: COLORS.success, marginTop: 16 }]} 
                        onPress={onProceedToCapture}>
                        <CheckCircle size={18} color="#fff" />
                        <Text style={styles.btnText}>4. Complete & Verify</Text>
                    </TouchableOpacity>
                  )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
          <Text style={styles.backBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroImage: { width: '100%', height: 250 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 16 },
  statsCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 24 },
  statLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statText: { marginLeft: 8, color: COLORS.text, fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: COLORS.text },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  bannerError: { backgroundColor: COLORS.error, padding: 16, borderRadius: 12 },
  workflowBox: { gap: 12 },
  btnOutline: { padding: 16, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: COLORS.primary, fontSize: 16, fontWeight: '700', marginLeft: 8 },
  btnActive: { backgroundColor: COLORS.primary },
  backBtn: { position: 'absolute', top: 56, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  backBtnText: { color: '#fff', fontWeight: '800' },
  
  // Custom Map Markers & Dashboard
  markerImage: { width: 64, height: 64, resizeMode: 'contain' },
  floatingDashboard: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    backgroundColor: '#fff', padding: 20, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 10
  },
  dashboardHeader: { alignItems: 'center', marginBottom: 16 },
  dashboardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text }
});
