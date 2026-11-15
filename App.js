import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://stas-gpt.onrender.com';

const translations = {
  en: { appName: 'Stas GPT', login: 'Login', register: 'Register', email: 'Email', password: 'Password', signIn: 'Sign In', createAcc: 'Create Account', noAcc: 'No account? Sign up', haveAcc: 'Already have an account? Log in', ask: 'Ask anything...', newChat: 'New Chat', history: 'History', logout: 'Log out', camera: 'Camera', gallery: 'Gallery', hello: 'Hello! How can I help you?', settings: 'Settings', language: 'Language', account: 'Account', verifyTitle: 'Verify Email', verifyText: 'We sent a link to your email.', checkBtn: 'I Verified', modelTitle: 'Select Model', m_flash: 'Fast answers', m_pro: 'For complex answers', m_smart: 'Even smarter answers', m_expert: 'For heavy tasks', m_build: 'For app building', persona: 'AI Persona', theme: 'Theme', dark: 'Dark', light: 'Light' },
  ro: { appName: 'Stas GPT', login: 'Conectare', register: 'Înregistrare', email: 'Email', password: 'Parolă', signIn: 'Conectează-te', createAcc: 'Creează cont', noAcc: 'Nu ai cont?', haveAcc: 'Ai deja cont?', ask: 'Întreabă orice...', newChat: 'Chat nou', history: 'Istoric', logout: 'Deconectare', camera: 'Cameră', gallery: 'Galerie', hello: 'Salut! Cu ce te pot ajuta?', settings: 'Setări', language: 'Limbă', account: 'Cont', verifyTitle: 'Verifică Emailul', verifyText: 'Am trimis un link pe email.', checkBtn: 'Am Verificat', modelTitle: 'Alege Modelul', m_flash: 'Răspunsuri rapide', m_pro: 'Complexe', m_smart: 'Deștepte', m_expert: 'Sarcini grele', m_build: 'Aplicații', persona: 'Personalitate AI', theme: 'Temă', dark: 'Dark', light: 'Light' },
  ru: { appName: 'Stas GPT', login: 'Вход', register: 'Регистрация', email: 'Почта', password: 'Пароль', signIn: 'Войти', createAcc: 'Создать аккаунт', noAcc: 'Нет аккаунта?', haveAcc: 'Уже есть аккаунт?', ask: 'Спросить...', newChat: 'Новый чат', history: 'История', logout: 'Выйти', camera: 'Камера', gallery: 'Галерея', hello: 'Привет! Чем могу помочь?', settings: 'Настройки', language: 'Язык', account: 'Аккаунт', verifyTitle: 'Подтвердите почту', verifyText: 'Мы отправили письмо.', checkBtn: 'Я подтвердил', modelTitle: 'Выбор модели', m_flash: 'Быстрые ответы', m_pro: 'Для сложных ответов', m_smart: 'Ещё сложнее', m_expert: 'Для тяжелых задач', m_build: 'Для создания приложений', persona: 'Характер ИИ', theme: 'Тема', dark: 'Темная', light: 'Светлая' }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru'); 
  const [isBlocked, setIsBlocked] = useState(false);
  const [theme, setTheme] = useState('dark'); 
  const t = translations[lang];

  useEffect(() => {
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userRef = doc(db, "users", u.uid);
        unsubDoc = onSnapshot(userRef, (docSnap) => {
           if (docSnap.exists()) setIsBlocked(docSnap.data().blocked);
           else setDoc(userRef, { email: u.email, role: "user", blocked: false, createdAt: new Date().toISOString() });
        });
        setUser(u);
      } else {
        setUser(null);
        setIsBlocked(false);
      }
      setLoading(false);
    });
    return () => { unsubscribeAuth(); if (unsubDoc) unsubDoc(); };
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#fff" size="large" /></View>;
  if (!user) return <AuthScreen lang={lang} setLang={setLang} t={t} />;
  if (!user.emailVerified) return <VerifyEmailScreen user={user} setUser={setUser} t={t} />;
  
  if (isBlocked) {
    return (
      <View style={s.center}>
        <Ionicons name="ban" size={80} color="#f87171" />
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>Вы заблокированы</Text>
        <TouchableOpacity onPress={() => signOut(auth)} style={[s.mainBtn, { marginTop: 30, width: 200 }]}><Text style={s.btnText}>Выйти</Text></TouchableOpacity>
      </View>
    );
  }
  
  return <ChatScreen user={user} lang={lang} setLang={setLang} t={t} theme={theme} setTheme={setTheme} />;
}

