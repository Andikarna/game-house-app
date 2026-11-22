'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Sparkles } from 'lucide-react';
import { useGameStore } from '../../../stores/useGameStore';
import { getGlobalSocket } from '../../../hooks/useSocket';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';

const QUICK_CHATS = [
  'Halo semua! 👋',
  'Ayo gilirannya! ⏰',
  'Hoki banget! 🎲',
  'Waduh kena makan! 😱',
  'Jangan makan bidakku! 🙏',
  'GGWP! Seru banget 🔥',
  'Ada yang AFK kah? 🤔',
  'Semangat semuanya! 💪',
];

export const LudoChatBox: React.FC = () => {
  const { socket, chatMessages, playerId } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(chatMessages?.length || 0);

  const activeSocket = socket || getGlobalSocket();

  // Track unread messages when chat popup is closed
  useEffect(() => {
    const curLen = chatMessages?.length || 0;
    if (curLen > prevMessagesLength.current) {
      if (!isOpen) {
        setUnreadCount((c) => c + (curLen - prevMessagesLength.current));
      }
    }
    prevMessagesLength.current = curLen;
  }, [chatMessages, isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    setUnreadCount(0);
  };

  const handleSendMessage = (textToSend?: string) => {
    const msg = (textToSend || inputText).trim();
    if (!msg || msg.length > 60) return;

    if (activeSocket) {
      activeSocket.emit('game:chat', { message: msg });
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 left-4 z-40 sm:bottom-6 sm:left-6 select-none">
      {/* Floating Chat Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-3 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-[0_8px_25px_rgba(79,70,229,0.55)] border border-indigo-400/40 backdrop-blur-md active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
        title="Buka Obrolan / Chat Bebas"
      >
        <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
        
        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[20px] rounded-full bg-rose-500 text-white text-[10px] font-black font-mono border-2 border-slate-900 shadow-lg animate-bounce flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Expandable Chat Drawer Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute bottom-16 left-0 w-[290px] sm:w-[330px] rounded-3xl bg-slate-950/95 border border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-black text-white tracking-wide uppercase">
                  Obrolan Papan Ludo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recent Messages Area */}
            <div className="p-3 max-h-[160px] overflow-y-auto flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-700">
              {(!chatMessages || chatMessages.length === 0) ? (
                <div className="py-6 text-center text-slate-500 text-xs italic">
                  Belum ada pesan. Ketik pesan atau pilih opsi cepat di bawah!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.playerId === playerId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <ClimberAvatarIcon avatar={msg.avatar} size={22} />
                      <div
                        className={`px-2.5 py-1.5 rounded-2xl max-w-[80%] text-xs ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-700/60'
                        }`}
                      >
                        <div className="text-[9px] font-black opacity-75 mb-0.5 truncate">
                          {isMe ? 'Anda' : msg.nickname}
                        </div>
                        <p className="font-medium break-words leading-tight">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Phrase Chips */}
            <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {QUICK_CHATS.map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(phrase)}
                  className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600 text-[10px] font-bold text-slate-300 hover:text-white whitespace-nowrap border border-slate-700/60 hover:border-indigo-400 transition-all shrink-0 active:scale-95 cursor-pointer"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Free Text Input Form */}
            <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={60}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik chat bebas... (max 60)"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-400 focus:outline-none text-white placeholder-slate-500 font-medium pr-10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500">
                  {inputText.length}/60
                </span>
              </div>

              <button
                type="button"
                disabled={!inputText.trim()}
                onClick={() => handleSendMessage()}
                className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                  inputText.trim()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Kirim Pesan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
