import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
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

  if (loading) return <View style={s.center}><ActivityIndicator color="#fff" size="large" /></View>;
  if (!user) return <AuthScreen />;
  return <ChatScreen user={user} />;
}

// ================= ЭКРАН ВХОДА =================
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState('register');

  const handleAuth = async () => {
  if (!email || !pass) return Alert.alert('Ошибка', 'Заполните все поля');
  try {
    if (mode === 'register') {
      // Создаем аккаунт
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      // Сохраняем в базу данных с ролью "user"
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: email,
        role: "user",
        blocked: false,
        createdAt: new Date().toISOString()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (e) {
    Alert.alert('Ошибка', e.message);
  }
};

  return (
    <View style={s.authContainer}>
      <Text style={s.titleLogo}>Stas GPT</Text>
      <Text style={s.subtitle}>{mode === 'register' ? "Создать аккаунт" : "Вход"}</Text>

      <TextInput style={s.input} placeholder="Почта" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Пароль" placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />

      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}>
        <Text style={s.btnText}>{mode === 'register' ? "Зарегистрироваться" : "Войти"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
        <Text style={s.linkText}>{mode === 'register' ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ================= ЭКРАН ЧАТА (Интерфейс Grok) =================
function ChatScreen({ user }) {
  const [selectedModel, setSelectedModel] = useState('fast'); 
  const [messages, setMessages] = useState([{ text: "Привет! Чем могу помочь?", user: false }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const scrollRef = useRef();

  const models = [
    { id: 'beta', name: 'Build', desc: 'Создание приложений', icon: 'construct-outline' },
    { id: 'heavy', name: 'Тяжёлый', desc: 'Группа экспертов', icon: 'people-outline' },
    { id: 'expert', name: 'Эксперт', desc: 'Глубокое размышление', icon: 'bulb-outline' },
    { id: 'fast', name: 'Быстрый', desc: 'Быстрые ответы', icon: 'flash-outline' },
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

    // Отправляем на сервер
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
      
      {/* HEADER (Шапка) */}
      <View style={s.header}>
        <TouchableOpacity><Ionicons name="menu" size={28} color="#fff" /></TouchableOpacity>
        <View style={s.headerCenter}>
           <View style={s.avatarCircle}><Ionicons name="person" size={18} color="#fff" /></View>
           <Text style={s.headerTitle}>stas maxim</Text>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}><Ionicons name="chevron-forward-double" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {/* CHAT AREA (Сообщения) */}
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}}>
        {messages.map((m, i) => (
          <View key={i} style={[s.messageWrapper, m.user ? s.userWrapper : s.botWrapper]}>
            {m.image && <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={s.msgImage} />}
            <Text style={m.user ? s.userText : s.botText}>{m.text}</Text>
          </View>
        ))}
        {isLoading && <ActivityIndicator color="#888" style={{ marginTop: 10, alignSelf: 'flex-start', marginLeft: 20 }} />}
      </ScrollView>

      {/* INPUT AREA (Нижняя панель) */}
      <View style={s.inputContainer}>
        {image && (
          <View style={s.previewContainer}>
            <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={s.previewImage} />
            <TouchableOpacity onPress={() => setImage(null)} style={s.removeImageBtn}>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.inputRow}>
          {/* Кнопка Плюс */}
          <TouchableOpacity style={s.iconBtnCircle} onPress={() => setShowAttachmentMenu(true)}>
            <Ionicons name="add" size={24} color="#fff" />
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
            <Ionicons name={currentModelObj.icon} size={14} color="#fff" style={{marginRight: 4}} />
            <Text style={s.modelSelectorText}>{currentModelObj.name.split(' ')[0]}</Text>
            <Ionicons name="chevron-down" size={12} color="#888" style={{marginLeft: 4}} />
          </TouchableOpacity>

          {/* Кнопка Микрофона */}
          <TouchableOpacity style={s.iconBtnPlain}>
            <Ionicons name="mic-outline" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Кнопка Отправить */}
          <TouchableOpacity style={[s.sendBtnCircle, (!input.trim() && !image) && {opacity: 0.5}]} onPress={send} disabled={isLoading || (!input.trim() && !image)}>
            <Ionicons name="arrow-up" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= МОДАЛЬНОЕ ОКНО: ВЛОЖЕНИЯ ================= */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentMenu(false)}>
          <View style={s.floatingMenuLeft}>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(true)}>
              <Ionicons name="camera-outline" size={22} color="#fff" style={s.menuIcon} />
              <Text style={s.menuItemText}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(false)}>
              <Ionicons name="image-outline" size={22} color="#fff" style={s.menuIcon} />
              <Text style={s.menuItemText}>Галерея</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="document-outline" size={22} color="#fff" style={s.menuIcon} />
              <Text style={s.menuItemText}>Файлы</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="apps-outline" size={22} color="#fff" style={s.menuIcon} />
              <Text style={s.menuItemText}>Навыки</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="grid-outline" size={22} color="#fff" style={s.menuIcon} />
              <Text style={s.menuItemText}>Коннекторы</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= МОДАЛЬНОЕ ОКНО: ВЫБОР МОДЕЛИ ================= */}
      <Modal visible={showModelMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModelMenu(false)}>
          <View style={s.floatingMenuBottom}>
            {models.map((m) => (
              <TouchableOpacity key={m.id} style={s.modelMenuItem} onPress={() => { setSelectedModel(m.id); setShowModelMenu(false); }}>
                <Ionicons name={m.icon} size={24} color="#fff" style={s.menuIcon} />
                <View style={{flex: 1}}>
                  <Text style={s.modelMenuTitle}>{m.name}</Text>
                  <Text style={s.modelMenuDesc}>{m.desc}</Text>
                </View>
                {selectedModel === m.id && <Ionicons name="checkmark" size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ================= СТИЛИ =================
const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  // Авторизация
  authContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
  titleLogo: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1c1c1e', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  mainBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 14 },

  // Чат (Основной)
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  
  // Сообщения
  chatArea: { flex: 1, paddingHorizontal: 15 },
  messageWrapper: { padding: 14, marginVertical: 4, maxWidth: '85%' },
  userWrapper: { backgroundColor: '#1c1c1e', alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 4 },
  botWrapper: { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingHorizontal: 5 },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  botText: { color: '#e0e0e0', fontSize: 16, lineHeight: 24 },
  msgImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },

  // Панель ввода
  inputContainer: { paddingHorizontal: 12, paddingBottom: 25, paddingTop: 10, backgroundColor: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderRadius: 30, padding: 6, gap: 6 },
  iconBtnCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  iconBtnPlain: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 5 },
  modelSelectorBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  modelSelectorText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  sendBtnCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  // Превью фото
  previewContainer: { padding: 10, alignSelf: 'flex-start' },
  previewImage: { width: 60, height: 60, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#333', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000' },

  // Модальные окна
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  
  floatingMenuLeft: { backgroundColor: '#1c1c1e', position: 'absolute', bottom: 100, left: 15, borderRadius: 20, paddingVertical: 10, width: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 15 },
  menuIcon: { marginRight: 5 },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#333', marginVertical: 5, marginHorizontal: 15 },

  floatingMenuBottom: { backgroundColor: '#1c1c1e', position: 'absolute', bottom: 90, right: 15, left: 15, borderRadius: 24, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  modelMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, gap: 15, borderRadius: 16 },
  modelMenuTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modelMenuDesc: { color: '#888', fontSize: 13, marginTop: 2 },
});
