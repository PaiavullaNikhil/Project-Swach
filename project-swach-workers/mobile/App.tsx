import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, API_URL } from './constants/theme';
import TasksView from './views/TasksView';
import ActiveTaskView from './views/ActiveTaskView';
import ProofCaptureView from './views/ProofCaptureView';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'tasks' | 'active_task' | 'proof_capture'>('tasks');
  const [workerHash, setWorkerHash] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

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

  const getOrAssignWorkerId = async () => {
    let hash = await AsyncStorage.getItem('workerHash');
    if (!hash) {
      hash = 'worker_' + Math.random().toString(36).substring(2, 9);
      await AsyncStorage.setItem('workerHash', hash);
    }
    setWorkerHash(hash);
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
    const init = async () => {
      await getOrAssignWorkerId();
      await updateLocation();
      await fetchTasks();
    };
    init();

    const backAction = () => {
      if (activeScreen !== 'tasks') {
        setActiveScreen('tasks');
        return true; // Prevent default behavior (exit app)
      }
      return false; // Let default behavior happen (exit app)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeScreen]);

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
          {loading && <ActivityIndicator color="#fff" size="small" />}
        </View>

        <View style={styles.content}>
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
              workerHash={workerHash!}
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
  content: { flex: 1 }
});
