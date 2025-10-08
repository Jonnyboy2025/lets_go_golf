import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import MapView, { Marker, Polygon, Polyline, LatLng } from 'react-native-maps'
// use dynamic import('expo-location') at runtime so the native module is optional during dev
import { db } from '@/firebaseConfig'
import { doc, setDoc, collection, getDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';

const HoleMapperScreen = () => {
  const { course_name, courseId, hole_number } = useLocalSearchParams()
  const [mode, setMode] = useState<'tee' | 'green' | 'fairway' | 'hazard'>('tee') // tee | green | fairway | hazard
  const [tee, setTee] = useState<LatLng | null>(null)
  const [green, setGreen] = useState<LatLng | null>(null)
  const [fairway, setFairway] = useState<LatLng[]>([])
  const fairwayRef = useRef<LatLng[]>([])
  const [hazards, setHazards] = useState<LatLng[][]>([]) // array of polygons
  const [currentHazard, setCurrentHazard] = useState<LatLng[]>([])
  const [lastUserLocation, setLastUserLocation] = useState<LatLng | null>(null);
  const courseName = course_name
  const holeNumber = hole_number
  const mapRegion = React.useMemo(() => ({
    latitude: 36.48391,
    longitude: -86.84069,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001,
  }), []);

  // Helper to fit the map to all available coordinates (tee, green, fairway, hazards)
  const fitMapToAll = (opts: { animated?: boolean } = { animated: true }) => {
    const coords: LatLng[] = [];
    if (tee) coords.push(tee);
    if (green) coords.push(green);
    if (fairway && fairway.length) coords.push(...fairway);
    if (hazards && hazards.length) {
      hazards.forEach(h => {
        if (Array.isArray(h)) coords.push(...h);
      })
    }

    if (coords.length > 0 && mapRef.current && typeof mapRef.current.fitToCoordinates === 'function') {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 80, bottom: 160, left: 80 }, animated: !!opts.animated });
      return true;
    }
    return false;
  }

  const zoomOut = (factor = 2) => {
    if (!mapRef.current) return;
    // try to get current camera region by refitting all and then expanding - use simple approach: animate by increasing deltas
    // if tee exists, zoom out centered on tee; otherwise reset to default mapRegion
    if (tee) {
      const region = {
        latitude: tee.latitude,
        longitude: tee.longitude,
        latitudeDelta: Math.max(0.001, 0.0004 * factor),
        longitudeDelta: Math.max(0.001, 0.0004 * factor),
      };
      if (typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(region, 400);
      return;
    }
    if (typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(mapRegion, 400);
  }

  const mapRef = useRef<MapView | null>(null)

  console.log('Hole Data:', courseId, courseName)
  const handleMapPress = (e: any) => {
    const coord = e.nativeEvent?.coordinate as LatLng;

    switch (mode) {
      case 'tee':
        setTee(coord);
        break;
      case 'green':
        setGreen(coord);
        break;
      case 'fairway':
  setFairway(prev => [...prev, coord]);
        break;
      case 'hazard':
        setCurrentHazard(prev => [...prev, coord]);
        break;
    }
  };

  const finishHazard = () => {
    if (currentHazard.length >= 3) {
      setHazards([...hazards, currentHazard]);
      setCurrentHazard([]);
    } else {
      Alert.alert('Add at least 3 points to define a hazard');
    }
  };

  // keep fairwayRef in sync so loadHoleData can read without being a dep
  useEffect(() => { fairwayRef.current = fairway }, [fairway])

  // Compute a region (center + deltas) that bounds given coordinates
  const computeRegionForCoordinates = (coords: LatLng[], paddingFactor = 1.2) => {
    if (!coords || coords.length === 0) return null;
    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLng = coords[0].longitude;
    let maxLng = coords[0].longitude;

    coords.forEach(c => {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLng) minLng = c.longitude;
      if (c.longitude > maxLng) maxLng = c.longitude;
    });

    const latDelta = Math.max(0.00005, (maxLat - minLat) * paddingFactor);
    const longitudeDelta = Math.max(0.00005, (maxLng - minLng) * paddingFactor);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: longitudeDelta,
    };
  }

  // small async delay helper (used to wait for fitToCoordinates animation to finish)
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  // Try to get the user's current location via expo-location if available at runtime.
  // Returns a LatLng or null if unavailable.
  const getUserLocation = async (): Promise<LatLng | null> => {
    try {
      let LocationModule: any = null;
      try {
        // dynamic import so bundler doesn't require native module at parse time
        LocationModule = await import('expo-location');
      } catch {
        LocationModule = null;
      }

      if (LocationModule && LocationModule.requestForegroundPermissionsAsync) {
        const { status } = await LocationModule.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Ask for a fresh, high-accuracy fix (avoid cached fused result)
          const loc = await LocationModule.getCurrentPositionAsync({
            accuracy: LocationModule.Accuracy?.Highest ?? LocationModule.Accuracy ?? 4,
            maximumAge: 0,
            timeout: 7000,
          });
          console.log('getUserLocation raw:', loc);
          if (loc && loc.coords) {
            return { latitude: loc.coords.latitude, longitude: loc.coords.longitude } as LatLng;
          }
        }
      }
    } catch (err) {
      console.error('getUserLocation error', err);
    }
    return null;
  }

  // Zoom more tightly to the hole. zoomMultiplier < 1 zooms in further (e.g. 0.6)
  const zoomToHole = useCallback((zoomMultiplier = 0.6) => {
    const coords: LatLng[] = [];
    if (tee) coords.push(tee);
    if (green) coords.push(green);
    if (fairway && fairway.length) coords.push(...fairway);
    if (hazards && hazards.length) {
      hazards.forEach(h => {
        if (Array.isArray(h)) coords.push(...h);
      })
    }

    if (coords.length === 0) return;

    const baseRegion = computeRegionForCoordinates(coords, 1.15);
    if (!baseRegion) return;

    // apply zoom multiplier to make deltas smaller (zoom in)
    const targetRegion = {
      ...baseRegion,
      latitudeDelta: Math.max(0.00002, baseRegion.latitudeDelta * zoomMultiplier),
      longitudeDelta: Math.max(0.00002, baseRegion.longitudeDelta * zoomMultiplier),
    };

    if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
      mapRef.current.animateToRegion(targetRegion, 500);
    } else if (mapRef.current && typeof mapRef.current.fitToCoordinates === 'function') {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 80, left: 40 }, animated: true })
    }
  }, [tee, green, fairway, hazards]);

  // (inlined zoom behavior is used after loading hole data)
  const loadHoleData = useCallback(async () => {
    if (!courseId || holeNumber === undefined) {
      console.warn('Missing courseId or holeNumber');
      return;
    }
  
    try {
      const holeRef = doc(
        db,
        'Courses',
        `${courseName}-${courseId}`,
        'Holes',
        `hole-${holeNumber}`
      );
  
      const docSnap = await getDoc(holeRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Loaded hole data:', data);

  setTee(data.tee || null);
  setGreen(data.green || null);
  setFairway(Array.isArray(data.fairway) ? data.fairway : []);
  setHazards(Array.isArray(data.hazards) ? data.hazards.map((h: any) => h.points || []) : []);

        // Fit map to loaded coordinates (tee, green, fairway, hazards)
        const coords: LatLng[] = [];
        if (data.tee && typeof data.tee.latitude === 'number') coords.push(data.tee as LatLng);
        if (data.green && typeof data.green.latitude === 'number') coords.push(data.green as LatLng);
        if (Array.isArray(data.fairway)) coords.push(...(data.fairway.filter((p: any) => typeof p.latitude === 'number') as LatLng[]));
        if (Array.isArray(data.hazards)) {
          data.hazards.forEach((h: any) => {
            if (Array.isArray(h.points)) coords.push(...(h.points.filter((p: any) => typeof p.latitude === 'number') as LatLng[]))
          })
        }

        if (coords.length > 0 && mapRef.current && typeof mapRef.current.fitToCoordinates === 'function') {
          // small padding so markers/polygons aren't at the very edge
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 80, bottom: 160, left: 80 },
            animated: true,
          });

          // If tee exists, zoom toward tee (soften the zoom so user can zoom in further)
          if (data.tee) {
            // wait for the fit animation to settle
            await delay(600);
            const t = data.tee as LatLng;
            const region = {
              latitude: t.latitude,
              longitude: t.longitude,
              latitudeDelta: 0.0004, // softer (less aggressive) zoom
              longitudeDelta: 0.0004,
            };
            if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
              mapRef.current.animateToRegion(region, 500);
            }
          } else {
            // no tee: attempt to zoom to user's current location if available
            await delay(600);
            const userLoc = await getUserLocation();
            if (userLoc) setLastUserLocation(userLoc);
            if (userLoc && mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
              const userRegion = {
                latitude: userLoc.latitude,
                longitude: userLoc.longitude,
                latitudeDelta: 0.0007,
                longitudeDelta: 0.0007,
              };
              mapRef.current.animateToRegion(userRegion, 500);
              return;
            }

            // fallback: if fairway points exist, center there with a reasonable delta
            if (Array.isArray(data.fairway) && data.fairway.length) {
              const p = data.fairway[0] as LatLng;
              const fallbackRegion = { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.001, longitudeDelta: 0.001 };
              if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(fallbackRegion, 500);
              return;
            }

            // final fallback: reset to default region
            if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(mapRegion, 500);
          }
        }
      } else {
        console.log('No existing hole data found.');
        // No hole doc — try to center on device location, with fallbacks
        await delay(600);
        const userLoc = await getUserLocation();
        console.log('getUserLocation result:', userLoc);
        if (userLoc && mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
          const userRegion = {
            latitude: userLoc.latitude,
            longitude: userLoc.longitude,
            latitudeDelta: 0.0007,
            longitudeDelta: 0.0007,
          };
          mapRef.current.animateToRegion(userRegion, 500);
          return;
        }

        // fallback: center on first fairway point from state if available
        if (Array.isArray(fairwayRef.current) && fairwayRef.current.length) {
          const p = fairwayRef.current[0] as LatLng;
          const fallbackRegion = { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.001, longitudeDelta: 0.001 };
          if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(fallbackRegion, 500);
          return;
        }

        // final fallback: reset to default region
        if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(mapRegion, 500);
      }
    } catch (error) {
      console.error('Error loading hole data:', error);
    }
  }, [courseId, courseName, holeNumber, mapRegion]);


  const exportHoleData = async () => {
  // Validate required fields and give a clearer message
  const missing: string[] = [];
  if (!tee) missing.push('tee');
  if (!green) missing.push('green');
  // a fairway polyline needs at least 2 points to be meaningful
  if (fairway.length < 2) missing.push(`fairway (need at least 2 points, have ${fairway.length})`);

  if (missing.length > 0) {
    Alert.alert('Missing data', `You must set: ${missing.join(', ')}`);
    return;
  }

  const holeData = {
    holeNumber: holeNumber,
    par: 4,
    tee,
    green,
    fairway,
    hazards: hazards.length > 0
      ? hazards.map((polygon) => ({ points: polygon }))
      : [],
    createdAt: new Date().toISOString(),
    courseName,
  };

  try {
    const holeRef = doc(
      collection(db, 'Courses', `${courseName}-${courseId}`, 'Holes'),
      `hole-${holeNumber}`
    );

    await setDoc(holeRef, holeData);

    Alert.alert('Success', 'Hole data saved to Firestore');
  } catch (error) {
    console.error('Error saving hole data:', error);
    Alert.alert('Error', 'Failed to save hole data.');
  }
}

  // Manually center map on user's device (or fallbacks) — wired to a UI button
  const centerOnMe = async () => {
    try {
      const userLoc = await getUserLocation();
      if (userLoc) {
        setLastUserLocation(userLoc);
        Alert.alert('Location', `Got location: ${userLoc.latitude.toFixed(6)}, ${userLoc.longitude.toFixed(6)}`);
      } else {
        Alert.alert('Location', 'Could not obtain location (null)');
      }
      if (userLoc && mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        const userRegion = {
          latitude: userLoc.latitude,
          longitude: userLoc.longitude,
          latitudeDelta: 0.0007,
          longitudeDelta: 0.0007,
        };
        mapRef.current.animateToRegion(userRegion, 500);
        return;
      }

      // fallback to first fairway point
      if (Array.isArray(fairwayRef.current) && fairwayRef.current.length) {
        const p = fairwayRef.current[0] as LatLng;
        const fallbackRegion = { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.001, longitudeDelta: 0.001 };
        if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(fallbackRegion, 500);
        return;
      }

      // final fallback
      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') mapRef.current.animateToRegion(mapRegion, 500);
    } catch (err) {
      console.error('centerOnMe error', err);
    }
  }
