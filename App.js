import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#6ee7b7" size="large" /></View>;

  if (!user) return <AuthScreen />;

  return <ChatScreen user={user} />;
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState('register'); // 'register' или 'login'
  const [lang, setLang] = useState('ru');

  const t = lang === 'ru' ? {
    reg: "Регистрация", login: "Вход", email: "Почта", pass: "Пароль",
    btnReg: "Создать аккаунт", btnLogin: "Войти", haveAcc: "Уже есть аккаунт?", noAcc: "Нет аккаунта? Создать"
  } : {
    reg: "Registration", login: "Login", email: "Email", pass: "Password",
    btnReg: "Create account", btnLogin: "Sign in", haveAcc: "Already have an account?", noAcc: "No account? Sign up"
  };

  const handleAuth = async () => {
    if (!email || !pass) return Alert.alert('Ошибка', 'Заполните все поля');
    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <View style={s.authContainer}>
      <View style={s.langRow}>
        <TouchableOpacity onPress={() => setLang('ru')}><Text style={s.lang}>RU</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setLang('ro')}><Text style={s.lang}>RO</Text></TouchableOpacity>
      </View>
      <Text style={s.titleLogo}>Stas GPT</Text>
      <Text style={s.subtitle}>{mode === 'register' ? t.reg : t.login}</Text>

      <TextInput style={s.input} placeholder={t.email} placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={s.input} placeholder={t.pass} placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />

      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}>
        <Text style={s.btnText}>{mode === 'register' ? t.btnReg : t.btnLogin}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
        <Text style={s.linkText}>{mode === 'register' ? t.haveAcc : t.noAcc}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ChatScreen({ user }) {
  const [model, setModel] = useState('beta');
  const [messages, setMessages] = useState([{ text: "Привет! Я Stas GPT. Чем помочь?", user: false }]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, user: true }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { text: `[${model.toUpperCase()}] Это тестовый ответ. Настоящий ИИ подключим позже.`, user: false }]);
    }, 1000);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Stas GPT</Text>
        <TouchableOpacity onPress={() => signOut(auth)}><Text style={s.logout}>Выйти</Text></TouchableOpacity>
      </View>

      <ScrollView style={s.chatArea}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.user ? s.userBubble : s.botBubble]}>
            <Text style={{ color: '#fff' }}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.toolbar}>
        <TouchableOpacity style={s.iconBtn}><Text style={{ fontSize: 20 }}>📷</Text></TouchableOpacity>
        
        <View style={s.modelToggle}>
          <TouchableOpacity onPress={() => setModel('beta')} style={[s.modelBtn, model === 'beta' && s.activeModel]}>
            <Text style={s.modelText}>Beta</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModel('v1')} style={[s.modelBtn, model === 'v1' && s.activeModel]}>
            <Text style={s.modelText}>1.0</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.inputArea}>
        <TextInput style={s.chatInput} value={input} onChangeText={setInput} placeholder="Сообщение..." placeholderTextColor="#666" />
        <TouchableOpacity style={s.sendBtn} onPress={send}><Text style={{ fontWeight: 'bold' }}>Ввод</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', padding: 24 },
  langRow: { flexDirection: 'row', gap: 16, position: 'absolute', top: 50, right: 24 },
  lang: { color: '#6ee7b7', fontSize: 16, fontWeight: 'bold' },
  titleLogo: { color: '#6ee7b7', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#20242c', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  mainBtn: { backgroundColor: '#6ee7b7', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f1115', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#8b93a1', textAlign: 'center', marginTop: 20 },
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#161a22' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logout: { color: '#f87171', fontSize: 16 },
  chatArea: { flex: 1, padding: 10 },
  bubble: { padding: 12, borderRadius: 16, marginVertical: 4, maxWidth: '85%' },
  userBubble: { backgroundColor: '#1f6feb', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: '#20242c', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  toolbar: { flexDirection: 'row', padding: 10, alignItems: 'center', gap: 10, backgroundColor: '#161a22' },
  iconBtn: { backgroundColor: '#20242c', padding: 10, borderRadius: 10 },
  modelToggle: { flex: 1, flexDirection: 'row', backgroundColor: '#20242c', borderRadius: 10, padding: 4 },
  modelBtn: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 8 },
  activeModel: { backgroundColor: '#6ee7b7' },
  modelText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  inputArea: { flexDirection: 'row', padding: 10, paddingBottom: 30, backgroundColor: '#161a22', gap: 10 },
  chatInput: { flex: 1, backgroundColor: '#202424', color: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  sendBtn: { backgroundColor: '#6ee7b7', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 }
});
