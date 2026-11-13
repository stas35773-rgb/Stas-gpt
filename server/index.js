const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const { message, images, model } = req.body;
    const isV1 = model === 'v1';
    
    // Используем классические стабильные модели
    let modelName = "gemini-pro"; 
    if (images && images.length > 0) {
      modelName = "gemini-pro-vision"; 
    }

    const geminiModel = genAI.getGenerativeModel({ model: modelName });

    const contentParts = [{ text: message || "Что на фото?" }];
    
    // Добавляем фото, если есть
    if (images && images.length > 0) {
      images.forEach(imgBase64 => {
        contentParts.push({
          inlineData: { data: imgBase64, mimeType: "image/jpeg" }
        });
      });
    }

    const result = await geminiModel.generateContent(contentParts);
    const responseText = result.response.text();

    res.json({ answer: responseText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
