import React from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

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
}

export interface DeleteConfirmModalProps {
  deleteConfirm: { message: Message; type: "me" | "everyone" };
  setDeleteConfirm: (value: null) => void;
  handleDeleteForEveryone: () => void;
  handleDeleteForMe: () => void;
}

export default function DeleteConfirmModal({
  deleteConfirm,
  setDeleteConfirm,
  handleDeleteForEveryone,
  handleDeleteForMe,
}: DeleteConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setDeleteConfirm(null)}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              {deleteConfirm.type === "everyone" ? "Delete for Everyone?" : "Delete for Me?"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {deleteConfirm.type === "everyone"
                ? "This message will be removed for all participants."
                : "This message will only be removed for you."}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
          <p className="text-sm text-slate-600 italic truncate">"{deleteConfirm.message.message}"</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={deleteConfirm.type === "everyone" ? handleDeleteForEveryone : handleDeleteForMe}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
