import React, { useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps'
import * as FileSystem from 'expo-file-system'

const HoleMapperScreen = () => {
  const [mode, setMode] = useState('tee'); // tee | green | fairway | hazard
  const [tee, setTee] = useState(null);
  const [green, setGreen] = useState(null);
  const [fairway, setFairway] = useState([]);
  const [hazards, setHazards] = useState([]); // array of polygons
  const [currentHazard, setCurrentHazard] = useState([]);

  const handleMapPress = (e) => {
    const coord = e.nativeEvent.coordinate;

    switch (mode) {
      case 'tee':
        setTee(coord);
        break;
      case 'green':
        setGreen(coord);
        break;
      case 'fairway':
        setFairway([...fairway, coord]);
        break;
      case 'hazard':
        setCurrentHazard([...currentHazard, coord]);
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

  const exportHoleData = async () => {
    if (!tee || !green || fairway.length < 3) {
      Alert.alert('Missing data', 'You must set tee, green, and fairway.');
      return;
    }
  
    const holeData = {
      holeNumber: 1,
      par: 4,
      tee,
      green,
      fairway,
      hazards: hazards.length > 0 ? hazards : undefined,
      createdAt: new Date().toISOString(),
    };
  
    const fileUri = FileSystem.documentDirectory + `hole-${holeData.holeNumber}.json`;
  
    try {
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(holeData, null, 2));
      Alert.alert('✅ Hole saved!', `Saved to: ${fileUri}`);
      console.log('Hole saved to', fileUri);
    } catch (err) {
      console.error('Failed to save hole:', err);
      Alert.alert('❌ Save failed', err.message);
    }
  };
  

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        mapType="satellite"
        onPress={handleMapPress}
        initialRegion={{
          latitude: 36.48391,
          longitude: -86.84069,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
      >
        {tee && <Marker coordinate={tee} pinColor="green" title="Tee" />}
        {green && <Marker coordinate={green} pinColor="blue" title="Green" />}

        {fairway.length > 0 && (
          <Polygon
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
      </MapView>

      {/* Control Panel */}
      <View style={{ position: 'absolute', bottom: 10, left: 10 }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Mode: {mode}</Text>
        <Button title="Set Tee" onPress={() => setMode('tee')} />
        <Button title="Set Green" onPress={() => setMode('green')} />
        <Button title="Draw Fairway" onPress={() => setMode('fairway')} />
        <Button title="Draw Hazard" onPress={() => setMode('hazard')} />
        <Button title="Finish Hazard" onPress={finishHazard} />
        <Button title="Export Hole Data" onPress={exportHoleData} />
      </View>
    </View>
  );
};

export default HoleMapperScreen;
