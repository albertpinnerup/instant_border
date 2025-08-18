// ColorPickerComponent.tsx

import { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import ColorPicker from "react-native-color-picker-ios";
import { GlobalColors } from "../../styles/colors";
import { GlobalSizes } from "../../styles/sizes";

interface Props {
    initialColor?: string;
    borderOnly?: boolean;
    onColorChange?: (color: string) => void;
}

export const ColorPickerComponent: React.FC<Props> = ({ initialColor = "#fff", onColorChange }) => {
    const [selectedColor, setSelectedColor] = useState<string>(initialColor);

    const handlePress = () => {
        ColorPicker.showColorPicker(
            { supportsAlpha: true, initialColor: selectedColor },
            (color) => {
                if (color) {
                    setSelectedColor(color);
                    onColorChange?.(color); // pass to parent
                }
            }
        );
    };

    return (
        <View>
            <TouchableOpacity onPress={handlePress}>
                <Image source={require("../../../assets/Gradient.png")} />
            </TouchableOpacity>
        </View>
    );
};

export const ColorPickerWithSwatches: React.FC<Props> = ({
    initialColor = "#fff",
    onColorChange,
    borderOnly = false,
}) => {
    const [selectedColor, setSelectedColor] = useState<string>(initialColor);
    const [swatches, setSwatches] = useState<string[]>([
        "#FFFFFF",
        "#000000",
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
    ]);

    const handleSwatchPress = (color: string) => {
        handleNewColor(color);
    };

    const handlePressPicker = () => {
        ColorPicker.showColorPicker(
            { supportsAlpha: true, initialColor: selectedColor },
            (color) => {
                if (color) {
                    handleNewColor(color);
                }
            }
        );
    };

    const handleNewColor = (color: string) => {
        setSelectedColor(color);
        onColorChange?.(color);

        if (!swatches.includes(color)) {
            setSwatches((prev) => [color, ...prev].slice(0, 8));
        }
    };

    return (
        <View
            style={{
                flexDirection: "row",
                gap: GlobalSizes.spacingSizeSmall,
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <TouchableOpacity
                onPress={handlePressPicker}
                style={{ paddingLeft: 2, opacity: borderOnly ? 0.5 : 1, alignSelf: "flex-start" }}
            >
                <Image source={require("assets/Gradient.png")} />
            </TouchableOpacity>
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: GlobalSizes.spacingSizeSmall,
                }}
            >
                {swatches.map((color) => (
                    <View
                        key={color}
                        style={{
                            width: 28, // Fixed outer size
                            height: 28,
                            borderRadius: 16,
                            borderWidth: color === selectedColor ? 2 : 0,
                            borderColor: GlobalColors.black,
                            opacity: borderOnly ? 0.5 : 1,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => handleSwatchPress(color)}
                            style={{
                                backgroundColor: color,
                                width: color === selectedColor ? 18 : 28, // Smaller when selected for padding
                                height: color === selectedColor ? 18 : 28,
                                borderRadius: color === selectedColor ? 12 : 14,
                            }}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};
