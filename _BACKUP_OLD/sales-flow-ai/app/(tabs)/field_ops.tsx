import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { LocationService, NearbyContact } from '../../services/locationService';
import { useSalesFlow } from '../../context/SalesFlowContext';

export default function FieldOpsScreen() {
  const { profileData } = useSalesFlow();
  const workspaceId = profileData?.workspace_id ?? 'demo-workspace';

  const [region, setRegion] = useState<Region | null>(null);
  const [nearbyContacts, setNearbyContacts] = useState<NearbyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        const granted = await LocationService.requestPermissions();
        if (!granted) {
          Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Standortzugriff für Field Ops.');
          setLoading(false);
          return;
        }

        const location = await LocationService.getCurrentLocation();
        if (!isMounted) return;
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });

        const contacts = await LocationService.getNearbyContacts(workspaceId, 15);
        if (!isMounted) return;
        setNearbyContacts(contacts);
      } catch (error) {
        console.error('[FieldOps] init failed', error);
        Alert.alert('Fehler', 'Standorte konnten nicht geladen werden.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleCheckIn = async (contactId?: string) => {
    try {
      setCheckingId(contactId ?? 'self');
      await LocationService.checkIn(workspaceId, contactId);
      Alert.alert('Erfolg', contactId ? 'Check-in gespeichert!' : 'Standort gespeichert!');
    } catch (error) {
      console.error('[FieldOps] check-in failed', error);
      Alert.alert('Fehler', 'Check-in konnte nicht gespeichert werden.');
    } finally {
      setCheckingId(null);
    }
  };

  const renderContact = ({ item }: { item: NearbyContact }) => (
    <View style={styles.contactCard}>
      <View>
        <Text style={styles.contactName}>{item.full_name}</Text>
        <Text style={styles.contactMeta}>
          {item.status ?? 'unbekannt'} • {item.distance_km?.toFixed(1)} km
        </Text>
        {item.address && <Text style={styles.contactAddress}>{item.address}</Text>}
      </View>
      <TouchableOpacity
        style={styles.checkInButton}
        onPress={() => handleCheckIn(item.id)}
        disabled={checkingId !== null}
      >
        <Text style={styles.checkInText}>
          {checkingId === item.id ? 'Checkt ein...' : 'Check-in'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton
          >
            {nearbyContacts.map(contact => (
              <Marker
                key={contact.id}
                coordinate={{
                  latitude: contact.latitude,
                  longitude: contact.longitude,
                }}
                title={contact.full_name}
                description={`${contact.status} • ${contact.distance_km?.toFixed(1)}km`}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.mapFallbackText}>Standort wird geladen...</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Nearby Kontakte</Text>
          <TouchableOpacity
            style={styles.selfCheckIn}
            onPress={() => handleCheckIn()}
            disabled={checkingId !== null}
          >
            <MapPin color="#22c55e" size={16} />
            <Text style={styles.selfCheckInText}>
              {checkingId === 'self' ? 'speichert...' : 'Self Check-in'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#38bdf8" />
        ) : nearbyContacts.length === 0 ? (
          <Text style={styles.empty}>Keine Kontakte in deiner Nähe.</Text>
        ) : (
          <FlatList
            data={nearbyContacts}
            keyExtractor={item => item.id}
            renderItem={renderContact}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1.2,
    backgroundColor: '#0f172a',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackText: {
    color: '#94a3b8',
    marginTop: 8,
  },
  panel: {
    flex: 1,
    padding: 16,
    backgroundColor: '#020617',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  selfCheckIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#022c22',
  },
  selfCheckInText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  empty: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  contactCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  contactMeta: {
    color: '#94a3b8',
    marginTop: 2,
  },
  contactAddress: {
    color: '#cbd5f5',
    marginTop: 4,
    fontSize: 12,
  },
  checkInButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  checkInText: {
    color: '#fff',
    fontWeight: '600',
  },
});

