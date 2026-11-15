import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';


const API_URL = 'https://stas-gpt.onrender.com';

const translations = {
  en: { 
    appName: 'Stas GPT', login: 'Login', register: 'Register', email: 'Email', password: 'Password', 
    signIn: 'Sign In', createAcc: 'Create Account', noAcc: 'No account? Sign up', haveAcc: 'Already have an account? Log in', 
    ask: 'Ask anything...', newChat: 'New Chat', history: 'History', logout: 'Log out', camera: 'Camera', gallery: 'Gallery', 
    hello: 'Hello! How can I help you?', settings: 'Settings', language: 'Language', account: 'Account', 
    verifyTitle: 'Verify Email', verifyText: 'We sent a link to your email. Please click it.', checkBtn: 'I Verified', 
    modelTitle: 'Select Model', effort: 'Effort Level', 
    m_flash: 'Fast answers', m_pro: 'For complex answers', m_smart: 'Even smarter answers', m_expert: 'For heavy tasks', m_build: 'For app building'
  },
  ro: { 
    appName: 'Stas GPT', login: 'Conectare', register: 'Înregistrare', email: 'Email', password: 'Parolă', 
    signIn: 'Conectează-te', createAcc: 'Creează cont', noAcc: 'Nu ai cont? Înregistrează-te', haveAcc: 'Ai deja cont? Conectează-te', 
    ask: 'Întreabă orice...', newChat: 'Chat nou', history: 'Istoric', logout: 'Deconectare', camera: 'Cameră', gallery: 'Galerie', 
    hello: 'Salut! Cu ce te pot ajuta?', settings: 'Setări', language: 'Limbă', account: 'Cont', 
    verifyTitle: 'Verifică Emailul', verifyText: 'Am trimis un link pe email.', checkBtn: 'Am Verificat', 
    modelTitle: 'Alege Modelul', effort: 'Nivel de efort', 
    m_flash: 'Răspunsuri rapide', m_pro: 'Pentru răspunsuri complexe', m_smart: 'Răspunsuri și mai deștepte', m_expert: 'Pentru sarcini grele', m_build: 'Pentru crearea aplicațiilor'
  },
  ru: { 
    appName: 'Stas GPT', login: 'Вход', register: 'Регистрация', email: 'Почта', password: 'Пароль', 
    signIn: 'Войти', createAcc: 'Создать аккаунт', noAcc: 'Нет аккаунта? Создать', haveAcc: 'Уже есть аккаунт? Войти', 
    ask: 'Спросить...', newChat: 'Новый чат', history: 'История', logout: 'Выйти', camera: 'Камера', gallery: 'Галерея', 
    hello: 'Привет! Чем могу помочь?', settings: 'Настройки', language: 'Язык', account: 'Аккаунт', 
    verifyTitle: 'Подтвердите почту', verifyText: 'Мы отправили письмо.', checkBtn: 'Я подтвердил', 
    modelTitle: 'Выбор модели', effort: 'Уровень усилий', 
    m_flash: 'Быстрые ответы', m_pro: 'Для сложных ответов', m_smart: 'Ещё сложнее ответы', m_expert: 'Для тяжелых задач', m_build: 'Для создания приложений'
  }
};
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru'); 
  const t = translations[lang];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { email: u.email, role: "user", blocked: false, createdAt: new Date().toISOString() });
        }
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#fff" size="large" /></View>;
  if (!user) return <AuthScreen lang={lang} setLang={setLang} t={t} />;
  
  if (!user.emailVerified) {
    return <VerifyEmailScreen user={user} setUser={setUser} t={t} />;
  }

  return <ChatScreen user={user} lang={lang} setLang={setLang} t={t} />;
}

