import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Dimensions, Animated } from 'react-native';
import { ThumbsUp, MapPin, Clock, TrendingUp, ChevronRight } from 'lucide-react-native';
import { COLORS, GRADIENTS, API_URL } from '../constants/theme';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface FeedItemProps {
    item: any;
    userHash: string | null;
    onSelect: (item: any) => void;
    onUpvoteSuccess: (id: string, newUpvotes: number) => void;
}

const FeedItem = ({ item, userHash, onSelect, onUpvoteSuccess }: FeedItemProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isCleared = item.status === 'Cleared';

    const handleUpvote = async () => {
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true, tension: 100, friction: 3 }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 3 })
        ]).start();

        try {
            const payload = userHash ? `user_hash=${encodeURIComponent(userHash)}` : '';
            const response = await axios.post(`${API_URL}/upvote/${item._id}`, payload, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            onUpvoteSuccess(item._id, response.data.upvotes);
        } catch (err: any) {
            if (err.response?.status === 403) {
                Alert.alert('Action Denied', 'You cannot upvote your own report.');
            } else {
                Alert.alert('Error', 'Could not process upvote. Check your connection.');
            }
        }
    };

    return (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.95} 
            onPress={() => onSelect(item)}
        >
            <View style={styles.imageContainer}>
                {isCleared && item.after_photo_url ? (
                    <View style={styles.beforeAfterContainer}>
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: item.photo_url }} style={styles.splitImage} />
                            <BlurView intensity={40} tint="dark" style={styles.imageOverlayBadge}>
                                <Text style={styles.overlayText}>BEFORE</Text>
                            </BlurView>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: item.after_photo_url }} style={styles.splitImage} />
                            <LinearGradient colors={GRADIENTS.primary} style={styles.imageOverlayBadge}>
                                <Text style={styles.overlayText}>AFTER</Text>
                            </LinearGradient>
                        </View>
                    </View>
                ) : (
                    <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
                )}

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.imageGradient}
                />

                <View style={styles.floatingBadges}>
                    <BlurView intensity={90} tint={isCleared ? "light" : "dark"} style={[styles.statusBadge, { overflow: 'hidden' }]}>
                        <View style={[styles.statusDot, { backgroundColor: isCleared ? COLORS.primary : COLORS.accent }]} />
                        <Text style={[styles.statusText, { color: isCleared ? COLORS.primary : '#fff' }]}>{item.status}</Text>
                    </BlurView>
                </View>
                
                <View style={styles.categoryBadgeContainer}>
                    <BlurView intensity={60} tint="dark" style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                    </BlurView>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.mainInfo}>
                    <Text style={styles.wardTitle} numberOfLines={1}>{item.ward || 'Bangalore Ward'}</Text>
                    <View style={styles.locationRow}>
                        <MapPin size={14} color={COLORS.primary} />
                        <Text style={styles.mlaName} numberOfLines={1}>MLA: {item.mla || 'Local Representative'}</Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.timeContainer}>
                        <Clock size={12} color={COLORS.textMuted} />
                        <Text style={styles.timeText}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </Text>
                    </View>
                    {item.upvotes > 5 && (
                        <View style={styles.trendingBadge}>
                            <TrendingUp size={12} color={COLORS.accent} />
                            <Text style={styles.trendingText}>TRENDING</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={handleUpvote}
                    >
                        <Animated.View style={[styles.upvoteContainer, { transform: [{ scale: scaleAnim }] }]}>
                            <LinearGradient
                                colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                                style={styles.upvotePill}
                            >
                                <ThumbsUp size={18} color={COLORS.primary} strokeWidth={2.5} />
                                <Text style={styles.upvoteCount}>{item.upvotes}</Text>
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                    
                    <View style={styles.detailsCta}>
                        <Text style={styles.ctaText}>Track Status</Text>
                        <ChevronRight size={16} color={COLORS.primary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

interface FeedViewProps {
  userHash: string | null;
  complaints: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectComplaint: (complaint: any) => void;
}

export default function FeedView({ userHash, complaints, loading, onRefresh, onSelectComplaint }: FeedViewProps) {
  const [localComplaints, setLocalComplaints] = useState<any[]>(complaints);

  useEffect(() => {
    setLocalComplaints(complaints);
  }, [complaints]);

  const updateUpvotes = (id: string, newUpvotes: number) => {
    setLocalComplaints(prev => prev.map(c => 
      c._id === id ? { ...c, upvotes: newUpvotes } : c
    ));
  };

  return (
    <View style={styles.container}>
      {!loading && localComplaints.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>No Reports Found</Text>
          <Text style={styles.emptyText}>Pull down to refresh or check your connection.</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={onRefresh}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.retryBtn}>
              <Text style={styles.retryText}>Refresh Feed</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={localComplaints}
        ListHeaderComponent={() => (
            <View style={styles.feedHeader}>
                <Text style={styles.feedTitle}>Community Activity</Text>
                <Text style={styles.feedSubtitle}>Working together for a cleaner Bangalore</Text>
            </View>
        )}
        renderItem={({ item }) => (
            <FeedItem 
                item={item} 
                userHash={userHash} 
                onSelect={onSelectComplaint} 
                onUpvoteSuccess={updateUpvotes} 
            />
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 100 },
  feedHeader: { marginBottom: 24, paddingLeft: 4, paddingTop: 8 },
  feedTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  feedSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  imageContainer: {
    position: 'relative',
    height: 230,
    width: '100%',
  },
  cardImage: { width: '100%', height: '100%' },
  beforeAfterContainer: { flexDirection: 'row', width: '100%', height: '100%' },
  imageWrapper: { flex: 1, position: 'relative' },
  splitImage: { width: '100%', height: '100%' },
  divider: { width: 3, backgroundColor: '#fff', zIndex: 10 },
  imageOverlayBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  overlayText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  imageGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
  },
  floatingBadges: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  categoryBadgeContainer: { position: 'absolute', bottom: 16, right: 16 },
  categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardContent: { padding: 20 },
  mainInfo: { marginBottom: 12 },
  wardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4, letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  mlaName: { marginLeft: 6, color: COLORS.textMuted, fontSize: 13, fontWeight: '500', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  timeText: { marginLeft: 6, color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentGlow, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  trendingText: { marginLeft: 6, color: COLORS.accent, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.05)' 
  },
  upvoteContainer: { overflow: 'hidden', borderRadius: 20 },
  upvotePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
  upvoteCount: { marginLeft: 10, color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  detailsCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '10', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  ctaText: { color: COLORS.primary, fontWeight: '600', fontSize: 13, marginRight: 4 },
  empty: { marginTop: 120, alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  retryBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
