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
        origin: "*"
    }
});


// =====================================================
// ACTIVE STREAMS
// =====================================================

let streams = [];


// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", socket => {

    console.log("User connected:", socket.id);


    // =================================================
    // CREATE STREAM
    // =================================================

    socket.on("create-stream", data => {

        /*
        Prevent the same socket from creating
        multiple livestreams.
        */

        const alreadyStreaming =
            streams.find(
                stream =>
                    stream.ownerId === socket.id
            );

        if (alreadyStreaming) {

            console.log(
                "User already has a stream:",
                socket.id
            );

            return;
        }


        const stream = {

            id: socket.id,

            ownerId: socket.id,

            username:
                data.username ||
                "Streamer",

            name:
                data.name,

            genre:
                data.genre,

            description:
                data.description || "",

            viewers: 0

        };


        streams.push(stream);


        /*
        Put the streamer into their own
        private Socket.IO room.
        */

        socket.join(stream.id);


        /*
        Send updated stream directory
        to everyone.
        */

        io.emit(
            "streams-update",
            streams
        );


        console.log(
            "Stream started:",
            data.name,
            "| Owner:",
            socket.id
        );

    });


    // =================================================
    // VIEWER JOINS STREAM
    // =================================================

    socket.on("join-stream", id => {

        const stream =
            streams.find(
                s => s.id === id
            );


        if (!stream) {

            console.log(
                "Stream not found:",
                id
            );

            return;
        }


        /*
        Don't count the streamer as a viewer.
        */

        if (stream.ownerId === socket.id) {

            socket.join(id);

            return;
        }


        socket.join(id);


        stream.viewers =
            (stream.viewers || 0) + 1;


        io.emit(
            "streams-update",
            streams
        );


        console.log(
            "Viewer joined:",
            socket.id,
            "->",
            id
        );

    });


    // =================================================
    // CHAT
    // =================================================

    socket.on("chat-message", data => {

        if (!data.streamId) {
            return;
        }


        const stream =
            streams.find(
                s => s.id === data.streamId
            );


        if (!stream) {
            return;
        }


        io.to(data.streamId).emit(
            "chat-message",
            {

                username:
                    data.username ||
                    "User",

                message:
                    data.message || ""

            }
        );

    });


    // =================================================
    // DONATION
    // =================================================

    socket.on("donation", data => {

        if (!data.streamId) {
            return;
        }


        const stream =
            streams.find(
                s => s.id === data.streamId
            );


        if (!stream) {
            return;
        }


        io.to(data.streamId).emit(
            "donation-alert",
            {

                username:
                    data.username ||
                    "User",

                amount:
                    Number(data.amount) || 0,

                message:
                    data.message || ""

            }
        );

    });


    // =================================================
    // KICK USER
    // =================================================

    socket.on("kick-user", data => {

        /*
        Find which stream the person sending
        this request owns.
        */

        const ownedStream =
            streams.find(
                stream =>
                    stream.ownerId === socket.id
            );


        /*
        Only the streamer can kick people.
        */

        if (!ownedStream) {

            return;
        }


        if (!data || !data.userId) {

            return;
        }


        /*
        Don't allow the streamer to kick
        themselves.
        */

        if (data.userId === socket.id) {

            return;
        }


        io.to(data.userId).emit(
            "kicked"
        );


        console.log(
            "User kicked:",
            data.userId,
            "from:",
            ownedStream.id
        );

    });


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on("disconnect", () => {

        /*
        Find streams owned by this socket.
        */

        const ownedStreams =
            streams.filter(
                stream =>
                    stream.ownerId === socket.id
            );


        if (ownedStreams.length > 0) {

            ownedStreams.forEach(
                stream => {

                    console.log(
                        "Stream ended:",
                        stream.name
                    );

                }
            );

        }


        /*
        Remove streams owned by this user.
        */

        streams =
            streams.filter(
                stream =>
                    stream.ownerId !== socket.id
            );


        /*
        Update everyone else's stream directory.
        */

        io.emit(
            "streams-update",
            streams
        );


        console.log(
            "User left:",
            socket.id
        );

    });

});


// =====================================================
// START SERVER
// =====================================================

server.listen(
    3000,
    () => {

        console.log(
            "Livie running on http://localhost:3000"
        );

    }
);