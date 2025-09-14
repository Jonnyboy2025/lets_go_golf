import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import Icon from 'react-native-ico-lodgicons'
import teeColorMap from '@/utils/teeColor'

const TeeStats = () => {
    const { tee } = useLocalSearchParams()
    const parsedTee = JSON.parse(tee)
    console.log('Parsed Tee:', parsedTee)
}

export default TeeStats