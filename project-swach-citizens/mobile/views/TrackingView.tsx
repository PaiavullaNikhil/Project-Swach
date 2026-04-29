import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronLeft, MapPin, Truck, User, Clock, CheckCircle, Smartphone } from 'lucide-react-native';
import { COLORS, GRADIENTS, API_URL, SOCKET_URL } from '../constants/theme';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface TrackingViewProps {
  complaint: any;
  onBack: () => void;
}

export default function TrackingView({ complaint: initialComplaint, onBack }: TrackingViewProps) {
  const [complaint, setComplaint] = useState(initialComplaint);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const mapRef = React.useRef<MapView | null>(null);

  // Sync state when props change
  useEffect(() => {
    setComplaint(initialComplaint);
  }, [initialComplaint._id]);

  // Sync data with backend
  const refreshData = async () => {
    try {
      const response = await axios.get(`${API_URL}/complaint/${complaint._id}`);
      setComplaint(response.data);
    } catch (e) {
      console.log("Failed to sync complaint data", e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Socket listener for live updates
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      path: '/ws/socket.io',
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('location_update', (data) => {
        setComplaint((prev: any) => {
            if (prev.worker_id && data.worker_id.toLowerCase() === prev.worker_id.toLowerCase()) {
                const newLocation = { coordinates: [data.lon, data.lat] };
                
                if (mapRef.current) {
                    mapRef.current.fitToCoordinates([
                        { latitude: prev.location.coordinates[1], longitude: prev.location.coordinates[0] },
                        { latitude: data.lat, longitude: data.lon }
                    ], {
                        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                        animated: true
                    });
                }

                return {
                    ...prev,
                    worker_location: newLocation
                };
            }
            return prev;
        });
    });

    newSocket.on('status_update', (data) => {
        if (data.complaint_id === complaint._id) {
            setComplaint((prev: any) => ({
                ...prev,
                status: data.status,
                worker_status: data.worker_status || data.status,
                worker_name: data.worker_name || prev.worker_name,
                worker_id: data.worker_id || prev.worker_id
            }));
            if (data.status === 'Assigned' || data.status === 'On the way') {
                refreshData();
            }
        }
    });

    return () => {
        newSocket.close();
    };
  }, [complaint._id]);

  const steps = [
    { id: 'Reported', label: 'Report Filed', icon: Smartphone, color: '#3B82F6' },
    { id: 'Assigned', label: 'Worker Assigned', icon: User, color: '#8B5CF6' },
    { id: 'On the way', label: 'In Transit', icon: Truck, color: COLORS.accent },
    { id: 'Cleared', label: 'Issue Resolved', icon: CheckCircle, color: COLORS.primary },
  ];

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isWorkerAtSite = () => {
    if (complaint.worker_status === 'Work in progress') return true;
    if (!complaint.worker_location) return false;
    
    const dist = getDistance(
        complaint.worker_location.coordinates[1], complaint.worker_location.coordinates[0],
        complaint.location.coordinates[1], complaint.location.coordinates[0]
    );
    return dist <= 15; // 15m threshold for better visibility in UI
  };

  const getStepId = () => {
    if (complaint.status === 'Cleared') return 'Cleared';
    
    // Safety: If no worker is assigned, it must be in Reported state regardless of other flags
    if (!complaint.worker_id) return 'Reported';

    // Transit/Active phase requirements:
    // 1. Must have a worker
    // 2. Must be in a transit/work status
    // 3. For 'On the way', MUST have a visible worker_location to justify "In Transit" highlight
    const workerAtSite = isWorkerAtSite();

    if (complaint.worker_status === 'Work in progress' || workerAtSite) return 'On the way'; 
    
    if ((complaint.worker_status === 'On the way' || complaint.status === 'On the way') && complaint.worker_location) {
        return 'On the way';
    }
        
    if (complaint.worker_status === 'Assigned' || 
        complaint.status === 'Assigned' || 
        (complaint.worker_status === 'On the way' && !complaint.worker_location)) {
        return 'Assigned';
    }
        
    return 'Reported';
  };

  const currentStepIndex = steps.findIndex(s => s.id === getStepId());

  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isActive = index === currentStepIndex;
        const isLast = index === steps.length - 1;
        const Icon = step.icon;
        const workerArrived = isWorkerAtSite();

        return (
          <View key={step.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
                <View style={[
                    styles.timelineDot, 
                    { backgroundColor: isCompleted ? step.color : '#E5E7EB' },
                    isActive && styles.activeDot
                ]}>
                    <Icon size={isActive ? 16 : 12} color="#fff" strokeWidth={3} />
                    {isActive && (
                        <Animated.View style={[styles.dotGlow, { backgroundColor: step.color }]} />
                    )}
                </View>
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: index < currentStepIndex ? step.color : '#E5E7EB' }]} />}
            </View>
            <View style={styles.timelineRight}>
                <Text style={[styles.timelineLabel, isCompleted && { color: COLORS.text, fontWeight: '800' }]}>{step.label}</Text>
                
                {isActive && step.id === 'On the way' && (
                    <Text style={[styles.timelineStatus, { color: step.color }]}>
                        {workerArrived ? 'Worker at Site • Cleanup in Progress' : 'Live Tracking Active • In Transit'}
                    </Text>
                )}
                
                {isActive && step.id === 'Assigned' && (
                    <Text style={[styles.timelineStatus, { color: step.color }]}>
                        {workerArrived ? 'Worker at Site • Cleanup in Progress' : 'Awaiting Worker Dispatch'}
                    </Text>
                )}
                
                {isActive && step.id === 'Reported' && (
                    <Text style={[styles.timelineStatus, { color: step.color }]}>Awaiting Verification</Text>
                )}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>Tracking Report</Text>
            <Text style={styles.headerSubtitle}>#{complaint._id.substring(0, 8).toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Map Card */}
        <View style={styles.mapCard}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation={true}
                initialRegion={{
                   latitude: complaint.location.coordinates[1],
                   longitude: complaint.location.coordinates[0],
                   latitudeDelta: 0.02,
                   longitudeDelta: 0.02,
                }}
            >
                <Marker 
                    coordinate={{ latitude: complaint.location.coordinates[1], longitude: complaint.location.coordinates[0] }}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <Image source={require('../assets/trash.png')} style={{ width: 40, height: 40 }} />
                </Marker>

                {complaint.worker_location && 
                 (complaint.worker_status === 'On the way' || complaint.status === 'On the way') && (
                    <Marker 
                        coordinate={{ 
                            latitude: complaint.worker_location.coordinates[1], 
                            longitude: complaint.worker_location.coordinates[0] 
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <Image source={require('../assets/truck.png')} style={{ width: 50, height: 50 }} />
                    </Marker>
                )}
            </MapView>
            <BlurView intensity={80} tint="light" style={styles.mapOverlay}>
                <MapPin size={14} color={COLORS.primary} />
                <Text style={styles.wardTag}>{complaint.ward || 'General'}</Text>
            </BlurView>
        </View>

        {/* Status Timeline Card */}
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Resolution Progress</Text>
                {(complaint.worker_status === 'On the way' || complaint.status === 'On the way') && (
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}
            </View>
            {renderTimeline()}
        </View>

        {/* Worker/Vehicle Info Card (Frosted Glass) */}
        {complaint.worker_name && (
            <View style={styles.workerCardContainer}>
                <LinearGradient 
                    colors={['#fff', '#f9fafb']} 
                    style={styles.workerCard}
                >
                    <Text style={styles.cardTitle}>Assigned Logistics</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.avatarContainer}>
                            <User color={COLORS.primary} size={24} strokeWidth={2.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Worker In Charge</Text>
                            <Text style={styles.infoValue}>{complaint.worker_name}</Text>
                        </View>
                        <TouchableOpacity style={styles.contactBtn}>
                            <Smartphone color="#fff" size={20} />
                        </TouchableOpacity>
                    </View>
                    
                    {complaint.vehicle_number && (
                        <View style={[styles.infoRow, { marginTop: 20 }]}>
                            <View style={[styles.avatarContainer, { backgroundColor: COLORS.accentGlow }]}>
                                <Truck color={COLORS.accent} size={24} strokeWidth={2.5} />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Vehicle Identification</Text>
                                <Text style={[styles.infoValue, { color: COLORS.accent }]}>{complaint.vehicle_number}</Text>
                                <Text style={styles.infoSubValue}>{complaint.vehicle_type || 'Waste Management Unit'}</Text>
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </View>
        )}

        {/* Visual Updates Card */}
        <View style={styles.card}>
             <Text style={styles.cardTitle}>Visual Evidence</Text>
             <View style={styles.photoContainer}>
                <View style={styles.photoBox}>
                    <Image source={{ uri: complaint.photo_url }} style={styles.photo} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.photoLabelGradient}>
                        <Text style={styles.photoLabelText}>BEFORE</Text>
                    </LinearGradient>
                </View>
                {complaint.after_photo_url && (
                    <View style={styles.photoBox}>
                        <Image source={{ uri: complaint.after_photo_url }} style={styles.photo} />
                        <LinearGradient colors={['transparent', COLORS.primary + 'CC']} style={styles.photoLabelGradient}>
                            <Text style={styles.photoLabelText}>AFTER</Text>
                        </LinearGradient>
                    </View>
                )}
             </View>
        </View>
      </ScrollView>

      {/* Footer Info */}
      <BlurView intensity={90} tint="light" style={styles.footer}>
         <Clock size={16} color={COLORS.textMuted} />
         <Text style={styles.footerText}>Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10
  },
  backBtn: { marginRight: 16, width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  mapCard: { height: 250, borderRadius: 28, overflow: 'hidden', marginBottom: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  map: { flex: 1 },
  mapOverlay: { 
    position: 'absolute', top: 16, left: 16, 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden'
  },
  wardTag: { fontSize: 11, fontWeight: '900', color: COLORS.text, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  timelineContainer: { marginLeft: 6 },
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 32, marginRight: 20 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 10, position: 'relative' },
  activeDot: { transform: [{ scale: 1.1 }], shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 5 },
  dotGlow: { position: 'absolute', width: 44, height: 44, borderRadius: 22, opacity: 0.2, zIndex: -1 },
  timelineLine: { width: 3, height: 45, backgroundColor: '#E5E7EB', marginVertical: -2 },
  timelineRight: { flex: 1, paddingBottom: 25 },
  timelineLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  timelineStatus: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  workerCardContainer: { marginBottom: 24, elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 15 },
  workerCard: { borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  avatarContainer: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  infoSubValue: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  contactBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  photoContainer: { flexDirection: 'row', gap: 15 },
  photoBox: { flex: 1, height: 160, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoLabelGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, justifyContent: 'flex-end', padding: 10 },
  photoLabelText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  footer: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  footerText: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginLeft: 8 },
});
