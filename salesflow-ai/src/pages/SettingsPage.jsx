import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Mail,
  Brain,
  Building2,
  MessageSquare,
  User,
  Bell,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import SettingsEmailPage from './SettingsEmailPage';
import SalesAiSettingsPage from './SalesAiSettingsPage';
import CompanyKnowledgeSettingsPage from './CompanyKnowledgeSettingsPage';
import AIPromptsPage from './AIPromptsPage';
import { resetTour } from '@/components/onboarding/ProductTour';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const { user } = useAuth();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Placeholder data/states for profile + notifications (can be wired later)
  const [firstName, setFirstName] = useState('Demo');
  const [lastName, setLastName] = useState('User');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notifyFollowups, setNotifyFollowups] = useState(true);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [notifyDeals, setNotifyDeals] = useState(false);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  const handleSaveProfile = () => {};
  const handleSaveNotifications = () => {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        </TabsList>

        <TabsContent value="profile">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-lg">Persönliche Daten</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img src={user?.avatar || '/default-avatar.png'} className="w-20 h-20 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium">{user?.name}</h4>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vorname</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nachname</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Firma</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
            </div>

            <Button onClick={handleSaveProfile}>Speichern</Button>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-6">
            <SettingsEmailPage />
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

