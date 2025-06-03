"use client";

import { create } from "zustand";
import io from "socket.io-client";
import Cookies from "js-cookie";
import axios from "axios";
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
  uploadedFiles: [],
  uploadedVoices: [], // Renamed for clarity and consistency
  uploadProgress: 0,
  downloadProgress: 0,
  downloadError: null,

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
      console.log(
        `📤 [Sending sendMessage] content="${messageContent}" to room=${currentRoom}`
      );
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
      set({ error: "No room formed. Please join a room." });
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
      console.log(
        `📤 [Sending deleteMessage] messageId=${messageId} to room=${currentRoom}`
      );
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
      console.log(
        `📤 [Sending ${
          isTyping ? "typing" : "stopTyping"
        }] to room=${currentRoom}`
      );
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
          throw new Error(
            "You do not have permission to access the chat feature."
          );
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
      console.log("❌ joinRoom: Room ID missing");
      return;
    }
    if (socket && socket.connected) {
      console.log(`📤 [Joining room] roomId=${roomId}`);
      socket.emit("joinRoom", roomId);

      try {
        // Fetch all data concurrently
        const [messagesResponse, voicesResponse, filesResponse] =
          await Promise.all([
            fetch(`http://localhost:8080/api/messages?roomId=${roomId}`, {
              method: "GET",
              credentials: "include",
            }),
            fetch(`http://localhost:8080/api/get/voice/${roomId}`, {
              method: "GET",
              credentials: "include",
            }),
            fetch(`http://localhost:8080/api/get/file/${roomId}`, {
              method: "GET",
              credentials: "include",
            }),
          ]);

        // Validate responses
        if (!messagesResponse.ok) {
          const errorData = await messagesResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Messages API error! status: ${messagesResponse.status}`
          );
        }
        if (!voicesResponse.ok) {
          const errorData = await voicesResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Voice API error! status: ${voicesResponse.status}`
          );
        }
        if (!filesResponse.ok) {
          const errorData = await filesResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `File API error! status: ${filesResponse.status}`
          );
        }

        const { success: messagesSuccess, data: messagesData } =
          await messagesResponse.json();
        const { success: voicesSuccess, messages: voicesData } =
          await voicesResponse.json();
        const { success: filesSuccess, data: filesData } =
          await filesResponse.json();

        if (!messagesSuccess || !Array.isArray(messagesData)) {
          throw new Error("Invalid response format for messages");
        }
        if (!voicesSuccess || !Array.isArray(voicesData)) {
          throw new Error("Invalid response format for voice messages");
        }
        if (!filesSuccess || !Array.isArray(filesData)) {
          throw new Error("Invalid response format for file messages");
        }

        // Deduplicate by _id
        const seenIds = new Set();
        const uniqueMessages = messagesData.filter((msg) => {
          if (seenIds.has(String(msg._id))) return false;
          seenIds.add(String(msg._id));
          return true;
        });
        const uniqueVoices = voicesData.filter((msg) => {
          if (seenIds.has(String(msg._id))) return false;
          seenIds.add(String(msg._id));
          return true;
        });
        const uniqueFiles = filesData.filter((msg) => {
          if (seenIds.has(String(msg._id))) return false;
          seenIds.add(String(msg._id));
          return true;
        });

        // Update state
        set((state) => ({
          currentRoom: roomId,
          messages: [
            ...state.messages.filter(
              (msg) => String(msg.roomId) !== String(roomId)
            ),
            ...uniqueMessages
              .filter((msg) => !msg.file && !msg.voice)
              .map((msg) => ({
                _id: String(msg._id),
                userId: String(msg.userId),
                roomId: String(msg.roomId),
                message: msg.message,
                username: msg.username || "Anonymous",
                timestamp: msg.timestamp || new Date().toISOString(),
              })),
          ],
          uploadedFiles: [
            ...state.uploadedFiles.filter(
              (file) => String(file.roomId) !== String(roomId)
            ),
            ...uniqueFiles.map((msg) => ({
              _id: String(msg._id),
              message: msg.message || "File uploaded",
              userId: String(msg.userId),
              username: msg.username || "Anonymous",
              roomId: String(msg.roomId),
              timestamp: msg.timestamp || new Date().toISOString(),
              file: {
                filename: String(msg.file.filename || ""),
                originalName: String(msg.file.originalName || ""),
                mimeType: String(
                  msg.file.mimeType || "application/octet-stream"
                ),
                size: Number(msg.file.size) || 0,
                url: String(msg.file.url || ""),
              },
            })),
          ],
          uploadedVoices: [
            ...state.uploadedVoices.filter(
              (voice) => String(voice.roomId) !== String(roomId)
            ),
            ...uniqueVoices.map((voice) => ({
              _id: String(voice._id),
              message: voice.message || "Voice message uploaded",
              userId: String(voice.userId || "unknown"),
              username: voice.username || "Anonymous",
              roomId: String(voice.roomId),
              timestamp: voice.timestamp || new Date().toISOString(),
              voice: {
                filename: String(voice.voice.filename || ""),
                originalName: String(
                  voice.voice.originalName || voice.voice.filename || ""
                ),
                mimeType: String(voice.voice.mimeType || "audio/webm"),
                size: Number(voice.voice.size || 0),
                url: String(voice.voice.url || ""),
              },
            })),
          ],
          error: null,
        }));
      } catch (error) {
        console.error("Error fetching room data:", error.message);
        set({ error: `Failed to fetch room data: ${error.message}` });
      }
    } else {
      set({ error: "Socket not connected" });
      console.log("❌ joinRoom: Socket not connected");
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

  deleteRoom: async (roomId) => {
    if (!roomId) {
      set({ error: "Room ID is required" });
      console.log("❌ deleteRoom: Room ID missing");
      return;
    }
    try {
      console.log(`📤 [Deleting room] roomId=${roomId}`);

      // Make DELETE request to /api/delete/room/:roomId with cookies
      const response = await axios.delete(
        `http://localhost:8080/api/delete/room/${roomId}`,
        {
          withCredentials: true, // Send cookies for authentication
        }
      );
      console.log(`✅ Room deleted:`, response.data);

      // Update local state
      set((state) => ({
        rooms: state.rooms.filter(
          (room) => String(room.roomId) !== String(roomId)
        ),
        currentRoom: state.currentRoom === roomId ? null : state.currentRoom,
        messages: state.messages.filter(
          (msg) => String(msg.roomId) !== String(roomId)
        ),
        uploadedFiles: state.uploadedFiles.filter(
          (file) => String(file.roomId) !== String(roomId)
        ),
        uploadedVoices: state.uploadedVoices.filter(
          (voice) => String(voice.roomId) !== String(roomId)
        ),
        error: null,
      }));
    } catch (error) {
      console.error(
        "Error deleting room:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to delete room: ${error.message}`;
      set({ error: errorMessage });
    }
  },

  uploadFile: async (file, onProgress = () => {}) => {
    if (!file) {
      set({ error: "No file selected for upload" });
      return;
    }
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    try {
      console.log(
        `📤 [Uploading file] originalName=${file.name} to room=${currentRoom}`
      );
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomId", currentRoom);
      console.log("📤 [FormData contents]:", [...formData.entries()]);

      const response = await axios.post(
        "http://localhost:8080/api/upload",
        formData,
        {
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            set({ uploadProgress: percentCompleted });
            onProgress(percentCompleted);
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        }
      );

      console.log(`✅ File uploaded:`, response.data);
      set({ error: null, uploadProgress: 0 });
    } catch (error) {
      console.error(
        "Error uploading file:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to upload file: ${error.message}`;
      set({ error: errorMessage, uploadProgress: 0 });
    }
  },

  requestFile: async (fileId) => {
    if (!fileId) {
      set({ downloadError: "File ID is required" });
      return;
    }
    const { currentRoom, uploadedFiles } = get();
    if (!currentRoom) {
      set({ downloadError: "No room selected. Please join a room." });
      return;
    }

    const file = uploadedFiles.find((f) => String(f._id) === String(fileId));
    if (!file) {
      console.error("File not found in uploadedFiles:", fileId);
      set({ downloadError: "File not found" });
      return;
    }

    console.log("File metadata:", file);

    if (!file.file?.filename) {
      console.error("No filename in file metadata:", file);
      set({ downloadError: "File metadata missing filename" });
      return;
    }

    try {
      console.log(
        `📥 [Downloading file] fileId=${fileId}, filename=${file.file.filename}`
      );

      const response = await axios.get(
        `http://localhost:8080/api/download/${encodeURIComponent(
          file.file.filename
        )}`,
        {
          withCredentials: true,
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            set({ downloadProgress: percentCompleted });
            console.log(`Download Progress: ${percentCompleted}%`);
          },
        }
      );

      const blob = new Blob([response.data], { type: file.file.mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.file.originalName);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ File downloaded: ${file.file.originalName}`);
      set({ downloadProgress: 0, downloadError: null });
    } catch (error) {
      console.error(
        "Error downloading file:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to download file: ${error.message}`;
      set({ downloadError: errorMessage, downloadProgress: 0 });
    }
  },

  deleteFile: async (fileId) => {
    if (!fileId) {
      set({ error: "File ID is required" });
      return;
    }
    const { currentRoom, uploadedFiles } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }

    const file = uploadedFiles.find((f) => String(f._id) === String(fileId));
    if (!file) {
      console.error("File not found in uploadedFiles:", fileId);
      set({ error: "File not found" });
      return;
    }

    if (!file.file?.filename) {
      console.error("No filename in file metadata:", file);
      set({ error: "File metadata missing filename" });
      return;
    }

    try {
      console.log(
        `📤 [Deleting file] fileId=${fileId}, filename=${file.file.filename}`
      );
      const response = await axios.delete(
        `http://localhost:8080/api/delete/file/${encodeURIComponent(
          file.file.filename
        )}`,
        {
          withCredentials: true,
        }
      );

      console.log(`✅ File deleted:`, response.data);
      set({ error: null });
    } catch (error) {
      console.error(
        "Error deleting file:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to delete file: ${error.message}`;
      set({ error: errorMessage });
    }
  },

  uploadVoice: async (voice, onProgress = () => {}) => {
    if (!voice) {
      set({ error: "No voice file selected for upload" });
      return;
    }
    const { currentRoom } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }
    try {
      console.log(
        `📤 [Uploading voice] originalName=${voice.name} to room=${currentRoom}`
      );
      const formData = new FormData();
      formData.append("voice", voice);
      formData.append("roomId", currentRoom);
      console.log("📤 [FormData contents]:", [...formData.entries()]);

      const response = await axios.post(
        "http://localhost:8080/api/upload/voice",
        formData,
        {
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            set({ uploadProgress: percentCompleted });
            onProgress(percentCompleted);
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        }
      );

      console.log(`✅ Voice uploaded:`, response.data);
      set({ error: null, uploadProgress: 0 });
    } catch (error) {
      console.error(
        "Error uploading voice:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to upload voice: ${error.message}`;
      set({ error: errorMessage, uploadProgress: 0 });
    }
  },

  requestVoice: async (voiceId) => {
    if (!voiceId) {
      set({ downloadError: "Voice ID is required" });
      return;
    }
    const { currentRoom, uploadedVoices } = get();
    if (!currentRoom) {
      set({ downloadError: "No room selected. Please join a room." });
      return;
    }

    const voice = uploadedVoices.find((v) => String(v._id) === String(voiceId));
    if (!voice) {
      console.error("Voice not found in uploadedVoices:", voiceId);
      set({ downloadError: "Voice not found" });
      return;
    }

    console.log("Voice metadata:", voice);

    if (!voice.voice?.filename) {
      console.error("No filename in voice metadata:", voice);
      set({ downloadError: "Voice metadata missing filename" });
      return;
    }

    try {
      console.log(
        `📥 [Downloading voice] voiceId=${voiceId}, filename=${voice.voice.filename}`
      );

      const response = await axios.get(
        `http://localhost:8080/api/download/voice/${encodeURIComponent(
          voice.voice.filename
        )}`,
        {
          withCredentials: true,
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            set({ downloadProgress: percentCompleted });
            console.log(`Download Progress: ${percentCompleted}%`);
          },
        }
      );

      const blob = new Blob([response.data], { type: voice.voice.mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", voice.voice.originalName);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Voice downloaded: ${voice.voice.originalName}`);
      set({ downloadProgress: 0, downloadError: null });
    } catch (error) {
      console.error(
        "Error downloading voice:",
        error.message,
        error.response?.data
      );
      const errorMessage =
        error.response?.data?.error ||
        `Failed to download voice: ${error.message}`;
      set({ downloadError: errorMessage, downloadProgress: 0 });
    }
  },

  deleteVoice: async (voiceId) => {
    if (!voiceId) {
      set({ error: "Voice ID is required" });
      return;
    }
    const { currentRoom, uploadedVoices } = get();
    if (!currentRoom) {
      set({ error: "No room selected. Please join a room." });
      return;
    }

    const voice = uploadedVoices.find((v) => String(v._id) === String(voiceId));
    if (!voice) {
      console.error("Voice not found in uploadedVoices:", voiceId);
      set({ error: "Voice not found" });
      return;
    }

    if (!voice.voice?.filename) {
      console.error("No filename in voice metadata:", voice);
      set({ error: "Voice metadata missing filename" });
      return;
    }

    // Optimistically update state
    const originalVoices = [...uploadedVoices];
    const originalMessages = [...get().messages];
    set((state) => ({
      uploadedVoices: state.uploadedVoices.filter(
        (v) => String(v._id) !== String(voiceId)
      ),
      messages: state.messages.filter(
        (msg) => String(msg?.voice?.filename) !== String(voice.voice.filename)
      ),
    }));

    try {
      console.log(
        `📤 [Deleting voice] voiceId=${voiceId}, filename=${voice.voice.filename}`
      );
      const response = await axios.delete(
        `http://localhost:8080/api/delete/voice/${encodeURIComponent(
          voice.voice.filename
        )}`,
        {
          withCredentials: true,
        }
      );

      console.log(`✅ Voice deleted:`, response.data);
      set({ error: null });
    } catch (error) {
      console.error(
        "Error deleting voice:",
        error.message,
        error.response?.data
      );
      // Rollback on failure
      set({
        uploadedVoices: originalVoices,
        messages: originalMessages,
        error:
          error.response?.data?.error ||
          `Failed to delete voice: ${error.message}`,
      });
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
            const user = jwt.decode(token);
            if (user?.companyId) {
              set({
                groupName: `Company ${user.companyId} Chat`,
                currentRoom: `company_${user.companyId}`,
              });
            }
          } catch (error) {
            console.error("Error decoding token:", error.message);
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
              if (
                state.messages.some(
                  (msg) => String(msg._id) === String(data._id)
                )
              ) {
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
          set({
            error:
              "Received invalid updated message data: missing ID or roomId",
          });
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
        console.log(
          `📥 [userTyping Received]: ${username} (${userId}) in room=${roomId}`
        );
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
        console.log(
          `📥 [userStoppedTyping Received]: userId=${userId} in room=${roomId}`
        );
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
            if (
              state.rooms.some((r) => String(r.roomId) === String(room.roomId))
            ) {
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
              selectedUsers: [],
              error: null,
            };
          });
        } else {
          console.error("Invalid roomCreated data:", room);
          set({ error: "Received invalid room data" });
        }
      });

      socket.on("userJoined", ({ userId, username, roomId }) => {
        console.log(
          `📥 [userJoined Received]: ${username} (${userId}) in room=${roomId}`
        );
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
            rooms: state.rooms.filter(
              (r) => String(r.roomId) !== String(data.roomId)
            ),
            currentRoom:
              state.currentRoom === data.roomId ? null : state.currentRoom,
            groupName:
              state.currentRoom === data.roomId
                ? "Group Chat"
                : state.groupName,
            onlineUsers:
              state.currentRoom === data.roomId ? [] : state.onlineUsers,
            isTyping: state.currentRoom === data.roomId ? {} : state.isTyping,
            messages:
              state.currentRoom === data.roomId
                ? state.messages.filter(
                    (msg) => String(msg.roomId) !== String(data.roomId)
                  )
                : state.messages,
            uploadedFiles:
              state.currentRoom === data.roomId
                ? state.uploadedFiles.filter(
                    (file) => String(file.roomId) !== String(data.roomId)
                  )
                : state.uploadedFiles,
            uploadedVoices:
              state.currentRoom === data.roomId
                ? state.uploadedVoices.filter(
                    (voice) => String(voice.roomId) !== String(data.roomId)
                  )
                : state.uploadedVoices,
            error: null,
          }));
        } else {
          console.error("Invalid roomLeft data:", { success, message, data });
          set({ error: "Received invalid room left confirmation data" });
        }
      });

      socket.on("userLeftRoom", ({ userId, username, roomId, roomName }) => {
        console.log(
          `📥 [userLeftRoom Received]: ${username} (${userId}) left room=${roomId}`
        );
        const { currentRoom } = get();
        if (String(roomId) === String(currentRoom) && userId) {
          set((state) => ({
            onlineUsers: state.onlineUsers.filter(
              (u) => String(u.userId) !== String(userId)
            ),
            isTyping: Object.fromEntries(
              Object.entries(state.isTyping).filter(
                ([id]) => String(id) !== String(userId)
              )
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

      socket.on("roomDeleted", (data) => {
        set((state) => ({
          rooms: state.rooms.filter(
            (room) => String(room.roomId) !== String(data.roomId)
          ),
          currentRoom:
            state.currentRoom === data.roomId ? null : state.currentRoom,
          messages: state.messages.filter(
            (msg) => String(msg.roomId) !== String(data.roomId)
          ),
          uploadedFiles: state.uploadedFiles.filter(
            (file) => String(file.roomId) !== String(data.roomId)
          ),
          uploadedVoices: state.uploadedVoices.filter(
            (voice) => String(voice.roomId) !== String(data.roomId)
          ),
        }));
      });

      socket.on("newFile", (fileDetails) => {
        console.log("📥 [newFile Received]:", fileDetails);
        if (
          fileDetails &&
          fileDetails._id &&
          fileDetails.roomId &&
          fileDetails.file &&
          fileDetails.file.filename &&
          fileDetails.file.url
        ) {
          const { currentRoom } = get();
          if (String(fileDetails.roomId) === String(currentRoom)) {
            set((state) => {
              if (
                state.uploadedFiles.some(
                  (file) => String(file._id) === String(fileDetails._id)
                )
              ) {
                return state;
              }
              return {
                uploadedFiles: [
                  ...state.uploadedFiles,
                  {
                    _id: String(fileDetails._id),
                    message: fileDetails.message || "File uploaded",
                    userId: String(fileDetails.userId || "unknown"),
                    username: fileDetails.username || "Anonymous",
                    roomId: String(fileDetails.roomId),
                    timestamp:
                      fileDetails.timestamp || new Date().toISOString(),
                    file: {
                      filename: fileDetails.file.filename,
                      originalName:
                        fileDetails.file.originalName ||
                        fileDetails.file.filename,
                      mimeType:
                        fileDetails.file.mimeType || "application/octet-stream",
                      size: fileDetails.file.size || 0,
                      url: fileDetails.file.url,
                    },
                  },
                ],
                error: null,
              };
            });
          }
        } else {
          console.error(
            "Invalid newFile data: missing required fields",
            fileDetails
          );
          set({ error: "Received invalid file data: missing required fields" });
        }
      });

      socket.on("fileDeleted", ({ fileId, roomId, message, timestamp }) => {
        console.log(
          `📥 [fileDeleted Received]: fileId=${fileId}, roomId=${roomId}`
        );
        if (fileId && roomId) {
          const { currentRoom } = get();
          if (String(roomId) === String(currentRoom)) {
            set((state) => ({
              uploadedFiles: state.uploadedFiles.filter(
                (file) => String(file.file.filename) !== String(fileId)
              ),
              error: null,
            }));
          }
        } else {
          console.error("Invalid fileDeleted data: missing fileId or roomId", {
            fileId,
            roomId,
            message,
            timestamp,
          });
          set({ error: "Received invalid file deletion data" });
        }
      });

      socket.on("messagesDeleted", ({ roomId, message, timestamp }) => {
        console.log(`📥 [messagesDeleted Received]: roomId=${roomId}`);
        if (roomId) {
          const { currentRoom } = get();
          if (String(roomId) === String(currentRoom)) {
            set((state) => ({
              messages: state.messages.filter(
                (msg) => String(msg.roomId) !== String(roomId)
              ),
              uploadedFiles: state.uploadedFiles.filter(
                (file) => String(file.roomId) !== String(roomId)
              ),
              uploadedVoices: state.uploadedVoices.filter(
                (voice) => String(voice.roomId) !== String(roomId)
              ),
              error: null,
            }));
          }
        } else {
          console.error("Invalid messagesDeleted data: missing roomId", {
            roomId,
            message,
            timestamp,
          });
          set({ error: "Received invalid file deletion data" });
        }
      });

      socket.on("newVoice", (voiceDetails) => {
        console.log("📥 [newVoice Received]:", voiceDetails);
        if (
          voiceDetails &&
          voiceDetails._id &&
          voiceDetails.roomId &&
          voiceDetails.voice &&
          voiceDetails.voice.filename &&
          voiceDetails.voice.url
        ) {
          const { currentRoom } = get();
          if (String(voiceDetails.roomId) === String(currentRoom)) {
            set((state) => {
              if (
                state.uploadedVoices.some(
                  (voice) => String(voice._id) === String(voiceDetails._id)
                )
              ) {
                return state;
              }
              return {
                uploadedVoices: [
                  ...state.uploadedVoices,
                  {
                    _id: String(voiceDetails._id),
                    message: voiceDetails.message || "Voice message uploaded",
                    userId: String(voiceDetails.userId || "unknown"),
                    username: voiceDetails.username || "Anonymous",
                    roomId: String(voiceDetails.roomId),
                    timestamp:
                      voiceDetails.timestamp || new Date().toISOString(),
                    voice: {
                      filename: voiceDetails.voice.filename,
                      originalName:
                        voiceDetails.voice.originalName ||
                        voiceDetails.voice.filename,
                      mimeType: voiceDetails.voice.mimeType || "audio/mpeg",
                      size: voiceDetails.voice.size || 0,
                      url: voiceDetails.voice.url,
                    },
                  },
                ],
                error: null,
              };
            });
          }
        } else {
          console.error(
            "Invalid newVoice data: missing required fields",
            voiceDetails
          );
          set({
            error: "Received invalid voice data: missing required fields",
          });
        }
      });

      socket.on("errorMessage", (msg) => {
        console.log("❌ [errorMessage Received]:", msg);
        set({ error: msg });
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        set({
          onlineUsers: [],
          isTyping: {},
          currentRoom: null,
          groupName: "Group Chat",
          uploadProgress: 0,
          downloadProgress: 0,
          downloadError: null,
        });
      });
      socket.on("voiceDeleted", ({ voiceId, roomId }) => {
        console.log(
          `📥 [voiceDeleted Received]: voiceId=${voiceId}, roomId=${roomId}`
        );
        if (voiceId && roomId) {
          const { currentRoom } = get();
          if (String(roomId) === String(currentRoom)) {
            set((state) => {
              const updatedVoices = state.uploadedVoices.filter(
                (voice) => String(voice.voice.filename) !== String(voiceId)
              );
              const updatedMessages = state.messages.filter(
                (msg) => String(msg?.voice?.filename) !== String(voiceId)
              );
              console.log(
                `🔍 [voiceDeleted] Before: voices=${state.uploadedVoices.length}, messages=${state.messages.length}`
              );
              console.log(
                `🔍 [voiceDeleted] After: voices=${updatedVoices.length}, messages=${updatedMessages.length}`
              );
              return {
                uploadedVoices: updatedVoices,
                messages: updatedMessages,
                error: null,
              };
            });
          }
        } else {
          console.error(
            "Invalid voiceDeleted data: missing voiceId or roomId",
            {
              voiceId,
              roomId,
            }
          );
          set({ error: "Received invalid voice deletion data" });
        }
      });
    }
  },

  clearError: () => set({ error: null, downloadError: null }),
}));
