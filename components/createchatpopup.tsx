 import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";

interface CreateChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const chatSchema = z.object({
  chatNumber: z
    .string()
    .min(1, "Number is required")
    .regex(/^\d{10}$/, "Please enter a valid 10-digit number"),
});

type ChatFormData = z.infer<typeof chatSchema>;

export default function CreateChatPopup({ isOpen, onClose }: CreateChatPopupProps) {
const router = useRouter(); 

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ChatFormData>({
    resolver: zodResolver(chatSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ChatFormData) => {
    console.log("Creating chat with number:", data.chatNumber);
    const payload = {
      chatNumber: data.chatNumber,
    };

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Session expired or you are not logged in. Please login again.");
        router.push("/login");
        return;
      }

      const response = await axios.get("http://localhost:8000/api/get-receiver-profile", {
        params: payload,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(response.data.data){
        const receiver = response.data.data;
        console.log("Receiver profile:", receiver);
        onClose();
        reset();
        router.push(`/chat/${receiver.userId}`);
      }      
    } catch (error) {
       alert("Error fetching profile"); 
      console.error("Error fetching profile:", error);
      onClose();
      reset();
    }
  };

  

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Start New Chat</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter a phone number or ID to begin.</p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target ID / Number
                  </label>
                  <input
                    type="text"
                    {...register("chatNumber")}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all text-slate-900 font-medium ${
                      errors.chatNumber 
                        ? "border-red-500 focus:ring-red-900/10 focus:border-red-500" 
                        : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-900"
                    }`}
                  />
                  {errors.chatNumber && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.chatNumber.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isValid}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                >
                  <Plus className="w-5 h-5" />
                  Create Chat
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
