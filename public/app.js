// =====================================================
// LIVIE - LIVE STREAMING CORE COMMUNICATIONS FRAMEWORK
// =====================================================
const socket = io();

let currentStreamId = null;
let localCameraStream = null;
let localScreenStream = null;
let microphoneEnabled = true;
let cameraEnabled = true;

const currentUser = "User-" + Math.floor(Math.random() * 9000 + 1000);

// Elements Selector Mapping Handles
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
// RUNTIME VIEW LAYOUT UI NAVIGATION MANAGERS
// =====================================================
window.openStudio = function () {
    if (!studio) return;
    studio.style.display = "block";
    setTimeout(() => {
        studio.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
};

// =====================================================
// INITIALIZE PIPELINE CREATION ROUTE
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

    if (createPanel) createPanel.style.display = "none";
    if (studioWorkspace) studioWorkspace.style.display = "grid";
    if (streamStatus) {
        streamStatus.textContent = "● LIVE";
        streamStatus.style.color = "#ef4444";
    }
    if (studio) studio.scrollIntoView({ behavior: "smooth", block: "start" });
};

// =====================================================
// INCOMING DIRECTORY WORKSPACE TREE SYNCS
// =====================================================
socket.on("streams-update", function (streams) {
    if (!streamList) return;
    streamList.innerHTML = "";

    if (!streams || streams.length === 0) {
        streamList.innerHTML = `
            <div class="stream-card" style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
                <div class="stream-info">
                    <h3>No streams are live right now.</h3>
                    <p style="color: #64748b;">Be the first person to start streaming!</p>
                </div>
                <button class="watch-button" style="width: auto; display: inline-block; padding: 10px 24px;" onclick="openStudio()">🎥 Start Streaming</button>
            </div>`;
        return;
    }

    streams.forEach(function (stream) {
        const card = document.createElement("div");
        card.className = "stream-card";

        const isMyStream = stream.id === socket.id;

        card.innerHTML = `
            <div class="stream-info">
                <div class="live-badge">🔴 LIVE</div>
                <h3>${escapeHTML(stream.name)}</h3>
                <p style="color: #818cf8; font-size: 13px; font-weight: bold; margin: 4px 0;">🎮 ${escapeHTML(stream.genre)}</p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0;">${escapeHTML(stream.description || "No context description supplied.")}</p>
                <small style="color: #64748b;">👁️ ${stream.viewers} watching</small>
                ${isMyStream ? `<br><strong style="color: #818cf8; font-size: 12px; margin-top: 8px; display: inline-block;">🎥 Active Broadcast Monitor Monitor</strong>` : ""}
            </div>
            ${!isMyStream ? `<button class="watch-button" onclick="joinStream('${stream.id}')">▶️ Watch Stream</button>` : ""}
        `;
        streamList.appendChild(card);
    });
});

// =====================================================
// CHANNEL SPEC ROOM ATTACH CONNECTORS
// =====================================================
window.joinStream = function (streamId) {
    if (!streamId) return;
    currentStreamId = streamId;

    socket.emit("join-stream", streamId);
    
    if (createPanel) createPanel.style.display = "none";
    if (studioWorkspace) studioWorkspace.style.display = "grid";
    if (streamStatus) {
        streamStatus.textContent = "● SPECTATING MODE BUFFER";
        streamStatus.style.color = "#3b82f6";
    }
    
    openStudio();
};

// =====================================================
// AUDIO AND VIDEO CAPTURE MEDIA REGISTRY PIPES
// =====================================================
window.startCamera = async function () {
    try {
        if (localCameraStream) {
            localCameraStream.getTracks().forEach(track => track.stop());
        }

        localCameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (cameraVideo) {
            cameraVideo.srcObject = localCameraStream;
            cameraVideo.muted = true;
            cameraVideo.play().catch(() => {});
        }

        microphoneEnabled = true;
        cameraEnabled = true;
        updateCameraButton();
        updateMicrophoneButton();
    } catch (error) {
        console.error("Hardware AV activation fault:", error);
        alert("Could not access your hardware peripheral stream pipelines. Verify SSL / system level workspace permission rules.");
    }
};

window.shareScreen = async function () {
    try {
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(track => track.stop());
        }

        localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        if (screenVideo) {
            screenVideo.srcObject = localScreenStream;
            screenVideo.muted = true;
            screenVideo.play().catch(() => {});
        }

        const videoTrack = localScreenStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = function () {
                if (screenVideo) screenVideo.srcObject = null;
                localScreenStream = null;
            };
        }
    } catch (error) {
        console.error("Display capture error loop:", error);
    }
};

