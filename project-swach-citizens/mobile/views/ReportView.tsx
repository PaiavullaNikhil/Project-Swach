import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { X, Check, MapPin, ChevronLeft, Image as ImageIcon } from 'lucide-react-native';
import { COLORS, GRADIENTS, API_URL } from '../constants/theme';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const CATEGORIES = ['General', 'Plastic', 'Organic', 'E-Waste', 'Debris', 'Hazardous'];

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
  const [selectedCategory, setSelectedCategory] = useState('General');
  const cameraRef = useRef<any>(null);
  
  const scanLinePos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (!location) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
           setLocation(loc);
        }
      }
    })();

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
        <Text style={{ textAlign: 'center', color: '#fff', fontSize: 16 }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.8}>
          <LinearGradient colors={GRADIENTS.primary} style={styles.button}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]);
      if (!location) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setLocation(loc);
        } catch (e) {
          console.log("GPS capture failed during gallery pick", e);
        }
      }
    }
  };

  const retryLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      Alert.alert('GPS Fixed', 'Location locked successfully.');
    } catch (e) {
      Alert.alert('GPS Error', 'Still unable to lock location. Try moving outdoors.');
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhoto(data);
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
        Alert.alert(
            'GPS Required', 
            'Waiting for location lock. Please try again in 5 seconds or tap Retry.',
            [{ text: 'Retry', onPress: retryLocation }, { text: 'OK' }]
        );
        return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('lat', location.coords.latitude.toString());
    formData.append('lon', location.coords.longitude.toString());
    if (userHash) formData.append('user_hash', userHash);
    formData.append('category', selectedCategory);
    
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
        onSuccess(50);
      } else if (response.data.status === 'DUPLICATE') {
        Alert.alert('Already Reported', response.data.message);
        onSuccess(10);
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
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} ref={cameraRef} />
          <View style={styles.overlay}>
             <View style={styles.topBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity activeOpacity={0.8} onPress={onCancel}>
                        <BlurView intensity={40} tint="light" style={styles.backBtn}>
                          <ChevronLeft color="#fff" size={24} />
                          <Text style={styles.backText}>Back</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} onPress={pickImage}>
                        <BlurView intensity={40} tint="light" style={styles.galleryBtn}>
                          <ImageIcon color="#fff" size={22} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
             </View>

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
                <TouchableOpacity activeOpacity={0.8} onPress={takePicture}>
                   <BlurView intensity={60} tint="light" style={styles.captureBtn}>
                     <View style={styles.captureBtnInner} />
                   </BlurView>
                </TouchableOpacity>
                <Text style={styles.hint}>Tap to capture waste</Text>
             </View>
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          
          <BlurView intensity={80} tint="dark" style={styles.previewOverlay}>
            <View style={styles.locationBadge}>
                <MapPin size={16} color={COLORS.primary} />
                <Text style={styles.locationText}>
                    {location?.coords.latitude.toFixed(4)}, {location?.coords.longitude.toFixed(4)}
                </Text>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.categoryHeader}>Select Waste Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity 
                      key={cat} 
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isSelected ? GRADIENTS.primary : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={[
                          styles.categoryCard,
                          { borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.2)' }
                        ]}
                      >
                        <Text style={{ 
                          color: isSelected ? '#fff' : '#ccc', 
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: 14
                        }}>{cat}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.previewActions}>
                <TouchableOpacity 
                    style={[styles.actionBtnWrapper, { width: '40%' }]} 
                    onPress={() => setPhoto(null)}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
                      <X color="#fff" size={24} />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Retake</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionBtnWrapper, { width: '56%' }]} 
                    onPress={submitReport}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      style={styles.actionBtn}
                    >
                      {isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                      ) : (
                          <>
                              <Check color="#fff" size={24} />
                              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Confirm</Text>
                          </>
                      )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  camera: { flex: 1 },
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: { 
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)', 
    justifyContent: 'space-between', 
    padding: 30 
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  backBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, 
    overflow: 'hidden',
  },
  backText: { color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 4 },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    overflow: 'hidden',
  },
  badge: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scanFrame: {
    width: '100%', height: 300, alignSelf: 'center',
    borderWidth: 0, position: 'relative'
  },
  scanLine: {
    height: 3, width: '100%', backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 15, elevation: 10
  },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.primary, borderWidth: 5, borderRadius: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraControls: { width: '100%', alignItems: 'center', marginBottom: 20 },
  captureBtn: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  hint: { color: '#fff', marginTop: 16, fontSize: 14, fontWeight: '700', opacity: 0.9, letterSpacing: 0.5 },
  previewContainer: { flex: 1, position: 'relative' },
  preview: { flex: 1 },
  previewOverlay: {
    position: 'absolute', bottom: 0, width: '100%', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden'
  },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5,
  },
  locationText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: COLORS.text },
  categoryHeader: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  categoryCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
  },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtnWrapper: {
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 16, borderRadius: 20,
  },
  actionBtnText: { marginLeft: 8, fontSize: 16, fontWeight: '800' },
  button: { padding: 16, borderRadius: 16, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
