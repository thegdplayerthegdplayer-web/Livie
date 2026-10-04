    // =====================================================
    // GLOBAL NAVIGATION VIEW CONTROLLERS (ATTACHED TO WINDOW)
    // =====================================================
    window.openStudio = function () {
        if (!studio) return;
        studio.style.display = "block";
        setTimeout(() => {
            studio.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    };

    // =====================================================
    // PIPELINE LAUNCH ROUTINE
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
            streamStatus.textContent = "● LIVE BROADCASTING";
            streamStatus.style.color = "#ef4444";
        }
        if (studio) studio.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // =====================================================
    // CHANNEL JOIN CONNECTORS
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
