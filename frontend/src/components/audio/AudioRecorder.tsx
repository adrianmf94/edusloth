import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record';
import { uploadContent } from '@/lib/api';
import { useContentStore } from '@/lib/store/contentStore';

interface AudioRecorderProps {
  onRecordingComplete?: (contentId: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchContents } = useContentStore();
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4f46e5',
        progressColor: '#818cf8',
        height: 80,
        cursorWidth: 1,
        cursorColor: '#4f46e5',
        barWidth: 2,
        barGap: 3,
        barRadius: 3,
      });
      
      wavesurferRef.current = wavesurfer;
      
      const record = wavesurfer.registerPlugin(
        RecordPlugin.create({ renderRecordedAudio: true })
      );
      
      record.on('record-start', () => {
        setIsRecording(true);
        setIsPaused(false);
        startTimer();
      });
      
      record.on('record-pause', () => {
        setIsPaused(true);
        pauseTimer();
      });
      
      record.on('record-resume', () => {
        setIsPaused(false);
        startTimer();
      });
      
      record.on('record-end', () => {
        setIsRecording(false);
        setIsPaused(false);
        stopTimer();
      });
      
      recordRef.current = record;
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        wavesurfer.destroy();
      };
    }
  }, []);
  
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setRecordingTime((prevTime) => prevTime + 1);
    }, 1000);
  };
  
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const stopTimer = () => {
    pauseTimer();
    // Don't reset time immediately so user can see final time
  };
  
  const startRecording = async () => {
    if (!recordRef.current) return;
    
    try {
      setError(null);
      await recordRef.current.startRecording();
      setRecordingTime(0);
    } catch (err: any) {
      setError('Failed to start recording: ' + err.message);
    }
  };
  
  const pauseRecording = async () => {
    if (!recordRef.current || !isRecording) return;
    
    try {
      await recordRef.current.pauseRecording();
    } catch (err: any) {
      setError('Failed to pause recording: ' + err.message);
    }
  };
  
  const resumeRecording = async () => {
    if (!recordRef.current || !isRecording) return;
    
    try {
      await recordRef.current.resumeRecording();
    } catch (err: any) {
      setError('Failed to resume recording: ' + err.message);
    }
  };
  
  const stopRecording = async () => {
    if (!recordRef.current || !isRecording) return;
    
    try {
      await recordRef.current.stopRecording();
    } catch (err: any) {
      setError('Failed to stop recording: ' + err.message);
    }
  };
  
  const uploadRecording = async () => {
    if (!recordRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the blob from the record plugin
      const blob = await recordRef.current.getRecording();
      
      // Create a title with date and time
      const date = new Date();
      const title = `Recording ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      // Create a File object from the blob
      const file = new File([blob], `${title}.wav`, { type: 'audio/wav' });
      
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', 'Audio recording');
      formData.append('content_type', 'audio');
      
      const response = await uploadContent(formData);
      
      // Refresh content list
      await fetchContents();
      
      // Reset recording timer
      setRecordingTime(0);
      
      // Call the callback if provided
      if (onRecordingComplete) {
        onRecordingComplete(response.id);
      }
      
      setIsLoading(false);
    } catch (err: any) {
      setError('Failed to upload recording: ' + err.message);
      setIsLoading(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Audio Recorder</h2>
      
      {error && (
        <div className="bg-red-50 p-3 rounded mb-4 text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-4" ref={waveformRef}></div>
      
      <div className="flex items-center justify-between">
        <div className="text-gray-700 font-medium">
          {isRecording ? (
            <span className="text-red-600 flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse mr-2"></span>
              Recording: {formatTime(recordingTime)}
            </span>
          ) : recordingTime > 0 ? (
            <span>Duration: {formatTime(recordingTime)}</span>
          ) : (
            <span>Ready to record</span>
          )}
        </div>
        
        <div className="flex space-x-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              Start Recording
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Pause
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Stop
              </button>
            </>
          )}
          
          {!isRecording && recordingTime > 0 && (
            <button
              onClick={uploadRecording}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? 'Uploading...' : 'Save & Upload'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder; 