import Constants from 'expo-constants';

// Dynamically fetch the local IP of the machine running the Expo server
const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : '192.168.68.60'; // Fallback to last known IP

export const COLORS = {
  primary: '#059669', // Emerald 600
  secondary: '#10B981', // Emerald 500
  tertiary: '#34D399', // Emerald 400
  accent: '#F59E0B', // Amber 500
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  background: '#F3F4F6', // Gray 100
  surface: '#FFFFFF',
  surfaceLight: 'rgba(255, 255, 255, 0.8)', // For glassmorphism
  text: '#111827',
  textMuted: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  border: '#E5E7EB',
  overlay: 'rgba(0,0,0,0.4)', // Dark overlay
};

export const GRADIENTS = {
  primary: ['#059669', '#10B981'] as readonly [string, string, ...string[]],
  accent: ['#F59E0B', '#FBBF24'] as readonly [string, string, ...string[]],
  darkOverlay: ['transparent', 'rgba(0,0,0,0.8)'] as readonly [string, string, ...string[]],
};

// Citizen Backend (REST API)
export const API_URL = `http://${localIp}:8000`; 
// Worker Backend (Socket.IO for real-time tracking)
export const SOCKET_URL = `http://${localIp}:8001`; 
