/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  BarChart3,
  Share2,
  XCircle,
  Info,
  Calendar,
  History,
  Trash2,
  LineChart,
  Zap,
  Trophy,
  Target
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

// --- Types ---

type Sport = 'Football' | 'Basketball' | 'Handball' | 'Autre';

type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'white' | 'purple' | 'rainbow';

interface ColorOption {
  id: ColorId;
  label: string;
  hex: string;
}

const COLORS: ColorOption[] = [
  { id: 'red', label: 'Rouge', hex: '#EF4444' },
  { id: 'blue', label: 'Bleu', hex: '#3B82F6' },
  { id: 'green', label: 'Vert', hex: '#22C55E' },
  { id: 'yellow', label: 'Jaune', hex: '#EAB308' },
  { id: 'black', label: 'Noir', hex: '#1F2937' },
  { id: 'white', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'purple', label: 'Violet', hex: '#A855F7' },
  { id: 'rainbow', label: 'Arc-en-ciel', hex: 'url(#rainbowGrad)' },
];

type EndMode = 'score' | 'time' | 'free';

interface MatchConfig {
  sport: Sport;
  colorA: ColorId;
  colorB: ColorId;
  ptsBase: number;
  ptsBonus: number;
  hasBonus: boolean;
  has3Pts?: boolean;
  endMode: EndMode;
  endValue: number;
  isProMode: boolean;
  isCommentaryActive: boolean;
  teamNameA?: string;
  teamNameB?: string;
  customColorA?: string;
  customColorB?: string;
}

interface TeamStats {
  score: number;
  shots: number;
  turnovers: number;
  possessions: number;
  bonuses: number;
  directRecoveries: number;
  totalDefenseTime: number;
  recoveryCount: number;
  // Basketball specific
  shots1?: number;
  shots2?: number;
  shots3?: number;
  goals1?: number;
  goals2?: number;
  goals3?: number;
}

interface MatchEvent {
  id: string;
  time: number;
  type: 'score' | 'shot' | 'turnover' | 'recovery' | 'possession';
  team: 'A' | 'B' | null;
  label: string;
  value?: number;
}

interface MatchData {
  id: string;
  A: TeamStats;
  B: TeamStats;
  duration: number; // in seconds
  lastPossessionChangeTime: number; // elapsed seconds at last change
  periods: number; // current period count
  sport: Sport;
  date: string;
  teamNameA?: string;
  teamNameB?: string;
  colorA: string;
  colorB: string;
  events: MatchEvent[];
  possession: 'A' | 'B' | null;
}

interface SavedMatch {
  id: string;
  date: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  data: MatchData;
}

// --- Components ---

