import React from 'react'
import { View, Text, StyleSheet, Button } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Icon from 'react-native-ico-lodgicons'
import teeColorMap from '@/utils/teeColor'

const TeeStats = () => {
    const { tee, course_name, courseId } = useLocalSearchParams()
    const parsedTee = JSON.parse(tee)
    console.log('Parsed Tee:', parsedTee)

    const handleTeePress = (holes) => {
        console.log(`Start Match: ${holes}`)
        // You can navigate to another screen or show statistics here
        router.push({pathname: '/HoleComponent', params: { holes: JSON.stringify(holes), course_name: course_name, courseId: courseId}})
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tee Statistics</Text>
            <Icon 
                name="golf-ball-and-tee" 
                color={['White', 'Silver'].includes(parsedTee.tee_name)
                ? '#000'
                : teeColorMap[parsedTee.tee_name] || '#666'}
                width="100"
                height="100"
            />
            <Text style={styles.statsTitle}>Course Difficulty</Text>

            <Text>Course Rating: {parsedTee.course_rating}</Text>
            <Text>Bogey Rating: {parsedTee.bogey_rating}</Text>
            <Text>Slope Rating: {parsedTee.slope_rating}</Text>

            <Text style={styles.sectionHeader}>Front 9</Text>
            <Text>Course Rating: {parsedTee.front_course_rating}</Text>
            <Text>Bogey Rating: {parsedTee.front_bogey_rating}</Text>
            <Text>Slope Rating: {parsedTee.front_slope_rating}</Text>

            <Text style={styles.sectionHeader}>Back 9</Text>
            <Text>Course Rating: {parsedTee.back_course_rating}</Text>
            <Text>Bogey Rating: {parsedTee.back_bogey_rating}</Text>
            <Text>Slope Rating: {parsedTee.back_slope_rating}</Text>
            <View style={{ marginTop: 100 }}>
                <Button onPress={() => handleTeePress(parsedTee.holes)} title={"Start Course"} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    teeName: {
        fontSize: 20,
        fontWeight: '600',
        marginVertical: 10,
    },
    stat: {
        fontSize: 16,
        marginVertical: 5,
    },
    icon: {
        marginVertical: 20,
    },
    statsCard: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 10,
        marginVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
      
      statsTitle: {
        fontSize: 18,
        marginTop: 10,
        fontWeight: 'bold',
        marginBottom: 8,
      },
      
      sectionHeader: {
        marginTop: 10,
        fontWeight: '600',
      },
})

export default TeeStats