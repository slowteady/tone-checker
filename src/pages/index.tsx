import { createRoute } from '@granite-js/react-native';
import { TextButton } from '@toss/tds-react-native';
import { SafeArea } from '@toss/tds-react-native/private';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const goToAboutPage = () => {};

  return <></>;
}
