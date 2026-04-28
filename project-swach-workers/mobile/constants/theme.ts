import Constants from 'expo-constants';

// Dynamically fetch the local IP of the machine running the Expo server
const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : '192.168.68.60'; // Fallback to last known IP

export const COLORS = {
  primary: '#3B82F6', // Blue 500 (Worker Brand Color)
  secondary: '#2563EB', // Blue 600
  accent: '#F59E0B', 
  background: '#F9FAFB', 
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  border: '#E5E7EB',
};

export const GRADIENTS = {
  primary: ['#3B82F6', '#2563EB'] as readonly [string, string, ...string[]],
  accent: ['#F59E0B', '#FBBF24'] as readonly [string, string, ...string[]],
  darkOverlay: ['transparent', 'rgba(0,0,0,0.8)'] as readonly [string, string, ...string[]],
};

// Replace with localhost IP of backend
export const API_URL = `http://${localIp}:8001`;
