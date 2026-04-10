
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = process.env.PORT || 3000;

  // Simple in-memory store for groups and messages
  const groups: any[] = [
    {
      id: "global",
      name: "বন্ধুদের সাথে গ্রুপ তৈরি করুন",
      description: "সবার জন্য উন্মুক্ত আড্ডাঘর",
      adminId: "system",
      members: [],
      inviteCode: "mitali-global",
      createdAt: Date.now(),
    }
  ];
  const groupMessages: { [groupId: string]: any[] } = {
    "global": []
  };

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("get_groups", (userId) => {
      const userGroups = groups.filter(g => g.id === "global" || g.members.includes(userId) || g.adminId === userId);
      socket.emit("groups_list", userGroups);
    });

    socket.on("create_group", (data) => {
      const newGroup = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        adminId: data.userId,
        members: [data.userId],
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: Date.now(),
      };
      groups.push(newGroup);
      groupMessages[newGroup.id] = [];
      socket.emit("group_created", newGroup);
      io.emit("new_group_available", newGroup);
      io.emit("groups_updated");
    });

    socket.on("update_group", (data) => {
      const group = groups.find(g => g.id === data.groupId && g.adminId === data.adminId);
      if (group) {
        group.name = data.name || group.name;
        group.description = data.description || group.description;
        group.imageUrl = data.imageUrl || group.imageUrl;
        io.to(data.groupId).emit("group_updated", group);
        io.emit("groups_updated");
      }
    });

    socket.on("join_group_by_code", (data) => {
      const group = groups.find(g => g.inviteCode === data.inviteCode);
      if (group) {
        if (!group.members.includes(data.userId)) {
          group.members.push(data.userId);
        }
        socket.emit("join_success", group);
      } else {
        socket.emit("join_error", "ভুল ইনভাইট কোড!");
      }
    });

    socket.on("join_room", (groupId) => {
      socket.join(groupId);
      socket.emit("initial_messages", groupMessages[groupId] || []);
    });

    socket.on("send_group_message", (data) => {
      const message = {
        id: Date.now().toString(),
        groupId: data.groupId,
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        createdAt: Date.now(),
      };
      
      if (!groupMessages[data.groupId]) groupMessages[data.groupId] = [];
      groupMessages[data.groupId].push(message);
      
      // Keep only last 100 messages per group
      if (groupMessages[data.groupId].length > 100) groupMessages[data.groupId].shift();
      
      io.to(data.groupId).emit("new_group_message", message);
    });

    socket.on("remove_member", (data) => {
      const group = groups.find(g => g.id === data.groupId);
      if (group && group.adminId === data.adminId) {
        group.members = group.members.filter((m: string) => m !== data.memberId);
        io.to(data.groupId).emit("member_removed", { groupId: data.groupId, memberId: data.memberId });
        socket.emit("member_removed_success", { groupId: data.groupId, memberId: data.memberId });
      }
    });

    socket.on("delete_group", (data) => {
      const index = groups.findIndex(g => g.id === data.groupId && g.adminId === data.adminId);
      if (index !== -1) {
        const groupId = groups[index].id;
        groups.splice(index, 1);
        delete groupMessages[groupId];
        io.to(groupId).emit("group_deleted", groupId);
        io.emit("groups_updated");
      }
    });

    socket.on("leave_group", (data) => {
      const group = groups.find(g => g.id === data.groupId);
      if (group) {
        group.members = group.members.filter((m: string) => m !== data.userId);
        io.to(data.groupId).emit("member_removed", { groupId: data.groupId, memberId: data.userId });
        socket.leave(data.groupId);
        socket.emit("left_group_success", data.groupId);
      }
    });

    socket.on("add_member", (data) => {
      const group = groups.find(g => g.id === data.groupId);
      if (group && group.adminId === data.adminId) {
        if (!group.members.includes(data.memberId)) {
          group.members.push(data.memberId);
          io.to(data.groupId).emit("member_added", { groupId: data.groupId, memberId: data.memberId });
          
          // Notify the added user specifically
          io.emit("group_invitation_notification", {
            toUserId: data.memberId,
            fromUserName: data.adminName,
            groupName: group.name,
            groupId: group.id
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
