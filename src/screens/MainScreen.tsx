import { Text, View, TouchableOpacity, Alert, Image, FlatList } from "react-native";
import { GlobalColors } from "../styles/colors";
import { GlobalSizes, SCREEN_HEIGHT } from "../styles/sizes";
import { ScrollView } from "react-native-gesture-handler";
import { Canvas, CanvasHandle } from "../components/canvas/Canvas";
import * as ImagePicker from "expo-image-picker";
import { useState, useRef } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Slider from "@react-native-community/slider";
import {
    ColorPickerComponent,
    ColorPickerWithSwatches,
} from "../components/colorPicker/ColorPicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpacingContainer } from "../ui/SpacingContainer";
import { SpacingContainerSmall } from "../ui/SpacingContainerSmall";
import { ShareButton } from "../components/shareButton/ShareButton";
import { SkiaCanvas } from "../components/canvas/CanvasSkia";
import { LoadingOverlay } from "../components/loadingOverlay/LoadingOverlay";

export const MainScreen = () => {
    const [selectedImage, setSelectedImage] = useState<string | undefined>();
    const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
    const [originalImageWidth, setOriginalImageWidth] = useState<number | undefined>();
    const [originalImageHeight, setOriginalImageHeight] = useState<number | undefined>();
    const [borderWidth, setBorderWidth] = useState<number>(0);
    const [backgroundSpacing, setBackgroundSpacing] = useState<number>(0);
    const [backgroundColor, setBackgroundColor] = useState<string>("#fff");
    const [borderColor, setBorderColor] = useState<string>("#000");
    const [borderOnlyMode, setBorderOnlyMode] = useState(false);
    const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
    const canvasRef = useRef<CanvasHandle>(null);

    const [borderExpanded, setBorderExpanded] = useState(true);
    const [backgroundExpanded, setBackgroundExpanded] = useState(true);

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("");

    const pickImage = async () => {
        // Request permission first
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission required", "We need access to your photos to select an image.");
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            const imageUri = result.assets[0].uri;
            setSelectedImage(imageUri);
            setBorderWidth(0);
            setBackgroundSpacing(0);
            setAspectRatio(imageAspectRatio);
            setSelectedAspectRatio(0);
            // Get image dimensions to calculate aspect ratio automatically
            Image.getSize(
                imageUri,
                (width, height) => {
                    const aspectRatio = width / height;
                    setImageAspectRatio(aspectRatio);
                    setAspectRatio(aspectRatio);
                    setOriginalImageWidth(width);
                    setOriginalImageHeight(height);
                    console.log(
                        "Image dimensions:",
                        width,
                        "x",
                        height,
                        "Aspect ratio:",
                        aspectRatio
                    );
                },
                (error) => {
                    console.error("Error getting image dimensions:", error);
                    // Fallback to square aspect ratio if we can't get dimensions
                    setImageAspectRatio(1);
                    setOriginalImageWidth(undefined);
                    setOriginalImageHeight(undefined);
                }
            );
        }
    };

    const [aspectRatio, setAspectRatio] = useState(imageAspectRatio);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | null>(null);
    const previousAspectRatioRef = useRef<number>(aspectRatio);

    const handleExport = async () => {
        if (!selectedImage) {
            Alert.alert("No Image", "Please select an image first!");
            return;
        }

        setIsLoading(true);
        setLoadingProgress(0);
        setLoadingMessage("Initializing...");

        // Give the UI time to show the loader
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            const success = await canvasRef.current?.exportToPhotoLibrary((progress: number) => {
                setLoadingProgress(progress);

                // Update message based on progress
                if (progress < 30) {
                    setLoadingMessage("Preparing image...");
                } else if (progress < 60) {
                    setLoadingMessage("Processing image...");
                } else if (progress < 90) {
                    setLoadingMessage("Creating final image...");
                } else {
                    setLoadingMessage("Saving to photo library...");
                }
            });

            if (success) {
                setLoadingMessage("Capturing for sharing...");
                const capturedUri = await canvasRef.current?.captureImage();
                setCapturedImageUri(capturedUri || null);

                // Small delay to show completion
                setTimeout(() => {
                    setIsLoading(false);
                    Alert.alert("Success", "Image saved to your photo library!");
                }, 500);
            } else {
                setIsLoading(false);
                Alert.alert("Error", "Failed to save image. Please try again.");
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert("Error", "Failed to save image. Please try again.");
        }
    };

    const handleShare = async () => {
        if (!selectedImage) {
            Alert.alert("No Image", "Please create an image first!");
            return;
        }

        setIsLoading(true);
        setLoadingProgress(0);
        setLoadingMessage("Initializing...");

        // Give the UI time to show the loader
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
            // Capture the current canvas state for sharing
            const capturedUri = await canvasRef.current?.captureImage((progress: number) => {
                setLoadingProgress(progress);
                if (progress < 50) {
                    setLoadingMessage("Preparing image for sharing...");
                } else {
                    setLoadingMessage("Almost ready...");
                }
            });

            if (capturedUri) {
                setCapturedImageUri(capturedUri);
            }

            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            Alert.alert("Error", "Failed to prepare image for sharing.");
        }
    };

    const ratios = {
        original: imageAspectRatio,
        "1:1": 1 / 1,
        "4:5": 4 / 5,
        "5:4": 5 / 4,
        "9:16": 9 / 16,
        "2:1": 2 / 1,
        "2:3": 2 / 3,
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: GlobalColors.backgroundColor,
                padding: GlobalSizes.spacingSize * 1.5,
            }}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* <Canvas
                    ref={canvasRef}
                    aspectRatio={aspectRatio}
                    image={selectedImage}
                    imageAspectRatio={imageAspectRatio}
                    originalImageWidth={originalImageWidth}
                    originalImageHeight={originalImageHeight}
                    backgroundSpacing={backgroundSpacing}
                    borderWidth={borderWidth}
                    borderColor={borderColor}
                    backgroundColor={backgroundColor}
                    borderOnly={borderOnlyMode}
                /> */}

                <SkiaCanvas
                    ref={canvasRef}
                    aspectRatio={aspectRatio}
                    image={selectedImage}
                    imageAspectRatio={imageAspectRatio}
                    originalImageWidth={originalImageWidth}
                    originalImageHeight={originalImageHeight}
                    backgroundSpacing={backgroundSpacing}
                    borderWidth={borderWidth}
                    borderColor={borderColor}
                    backgroundColor={backgroundColor}
                    borderOnly={borderOnlyMode}
                />
                <SpacingContainer />

                <TouchableOpacity
                    onPress={pickImage}
                    style={{
                        backgroundColor: "#007AFF",
                        padding: 15,
                        borderRadius: 10,
                        alignItems: "center",
                    }}
                >
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                        {selectedImage ? "Change Image" : "Select Image from Camera Roll"}
                    </Text>
                </TouchableOpacity>

                {selectedImage && (
                    <TouchableOpacity
                        onPress={handleExport}
                        style={{
                            backgroundColor: "#34C759",
                            padding: 15,
                            borderRadius: 10,
                            alignItems: "center",
                            marginTop: 10,
                        }}
                    >
                        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                            Save to Photo Library
                        </Text>
                    </TouchableOpacity>
                )}

                {selectedImage && (
                    <ShareButton
                        onCaptureAndShare={async () => {
                            const capturedUri = await canvasRef.current?.captureImage();
                            return capturedUri || null;
                        }}
                    />
                )}
                <SpacingContainer />

                {/* border settings */}
                <View style={{ zIndex: 1 }}>
                    <TouchableOpacity
                        onPress={() => setBorderExpanded((prev) => !prev)}
                        style={{
                            backgroundColor: GlobalColors.menuColor,
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 4,
                            borderColor: GlobalColors.grey,
                            borderWidth: 1,
                        }}
                    >
                        <Text style={{ fontWeight: "600" }}>
                            {borderExpanded ? "▼ Border Settings" : "▶ Border Settings"}
                        </Text>

                        {borderExpanded && (
                            <View>
                                <SpacingContainerSmall />
                                <View>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Text>Border thickness</Text>
                                        <Text>{borderWidth}</Text>
                                    </View>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                        }}
                                    >
                                        <Slider
                                            minimumValue={0}
                                            maximumValue={25}
                                            lowerLimit={0}
                                            upperLimit={25}
                                            onValueChange={setBorderWidth}
                                            value={borderWidth}
                                            step={1}
                                            tapToSeek
                                            style={{ width: "100%" }}
                                        />
                                    </View>
                                </View>
                                <SpacingContainerSmall />

                                <ColorPickerWithSwatches
                                    initialColor={borderColor}
                                    onColorChange={setBorderColor}
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!borderOnlyMode) {
                                            // Enable border-only mode
                                            setBackgroundSpacing(0);
                                            setBorderWidth(0);

                                            previousAspectRatioRef.current = aspectRatio;
                                            setAspectRatio(imageAspectRatio);
                                        } else {
                                            setBorderWidth(0);
                                            setAspectRatio(previousAspectRatioRef.current);
                                        }
                                        // Toggle mode
                                        setBorderOnlyMode((prev) => !prev);
                                    }}
                                    style={{
                                        backgroundColor: borderOnlyMode ? "#34C759" : "#000",
                                        paddingVertical: 12,
                                        paddingHorizontal: 16,
                                        borderRadius: 8,
                                        alignItems: "center",
                                        marginTop: 10,
                                    }}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                                        {borderOnlyMode ? "Border Only Enabled" : "Use Border Only"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <SpacingContainer />

                {/* background settings */}
                <View>
                    <TouchableOpacity
                        onPress={() => setBackgroundExpanded((prev) => !prev)}
                        style={{
                            backgroundColor: GlobalColors.menuColor,
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 4,
                            borderColor: GlobalColors.grey,
                            borderWidth: 1,
                        }}
                    >
                        <Text style={{ fontWeight: "600", opacity: borderOnlyMode ? 0.5 : 1 }}>
                            {backgroundExpanded ? "▼ Border Settings" : "▶ Border Settings"}
                        </Text>

                        {backgroundExpanded && (
                            <View>
                                <SpacingContainerSmall />
                                <View>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            opacity: borderOnlyMode ? 0.5 : 1,
                                        }}
                                    >
                                        <Text>Background spacing</Text>
                                        <Text>{backgroundSpacing}</Text>
                                    </View>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                        }}
                                    >
                                        <Slider
                                            minimumValue={0}
                                            maximumValue={100}
                                            lowerLimit={0}
                                            upperLimit={100}
                                            onValueChange={setBackgroundSpacing}
                                            value={backgroundSpacing}
                                            step={1}
                                            tapToSeek
                                            disabled={borderOnlyMode}
                                            style={{ width: "100%" }}
                                        />
                                    </View>
                                </View>
                                <SpacingContainerSmall />

                                <ColorPickerWithSwatches
                                    initialColor={backgroundColor}
                                    onColorChange={setBackgroundColor}
                                    borderOnly={borderOnlyMode}
                                />
                            </View>
                        )}
                    </TouchableOpacity>

                    <SpacingContainer />
                </View>

                <FlatList
                    data={Object.entries(ratios).map(([key, ratio]) => ({ key, ratio }))}
                    keyExtractor={(item) => item.key}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={{
                        flexDirection: "row",
                        flexGrow: 1,
                        gap: 16,
                        justifyContent: "space-around",
                    }}
                    renderItem={({ item, index }) =>
                        item.key === "original" ? (
                            <TouchableOpacity
                                key={item.key}
                                style={{
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                                onPress={() => {
                                    if (selectedImage) {
                                        setAspectRatio(item.ratio);
                                        setSelectedAspectRatio(index);
                                    }
                                }}
                            >
                                <View
                                    style={{
                                        height: GlobalSizes.spacingSize * 2,
                                        width: GlobalSizes.spacingSize * 2,
                                        backgroundColor:
                                            selectedAspectRatio === index
                                                ? GlobalColors.selectedBg
                                                : "transparent",
                                        borderWidth: 2,
                                        borderColor:
                                            selectedAspectRatio === index
                                                ? GlobalColors.selected
                                                : GlobalColors.black,
                                        aspectRatio: 1,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <AntDesign
                                        name="close"
                                        size={GlobalSizes.spacingSize * 1.5}
                                        color={
                                            selectedAspectRatio === index
                                                ? GlobalColors.selected
                                                : GlobalColors.black
                                        }
                                    />
                                </View>
                                <Text>{item.key}</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                key={item.key}
                                style={{
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                                onPress={() => {
                                    if (selectedImage) {
                                        setAspectRatio(item.ratio);
                                        setSelectedAspectRatio(index);
                                    }
                                }}
                            >
                                <View
                                    style={[
                                        {
                                            height: GlobalSizes.spacingSize * 2,
                                            width: GlobalSizes.spacingSize * 2,
                                            backgroundColor:
                                                selectedAspectRatio === index
                                                    ? GlobalColors.selectedBg
                                                    : GlobalColors.grey,
                                            borderWidth: 2,
                                            borderColor:
                                                selectedAspectRatio === index
                                                    ? GlobalColors.selected
                                                    : GlobalColors.black,
                                            aspectRatio: item.ratio,
                                        },
                                    ]}
                                />
                                <Text>{item.key}</Text>
                            </TouchableOpacity>
                        )
                    }
                ></FlatList>
            </ScrollView>

            <LoadingOverlay
                visible={isLoading}
                progress={loadingProgress}
                message={loadingMessage}
            />
        </View>
    );
};
