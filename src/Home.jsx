import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

function Home() {
  const navigate = useNavigate();

  const slides = [
    { icon: '🚀', tag: 'INFERENCE', title: 'AI Powered Chatbot', description: 'Instant, contextual replies driven by cutting-edge Groq LLM models.' },
    { icon: '🔐', tag: 'SECURITY', title: 'Secure Authentication', description: 'Chat histories and credentials encrypted and protected by JWT auth.' },
    { icon: '🗄️', tag: 'PERSISTENCE', title: 'Zero-Config Storage', description: 'Never lose a session — conversations are saved automatically.' },
    { icon: '⚡', tag: 'SPEED', title: 'Lightning-Fast Replies', description: "Powered by Groq's high-speed inference engine for real-time responses." },
    { icon: '🧠', tag: 'CONTEXT', title: 'Conversation Memory', description: 'Full chat history is sent back to the model for coherent, contextual answers.' }
  ];

  return (
    <div className="home-container">
      <div className="home-glow home-glow-a" />
      <div className="home-glow home-glow-b" />

      <div className="home-content">
        <div className="home-badge">Next-Generation Workspace</div>

        <h1 className="home-title">
          Meet your next intelligent companion.
        </h1>

        <p className="home-subtitle">
          A full-stack, secure workspace with custom chat sessions, persistent databases, and real-time Groq LLM integration.
        </p>

        {/* Tech feature carousel powered by Swiper */}
        <Swiper
          modules={[Autoplay, EffectCoverflow, Pagination]}
          effect="coverflow"
          grabCursor
          centeredSlides
          loop
          slidesPerView={'auto'}
          coverflowEffect={{ rotate: 25, stretch: 0, depth: 120, modifier: 1.2, slideShadows: false }}
          autoplay={{ delay: 2800, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="feature-swiper"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="feature-slide">
              <div className="feature-card">
                <div className="feature-tag">{slide.tag}</div>
                <div className="feature-icon">{slide.icon}</div>
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="home-actions">
          <button type="button" className="primary-btn" onClick={() => navigate('/register')}>
            Get Started
          </button>
          <button type="button" className="ghost-btn" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
