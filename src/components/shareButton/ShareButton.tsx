import React from "react";
import { TouchableOpacity, Text, Alert } from "react-native";
import * as Sharing from "expo-sharing";

interface ShareButtonProps {
    imageUri?: string | null;
    disabled?: boolean;
    onPress?: () => void;
    onCaptureAndShare?: () => Promise<string | null>;
}

export const ShareButton = ({
    imageUri,
    disabled = false,
    onPress,
    onCaptureAndShare,
}: ShareButtonProps) => {
    const onShare = async () => {
        let imageToShare = imageUri;

        // If we have a capture function, use it to get the latest image
        if (onCaptureAndShare) {
            imageToShare = await onCaptureAndShare();
        } else if (onPress) {
            // Call the onPress callback first to capture the image if needed
            await onPress();
        }

        if (!imageToShare) {
            Alert.alert("No Image", "Please create an image first!");
            return;
        }

        try {
            // Check if sharing is available
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Error", "Sharing is not available on this device");
                return;
            }

            // Share with expo-sharing (preserves original quality)
            await Sharing.shareAsync(imageToShare, {
                mimeType: "image/png",
                dialogTitle: "Share your instant border image",
            });

            console.log("Image shared successfully");
        } catch (error) {
            console.error("Error sharing:", error);
            Alert.alert("Error", "Failed to share image. Please try again.");
        }
    };

    return (
        <TouchableOpacity
            onPress={onShare}
            disabled={disabled}
            style={{
                backgroundColor: disabled ? "#ccc" : "#FF9500",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 10,
            }}
        >
            <Text
                style={{
                    color: disabled ? "#666" : "white",
                    fontSize: 16,
                    fontWeight: "600",
                }}
            >
                Share Image
            </Text>
        </TouchableOpacity>
    );
};
