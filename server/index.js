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
    
    let modelName = modelString || "nvidia/nemotron-3-ultra-550b-a55b:free";
    if (images && images.length > 0) modelName = "nvidia/nemotron-3.5-super-vl:free"; 

    // ГЛАВНОЕ ИЗМЕНЕНИЕ: Просим ИИ не использовать сложные символы
    const messages = [
      { 
        role: "system", 
        content: "Ты Stas GPT. Отвечай на языке пользователя. ВАЖНО: Не используй Markdown (звездочки ** и решетки ###). Пиши математику обычным текстом, используя символы (например, 2² вместо 2^2, или 2*2=4). Делай текст чистым и понятным." 
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

    res.json({ answer: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка OpenRouter: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
