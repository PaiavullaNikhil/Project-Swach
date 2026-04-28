import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { MapPin, Navigation, CheckCircle, Clock, Truck, Trash2, MessageSquare } from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';
import ChatModal from '../components/ChatModal';

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
  const [routeCoords, setRouteCoords] = useState<{latitude: number; longitude: number}[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null); // in meters
  const [routeDuration, setRouteDuration] = useState<number | null>(null); // in seconds
  const [isChatVisible, setIsChatVisible] = useState(false);
  const lastRouteFetchRef = React.useRef<{lat: number; lon: number} | null>(null);
  const mapRef = React.useRef<MapView | null>(null);

  // Fetch road-based route from OSRM (free, no API key needed)
  const fetchRoute = async (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
      const response = await axios.get(url, { timeout: 8000 });
      
      if (response.data?.routes?.length > 0) {
        const route = response.data.routes[0];
        const coords = route.geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoords(coords);
        setRouteDistance(route.distance); // meters
        setRouteDuration(route.duration); // seconds
        lastRouteFetchRef.current = { lat: fromLat, lon: fromLon };

        // Fit map to show entire route
        if (mapRef.current && coords.length > 1) {
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 60, bottom: 250, left: 60 },
            animated: true,
          });
        }
      }
    } catch (e) {
      console.log("Route fetch failed, using straight line fallback:", e);
      // Fallback: straight line
      setRouteCoords([
        { latitude: fromLat, longitude: fromLon },
        { latitude: toLat, longitude: toLon },
      ]);
    }
  };

  // Calculate distance between two points (for re-fetch threshold)
  const getDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  React.useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;
    
    const startWatching = async () => {
      if (task.worker_status === 'On the way' || task.worker_status === 'Work in progress') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // 1. Instant load from cache
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          setUserLocation(lastLoc);
          // Fetch initial route
          fetchRoute(
            lastLoc.coords.latitude, lastLoc.coords.longitude,
            task.location?.coordinates[1], task.location?.coordinates[0]
          );
        }

        // 2. Start live watching for movement AND rotation (heading)
        watchSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 10000    // Or every 10 seconds
          },
          async (loc) => {
            setUserLocation(loc);

            // Re-fetch route if worker moved 500m+ from last route fetch
            if (lastRouteFetchRef.current) {
              const movedDist = getDistanceBetween(
                lastRouteFetchRef.current.lat, lastRouteFetchRef.current.lon,
                loc.coords.latitude, loc.coords.longitude
              );
              if (movedDist > 500) {
                fetchRoute(
                  loc.coords.latitude, loc.coords.longitude,
                  task.location?.coordinates[1], task.location?.coordinates[0]
                );
              }
            } else {
              fetchRoute(
                loc.coords.latitude, loc.coords.longitude,
                task.location?.coordinates[1], task.location?.coordinates[0]
              );
            }

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

  // Format helpers
  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

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

  // Task is escalated if it was reported more than 72 hours ago
  const isEscalated = () => {
    const ageHours = (new Date().getTime() - new Date(task.timestamp).getTime()) / (1000 * 60 * 60);
    return ageHours >= 72;
  };

  return (
    <View style={styles.container}>
      {task.worker_status === 'On the way' && userLocation ? (
        // --- FULL SCREEN NAVIGATION UI ---
        <>
          <MapView 
            ref={mapRef}
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
            
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={COLORS.primary}
                strokeWidth={5}
              />
            )}
          </MapView>
          
          <View style={styles.floatingDashboard}>
             <View style={styles.dashboardHeader}>
                <Text style={styles.dashboardTitle}>Navigating to Cleanup Site</Text>
                {routeDistance != null && routeDuration != null && (
                  <View style={styles.etaRow}>
                    <View style={styles.etaChip}>
                      <Navigation size={14} color={COLORS.primary} />
                      <Text style={styles.etaText}>{formatDistance(routeDistance)}</Text>
                    </View>
                    <View style={styles.etaChip}>
                      <Clock size={14} color={COLORS.accent} />
                      <Text style={styles.etaText}>{formatDuration(routeDuration)}</Text>
                    </View>
                  </View>
                )}
             </View>
             
             <TouchableOpacity 
                style={[styles.btnOutline, { borderColor: COLORS.success, backgroundColor: COLORS.success }]} 
                onPress={() => handleAction('status', 'Work in progress')}
                disabled={loading}>
                <Clock size={18} color="#fff" />
                <Text style={[styles.btnOutlineText, {color: '#fff'}]}>Arrived - Mark In Progress</Text>
            </TouchableOpacity>
          </View>

            <TouchableOpacity 
              style={[styles.floatingChatBtn, { top: 20, right: 16 }]} 
              onPress={() => setIsChatVisible(true)}
            >
              <MessageSquare size={24} color="#fff" />
            </TouchableOpacity>
        </>
      ) : (
        // --- STANDARD WORKFLOW UI ---
        <ScrollView>
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: task.photo_url }} style={styles.heroImage} />
            <TouchableOpacity 
              style={styles.heroChatBtn} 
              onPress={() => setIsChatVisible(true)}
            >
              <MessageSquare size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{task.ward}</Text>
            
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
                  {/* Always show Navigate button when assigned, except if currently navigating */}
                  {task.worker_status !== 'On the way' && (
                    <TouchableOpacity 
                        style={styles.btnOutline} 
                        onPress={() => handleAction('status', 'On the way')}
                        disabled={loading}>
                        <Navigation size={18} color={COLORS.primary} />
                        <Text style={styles.btnOutlineText}>Start Navigation</Text>
                    </TouchableOpacity>
                  )}

                  {/* Show Complete & Verify ONLY when in progress AND within 100m */}
                  {task.worker_status === 'Work in progress' && (
                    userLocation && getDistanceBetween(
                      userLocation.coords.latitude, userLocation.coords.longitude,
                      task.location?.coordinates[1], task.location?.coordinates[0]
                    ) <= 100 ? (
                      <TouchableOpacity 
                          style={[styles.btn, { backgroundColor: COLORS.success, marginTop: 16 }]} 
                          onPress={onProceedToCapture}>
                          <CheckCircle size={18} color="#fff" />
                          <Text style={styles.btnText}>Complete & Verify</Text>
                      </TouchableOpacity>
                    ) : null
                  )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
          <Text style={styles.backBtnText}>Close</Text>
      </TouchableOpacity>

      <ChatModal 
        isVisible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        complaintId={task._id}
        workerId={workerHash}
        workerName={task.worker_name || 'Worker'}
      />
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
  backBtn: { position: 'absolute', top: 20, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
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
  dashboardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  etaRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  etaChip: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  etaText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  floatingChatBtn: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 10,
  },
  heroChatBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
