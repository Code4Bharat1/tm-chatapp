"use client";

import { create } from "zustand";
import io from "socket.io-client";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";

// Initialize Socket.IO client only once
let socket = null;

export const useMessageStore = create((set, get) => ({
  messages: [],
  error: null,
  onlineUsers: [],
  isTyping: {},
  groupName: "Group Chat",
  user: null,
  companyUsers: [],
  selectedUsers: [],
  rooms: [],
  currentRoom: null,
  sendMessage: (messageContent) => {
    if (!messageContent.trim()) {
      set({ error: "Message content cannot be empty" });
      return;
    }
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Sending sendMessage] content="${messageContent}" to room=${currentRoom}`);
      socket.emit("sendMessage", messageContent);
    } else {
      set({ error: "Socket not connected" });
    }
  },
  editMessage: (messageId, newMessage) => {
    if (!newMessage.trim()) {
      set({ error: "New message content cannot be empty" });
      return;
    }
    if (!messageId) {
      set({ error: "Message ID is required" });
      return;
    }
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    if (socket && socket.connected) {
      console.log(
        `📤 [Sending editMessage] messageId=${messageId}, newMessage="${newMessage}" to room=${currentRoom}`
      );
      socket.emit("editMessage", { messageId, newMessage });
    } else {
      set({ error: "Socket not connected" });
    }
  },
  deleteMessage: (messageId) => {
    if (!messageId) {
      set({ error: "Message ID is required" });
      return;
    }
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Sending deleteMessage] messageId=${messageId} to room=${currentRoom}`);
      socket.emit("deleteMessage", messageId);
    } else {
      set({ error: "Socket not connected" });
    }
  },
  setTyping: (isTyping) => {
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Sending ${isTyping ? "typing" : "stopTyping"}] to room=${currentRoom}`);
      socket.emit(isTyping ? "typing" : "stopTyping");
    }
  },
  fetchUser: async () => {
    try {
      console.log("Fetching user from API...");
      const response = await fetch("http://localhost:8080/api/user", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You do not have permission to access the chat feature.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("User from API:", data);
      if (data.userId) {
        set({ user: data, error: null });
      } else {
        throw new Error("No userId in API response");
      }
    } catch (error) {
      console.error("Error fetching user:", error.message);
      set({ error: error.message, user: null });
    }
  },
  fetchCompanyUsers: async () => {
    try {
      console.log("Fetching company users from API...");
      const response = await fetch("http://localhost:8080/api/companyUsers", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("Error response from server:", errorData);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.message || "Unknown error"
          }`
        );
      }

      const { success, data } = await response.json();
      if (success && Array.isArray(data)) {
        console.log("Company users from API:", data);
        set({
          companyUsers: data.map((user) => ({
            userId: String(user.userId),
            firstName: user.firstName || "Anonymous",
            email: user.email,
            position: user.position,
          })),
          error: null,
        });
      } else {
        throw new Error("Invalid response format from company users API");
      }
    } catch (error) {
      console.error("Error fetching company users:", error.message);
      set({ error: `Failed to fetch company users: ${error.message}` });
    }
  },
  setSelectedUsers: (userIds) => {
    set((state) => {
      const selected = state.companyUsers.filter((u) =>
        userIds.includes(String(u.userId))
      );
      console.log(`Selected users updated:`, selected);
      return { selectedUsers: selected };
    });
  },
  toggleSelectedUser: (userId) => {
    set((state) => {
      const isSelected = state.selectedUsers.some(
        (u) => String(u.userId) === String(userId)
      );
      if (isSelected) {
        const updated = state.selectedUsers.filter(
          (u) => String(u.userId) !== String(userId)
        );
        console.log(`User ${userId} deselected:`, updated);
        return { selectedUsers: updated };
      } else {
        const user = state.companyUsers.find(
          (u) => String(u.userId) === String(userId)
        );
        if (user) {
          const updated = [...state.selectedUsers, user];
          console.log(`User ${userId} selected:`, updated);
          return { selectedUsers: updated };
        }
        return state;
      }
    });
  },
  clearSelectedUsers: () => {
    set({ selectedUsers: [] });
    console.log("Selected users cleared");
  },
  createRoom: (roomName, userIds) => {
    if (!roomName.trim()) {
      set({ error: "Room name cannot be empty" });
      return;
    }
    if (!userIds || userIds.length === 0) {
      set({ error: "At least one user must be selected for the room" });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Creating room] name="${roomName}", users=${userIds}`);
      socket.emit("createRoom", { roomName, userIds });
    } else {
      set({ error: "Socket not connected" });
    }
  },
  joinRoom: async (roomId) => {
    if (!roomId) {
      set({ error: "Room ID is required" });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Joining room] roomId=${roomId}`);
      socket.emit("joinRoom", roomId);
      // Fetch messages for the room
      try {
        const response = await fetch(`http://localhost:8080/api/messages?roomId=${roomId}`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const { success, data } = await response.json();
        if (success && Array.isArray(data)) {
          set((state) => ({
            messages: [
              ...state.messages.filter((msg) => String(msg.roomId) !== String(roomId)),
              ...data.map((msg) => ({
                ...msg,
                _id: String(msg._id),
                userId: String(msg.userId),
                roomId: String(msg.roomId),
                timestamp: msg.timestamp,
              })),
            ],
            error: null,
          }));
        } else {
          throw new Error("Invalid response format for messages");
        }
      } catch (error) {
        console.error("Error fetching messages:", error.message);
        set({ error: `Failed to fetch messages: ${error.message}` });
      }
    } else {
      set({ error: "Socket not connected" });
    }
  },
  leaveRoom: (roomId) => {
    if (!roomId) {
      set({ error: "Room ID is required" });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Leaving room] roomId=${roomId}`);
      socket.emit("leaveRoom", roomId);
    } else {
      set({ error: "Socket not connected" });
    }
  },
  deleteRoom: (roomId) => {
    if (!roomId) {
      set({ error: "Room ID is required" });
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Deleting room] roomId=${roomId}`);
      socket.emit("deleteRoom", roomId);
    } else {
      set({ error: "Socket not connected" });
    }
  },
  initializeSocket: () => {
    if (!socket) {
      console.log("Initializing Socket.IO client...");
      socket = io("http://localhost:8080", {
        withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected");
        const token = Cookies.get("token");
        if (token) {
          try {
            const user = jwt.verify(token, process.env.JWT_SECRET);
            if (user?.companyId) {
              set({
                groupName: `Company ${user.companyId} Chat`,
                currentRoom: `company_${user.companyId}`,
              });
            }
          } catch (error) {
            console.error("Error verifying token:", error.message);
            set({ error: "Invalid token" });
          }
        }
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Socket connection error:", err.message);
        set({ error: `Socket connection failed: ${err.message}` });
      });

      socket.on("newMessage", (data) => {
        console.log("📥 [newMessage Received]:", data);
        if (data && data._id && data.roomId) {
          const { currentRoom } = get();
          if (String(data.roomId) === String(currentRoom)) {
            set((state) => {
              // Avoid duplicate messages
              if (state.messages.some((msg) => String(msg._id) === String(data._id))) {
                return state;
              }
              return {
                messages: [
                  ...state.messages,
                  {
                    ...data,
                    _id: String(data._id),
                    userId: data.userId ? String(data.userId) : "unknown",
                    roomId: String(data.roomId),
                    timestamp: data.timestamp || new Date().toISOString(),
                  },
                ],
                error: null,
              };
            });
          }
        } else {
          console.error("Invalid newMessage data: missing _id or roomId", data);
          set({ error: "Received invalid message data: missing ID or roomId" });
        }
      });

      socket.on("messageUpdated", (updatedMessage) => {
        console.log("📥 [messageUpdated Received]:", updatedMessage);
        if (updatedMessage && updatedMessage._id && updatedMessage.roomId) {
          const { currentRoom } = get();
          if (String(updatedMessage.roomId) === String(currentRoom)) {
            set((state) => ({
              messages: state.messages.map((msg) =>
                String(msg._id) === String(updatedMessage._id)
                  ? {
                      ...updatedMessage,
                      _id: String(updatedMessage._id),
                      userId: updatedMessage.userId
                        ? String(updatedMessage.userId)
                        : "unknown",
                      roomId: String(updatedMessage.roomId),
                      timestamp:
                        updatedMessage.timestamp || new Date().toISOString(),
                    }
                  : msg
              ),
              error: null,
            }));
          }
        } else {
          console.error(
            "Invalid messageUpdated data: missing _id or roomId",
            updatedMessage
          );
          set({ error: "Received invalid updated message data: missing ID or roomId" });
        }
      });

      socket.on("messageDeleted", ({ messageId }) => {
        console.log("📥 [messageDeleted Received]:", messageId);
        if (messageId) {
          set((state) => ({
            messages: state.messages.filter(
              (msg) => String(msg._id) !== String(messageId)
            ),
            error: null,
          }));
        } else {
          console.error("Invalid messageId for deletion:", messageId);
          set({ error: "Received invalid message ID for deletion" });
        }
      });

      socket.on("userTyping", ({ userId, username, roomId }) => {
        console.log(`📥 [userTyping Received]: ${username} (${userId}) in room=${roomId}`);
        const { currentRoom } = get();
        if (String(roomId) === String(currentRoom) && userId && username) {
          set((state) => ({
            isTyping: { ...state.isTyping, [String(userId)]: username },
            onlineUsers: [
              ...state.onlineUsers.filter(
                (u) => String(u.userId) !== String(userId)
              ),
              { userId: String(userId), username },
            ],
          }));
        } else {
          console.warn("Invalid userTyping data or wrong room", {
            userId,
            username,
            roomId,
          });
        }
      });

      socket.on("userStoppedTyping", ({ userId, roomId }) => {
        console.log(`📥 [userStoppedTyping Received]: userId=${userId} in room=${roomId}`);
        const { currentRoom } = get();
        if (String(roomId) === String(currentRoom) && userId) {
          set((state) => {
            const newTyping = { ...state.isTyping };
            delete newTyping[String(userId)];
            return { isTyping: newTyping };
          });
        } else {
          console.warn("Invalid userStoppedTyping data or wrong room", {
            userId,
            roomId,
          });
        }
      });

      socket.on("joinConfirmation", (data) => {
        console.log(`✅ Joined room: ${data.room}`);
        if (data.room && data.users) {
          set({
            currentRoom: String(data.room),
            groupName: data.roomName || `Room ${data.room}`,
            onlineUsers: data.users.map((u) => ({
              userId: String(u.userId),
              username: u.username || "Anonymous",
            })),
            error: null,
          });
        } else {
          console.error("Invalid joinConfirmation data:", data);
          set({ error: "Received invalid join confirmation data" });
        }
      });

      socket.on("roomCreated", (room) => {
        console.log("📥 [roomCreated Received]:", room);
        if (room && room.roomId) {
          set((state) => {
            // Prevent duplicate rooms
            if (state.rooms.some((r) => String(r.roomId) === String(room.roomId))) {
              return state;
            }
            return {
              rooms: [
                ...state.rooms,
                {
                  roomId: String(room.roomId),
                  roomName: room.roomName,
                  users: room.users.map((u) => String(u)),
                  creator: room.creator ? String(room.creator) : null,
                },
              ],
              selectedUsers: [], // Clear selected users after room creation
              error: null,
            };
          });
        } else {
          console.error("Invalid roomCreated data:", room);
          set({ error: "Received invalid room data" });
        }
      });

      socket.on("userJoined", ({ userId, username, roomId }) => {
        console.log(`📥 [userJoined Received]: ${username} (${userId}) in room=${roomId}`);
        const { currentRoom } = get();
        if (String(roomId) === String(currentRoom) && userId && username) {
          set((state) => ({
            onlineUsers: [
              ...state.onlineUsers.filter(
                (u) => String(u.userId) !== String(userId)
              ),
              { userId: String(userId), username },
            ],
          }));
        } else {
          console.warn("Invalid userJoined data or wrong room", {
            userId,
            username,
            roomId,
          });
        }
      });

      socket.on("roomLeft", ({ success, message, data }) => {
        console.log(`📥 [roomLeft Received]:`, { success, message, data });
        if (success && data && data.roomId) {
          set((state) => ({
            rooms: state.rooms.filter((r) => String(r.roomId) !== String(data.roomId)),
            currentRoom: state.currentRoom === data.roomId ? null : state.currentRoom,
            groupName: state.currentRoom === data.roomId ? "Group Chat" : state.groupName,
            onlineUsers: state.currentRoom === data.roomId ? [] : state.onlineUsers,
            isTyping: state.currentRoom === data.roomId ? {} : state.isTyping,
            messages: state.currentRoom === data.roomId 
              ? state.messages.filter((msg) => String(msg.roomId) !== String(data.roomId))
              : state.messages,
            error: null,
          }));
        } else {
          console.error("Invalid roomLeft data:", { success, message, data });
          set({ error: "Received invalid room left confirmation data" });
        }
      });

      socket.on("userLeftRoom", ({ userId, username, roomId, roomName }) => {
        console.log(`📥 [userLeftRoom Received]: ${username} (${userId}) left room=${roomId}`);
        const { currentRoom } = get();
        if (String(roomId) === String(currentRoom) && userId) {
          set((state) => ({
            onlineUsers: state.onlineUsers.filter(
              (u) => String(u.userId) !== String(userId)
            ),
            isTyping: Object.fromEntries(
              Object.entries(state.isTyping).filter(([id]) => String(id) !== String(userId))
            ),
            error: null,
          }));
        } else {
          console.warn("Invalid userLeftRoom data or wrong room", {
            userId,
            username,
            roomId,
            roomName,
          });
        }
      });

      socket.on("roomDeleted", ({ roomId, roomName, message }) => {
        console.log(`📥 [roomDeleted Received]: roomId=${roomId}, roomName=${roomName}`);
        if (roomId) {
          set((state) => ({
            rooms: state.rooms.filter((r) => String(r.roomId) !== String(roomId)),
            currentRoom: state.currentRoom === roomId ? null : state.currentRoom,
            groupName: state.currentRoom === roomId ? "Group Chat" : state.groupName,
            onlineUsers: state.currentRoom === roomId ? [] : state.onlineUsers,
            isTyping: state.currentRoom === roomId ? {} : state.isTyping,
            messages: state.currentRoom === roomId 
              ? state.messages.filter((msg) => String(msg.roomId) !== String(roomId))
              : state.messages,
            error: null,
          }));
        } else {
          console.error("Invalid roomDeleted data: missing roomId", { roomId, roomName, message });
          set({ error: "Received invalid room deletion data: missing roomId" });
        }
      });

      socket.on("errorMessage", (msg) => {
        console.log("❌ [errorMessage Received]:", msg);
        set({ error: msg });
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        set({ onlineUsers: [], isTyping: {}, currentRoom: null, groupName: "Group Chat" });
      });
    }
  },
  clearError: () => set({ error: null }),
}));