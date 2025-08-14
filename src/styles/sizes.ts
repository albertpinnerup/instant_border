import { Dimensions, Platform } from "react-native";

export const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const BASE_WIDTH = 375; // iPhone 13 Mini width
const BASE_HEIGHT = 812; // iPhone 13 Mini height

export const scaleWidth = SCREEN_WIDTH / BASE_WIDTH;
export const scaleHeight = SCREEN_HEIGHT / BASE_HEIGHT;

export const GlobalSizes = {
    //height:
    spacingSize: 16 * scaleHeight,
    spacingSizeSmall: 8 * scaleHeight,
    statusBarSize: 44 * scaleHeight,
};
