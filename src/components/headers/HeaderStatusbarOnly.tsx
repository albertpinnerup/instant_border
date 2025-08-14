import { View } from "react-native";
import { GlobalSizes } from "../../styles/sizes";
import { GlobalColors } from "../../styles/colors";

export default function HeaderStatusbarOnly() {
    return (
        <View
            style={{
                height: GlobalSizes.statusBarSize,
                backgroundColor: GlobalColors.backgroundColor,
            }}
        ></View>
    );
}
