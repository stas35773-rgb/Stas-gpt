import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={s.container}>
      <Text style={s.text}>Stas GPT</Text>
      <Text style={s.sub}>Приложение успешно собирается!</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#6ee7b7', fontSize: 30, fontWeight: 'bold' },
  sub: { color: '#fff', fontSize: 16, marginTop: 10 }
});
