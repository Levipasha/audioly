import { Link, Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
    const router = useRouter();

    // Auto-redirect to player if coming from notification
    useEffect(() => {
        // Immediate redirect for faster response
        console.log('[NotFound] Auto-redirecting to player');
        router.replace('/(tabs)/player');
    }, []);

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Text style={styles.title}>Redirecting to Player...</Text>
                <Link href="/(tabs)/player" style={styles.link}>
                    <Text style={styles.linkText}>Go to Player</Text>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0a0a0a',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: '#3b82f6',
    },
});
