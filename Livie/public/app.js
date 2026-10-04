// ===============================
// LIVIE - LIVE STREAMING APP.JS
// ===============================

const socket = io();

let currentStreamId = null;
let localCameraStream = null;
let localScreenStream = null;
let microphoneEnabled = true;
let cameraEnabled = true;

const currentUser =
    localStorage.getItem("livieUsername") ||
    "Streamer";

// ===============================
// ELEMENTS
// ===============================

const studio = document.getElementById("studio");
const createPanel = document.getElementById("create-panel");
const studioWorkspace = document.getElementById("studio-workspace");

const streamNameInput = document.getElementById("streamName");
const streamGenreInput = document.getElementById("streamGenre");
const streamDescriptionInput = document.getElementById("streamDescription");

const cameraVideo = document.getElementById("camera");
const screenVideo = document.getElementById("screen");

const streamStatus = document.getElementById("stream-status");

const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");

const donationAmount = document.getElementById("donationAmount");
const donationMessage = document.getElementById("donationMessage");

const streamList = document.getElementById("stream-list");


// ===============================
// OPEN STUDIO
// ===============================

window.openStudio = function () {
    if (!studio) return;

    studio.style.display = "block";

    setTimeout(() => {
        studio.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 50);
};


// ===============================
// CREATE STREAM
// ===============================

window.createStream = function () {

    const name = streamNameInput?.value.trim();
    const genre = streamGenreInput?.value.trim();
    const description = streamDescriptionInput?.value.trim();

    if (!name) {
        alert("Please enter a stream name.");
        return;
    }

    socket.emit("create-stream", {
        name: name,
        genre: genre || "General",
        description: description || "",
        username: currentUser
    });

    currentStreamId = socket.id;

    if (createPanel) {
        createPanel.style.display = "none";
    }

    if (studioWorkspace) {
        studioWorkspace.style.display = "block";
    }

    if (streamStatus) {
        streamStatus.textContent = "🔴 LIVE";
    }

    if (studio) {
        studio.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
};


// ===============================
// STREAM UPDATES
// ===============================

socket.on("streams-update", function (streams) {

    if (!streamList) return;

    streamList.innerHTML = "";

    if (!streams || streams.length === 0) {

        streamList.innerHTML = `
            <div class="stream-card">
                <div class="stream-info">
                    <h3>No streams are live right now.</h3>
                    <p>Be the first person to start streaming!</p>
                </div>

                <button class="watch-button"
                        onclick="openStudio()">
                    🎥 Start Streaming
                </button>
            </div>
        `;

        return;
    }

    streams.forEach(function (stream) {

        const card = document.createElement("div");
        card.className = "stream-card";

        const isMyStream =
            stream.ownerId === socket.id ||
            stream.id === socket.id;

        card.innerHTML = `
            <div class="stream-info">

                <div class="live-badge">
                    🔴 LIVE
                </div>

                <h3>${escapeHTML(stream.name)}</h3>

                <p>
                    🎮 ${escapeHTML(stream.genre || "General")}
                </p>

                <p>
                    ${escapeHTML(stream.description || "")}
                </p>

                <small>
                    👁️ ${stream.viewers || 0} viewers
                </small>

                ${
                    isMyStream
                        ? `<strong class="own-stream-label">
                            🎥 Your Stream
                           </strong>`
                        : ""
                }

            </div>

            ${
                !isMyStream
                    ? `
                        <button
                            class="watch-button"
                            onclick="joinStream('${stream.id}')">
                            ▶️ Watch Stream
                        </button>
                      `
                    : ""
            }
        `;

        streamList.appendChild(card);
    });
});


// ===============================
// JOIN STREAM
// ===============================

window.joinStream = function (streamId) {

    if (!streamId) return;

    currentStreamId = streamId;

    socket.emit("join-stream", streamId);

    alert("You joined the stream!");

    openStudio();
};


// ===============================
// CAMERA
// ===============================

window.startCamera = async function () {

    try {

        if (localCameraStream) {
            localCameraStream.getTracks().forEach(track => {
                track.stop();
            });
        }

        localCameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        if (cameraVideo) {

            cameraVideo.srcObject =
                localCameraStream;

            cameraVideo.muted = true;

            cameraVideo.play().catch(() => {});
        }

        microphoneEnabled = true;
        cameraEnabled = true;

        updateCameraButton();
        updateMicrophoneButton();

    } catch (error) {

        console.error("Camera error:", error);

        alert(
            "Could not access your camera/microphone.\n\n" +
            "Make sure your browser has permission to use them."
        );
    }
};


// ===============================
// SCREEN SHARE
// ===============================

window.shareScreen = async function () {

    try {

        if (localScreenStream) {
            localScreenStream.getTracks().forEach(track => {
                track.stop();
            });
        }

        localScreenStream =
            await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

        if (screenVideo) {

            screenVideo.srcObject =
                localScreenStream;

            screenVideo.muted = true;

            screenVideo.play().catch(() => {});
        }

        const videoTrack =
            localScreenStream.getVideoTracks()[0];

        if (videoTrack) {

            videoTrack.onended = function () {

                if (screenVideo) {
                    screenVideo.srcObject = null;
                }

                localScreenStream = null;
            };
        }

    } catch (error) {

        console.error("Screen share error:", error);

        if (error.name !== "NotAllowedError") {
            alert("Could not share your screen.");
        }
    }
};


// ===============================
// MICROPHONE
// ===============================

window.toggleMicrophone = function () {

    if (!localCameraStream) {
        alert("Start your camera first.");
        return;
    }

    const audioTracks =
        localCameraStream.getAudioTracks();

    if (audioTracks.length === 0) {
        alert("No microphone was found.");
        return;
    }

    microphoneEnabled =
        !microphoneEnabled;

    audioTracks.forEach(track => {
        track.enabled =
            microphoneEnabled;
    });

    updateMicrophoneButton();
};


function updateMicrophoneButton() {

    const buttons =
        document.querySelectorAll(
            '[onclick="toggleMicrophone()"]'
        );

    buttons.forEach(button => {

        button.textContent =
            microphoneEnabled
                ? "🎤 Mic On"
                : "🔇 Mic Off";
    });
}


// ===============================
// CAMERA TOGGLE
// ===============================

window.toggleCamera = function () {

    if (!localCameraStream) {
        alert("Start your camera first.");
        return;
    }

    const videoTracks =
        localCameraStream.getVideoTracks();

    if (videoTracks.length === 0) {
        return;
    }

    cameraEnabled =
        !cameraEnabled;

    videoTracks.forEach(track => {
        track.enabled =
            cameraEnabled;
    });

    updateCameraButton();
};


function updateCameraButton() {

    const buttons =
        document.querySelectorAll(
            '[onclick="toggleCamera()"]'
        );

    buttons.forEach(button => {

        button.textContent =
            cameraEnabled
                ? "📷 Camera On"
                : "🚫 Camera Off";
    });
}


// ===============================
// SEND CHAT MESSAGE
// ===============================

window.sendMessage = function () {

    if (!messageInput) return;

    const message =
        messageInput.value.trim();

    if (!message) return;

    socket.emit("chat-message", {
        streamId: currentStreamId,
        username: currentUser,
        message: message
    });

    messageInput.value = "";
};


// ENTER TO SEND CHAT
if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                window.sendMessage();
            }
        }
    );
}


