const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const pdf = require('pdf-parse');

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
    const { message, images, model, modelString, history, systemPrompt, files } = req.body;
    
    let formattedHistory = [];
    if (history && history.length > 0) {
      formattedHistory = history.slice(-15).map(msg => ({ role: msg.user ? "user" : "assistant", content: msg.text }));
    }

    // Извлечение текста из PDF
    let extractedText = "";
    if (files && files.length > 0) {
      for (let f of files) {
        try {
          const pdfData = await pdf(Buffer.from(f.data, 'base64'));
          extractedText += `\n\n[Содержимое файла ${f.name}]:\n${pdfData.text}`;
        } catch(e) { console.log("Ошибка чтения файла", e); }
      }
    }

    // Системный промпт (персонализация)
    const sysPrompt = systemPrompt || "Ты Stas GPT. Отвечай на языке пользователя. Обязательно используй Markdown для списков, выделения жирным и кода. ВАЖНО: Каждый новый пункт списка пиши с новой строки, используя символы '- ' или '1. '. Обязательно оставляй пустую строку перед началом списка. Для математики пиши обычные символы (например, 2²).";
    // Если есть фото
    if (images && images.length > 0) {
       const content = [{ type: "text", text: message || "Что на фото?" }];
       images.forEach(img => content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }));
       
       const response = await openai.chat.completions.create({
            model: "google/gemma-4-26b-a4b-it:free", 
            messages: [{ role: "system", content: sysPrompt }, ...formattedHistory, { role: "user", content: content }],
            max_tokens: 1500,
       });
       return res.json({ answer: response.choices[0].message.content });
    }

    // Текстовый запрос
    let lastError = "";
    for (let m of fallbackModels) {
      try {
        const response = await openai.chat.completions.create({
          model: m,
          messages: [
            { role: "system", content: sysPrompt },
            ...formattedHistory,
            { role: "user", content: message + extractedText }
          ],
          max_tokens: 1500,
        });
        
        if (response.choices && response.choices.length > 0) {
           return res.json({ answer: response.choices[0].message.content });
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    res.json({ answer: "Модели перегружены. Ошибка: " + lastError });

  } catch (error) {
    res.json({ answer: "Ошибка сервера: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