function VerifyEmailScreen({ user, setUser, t }) {
  const [checking, setChecking] = useState(false);

  const checkVerification = async () => {
    setChecking(true);
    try {
      await auth.currentUser.reload(); 
      if (auth.currentUser.emailVerified) {
        setUser({ ...auth.currentUser }); 
      } else {
        Alert.alert('Ошибка', 'Почта пока не подтверждена. Проверьте ссылку в письме.');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
    setChecking(false);
  };

  return (
    <View style={[s.center, { padding: 30 }]}>
      <Ionicons name="mail-unread-outline" size={80} color="#fbbf24" />
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>{t.verifyTitle}</Text>
      <Text style={{ color: '#888', fontSize: 16, marginTop: 10, textAlign: 'center', marginBottom: 30 }}>
        {t.verifyText} ({user.email})
      </Text>
      <TouchableOpacity style={[s.mainBtn, { width: '100%' }]} onPress={checkVerification} disabled={checking}>
        <Text style={s.btnText}>{checking ? '...' : t.checkBtn}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => signOut(auth)} style={{ marginTop: 20 }}>
        <Text style={{ color: '#f87171', fontSize: 16 }}>{t.logout}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuthScreen({ lang, setLang, t }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState('register');

  const handleAuth = async () => {
    if (!email || !pass) return Alert.alert('Error', 'Fill all fields');
    try {
      if (mode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCred.user.uid), { email: email, role: "user", blocked: false, createdAt: new Date().toISOString() });
        await sendEmailVerification(userCred.user);
        Alert.alert('Успех!', 'Аккаунт создан. Проверьте почту для подтверждения.');
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) { Alert.alert('Ошибка', e.message); }
  };

  return (
    <View style={s.authContainer}>
      <View style={s.langTopRow}>
        <TouchableOpacity onPress={() => setLang('en')}><Text style={[s.langText, lang === 'en' && s.langActive]}>EN</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setLang('ro')}><Text style={[s.langText, lang === 'ro' && s.langActive]}>RO</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setLang('ru')}><Text style={[s.langText, lang === 'ru' && s.langActive]}>RU</Text></TouchableOpacity>
      </View>
      <Text style={s.titleLogo}>{t.appName}</Text>
      <Text style={s.subtitle}>{mode === 'register' ? t.register : t.login}</Text>
      <TextInput style={s.input} placeholder={t.email} placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder={t.password} placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />
      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}><Text style={s.btnText}>{mode === 'register' ? t.createAcc : t.signIn}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'register' ? 'login' : 'register')}><Text style={s.linkText}>{mode === 'register' ? t.haveAcc : t.noAcc}</Text></TouchableOpacity>
    </View>
  );
}

