import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { io } from 'socket.io-client';
import { COLORS, API_URL } from './constants/theme';
import TasksView from './views/TasksView';
import ActiveTaskView from './views/ActiveTaskView';
import ProofCaptureView from './views/ProofCaptureView';
import LoginView from './views/LoginView';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'login' | 'tasks' | 'active_task' | 'proof_capture'>('login');
  const [worker, setWorker] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);

  const fetchTasks = async (workerId?: string) => {
    const id = workerId || worker?.worker_id;
    if (!id) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/worker/tasks/${id}`, { timeout: 8000 });
      // Safeguard: Filter out any cleared tasks that might have leaked through
      const activeTasks = response.data.filter((t: any) => t.status !== 'Cleared');
      setTasks(activeTasks);
    } catch (err: any) {
      console.log('Worker tasks fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (loggedWorker: any, selectedVehicle: any) => {
    setWorker(loggedWorker);
    setVehicle(selectedVehicle);
    await AsyncStorage.setItem('workerData', JSON.stringify(loggedWorker));
    await AsyncStorage.setItem('vehicleData', JSON.stringify(selectedVehicle));
    setActiveScreen('tasks');
    fetchTasks();
  };

  const checkAuth = async () => {
    const savedWorker = await AsyncStorage.getItem('workerData');
    const savedVehicle = await AsyncStorage.getItem('vehicleData');
    if (savedWorker && savedVehicle) {
      const parsedWorker = JSON.parse(savedWorker);
      setWorker(parsedWorker);
      setVehicle(JSON.parse(savedVehicle));
      setActiveScreen('tasks');
      fetchTasks(parsedWorker.worker_id);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to end your session?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(['workerData', 'vehicleData']);
            setWorker(null);
            setVehicle(null);
            setActiveScreen('login');
          }
        }
      ]
    );
  };


  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         // 1. Initial fast fix
         const lastLoc = await Location.getLastKnownPositionAsync();
         if (lastLoc) setLocation(lastLoc);

         // 2. Start watching for movement
         await Location.watchPositionAsync(
           {
             accuracy: Location.Accuracy.Balanced,
             timeInterval: 5000,
             distanceInterval: 10,
           },
           (newLoc) => {
             setLocation(newLoc);
           }
         );
      }
    } catch (e) {
      console.log("Location tracking error", e);
    }
  };

  // Keep a ref to activeScreen so BackHandler doesn't need activeScreen in deps
  const activeScreenRef = useRef(activeScreen);
  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await updateLocation();
    };
    init();
  }, []);

  // Socket: initialize ONCE, not on every screen change
  useEffect(() => {
    const newSocket = io(API_URL, {
      path: '/ws/socket.io',
      transports: ['websocket'],
    });
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  // BackHandler: uses ref so it doesn't re-create on screen changes
  useEffect(() => {
    const backAction = () => {
      if (activeScreenRef.current !== 'tasks' && activeScreenRef.current !== 'login') {
        setActiveScreen('tasks');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
    };
  }, []);

  useEffect(() => {
    if (socket && location && worker) {
      socket.emit('location_update', {
         worker_id: worker.worker_id,
         lat: location.coords.latitude,
         lon: location.coords.longitude
      });
    }
  }, [location, socket, worker]);

  const getDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    if (task.worker_status === 'Work in progress' && location) {
      const dist = getDistanceBetween(
        location.coords.latitude, location.coords.longitude,
        task.location?.coordinates[1], task.location?.coordinates[0]
      );
      if (dist <= 100) {
        setActiveScreen('proof_capture');
        return;
      }
    }
    setActiveScreen('active_task');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Simple Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Swach Worker</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {loading && <ActivityIndicator color="#fff" size="small" />}
            {worker && (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <LogOut color="#fff" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {activeScreen === 'login' && (
            <LoginView onLogin={handleLogin} />
          )}

          {activeScreen === 'tasks' && (
            <TasksView 
              tasks={tasks}
              loading={loading}
              onRefresh={fetchTasks}
              onSelectTask={handleSelectTask}
            />
          )}

          {activeScreen === 'active_task' && selectedTask && (
            <ActiveTaskView 
              task={selectedTask}
              workerHash={worker?.worker_id}
              vehicleNumber={vehicle?.plate_number}
              onGoBack={() => setActiveScreen('tasks')}
              onRefreshedTask={(updatedTask) => setSelectedTask(updatedTask)}
              onProceedToCapture={() => setActiveScreen('proof_capture')}
            />
          )}

          {activeScreen === 'proof_capture' && selectedTask && (
            <ProofCaptureView
              task={selectedTask}
              workerHash={worker?.worker_id}
              onCancel={() => setActiveScreen('active_task')}
              onSuccess={async () => {
                await fetchTasks();
                setActiveScreen('tasks');
                Alert.alert("Success", "Task Verified & Cleared!");
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    backgroundColor: COLORS.primary, padding: 16, flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center' 
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  logoutBtn: { padding: 4 },
  content: { flex: 1 }
});
