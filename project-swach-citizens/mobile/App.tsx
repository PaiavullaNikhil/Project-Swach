import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Map as MapIcon, List, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, API_URL } from './constants/theme';
import FeedView from './views/FeedView';
import MapView from './views/MapView';
import ReportView from './views/ReportView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'report'>('feed');
  const [previousTab, setPreviousTab] = useState<'feed' | 'map'>('feed');
  const [userHash, setUserHash] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // 3. Request Location with Timeout
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Add a 5s timeout to getCurrentPositionAsync to prevent hanging
          const locationPromise = Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced 
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 5000)
          );
          
          const loc = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
          setLocation(loc);
        }
      } catch (locError) {
        console.log("Location fetch failed or timed out, skipping...", locError);
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
    initializeApp();
  }, []);

  const handleReportSuccess = async (pointsWon: number) => {
    try {
      const newPoints = userPoints + pointsWon;
      setUserPoints(newPoints);
      await AsyncStorage.setItem('userPoints', newPoints.toString());
      
      // Refresh feed and return
      setLoading(true);
      await fetchComplaints();
      setActiveTab('feed');
    } catch (e) {
      console.error("Report success refresh error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        
        {/* Header */}
        {activeTab !== 'report' && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Project Swach</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{userPoints} pts</Text>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          {activeTab === 'feed' && (
              <FeedView 
                  complaints={complaints} 
                  loading={loading} 
                  onRefresh={fetchComplaints} 
                  userHash={userHash} 
              />
          )}
          {activeTab === 'map' && (
              <MapView 
                  complaints={complaints} 
                  loading={loading} 
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
        </View>

        {/* Bottom Navigation */}
        {activeTab !== 'report' && (
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('feed')}>
              <List color={activeTab === 'feed' ? COLORS.primary : COLORS.textMuted} size={24} />
              <Text style={[styles.navText, activeTab === 'feed' && styles.navTextActive]}>Feed</Text>
            </TouchableOpacity>

            <View style={styles.reportBtnContainer}>
              <TouchableOpacity style={styles.reportBtn} onPress={() => {
                  setPreviousTab(activeTab as 'feed' | 'map');
                  setActiveTab('report');
              }}>
                  <Plus color="#fff" size={32} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}>
              <MapIcon color={activeTab === 'map' ? COLORS.primary : COLORS.textMuted} size={24} />
              <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Map</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 100,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pointsText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { flex: 1 },
  navBar: {
    height: 80,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: '500' },
  navTextActive: { color: COLORS.primary, fontWeight: '700' },
  reportBtnContainer: {
    top: -30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  reportBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
});
