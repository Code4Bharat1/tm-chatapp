"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useMessageStore } from "@/store/chat.store.js";
import {
  ChevronDown,
  Users,
  MessageCircle,
  Plus,
  X,
  UserPlus,
  LogOut,
  Settings,
  Search,
  Trash2,
  Paperclip,
  Download,
  Mic,
  StopCircle,
} from "lucide-react";

// Counter for generating unique notification IDs
let notificationIdCounter = 0;

const GroupChatUI = () => {
  const {
    messages,
    error,
    onlineUsers,
    isTyping,
    groupName,
    user,
    companyUsers,
    selectedUsers,
    rooms,
    currentRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    setTyping,
    initializeSocket,
    fetchUser,
    fetchCompanyUsers,
    toggleSelectedUser,
    clearSelectedUsers,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    clearError,
    uploadedFiles,
    uploadFile,
    uploadProgress,
    requestFile,
    downloadProgress,
    downloadError,
    uploadedVoices,
    uploadVoice,
    requestVoice,
    deleteFile,
    deleteVoice,
  } = useMessageStore();

  const [messageContent, setMessageContent] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isDeleting, setIsDeleting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomName, setRoomName] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [leavingRoomId, setLeavingRoomId] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [downloadingVoiceId, setDownloadingVoiceId] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const setup = async () => {
      console.log("Setting up GroupChatUI component...");
      await fetchUser();
      await fetchCompanyUsers();
      initializeSocket();
      setIsLoading(false);
    };
    setup();
  }, [fetchUser, fetchCompanyUsers, initializeSocket]);

  useEffect(() => {
    setTyping(!!messageContent.trim());
    return () => setTyping(false);
  }, [messageContent, setTyping]);

  useEffect(() => {
    console.log("Messages:", messages);
    console.log("Current User:", user);
    console.log("Selected Users:", selectedUsers);
    console.log("Rooms:", rooms);
    console.log("Current Room:", currentRoom);
    console.log("Uploaded Files:", uploadedFiles);
    console.log("Uploaded Voices:", uploadedVoices);
    console.log("All Items:", allItems);
    console.log("Upload Progress:", uploadProgress);
    console.log("Download Progress:", downloadProgress);
    console.log("Download Error:", downloadError || "");
    console.log("Notifications:", notifications);
  }, [
    messages,
    user,
    selectedUsers,
    rooms,
    currentRoom,
    uploadedFiles,
    uploadedVoices,
    uploadProgress,
    downloadProgress,
    downloadError,
    notifications,
  ]);

  useEffect(() => {
    if (error) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: error,
          type: "error",
        },
      ]);
      const timer = setTimeout(() => clearError(), 3600);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (downloadError) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: downloadError,
          type: "error",
        },
      ]);
    }
  }, [downloadError]);

  useEffect(() => {
    const socket = useMessageStore.getState().socket;
    if (socket) {
      const handleUserLeftRoom = ({ username, roomId }) => {
        if (String(roomId) === String(currentRoom)) {
          setNotifications((prev) => [
            ...prev,
            {
              id: `notif-${Date.now()}-${notificationIdCounter++}`,
              message: `${username} left the room`,
              type: "info",
            },
          ]);
        }
      };
      const handleRoomDeleted = ({ roomId, roomName, message }) => {
        if (String(roomId) === String(currentRoom)) {
          setNotifications((prev) => [
            ...prev,
            {
              id: `notif-${Date.now()}-${notificationIdCounter++}`,
              message,
              type: message.includes("You have successfully deleted")
                ? "success"
                : "warning",
            },
          ]);
        }
      };
      const handleNewVoice = (voice) => {
        console.log("📥 [New voice message received]:", voice);
        if (
          voice &&
          voice._id &&
          voice.roomId &&
          voice.voice &&
          voice.voice.url &&
          String(voice.roomId) === String(currentRoom)
        ) {
          useMessageStore.setState((prev) => {
            if (
              prev.uploadedVoices.some(
                (v) => String(v._id) === String(voice._id)
              )
            ) {
              console.log("Voice already exists, skipping:", voice._id);
              return prev;
            }
            console.log("Adding voice to uploadedVoices:", voice);
            return {
              uploadedVoices: [
                ...prev.uploadedVoices,
                {
                  _id: String(voice._id),
                  message: voice.message || "Voice message uploaded",
                  userId: String(voice.userId || "unknown"),
                  username: voice.username || "Anonymous",
                  roomId: String(voice.roomId),
                  timestamp: voice.timestamp || new Date().toISOString(),
                  voice: {
                    filename: voice.voice.filename,
                    originalName:
                      voice.voice.originalName || voice.voice.filename,
                    mimeType: voice.voice.mimeType || "audio/webm",
                    size: voice.voice.size || 0,
                    url: voice.voice.url,
                  },
                },
              ],
            };
          });
          setNotifications((prev) => [
            ...prev,
            {
              id: `notif-${Date.now()}-${notificationIdCounter++}`,
              message: `New voice message from ${
                voice.username || "Anonymous"
              }`,
              type: "info",
            },
          ]);
        } else {
          console.warn("Invalid or irrelevant voice data:", voice);
        }
      };
      socket.on("userLeftRoom", handleUserLeftRoom);
      socket.on("roomDeleted", handleRoomDeleted);
      socket.on("newVoice", handleNewVoice);
      return () => {
        socket.off("userLeftRoom", handleUserLeftRoom);
        socket.off("roomDeleted", handleRoomDeleted);
        socket.off("newVoice", handleNewVoice);
      };
    }
  }, [currentRoom]);

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setRecordedAudio(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log("🎙️ Recording started");
    } catch (error) {
      console.error("Error starting recording:", error.message);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Failed to start recording: ${error.message}`,
          type: "error",
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log("🎙️ Recording stopped");
    }
  };

  const handleDeleteFile = (fileId) => {
    if (confirm("Are you sure you want to delete this file?")) {
      setDeletingFileId(fileId);
      deleteFile(String(fileId));
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "File deleted successfully",
          type: "success",
        },
      ]);
      setTimeout(() => setDeletingFileId(null), 1000);
    }
  };

  const handleDeleteVoice = (voiceId) => {
    if (confirm("Are you sure you want to delete this voice message?")) {
      setDeletingFileId(voiceId);
      deleteVoice(String(voiceId));
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Voice message deleted successfully",
          type: "success",
        },
      ]);
      setTimeout(() => setDeletingFileId(null), 1000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageContent.trim()) {
      sendMessage(messageContent);
      setMessageContent("");
    }
  };

  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditContent(currentContent);
  };

  const handleSaveEdit = (e, messageId) => {
    e.preventDefault();
    if (!editContent.trim()) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Edited message cannot be empty",
          type: "error",
        },
      ]);
      return;
    }
    editMessage(String(messageId), editContent);
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDeleteMessage = (messageId) => {
    if (confirm("Are you sure you want to delete this message?")) {
      setIsDeleting(messageId);
      deleteMessage(String(messageId));
      setIsDeleting(null);
    }
  };

  const handleInputChange = (e) => {
    setMessageContent(e.target.value);
    if (error) clearError();
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Room name is required",
          type: "error",
        },
      ]);
      return;
    }
    if (selectedUsers.length === 0) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Select at least one user for the room",
          type: "error",
        },
      ]);
      return;
    }
    const userIds = selectedUsers.map((u) => u.userId);
    createRoom(roomName, userIds);
    setRoomName("");
    clearSelectedUsers();
    setShowCreateRoom(false);
    setSearchUsers("");
  };

  const handleJoinRoom = (roomId) => {
    joinRoom(roomId);
  };

  const handleLeaveRoom = (roomId) => {
    if (confirm("Are you sure you want to leave this room?")) {
      setLeavingRoomId(roomId);
      leaveRoom(roomId);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "You have left the room",
          type: "success",
        },
      ]);
      setTimeout(() => setLeavingRoomId(null), 1000);
      setShowSettingsDropdown(false);
    }
  };

  const handleDeleteRoom = (roomId) => {
    if (
      confirm(
        "Are you sure you want to delete this room? This action cannot be undone."
      )
    ) {
      setDeletingRoomId(roomId);
      deleteRoom(roomId);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "You have deleted the room",
          type: "success",
        },
      ]);
      setTimeout(() => setDeletingRoomId(null), 1000);
      setShowSettingsDropdown(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Selected file:", file.name, file.size, file.type);
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "No file selected for upload",
          type: "error",
        },
      ]);
      return;
    }
    if (!currentRoom) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Please join a room to upload files",
          type: "error",
        },
      ]);
      return;
    }
    if (!(selectedFile instanceof File)) {
      console.error("Invalid file object:", selectedFile);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Invalid file object",
          type: "error",
        },
      ]);
      return;
    }
    console.log(
      "📤 [Uploading file] name:",
      selectedFile.name,
      "size:",
      selectedFile.size,
      "type:",
      selectedFile.type
    );
    try {
      setIsUploading(true);
      await uploadFile(selectedFile, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `File "${selectedFile.name}" uploaded successfully`,
          type: "success",
        },
      ]);
      setSelectedFile(null);
      fileInputRef.current.value = "";
      console.log("File upload completed successfully");
    } catch (error) {
      console.error("File upload error:", error.message, error.response?.data);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Failed to upload file: ${
            error.response?.data?.error || error.message
          }`,
          type: "error",
        },
      ]);
    } finally {
      setIsUploading(false);
      console.log("Upload process finished, isUploading set to false");
    }
  };

  const handleVoiceUpload = async (e) => {
    e.preventDefault();
    if (!recordedAudio) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "No voice recording selected for upload",
          type: "error",
        },
      ]);
      return;
    }
    if (!currentRoom) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Please join a room to upload voice messages",
          type: "error",
        },
      ]);
      return;
    }
    if (!(recordedAudio instanceof File)) {
      console.error("Invalid voice object:", recordedAudio);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: "Invalid voice object",
          type: "error",
        },
      ]);
      return;
    }
    console.log(
      "📤 [Uploading voice] name:",
      recordedAudio.name,
      "size:",
      recordedAudio.size,
      "type:",
      recordedAudio.type
    );
    try {
      setIsUploading(true);
      await uploadVoice(recordedAudio, (progress) => {
        console.log(`Voice upload progress: ${progress}%`);
      });
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Voice message "${recordedAudio.name}" uploaded successfully`,
          type: "success",
        },
      ]);
      setRecordedAudio(null);
      console.log("Voice upload completed successfully");
    } catch (error) {
      console.error("Voice upload error:", error.message, error.response?.data);
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Failed to upload voice: ${
            error.response?.data?.error || error.message
          }`,
          type: "error",
        },
      ]);
    } finally {
      setIsUploading(false);
      console.log("Voice upload process finished, isUploading set to false");
    }
  };

  const handleFileClick = (fileId) => {
    setDownloadingFileId(fileId);
    requestFile(fileId);
    const file = uploadedFiles.find((f) => String(f._id) === String(fileId));
    if (file) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Downloading ${file.file.originalName}...`,
          type: "info",
        },
      ]);
    }
    setTimeout(() => setDownloadingFileId(null), 1000);
  };

  const handleVoiceClick = (voiceId) => {
    setDownloadingVoiceId(voiceId);
    requestVoice(voiceId);
    const voice = uploadedVoices.find((v) => String(v._id) === String(voiceId));
    if (voice) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif-${Date.now()}-${notificationIdCounter++}`,
          message: `Downloading ${voice.voice.originalName}...`,
          type: "info",
        },
      ]);
    }
    setTimeout(() => setDownloadingVoiceId(null), 1000);
  };

  const filteredUsers = companyUsers.filter(
    (u) =>
      u.firstName.toLowerCase().includes(searchUsers.toLowerCase()) ||
      u.position.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const roomMessages = messages.filter(
    (msg) =>
      String(msg.roomId) === String(currentRoom) && !msg.voice && !msg.file
  );

  const roomFiles = uploadedFiles.filter(
    (file) => String(file.roomId) === String(currentRoom)
  );

  const roomVoices = uploadedVoices.filter(
    (voice) => String(voice.roomId) === String(currentRoom)
  );

  const allItems = useMemo(() => {
    const seenIds = new Set();
    const items = [];

    // Add messages (text only)
    roomMessages.forEach((msg) => {
      if (!seenIds.has(String(msg._id))) {
        items.push({
          type: "message",
          id: msg._id,
          userId: msg.userId,
          username: msg.username,
          content: msg.message,
          timestamp: msg.timestamp || Date.now(),
          updatedAt: msg.updatedAt,
        });
        seenIds.add(String(msg._id));
      }
    });

    // Add files
    roomFiles.forEach((file) => {
      if (!seenIds.has(String(file._id))) {
        items.push({
          type: "file",
          id: file._id,
          userId: file.userId,
          username: file.username,
          content: file.message,
          file: file.file,
          timestamp: file.timestamp || Date.now(),
        });
        seenIds.add(String(file._id));
      }
    });

    // Add voices
    roomVoices.forEach((voice) => {
      if (!seenIds.has(String(voice._id))) {
        items.push({
          type: "voice",
          id: voice._id,
          userId: voice.userId,
          username: voice.username,
          content: voice.message,
          voice: voice.voice,
          timestamp: voice.timestamp || Date.now(),
        });
        seenIds.add(String(voice._id));
      }
    });

    return items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [roomMessages, roomFiles, roomVoices]);

  const currentRoomData =
    rooms.find((r) => String(r.roomId) === String(currentRoom)) || {};

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-500 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <p className="text-red-600 text-lg font-medium">
            Please log in to access the chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center">
              <MessageCircle className="mr-2" size={24} />
              Chat Rooms
            </h1>
            <button
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              title="Create new room"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="text-sm opacity-90">Welcome, {user.firstName}</div>
        </div>
        {showCreateRoom && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="text-gray-700">
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} user${
                          selectedUsers.length > 1 ? "s" : ""
                        } selected`
                      : "Select users..."}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform ${
                      showUserDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showUserDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search
                          size={16}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchUsers}
                          onChange={(e) => setSearchUsers(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="p-3 text-gray-500 text-sm text-center">
                          No users found
                        </p>
                      ) : (
                        filteredUsers.map((u) => (
                          <div
                            key={u.userId}
                            className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center transition-colors ${
                              selectedUsers.some(
                                (s) => String(s.userId) === String(u.userId)
                              )
                                ? "bg-blue-100"
                                : ""
                            }`}
                            onClick={() => toggleSelectedUser(u.userId)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.some(
                                (s) => String(s.userId) === String(u.userId)
                              )}
                              onChange={() => toggleSelectedUser(u.userId)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {u.firstName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {u.position}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    Selected users:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.userId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {u.firstName}
                        <button
                          type="button"
                          onClick={() => toggleSelectedUser(u.userId)}
                          className="ml-1 hover:text-blue-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                  disabled={!roomName.trim() || selectedUsers.length === 0}
                >
                  Create Room
                </button>
                <button
                  onClick={() => {
                    setShowCreateRoom(false);
                    setRoomName("");
                    clearSelectedUsers();
                    setSearchUsers("");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Users className="mr-2" size={16} />
              Available Rooms
            </h3>
            <div className="space-y-2">
              <div
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  currentRoom === `company_${user.companyId}`
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => handleJoinRoom(`company_${user.companyId}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      Company Chat
                    </div>
                    <div className="text-xs text-gray-500">
                      General company discussion
                    </div>
                  </div>
                  {currentRoom === `company_${user.companyId}` && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </div>
              {rooms.map((room) => (
                <div
                  key={room.roomId}
                  className={`p-3 rounded-lg transition-all ${
                    currentRoom === room.roomId
                      ? "bg-blue-100 border-l-4 border-blue-500"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleJoinRoom(room.roomId)}
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {room.roomName}
                      </div>
                      <div className="text-xs text-gray-500">Custom room</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentRoom === room.roomId && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      {currentRoom === room.roomId ? (
                        <button
                          onClick={() => handleLeaveRoom(room.roomId)}
                          className={`text-red-500 hover:text-red-700 p-1 ${
                            leavingRoomId === room.roomId
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title="Leave room"
                          disabled={leavingRoomId === room.roomId}
                          aria-label="Leave room"
                        >
                          {leavingRoomId === room.roomId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <LogOut size={14} />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinRoom(room.roomId)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Join room"
                          aria-label="Join room"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No custom rooms yet</p>
                  <p className="text-xs">Create your first room above</p>
                </div>
              )}
            </div>
          </div>
          {onlineUsers.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Online Users
              </h3>
              <div className="space-y-2">
                {onlineUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {u.username}
                      </div>
                      {isTyping[u.userId] && (
                        <div className="text-xs text-gray-500 italic">
                          typing...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {!currentRoom ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Select a Room to Start Chatting
            </h2>
            <p className="text-gray-500">
              Choose a room from the sidebar to begin your conversation
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageCircle className="mr-2" size={20} />
                  {groupName}
                </h2>
                <p className="text-sm text-gray-500">
                  {onlineUsers.length} user
                  {onlineUsers.length !== 1 ? "s" : ""} online
                </p>
              </div>
              <div className="flex items-center space-x-2" ref={settingsRef}>
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Room settings"
                  aria-expanded={showSettingsDropdown}
                >
                  <Settings size={20} />
                </button>
                {showSettingsDropdown && (
                  <div className="absolute top-14 right-4 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-48">
                    {currentRoom !== `company_${user.companyId}` && (
                      <>
                        <button
                          onClick={() => handleLeaveRoom(currentRoom)}
                          className={`w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center ${
                            leavingRoomId === currentRoom
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={leavingRoomId === currentRoom}
                          aria-label="Leave current room"
                        >
                          {leavingRoomId === currentRoom ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                          ) : (
                            <LogOut size={16} className="mr-2" />
                          )}
                          Leave Room
                        </button>
                        {currentRoomData.creator === user.userId && (
                          <button
                            onClick={() => handleDeleteRoom(currentRoom)}
                            className={`w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center ${
                              deletingRoomId === currentRoom
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            disabled={deletingRoomId === currentRoom}
                            aria-label="Delete current room"
                          >
                            {deletingRoomId === currentRoom ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                            ) : (
                              <Trash2 size={16} className="mr-2" />
                            )}
                            Delete Room
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {allItems.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle
                  size={48}
                  className="mx-auto mb-4 text-gray-300"
                />
                <p className="text-gray-500 font-medium">
                  No messages, files, or voice messages yet
                </p>
                <p className="text-gray-400 text-sm">
                  Be the first to say something or upload a file/voice message!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allItems.map((item) =>
                  !item.id || !item.userId ? null : (
                    <div
                      key={`${item.id}-${item.type}`}
                      className={`flex ${
                        String(item.userId) === String(user.userId)
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 shadow-sm ${
                          String(item.userId) === String(user.userId)
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900"
                        } ${
                          isDeleting === item.id || deletingFileId === item.id
                            ? "opacity-50"
                            : ""
                        } transition-all hover:shadow-md`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium mb-1 ${
                                String(item.userId) === String(user.userId)
                                  ? "text-blue-100"
                                  : "text-gray-600"
                              }`}
                            >
                              {item.username || "Anonymous"}
                            </p>
                            {item.type === "message" &&
                            editingMessageId === item.id ? (
                              <form
                                onSubmit={(e) => handleSaveEdit(e, item.id)}
                                className="space-y-2"
                              >
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  className="w-full p-2 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Edit your message..."
                                  autoFocus
                                />
                                <div className="flex space-x-2">
                                  <button
                                    type="submit"
                                    className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:bg-green-300"
                                    disabled={!editContent.trim()}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="bg-gray-400 text-white px-3 py-1 rounded text-xs hover:bg-gray-500"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <p className="text-sm">{item.content}</p>
                                {item.type === "file" && item.file && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <a
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleFileClick(item.id);
                                      }}
                                      className={`text-sm flex items-center space-x-1 ${
                                        String(item.userId) ===
                                        String(user.userId)
                                          ? "text-blue-200 hover:underline"
                                          : "text-blue-600 hover:underline"
                                      }`}
                                    >
                                      <Download size={14} />
                                      <span>
                                        {item.file.originalName} (
                                        {(item.file.size / 1024).toFixed(2)} KB)
                                      </span>
                                    </a>
                                    {downloadingFileId === item.id &&
                                      downloadProgress > 0 && (
                                        <span className="text-xs text-gray-400">
                                          ({downloadProgress}%)
                                        </span>
                                      )}
                                  </div>
                                )}
                                {item.type === "voice" && item.voice && (
                                  <div className="flex flex-col space-y-2 mt-2">
                                    <audio
                                      controls
                                      src={item.voice.url}
                                      className="w-full max-w-xs"
                                    />
                                    <div className="flex items-center space-x-2">
                                      <a
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleVoiceClick(item.id);
                                        }}
                                        className={`text-sm flex items-center space-x-1 ${
                                          String(item.userId) ===
                                          String(user.userId)
                                            ? "text-blue-200 hover:underline"
                                            : "text-blue-600 hover:underline"
                                        }`}
                                      >
                                        <Download size={14} />
                                        <span>
                                          {item?.voice?.originalName ||
                                            "Voice message"}{" "}
                                          (
                                          {(item?.voice?.size / 1024).toFixed(
                                            2
                                          )}{" "}
                                          KB)
                                        </span>
                                      </a>
                                      {downloadingVoiceId === item.id &&
                                        downloadProgress > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({downloadProgress}%)
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            <div
                              className={`text-xs mt-2 ${
                                String(item.userId) === String(user.userId)
                                  ? "text-blue-200"
                                  : "text-gray-400"
                              }`}
                            >
                              {new Date(item.timestamp).toLocaleTimeString()}
                              {item.updatedAt && (
                                <span className="ml-2 italic"> (edited)</span>
                              )}
                            </div>
                          </div>
                          {String(item.userId) === String(user.userId) &&
                            (item.type === "message" ? (
                              editingMessageId !== item.id && (
                                <div className="ml-3 flex space-x-2">
                                  <button
                                    onClick={() =>
                                      handleEditMessage(item.id, item.content)
                                    }
                                    className="text-blue-200 hover:underline text-xs"
                                    disabled={isDeleting === item.id}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(item.id)}
                                    className="text-blue-200 hover:underline text-xs"
                                    disabled={isDeleting === item.id}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="ml-3 flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.type === "file"
                                      ? handleDeleteFile(item.id)
                                      : handleDeleteVoice(item.id)
                                  }
                                  className="text-blue-200 hover:underline text-xs"
                                  disabled={deletingFileId === item.id}
                                >
                                  {deletingFileId === item.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-200"></div>
                                  ) : (
                                    "Delete"
                                  )}
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            {Object.keys(isTyping).length > 0 && (
              <div className="text-sm text-gray-500 italic mt-4 px-4">
                {Object.values(isTyping)
                  .filter((username) => username !== user.firstName)
                  .join(", ")}{" "}
                {Object.values(isTyping).length > 1 ? "are" : "is"} typing...
              </div>
            )}
            {notifications.length > 0 && (
              <div className="fixed top-4 left-4 space-y-2 max-w-md">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-${
                      notification.type === "success"
                        ? "green"
                        : notification.type === "warning"
                        ? "yellow"
                        : notification.type === "error"
                        ? "red"
                        : "blue"
                    }-100 border border-${
                      notification.type === "success"
                        ? "green"
                        : notification.type === "warning"
                        ? "yellow"
                        : notification.type === "error"
                        ? "red"
                        : "blue"
                    }-400 text-${
                      notification.type === "success"
                        ? "green"
                        : notification.type === "warning"
                        ? "yellow"
                        : notification.type === "error"
                        ? "red"
                        : "blue"
                    }-700 px-4 py-3 rounded-lg shadow-lg flex justify-between items-center`}
                  >
                    <span className="text-sm">{notification.message}</span>
                    <button
                      onClick={() =>
                        setNotifications((prev) =>
                          prev.filter((n) => n.id !== notification.id)
                        )
                      }
                      className={`ml-3 text-${
                        notification.type === "success"
                          ? "green"
                          : notification.type === "warning"
                          ? "yellow"
                          : notification.type === "error"
                          ? "red"
                          : "blue"
                      }-500 hover:text-${
                        notification.type === "success"
                          ? "green"
                          : notification.type === "warning"
                          ? "yellow"
                          : notification.type === "error"
                          ? "red"
                          : "blue"
                      }-700 font-bold`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={messageContent}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                disabled={!currentRoom}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={!currentRoom || isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="text-gray-400 hover:text-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!currentRoom || isUploading}
                aria-label="Upload file"
              >
                <Paperclip size={20} />
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`text-gray-400 hover:text-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording ? "text-red-500 hover:text-red-600" : ""
                }`}
                disabled={!currentRoom || isUploading}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
              </button>
              <button
                type="button"
                onClick={handleUploadFile}
                className="bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                disabled={!selectedFile || !currentRoom || isUploading}
              >
                {isUploading && !recordedAudio ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span>Upload File</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleVoiceUpload}
                className="bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                disabled={!recordedAudio || !currentRoom || isUploading}
              >
                {isUploading && recordedAudio ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span>Upload Voice</span>
                )}
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                disabled={!messageContent.trim() || !currentRoom}
              >
                <span>Send</span>
              </button>
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <span>Selected File: {selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    fileInputRef.current.value = "";
                  }}
                  className="ml-2 text-red-500 hover:text-red-700"
                  aria-label="Cancel file selection"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {recordedAudio && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <span>Recorded: {recordedAudio.name}</span>
                <button
                  type="button"
                  onClick={() => setRecordedAudio(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  aria-label="Cancel voice recording"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {isUploading && (
              <div className="mt-2">
                <progress
                  value={uploadProgress}
                  max="100"
                  className="w-full h-2 rounded bg-gray-200"
                />
                <span className="text-xs text-gray-600">
                  {uploadProgress}% (Uploading{" "}
                  {recordedAudio ? "Voice" : "File"})
                </span>
              </div>
            )}
            {downloadProgress > 0 && (
              <div className="mt-2">
                <progress
                  value={downloadProgress}
                  max="100"
                  className="w-full h-2 rounded bg-gray-200"
                />
                <span className="text-xs text-gray-600">
                  Downloading {downloadProgress}% (
                  {downloadingVoiceId ? "Voice" : "File"})
                </span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default GroupChatUI;
