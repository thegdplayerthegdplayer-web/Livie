const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =====================================================
// ACTIVE STREAMS MEMORY
// =====================================================
let streams = [];

// =====================================================
// SOCKET CONNECTION PIPELINE
// =====================================================
io.on("connection", socket => {
    console.log("User connected:", socket.id);

    // =================================================
    // CREATE STREAM (STREAMER LAUNCH)
    // =================================================
    socket.on("create-stream", data => {
        // Prevent double pipelines for a single connection instance
        const alreadyStreaming = streams.find(stream => stream.ownerId === socket.id);
        if (alreadyStreaming) {
            console.log("User already has an active stream:", socket.id);
            return;
        }

        const stream = {
            id: socket.id,
            ownerId: socket.id,
            username: data.username || "Streamer",
            name: data.name,
            genre: data.genre || "General",
            description: data.description || "",
            viewers: 0
        };

        streams.push(stream);
        socket.join(stream.id);

        // Global broadcast update forces synchronization on all client directories
        io.emit("streams-update", streams);

        console.log(`Stream started: "${data.name}" | Managed by host room socket context: ${socket.id}`);
    });

    // =================================================
    // VIEWER JOINS ROOM STREAM
    // =================================================
    socket.on("join-stream", id => {
        const stream = streams.find(s => s.id === id);
        if (!stream) {
            console.log("Stream target registry ID not found:", id);
            return;
        }

        // Leave any previous stream room if the viewer switches channels
        if (socket.currentRoom && socket.currentRoom !== id) {
            socket.leave(socket.currentRoom);
            const prevStream = streams.find(s => s.id === socket.currentRoom);
            if (prevStream && prevStream.viewers > 0) prevStream.viewers--;
        }

        socket.join(id);
        socket.currentRoom = id; // Log current room state target reference on socket metadata

        // Blind increment only if spectator isn't the origin content owner
        if (stream.ownerId !== socket.id) {
            stream.viewers = (stream.viewers || 0) + 1;
        }

        io.emit("streams-update", streams);
        console.log(`Spectator node ${socket.id} joined live feed channel ${id}`);
    });

    // =================================================
    // CHAT MESSAGE PACKET RELAY
    // =================================================
    socket.on("chat-message", data => {
        if (!data.streamId) return;

        const stream = streams.find(s => s.id === data.streamId);
        if (!stream) return;

        io.to(data.streamId).emit("chat-message", {
            username: data.username || "User",
            message: data.message || ""
        });
    });

    // =================================================
    // DONATION REAL-TIME BROADCAST SYSTEM
    // =================================================
    socket.on("donation", data => {
        if (!data.streamId) return;

        const stream = streams.find(s => s.id === data.streamId);
        if (!stream) return;

        io.to(data.streamId).emit("donation-alert", {
            username: data.username || "User",
            amount: Number(data.amount) || 0,
            message: data.message || ""
        });
    });

    // =================================================
    // ADMINISTRATIVE DISCONNECT / DISMISS
    // =================================================
    socket.on("kick-user", data => {
        const ownedStream = streams.find(stream => stream.ownerId === socket.id);
        if (!ownedStream || !data || !data.userId || data.userId === socket.id) return;

        io.to(data.userId).emit("kicked");
        console.log(`User ${data.userId} kicked from stream ${ownedStream.id}`);
    });

    // =================================================
    // CLEANUP ON HOOK DROP / DISCONNECT
    // =================================================
    socket.on("disconnect", () => {
        const streamIndex = streams.findIndex(s => s.id === socket.id);

        if (streamIndex !== -1) {
            console.log(`Stream pipeline dropped: ${streams[streamIndex].name}`);
            streams.splice(streamIndex, 1);
        } else if (socket.currentRoom) {
            const stream = streams.find(s => s.id === socket.currentRoom);
            if (stream && stream.viewers > 0) {
                stream.viewers--;
            }
        }

        io.emit("streams-update", streams);
        console.log("User connection terminated:", socket.id);
    });
});

// Use Render's environment assigned port dynamically fallback to 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Livie infrastructure system running globally.`);
});
