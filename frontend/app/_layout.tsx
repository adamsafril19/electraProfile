import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Navbar />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.contentContainer}>
        <Slot />
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
