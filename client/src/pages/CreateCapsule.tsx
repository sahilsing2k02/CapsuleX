import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCapsuleStore } from '../store/capsuleStore';
import type { Capsule } from '../store/capsuleStore';
import {
  ArrowLeft,
  Lock,
  Sparkles,
  Users,
  Mail,
  FileText,
  Image as ImageIcon,
  Mic,
  Calendar,
  Award,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';

type CapsuleType = 'standard' | 'friendship' | 'letter';
type ContentType = 'text' | 'media' | 'voice';
type UnlockType = 'time' | 'followers' | 'capsules' | 'custom';

export default function CreateCapsule() {
  const navigate = useNavigate();
  const { createCapsule, isLoading } = useCapsuleStore();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<CapsuleType>('standard');
  const [contentType, setContentType] = useState<ContentType>('text');

  // Content state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tempMediaUrl, setTempMediaUrl] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Condition state
  const [unlockType, setUnlockType] = useState<UnlockType>('time');
  const [timePreset, setTimePreset] = useState('1m'); // '1m', '5m', '1d', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [customCondition, setCustomCondition] = useState('');

  // Collaborators
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [tempCollaborator, setTempCollaborator] = useState('');

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Convert audio to Base64 to save in DB
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const handleAddMedia = () => {
    if (tempMediaUrl && !mediaUrls.includes(tempMediaUrl)) {
      setMediaUrls([...mediaUrls, tempMediaUrl]);
      setTempMediaUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setMediaUrls([...mediaUrls, base64data]);
    };
  };

  const handleAddCollaborator = () => {
    if (tempCollaborator && !collaborators.includes(tempCollaborator)) {
      setCollaborators([...collaborators, tempCollaborator]);
      setTempCollaborator('');
    }
  };

  const handleRemoveCollaborator = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please provide a title');
      return;
    }

    // Determine target date
    let targetDate: Date | undefined = undefined;
    if (unlockType === 'time') {
      const now = new Date();
      if (timePreset === '1m') {
        targetDate = new Date(now.getTime() + 60 * 1000);
      } else if (timePreset === '5m') {
        targetDate = new Date(now.getTime() + 5 * 60 * 1000);
      } else if (timePreset === '1d') {
        targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (timePreset === 'custom' && customDate) {
        targetDate = new Date(customDate);
      } else {
        targetDate = new Date(now.getTime() + 60 * 1000); // fallback 1m
      }
    }

    const capsuleData: Partial<Capsule> = {
      title,
      description,
      type,
      contentType,
      unlockCondition: {
        type: unlockType,
        targetDate: targetDate?.toISOString(),
        targetCount: unlockType === 'followers' || unlockType === 'capsules' ? targetCount : undefined,
        description: unlockType === 'custom' ? customCondition : '',
        isFulfilled: false,
      },
      text: contentType === 'text' ? text : undefined,
      mediaUrls: contentType === 'media' ? mediaUrls : undefined,
      voiceUrl: contentType === 'voice' && audioUrl ? audioUrl : undefined,
      collaborators: type === 'friendship' ? collaborators.map(id => ({ _id: id, name: '', email: '' })) : [],
    };

    const newCapsule = await createCapsule(capsuleData);
    if (newCapsule) {
      navigate('/');
    } else {
      alert('Failed to create capsule. Please try again.');
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 md:px-8">
      <div className="max-w-xl mx-auto">
        {/* Navigation & Progress */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 text-xs tracking-wider text-neutral-500 uppercase">
            <span className={step >= 1 ? 'text-white' : ''}>1. Type</span>
            <span className="w-4 h-[1px] bg-white/10" />
            <span className={step >= 2 ? 'text-white' : ''}>2. Content</span>
            <span className="w-4 h-[1px] bg-white/10" />
            <span className={step >= 3 ? 'text-white' : ''}>3. Lock</span>
          </div>
        </div>

        {/* Wizard Form Wrapper */}
        <div className="border border-white/10 rounded-3xl bg-neutral-900/50 backdrop-blur-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {/* STEP 1: Choose Capsule Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Choose Capsule Type</h2>
                  <p className="text-neutral-400 text-sm">Select how your memory will be preserved and shared.</p>
                </div>

                <div className="space-y-4">
                  {/* Standard */}
                  <button
                    onClick={() => setType('standard')}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex gap-4 items-start ${
                      type === 'standard'
                        ? 'border-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="p-3 bg-neutral-800 rounded-xl">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        Standard Capsule <Sparkles className="w-4 h-4 text-amber-400" />
                      </h3>
                      <p className="text-neutral-400 text-xs mt-1">
                        A private memory box just for you. Store pictures, text letters, or voice logs.
                      </p>
                    </div>
                  </button>

                  {/* Friendship */}
                  <button
                    onClick={() => setType('friendship')}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex gap-4 items-start ${
                      type === 'friendship'
                        ? 'border-white bg-white/5'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="p-3 bg-neutral-800 rounded-xl">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Friendship Capsule</h3>
                      <p className="text-neutral-400 text-xs mt-1">
                        Invite your friends to upload their memories. Unlocks for everyone simultaneously.
                      </p>
                    </div>
                  </button>

                  {/* Letter */}
                  <button
                    onClick={() => setType('letter')}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex gap-4 items-start ${
                      type === 'letter'
                        ? 'border-white bg-white/5'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="p-3 bg-neutral-800 rounded-xl">
                      <Mail className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Future Letter</h3>
                      <p className="text-neutral-400 text-xs mt-1">
                        Send a message directly into the future. Write letters to yourself or friends.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Friendship Collaborators entry */}
                {type === 'friendship' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-4 border-t border-white/5"
                  >
                    <label className="text-sm font-medium text-neutral-300">Invite Friends (IDs/Emails)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Friend's User ID or Email"
                        value={tempCollaborator}
                        onChange={(e) => setTempCollaborator(e.target.value)}
                        className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white"
                      />
                      <button
                        onClick={handleAddCollaborator}
                        type="button"
                        className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {collaborators.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-800 border border-white/10 rounded-full text-xs text-neutral-300"
                        >
                          {c}
                          <button onClick={() => handleRemoveCollaborator(i)} className="text-neutral-500 hover:text-white">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Fill Content */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Preserve Your Memory</h2>
                  <p className="text-neutral-400 text-sm">Write description and lock away the secret contents.</p>
                </div>

                <div className="space-y-4">
                  {/* Basic Metadata */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Capsule Title</label>
                    <input
                      type="text"
                      placeholder="E.g., Letters to my 2030 self, College Farewell..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Short Summary/Description (Visible Always)</label>
                    <textarea
                      placeholder="What is this capsule about? (Will be visible before unlock)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white resize-none"
                    />
                  </div>

                  {/* Content Type Tabs */}
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium text-neutral-300">Choose Content Format</label>
                    <div className="grid grid-cols-3 gap-2 bg-neutral-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setContentType('text')}
                        className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                          contentType === 'text' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType('media')}
                        className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                          contentType === 'media' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-4 h-4" /> Photos
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType('voice')}
                        className={`py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                          contentType === 'voice' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Mic className="w-4 h-4" /> Voice
                      </button>
                    </div>
                  </div>

                  {/* Secret Inputs based on content format */}
                  <div className="pt-2">
                    {contentType === 'text' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> Locked Text Content
                        </label>
                        <textarea
                          placeholder="Write your secret letter, goals, or reflections here..."
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          rows={6}
                          className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white"
                        />
                      </div>
                    )}

                    {contentType === 'media' && (
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> Locked Images/Media
                        </label>

                        {/* File Upload Mock */}
                        <div className="border border-dashed border-white/20 rounded-xl p-6 text-center hover:border-white/40 transition-colors relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                          <p className="text-sm text-neutral-300 font-semibold">Upload Image File</p>
                          <p className="text-xs text-neutral-500 mt-1">Converts to local base64 payload</p>
                        </div>

                        {/* Temp manual URL input fallback */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Or paste image URL"
                            value={tempMediaUrl}
                            onChange={(e) => setTempMediaUrl(e.target.value)}
                            className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white"
                          />
                          <button
                            onClick={handleAddMedia}
                            type="button"
                            className="px-4 py-2 bg-neutral-800 border border-white/10 rounded-xl text-sm font-semibold hover:bg-neutral-700 transition-colors"
                          >
                            Add URL
                          </button>
                        </div>

                        {/* Previews */}
                        {mediaUrls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            {mediaUrls.map((url, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10 bg-neutral-900">
                                <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => handleRemoveMedia(i)}
                                  className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {contentType === 'voice' && (
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> Locked Voice Message
                        </label>

                        <div className="flex flex-col items-center justify-center border border-white/10 rounded-2xl p-8 bg-neutral-950/40">
                          {isRecording ? (
                            <div className="space-y-4 text-center">
                              {/* Pulse Mic animation */}
                              <div className="relative flex items-center justify-center w-16 h-16 mx-auto">
                                <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-red-500/20" />
                                <div className="relative rounded-full w-14 h-14 bg-red-600 flex items-center justify-center">
                                  <Mic className="w-6 h-6 text-white animate-pulse" />
                                </div>
                              </div>
                              <p className="text-red-500 text-xs font-semibold uppercase tracking-widest">Recording Audio...</p>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm font-semibold transition-colors"
                              >
                                Stop Recording
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 text-center">
                              {!audioUrl ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={startRecording}
                                    className="w-14 h-14 mx-auto rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                  >
                                    <Mic className="w-6 h-6" />
                                  </button>
                                  <p className="text-xs text-neutral-400">Click to record voice log using mic</p>
                                </>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 bg-neutral-800 py-3 px-5 rounded-full border border-white/10">
                                    <button
                                      type="button"
                                      onClick={togglePlayback}
                                      className="p-2 bg-white text-black rounded-full hover:bg-neutral-200"
                                    >
                                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
                                    </button>
                                    <div className="text-xs text-left">
                                      <p className="font-semibold">Voice Message Ready</p>
                                      <p className="text-neutral-400">Recorded local voice log</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAudioUrl(null);
                                        setIsPlaying(false);
                                      }}
                                      className="p-2 text-neutral-500 hover:text-red-500 ml-4"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <audio ref={audioRef} src={audioUrl} className="hidden" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-full border border-white/10 hover:border-white/20 transition-colors font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Choose Unlock Condition */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Set Unlock Condition</h2>
                  <p className="text-neutral-400 text-sm">Select when this capsule will break open.</p>
                </div>

                <div className="space-y-4">
                  {/* Lock Condition Selector tabs */}
                  <div className="grid grid-cols-4 gap-1.5 bg-neutral-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUnlockType('time')}
                      className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        unlockType === 'time' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" /> Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnlockType('followers')}
                      className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        unlockType === 'followers' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Followers
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnlockType('capsules')}
                      className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        unlockType === 'capsules' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" /> Capsules
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnlockType('custom')}
                      className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        unlockType === 'custom' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" /> Goal
                    </button>
                  </div>

                  {/* Lock inputs details */}
                  <div className="p-4 border border-white/5 bg-neutral-950/20 rounded-2xl min-h-[140px] flex items-center justify-center">
                    {unlockType === 'time' && (
                      <div className="w-full space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Time-based Presets</label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: '1 Min', val: '1m' },
                            { label: '5 Mins', val: '5m' },
                            { label: '1 Day', val: '1d' },
                            { label: 'Custom', val: 'custom' },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setTimePreset(preset.val)}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                                timePreset === preset.val ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/20'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {timePreset === 'custom' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2 pt-2"
                          >
                            <label className="text-xs text-neutral-400">Select Date & Time</label>
                            <input
                              type="datetime-local"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white text-white"
                            />
                          </motion.div>
                        )}
                      </div>
                    )}

                    {unlockType === 'followers' && (
                      <div className="w-full space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Follower Milestone</label>
                        <p className="text-xs text-neutral-500">Unlocks when you reach this number of followers.</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            value={targetCount}
                            onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                            className="w-24 bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white"
                          />
                          <span className="text-sm font-semibold text-neutral-300">Followers</span>
                        </div>
                      </div>
                    )}

                    {unlockType === 'capsules' && (
                      <div className="w-full space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Capsule Milestone</label>
                        <p className="text-xs text-neutral-500">Unlocks once you have created this total number of capsules.</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            value={targetCount}
                            onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                            className="w-24 bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white"
                          />
                          <span className="text-sm font-semibold text-neutral-300">Total Capsules</span>
                        </div>
                      </div>
                    )}

                    {unlockType === 'custom' && (
                      <div className="w-full space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Custom Event / Goal</label>
                        <p className="text-xs text-neutral-500">Describe the milestone. Unlocks when you manually mark it done.</p>
                        <input
                          type="text"
                          placeholder="E.g., Complete my 500th Leetcode problem, land my first job..."
                          value={customCondition}
                          onChange={(e) => setCustomCondition(e.target.value)}
                          className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-full border border-white/10 hover:border-white/20 transition-colors font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 disabled:bg-neutral-600 disabled:text-neutral-400 transition-colors flex items-center gap-2"
                  >
                    {isLoading ? 'Creating...' : 'Lock Memory'} <Lock className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
