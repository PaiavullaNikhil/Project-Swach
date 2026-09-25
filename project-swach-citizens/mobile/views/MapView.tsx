import { MapPin, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getMLAName } from '../constants/mlas';
import { COLORS } from '../constants/theme';

// Import ward borders
import wardData from '../assets/wards.json';

const { width, height } = Dimensions.get('window');

interface MapViewProps {
  complaints: any[];
  loading: boolean;
  onSelectComplaint: (complaint: any) => void;
}

export default function MapScreen({ complaints, loading }: MapViewProps) {
  const [wardHealth, setWardHealth] = useState<Record<string, number>>({});
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);

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

  const geoData = (wardData as any).features ? (wardData as any) : ((wardData as any).default || {});

  if (!geoData || !geoData.features) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </View>
    );
  }

  // Build the Leaflet HTML
  const getMapHTML = () => {
    const wardHealthJSON = JSON.stringify(wardHealth);
    const geoDataJSON = JSON.stringify(geoData);

    // Build MLA lookup from features
    const mlaLookup: Record<string, any> = {};
    geoData.features.forEach((feature: any) => {
      const wardName = feature.properties?.name_en;
      const constituency = feature.properties?.assembly_constituency_name_en;
      const cleanConst = constituency ? constituency.replace(/^\d+-/, '').trim() : 'Unknown';
      const mlaName = getMLAName(constituency);
      mlaLookup[wardName] = {
        name: wardName,
        id: feature.properties?.id,
        constituency: cleanConst,
        mlaName: mlaName,
        count: wardHealth[wardName] || 0
      };
    });
    const mlaLookupJSON = JSON.stringify(mlaLookup);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var wardHealth = ${wardHealthJSON};
    var geoData = ${geoDataJSON};
    var mlaLookup = ${mlaLookupJSON};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([12.9716, 77.5946], 12);

L.tileLayer(
  'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_3xeq_1_7f10cf4f6c133c29c3654058',
  {
    maxZoom: 19
  }
).addTo(map);

    function getWardColor(wardName) {
      var count = wardHealth[wardName] || 0;
      if (count >= 6) return 'rgba(239, 68, 68, 0.6)';
      if (count >= 3) return 'rgba(249, 115, 22, 0.5)';
      if (count >= 1) return 'rgba(234, 179, 8, 0.4)';
      return 'rgba(16, 185, 129, 0.2)';
    }

    L.geoJSON(geoData, {
      style: function(feature) {
        var wardName = feature.properties && feature.properties.name_en;
        return {
          fillColor: getWardColor(wardName),
          fillOpacity: 0.7,
          color: 'rgba(16, 185, 129, 0.5)',
          weight: 1
        };
      },
      onEachFeature: function(feature, layer) {
        layer.on('click', function() {
          var wardName = feature.properties && feature.properties.name_en;
          var info = mlaLookup[wardName] || { name: wardName, id: '', constituency: 'Unknown', mlaName: 'Unknown', count: 0 };
          window.ReactNativeWebView.postMessage(JSON.stringify(info));
        });
      }
    }).addTo(map);
  </script>
</body>
</html>`;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedWard(data);
    } catch (e) {
      console.log('Map message parse error', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: getMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>WARD HEALTH</Text>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Critical <Text style={styles.legendRange}>(6+)</Text></Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Moderate <Text style={styles.legendRange}>(3-5)</Text></Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
          <Text style={styles.legendText}>Low <Text style={styles.legendRange}>(1-2)</Text></Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Healthy <Text style={styles.legendRange}>(0)</Text></Text>
        </View>
      </View>

      {selectedWard && (
        <View style={styles.mlaCardContainer}>
          <View style={styles.mlaCard}>
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
                  <MapPin size={10} color={'#64748b'} />
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
                <Text style={[styles.statValue, { color: selectedWard.count > 5 ? '#ef4444' : '#10b981' }]}>
                  {selectedWard.count} Reports
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  map: { flex: 1 },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20 },
  legend: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  legendTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  legendRange: { fontWeight: '400', color: '#64748b', fontSize: 11 },
  mlaCardContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  mlaCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  },
  mlaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: { position: 'relative' },
  mlaImage: { width: 64, height: 64, borderRadius: 20, marginRight: 16 },
  activeIndicator: { position: 'absolute', bottom: 0, right: 16, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff' },
  mlaInfo: { flex: 1 },
  mlaLabel: { fontSize: 10, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  mlaName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  constituencyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  mlaRole: { fontSize: 12, color: '#64748b', fontWeight: '500', marginLeft: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  mlaStats: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)', height: '60%', alignSelf: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
});
