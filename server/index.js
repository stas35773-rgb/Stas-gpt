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

// Идеальный список из твоих скриншотов (от быстрых к мощным)
const fallbackModels = [
  "liquidai/lfm3-1.7b:free",                 // 2.2s (Быстрая, текст)
  "google/gemma-4-26b-a4b-it:free",          // 1.0s (Быстрая, видит фото)
  "nvidia/nemotron-3.5-super-vl:free",       // 10s  (Видит фото)
  "nvidia/nemotron-3-ultra-550b-a55b:free"   // 72s  (Мощная, но медленная - оставим на крайний случай)
];

app.post('/api/chat', async (req, res) => {
  try {
    const { message, images, model, modelString } = req.body;
    
    // Если есть фото, сразу отправляем в Gemma (она быстрая и видит картинки)
    if (images && images.length > 0) {
       const content = [{ type: "text", text: message || "Что на фото?" }];
       images.forEach(img => content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }));
       
       try {
         const response = await openai.chat.completions.create({
            model: "google/gemma-4-26b-a4b-it:free", 
            messages: [{ role: "user", content: content }],
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
        const response = await openai.chat.completions.create({
          model: m,
          messages: [
            { role: "system", content: "Ты Stas GPT. Отвечай на языке пользователя. Не используй Markdown. Пиши математику обычным текстом." },
            { role: "user", content: message }
          ],
          max_tokens: 1500,
        });
        
        if (response.choices && response.choices.length > 0) {
           return res.json({ answer: response.choices[0].message.content });
        }
      } catch (err) {
        console.log(`Модель ${m} не сработала: ${err.message}`);
        lastError = err.message;
        continue; 
      }
    }

    res.json({ answer: "Модели перегружены. Попробуйте еще раз. Ошибка: " + lastError });

  } catch (error) {
    console.error(error);
    res.json({ answer: "Ошибка сервера: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
