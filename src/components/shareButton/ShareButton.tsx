import React from "react";
import { Share, TouchableOpacity, Text, Alert } from "react-native";

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
            const result = await Share.share({
                url: imageToShare,
                message: "Check out this photo I created with instant borders!",
            });

            if (result.action === Share.sharedAction) {
                console.log("Image shared successfully");
            } else if (result.action === Share.dismissedAction) {
                console.log("Share dismissed");
            }
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
