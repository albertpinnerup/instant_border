import { Text, View, TouchableOpacity, Alert } from "react-native";
import { GlobalColors } from "../styles/colors";
import { GlobalSizes, SCREEN_HEIGHT } from "../styles/sizes";
import { ScrollView } from "react-native-gesture-handler";
import { Canvas } from "../components/canvas/Canvas";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

export const MainScreen = () => {
    const [selectedImage, setSelectedImage] = useState<string | undefined>();
    const [backgroundSpacing, setBackgroundSpacing] = useState<number>(0);

    const pickImage = async () => {
        // Request permission to access media library
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "Sorry, we need camera roll permissions to select images!"
            );
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            // aspect: [1, 1], // You can adjust this or make it dynamic based on canvas aspect ratio
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    return (
        <ScrollView
            style={{
                backgroundColor: GlobalColors.backgroundColor,
            }}
            contentContainerStyle={{ padding: 20 }}
        >
            <Canvas
                aspectRatio={4 / 5}
                image={selectedImage}
                backgroundSpacing={backgroundSpacing}
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
        </ScrollView>
    );
};
