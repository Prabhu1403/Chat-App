"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ArrowLeft, Check, CheckCheck, Send, Trash2, Archive, User, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import CreateChatPopup from "@/components/createchatpopup";
import { socket } from "@/utils/socket"

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  profilePicture: string | null;
  unread: number;
  online: boolean;
  is_archived?: boolean;
  groupId?: string | number;
  status?: string;
}

interface Menu {
  visiable: boolean;
  x: number;
  y: number;
  conversation: Conversation;
}

function ConversationContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "archived">("all");
  const [selectedContacts, setSelectedContacts] = useState<Conversation[]>([]);
  const [forwardText, setForwardText] = useState("");
  const [menu, setMenu] = useState<Menu | null>({
    visiable: false, x: 0, y: 0, conversation: { id: "", name: "", lastMessage: "", lastMessageTime: "", profilePicture: null, unread: 0, online: false }
  })

  const renderStatus = (status?: string) => {
    if (status === "seen") return <CheckCheck size={16} className="text-[#53bdeb]" />;
    if (status === "delivered") return <CheckCheck size={16} className="text-[#667781]" />;
    return <Check size={16} className="text-[#667781]" />;
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const isForward = searchParams.get("isForward") === "true";
  const forwardMessage = searchParams.get("forwardMessage");
  const senderId = searchParams.get("senderId");

  const handleConversationClick = async (chatId: string) => {
    if (isForward) {
      const chat = conversations.find((c) => c.id === chatId);
      if (!chat) return;
      if (selectedContacts.find((c) => c.id === chat.id)) {
        setSelectedContacts(selectedContacts.filter((c) => c.id !== chat.id));
      } else {
        setSelectedContacts([...selectedContacts, chat]);
      }
      return;
    }

    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push(`/chat/${chatId}`);
      return;
    }
    const user = JSON.parse(userStr);
    const userId = user.userId || user.id;

    try {
      socket.emit("mark_message_read", { senderId: chatId, receiverId: userId }, (response: any) => {
        if (response?.success) {
          const updatedConversation = conversations.map((conversation) => {
            if (conversation.id === userId) {
              return {
                ...conversation,
                isRead: true,
                status: "seen"

              }
            }
            return conversation
          })
          setConversations(updatedConversation)
        }
      })
    } catch (error) {
      console.error("Error marking messages as read:", error);
    } finally {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleShowMenu = () => {
    setMenu((prev) => prev ? { ...prev, visiable: false } : prev);
  };

  const handleContextClick = (e: any, chat: any) => {
    
    e.preventDefault();
    setMenu({
      visiable: true,
      x: e.clientX,
      y: e.clientY,
      conversation: chat,
    });
  };

  const handleDeleteChat = async () => {
    console.log("Delete chat", menu?.conversation);
    const otherUserId = menu?.conversation?.id;
    if (!otherUserId) return;

    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const userId = user.userId || user.id;

    try {
      await axios.delete("http://localhost:8000/api/messages/conversation", {
        data: { userId, otherUserId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setConversations((prev) => {
        return prev.filter((conversation) => conversation.id !== otherUserId)
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }

    handleShowMenu();
  };

  const handleArchiveChat = async () => {
    console.log("Archive chat", menu?.conversation);
    const otherUserId = menu?.conversation?.id;
    if (!otherUserId) return;

    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const userId = user.userId || user.id;

    try {
      await axios.put("http://localhost:8000/api/messages/archive", {
        userId,
        otherUserId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setConversations((prev) => 
        prev.map((c) => c.id === otherUserId ? { ...c, is_archived: true } : c)
      );
    } catch (error) {
      console.error("Error archiving conversation:", error);
    }
    handleShowMenu();
  };

  const handleViewContact = () => {
    console.log("View contact", menu?.conversation);
    handleShowMenu();
  };

  const handleForwardSend = async () => {
    try {

      for (const contact of selectedContacts) {
        if (contact.groupId) {
          socket.emit("send_group_message", {
            senderId: senderId,
            room: contact.name,
            message: forwardMessage,
            is_forward: true,
            forwarded_from: senderId
          });
        } else {
          socket.emit("send_message", {
            senderId: senderId,
            receiverId: contact.id || null,
            message: forwardMessage,
            is_forward: true,
            forwarded_from: senderId
          });
        }
      }

      router.push("/conversation");
    } catch (e) {
      console.error(e);
    }
  };

  const getDate = (date: string) => {
    const today = new Date();
    let label = ""
    const yesterday = new Date(today);
    const messageDate = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1)
    if (messageDate.toDateString() === today.toDateString()) {
      label = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }
    else if (messageDate.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    }
    else {
      label = messageDate.toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }

    return label;
  };

  useEffect(() => {
    const fetchConversations = async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const userId = user.userId || user.id;

      try {
        const response = await axios.get(`http://localhost:8000/api/conversations`, {
          params: { userId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setConversations(response.data);
      } catch (error: any) {
        console.error("Error fetching conversations:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
        }
      }
    };

    fetchConversations();
  }, []);

  console.log("conversation",conversations);
  

  // If NOT in forward mode, show the welcome screen
  if (!isForward) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F0F2F5]">
        <div className="text-center max-w-md">
          <div className="w-[200px] h-[200px] mx-auto mb-8 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-[#E3F2FD] flex items-center justify-center">
                <MessageCircle size={56} className="text-[#2196F3]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg">
                <Send size={18} className="text-white ml-0.5" />
              </div>
            </div>
          </div>
          <h2 className="text-[28px] font-light text-[#41525D] mb-3">ChatApp Web</h2>
          <p className="text-[14px] text-[#667781] leading-relaxed mb-8">
            Send and receive messages from the sidebar.<br />
            Select a conversation to start chatting.
          </p>
          <div className="flex items-center justify-center gap-2 text-[13px] text-[#667781]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#667781]">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/>
              <path d="M8 4a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .146.354l2 2a.5.5 0 0 0 .708-.708L8.5 8.293V4.5A.5.5 0 0 0 8 4z" fill="currentColor"/>
            </svg>
            End-to-end encrypted
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-8 bg-[#2196F3] text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-[#1976D2] transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Start New Chat
          </button>
        </div>

        <CreateChatPopup
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  // Forward mode UI
  return (
    <div className="relative h-full bg-[#F0F2F5] flex flex-col">
      <div className="bg-white border-b border-[#E9EDEF] px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-[#F0F2F5] rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#54656F]" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#111B21]">Forward to...</h1>
            <p className="text-xs text-[#667781]">{selectedContacts.length} selected</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            onClick={() => handleConversationClick(chat.id)}
            onContextMenu={(e) => handleContextClick(e, chat)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F6F6] cursor-pointer transition-colors border-b border-[#F0F2F5]"
          >
            <div className="relative flex-shrink-0">
              <img
                src={chat.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.name}`}
                className="w-[50px] h-[50px] rounded-full object-cover"
                alt=""
              />
              {/* {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-white rounded-full"></div>} */}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[#111B21] text-[15px] truncate">{chat.name}</h4>
              <p className="text-[13px] text-[#667781] truncate flex items-center gap-1">
                {chat.lastMessage && renderStatus(chat.status)}
                <span className="truncate">{chat.lastMessage}</span>
              </p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedContacts.find((c) => c.id === chat.id) ? 'bg-[#2196F3] border-[#2196F3]' : 'border-[#C5C6C8] bg-transparent'}`}>
              {selectedContacts.find((c) => c.id === chat.id) && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu Card */}
      {menu?.visiable && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleShowMenu}
          />
          <div
            style={{ top: menu.y, left: menu.x }}
            className="fixed z-50 min-w-[180px] bg-white rounded-xl shadow-2xl border border-[#E9EDEF] overflow-hidden py-1.5"
          >
            <button
              onClick={handleDeleteChat}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Chat
            </button>
            {activeTab !== 'archived' && (
              <button
                onClick={handleArchiveChat}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#54656F] hover:bg-[#F0F2F5] transition-colors"
              >
                <Archive className="w-4 h-4" />
                Archive Chat
              </button>
            )}
            <button
              onClick={handleViewContact}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#54656F] hover:bg-[#F0F2F5] transition-colors"
            >
              <User className="w-4 h-4" />
              View Contact
            </button> 
          </div>
        </>
      )}

      <CreateChatPopup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {isForward && (
        <div className="bg-white px-4 py-4 border-t border-[#E9EDEF]">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Add a message..."
              value={forwardText}
              onChange={(e) => setForwardText(e.target.value)}
              className="w-full bg-[#F0F2F5] rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196F3]"
            />
            <div className="flex items-center justify-between gap-4 pl-2">
              <div className="text-xs text-[#667781] font-medium truncate flex-1">
                {selectedContacts.length > 0 ? selectedContacts.map((c) => c.name).join(", ") : "No contacts selected"}
              </div>
              <button
                onClick={handleForwardSend}
                disabled={selectedContacts.length === 0}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors shrink-0 shadow-md ${selectedContacts.length > 0 ? 'bg-[#2196F3] hover:bg-[#1976D2]' : 'bg-[#C5C6C8]'}`}
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<div className="h-full bg-[#F0F2F5] flex items-center justify-center">Loading...</div>}>
      <ConversationContent />
    </Suspense>
  );
}