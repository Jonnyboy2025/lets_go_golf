import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Icon from 'react-native-ico-lodgicons'
import teeColorMap from '@/utils/teeColor'

const TeesScreen = () => {
  const { course } = useLocalSearchParams()
  const parsedCourse = JSON.parse(course)

  const handleTeePress = (tee, gender) => {
    console.log(`Tee pressed: ${tee}, Gender: ${gender}`)
    // You can navigate to another screen or show statistics here
    router.push({pathname: '/TeeStats', params: { tee: JSON.stringify(tee), course_name: parsedCourse.course_name, courseId: parsedCourse.id}})
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{parsedCourse.course_name}</Text>
      <Text style={styles.subtitle}>Tees:</Text>

      {/* Render Men's Tees */}
      <Text style={styles.genderTitle}>Men&apos;s Tees:</Text>
      {parsedCourse.tees.male && parsedCourse.tees.male.length > 0 ? (
        parsedCourse.tees.male.map((tee, index) => (
          <TouchableOpacity
            key={index}
            style={styles.teeButton}
            onPress={() => handleTeePress(tee, 'male')}
          >
            <Icon 
                name="golf-ball-and-tee" 
                color={['White', 'Silver'].includes(tee.tee_name)
                ? '#000'
                : teeColorMap[tee.tee_name] || '#666'}
            />
            <Text style={styles.teeText}>{`${tee.tee_name}: ${tee.total_yards} yds`}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noTees}>No men&apos;s tees available</Text>
      )}

      {/* Render Women's Tees */}
      <Text style={styles.genderTitle}>Women&rsquo;s Tees:</Text>
      {parsedCourse.tees.female && parsedCourse.tees.female.length > 0 ? (
        parsedCourse.tees.female.map((tee, index) => (
          <TouchableOpacity
            key={index}
            style={styles.teeButton}
            onPress={() => handleTeePress(tee, 'female')}
          >
            <Icon 
                name="golf-ball-and-tee" 
                color={['White', 'Silver'].includes(tee.tee_name)
                ? '#000'
                : teeColorMap[tee.tee_name] || '#666'}
            />
            <Text style={styles.teeText}>{`${tee.tee_name}: ${tee.total_yards} yds`}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noTees}>No women&apos;s tees available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 18, marginBottom: 16 },
  genderTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  teeButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teeText: { fontSize: 16, textAlign: 'center', marginLeft: 8 },
  noTees: { fontSize: 16, fontStyle: 'italic', marginTop: 8 },
});

export default TeesScreen;