import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { CheckCircle, Award, BookOpen, Settings, Play, Pause, RotateCcw, Plus, Edit, Trash2, X, Star, Sun, Moon, Zap, Coffee, ShieldCheck, Target, Trophy, Sunrise, CalendarDays, UserMinus, LayoutGrid, SlidersHorizontal, ChevronsUp, ClipboardCheck, Sunset, CloudSun, CloudMoon, BookHeart, BedDouble, Lock, Unlock, AlertTriangle, Heart, Clock } from 'lucide-react';

// --- Firebase Configuration ---
// This is the standard and correct way for a Vite project to handle secrets.
// It reads from an environment variable that you will set in your hosting provider.
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

// We get the appId from the config object itself.
const appId = firebaseConfig.appId; 

// --- Firebase Initialization ---
// This check prevents the app from crashing if the config is missing.
let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.error("CRITICAL: Firebase config is missing. Ensure the VITE_FIREBASE_CONFIG environment variable is set in your hosting provider.");
}

// --- Main App Component ---
export default function App() {
    const [view, setView] = useState('timer'); // 'timer', 'matrix', 'achievements', 'log', 'settings'
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [theme, setTheme] = useState('light');
    const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);

    // --- Authentication ---
    useEffect(() => {
        if (!auth) return; // Don't run auth logic if Firebase isn't configured
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Authentication Error:", error);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // --- Theme Management ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    // --- Render Logic ---
    // Display a clear error message if the configuration is missing.
    if (!firebaseConfig.apiKey) {
        return (
             <div className="flex items-center justify-center h-screen bg-red-50 text-red-800">
                <div className="text-center p-8 border-2 border-red-300 rounded-lg shadow-lg max-w-lg mx-4">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold">Configuration Error</h1>
                    <p className="mt-2">The application cannot connect to its database because the Firebase configuration is missing.</p>
                    <p className="text-sm mt-2 text-gray-600">This is not your fault! The site owner needs to set the `VITE_FIREBASE_CONFIG` environment variable in the hosting settings.</p>
                </div>
            </div>
        )
    }

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-red-500"></div>
                    <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Initializing your productivity space...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Header userId={userId} toggleTheme={toggleTheme} theme={theme} onEndDayClick={() => setIsEndDayModalOpen(true)} />
                <main className="mt-6">
                    <Navigation activeView={view} setView={setView} />
                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                        {view === 'timer' && <PomodoroTimer userId={userId} />}
                        {view === 'matrix' && <EisenhowerMatrix userId={userId} />}
                        {view === 'achievements' && <Achievements userId={userId} />}
                        {view === 'log' && <Log userId={userId} />}
                        {view === 'settings' && <SettingsComponent userId={userId} />}
                    </div>
                </main>
                <Footer />
                {isEndDayModalOpen && <EndDayModal userId={userId} onClose={() => setIsEndDayModalOpen(false)} />}
            </div>
        </div>
    );
}

// --- Header Component ---
const Header = ({ userId, toggleTheme, theme, onEndDayClick }) => (
    <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">FocusFlow</h1>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={onEndDayClick} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="End Day Review">
                <BedDouble className="w-6 h-6" />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
                {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>
            {userId && <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">UID: {userId}</span>}
        </div>
    </header>
);

// --- Navigation Component ---
const Navigation = ({ activeView, setView }) => {
    const navItems = [
        { id: 'timer', label: 'Timer', icon: Play },
        { id: 'matrix', label: 'Matrix', icon: Zap },
        { id: 'achievements', label: 'Achievements', icon: Award },
        { id: 'log', label: 'Log', icon: BookOpen },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="flex justify-center flex-wrap gap-2 sm:gap-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 ${
                        activeView === item.id 
                        ? 'bg-red-500 text-white shadow-md' 
                        : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    <item.icon className="w-5 h-5 mr-2" />
                    {item.label}
                </button>
            ))}
        </nav>
    );
};

