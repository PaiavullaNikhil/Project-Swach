import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { MapPin, Clock, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface TasksViewProps {
  tasks: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTask: (task: any) => void;
}

export default function TasksView({ tasks, loading, onRefresh, onSelectTask }: TasksViewProps) {
  
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => onSelectTask(item)}>
      <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.ward}>{item.ward || 'Unknown Ward'}</Text>
          <View style={[styles.badge, { backgroundColor: item.worker_status ? COLORS.accent + '20' : COLORS.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: item.worker_status ? COLORS.accent : COLORS.primary }]}>
                {item.worker_status || 'Open'}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <MapPin size={14} color={COLORS.textMuted} />
          <Text style={styles.metaTitle}>{item.mla || 'Local Area'}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.row}>
            <Clock size={14} color={COLORS.textMuted} />
            <Text style={styles.metaTitle}>
              {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          </View>
          <View style={styles.priorityBox}>
              <Text style={styles.priorityBoxText}>{item.upvotes} Upvotes</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
             <View style={styles.empty}>
               <Text style={styles.emptyText}>No open tasks right now!</Text>
             </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 16,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },
  cardImage: { width: '100%', height: 140 },
  content: { padding: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ward: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  metaTitle: { marginLeft: 6, color: COLORS.textMuted, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  priorityBox: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priorityBoxText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 16 }
});
