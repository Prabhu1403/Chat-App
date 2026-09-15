"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Users, Image as ImageIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "react-toastify";


interface CreateNewGroupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: { name: string; description: string; photoUrl: string | null }) => void;
}

export default function CreateNewGroup({ isOpen, onClose, onSubmit }: CreateNewGroupProps) {

    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const
        handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setPhotoPreview(url);
            }
        };

    const handleSubmit = (e: React.FormEvent) => {
        const user = localStorage.getItem("user")
        if (!user) return;
        const parseUser = JSON.parse(user)
        e.preventDefault();
        console.log("userId>>>", parseUser.userId);
        mutation.mutate({ name: groupName, description, photoUrl: photoPreview, createdBy: parseUser.userId });
        // Reset and close are handled in onSuccess
    };

    const createGroup = async (data: any) => {
        const token = localStorage.getItem('token')
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/creategroup`, data, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        return response.data;
    }


    const mutation = useMutation({
        mutationFn: createGroup,
        onSuccess: async (data: any) => {
            console.log("groupData>>>", data);
            toast.success("Group created successfully");
            // Reset form and close modal AFTER successful response
            setGroupName("");
            setDescription("");
            setPhotoPreview(null);
            onClose();
        },
        onError: async (error: any) => {
            const message = error?.response?.data?.message || error?.message || "Something went wrong";
            toast.error(message);
        }
    })


    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 m-4"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Create New Group</h2>
                                    <p className="text-xs text-slate-500 font-medium">Start a new community space</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Group Photo */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 block">Group Icon / Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative group cursor-pointer hover:border-indigo-300 transition-colors">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={28} className="mb-1" />
                                        )}

                                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${photoPreview ? 'opacity-0' : 'opacity-100'}`}>
                                            <Upload size={20} className="text-white" />
                                        </div>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-600 mb-2">Upload a high-quality image to represent your group.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Name */}
                            <div className="space-y-3">
                                <label htmlFor="groupName" className="text-sm font-semibold text-slate-700 block">Group Name</label>
                                <input
                                    id="groupName"
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. 'Engineering Team' or 'Weekend Hikers'"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <label htmlFor="groupDescription" className="text-sm font-semibold text-slate-700 block">Description</label>
                                <textarea
                                    id="groupDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this group about? Give a brief description…"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400 resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={!groupName.trim()}
                                >
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
