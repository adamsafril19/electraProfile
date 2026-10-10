import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ChatWidget } from '../components/ChatWidget';

export default function RootLayout() {
  const pathname = usePathname();

  // Area admin punya layout sendiri (sidebar + scroll sendiri), tanpa Navbar/Footer/ChatWidget situs publik
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Slot />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Navbar />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.contentContainer}>
        <Slot />
        <Footer />
      </ScrollView>
      <ChatWidget />
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
