import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { View, Image, StyleSheet, PixelRatio } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { GlobalSizes, SCREEN_WIDTH } from "../../styles/sizes";

interface CanvasProps {
    aspectRatio: number;
    image?: string;
    imageAspectRatio?: number; // Add this to know the actual image aspect ratio
    originalImageWidth?: number; // Add original image dimensions
    originalImageHeight?: number;
    width?: number;
    maxHeight?: number;
    backgroundSpacing: number;
    borderWidth: number;
    borderColor?: string;
    backgroundColor: string;
    borderOnly?: boolean;
}

export interface CanvasHandle {
    exportToPhotoLibrary: (onProgress?: (progress: number) => void) => Promise<boolean>;
    captureImage: (onProgress?: (progress: number) => void) => Promise<string | null>;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
    (
        {
            aspectRatio,
            image,
            imageAspectRatio = 1, // Default to square if not provided
            originalImageWidth,
            originalImageHeight,
            width = SCREEN_WIDTH - GlobalSizes.spacingSize,
            maxHeight = SCREEN_WIDTH * 1.2,
            backgroundSpacing = 0,
            borderWidth = 0,
            borderColor = "#fff",
            backgroundColor = "#fff",
            borderOnly = false,
        },
        ref
    ) => {
        const canvasRef = useRef<View>(null);
        const borderedRef = useRef<View>(null);
        const exportCanvasRef = useRef<View>(null); // For high-res export
        // Track image load state so we only capture once it's ready
        const [isImageLoaded, setIsImageLoaded] = useState(false);
        const imageLoadedResolveRef = useRef<(() => void) | null>(null);
        // New: measure parent width
        const [containerWidth, setContainerWidth] = useState<number | null>(null);
        const [isExporting, setIsExporting] = useState(false);
        const [exportDimensions, setExportDimensions] = useState<{
            width: number;
            height: number;
        } | null>(null);

        // Reset load state when image changes
        useEffect(() => {
            setIsImageLoaded(false);
            imageLoadedResolveRef.current = null;
        }, [image]);

        // Calculate canvas dimensions
        const getCanvasDimensions = () => {
            // If borderOnly, tightly wrap the image + border so no background is visible
            if (borderOnly) {
                const baseMaxW = containerWidth ?? width;
                const r = imageAspectRatio || 1;

                let innerW = Math.max(1, baseMaxW - borderWidth * 2);
                let innerH = innerW / r;

                const maxInnerH = Math.max(1, maxHeight - borderWidth * 2);
                if (innerH + borderWidth * 2 > maxHeight) {
                    innerH = maxInnerH;
                    innerW = innerH * r;
                }
                return { width: innerW + borderWidth * 2, height: innerH + borderWidth * 2 };
            }

            // Prefer measured parent width; fall back to provided width prop
            const baseWidth = containerWidth ?? width;

            let calculatedHeight = baseWidth / aspectRatio;
            let finalWidth = baseWidth;
            let finalHeight = calculatedHeight;

            if (calculatedHeight > maxHeight) {
                finalHeight = maxHeight;
                finalWidth = maxHeight * aspectRatio;
            }

            return { width: finalWidth, height: finalHeight };
        };

        const dimensions = getCanvasDimensions();

        // Calculate stable container height for borderOnly mode to prevent layout shifts
        const getContainerHeight = () => {
            if (borderOnly) {
                const baseMaxW = containerWidth ?? width;
                const r = imageAspectRatio || 1;
                const maxBorder = 25; // Maximum expected border width

                let maxInnerW = Math.max(1, baseMaxW - maxBorder * 2);
                let maxInnerH = maxInnerW / r;

                const maxInnerHCapped = Math.max(1, maxHeight - maxBorder * 2);
                if (maxInnerH + maxBorder * 2 > maxHeight) {
                    maxInnerH = maxInnerHCapped;
                }
                return maxInnerH + maxBorder * 2;
            }
            return dimensions.height;
        };

        const containerHeight = getContainerHeight();

        const getImageSize = () => {
            let innerAvailableWidth: number;
            let innerAvailableHeight: number;

            if (borderOnly) {
                // In borderOnly, the image should exactly fill the canvas minus the border
                innerAvailableWidth = Math.max(0, dimensions.width - borderWidth * 2);
                innerAvailableHeight = Math.max(0, dimensions.height - borderWidth * 2);
            } else {
                // Normal logic: consider backgroundSpacing
                innerAvailableWidth = Math.max(0, dimensions.width - backgroundSpacing * 2);
                innerAvailableHeight = Math.max(0, dimensions.height - backgroundSpacing * 2);
            }

            const widthBasedHeight = innerAvailableWidth / imageAspectRatio;
            const heightBasedWidth = innerAvailableHeight * imageAspectRatio;

            if (widthBasedHeight <= innerAvailableHeight) {
                return {
                    width: innerAvailableWidth,
                    height: widthBasedHeight,
                };
            } else {
                return {
                    width: heightBasedWidth,
                    height: innerAvailableHeight,
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

                    if (!image || !originalImageWidth || !originalImageHeight) {
                        // Fallback to normal capture if we don't have original dimensions
                        const targetRef =
                            borderOnly && borderedRef.current
                                ? borderedRef.current
                                : canvasRef.current;
                        if (!targetRef) return false;

                        const uri = await captureRef(targetRef, {
                            format: "png",
                            quality: 1.0,
                            useRenderInContext: true,
                        });

                        await MediaLibrary.saveToLibraryAsync(uri);
                        return true;
                    }

                    // Cap the resolution to prevent memory issues while maintaining original megapixel count
                    const MAX_DIMENSION = 6000; // Higher cap but with megapixel limit below
                    const MAX_MEGAPIXELS = originalImageWidth * originalImageHeight; // Keep original MP count
                    let exportWidth = originalImageWidth;
                    let exportHeight = originalImageHeight;

                    // First, cap individual dimensions if they're too large
                    if (exportWidth > MAX_DIMENSION || exportHeight > MAX_DIMENSION) {
                        const aspectRatio = exportWidth / exportHeight;
                        if (exportWidth > exportHeight) {
                            exportWidth = MAX_DIMENSION;
                            exportHeight = Math.round(MAX_DIMENSION / aspectRatio);
                        } else {
                            exportHeight = MAX_DIMENSION;
                            exportWidth = Math.round(MAX_DIMENSION * aspectRatio);
                        }
                    }

                    // Then ensure we don't exceed the original megapixel count
                    const currentMegapixels = exportWidth * exportHeight;
                    if (currentMegapixels > MAX_MEGAPIXELS) {
                        const scale = Math.sqrt(MAX_MEGAPIXELS / currentMegapixels);
                        exportWidth = Math.round(exportWidth * scale);
                        exportHeight = Math.round(exportHeight * scale);
                    }

                    console.log(
                        `Original: ${originalImageWidth}x${originalImageHeight}, Export: ${exportWidth}x${exportHeight}`
                    );

                    // For very large images, fallback to regular capture to prevent crashes
                    if (exportWidth * exportHeight > 20000000) {
                        // 20 megapixels (increased from 6MP)
                        console.log("Image too large for high-res export, using fallback");
                        const targetRef =
                            borderOnly && borderedRef.current
                                ? borderedRef.current
                                : canvasRef.current;
                        if (!targetRef) return false;

                        const uri = await captureRef(targetRef, {
                            format: "png",
                            quality: 1.0,
                            useRenderInContext: true,
                        });

                        await MediaLibrary.saveToLibraryAsync(uri);
                        return true;
                    }

                    // Enable high-res export mode
                    setExportDimensions({ width: exportWidth, height: exportHeight });
                    setIsExporting(true);

                    // Wait for the high-res canvas to render (reduced timeout)
                    await new Promise<void>((resolve) => {
                        setTimeout(() => resolve(), 50);
                    });

                    // Wait for images to be ready
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

                    if (!exportCanvasRef.current) {
                        throw new Error("Export canvas not available");
                    }

                    const uri = await captureRef(exportCanvasRef.current, {
                        format: "png",
                        quality: 1.0,
                        useRenderInContext: true,
                    });

                    // Disable high-res export mode
                    setIsExporting(false);
                    setExportDimensions(null);

                    await MediaLibrary.saveToLibraryAsync(uri);
                    return true;
                } catch (error) {
                    console.error("Export failed:", error);
                    setIsExporting(false);
                    setExportDimensions(null);
                    return false;
                }
            },

            captureImage: async (onProgress?: (progress: number) => void) => {
                try {
                    onProgress?.(5);
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    // Use high-res export for sharing if available
                    if (image && originalImageWidth && originalImageHeight) {
                        // Cap the resolution for sharing - maintain original megapixel count
                        const MAX_DIMENSION = 6000;
                        const MAX_MEGAPIXELS = originalImageWidth * originalImageHeight; // Keep original MP count
                        let exportWidth = originalImageWidth;
                        let exportHeight = originalImageHeight;

                        // First, cap individual dimensions if they're too large
                        if (exportWidth > MAX_DIMENSION || exportHeight > MAX_DIMENSION) {
                            const aspectRatio = exportWidth / exportHeight;
                            if (exportWidth > exportHeight) {
                                exportWidth = MAX_DIMENSION;
                                exportHeight = Math.round(MAX_DIMENSION / aspectRatio);
                            } else {
                                exportHeight = MAX_DIMENSION;
                                exportWidth = Math.round(MAX_DIMENSION * aspectRatio);
                            }
                        }

                        // Then ensure we don't exceed the original megapixel count
                        const currentMegapixels = exportWidth * exportHeight;
                        if (currentMegapixels > MAX_MEGAPIXELS) {
                            const scale = Math.sqrt(MAX_MEGAPIXELS / currentMegapixels);
                            exportWidth = Math.round(exportWidth * scale);
                            exportHeight = Math.round(exportHeight * scale);
                        }

                        onProgress?.(25);
                        await new Promise((resolve) => setTimeout(resolve, 100));

                        // For very large images, use fallback
                        if (exportWidth * exportHeight > 20000000) {
                            // 20 megapixels (increased from 6MP)
                            onProgress?.(50);

                            const targetRef =
                                borderOnly && borderedRef.current
                                    ? borderedRef.current
                                    : canvasRef.current;
                            if (!targetRef) return null;

                            onProgress?.(80);

                            const uri = await captureRef(targetRef, {
                                format: "png",
                                quality: 1.0,
                                useRenderInContext: true,
                            });

                            onProgress?.(100);
                            return uri;
                        }

                        onProgress?.(40);
                        await new Promise((resolve) => setTimeout(resolve, 100));

                        // Use high-res approach
                        setExportDimensions({ width: exportWidth, height: exportHeight });
                        setIsExporting(true);

                        await new Promise<void>((resolve) => {
                            setTimeout(() => resolve(), 50);
                        });

                        await new Promise<void>((resolve) =>
                            requestAnimationFrame(() => resolve())
                        );

                        onProgress?.(70);
                        await new Promise((resolve) => setTimeout(resolve, 100));

                        if (!exportCanvasRef.current) {
                            throw new Error("Export canvas not available");
                        }

                        onProgress?.(85);

                        const uri = await captureRef(exportCanvasRef.current, {
                            format: "png",
                            quality: 1.0,
                            useRenderInContext: true,
                        });

                        setIsExporting(false);
                        setExportDimensions(null);

                        onProgress?.(100);
                        return uri;
                    }

                    // Fallback to normal capture
                    onProgress?.(30);
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    const targetRef =
                        borderOnly && borderedRef.current ? borderedRef.current : canvasRef.current;
                    if (!targetRef) return null;

                    if (image && !isImageLoaded) {
                        await new Promise<void>((resolve) => {
                            imageLoadedResolveRef.current = resolve;
                        });
                    }

                    onProgress?.(60);
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    // Wait 2 frames to ensure layout/rasterization are finalized
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

                    onProgress?.(85);

                    const uri = await captureRef(targetRef, {
                        format: "png",
                        quality: 1.0,
                        useRenderInContext: true,
                    });

                    onProgress?.(100);
                    return uri;
                } catch (error) {
                    console.error("Capture failed:", error);
                    setIsExporting(false);
                    setExportDimensions(null);
                    return null;
                }
            },
        }));

        return (
            <>
                <View
                    style={{ alignItems: "center", justifyContent: "center", width: "100%" }}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w && w !== containerWidth) setContainerWidth(w);
                    }}
                >
                    <View
                        style={{
                            height: containerHeight,
                            width: "100%",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View
                            ref={canvasRef}
                            collapsable={false}
                            style={{
                                width: dimensions.width,
                                height: dimensions.height,
                                backgroundColor: borderOnly ? "transparent" : backgroundColor,
                                alignItems: "center",
                                justifyContent: "center",
                                padding: borderOnly ? 0 : backgroundSpacing,
                                overflow: "hidden",
                            }}
                        >
                            {image && (
                                <View
                                    ref={borderedRef}
                                    collapsable={false}
                                    style={{
                                        width: imageSize.width + borderWidth * 2,
                                        height: imageSize.height + borderWidth * 2,
                                        backgroundColor: borderColor,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Image
                                        source={{ uri: image }}
                                        resizeMode="cover"
                                        style={{
                                            width: imageSize.width,
                                            height: imageSize.height,
                                        }}
                                        onLoadEnd={() => {
                                            setIsImageLoaded(true);
                                            imageLoadedResolveRef.current?.();
                                            imageLoadedResolveRef.current = null;
                                        }}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* High-resolution export canvas - rendered off-screen when exporting */}
                {isExporting && image && exportDimensions && (
                    <View
                        style={{
                            position: "absolute",
                            left: -10000, // Render off-screen
                            top: -10000,
                            width:
                                exportDimensions.width +
                                borderWidth * 2 * (exportDimensions.width / imageSize.width),
                            height:
                                exportDimensions.height +
                                borderWidth * 2 * (exportDimensions.height / imageSize.height),
                        }}
                    >
                        <View
                            ref={exportCanvasRef}
                            collapsable={false}
                            style={{
                                width: "100%",
                                height: "100%",
                                backgroundColor: borderColor,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Image
                                source={{ uri: image }}
                                style={{
                                    width: exportDimensions.width,
                                    height: exportDimensions.height,
                                }}
                            />
                        </View>
                    </View>
                )}
            </>
        );
    }
);
