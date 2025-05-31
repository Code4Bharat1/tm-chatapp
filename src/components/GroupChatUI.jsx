"use client";
import React, { useEffect, useState, useRef } from "react";
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
} from "lucide-react";

const Chat = () => {
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
  const settingsRef = useRef(null);

  useEffect(() => {
    const setup = async () => {
      console.log("Setting up Chat component...");
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
  }, [messages, user, selectedUsers, rooms, currentRoom]);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Handle userLeftRoom and roomDeleted notifications
  useEffect(() => {
    const socket = useMessageStore.getState().socket;
    if (socket) {
      const handleUserLeftRoom = ({ username, roomId, roomName }) => {
        if (String(roomId) === String(currentRoom)) {
          setNotifications((prev) => [
            ...prev,
            {
              id: Date.now(),
              message: `${username} left ${roomName}`,
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
              id: Date.now(),
              message,
              type: message.includes("You have successfully deleted")
                ? "success"
                : "warning",
            },
          ]);
        }
      };
      socket.on("userLeftRoom", handleUserLeftRoom);
      socket.on("roomDeleted", handleRoomDeleted);
      return () => {
        socket.off("userLeftRoom", handleUserLeftRoom);
        socket.off("roomDeleted", handleRoomDeleted);
      };
    }
  }, [currentRoom]);

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      clearError();
      useMessageStore.setState({ error: "Edited message cannot be empty" });
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
      useMessageStore.setState({ error: "Room name is required" });
      return;
    }
    if (selectedUsers.length === 0) {
      useMessageStore.setState({
        error: "Select at least one user for the room",
      });
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
          id: Date.now(),
          message: "You have left the room",
          type: "success",
        },
      ]);
      setTimeout(() => setLeavingRoomId(null), 1000);
      setShowSettingsDropdown(false);
    }
  };

  const handleDeleteRoom = (roomId) => {
    if (confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      setDeletingRoomId(roomId);
      deleteRoom(roomId);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: "You have deleted the room",
          type: "success",
        },
      ]);
      setTimeout(() => setDeletingRoomId(null), 1000);
      setShowSettingsDropdown(false);
    }
  };

  const filteredUsers = companyUsers.filter(
    (u) =>
      u.firstName.toLowerCase().includes(searchUsers.toLowerCase()) ||
      u.position.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const roomMessages = messages.filter(
    (msg) => String(msg.roomId) === String(currentRoom)
  );

  const currentRoomData = rooms.find((r) => String(r.roomId) === String(currentRoom)) || {};

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
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Sidebar Header */}
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

        {/* Create Room Form */}
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

              {/* User Selection Dropdown */}
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

              {/* Selected Users Display */}
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

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Users className="mr-2" size={16} />
              Available Rooms
            </h3>

            <div className="space-y-2">
              {/* Company Chat Room */}
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

              {/* Custom Rooms */}
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
                            leavingRoomId === room.roomId ? "opacity-50 cursor-not-allowed" : ""
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

          {/* Online Users */}
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

      {/* Chat Container */}
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
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageCircle className="mr-2" size={20} />
                  {groupName}
                </h2>
                <p className="text-sm text-gray-500">
                  {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""}{" "}
                  online
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
                            leavingRoomId === currentRoom ? "opacity-50 cursor-not-allowed" : ""
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
                              deletingRoomId === currentRoom ? "opacity-50 cursor-not-allowed" : ""
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

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {roomMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle
                  size={48}
                  className="mx-auto mb-4 text-gray-300"
                />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-gray-400 text-sm">
                  Be the first to say something!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {roomMessages.map((msg) =>
                  !msg._id || !msg.userId ? null : (
                    <div
                      key={msg._id}
                      className={`flex ${
                        String(msg.userId) === String(user.userId)
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 shadow-sm ${
                          String(msg.userId) === String(user.userId)
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900"
                        } ${
                          isDeleting === msg._id ? "opacity-50" : ""
                        } transition-all hover:shadow-md`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium mb-1 ${
                                String(msg.userId) === String(user.userId)
                                  ? "text-blue-100"
                                  : "text-gray-600"
                              }`}
                            >
                              {msg.username || "Anonymous"}
                            </p>
                            {editingMessageId === msg._id ? (
                              <form
                                onSubmit={(e) => handleSaveEdit(e, msg._id)}
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
                              <p className="text-sm">{msg.message}</p>
                            )}
                            <div
                              className={`text-xs mt-2 ${
                                String(msg.userId) === String(user.userId)
                                  ? "text-blue-200"
                                  : "text-gray-400"
                              }`}
                            >
                              {new Date(
                                msg.timestamp || Date.now()
                              ).toLocaleTimeString()}
                              {msg.updatedAt && (
                                <span className="ml-2 italic">(edited)</span>
                              )}
                            </div>
                          </div>
                          {String(msg.userId) === String(user.userId) &&
                            editingMessageId !== msg._id && (
                              <div className="ml-3 flex space-x-2">
                                <button
                                  onClick={() =>
                                    handleEditMessage(msg._id, msg.message)
                                  }
                                  className="text-blue-200 hover:text-white text-xs"
                                  disabled={isDeleting === msg._id}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className="text-blue-200 hover:text-white text-xs"
                                  disabled={isDeleting === msg._id}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Typing Indicator */}
            {Object.keys(isTyping).length > 0 && (
              <div className="text-sm text-gray-500 italic mt-4 px-4">
                {Object.values(isTyping)
                  .filter((username) => username !== user.firstName)
                  .join(", ")}{" "}
                {Object.values(isTyping).length > 1 ? "are" : "is"} typing...
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={clearError}
                    className="ml-3 text-red-500 hover:text-red-700 font-bold"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Notifications */}
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
                        : "blue"
                    }-100 border border-${
                      notification.type === "success"
                        ? "green"
                        : notification.type === "warning"
                        ? "yellow"
                        : "blue"
                    }-400 text-${
                      notification.type === "success"
                        ? "green"
                        : notification.type === "warning"
                        ? "yellow"
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
                          : "blue"
                      }-500 hover:text-${
                        notification.type === "success"
                          ? "green"
                          : notification.type === "warning"
                          ? "yellow"
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

          {/* Message Input */}
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
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                disabled={!messageContent.trim() || !currentRoom}
              >
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chat;