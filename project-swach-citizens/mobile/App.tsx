import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Map as MapIcon, List, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, GRADIENTS, API_URL, SOCKET_URL } from './constants/theme';
import WelcomeView from './views/WelcomeView';
import FeedView from './views/FeedView';
import MapView from './views/MapView';
import ReportView from './views/ReportView';
import TrackingView from './views/TrackingView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'feed' | 'map' | 'report' | 'tracking'>('welcome');
  const [previousTab, setPreviousTab] = useState<'feed' | 'map'>('feed');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<any>(null);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get(`${API_URL}/feed`, { timeout: 8000 });
      setComplaints(response.data);
    } catch (err: any) {
      console.log('Global fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // 1. Get/Create User Hash
      let hash = await AsyncStorage.getItem('userHash');
      if (!hash) {
        hash = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('userHash', hash);
      }
      setUserHash(hash);

      // 2. Get User Points
      const points = await AsyncStorage.getItem('userPoints');
      setUserPoints(points ? parseInt(points) : 0);

      // 3. Request Location (Flash Fast + Precise Fallback)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // 3a. Get last known position (INSTANT)
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc) {
            setLocation(lastLoc);
          }

          // 3b. Fetch precise position in background with a longer timeout
          const locationPromise = Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced 
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 15000)
          );
          
          const loc = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
          setLocation(loc);
        }
      } catch (locError) {
        console.log("Location fetch timeout, using last available position", locError);
      }

      // 4. Initial Fetch
      await fetchComplaints();
    } catch (e) {
      console.error("Initialization error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Socket
    const newSocket = io(SOCKET_URL, {
      path: '/ws/socket.io',
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('status_update', (data) => {
      console.log('Real-time status update:', data);
      setComplaints(prev => prev.map(c => 
        c._id === data.complaint_id ? { ...c, status: data.status, worker_status: data.worker_status || data.status } : c
      ));
    });

    initializeApp();

    return () => {
      newSocket.close();
    };
  }, []);

  const handleReportSuccess = async (pointsWon: number) => {
    try {
      const newPoints = userPoints + pointsWon;
      setUserPoints(newPoints);
      await AsyncStorage.setItem('userPoints', newPoints.toString());
      
      // Refresh feed and return
      setLoading(true);
      await fetchComplaints();
      
      // If we were in tracking mode, we might want to stay there or refresh. 
      // For now, return to feed or map.
      setActiveTab(previousTab);
    } catch (e) {
      console.error("Report success refresh error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        {activeTab !== 'welcome' && activeTab !== 'report' && (
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Project Swach</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{userPoints} pts</Text>
            </View>
          </LinearGradient>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          {activeTab === 'welcome' && (
              <WelcomeView onGetStarted={() => setActiveTab('feed')} />
          )}
          {activeTab === 'feed' && (
              <FeedView 
                  complaints={complaints} 
                  loading={loading} 
                  onRefresh={fetchComplaints} 
                  userHash={userHash} 
                  onSelectComplaint={(c) => {
                    setSelectedComplaint(c);
                    setPreviousTab('feed');
                    setActiveTab('tracking');
                  }}
              />
          )}
          {activeTab === 'map' && (
              <MapView 
                  complaints={complaints} 
                  loading={loading} 
                  onSelectComplaint={(c) => {
                    setSelectedComplaint(c);
                    setPreviousTab('map');
                    setActiveTab('tracking');
                  }}
              />
          )}
          {activeTab === 'report' && (
              <ReportView 
                  onCancel={() => setActiveTab(previousTab)} 
                  onSuccess={handleReportSuccess} 
                  initialLocation={location}
                  userHash={userHash}
              />
          )}
          {activeTab === 'tracking' && selectedComplaint && (
              <TrackingView
                  complaint={selectedComplaint}
                  onBack={() => setActiveTab(previousTab)}
              />
          )}
        </View>

        {/* Bottom Navigation */}
        {activeTab !== 'welcome' && activeTab !== 'report' && activeTab !== 'tracking' && (
          <View style={styles.navBarWrapper}>
            <View style={styles.navBarContainer}>
              <BlurView intensity={90} tint="light" style={styles.navBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('feed')}>
                  <List color={activeTab === 'feed' ? COLORS.primary : COLORS.textMuted} size={26} />
                  <Text style={[styles.navText, activeTab === 'feed' && styles.navTextActive]}>Feed</Text>
                </TouchableOpacity>

                <View style={styles.navItemPlaceholder} />

                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}>
                  <MapIcon color={activeTab === 'map' ? COLORS.primary : COLORS.textMuted} size={26} />
                  <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Map</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
            
            <View style={styles.reportBtnContainer}>
              <TouchableOpacity style={styles.reportBtnWrapper} onPress={() => {
                  setPreviousTab(activeTab as 'feed' | 'map');
                  setActiveTab('report');
              }} activeOpacity={0.8}>
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reportBtn}
                >
                  <Plus color="#fff" size={32} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
    marginBottom: -10, // Overlap with content slightly
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pointsText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, backgroundColor: COLORS.background },
  navBarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  navBarContainer: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  navBar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navItemPlaceholder: { flex: 0.5 },
  navText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  navTextActive: { color: COLORS.primary, fontWeight: '800' },
  reportBtnContainer: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    zIndex: 1001,
  },
  reportBtnWrapper: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  reportBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
});
