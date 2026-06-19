import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCapsuleStore } from '../store/capsuleStore';
import type { Capsule } from '../store/capsuleStore';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Unlock,
  Plus,
  Clock,
  LogOut,
  Award,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Mic,
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { capsules, fetchCapsules, isLoading } = useCapsuleStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const lockedCapsules = capsules.filter((c) => c.isLocked);
  const unlockedCapsules = capsules.filter((c) => !c.isLocked);

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      {/* Navbar */}
      <nav className="flex items-center justify-between mb-12 max-w-6xl mx-auto border-b border-white/5 pb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent flex items-center gap-2">
          CapsuleX <Sparkles className="w-5 h-5 text-amber-400" />
        </h1>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs border border-white/15">
              {user?.name[0]}
            </div>
            <span className="text-neutral-400 font-medium hidden sm:inline">Welcome, {user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-white/5 border border-white/5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Daily Time Journey</h2>
            <p className="text-neutral-400 text-sm md:text-base font-light">
              Explore your capsules and watch the clock tick down on your memories.
            </p>
          </div>
          <Link
            to="/capsules/new"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] self-start sm:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Create Capsule
          </Link>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 border border-white/5 rounded-3xl bg-neutral-900/10">
            <div className="w-8 h-8 border-2 border-white/15 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-neutral-500 text-sm">Retrieving time seals...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && capsules.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 md:p-20 border border-white/10 rounded-3xl bg-neutral-900/30 backdrop-blur-xl relative overflow-hidden shadow-xl">
            <div className="absolute top-12 left-12 w-36 h-36 bg-white/5 rounded-full filter blur-3xl pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <Clock className="w-7 h-7 text-neutral-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Capsules Locked Away</h3>
            <p className="text-neutral-400 text-center max-w-sm mb-8 text-sm font-light leading-relaxed">
              Start preserving your voice logs, photos, and letters for the future. Create your first time capsule now.
            </p>
            <Link
              to="/capsules/new"
              className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors"
            >
              Create Capsule
            </Link>
          </div>
        )}

        {/* LIST CAPSULES */}
        {!isLoading && capsules.length > 0 && (
          <div className="space-y-12">
            {/* Locked Capsules Section */}
            {lockedCapsules.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Locked Memories ({lockedCapsules.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lockedCapsules.map((capsule) => (
                    <CapsuleCard key={capsule._id} capsule={capsule} />
                  ))}
                </div>
              </div>
            )}

            {/* Unlocked Capsules Section */}
            {unlockedCapsules.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-500" /> Unlocked Capsules ({unlockedCapsules.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unlockedCapsules.map((capsule) => (
                    <CapsuleCard key={capsule._id} capsule={capsule} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Single Capsule Card Component
function CapsuleCard({ capsule }: { capsule: Capsule }) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Handle countdown calculation
  useEffect(() => {
    if (!capsule.isLocked || capsule.unlockCondition.type !== 'time' || !capsule.unlockCondition.targetDate) {
      return;
    }

    const target = new Date(capsule.unlockCondition.targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining('Ready');
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
  }, [capsule]);

  const renderIcon = () => {
    switch (capsule.contentType) {
      case 'text':
        return <FileText className="w-4 h-4 text-neutral-400" />;
      case 'media':
        return <ImageIcon className="w-4 h-4 text-neutral-400" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-neutral-400" />;
      default:
        return null;
    }
  };

  const getConditionText = () => {
    const cond = capsule.unlockCondition;
    if (cond.type === 'time') return 'Time lock';
    if (cond.type === 'followers') return `Reach ${cond.targetCount} Followers`;
    if (cond.type === 'capsules') return `Reach ${cond.targetCount} Capsules`;
    if (cond.type === 'custom') return cond.description || 'Milestone';
    return 'Locked';
  };

  const cardClick = () => {
    navigate(`/capsules/${capsule._id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={cardClick}
      className={`border rounded-3xl p-6 flex flex-col justify-between h-[200px] cursor-pointer transition-all relative overflow-hidden ${
        capsule.isLocked
          ? 'border-white/10 bg-neutral-900/30 hover:border-amber-500/30'
          : 'border-white/10 bg-neutral-900/60 hover:bg-neutral-900/80 hover:border-white/20'
      }`}
    >
      {/* Background radial highlight for locked cards */}
      {capsule.isLocked && (
        <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl pointer-events-none" />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            {renderIcon()}
            <span className="capitalize">{capsule.type}</span>
          </div>
          {capsule.isLocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/15">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/15">
              <Unlock className="w-2.5 h-2.5" /> Unlocked
            </span>
          )}
        </div>

        <div>
          <h4 className="font-bold text-lg tracking-tight line-clamp-1">{capsule.title}</h4>
          <p className="text-neutral-400 text-xs line-clamp-2 mt-1 font-light leading-relaxed">
            {capsule.description || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        {capsule.isLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
            {capsule.unlockCondition.type === 'time' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-sm font-semibold">{timeRemaining}</span>
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">{getConditionText()}</span>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Ready to open
          </div>
        )}
        <span className="text-[10px] text-neutral-500">
          {new Date(capsule.createdAt).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}
