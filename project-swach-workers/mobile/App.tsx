import React, { useState, useEffect } from 'react';
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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/worker/tasks`, { timeout: 8000 });
      setTasks(response.data);
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
      setWorker(JSON.parse(savedWorker));
      setVehicle(JSON.parse(savedVehicle));
      setActiveScreen('tasks');
      fetchTasks();
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
         const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         setLocation(loc);
      }
    } catch (e) {
      console.log("Location error", e);
    }
  };

  useEffect(() => {
    // Initialize Socket
    const newSocket = io(API_URL, {
      path: '/ws/socket.io',
      transports: ['websocket'],
    });
    setSocket(newSocket);

    const init = async () => {
      await checkAuth();
      await updateLocation();
    };
    init();

    const backAction = () => {
      if (activeScreen !== 'tasks') {
        setActiveScreen('tasks');
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      newSocket.close();
      backHandler.remove();
    };
  }, [activeScreen]);

  useEffect(() => {
    if (socket && location && worker) {
      socket.emit('location_update', {
         worker_id: worker.worker_id,
         lat: location.coords.latitude,
         lon: location.coords.longitude
      });
    }
  }, [location, socket, worker]);

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    setActiveScreen('active_task');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        
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
