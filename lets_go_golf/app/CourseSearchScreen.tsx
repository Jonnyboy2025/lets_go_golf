import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Button,
} from 'react-native';
import { searchCourses } from '@/services/golfApi'
import { useNavigation } from '@react-navigation/native'

const CourseSearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation()

  const fetchCourses = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchCourses(query);
      setResults(data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('TeesScreen', {course: item })}>
      <Text style={styles.title}>{item.course_name}</Text>
      <Text style={styles.subtitle}>{item.club_name}</Text>
      <Text style={styles.meta}>{item.location.address}</Text>
      <Text style={styles.meta}>
        Tees: {item.tees ? item.tees.length : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for a course or club..."
        value={query}
        onChangeText={setQuery}
      />

      <Button title="Search" onPress={fetchCourses} />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          style={{ marginTop: 20 }}
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#555' },
  meta: { fontSize: 14, color: '#777' },
});

export default CourseSearchScreen
