import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS, GRADIENTS } from '../constants/theme';
import { ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WelcomeViewProps {
  onGetStarted: () => void;
}

export default function WelcomeView({ onGetStarted }: WelcomeViewProps) {
  return (
    <View style={styles.container}>
      {/* Background ambient gradient */}
      <View style={styles.ambientGlow} />

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/swach_eco_city_illustration.png')} 
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Clean City,{"\n"}<Text style={styles.highlight}>Green Future.</Text></Text>
          <Text style={styles.subtitle}>
            Join the movement to keep Bangalore beautiful. Report waste issues and earn rewards for a cleaner neighborhood.
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onGetStarted} activeOpacity={0.8}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight color="#fff" size={24} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 24,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  ambientGlow: {
    position: 'absolute',
    top: -width * 0.5,
    right: -width * 0.5,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 50,
  },
  illustration: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 30,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -1,
  },
  highlight: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 26,
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
});
