
import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { AppSettings, FixedAsset, InventoryItem, Contract, Supplier, ComputerUsageRecord, User } from '../types';
import { chatWithAiAgent } from '../services/geminiService';

interface GlobalAiAssistantProps {
    assets: FixedAsset[];
    inventory: InventoryItem[];
    contracts: Contract[];
    suppliers: Supplier[];
    records: ComputerUsageRecord[];
    settings: AppSettings;
    currentUser: User | null;
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export const GlobalAiAssistant: React.FC<GlobalAiAssistantProps> = ({
    assets, inventory, contracts, suppliers, records, settings, currentUser, isOpen, onClose
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: 'init', 
            role: 'assistant', 
            content: `你好 ${currentUser?.name || ''}！我是资产管家 AI 助手。\n我可以帮你查询库存、分析资产或解答关于系统数据的问题。`, 
            timestamp: Date.now() 
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // Update greeting when user changes
    useEffect(() => {
        setMessages([
            { 
                id: 'init', 
                role: 'assistant', 
                content: `你好 ${currentUser?.name || ''}！我是资产管家 AI 助手。\n我可以帮你查询库存、分析资产或解答关于系统数据的问题。`, 
                timestamp: Date.now() 
            }
        ]);
    }, [currentUser]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // 准备历史记录
            const history = messages.slice(-5).map(m => ({
                role: m.role,
                content: m.content
            }));

            // 增强 Context，加入用户信息
            const enhancedQuery = `当前用户: ${currentUser?.name} (角色: ${currentUser?.role})。问题: ${userMsg.content}`;

            const responseText = await chatWithAiAgent(
                enhancedQuery,
                { assets, inventory, contracts, suppliers, records },
                settings,
                history
            );

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `抱歉，遇到错误: ${error.message || '无法连接 AI 服务'}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // If no user is logged in, don't show the bot
    if (!currentUser) return null;

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div 
                    className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right animate-slide-up ${
                        isExpanded ? 'w-[800px] h-[80vh] max-w-[calc(100vw-48px)]' : 'w-[380px] h-[600px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)]'
                    }`}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">资产管家 AI</h3>
                                <div className="flex items-center gap-1.5 opacity-80">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                    <span className="text-xs">在线 · {currentUser.name}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)} 
                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                title={isExpanded ? "缩小" : "放大"}
                            >
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button 
                                onClick={onClose} 
                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                title="关闭"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                                <div 
                                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                    }`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 mb-1 text-xs text-blue-600 font-bold opacity-80">
                                            <Bot size={12} /> AI Assistant
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>思考中...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100 rounded-b-2xl">
                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入问题，例如：库存最少的物资是？"
                                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none text-sm transition-colors"
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <div className="text-center mt-2">
                             <p className="text-[10px] text-slate-400">AI 可能产生不准确的信息，请以系统实际数据为准。</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