useEffect(() => {
  // Reload whenever the selected course/hole params change
  loadHoleData();
}, [loadHoleData]);

  

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        mapType="satellite"
        onPress={handleMapPress}
        initialRegion={mapRegion}
        ref={mapRef}
      >
        {tee && <Marker coordinate={tee} pinColor="green" title="Tee" />}
        {green && <Marker coordinate={green} pinColor="blue" title="Green" />}

        {fairway.length > 0 && (
          <Polyline
            coordinates={fairway}
            fillColor="rgba(0,255,0,0.4)"
            strokeColor="green"
          />
        )}

        {hazards.map((hazard, idx) => (
          <Polygon
            key={idx}
            coordinates={hazard}
            fillColor="rgba(255,0,0,0.4)"
            strokeColor="red"
          />
        ))}

        {currentHazard.length > 0 && (
          <Polygon
            coordinates={currentHazard}
            fillColor="rgba(255,165,0,0.3)"
            strokeColor="orange"
          />
        )}
        {/* Debug: show last user location returned by getUserLocation() */}
        {lastUserLocation && (
          <Marker
            coordinate={lastUserLocation}
            pinColor="cyan"
            title="You (debug)"
          />
        )}
      </MapView>

      {/* Control Panel */}
      <View style={{ position: 'absolute', bottom: 10, left: 10 }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Mode: {mode}</Text>
        {lastUserLocation && (
          <Text style={{ color: 'white' }}>Last loc: {lastUserLocation.latitude.toFixed(5)}, {lastUserLocation.longitude.toFixed(5)}</Text>
        )}
        <Button title="Set Tee" onPress={() => setMode('tee')} />
        <Button title="Set Green" onPress={() => setMode('green')} />
        <Button title="Draw Fairway" onPress={() => setMode('fairway')} />
        <Button title="Draw Hazard" onPress={() => setMode('hazard')} />
        <Button title="Finish Hazard" onPress={finishHazard} />
        <Button title="Zoom to Hole" onPress={() => zoomToHole(0.35)} />
        <Button title="Zoom Further" onPress={() => zoomToHole(0.2)} />
        <Button title="Reset View" onPress={() => fitMapToAll({ animated: true })} />
        <Button title="Zoom Out" onPress={() => zoomOut(3)} />
        <Button title="Center On Me" onPress={centerOnMe} />
        <Button title="Export Hole Data" onPress={exportHoleData} />
      </View>
    </View>
  );
};

export default HoleMapperScreen;
