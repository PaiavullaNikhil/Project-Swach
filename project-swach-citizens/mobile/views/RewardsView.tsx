import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Gift, CheckCircle, Ticket } from 'lucide-react-native';
import { COLORS, API_URL } from '../constants/theme';

interface Voucher {
  _id: string;
  title: string;
  description: string;
  cost: int;
}

interface RewardsViewProps {
  userHash: string | null;
  balance: number;
  setBalance: (newBalance: number) => void;
}

export default function RewardsView({ userHash, balance, setBalance }: RewardsViewProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userHash) {
      fetchData();
    }
  }, [userHash]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const vouchersRes = await axios.get(`${API_URL}/vouchers`);
      setVouchers(vouchersRes.data);
    } catch (err) {
      console.error("Failed to fetch rewards data", err);
    } finally {
      setLoading(false);
    }
  };

  const redeemVoucher = async (voucherId: string, cost: number, title: string) => {
    if (balance < cost) {
      Alert.alert("Insufficient Balance", `You need ${cost} coins to redeem this voucher.`);
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Spend ${cost} coins to redeem ${title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Redeem", 
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('user_hash', userHash!);
              formData.append('voucher_id', voucherId);
              
              const res = await axios.post(`${API_URL}/vouchers/redeem`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              
              setBalance(res.data.new_balance);
              Alert.alert("Success!", `Voucher Code: ${res.data.voucher_code}\n\n${res.data.message}`);
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.detail || "Failed to redeem voucher");
            }
          }
        }
      ]
    );
  };

  const renderVoucher = ({ item }: { item: Voucher }) => (
    <View style={styles.voucherCard}>
      <View style={styles.voucherHeader}>
        <View style={styles.iconBox}>
          <Ticket color={COLORS.primary} size={24} />
        </View>
        <View style={styles.voucherInfo}>
          <Text style={styles.voucherTitle}>{item.title}</Text>
          <Text style={styles.voucherDesc}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.voucherFooter}>
        <Text style={styles.voucherCost}>{item.cost} Coins</Text>
        <TouchableOpacity 
          style={[styles.redeemBtn, balance < item.cost && styles.redeemBtnDisabled]} 
          onPress={() => redeemVoucher(item._id, item.cost, item.title)}
          disabled={balance < item.cost}
        >
          <Text style={styles.redeemBtnText}>Redeem</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Gift color="#fff" size={32} />
        <Text style={styles.balanceText}>{balance}</Text>
        <Text style={styles.balanceLabel}>Swachh Coins Available</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Rewards</Text>
      <FlatList
        data={vouchers}
        keyExtractor={(v) => v._id}
        renderItem={renderVoucher}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  balanceText: { fontSize: 48, fontWeight: '900', color: '#fff', marginTop: 10 },
  balanceLabel: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 15 },
  list: { paddingBottom: 100 },
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voucherHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  voucherInfo: { flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  voucherDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  voucherCost: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  redeemBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemBtnDisabled: { backgroundColor: COLORS.border },
  redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
