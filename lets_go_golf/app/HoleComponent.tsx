import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'

const HoleComponent = () => {
    const { holes } = useLocalSearchParams()
    const parsedHoles = JSON.parse(holes)
    console.log('Parsed Holes:', parsedHoles)
    
    const renderItem = ({ item, index }) => (
        <TouchableOpacity style={styles.holeItem}>
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