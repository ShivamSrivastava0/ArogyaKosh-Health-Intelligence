import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineSparkles,
  HiOutlinePaperAirplane,
  HiOutlineDocumentText,
  HiOutlineCloudArrowUp,
  HiOutlineInformationCircle,
  HiOutlineUser,
  HiOutlineCpuChip,
  HiOutlineXMark,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, parseDocument, getInsights } from '../services/intelligenceService';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Loader, { Spinner } from '../components/ui/Loader';

const QUICK_PROMPTS = [
  { text: 'Summarize my overall health status', icon: '🩺' },
  { text: 'What lifestyle changes should I make based on my profile?', icon: '🏃' },
  { text: 'Explain my recent lab results in simple language', icon: '🔬' },
  { text: 'Are there any drug interactions with my current medicines?', icon: '💊' },
  { text: 'What preventive health screenings do I need?', icon: '📋' },
  { text: 'Suggest a diet plan based on my health data', icon: '🥗' },
];

export default function Intelligence() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [parseFile, setParseFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(msg, history);

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.data.response },
        ]);
        if (res.data.contextInfo) setContextInfo(res.data.contextInfo);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get response');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const res = await getInsights();
      if (res.success && res.data?.insights) {
        setInsightsData(res.data.insights);
      } else {
        toast(res.data?.message || 'Not enough data for insights', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Failed to fetch insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleParseFile = async () => {
    if (!parseFile) return;
    try {
      setParsing(true);
      const formData = new FormData();
      formData.append('file', parseFile);
      const res = await parseDocument(formData);
      if (res.success) {
        setParseResult(res.data.parsed);
        toast.success('Document parsed successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Parsing failed');
    } finally {
      setParsing(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setContextInfo(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-6"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-purple-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl mb-6">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -top-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-700/50 backdrop-blur-md border border-purple-500/30 text-purple-200 text-xs font-medium mb-3">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-300" />
              Powered by Gemini 1.5 Flash
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health Intelligence</h1>
            <p className="text-purple-100/80 mt-1 text-sm">
              AI-powered assistant that understands your health profile, reports, and medical history.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              onClick={() => setParseModalOpen(true)}
            >
              <HiOutlineCloudArrowUp className="w-4 h-4 mr-1.5" />
              Parse Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-white text-purple-900 hover:bg-purple-50 border-0"
              onClick={fetchInsights}
              isLoading={insightsLoading}
            >
              <HiOutlineSparkles className="w-4 h-4 mr-1.5" />
              Get Insights
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Panel — Main */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <HiOutlineCpuChip className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">ArogyaKosh Health Assistant</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  Ask me anything about your health. I have access to your profile, medical reports, and health history.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => handleSend(p.text)}
                      className="text-left p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-xs text-slate-700 group"
                    >
                      <span className="mr-1.5">{p.icon}</span>
                      <span className="group-hover:text-purple-700">{p.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HiOutlineCpuChip className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div
                        className="prose prose-sm prose-slate max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HiOutlineUser className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <HiOutlineCpuChip className="w-4 h-4 text-purple-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <Spinner size="sm" color="slate" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-200 p-3 sm:p-4 bg-slate-50/50">
            <div className="flex items-end gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <HiOutlineArrowPath className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your health..."
                  rows={1}
                  className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm resize-none pr-12 py-3"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <HiOutlinePaperAirplane className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              ArogyaKosh AI provides health information, not medical diagnoses. Always consult a physician.
            </p>
          </div>
        </div>

        {/* Side Panel — Context & Insights */}
        <div className="lg:col-span-1 space-y-4">
          {/* Context Info */}
          <Card className="border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineInformationCircle className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">AI Context</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Health Profile</span>
                <Badge variant={contextInfo?.hasProfile ? 'success' : 'neutral'} size="sm">
                  {contextInfo?.hasProfile ? 'Connected' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Medical Reports</span>
                <Badge variant={contextInfo?.reportCount > 0 ? 'success' : 'neutral'} size="sm">
                  {contextInfo?.reportCount ?? 0} Reports
                </Badge>
              </div>
            </div>
          </Card>

          {/* ArogyaScore Insights */}
          {insightsData && (
            <Card className="border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineSparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">ArogyaScore™</h3>
              </div>
              <div className="text-center py-3">
                <span className="text-4xl font-extrabold text-purple-700">{insightsData.arogyaScore}</span>
                <span className="text-lg text-slate-400">/100</span>
                <p className="text-xs text-slate-500 mt-1">{insightsData.category}</p>
              </div>
              {insightsData.insights?.slice(0, 3).map((ins, i) => (
                <div key={i} className="mt-2 p-2 bg-slate-50 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-700">{ins.area}</span>
                    <Badge variant={ins.status === 'GOOD' ? 'success' : ins.status === 'ATTENTION' ? 'warning' : 'danger'} size="sm">{ins.status}</Badge>
                  </div>
                  <p className="text-slate-500">{ins.summary}</p>
                </div>
              ))}
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setParseModalOpen(true)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition-colors text-xs text-slate-700 flex items-center gap-2"
              >
                <HiOutlineDocumentText className="w-4 h-4 text-purple-500" />
                Parse a Medical Report
              </button>
              <button
                onClick={fetchInsights}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition-colors text-xs text-slate-700 flex items-center gap-2"
              >
                <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
                Refresh ArogyaScore
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Parse Document Modal */}
      {parseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setParseModalOpen(false); setParseResult(null); setParseFile(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Parse Medical Document</h2>
              <button onClick={() => { setParseModalOpen(false); setParseResult(null); setParseFile(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><HiOutlineXMark className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!parseResult ? (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
                  >
                    {parseFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <HiOutlineDocumentText className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-slate-700">{parseFile.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setParseFile(null); }} className="p-1 hover:bg-slate-200 rounded"><HiOutlineXMark className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div>
                        <HiOutlineCloudArrowUp className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">Upload a medical report (PDF, JPG, PNG)</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setParseFile(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setParseModalOpen(false); setParseFile(null); }}>Cancel</Button>
                    <Button variant="primary" isLoading={parsing} onClick={handleParseFile} className="bg-purple-600 hover:bg-purple-700">
                      <HiOutlineSparkles className="w-4 h-4 mr-1.5" />Parse with AI
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="font-bold text-slate-900">Parsed Results</h3>
                  {parseResult.reportType && (
                    <div className="flex items-center gap-2">
                      <Badge variant="info" size="sm">{parseResult.reportType}</Badge>
                    </div>
                  )}
                  {parseResult.summary && (
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-slate-700">{parseResult.summary}</div>
                  )}
                  {parseResult.keyFindings?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Key Findings</h4>
                      <div className="space-y-1">
                        {parseResult.keyFindings.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                            <span className="text-slate-700 font-medium">{f.parameter}</span>
                            <div className="flex items-center gap-2">
                              <span>{f.value} {f.unit}</span>
                              <Badge variant={f.status === 'NORMAL' ? 'success' : f.status === 'CRITICAL' ? 'danger' : 'warning'} size="sm">{f.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseResult.abnormalValues?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-rose-700 mb-2">⚠️ Abnormal Values</h4>
                      {parseResult.abnormalValues.map((a, i) => (
                        <div key={i} className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-xs mb-1">
                          <p className="font-semibold text-rose-800">{a.parameter}: {a.value} ({a.status})</p>
                          <p className="text-rose-600">{a.clinicalSignificance}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => { setParseModalOpen(false); setParseResult(null); setParseFile(null); }}>Close</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Simple markdown-to-HTML converter for AI responses
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-200 rounded text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return match;
    });
}
