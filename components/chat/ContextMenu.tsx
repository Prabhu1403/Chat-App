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

export interface ContextMenuProps {
  contextMenu: { x: number; y: number; message: Message };
  setContextMenu: (value: null) => void;
  setDeleteConfirm: (value: { message: Message; type: "me" | "everyone" }) => void;
  currentUserId: string | null | undefined;
}

export default function ContextMenu({
  contextMenu,
  setContextMenu,
  setDeleteConfirm,
  currentUserId,
}: ContextMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, transformOrigin: "top right" }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden min-w-[190px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          setDeleteConfirm({ message: contextMenu.message, type: "me" });
          setContextMenu(null);
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Trash2 size={15} className="text-slate-400" />
        Delete for Me
      </button>
      {contextMenu.message.senderId === currentUserId && (
        <button
          onClick={() => {
            setDeleteConfirm({ message: contextMenu.message, type: "everyone" });
            setContextMenu(null);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
        >
          <Trash2 size={15} className="text-red-400" />
          Delete for Everyone
        </button>
      )}
    </motion.div>
  );
}