function VerifyEmailScreen({ user, setUser, t }) {
  const checkVerification = async () => {
    try {
      await auth.currentUser.reload(); 
      if (auth.currentUser.emailVerified) setUser({ ...auth.currentUser }); 
      else Alert.alert('Ошибка', 'Почта пока не подтверждена.');
    } catch (e) { Alert.alert('Ошибка', e.message); }
  };
  return (
    <View style={[s.center, { padding: 30 }]}>
      <Ionicons name="mail-unread-outline" size={80} color="#fbbf24" />
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>{t.verifyTitle}</Text>
      <Text style={{ color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 30 }}>{t.verifyText} ({user.email})</Text>
      <TouchableOpacity style={[s.mainBtn, { width: '100%' }]} onPress={checkVerification}><Text style={s.btnText}>{t.checkBtn}</Text></TouchableOpacity>
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
        Alert.alert('Успех!', 'Аккаунт создан. Проверьте почту.');
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) { Alert.alert('Ошибка', e.message); }
  };
  return (
    <View style={s.authContainer}>
      <View style={s.langTopRow}>
        {['en', 'ro', 'ru'].map(l => (
           <TouchableOpacity key={l} onPress={() => setLang(l)}><Text style={[s.langText, lang === l && s.langActive]}>{l.toUpperCase()}</Text></TouchableOpacity>
        ))}
      </View>
      <Text style={s.titleLogo}>{t.appName}</Text>
      <Text style={s.subtitle}>{mode === 'register' ? t.register : t.login}</Text>
      <TextInput style={s.input} placeholder={t.email} placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={s.input} placeholder={t.password} placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />
      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}><Text style={s.btnText}>{mode === 'register' ? t.createAcc : t.signIn}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'register' ? 'login' : 'register')}><Text style={s.linkText}>{mode === 'register' ? t.haveAcc : t.noAcc}</Text></TouchableOpacity>
    </View>
  );
  }
// Компонент для эффекта печатающегося текста
const TypewriterText = ({ text, theme, isSpeaking, onSpeak }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 10); // Скорость печати (10мс на символ)
    return () => clearInterval(interval);
  }, [text]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text selectable={true} style={theme === 'dark' ? { color: '#fff', fontSize: 16, lineHeight: 24, flex: 1 } : { color: '#000', fontSize: 16, lineHeight: 24, flex: 1 }}>
        {displayedText}
      </Text>
      {displayedText.length === text.length && (
         <TouchableOpacity onPress={onSpeak} style={{ padding: 5 }}>
            <Ionicons name={isSpeaking ? "volume-high" : "volume-medium-outline"} size={20} color={isSpeaking ? "#3b82f6" : "#888"} />
         </TouchableOpacity>
      )}
    </View>
  );
};

