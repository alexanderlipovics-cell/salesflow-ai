/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - Expo App Configuration                                   ║
 * ║  Dynamische Konfiguration für lokale Entwicklung und Production           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

export default {
  expo: {
    name: "Sales Flow AI",
    slug: "salesflow-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1a1a2e"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.salesflow.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a2e"
      },
      package: "com.salesflow.app"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // EAS Build
      eas: {
        projectId: "aura-os-app"
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // API Configuration
      // ═══════════════════════════════════════════════════════════════════════
      
      // LOKALE ENTWICKLUNG:
      // - Für Expo auf physischem Gerät: Nutze deine lokale IP
      // - Für Simulator/Emulator: localhost oder 10.0.2.2 (Android)
      
      // Lokale IP im Netzwerk (anpassen!)
      apiUrl: "http://10.0.0.24:8001/api/v1",
      
      // Supabase
      supabaseUrl: "https://lncwvbhcafkdorypnpnz.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3d2YmhjYWZrZG9yeXBucG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTk5MDAsImV4cCI6MjA3OTc3NTkwMH0.6sXqb76w5DXBRz1O4DREbGNNIOVPPynlv6YoixQcMBY",
      
      // Environment
      environment: "development",
    },
    plugins: [
      "expo-localization"
    ]
  }
};

