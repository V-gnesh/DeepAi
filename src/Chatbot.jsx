import { useState, useEffect, useRef } from 'react';
import { api } from './api';

function Chatbot({ user, handleLogout }) {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [createChatTitle, setCreateChatTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [heroInput, setHeroInput] = useState('');

  const messagesEndRef = useRef(null);

  // Load chat sessions on mount
  useEffect(() => {
    async function loadChats() {
      try {
        const res = await api.fetchChats();
        setChats(res.chats || []);
      } catch (err) {
        console.error('Failed to load chats:', err.message);
      }
    }
    loadChats();
  }, []);

  // Scroll to bottom when messages or typing status changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSelectChat = async (chat) => {
    setCurrentChat(chat);
    setChatLoading(true);
    try {
      const res = await api.fetchMessages(chat.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!createChatTitle.trim()) return;

    try {
      const res = await api.createChat(createChatTitle);
      const newChat = res.chat;
      setChats([newChat, ...chats]);
      setCurrentChat(newChat);
      setMessages([]);
      setCreateChatTitle('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating chat:', err.message);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation(); // Stop click from selecting the deleted chat
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await api.deleteChat(chatId);
      setChats(chats.filter(c => c.id !== chatId));
      if (currentChat && currentChat.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error deleting chat:', err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentChat) return;

    const userText = inputMessage;
    setInputMessage('');
    
    // Optimistic UI update: show user message instantly
    const tempUserMsg = {
      id: 'temp_user_' + Date.now(),
      chatId: currentChat.id,
      sender: 'user',
      text: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    setIsTyping(true);

    try {
      // Simulate slight network typing delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await api.sendMessage(currentChat.id, userText);
      
      // Update with server responses
      setMessages(prev => 
        prev.filter(m => m.id !== tempUserMsg.id)
            .concat([res.userMessage, res.botMessage])
      );
    } catch (err) {
      console.error('Failed to send message:', err.message);
    } finally {
      setIsTyping(false);
    }
  };

  // Format initials helper for profile avatar
  const getInitials = (userName) => {
    if (!userName) return 'AI';
    const parts = userName.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  // Time-of-day greeting, like "Good Evening"
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const suggestionCards = [
    { title: 'Explain a Concept', text: 'Break down a complex topic into something simple and explain it to me.' },
    { title: 'Write Some Code', text: 'Help me write a clean, well-documented function for my project.' },
    { title: 'Brainstorm Ideas', text: 'Help me brainstorm fresh ideas for a project I am working on.' }
  ];

  // Create a chat (auto-titled) and immediately send the first message — used by the greeting screen
  const handleQuickStart = async (e) => {
    e.preventDefault();
    const text = heroInput.trim();
    if (!text) return;

    try {
      const title = text.length > 36 ? text.slice(0, 36) + '…' : text;
      const res = await api.createChat(title);
      const newChat = res.chat;
      setChats(prev => [newChat, ...prev]);
      setCurrentChat(newChat);
      setMessages([]);
      setHeroInput('');

      const tempUserMsg = {
        id: 'temp_user_' + Date.now(),
        chatId: newChat.id,
        sender: 'user',
        text,
        createdAt: new Date().toISOString()
      };
      setMessages([tempUserMsg]);
      setIsTyping(true);

      const msgRes = await api.sendMessage(newChat.id, text);
      setMessages([msgRes.userMessage, msgRes.botMessage]);
    } catch (err) {
      console.error('Quick start failed:', err.message);
    } finally {
      setIsTyping(false);
    }
  };


  // Custom text formatter for chatbot messages
  const renderMessageText = (text) => {
    if (!text) return null;
    
    // Split message by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Parse code blocks
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        
        return (
          <div key={index} className="code-block-container">
            {language && <div className="code-block-header">{language}</div>}
            <pre className="code-block"><code>{code.trim()}</code></pre>
          </div>
        );
      }
      
      const lines = part.split('\n');
      return (
        <div key={index} className="text-paragraphs">
          {lines.map((line, lIdx) => {
            let content = line;
            
            // Bold formatting **text**
            const boldRegex = /\*\*(.*?)\*\*/g;
            const boldParts = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldRegex.exec(content)) !== null) {
              if (match.index > lastIndex) {
                boldParts.push(content.substring(lastIndex, match.index));
              }
              boldParts.push(<strong key={match.index}>{match[1]}</strong>);
              lastIndex = boldRegex.lastIndex;
            }
            if (lastIndex < content.length) {
              boldParts.push(content.substring(lastIndex));
            }
            
            const renderedLine = boldParts.length > 0 ? boldParts : content;

            // Check if bullet list item
            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
              return (
                <ul key={lIdx} className="chat-bullet-list">
                  <li>{boldParts.length > 0 ? boldParts : line.trim().substring(2)}</li>
                </ul>
              );
            }

            // Check if empty line
            if (line.trim() === '') {
              return <div key={lIdx} className="chat-line-spacer" />;
            }

            return <p key={lIdx}>{renderedLine}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="chat-container">
      {/* Sidebar Navigation */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <div className="app-brand">
            <span className="brand-logo">▲</span>
            <span className="brand-name">DeepAI</span>
          </div>
          <button 
            type="button" 
            className="new-chat-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span>+</span> New Chat
          </button>
        </div>

        {/* Chat List */}
        <nav className="chats-list">
          {chats.length === 0 ? (
            <div className="empty-chats-alert">No conversations yet</div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChat && currentChat.id === chat.id ? 'active' : ''}`}
                onClick={() => handleSelectChat(chat)}
              >
                <svg className="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="chat-title">{chat.title}</span>
                <button 
                  type="button" 
                  className="delete-chat-btn"
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  title="Delete chat session"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </nav>

        {/* User Footer Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{getInitials(user.name)}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout} title="Log Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Conversation Window */}
      <main className="chat-main">
        {currentChat ? (
          <>
            {/* Active Chat Header */}
            <header className="chat-header">
              <div className="chat-meta">
                <h2>{currentChat.title}</h2>
                <div className="status-indicator">
                  <span className="dot online"></span>
                  <span className="status-text">DeepAI (Online)</span>
                </div>
              </div>
            </header>

            {/* Messages Log */}
            <div className="messages-viewport">
              {chatLoading ? (
                <div className="viewport-loader">
                  <div className="loader-spinner"></div>
                  <p>Retrieving messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="start-prompt">
                  <span className="prompt-icon">💡</span>
                  <h3>Start of conversation</h3>
                  <p>Send a message below to start chatting with DeepAI.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`message-row ${msg.sender === 'user' ? 'user-sent' : 'bot-sent'}`}>
                    <div className="message-bubble-wrapper">
                      <div className="msg-avatar">
                        {msg.sender === 'user' ? getInitials(user.name) : 'AI'}
                      </div>
                      <div className="message-bubble">
                        <div className="message-content">
                          {renderMessageText(msg.text)}
                        </div>
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Thinking typing dots indicator */}
              {isTyping && (
                <div className="message-row bot-sent">
                  <div className="message-bubble-wrapper">
                    <div className="msg-avatar">AI</div>
                    <div className="message-bubble typing-bubble">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <footer className="chat-input-area">
              <form onSubmit={handleSendMessage} className="message-form">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Message DeepAI..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isTyping}
                />
                <button type="submit" className="send-message-btn" disabled={!inputMessage.trim() || isTyping}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </footer>
          </>
        ) : (
          /* Greeting / Empty Chat Hero */
          <div className="greeting-hero">
            <div className="greeting-orb" />
            <h1 className="greeting-text">
              {getGreeting()}, {user.name.split(' ')[0]}.<br />
              Can I help you with anything?
            </h1>

            <form onSubmit={handleQuickStart} className="hero-input-card">
              <textarea
                className="hero-textarea"
                placeholder="Message DeepAI..."
                rows={1}
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleQuickStart(e);
                  }
                }}
              />
              <div className="hero-input-toolbar">
                <div className="hero-toolbar-left">
                  <button type="button" className="hero-tool-btn" title="Attach a file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  </button>
                  <button type="button" className="hero-tool-btn hero-tool-btn-text" title="Create an image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    Create an image
                  </button>
                  <button type="button" className="hero-tool-btn hero-tool-btn-text" title="Search the web">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    Search the web
                  </button>
                </div>
                <div className="hero-toolbar-right">
                  <button type="submit" className="hero-tool-btn hero-send-btn" disabled={!heroInput.trim()} title="Send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            </form>

            <div className="suggestion-cards">
              {suggestionCards.map((card, idx) => (
                <button
                  type="button"
                  key={idx}
                  className="suggestion-card"
                  onClick={() => setHeroInput(card.text)}
                >
                  <h4>{card.title}</h4>
                  <p>{card.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal for creating a Chat Session */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>New Chat Session</h3>
            <form onSubmit={handleCreateChat}>
              <div className="form-group">
                <label htmlFor="modal-chat-title">Topic or Title</label>
                <input
                  id="modal-chat-title"
                  type="text"
                  placeholder="e.g. Node Backend Help"
                  value={createChatTitle}
                  onChange={(e) => setCreateChatTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;
