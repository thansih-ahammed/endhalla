import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/Home/HomeScreen';
import ScheduleScreen from '../screens/Schedule/ScheduleScreen';
import ClientsScreen from '../screens/Clients/ClientsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import AnimatedTabBar from '../../shared/components/AnimatedTabBar';
import { HomeIcon, CalendarIcon, UsersIcon, UserIcon } from '../../shared/components/Icons';

const Tab = createBottomTabNavigator();

const renderTabIcon = (label: string, color: string) => {
  switch (label) {
    case 'Home':
      return <HomeIcon size={20} color={color} strokeWidth={2.2} />;
    case 'Schedule':
      return <CalendarIcon size={20} color={color} strokeWidth={2.2} />;
    case 'Clients':
      return <UsersIcon size={22} color={color} strokeWidth={2.2} />;
    case 'Profile':
      return <UserIcon size={22} color={color} strokeWidth={2.2} />;
    default:
      return null;
  }
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} renderIcon={renderTabIcon} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Clients" component={ClientsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
