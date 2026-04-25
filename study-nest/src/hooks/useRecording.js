import { useState, useRef } from "react";
import apiClient from "../apiConfig";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "doyi7vchh";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "studynest_recordings";

export function useRecording(roomId, displayName, room, state) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);

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
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      alert('Cloud recording is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', recordedBlob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      formData.append('folder', 'studynest-recordings');
      formData.append('context', `room=${roomId}|user=${displayName}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        // Save recording info to your backend
        await saveRecordingMetadata(data.secure_url, roomId, displayName);
        alert('Recording saved to StudyNest Cloud successfully!');
        window.dispatchEvent(new CustomEvent('studynest:recording-added'));
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      alert('Failed to upload recording. Please try again.');
    } finally {
      setUploading(false);
      resetRecording();
    }
  };

  const saveRecordingMetadata = async (videoUrl, roomId, userName) => {
    try {
      const roomTitle = room?.title || state?.title || `Room ${roomId}`;

      const response = await apiClient.post("recordings.php", {
        room_id: roomId,
        video_url: videoUrl,
        user_name: userName,
        duration: Math.floor(recordedChunksRef.current.length),
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
    startRecording,
    stopRecording,
    saveToDevice,
    uploadToCloudinary,
    cancelSave,
  };
}
