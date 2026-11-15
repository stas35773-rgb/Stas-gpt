const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const openai = new OpenAI({ 
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

const fallbackModels = [
  "liquidai/lfm3-1.7b:free",                 
  "google/gemma-4-26b-a4b-it:free",          
  "nvidia/nemotron-3.5-super-vl:free",       
  "nvidia/nemotron-3-ultra-550b-a55b:free"   
];

app.post('/api/chat', async (req, res) => {
  try {
    const { message, images, model, modelString, history } = req.body;
    
    // 1. Формируем историю из прошлых сообщений
    let formattedHistory = [];
    if (history && history.length > 0) {
      // Берем последние 15 сообщений, чтобы не превысить лимиты
      formattedHistory = history.slice(-15).map(msg => ({
        role: msg.user ? "user" : "assistant",
        content: msg.text
      }));
    }

    // Если есть фото
    if (images && images.length > 0) {
       const content = [{ type: "text", text: message || "Что на фото?" }];
       images.forEach(img => content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }));
       
       const messagesWithImg = [
         { role: "system", content: "Ты Stas GPT." },
         ...formattedHistory,
         { role: "user", content: content }
       ];

       try {
         const response = await openai.chat.completions.create({
            model: "google/gemma-4-26b-a4b-it:free", 
            messages: messagesWithImg,
            max_tokens: 1500,
         });
         return res.json({ answer: response.choices[0].message.content });
       } catch (imgErr) {
         return res.json({ answer: "Не удалось обработать фото. Попробуйте позже." });
       }
    }

    // Для текста перебираем модели
    let lastError = "";
    for (let m of fallbackModels) {
      try {
        const messagesWithHistory = [
          { role: "system", content: "Ты Stas GPT. Отвечай на языке пользователя. Не используй Markdown." },
          ...formattedHistory,
          { role: "user", content: message }
        ];

        const response = await openai.chat.completions.create({
          model: m,
          messages: messagesWithHistory,
          max_tokens: 1500,
        });
        
        if (response.choices && response.choices.length > 0) {
           return res.json({ answer: response.choices[0].message.content });
        }
      } catch (err) {
        lastError = err.message;
        continue; 
      }
    }

    res.json({ answer: "Модели перегружены. Попробуйте еще раз. Ошибка: " + lastError });

  } catch (error) {
    res.json({ answer: "Ошибка сервера: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
