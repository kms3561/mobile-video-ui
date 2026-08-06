import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthContext';
import { AuthPrompt } from './src/auth/AuthPrompt';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { QAScreen } from './src/screens/QAScreen';
import { UploadScreen } from './src/screens/UploadScreen';
import { VideosScreen } from './src/screens/VideosScreen';
import { colors } from './src/theme';

export type RootTabParamList = {
  Videos: undefined;
  Upload: undefined;
  'Q&A': undefined;
  Messages: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    border: colors.line,
    card: colors.nav,
    primary: colors.accent,
    text: colors.text,
  },
};

function getTabIcon(
  routeName: keyof RootTabParamList,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  const icons = {
    Videos: focused ? 'play-circle' : 'play-circle-outline',
    Upload: focused ? 'add-circle' : 'add-circle-outline',
    'Q&A': focused ? 'chatbubbles' : 'chatbubbles-outline',
    Messages: focused ? 'chatbubble' : 'chatbubble-outline',
  } satisfies Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap>;

  return icons[routeName];
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.quiet,
              tabBarHideOnKeyboard: true,
              tabBarIcon: ({ color, focused, size }) => (
                <Ionicons
                  color={color}
                  name={getTabIcon(route.name, focused)}
                  size={size}
                />
              ),
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '700',
              },
              tabBarStyle: {
                backgroundColor: colors.nav,
                borderTopColor: colors.line,
                minHeight: 64,
                paddingBottom: 8,
                paddingTop: 8,
              },
            })}
          >
            <Tab.Screen name="Videos" component={VideosScreen} />
            <Tab.Screen name="Upload" component={UploadScreen} />
            <Tab.Screen name="Q&A" component={QAScreen} />
            <Tab.Screen name="Messages" component={MessagesScreen} />
          </Tab.Navigator>
          <AuthPrompt />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
