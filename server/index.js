const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Подключение к OpenRouter
const openai = new OpenAI({ 
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, images, model } = req.body;
    const isV1 = model === 'v1';
    
    // Выбираем модель Claude
    // Если ID не сработает, скопируй точный ID модели на сайте OpenRouter
    let modelName = isV1 ? "anthropic/claude-sonnet-5" : "anthropic/claude-haiku-5.5"; 
    
    // Если пользователь прислал фото, используем Sonnet (она умеет "видеть")
    if (images && images.length > 0) {
      modelName = "anthropic/claude-sonnet-5"; 
    }

    const messages = [
      { role: "system", content: isV1 ? "Ты Stas GPT 1.0. Думай долго, исправляй ошибки." : "Ты Stas GPT Beta. Отвечай быстро." }
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

    res.json({ answer: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка OpenRouter: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
