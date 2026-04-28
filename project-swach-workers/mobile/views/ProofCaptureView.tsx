import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';
import { Check, X, Camera, MessageSquare } from 'lucide-react-native';
import ChatModal from '../components/ChatModal';

interface ProofCaptureViewProps {
  task: any;
  workerHash: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ProofCaptureView({ task, workerHash, onCancel, onSuccess }: ProofCaptureViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setPhotoUri(photo?.uri || null);
      } catch (e) {
        Alert.alert("Camera Error", "Failed to capture proof.");
      } finally {
        setLoading(false);
      }
    }
  };

  const submitProof = async () => {
    if (!photoUri) return;

    setLoading(true);
    try {
      // 1. Get high-accuracy GPS
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      
      const formData = new FormData();
      formData.append('lat', loc.coords.latitude.toString());
      formData.append('lon', loc.coords.longitude.toString());
      
      // Append file
      formData.append('photo', {
        uri: photoUri,
        name: 'after_proof.jpg',
        type: 'image/jpeg'
      } as any);

      // 2. Submit to backend
      const response = await axios.post(`${API_URL}/worker/complete/${task._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000
      });

      if (response.data.status === 'SUCCESS') {
        onSuccess();
      }
    } catch (err: any) {
      console.log("Submit error", err.response?.data || err.message);
      Alert.alert(
        "Verification Failed", 
        err.response?.data?.detail || "Could not verify resolution. Backend check failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permission?.granted) {
    return <View style={styles.container}><Text style={styles.text}>Camera permission denied.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <CameraView style={styles.camera} ref={cameraRef} facing="back" />
          <View style={styles.overlay}>
             <View style={styles.headerBox}>
               <Text style={styles.headerText}>Capture "After" Proof</Text>
             </View>
             
              <View style={styles.controls}>
                <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.btnCapture} onPress={takePicture} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Camera size={32} color="#fff" />}
                </TouchableOpacity>
                
{/* 
                <TouchableOpacity 
                  style={styles.chatBtn} 
                  onPress={() => setIsChatVisible(true)}
                >
                  <MessageSquare size={24} color="#fff" />
                </TouchableOpacity>
*/}
              </View>
          </View>
        </>
      ) : (
        <>
          <Image source={{ uri: photoUri }} style={styles.camera} />
          <View style={styles.overlayConfirm}>
             <Text style={styles.confirmText}>Submit this proof for GPS validation?</Text>
             <View style={styles.confirmControls}>
                <TouchableOpacity style={[styles.controlBtn, {backgroundColor: COLORS.error}]} onPress={() => setPhotoUri(null)} disabled={loading}>
                   <Text style={styles.controlText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, {backgroundColor: COLORS.primary}]} onPress={submitProof} disabled={loading}>
                   {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.controlText}>Verify & Complete</Text>}
                </TouchableOpacity>
             </View>
          </View>
        </>
      )}
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
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  text: { color: '#fff', textAlign: 'center', marginTop: 100 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
  headerBox: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 40 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  btnCancel: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 30 },
  btnCapture: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  chatBtn: { backgroundColor: 'rgba(59, 130, 246, 0.8)', padding: 16, borderRadius: 30, borderWidth: 2, borderColor: '#fff' },
  overlayConfirm: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  confirmText: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20, color: COLORS.text },
  confirmControls: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  controlBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  controlText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
