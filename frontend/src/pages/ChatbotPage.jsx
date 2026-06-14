import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Plus, MessageSquare, Loader2, User } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier, triageTiers } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ChatbotPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef(null);
  const userTier = getDischargeTier(user?.discharge);
  const tierInfo = triageTiers[userTier];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    axios.get(`${API}/api/chat/sessions`, { withCredentials: true })
      .then(r => setSessions(r.data.sessions))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const createSession = async () => {
    try {
      const { data } = await axios.post(`${API}/api/chat/sessions`, {}, { withCredentials: true });
      setActiveSession(data.session_id);
      setMessages([]);
      setSessions(prev => [{ session_id: data.session_id, preview: 'New conversation', created_at: new Date().toISOString() }, ...prev]);
    } catch {
      toast.error('Failed to create session');
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const { data } = await axios.get(`${API}/api/chat/sessions/${sessionId}`, { withCredentials: true });
      setActiveSession(sessionId);
      setMessages(data.messages || []);
    } catch {
      toast.error('Failed to load session');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    if (!activeSession) {
      try {
        const { data } = await axios.post(`${API}/api/chat/sessions`, {}, { withCredentials: true });
        setActiveSession(data.session_id);
        setSessions(prev => [{ session_id: data.session_id, preview: input.slice(0, 80), created_at: new Date().toISOString() }, ...prev]);
        await doSend(data.session_id, input);
      } catch {
        toast.error('Failed to create session');
      }
      return;
    }
    await doSend(activeSession, input);
  };

  const doSend = async (sessionId, text) => {
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const { data } = await axios.post(
        `${API}/api/chat/sessions/${sessionId}/message`,
        { message: text },
        { withCredentials: true }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);
      // Update session preview
      setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, preview: text.slice(0, 80) } : s));
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setSending(false);
  };

  const suggestions = [
    { text: 'What benefits am I eligible for?', icon: '🎯' },
    { text: 'How do I upgrade my discharge?', icon: '📋' },
    { text: 'Find me a job program', icon: '💼' },
    { text: 'I need mental health support', icon: '💚' },
    { text: 'Help me start a business', icon: '🚀' },
    { text: 'What does my RE code mean?', icon: '🔍' },
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]" data-testid="chatbot-page">
        <PageSEO path="/chat" />
        <div className="flex h-full gap-4">
          {/* Sidebar - Sessions */}
          <div className="hidden md:flex flex-col w-56 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Conversations</h2>
              <Button size="sm" variant="outline" className="h-7 rounded-md" onClick={createSession} data-testid="new-chat-btn">
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {loadingSessions ? (
                  <div className="p-3 text-xs text-muted-foreground">Loading...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No conversations yet</div>
                ) : sessions.map(s => (
                  <button
                    key={s.session_id}
                    onClick={() => loadSession(s.session_id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${
                      activeSession === s.session_id ? 'bg-secondary text-white' : 'hover:bg-muted text-muted-foreground'
                    }`}
                    data-testid={`session-${s.session_id}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span className="truncate">{s.preview || 'New conversation'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <Card className="flex-1 border rounded-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Veteran Passage AI</p>
                  <p className="text-[10px] text-muted-foreground">Powered by GPT-5.2</p>
                </div>
              </div>
              {tierInfo && (
                <Badge className={`${tierInfo.bgColor} ${tierInfo.color} border-0 rounded-full text-xs`}>{tierInfo.label}</Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center mb-4">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">How can I help you today?</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    Ask me anything about veteran benefits, discharge upgrades, career paths, or support resources.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(s.text); }}
                        className="p-3 text-sm text-left border-2 rounded-xl hover:border-secondary/40 hover:bg-secondary/5 transition-all text-foreground font-medium flex items-center gap-2"
                        data-testid={`suggestion-${i}`}
                      >
                        <span className="text-lg">{s.icon}</span>
                        {s.text}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    This assistant only answers questions about veteran benefits, services, and the Veteran Passage platform.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-secondary text-white rounded-br-md'
                          : 'bg-muted/50 text-foreground border rounded-bl-md'
                      }`} data-testid={`message-${i}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {sending && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="p-3 rounded-2xl rounded-bl-md bg-muted/50 border">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <form onSubmit={sendMessage} className="flex gap-2" data-testid="chat-form">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about benefits, careers, discharge upgrades..."
                  className="flex-1 h-10 rounded-xl"
                  disabled={sending}
                  data-testid="chat-input"
                />
                <Button type="submit" className="rounded-xl bg-secondary hover:bg-secondary/90 h-10 px-4" disabled={!input.trim() || sending} data-testid="chat-send-btn">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