function ChatScreen({ user, lang, setLang, t, theme, setTheme }) {
  const [chats, setChats] = useState([{ id: '1', title: t.newChat, messages: [{ text: t.hello, user: false }], isPinned: false }]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('liquidai/lfm3-1.7b:free'); 
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [files, setFiles] = useState([]); // Для PDF
  const [persona, setPersona] = useState(''); // Системный промпт
  
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [speakingId, setSpeakingId] = useState(null); // Для TTS

  const scrollRef = useRef();

  // Загрузка/Сохранение истории
  useEffect(() => {
    const loadChats = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@chats_${user.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) { setChats(parsed); setActiveChatId(parsed[0].id); }
        }
      } catch (e) { console.log('Ошибка загрузки:', e); }
    };
    loadChats();
  }, [user.uid]);

  useEffect(() => {
    const saveChats = async () => {
      try { await AsyncStorage.setItem(`@chats_${user.uid}`, JSON.stringify(chats)); } 
      catch (e) { console.log('Ошибка сохранения:', e); }
    };
    saveChats();
  }, [chats, user.uid]);

  // Загрузка объявлений
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) setAnnouncement(snap.docs[0].data().text);
      } catch (e) { console.log("Ошибка загрузки объявления:", e); }
    };
    fetchAnnouncement();
  }, []);

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
    setChats([{ id: newId, title: t.newChat, messages: [{ text: t.hello, user: false }], isPinned: false }, ...chats]);
    setActiveChatId(newId);
    setShowSidebar(false);
  };

  const togglePin = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
  };

  // Сортировка чатов (закрепленные сверху)
  const sortedChats = [...chats].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const updateMessages = (newMessages) => setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: newMessages } : c));

  // Выбор файла (PDF)
  const pickDocument = async () => {
    setShowAttachmentMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled) {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
        setFiles(prev => [...prev, { name: result.assets[0].name, data: base64 }]);
      }
    } catch (err) { console.log(err); }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording); setIsRecording(true);
      }
    } catch (err) { console.error(err); }
  };

  const stopRecording = async () => {
    setIsRecording(false); setRecording(undefined);
    await recording.stopAndUnloadAsync();
    setInput(prev => prev + " [Голосовое сообщение] ");
  };

  const pickImage = async (useCamera = false) => {
    setShowAttachmentMenu(false);
    let result = await (useCamera ? ImagePicker.launchCameraAsync({ quality: 0.5, base64: true }) : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true }));
    if (!result.canceled) setImage(result.assets[0].base64);
  };

  const speakText = (text, msgId) => {
    if (speakingId === msgId) {
      Speech.stop();
      setSpeakingId(null);
    } else {
      Speech.speak(text, { language: lang === 'ru' ? 'ru-RU' : lang === 'ro' ? 'ro-RO' : 'en-US' });
      setSpeakingId(msgId);
    }
  };

  const send = async () => {
    if ((!input.trim() && !image && files.length === 0) || isLoading) return;
    
    const userMsg = input; const currentImage = image; const currentFiles = files;
    const newMessages = [...messages, { text: userMsg || (currentFiles.length > 0 ? "[Документ]" : "..."), image: currentImage, user: true }];
    updateMessages(newMessages);
    
    if (messages.length === 1 && messages[0].text === t.hello) {
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: userMsg.slice(0, 20) || "Photo" } : c));
    }
    
    setInput(''); setImage(null); setFiles([]); setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg || "Analyze", 
          images: currentImage ? [currentImage] : [], 
          model: selectedModel, 
          modelString: selectedModel, 
          history: messages, 
          userId: user.uid,
          systemPrompt: persona ? persona : null,
          files: currentFiles
        })
      });
      const data = await response.json();
      const aiAnswer = data.answer || "Error";
      updateMessages([...newMessages, { text: aiAnswer, user: false, id: Date.now().toString() }]);
      
      try { await addDoc(collection(db, "messages"), { userId: user.uid, email: user.email, question: userMsg || "[Фото/Файл]", answer: aiAnswer, model: selectedModel, createdAt: serverTimestamp() }); } catch (err) { }
    } catch (e) {
      updateMessages([...newMessages, { text: "Ошибка сети: " + e.message, user: false }]);
    }
    setIsLoading(false); setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const currentModelObj = models.find(m => m.id === selectedModel) || models[1];
  const isLight = theme === 'light';
