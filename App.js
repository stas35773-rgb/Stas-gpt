import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import Markdown from 'react-native-markdown-display';

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
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
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

// ================= ЭКРАН ЧАТА =================
function ChatScreen({ user }) {
  // --- ИСТОРИЯ ЧАТОВ ---
  const [chats, setChats] = useState([
    { id: '1', title: 'Новый чат', messages: [{ text: "Привет! Чем могу помочь?", user: false }] }
  ]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [showSidebar, setShowSidebar] = useState(false);

  // --- ВВОД И МОДЕЛИ ---
  const [selectedModel, setSelectedModel] = useState('fast'); 
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const scrollRef = useRef();

  // --- ЗАПИСЬ ГОЛОСА ---
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat ? activeChat.messages : [];

  const models = [
    { id: 'beta', name: 'Build', desc: 'Создание приложений', icon: 'construct-outline' },
    { id: 'heavy', name: 'Тяжёлый', desc: 'Группа экспертов', icon: 'people-outline' },
    { id: 'expert', name: 'Эксперт', desc: 'Глубокое размышление', icon: 'bulb-outline' },
    { id: 'fast', name: 'Быстрый', desc: 'Быстрые ответы', icon: 'flash-outline' },
  ];

  // Создать новый чат
  const createNewChat = () => {
    const newId = Date.now().toString();
    const newChat = { id: newId, title: 'Новый чат', messages: [{ text: "Привет! Чем могу помочь?", user: false }] };
    setChats([newChat, ...chats]);
    setActiveChatId(newId);
    setShowSidebar(false);
  };

  // Обновить сообщения в текущем чате
  const updateMessages = (newMessages) => {
    setChats(prevChats => prevChats.map(c => 
      c.id === activeChatId ? { ...c, messages: newMessages } : c
    ));
  };

  // --- ФУНКЦИИ МИКРОФОНА ---
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      } else {
        Alert.alert('Доступ запрещен', 'Разрешите использование микрофона в настройках телефона.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Аудио сохранено:', uri);
    Alert.alert('Запись остановлена', 'Функция перевода голоса в текст появится в следующем обновлении!');
  }

  // --- ВЫБОР ФОТО ---
  const pickImage = async (useCamera = false) => {
    setShowAttachmentMenu(false);
    let result = await (useCamera 
      ? ImagePicker.launchCameraAsync({ quality: 0.5, base64: true })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true })
    );
    if (!result.canceled) setImage(result.assets[0].base64);
  };

  // --- ОТПРАВКА СООБЩЕНИЯ ---
  const send = async () => {
    if ((!input.trim() && !image) || isLoading) return;
    
    const userMsg = input;
    const currentImage = image;
    
    const newMessages = [...messages, { text: userMsg || "Анализ фото...", image: currentImage, user: true }];
    updateMessages(newMessages);
    
    if (messages.length === 1 && messages[0].text === "Привет! Чем могу помочь?") {
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: userMsg.slice(0, 20) || "Фото" } : c));
    }

    setInput('');
    setImage(null);
    setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);

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
        updateMessages([...newMessages, { text: data.answer, user: false }]);
      } else {
        updateMessages([...newMessages, { text: "Ошибка: " + (data.error || "пустой ответ"), user: false }]);
      }
    } catch (e) {
      updateMessages([...newMessages, { text: "Ошибка сети (Сервер просыпается): " + e.message, user: false }]);
    }
    setIsLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const currentModelObj = models.find(m => m.id === selectedModel) || models[3];

  return (
    <SafeAreaView style={s.container}>
      
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => setShowSidebar(true)}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
           <Text style={s.headerTitle} numberOfLines={1}>{activeChat?.title}</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={() => signOut(auth)}>
          <Ionicons name="chevron-forward-double" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CHAT AREA */}
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}}>
        {messages.map((m, i) => (
          <View key={i} style={[s.messageWrapper, m.user ? s.userWrapper : s.botWrapper]}>
            {m.image && <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={s.msgImage} />}
            {m.user ? (
              <Text style={s.userText}>{m.text}</Text>
            ) : (
              <Markdown style={markdownStyles}>{m.text}</Markdown>
            )}
          </View>
        ))}
        {isLoading && <ActivityIndicator color="#888" style={{ marginTop: 10, alignSelf: 'flex-start', marginLeft: 20 }} />}
      </ScrollView>

      {/* INPUT AREA */}
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
          <TouchableOpacity style={s.iconBtnSquare} onPress={() => setShowAttachmentMenu(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>

          <TextInput 
            style={s.textInput} 
            value={input} 
            onChangeText={setInput} 
            placeholder="Спросить..." 
            placeholderTextColor="#888" 
            multiline 
          />

          <TouchableOpacity style={s.modelSelectorBtn} onPress={() => setShowModelMenu(true)}>
            <Ionicons name={currentModelObj.icon} size={16} color="#fff" style={{marginRight: 4}} />
            <Text style={s.modelSelectorText}>{currentModelObj.name.split(' ')[0]}</Text>
            <Ionicons name="chevron-down" size={12} color="#888" style={{marginLeft: 4}} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.iconBtnPlain, isRecording && { backgroundColor: '#f87171', borderRadius: 19 }]} 
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons name={isRecording ? "stop" : "mic-outline"} size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.sendBtnCircle, (!input.trim() && !image) && {opacity: 0.5}]} onPress={send} disabled={isLoading || (!input.trim() && !image)}>
            <Ionicons name="arrow-up" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SIDEBAR (ИСТОРИЯ) */}
      <Modal visible={showSidebar} transparent animationType="fade">
        <View style={s.sidebarOverlay}>
          <View style={s.sidebarContent}>
            <View style={s.sidebarHeader}>
              <Text style={s.sidebarTitle}>История</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={s.newChatBtn} onPress={createNewChat}>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={s.newChatText}>Новый чат</Text>
            </TouchableOpacity>

            <ScrollView>
              {chats.map(chat => (
                <TouchableOpacity 
                  key={chat.id} 
                  style={[s.historyItem, activeChatId === chat.id && s.historyItemActive]}
                  onPress={() => { setActiveChatId(chat.id); setShowSidebar(false); }}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#888" style={{marginRight: 10}} />
                  <Text style={s.historyText} numberOfLines={1}>{chat.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowSidebar(false)} />
        </View>
      </Modal>

      {/* ATTACHMENTS */}
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
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODELS */}
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

    </SafeAreaView>
  );
}

