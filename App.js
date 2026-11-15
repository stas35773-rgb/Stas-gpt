import Markdown from 'react-native-markdown-display';
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
  en: { 
    appName: 'Stas GPT', login: 'Login', register: 'Register', email: 'Email', password: 'Password', 
    signIn: 'Sign In', createAcc: 'Create Account', noAcc: 'No account? Sign up', haveAcc: 'Already have an account? Log in', 
    ask: 'Ask anything...', newChat: 'New Chat', history: 'History', logout: 'Log out', camera: 'Camera', gallery: 'Gallery', 
    hello: 'Hello! How can I help you?', settings: 'Settings', language: 'Language', account: 'Account', 
    verifyTitle: 'Verify Email', verifyText: 'We sent a link to your email.', checkBtn: 'I Verified', 
    modelTitle: 'Select Model', m_flash: 'Fast answers', m_pro: 'For complex answers', m_smart: 'Even smarter', m_expert: 'For heavy tasks', m_build: 'For app building',
    persona: 'AI Persona', theme: 'Theme', dark: 'Dark', light: 'Light', 
    blockedTitle: 'Access Denied', blockedText: 'The administrator has restricted your access.', filePdf: 'File (PDF)', personaPh: 'e.g., Act like a pirate...',
    error: 'Error', fillFields: 'Fill all fields', accCreated: 'Account created. Check your email.', emailNotVerified: 'Email is not verified yet.'
  },
  ro: { 
    appName: 'Stas GPT', login: 'Conectare', register: 'Înregistrare', email: 'Email', password: 'Parolă', 
    signIn: 'Conectează-te', createAcc: 'Creează cont', noAcc: 'Nu ai cont? Înregistrează-te', haveAcc: 'Ai deja cont? Conectează-te', 
    ask: 'Întreabă orice...', newChat: 'Chat nou', history: 'Istoric', logout: 'Deconectare', camera: 'Cameră', gallery: 'Galerie', 
    hello: 'Salut! Cu ce te pot ajuta?', settings: 'Setări', language: 'Limbă', account: 'Cont', 
    verifyTitle: 'Verifică Emailul', verifyText: 'Am trimis un link pe email.', checkBtn: 'Am Verificat', 
    modelTitle: 'Alege Modelul', m_flash: 'Răspunsuri rapide', m_pro: 'Complexe', m_smart: 'Deștepte', m_expert: 'Sarcini grele', m_build: 'Aplicații',
    persona: 'Personalitate AI', theme: 'Temă', dark: 'Dark', light: 'Light', 
    blockedTitle: 'Acces refuzat', blockedText: 'Administratorul a restricționat accesul dvs.', filePdf: 'Fișier (PDF)', personaPh: 'ex: Comportă-te ca un pirat...',
    error: 'Eroare', fillFields: 'Completați toate câmpurile', accCreated: 'Cont creat. Verificați e-mailul.', emailNotVerified: 'E-mailul nu este încă verificat.'
  },
  ru: { 
    appName: 'Stas GPT', login: 'Вход', register: 'Регистрация', email: 'Почта', password: 'Пароль', 
    signIn: 'Войти', createAcc: 'Создать аккаунт', noAcc: 'Нет аккаунта? Создать', haveAcc: 'Уже есть аккаунт? Войти', 
    ask: 'Спросить...', newChat: 'Новый чат', history: 'История', logout: 'Выйти', camera: 'Камера', gallery: 'Галерея', 
    hello: 'Привет! Чем могу помочь?', settings: 'Настройки', language: 'Язык', account: 'Аккаунт', 
    verifyTitle: 'Подтвердите почту', verifyText: 'Мы отправили письмо. Перейдите по ссылке.', checkBtn: 'Я подтвердил', 
    modelTitle: 'Выбор модели', m_flash: 'Быстрые ответы', m_pro: 'Для сложных ответов', m_smart: 'Ещё сложнее', m_expert: 'Для тяжелых задач', m_build: 'Для приложений',
    persona: 'Характер ИИ', theme: 'Тема', dark: 'Темная', light: 'Светлая', 
    blockedTitle: 'Вы заблокированы', blockedText: 'Администратор ограничил ваш доступ к Stas GPT.', filePdf: 'Файл (PDF)', personaPh: 'Например: Веди себя как пират...',
    error: 'Ошибка', fillFields: 'Заполните все поля', accCreated: 'Аккаунт создан. Проверьте почту.', emailNotVerified: 'Почта пока не подтверждена.'
  }
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
  const [checking, setChecking] = useState(false);
  const checkVerification = async () => {
    setChecking(true);
    try {
      await auth.currentUser.reload(); 
      if (auth.currentUser.emailVerified) setUser({ ...auth.currentUser }); 
      else Alert.alert(t.error, t.emailNotVerified);
    } catch (e) { Alert.alert(t.error, e.message); }
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
  if (!email || !pass) return Alert.alert(t.error, t.fillFields);
  try {
    if (mode === 'register') {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "users", userCred.user.uid), { email: email, role: "user", blocked: false, createdAt: new Date().toISOString() });
      await sendEmailVerification(userCred.user);
      Alert.alert('✅', t.accCreated);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (e) { Alert.alert(t.error, e.message); }
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
  const [displayedText, setDisplayedText] = useState(text);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!text) return;
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 10); // Скорость печати
    return () => clearInterval(interval);
  }, [text]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
      <View style={{ flexShrink: 1, width: '100%' }}>
        <Markdown style={isLight ? markdownStylesLight : markdownStylesDark}>
          {displayedText}
        </Markdown>
      </View>
      {displayedText.length === text.length && text.length > 0 && (
         <TouchableOpacity onPress={onSpeak} style={{ paddingLeft: 10, paddingTop: 2 }}>
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
  return (
    <SafeAreaView style={[{ flex: 1 }, isLight ? { backgroundColor: '#fff' } : { backgroundColor: '#121212' }]}>
      
      {/* ШАПКА */}
      <View style={[s.header, isLight && { backgroundColor: '#f2f2f7' }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => setShowSidebar(true)}>
          <Ionicons name="menu" size={28} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, isLight && { color: '#000' }]} numberOfLines={1}>{activeChat?.title}</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      {/* ОБЪЯВЛЕНИЕ */}
      {announcement && (
        <View style={{ backgroundColor: '#fbbf24', padding: 12, marginHorizontal: 15, marginTop: 10, borderRadius: 10 }}>
          <Text style={{ color: '#000', fontWeight: 'bold' }}>📢 {announcement}</Text>
        </View>
      )}

      {/* ЧАТ */}
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}}>
        {messages.map((m, i) => (
          <View key={i} style={[s.messageWrapper, m.user ? s.userWrapper : s.botWrapper]}>
            {m.image && <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={s.msgImage} />}
            
            {m.user ? (
              <Text selectable={true} style={[s.userText, isLight && { color: '#000', backgroundColor: '#e5e5ea' }]}>{m.text}</Text>
            ) : (
              <TypewriterText 
                text={m.text} 
                theme={theme} 
                isSpeaking={speakingId === i} 
                onSpeak={() => speakText(m.text, i)} 
              />
            )}
          </View>
        ))}
        {isLoading && <ActivityIndicator color="#888" style={{ marginTop: 10, alignSelf: 'flex-start', marginLeft: 20 }} />}
      </ScrollView>

      {/* ПАНЕЛЬ ВВОДА */}
