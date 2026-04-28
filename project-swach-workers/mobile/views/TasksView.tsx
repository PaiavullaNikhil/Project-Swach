import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Dimensions } from 'react-native';
import { MapPin, Clock, ArrowRight, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react-native';
import { COLORS, GRADIENTS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface TasksViewProps {
  tasks: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTask: (task: any) => void;
}

const TaskItem = ({ item, onSelect }: { item: any; onSelect: (item: any) => void }) => {
    const isAssigned = !!item.worker_id;
    const isCleared = item.status === 'Cleared';

    return (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.95} 
            onPress={() => onSelect(item)}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
                
                <LinearGradient
                    colors={GRADIENTS.darkOverlay}
                    style={styles.imageGradient}
                />

                <View style={styles.floatingBadges}>
                    <BlurView intensity={90} tint="dark" style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: isAssigned ? COLORS.primary : COLORS.accent }]} />
                        <Text style={[styles.statusText, { color: '#fff' }]}>
                            {item.worker_status || 'Unassigned'}
                        </Text>
                    </BlurView>
                </View>
                
                <View style={styles.wardBadgeContainer}>
                    <BlurView intensity={60} tint="dark" style={styles.wardBadge}>
                        <MapPin size={12} color="#fff" />
                        <Text style={styles.wardBadgeText}>{item.ward || 'Unknown'}</Text>
                    </BlurView>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.mainInfo}>
                    <Text style={styles.title} numberOfLines={1}>{item.ward || 'Cleanup Required'}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.timeContainer}>
                            <Clock size={12} color={COLORS.textMuted} />
                            <Text style={styles.timeText}>
                                {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </Text>
                        </View>
                        {item.upvotes > 3 && (
                            <View style={styles.priorityBadge}>
                                <TrendingUp size={12} color={COLORS.error} />
                                <Text style={styles.priorityText}>HIGH PRIORITY</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.upvoteSection}>
                        <LinearGradient
                            colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
                            style={styles.upvotePill}
                        >
                            <TrendingUp size={16} color={COLORS.primary} strokeWidth={2.5} />
                            <Text style={styles.upvoteCount}>{item.upvotes}</Text>
                        </LinearGradient>
                    </View>
                    
                    <View style={[styles.actionCta, { backgroundColor: isAssigned ? COLORS.success + '15' : COLORS.primary + '15' }]}>
                        <Text style={[styles.ctaText, { color: isAssigned ? COLORS.success : COLORS.primary }]}>
                            {isAssigned ? 'NAVIGATE' : 'CLAIM'}
                        </Text>
                        <ChevronRight size={16} color={isAssigned ? COLORS.success : COLORS.primary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function TasksView({ tasks, loading, onRefresh, onSelectTask }: TasksViewProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        ListHeaderComponent={() => (
            <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>Available Tasks</Text>
                <Text style={styles.headerSubtitle}>Manage and track your assigned cleanups</Text>
            </View>
        )}
        renderItem={({ item }) => <TaskItem item={item} onSelect={onSelectTask} />}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading ? (
             <View style={styles.empty}>
               <Text style={styles.emptyEmoji}>🎉</Text>
               <Text style={styles.emptyText}>All clear! No open tasks right now.</Text>
             </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 100 },
  headerSection: { marginBottom: 24, paddingLeft: 4, paddingTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '400', marginTop: 4 },
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
    height: 200,
    width: '100%',
  },
  cardImage: { width: '100%', height: '100%' },
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
    overflow: 'hidden',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  wardBadgeContainer: { position: 'absolute', bottom: 16, left: 16 },
  wardBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6
  },
  wardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardContent: { padding: 20 },
  mainInfo: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  timeText: { marginLeft: 6, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  priorityText: { marginLeft: 6, color: COLORS.error, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.05)' 
  },
  upvoteSection: { overflow: 'hidden', borderRadius: 20 },
  upvotePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  upvoteCount: { marginLeft: 8, color: COLORS.primary, fontWeight: '800', fontSize: 16 },
  actionCta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  ctaText: { fontWeight: '800', fontSize: 13, marginRight: 4, letterSpacing: 1 },
  empty: { padding: 80, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, textAlign: 'center', fontWeight: '500' }
});
