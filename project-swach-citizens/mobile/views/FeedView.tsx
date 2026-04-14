import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { ThumbsUp, MapPin, Clock, TrendingUp } from 'lucide-react-native';
import { COLORS, API_URL } from '../constants/theme';
import axios from 'axios';

interface FeedViewProps {
  userHash: string | null;
  complaints: any[];
  loading: boolean;
  onRefresh: () => void;
}

export default function FeedView({ userHash, complaints, loading, onRefresh }: FeedViewProps) {
  const [localComplaints, setLocalComplaints] = useState<any[]>(complaints);
  const [error, setError] = useState<string | null>(null);

  // Sync local complaints when prop changes
  useEffect(() => {
    setLocalComplaints(complaints);
  }, [complaints]);

  const upvote = async (id: string) => {
    try {
      const formData = new FormData();
      if (userHash) formData.append('user_hash', userHash);

      const response = await axios.post(`${API_URL}/upvote/${id}`, formData);
      
      // Update local state for immediate feedback
      setLocalComplaints(prev => prev.map(c => 
        c._id === id ? { ...c, upvotes: response.data.upvotes } : c
      ));
    } catch (err: any) {
      if (err.response?.status === 403) {
        Alert.alert('Action Denied', 'You cannot upvote your own report.');
      } else {
        console.error("Upvote error", err);
        Alert.alert('Error', 'Could not process upvote. Check your connection.');
      }
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.status === 'Cleared' && item.after_photo_url ? (
        <View style={styles.beforeAfterContainer}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.photo_url }} style={styles.splitImage} />
            <View style={styles.imageOverlay}><Text style={styles.overlayText}>BEFORE</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.after_photo_url }} style={styles.splitImage} />
            <View style={[styles.imageOverlay, { backgroundColor: COLORS.primary + '80' }]}><Text style={styles.overlayText}>AFTER</Text></View>
          </View>
        </View>
      ) : (
        <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
      )}

      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'Cleared' ? COLORS.primary + '20' : COLORS.error + '15' }]}>
            <Text style={[styles.statusText, { color: item.status === 'Cleared' ? COLORS.primary : COLORS.error }]}>{item.status}</Text>
          </View>
          <View style={styles.wardBadge}>
            <Text style={styles.wardText}>{item.ward || 'Unknown Ward'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <MapPin size={14} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.mla || 'Local Area'}</Text>
        </View>

        <View style={[styles.row, { marginTop: 4 }]}>
          <Clock size={14} color={COLORS.textMuted} />
          <Text style={styles.metaText}>
            {item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently Reported'}
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.upvoteBtn} onPress={() => upvote(item._id)}>
            <ThumbsUp size={18} color={COLORS.primary} />
            <Text style={styles.upvoteCount}>{item.upvotes}</Text>
          </TouchableOpacity>
          
          {item.upvotes > 5 && (
            <View style={styles.trendingBadge}>
              <TrendingUp size={14} color={COLORS.accent} />
              <Text style={styles.trendingText}>Trending</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Show local error if fetching failed */}
      {!loading && localComplaints.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>No Reports Found</Text>
          <Text style={styles.emptyText}>Pull down to refresh or check your connection.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={localComplaints}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />
      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: { width: '100%', height: 200 },
  beforeAfterContainer: { flexDirection: 'row', width: '100%', height: 200 },
  imageWrapper: { flex: 1, position: 'relative' },
  splitImage: { width: '100%', height: '100%' },
  divider: { width: 3, backgroundColor: '#fff', zIndex: 10 },
  imageOverlay: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  overlayText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statusBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  wardBadge: { backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  wardText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, color: COLORS.textMuted, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  upvoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  upvoteCount: { marginLeft: 8, color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  trendingBadge: { flexDirection: 'row', alignItems: 'center' },
  trendingText: { marginLeft: 4, color: COLORS.accent, fontWeight: '600', fontSize: 12 },
  empty: { marginTop: 100, alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20 },
});
