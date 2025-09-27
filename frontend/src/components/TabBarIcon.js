import React from 'react';
import { Text } from 'react-native';

const TabBarIcon = ({ name, focused, color, size }) => {
  const getIcon = () => {
    switch (name) {
      case 'Home':
        return focused ? '🏠' : '🏡';
      case 'Analytics':
        return focused ? '📊' : '📈';
      case 'Profile':
        return focused ? '👤' : '👥';
      default:
        return '❓';
    }
  };

  return (
    <Text style={{ fontSize: size || 24, color }}>
      {getIcon()}
    </Text>
  );
};

export default TabBarIcon;
