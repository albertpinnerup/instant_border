import React, { useRef } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { GlobalSizes, SCREEN_WIDTH } from "../../styles/sizes";

interface CanvasProps {
    aspectRatio: number; // width/height ratio (e.g., 1 for square, 16/9 for widescreen)
    image?: string; // URI of the image to display
    width?: number; // Optional canvas width, defaults to screen width - padding
    maxHeight?: number; // Maximum height for the canvas
    backgroundSpacing: number;
}

export const Canvas: React.FC<CanvasProps> = ({
    aspectRatio,
    image,
    width = SCREEN_WIDTH - GlobalSizes.spacingSize,
    maxHeight = SCREEN_WIDTH * 1.2, // Default max height is 120% of screen width
    backgroundSpacing = 0,
}) => {
    const canvasRef = useRef<View>(null);

    // Calculate initial dimensions
    let calculatedHeight = width / aspectRatio;
    let finalWidth = width;
    let finalHeight = calculatedHeight;

    // If calculated height exceeds max height, scale down proportionally
    if (calculatedHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * aspectRatio;
    }

    const exportCanvas = async () => {
        try {
            // Request media library permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                console.log("Permission denied");
                return;
            }

            // Check if canvas ref is available
            if (!canvasRef.current) {
                console.error("Canvas ref is not available");
                return;
            }

            // Capture the canvas
            const uri = await captureRef(canvasRef.current, {
                format: "png",
                quality: 1.0,
            });

            // Save to camera roll
            await MediaLibrary.saveToLibraryAsync(uri);
            console.log("Image saved to camera roll!");
        } catch (error) {
            console.error("Error saving image:", error);
        }
    };

    return (
        <View style={styles.container}>
            <View
                ref={canvasRef}
                style={[
                    styles.canvas,
                    {
                        width: finalWidth,
                        height: finalHeight,
                        padding: backgroundSpacing,
                    },
                ]}
            >
                {image && (
                    <Image
                        source={{ uri: image }}
                        style={[
                            styles.image,
                            {
                                width: finalWidth - backgroundSpacing * 2,
                                height: finalHeight - backgroundSpacing * 2,
                                top: backgroundSpacing,
                                left: backgroundSpacing,
                            },
                        ]}
                        resizeMode="contain"
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
    },
    canvas: {
        backgroundColor: "#000",
        overflow: "hidden",
        position: "relative",
        // padding: GlobalSizes.spacingSize,
    },
    image: {
        position: "absolute",
        // top and left are now set dynamically via inline styles
    },
});
