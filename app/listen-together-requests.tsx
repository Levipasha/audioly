import { ListenTogetherRequests } from '@/components/ListenTogetherRequests';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ListenTogetherRequestsScreen() {
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Listen Together Requests',
                    headerStyle: {
                        backgroundColor: '#050816',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                }}
            />
            <View style={styles.container}>
                <ListenTogetherRequests />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050816',
    },
});