const Jersey = ({ color, strokeWidth = 2, className = "", secondaryColor }: { color: string, strokeWidth?: number, className?: string, secondaryColor?: string }) => (
  <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-md ${className}`}>
    <defs>
      <linearGradient id="jerseyShine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="white" stopOpacity="0.15" />
        <stop offset="50%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.05" />
      </linearGradient>
      <clipPath id="modernJerseyClip">
        <path d="M25,25 C25,20 35,15 45,22 L55,22 C65,15 75,20 75,25 L85,30 C90,35 85,50 80,45 L72,40 L72,85 C72,92 28,92 28,85 L28,40 L20,45 C15,50 10,35 15,30 Z" />
      </clipPath>
    </defs>
    
    <path 
      d="M25,25 C25,20 35,15 45,22 L55,22 C65,15 75,20 75,25 L85,30 C90,35 85,50 80,45 L72,40 L72,85 C72,92 28,92 28,85 L28,40 L20,45 C15,50 10,35 15,30 Z" 
      fill={color} 
      stroke="#333" 
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />

    {secondaryColor && (
      <g clipPath="url(#modernJerseyClip)">
        <rect x="46" y="0" width="8" height="100" fill={secondaryColor} opacity="0.9" />
        <path d="M15,30 L25,25 M75,25 L85,30" stroke={secondaryColor} strokeWidth="4" opacity="0.3" />
      </g>
    )}

    <path 
      d="M42,22 C42,22 45,30 50,30 C55,30 58,22 58,22" 
      fill="none" 
      stroke="#333" 
      strokeWidth={strokeWidth} 
      opacity="0.2" 
    />

    <path 
      d="M25,25 C25,20 35,15 45,22 L55,22 C65,15 75,20 75,25 L85,30 C90,35 85,50 80,45 L72,40 L72,85 C72,92 28,92 28,85 L28,40 L20,45 C15,50 10,35 15,30 Z" 
      fill="url(#jerseyShine)"
    />
  </svg>
);

const PRO_TEAMS_FOOT = [
  { id: 'psg', name: 'PSG', color: '#004170', secondary: '#da291c' },
  { id: 'bayern', name: 'Bayern', color: '#ffffff', secondary: '#dc052d' },
  { id: 'mancity', name: 'Manchester City', color: '#6cabdd', secondary: '#ffffff' },
  { id: 'atletico', name: 'Atletico madrid', color: '#cb3524', secondary: '#ffffff' },
  { id: 'real', name: 'Real Madrid', color: '#ffffff', secondary: '#feba4f' },
  { id: 'barcelona', name: 'Barcelona', color: '#004d98', secondary: '#a50044' },
  { id: 'arsenal', name: 'Arsenal', color: '#ef0107', secondary: '#ef0107' },
  { id: 'sporting', name: 'Sporting CP', color: '#00805d', secondary: '#ffffff' },
  { id: 'chelsea', name: 'Chelsea', color: '#034694', secondary: '#ffffff' },
  { id: 'atalanta', name: 'Atalanta', color: '#1e2c50', secondary: '#000000' },
];

const PRO_TEAMS_BASKET = [
  { id: 'lakers', name: 'LA Lakers', color: '#552583', secondary: '#FDB927' },
  { id: 'celtics', name: 'Boston Celtics', color: '#007A33', secondary: '#ffffff' },
  { id: 'bulls', name: 'Chicago Bulls', color: '#CE1141', secondary: '#000000' },
  { id: 'warriors', name: 'GS Warriors', color: '#1D428A', secondary: '#FFC72C' },
  { id: 'knicks', name: 'NY Knicks', color: '#006BB6', secondary: '#F58426' },
  { id: 'heat', name: 'Miami Heat', color: '#98002E', secondary: '#F9A01B' },
  { id: 'suns', name: 'Phoenix Suns', color: '#1D1160', secondary: '#E56020' },
  { id: 'spurs', name: 'SA Spurs', color: '#000000', secondary: '#C4CED4' },
  { id: 'bucks', name: 'Milwaukee Bucks', color: '#00471B', secondary: '#EEE1C6' },
  { id: 'nuggets', name: 'Denver Nuggets', color: '#0E2240', secondary: '#FEC524' },
];

const PRO_TEAMS_HAND = [
  { id: 'magdeburg', name: 'SC Magdeburg', color: '#00843d', secondary: '#dc231b' },
  { id: 'barca_hb', name: 'Barça Handball', color: '#004d98', secondary: '#a50044' },
  { id: 'kiel', name: 'THW Kiel', color: '#ffffff', secondary: '#000000' },
  { id: 'veszprem', name: 'Veszprém HC', color: '#e30613', secondary: '#ffffff' },
  { id: 'kielce', name: 'Industria Kielce', color: '#ffde00', secondary: '#005596' },
  { id: 'montpellier', name: 'Montpellier HB', color: '#102141', secondary: '#ed6b00' },
  { id: 'aalborg', name: 'Aalborg Håndbold', color: '#e30613', secondary: '#ffffff' },
  { id: 'gog', name: 'GOG', color: '#ffcc00', secondary: '#e30613' },
];

export default function App() {
  const [step, setStep] = useState(1);
  const [showTeacherConfig, setShowTeacherConfig] = useState(false);
  const [teacherAuth, setTeacherAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [history, setHistory] = useState<SavedMatch[]>(() => {
    const saved = localStorage.getItem('eps_stats_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<MatchConfig>(() => {
    const savedProMode = localStorage.getItem('eps_stats_pro_mode');
    const savedCommentary = localStorage.getItem('eps_stats_commentary');
    return {
      sport: 'Football',
      colorA: 'red',
      colorB: 'blue',
      ptsBase: 1,
      ptsBonus: 1,
      hasBonus: false,
      has3Pts: true,
      endMode: 'free',
      endValue: 10,
      isProMode: savedProMode === 'true',
      isCommentaryActive: savedCommentary === 'true',
    };
  });

  useEffect(() => {
    localStorage.setItem('eps_stats_pro_mode', config.isProMode.toString());
    localStorage.setItem('eps_stats_commentary', config.isCommentaryActive.toString());
  }, [config.isProMode, config.isCommentaryActive]);

  const [matchData, setMatchData] = useState<MatchData>({
    id: '',
    A: { score: 0, shots: 0, turnovers: 0, possessions: 0, bonuses: 0, directRecoveries: 0, totalDefenseTime: 0, recoveryCount: 0, shots1: 0, shots2: 0, shots3: 0, goals1: 0, goals2: 0, goals3: 0 },
    B: { score: 0, shots: 0, turnovers: 0, possessions: 0, bonuses: 0, directRecoveries: 0, totalDefenseTime: 0, recoveryCount: 0, shots1: 0, shots2: 0, shots3: 0, goals1: 0, goals2: 0, goals3: 0 },
    duration: 0,
    lastPossessionChangeTime: 0,
    periods: 1,
    sport: 'Football',
    date: '',
    colorA: '',
    colorB: '',
    events: [],
    possession: null
  });

  const [matchHistory, setMatchHistory] = useState<MatchData[]>([]);

  const saveHistory = () => {
    setMatchHistory(prev => [JSON.parse(JSON.stringify(matchData)), ...prev].slice(0, 20));
  };

  const undo = () => {
    if (matchHistory.length === 0) return;
    const previous = matchHistory[0];
    setMatchData(previous);
    setMatchHistory(prev => prev.slice(1));
    setShowShotMenu(false);
    setShowGoalOverlay(false);
  };

  const addEvent = (type: MatchEvent['type'], team: 'A' | 'B' | null, label: string, value?: number) => {
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substr(2, 9),
      time: matchData.duration,
      type,
      team,
      label,
      value
    };
    setMatchData(prev => ({
      ...prev,
      events: [newEvent, ...prev.events]
    }));
  };

  const [basketValue, setBasketValue] = useState<number>(2);

  const [isRunning, setIsRunning] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [currentCommentary, setCurrentCommentary] = useState<{text: string, emoji: string} | null>(null);

  const getCommentaries = (type: 'goal' | 'miss' | 'turnover' | 'recovery' | 'start') => {
    const sport = config.sport;
    
    const general = {
      goal: [
        { text: "Quelle finition incroyable !", emoji: "🔥" },
        { text: "Précision chirurgicale !", emoji: "🎯" },
        { text: "C'est ça qu'on veut voir !", emoji: "👏" },
      ],
      miss: [
        { text: "Pas loin ! La prochaine sera la bonne.", emoji: "🤏" },
        { text: "C'était bien tenté, continue !", emoji: "🔄" },
      ],
      turnover: [
        { text: "Attention à tes passes !", emoji: "👀" },
        { text: "La défense a bien lu ton jeu.", emoji: "🛡️" },
      ],
      recovery: [
        { text: "Magnifique interception !", emoji: "⚡" },
        { text: "Balle récupérée, lance l'attaque !", emoji: "🚀" },
      ],
      start: [
        { text: "Allez, montrez-leur de quoi vous êtes capables !", emoji: "🏟️" },
        { text: "Un beau match s'annonce...", emoji: "⚖️" },
      ]
    };

    const specific = {
      Football: {
        goal: [{ text: "BUUUUT ! Quelle frappe !", emoji: "⚽" }, { text: "En plein dans la lucarne !", emoji: "🥅" }],
        miss: [{ text: "Ça frôle le poteau !", emoji: "🏃" }, { text: "Le gardien s'est bien INTERPOSÉ !", emoji: "🧤" }],
        turnover: [{ text: "Touche pour l'adversaire...", emoji: "🏳️" }, { text: "Hors-jeu ou simple perte ?", emoji: "🚩" }],
        recovery: [{ text: "Tacle glissé parfait !", emoji: "🛑" }, { text: "Contre-attaque éclair !", emoji: "🏃‍♂️" }]
      },
      Basketball: {
        goal: [{ text: "SWISH ! Quel shoot !", emoji: "🏀" }, { text: "ET UN PANIER ! Magnifique !", emoji: "🔥" }, { text: "DOWNTOWN !", emoji: "💣" }],
        miss: [{ text: "AIRBALL ! On se reconcentre !", emoji: "💨" }, { text: "Ça ressort du cercle...", emoji: "⭕" }],
        turnover: [{ text: "Reprise de dribble ou marcher ?", emoji: "👣" }, { text: "Mauvaise passe, interception !", emoji: "👐" }],
        recovery: [{ text: "REBOND OFFENSIF !", emoji: "📈" }, { text: "CONTRE MONSTRUEUX !", emoji: "🚫" }]
      },
      Handball: {
        goal: [{ text: "Roucoulette de génie !", emoji: "🤾" }, { text: "Pleine lucarne, imparable !", emoji: "💥" }],
        miss: [{ text: "Poteau sortant !", emoji: "🪵" }, { text: "Le gardien fait le mur !", emoji: "🧱" }],
        turnover: [{ text: "Faute offensive !", emoji: "⚠️" }, { text: "Balle perdue en zone...", emoji: "❌" }],
        recovery: [{ text: "Interception sur la ligne !", emoji: "🤚" }, { text: "Chabala anticipé !", emoji: "🧠" }]
      }
    };

    const sportSpecific = (specific as any)[sport] || {};
    const pool = [...(sportSpecific[type] || []), ...general[type]];
    return pool;
  };

  const triggerCommentary = (type: 'goal' | 'miss' | 'turnover' | 'recovery' | 'start') => {
    if (!config.isCommentaryActive) return;
    
    const chance = (type === 'goal' || type === 'start') ? 0.8 : 0.4;
    if (Math.random() > chance) return;

    const list = getCommentaries(type);
    const item = list[Math.floor(Math.random() * list.length)];
    setCurrentCommentary(item);

    setTimeout(() => {
      setCurrentCommentary(null);
    }, 4500);
  };
  const [showGoalOverlay, setShowGoalOverlay] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showShotMenu, setShowShotMenu] = useState(false);
  const [showEndPopup, setShowEndPopup] = useState(false);
  const [overtimeMode, setOvertimeMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Handlers ---

  const handleSportSelect = (sport: Sport) => {
    setConfig(prev => ({ 
      ...prev, 
      sport,
      ptsBase: sport === 'Basketball' ? 2 : 1
    }));
    setStep(2);
  };

  const handleColorChange = (team: 'A' | 'B', color: ColorId) => {
    setConfig(prev => ({
      ...prev,
      [team === 'A' ? 'colorA' : 'colorB']: color
    }));
  };

  const startMatch = () => {
    triggerCommentary('start');
    setMatchData({
      id: Math.random().toString(36).substr(2, 9),
      A: { score: 0, shots: 0, turnovers: 0, possessions: 0, bonuses: 0, directRecoveries: 0, totalDefenseTime: 0, recoveryCount: 0, shots1: 0, shots2: 0, shots3: 0, goals1: 0, goals2: 0, goals3: 0 },
      B: { score: 0, shots: 0, turnovers: 0, possessions: 0, bonuses: 0, directRecoveries: 0, totalDefenseTime: 0, recoveryCount: 0, shots1: 0, shots2: 0, shots3: 0, goals1: 0, goals2: 0, goals3: 0 },
      duration: config.endMode === 'time' ? config.endValue * 60 : 0,
      lastPossessionChangeTime: 0,
      periods: 1,
      sport: config.sport,
      date: new Date().toISOString(),
      teamNameA: config.teamNameA || 'Équipe A',
      teamNameB: config.teamNameB || 'Équipe B',
      colorA: getTeamColor('A'),
      colorB: getTeamColor('B'),
      events: [],
      possession: null
    });
    setMatchHistory([]);
    setIsRunning(false);
    setOvertimeMode(false);
    setShowEndPopup(false);
    setStep(4);
  };

  const stopMatch = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Save to history
    const savedMatch: SavedMatch = {
      id: matchData.id,
      date: new Date().toISOString(),
      sport: config.sport,
      teamA: config.teamNameA || 'Équipe A',
      teamB: config.teamNameB || 'Équipe B',
      scoreA: matchData.A.score,
      scoreB: matchData.B.score,
      data: matchData
    };
    
    const newHistory = [savedMatch, ...history].slice(0, 50); // Keep last 50
    setHistory(newHistory);
    localStorage.setItem('eps_stats_history', JSON.stringify(newHistory));
    
    setStep(5);
  };

  const handlePossession = (team: 'A' | 'B') => {
    const currentElapsed = config.endMode === 'time' ? (config.endValue * 60 - matchData.duration) : matchData.duration;
    
    if (matchData.possession !== team) {
      saveHistory();
      setMatchData(prev => {
        const defenseDuration = currentElapsed - prev.lastPossessionChangeTime;
        return {
          ...prev,
          [team]: { 
            ...prev[team], 
            possessions: prev[team].possessions + 1,
            totalDefenseTime: prev[team].totalDefenseTime + (matchData.possession ? defenseDuration : 0),
            recoveryCount: prev[team].recoveryCount + (matchData.possession ? 1 : 0)
          },
          lastPossessionChangeTime: currentElapsed,
          possession: team
        };
      });
      addEvent('possession', team, `Possession ${team === 'A' ? (config.teamNameA || 'A') : (config.teamNameB || 'B')}`);
    }
    if (!isRunning) {
      setIsRunning(true);
    }
  };

    const handleTurnover = () => {
      if (!matchData.possession) return;
      saveHistory();
      const currentElapsed = config.endMode === 'time' ? (config.endValue * 60 - matchData.duration) : matchData.duration;
      const nextTeam = matchData.possession === 'A' ? 'B' : 'A';
      const isDirect = !showShotMenu;

      if (isDirect) {
        triggerCommentary('turnover');
      } else {
        triggerCommentary('miss');
      }

      setMatchData(prev => {
      const defenseDuration = currentElapsed - prev.lastPossessionChangeTime;
      return {
        ...prev,
        [matchData.possession!]: { ...prev[matchData.possession!], turnovers: prev[matchData.possession!].turnovers + 1 },
        [nextTeam]: { 
          ...prev[nextTeam], 
          possessions: prev[nextTeam].possessions + 1,
          directRecoveries: isDirect ? prev[nextTeam].directRecoveries + 1 : prev[nextTeam].directRecoveries,
          totalDefenseTime: prev[nextTeam].totalDefenseTime + defenseDuration,
          recoveryCount: prev[nextTeam].recoveryCount + 1
        },
        lastPossessionChangeTime: currentElapsed,
        possession: nextTeam
      };
    });
    addEvent('turnover', matchData.possession, `Perte de balle ${matchData.possession === 'A' ? (config.teamNameA || 'A') : (config.teamNameB || 'B')}`);
    if (isDirect) {
      addEvent('recovery', nextTeam, `Récupération directe ${nextTeam === 'A' ? (config.teamNameA || 'A') : (config.teamNameB || 'B')}`);
    }
    setShowShotMenu(false);
  };

  const handleShot = () => {
    if (!matchData.possession) return;
    saveHistory();
    setMatchData(prev => ({
      ...prev,
      [matchData.possession!]: { ...prev[matchData.possession!], shots: prev[matchData.possession!].shots + 1 }
    }));
    addEvent('shot', matchData.possession, `Tir tenté ${matchData.possession === 'A' ? (config.teamNameA || 'A') : (config.teamNameB || 'B')}`);
    setShowShotMenu(true);
  };

    const handleGoal = (isBonus: boolean) => {
      if (!matchData.possession) return;
      saveHistory();
      triggerCommentary('goal');
      const currentElapsed = config.endMode === 'time' ? (config.endValue * 60 - matchData.duration) : matchData.duration;
    
    // For Basket, base points come from the chosen shot type (2 or 3)
    const basePts = config.sport === 'Basketball' ? basketValue : config.ptsBase;
    const pts = basePts + (isBonus ? config.ptsBonus : 0);
    const nextTeam = matchData.possession === 'A' ? 'B' : 'A';
    const scoringTeam = matchData.possession;

    setMatchData(prev => {
      const defenseDuration = currentElapsed - prev.lastPossessionChangeTime;
      const stats = prev[scoringTeam];
      
      const updatedStats = {
        ...stats,
        score: stats.score + pts,
        bonuses: isBonus ? stats.bonuses + 1 : stats.bonuses,
      };

      if (config.sport === 'Basketball') {
        if (basketValue === 1) updatedStats.goals1 = (stats.goals1 || 0) + 1;
        if (basketValue === 2) updatedStats.goals2 = (stats.goals2 || 0) + 1;
        if (basketValue === 3) updatedStats.goals3 = (stats.goals3 || 0) + 1;
      }

      return {
        ...prev,
        [scoringTeam]: updatedStats,
        [nextTeam]: { 
          ...prev[nextTeam], 
          possessions: prev[nextTeam].possessions + 1,
          totalDefenseTime: prev[nextTeam].totalDefenseTime + defenseDuration,
          recoveryCount: prev[nextTeam].recoveryCount + 1
        },
        lastPossessionChangeTime: currentElapsed,
        possession: nextTeam
      };
    });
    
    addEvent('score', scoringTeam, `Marque ${pts} pt${pts > 1 ? 's' : ''}${isBonus ? ' (Bonification)' : ''}`, pts);
    
    setShowGoalOverlay(false);
    setShowShotMenu(false);

    // Check end condition (score)
    if (config.endMode === 'score' && !overtimeMode) {
      const currentScore = matchData[scoringTeam].score + pts;
      if (currentScore >= config.endValue) {
        setIsRunning(false);
        setShowEndPopup(true);
      }
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setMatchData(prev => {
          if (config.endMode === 'time') {
            if (prev.duration <= 0 && !overtimeMode) {
              setIsRunning(false);
              setShowEndPopup(true);
              return prev;
            }
            return { ...prev, duration: prev.duration - 1 };
          } else {
            return { ...prev, duration: prev.duration + 1 };
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, config.endMode]);

  const formatTime = (seconds: number) => {
    const absSec = Math.abs(seconds);
    const m = Math.floor(absSec / 60).toString().padStart(2, '0');
    const s = (absSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getHex = (id: ColorId) => COLORS.find(c => c.id === id)?.hex || '#ccc';

  const getTeamColor = (team: 'A' | 'B') => {
    return (team === 'A' ? config.customColorA : config.customColorB) || getHex(team === 'A' ? config.colorA : config.colorB);
  };

  const getTeamSecondary = (team: 'A' | 'B') => {
    const name = team === 'A' ? config.teamNameA : config.teamNameB;
    if (config.isProMode && name) {
      if (config.sport === 'Football') return PRO_TEAMS_FOOT.find(t => t.name === name)?.secondary;
      if (config.sport === 'Basketball') return PRO_TEAMS_BASKET.find(t => t.name === name)?.secondary;
      if (config.sport === 'Handball') return PRO_TEAMS_HAND.find(t => t.name === name)?.secondary;
    }
    return undefined;
  };

  const getSportName = (sport: Sport) => {
    if (!config.isProMode) return sport;
    switch (sport) {
      case 'Football': return 'Ligue des Champions';
      case 'Basketball': return 'NBA';
      case 'Handball': return 'EHF European League';
      default: return sport;
    }
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === "Picon") {
      setTeacherAuth(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent/20">
      {/* Global SVG Defs */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF0000" />
            <stop offset="50%" stopColor="#FFFF00" />
            <stop offset="100%" stopColor="#0000FF" />
          </linearGradient>
        </defs>
      </svg>

      <div className={`mx-auto bg-white min-h-screen shadow-xl relative flex flex-col overflow-hidden ${step === 4 ? 'max-w-none w-full h-screen' : 'max-w-md'}`}>
        <AnimatePresence mode="wait">
          {/* Step 0: History */}
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex-1 flex flex-col bg-white overflow-y-auto"
            >
              <button onClick={() => setStep(1)} className="flex items-center text-accent font-black text-xs tracking-widest mb-6 hover:-translate-x-1 transition-transform uppercase">
                <ChevronLeft className="w-4 h-4" /> RETOUR
              </button>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black tracking-tighter uppercase">Historique</h2>
                {history.length > 0 && (
                  <button 
                    onClick={() => setIsClearingAll(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-danger hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" /> Vider tout
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isClearingAll && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-8 overflow-hidden"
                  >
                    <div className="bg-danger/5 border-2 border-danger/20 rounded-2xl p-6 text-center space-y-4">
                      <p className="text-[11px] font-bold text-danger uppercase tracking-wider">
                        Vider tout l'historique ?
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setHistory([]);
                            localStorage.removeItem('eps_stats_history');
                            setIsClearingAll(false);
                          }}
                          className="flex-1 bg-danger text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Oui, tout effacer
                        </button>
                        <button 
                          onClick={() => setIsClearingAll(false)}
                          className="flex-1 bg-white border border-border text-gray-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                  <History className="w-16 h-16 mb-4" />
                  <p className="font-black uppercase text-[10px] tracking-widest">Aucun match enregistré</p>
                </div>
              ) : (
              <div className="space-y-4">
                {history.map(match => (
                  <div key={match.id} className="relative group">
                    <button 
                      onClick={() => {
                        if (deletingMatchId === match.id) return;
                        setMatchData(match.data);
                        setConfig(prev => ({ ...prev, sport: match.sport }));
                        setStep(5);
                      }}
                      className={`w-full bg-white border border-border p-5 rounded-2xl text-left transition-all shadow-sm ${deletingMatchId === match.id ? 'opacity-50 blur-[1px]' : 'hover:border-accent group-hover:shadow-md'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                          {new Date(match.date).toLocaleDateString('fr-FR')} - {new Date(match.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="bg-bg text-accent px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">
                          {match.sport}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-center pr-4">
                          <p className="text-[10px] font-black uppercase truncate mb-1">{match.teamA}</p>
                          <p className="text-2xl font-black font-mono">{match.scoreA}</p>
                        </div>
                        <div className="text-gray-200 font-black italic">VS</div>
                        <div className="flex-1 text-center pl-4">
                          <p className="text-[10px] font-black uppercase truncate mb-1">{match.teamB}</p>
                          <p className="text-2xl font-black font-mono">{match.scoreB}</p>
                        </div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {deletingMatchId === match.id ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute inset-0 z-[110] bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center gap-3 border-2 border-danger/20 shadow-xl"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-danger">Supprimer cette séance ?</p>
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => {
                                const newHistory = history.filter(m => m.id !== match.id);
                                setHistory(newHistory);
                                localStorage.setItem('eps_stats_history', JSON.stringify(newHistory));
                                setDeletingMatchId(null);
                              }}
                              className="flex-1 bg-danger text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                            >
                              Oui, supprimer
                            </button>
                            <button 
                              onClick={() => setDeletingMatchId(null)}
                              className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                            >
                              Annuler
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingMatchId(match.id);
                          }}
                          className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-danger/20 rounded-full flex items-center justify-center text-danger opacity-100 md:opacity-0 group-hover:opacity-100 shadow-xl z-[100] hover:bg-danger hover:text-white transition-all active:scale-95"
                          title="Supprimer la séance"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Sport Selection */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex-1 flex flex-col bg-white"
            >
              <div className="flex justify-between items-start mb-2 mt-8">
                <h1 className="text-4xl font-black text-ink tracking-tighter">EPS Stats Pro</h1>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setStep(0)}
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                    title="Historique"
                  >
                    <History className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setShowTeacherConfig(true)}
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                  >
                    <Settings className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-10">Nouvelle séance d'observation</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['Football', 'Basketball', 'Handball', 'Autre'] as Sport[]).map(s => (
                  <button 
                    key={s}
                    onClick={() => handleSportSelect(s)}
                    className="p-6 border-2 border-border rounded-2xl flex flex-col items-center gap-3 hover:border-accent hover:bg-bg transition-all group shadow-sm"
                  >
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {s === 'Football' && '⚽'}
                      {s === 'Basketball' && '🏀'}
                      {s === 'Handball' && '🤾'}
                      {s === 'Autre' && '🏆'}
                    </span>
                    <span className="font-black text-ink uppercase text-[10px] tracking-widest text-center">{getSportName(s)}</span>
                  </button>
                ))}
              </div>

              {/* Teacher Config Modal */}
              <AnimatePresence>
                {showTeacherConfig && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-ink/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative"
                    >
                      <button 
                        onClick={() => {
                          setShowTeacherConfig(false);
                          setTeacherAuth(false);
                          setPassword("");
                          setAuthError(false);
                        }}
                        className="absolute top-6 right-6 text-gray-400 hover:text-ink"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>

                      {!teacherAuth ? (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Settings className="w-8 h-8 text-accent" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Espace Enseignant</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Veuillez vous identifier</p>
                          </div>

                          <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <motion.input 
                                animate={authError ? { x: [-10, 10, -10, 10, 0] } : {}}
                                type="password" 
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full p-4 border-2 rounded-xl font-bold bg-bg focus:border-accent outline-none transition-all ${authError ? 'border-danger' : 'border-border'}`}
                                autoFocus
                              />
                              {authError && (
                                <p className="text-danger text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Mot de passe incorrect
                                </p>
                              )}
                            </div>
                            <button 
                              type="submit"
                              className="w-full bg-ink text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-black transition-all"
                            >
                              Confirmer
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="text-center">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Configuration</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Options avancées</p>
                          </div>

                          <div className="bg-bg p-6 rounded-2xl border-2 border-border space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-black uppercase text-xs tracking-widest">Mode Pro</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Noms officiels des sports</p>
                              </div>
                              <button 
                                onClick={() => setConfig(prev => ({ ...prev, isProMode: !prev.isProMode }))}
                                className={`w-14 h-8 rounded-full transition-all relative ${config.isProMode ? 'bg-accent' : 'bg-gray-300'}`}
                              >
                                <motion.div 
                                  animate={{ x: config.isProMode ? 26 : 4 }}
                                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                                />
                              </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-border pt-4">
                              <div className="space-y-1">
                                <p className="font-black uppercase text-xs tracking-widest">Commentaires Live</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Réactions aléatoires pendant le jeu</p>
                              </div>
                              <button 
                                onClick={() => setConfig(prev => ({ ...prev, isCommentaryActive: !prev.isCommentaryActive }))}
                                className={`w-14 h-8 rounded-full transition-all relative ${config.isCommentaryActive ? 'bg-accent' : 'bg-gray-300'}`}
                              >
                                <motion.div 
                                  animate={{ x: config.isCommentaryActive ? 26 : 4 }}
                                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                                />
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setShowTeacherConfig(false);
                              setTeacherAuth(false);
                              setPassword("");
                            }}
                            className="w-full bg-success text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-600 transition-all"
                          >
                            Terminer
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 2: Color Selection */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex-1 flex flex-col bg-white"
            >
              <button onClick={() => setStep(1)} className="flex items-center text-accent font-black text-xs tracking-widest mb-6 hover:-translate-x-1 transition-transform uppercase">
                <ChevronLeft className="w-4 h-4" /> RETOUR
              </button>
              <h2 className="text-2xl font-black mb-8 tracking-tighter uppercase">Configuration des équipes</h2>
              
              <div className="space-y-6 flex-1">
                {/* Team A */}
                <div className="bg-bg p-6 rounded-2xl border border-border shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase mb-4 block text-center tracking-[0.2em]">
                    {config.teamNameA || 'Équipe A'}
                  </span>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center gap-6">
                      <div className="w-20 h-20 bg-white border border-black/10 rounded-xl p-2 flex items-center justify-center shadow-sm">
                        <Jersey color={getTeamColor('A')} secondaryColor={getTeamSecondary('A')} />
                      </div>
                      
                      {config.isProMode && (config.sport === 'Football' || config.sport === 'Basketball' || config.sport === 'Handball') ? (
                        <select 
                          value={
                            config.sport === 'Football' 
                            ? (PRO_TEAMS_FOOT.find(t => t.name === config.teamNameA)?.id || '')
                            : config.sport === 'Basketball'
                            ? (PRO_TEAMS_BASKET.find(t => t.name === config.teamNameA)?.id || '')
                            : (PRO_TEAMS_HAND.find(t => t.name === config.teamNameA)?.id || '')
                          }
                          onChange={(e) => {
                            const team = config.sport === 'Football' 
                              ? PRO_TEAMS_FOOT.find(t => t.id === e.target.value)
                              : config.sport === 'Basketball'
                              ? PRO_TEAMS_BASKET.find(t => t.id === e.target.value)
                              : PRO_TEAMS_HAND.find(t => t.id === e.target.value);
                            if (team) {
                              setConfig(prev => ({ 
                                ...prev, 
                                teamNameA: team.name, 
                                customColorA: team.color 
                              }));
                            }
                          }}
                          className="flex-1 p-3 border border-border rounded-lg bg-white font-bold text-sm focus:border-accent outline-none appearance-none"
                        >
                          <option value="" disabled>Choisir une équipe</option>
                          {(config.sport === 'Football' ? PRO_TEAMS_FOOT : config.sport === 'Basketball' ? PRO_TEAMS_BASKET : PRO_TEAMS_HAND).map(t => (
                            <option key={t.id} value={t.id} disabled={t.name === config.teamNameB}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          value={config.colorA}
                          onChange={(e) => handleColorChange('A', e.target.value as ColorId)}
                          className="flex-1 p-3 border border-border rounded-lg bg-white font-bold text-sm focus:border-accent outline-none appearance-none"
                        >
                          {COLORS.map(c => (
                            <option key={c.id} value={c.id} disabled={c.id === config.colorB}>
                              {c.label} {c.id === config.colorB ? '(Pris)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team B */}
                <div className="bg-bg p-6 rounded-2xl border border-border shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase mb-4 block text-center tracking-[0.2em]">
                    {config.teamNameB || 'Équipe B'}
                  </span>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center gap-6">
                      <div className="w-20 h-20 bg-white border border-black/10 rounded-xl p-2 flex items-center justify-center shadow-sm">
                        <Jersey color={getTeamColor('B')} secondaryColor={getTeamSecondary('B')} />
                      </div>
                      
                      {config.isProMode && (config.sport === 'Football' || config.sport === 'Basketball' || config.sport === 'Handball') ? (
                        <select 
                          value={
                            config.sport === 'Football' 
                            ? (PRO_TEAMS_FOOT.find(t => t.name === config.teamNameB)?.id || '')
                            : config.sport === 'Basketball'
                            ? (PRO_TEAMS_BASKET.find(t => t.name === config.teamNameB)?.id || '')
                            : (PRO_TEAMS_HAND.find(t => t.name === config.teamNameB)?.id || '')
                          }
                          onChange={(e) => {
                            const team = config.sport === 'Football' 
                              ? PRO_TEAMS_FOOT.find(t => t.id === e.target.value)
                              : config.sport === 'Basketball'
                              ? PRO_TEAMS_BASKET.find(t => t.id === e.target.value)
                              : PRO_TEAMS_HAND.find(t => t.id === e.target.value);
                            if (team) {
                              setConfig(prev => ({ 
                                ...prev, 
                                teamNameB: team.name, 
                                customColorB: team.color 
                              }));
                            }
                          }}
                          className="flex-1 p-3 border border-border rounded-lg bg-white font-bold text-sm focus:border-accent outline-none appearance-none"
                        >
                          <option value="" disabled>Choisir une équipe</option>
                          {(config.sport === 'Football' ? PRO_TEAMS_FOOT : config.sport === 'Basketball' ? PRO_TEAMS_BASKET : PRO_TEAMS_HAND).map(t => (
                            <option key={t.id} value={t.id} disabled={t.name === config.teamNameA}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          value={config.colorB}
                          onChange={(e) => handleColorChange('B', e.target.value as ColorId)}
                          className="flex-1 p-3 border border-border rounded-lg bg-white font-bold text-sm focus:border-accent outline-none appearance-none"
                        >
                          {COLORS.map(c => (
                            <option key={c.id} value={c.id} disabled={c.id === config.colorA}>
                              {c.label} {c.id === config.colorA ? '(Pris)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(3)}
                disabled={config.isProMode && (config.sport === 'Football' || config.sport === 'Basketball' || config.sport === 'Handball') && (!config.teamNameA || !config.teamNameB)}
                className="w-full bg-ink text-white font-black py-5 rounded-xl shadow-lg hover:bg-black transition-colors mt-8 flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SUIVANT <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex-1 flex flex-col bg-white"
            >
              <button onClick={() => setStep(2)} className="flex items-center text-accent font-black text-xs tracking-widest mb-6 uppercase">
                <ChevronLeft className="w-4 h-4" /> RETOUR
              </button>
              <h2 className="text-2xl font-black mb-8 tracking-tighter uppercase">Règles du match</h2>
              
              <div className="space-y-6 flex-1">
                <div className="bg-bg p-6 rounded-2xl border border-border space-y-4 shadow-sm">
                  {config.sport !== 'Basketball' && (
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs uppercase text-gray-600 tracking-wider">Points par But</span>
                      <input 
                        type="number" 
                        value={config.ptsBase}
                        onChange={(e) => setConfig(prev => ({ ...prev, ptsBase: parseInt(e.target.value) || 1 }))}
                        className="w-16 p-2 text-center border border-border rounded-lg font-mono font-bold text-lg bg-white"
                      />
                    </div>
                  )}

                  {config.sport === 'Basketball' && (
                    <div className="flex justify-between items-center">
                      <label className="flex items-center font-black text-xs uppercase text-gray-600 tracking-wider cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.has3Pts}
                          onChange={(e) => setConfig(prev => ({ ...prev, has3Pts: e.target.checked }))}
                          className="w-5 h-5 mr-3 rounded accent-accent"
                        />
                        Activer 3 Points ?
                      </label>
                    </div>
                  )}
                  
                  <div className={`pt-4 border-t border-border ${config.sport === 'Basketball' ? '' : ''}`}>
                    <div className="flex justify-between items-center">
                      <label className="flex items-center font-black text-xs uppercase text-gray-600 tracking-wider cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.hasBonus}
                          onChange={(e) => setConfig(prev => ({ ...prev, hasBonus: e.target.checked }))}
                          className="w-5 h-5 mr-3 rounded accent-accent"
                        />
                        Activer Bonus ?
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-bold">+</span>
                        <input 
                          type="number" 
                          value={config.ptsBonus}
                          onChange={(e) => setConfig(prev => ({ ...prev, ptsBonus: parseInt(e.target.value) || 0 }))}
                          className="w-16 p-2 text-center border border-border rounded-lg font-mono font-bold text-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg p-6 rounded-2xl border border-border shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-4 text-center tracking-[0.2em]">Fin du match</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['score', 'time', 'free'] as EndMode[]).map(m => (
                      <button 
                        key={m}
                        onClick={() => setConfig(prev => ({ ...prev, endMode: m }))}
                        className={`p-3 rounded-lg font-black text-[10px] tracking-widest transition-all uppercase ${config.endMode === m ? 'bg-ink text-white shadow-md' : 'bg-white text-gray-400 border border-border'}`}
                      >
                        {m === 'score' ? 'SCORE' : m === 'time' ? 'TEMPS' : 'LIBRE'}
                      </button>
                    ))}
                  </div>
                  {config.endMode !== 'free' && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl border border-border">
                      <span className="font-black text-[10px] uppercase text-gray-400 tracking-wider">{config.endMode === 'score' ? 'Objectif :' : 'Minutes :'}</span>
                      <input 
                        type="number" 
                        value={config.endValue}
                        onChange={(e) => setConfig(prev => ({ ...prev, endValue: parseInt(e.target.value) || 0 }))}
                        className="w-20 p-2 text-center border border-border rounded-lg font-mono font-bold text-accent"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={startMatch}
                className="w-full bg-success text-white font-black py-5 rounded-xl shadow-lg hover:bg-green-700 transition-colors mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Play className="w-5 h-5 fill-current" /> LANCER LE MATCH
              </button>
            </motion.div>
          )}

          {/* Step 4: Match Engine (High Density Layout) */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 grid grid-cols-[300px_1fr_300px] grid-rows-[80px_1fr_100px] h-full bg-border gap-[1px]"
            >
              {/* Header */}
              <header className="col-span-3 bg-ink text-white flex justify-between items-center px-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {config.sport === 'Football' && '⚽'}
                    {config.sport === 'Basketball' && '🏀'}
                    {config.sport === 'Handball' && '🤾'}
                    {config.sport === 'Autre' && '🏆'}
                  </span>
                  <div>
                    <p className="font-extrabold text-sm uppercase tracking-tight">{getSportName(config.sport)} - Session EPS</p>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">Match ID: #{(Math.random() * 1000).toFixed(0)}</p>
                  </div>
                </div>
                
                <div className="bg-black px-6 py-2 rounded border border-gray-800 font-mono text-3xl text-[#00FF00] shadow-inner">
                  {formatTime(matchData.duration)}
                </div>

                <div className="text-right">
                  <p className="text-[10px] opacity-50 uppercase font-bold">État du match</p>
                  <p className="font-extrabold text-sm text-accent">{isRunning ? 'EN COURS' : 'EN ATTENTE'}</p>
                </div>
              </header>

              {/* Left Panel: Team A */}
              <aside className="bg-white p-6 flex flex-col gap-6">
                <div className="text-center pb-4 border-b-2 border-border">
                  <h2 className="font-black text-xl uppercase tracking-tighter" style={{ color: getTeamColor('A').includes('url') ? '#1A1C1E' : getTeamColor('A') }}>
                    {config.teamNameA || 'Équipe A'}
                  </h2>
                  <div className="w-20 h-20 mx-auto my-2 bg-white border border-black/10 rounded-xl p-2 flex items-center justify-center shadow-sm">
                    <Jersey color={getTeamColor('A')} strokeWidth={matchData.possession === 'A' ? 6 : 2} secondaryColor={getTeamSecondary('A')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Score</p>
                    <p className="font-mono text-2xl font-bold">{matchData.A.score}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Bonus</p>
                    <p className="font-mono text-2xl font-bold">+{matchData.A.bonuses}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tirs</p>
                    <p className="font-mono text-2xl font-bold">{matchData.A.shots}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pertes</p>
                    <p className="font-mono text-2xl font-bold">{matchData.A.turnovers}</p>
                  </div>
                </div>

                <div className="mt-auto bg-red-50 p-4 rounded text-center border border-red-100">
                  <p className="text-[10px] font-bold text-danger uppercase mb-1">Efficacité</p>
                  <p className="font-mono text-2xl font-bold text-danger">
                    {matchData.A.shots > 0 ? (
                      config.sport === 'Basketball' 
                      ? ((( (matchData.A.goals1 || 0) + (matchData.A.goals2 || 0) + (matchData.A.goals3 || 0) ) / matchData.A.shots) * 100).toFixed(1)
                      : (((matchData.A.score - (matchData.A.bonuses * config.ptsBonus)) / (matchData.A.shots * config.ptsBase)) * 100).toFixed(1)
                    ) : '0.0'}%
                  </p>
                </div>
              </aside>

              {/* Center Panel: Controls */}
              <main className="bg-[#FAFAFA] p-6 flex flex-col gap-6 relative overflow-hidden">
                {/* Global Live Commentary Overlay */}
                <AnimatePresence>
                  {currentCommentary && (
                    <motion.div
                      initial={{ y: -100, opacity: 0, scale: 0.9, x: '-50%' }}
                      animate={{ y: 0, opacity: 1, scale: 1, x: '-50%' }}
                      exit={{ y: -100, opacity: 0, scale: 0.9, x: '-50%' }}
                      className="absolute top-4 left-1/2 z-50 w-[90%] max-w-[360px] pointer-events-none"
                    >
                      <div className="bg-white/95 backdrop-blur-md border border-accent/20 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-3xl shrink-0">
                          {currentCommentary.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                            </span>
                            Direct Live
                          </p>
                          <p className="font-bold text-gray-800 text-[12px] leading-snug italic">
                            "{currentCommentary.text}"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-white p-6 border border-border rounded-2xl flex justify-around items-center shadow-sm">
                  <motion.div 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePossession('A')}
                    className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${matchData.possession === 'A' ? 'scale-110' : 'scale-90 opacity-30'}`}
                  >
                    <div className="w-28 h-28 relative bg-white border border-black/10 rounded-2xl p-3 flex items-center justify-center shadow-sm">
                      <Jersey color={getTeamColor('A')} strokeWidth={matchData.possession === 'A' ? 8 : 2} secondaryColor={getTeamSecondary('A')} />
                      {matchData.possession === 'A' && (
                        <motion.div layoutId="pos" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,37,12,0.6)]" />
                      )}
                    </div>
                    <span className="font-black text-[9px] uppercase tracking-widest">{config.teamNameA || 'Équipe A'}</span>
                  </motion.div>

                  <div className="text-center">
                    <div className="text-xl font-black text-gray-200 italic mb-1">VS</div>
                    <div className="bg-bg px-2 py-0.5 rounded-full text-[8px] font-black text-gray-400 uppercase tracking-tighter">Possession</div>
                  </div>

                  <motion.div 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePossession('B')}
                    className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${matchData.possession === 'B' ? 'scale-110' : 'scale-90 opacity-30'}`}
                  >
                    <div className="w-28 h-28 relative bg-white border border-black/10 rounded-2xl p-3 flex items-center justify-center shadow-sm">
                      <Jersey color={getTeamColor('B')} strokeWidth={matchData.possession === 'B' ? 8 : 2} secondaryColor={getTeamSecondary('B')} />
                      {matchData.possession === 'B' && (
                        <motion.div layoutId="pos" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,37,12,0.6)]" />
                      )}
                    </div>
                    <span className="font-black text-[9px] uppercase tracking-widest">{config.teamNameB || 'Équipe B'}</span>
                  </motion.div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  {!showShotMenu ? (
                    <>
                      <button 
                        onClick={handleTurnover}
                        disabled={!matchData.possession}
                        className="bg-warning text-white rounded-xl font-bold flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed h-full"
                      >
                        <span className="text-4xl">⚠️</span>
                        <span className="uppercase tracking-tight">Perte de balle</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (config.sport === 'Basketball') {
                            // Shot initiated, we'll pick 2 or 3 when they confirm a goal
                            // But for simple shot tracking:
                          }
                          handleShot();
                        }}
                        disabled={!matchData.possession}
                        className="bg-[#5DA5F9] text-white rounded-xl font-bold flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed h-full"
                      >
                        <span className="text-4xl">🎯</span>
                        <span className="uppercase tracking-tight">Tir / Action</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          triggerCommentary('miss');
                          setShowShotMenu(false);
                        }}
                        className="bg-[#5DA5F9] text-white rounded-xl font-bold flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all"
                      >
                        <span className="text-4xl">🔄</span>
                        <span className="uppercase tracking-tight">Récupéré</span>
                      </button>
                      <button 
                        onClick={handleTurnover}
                        className="bg-warning text-white rounded-xl font-bold flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all"
                      >
                        <span className="text-4xl">⚠️</span>
                        <span className="uppercase tracking-tight">Perdu</span>
                      </button>
                      
                      {config.sport === 'Basketball' ? (
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          {/* If 3 pts is disabled, only show Panier 2 pts or standard Point button */}
                          <button 
                            onClick={() => {
                              saveHistory();
                              setBasketValue(2);
                              setMatchData(prev => ({
                                ...prev,
                                [matchData.possession!]: { ...prev[matchData.possession!], shots2: (prev[matchData.possession!].shots2 || 0) + 1 }
                              }));
                              addEvent('shot', matchData.possession, 'Tir 2 pts tenté');
                              setShowGoalOverlay(true);
                            }}
                            className={`${config.has3Pts ? 'bg-danger' : 'col-span-2 bg-danger'} text-white rounded-xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all h-24`}
                          >
                            <span className="text-3xl">🏀</span>
                            <span className="text-xl uppercase tracking-tighter">PANIER 2 pts</span>
                          </button>
                          {config.has3Pts && (
                            <button 
                              onClick={() => {
                                saveHistory();
                                setBasketValue(3);
                                setMatchData(prev => ({
                                  ...prev,
                                  [matchData.possession!]: { ...prev[matchData.possession!], shots3: (prev[matchData.possession!].shots3 || 0) + 1 }
                                }));
                                addEvent('shot', matchData.possession, 'Tir 3 pts tenté');
                                setShowGoalOverlay(true);
                              }}
                              className="bg-danger/80 text-white rounded-xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all h-24"
                            >
                              <span className="text-3xl">🔥</span>
                              <span className="text-xl uppercase tracking-tighter">PANIER 3 pts</span>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              saveHistory();
                              setBasketValue(1);
                              setMatchData(prev => ({
                                ...prev,
                                [matchData.possession!]: { ...prev[matchData.possession!], shots1: (prev[matchData.possession!].shots1 || 0) + 1 }
                              }));
                              addEvent('shot', matchData.possession, 'Lancer franc tenté');
                              setShowGoalOverlay(true);
                            }}
                            className="col-span-2 bg-gray-500 text-white rounded-xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all h-20"
                          >
                            <span className="text-2xl">⚪</span>
                            <span className="text-lg uppercase tracking-tighter">Lancer franc (1 pt)</span>
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowGoalOverlay(true)}
                          className="col-span-2 bg-danger text-white rounded-xl font-black flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all"
                        >
                          <span className="text-5xl">⚽</span>
                          <span className="text-2xl uppercase tracking-tighter">BUT ! / POINT !</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowStopConfirm(true)}
                    className="w-full bg-ink text-white p-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all"
                  >
                    ⏹ Fin Match
                  </button>
                </div>
              </main>

              {/* Right Panel: Team B */}
              <aside className="bg-white p-6 flex flex-col gap-6">
                <div className="text-center pb-4 border-b-2 border-border">
                  <h2 className="font-black text-xl uppercase tracking-tighter" style={{ color: getTeamColor('B').includes('url') ? '#1A1C1E' : getTeamColor('B') }}>
                    {config.teamNameB || 'Équipe B'}
                  </h2>
                  <div className="w-20 h-20 mx-auto my-2 bg-white border border-black/10 rounded-xl p-2 flex items-center justify-center shadow-sm">
                    <Jersey color={getTeamColor('B')} strokeWidth={matchData.possession === 'B' ? 6 : 2} secondaryColor={getTeamSecondary('B')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Score</p>
                    <p className="font-mono text-2xl font-bold">{matchData.B.score}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Bonus</p>
                    <p className="font-mono text-2xl font-bold">+{matchData.B.bonuses}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tirs</p>
                    <p className="font-mono text-2xl font-bold">{matchData.B.shots}</p>
                  </div>
                  <div className="bg-bg p-3 rounded text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pertes</p>
                    <p className="font-mono text-2xl font-bold">{matchData.B.turnovers}</p>
                  </div>
                </div>

                <div className="mt-auto bg-gray-100 p-4 rounded text-center border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Efficacité</p>
                  <p className="font-mono text-2xl font-bold">
                    {matchData.B.shots > 0 ? (
                      config.sport === 'Basketball'
                      ? ((( (matchData.B.goals1 || 0) + (matchData.B.goals2 || 0) + (matchData.B.goals3 || 0) ) / matchData.B.shots) * 100).toFixed(1)
                      : (((matchData.B.score - (matchData.B.bonuses * config.ptsBonus)) / (matchData.B.shots * config.ptsBase)) * 100).toFixed(1)
                    ) : '0.0'}%
                  </p>
                </div>
              </aside>

              {/* Footer */}
              <footer className="col-span-3 bg-gray-50 border-t border-border flex items-center px-8 gap-6">
                <div className="font-extrabold text-[10px] uppercase tracking-widest text-gray-400">Historique :</div>
                <div className="flex-1 bg-white border border-border h-12 rounded-lg flex items-center px-4 overflow-hidden">
                  <div className="font-mono text-[10px] text-accent flex gap-4">
                    <span className="bg-accent text-white px-2 py-1 rounded font-black uppercase italic">PÉRIODE {matchData.periods}</span>
                    <span className="text-ink uppercase font-bold self-center">Action : {matchData.possession ? `Possession ${matchData.possession}` : 'Engagement...'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      saveHistory();
                      setMatchData(prev => ({ ...prev, periods: prev.periods + 1 }));
                      addEvent('possession', null, `Début Période ${matchData.periods + 1}`);
                    }}
                    className="h-12 px-4 bg-white border border-border rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all text-gray-500"
                  >
                    + Période
                  </button>
                  <button 
                    onClick={undo}
                    disabled={matchHistory.length === 0}
                    className={`h-12 px-4 bg-white border border-border rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 ${matchHistory.length === 0 ? 'opacity-30' : 'hover:bg-gray-50 text-danger'}`}
                  >
                    <RotateCcw className="w-3 h-3" /> Annuler
                  </button>
                  <div className="text-right border-l border-border pl-4">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Rythme</p>
                    <p className="font-black text-xs">{( (matchData.A.possessions + matchData.B.possessions) / (matchData.duration / 60 || 1) ).toFixed(1)}/min</p>
                  </div>
                </div>
              </footer>

              {/* Engagement Overlay */}
              <AnimatePresence>
                {!matchData.possession && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[70] flex flex-col items-center justify-center p-8"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="text-center w-full max-w-2xl"
                    >
                      <h3 className="text-5xl font-black mb-4 uppercase tracking-tighter text-ink">Engagement</h3>
                      <p className="text-gray-400 font-black mb-16 uppercase text-xs tracking-[0.3em]">
                        Sélectionnez l'équipe qui engage le match
                      </p>
                      
                      <div className="flex justify-around items-center gap-8">
                        <motion.div 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePossession('A')}
                          className="cursor-pointer group flex flex-col items-center"
                        >
                          <div className="w-64 h-64 transition-transform group-hover:scale-105 bg-white border border-black/10 rounded-[2rem] p-8 flex items-center justify-center shadow-sm">
                            <Jersey color={getTeamColor('A')} strokeWidth={4} secondaryColor={getTeamSecondary('A')} />
                          </div>
                          <p className="mt-6 font-black text-ink uppercase tracking-widest text-xl group-hover:text-accent">{config.teamNameA || 'Équipe A'}</p>
                        </motion.div>

                        <div className="text-4xl font-black text-gray-200 italic">VS</div>

                        <motion.div 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePossession('B')}
                          className="cursor-pointer group flex flex-col items-center"
                        >
                          <div className="w-64 h-64 transition-transform group-hover:scale-105 bg-white border border-black/10 rounded-[2rem] p-8 flex items-center justify-center shadow-sm">
                            <Jersey color={getTeamColor('B')} strokeWidth={4} secondaryColor={getTeamSecondary('B')} />
                          </div>
                          <p className="mt-6 font-black text-ink uppercase tracking-widest text-xl group-hover:text-accent">{config.teamNameB || 'Équipe B'}</p>
                        </motion.div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Goal Overlay */}
              <AnimatePresence>
                {showGoalOverlay && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8"
                  >
                    <h3 className="text-3xl font-black mb-12 text-center text-gray-800 tracking-tight">VALIDER LE POINT ?</h3>
                    <div className="space-y-4 w-full max-w-xs">
                      <button 
                        onClick={() => handleGoal(false)}
                        className="w-full bg-green-600 py-6 rounded-3xl text-white font-black text-xl shadow-xl shadow-green-100 uppercase tracking-wider active:scale-95 transition-all"
                      >
                        {config.sport === 'Basketball' ? 'PANIER NORMAL' : 'BUT NORMAL'}
                      </button>
                      {config.hasBonus && (
                        <button 
                          onClick={() => handleGoal(true)}
                          className="w-full bg-yellow-500 py-6 rounded-3xl text-white font-black text-xl shadow-xl shadow-yellow-100 uppercase tracking-wider active:scale-95 transition-all"
                        >
                          {config.sport === 'Basketball' ? 'PANIER + BONUS' : 'BUT + BONUS'}
                        </button>
                      )}
                      <button 
                        onClick={() => setShowGoalOverlay(false)}
                        className="w-full mt-8 text-gray-400 font-bold underline uppercase text-xs tracking-widest"
                      >
                        Annuler (Erreur)
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stop Confirmation */}
              <AnimatePresence>
                {showStopConfirm && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-8"
                  >
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                      <h3 className="text-xl font-black mb-4">Arrêter le match ?</h3>
                      <p className="text-gray-500 text-sm mb-8">Les statistiques seront enregistrées et le match sera terminé.</p>
                      <div className="space-y-3">
                        <button 
                          onClick={stopMatch}
                          className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg"
                        >
                          OUI, ARRÊTER
                        </button>
                        <button 
                          onClick={() => setShowStopConfirm(false)}
                          className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest"
                        >
                          CONTINUER
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Match End Limit Popup */}
              <AnimatePresence>
                {showEndPopup && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-ink/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-white p-10 rounded-[3rem] text-center shadow-2xl max-w-md w-full"
                    >
                      <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Timer className="w-10 h-10 text-warning" />
                      </div>
                      <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter text-ink">
                        {config.endMode === 'time' ? 'Temps écoulé !' : 'Score atteint !'}
                      </h3>
                      <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        La limite fixée pour ce match a été atteinte. Que souhaitez-vous faire ?
                      </p>
                      
                      <div className="space-y-4">
                        <button 
                          onClick={() => {
                            setShowEndPopup(false);
                            setOvertimeMode(true);
                            setIsRunning(true);
                          }}
                          className="w-full bg-accent text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-accent/20 uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          <Play className="w-5 h-5 fill-current" /> Continuer (Arrêts de jeu)
                        </button>
                        <button 
                          onClick={() => {
                            setShowEndPopup(false);
                            stopMatch();
                          }}
                          className="w-full bg-ink text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          <RotateCcw className="w-5 h-5" /> Terminer le match
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 5: Statistics Summary */}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-ink tracking-tighter uppercase">Bilan Final</h2>
                  <div className="flex items-center gap-2 mt-1 text-gray-400 font-mono text-[10px] uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="bg-white text-accent px-4 py-2 rounded-lg font-black text-[10px] tracking-widest uppercase border border-border shadow-sm">
                  {getSportName(config.sport)}
                </div>
              </div>

              {/* Final Score Card */}
              <div className="bg-white rounded-3xl p-8 text-ink mb-8 border border-border relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="flex justify-center items-center gap-12 relative z-10">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white border border-black/5 rounded-2xl p-2 flex items-center justify-center shadow-sm">
                      <Jersey color={getTeamColor('A')} secondaryColor={getTeamSecondary('A')} />
                    </div>
                    <div className="text-6xl font-black font-mono tracking-tighter">{matchData.A.score}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-2">{config.teamNameA || 'Équipe A'}</div>
                  </div>
                  <div className="text-3xl font-black text-gray-200 italic pb-8 translate-y-2 leading-none">VS</div>
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white border border-black/5 rounded-2xl p-2 flex items-center justify-center shadow-sm">
                      <Jersey color={getTeamColor('B')} secondaryColor={getTeamSecondary('B')} />
                    </div>
                    <div className="text-6xl font-black font-mono tracking-tighter">{matchData.B.score}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-2">{config.teamNameB || 'Équipe B'}</div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-center items-center gap-2 text-gray-400 font-mono text-xs uppercase tracking-widest">
                  <Timer className="w-4 h-4 text-accent/40" /> <span>Temps écoulé : {formatTime(config.endMode === 'time' ? (config.endValue * 60 - matchData.duration) : matchData.duration)}</span>
                </div>
              </div>

              {/* Export Actions */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => {
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('fr-FR');
                    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const rows = [
                      ["Date", "Heure", "Sport", "Equipe", "Score", "Tirs", "Possessions", "Pertes", "Recup Directes"],
                      [
                        dateStr,
                        timeStr,
                        config.sport,
                        config.teamNameA || "Equipe A", 
                        matchData.A.score, 
                        matchData.A.shots, 
                        matchData.A.possessions, 
                        matchData.A.turnovers,
                        matchData.A.directRecoveries
                      ],
                      [
                        dateStr,
                        timeStr,
                        config.sport,
                        config.teamNameB || "Equipe B", 
                        matchData.B.score, 
                        matchData.B.shots, 
                        matchData.B.possessions, 
                        matchData.B.turnovers,
                        matchData.B.directRecoveries
                      ]
                    ];
                    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `bilan_${config.sport}_${now.toISOString().split('T')[0]}_${now.getHours()}h${now.getMinutes()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                >
                  <BarChart3 className="w-4 h-4 text-accent" />
                  Exporter CSV
                </button>
                <button 
                  onClick={() => {
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('fr-FR');
                    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const report = `
📊 BILAN - ${config.sport.toUpperCase()}
📅 ${dateStr} à ${timeStr}
---------------------------
🏆 ${config.teamNameA || 'Équipe A'} ${matchData.A.score} - ${matchData.B.score} ${config.teamNameB || 'Équipe B'}

DÉTAILS ${config.teamNameA || 'A'}:
- Tirs: ${matchData.A.shots}
- Possessions: ${matchData.A.possessions}
- Pertes: ${matchData.A.turnovers}
- Récup. directes: ${matchData.A.directRecoveries}

DÉTAILS ${config.teamNameB || 'B'}:
- Tirs: ${matchData.B.shots}
- Possessions: ${matchData.B.possessions}
- Pertes: ${matchData.B.turnovers}
- Récup. directes: ${matchData.B.directRecoveries}
                    `.trim();
                    navigator.clipboard.writeText(report);
                    alert("Rapport copié avec date et heure !");
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-accent" />
                  Copier Rapport
                </button>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-1 flex-1">
                {/* Efficiency */}
                <StatRow 
                  label="Efficacité au tir" 
                  valA={matchData.A.shots > 0 ? Math.round(
                    config.sport === 'Basketball'
                    ? (((matchData.A.goals1 || 0) + (matchData.A.goals2 || 0) + (matchData.A.goals3 || 0)) / matchData.A.shots) * 100
                    : ((matchData.A.score - (matchData.A.bonuses * config.ptsBonus)) / (matchData.A.shots * config.ptsBase)) * 100
                  ) : 0} 
                  valB={matchData.B.shots > 0 ? Math.round(
                    config.sport === 'Basketball'
                    ? (((matchData.B.goals1 || 0) + (matchData.B.goals2 || 0) + (matchData.B.goals3 || 0)) / matchData.B.shots) * 100
                    : ((matchData.B.score - (matchData.B.bonuses * config.ptsBonus)) / (matchData.B.shots * config.ptsBase)) * 100
                  ) : 0} 
                  unit="%"
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  explanation="Mesure la capacité de ton équipe à transformer ses tentatives de tir en points réels."
                  advice="Si l'efficacité est basse, essaie de prendre des tirs plus proches ou plus libres (moins de défense)."
                />
                
                {/* Possession */}
                <StatRow 
                  label="Volume de jeu (Possessions)" 
                  valA={matchData.A.possessions} 
                  valB={matchData.B.possessions} 
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  explanation="Nombre de fois où ton équipe a eu la balle pour mener une attaque."
                  advice="Un gros volume montre une domination physique ou une bonne récupération de balle rapide."
                />

                {/* Turnovers */}
                <StatRow 
                  label="Pertes de balle" 
                  valA={matchData.A.turnovers} 
                  valB={matchData.B.turnovers} 
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  inverse
                  explanation="Attaques gâchées sans même avoir pu tirer au panier/but."
                  advice="Ralentis le jeu et assure tes passes. On ne peut pas marquer si on n'a plus le ballon."
                />

                {/* New Stats */}
                <StatRow 
                  label="Tirs par possession" 
                  valA={matchData.A.possessions > 0 ? parseFloat((matchData.A.shots / matchData.A.possessions).toFixed(2)) : 0} 
                  valB={matchData.B.possessions > 0 ? parseFloat((matchData.B.shots / matchData.B.possessions).toFixed(2)) : 0} 
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  explanation="Capacité à aller au bout d'une action offensive."
                  advice="L'objectif est d'avoir au moins 1 tir par possession. Si c'est en dessous de 0.5, ton attaque est trop fragile."
                />

                <StatRow 
                  label="Temps moyen récup. (s)" 
                  valA={matchData.A.recoveryCount > 0 ? Math.round(matchData.A.totalDefenseTime / matchData.A.recoveryCount) : 0} 
                  valB={matchData.B.recoveryCount > 0 ? Math.round(matchData.B.totalDefenseTime / matchData.B.recoveryCount) : 0} 
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  inverse
                  unit="s"
                  explanation="Temps passé à défendre avant de récupérer la balle."
                  advice="Une défense courte signifie que tu récupères la balle très vite : c'est très positif !"
                />

                <StatRow 
                  label="Balles récup. directes" 
                  valA={matchData.A.directRecoveries} 
                  valB={matchData.B.directRecoveries} 
                  colorA={getTeamColor('A')}
                  colorB={getTeamColor('B')}
                  explanation="Interceptions ou contres qui redonnent immédiatement la possession."
                  advice="Sois agressif sur le porteur de balle pour provoquer ces erreurs et marquer en contre-attaque."
                />

                {config.sport === 'Basketball' && (
                  <>
                    <StatRow 
                      label="Lancers francs" 
                      valA={matchData.A.goals1 || 0} 
                      valB={matchData.B.goals1 || 0} 
                      colorA={getTeamColor('A')}
                      colorB={getTeamColor('B')}
                    />
                    <StatRow 
                      label="Paniers à 2 points" 
                      valA={matchData.A.goals2 || 0} 
                      valB={matchData.B.goals2 || 0} 
                      colorA={getTeamColor('A')}
                      colorB={getTeamColor('B')}
                    />
                    <StatRow 
                      label="Paniers à 3 points" 
                      valA={matchData.A.goals3 || 0} 
                      valB={matchData.B.goals3 || 0} 
                      colorA={getTeamColor('A')}
                      colorB={getTeamColor('B')}
                    />
                  </>
                )}

                {/* Bonus Usage */}
                {config.hasBonus && (
                  <StatRow 
                    label={config.sport === 'Basketball' ? "Paniers avec Bonus" : "Buts avec Bonus"} 
                    valA={matchData.A.bonuses} 
                    valB={matchData.B.bonuses} 
                    colorA={getTeamColor('A')}
                    colorB={getTeamColor('B')}
                  />
                )}

                <div className="h-8" />

                {/* Visual Analysis Chart */}
                <CollapsibleCard title="Analyse comparative" icon={LineChart}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { 
                          subject: 'Efficacité', 
                          A: matchData.A.shots > 0 ? (config.sport === 'Basketball' ? (((matchData.A.goals1 || 0) + (matchData.A.goals2 || 0) + (matchData.A.goals3 || 0)) / matchData.A.shots) * 100 : (matchData.A.score / matchData.A.shots) * 100) : 0, 
                          B: matchData.B.shots > 0 ? (config.sport === 'Basketball' ? (((matchData.B.goals1 || 0) + (matchData.B.goals2 || 0) + (matchData.B.goals3 || 0)) / matchData.B.shots) * 100 : (matchData.B.score / matchData.B.shots) * 100) : 0, 
                          fullMark: 100 
                        },
                        { 
                          subject: 'Volume', 
                          A: matchData.A.possessions, 
                          B: matchData.B.possessions, 
                          fullMark: Math.max(matchData.A.possessions, matchData.B.possessions, 10) 
                        },
                        { 
                          subject: 'Précision', 
                          A: matchData.A.possessions > 0 ? (matchData.A.shots / matchData.A.possessions) * 100 : 0, 
                          B: matchData.B.possessions > 0 ? (matchData.B.shots / matchData.B.possessions) * 100 : 0, 
                          fullMark: 100 
                        },
                        { 
                          subject: 'Défense', 
                          A: matchData.A.directRecoveries, 
                          B: matchData.B.directRecoveries, 
                          fullMark: Math.max(matchData.A.directRecoveries, matchData.B.directRecoveries, 5) 
                        },
                        { 
                          subject: 'Propreté', 
                          A: 100 - (matchData.A.turnovers / (matchData.A.possessions || 1)) * 100, 
                          B: 100 - (matchData.B.turnovers / (matchData.B.possessions || 1)) * 100, 
                          fullMark: 100 
                        },
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 900 }} />
                        <Radar
                          name={config.teamNameA || 'Équipe A'}
                          dataKey="A"
                          stroke={getTeamColor('A')}
                          fill={getTeamColor('A')}
                          fillOpacity={0.4}
                        />
                        <Radar
                          name={config.teamNameB || 'Équipe B'}
                          dataKey="B"
                          stroke={getTeamColor('B')}
                          fill={getTeamColor('B')}
                          fillOpacity={0.4}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CollapsibleCard>

                {/* Timeline Analysis */}
                <CollapsibleCard title="Chronologie du match" icon={History}>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pt-4">
                    {matchData.events.map((event, i) => (
                      <div key={event.id} className="relative flex items-center gap-4 group">
                        {/* Vertical line connector */}
                        {i !== matchData.events.length - 1 && (
                          <div className="absolute left-[13px] top-6 w-[1px] h-full bg-gray-100" />
                        )}
                        
                        <div className="text-[9px] font-mono font-bold text-gray-300 w-7">
                          {formatTime(config.endMode === 'time' && matchData.duration < config.endValue * 60 ? (config.endValue * 60 - event.time) : event.time)}
                        </div>
                        
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                          event.team === 'A' ? 'bg-white' : 
                          event.team === 'B' ? 'bg-white' : 'bg-gray-100 border-gray-200'
                        }`}
                        style={event.team ? { borderColor: event.team === 'A' ? matchData.colorA : matchData.colorB } : {}}
                        >
                          <div className="w-4 h-4">
                            {event.type === 'score' && <Trophy className="w-full h-full text-yellow-500" />}
                            {event.type === 'turnover' && <XCircle className="w-full h-full text-danger" />}
                            {event.type === 'recovery' && <Zap className="w-full h-full text-accent" />}
                            {event.type === 'shot' && <Target className="w-full h-full text-gray-400" />}
                            {event.type === 'possession' && <RotateCcw className="w-full h-full text-accent/50" />}
                          </div>
                        </div>

                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-ink">
                            {event.label}
                          </p>
                          {event.team && (
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                              {event.team === 'A' ? (matchData.teamNameA || 'Équipe A') : (matchData.teamNameB || 'Équipe B')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {matchData.events.length === 0 && (
                      <div className="text-center py-8 text-gray-300">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-[8px] font-black uppercase tracking-widest italic">Aucun événement enregistré</p>
                      </div>
                    )}
                  </div>
                </CollapsibleCard>
              </div>

              <div className="mt-12">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-accent text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Nouvelle Séance
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Helper Component for Stats ---

function CollapsibleCard({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-3xl border border-border shadow-sm mb-4 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-3">
          <Icon className="w-4 h-4 text-accent" /> {title}
        </h3>
        <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-50"
          >
            <div className="p-6 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ label, valA, valB, unit = "", colorA, colorB, inverse = false, explanation, advice }: { 
  label: string, 
  valA: number, 
  valB: number, 
  unit?: string, 
  colorA: string, 
  colorB: string,
  inverse?: boolean,
  explanation?: string,
  advice?: string
}) {
  const [showInfo, setShowInfo] = useState(false);
  const total = valA + valB;
  const pctA = total > 0 ? (valA / total) * 100 : 50;
  const pctB = total > 0 ? (valB / total) * 100 : 50;

  // For efficiency or other % based stats, we might want to show the raw value
  const displayA = `${valA}${unit}`;
  const displayB = `${valB}${unit}`;

  return (
    <div className="space-y-4 py-6 border-b border-gray-100 last:border-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</span>
          {(explanation || advice) && (
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`p-1.5 rounded-lg transition-all duration-300 ${showInfo ? 'bg-accent text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 p-5 rounded-2xl border border-accent/10 text-xs space-y-4 shadow-inner">
              {explanation && (
                <div>
                  <span className="font-black text-accent uppercase tracking-widest text-[9px] block mb-1.5">Pourquoi cette stat ?</span>
                  <p className="text-gray-600 leading-relaxed font-medium">{explanation}</p>
                </div>
              )}
              {advice && (
                <div>
                  <span className="font-black text-green-600 uppercase tracking-widest text-[9px] block mb-1.5">Conseil d'entraînement</span>
                  <div className="flex gap-2">
                    <div className="w-1 h-auto bg-green-500/20 rounded-full" />
                    <p className="text-gray-600 leading-relaxed font-medium italic italic">"{advice}"</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <div 
          className="text-xl font-black w-14 text-right tabular-nums" 
          style={{ 
            color: colorA.includes('url') ? '#1A1C1E' : colorA,
            textShadow: colorA.toLowerCase() === '#ffffff' || colorA.toLowerCase() === 'white' || colorA.toLowerCase() === 'transparent' || colorA.toLowerCase() === '#f8fafc' 
              ? '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' 
              : 'none'
          }}
        >
          {displayA}
        </div>
        <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden flex border-2 border-black relative shadow-sm">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pctA}%` }}
            className="h-full border-r border-black/20"
            style={{ backgroundColor: colorA.includes('url') ? '#EF4444' : colorA }}
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pctB}%` }}
            className="h-full"
            style={{ backgroundColor: colorB.includes('url') ? '#3B82F6' : colorB }}
          />
          {/* Dynamic marker that follows the junction of the two stats */}
          <motion.div 
            animate={{ left: `${pctA}%` }}
            className="absolute top-0 bottom-0 w-[3px] bg-black z-10 -translate-x-1/2" 
          />
        </div>
        <div 
          className="text-xl font-black w-14 tabular-nums" 
          style={{ 
            color: colorB.includes('url') ? '#1A1C1E' : colorB,
            textShadow: colorB.toLowerCase() === '#ffffff' || colorB.toLowerCase() === 'white' || colorB.toLowerCase() === 'transparent' || colorB.toLowerCase() === '#f8fafc'
              ? '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' 
              : 'none'
          }}
        >
          {displayB}
        </div>
      </div>
    </div>
  );
}
