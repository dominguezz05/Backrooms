export interface HighscoreEntry {
  score: number;
  time: number;
  date: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GameStats {
  totalTime: number;
  totalDeaths: number;
  totalVictories: number;
  levelsCompleted: Record<string, number>;
  totalCoins: number;
  totalBatteries: number;
  achievements: Achievement[];
}

const ACHIEVEMENTS_LIST: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_death', name: 'Primera Muerte', description: 'Muere por primera vez' },
  { id: 'first_escape', name: 'Primer Escape', description: 'Escapa de un nivel' },
  { id: 'speedrunner', name: 'Speedrunner', description: 'Completa el Nivel 1 en menos de 2 minutos' },
  { id: 'coin_collector', name: 'Coleccionista', description: 'Recoge 500 monedas totales' },
  { id: 'survivor_5', name: 'Superviviente', description: 'Sobrevive 5 minutos en Ultimate' },
  { id: 'note_reader', name: 'Curioso', description: 'Lee 10 notas' },
  { id: 'hider', name: 'Tímido', description: 'Escondete 50 veces' },
  { id: 'battery_hoarder', name: 'Coleccionista de Baterías', description: 'Recoge 100 baterías totales' },
  { id: 'no_flashlight', name: 'A oscuras', description: 'Completa el Nivel 4 sin usar la linterna' },
  { id: 'closecall', name: 'Afortunado', description: 'Escapa de un enemigo 10 veces' },
];

export class ScoreManager {
  private static readonly HIGHSCORES_KEY = 'backrooms_highscores';
  private static readonly STATS_KEY = 'backrooms_stats';

  static getHighscores(level: string): HighscoreEntry[] {
    const data = localStorage.getItem(this.HIGHSCORES_KEY);
    if (!data) return [];
    try {
      const scores = JSON.parse(data);
      return scores[level] || [];
    } catch {
      return [];
    }
  }

  static saveHighscore(level: string, score: number, time: number): boolean {
    const data = localStorage.getItem(this.HIGHSCORES_KEY);
    let scores: Record<string, HighscoreEntry[]> = {};
    
    if (data) {
      try {
        scores = JSON.parse(data);
      } catch {
        scores = {};
      }
    }

    if (!scores[level]) scores[level] = [];
    
    const newEntry: HighscoreEntry = {
      score,
      time,
      date: new Date().toISOString().split('T')[0]
    };
    
    scores[level].push(newEntry);
    scores[level].sort((a, b) => b.score - a.score);
    scores[level] = scores[level].slice(0, 10);
    
    localStorage.setItem(this.HIGHSCORES_KEY, JSON.stringify(scores));
    
    const rank = scores[level].findIndex(e => e.date === newEntry.date && e.score === newEntry.score);
    return rank >= 0 && rank < 3;
  }

  static getStats(): GameStats {
    const data = localStorage.getItem(this.STATS_KEY);
    if (!data) return this.createDefaultStats();
    
    try {
      return JSON.parse(data);
    } catch {
      return this.createDefaultStats();
    }
  }

  static saveStats(stats: GameStats): void {
    localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
  }

  private static createDefaultStats(): GameStats {
    return {
      totalTime: 0,
      totalDeaths: 0,
      totalVictories: 0,
      levelsCompleted: {},
      totalCoins: 0,
      totalBatteries: 0,
      achievements: ACHIEVEMENTS_LIST.map(a => ({ ...a, unlocked: false }))
    };
  }

  static unlockAchievement(id: string): Achievement | null {
    const stats = this.getStats();
    const achievement = stats.achievements.find(a => a.id === id);
    
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date().toISOString();
      this.saveStats(stats);
      return achievement;
    }
    
    return null;
  }

  static checkAndUnlockAchievements(stats: Partial<GameStats>): Achievement[] {
    const unlocked: Achievement[] = [];
    
    if (stats.totalDeaths && stats.totalDeaths >= 1) {
      const a = this.unlockAchievement('first_death');
      if (a) unlocked.push(a);
    }
    
    if (stats.totalVictories && stats.totalVictories >= 1) {
      const a = this.unlockAchievement('first_escape');
      if (a) unlocked.push(a);
    }
    
    if (stats.totalCoins && stats.totalCoins >= 500) {
      const a = this.unlockAchievement('coin_collector');
      if (a) unlocked.push(a);
    }
    
    if (stats.totalBatteries && stats.totalBatteries >= 100) {
      const a = this.unlockAchievement('battery_hoarder');
      if (a) unlocked.push(a);
    }
    
    return unlocked;
  }

  static getUnlockedAchievements(): Achievement[] {
    const stats = this.getStats();
    return stats.achievements.filter(a => a.unlocked);
  }

  static resetAllData(): void {
    localStorage.removeItem(this.HIGHSCORES_KEY);
    localStorage.removeItem(this.STATS_KEY);
  }
}
