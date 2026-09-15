"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Send,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Trash2,
  Edit2,
  RotateCcw,
  Forward,
  Camera,
  Mic,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ContextMenu from "@/components/chat/ContextMenu";
import DeleteConfirmModal from "@/components/chat/DeleteConfirmModal";
import axios from "axios";
import { socket } from "@/utils/socket";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Message {
  id?: number;
  senderId: string;
  receiverId: string;
  message: string;
  isRead?: boolean;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "seen";
  createdAt?: string;
  is_delete_for_everyone?: boolean;
  delete_for_me_ids?: string[];
  is_forward?: boolean;
  forwarded_from?: string | null;
}

interface EditedMessage {
  messageId: number;
  message: string;
  isEdit: boolean;
  userId?:string;
}

interface ContextMenu {
  x: number;
  y: number;
  message: Message;
}

function ChatContent() {
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const receiverId = params.id;
  const senderId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const { isSomeoneTyping, emitTyping } = useTypingIndicator({
    socket,
    senderId: senderId,
    receiverId: receiverId as string
  });

  // const [receiver, setReceiver] = useState<{
  //   name: string;
  //   phone: string;
  //   profilePicture: string | null;
  //   lastseen?: string;
  // } | null>(null);

  // useEffect(() => {
  //   const getProfile = async () => {
  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       router.push("/login");
  //       return;
  //     }
  //     try {
  //       const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/get-profile/${receiverId}`, {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  //       if (response.data && response.data.data) {
  //         setReceiver(response.data.data);
  //       }
  //     } catch (error: any) {
  //       if (error.response?.status === 401) {
  //         localStorage.removeItem("token");
  //         localStorage.removeItem("user");
  //         router.push("/login");
  //       }
  //     }
  //   };
  //   if (receiverId) getProfile();
  // }, [receiverId, router]);

const getReceiverProfile=async ()=>{
  const token = localStorage.getItem("token")
  if(!token){
    router.push('/login')
    return null
  }
  try{
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/get-profile/${receiverId}`,{
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data
  }
  catch(error:any){
    if(error.response?.status===401){
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      router.push("/login")
    }
  }
  return null
}

  const {data:receiver} = useQuery({
    queryKey:["getReceiverProfile",receiverId],
    queryFn:getReceiverProfile,
    enabled:!!receiverId,
  })

  const receiverAvatar = receiver?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${receiver?.name || "User"}`;

  const [message, setMessage] = useState("");
  // const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<{ userId: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: Message; type: "me" | "everyone" } | null>(null);
  const [editedMessage, setEditedMessage] = useState<EditedMessage | null>({ message: "", messageId: 0, isEdit: false,userId:"" })
  const [isForward, setIsForward] = useState(false);
  
  
  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);


  // Get current user from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const data = localStorage.getItem("user");
    if (!token || !data) {
      router.push("/login");
      return;
    }
    try {
      setCurrentUser(JSON.parse(data));
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  // Fetch messages
  // useEffect(() => {
  //   if (!currentUser) return;

 

  //   fetchMessages();
  // }, [currentUser, receiverId]);


     const fetchMessages = async () => {
      const uid = currentUser?.userId || (currentUser as any)?.id?.toString();
      if (!uid || !receiverId) return [];

      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/messages`, {
          params: { senderId: uid, receiverId },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (Array.isArray(response.data)) {
          
          const unread = response.data.filter((msg: Message) => uid == msg.receiverId && !msg.isRead).length;
          setUnreadCount(unread);
          return response.data;
        }
      } catch (error: any) {
        if (error.response?.status === 401) router.push("/login");
      } finally {
        const uid2 = currentUser?.userId || (currentUser as any)?.id?.toString();
        if (uid2 && receiverId) {
          socket.emit("mark_message_read", { senderId: receiverId, receiverId: uid2 });
        }
      }
      return [];
    };

  const { data: fetchedMessages } = useQuery({
    queryKey:["fetchMessages",currentUser,receiverId],
    queryFn:fetchMessages,
    enabled: !!currentUser && !!receiverId
  })

  const messages: Message[] = fetchedMessages || [];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    queryClient.setQueryData(["fetchMessages", currentUser, receiverId], (prev: any) => {
      const currentMessages = prev || [];
      return typeof updater === "function" ? updater(currentMessages as Message[]) : updater;
    });
  };

  // Socket setup
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const uid = currentUser?.userId || (currentUser as any)?.id;
    if (uid) {
      const userIdStr = String(uid);
      socket.emit("register_user", userIdStr);
      socket.on("connect", () => socket.emit("register_user", userIdStr));
    }

    socket.on("receive_message", (data: Message) => {
      const uid2 = currentUser?.userId || (currentUser as any)?.id?.toString();
      if (data.senderId === receiverId) {
        // Incoming message from the other person
        queryClient.setQueryData(["fetchMessages",currentUser,receiverId],(prev:any[]) =>prev? [...prev, data]:prev);
        socket.emit("mark_message_read", { senderId: receiverId, receiverId: uid2 });
      } else if (data.senderId === uid2 && data.receiverId === receiverId) {
        // Server echo for our own forwarded/sent message — add it so sender sees it
        setMessages((prev) => {
          // Avoid duplicates: if already in list (by id or createdAt), skip
          const exists = prev.some(
            (m) => (m.id && m.id === data.id) || (m.createdAt && m.createdAt === data.createdAt)
          );
          return exists ? prev : [...prev, data];
        });
      }
    });

    socket.on("messages_read", (data: any) => {
      if (data.receiverId === receiverId) {
        setMessages((prev) =>
          prev.map((msg) =>
            !msg.isRead && msg.receiverId === data.receiverId
              ? { ...msg, isRead: true, status: "seen" }
              : msg
          )
        );
      }
    });

    // Real-time update when a message is deleted for everyone
    socket.on("message_deleted_for_everyone", (data: { messageId: number }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, is_delete_for_everyone: true }
            : msg
        )
      );
    });

    socket.on("message_undo_deleted_for_everyone", (data: { messageId: number }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, is_delete_for_everyone: false }
            : msg
        )
      );
    });

    socket.on("message_deleted_permanently", (data: { messageId: number }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    socket.on("message_undo_deleted_for_me", (data: { userId: string, messageId: number }) => {
      const { userId, messageId } = data;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, delete_for_me_ids: [...(msg.delete_for_me_ids || []).filter((id: string) => id !== userId)] }
            : msg
        )
      );
    });

    // Real-time update when a message is edited by the sender
    socket.on("message_edited", (data: { messageId: number; message: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, message: data.message } : msg
        )
      );
    });

    const handleUserOnline = (data: any) => {
      console.log("user_online",data);
      
      setOnlineUsers(data.users.map(String))
    }

    socket.on("user_online", handleUserOnline );
    socket.on("user_offline", (data: any) => {
      setOnlineUsers(data.users.map(String));
      if (String(data.userId) === String(receiverId)) {
        queryClient.setQueryData(["getReceiverProfile", receiverId], (prev: any) => prev ? { ...prev, lastseen: data.lastseen } : prev);
      }
    });

    // When receiver comes online, server notifies sender to update status → "delivered"
    socket.on("messages_delivered", (data: { messageIds: number[]; receiverId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id!) && msg.status === "sent"
            ? { ...msg, status: "delivered" }
            : msg
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("receive_message");
      socket.off("messages_read");
      socket.off("message_deleted_for_everyone");
      socket.off("message_undo_deleted_for_everyone");
      socket.off("message_undo_deleted_for_me");
      socket.off("message_edited");
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline");
      socket.off("messages_delivered");
    };
  }, [currentUser, receiverId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    emitTyping();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const uid = currentUser?.userId || (currentUser as any).id?.toString();
    const nowISO = new Date().toISOString();
    const newMessage: Message = {
      senderId: uid,
      receiverId: receiverId as string,
      message,
      timestamp: nowISO,
      status: "sent",
      createdAt: nowISO
    };

    console.log("new Message>>",newMessage);
   try{ 
    socket.emit("send_message", newMessage, (response: any) => {
      if (response?.status) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.createdAt === newMessage.createdAt ? { ...msg, status: response.status, id: response.id } : msg
          )
        );
      }
    });
 console.log("message emited");
 

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  }catch(err){
    console.log("message sending failed",err)
  }
  };

  const formateDate = (timestamp: string, createdAt?: string) => {
    const raw = createdAt || timestamp;
    const date = new Date(raw);
    if (!raw || isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 200;
    const menuHeight = 110; // approx height for 2 buttons
    const x = Math.max(8, e.clientX - menuWidth); // anchor to the left of cursor
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8); // clamp bottom
    setContextMenu({ x, y, message: msg });
  };

  const handleDeleteForMe = async () => {
    if (!deleteConfirm) return;
    const msg = deleteConfirm.message;
    const uid = currentUser?.userId || (currentUser as any)?.id?.toString();

    console.log("msg>>>>", msg);

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/messages/delete-for-me`, {
        data: { messageId: msg.id, userId: uid },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id || m.createdAt === msg.createdAt
            ? { ...m, delete_for_me_ids: [...(m.delete_for_me_ids || []), String(uid)] }
            : m
        )
      );
    } catch (err) {
      console.error("Delete for me failed:", err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!deleteConfirm) return;
    const msg = deleteConfirm.message;
    const uid = currentUser?.userId || (currentUser as any)?.id?.toString();
    try {
      // Emit via socket so the receiver is notified in real-time
      socket.emit("delete_message_for_everyone", {
        messageId: msg.id,
        senderId: uid,
        receiverId: receiverId
      });

      // Optimistically update local state for the sender
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id || m.createdAt === msg.createdAt
            ? { ...m, is_delete_for_everyone: true }
            : m
        )
      );
    } catch (err) {
      console.error("Delete for everyone failed:", err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleUndoDeleteForEveryone = async (msg: Message) => {
    const uid = currentUser?.userId || (currentUser as any)?.id?.toString();

    try {
      if (msg?.is_delete_for_everyone && msg?.senderId === uid) {
        socket.emit("undo_delete_message_for_everyone", {
          messageId: msg.id,
          senderId: uid,
          receiverId: receiverId
        });

        

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id || m.createdAt === msg.createdAt
              ? { ...m, is_delete_for_everyone: false }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Undo delete for everyone failed:", err);
    }
  };

  const handleUndoDeleteForMe = async (msg: Message, isMe: boolean) => {
    const includesId = isMe ? msg.senderId : msg.receiverId;
    console.log("includesId", includesId);

    try {
      socket.emit("undo_delete_for_me", {
        messageId: msg.id,
        userId: includesId,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id || m.createdAt === msg.createdAt
            ? { ...m, delete_for_me_ids: m.delete_for_me_ids?.filter(id => id !== String(includesId)) }
            : m
        )
      );
    } catch (err) {
      console.error("Undo delete for me failed:", err);
    }
  };

  const handleDeletePermanently = async (msg: Message) => {
    const uid = currentUser?.userId || (currentUser as any)?.id?.toString();
    try {
      if (msg.senderId === uid) {
        socket.emit("delete_message_permanently", {
          messageId: msg.id,
          userId: uid,
        });
      }

      setMessages((prev) => prev.filter((m) => m.id !== msg.id && m.createdAt !== msg.createdAt));
    } catch (err) {
      console.error("Delete permanently failed:", err);
    }
  };

  const renderStatus = (msg: Message) => {
    if (msg.status === "seen") return <CheckCheck size={16} className="text-[#53bdeb]" />;
    if (msg.status === "delivered") return <CheckCheck size={16} className="text-[#667781]" />;
    return <Check size={16} className="text-[#667781]" />;
  };

  const currentUserId = currentUser?.userId || (currentUser as any)?.id?.toString();

  const messageContent = (msg: Message) => {
    const isDeletedForEveryone = msg.is_delete_for_everyone;

    const isDeletedForMe =
      msg.delete_for_me_ids &&
      msg.delete_for_me_ids.includes(String(currentUserId));

    const showDeleted = isDeletedForEveryone || isDeletedForMe;

    const deletedLabel = isDeletedForEveryone
      ? String(msg.senderId) === String(currentUserId)
        ? "You deleted this message"
        : "This message was deleted"
      : "You deleted this message"; // delete_for_me is always only visible to the deleter

    return showDeleted ? deletedLabel : msg.message;
  }

const editMessage = async(e?: React.FormEvent)=>{
  e?.preventDefault();
  const uid = currentUser?.userId || (currentUser as any)?.id?.toString();

  try{
   socket.emit("edit_message", {
    messageId: editedMessage?.messageId,
    message: editedMessage?.message,
    userId: editedMessage?.userId,
    receiverId: receiverId,
  },(response:any)=>{
    const messageId = response?.data?.id
    const message = response?.data?.message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, message } : msg
      )
    );
  });
}catch(err){
  console.error("Edit message failed:", err);
}
finally{
  setEditedMessage({
      isEdit:false,
      messageId:0,
      message:""
    })
}
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
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <img
                src={receiverAvatar}
                alt={receiver?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#F0F2F5] rounded-full ${onlineUsers.includes(receiverId as string) ? "bg-[#25D366]" : "bg-[#667781]"}`} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#111B21] leading-tight">{receiver?.name || "User"}</h2>
              <p className="text-[12px] text-[#667781]">
                {isSomeoneTyping ? (
                  <span className="text-[#25D366] font-medium">typing...</span>
                ) : onlineUsers.includes(receiverId as string) ? (
                  "online"
                ) : receiver?.lastseen ? (
                  `last seen at ${receiver.lastseen}`
                ) : (
                  `last seen at ${receiver?.phone || ""}`
                )}
              </p>
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
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;

            let showDateSeparator = false;
            let dateLabel = "";
            const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
            const prevMsgDate = index > 0 && messages[index - 1].createdAt
              ? new Date(messages[index - 1].createdAt as string)
              : index > 0 ? new Date() : null;

            if (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString()) {
              showDateSeparator = true;
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              if (msgDate.toDateString() === today.toDateString()) {
                dateLabel = "Today";
              } else if (msgDate.toDateString() === yesterday.toDateString()) {
                dateLabel = "Yesterday";
              } else {
                dateLabel = msgDate.toLocaleDateString([], {
                  day: "numeric",
                  month: "long",
                  year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
                });
              }
            }

            return (
              <React.Fragment key={index}>
                {showDateSeparator && (
                  <div className="flex justify-center py-3 my-1">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-lg text-[12px] font-medium text-[#54656F] shadow-sm">
                      {dateLabel}
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
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                      className={`px-3 py-1.5 rounded-lg shadow-sm relative group cursor-pointer select-none ${isMe
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

                      {msg.is_forward && !msg.is_delete_for_everyone && msg.forwarded_from !== currentUserId && (
                        <div className="flex items-center gap-1 mb-0.5 text-[11px] italic text-[#667781]">
                          <Forward size={11} />
                          <span>Forwarded</span>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                          {messageContent(msg)}
                        </p>
                        <div className="flex items-center gap-1 mb-0.5 flex-shrink-0 -mr-0.5 ml-1">
                          <span className="text-[11px] text-[#667781] whitespace-nowrap">
                            {formateDate(msg.timestamp, msg.createdAt)}
                          </span>
                          {isMe && renderStatus(msg)}
                        </div>
                      </div>

                      {/* Hover action menu */}
                      <div className={`absolute -top-3 ${isMe ? "-left-3" : "-right-3"} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                        <div className="relative group/menu">
                          <button className="bg-white border border-[#E9EDEF] rounded-full p-1 shadow-md text-[#54656F] hover:text-[#111B21] transition-colors">
                            <MoreVertical size={14} />
                          </button>
                          {/* Dropdown Menu */}
                          <div className={`absolute ${isMe ? "right-full mr-1" : "left-full ml-1"} top-0 hidden group-hover/menu:block bg-white border border-[#E9EDEF] rounded-lg shadow-lg min-w-[150px] py-1 overflow-hidden z-50`}>
                            {msg.is_delete_for_everyone || msg.delete_for_me_ids?.includes(String(currentUserId) || String(msg.receiverId)) ? (
                              <>
                                {isMe && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (msg.is_delete_for_everyone) {
                                        handleUndoDeleteForEveryone(msg);
                                      } else {
                                        handleUndoDeleteForMe(msg, isMe);
                                      }
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-[#54656F] hover:bg-[#F0F2F5] flex items-center gap-2"
                                  >
                                    <RotateCcw size={14} /> Undo
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleDeletePermanently(msg);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete permanently
                                </button>
                              </>
                            ) : (
                              <>
                                {isMe && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditedMessage({
                                        isEdit: true,
                                        message: msg.message,
                                        messageId: msg.id!,
                                        userId: msg.senderId,
                                      });
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-[#54656F] hover:bg-[#F0F2F5] flex items-center gap-2"
                                  >
                                    <Edit2 size={14} /> Edit
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsForward(true);
                                    router.push(`/conversation?forwardMessage=${msg.message}&senderId=${msg.senderId}&isForward=true`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-[#54656F] hover:bg-[#F0F2F5] flex items-center gap-2"
                                >
                                  <Forward size={14} /> Forward
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleContextMenu(e as any, msg); 
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Edit mode banner */}
      {editedMessage?.isEdit && (
        <div className="bg-[#F0F2F5] border-t border-[#E9EDEF] px-4 py-2 flex items-center gap-3">
          <div className="w-1 h-8 bg-[#2196F3] rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#2196F3]">Edit message</p>
            <p className="text-[13px] text-[#667781] truncate">{editedMessage.message}</p>
          </div>
          <button
            onClick={() => setEditedMessage({ isEdit: false, messageId: 0, message: "" })}
            className="p-1.5 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#F0F2F5] px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Smile size={24} />
        </button>
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Paperclip size={24} className="rotate-45" />
        </button>
        <form
          onSubmit={editedMessage?.isEdit ? editMessage : handleSendMessage}
          className="flex-1 flex items-center"
        >
          {editedMessage?.isEdit ? (
            <input
              type="text"
              value={editedMessage.message}
              onChange={(e) => setEditedMessage({ ...editedMessage, message: e.target.value })}
              placeholder="Edit your message..."
              autoFocus
              className="w-full bg-white rounded-lg px-4 py-[9px] text-[15px] text-[#111B21] placeholder-[#667781] outline-none border border-transparent focus:border-[#2196F3]/30"
            />
          ) : (
            <input
              type="text"
              value={message}
              onChange={handleOnChange}
              placeholder={isSomeoneTyping ? "Typing..." : "Type a message..."}
              className="w-full bg-white rounded-lg px-4 py-[9px] text-[15px] text-[#111B21] placeholder-[#667781] outline-none border border-transparent focus:border-[#2196F3]/30"
            />
          )}
        </form>
        <button type="button" className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors">
          <Camera size={24} />
        </button>
        {(editedMessage?.isEdit ? editedMessage.message.trim() : message.trim()) ? (
          <button
            onClick={editedMessage?.isEdit ? editMessage : handleSendMessage}
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

      {/* Right-click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            setDeleteConfirm={setDeleteConfirm}
            currentUserId={currentUser?.userId || (currentUser as any)?.id?.toString()}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <DeleteConfirmModal
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            handleDeleteForEveryone={handleDeleteForEveryone}
            handleDeleteForMe={handleDeleteForMe}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OneToOneChatPage() {
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
