export interface UseFeaturesResult {
  hasFeature: (feature: string) => boolean;
  getVertical: () => string;
  getPlan: () => string;
  loading: boolean;
  isNetworkMarketing: () => boolean;
  isPro: () => boolean;
  settings: any;
  refresh: () => Promise<void> | void;
}

export function useFeatures(): UseFeaturesResult;

export default useFeatures;

