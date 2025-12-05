import * as Location from 'expo-location';
import { apiClient } from '../api/client';

export interface NearbyContact {
  id: string;
  full_name: string;
  status: string;
  distance_km: number;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export class LocationService {
  static async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  static async getCurrentLocation(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  }

  static async getAddressFromCoordinates(lat: number, lon: number) {
    return Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
  }

  static async getNearbyContacts(
    workspaceId: string,
    radiusKm = 10,
  ): Promise<NearbyContact[]> {
    const location = await this.getCurrentLocation();
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const response = await apiClient<{ contacts: NearbyContact[] }>(
      `/api/contacts/nearby?workspace_id=${workspaceId}&lat=${lat}&lon=${lon}&radius=${radiusKm}`,
    );
    return response.contacts ?? [];
  }

  static async checkIn(
    workspaceId: string,
    contactId?: string,
    notes?: string,
  ): Promise<void> {
    const location = await this.getCurrentLocation();
    const addresses = await this.getAddressFromCoordinates(
      location.coords.latitude,
      location.coords.longitude,
    );
    const formattedAddress = addresses[0]?.formattedAddress ?? null;

    await apiClient('/api/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        contact_id: contactId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress,
        notes,
      }),
    });
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}


