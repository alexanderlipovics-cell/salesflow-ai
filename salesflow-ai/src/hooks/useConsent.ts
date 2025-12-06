// src/hooks/useConsent.ts

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext"; // falls vorhanden

const STORAGE_KEY = "cookie_consent";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export function useConsent() {
  const { session } = useAuth();
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const local = await AsyncStorage.getItem(STORAGE_KEY);
        if (local) {
          setConsent(JSON.parse(local));
        }
      } catch (e) {
        console.error("Failed to load local consent", e);
      } finally {
        setInitialized(true);
      }
    };
    void init();
  }, []);

  const saveConsent = useCallback(
    async (data: Record<string, boolean>) => {
      setConsent(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      if (!session?.accessToken) return;

      try {
        await fetch(`${API_URL}/consent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ categories: data }),
        });
      } catch (e) {
        console.error("Failed to sync consent with backend", e);
      }
    },
    [session?.accessToken]
  );

  const refreshFromBackend = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/consent`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.categories) {
        setConsent(json.categories);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(json.categories));
      }
    } catch (e) {
      console.error("Failed to load consent from backend", e);
    }
  }, [session?.accessToken]);

  return {
    consent,
    loading,
    initialized,
    saveConsent,
    refreshFromBackend,
  };
}
