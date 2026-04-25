import { useState, useRef } from "react";
import apiClient from "../apiConfig";

const MB = 1024 * 1024;
const CHUNK_SIZE = Math.max(6, Number(import.meta.env.VITE_CLOUDINARY_CHUNK_SIZE_MB || 20)) * MB;
const CHUNKED_UPLOAD_THRESHOLD = 20 * MB;

export function useRecording(roomId, displayName, room, state) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const recordingDurationRef = useRef(0);

  const startRecording = async () => {
    try {
      // Try to get the local camera stream first
      let videoStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            frameRate: 30
          },
          audio: false
        });
      } catch (videoError) {
        console.warn("Could not access camera for recording:", videoError);
        // If camera fails, try screen share
        try {
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
        } catch (screenError) {
          console.warn("Could not access screen for recording:", screenError);
          // If both fail, create a blank video stream as fallback
          videoStream = createFallbackVideoStream(roomId);
        }
      }

      // Get audio from microphone with better error handling
      let audioStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          }
        });
      } catch (audioError) {
        console.warn("Could not access microphone:", audioError);
        // Create silent audio track as fallback
        audioStream = await createFallbackAudioStream();
      }

      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      streamRef.current = combinedStream;
      recordedChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recordingDurationRef.current = 0;

      // Try different mime types for compatibility
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };

      // Fallback mime types
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = '';
      }

      mediaRecorderRef.current = new MediaRecorder(combinedStream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        recordingDurationRef.current = recordingStartedAtRef.current
          ? Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
          : 0;
        const blob = new Blob(recordedChunksRef.current, {
          type: mediaRecorderRef.current.mimeType || 'video/webm'
        });
        setRecordedBlob(blob);
        setShowSaveOptions(true);

        // Clean up streams
        videoStream.getTracks().forEach(track => track.stop());
        audioStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setRecording(true);
      return true;
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Recording failed: " + error.message);
      return false;
    }
  };

  const createFallbackVideoStream = (roomId) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');

    const drawFrame = () => {
      context.fillStyle = '#1f2937';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = '48px Arial';
      context.textAlign = 'center';
      context.fillText('Recording Session', canvas.width / 2, canvas.height / 2);
      context.fillText(roomId, canvas.width / 2, canvas.height / 2 + 60);
      context.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 120);
    };

    drawFrame();
    const stream = canvas.captureStream(30);

    // Redraw every second to update time
    setInterval(drawFrame, 1000);

    return stream;
  };

  const createFallbackAudioStream = async () => {
    // Create a silent audio track
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();

    oscillator.frequency.value = 0; // Silent
    oscillator.connect(destination);
    oscillator.start();

    return destination.stream;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const saveToDevice = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `studynest-${roomId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      resetRecording();
    }
  };

  const uploadToCloudinary = async () => {
    if (!recordedBlob) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const signature = await getCloudinarySignature();
      const data = recordedBlob.size >= CHUNKED_UPLOAD_THRESHOLD
        ? await uploadRecordingInChunks(recordedBlob, signature)
        : await uploadRecordingInSingleRequest(recordedBlob, signature);

      if (data.secure_url) {
        await saveRecordingMetadata(data.secure_url, roomId, displayName);
        alert('Recording saved to StudyNest Cloud successfully!');
        window.dispatchEvent(new CustomEvent('studynest:recording-added'));
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      alert(error.message || 'Failed to upload recording. Please try again.');
    } finally {
      setUploading(false);
      resetRecording();
    }
  };

  const getCloudinarySignature = async () => {
    const response = await apiClient.post("cloudinary_signature.php", {
      resource_type: "video",
      folder: "studynest-recordings",
      context: buildCloudinaryContext(),
    });
    const data = response.data;
    if (!data?.ok || !data.upload_url || !data.api_key || !data.signature || !data.params?.timestamp) {
      throw new Error(data?.error || "Cloud recording is not configured.");
    }
    return data;
  };

  const buildCloudinaryContext = () => {
    const safeRoom = String(roomId || "room").replace(/[^a-zA-Z0-9_.:@-]/g, "_").slice(0, 120);
    const safeUser = String(displayName || "Student").replace(/[^a-zA-Z0-9_.:@ -]/g, "_").slice(0, 120);
    return `room=${safeRoom}|user=${safeUser}`;
  };

  const appendCloudinaryParams = (formData, signature) => {
    formData.append("api_key", signature.api_key);
    formData.append("signature", signature.signature);
    Object.entries(signature.params || {}).forEach(([key, value]) => {
      formData.append(key, value);
    });
  };

  const uploadRecordingInSingleRequest = async (blob, signature) => {
    setUploadProgress(5);
    const formData = new FormData();
    formData.append("file", blob, createRecordingFilename());
    appendCloudinaryParams(formData, signature);

    const response = await fetch(signature.upload_url, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || `Cloudinary upload failed (${response.status})`);
    }
    setUploadProgress(100);
    return data;
  };

  const uploadRecordingInChunks = async (blob, signature) => {
    const uploadId =
      (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const total = blob.size;
    const filename = createRecordingFilename();
    let lastResponse = null;

    for (let start = 0; start < total; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, total) - 1;
      const chunk = blob.slice(start, end + 1, blob.type || "video/webm");
      lastResponse = await uploadChunkWithRetry({
        chunk,
        filename,
        signature,
        uploadId,
        contentRange: `bytes ${start}-${end}/${total}`,
      });
      setUploadProgress(Math.max(1, Math.round(((end + 1) / total) * 100)));
    }

    if (!lastResponse?.secure_url) {
      throw new Error(lastResponse?.error?.message || "Cloudinary chunked upload did not return a final video URL.");
    }
    return lastResponse;
  };

  const uploadChunkWithRetry = async ({ chunk, filename, signature, uploadId, contentRange }) => {
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const formData = new FormData();
        formData.append("file", chunk, filename);
        appendCloudinaryParams(formData, signature);

        const response = await fetch(signature.upload_url, {
          method: "POST",
          headers: {
            "X-Unique-Upload-Id": uploadId,
            "Content-Range": contentRange,
          },
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error?.message || `Cloudinary chunk upload failed (${response.status})`);
        }
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
        }
      }
    }

    throw lastError || new Error("Cloudinary chunk upload failed.");
  };

  const createRecordingFilename = () =>
    `studynest-${roomId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;

  const saveRecordingMetadata = async (videoUrl, roomId, userName) => {
    try {
      const roomTitle = room?.title || state?.title || `Room ${roomId}`;

      const response = await apiClient.post("recordings.php", {
        room_id: roomId,
        video_url: videoUrl,
        user_name: userName,
        duration: recordingDurationRef.current,
        recorded_at: new Date().toISOString(),
        title: `Recording of ${roomTitle}`,
        description: `Study session recording from room: ${roomTitle}`,
        course: room?.course || "General",
        semester: "Current",
        kind: "recording",
      });

      if (!response.data || !(response.data.ok || response.data.status === "success")) {
        throw new Error('Failed to save recording metadata');
      }

      return response.data;
    } catch (error) {
      console.error('Error saving recording metadata:', error);
      throw error;
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setShowSaveOptions(false);
    setUploadProgress(0);
    recordingStartedAtRef.current = null;
    recordingDurationRef.current = 0;
    recordedChunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const cancelSave = () => {
    resetRecording();
  };

  return {
    recording,
    recordedBlob,
    showSaveOptions,
    uploading,
    uploadProgress,
    startRecording,
    stopRecording,
    saveToDevice,
    uploadToCloudinary,
    cancelSave,
  };
}
