import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { X, Check, MapPin } from 'lucide-react-native';
import { COLORS, API_URL } from '../constants/theme';
import axios from 'axios';

interface ReportViewProps {
  onCancel: () => void;
  onSuccess: (points: number) => void;
  initialLocation: Location.LocationObject | null;
  userHash: string | null;
}

export default function ReportView({ onCancel, onSuccess, initialLocation, userHash }: ReportViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(initialLocation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<any>(null);
  
  // Animation for the "Scanning" laser
  const scanLinePos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      // If we don't have an initial location, fetch it now with high accuracy
      if (!location) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
           setLocation(loc);
        }
      }
    })();

    // Start scanning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLinePos, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(scanLinePos, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: '#fff' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhoto(data);
      // Re-fetch location at capture time for best accuracy
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
      } catch (e) {
        console.log("GPS capture failed, using previous", e);
      }
    }
  };

  const submitReport = async () => {
    if (!photo || !location) {
        Alert.alert('GPS Required', 'Waiting for location lock...');
        return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('lat', location.coords.latitude.toString());
    formData.append('lon', location.coords.longitude.toString());
    if (userHash) formData.append('user_hash', userHash);
    
    formData.append('photo', {
      uri: photo.uri,
      name: 'report.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await axios.post(`${API_URL}/report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'SUCCESS') {
        Alert.alert('Success', 'Report submitted! +50 Points awarded.');
        onSuccess(50); // Award 50 points
      } else if (response.data.status === 'DUPLICATE') {
        Alert.alert('Already Reported', response.data.message);
        onSuccess(10); // Reward 10 points for verifying/supporting
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Submission Failed', error.response?.data?.detail || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
             <View style={styles.topBar}>
                <TouchableOpacity style={styles.glassBtn} onPress={onCancel}>
                    <X color="#fff" size={24} />
                </TouchableOpacity>
                <View style={styles.badge}>
                    <View style={styles.dot} />
                    <Text style={styles.badgeText}>AI SCANNING ACTIVE</Text>
                </View>
             </View>

             {/* Scanning Frame */}
             <View style={styles.scanFrame}>
                <Animated.View 
                    style={[
                        styles.scanLine, 
                        { 
                            transform: [{ translateY: scanLinePos.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 300]
                            }) }] 
                        }
                    ]} 
                />
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
             </View>
             
             <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                   <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <Text style={styles.hint}>Taps to capture waste</Text>
             </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          
          <View style={styles.previewOverlay}>
            <View style={styles.locationBadge}>
                <MapPin size={16} color={COLORS.primary} />
                <Text style={styles.locationText}>
                    {location?.coords.latitude.toFixed(4)}, {location?.coords.longitude.toFixed(4)}
                </Text>
            </View>

            <View style={styles.previewActions}>
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
                    onPress={() => setPhoto(null)}
                    disabled={isSubmitting}
                >
                    <X color="#fff" size={24} />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} 
                    onPress={submitReport}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Check color="#fff" size={24} />
                            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Confirm Report</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'space-between', padding: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 },
  glassBtn: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  badge: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  scanFrame: {
    width: '100%', height: 300, alignSelf: 'center',
    borderWidth: 0, position: 'relative'
  },
  scanLine: {
    height: 2, width: '100%', backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 10
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: COLORS.primary, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraControls: { width: '100%', alignItems: 'center', marginBottom: 20 },
  captureBtn: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#fff',
  },
  captureBtnInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff' },
  hint: { color: '#fff', marginTop: 12, fontSize: 13, fontWeight: '600', opacity: 0.8 },
  previewContainer: { flex: 1 },
  preview: { flex: 1 },
  previewOverlay: {
    position: 'absolute', bottom: 0, width: '100%', padding: 24,
    backgroundColor: 'rgba(0,0,0,0.7)', borderTopLeftRadius: 30, borderTopRightRadius: 30
  },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20,
  },
  locationText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: COLORS.text },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 24, borderRadius: 20, width: '48%',
  },
  actionBtnText: { marginLeft: 8, fontSize: 16, fontWeight: '800' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
