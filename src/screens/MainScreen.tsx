import { Text, View, TouchableOpacity, Alert, Image } from "react-native";
import { GlobalColors } from "../styles/colors";
import { GlobalSizes, SCREEN_HEIGHT } from "../styles/sizes";
import { ScrollView } from "react-native-gesture-handler";
import { Canvas, CanvasHandle } from "../components/canvas/Canvas";
import * as ImagePicker from "expo-image-picker";
import { useState, useRef } from "react";

export const MainScreen = () => {
    const [selectedImage, setSelectedImage] = useState<string | undefined>();
    const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
    const canvasRef = useRef<CanvasHandle>(null);

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

            // Get image dimensions to calculate aspect ratio automatically
            Image.getSize(
                imageUri,
                (width, height) => {
                    const aspectRatio = width / height;
                    setImageAspectRatio(aspectRatio);
                    setAspectRatio(aspectRatio);
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
                }
            );
        }
    };

    const [aspectRatio, setAspectRatio] = useState(imageAspectRatio);

    const handleExport = async () => {
        if (!selectedImage) {
            Alert.alert("No Image", "Please select an image first!");
            return;
        }

        const success = await canvasRef.current?.exportToPhotoLibrary();

        if (success) {
            Alert.alert("Success", "Canvas saved to your photo library!");
        } else {
            Alert.alert("Error", "Failed to save canvas. Please try again.");
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

    const aspectRatioHandler = () => {};

    return (
        <ScrollView
            style={{
                backgroundColor: GlobalColors.backgroundColor,
            }}
            contentContainerStyle={{ padding: 20 }}
        >
            <Canvas
                ref={canvasRef}
                aspectRatio={aspectRatio}
                image={selectedImage}
                imageAspectRatio={imageAspectRatio}
                backgroundSpacing={20}
                borderWidth={4}
                borderColor="#000"
                backgroundColor="#fff"
            />

            <TouchableOpacity
                onPress={pickImage}
                style={{
                    backgroundColor: "#007AFF",
                    padding: 15,
                    borderRadius: 10,
                    alignItems: "center",
                    marginTop: 20,
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

            <ScrollView
                horizontal={true}
                style={{ width: "100%", flexDirection: "row", justifyContent: "space-between" }}
            >
                {Object.entries(ratios).map(([key, value]) => (
                    <TouchableOpacity
                        key={key}
                        style={{
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                        onPress={() => aspectRatioHandler()}
                    >
                        <View
                            style={{
                                height: GlobalSizes.spacingSize * 2,
                                width: GlobalSizes.spacingSize * 2,
                                backgroundColor: "transparent",
                                borderWidth: 2,
                                borderColor: GlobalColors.black,
                                aspectRatio: value,
                            }}
                        />
                        <Text>{key}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </ScrollView>
    );
};
