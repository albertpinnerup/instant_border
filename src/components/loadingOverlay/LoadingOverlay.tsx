import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { GlobalColors } from "../../styles/colors";

interface LoadingOverlayProps {
    visible: boolean;
    progress?: number; // 0-100
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    visible,
    progress,
    message = "Processing...",
}) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <BlurView intensity={20} style={styles.blurContainer}>
                <View style={styles.contentContainer}>
                    <ActivityIndicator size="large" color={GlobalColors.selected} />

                    <Text style={styles.messageText}>{message}</Text>

                    {progress !== undefined && (
                        <>
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${Math.max(0, Math.min(100, progress))}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                        </>
                    )}
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    blurContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    contentContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        minWidth: 200,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    messageText: {
        fontSize: 16,
        fontWeight: "600",
        color: GlobalColors.black,
        marginTop: 16,
        textAlign: "center",
    },
    progressContainer: {
        marginTop: 16,
        width: "100%",
    },
    progressBar: {
        height: 6,
        backgroundColor: GlobalColors.grey,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: GlobalColors.selected,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        color: GlobalColors.black,
        marginTop: 8,
        textAlign: "center",
    },
});
