import { View } from "react-native";
import { GlobalSizes } from "../../styles/sizes";
import { GlobalColors } from "../../styles/colors";

export default function HeaderWithShare() {
    return (
        <View
            style={{
                height: GlobalSizes.statusBarSize + GlobalSizes.spacingSize * 2,
                backgroundColor: GlobalColors.backgroundColor,
            }}
        ></View>
    );
}
