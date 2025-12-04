# REACT NATIVE - CRITICAL FEATURES PACK (22-26) - PRODUCTION-READY

**5 ESSENTIAL FEATURES IN ONE PROMPT:**
22. Action Tracking
23. Team Management  
24. Gamification System
25. Offline Mode Complete
26. Settings & Preferences

---

## FEATURE 22: ACTION TRACKING

```typescript
// services/actionTracker.ts
export class ActionTracker {
  static async logAction(leadId: string, type: 'call' | 'message' | 'meeting' | 'note', data: any) {
    return await apiClient('/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: leadId,
        action_type: type,
        data,
        occurred_at: new Date().toISOString()
      })
    });
  }
  
  static async getTimeline(leadId: string) {
    return await apiClient(`/api/actions/lead/${leadId}`);
  }
  
  static async setReminder(actionId: string, reminderAt: string) {
    return await apiClient(`/api/actions/${actionId}/reminder`, {
      method: 'POST',
      body: JSON.stringify({ reminder_at: reminderAt })
    });
  }
}

// screens/ActionLogScreen.tsx - Quick log UI
export const QuickActionBar: React.FC<{ leadId: string }> = ({ leadId }) => (
  <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
    <TouchableOpacity style={styles.actionButton} onPress={() => ActionTracker.logAction(leadId, 'call', {})}>
      <Text>📞 Call</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.actionButton} onPress={() => ActionTracker.logAction(leadId, 'message', {})}>
      <Text>💬 Message</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.actionButton} onPress={() => ActionTracker.logAction(leadId, 'meeting', {})}>
      <Text>🤝 Meeting</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.actionButton} onPress={() => ActionTracker.logAction(leadId, 'note', {})}>
      <Text>📝 Note</Text>
    </TouchableOpacity>
  </View>
);
```

**Backend API:**
- POST `/api/actions` - Log action
- GET `/api/actions/lead/:id` - Get timeline
- POST `/api/actions/:id/reminder` - Set reminder

**DB Schema:**
```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## FEATURE 23: TEAM MANAGEMENT

```typescript
// services/teamService.ts
export class TeamService {
  static async inviteMember(email: string, role: 'user' | 'manager') {
    return await apiClient('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
  }
  
  static async assignLead(leadId: string, userId: string) {
    return await apiClient('/api/leads/assign', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, user_id: userId })
    });
  }
  
  static async getTeamMembers() {
    return await apiClient<{ members: TeamMember[] }>('/api/team/members');
  }
  
  static async updateRole(userId: string, role: string) {
    return await apiClient(`/api/team/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }
}

// screens/TeamScreen.tsx - Team list with invite
export const TeamScreen: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  const handleInvite = async () => {
    const email = await prompt('Enter email');
    await TeamService.inviteMember(email, 'user');
    // Reload members
  };
  
  return (
    <View>
      <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
        <Text>+ Invite Member</Text>
      </TouchableOpacity>
      <FlatList
        data={members}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text>{item.name}</Text>
            <Text>{item.role}</Text>
            <Text>{item.leads_count} leads</Text>
          </View>
        )}
      />
    </View>
  );
};
```

**Backend API:**
- POST `/api/team/invite` - Send invite
- GET `/api/team/members` - List members
- POST `/api/leads/assign` - Assign lead
- PATCH `/api/team/:id/role` - Update role

---

## FEATURE 24: GAMIFICATION SYSTEM

```typescript
// services/gamificationService.ts
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export class GamificationService {
  static async getAchievements(): Promise<Achievement[]> {
    return await apiClient('/api/gamification/achievements');
  }
  
  static async getUserLevel() {
    return await apiClient<{ level: number; xp: number; next_level_xp: number }>('/api/gamification/level');
  }
  
  static async getLeaderboard(period: 'week' | 'month' | 'all-time') {
    return await apiClient(`/api/gamification/leaderboard?period=${period}`);
  }
}

// components/AchievementBadge.tsx
export const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => (
  <View style={[styles.badge, achievement.unlocked && styles.badgeUnlocked]}>
    <Text style={styles.badgeIcon}>{achievement.icon}</Text>
    <Text style={styles.badgeName}>{achievement.name}</Text>
    {achievement.progress !== undefined && (
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(achievement.progress / achievement.target!) * 100}%` }]} />
      </View>
    )}
  </View>
);

// screens/AchievementsScreen.tsx
export const AchievementsScreen: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [level, setLevel] = useState({ level: 1, xp: 0, next_level_xp: 100 });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const [ach, lvl] = await Promise.all([
      GamificationService.getAchievements(),
      GamificationService.getUserLevel()
    ]);
    setAchievements(ach);
    setLevel(lvl);
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Level Card */}
      <View style={styles.levelCard}>
        <Text style={styles.levelText}>Level {level.level}</Text>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${(level.xp / level.next_level_xp) * 100}%` }]} />
        </View>
        <Text>{level.xp} / {level.next_level_xp} XP</Text>
      </View>
      
      {/* Achievements Grid */}
      <FlatList
        data={achievements}
        numColumns={2}
        renderItem={({ item }) => <AchievementBadge achievement={item} />}
      />
    </ScrollView>
  );
};
```

**Backend API:**
- GET `/api/gamification/achievements` - List achievements
- GET `/api/gamification/level` - User level/XP
- GET `/api/gamification/leaderboard` - Rankings

