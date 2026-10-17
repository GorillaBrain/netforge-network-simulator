// Gamification & Progression Engine for NetForge
// Manages player levels, XP, achievements, streaks, and mission milestones

export const RANKS = [
  { level: 1, minXp: 0, title: 'Network Trainee', badge: '🔰' },
  { level: 2, minXp: 200, title: 'Packet Cadet', badge: '⚡' },
  { level: 3, minXp: 500, title: 'Subnet Apprentice', badge: '🛰️' },
  { level: 4, minXp: 900, title: 'Switch Master', badge: '🎛️' },
  { level: 5, minXp: 1400, title: 'Router Specialist', badge: '🌐' },
  { level: 6, minXp: 2000, title: 'Cyber Architect', badge: '🛡️' },
  { level: 7, minXp: 2800, title: 'Autonomous NetGod', badge: '👑' }
];

export const ACHIEVEMENTS = [
  { id: 'first_link', title: 'First Wire', desc: 'Connect two interfaces with an Ethernet cable', xp: 50, icon: '🔌' },
  { id: 'first_ping', title: 'Hello World', desc: 'Successfully deliver an ICMP Echo Request and Reply', xp: 100, icon: '🚀' },
  { id: 'arp_discovered', title: 'Address Resolver', desc: 'Witness dynamic ARP resolution and cache population', xp: 75, icon: '📡' },
  { id: 'subnet_master', title: 'Subnet Guru', desc: 'Use the Subnet Calculator to plan a network', xp: 50, icon: '🧮' },
  { id: 'cisco_ninja', title: 'IOS Operator', desc: 'Configure an interface or route using the Cisco CLI', xp: 100, icon: '💻' },
  { id: 'router_cross', title: 'Cross Subnet', desc: 'Route packets through a router gateway', xp: 150, icon: '🛣️' },
  { id: 'mission_1', title: 'Mission 01 Ace', desc: 'Complete Guided Lab 1: First Network', xp: 200, icon: '⭐' },
  { id: 'mission_all', title: 'Campaign Champion', desc: 'Complete all 5 guided networking labs', xp: 500, icon: '🏆' }
];

class GamificationManager {
  constructor() {
    this.xp = 0;
    this.unlockedAchievements = new Set();
    this.listeners = new Set();
    this.completedMissions = new Set();
    this.loadState();
  }

  loadState() {
    try {
      const data = localStorage.getItem('netforge_gamification_v1');
      if (data) {
        const parsed = JSON.parse(data);
        this.xp = parsed.xp || 0;
        this.unlockedAchievements = new Set(parsed.achievements || []);
        this.completedMissions = new Set(parsed.completedMissions || []);
      }
    } catch (e) {}
  }

  saveState() {
    try {
      localStorage.setItem('netforge_gamification_v1', JSON.stringify({
        xp: this.xp,
        achievements: Array.from(this.unlockedAchievements),
        completedMissions: Array.from(this.completedMissions)
      }));
    } catch (e) {}
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event) {
    this.listeners.forEach(cb => {
      try {
        cb(event, this.getState());
      } catch (e) {}
    });
  }

  addXp(amount, reason = '') {
    const prevRank = this.getRank();
    this.xp += amount;
    this.saveState();

    const newRank = this.getRank();
    const leveledUp = newRank.level > prevRank.level;

    this.notify({
      type: 'XP_GAINED',
      amount,
      reason,
      leveledUp,
      newRank: leveledUp ? newRank : null
    });

    return { leveledUp, newRank };
  }

  unlockAchievement(id) {
    if (this.unlockedAchievements.has(id)) return null;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return null;

    this.unlockedAchievements.add(id);
    this.saveState();
    this.addXp(ach.xp, `Achievement: ${ach.title}`);

    this.notify({
      type: 'ACHIEVEMENT_UNLOCKED',
      achievement: ach
    });

    return ach;
  }

  completeMission(missionId) {
    if (this.completedMissions.has(missionId)) return false;
    this.completedMissions.add(missionId);
    this.saveState();

    this.addXp(250, `Completed Mission ${missionId}`);
    if (missionId === 'lab-1') this.unlockAchievement('mission_1');
    if (this.completedMissions.size >= 5) this.unlockAchievement('mission_all');

    return true;
  }

  getRank() {
    let current = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (this.xp >= RANKS[i].minXp) {
        current = RANKS[i];
        break;
      }
    }
    return current;
  }

  getNextRank() {
    const current = this.getRank();
    const next = RANKS.find(r => r.level === current.level + 1);
    return next || null;
  }

  getXpProgress() {
    const current = this.getRank();
    const next = this.getNextRank();
    if (!next) return { percent: 100, currentInLevel: 0, neededInLevel: 0 };

    const currentInLevel = this.xp - current.minXp;
    const neededInLevel = next.minXp - current.minXp;
    const percent = Math.min(100, Math.round((currentInLevel / neededInLevel) * 100));
    return { percent, currentInLevel, neededInLevel, nextTitle: next.title };
  }

  getState() {
    const rank = this.getRank();
    const progress = this.getXpProgress();
    return {
      xp: this.xp,
      rank,
      progress,
      achievements: ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: this.unlockedAchievements.has(a.id)
      })),
      completedMissions: Array.from(this.completedMissions)
    };
  }
}

export const gamification = new GamificationManager();
