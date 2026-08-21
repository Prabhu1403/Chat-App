import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseTypingIndicatorProps {
  socket: Socket;
  senderId: string | null | undefined;
  receiverId?: string | null;
  groupId?: number | null;
}

export const useTypingIndicator = ({ socket, senderId, receiverId, groupId }: UseTypingIndicatorProps) => {
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  
  const isSelfTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: any) => {
      // Ignore if the typing event is from ourselves
      if (data.senderId === senderId) return;
      
      // In personal chat, check if it's from the person we're chatting with
      if (receiverId && data.senderId !== receiverId) return;

      // In group chat, check if it's from the same group
      if (groupId && String(data.groupId) !== String(groupId)) return;

      setIsSomeoneTyping(true);
      setTypingUser(data.senderName || data.senderId);
    };

    const handleStopTyping = (data: any) => {
      if (data.senderId === senderId) return;
      if (receiverId && data.senderId !== receiverId) return;
      if (groupId && String(data.groupId) !== String(groupId)) return;

      setIsSomeoneTyping(false);
      setTypingUser(null);
    };

    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, senderId, receiverId, groupId]);

  const emitTyping = useCallback(() => {
    if (!senderId) return;

    if (!isSelfTyping.current) {
      isSelfTyping.current = true;
      socket.emit('typing', { senderId, receiverId, groupId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isSelfTyping.current = false;
      socket.emit('stop_typing', { senderId, receiverId, groupId });
    }, 1000);
  }, [socket, senderId, receiverId, groupId]);

  return { isSomeoneTyping, typingUser, emitTyping };
};
