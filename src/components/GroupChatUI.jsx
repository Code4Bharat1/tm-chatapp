"use client";
import { useMessageStore } from "@/store/chat.store.js";
import {
  ChevronDown,
  ChevronUp,
  Download,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Settings,
  StopCircle,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import FloatingButtons from "./FloatingButtons"; // Adjust the import path as needed

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
    rooms,
    currentRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    setTyping,
    initializeSocket,
    fetchUser,
    fetchCompanyUsers,
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
    loadToken,
    setToken,
  } = useMessageStore();

  const [messageContent, setMessageContent] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isDeleting, setIsDeleting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leavingRoomId, setLeavingRoomId] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [downloadingVoiceId, setDownloadingVoiceId] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);

  // Mobile responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState(null);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  const settingsRef = useRef(null);
  const messageActionsRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);

  // Mobile detection and resize handler
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(false);
      }
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && showSidebar) {
        setShowSidebar(false);
      }
    };

    if (isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMobile, showSidebar]);

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    const setup = async () => {
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
    if (error) {
      toast.dismiss(`error-${notificationIdCounter}`);
      toast.error(error, { id: `error-${++notificationIdCounter}` });
      const timer = setTimeout(() => clearError(), 3600);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (downloadError) {
      toast.dismiss(`download-error-${notificationIdCounter}`);
      toast.error(downloadError, { id: `download-error-${++notificationIdCounter}` });
    }
  }, [downloadError]);

  // Enhanced click outside handler for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
      if (messageActionsRef.current && !messageActionsRef.current.contains(event.target)) {
        setShowMessageActions(null);
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
    } catch (error) {
      console.error("Error starting recording:", error.message);
      toast.dismiss(`recording-error-${notificationIdCounter}`);
      toast.error(`Failed to start recording: ${error.message}`, {
        id: `recording-error-${++notificationIdCounter}`,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const confirmWithToast = (message, onConfirm) => {
    return new Promise((resolve) => {
      toast.dismiss(`confirm-${notificationIdCounter}`);
      toast(
        (t) => (
          <div className="flex flex-col space-y-3">
            <span className="text-sm font-medium">{message}</span>
            <div className="flex space-x-2 justify-center">
              <button
                onClick={() => {
                  onConfirm();
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        {
          id: `confirm-${++notificationIdCounter}`,
          duration: Infinity,
          style: {
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#b91c1c",
            minWidth: "300px",
            maxWidth: "400px",
            padding: "16px",
            borderRadius: "8px",
          },
        }
      );
    });
  };

  const handleDeleteFile = async (fileId) => {
    const confirmed = await confirmWithToast("Are you sure you want to delete this file?", () => {
      setDeletingFileId(fileId);
      deleteFile(String(fileId));
      toast.dismiss(`delete-file-${notificationIdCounter}`);
      toast.success("File deleted successfully", {
        id: `delete-file-${++notificationIdCounter}`,
      });
      setTimeout(() => setDeletingFileId(null), 1000);
    });
    if (!confirmed) return;
  };

  const handleDeleteVoice = async (voiceId) => {
    const confirmed = await confirmWithToast("Are you sure you want to delete this voice message?", () => {
      setDeletingFileId(voiceId);
      deleteVoice(String(voiceId));
      toast.dismiss(`delete-voice-${notificationIdCounter}`);
      toast.success("Voice message deleted successfully", {
        id: `delete-voice-${++notificationIdCounter}`,
      });
      setTimeout(() => setDeletingFileId(null), 1000);
    });
    if (!confirmed) return;
  };

  const handleUnifiedSend = async (e) => {
    e.preventDefault();
    if (!currentRoom) {
      toast.dismiss(`no-room-${notificationIdCounter}`);
      toast.error("Please join a room to send messages or files", {
        id: `no-room-${++notificationIdCounter}`,
      });
      return;
    }

    try {
      setIsUploading(true);

      if (recordedAudio) {
        if (!(recordedAudio instanceof File)) {
          console.error("Invalid voice object:", recordedAudio);
          toast.dismiss(`invalid-voice-${notificationIdCounter}`);
          toast.error("Invalid voice object", {
            id: `invalid-voice-${++notificationIdCounter}`,
          });
          return;
        }
        await uploadVoice(recordedAudio, (progress) => { });
        toast.dismiss(`voice-upload-${notificationIdCounter}`);
        toast.success(`Voice message "${recordedAudio.name}" uploaded successfully`, {
          id: `voice-upload-${++notificationIdCounter}`,
        });
        setRecordedAudio(null);
      }

      if (selectedFile) {
        if (!(selectedFile instanceof File)) {
          console.error("Invalid file object:", selectedFile);
          toast.dismiss(`invalid-file-${notificationIdCounter}`);
          toast.error("Invalid file object", {
            id: `invalid-file-${++notificationIdCounter}`,
          });
          return;
        }
        await uploadFile(selectedFile, (progress) => { });
        toast.dismiss(`file-upload-${notificationIdCounter}`);
        toast.success(`File "${selectedFile.name}" uploaded successfully`, {
          id: `file-upload-${++notificationIdCounter}`,
        });
        setSelectedFile(null);
        fileInputRef.current.value = "";
      }

      if (messageContent.trim()) {
        sendMessage(messageContent);
        setMessageContent("");
      }
    } catch (error) {
      console.error("Unified send error:", error.message, error.response?.data);
      toast.dismiss(`send-error-${notificationIdCounter}`);
      toast.error(`Failed to send: ${error.response?.data?.error || error.message}`, {
        id: `send-error-${++notificationIdCounter}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditContent(currentContent);
    setShowMessageActions(null);
  };

  const handleSaveEdit = (e, messageId) => {
    e.preventDefault();
    if (!editContent.trim()) {
      toast.dismiss(`empty-edit-${notificationIdCounter}`);
      toast.error("Edited message cannot be empty", {
        id: `empty-edit-${++notificationIdCounter}`,
      });
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

  const handleDeleteMessage = async (messageId) => {
    const confirmed = await confirmWithToast("Are you sure you want to delete this message?", () => {
      setIsDeleting(messageId);
      deleteMessage(String(messageId));
      setIsDeleting(null);
      setShowMessageActions(null);
      toast.dismiss(`delete-message-${notificationIdCounter}`);
      toast.success("Message deleted successfully", {
        id: `delete-message-${++notificationIdCounter}`,
      });
    });
    if (!confirmed) return;
  };

  const handleInputChange = (e) => {
    setMessageContent(e.target.value);
    if (error) clearError();
  };

  const handleJoinRoom = (roomId) => {
    joinRoom(roomId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleLeaveRoom = async (roomId) => {
    const confirmed = await confirmWithToast("Are you sure you want to leave this room?", () => {
      setLeavingRoomId(roomId);
      leaveRoom(roomId);
      toast.dismiss(`leave-room-${notificationIdCounter}`);
      toast.success("You have left the room", {
        id: `leave-room-${++notificationIdCounter}`,
      });
      setTimeout(() => setLeavingRoomId(null), 1000);
      setShowSettingsDropdown(false);
    });
    if (!confirmed) return;
  };

  const handleDeleteRoom = async (roomId) => {
    const confirmed = await confirmWithToast(
      "Are you sure you want to delete this room? This action cannot be undone.",
      () => {
        setDeletingRoomId(roomId);
        deleteRoom(roomId);
        toast.dismiss(`delete-room-${notificationIdCounter}`);
        toast.success("You have deleted the room", {
          id: `delete-room-${++notificationIdCounter}`,
        });
        setTimeout(() => setDeletingRoomId(null), 1000);
        setShowSettingsDropdown(false);
      }
    );
    if (!confirmed) return;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileClick = (fileId) => {
    setDownloadingFileId(fileId);
    requestFile(fileId);
    const file = uploadedFiles.find((f) => String(f._id) === String(fileId));
    if (file) {
      toast.dismiss(`download-file-${notificationIdCounter}`);
      toast(`Downloading ${file.file.originalName}...`, {
        id: `download-file-${++notificationIdCounter}`,
      });
    }
    setTimeout(() => setDownloadingFileId(null), 1000);
  };

  const handleVoiceClick = (voiceId) => {
    setDownloadingVoiceId(voiceId);
    requestVoice(voiceId);
    const voice = uploadedVoices.find((v) => String(v._id) === String(voiceId));
    if (voice) {
      toast.dismiss(`download-voice-${notificationIdCounter}`);
      toast(`Downloading ${voice.voice.originalName}...`, {
        id: `download-voice-${++notificationIdCounter}`,
      });
    }
    setTimeout(() => setDownloadingVoiceId(null), 1000);
  };

  const allItems = useMemo(() => {
    return messages
      .filter((item) => String(item.roomId) === String(currentRoom))
      .filter((item) => {
        if (item.userId === "system" || item.username === "System") return false;
        const systemUploadMessages = [
          "voice message uploaded",
          "file uploaded",
          "voice uploaded",
          "file message uploaded",
        ];
        if (item.message && !item.file && !item.voice) {
          const messageText = item.message.trim().toLowerCase();
          return !systemUploadMessages.some((sysMsg) =>
            messageText.includes(sysMsg)
          );
        }
        return true;
      })
      .map((item) => ({
        type: item.file ? "file" : item.voice ? "voice" : "message",
        id: item._id,
        userId: item.userId,
        username: item.username,
        content: item.message,
        timestamp: item.timestamp || Date.now(),
        updatedAt: item.updatedAt,
        ...(item.file && { file: item.file }),
        ...(item.voice && { voice: item.voice }),
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages, currentRoom]);

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 px-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
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
    <div className="flex h-screen bg-gray-50 relative">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Mobile Sidebar Overlay */}
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`${isMobile
          ? `fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`
          : "w-80 bg-white border-r border-gray-200 shadow-lg"
          } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg sm:text-xl font-bold flex items-center">
              <MessageCircle className="mr-2" size={isMobile ? 20 : 24} />
              Chat Rooms
            </h1>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Close sidebar"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="text-sm opacity-90">Welcome, {user.firstName}</div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Users className="mr-2" size={16} />
              Available Rooms
            </h3>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.roomId}
                  className={`p-3 rounded-lg transition-all ${currentRoom === room.roomId
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : "bg-gray-50 hover:bg-gray-100"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => handleJoinRoom(room.roomId)}
                    >
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {room.roomName}
                      </div>
                      <div className="text-xs text-gray-500">Custom room</div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      {currentRoom === room.roomId && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      {currentRoom === room.roomId && (
                        <button
                          onClick={() => handleLeaveRoom(room.roomId)}
                          className={`text-red-500 hover:text-red-700 p-1 ${leavingRoomId === room.roomId ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Leave room"
                          disabled={leavingRoomId === room.roomId}
                        >
                          {leavingRoomId === room.roomId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <LogOut size={14} />
                          )}
                        </button>
                      )}
                      {String(room.createdBy) === String(user.userId) && (
                        <button
                          onClick={() => handleDeleteRoom(room.roomId)}
                          className={`text-red-500 hover:text-red-700 p-1 ${deletingRoomId === room.roomId ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Delete room"
                          disabled={deletingRoomId === room.roomId}
                        >
                          {deletingRoomId === room.roomId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No rooms available</p>
                  <p className="text-xs">Join a room to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Buttons Area */}
        <div className="p-8  border-t border-gray-200 bg-white">
          <FloatingButtons />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Open sidebar"
                >
                  <Menu size={20} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                {currentRoom ? (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {currentRoomData.roomName || groupName || "Chat Room"}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users size={14} className="mr-1" />
                        <span>{onlineUsers.length} online</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-500">
                    Select a room to start chatting
                  </h2>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {currentRoom && (
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => {
                      console.log("Opening settings dropdown", {
                        currentRoomData,
                        userId: user.userId,
                        createdBy: currentRoomData.createdBy,
                        isCreator: String(currentRoomData.createdBy) === String(user.userId),
                      });
                      setShowSettingsDropdown(!showSettingsDropdown);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Room settings"
                  >
                    <Settings size={20} />
                  </button>
                  {showSettingsDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleLeaveRoom(currentRoom)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          disabled={leavingRoomId === currentRoom}
                        >
                          {leavingRoomId === currentRoom ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                          ) : (
                            <LogOut size={16} className="mr-2" />
                          )}
                          Leave Room
                        </button>

                        {/* Add this condition to show Delete Room only for room creator */}
                        <button
                          onClick={() => handleDeleteRoom(currentRoom)}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-b-lg transition-colors flex items-center bg-red-100"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete Room
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Online Users Panel */}
        {showOnlineUsers && currentRoom && (
          <div className="bg-blue-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <Users size={16} className="mr-2" />
                Online Users ({onlineUsers.length})
              </h3>
              <button
                onClick={() => setShowOnlineUsers(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {!currentRoom ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg font-medium">Welcome to the chat!</p>
                <p className="text-gray-400 text-sm">
                  Select a room from the sidebar to start chatting
                </p>
              </div>
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg font-medium">No messages yet</p>
                <p className="text-gray-400 text-sm">
                  Start the conversation by sending a message
                </p>
              </div>
            </div>
          ) : (
            allItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`flex ${item.userId === user.userId ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl relative group ${item.userId === user.userId
                    ? "bg-blue-600 text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl"
                    : "bg-white text-gray-900 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl border border-gray-200"
                    } p-4 shadow-sm`}
                >
                  {/* Message Actions */}
                  {item.userId === user.userId && (
                    <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative" ref={messageActionsRef}>
                        <button
                          onClick={() =>
                            setShowMessageActions(
                              showMessageActions === item.id ? null : item.id
                            )
                          }
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Message options"
                        >
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>
                        {showMessageActions === item.id && (
                          <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              {item.type === "message" && (
                                <button
                                  onClick={() => handleEditMessage(item.id, item.content)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(item.id)}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                disabled={isDeleting === item.id}
                              >
                                {isDeleting === item.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-1 gap-10">
                    <span
                      className={`text-xs font-medium ${item.userId === user.userId ? "text-blue-100" : "text-gray-600"
                        }`}
                    >
                      {item.username}
                    </span>
                    <span
                      className={`text-xs ${item.userId === user.userId ? "text-blue-100" : "text-gray-500"}`}
                    >
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.updatedAt && item.updatedAt !== item.timestamp && (
                        <span className="ml-1 opacity-75">(edited)</span>
                      )}
                    </span>
                  </div>

                  {/* Message Content */}
                  {editingMessageId === item.id ? (
                    <form onSubmit={(e) => handleSaveEdit(e, item.id)} className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        placeholder="Edit your message..."
                      />
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {item.type === "message" && (
                        <p className="text-sm leading-relaxed break-words">{item.content}</p>
                      )}

                      {item.type === "file" && item.file && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Paperclip size={16} />
                            <span className="text-sm font-medium">{item.file.originalName}</span>
                          </div>
                          <div className="text-xs opacity-75">
                            Size: {(item.file.size / 1024).toFixed(1)} KB
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleFileClick(item.id)}
                              className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors ${item.userId === user.userId
                                ? "bg-blue-500 hover:bg-blue-400 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                                } ${downloadingFileId === item.id ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={downloadingFileId === item.id}
                            >
                              {downloadingFileId === item.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ) : (
                                <Download size={12} className="mr-1" />
                              )}
                              Download
                            </button>
                            {item.userId === user.userId && (
                              <button
                                onClick={() => handleDeleteFile(item.id)}
                                className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors bg-red-600 hover:bg-red-700 text-white ${deletingFileId === item.id ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                disabled={deletingFileId === item.id}
                              >
                                {deletingFileId === item.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                ) : (
                                  <Trash2 size={12} className="mr-1" />
                                )}
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {item.type === "voice" && item.voice && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Mic size={16} />
                            <span className="text-sm font-medium">Voice Message</span>
                          </div>
                          <div className="text-xs opacity-75">Duration: {item.voice.originalName}</div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVoiceClick(item.id)}
                              className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors ${item.userId === user.userId
                                ? "bg-blue-500 hover:bg-blue-400 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                                } ${downloadingVoiceId === item.id ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={downloadingVoiceId === item.id}
                            >
                              {downloadingVoiceId === item.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ) : (
                                <Download size={12} className="mr-1" />
                              )}
                              Play/Download
                            </button>
                            {item.userId === user.userId && (
                              <button
                                onClick={() => handleDeleteVoice(item.id)}
                                className={`inline-flex items-center px-3 py-1 text-xs rounded transition-colors bg-red-600 hover:bg-red-700 text-white ${deletingFileId === item.id ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                disabled={deletingFileId === item.id}
                              >
                                {deletingFileId === item.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                ) : (
                                  <Trash2 size={12} className="mr-1" />
                                )}
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {currentRoom && (
          <div className="bg-white border-t border-gray-200 p-4">
            {/* File/Voice Preview */}
            {(selectedFile || recordedAudio) && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    {selectedFile && (
                      <>
                        <Paperclip size={16} className="text-blue-600" />
                        <span className="font-medium text-blue-800 truncate max-w-48">
                          {selectedFile.name}
                        </span>
                        <span className="text-blue-600">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </>
                    )}
                    {recordedAudio && (
                      <>
                        <Mic size={16} className="text-blue-600" />
                        <span className="font-medium text-blue-800">Voice message ready</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setRecordedAudio(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleUnifiedSend} className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={messageContent}
                  onChange={handleInputChange}
                  placeholder={
                    selectedFile || recordedAudio ? "Add a message (optional)..." : "Type your message..."
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows="1"
                  style={{
                    minHeight: "44px",
                    maxHeight: "120px",
                    height: "auto",
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                {/* File Upload */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Attach file"
                  >
                    <Paperclip size={20} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="*/*"
                  />
                </div>

                {/* Voice Recording */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2 rounded-lg transition-colors ${isRecording
                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                    : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                    }`}
                  title={isRecording ? "Stop recording" : "Start voice recording"}
                >
                  {isRecording ? (
                    <StopCircle size={20} className="animate-pulse" />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isUploading || (!messageContent.trim() && !selectedFile && !recordedAudio)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px]"
                  title="Send message"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatUI;