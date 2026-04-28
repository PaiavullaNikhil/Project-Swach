import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Geojson } from 'react-native-maps';
import { COLORS, GRADIENTS } from '../constants/theme';
import { getMLAName } from '../constants/mlas';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MapPin, Users } from 'lucide-react-native';

// Import ward borders
import wardData from '../assets/wards.json';

const { width } = Dimensions.get('window');

interface MapViewProps {
  complaints: any[];
  loading: boolean;
  onSelectComplaint: (complaint: any) => void;
}

export default function MapScreen({ complaints, loading }: MapViewProps) {
  const [wardHealth, setWardHealth] = useState<Record<string, number>>({});
  const [selectedWard, setSelectedWard] = useState<any>(null);

  useEffect(() => {
    if (!complaints) return;

    const counts: Record<string, number> = {};
    complaints.forEach((c: any) => {
      if (c && c.ward && c.status !== 'Cleared') {
        const cleanName = c.ward.split('(')[0].trim();
        counts[cleanName] = (counts[cleanName] || 0) + 1;
      }
    });
    setWardHealth(counts);
  }, [complaints]);

  const getWardColor = (wardName: string) => {
    const activeCount = wardHealth[wardName] || 0;
    if (activeCount >= 6) return 'rgba(239, 68, 68, 0.6)'; // High Load (6+) - Red
    if (activeCount >= 3) return 'rgba(249, 115, 22, 0.5)'; // Warning (3-5) - Orange
    if (activeCount >= 1) return 'rgba(234, 179, 8, 0.4)'; // Low Load (1-2) - Yellow
    return 'rgba(16, 185, 129, 0.2)'; // Healthy (0) - Green
  };

  const geoData = (wardData as any).features ? (wardData as any) : ((wardData as any).default || {});

  if (!geoData || !geoData.features) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </View>
    );
  }

  const memoizedWards = React.useMemo(() => {
    return geoData.features.map((feature: any, index: number) => {
      const wardName = feature.properties?.name_en;
      const constituency = feature.properties?.assembly_constituency_name_en;
      const cleanConst = constituency ? constituency.replace(/^\d+-/, '').trim() : 'Unknown';
      const mlaName = getMLAName(constituency);
      
      return (
        <Geojson
          key={`ward-${wardName}-${index}`}
          geojson={{
            type: "FeatureCollection",
            features: [feature]
          }}
          strokeColor={COLORS.primary + '20'}
          fillColor={getWardColor(wardName)}
          strokeWidth={1}
          tappable={true}
          onPress={() => setSelectedWard({
            name: wardName,
            id: feature.properties?.id,
            constituency: cleanConst,
            mlaName: mlaName,
            count: wardHealth[wardName] || 0
          })}
        />
      );
    });
  }, [geoData, wardHealth]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: 12.9716,
          longitude: 77.5946,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        {memoizedWards}
      </MapView>

      <BlurView intensity={80} tint="light" style={styles.legend}>
        <Text style={styles.legendTitle}>WARD HEALTH</Text>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Critical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Healthy</Text>
        </View>
      </BlurView>

      {selectedWard && (
        <View style={styles.mlaCardContainer}>
          <BlurView intensity={90} tint="light" style={styles.mlaCard}>
            <View style={styles.mlaHeader}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedWard.mlaName)}&background=059669&color=fff&rounded=true&size=128&bold=true` }} 
                  style={styles.mlaImage} 
                />
                <View style={styles.activeIndicator} />
              </View>
              <View style={styles.mlaInfo}>
                <Text style={styles.mlaLabel}>Constituency Representative</Text>
                <Text style={styles.mlaName}>{selectedWard.mlaName}</Text>
                <View style={styles.constituencyRow}>
                  <MapPin size={10} color={COLORS.textMuted} />
                  <Text style={styles.mlaRole}>{selectedWard.constituency} • Ward {selectedWard.id}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedWard(null)}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.mlaStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ward Name</Text>
                <Text style={styles.statValue}>{selectedWard.name}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Active Issues</Text>
                <Text style={[styles.statValue, { color: selectedWard.count > 5 ? COLORS.error : COLORS.primary }]}>
                  {selectedWard.count} Reports
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBtn}>
                <Users color="#fff" size={18} />
                <Text style={styles.actionBtnText}>Connect with Ward Office</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20 },
  legend: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  legendTitle: { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, marginBottom: 10, letterSpacing: 1, textAlign: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendText: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  mlaCardContainer: {
    position: 'absolute',
    bottom: 100, // Above floating nav
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  mlaCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  mlaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarWrapper: { position: 'relative' },
  mlaImage: { width: 56, height: 56, borderRadius: 20, marginRight: 15 },
  activeIndicator: { position: 'absolute', bottom: 0, right: 15, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  mlaInfo: { flex: 1 },
  mlaLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  mlaName: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  constituencyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  mlaRole: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginLeft: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  mlaStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)', height: '100%' },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  actionButton: { width: '100%' },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    gap: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