window.toggleMicrophone = function () {
    if (!localCameraStream) return alert("Initialize webcam input pipeline stream track instances first.");
    const audioTracks = localCameraStream.getAudioTracks();
    if (audioTracks.length === 0) return alert("Hardware descriptor report: No primary audio capturing track detected.");

    microphoneEnabled = !microphoneEnabled;
    audioTracks.forEach(track => track.enabled = microphoneEnabled);
    updateMicrophoneButton();
};

window.toggleCamera = function () {
    if (!localCameraStream) return alert("Initialize webcam hardware inputs components first.");
    const videoTracks = localCameraStream.getVideoTracks();
    if (videoTracks.length === 0) return alert("Hardware missing: No core video track node found.");

    cameraEnabled = !cameraEnabled;
    videoTracks.forEach(track => track.enabled = cameraEnabled);
    updateCameraButton();
};

function updateMicrophoneButton() {
    document.querySelectorAll('[onclick="toggleMicrophone()"]').forEach(btn => {
        btn.textContent = microphoneEnabled ? "🎤 Mic On" : "🔇 Mic Off";
    });
}

function updateCameraButton() {
    document.querySelectorAll('[onclick="toggleCamera()"]').forEach(btn => {
        btn.textContent = cameraEnabled ? "📹 Camera On" : "🚫 Camera Off";
    });
}

// =====================================================
// TEXT CORRESPONDENCE HUB RELAYS MANAGER
// =====================================================
window.sendMessage = function () {
    if (!messageInput) return;
    const msg = messageInput.value.trim();
    if (!msg) return;

    if (!currentStreamId) return alert("Join or create an open operational pipeline channel stream session first.");

    socket.emit("chat-message", {
        streamId: currentStreamId,
        username: currentUser,
        message: msg
    });
    messageInput.value = "";
};

if (messageInput) {
    messageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.sendMessage();
    });
}

socket.on("chat-message", function (data) {
    appendChatLog(`<strong>${escapeHTML(data.username)}:</strong> ${escapeHTML(data.message)}`);
});

// =====================================================
// INTERACTIVE REWARDS OVERLAYS TRANSACTIONS STACKS
// =====================================================
window.submitDonation = function () {
    if (!donationAmount) return;
    const amount = Number(donationAmount.value);
    const msg = donationMessage ? donationMessage.value.trim() : "";

    if (!currentStreamId) return alert("Must connect into an operational channel pipeline room before gifting credits.");
    if (!amount || amount <= 0 || !Number.isFinite(amount)) return alert("Specify valid financial tracking transaction input data quantiles.");

    socket.emit("donation", {
        streamId: currentStreamId,
        username: currentUser,
        amount: amount,
        message: msg
    });

    donationAmount.value = "";
if (donationMessage) donationMessage.value = "";
};
socket.on("donation-alert", function (data) {
const body = <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 12px; border-radius: 10px; margin: 6px 0; color: white; font-weight: bold; text-align: center; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.25);"> 💎 DONATION RECEIVED 💎<br> <span style="color: #fef08a; font-size: 15px;">${escapeHTML(data.username)} gifted ${data.amount} credits!</span> ${data.message ?
"${escapeHTML(data.message)}" : ''} </div>;
appendChatLog(body);
});
// =====================================================
// UTILITY SANITIZERS
// =====================================================
function appendChatLog(html) {
if (!chatMessages) return;
const d = document.createElement("div");
d.style.marginBottom = "6px";
d.innerHTML = html;
chatMessages.appendChild(d);
chatMessages.scrollTop = chatMessages.scrollHeight;
}
function escapeHTML(s) {
if (!s) return "";
return s.replace(/[&<>'"]/g, t => ({ '&': '&', '<': '<', '>': '>', "'": ''', '"': '"' }[t] || t));
}
socket.on("kicked", () => {
alert("You have been administrative severed from this session room.");
window.location.reload();
});