<View style={[s.inputContainer, isLight && { backgroundColor: '#fff' }]}>
  
  {/* Превью картинки */}
  {image && (
    <View style={s.previewContainer}>
      <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={s.previewImage} />
      <TouchableOpacity onPress={() => setImage(null)} style={s.removeImageBtn}><Ionicons name="close" size={14} color="#fff" /></TouchableOpacity>
    </View>
  )}

  {/* Превью файлов */}
  {files.length > 0 && files.map((f, idx) => (
    <View key={idx} style={[s.previewContainer, { flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#e5e5ea' : '#1c1c1e', padding: 8, borderRadius: 10, marginBottom: 5 }]}>
       <Ionicons name="document-text" size={20} color={isLight ? '#000' : '#3b82f6'} />
       <Text style={{ color: isLight ? '#000' : '#fff', marginLeft: 8, flex: 1 }} numberOfLines={1}>{f.name}</Text>
       <TouchableOpacity onPress={() => setFiles(prev => prev.filter((_, i) => i !== idx))}><Ionicons name="close" size={20} color="#f87171" /></TouchableOpacity>
    </View>
  ))}

  <View style={[s.inputRow, isLight && { backgroundColor: '#f2f2f7' }]}>
    
    {/* Кнопка Плюс */}
    <TouchableOpacity style={[s.iconBtnSquare, isLight && { backgroundColor: '#e5e5ea' }]} onPress={() => setShowAttachmentMenu(true)}>
      <Ionicons name="add" size={24} color={isLight ? '#000' : '#fff'} />
    </TouchableOpacity>
    
    {/* Поле ввода текста */}
    <TextInput 
      style={[s.textInput, isLight && { color: '#000' }]} 
      value={input} 
      onChangeText={setInput} 
      placeholder={t.ask} 
      placeholderTextColor="#888" 
      multiline 
    />
    
    {/* Кнопка выбора модели */}
    <TouchableOpacity style={[s.modelSelectorBtn, isLight && { backgroundColor: '#e5e5ea' }]} onPress={() => setShowModelMenu(true)}>
      <Ionicons name="flash" size={14} color={isLight ? '#000' : '#3b82f6'} />
      <Text style={[s.modelSelectorText, isLight && { color: '#000' }]} numberOfLines={1}>
        {currentModelObj.name.split('-')[1] || currentModelObj.name}
      </Text>
      <Ionicons name="chevron-down" size={10} color={isLight ? '#000' : '#888'} />
    </TouchableOpacity>
    
    {/* Кнопка Микрофона */}
    <TouchableOpacity style={[s.iconBtnPlain, isRecording && { backgroundColor: '#f87171', borderRadius: 19 }]} onPress={isRecording ? stopRecording : startRecording}>
      <Ionicons name={isRecording ? "stop" : "mic-outline"} size={24} color={isLight ? '#000' : '#fff'} />
    </TouchableOpacity>
    
    {/* Кнопка Отправить */}
    <TouchableOpacity style={[s.sendBtnCircle, isLight && { backgroundColor: '#000' }, (!input.trim() && !image && files.length === 0) && {opacity: 0.5}]} onPress={send} disabled={isLoading || (!input.trim() && !image && files.length === 0)}>
      <Ionicons name="arrow-up" size={20} color={isLight ? '#fff' : '#000'} />
    </TouchableOpacity>
  </View>
</View>

      {/* БОКОВОЕ МЕНЮ (ИСТОРИЯ) */}
      <Modal visible={showSidebar} transparent animationType="fade">
        <View style={s.sidebarOverlay}>
          <View style={[s.sidebarContent, isLight && { backgroundColor: '#fff' }]}>
            
            <View style={s.sidebarHeader}>
              <Text style={[s.sidebarTitle, isLight && { color: '#000' }]}>{t.history}</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}><Ionicons name="close" size={24} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
            </View>

            <TouchableOpacity style={s.newChatBtn} onPress={createNewChat}>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={s.newChatText}>{t.newChat}</Text>
            </TouchableOpacity>

            <ScrollView style={{flex: 1}}>
              {sortedChats.map(chat => (
                <View key={chat.id} style={[s.historyItem, activeChatId === chat.id && (isLight ? {backgroundColor: '#e5e5ea'} : s.historyItemActive)]}>
                  <TouchableOpacity style={{flex: 1, flexDirection: 'row', alignItems: 'center'}} onPress={() => { setActiveChatId(chat.id); setShowSidebar(false); }}>
                    <Ionicons name="chatbubble-outline" size={18} color={isLight ? '#000' : '#888'} style={{marginRight: 10}} />
                    <Text style={[s.historyText, isLight && { color: '#000' }]} numberOfLines={1}>{chat.title}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => togglePin(chat.id)} style={{padding: 5}}>
                    <Ionicons name={chat.isPinned ? "bookmark" : "bookmark-outline"} size={20} color={chat.isPinned ? "#fbbf24" : "#888"} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={[s.sidebarFooter, isLight && { borderTopColor: '#ccc' }]}>
              <View style={s.accountInfo}>
                <View style={s.avatarMini}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{user.email ? user.email[0].toUpperCase() : 'U'}</Text>
                </View>
                <Text style={[s.accountEmail, isLight && { color: '#000' }]} numberOfLines={1}>{user.email}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowSidebar(false); setShowSettings(true); }} style={{padding: 5}}>
                <Ionicons name="settings-outline" size={24} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowSidebar(false)} />
        </View>
      </Modal>

      {/* НАСТРОЙКИ */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.bottomSheetOverlay}>
          <View style={[s.bottomSheetContainer, isLight && { backgroundColor: '#fff' }]}>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, isLight && { color: '#000' }]}>{t.settings}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close" size={26} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
            </View>

            {/* Язык */}
            <Text style={s.settingsLabel}>{t.language}</Text>
            <View style={s.langRow}>
              {['en', 'ro', 'ru'].map(l => (
                <TouchableOpacity key={l} style={[s.langBtn, lang === l && s.langBtnActive]} onPress={() => setLang(l)}>
                  <Text style={[s.langBtnText, lang === l && {color: '#000'}]}>{l.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Тема */}
            <Text style={s.settingsLabel}>{t.theme}</Text>
            <View style={s.langRow}>
              <TouchableOpacity style={[s.langBtn, theme === 'dark' && s.langBtnActive]} onPress={() => setTheme('dark')}>
                <Text style={[s.langBtnText, theme === 'dark' && {color: '#000'}]}>{t.dark}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.langBtn, theme === 'light' && s.langBtnActive]} onPress={() => setTheme('light')}>
                <Text style={[s.langBtnText, theme === 'light' && {color: '#000'}]}>{t.light}</Text>
              </TouchableOpacity>
            </View>

            {/* Персонализация */}
            <Text style={s.settingsLabel}>{t.persona}</Text>
            <TextInput 
              style={[s.announcementInput, { backgroundColor: isLight ? '#f2f2f7' : '#0f1115', color: isLight ? '#000' : '#fff' }]} 
              placeholder="Например: Веди себя как пират..." 
              placeholderTextColor="#888" 
              value={persona} 
              onChangeText={setPersona} 
              multiline 
            />

            <View style={s.divider} />
            <TouchableOpacity style={s.logoutBtn} onPress={() => signOut(auth)}>
              <Ionicons name="log-out-outline" size={22} color="#f87171" />
              <Text style={s.logoutBtnText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ВЫБОР МОДЕЛИ */}
      <Modal visible={showModelMenu} transparent animationType="slide">
        <View style={s.bottomSheetOverlay}>
          <View style={[s.bottomSheetContainer, isLight && { backgroundColor: '#fff' }]}>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, isLight && { color: '#000' }]}>{t.modelTitle}</Text>
              <TouchableOpacity onPress={() => setShowModelMenu(false)}><Ionicons name="close" size={26} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
            </View>
            <View style={[s.sheetList, isLight && { backgroundColor: '#f2f2f7' }]}>
              {models.map((m, index) => (
                <TouchableOpacity key={m.id} style={[s.sheetItem, index !== models.length - 1 && s.borderBottom]} onPress={() => { setSelectedModel(m.id); setShowModelMenu(false); }}>
                  <View style={{flex: 1}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                      <Text style={[s.sheetItemTitle, isLight && { color: '#000' }]}>{m.name}</Text>
                      {m.badge && <View style={s.badge}><Text style={s.badgeText}>{m.badge}</Text></View>}
                    </View>
                    <Text style={s.sheetItemDesc}>{m.desc}</Text>
                  </View>
                  {selectedModel === m.id && <Ionicons name="checkmark" size={24} color="#3b82f6" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ВЛОЖЕНИЯ */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentMenu(false)}>
          <View style={[s.floatingMenuLeft, isLight && { backgroundColor: '#fff' }]}>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(true)}>
              <Ionicons name="camera-outline" size={22} color={isLight ? '#000' : '#fff'} style={s.menuIcon} />
              <Text style={[s.menuItemText, isLight && { color: '#000' }]}>{t.camera}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => pickImage(false)}>
              <Ionicons name="image-outline" size={22} color={isLight ? '#000' : '#fff'} style={s.menuIcon} />
              <Text style={[s.menuItemText, isLight && { color: '#000' }]}>{t.gallery}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={pickDocument}>
              <Ionicons name="document-text-outline" size={22} color={isLight ? '#000' : '#fff'} style={s.menuIcon} />
              <Text style={[s.menuItemText, isLight && { color: '#000' }]}>Файл (PDF)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}
const markdownStylesDark = {
  body: { color: '#fff', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#fff' },
  em: { fontStyle: 'italic', color: '#fff' },
  paragraph: { marginTop: 0, marginBottom: 12, flexWrap: 'wrap' }, // Увеличили отступ между абзацами
  link: { color: '#60a5fa' },
  code_inline: { backgroundColor: '#2c2c2e', color: '#f87171', paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#1c1c1e', padding: 10, borderRadius: 8, color: '#fff' },
  fence: { backgroundColor: '#1c1c1e', padding: 10, borderRadius: 8, color: '#fff' },
  
  // НОВЫЕ СТИЛИ ДЛЯ СПИСКОВ:
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  list_item: { marginBottom: 8, flexDirection: 'row', justifyContent: 'flex-start' },
  bullet_list_icon: { marginLeft: 0, marginRight: 10, color: '#fff', fontSize: 16 },
  ordered_list_icon: { marginLeft: 0, marginRight: 10, color: '#fff', fontSize: 16 },
};

const markdownStylesLight = {
  body: { color: '#000', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#000' },
  em: { fontStyle: 'italic', color: '#000' },
  paragraph: { marginTop: 0, marginBottom: 12, flexWrap: 'wrap' }, // Увеличили отступ между абзацами
  link: { color: '#2563eb' },
  code_inline: { backgroundColor: '#e5e5ea', color: '#c026d3', paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#f2f2f7', padding: 10, borderRadius: 8, color: '#000' },
  fence: { backgroundColor: '#f2f2f7', padding: 10, borderRadius: 8, color: '#000' },
  
  // НОВЫЕ СТИЛИ ДЛЯ СПИСКОВ:
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  list_item: { marginBottom: 8, flexDirection: 'row', justifyContent: 'flex-start' },
  bullet_list_icon: { marginLeft: 0, marginRight: 10, color: '#000', fontSize: 16 },
  ordered_list_icon: { marginLeft: 0, marginRight: 10, color: '#000', fontSize: 16 },
};

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 24 },
  langTopRow: { flexDirection: 'row', gap: 15, position: 'absolute', top: 60, right: 24 },
  langText: { color: '#666', fontSize: 16, fontWeight: 'bold' }, langActive: { color: '#fff' },
  titleLogo: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1c1c1e', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  mainBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }, linkText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, backgroundColor: '#121212' },
  headerBtn: { padding: 5 }, headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  chatArea: { flex: 1, paddingHorizontal: 15 },
  messageWrapper: { padding: 14, marginVertical: 4, maxWidth: '85%' },
  userWrapper: { backgroundColor: '#1c1c1e', alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 4 },
  botWrapper: { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingHorizontal: 5 },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  msgImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },
  inputContainer: { paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 10 : 25, paddingTop: 10, backgroundColor: '#121212' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderRadius: 30, padding: 6, gap: 6 },
  iconBtnSquare: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 5 },
  modelSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c2c2e', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 20, maxWidth: 85 },
  modelSelectorText: { color: '#fff', fontSize: 13, fontWeight: '500', textTransform: 'capitalize', marginHorizontal: 4 },
  iconBtnPlain: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  sendBtnCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  previewContainer: { padding: 10, alignSelf: 'flex-start' }, previewImage: { width: 60, height: 60, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#333', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000' },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row' },
  sidebarContent: { width: '80%', backgroundColor: '#121212', height: '100%', paddingTop: 50, paddingHorizontal: 15, paddingBottom: 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  newChatText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10, marginBottom: 5 },
  historyItemActive: { backgroundColor: '#1c1c1e' },
  historyText: { color: '#fff', fontSize: 15, flex: 1 },
  sidebarFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, marginTop: 10 },
  accountInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarMini: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  accountEmail: { color: '#fff', fontSize: 14, flex: 1 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '500' },
  sheetList: { backgroundColor: '#262626', borderRadius: 16, overflow: 'hidden', marginBottom: 15 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#333' },
  sheetItemTitle: { color: '#fff', fontSize: 18, fontWeight: '400' },
  sheetItemDesc: { color: '#888', fontSize: 14, marginTop: 4 },
  badge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },
  settingsLabel: { color: '#888', fontSize: 14, marginBottom: 10, textTransform: 'uppercase', marginTop: 10 },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  langBtn: { flex: 1, backgroundColor: '#2c2c2e', padding: 12, borderRadius: 10, alignItems: 'center' },
  langBtnActive: { backgroundColor: '#fff' },
  langBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  announcementInput: { padding: 12, borderRadius: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248, 113, 113, 0.1)', padding: 15, borderRadius: 10, gap: 10 },
  logoutBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  floatingMenuLeft: { backgroundColor: '#1c1c1e', position: 'absolute', bottom: 90, left: 15, borderRadius: 20, paddingVertical: 10, width: 200 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 15 },
  menuIcon: { marginRight: 5 },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
