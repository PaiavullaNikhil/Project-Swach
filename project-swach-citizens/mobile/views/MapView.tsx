import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, Geojson } from 'react-native-maps';
import { COLORS, API_URL } from '../constants/theme';

// Import ward borders
import wardData from '../assets/wards.json';

interface MapViewProps {
  complaints: any[];
  loading: boolean;
  onSelectComplaint: (complaint: any) => void;
}

export default function MapScreen({ complaints, loading, onSelectComplaint }: MapViewProps) {
  const [wardHealth, setWardHealth] = useState<Record<string, number>>({});

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
    if (activeCount >= 5) return 'rgba(239, 68, 68, 0.7)'; // Red
    if (activeCount >= 3) return 'rgba(249, 115, 22, 0.6)'; // Orange
    if (activeCount >= 2) return 'rgba(245, 158, 11, 0.5)'; // Yellow
    if (activeCount >= 1) return 'rgba(16, 185, 129, 0.4)'; // Light Green
    return 'rgba(16, 185, 129, 0.1)'; // Transparent Green
  };

  const geoData = (wardData as any).features ? (wardData as any) : ((wardData as any).default || {});

  if (!geoData || !geoData.features) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </View>
    );
  }

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
        <Geojson
          geojson={geoData}
          strokeColor={COLORS.primary + '30'}
          fillColor="rgba(16, 185, 129, 0.05)"
          strokeWidth={0.5}
        />

        {geoData.features
          .filter((f: any) => {
            const name = f.properties?.name_en;
            return name && (wardHealth[name] || 0) > 0;
          })
          .map((feature: any, index: number) => {
            const wardName = feature.properties?.name_en;
            return (
              <Geojson
                key={`hotspot-${wardName}-${index}`}
                geojson={{
                  type: "FeatureCollection",
                  features: [feature]
                }}
                strokeColor={COLORS.error + '40'}
                fillColor={getWardColor(wardName)}
                strokeWidth={1}
              />
            );
          })}
      </MapView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]} />
          <Text style={styles.legendText}>Critical Volume (5+)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(249, 115, 22, 0.8)' }]} />
          <Text style={styles.legendText}>High Activity (3+)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(245, 158, 11, 0.8)' }]} />
          <Text style={styles.legendText}>Moderate (1-2)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]} />
          <Text style={styles.legendText}>Stable (0)</Text>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20 },
  callout: { padding: 8, width: 150 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutText: { fontSize: 12, color: COLORS.textMuted },
  legend: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
});
