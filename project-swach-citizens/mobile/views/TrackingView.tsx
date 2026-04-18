import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronLeft, MapPin, Truck, User, Clock, CheckCircle, Smartphone } from 'lucide-react-native';
import { COLORS, API_URL, SOCKET_URL } from '../constants/theme';
import axios from 'axios';
import { io } from 'socket.io-client';


interface TrackingViewProps {
  complaint: any;
  onBack: () => void;
}

export default function TrackingView({ complaint: initialComplaint, onBack }: TrackingViewProps) {
  const [complaint, setComplaint] = useState(initialComplaint);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Socket listener for live updates
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      path: '/ws/socket.io',
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('location_update', (data) => {
        if (data.worker_id === complaint.worker_id) {
            setComplaint((prev: any) => ({
                ...prev,
                worker_location: { coordinates: [data.lon, data.lat] }
            }));
        }
    });

    newSocket.on('status_update', (data) => {
        if (data.complaint_id === complaint._id) {
            setComplaint((prev: any) => ({
                ...prev,
                status: data.status,
                worker_status: data.worker_status || data.status
            }));
        }
    });

    return () => {
        newSocket.close();
    };
  }, [complaint._id, complaint.worker_id]);

  const steps = [
    { id: 'Reported', label: 'Report Filed', icon: Smartphone, color: '#3B82F6' },
    { id: 'Assigned', label: 'Worker Assigned', icon: User, color: '#8B5CF6' },
    { id: 'On the way', label: 'In Transit', icon: Truck, color: COLORS.accent },
    { id: 'Cleared', label: 'Issue Resolved', icon: CheckCircle, color: COLORS.primary },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === (complaint.status === 'Cleared' ? 'Cleared' : complaint.worker_status || 'Reported'));
  
  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isLast = index === steps.length - 1;
        const Icon = step.icon;

        return (
          <View key={step.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: isCompleted ? step.color : '#E5E7EB' }]}>
                    <Icon size={14} color="#fff" />
                </View>
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: index < currentStepIndex ? step.color : '#E5E7EB' }]} />}
            </View>
            <View style={styles.timelineRight}>
                <Text style={[styles.timelineLabel, isCompleted && { color: COLORS.text }]}>{step.label}</Text>
                {isCompleted && index === currentStepIndex && (
                    <Text style={styles.timelineStatus}>Current Status</Text>
                )}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>Tracking Report</Text>
            <Text style={styles.headerSubtitle}>ID: {complaint._id.substring(0, 8)}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Map */}
        <View style={styles.mapCard}>
            <MapView
                style={styles.map}
                initialRegion={{
                   latitude: complaint.location.coordinates[1],
                   longitude: complaint.location.coordinates[0],
                   latitudeDelta: 0.01,
                   longitudeDelta: 0.01,
                }}
            >
                {/* Trash Location */}
                <Marker 
                    coordinate={{ latitude: complaint.location.coordinates[1], longitude: complaint.location.coordinates[0] }}
                    image={require('../assets/trash.png')}
                    anchor={{ x: 0.5, y: 0.5 }}
                />

                {/* Worker Live Location (if status is On the way) */}
                {complaint.worker_location && complaint.status !== 'Cleared' && (
                    <Marker 
                        coordinate={{ 
                            latitude: complaint.worker_location.coordinates[1], 
                            longitude: complaint.worker_location.coordinates[0] 
                        }}
                        image={require('../assets/truck.png')}
                        anchor={{ x: 0.5, y: 0.5 }}
                    />
                )}
            </MapView>
            <View style={styles.mapOverlay}>
                <MapPin size={14} color={COLORS.textMuted} />
                <Text style={styles.wardTag}>{complaint.ward || 'General'}</Text>
            </View>
        </View>

        {/* Status Timeline Card */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Progress</Text>
            {renderTimeline()}
        </View>

        {/* Worker/Vehicle Info */}
        {complaint.worker_name && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Assigned Logistics</Text>
                <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                        <User color={COLORS.primary} size={20} />
                    </View>
                    <View>
                        <Text style={styles.infoLabel}>Worker In Charge</Text>
                        <Text style={styles.infoValue}>{complaint.worker_name}</Text>
                    </View>
                </View>
                {complaint.vehicle_number && (
                    <View style={[styles.infoRow, { marginTop: 16 }]}>
                        <View style={[styles.infoIcon, { backgroundColor: COLORS.accent + '20' }]}>
                            <Truck color={COLORS.accent} size={20} />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Vehicle Details</Text>
                            <Text style={styles.infoValue}>{complaint.vehicle_number}</Text>
                            <Text style={styles.infoSubValue}>{complaint.vehicle_type || 'Sanitation Truck'}</Text>
                        </View>
                    </View>
                )}
            </View>
        )}

        {/* Comparison Photos */}
        <View style={styles.card}>
             <Text style={styles.cardTitle}>Visual Updates</Text>
             <View style={styles.photoContainer}>
                <View style={styles.photoBox}>
                    <Image source={{ uri: complaint.photo_url }} style={styles.photo} />
                    <View style={styles.photoLabel}><Text style={styles.photoLabelText}>REPORTED</Text></View>
                </View>
                {complaint.after_photo_url && (
                    <View style={styles.photoBox}>
                        <Image source={{ uri: complaint.after_photo_url }} style={styles.photo} />
                        <View style={[styles.photoLabel, { backgroundColor: COLORS.primary }]}><Text style={styles.photoLabelText}>CLEARED</Text></View>
                    </View>
                )}
             </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footer}>
         <Clock size={16} color={COLORS.textMuted} />
         <Text style={styles.footerText}>Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  backBtn: { marginRight: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  mapCard: { height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  map: { flex: 1 },
  mapOverlay: { 
    position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' 
  },
  wardTag: { fontSize: 10, fontWeight: '800', color: COLORS.text, marginLeft: 6, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineContainer: { marginLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 2 },
  timelineLeft: { alignItems: 'center', width: 30, marginRight: 16 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineLine: { width: 2, height: 40, backgroundColor: '#E5E7EB', marginVertical: -2 },
  timelineRight: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  timelineStatus: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  infoSubValue: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  photoContainer: { flexDirection: 'row', gap: 12 },
  photoBox: { flex: 1, height: 120, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoLabel: { position: 'absolute', bottom: 6, left: 6, backgroundColor: COLORS.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  photoLabelText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  markerContainer: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  markerBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 20 },
  footerText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginLeft: 8 },
});