// ===============================
// RECEIVE CHAT
// ===============================

socket.on("chat-message", function (data) {

    if (!chatMessages) return;

    const messageElement =
        document.createElement("div");

    messageElement.className =
        "chat-message";

    messageElement.innerHTML = `
        <strong>
            ${escapeHTML(data.username || "User")}:
        </strong>

        ${escapeHTML(data.message || "")}
    `;

    chatMessages.appendChild(
        messageElement
    );

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
});


// ===============================
// DONATION
// ===============================

window.donate = function () {

    if (!currentStreamId) {
        alert("There is no active stream.");
        return;
    }

    const amount =
        Number(donationAmount?.value);

    const message =
        donationMessage?.value.trim() || "";

    if (!amount || amount <= 0) {
        alert("Enter a valid donation amount.");
        return;
    }

    socket.emit("donation", {

        streamId: currentStreamId,

        username: currentUser,

        amount: amount,

        message: message
    });

    if (donationAmount) {
        donationAmount.value = "";
    }

    if (donationMessage) {
        donationMessage.value = "";
    }
};


// ===============================
// DONATION ALERT
// ===============================

socket.on("donation-alert", function (data) {

    const alertBox =
        document.getElementById(
            "donation-alert"
        );

    if (!alertBox) return;

    alertBox.innerHTML = `
        <div class="donation-alert-content">

            <strong>
                💰 ${escapeHTML(
                    data.username || "Someone"
                )}
            </strong>

            donated
            <strong>
                €${Number(data.amount || 0).toFixed(2)}
            </strong>

            ${
                data.message
                    ? `<p>
                        ${escapeHTML(data.message)}
                       </p>`
                    : ""
            }

        </div>
    `;

    alertBox.style.display = "block";

    setTimeout(function () {

        alertBox.style.display = "none";

    }, 5000);
});


