// components/canvas/SkiaCanvas.tsx
import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { Alert } from "react-native";
import {
    Canvas as SkiaCanvasView,
    useImage,
    Skia,
    rect,
    SkImage,
    SkCanvas,
    Rect,
    Image as SkiaImage,
} from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

// Helper function to convert Uint8Array to base64
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// ---- Props & Handle ----
interface CanvasProps {
    aspectRatio: number;
    image?: string;
    imageAspectRatio?: number;
    originalImageWidth?: number;
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

interface PreviewDims {
    canvasW: number;
    canvasH: number;
    innerW: number;
    innerH: number;
}

interface PreviewState extends PreviewDims {
    bgColor: string;
    imageRectX: number;
    imageRectY: number;
    borderRectX: number;
    borderRectY: number;
    borderRectW: number;
    borderRectH: number;
}

export const SkiaCanvas = forwardRef<CanvasHandle, CanvasProps>(
    (
        {
            aspectRatio,
            image,
            imageAspectRatio = 1,
            originalImageWidth,
            originalImageHeight,
            width = 320,
            maxHeight = 480,
            backgroundSpacing = 0,
            borderWidth = 0,
            borderColor = "#000",
            backgroundColor = "#fff",
            borderOnly = false,
        },
        ref
    ) => {
        const skiaImage: SkImage | null = useImage(image ?? "");

        const previewDims: PreviewDims = useMemo(() => {
            if (borderOnly) {
                // In borderOnly mode, size based on the image aspect ratio to maintain proportions
                let innerW = width - borderWidth * 2;
                let innerH = innerW / imageAspectRatio;

                // If height exceeds maxHeight, scale down proportionally
                if (innerH + borderWidth * 2 > maxHeight) {
                    innerH = maxHeight - borderWidth * 2;
                    innerW = innerH * imageAspectRatio;
                }

                // Ensure minimum size
                innerW = Math.max(1, innerW);
                innerH = Math.max(1, innerH);

                return {
                    canvasW: innerW + borderWidth * 2,
                    canvasH: innerH + borderWidth * 2,
                    innerW,
                    innerH,
                };
            }

            const baseW = width;
            let canvasH = baseW / aspectRatio;
            let canvasW = baseW;
            if (canvasH > maxHeight) {
                canvasH = maxHeight;
                canvasW = canvasH * aspectRatio;
            }

            const innerAvailW = Math.max(0, canvasW - backgroundSpacing * 2);
            const innerAvailH = Math.max(0, canvasH - backgroundSpacing * 2);

            const widthBasedHeight = innerAvailW / imageAspectRatio;
            const fitsByWidth = widthBasedHeight <= innerAvailH;
            const innerW = fitsByWidth ? innerAvailW : innerAvailH * imageAspectRatio;
            const innerH = fitsByWidth ? widthBasedHeight : innerAvailH;

            return { canvasW, canvasH, innerW, innerH };
        }, [
            aspectRatio,
            width,
            maxHeight,
            backgroundSpacing,
            borderWidth,
            borderOnly,
            imageAspectRatio,
        ]);

        const preview: PreviewState = useMemo(() => {
            const { canvasW, canvasH, innerW, innerH } = previewDims;

            let imageRectX: number;
            let imageRectY: number;

            if (borderOnly) {
                // In borderOnly mode, center the image within the border
                imageRectX = borderWidth;
                imageRectY = borderWidth;
            } else {
                // In normal mode, center within the entire canvas
                imageRectX = (canvasW - innerW) / 2;
                imageRectY = (canvasH - innerH) / 2;
            }

            const borderRectX = imageRectX - borderWidth;
            const borderRectY = imageRectY - borderWidth;
            const borderRectW = innerW + borderWidth * 2;
            const borderRectH = innerH + borderWidth * 2;

            const bgColor = borderOnly ? "transparent" : backgroundColor;

            return {
                canvasW,
                canvasH,
                innerW,
                innerH,
                bgColor,
                imageRectX,
                imageRectY,
                borderRectX,
                borderRectY,
                borderRectW,
                borderRectH,
            };
        }, [previewDims, backgroundColor, borderOnly, borderWidth]);

        useImperativeHandle(ref, () => ({
            exportToPhotoLibrary: async (onProgress?: (progress: number) => void) => {
                try {
                    onProgress?.(5); // Starting process
                    await new Promise(resolve => setTimeout(resolve, 200)); // Give UI time to update

                    if (!skiaImage) {
                        console.warn("No Skia image available");
                        return false;
                    }

                    onProgress?.(15); // Image validation complete
                    await new Promise(resolve => setTimeout(resolve, 100));                    // Cap the resolution to prevent memory issues while maintaining original megapixel count
                    const MAX_DIMENSION = 6000; // Higher cap but with megapixel limit below
                    const MAX_MEGAPIXELS =
                        originalImageWidth && originalImageHeight
                            ? originalImageWidth * originalImageHeight
                            : 4096 * 3072; // Default to 12MP if no original dimensions
                    let exportWidth = originalImageWidth ?? 2048;
                    let exportHeight =
                        originalImageHeight ?? Math.round(exportWidth / imageAspectRatio);

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

                    // For extremely large images, scale them down to prevent crashes
                    if (exportWidth * exportHeight > 30000000) {
                        // 30 megapixels
                        console.log("Image too large, scaling down to 30MP");
                        const scale = Math.sqrt(30000000 / (exportWidth * exportHeight));
                        exportWidth = Math.round(exportWidth * scale);
                        exportHeight = Math.round(exportHeight * scale);
                    }

                    console.log(
                        `Original: ${originalImageWidth}x${originalImageHeight}, Export: ${exportWidth}x${exportHeight}`
                    );

                    onProgress?.(35); // Calculations complete
                    await new Promise(resolve => setTimeout(resolve, 150));

                    const scale = preview.innerW > 0 ? exportWidth / preview.innerW : 1;

                    const exportCanvasW = Math.max(1, Math.round(preview.canvasW * scale));
                    const exportCanvasH = Math.max(1, Math.round(preview.canvasH * scale));
                    const exportBorderW = Math.round(borderWidth * scale);

                    onProgress?.(45); // Creating surface
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const surface = Skia.Surface.MakeOffscreen(exportCanvasW, exportCanvasH);
                    if (!surface) {
                        console.warn("Failed to create Skia surface", exportCanvasW, exportCanvasH);
                        return false;
                    }

                    const ctx = surface.getCanvas();
                    if (!ctx) {
                        console.warn("Failed to get Skia canvas from surface");
                        return false;
                    }

                    // Fill background
                    if (!borderOnly) {
                        ctx.drawColor(Skia.Color(backgroundColor));
                    } else {
                        ctx.clear(Skia.Color("transparent"));
                    }

                    // Draw border
                    if (exportBorderW > 0) {
                        const pBorder = Skia.Paint();
                        pBorder.setColor(Skia.Color(borderColor ?? "#000"));
                        ctx.drawRect(
                            rect(
                                preview.borderRectX * scale,
                                preview.borderRectY * scale,
                                preview.borderRectW * scale,
                                preview.borderRectH * scale
                            ),
                            pBorder
                        );
                    }

                    onProgress?.(55); // Drawing image
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Draw image
                    const pImage = Skia.Paint();
                    pImage.setAntiAlias(true);

                    ctx.drawImageRect(
                        skiaImage,
                        rect(0, 0, skiaImage.width(), skiaImage.height()), // source
                        rect(
                            preview.imageRectX * scale,
                            preview.imageRectY * scale,
                            preview.innerW * scale,
                            preview.innerH * scale
                        ), // destination
                        pImage
                    );

                    onProgress?.(70); // Creating snapshot
                    await new Promise(resolve => setTimeout(resolve, 150));

                    // Snapshot & encode
                    const png = surface.makeImageSnapshot()?.encodeToBytes();
                    if (!png) {
                        console.warn("Failed to create PNG bytes from surface");
                        return false;
                    }

                    onProgress?.(80); // Encoding image
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Convert to base64 properly
                    const base64 = uint8ArrayToBase64(png);

                    const tmp = FileSystem.cacheDirectory + `skia-export-${Date.now()}.png`;
                    await FileSystem.writeAsStringAsync(tmp, base64, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    onProgress?.(90); // Saving to library
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Media library permission
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== "granted") {
                        Alert.alert("Permission required", "We need access to save photos.");
                        return false;
                    }

                    await MediaLibrary.saveToLibraryAsync(tmp);

                    onProgress?.(100); // Complete

                    return true;
                } catch (e) {
                    console.warn("Skia export failed:", e);
                    return false;
                }
            },
            captureImage: async (onProgress?: (progress: number) => void) => {
                try {
                    onProgress?.(5);
                    await new Promise(resolve => setTimeout(resolve, 150));

                    if (!skiaImage) return null;

                    onProgress?.(25);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const exportCanvasW = Math.max(1, Math.round(preview.canvasW));
                    const exportCanvasH = Math.max(1, Math.round(preview.canvasH));

                    const surface = Skia.Surface.MakeOffscreen(exportCanvasW, exportCanvasH);
                    const ctx = surface?.getCanvas();

                    if (!borderOnly) {
                        ctx?.drawColor(Skia.Color(backgroundColor));
                    } else {
                        ctx?.clear(Skia.Color("transparent"));
                    }

                    if (borderWidth > 0) {
                        const pBorder = Skia.Paint();
                        pBorder.setColor(Skia.Color(borderColor ?? "#000"));
                        ctx?.drawRect(
                            rect(
                                preview.borderRectX,
                                preview.borderRectY,
                                preview.borderRectW,
                                preview.borderRectH
                            ),
                            pBorder
                        );
                    }

                    onProgress?.(60);

                    const pImg = Skia.Paint();
                    ctx?.drawImageRect(
                        skiaImage,
                        rect(0, 0, skiaImage.width(), skiaImage.height()), // source rect
                        rect(
                            preview.imageRectX,
                            preview.imageRectY,
                            preview.innerW,
                            preview.innerH
                        ), // destination rect
                        pImg
                    );

                    onProgress?.(80);

                    const png = surface?.makeImageSnapshot().encodeToBytes();
                    if (!png) return null;

                    const base64 = uint8ArrayToBase64(png);
                    const tmp = FileSystem.cacheDirectory + `skia-capture-${Date.now()}.png`;
                    await FileSystem.writeAsStringAsync(tmp, base64, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    onProgress?.(100);

                    return tmp;
                } catch (e) {
                    console.warn("Skia capture failed:", e);
                    return null;
                }
            },
        }));

        if (!image || !skiaImage) return null;

        return (
            <SkiaCanvasView
                style={{
                    width: preview.canvasW,
                    height: preview.canvasH,
                    alignSelf: "center",
                }}
            >
                {/* Background */}
                {!borderOnly && (
                    <Rect
                        x={0}
                        y={0}
                        width={preview.canvasW}
                        height={preview.canvasH}
                        color={backgroundColor}
                    />
                )}

                {/* Border */}
                {borderWidth > 0 && (
                    <Rect
                        x={preview.borderRectX}
                        y={preview.borderRectY}
                        width={preview.borderRectW}
                        height={preview.borderRectH}
                        color={borderColor ?? "#000"}
                    />
                )}

                {/* Image */}
                <SkiaImage
                    image={skiaImage}
                    x={preview.imageRectX}
                    y={preview.imageRectY}
                    width={preview.innerW}
                    height={preview.innerH}
                    fit="cover"
                />
            </SkiaCanvasView>
        );
    }
);
