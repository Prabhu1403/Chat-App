"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle, Users, Phone, Search, MoreVertical, LogOut, Plus, Check, CheckCheck, Archive, Settings, CircleDashed, MessageSquare, Trash2, User
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { socket } from "@/utils/socket";
import axios from "axios";
import Conversation from "../app/conversation/page";

interface UserProfileData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bio: string | null;
  profilePicture: string | null;
}

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

interface GroupItem {
  id: number;
  name: string;
  description: string;
  icon?: string;
  photoUrl?: string;
  category?: string;
  members?: any[];
  createdBy?: string;
  unreadCount?: number;
  lastMessage?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"chats" | "calls" | "contacts">("chats");
  const [activeToggle, setActiveToggle] = useState<"personal" | "groups" | "archived">("personal");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messageCount = groups.filter(g => (g.unreadCount || 0) > 0).length;
  const [menu, setMenu] = useState<{ visiable: boolean, x: number, y: number, conversation: Conversation | null }>({
    visiable: false, x: 0, y: 0, conversation: null
  });
  const [activeGroupId,setActiveGroupId]=useState<number | null>(null)

  const renderStatus = (status?: string) => {
    if (status === "seen") return <CheckCheck size={14} className="text-[#53bdeb] flex-shrink-0" />;
    if (status === "delivered") return <CheckCheck size={14} className="text-[#667781] flex-shrink-0" />;
    return <Check size={14} className="text-[#667781] flex-shrink-0" />;
  };
  useEffect(() => {
    const handleUnreadMessage = (data: any) => {
      setGroups((prev) =>
        prev.map((c: any) => (c.id === data.groupId ? { ...c, unreadCount: 0 } : c))
      );
    };

    const handleReceiveGroupMessage = (message: any) => {
      const currentUserId = user?.userId || (user as any)?.id;
      if (message.senderId !== currentUserId) {
        if (String(activeGroupId) === String(message.groupId)) {
          socket.emit("create_message_read", {
            groupId: message.groupId,
            userId: currentUserId,
          });
          return;
        }

        setGroups((prev) =>
          prev.map((c: any) => {
            if (String(c.id) === String(message.groupId)) {
              return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
            }
            return c;
          })
        );
      }
    };

    socket.on("readMessage", handleUnreadMessage);
    socket.on("receive_group_message", handleReceiveGroupMessage);
    
    return () => {
      socket.off("readMessage", handleUnreadMessage);
      socket.off("receive_group_message", handleReceiveGroupMessage);
    };
  }, [user, activeGroupId]);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (data) {
      try {
        setUser(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, [pathname]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      const userId = user.userId || (user as any).id;
      if (!userId) return;

      try {
        const response = await axios.get(`http://localhost:8000/api/conversations`, {
          params: { userId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setConversations(response.data);
        const totalUnread = response.data.reduce((acc: number, c: any) => acc + (c.unread || 0), 0);
        setUnreadCount(totalUnread);
      } catch (error: any) {
        console.error("Error fetching conversations:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (socket.connected) socket.disconnect();
          router.push("/login");
        }
      }
    };

    fetchConversations();

  
    // Re-fetch on new messages
    const handleNewMessage = () => fetchConversations();
    socket.on("receive_message", handleNewMessage);
    socket.on("messages_read", handleNewMessage);


    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("messages_read", handleNewMessage);
    };
  }, [user, pathname]);

  const getUnreadCount = async (groupId: number) => {
    
    
    if (!user?.userId) return 0;
    try {
      const response = await axios.get("http://localhost:8000/api/getUnreadMessage", {
        params: {
          groupId: groupId,
          userId: user.userId
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response?.data?.success) {
      
        return response?.data?.unreadCount || 0;

      }
      // if(response?.data?.unreadCount>0){
      //   setMessageCount(prev=>prev+1)
      // }
    } catch (e) {
      console.error("Error getting unread count:", e);
    }
    return 0;
  };

  const getLastGroupMessage = async (groupId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/getLastMessage/${groupId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response?.data?.lastMessage) {
        return response.data.lastMessage.message;
      }
    } catch (e) {
      console.error("Error getting last message:", e);
    }
    return null;
  };

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const response = await axios.get("http://localhost:8000/api/getgroups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const fetchedGroups = response.data?.groups || [];
        
        if (user?.userId) {
          const groupsWithUnread = await Promise.all(
            fetchedGroups.map(async (group: GroupItem) => {
              const count = await getUnreadCount(group.id);
              const lastMsg = await getLastGroupMessage(group.id);
              socket.emit("join_room", String(group.id));
              return { ...group, unreadCount: count, lastMessage: lastMsg };
            })
          );
          setGroups(groupsWithUnread);          
        } else {
          setGroups(fetchedGroups);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };
    fetchGroups();
  }, [pathname, user]);

     useEffect(()=>{
        console.log("messageCount>>>",messageCount);
    },[messageCount])

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    if (socket.connected) socket.disconnect();
    router.push("/login");
  };

  const handleConversationClick = async (chatId: string) => {
    setActiveGroupId(null);
    const userId = user?.userId || (user as any)?.id;
    
    if (userId) {
      socket.emit("mark_message_read", { senderId: chatId, receiverId: userId }, (response: any) => {
        if (response?.success) {
          setConversations((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
          );
        }
      });
    }
    router.push(`/chat/${chatId}`);
  };

  const handleGroupClick = async (group: GroupItem) => {
    console.log("group clicked");
    setActiveGroupId(group.id);
    const userId = user?.userId || (user as any)?.id;
    if (userId) {
      socket.emit("create_message_read", {
        groupId: group.id,
        userId: userId,
      });
      setGroups((prev) =>
        prev.map((c) => (c.id === group.id ? { ...c, unreadCount: 0 } : c))
      );
    }

    router.push(`/chat?userId=${encodeURIComponent(userId || "Anonymous")}&room=${encodeURIComponent(group.name)}&groupId=${encodeURIComponent(group.id)}`);
  };

  const handleContextClick = (e: React.MouseEvent, chat: Conversation) => {
    e.preventDefault();
    setMenu({
      visiable: true,
      x: e.clientX,
      y: e.clientY,
      conversation: chat
    });
  };

  const handleShowMenu = () => {
    setMenu((prev) => ({ ...prev, visiable: false }));
  };

  const handleDeleteChat = async () => {
    const otherUserId = menu.conversation?.id;
    if (!otherUserId || !user) return;
    const userId = user.userId || (user as any).id;

    try {
      await axios.delete("http://localhost:8000/api/messages/conversation", {
        data: { userId, otherUserId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setConversations((prev) => prev.filter((c) => c.id !== otherUserId));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
    handleShowMenu();
  };

  const handleArchiveChat = async () => {
    const otherUserId = menu.conversation?.id;
    if (!otherUserId || !user) return;
    const userId = user.userId || (user as any).id;

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
    if (menu.conversation) {
       router.push(`/profile`); // Assuming profile or similar view
    }
    handleShowMenu();
  };


  const getDate = (date: string) => {
    if (!date) return "";
    const today = new Date();
    const yesterday = new Date(today);
    const messageDate = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return messageDate.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const filteredConversations = conversations.filter(
    (c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeToggle === "archived") return c.is_archived && matchesSearch;
      return !c.is_archived && matchesSearch;
    }
  );

  const filteredGroups = groups.filter(
    (g) => g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  const chatIdFromPath = pathname.startsWith("/chat/") ? pathname.split("/chat/")[1] : null;

  return (
    <div className="flex h-screen sticky top-0 z-20">
      {/* Leftmost Thin Navigation Bar */}
      <nav className="w-[60px] bg-[#F0F2F5] flex flex-col items-center py-4 border-r border-[#E9EDEF] flex-shrink-0 justify-between h-full">
        <div className="flex flex-col gap-6 w-full items-center">
          <button
            onClick={() => setActiveToggle("personal")}
            className={`p-2 rounded-lg transition-colors ${activeToggle === "personal" ? "bg-[#E9EDEF] text-[#111B21]" : "text-[#54656F] hover:bg-[#E9EDEF]"}`}
            title="Chats"
          >
            <MessageCircle size={24} />
          </button>
          <button
            className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-lg transition-colors"
            title="Status"
          >
            <CircleDashed size={24} />
          </button>
          <button
            className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-lg transition-colors"
            title="Channels"
          >
            <MessageSquare size={24} />
          </button>
          <button
            onClick={() => router.push("/groups")}
            className={`p-2 rounded-lg transition-colors ${activeToggle === "groups" ? "bg-[#E9EDEF] text-[#111B21]" : "text-[#54656F] hover:bg-[#E9EDEF]"}`}
            title="Communities"
          >
            <Users size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-6 w-full items-center">
          <button
            onClick={handleSignOut}
            className="p-2 text-[#54656F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={24} />
          </button>
          <button
            className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={24} />
          </button>
          <div className="cursor-pointer" onClick={() => router.push("/profile")}>
            <img
              src={user.profilePicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.name}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        </div>
      </nav>

      <aside className="w-[350px] bg-white flex flex-col border-r border-[#E9EDEF] h-full">
        {/* Top Header */}
        <div className="h-[60px] bg-white flex items-center justify-between px-4">
          <h1 className="text-xl font-bold text-[#111B21]">Chats</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeToggle === "personal") {
                  router.push("/conversation");
                } else {
                  router.push("/groups");
                }
              }}
              className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
            <button
              className="p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors"
              title="Menu"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#E9EDEF]">
        {[
          { key: "chats", icon: MessageCircle, label: "All" },
          { key: "Unread", icon: Phone, label: "Unread" },
          { key: "Favourites", icon: Users, label: "Favourites" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-wider transition-all border-b-[3px] ${
              activeTab === tab.key
                ? "text-[#2196F3] border-[#2196F3]"
                : "text-[#54656F] border-transparent hover:bg-[#F0F2F5]"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Archived Button */}
      <div className="px-3 pt-2">
        <button
          onClick={() => setActiveToggle(activeToggle === "archived" ? "personal" : "archived")}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeToggle === "archived" ? "bg-[#F0F2F5] text-[#111B21]" : "text-[#54656F] hover:bg-[#F0F2F5]"
          }`}
        >
          <Archive size={18} />
          <span>Archived</span>
        </button>
      </div>

      {/* Personal / Groups Toggle */}
      <div className="px-3 py-3 flex gap-2">
        <button
          onClick={() => setActiveToggle("personal")}
          className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-full text-xs font-bold transition-all ${
            activeToggle === "personal"
              ? "bg-[#2196F3] text-white shadow-md"
              : "bg-[#F0F2F5] text-[#54656F] hover:bg-[#E9EDEF]"
          }`}
        >
          <span>PERSONAL</span>
          {unreadCount > 0 && activeToggle === "personal" && (
            <span className="bg-white text-[#2196F3] text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveToggle("groups")}
          className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-full text-xs font-bold transition-all ${
            activeToggle === "groups"
              ? "bg-[#2196F3] text-white shadow-md"
              : "bg-[#F0F2F5] text-[#54656F] hover:bg-[#E9EDEF]"
          }`}
        >
          <span>GROUPS</span>
          {
            messageCount> 0  && (
              <span className="bg-white text-[#2196F3] text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full">
                {messageCount}
              </span>
            )
          }
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-3 pb-2">
          <div className="flex items-center bg-[#F0F2F5] rounded-lg px-3 py-2">
            <Search size={16} className="text-[#54656F] mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat"
              className="flex-1 bg-transparent text-sm text-[#111B21] placeholder-[#667781] outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Conversation / Group List */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {activeToggle === "personal" || activeToggle === "archived" ? (
          <>
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#667781]">
                <MessageCircle size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No conversations yet</p>
                <button
                  onClick={() => router.push("/conversation")}
                  className="text-[#2196F3] text-sm font-bold mt-2 hover:underline"
                >
                  Start a new chat
                </button>
              </div>
            ) : (
              filteredConversations.map((chat) => {
                const isActive = chatIdFromPath === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleConversationClick(chat.id)}
                    onContextMenu={(e) => handleContextClick(e, chat)}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#F0F2F5] ${
                      isActive ? "bg-[#F0F2F5]" : "hover:bg-[#F5F6F6]"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={chat.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.name}`}
                        className="w-[50px] h-[50px] rounded-full object-cover"
                        alt=""
                      />
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-[#111B21] text-[15px] truncate">{chat.name}</h4>
                        <span className={`text-[11px] flex-shrink-0 ml-2 ${chat.unread > 0 ? "text-[#25D366] font-bold" : "text-[#667781]"}`}>
                          {getDate(chat.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[13px] text-[#667781] truncate flex items-center gap-1">
                          {chat.lastMessage && renderStatus(chat.status)}
                          <span className="truncate">{chat.lastMessage || "No messages yet"}</span>
                        </p>
                        {chat.unread > 0 && (
                          <span className="bg-[#25D366] text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full flex-shrink-0 ml-2">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
          </>
        ) : (
          <>
            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#667781]">
                <Users size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No groups yet</p>
                <button
                  onClick={() => router.push("/groups")}
                  className="text-[#2196F3] text-sm font-bold mt-2 hover:underline"
                >
                  Explore groups
                </button>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = pathname.includes(`groupId=${group.id}`);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleGroupClick(group)}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#F0F2F5] ${
                      isActive ? "bg-[#F0F2F5]" : "hover:bg-[#F5F6F6]"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {group.photoUrl ? (
                        <img src={group.photoUrl} className="w-[50px] h-[50px] rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-[50px] h-[50px] rounded-full bg-[#2196F3] flex items-center justify-center text-white text-xl font-bold">
                          {group.icon || group.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-[#111B21] text-[15px] truncate">{group.name}</h4>
                        <span className="text-[10px] text-[#667781] bg-[#E9EDEF] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-2">
                          {group.category || "Community"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[13px] text-[#667781] truncate">
                          {group.lastMessage || group.description || "No description"}
                        </p>
                        {(group.unreadCount ?? 0) > 0 && (
                          <span className="bg-[#25D366] text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full flex-shrink-0 ml-2">
                            {group.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-[#667781]">
                        <Users size={12} />
                        <span>{group.members?.length || 0} members</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="relative">
        {/* Floating New Chat Button */}
        <button
          onClick={() => {
            if (activeToggle === "personal") {
              router.push("/conversation");
            } else {
              router.push("/groups");
            }
          }}
          className="absolute -top-16 right-4 w-[50px] h-[50px] bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          title={activeToggle === "personal" ? "New Chat" : "New Group"}
        >
          <Plus size={24} />
        </button>
      </div>
      </aside>

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
            {activeToggle !== 'archived' && (
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
    </div>
  );
}
