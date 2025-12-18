import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Mail,
  Brain,
  Building2,
  MessageSquare,
  User,
  Bell,
  Zap,
  Instagram,
  Building,
  Phone,
  Camera,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import SalesAiSettingsPage from './SalesAiSettingsPage';
import CompanyKnowledgeSettingsPage from './CompanyKnowledgeSettingsPage';
import AIPromptsPage from './AIPromptsPage';
import { AutopilotSettings } from '@/components/autopilot/AutopilotSettings';
import { resetTour } from '@/components/onboarding/ProductTour';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const { user } = useAuth();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Placeholder data/states for profile + notifications (can be wired later)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notifyFollowups, setNotifyFollowups] = useState(true);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [notifyDeals, setNotifyDeals] = useState(false);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Instagram Integration State
  const [instagramStatus, setInstagramStatus] = useState(null);
  const [loadingInstagram, setLoadingInstagram] = useState(false);

  // Email Integration State
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [emailAccountsLoading, setEmailAccountsLoading] = useState(false);

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Check URL params for Instagram connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('instagram_connected')) {
      fetchInstagramStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.search.replace(/[?&]instagram_connected=true/, ''));
    } else if (params.get('instagram_error')) {
      const error = params.get('instagram_error');
      console.error('Instagram connection error:', error);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.search.replace(/[?&]instagram_error=[^&]*/, ''));
    }
  }, []);

  // Load user profile data from API
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log('[Settings] Loading user profile from API...');
        const userData = await api.get('/auth/me');
        console.log('[Settings] User profile loaded:', userData);
        
        // Set all user data from API response
        if (userData) {
          setFirstName(userData.first_name || '');
          setLastName(userData.last_name || '');
          setPhone(userData.phone || '');
          setCompany(userData.company || '');
        }
      } catch (error) {
        console.error('[Settings] Failed to load user profile:', error);
        // Fallback to auth context user if API fails
        if (user) {
          if (user.first_name) {
            setFirstName(user.first_name);
          } else if (user.name) {
            const nameParts = user.name.split(' ');
            setFirstName(nameParts[0] || '');
            if (nameParts.length > 1) {
              setLastName(nameParts.slice(1).join(' ') || '');
            }
          }
          if (user.last_name) {
            setLastName(user.last_name);
          }
          if (user.phone) {
            setPhone(user.phone);
          }
          if (user.company) {
            setCompany(user.company);
          }
        }
      }
    };

    loadUserProfile();
  }, []); // Only run once on mount

  // Fetch Instagram status on mount and when email tab is active
  useEffect(() => {
    if (activeTab === 'email') {
      fetchInstagramStatus();
      checkGmailStatus();
      loadEmailAccounts();
    }
  }, [activeTab]);

  // Check for Gmail connection callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected')) {
      checkGmailStatus();
      loadEmailAccounts();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.search.replace(/[?&]gmail_connected=true/, ''));
    }
  }, []);

  const fetchInstagramStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/instagram/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInstagramStatus(data);
      } else {
        setInstagramStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error fetching Instagram status:', error);
      setInstagramStatus({ connected: false });
    }
  };

  const connectInstagram = async () => {
    setLoadingInstagram(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/instagram/auth?redirect_url=/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Redirect to Instagram OAuth
        window.location.href = data.auth_url;
      } else {
        console.error('Failed to start Instagram auth');
        setLoadingInstagram(false);
      }
    } catch (error) {
      console.error('Failed to start Instagram auth:', error);
      setLoadingInstagram(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!confirm('Instagram-Verbindung wirklich trennen?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/instagram/disconnect`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setInstagramStatus({ connected: false });
      }
    } catch (error) {
      console.error('Failed to disconnect Instagram:', error);
    }
  };

  // Gmail Integration Functions
  const checkGmailStatus = async () => {
    setGmailLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/auth/google/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data);
      } else {
        setGmailStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setGmailStatus({ connected: false });
    } finally {
      setGmailLoading(false);
    }
  };

  const connectGmail = async () => {
    setGmailLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/auth/google/connect?redirect_url=/settings?tab=email`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.auth_url;
      } else {
        setGmailLoading(false);
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setGmailLoading(false);
    }
  };

  const disconnectGmail = async () => {
    if (!confirm('Gmail-Verbindung wirklich trennen?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setGmailStatus({ connected: false });
        loadEmailAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
  };

  // Load email accounts
  const loadEmailAccounts = async () => {
    setEmailAccountsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/emails/accounts`,
        { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setEmailAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error('Konten konnten nicht geladen werden', e);
    } finally {
      setEmailAccountsLoading(false);
    }
  };

  const connectOutlook = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/emails/connect/outlook`,
        { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (e) {
      console.error('OAuth-Start fehlgeschlagen', e);
    }
  };

  const disconnectOutlook = async (id) => {
    if (!confirm('Outlook-Verbindung wirklich trennen?')) return;
    try {
      await fetch(
        `${API_BASE_URL}/api/emails/accounts/${id}`,
        { method: 'DELETE', credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      await loadEmailAccounts();
    } catch (e) {
      console.error('Fehler beim Trennen', e);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      console.log('[Settings] Saving profile:', { firstName, lastName, phone, company });
      
      const result = await api.patch('/auth/me', {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        company: company
      });
      
      console.log('[Settings] Save result:', result);
      alert('Profil gespeichert!');
    } catch (error) {
      console.error('[Settings] Save error:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = () => {};

  const handleAvatarUpload = () => {
    console.log('[Settings] Avatar upload initiated');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        console.log('[Settings] No file selected');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('Bitte wähle ein Bild unter 2MB aus.');
        return;
      }

      console.log('[Settings] Uploading avatar:', file.name, 'Size:', file.size, 'bytes');

      setUploadingAvatar(true);
      try {
        // Upload to Supabase Storage (direct from frontend is OK for public storage)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log('[Settings] Uploading to storage path:', filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            contentType: file.type || `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          console.error('[Settings] Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('[Settings] File uploaded successfully:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const avatarUrl = urlData.publicUrl;
        console.log('[Settings] Avatar public URL:', avatarUrl);

        // Update user profile with avatar URL via Backend API
        const result = await api.patch('/auth/me', {
          avatar_url: avatarUrl,
        });

        console.log('[Settings] Avatar uploaded and profile updated successfully:', result);
        alert('Profilbild erfolgreich hochgeladen!');
        // Optionally refresh user data
        window.location.reload(); // Simple reload to refresh user data
      } catch (error) {
        console.error('[Settings] Avatar upload exception:', error);
        alert(`Fehler beim Hochladen: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  };

  const handleAvatarRemove = async () => {
    if (!confirm('Profilbild wirklich entfernen?')) {
      return;
    }

    console.log('[Settings] Removing avatar');
    try {
      const result = await api.patch('/auth/me', {
        avatar_url: null,
      });

      console.log('[Settings] Avatar removed successfully:', result);
      alert('Profilbild erfolgreich entfernt!');
      window.location.reload();
    } catch (error) {
      console.error('[Settings] Avatar removal error:', error);
      alert(`Fehler beim Entfernen: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Einstellungen
        </h1>
        <p className="text-gray-500">Verwalte dein Konto und Präferenzen</p>
        <div className="mt-3">
          <button
            onClick={() => {
              if (user?.id) {
                resetTour(user.id);
                window.location.reload();
              }
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            🎓 Produkt-Tour neu starten
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap gap-1 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Firmenwissen
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Prompts
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Benachrichtigungen
          </TabsTrigger>
          <TabsTrigger value="autopilot" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Autopilot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-800 bg-gray-900/50">
              <h1 className="text-2xl font-bold text-white">Profil Einstellungen</h1>
              <p className="text-gray-400 mt-1">Verwalte deine persönlichen Daten und Kontoinformationen.</p>
            </div>

            <div className="p-8">
              {/* SECTION 1: Avatar */}
              <SectionHeader title="Profilbild" />
              <AvatarUpload 
                user={user} 
                onUpload={handleAvatarUpload} 
                onRemove={handleAvatarRemove}
                uploadingAvatar={uploadingAvatar}
              />

              {/* SECTION 2: Persönliche Daten */}
              <div className="mt-10">
                <SectionHeader 
                  title="Persönliche Daten" 
                  description="Diese Informationen werden auf deinem Profil angezeigt."
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    label="Vorname" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Dein Vorname"
                    icon={User}
                  />
                  <InputField 
                    label="Nachname" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dein Nachname"
                    icon={User}
                  />
                  
                  {/* Email - Readonly */}
                  <div className="md:col-span-2">
                    <InputField 
                      label="Email Adresse" 
                      value={user?.email || ''}
                      type="email" 
                      disabled={true}
                      icon={Mail}
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Die Email-Adresse kann nur über den Support geändert werden.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Firmen Details */}
              <div className="mt-10">
                <SectionHeader title="Firmeninformationen" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    label="Firma" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Deine Firma"
                    icon={Building}
                  />
                  <InputField 
                    label="Telefonnummer" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 123 4567890"
                    icon={Phone}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-12 pt-6 border-t border-gray-800 flex justify-end gap-4">
                <button className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                  Abbrechen
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {savingProfile ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-800 bg-gray-900/50">
              <h1 className="text-2xl font-bold text-white">Integrationen & E-Mail</h1>
              <p className="text-gray-400 mt-1">Verwalte deine verbundenen Kanäle für Nachrichten und Automatisierung.</p>
            </div>

            <div className="p-8 space-y-10">
              {/* SECTION 1: Social Media */}
              <section>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Social Media</h3>
                  <p className="text-sm text-gray-500">
                    Verbinde deine sozialen Netzwerke, um DMs direkt in Al Sales Systems zu empfangen.
                  </p>
                </div>
                
                <IntegrationRow 
                  icon={Instagram}
                  title="Instagram Business"
                  description="Empfange und beantworte Direct Messages direkt aus dem CRM."
                  brandColorClass="text-pink-500"
                  isConnected={instagramStatus?.connected || false}
                  connectedAccount={instagramStatus?.username ? `@${instagramStatus.username}` : ''}
                  onConnect={connectInstagram}
                  onDisconnect={disconnectInstagram}
                  isLoading={loadingInstagram}
                />
              </section>

              {/* SECTION 2: E-Mail Konten */}
              <section>
                <div className="mb-4 border-t border-gray-800 pt-8">
                  <h3 className="text-lg font-semibold text-white">E-Mail Konten</h3>
                  <p className="text-sm text-gray-500">
                    Synchronisiere deinen Posteingang für 2-Wege-Kommunikation.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Gmail */}
                  <IntegrationRow 
                    icon={Mail}
                    title="Gmail Integration"
                    description="Verbinde dein Google Workspace Konto."
                    brandColorClass="text-red-500"
                    isConnected={gmailStatus?.connected || false}
                    connectedAccount={gmailStatus?.email || ''}
                    onConnect={connectGmail}
                    onDisconnect={disconnectGmail}
                    onRefresh={checkGmailStatus}
                    isLoading={gmailLoading}
                  />

                  {/* Outlook - Check if connected via emailAccounts */}
                  {emailAccounts
                    .filter(acc => acc.provider === 'outlook' || acc.provider === 'microsoft')
                    .map(acc => (
                      <IntegrationRow 
                        key={acc.id}
                        icon={Mail}
                        title="Outlook / Exchange"
                        description="Verbinde dein Microsoft Outlook oder Exchange Konto."
                        brandColorClass="text-blue-500"
                        isConnected={true}
                        connectedAccount={acc.email}
                        onConnect={connectOutlook}
                        onDisconnect={() => disconnectOutlook(acc.id)}
                        isLoading={false}
                      />
                    ))}

                  {/* Outlook - Not connected */}
                  {!emailAccounts.some(acc => acc.provider === 'outlook' || acc.provider === 'microsoft') && (
                    <IntegrationRow 
                      icon={Mail}
                      title="Outlook / Exchange"
                      description="Verbinde dein Microsoft Outlook oder Exchange Konto."
                      brandColorClass="text-blue-500"
                      isConnected={false}
                      connectedAccount=""
                      onConnect={connectOutlook}
                      onDisconnect={() => {}}
                      isLoading={false}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-6">
            <SalesAiSettingsPage />
          </div>
        </TabsContent>

        <TabsContent value="company">
          <div className="space-y-6">
            <CompanyKnowledgeSettingsPage />
          </div>
        </TabsContent>

        <TabsContent value="prompts">
          <div className="space-y-6">
            <AIPromptsPage />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Benachrichtigungen</h3>
            <div className="space-y-4">
              <NotificationRow
                title="Follow-up Erinnerungen"
                description="Wenn ein Follow-up fällig ist"
                checked={notifyFollowups}
                onChange={setNotifyFollowups}
              />
              <NotificationRow
                title="Neue Leads"
                description="Wenn ein neuer Lead reinkommt"
                checked={notifyNewLeads}
                onChange={setNotifyNewLeads}
              />
              <NotificationRow
                title="Deal Updates"
                description="Wenn sich ein Deal Status ändert"
                checked={notifyDeals}
                onChange={setNotifyDeals}
              />
              <NotificationRow
                title="Team Aktivitäten"
                description="Updates von Team-Mitgliedern"
                checked={notifyTeam}
                onChange={setNotifyTeam}
              />
              <NotificationRow
                title="Email Benachrichtigungen"
                description="Zusammenfassung per E-Mail"
                checked={notifyEmail}
                onChange={setNotifyEmail}
              />
            </div>
            <Button onClick={handleSaveNotifications} className="mt-4">
              Speichern
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="autopilot">
          <div className="space-y-6">
            <AutopilotSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const NotificationRow = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </div>
);

// Input Field Component
const InputField = ({ label, type = "text", value, onChange, placeholder, disabled = false, icon: Icon }) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-sm font-medium text-gray-400 ml-1">
      {label}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-500 transition-colors">
          <Icon size={18} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full bg-gray-800 text-white rounded-lg border 
          py-2.5 px-4 ${Icon ? 'pl-10' : ''}
          transition-all duration-200 ease-in-out outline-none
          ${disabled 
            ? 'border-gray-700 opacity-50 cursor-not-allowed text-gray-500' 
            : 'border-gray-700 hover:border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
          }
        `}
      />
    </div>
  </div>
);

// Section Header Component
const SectionHeader = ({ title, description }) => (
  <div className="mb-6 border-b border-gray-800 pb-4">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    {description && (
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    )}
  </div>
);

// Avatar Upload Component
const AvatarUpload = ({ user, onUpload, onRemove, uploadingAvatar = false }) => (
  <div className="flex items-center gap-6 mb-8">
    <div className="relative group w-24 h-24 shrink-0">
      <div className="w-full h-full rounded-full overflow-hidden border-2 border-gray-700 bg-gray-800 flex items-center justify-center">
        {user?.avatar ? (
          <img 
            src={user.avatar}
            alt="Profile" 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity"
          />
        ) : (
          <span className="text-2xl text-gray-400 font-medium">
            {user?.first_name?.[0] || user?.name?.[0] || 'U'}{user?.last_name?.[0] || user?.name?.split(' ')?.[1]?.[0] || ''}
          </span>
        )}
      </div>
      
      <button 
        onClick={onUpload}
        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer border-2 border-teal-500"
      >
        <Camera className="text-white w-8 h-8" />
      </button>
      
      <div className="absolute bottom-1 right-1 w-5 h-5 bg-teal-500 border-4 border-gray-900 rounded-full"></div>
    </div>

      <div className="flex flex-col">
      <h3 className="text-white font-medium text-lg">Dein Profilbild</h3>
      <p className="text-gray-400 text-sm mb-3">Lade ein Bild hoch (max. 2MB).</p>
      <div className="flex gap-3">
        <button 
          onClick={onRemove}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-md border border-gray-700 transition-colors"
        >
          Entfernen
        </button>
        <button 
          onClick={onUpload}
          disabled={uploadingAvatar}
          className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-sm font-medium rounded-md border border-teal-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingAvatar ? 'Hochladen...' : 'Hochladen'}
        </button>
      </div>
    </div>
  </div>
);

// Integration Row Component
const IntegrationRow = ({ 
  icon: Icon, 
  title, 
  description, 
  isConnected, 
  connectedAccount, 
  brandColorClass,
  onConnect,
  onDisconnect,
  onRefresh,
  isLoading = false
}) => {
  return (
    <div className={`
      flex flex-col md:flex-row md:items-center justify-between 
      p-5 rounded-lg border transition-all duration-200
      ${isConnected 
        ? 'bg-gray-800/50 border-teal-500/30'
        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }
    `}>
      {/* Linke Seite: Icon & Info */}
      <div className="flex items-start gap-4 mb-4 md:mb-0">
        <div className={`p-3 rounded-lg bg-gray-900 border border-gray-700 ${brandColorClass}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="text-white font-medium text-base flex items-center gap-2">
            {title}
            {isConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <CheckCircle size={12} className="mr-1" /> Verbunden
              </span>
            )}
          </h4>
          <p className="text-gray-400 text-sm mt-1 max-w-md">
            {isConnected 
              ? `Verbunden mit: ${connectedAccount}` 
              : description}
          </p>
        </div>
      </div>

      {/* Rechte Seite: Actions */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2 text-gray-400 hover:text-white transition-colors" 
                title="Sync Status prüfen"
              >
                <RefreshCw size={18} />
              </button>
            )}
            <button 
              onClick={onDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
            >
              Trennen
            </button>
          </>
        ) : (
          <button 
            onClick={onConnect}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-500 shadow-lg shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Verbinden...
              </>
            ) : (
              <>
                Verbinden <ExternalLink size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

