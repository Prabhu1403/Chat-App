"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { socket } from "@/utils/socket";

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRequestsModal({ isOpen, onClose }: JoinRequestsModalProps) {
  const queryClient = useQueryClient();

  const getRequests = async () => {
    try{
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userId = JSON.parse(localStorage.getItem('user') as string).userId;
        console.log("parsed user id >>",userId);
         
        if(!userId){
            toast.error("User ID not found.");
            return { requests: [] };
        }
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/join-requests/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
   
    if(response.data){
        toast.success("Join requests fetched successfully.");
        console.log("req data >>",response.data);
    }
    else{
      toast.error("No join requests found.");
    }
     return response.data;
    }catch(err){
        toast.error("Failed to fetch join requests.");
        return { requests: [] };
    }
  
  };

  const { data, isLoading } = useQuery({
    queryKey: ["join-requests"],
    queryFn: getRequests,
    enabled: isOpen
  });

const acceptFunction =  async (userId: string) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/accept-requests/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
const acceptMutation = useMutation({
    mutationFn:acceptFunction,
    onSuccess: () => {
      toast.success("Request accepted!");
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
    },
    onError: () => {
      toast.error("Failed to accept request.");
    }
  });

  const rejectFunction = async (id: number) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      return axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/reject-requests/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }


  const rejectMutation = useMutation({
    mutationFn:rejectFunction,
    onSuccess: () => {
      toast.success("Request rejected!");
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
    },
    onError: () => {
      toast.error("Failed to reject request.");
    }
  });

  if (!isOpen) return null;

  const handleAccept = async (groupId:number,userId:string)=>{
      await socket.emit("join-room",groupId);
      await acceptMutation.mutate(userId);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">Join Requests</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : data?.requests?.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 font-medium">No pending requests at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.requests?.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-200">
                         {req.userPhoto ? (
                           <img src={req.userPhoto} alt={req.userName} className="w-full h-full object-cover" />
                         ) : (
                           req.userName.charAt(0).toUpperCase()
                         )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{req.userName}</p>
                        <p className="text-xs text-slate-500">wants to join <span className="font-semibold text-slate-700">{req.groupName}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAccept(req.groupId,req.userId)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
