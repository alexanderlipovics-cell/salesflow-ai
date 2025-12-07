import { useState, useEffect } from 'react';
import { Calculator, Users, TrendingUp, Download, Loader2, AlertCircle, Network } from 'lucide-react';
import { calculateCommissions, getAvailablePlans, type TeamMemberInput, type CommissionResponse } from '../../services/compensationApi';
import { loadAvailableCompanies } from '../../services/compensationService';
import { getDownlineFlat } from '../../services/genealogyApi';
import { supabase } from '../../lib/supabase';

interface Plan {
  id: string;
  name: string;
  type: string;
}

export default function CompensationSimulator() {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommissionResponse | null>(null);
  
  // Form State
  const [companyId, setCompanyId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [userRank, setUserRank] = useState('');
  const [userPersonalVolume, setUserPersonalVolume] = useState(0);
  const [userGroupVolume, setUserGroupVolume] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);
  
  // Available Plans
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadPlans();
    loadCompanies();
  }, []);

  const loadPlans = async () => {
    try {
      const plans = await getAvailablePlans();
      setAvailablePlans(plans.plans || []);
    } catch (err) {
      console.error('Error loading plans:', err);
    }
  };

  const loadCompanies = () => {
    const comps = loadAvailableCompanies();
    setCompanies(comps);
  };

  const handleLoadFromGenealogy = async () => {
    if (!companyId) {
      setError('Bitte wähle zuerst eine Firma aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Hole aktuellen User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht eingeloggt');
      }

      // Lade Downline-Struktur
      const downlineData = await getDownlineFlat(user.id, companyId, 5);
      
      if (!downlineData.members || downlineData.members.length === 0) {
        setError('Keine Team-Daten in Genealogy gefunden');
        return;
      }

      // Konvertiere zu TeamMemberInput Format
      const team: TeamMemberInput[] = downlineData.members.map((member: any) => ({
        id: member.id || `team-${Date.now()}-${Math.random()}`,
        name: member.name || `User ${member.user_id?.slice(0, 8)}`,
        rank: member.rank || 'Distributor',
        personal_volume: member.monthly_pv || 0,
        group_volume: member.monthly_gv || 0,
        is_active: member.is_active !== false,
        sponsor_id: member.sponsor_id || user.id,
      }));

      setTeamMembers(team);
      
      // Setze auch User-Daten wenn verfügbar
      const rootMember = downlineData.members.find((m: any) => m.user_id === user.id);
      if (rootMember) {
        setUserName(rootMember.name || user.email?.split('@')[0] || '');
        setUserRank(rootMember.rank || '');
        setUserPersonalVolume(rootMember.monthly_pv || 0);
        setUserGroupVolume(rootMember.monthly_gv || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden aus Genealogy');
      console.error('Error loading from genealogy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      {
        id: `team-${Date.now()}`,
        name: '',
        rank: '',
        personal_volume: 0,
        group_volume: 0,
        is_active: true,
        sponsor_id: 'user-1',
      },
    ]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleUpdateTeamMember = (index: number, field: keyof TeamMemberInput, value: any) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const handleCalculate = async () => {
    if (!companyId || !userName) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setCalculating(true);
    setError(null);
    setResult(null);

    try {
      const request = {
        company_id: companyId,
        user: {
          id: 'user-1',
          name: userName,
          rank: userRank || 'Distributor',
          personal_volume: userPersonalVolume,
          group_volume: userGroupVolume,
          is_active: true,
        },
        team: teamMembers.filter(m => m.name && m.personal_volume > 0),
      };

      const response = await calculateCommissions(request);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Berechnung');
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF Export wird implementiert...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="h-6 w-6 text-salesflow-accent" />
          <div>
            <h2 className="text-2xl font-semibold">Compensation Plan Simulator</h2>
            <p className="text-sm text-gray-400">
              Berechne deine Provisionen basierend auf Team-Struktur und Volumen
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Eingaben
          </h3>

          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Firma <span className="text-red-400">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-salesflow-accent focus:outline-none"
            >
              <option value="">Firma auswählen...</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Data */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Deine Daten</h4>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Max Mustermann"
                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rang</label>
                <input
                  type="text"
                  value={userRank}
                  onChange={(e) => setUserRank(e.target.value)}
                  placeholder="Supervisor"
                  className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Personal Volume</label>
                <input
                  type="number"
                  value={userPersonalVolume}
                  onChange={(e) => setUserPersonalVolume(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-salesflow-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Group Volume</label>
              <input
                type="number"
                value={userGroupVolume}
                onChange={(e) => setUserGroupVolume(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-salesflow-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Team-Mitglieder</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadFromGenealogy}
                  disabled={loading || !companyId}
                  className="px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Lade Team-Daten aus Genealogy Tree"
                >
                  <Network className="h-4 w-4" />
                  Aus Genealogy laden
                </button>
                <button
                  onClick={handleAddTeamMember}
                  className="px-3 py-1.5 text-sm bg-salesflow-accent/20 text-salesflow-accent rounded-lg hover:bg-salesflow-accent/30 transition"
                >
                  + Hinzufügen
                </button>
              </div>
            </div>

            {teamMembers.map((member, index) => (
              <div key={member.id} className="p-4 bg-black/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mitglied #{index + 1}</span>
                  <button
                    onClick={() => handleRemoveTeamMember(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Entfernen
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => handleUpdateTeamMember(index, 'name', e.target.value)}
                    className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Rang"
                    value={member.rank}
                    onChange={(e) => handleUpdateTeamMember(index, 'rank', e.target.value)}
                    className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Personal Volume"
                    value={member.personal_volume}
                    onChange={(e) => handleUpdateTeamMember(index, 'personal_volume', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Group Volume"
                    value={member.group_volume || 0}
                    onChange={(e) => handleUpdateTeamMember(index, 'group_volume', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
                  />
                </div>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Füge Team-Mitglieder hinzu, um Berechnungen durchzuführen
              </p>
            )}
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={calculating || !companyId || !userName}
            className="w-full px-6 py-3 bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {calculating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Berechne...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5" />
                Provisionen berechnen
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ergebnisse
            </h3>
            {result && (
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-salesflow-accent/20 text-salesflow-accent rounded-lg hover:bg-salesflow-accent/30 transition flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF Export
              </button>
            )}
          </div>

          {!result && !calculating && (
            <div className="text-center py-12 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Fülle das Formular aus und klicke auf "Berechnen"</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/20 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
                  <div className="text-2xl font-bold text-salesflow-accent">
                    {result.total_earnings.toFixed(2)} €
                  </div>
                </div>
                <div className="p-4 bg-black/20 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Total Volume</div>
                  <div className="text-2xl font-bold text-white">
                    {result.total_volume.toFixed(0)} PV
                  </div>
                </div>
              </div>

              {/* Rank Info */}
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Qualifizierter Rang</div>
                <div className="text-xl font-semibold text-white">{result.rank}</div>
              </div>

              {/* Commission Breakdown */}
              <div>
                <h4 className="font-semibold mb-3">Commission Breakdown</h4>
                <div className="space-y-2">
                  {result.commissions.map((comm, idx) => (
                    <div key={idx} className="p-3 bg-black/20 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{comm.type}</div>
                        <div className="text-sm text-gray-400">{comm.description}</div>
                      </div>
                      <div className="text-lg font-semibold text-salesflow-accent">
                        {comm.amount.toFixed(2)} €
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary by Type */}
              <div>
                <h4 className="font-semibold mb-3">Zusammenfassung nach Typ</h4>
                <div className="space-y-2">
                  {Object.entries(result.summary.by_type).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-black/10 rounded">
                      <span className="text-sm text-gray-400">{type}</span>
                      <span className="font-semibold text-white">{amount.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

