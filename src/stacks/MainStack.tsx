import { createStackNavigator } from "@react-navigation/stack";
import { MainScreen } from "../screens/MainScreen";
import { SCREEN_WIDTH } from "../styles/sizes";
import HeaderStatusbarOnly from "../components/headers/HeaderStatusbarOnly";

const Stack = createStackNavigator();

export const MainStack = () => {
    return (
        <Stack.Navigator
            initialRouteName={"MainScreen"}
            screenOptions={{ gestureResponseDistance: SCREEN_WIDTH }}
        >
            <Stack.Screen
                name="MainScreen"
                component={MainScreen}
                options={{
                    header: () => HeaderStatusbarOnly(),
                }}
            />
        </Stack.Navigator>
    );
};