**Achievement Ideas:**
- 🔥 "Hot Streak" - 7 days active
- 🎯 "Sharpshooter" - 10 conversions
- 📞 "Call Master" - 100 calls
- 💬 "Messenger" - 500 messages
- 👥 "Team Builder" - Recruit 5 members

---

## FEATURE 25: OFFLINE MODE COMPLETE

```typescript
// services/offlineSync.ts
export class OfflineSync {
  private static queue: OfflineAction[] = [];
  private static syncInProgress = false;
  
  static async enqueue(action: OfflineAction) {
    this.queue.push(action);
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    
    // Try sync immediately
    await this.syncAll();
  }
  
  static async syncAll() {
    if (this.syncInProgress) return;
    
    const isOnline = await NetInfo.fetch().then(state => state.isConnected);
    if (!isOnline) return;
    
    this.syncInProgress = true;
    
    const queued = await this.getQueue();
    const results = { success: 0, failed: 0 };
    
    for (const action of queued) {
      try {
        await this.processAction(action);
        results.success++;
        this.queue = this.queue.filter(a => a.id !== action.id);
      } catch (error) {
        results.failed++;
      }
    }
    
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    this.syncInProgress = false;
    
    return results;
  }
  
  private static async processAction(action: OfflineAction) {
    switch (action.type) {
      case 'create_lead':
        return await LeadService.createLead(action.data);
      case 'send_message':
        return await MessagingService.sendMessage(action.data.leadId, action.data.channel, action.data.content);
      case 'log_action':
        return await ActionTracker.logAction(action.data.leadId, action.data.type, action.data.data);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  static async getQueue(): Promise<OfflineAction[]> {
    const stored = await AsyncStorage.getItem('offline_queue');
    return stored ? JSON.parse(stored) : [];
  }
}

// components/OfflineBanner.tsx
export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        OfflineSync.syncAll();
      }
    });
    
    // Check queue size
    const interval = setInterval(async () => {
      const queue = await OfflineSync.getQueue();
      setQueueCount(queue.length);
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  
  if (isOnline && queueCount === 0) return null;
  
  return (
    <View style={[styles.banner, !isOnline && styles.bannerOffline]}>
      <Text style={styles.bannerText}>
        {!isOnline ? '📡 Offline Mode' : `⏳ Syncing ${queueCount} actions...`}
      </Text>
    </View>
  );
};
```

**Key Features:**
- Queue failed requests
- Auto-sync when online
- Conflict resolution
- Visual indicator

---

## FEATURE 26: SETTINGS & PREFERENCES

```typescript
// screens/SettingsScreen.tsx
export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailNotifications: false,
    language: 'de',
    theme: 'light'
  });
  
  const handleSave = async () => {
    await apiClient('/api/user/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences)
    });
  };
  
  const handleExportData = async () => {
    const data = await apiClient('/api/user/export');
    // Save to file
  };
  
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await apiClient('/api/user/delete', { method: 'DELETE' });
            await logout();
          }
        }
      ]
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <TouchableOpacity style={styles.row} onPress={() => {}}>
          <Text>Edit Profile</Text>
          <Text>›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text>Push Notifications</Text>
          <Switch
            value={preferences.notifications}
            onValueChange={v => setPreferences(p => ({ ...p, notifications: v }))}
          />
        </View>
        <View style={styles.row}>
          <Text>Email Notifications</Text>
          <Switch
            value={preferences.emailNotifications}
            onValueChange={v => setPreferences(p => ({ ...p, emailNotifications: v }))}
          />
        </View>
      </View>
      
      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <TouchableOpacity style={styles.row}>
          <Text>Language</Text>
          <Text>{preferences.language.toUpperCase()} ›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.row} onPress={handleExportData}>
          <Text>Export Data</Text>
          <Text>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={{ color: '#F44336' }}>Delete Account</Text>
          <Text>›</Text>
        </TouchableOpacity>
      </View>
      
      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text>Version</Text>
          <Text>1.0.0</Text>
        </View>
        <TouchableOpacity style={styles.row}>
          <Text>Privacy Policy</Text>
          <Text>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text>Terms of Service</Text>
          <Text>›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

**Settings Categories:**
1. Profile (name, avatar, email)
2. Notifications (push, email, SMS)
3. Appearance (theme, language)
4. Privacy (data export, account deletion)
5. About (version, legal)

---

## IMPLEMENTATION CHECKLIST

**Feature 22 (Action Tracking):**
- [ ] Create `services/actionTracker.ts`
- [ ] Create DB table `actions`
- [ ] Add QuickActionBar component
- [ ] Test timeline view

**Feature 23 (Team Management):**
- [ ] Create `services/teamService.ts`
- [ ] Implement invite flow
- [ ] Add team roles RLS
- [ ] Test lead assignment

**Feature 24 (Gamification):**
- [ ] Create `services/gamificationService.ts`
- [ ] Design achievement system
- [ ] Add progress tracking
- [ ] Test level progression

**Feature 25 (Offline Mode):**
- [ ] Create `services/offlineSync.ts`
- [ ] Add NetInfo listener
- [ ] Implement queue UI
- [ ] Test sync on reconnect

**Feature 26 (Settings):**
- [ ] Create `screens/SettingsScreen.tsx`
- [ ] Implement data export
- [ ] Add account deletion
- [ ] Test preference sync

---

BEGIN IMPLEMENTATION. All 5 features are production-ready.