// --- Prayer Times Component ---
const PrayerTimes = ({ userId }) => {
    const [timings, setTimings] = useState(null);
    const [location, setLocation] = useState({ city: '', country: '', method: '2' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userId) return;
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                setLocation({ 
                    city: settings.city || '', 
                    country: settings.country || '',
                    method: settings.prayerMethod || '2'
                });
            } else {
                setLocation({ city: '', country: '', method: '2' });
            }
        });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (location.city && location.country) {
            setLoading(true);
            setError('');
            fetch(`https://api.aladhan.com/v1/timingsByCity?city=${location.city}&country=${location.country}&method=${location.method}`)
                .then(response => response.json())
                .then(data => {
                    if (data.code === 200) {
                        setTimings(data.data.timings);
                    } else {
                        setError('Could not fetch prayer times. Please check the location in settings.');
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setError('Failed to connect to the prayer times service.');
                    setLoading(false);
                });
        } else {
            setLoading(false);
            if (userId) {
                setError('Please set your city and country in the settings to see prayer times.');
            }
        }
    }, [location, userId]);

    const prayerOrder = [
        { name: 'Fajr', icon: <Sunrise className="w-6 h-6 text-orange-400" /> },
        { name: 'Dhuhr', icon: <Sun className="w-6 h-6 text-yellow-500" /> },
        { name: 'Asr', icon: <CloudSun className="w-6 h-6 text-amber-500" /> },
        { name: 'Maghrib', icon: <Sunset className="w-6 h-6 text-red-500" /> },
        { name: 'Isha', icon: <CloudMoon className="w-6 h-6 text-indigo-400" /> },
    ];

    return (
        <div className="mt-8 w-full max-w-lg mx-auto p-4 border-t-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-center mb-4">Today's Prayer Times</h3>
            {loading && <p className="text-center">Loading prayer times...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            {timings && !error && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                    {prayerOrder.map(prayer => (
                        <div key={prayer.name} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center">
                            {prayer.icon}
                            <p className="font-semibold mt-1">{prayer.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{timings[prayer.name]}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Quote Modal Component ---
const QuoteModal = ({ isOpen, onClose, quote, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md text-center transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="flex justify-center mb-4">
                    <BookHeart className="w-12 h-12 text-red-500" />
                </div>
                {isLoading ? (
                     <div className="flex justify-center items-center h-24">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-red-500"></div>
                     </div>
                ) : quote ? (
                    <>
                        <h3 className="text-xl sm:text-2xl font-semibold italic text-gray-800 dark:text-gray-100">"{quote.text}"</h3>
                        <p className="mt-4 text-md text-gray-500 dark:text-gray-400">{quote.ref}</p>
                    </>
                ) : (
                     <p className="text-lg text-gray-600 dark:text-gray-400">Could not fetch a message. Please check your settings.</p>
                )}
                <button 
                    onClick={onClose}
                    className="mt-6 w-full sm:w-auto px-6 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:bg-red-600 transition-all transform hover:scale-105"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

// --- Salah Aware Modal ---
const SalahAwareModal = ({ isOpen, onClose, onConfirm, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md text-center">
                <div className="flex justify-center mb-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{message}</h3>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    {onConfirm && (
                         <button onClick={onConfirm} className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:bg-red-600">
                            Start Shorter Session
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 2-Minute Rule Timer Modal ---
const TwoMinuteRuleTimer = ({ time, onClose }) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-sm text-center">
                <div className="flex justify-center mb-4">
                    <Clock className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">2-Minute Rule</h3>
                <p className="text-5xl font-bold my-4">{formatTime(time)}</p>
                <button 
                    onClick={onClose}
                    className="w-full px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Stop
                </button>
            </div>
        </div>
    );
};


// --- Pomodoro Timer Component ---
const PomodoroTimer = ({ userId }) => {
    const [settings, setSettings] = useState({ 
        pomodoro: 25, 
        shortBreak: 5, 
        longBreak: 15,
        showEndSessionMessage: true,
        endSessionMessageSource: 'quran',
        customMessages: [],
        customMessageOrder: 'random',
        lastCustomMessageIndex: 0,
        salahAware: true,
        salahBuffer: 10,
    });
    const [mode, setMode] = useState('pomodoro');
    const [time, setTime] = useState(settings.pomodoro * 60);
    const [isActive, setIsActive] = useState(false);
    const [pomodorosInSession, setPomodorosInSession] = useState(0);
    const [quote, setQuote] = useState(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [urgentTasks, setUrgentTasks] = useState([]);
    const [salahAwareModal, setSalahAwareModal] = useState({ isOpen: false, message: '', onConfirm: null });
    const [twoMinTimer, setTwoMinTimer] = useState({ active: false, time: 120 });

    const audioRef = useRef(null);

    // Fetch settings and tasks from Firestore
    useEffect(() => {
        if (!userId) return;
        
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const newSettings = docSnap.data();
                setSettings(prev => ({...prev, ...newSettings}));
                if (!isActive) {
                    setTime((newSettings.pomodoro || 25) * 60);
                }
            }
        });

        const tasksDocRef = doc(db, `artifacts/${appId}/users/${userId}/eisenhower/tasks`);
        const unsubscribeTasks = onSnapshot(tasksDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const allTasks = docSnap.data();
                setUrgentTasks(allTasks.q1 || []);
            } else {
                setUrgentTasks([]);
            }
        });

        return () => {
            unsubscribeSettings();
            unsubscribeTasks();
        };
    }, [userId]);
    
    // Update timer when mode changes
    useEffect(() => {
        if (!isActive) {
            setTime((settings[mode] || 25) * 60);
        }
    }, [mode, settings, isActive]);

    // Main Timer logic
    useEffect(() => {
        let interval = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(t => t - 1);
            }, 1000);
        } else if (isActive && time === 0) {
            handleTimerEnd();
        }
        return () => clearInterval(interval);
    }, [isActive, time]);

    // 2-Minute Rule Timer Logic
    useEffect(() => {
        let interval = null;
        if (twoMinTimer.active && twoMinTimer.time > 0) {
            interval = setInterval(() => {
                setTwoMinTimer(prev => ({ ...prev, time: prev.time - 1 }));
            }, 1000);
        } else if (twoMinTimer.active && twoMinTimer.time === 0) {
            if(audioRef.current) audioRef.current.play();
            setTwoMinTimer({ active: false, time: 120 });
        }
        return () => clearInterval(interval);
    }, [twoMinTimer.active, twoMinTimer.time]);

    const showEndSessionMessage = useCallback(async () => {
        if (!settings.showEndSessionMessage) return;

        setIsQuoteModalOpen(true);
        setQuote(null);
        setIsQuoteLoading(true);

        if (settings.endSessionMessageSource === 'quran') {
            try {
                const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;
                const response = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyahNumber}/en.asad`);
                const data = await response.json();
                if (data.code === 200) {
                    setQuote({
                        text: data.data.text,
                        ref: `Surah ${data.data.surah.englishName}, ${data.data.surah.number}:${data.data.numberInSurah}`
                    });
                } else { throw new Error("API error"); }
            } catch (error) {
                console.error("Error fetching Quran verse:", error);
                setQuote(null);
            }
        } else if (settings.endSessionMessageSource === 'custom') {
            const messages = settings.customMessages || [];
            if (messages.length > 0) {
                let messageToShow;
                if (settings.customMessageOrder === 'random') {
                    messageToShow = messages[Math.floor(Math.random() * messages.length)];
                } else { // Sequential
                    const currentIndex = settings.lastCustomMessageIndex || 0;
                    messageToShow = messages[currentIndex];
                    const nextIndex = (currentIndex + 1) % messages.length;
                    const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
                    await updateDoc(settingsDocRef, { lastCustomMessageIndex: nextIndex });
                }
                setQuote({ text: messageToShow, ref: "Custom Message" });
            } else {
                 setQuote(null); // No custom messages available
            }
        }
        setIsQuoteLoading(false);
    }, [settings, userId, appId]);

    const handleTimerEnd = useCallback(async () => {
        setIsActive(false);
        if (audioRef.current) audioRef.current.play();

        const completedMode = mode;
        let nextMode = 'pomodoro';
        let updatedPomodoros = pomodorosInSession;

        if (completedMode === 'pomodoro') {
            updatedPomodoros++;
            setPomodorosInSession(updatedPomodoros);
            nextMode = updatedPomodoros % 4 === 0 ? 'longBreak' : 'shortBreak';
            await checkAndGrantPomodoroAchievements(updatedPomodoros);
        } else {
            if (completedMode === 'longBreak') {
                setPomodorosInSession(0); // Reset session after a long break
            }
            nextMode = 'pomodoro';
            await checkAndGrantBreakAchievements(completedMode);
        }
        
        if (userId) {
            const logCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/log`);
            await addDoc(logCollectionRef, {
                type: completedMode,
                duration: settings[completedMode],
                completedAt: serverTimestamp(),
            });
        }
        
        switchMode(nextMode);
        showEndSessionMessage();

    }, [mode, pomodorosInSession, settings, userId, showEndSessionMessage]);

    const getAchievementsDoc = async () => {
        if (!userId) return { currentAchievements: [], ref: null };
        const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/main`);
        const docSnap = await getDoc(achievementsDocRef);
        return {
            currentAchievements: docSnap.exists() ? docSnap.data().unlocked : [],
            ref: achievementsDocRef
        };
    };
    
    const checkAndGrantBreakAchievements = async (completedMode) => {
        const { currentAchievements, ref } = await getAchievementsDoc();
        if (currentAchievements.includes('break_champion')) return;

        const logCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/log`);
        const shortBreakQuery = query(logCollectionRef, where("type", "==", "shortBreak"));
        const longBreakQuery = query(logCollectionRef, where("type", "==", "longBreak"));
        
        const shortBreakSnapshot = await getDocs(shortBreakQuery);
        const longBreakSnapshot = await getDocs(longBreakQuery);

        const hasShortBreak = !shortBreakSnapshot.empty || completedMode === 'shortBreak';
        const hasLongBreak = !longBreakSnapshot.empty || completedMode === 'longBreak';

        if (hasShortBreak && hasLongBreak) {
            await setDoc(ref, { unlocked: [...currentAchievements, 'break_champion'] }, { merge: true });
        }
    };
    
    const checkAndGrantTaskAchievements = async (currentTasks) => {
        const { currentAchievements, ref } = await getAchievementsDoc();
        
        let newAchievements = new Set();
        let totalCompleted = 0;
        Object.values(currentTasks).flat().forEach(task => {
            if(task && task.completed) totalCompleted++;
        });

        if (totalCompleted >= 1 && !currentAchievements.includes('first_task')) newAchievements.add('first_task');
        if (totalCompleted >= 10 && !currentAchievements.includes('ten_tasks')) newAchievements.add('ten_tasks');
        
        if (newAchievements.size > 0) {
             await setDoc(ref, { unlocked: [...currentAchievements, ...newAchievements] }, { merge: true });
        }
    };

    const handleToggleUrgentTask = async (taskToToggle) => {
        if (!userId) return;
        const tasksDocRef = doc(db, `artifacts/${appId}/users/${userId}/eisenhower/tasks`);
        const docSnap = await getDoc(tasksDocRef);

        if (docSnap.exists()) {
            const allTasks = docSnap.data();
            const updatedQ1 = (allTasks.q1 || []).map(task => 
                task.id === taskToToggle.id ? { ...task, completed: !task.completed } : task
            );
            const newTasks = { ...allTasks, q1: updatedQ1 };
            await setDoc(tasksDocRef, newTasks);

            if (!taskToToggle.completed) {
                checkAndGrantTaskAchievements(newTasks);
            }
        }
    };

    const checkAndGrantPomodoroAchievements = async (sessionCount) => {
        const { currentAchievements, ref } = await getAchievementsDoc();
        
        const logCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/log`);
        const q = query(logCollectionRef, where("type", "==", "pomodoro"));
        const querySnapshot = await getDocs(q);
        const totalPomodoros = querySnapshot.size + 1;

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        let newAchievements = new Set();
        if (totalPomodoros >= 1 && !currentAchievements.includes('first_pomodoro')) newAchievements.add('first_pomodoro');
        if (totalPomodoros >= 10 && !currentAchievements.includes('ten_pomodoros')) newAchievements.add('ten_pomodoros');
        if (totalPomodoros >= 50 && !currentAchievements.includes('fifty_pomodoros')) newAchievements.add('fifty_pomodoros');
        if (totalPomodoros >= 100 && !currentAchievements.includes('hundred_pomodoros')) newAchievements.add('hundred_pomodoros');
        if (sessionCount === 4 && !currentAchievements.includes('marathon_runner')) newAchievements.add('marathon_runner');
        if (sessionCount === 8 && !currentAchievements.includes('unstoppable')) newAchievements.add('unstoppable');
        if (hour < 8 && !currentAchievements.includes('early_bird')) newAchievements.add('early_bird');
        if (hour >= 22 && !currentAchievements.includes('night_owl')) newAchievements.add('night_owl');
        if ((day === 0 || day === 6) && !currentAchievements.includes('weekend_warrior')) newAchievements.add('weekend_warrior');
        
        if (newAchievements.size > 0) {
            await setDoc(ref, { unlocked: [...currentAchievements, ...newAchievements] }, { merge: true });
        }
    };

    const startTimer = (durationInSeconds) => {
        setTime(durationInSeconds);
        setIsActive(true);
    };

    const handleStartClick = async () => {
        if (mode !== 'pomodoro' || !settings.salahAware || !settings.city || !settings.country) {
            startTimer(settings[mode] * 60);
            return;
        }

        try {
            const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${settings.city}&country=${settings.country}&method=${settings.prayerMethod}`);
            const data = await response.json();
            if (data.code !== 200) throw new Error("Could not fetch prayer times.");

            const now = new Date();
            const timings = data.data.timings;
            const mainPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

            const prayerTimesToday = Object.entries(timings)
                .filter(([name]) => mainPrayers.includes(name))
                .map(([name, time]) => {
                    const [hour, minute] = time.split(':');
                    const prayerDate = new Date();
                    prayerDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
                    return { name, time: prayerDate };
                })
                .filter(p => p.time > now) // Only consider future prayers
                .sort((a, b) => a.time - b.time);

            if (prayerTimesToday.length === 0) {
                startTimer(settings.pomodoro * 60); // No more prayers today, start normally
                return;
            }

            const nextPrayer = prayerTimesToday[0];
            const minutesUntilNextPrayer = Math.floor((nextPrayer.time - now) / 60000);
            const buffer = settings.salahBuffer || 5;

            if (minutesUntilNextPrayer <= buffer) {
                setSalahAwareModal({
                    isOpen: true,
                    message: `It's almost time for ${nextPrayer.name}. Too close to start a new session.`,
                    onConfirm: null
                });
            } else if (minutesUntilNextPrayer < settings.pomodoro) {
                setSalahAwareModal({
                    isOpen: true,
                    message: `${nextPrayer.name} is in ${minutesUntilNextPrayer} minutes. Start a shorter ${minutesUntilNextPrayer}-minute session?`,
                    onConfirm: () => {
                        startTimer(minutesUntilNextPrayer * 60);
                        setSalahAwareModal({ isOpen: false, message: '', onConfirm: null });
                    }
                });
            } else {
                startTimer(settings.pomodoro * 60);
            }

        } catch (error) {
            console.error("Salah-aware check failed:", error);
            startTimer(settings.pomodoro * 60); // Fallback to normal start
        }
    };

    const toggleTimer = () => {
        if (isActive) {
            setIsActive(false);
        } else {
            handleStartClick();
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setTime(settings[mode] * 60);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setIsActive(false);
    };
    
    const handleStartTwoMinRule = () => {
        setTwoMinTimer({ active: true, time: 120 });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const modes = [
        { id: 'pomodoro', label: 'Pomodoro' },
        { id: 'shortBreak', label: 'Short Break' },
        { id: 'longBreak', label: 'Long Break' },
    ];

    return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8">
            <SalahAwareModal 
                isOpen={salahAwareModal.isOpen} 
                onClose={() => setSalahAwareModal({ isOpen: false, message: '', onConfirm: null })}
                onConfirm={salahAwareModal.onConfirm}
                message={salahAwareModal.message}
            />
            <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} quote={quote} isLoading={isQuoteLoading} />
            {twoMinTimer.active && <TwoMinuteRuleTimer time={twoMinTimer.time} onClose={() => setTwoMinTimer({ active: false, time: 120 })} />}
            <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto" />
            <div className="flex space-x-2 mb-8">
                {modes.map(m => (
                    <button
                        key={m.id}
                        onClick={() => switchMode(m.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            mode === m.id ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-200 dark:hover:bg-red-800'
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="text-gray-200 dark:text-gray-700" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                    <circle
                        className="text-red-500"
                        strokeWidth="7"
                        strokeDasharray={2 * Math.PI * 45}
                        strokeDashoffset={2 * Math.PI * 45 * (1 - time / ((settings[mode] || 25) * 60))}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="45"
                        cx="50"
                        cy="50"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div className="absolute text-5xl sm:text-6xl font-bold text-gray-800 dark:text-gray-100">
                    {formatTime(time)}
                </div>
            </div>
            <div className="flex space-x-4 mt-8">
                <button
                    onClick={toggleTimer}
                    className="flex items-center justify-center w-32 px-6 py-3 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:bg-red-600 transition-all transform hover:scale-105"
                >
                    {isActive ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
                    {isActive ? 'Pause' : 'Start'}
                </button>
                <button
                    onClick={resetTimer}
                    className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:scale-105"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
                <button
                    onClick={handleStartTwoMinRule}
                    className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:scale-105 flex items-center space-x-2"
                    title="Start 2-Minute Rule Timer"
                >
                    <Clock className="w-6 h-6" />
                    <span className="font-bold">2</span>
                </button>
            </div>
            <div className="mt-6 text-lg">
                Pomodoros this session: <span className="font-bold text-red-500">{pomodorosInSession}</span>
            </div>

            <div className="mt-8 w-full max-w-lg mx-auto p-4 border-t-2 border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-center mb-4">Today's Focus (Urgent & Important)</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {urgentTasks.length > 0 ? urgentTasks.map(task => (
                        <div key={task.id} className={`flex items-center p-3 rounded-md transition-colors ${task.completed ? 'bg-green-100 dark:bg-green-900 opacity-60' : 'bg-white dark:bg-gray-700 shadow-sm'}`}>
                            <input 
                                type="checkbox" 
                                checked={task.completed} 
                                onChange={() => handleToggleUrgentTask(task)} 
                                className="h-5 w-5 rounded text-red-500 focus:ring-red-500 border-gray-300 mr-3 cursor-pointer flex-shrink-0"
                            />
                            <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</span>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 italic">No urgent & important tasks. Add some in the Matrix!</p>
                    )}
                </div>
            </div>

            <PrayerTimes userId={userId} />
        </div>
    );
};

// --- Eisenhower Matrix Component ---
const EisenhowerMatrix = ({ userId }) => {
    const [tasks, setTasks] = useState({ q1: [], q2: [], q3: [], q4: [] });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [settings, setSettings] = useState({ logCompletedTasks: true });

    useEffect(() => {
        if (!userId) return;
        const tasksDocRef = doc(db, `artifacts/${appId}/users/${userId}/eisenhower/tasks`);
        const unsubscribeTasks = onSnapshot(tasksDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setTasks(docSnap.data());
            } else {
                setTasks({ q1: [], q2: [], q3: [], q4: [] });
            }
        });

        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(prev => ({...prev, ...docSnap.data()}));
            }
        });

        return () => {
            unsubscribeTasks();
            unsubscribeSettings();
        };
    }, [userId]);

    const getAchievementsDoc = async () => {
        if (!userId) return { currentAchievements: [], ref: null };
        const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/main`);
        const docSnap = await getDoc(achievementsDocRef);
        return {
            currentAchievements: docSnap.exists() ? docSnap.data().unlocked : [],
            ref: achievementsDocRef
        };
    };

    const saveTasks = async (newTasks) => {
        if (!userId) return;
        const tasksDocRef = doc(db, `artifacts/${appId}/users/${userId}/eisenhower/tasks`);
        await setDoc(tasksDocRef, newTasks);
    };

    const handleAddTask = (task) => {
        const newTasks = { ...tasks };
        if (!newTasks[task.quadrant]) newTasks[task.quadrant] = [];
        newTasks[task.quadrant].push({ ...task, id: crypto.randomUUID(), completed: false });
        saveTasks(newTasks);
        checkAndGrantMatrixAchievements(newTasks);
        setIsModalOpen(false);
    };

    const handleEditTask = (updatedTask) => {
        const newTasks = { ...tasks };
        let originalQuadrant = null;
        
        Object.keys(newTasks).forEach(q => {
             const taskIndex = (newTasks[q] || []).findIndex(t => t.id === updatedTask.id);
             if (taskIndex !== -1) originalQuadrant = q;
        });

        if(originalQuadrant && originalQuadrant !== updatedTask.quadrant) {
            const taskIndex = newTasks[originalQuadrant].findIndex(t => t.id === updatedTask.id);
            newTasks[originalQuadrant].splice(taskIndex, 1);
            if (!newTasks[updatedTask.quadrant]) newTasks[updatedTask.quadrant] = [];
            newTasks[updatedTask.quadrant].push(updatedTask);
        } else if (originalQuadrant) {
            const taskIndex = newTasks[originalQuadrant].findIndex(t => t.id === updatedTask.id);
            newTasks[originalQuadrant][taskIndex] = updatedTask;
        }

        saveTasks(newTasks);
        checkAndGrantMatrixAchievements(newTasks);
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleDeleteTask = (task) => {
        const newTasks = { ...tasks };
        const taskIndex = newTasks[task.quadrant].findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            newTasks[task.quadrant].splice(taskIndex, 1);
            saveTasks(newTasks);
        }
    };
    
    const handleToggleComplete = (task) => {
        const newTasks = { ...tasks };
        const taskRef = newTasks[task.quadrant].find(t => t.id === task.id);
        if (taskRef) {
            taskRef.completed = !taskRef.completed;
            saveTasks(newTasks);
            if(taskRef.completed) {
                if (settings.logCompletedTasks) {
                    const completedTasksRef = collection(db, `artifacts/${appId}/users/${userId}/completed_tasks`);
                    addDoc(completedTasksRef, {
                        ...taskRef,
                        completedAt: serverTimestamp(),
                    });
                }
                checkAndGrantTaskAchievements(newTasks, task);
            }
        }
    };

    const checkAndGrantMatrixAchievements = async (currentTasks) => {
        const { currentAchievements, ref } = await getAchievementsDoc();
        if (currentAchievements.includes('full_matrix')) return;

        const hasQ1 = currentTasks.q1?.length > 0;
        const hasQ2 = currentTasks.q2?.length > 0;
        const hasQ3 = currentTasks.q3?.length > 0;
        const hasQ4 = currentTasks.q4?.length > 0;

        if(hasQ1 && hasQ2 && hasQ3 && hasQ4) {
            await setDoc(ref, { unlocked: [...currentAchievements, 'full_matrix'] }, { merge: true });
        }
    };

    const checkAndGrantTaskAchievements = async (currentTasks, completedTask) => {
        const { currentAchievements, ref } = await getAchievementsDoc();
        
        let newAchievements = new Set();
        let totalCompleted = 0;
        Object.values(currentTasks).flat().forEach(task => {
            if(task.completed) totalCompleted++;
        });

        if (totalCompleted >= 1 && !currentAchievements.includes('first_task')) newAchievements.add('first_task');
        if (totalCompleted >= 10 && !currentAchievements.includes('ten_tasks')) newAchievements.add('ten_tasks');
        if (completedTask.quadrant === 'q3' && !currentAchievements.includes('delegator')) newAchievements.add('delegator');

        const allQ1Done = currentTasks.q1?.length > 0 && currentTasks.q1.every(t => t.completed);
        if (allQ1Done && !currentAchievements.includes('clear_q1')) newAchievements.add('clear_q1');

        const allQ2Done = currentTasks.q2?.length > 0 && currentTasks.q2.every(t => t.completed);
        if (allQ2Done && !currentAchievements.includes('clear_q2')) newAchievements.add('clear_q2');
        
        const allQ4Done = currentTasks.q4?.length > 0 && currentTasks.q4.every(t => t.completed);
        if (allQ4Done && !currentAchievements.includes('procrastinators_bane')) newAchievements.add('procrastinators_bane');

        const completedInQ1 = currentTasks.q1?.some(t => t.completed);
        const completedInQ2 = currentTasks.q2?.some(t => t.completed);
        const completedInQ3 = currentTasks.q3?.some(t => t.completed);
        const completedInQ4 = currentTasks.q4?.some(t => t.completed);
        if (completedInQ1 && completedInQ2 && completedInQ3 && completedInQ4 && !currentAchievements.includes('task_juggler')) {
            newAchievements.add('task_juggler');
        }

        if (newAchievements.size > 0) {
             await setDoc(ref, { unlocked: [...currentAchievements, ...newAchievements] }, { merge: true });
        }
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };
    
    const quadrants = [
        { id: 'q1', title: 'Urgent & Important', color: 'border-red-500' },
        { id: 'q2', title: 'Not Urgent & Important', color: 'border-blue-500' },
        { id: 'q3', title: 'Urgent & Not Important', color: 'border-yellow-500' },
        { id: 'q4', title: 'Not Urgent & Not Important', color: 'border-green-500' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Eisenhower Matrix</h2>
                <button
                    onClick={openAddModal}
                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add Task
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quadrants.map(quadrant => (
                    <div key={quadrant.id} className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border-t-4 ${quadrant.color}`}>
                        <h3 className="font-bold text-lg mb-3">{quadrant.title}</h3>
                        <div className="space-y-2 min-h-[50px]">
                            {tasks[quadrant.id] && tasks[quadrant.id].map(task => (
                                <div key={task.id} className={`flex items-center justify-between p-3 rounded-md transition-colors ${task.completed ? 'bg-green-100 dark:bg-green-900 opacity-60' : 'bg-white dark:bg-gray-700'}`}>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <input type="checkbox" checked={task.completed} onChange={() => handleToggleComplete(task)} className="h-5 w-5 rounded text-red-500 focus:ring-red-500 border-gray-300 mr-3 cursor-pointer flex-shrink-0" />
                                        <span className={`flex-1 truncate ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <div className="relative group">
                                            <Heart className={`w-4 h-4 transition-colors ${task.intention ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                            {task.intention && (
                                                <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    {task.intention}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => openEditModal(task)} className="text-gray-400 hover:text-blue-500"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTask(task)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {(!tasks[quadrant.id] || tasks[quadrant.id].length === 0) && <p className="text-sm text-gray-400 italic">No tasks here.</p>}
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    onSave={editingTask ? handleEditTask : handleAddTask}
                    task={editingTask}
                />
            )}
        </div>
    );
};

// --- Task Modal Component ---
const TaskModal = ({ isOpen, onClose, onSave, task }) => {
    const [text, setText] = useState(task ? task.text : '');
    const [quadrant, setQuadrant] = useState(task ? task.quadrant : 'q1');
    const [intention, setIntention] = useState(task ? task.intention || '' : '');

    useEffect(() => {
        if(task) {
            setText(task.text);
            setQuadrant(task.quadrant);
            setIntention(task.intention || '');
        } else {
            setText('');
            setQuadrant('q1');
            setIntention('');
        }
    }, [task]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave({ ...(task || {}), text, quadrant, intention });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{task ? 'Edit Task' : 'Add New Task'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="task-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task</label>
                        <input
                            id="task-text"
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700"
                            placeholder="What needs to be done?"
                        />
                    </div>
                     <div className="mb-4">
                        <label htmlFor="task-intention" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">My Intention (Niyyah)</label>
                        <input
                            id="task-intention"
                            type="text"
                            value={intention}
                            onChange={(e) => setIntention(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700"
                            placeholder="(Optional) e.g., To gain knowledge for Allah's sake"
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="task-quadrant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quadrant</label>
                        <select
                            id="task-quadrant"
                            value={quadrant}
                            onChange={(e) => setQuadrant(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700"
                        >
                            <option value="q1">Urgent & Important</option>
                            <option value="q2">Not Urgent & Important</option>
                            <option value="q3">Urgent & Not Important</option>
                            <option value="q4">Not Urgent & Not Important</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600">Save Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Achievements Component ---
const Achievements = ({ userId }) => {
    const [unlocked, setUnlocked] = useState([]);

    const allAchievements = {
        first_pomodoro: { icon: <Star className="w-8 h-8 text-yellow-400" />, title: "First Step", description: "Complete your first Pomodoro." },
        ten_pomodoros: { icon: <Award className="w-8 h-8 text-yellow-500" />, title: "Focused Mind", description: "Complete 10 Pomodoros." },
        fifty_pomodoros: { icon: <Trophy className="w-8 h-8 text-yellow-600" />, title: "Pomodoro Pro", description: "Complete 50 Pomodoros." },
        hundred_pomodoros: { icon: <ShieldCheck className="w-8 h-8 text-red-500" />, title: "Focus Grandmaster", description: "Complete 100 Pomodoros." },
        marathon_runner: { icon: <Zap className="w-8 h-8 text-blue-500" />, title: "Marathon Runner", description: "Complete 4 Pomodoros in a single session." },
        unstoppable: { icon: <ChevronsUp className="w-8 h-8 text-blue-600" />, title: "Unstoppable", description: "Complete 8 Pomodoros in a single session." },
        early_bird: { icon: <Sunrise className="w-8 h-8 text-orange-400" />, title: "Early Bird", description: "Complete a Pomodoro before 8 AM." },
        night_owl: { icon: <Moon className="w-8 h-8 text-indigo-400" />, title: "Night Owl", description: "Complete a Pomodoro after 10 PM." },
        weekend_warrior: { icon: <CalendarDays className="w-8 h-8 text-purple-500" />, title: "Weekend Warrior", description: "Complete a Pomodoro on a weekend." },
        break_champion: { icon: <Coffee className="w-8 h-8 text-amber-600" />, title: "Break Champion", description: "Take both a short and a long break." },
        first_task: { icon: <CheckCircle className="w-8 h-8 text-green-500" />, title: "Task Initiator", description: "Complete your first task." },
        ten_tasks: { icon: <Target className="w-8 h-8 text-green-600" />, title: "Task Master", description: "Complete 10 tasks." },
        clear_q1: { icon: <CheckCircle className="w-8 h-8 text-red-500" />, title: "Crisis Averted", description: "Clear all Urgent & Important tasks." },
        clear_q2: { icon: <CheckCircle className="w-8 h-8 text-blue-500" />, title: "Planner", description: "Clear all Not Urgent & Important tasks." },
        delegator: { icon: <UserMinus className="w-8 h-8 text-yellow-500" />, title: "Delegator", description: "Complete a task from the 'Delegate' quadrant." },
        procrastinators_bane: { icon: <Trash2 className="w-8 h-8 text-gray-500" />, title: "Procrastinator's Bane", description: "Clear all tasks from the 'Delete' quadrant." },
        task_juggler: { icon: <ClipboardCheck className="w-8 h-8 text-teal-500" />, title: "Task Juggler", description: "Complete at least one task from every quadrant." },
        full_matrix: { icon: <LayoutGrid className="w-8 h-8 text-sky-500" />, title: "Full Matrix", description: "Have at least one task in every quadrant." },
        personalizer: { icon: <SlidersHorizontal className="w-8 h-8 text-gray-500" />, title: "Personalizer", description: "Customize your timer settings." },
    };

    useEffect(() => {
        if (!userId) return;
        const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/main`);
        const unsubscribe = onSnapshot(achievementsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUnlocked(docSnap.data().unlocked || []);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(allAchievements).map(([id, achievement]) => (
                    <div
                        key={id}
                        className={`p-4 rounded-lg flex items-center space-x-4 transition-all duration-300 ${
                            unlocked.includes(id) 
                            ? 'bg-green-100 dark:bg-green-900 border-l-4 border-green-500' 
                            : 'bg-gray-100 dark:bg-gray-700 opacity-60'
                        }`}
                    >
                        <div className={`p-2 rounded-full ${unlocked.includes(id) ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}`}>
                            {achievement.icon}
                        </div>
                        <div>
                            <h3 className="font-bold">{achievement.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Log Component ---
const Log = ({ userId }) => {
    const [log, setLog] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('sessions');
    const [settings, setSettings] = useState({ reviewLogPassword: null });
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [expandedIntention, setExpandedIntention] = useState(null);

    useEffect(() => {
        if (!userId) return;
        
        const logCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/log`);
        const qLog = query(logCollectionRef);
        const unsubscribeLog = onSnapshot(qLog, (querySnapshot) => {
            const logData = [];
            querySnapshot.forEach((doc) => logData.push({ id: doc.id, ...doc.data() }));
            logData.sort((a, b) => (b.completedAt?.toDate() || 0) - (a.completedAt?.toDate() || 0));
            setLog(logData);
        });

        const reviewsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/daily_reviews`);
        const qReviews = query(reviewsCollectionRef);
        const unsubscribeReviews = onSnapshot(qReviews, (querySnapshot) => {
            const reviewsData = [];
            querySnapshot.forEach((doc) => reviewsData.push({ id: doc.id, ...doc.data() }));
            reviewsData.sort((a, b) => (b.date?.toDate() || 0) - (a.date?.toDate() || 0));
            setReviews(reviewsData);
        });
        
        const completedTasksRef = collection(db, `artifacts/${appId}/users/${userId}/completed_tasks`);
        const qTasks = query(completedTasksRef);
        const unsubscribeTasks = onSnapshot(qTasks, (querySnapshot) => {
            const taskData = [];
            querySnapshot.forEach((doc) => taskData.push({ id: doc.id, ...doc.data() }));
            taskData.sort((a, b) => (b.completedAt?.toDate() || 0) - (a.completedAt?.toDate() || 0));
            setCompletedTasks(taskData);
        });

        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const newSettings = docSnap.data();
                setSettings(newSettings);
                if (!newSettings.reviewLogPassword) {
                    setIsUnlocked(true);
                }
            } else {
                 setIsUnlocked(true); // No password set, so it's unlocked
            }
        });

        return () => {
            unsubscribeLog();
            unsubscribeReviews();
            unsubscribeSettings();
            unsubscribeTasks();
        };
    }, [userId]);
    
    const handleUnlock = () => {
        try {
            if (btoa(passwordInput) === settings.reviewLogPassword) {
                setIsUnlocked(true);
                setPasswordError('');
            } else {
                setPasswordError('Incorrect password.');
            }
        } catch (e) {
            setPasswordError('An error occurred during verification.');
        }
    };

    const getLogIcon = (type) => {
        switch(type) {
            case 'pomodoro': return <Zap className="w-5 h-5 text-red-500" />;
            case 'shortBreak': return <Coffee className="w-5 h-5 text-blue-500" />;
            case 'longBreak': return <Coffee className="w-5 h-5 text-green-500" />;
            default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
        }
    };
    
    const tabs = [
        { id: 'sessions', label: 'Session Log' },
        { id: 'tasks', label: 'Task Log' },
        { id: 'reviews', label: 'Daily Journal' },
    ];

    return (
        <div>
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 font-semibold ${activeTab === tab.id ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-500'}`}>{tab.label}</button>
                ))}
            </div>

            {activeTab === 'sessions' && (
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {log.length > 0 ? log.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                                {getLogIcon(entry.type)}
                                <p>
                                    <span className="font-semibold capitalize">{entry.type.replace('Break', ' Break')}</span>
                                    <span className="text-gray-500 dark:text-gray-400"> - {entry.duration} minutes</span>
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {entry.completedAt ? new Date(entry.completedAt.toDate()).toLocaleString() : 'Just now'}
                            </p>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 italic">No sessions logged yet.</p>
                    )}
                </div>
            )}
            
            {activeTab === 'tasks' && (
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {completedTasks.length > 0 ? completedTasks.map((task, index) => (
                        <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <p>{task.text}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-400">{task.completedAt ? new Date(task.completedAt.toDate()).toLocaleDateString() : ''}</p>
                                    {task.intention && (
                                        <button onClick={() => setExpandedIntention(expandedIntention === index ? null : index)}>
                                            <Heart className="w-5 h-5 text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {expandedIntention === index && task.intention && (
                                <p className="mt-2 p-2 text-sm bg-red-50 dark:bg-red-900/20 rounded-md border-l-4 border-red-500">
                                    <span className="font-semibold">Intention:</span> {task.intention}
                                </p>
                            )}
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 italic">No completed tasks logged. Enable it in settings!</p>
                    )}
                </div>
            )}

            {activeTab === 'reviews' && (
                !isUnlocked ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <Lock className="w-12 h-12 text-gray-400 mb-4"/>
                        <h3 className="text-lg font-semibold">Journal Locked</h3>
                        <p className="text-gray-500 mb-4">Please enter your password to view your daily reviews.</p>
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                placeholder="Password"
                            />
                            <button onClick={handleUnlock} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Unlock</button>
                        </div>
                        {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
                    </div>
                ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {reviews.length > 0 ? reviews.map(review => (
                            <div key={review.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="font-semibold text-sm text-red-500">{review.date ? new Date(review.date.toDate()).toLocaleDateString() : 'Recent'}</p>
                                <p className="mt-2 whitespace-pre-wrap">{review.reviewText}</p>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 italic">No daily reviews yet. Use the 'End Day' button to add one.</p>
                        )}
                    </div>
                )
            )}
        </div>
    );
};

// --- Settings Component ---
const SettingsComponent = ({ userId }) => {
    const [settings, setSettings] = useState({ 
        pomodoro: 25, 
        shortBreak: 5, 
        longBreak: 15, 
        city: '', 
        country: '',
        prayerMethod: '2',
        showEndSessionMessage: false,
        endSessionMessageSource: 'quran',
        customMessages: [],
        customMessageOrder: 'random',
        lastCustomMessageIndex: 0,
        reviewLogPassword: null,
        salahAware: true,
        salahBuffer: 10,
        logCompletedTasks: false,
    });
    const [status, setStatus] = useState('');
    const [customMessageInput, setCustomMessageInput] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState('');

    const prayerMethods = {
        '1': 'University of Islamic Sciences, Karachi',
        '2': 'Islamic Society of North America (ISNA)',
        '3': 'Muslim World League',
        '4': 'Umm Al-Qura University, Makkah',
        '5': 'Egyptian General Authority of Survey',
        '7': 'Institute of Geophysics, University of Tehran',
        '8': 'Gulf Region',
        '9': 'Kuwait',
        '10': 'Qatar',
        '11': 'Majlis Ugama Islam Singapura, Singapore',
        '12': 'Union Organization Islamic de France',
        '13': 'Diyanet İşleri Başkanlığı, Turkey',
        '14': 'Spiritual Administration of Muslims of Russia',
    };

    // Fetch user settings from Firestore
    useEffect(() => {
        if (!userId) return;
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        });
        return () => unsubscribe();
    }, [userId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        if (name === 'pomodoro' || name === 'shortBreak' || name === 'longBreak' || name === 'salahBuffer') {
            const numericValue = value === '' ? '' : parseInt(value, 10);
            if (!isNaN(numericValue)) {
                 setSettings(prev => ({ ...prev, [name]: numericValue }));
            }
        } else {
             setSettings(prev => ({ ...prev, [name]: val }));
        }
    };

    const handleAddCustomMessage = () => {
        if (customMessageInput.trim() === '') return;
        const newMessages = [...(settings.customMessages || []), customMessageInput.trim()];
        setSettings(prev => ({...prev, customMessages: newMessages}));
        setCustomMessageInput('');
    };

    const handleDeleteCustomMessage = (indexToDelete) => {
        const newMessages = (settings.customMessages || []).filter((_, index) => index !== indexToDelete);
        setSettings(prev => ({...prev, customMessages: newMessages}));
    };

    const handlePasswordSave = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordStatus('Passwords do not match.');
            setTimeout(() => setPasswordStatus(''), 3000);
            return;
        }
        
        try {
            const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
            const passwordToSave = newPassword ? btoa(newPassword) : null;
            await updateDoc(settingsDocRef, { reviewLogPassword: passwordToSave });
            setPasswordStatus(newPassword ? 'Password set successfully.' : 'Password removed.');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordStatus(''), 3000);
        } catch (error) {
            setPasswordStatus('Error saving password.');
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
        try {
            const settingsToSave = {
                ...settings,
                pomodoro: Number(settings.pomodoro) || 25,
                shortBreak: Number(settings.shortBreak) || 5,
                longBreak: Number(settings.longBreak) || 15,
                salahBuffer: Number(settings.salahBuffer) || 10,
            };
            await setDoc(settingsDocRef, settingsToSave, { merge: true });
            setStatus('Settings saved successfully!');
            checkAndGrantSettingsAchievements();
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            setStatus('Error saving settings.');
            console.error("Error saving settings: ", error);
        }
    };

    const checkAndGrantSettingsAchievements = async () => {
        if (!userId) return;
        const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/main`);
        const docSnap = await getDoc(achievementsDocRef);
        const currentAchievements = docSnap.exists() ? docSnap.data().unlocked : [];

        if (!currentAchievements.includes('personalizer')) {
            await setDoc(achievementsDocRef, { unlocked: [...currentAchievements, 'personalizer'] }, { merge: true });
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="space-y-6 max-w-lg mx-auto">
                {/* General Productivity */}
                <div className="p-4 border rounded-lg dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">General Productivity</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="pomodoro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pomodoro (minutes)</label>
                            <input type="number" id="pomodoro" name="pomodoro" value={settings.pomodoro} onChange={handleChange} min="1" max="120" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="shortBreak" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short Break (minutes)</label>
                            <input type="number" id="shortBreak" name="shortBreak" value={settings.shortBreak} onChange={handleChange} min="1" max="120" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="longBreak" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Long Break (minutes)</label>
                            <input type="number" id="longBreak" name="longBreak" value={settings.longBreak} onChange={handleChange} min="1" max="120" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                         <div className="flex items-center pt-2">
                            <input id="logCompletedTasks" name="logCompletedTasks" type="checkbox" checked={settings.logCompletedTasks} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                            <label htmlFor="logCompletedTasks" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Log completed tasks to the "Task Log"</label>
                        </div>
                    </div>
                </div>

                {/* Spiritual Integration */}
                <div className="p-4 border rounded-lg dark:border-gray-700">
                     <h3 className="text-lg font-semibold mb-4">Spiritual Integration</h3>
                     <div className="space-y-4">
                        {/* Salah-Aware Scheduling */}
                         <div className="flex items-center">
                            <input id="salahAware" name="salahAware" type="checkbox" checked={settings.salahAware} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                            <label htmlFor="salahAware" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Enable smart scheduling around prayer times</label>
                        </div>
                        {settings.salahAware && (
                             <div>
                                <label htmlFor="salahBuffer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pre-Prayer Buffer (minutes)</label>
                                <input type="number" id="salahBuffer" name="salahBuffer" value={settings.salahBuffer} onChange={handleChange} min="1" max="60" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                                <p className="text-xs text-gray-500 mt-1">Don't suggest new sessions if a prayer is within this many minutes.</p>
                            </div>
                        )}
                        {/* Prayer Times Location */}
                        <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                            <input type="text" id="country" name="country" value={settings.country || ''} onChange={handleChange} placeholder="e.g., United Kingdom" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                            <input type="text" id="city" name="city" value={settings.city || ''} onChange={handleChange} placeholder="e.g., London" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="prayerMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calculation Method</label>
                            <select id="prayerMethod" name="prayerMethod" value={settings.prayerMethod} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                                {Object.entries(prayerMethods).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>
                         {/* End of Session Message */}
                        <div className="flex items-center pt-2">
                            <input id="showEndSessionMessage" name="showEndSessionMessage" type="checkbox" checked={settings.showEndSessionMessage} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                            <label htmlFor="showEndSessionMessage" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Show message at the end of a session</label>
                        </div>
                        {settings.showEndSessionMessage && (
                            <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Message Source:</p>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <input id="sourceQuran" name="endSessionMessageSource" type="radio" value="quran" checked={settings.endSessionMessageSource === 'quran'} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                        <label htmlFor="sourceQuran" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Random Quranic Verse</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input id="sourceCustom" name="endSessionMessageSource" type="radio" value="custom" checked={settings.endSessionMessageSource === 'custom'} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                        <label htmlFor="sourceCustom" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Custom Messages</label>
                                    </div>
                                </div>
                                {settings.endSessionMessageSource === 'custom' && (
                                    <div className="mt-4 pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                                        <div className="flex gap-2">
                                            <input type="text" value={customMessageInput} onChange={(e) => setCustomMessageInput(e.target.value)} placeholder="Add a custom message" className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                                            <button onClick={handleAddCustomMessage} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"><Plus className="w-5 h-5"/></button>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Messages:</p>
                                            <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                                {(settings.customMessages || []).map((msg, index) => (
                                                    <li key={index} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                                        <span className="text-sm">{msg}</span>
                                                        <button onClick={() => handleDeleteCustomMessage(index)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                    </li>
                                                ))}
                                                {(settings.customMessages || []).length === 0 && <p className="text-xs italic text-gray-500">No custom messages yet.</p>}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Order:</p>
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center">
                                                    <input id="orderRandom" name="customMessageOrder" type="radio" value="random" checked={settings.customMessageOrder === 'random'} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                                    <label htmlFor="orderRandom" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Random</label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input id="orderSequential" name="customMessageOrder" type="radio" value="sequential" checked={settings.customMessageOrder === 'sequential'} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                                    <label htmlFor="orderSequential" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Sequential</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </div>
                
                {/* Security & Privacy */}
                <div className="p-4 border rounded-lg dark:border-gray-700">
                     <h3 className="text-lg font-semibold mb-4">Security & Privacy</h3>
                     <div className="space-y-4">
                        <p className="text-sm text-gray-500">Set a password to lock your daily journal. Leave blank to remove the password.</p>
                        <div>
                            <label htmlFor="newPassword">New Password</label>
                            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
                        </div>
                        <button onClick={handlePasswordSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Set/Remove Password</button>
                        {passwordStatus && <p className="text-sm text-green-600">{passwordStatus}</p>}
                     </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors"
                    >
                        Save All Settings
                    </button>
                    {status && <p className="text-sm text-green-600 dark:text-green-400">{status}</p>}
                </div>
            </div>
        </div>
    );
};

// --- End Day Modal ---
const EndDayModal = ({ userId, onClose }) => {
    const [reviewText, setReviewText] = useState('');

    const handleSaveReview = async () => {
        if (!userId || reviewText.trim() === '') {
            onClose();
            return;
        }
        const reviewsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/daily_reviews`);
        await addDoc(reviewsCollectionRef, {
            reviewText: reviewText,
            date: serverTimestamp(),
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">End of Day Review</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Reflect on your day. What went well? What could be improved?</p>
                <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700"
                    placeholder="Write your thoughts here..."
                ></textarea>
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                    <button onClick={handleSaveReview} className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600">Save Review</button>
                </div>
            </div>
        </div>
    );
};


// --- Footer Component ---
const Footer = () => (
    <footer className="text-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with React & Firebase. Stay focused!
        </p>
    </footer>
);
