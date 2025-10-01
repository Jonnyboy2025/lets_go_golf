import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'

const HoleComponent = () => {
    const { holes, course_name, courseId } = useLocalSearchParams()
    const parsedHoles = JSON.parse(holes)
    console.log('Parsed Holes:', parsedHoles)
    
    const handleHolePress = (hole, index: number) => {
        console.log(`Hole pressed: ${hole}`)
        // You can navigate to another screen or show statistics here
        router.push({pathname: '/Hole', params: { hole: JSON.stringify(hole), course_name: course_name, courseId: courseId, hole_number: index+1}})
    }

    const renderItem = ({ item, index }) => (
        <TouchableOpacity style={styles.holeItem} onPress={() => handleHolePress(item, index)}>
            <Text style={styles.holeTitle}>Hole {index + 1}</Text>
            <Text>Par: {item.par}</Text>
            <Text>Yardage: {item.yardage}</Text>
            <Text>Handicap: {item.handicap}</Text>
        </TouchableOpacity>
    )

    return (
        <FlatList data={parsedHoles} renderItem={renderItem}/>
    )
}

const styles = StyleSheet.create({
    holeItem: {
        padding: 15,
        marginVertical: 8,  
        marginHorizontal: 16,
        backgroundColor: '#e0f7fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#00796b',
    },
    holeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
})

export default HoleComponent