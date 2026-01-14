import { API_BASE_URL } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from './auth-context';

type AuthMode = 'login' | 'register';

export function AuthForm() {
    const { login } = useAuth();
    const [mode, setMode] = useState<AuthMode>('register');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const onSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
            const body: any = { email, password };
            if (mode === 'register') {
                body.name = name;
                // derive a simple username if user didn't type one yet
                const suggestedUsername = email.split('@')[0]?.toLowerCase() ?? '';
                body.username = suggestedUsername;
            }

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = await res.json();

            if (!res.ok) {
                setError(json.message || 'Something went wrong');
                return;
            }

            const token = json.tokens?.accessToken ?? null;
            if (token && json.user) {
                await login(token, json.user);
            }
        } catch (e) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.authContainer}>
            <ScrollView
                contentContainerStyle={styles.authScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Illustration Section */}
                <View style={styles.illustrationContainer}>
                    <Image
                        source={
                            mode === 'login'
                                ? require('@/assets/images/Adobe Express - file.png')
                                : require('@/assets/images/Adobe Express - file (1).png')
                        }
                        style={styles.illustrationImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Title */}
                <Text style={styles.authTitle}>
                    {mode === 'register' ? 'Create your profile' : 'Login'}
                </Text>

                {/* Mode Toggle */}
                <View style={styles.authToggleRow}>
                    <TouchableOpacity
                        onPress={() => setMode('register')}
                        style={styles.authToggleButton}
                    >
                        <Text style={[
                            styles.authToggleText,
                            mode === 'register' && styles.authToggleActive
                        ]}>
                            Sign up
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setMode('login')}
                        style={styles.authToggleButton}
                    >
                        <Text style={[
                            styles.authToggleText,
                            mode === 'login' && styles.authToggleActive
                        ]}>
                            Log in
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Input Fields */}
                {mode === 'register' && (
                    <TextInput
                        style={styles.authInput}
                        placeholder="Name"
                        placeholderTextColor="#6b7280"
                        value={name}
                        onChangeText={setName}
                    />
                )}

                <TextInput
                    style={styles.authInput}
                    placeholder="Email"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />

                <View>
                    <View style={styles.passwordInputContainer}>
                        <TextInput
                            style={styles.authInputWithIcon}
                            placeholder="Password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity
                            style={styles.passwordToggle}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#9ca3af"
                            />
                        </TouchableOpacity>
                    </View>
                    {mode === 'login' && (
                        <TouchableOpacity style={styles.forgotPasswordButton}>
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {error && (
                    <Text style={styles.authErrorText}>
                        {error}
                    </Text>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={styles.authSubmitButton}
                    onPress={() => setShowTermsModal(true)}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.authSubmitButtonText}>
                            {mode === 'register' ? 'Create profile' : 'Sign Up'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal
                visible={showTermsModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Terms & Conditions</Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                By continuing, you agree to our Terms of Service and Privacy Policy.
                                {'\n'}{'\n'}
                                Please accept these terms to proceed with your login or registration.
                                We respect your privacy and represent clarity in our data practices.
                            </Text>
                        </ScrollView>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowTermsModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonAccept]}
                                onPress={() => {
                                    setShowTermsModal(false);
                                    void onSubmit();
                                }}
                            >
                                <Text style={[styles.modalButtonText, styles.modalButtonTextAccept]}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    authContainer: {
        flex: 1,
        backgroundColor: '#050816',
        padding: 20,
    },
    authScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    illustrationContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    illustrationImage: {
        width: 280,
        height: 200,
    },
    authTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 24,
        textAlign: 'center',
    },
    authToggleRow: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 4,
    },
    authToggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    authToggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9ca3af',
    },
    authToggleActive: {
        color: '#ffffff',
        backgroundColor: '#374151', // Visual cue for active tab if needed, logic handled in text color usually or wrapping view
    },
    authInput: {
        backgroundColor: '#1f2937',
        color: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        borderRadius: 12,
        marginBottom: 16,
    },
    authInputWithIcon: {
        flex: 1,
        color: '#ffffff',
        padding: 16,
        fontSize: 16,
    },
    passwordToggle: {
        padding: 16,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: '#3b82f6',
        fontSize: 14,
    },
    authSubmitButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    authSubmitButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    authErrorText: {
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderRadius: 20,
        padding: 24,
        maxHeight: '60%',
        borderWidth: 1,
        borderColor: '#374151',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalScroll: {
        marginBottom: 24,
    },
    modalText: {
        color: '#d1d5db',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#374151',
    },
    modalButtonAccept: {
        backgroundColor: '#3b82f6',
    },
    modalButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    modalButtonTextAccept: {
        fontWeight: 'bold',
    },
});