function ChatScreen({ user, lang, setLang, t }) {
  const [chats, setChats] = useState([{ id: '1', title: t.newChat, messages: [{ text: t.hello, user: false }] }]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('liquidai/lfm3-1.7b:free'); 
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const scrollRef = useRef();
// ЗАГРУЗКА ИСТОРИИ ПРИ СТАРТЕ
useEffect(() => {
  const loadChats = async () => {
    try {
      const saved = await AsyncStorage.getItem(`@chats_${user.uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
        }
      }
    } catch (e) { console.log('Ошибка загрузки:', e); }
  };
  loadChats();
}, [user.uid]);

// СОХРАНЕНИЕ ИСТОРИИ ПРИ ИЗМЕНЕНИИ
useEffect(() => {
  const saveChats = async () => {
    try {
      await AsyncStorage.setItem(`@chats_${user.uid}`, JSON.stringify(chats));
    } catch (e) { console.log('Ошибка сохранения:', e); }
  };
  saveChats();
}, [chats, user.uid]);
  
  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat ? activeChat.messages : [];
  const models = [
  { id: 'liquidai/lfm3-1.7b:free', name: 'StasGPT-flash', desc: t.m_flash, badge: 'Fast' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'StasGPT-pro', desc: t.m_pro, badge: 'Pro' },
  { id: 'nvidia/nemotron-3.5-super-vl:free', name: 'StasGPT-smart', desc: t.m_smart, badge: 'Smart' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'StasGPT-expert', desc: t.m_expert, badge: 'Expert' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'StasGPT-build', desc: t.m_build, badge: 'Build' },
];
  const createNewChat = () => {
    const newId = Date.now().toString();
    setChats([{ id: newId, title: t.newChat, messages: [{ text: t.hello, user: false }] }, ...chats]);
    setActiveChatId(newId);
    setShowSidebar(false);
  };

  const updateMessages = (newMessages) => setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: newMessages } : c));

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording); setIsRecording(true);
      } else { Alert.alert('Error', 'Mic permission denied'); }
    } catch (err) { console.error(err); }
  }

  async function stopRecording() {
    setIsRecording(false); setRecording(undefined);
    await recording.stopAndUnloadAsync();
    setInput(prev => prev + " [Голосовое сообщение] ");
  }

  const pickImage = async (useCamera = false) => {
    setShowAttachmentMenu(false);
    let result = await (useCamera ? ImagePicker.launchCameraAsync({ quality: 0.5, base64: true }) : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true }));
    if (!result.canceled) setImage(result.assets[0].base64);
  };

  const send = async () => {
    if ((!input.trim() && !image) || isLoading) return;
    const userMsg = input; const currentImage = image;
    const newMessages = [...messages, { text: userMsg || "...", image: currentImage, user: true }];
    updateMessages(newMessages);
    if (messages.length === 1 && messages[0].text === t.hello) setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: userMsg.slice(0, 20) || "Photo" } : c));
    setInput(''); setImage(null); setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: userMsg || "Analyze", 
    images: currentImage ? [currentImage] : [], 
    model: selectedModel,
    modelString: selectedModel,
    history: messages 
  })
}); // <--- ВОТ ЗДЕСЬ НУЖНО ЗАКРЫТЬ FETCH
      const data = await response.json();
      const aiAnswer = data.answer || "Error";
      updateMessages([...newMessages, { text: aiAnswer, user: false }]);
          try { 
      await addDoc(collection(db, "messages"), { userId: user.uid, email: user.email, question: userMsg || "[Фото]", answer: aiAnswer, model: selectedModel, createdAt: serverTimestamp() }); 
    } catch (err) { 
      console.log(err); 
    }
  } catch (e) {
    updateMessages([...newMessages, { text: "Ошибка сети: " + e.message, user: false }]);
  }
  
  setIsLoading(false);
  setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
};

  const currentModelObj = models.find(m => m.id === selectedModel) || models[3];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => setShowSidebar(true)}><Ionicons name="menu" size={28} color="#fff" /></TouchableOpacity>
        <View style={s.headerCenter}><Text style={s.headerTitle} numberOfLines={1}>{activeChat?.title}</Text></View>
        <View style={{width: 40}} />
      </View>
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}}>
          {messages.map((m, i) => (
    <View key={i} style={[s.messageWrapper, m.user ? s.userWrapper : s.botWrapper]}>
      {m.image && <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={s.msgImage} />}
      <Text selectable={true} style={m.user ? s.userText : s.botText}>
        {m.text}
      </Text>
    </View>
  ))}
  {isLoading && <ActivityIndicator color="#888" style={{ marginTop: 10, alignSelf: 'flex-start', marginLeft: 20 }} />}
</ScrollView>
      <View style={s.inputContainer}>
        {image && (
          <View style={s.previewContainer}>
            <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={s.previewImage} />
            <TouchableOpacity onPress={() => setImage(null)} style={s.removeImageBtn}><Ionicons name="close" size={14} color="#fff" /></TouchableOpacity>
          </View>
        )}
        <View style={s.inputRow}>
          <TouchableOpacity style={s.iconBtnSquare} onPress={() => setShowAttachmentMenu(true)}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
          <TextInput style={s.textInput} value={input} onChangeText={setInput} placeholder={t.ask} placeholderTextColor="#888" multiline />
          <TouchableOpacity style={s.modelSelectorBtn} onPress={() => setShowModelMenu(true)}>
            <Ionicons name={currentModelObj.icon} size={16} color="#fff" style={{marginRight: 4}} />
            <Text style={s.modelSelectorText}>{currentModelObj.name.split(' ')[0]}</Text>
            <Ionicons name="chevron-down" size={12} color="#888" style={{marginLeft: 4}} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtnPlain, isRecording && { backgroundColor: '#f87171', borderRadius: 19 }]} onPress={isRecording ? stopRecording : startRecording}>
            <Ionicons name={isRecording ? "stop" : "mic-outline"} size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.sendBtnCircle, (!input.trim() && !image) && {opacity: 0.5}]} onPress={send} disabled={isLoading || (!input.trim() && !image)}>
            <Ionicons name="arrow-up" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={showSidebar} transparent animationType="fade">
        <View style={s.sidebarOverlay}>
          <View style={s.sidebarContent}>
            <View style={s.sidebarHeader}>
              <Text style={s.sidebarTitle}>{t.history}</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={s.newChatBtn} onPress={createNewChat}><Ionicons name="add" size={20} color="#000" /><Text style={s.newChatText}>{t.newChat}</Text></TouchableOpacity>
            <ScrollView style={{flex: 1}}>
              {chats.map(chat => (
                <TouchableOpacity key={chat.id} style={[s.historyItem, activeChatId === chat.id && s.historyItemActive]} onPress={() => { setActiveChatId(chat.id); setShowSidebar(false); }}>
                  <Ionicons name="chatbubble-outline" size={18} color="#888" style={{marginRight: 10}} />
                  <Text style={s.historyText} numberOfLines={1}>{chat.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.sidebarFooter}>
              <View style={s.accountInfo}>
                <View style={s.avatarMini}><Ionicons name="person" size={16} color="#fff" /></View>
                <Text style={s.accountEmail} numberOfLines={1}>{user.email}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowSidebar(false); setShowSettings(true); }} style={{padding: 5}}><Ionicons name="settings-outline" size={24} color="#fff" /></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowSidebar(false)} />
        </View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.settingsOverlay}>
          <View style={s.settingsContent}>
            <View style={s.settingsHeader}>
              <Text style={s.settingsTitle}>{t.settings}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            <Text style={s.settingsLabel}>{t.language}</Text>
            <View style={s.langRow}>
              <TouchableOpacity style={[s.langBtn, lang === 'en' && s.langBtnActive]} onPress={() => setLang('en')}><Text style={[s.langBtnText, lang === 'en' && {color: '#000'}]}>EN</Text></TouchableOpacity>
              <TouchableOpacity style={[s.langBtn, lang === 'ro' && s.langBtnActive]} onPress={() => setLang('ro')}><Text style={[s.langBtnText, lang === 'ro' && {color: '#000'}]}>RO</Text></TouchableOpacity>
              <TouchableOpacity style={[s.langBtn, lang === 'ru' && s.langBtnActive]} onPress={() => setLang('ru')}><Text style={[s.langBtnText, lang === 'ru' && {color: '#000'}]}>RU</Text></TouchableOpacity>
            </View>
            <View style={s.divider} />
            <TouchableOpacity style={s.logoutBtn} onPress={() => signOut(auth)}><Ionicons name="log-out-outline" size={22} color="#f87171" /><Text style={s.logoutBtnText}>{t.logout}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAttachmentMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentMenu(false)}>
          <View style={s.floatingMenuLeft}>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(true)}><Ionicons name="camera-outline" size={22} color="#fff" style={s.menuIcon} /><Text style={s.menuItemText}>{t.camera}</Text></TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(false)}><Ionicons name="image-outline" size={22} color="#fff" style={s.menuIcon} /><Text style={s.menuItemText}>{t.gallery}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showModelMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModelMenu(false)}>
          <View style={s.floatingMenuBottom}>
            {models.map((m) => (
              <TouchableOpacity key={m.id} style={s.modelMenuItem} onPress={() => { setSelectedModel(m.id); setShowModelMenu(false); }}>
                <Ionicons name={m.icon} size={24} color="#fff" style={s.menuIcon} />
                <View style={{flex: 1}}><Text style={s.modelMenuTitle}>{m.name}</Text><Text style={s.modelMenuDesc}>{m.desc}</Text></View>
                {selectedModel === m.id && <Ionicons name="checkmark" size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
  langTopRow: { flexDirection: 'row', gap: 15, position: 'absolute', top: 60, right: 24 },
  langText: { color: '#666', fontSize: 16, fontWeight: 'bold' }, langActive: { color: '#fff' },
  titleLogo: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1c1c1e', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  mainBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }, linkText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 14 },
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15 },
  headerBtn: { padding: 5 }, headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  chatArea: { flex: 1, paddingHorizontal: 15 },
  messageWrapper: { padding: 14, marginVertical: 4, maxWidth: '85%' },
  userWrapper: { backgroundColor: '#1c1c1e', alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 4 },
  botWrapper: { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingHorizontal: 5 },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 }, msgImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },
  botText: { color: '#ffffff', fontSize: 16, lineHeight: 24 },
  inputContainer: { paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 10 : 25, paddingTop: 10, backgroundColor: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderRadius: 30, padding: 6, gap: 6 },
  iconBtnSquare: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 5 },
  modelSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c2c2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  modelSelectorText: { color: '#fff', fontSize: 14, fontWeight: '500' }, iconBtnPlain: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  sendBtnCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  previewContainer: { padding: 10, alignSelf: 'flex-start' }, previewImage: { width: 60, height: 60, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#333', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000' },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row' },
  sidebarContent: { width: '80%', backgroundColor: '#111', height: '100%', paddingTop: 50, paddingHorizontal: 15, paddingBottom: 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  newChatText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10, marginBottom: 5 },
  historyItemActive: { backgroundColor: '#2c2c2e' },
  historyText: { color: '#fff', fontSize: 15, flex: 1 },
  sidebarFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, marginTop: 10 },
  accountInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarMini: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  accountEmail: { color: '#fff', fontSize: 14, flex: 1 },
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  settingsContent: { backgroundColor: '#1c1c1e', borderRadius: 20, padding: 20 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  settingsLabel: { color: '#888', fontSize: 14, marginBottom: 10, textTransform: 'uppercase' },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  langBtn: { flex: 1, backgroundColor: '#2c2c2e', padding: 12, borderRadius: 10, alignItems: 'center' },
  langBtnActive: { backgroundColor: '#fff' },
  langBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248, 113, 113, 0.1)', padding: 15, borderRadius: 10, gap: 10 },
  logoutBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 16 },
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
