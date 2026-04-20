import Constants from 'expo-constants';

// Dynamically fetch the local IP of the machine running the Expo server
const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : '192.168.68.60'; // Fallback to last known IP

export const COLORS = {
  primary: '#10B981', // Emerald 500
  secondary: '#059669', // Emerald 600
  accent: '#F59E0B', // Amber 500 (for Trending/Points)
  background: '#F9FAFB', // Gray 50
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  border: '#E5E7EB',
};

// Citizen Backend (REST API)
export const API_URL = `http://${localIp}:8000`; 
// Worker Backend (Socket.IO for real-time tracking)
export const SOCKET_URL = `http://${localIp}:8001`; 
