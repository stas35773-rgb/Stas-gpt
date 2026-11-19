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

const fallbackModels = ["liquidai/lfm3-1.7b:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, systemPrompt } = req.body;
    
    // Проверяем, просит ли пользователь нарисовать картинку
    const isImageRequest = /нарисуй|сгенерируй картинку|draw|generate image/i.test(message);

    if (isImageRequest) {
      // Очищаем запрос от слов "нарисуй" и т.д.
      const cleanPrompt = message.replace(/нарисуй|сгенерируй|картинку|draw|generate|image/gi, '').trim();
      
      // Используем бесплатный сервис Pollinations.ai
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt || message)}?width=1024&height=1024&nologo=true`;
      
      // Возвращаем ответ в формате Markdown (приложение само покажет картинку)
      return res.json({ answer: `Вот твоя картинка:\n\n![Картинка](${imageUrl})` });
    }

    // Обычный текстовый запрос
    let formattedHistory = history ? history.slice(-10).map(m => ({ role: m.user ? "user" : "assistant", content: m.text })) : [];
    const sysPrompt = systemPrompt || "Ты Stas GPT. Отвечай на языке пользователя. Используй Markdown.";
    
    const response = await openai.chat.completions.create({
      model: fallbackModels[0],
      messages: [{ role: "system", content: sysPrompt }, ...formattedHistory, { role: "user", content: message }],
      max_tokens: 1500,
    });
    res.json({ answer: response.choices[0].message.content });
    
  } catch (error) {
    res.json({ answer: "Ошибка сервера: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