// ================= СТИЛИ ДЛЯ MARKDOWN =================
const markdownStyles = {
  body: { color: '#e0e0e0', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#fff' },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: 0, marginBottom: 10 },
  link: { color: '#6ee7b7' },
  code_inline: { backgroundColor: '#2c2c2e', color: '#f87171', paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#1c1c1e', padding: 10, borderRadius: 8, color: '#fff' },
  fence: { backgroundColor: '#1c1c1e', padding: 10, borderRadius: 8, color: '#fff' },
  list_item: { marginBottom: 5 },
};

// ================= СТИЛИ ПРИЛОЖЕНИЯ =================
const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  authContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
  titleLogo: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1c1c1e', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  mainBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 14 },

  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15 },
  headerBtn: { padding: 5 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },

  chatArea: { flex: 1, paddingHorizontal: 15 },
  messageWrapper: { padding: 14, marginVertical: 4, maxWidth: '85%' },
  userWrapper: { backgroundColor: '#1c1c1e', alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 4 },
  botWrapper: { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingHorizontal: 5 },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  msgImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },

  inputContainer: { paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 10 : 25, paddingTop: 10, backgroundColor: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderRadius: 30, padding: 6, gap: 6 },
  iconBtnSquare: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 5 },
  modelSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c2c2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  modelSelectorText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  iconBtnPlain: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  sendBtnCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  previewContainer: { padding: 10, alignSelf: 'flex-start' },
  previewImage: { width: 60, height: 60, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#333', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000' },

  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row' },
  sidebarContent: { width: '75%', backgroundColor: '#111', height: '100%', paddingTop: 50, paddingHorizontal: 15 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  newChatText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10, marginBottom: 5 },
  historyItemActive: { backgroundColor: '#2c2c2e' },
  historyText: { color: '#fff', fontSize: 15, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  floatingMenuLeft: { backgroundColor: '#1c1c1e', position: 'absolute', bottom: 90, left: 15, borderRadius: 20, paddingVertical: 10, width: 200 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 15 },
  menuIcon: { marginRight: 5 },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  floatingMenuBottom: { backgroundColor: '#1c1c1e', position: 'absolute', bottom: 90, right: 15, left: 15, borderRadius: 24, padding: 10 },
  modelMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, gap: 15, borderRadius: 16 },
  modelMenuTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modelMenuDesc: { color: '#888', fontSize: 13, marginTop: 2 },
});
