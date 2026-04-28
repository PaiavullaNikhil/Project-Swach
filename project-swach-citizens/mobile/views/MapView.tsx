import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import MapView, { Geojson } from 'react-native-maps';
import { COLORS } from '../constants/theme';
import { getMLAName } from '../constants/mlas';

// Import ward borders
import wardData from '../assets/wards.json';

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
    if (activeCount >= 6) return 'rgba(239, 68, 68, 0.7)'; // High Load (6+) - Red
    if (activeCount >= 3) return 'rgba(249, 115, 22, 0.6)'; // Warning (3-5) - Orange
    if (activeCount >= 1) return 'rgba(234, 179, 8, 0.5)'; // Low Load (1-2) - Yellow
    return 'rgba(34, 197, 94, 0.3)'; // Healthy (0) - Green
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
          strokeColor={COLORS.primary + '30'}
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

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]} />
          <Text style={styles.legendText}>High Load (6+)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(249, 115, 22, 0.8)' }]} />
          <Text style={styles.legendText}>Warning (3-5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(234, 179, 8, 0.8)' }]} />
          <Text style={styles.legendText}>Low Load (1-2)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(34, 197, 94, 0.8)' }]} />
          <Text style={styles.legendText}>Healthy (0)</Text>
        </View>
      </View>

      {selectedWard && (
        <View style={styles.mlaCard}>
          <View style={styles.mlaHeader}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedWard.mlaName)}&background=10b981&color=fff&rounded=true&size=128` }} 
              style={styles.mlaImage} 
            />
            <View style={styles.mlaInfo}>
              <Text style={styles.mlaName}>MLA : {selectedWard.mlaName}</Text>
              <Text style={styles.mlaRole}> {selectedWard.constituency} • {selectedWard.name} (Ward {selectedWard.id})</Text>
            </View>
          </View>
          <View style={styles.mlaStats}>
            <Text style={styles.mlaStatsText}>Active Issues: <Text style={{ fontWeight: 'bold' }}>{selectedWard.count}</Text></Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedWard(null)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  mlaCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mlaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mlaImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  mlaInfo: {
    flex: 1,
  },
  mlaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  mlaRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mlaStats: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  mlaStatsText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
});
