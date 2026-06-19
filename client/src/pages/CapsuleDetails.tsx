import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCapsuleStore } from '../store/capsuleStore';
import type { Capsule } from '../store/capsuleStore';
import { useAuthStore } from '../store/authStore';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Heart,
  MessageCircle,
  Play,
  Pause,
  Users,
  Award,
  Send,
  Loader,
  Clock,
  Sparkles,
} from 'lucide-react';

const WAVE_BARS = Array.from({ length: 14 }).map((_, idx) => ({
  id: idx,
  heights: [10, Math.floor(Math.random() * 40) + 10, 10],
  duration: 0.6 + Math.random() * 0.4,
}));

export default function CapsuleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCapsuleById, unlockCapsule, toggleLike, addComment } = useCapsuleStore();
  const { user: currentUser } = useAuthStore();

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Unlock sequence states
  const [isUnlockingSequence, setIsUnlockingSequence] = useState(false);
  const [sequenceStep, setSequenceStep] = useState<number>(0); // 0: locked, 1: shaking, 2: burst, 3: unlocked

  // Voice player states
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch capsule data
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getCapsuleById(id);
    if (data) {
      setCapsule(data);
    } else {
      alert('Capsule not found or access denied.');
      navigate('/');
    }
    setLoading(false);
  }, [id, getCapsuleById, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const isLocked = capsule?.isLocked;
  const condType = capsule?.unlockCondition.type;
  const targetDate = capsule?.unlockCondition.targetDate;

  // Real-time Countdown Timer
  useEffect(() => {
    if (!isLocked || condType !== 'time' || !targetDate) {
      return;
    }

    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining('00:00:00');
        // Trigger auto-refresh to let server check lock status
        fetchData();
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        const format = (num: number) => String(num).padStart(2, '0');
        setTimeRemaining(
          `${days > 0 ? `${days}d ` : ''}${format(hours)}:${format(minutes)}:${format(seconds)}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isLocked, condType, targetDate, fetchData]);

  // Manual unlock triggers (Custom goals)
  const handleManualUnlock = async () => {
    if (!id || !capsule) return;
    setIsUnlockingSequence(true);
    setSequenceStep(1); // Start shake

    // Step 1: Shake lock (1.5 seconds)
    setTimeout(() => {
      setSequenceStep(2); // Burst particles (1 second)
      setTimeout(async () => {
        const updated = await unlockCapsule(id);
        if (updated) {
          setCapsule(updated);
          setSequenceStep(3); // Unlocked content fade-in
        } else {
          setIsUnlockingSequence(false);
        }
      }, 1000);
    }, 1500);
  };

  const handleLike = async () => {
    if (!id || !capsule) return;
    await toggleLike(id);
    // Optimistic / simple refresh
    setCapsule((prev) => {
      if (!prev || !currentUser) return prev;
      const isAlreadyLiked = prev.likes.includes(currentUser._id);
      const nextLikes = isAlreadyLiked
        ? prev.likes.filter((uid) => uid !== currentUser._id)
        : [...prev.likes, currentUser._id];
      return { ...prev, likes: nextLikes };
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    await addComment(id, commentText);
    setCommentText('');
    // Fetch fresh details to show new comment with creator populates
    const data = await getCapsuleById(id);
    if (data) setCapsule(data);
  };

  // Voice playback toggling
  const toggleVoicePlay = () => {
    if (!audioRef.current || !capsule?.voiceUrl) return;

    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play();
      setIsPlayingVoice(true);
      audioRef.current.onended = () => setIsPlayingVoice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (!capsule) return null;

  const isCreator = currentUser?._id === capsule.creator._id;
  const isLikedByMe = currentUser ? capsule.likes.includes(currentUser._id) : false;

  // Render Lock Indicator based on lock condition type
  const renderConditionBadge = () => {
    const cond = capsule.unlockCondition;
    switch (cond.type) {
      case 'time':
        return (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-4 py-2 rounded-full text-xs font-semibold border border-amber-400/20">
            <Clock className="w-4 h-4" /> Time Lock: Unlocks at {new Date(cond.targetDate!).toLocaleDateString()}
          </div>
        );
      case 'followers':
        return (
          <div className="flex items-center gap-2 text-purple-400 bg-purple-400/10 px-4 py-2 rounded-full text-xs font-semibold border border-purple-400/20">
            <Users className="w-4 h-4" /> Followers Milestone: Requires {cond.targetCount} Followers
          </div>
        );
      case 'capsules':
        return (
          <div className="flex items-center gap-2 text-sky-400 bg-sky-400/10 px-4 py-2 rounded-full text-xs font-semibold border border-sky-400/20">
            <Award className="w-4 h-4" /> Capsules Milestone: Requires {cond.targetCount} Total Capsules
          </div>
        );
      case 'custom':
        return (
          <div className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-4 py-2 rounded-full text-xs font-semibold border border-indigo-400/20">
            <Award className="w-4 h-4" /> Milestone: "{cond.description}"
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back Link */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Timeline
          </Link>
        </div>

        {/* --- LOCKED STATE --- */}
        {capsule.isLocked && !isUnlockingSequence && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 rounded-3xl bg-neutral-900/40 backdrop-blur-3xl p-8 md:p-12 text-center space-y-8 relative overflow-hidden shadow-2xl"
          >
            {/* Glowing blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full filter blur-[100px] pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="w-20 h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                >
                  <Lock className="w-10 h-10 text-amber-400" />
                </motion.div>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{capsule.title}</h1>
              <p className="text-neutral-400 max-w-md mx-auto text-sm md:text-base font-light">
                {capsule.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 relative z-10 pt-4">
              {renderConditionBadge()}

              {/* Countdown for Time conditions */}
              {capsule.unlockCondition.type === 'time' && (
                <div className="space-y-2">
                  <p className="text-neutral-500 text-xs uppercase tracking-widest font-semibold">Time Remaining</p>
                  <div className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-white bg-gradient-to-r from-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                    {timeRemaining}
                  </div>
                </div>
              )}

              {/* Manual Unlock for Creator under custom milestones */}
              {capsule.unlockCondition.type === 'custom' && isCreator && (
                <div className="space-y-4 pt-4">
                  <p className="text-neutral-400 text-sm">Have you accomplished this milestone?</p>
                  <button
                    onClick={handleManualUnlock}
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded-full transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95"
                  >
                    Unlock the Future
                  </button>
                </div>
              )}

              {!isCreator && capsule.unlockCondition.type === 'custom' && (
                <p className="text-neutral-500 text-sm italic pt-4">Waiting for creator to fulfill condition.</p>
              )}
            </div>

            <div className="pt-8 border-t border-white/5 flex justify-between items-center text-xs text-neutral-500">
              <div>Created by {capsule.creator.name}</div>
              <div>{new Date(capsule.createdAt).toLocaleDateString()}</div>
            </div>
          </motion.div>
        )}

        {/* --- UNLOCKING TRANSITION SEQUENCE --- */}
        {isUnlockingSequence && (
          <div className="border border-white/10 rounded-3xl bg-neutral-900/60 p-12 text-center h-[400px] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Shake / Spin Animation */}
            {sequenceStep === 1 && (
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1.1, 1.2, 1.2, 1.3],
                }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="space-y-4"
              >
                <div className="w-24 h-24 rounded-full bg-amber-400/20 flex items-center justify-center border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                  <Lock className="w-12 h-12 text-amber-400" />
                </div>
                <p className="text-amber-400 font-bold uppercase tracking-widest text-sm animate-pulse">
                  Breaking Temporal Seal...
                </p>
              </motion.div>
            )}

            {/* Sparkles / Explosion burst */}
            {sequenceStep === 2 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                className="relative flex items-center justify-center"
              >
                <div className="absolute w-40 h-40 rounded-full bg-white/20 filter blur-xl animate-ping" />
                <div className="relative text-white font-bold text-lg flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                    <Unlock className="w-12 h-12 text-black animate-bounce" />
                  </div>
                  <span className="text-white text-2xl font-black uppercase tracking-widest flex items-center gap-2 mt-4">
                    Unlocked! <Sparkles className="w-6 h-6 text-amber-400" />
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* --- UNLOCKED STATE --- */}
        {!capsule.isLocked && !isUnlockingSequence && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Main Premium Card */}
            <div className="border border-white/10 rounded-3xl bg-neutral-900/40 backdrop-blur-3xl p-6 md:p-10 relative overflow-hidden shadow-2xl">
              {/* Soft purple/blue glow */}
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none" />

              <div className="space-y-6 relative z-10">
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold">
                      {capsule.creator.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{capsule.creator.name}</p>
                      <p className="text-xs text-neutral-400">{new Date(capsule.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Unlocked Memory
                  </div>
                </div>

                {/* Title and descriptions */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight">{capsule.title}</h1>
                  {capsule.description && <p className="text-neutral-400 text-sm font-light leading-relaxed">{capsule.description}</p>}
                </div>

                {/* SECRET CONTENT RENDER */}
                <div className="pt-4 border-t border-white/5">
                  {/* TEXT CONTENT */}
                  {capsule.contentType === 'text' && capsule.text && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-neutral-950/40 border border-white/5 rounded-2xl p-6 font-serif text-lg leading-relaxed text-neutral-200 whitespace-pre-wrap select-text"
                    >
                      {capsule.text}
                    </motion.div>
                  )}

                  {/* MEDIA CONTENT */}
                  {capsule.contentType === 'media' && capsule.mediaUrls && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {capsule.mediaUrls.map((url, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-neutral-950 relative group"
                        >
                          <img src={url} alt={`Memory ${i}`} className="w-full h-full object-cover" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* VOICE CONTENT */}
                  {capsule.contentType === 'voice' && capsule.voiceUrl && (
                    <div className="flex flex-col items-center justify-center bg-neutral-950/40 border border-white/5 rounded-2xl p-8 text-center relative overflow-hidden">
                      <div className="relative z-10 space-y-6 w-full">
                        <p className="text-xs text-neutral-400 font-semibold uppercase tracking-widest">Voice from the Past</p>

                        <div className="flex items-center justify-center gap-6">
                          <button
                            onClick={toggleVoicePlay}
                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                          >
                            {isPlayingVoice ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-black" />}
                          </button>

                          {/* Interactive wave visualizer mock */}
                          <div className="flex items-center gap-1.5 h-12 flex-1 max-w-[200px]">
                            {WAVE_BARS.map((bar) => (
                              <motion.div
                                key={bar.id}
                                animate={{
                                  height: isPlayingVoice ? bar.heights : 8,
                                }}
                                transition={{
                                  repeat: Infinity,
                                  duration: bar.duration,
                                  ease: 'easeInOut',
                                }}
                                className="w-1 bg-white/60 rounded-full"
                              />
                            ))}
                          </div>
                        </div>

                        <audio ref={audioRef} src={capsule.voiceUrl} className="hidden" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Likes / Actions Bar */}
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-6 text-sm">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 transition-colors ${
                        isLikedByMe ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLikedByMe ? 'fill-red-500' : ''}`} />
                      <span className="font-semibold">{capsule.likes.length}</span>
                    </button>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{capsule.comments.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="border border-white/10 rounded-3xl bg-neutral-900/40 backdrop-blur-3xl p-6 md:p-8 space-y-6">
              <h3 className="text-xl font-bold">Comments</h3>

              {/* Comment input form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Share your thoughts on this memory..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  className="p-3 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* List comments */}
              <div className="space-y-4 pt-2">
                {capsule.comments.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic text-center py-4">No comments yet. Start the conversation!</p>
                ) : (
                  capsule.comments.map((comment, index) => (
                    <div key={index} className="flex gap-3 text-sm items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                        {comment.name[0]}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold">{comment.name}</span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-neutral-300 font-light">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
