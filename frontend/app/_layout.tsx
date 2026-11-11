import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { LanguageProvider } from '../context/LanguageContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ChatWidget } from '../components/ChatWidget';

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'electra-editorial-fonts';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@120,400..700,50,1&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Area admin punya layout sendiri (sidebar + scroll sendiri), tanpa Navbar/Footer/ChatWidget situs publik
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <GluestackUIProvider config={config}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Slot />
        </View>
      </GluestackUIProvider>
    );
  }

  return (
    <LanguageProvider>
      <GluestackUIProvider config={config}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Navbar />
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.contentContainer}>
          <Slot />
          <Footer />
        </ScrollView>
        <ChatWidget />
      </View>
    </GluestackUIProvider>
    </LanguageProvider>
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
