"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Camera, Edit2, Check, Upload
} from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";

interface UserProfileData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bio: string | null;
  profilePicture: string | null;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        setUser(parsedData);
        setEditedUser(parsedData);
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    setLoading(false);
  }, []);

  const updateProfile = async (data: UserProfileData) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("phone", data.phone);
      if (data.bio) formData.append("bio", data.bio);
      if (selectedFile) formData.append("profilePicture", selectedFile);

      const response = await axios.put(`http://localhost:8000/api/update-profile/${data.userId}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        },
      });
      return response.data;
    } catch (error) {
      console.error("Axios update error:", error);
      throw error;
    }
  };

  const editMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data: any) => {
      setIsEditing(false);
      if (data?.data) {
        setUser(data.data);
        localStorage.setItem("user", JSON.stringify(data.data));
        setEditedUser(data.data);
      } else if (editedUser) {
        setUser(editedUser);
        localStorage.setItem("user", JSON.stringify(editedUser));
      }
      setSelectedFile(null);
      alert("Profile updated successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to update profile", error);
      alert(error?.response?.data?.message || "Failed to update profile. Please try again.");
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editedUser) {
          setEditedUser({ ...editedUser, profilePicture: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fileSave = () => {
    if (editedUser) {
      editMutation.mutate(editedUser);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-slate-400"></div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto p-12">
      <div className="max-w-4xl mx-auto">
        <motion.div
          key="profile"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="space-y-6"
        >
          {/* Header Section */}
          <div className="flex items-end justify-between border-b border-slate-200 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Profile</h1>
              <p className="text-slate-500 text-sm mt-1">Information about your account and preferences.</p>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={fileSave} 
                    disabled={editMutation.isPending}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-2xl space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personal Details</h3>
                </div>
                <div className="p-0 divide-y divide-slate-100">
                  <ClassicField 
                    label="Profile Picture" 
                    value={
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                        <img src={user.profilePicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.name} className="w-full h-full object-cover" alt="" />
                      </div>
                    } 
                    isEditing={isEditing}
                    editNode={
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-blue-100">
                          <img src={editedUser?.profilePicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.name} className="w-full h-full object-cover" alt="" />
                        </div>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                          <Camera className="w-3 h-3" /> Change Photo
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                    }
                  />

                  <ClassicField 
                    label="Full Identity" 
                    value={user.name} 
                    isEditing={isEditing}
                    editNode={<input value={editedUser?.name || ""} onChange={e => setEditedUser({...editedUser!, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-slate-400" />}
                  />
                  <ClassicField label="Email Address" value={user.email} />
                  <ClassicField 
                    label="Contact Phone" 
                    value={user.phone} 
                    isEditing={isEditing}
                    editNode={<input value={editedUser?.phone || ""} onChange={e => setEditedUser({...editedUser!, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-slate-400" />}
                  />
                  <div className="p-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Short Biography</label>
                    {isEditing ? (
                      <textarea value={editedUser?.bio || ""} onChange={e => setEditedUser({...editedUser!, bio: e.target.value})} className="w-full h-24 bg-slate-50 border border-slate-200 rounded p-3 outline-none focus:border-slate-400 text-sm resize-none" />
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed font-medium italic">"{user.bio || "No information provided."}"</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ClassicField({ label, value, isEditing, editNode }: { label: string, value: React.ReactNode, isEditing?: boolean, editNode?: React.ReactNode }) {
  return (
    <div className="p-6 flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="text-right">
        {isEditing && editNode ? editNode : (
          <div className="text-sm font-semibold text-slate-800">{value}</div>
        )}
      </div>
    </div>
  );
}