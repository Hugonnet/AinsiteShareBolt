import { useState, useRef } from 'react';

interface VideoRecorderState {
  isRecording: boolean;
  videoBlob: Blob | null;
  recordingTime: number;
  error: string | null;
  videoUrl: string | null;
}

export const useVideoRecorder = (maxDuration: number = 40) => {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    videoBlob: null,
    recordingTime: 0,
    error: null,
    videoUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment',
        },
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        setState(prev => ({
          ...prev,
          videoBlob: blob,
          videoUrl: url,
          isRecording: false,
        }));

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000);

      let time = 0;
      timerRef.current = window.setInterval(() => {
        time++;
        setState(prev => ({ ...prev, recordingTime: time }));

        if (time >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        recordingTime: 0,
        error: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Impossible d\'accéder à la caméra',
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }

    setState({
      isRecording: false,
      videoBlob: null,
      recordingTime: 0,
      error: null,
      videoUrl: null,
    });
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    deleteRecording,
    stream: streamRef.current,
  };
};
