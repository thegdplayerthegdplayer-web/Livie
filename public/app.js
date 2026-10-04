// =====================================================
// LIVIE - LIVE STREAMING APP.JS (PRODUCTION READY)
// =====================================================

const socket = io();

let currentStreamId = null;
let localCameraStream = null;
let localScreenStream = null;
let microphoneEnabled = true;
let cameraEnabled = true;

const currentUser =
    localStorage.getItem("livieUsername") ||
    "User-" + Math.floor(Math.random() * 9000 + 1000);

// =====================================================
// ELEMENTS
// =====================================================

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


// =====================================================
// OPEN STUDIO
// =====================================================

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


// =====================================================
// CREATE STREAM
// =====================================================

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


// =====================================================
// STREAM DIRECTORY COUPLING UPDATES
// =====================================================

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

                <button class="watch-button" onclick="openStudio()">
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
                        ? `<br><strong class="own-stream-label" style="color: #818cf8; display: inline-block; margin-top: 5px;">
                            🎥 Your Stream (Monitoring Setup Active)
                           </strong>`
                        : ""
                }

            </div>

            ${
                !isMyStream
                    ? `
                        <button class="watch-button" onclick="joinStream('${stream.id}')">
                            ▶️ Watch Stream
                        </button>
                      `
                    : ""
            }
        `;

        streamList.appendChild(card);
    });
});


// =====================================================
// JOIN STREAM
// =====================================================

window.joinStream = function (streamId) {

    if (!streamId) return;

    currentStreamId = streamId;

    socket.emit("join-stream", streamId);

    alert("You joined the stream!");

    openStudio();
};


// =====================================================
// CAMERA
// =====================================================

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


// =====================================================
// SCREEN SHARE
// =====================================================

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


// =====================================================
// MICROPHONE CONTROL
// =====================================================

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


// =====================================================
// CAMERA TOGGLE (COMPLETED)
// =====================================================

window.toggleCamera = function () {

    if (!localCameraStream) {
        alert("Start your camera first.");
        return;
    }

    const videoTracks = localCameraStream.getVideoTracks();

    if (videoTracks.length === 0) {
        alert("No camera device was found.");
        return;
    }

    cameraEnabled = !cameraEnabled;

    videoTracks.forEach(track => {
        track.enabled = cameraEnabled;
    });

    updateCameraButton();
};

function updateCameraButton() {
    const buttons = document.querySelectorAll('[onclick="toggleCamera()"]');
    buttons.forEach(button => {
        button.textContent = cameraEnabled ? "📹 Camera On" : "🚫 Camera Off";
    });
}


// =====================================================
// CHAT COMMUNICATIONS
// =====================================================

window.sendMessage = function () {
    if (!messageInput) return;
    
    const message = messageInput.value.trim();

    if (!message) return;

    if (!currentStreamId) {
        alert("Join or create a livestream before sending a chat.");
        return;
    }

    socket.emit("chat-message", {
        streamId: currentStreamId,
        username: currentUser,
        message: message
    });
messageInput.value = "";
};
// Keybind listener for enter key
if (messageInput) {
messageInput.addEventListener("keydown", function (e) {
if (e.key === "Enter") {
window.sendMessage();
}
});
}
socket.on("chat-message", function (data) {
appendChatLog(<strong>${escapeHTML(data.username)}:</strong> ${escapeHTML(data.message)});
});
// =====================================================
// DONATIONS INTEGRATION
// =====================================================
window.submitDonation = function () {
if (!donationAmount) return;
const amount = Number(donationAmount.value);
const message = donationMessage ? donationMessage.value.trim() : "";
if (!currentStreamId) {
alert("You must be actively monitoring/watching a stream room to execute credits transfers.");
return;
}
if (!amount || amount <= 0 || !Number.isFinite(amount)) {
alert("Please enter a valid credit quantity amount.");
return;
}
socket.emit("donation", {
streamId: currentStreamId,
username: currentUser,
amount: amount,
message: message
});
donationAmount.value = "";
if (donationMessage) donationMessage.value = "";
};
socket.on("donation-alert", function (data) {
const alertBody = <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 12px; border-radius: 8px; margin: 5px 0; color: white; text-align: center; font-weight: bold; border: 1px solid rgba(255,255,255,0.2);"> 💎 DONATION ALERT! 💎<br> <span style="color: #fef08a;">${escapeHTML(data.username)} loaded ${data.amount} credits!</span> ${data.message ?
"${escapeHTML(data.message)}": ''} </div>;
appendChatLog(alertBody);
});
// =====================================================
// SHARED UTILITY SUBSYSTEM RE-ROUTES
// =====================================================
function appendChatLog(htmlContent) {
if (!chatMessages) return;
const wrapper = document.createElement("div");
wrapper.style.marginBottom = "8px";
wrapper.innerHTML = htmlContent;
chatMessages.appendChild(wrapper);
chatMessages.scrollTop = chatMessages.scrollHeight;
}
function escapeHTML(str) {
if (!str) return "";
return str.replace(/[&<>'"]/g,
tag => ({
'&': '&',
'<': '<',
'>': '>',
"'": ''',
'"': '"'
}[tag] || tag)
);
}
socket.on("kicked", () => {
alert("You have been administrative evicted from this channel room.");
window.location.reload();
});
