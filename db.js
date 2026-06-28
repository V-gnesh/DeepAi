import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/newchatbot';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Compass successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'usr_' + Math.random().toString(36).substring(2, 11) },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'chat_' + Math.random().toString(36).substring(2, 11) },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'msg_' + Math.random().toString(36).substring(2, 11) },
  chatId: { type: String, required: true },
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', UserSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const Message = mongoose.model('Message', MessageSchema);

// Helper Functions
export async function getUsers() {
  return await User.find({});
}

export async function saveUser(userData) {
  const newUser = new User(userData);
  await newUser.save();
  return newUser;
}

export async function findUserByEmail(email) {
  return await User.findOne({ email: email.toLowerCase() });
}

export async function getChats(userId) {
  const userChats = await Chat.find({ userId }).sort({ createdAt: -1 });
  return userChats.map(c => ({
    id: c._id,
    userId: c.userId,
    title: c.title,
    createdAt: c.createdAt
  }));
}

export async function createChat(userId, title) {
  const newChat = new Chat({
    userId,
    title: title || 'New Chat'
  });
  await newChat.save();
  return { id: newChat._id, userId: newChat.userId, title: newChat.title, createdAt: newChat.createdAt };
}

export async function deleteChat(userId, chatId) {
  await Chat.deleteOne({ _id: chatId, userId });
  await Message.deleteMany({ chatId });
  return true;
}

export async function getMessages(chatId) {
  const msgs = await Message.find({ chatId }).sort({ createdAt: 1 });
  return msgs.map(m => ({
    id: m._id,
    chatId: m.chatId,
    sender: m.sender,
    text: m.text,
    createdAt: m.createdAt
  }));
}

export async function addMessage(chatId, message) {
  const newMessage = new Message({
    chatId,
    sender: message.sender,
    text: message.text
  });
  await newMessage.save();
  return {
    id: newMessage._id,
    chatId: newMessage.chatId,
    sender: newMessage.sender,
    text: newMessage.text,
    createdAt: newMessage.createdAt
  };
}
