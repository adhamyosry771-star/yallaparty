
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ProcessingConfig } from '../types';

interface VideoProcessorProps {
  videoFile: File | null;
  config: ProcessingConfig;
  isActive: boolean;
  onRecordingStatus?: (isRecording: boolean, progress: number) => void;
  onDownloadReady?: (blob: Blob) => void;
}

export interface VideoProcessorHandle {
  startRecording: () => void;
}

declare const SelfieSegmentation: any;

const VideoProcessor = forwardRef<VideoProcessorHandle, VideoProcessorProps>(({ 
  videoFile, 
  config, 
  isActive, 
  onRecordingStatus,
  onDownloadReady 
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const segmentationRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const safePlay = async (video: HTMLVideoElement) => {
    try {
      if (video.paused) {
        await video.play();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Video play failed:", err);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    startRecording: () => {
      if (!videoRef.current || !canvasRef.current || isRecording) return;
      
      setIsRecording(true);
      chunksRef.current = [];
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const canvasStream = canvas.captureStream(30);
      let audioTrack: MediaStreamTrack | null = null;
      try {
        const videoStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
        audioTrack = videoStream.getAudioTracks()[0];
      } catch (e) {
        console.warn("Audio capture not supported", e);
      }

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...(audioTrack ? [audioTrack] : [])
      ]);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onDownloadReady?.(blob);
        setIsRecording(false);
        onRecordingStatus?.(false, 0);
      };

      mediaRecorderRef.current = recorder;
      video.pause();
      video.currentTime = 0;
      
      setTimeout(() => {
        safePlay(video).then(() => {
          recorder.start();
        });
      }, 200);
    }
  }));

  useEffect(() => {
    if (config.bgImageUrl) {
      const img = new Image();
      img.src = config.bgImageUrl;
      img.crossOrigin = "anonymous";
      img.onload = () => { bgImageRef.current = img; };
    } else {
      bgImageRef.current = null;
    }
  }, [config.bgImageUrl]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    if (width === 0 || height === 0) return;

    // 1. مسح الكانفاس بالكامل
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    
    // 2. رسم الخلفية المختارة أولاً (الطبقة السفلية)
    if (config.mode === 'color') {
      ctx.fillStyle = config.color;
      ctx.fillRect(0, 0, width, height);
    } else if (config.mode === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, width, height);
    } else if (config.mode === 'blur') {
      // رسم نسخة مغبشة من الفيديو الأصلي كخلفية
      ctx.filter = `blur(${config.blurAmount}px)`;
      ctx.drawImage(results.image, 0, 0, width, height);
      ctx.filter = 'none';
    } else {
      // خلفية سوداء افتراضية إذا لم يتم اختيار شيء
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // 3. رسم الشخص فقط فوق الخلفية (الطبقة العلوية) باستخدام قناع العزل
    // نستخدم offscreen canvas لقص الشخص بدقة قبل وضعه على الكانفاس الرئيسي
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    
    if (offCtx) {
      offCtx.clearRect(0, 0, width, height);
      // أرسم القناع أولاً
      offCtx.drawImage(results.segmentationMask, 0, 0, width, height);
      // استخدم القناع لقص ما سيتم رسمه لاحقاً
      offCtx.globalCompositeOperation = 'source-in';
      // أرسم صورة الفيديو الأصلية (سيتم رسم ما داخل القناع فقط وهو الشخص)
      offCtx.drawImage(results.image, 0, 0, width, height);
      
      // الآن أرسم الشخص المعزول فوق الكانفاس الرئيسي الذي يحتوي على الخلفية
      ctx.drawImage(offCanvas, 0, 0, width, height);
    }

    ctx.restore();

    // تحديث شريط التقدم أثناء التسجيل
    if (isRecording && videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      onRecordingStatus?.(true, progress);
      if (videoRef.current.ended) {
        mediaRecorderRef.current?.stop();
      }
    }
  }, [config, isRecording, onRecordingStatus]);

  useEffect(() => {
    if (!videoFile || !isActive) return;
    const video = videoRef.current;
    if (!video) return;

    setIsProcessing(false);
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const initSegmentation = async () => {
      try {
        if (segmentationRef.current) {
          await segmentationRef.current.close();
        }
        const selfieSegmentation = new SelfieSegmentation({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        
        // modelSelection: 1 تعني استخدام الموديل الأدق (Landscape model)
        selfieSegmentation.setOptions({ 
          modelSelection: 1,
          selfieMode: false 
        });
        
        selfieSegmentation.onResults(onResults);
        segmentationRef.current = selfieSegmentation;
        setIsProcessing(true);
      } catch (err) {
        setError("فشل تحميل محرك العزل الذكي.");
      }
    };

    initSegmentation();
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile, isActive, onResults]);

  useEffect(() => {
    let animationId: number;
    const processFrame = async () => {
      if (videoRef.current && segmentationRef.current && isProcessing && !videoRef.current.paused) {
        try {
          await segmentationRef.current.send({ image: videoRef.current });
        } catch (e) {}
      }
      animationId = requestAnimationFrame(processFrame);
    };
    animationId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationId);
  }, [isProcessing]);

  const handleVideoMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      safePlay(videoRef.current);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        safePlay(videoRef.current);
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  return (
    <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 group">
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-sm z-50 p-6 text-center">
          <p className="text-red-200 font-medium text-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all">إعادة محاولة</button>
        </div>
      )}
      
      {!isProcessing && videoFile && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40 text-center p-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium">جاري تحليل الأجسام في الفيديو...</p>
        </div>
      )}

      <video 
        ref={videoRef} 
        onLoadedMetadata={handleVideoMetadata} 
        className="hidden" 
        playsInline 
        loop={!isRecording} 
        muted 
        autoPlay 
      />
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain cursor-pointer" 
        onClick={togglePlay} 
      />

      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full z-50 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">جاري تصدير النتيجة</span>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button 
          onClick={togglePlay} 
          className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-xl"
        >
          {isPaused ? (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4.018 14L14.41 8 4.018 2v12z"/></svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
});

export default VideoProcessor;