// ===============================
// KICK VIEWER
// ===============================

window.kickViewer = function (userId) {

    if (!currentStreamId) {
        return;
    }

    socket.emit("kick-user", {

        streamId: currentStreamId,

        userId: userId
    });
};


// ===============================
// KICKED
// ===============================

socket.on("kicked", function () {

    alert(
        "You have been removed from the stream."
    );

    currentStreamId = null;

    if (localCameraStream) {

        localCameraStream
            .getTracks()
            .forEach(track => track.stop());

        localCameraStream = null;
    }

    if (localScreenStream) {

        localScreenStream
            .getTracks()
            .forEach(track => track.stop());

        localScreenStream = null;
    }

    window.location.reload();
});


// ===============================
// STREAM ENDED
// ===============================

socket.on("stream-ended", function () {

    alert("The stream has ended.");

    currentStreamId = null;

    if (localCameraStream) {

        localCameraStream
            .getTracks()
            .forEach(track => track.stop());

        localCameraStream = null;
    }

    if (localScreenStream) {

        localScreenStream
            .getTracks()
            .forEach(track => track.stop());

        localScreenStream = null;
    }

    window.location.reload();
});


// ===============================
// STOP STREAMING
// ===============================

window.stopStreaming = function () {

    const confirmed =
        confirm(
            "Are you sure you want to end your stream?"
        );

    if (!confirmed) {
        return;
    }

    if (localCameraStream) {

        localCameraStream
            .getTracks()
            .forEach(track => track.stop());

        localCameraStream = null;
    }

    if (localScreenStream) {

        localScreenStream
            .getTracks()
            .forEach(track => track.stop());

        localScreenStream = null;
    }

    if (currentStreamId) {

        socket.emit(
            "end-stream",
            currentStreamId
        );
    }

    currentStreamId = null;

    socket.disconnect();

    setTimeout(function () {
        window.location.reload();
    }, 300);
};


// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


// ===============================
// PAGE CLEANUP
// ===============================

window.addEventListener(
    "beforeunload",
    function () {

        if (localCameraStream) {

            localCameraStream
                .getTracks()
                .forEach(track => track.stop());
        }

        if (localScreenStream) {

            localScreenStream
                .getTracks()
                .forEach(track => track.stop());
        }
    }
);


// ===============================
// INITIAL UI
// ===============================

if (studio) {
    studio.style.display = "none";
}

if (studioWorkspace) {
    studioWorkspace.style.display = "none";
}

if (createPanel) {
    createPanel.style.display = "block";
}


// ===============================
// READY
// ===============================

console.log(
    "🎥 Livie streaming app loaded successfully."
);