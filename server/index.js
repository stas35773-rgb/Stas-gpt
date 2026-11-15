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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, images, model, modelString } = req.body;
    
    // Берем модель, которую прислало приложение. Если нет — ставим Gemma из твоего скриншота.
    let modelName = modelString || "google/gemma-4-26b-a4b:free"; 
    
    // Если прислали фото, принудительно используем зрячую NVIDIA
    if (images && images.length > 0) {
      modelName = "nvidia/nemotron-3.5-super-vl:free"; 
    }

    const messages = [
      { 
        role: "system", 
        content: "Ты Stas GPT. Отвечай на языке пользователя. Не используй Markdown (звездочки ** и решетки ###). Пиши математику обычным текстом (например 2²)." 
      }
    ];

    if (images && images.length > 0) {
       const content = [{ type: "text", text: message || "Что на фото?" }];
       images.forEach(img => content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }));
       messages.push({ role: "user", content: content });
    } else {
       messages.push({ role: "user", content: message });
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      max_tokens: 1500,
    });

    // Если ответа нет, не роняем сервер, а пишем в чат
    if (!response.choices || response.choices.length === 0) {
      return res.json({ answer: "Ошибка: Модель перегружена. Попробуйте отправить сообщение еще раз." });
    }

    res.json({ answer: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    // Вместо Network Error приложение получит понятный текст
    res.json({ answer: "Ошибка OpenRouter: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
