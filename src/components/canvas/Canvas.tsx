import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { GlobalSizes, SCREEN_WIDTH } from "../../styles/sizes";

interface CanvasProps {
    aspectRatio: number;
    image?: string;
    imageAspectRatio?: number; // Add this to know the actual image aspect ratio
    width?: number;
    maxHeight?: number;
    backgroundSpacing: number;
    borderWidth: number;
    borderColor?: string;
    backgroundColor: string;
}

export interface CanvasHandle {
    exportToPhotoLibrary: () => Promise<boolean>;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
    (
        {
            aspectRatio,
            image,
            imageAspectRatio = 1, // Default to square if not provided
            width = SCREEN_WIDTH - GlobalSizes.spacingSize,
            maxHeight = SCREEN_WIDTH * 1.2,
            backgroundSpacing = 0,
            borderWidth = 0,
            borderColor = "#fff",
            backgroundColor = "#fff",
        },
        ref
    ) => {
        const canvasRef = useRef<View>(null);
        // Track image load state so we only capture once it's ready
        const [isImageLoaded, setIsImageLoaded] = useState(false);
        const imageLoadedResolveRef = useRef<(() => void) | null>(null);

        // Reset load state when image changes
        useEffect(() => {
            setIsImageLoaded(false);
            imageLoadedResolveRef.current = null;
        }, [image]);

        // Calculate canvas dimensions
        const getCanvasDimensions = () => {
            let calculatedHeight = width / aspectRatio;
            let finalWidth = width;
            let finalHeight = calculatedHeight;

            if (calculatedHeight > maxHeight) {
                finalHeight = maxHeight;
                finalWidth = maxHeight * aspectRatio;
            }

            return { width: finalWidth, height: finalHeight };
        };

        const dimensions = getCanvasDimensions();

        // Calculate the perfect image size to fit within available space
        const getImageSize = () => {
            const availableWidth = dimensions.width - backgroundSpacing * 2;
            const availableHeight = dimensions.height - backgroundSpacing * 2;

            // Calculate what size the image should be to fit perfectly
            const widthBasedHeight = availableWidth / imageAspectRatio;
            const heightBasedWidth = availableHeight * imageAspectRatio;

            if (widthBasedHeight <= availableHeight) {
                // Width is the limiting factor
                return {
                    width: availableWidth,
                    height: widthBasedHeight,
                };
            } else {
                // Height is the limiting factor
                return {
                    width: heightBasedWidth,
                    height: availableHeight,
                };
            }
        };

        const imageSize = getImageSize();

        // Expose export function
        useImperativeHandle(ref, () => ({
            exportToPhotoLibrary: async () => {
                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== "granted") return false;

                    if (!canvasRef.current) return false;

                    if (image && !isImageLoaded) {
                        await new Promise<void>((resolve) => {
                            imageLoadedResolveRef.current = resolve;
                        });
                    }

                    // Wait 2 frames to ensure layout/rasterization are finalized
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

                    const uri = await captureRef(canvasRef.current, {
                        format: "png",
                        quality: 1.0,
                        useRenderInContext: true,
                    });

                    await MediaLibrary.saveToLibraryAsync(uri);
                    return true;
                } catch (error) {
                    console.error("Export failed:", error);
                    return false;
                }
            },
        }));

        return (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                    ref={canvasRef}
                    collapsable={false}
                    style={{
                        width: dimensions.width,
                        height: dimensions.height,
                        backgroundColor: backgroundColor,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: backgroundSpacing,
                    }}
                >
                    {image && (
                        <Image
                            source={{ uri: image }}
                            style={{
                                width: imageSize.width,
                                height: imageSize.height,
                                borderWidth: borderWidth,
                                borderColor: borderColor,
                            }}
                            onLoadEnd={() => {
                                setIsImageLoaded(true);
                                imageLoadedResolveRef.current?.();
                                imageLoadedResolveRef.current = null;
                            }}
                        />
                    )}
                </View>
            </View>
        );
    }
);
