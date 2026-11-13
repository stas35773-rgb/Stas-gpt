import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://stas-gpt.onrender.com';

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
  const [mode, setMode] = useState('register');
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
  const [selectedModel, setSelectedModel] = useState('fast'); 
  const [messages, setMessages] = useState([{ text: "Привет! Я Stas GPT. Чем помочь?", user: false }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  
  // Состояния для модальных окон (меню)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const scrollRef = useRef();

  const models = [
    { id: 'beta', name: 'Build (Beta)', desc: 'Создание приложений', icon: '🛠' },
    { id: 'heavy', name: 'Тяжёлый', desc: 'Группа экспертов', icon: '🧠' },
    { id: 'expert', name: 'Эксперт', desc: 'Глубокое размышление', icon: '💡' },
    { id: 'fast', name: 'Быстрый', desc: 'Быстрые ответы', icon: '⚡' }
  ];

  const pickImage = async (useCamera = false) => {
    setShowAttachmentMenu(false);
    let result = await (useCamera 
      ? ImagePicker.launchCameraAsync({ quality: 0.5, base64: true })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true })
    );
    if (!result.canceled) setImage(result.assets[0].base64);
  };

  const send = async () => {
    if ((!input.trim() && !image) || isLoading) return;
    
    const userMsg = input;
    const currentImage = image;
    
    setMessages(prev => [...prev, { text: userMsg || "Анализ фото...", image: currentImage, user: true }]);
    setInput('');
    setImage(null);
    setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);

    // Преобразуем выбранную модель в формат, который понимает наш сервер
    const backendModel = (selectedModel === 'fast' || selectedModel === 'beta') ? 'beta' : 'v1';

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg || "Что на фото?", 
          images: currentImage ? [currentImage] : [],
          model: backendModel 
        })
      });
      const data = await response.json();
      
      if (data.answer) {
        setMessages(prev => [...prev, { text: data.answer, user: false }]);
      } else {
        setMessages(prev => [...prev, { text: "Ошибка: " + (data.error || "пустой ответ"), user: false }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { text: "Ошибка сети (Сервер просыпается, подожди минуту): " + e.message, user: false }]);
    }
    setIsLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const currentModelObj = models.find(m => m.id === selectedModel) || models[3];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* HEADER */}
      <View style={s.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
          <TouchableOpacity><Text style={{fontSize: 24, color: '#fff'}}>☰</Text></TouchableOpacity>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
             <View style={s.avatarCircle}><Text style={{fontSize: 20}}>👤</Text></View>
             <Text style={s.headerTitle}>stas maxim</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}><Text style={s.logout}>&gt;&gt;</Text></TouchableOpacity>
      </View>

      {/* CHAT AREA */}
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={{paddingBottom: 20}}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.user ? s.userBubble : s.botBubble]}>
            {m.image && <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={s.msgImage} />}
            <Text style={{ color: '#fff', fontSize: 16 }}>{m.text}</Text>
          </View>
        ))}
        {isLoading && <ActivityIndicator color="#6ee7b7" style={{ marginTop: 10 }} />}
      </ScrollView>

      {/* INPUT AREA */}
      <View style={s.inputContainer}>
        {/* Прикрепленное фото */}
        {image && (
          <View style={s.previewContainer}>
            <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={s.previewImage} />
            <TouchableOpacity onPress={() => setImage(null)} style={s.removeImageBtn}>
              <Text style={{ color: '#fff', fontSize: 12 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.inputRow}>
          {/* Кнопка Плюс (Вложения) */}
          <TouchableOpacity style={s.iconBtnCircle} onPress={() => setShowAttachmentMenu(true)}>
            <Text style={s.iconBtnText}>+</Text>
          </TouchableOpacity>

          {/* Поле ввода */}
          <TextInput 
            style={s.textInput} 
            value={input} 
            onChangeText={setInput} 
            placeholder="Спросить..." 
            placeholderTextColor="#888" 
            multiline 
          />

          {/* Кнопка Модели */}
          <TouchableOpacity style={s.modelSelectorBtn} onPress={() => setShowModelMenu(true)}>
            <Text style={s.modelSelectorText}>{currentModelObj.icon} {currentModelObj.name.split(' ')[0]}</Text>
            <Text style={{color: '#888', fontSize: 10}}>▼</Text>
          </TouchableOpacity>

          {/* Кнопка Голоса (заглушка) */}
          <TouchableOpacity style={s.iconBtnCircle}>
            <Text style={{fontSize: 18}}>🎤</Text>
          </TouchableOpacity>

          {/* Кнопка Отправить */}
          <TouchableOpacity style={[s.sendBtnCircle, (!input.trim() && !image) && {opacity: 0.5}]} onPress={send} disabled={isLoading || (!input.trim() && !image)}>
            <Text style={{fontSize: 18}}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= МОДАЛЬНОЕ ОКНО: ВЛОЖЕНИЯ ================= */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentMenu(false)}>
          <View style={s.floatingMenuLeft}>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(true)}>
              <Text style={s.menuItemIcon}>📸</Text>
              <Text style={s.menuItemText}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(false)}>
              <Text style={s.menuItemIcon}>🖼</Text>
              <Text style={s.menuItemText}>Галерея</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem}>
              <Text style={s.menuItemIcon}>📁</Text>
              <Text style={s.menuItemText}>Файлы</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem}>
              <Text style={s.menuItemIcon}>🧩</Text>
              <Text style={s.menuItemText}>Навыки</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= МОДАЛЬНОЕ ОКНО: ВЫБОР МОДЕЛИ ================= */}
      <Modal visible={showModelMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModelMenu(false)}>
          <View style={s.floatingMenuBottom}>
            <Text style={s.menuHeader}>Выберите модель</Text>
            {models.map((m) => (
              <TouchableOpacity key={m.id} style={s.modelMenuItem} onPress={() => { setSelectedModel(m.id); setShowModelMenu(false); }}>
                <Text style={s.menuItemIcon}>{m.icon}</Text>
                <View style={{flex: 1}}>
                  <Text style={s.modelMenuTitle}>{m.name}</Text>
                  <Text style={s.modelMenuDesc}>{m.desc}</Text>
                </View>
                {selectedModel === m.id && <Text style={{color: '#6ee7b7', fontSize: 18}}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', alignItems: 'center' },
  
  // Экран авторизации
  authContainer: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', padding: 24 },
  langRow: { flexDirection: 'row', gap: 16, position: 'absolute', top: 50, right: 24 },
  lang: { color: '#6ee7b7', fontSize: 16, fontWeight: 'bold' },
  titleLogo: { color: '#6ee7b7', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#20242c', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  mainBtn: { backgroundColor: '#6ee7b7', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f1115', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#8b93a1', textAlign: 'center', marginTop: 20 },

  // Чат (Основной интерфейс)
  container: { flex: 1, backgroundColor: '#000000' }, // Черный фон как на скрине
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#000' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  logout: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  chatArea: { flex: 1, paddingHorizontal: 15 },
  bubble: { padding: 14, borderRadius: 20, marginVertical: 6, maxWidth: '85%' },
  userBubble: { backgroundColor: '#1f6feb', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#1c1c1e', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },

  // Нижняя панель ввода
  inputContainer: { paddingHorizontal: 10, paddingBottom: 20, backgroundColor: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderRadius: 30, padding: 6, gap: 8 },
  iconBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingVertical: 8 },
  modelSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c2c2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
  modelSelectorText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sendBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  // Превью фото перед отправкой
  previewContainer: { padding: 10, alignSelf: 'flex-start' },
  previewImage: { width: 60, height: 60, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // Модальные окна и плавающие меню
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  
  floatingMenuLeft: { backgroundColor: '#2c2c2e', position: 'absolute', bottom: 90, left: 20, borderRadius: 20, padding: 10, width: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, gap: 15 },
  menuItemIcon: { fontSize: 18, color: '#fff' },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#3a3a3c', marginVertical: 5 },

  floatingMenuBottom: { backgroundColor: '#2c2c2e', position: 'absolute', bottom: 80, right: 20, left: 20, borderRadius: 20, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  menuHeader: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginLeft: 10 },
  modelMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, gap: 15, borderRadius: 12 },
  modelMenuTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modelMenuDesc: { color: '#888', fontSize: 13, marginTop: 2 },
});
