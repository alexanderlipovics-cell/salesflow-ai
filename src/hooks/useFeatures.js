import { useEffect, useMemo, useState } from 'react';
import { VERTICALS, PLANS } from '../config/features';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';

export const useFeatures = () => {
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/settings/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
      }
    } catch (err) {
      console.error('Feature-Flags laden fehlgeschlagen', err);
    } finally {
      setLoading(false);
    }
  };

  const getVertical = () => userSettings?.vertical || 'general';
  const getPlan = () => userSettings?.plan || 'free';

  const allowedFeatures = useMemo(() => {
    const verticalId = getVertical();
    const planId = getPlan();

    const verticalFeatures =
      VERTICALS[verticalId]?.features || VERTICALS.general.features;
    const planFeatures = PLANS[planId]?.features ?? [];

    if (planFeatures === 'all') return 'all';

    const featureSet = new Set(verticalFeatures);
    if (Array.isArray(planFeatures)) {
      planFeatures.forEach((f) => featureSet.add(f));
    }

    // Manuell freigeschaltete Features
    if (Array.isArray(userSettings?.features_enabled)) {
      userSettings.features_enabled.forEach((f) => featureSet.add(f));
    }

    return Array.from(featureSet);
  }, [userSettings]);

  const hasFeature = (featureName) => {
    if (!userSettings && loading) return true; // optimistisch während des Ladens
    if (!featureName) return true;
    if (allowedFeatures === 'all') return true;
    return Array.isArray(allowedFeatures) && allowedFeatures.includes(featureName);
  };

  return {
    hasFeature,
    getVertical,
    getPlan,
    loading,
    isNetworkMarketing: () => getVertical() === 'network_marketing',
    isPro: () => ['pro', 'business'].includes(getPlan()),
    settings: userSettings,
    refresh: fetchSettings,
  };
};

export default useFeatures;

