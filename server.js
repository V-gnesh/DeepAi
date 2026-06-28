import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { 
  findUserByEmail, 
  saveUser, 
  getChats, 
  createChat, 
  deleteChat, 
  getMessages, 
  addMessage 
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_chatbot_key_12345';

// Middleware
app.use(cors({
  origin: true, // Dynamically allow request origin (fixes CORS when frontend runs on ports 5174, 5175, etc.)
  credentials: true
}));
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
}

// Local Fallback Bot Reply
function generateBotReply(userMsg) {
  const text = userMsg.toLowerCase().trim();
  
  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return "Hello! I'm your AI companion. How can I help you today? (Note: Local fallback active. Provide a valid GROQ_API_KEY in `.env` for full LLM answers!)";
  }
  if (text.includes('name')) {
    return "I'm **DeepAI**! I'm designed to assist you with development tasks, answer questions, or just keep you company. 🚀";
  }
  if (text.includes('help') || text.includes('what can you do') || text.includes('features')) {
    return "I can support you with:\n\n*   **Coding Assistance**: I can explain snippets or write clean React code.\n*   **Interactive Answers**: I respond dynamically based on your questions.\n*   **Session Memory**: Click on the sidebar to create new chats or switch between them!\n\nJust write a message to get started.";
  }
  if (text.includes('joke')) {
    const jokes = [
      "Why do programmers wear glasses? Because they can't C#.",
      "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "Why did the programmer quit their job? Because they didn't get arrays."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (text.includes('code') || text.includes('javascript') || text.includes('react') || text.includes('html')) {
    return "I love code! Here is a sleek CSS flexbox layout example:\n\n```css\n.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem;\n  background: rgba(255, 255, 255, 0.05);\n  backdrop-filter: blur(10px);\n}\n```\nWhat specific programming question can I help you solve today?";
  }
  if (text.includes('thank') || text.includes('awesome') || text.includes('cool') || text.includes('great')) {
    return "You're very welcome! Let me know if there's anything else I can do for you. 😊";
  }
  
  const fallbacks = [
    "That's an interesting question! Can you tell me more about it?",
    "I understand. Let's delve deeper into this. What are your main goals?",
    "Got it! Let me know if you need any code scripts or step-by-step guides for that.",
    "That makes perfect sense. How would you like to proceed with that idea?",
    "Fascinating. I am ready to help you implement or build that!"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ROUTES

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const name = username || req.body.name; // Accept both username and name

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    };

    await saveUser(newUser);

    // Fetch the saved user to get their custom generated _id
    const savedUser = await findUserByEmail(email);
    const token = jwt.sign({ id: savedUser._id, name: savedUser.name, email: savedUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: savedUser._id, name: savedUser.name, email: savedUser.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server login error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});


// --- Chat Routes ---
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userChats = await getChats(req.user.id);
    res.status(200).json({ chats: userChats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve chats' });
  }
});

app.post('/api/chats', authenticateToken, async (req, res) => {
  const { title } = req.body;
  try {
    const newChat = await createChat(req.user.id, title);
    res.status(201).json({ chat: newChat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

app.delete('/api/chats/:id', authenticateToken, async (req, res) => {
  const chatId = req.params.id;
  try {
    await deleteChat(req.user.id, chatId);
    res.status(200).json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});


// --- Message Routes ---
app.get('/api/chats/:id/messages', authenticateToken, async (req, res) => {
  const chatId = req.params.id;
  try {
    const messages = await getMessages(chatId);
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

app.post('/api/chats/:id/messages', authenticateToken, async (req, res) => {
  const chatId = req.params.id;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    // 1. Add user message
    const userMessage = await addMessage(chatId, { sender: 'user', text });

    // 2. Determine bot response (Groq API or local fallback)
    let botText = '';
    const groqApiKey = process.env.GROQ_API_KEY;
    const isKeyValid = groqApiKey && groqApiKey !== 'your_groq_api_key_here' && groqApiKey.trim() !== '';

    if (isKeyValid) {
      try {
        // Fetch full history for conversation context
        const history = await getMessages(chatId);
        const messagesPayload = [
          { 
            role: 'system', 
            content: 'You are DeepAI, a helpful, intelligent AI assistant. Always refer to yourself as DeepAI, never by any other name. You respond clearly and concisely. When writing code, use standard Markdown code blocks with language specifiers.' 
          },
          ...history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: messagesPayload,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        botText = responseData.choices[0].message.content;
      } catch (err) {
        console.error('Error calling Groq API:', err.message);
        botText = generateBotReply(text) + `\n\n*(Note: Groq LLM API request failed [${err.message}]. Using local fallback)*`;
      }
    } else {
      // Generate fallback template response
      botText = generateBotReply(text);
    }

    // 3. Add bot message
    const botMessage = await addMessage(chatId, { sender: 'ai', text: botText });

    res.status(201).json({
      userMessage,
      botMessage
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});


// Server Listen
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
