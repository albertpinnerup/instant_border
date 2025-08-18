module.exports = {
    presets: [
        'babel-preset-expo'
    ],
    plugins: [
        [
            'react-native-iconify/babel',
            {
                icons: [
                    'mdi:home',
                ]
            }
        ],
        [
            "module-resolver", {
                "alias": {
                    "assets": "./assets"
                }
            }
        ],
        'react-native-reanimated/plugin', // This must be last
    ]
};
