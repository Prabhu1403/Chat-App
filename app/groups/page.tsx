"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import CreateNewGroup from "@/components/createnewgroup";
import JoinRequestsModal from "@/components/JoinRequestsModal";
import JoinRequestToast from "@/components/JoinRequestToast";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { socket } from "../../utils/socket";
import { Users, Plus, Bell, ChevronRight, Check, Trash2 } from "lucide-react";


const GroupCard = ({ group, parsedUserId, handleMakeRequest, router, refetch }: any) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      try {
        const res = await axios.get(`http://localhost:8000/api/getLastMessage/${group.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const lastMessage = res.data.lastMessage?.message ?? null;
        setLastMessage(lastMessage);
      } catch(err) {
        console.error("Failed to fetch group metadata", err);
      }
    };
    fetchMetadata();
  }, [group.id]);

  useEffect(() => {
    if (!parsedUserId?.userId) return;
    const fetchUnreadCount = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      try {
        socket.emit("get_group_unread_message",{
          groupId: group.id,
          userId: parsedUserId.userId,
        },(res:any)=>{
          console.log("group count has been fetched successfully");
          setUnreadCount(res.unreadCount);
        })
      } catch(err) {
        console.error("Failed to fetch unread count", err);
      }
    };
    fetchUnreadCount();
  }, [group.id, parsedUserId?.userId]);

  console.log("unreadCountMEsssage",unreadCount);
  
  const handleCardClick = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      socket.emit("create_message_read",{
        groupId: group.id,
        userId: parsedUserId?.userId
      },(responce:any)=>{
        console.log("message read successfully",responce);
        
      });
    
    } catch(err) {
      console.error(err);
    }
    router.push(`/chat?userId=${encodeURIComponent(parsedUserId?.userId || "Anonymous")}&room=${encodeURIComponent(group.name)}&groupId=${encodeURIComponent(group.id)}`);
  };

  const handleDeleteGroup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await axios.delete(`http://localhost:8000/api/deleteGroup/${group.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Group deleted successfully");
      if (refetch) refetch();
    } catch(err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete group");
    }
  };

  
  const isMember = group.members?.some((m: any) => m.userId === parsedUserId?.userId) || group.createdBy === parsedUserId?.userId;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-[#E9EDEF] rounded-xl p-4 flex items-center gap-4 hover:bg-[#F5F6F6] transition-all duration-200 cursor-pointer group relative"
    >
      {/* Group Avatar */}
      <div className="relative flex-shrink-0">
        {group.photoUrl ? (
          <img src={group.photoUrl} alt={group.name} className="w-[56px] h-[56px] rounded-full object-cover" />
        ) : (
          <div className="w-[56px] h-[56px] bg-[#2196F3] rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {group.icon || group.name.charAt(0).toUpperCase()}
          </div>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#25D366] text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Group Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-[#111B21] text-[15px] truncate">{group.name}</h4>
          <span className="text-[10px] font-semibold text-[#2196F3] bg-[#E3F2FD] px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
            {group.category || "Community"}
          </span>
        </div>
        <p className="text-[13px] text-[#667781] truncate">
          {lastMessage ? lastMessage : group.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#667781]">
            <Users size={13} />
            <span>{group.members?.length || 0} Members</span>
          </div>
          <div className="flex items-center gap-2">
            {group.createdBy === parsedUserId?.userId && (
              <button 
                onClick={handleDeleteGroup}
                className="text-[#667781] hover:text-red-500 p-1 rounded transition-colors z-10 opacity-0 group-hover:opacity-100"
                title="Delete Group"
              >
                <Trash2 size={14} />
              </button>
            )}
            {!isMember ? (
              <button 
                onClick={(e) => { e.stopPropagation(); handleMakeRequest({ groupId: group.id, userId: parsedUserId.userId }) }} 
                className="text-[11px] font-bold text-white bg-[#2196F3] hover:bg-[#1976D2] transition-colors px-3 py-1.5 rounded-full"
              >
                Join
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-[#25D366] flex items-center gap-1">
                <Check size={13} />
                Joined
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default function GroupsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [showMyGroups, setShowMyGroups] = useState(false);

  const [parsedUserId, setParsedUserId] = useState<any>(null);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (user) {
      setParsedUserId(JSON.parse(user));
    }
  }, []);
  const router = useRouter();

  const getGroups = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await axios.get('http://localhost:8000/api/getgroups', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("group>>",response.data);
    
    return response.data;
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  })

  const handleMakeRequest = async (data: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await axios.post('http://localhost:8000/api/join-request', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      if (response.status === 201) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.error);
      }
      return response.data;
    } catch (error: any) {
      toast.error(error.response.data.message);
    }
  }

  return (
    <div className="h-full overflow-y-auto sidebar-scroll bg-[#F0F2F5]">
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <motion.div
          key="groups"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E9EDEF]">
            <h1 className="text-[22px] font-semibold text-[#111B21]">Communities</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowMyGroups(!showMyGroups)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${showMyGroups
                    ? "bg-[#2196F3] text-white"
                    : "bg-white border border-[#E9EDEF] text-[#54656F] hover:bg-[#F0F2F5]"
                  }`}
              >
                {showMyGroups ? "Explore Groups" : "My Groups"}
              </button>
              <button
                onClick={() => setIsRequestsModalOpen(true)}
                className="bg-white border border-[#E9EDEF] text-[#54656F] px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#F0F2F5] transition-all flex items-center gap-1.5"
              >
                <Bell size={14} />
                Requests
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#2196F3] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#1976D2] transition-all flex items-center gap-1.5 shadow-md"
              >
                <Plus size={14} />
                Create Team
              </button>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[#E9EDEF]">
                <div className="w-10 h-10 border-4 border-[#E9EDEF] border-t-[#2196F3] rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-medium text-[#667781]">Loading communities...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-semibold text-red-600">Failed to load groups</p>
                <p className="text-xs text-red-500 mt-1">Please try refreshing the page</p>
              </div>
            ) : data?.groups?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[#E9EDEF]">
                <Users size={48} className="text-[#E9EDEF] mb-3" />
                <p className="text-sm font-semibold text-[#54656F]">No communities yet</p>
                <p className="text-xs text-[#667781] mt-1">Be the first to create one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {(data?.groups || [])
                  .filter((group: any) => showMyGroups ? group.createdBy === parsedUserId?.userId : group.createdBy !== parsedUserId?.userId)
                  .map((group: any) => (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      parsedUserId={parsedUserId} 
                      handleMakeRequest={handleMakeRequest} 
                      router={router}  
                      refetch={refetch}
                    />
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <CreateNewGroup
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => {
          console.log("New Group Created:", data);
          // Here you can handle the API call to create the group
        }}
      />

      <JoinRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
      />
      <JoinRequestToast />
    </div>
  );
}
