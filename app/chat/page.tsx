"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { socket } from "@/utils/socket";
import { useSearchParams, useRouter } from "next/navigation";

import { Send, Hash, ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Camera, Mic, Search, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
interface Message {
  room?: string;
  author?: string;
  senderId?: string;
  message: string;
  time?: string;
  createdAt?: string | Date;
}

function ChatContent() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = decodeURIComponent(searchParams.get("userId") || "Anonymous");
  const room = decodeURIComponent(searchParams.get("room") || "general");
  const groupId = Number(decodeURIComponent(searchParams.get("groupId")!));
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupMessageList, setGroupMessageList] = useState<Message[]>([]);
  const [senderProfile, setSenderProfile] = useState<any>([]);
  const { isSomeoneTyping, emitTyping } = useTypingIndicator({
    socket,
    senderId: userId,
    groupId: groupId
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  console.log(room, 'room');

  useEffect(() => {
    groupMessageList.map(async (msg: Message) => {
      try {
        const senderId = msg.senderId;
        const response = await axios.get(`http://localhost:8000/api/get-profile/${senderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },

        });
    console.log("raw response.data:", response.data)
        setSenderProfile((prev: any) => [...prev, response?.data?.data]);

      } catch (err) {
        console.error("Error fetching profile:", err);
      }

    })

  }, [groupMessageList]);


  

const getSenderName = (senderId: string): string => {
  const profile = senderProfile.find((item: any) => item.userId === senderId);
  console.log(profile, "profile");
  
  return profile?profile.name:"Anonymous";
}

  useEffect(() => {
    const fetchMessages = async () => {
      if (!groupId) return;
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(`http://localhost:8000/api/getGroupMessage?groupId=${groupId}&&userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },

        });
        const msgs = response.data?.groupMessage || (Array.isArray(response.data) ? response.data : []);
        setGroupMessageList([...msgs].reverse());
      } catch (err: any) {
        if (err.response?.status === 401) {
          console.error("Session expired. Redirecting to login...");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
        } else {
          console.error("Error fetching messages:", err);
          setError(err.message || "Something went wrong while fetching messages.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [groupId, room, router]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    if (groupId) {
      socket.emit("join_room", String(groupId));
    }

    socket.on("receive_group_message", (message: any) => {
      if (String(message.groupId) === String(groupId)) {
        setGroupMessageList((list: any) => [...list, message]);
      }
    });

    return () => {
      socket.off("receive_group_message");
    };
  }, [groupId, room]);


  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessageList]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentMessage.trim()) return;
    socket.emit('send_group_message', {
      room: room,
      senderId: userId,
      message: currentMessage,
      timestamp: new Date().toISOString()
    })
    setCurrentMessage("");
  };

  const handleOnChange = (e: any) => {
    setCurrentMessage(e.target.value);
    emitTyping();
  };

const getDate = (data:string)=>{
   
  const today = new Date()
  const messageDate = new Date(data);
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1);

  if(messageDate.toDateString()===today.toDateString()){
    return "Today"
  }
  if(messageDate.toDateString()===yesterday.toDateString()){
    return "Yesterday"
  }
  return messageDate.toLocaleDateString("en-IN",{
    year:"numeric",
    month:"short",
    day:"numeric",

  })

}

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] overflow-hidden">
      {/* Header */}
      <header className="h-[60px] flex items-center justify-between px-4 bg-[#F0F2F5] border-b border-[#E9EDEF] z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-[#E9EDEF] rounded-full transition-colors text-[#54656F] md:hidden"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2196F3] flex items-center justify-center text-white">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#111B21] leading-tight">{room}</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-[#667781]">
                  {isSomeoneTyping ? (
                    <span className="text-[#25D366] font-medium">someone is typing...</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                      Group · Live
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
            <Search size={20} />
          </button>
          <button className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-[6%] py-4 chat-scroll chat-bg-pattern">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#2196F3] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#667781] text-sm font-medium">Loading messages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p className="text-sm font-semibold mb-2">Failed to load messages</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center py-6 opacity-70">
              <div className="w-14 h-14 rounded-full bg-[#2196F3]/10 flex items-center justify-center mb-3">
                <Users size={28} className="text-[#2196F3]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#111B21]">{room}</h3>
              <p className="text-[13px] text-[#667781] max-w-xs text-center mt-1">
                Messages in this group are visible to all members.
              </p>
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#E9EDEF] to-transparent my-6" />
            </div>

            <AnimatePresence initial={false}>
              {groupMessageList.map((msg, index) => {
                const isMe = (msg.senderId || msg.author) === userId;
                const authorName = getSenderName(msg.senderId || "");
                const messageTime = msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "");
                
                let showDateSeparator = false;

                const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
                const prevMsgDate = index > 0 && groupMessageList[index - 1].createdAt ? new Date(groupMessageList[index - 1].createdAt as string | Date) : (index > 0 ? new Date() : null);

                if (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString()) {
                  showDateSeparator = true;
                }

                return (
                  <React.Fragment key={index}>
                    {showDateSeparator && (
                      <div className="flex justify-center py-3 my-1">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-lg text-[12px] font-medium text-[#54656F] shadow-sm">
                          {getDate(String(msg.createdAt))}
                        </div>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex mb-1 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-3 py-1.5 rounded-lg shadow-sm relative transition-all ${isMe
                            ? "bg-[#D9FDD3] text-[#111B21] rounded-tr-none"
                            : "bg-white text-[#111B21] rounded-tl-none"
                            }`}
                          style={{
                            boxShadow: '0 1px 0.5px rgba(11,20,26,.13)'
                          }}
                        >
                          {/* Bubble tail */}
                          <div className={`absolute top-0 w-3 h-3 ${
                            isMe 
                              ? "-right-2 text-[#D9FDD3]" 
                              : "-left-2 text-white"
                          }`}>
                            <svg viewBox="0 0 8 13" width="8" height="13">
                              {isMe ? (
                                <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" fill="currentColor"/>
                              ) : (
                                <path opacity=".13" d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" fill="currentColor"/>
                              )}
                            </svg>
                          </div>

                          {!isMe && (
                            <p className="text-[12px] font-semibold text-[#2196F3] mb-0.5">
                              {authorName}
                            </p>
                          )}
                          <div className="flex items-end gap-2">
                            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{msg.message}</p>
                            <span className="text-[11px] text-[#667781] whitespace-nowrap flex-shrink-0 -mr-0.5 ml-1 mb-0.5">
                              {messageTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#F0F2F5] px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Smile size={24} />
        </button>
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Paperclip size={24} className="rotate-45" />
        </button>
        <form
          onSubmit={sendMessage}
          className="flex-1 flex items-center"
        >
          <input
            type="text"
            value={currentMessage}
            onChange={handleOnChange}
            placeholder={isSomeoneTyping ? "Someone is typing..." : `Type a message...`}
            className="w-full bg-white rounded-lg px-4 py-[9px] text-[15px] text-[#111B21] placeholder-[#667781] outline-none border border-transparent focus:border-[#2196F3]/30"
          />
        </form>
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Camera size={24} />
        </button>
        {currentMessage.trim() ? (
          <button
            onClick={sendMessage}
            className="p-2.5 bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-full transition-all active:scale-95 shadow-md"
          >
            <Send size={20} />
          </button>
        ) : (
          <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2196F3] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}


