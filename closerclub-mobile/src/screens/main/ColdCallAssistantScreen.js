import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Collapsible from "react-native-collapsible";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { mobileApi } from "../../services/api";

const Tab = createMaterialTopTabNavigator();

/**
 * Beispiel-Strukturen für Backend-Responses:
 *
 * Contact:
 * {
 *   id: string,
 *   name: string,
 *   company?: string,
 *   phone?: string
 * }
 *
 * PersonalizedScript:
 * {
 *   contact_name: string,
 *   company_name: string,
 *   goal: "book_meeting" | "qualify" | "identify_decision_maker",
 *   sections: [
 *     {
 *       section_type: "opener" | "objection_response" | "close",
 *       title: string,
 *       script: string,
 *       tips: string[]
 *     }
 *   ],
 *   suggested_objections: string[]
 * }
 *
 * ColdCallSession:
 * {
 *   id: string,
 *   contact_id: string,
 *   contact_name: string,
 *   goal: string,
 *   status: "planned" | "in_progress" | "completed",
 *   mode?: "live" | "practice",
 *   duration_seconds?: number,
 *   notes?: string
 * }
 */

// Einwand-Bibliothek (lokal)
const OBJECTION_LIBRARY = [
  {
    key: "too_expensive",
    label: "„Das ist mir zu teuer“",
    response:
      "Verstehe ich total – genau deswegen ist es wichtig, dass sich jeder investierte Euro rechnet. Darf ich dir kurz zeigen, wie sich das in deinem Alltag wirklich auszahlt?",
  },
  {
    key: "no_time",
    label: "„Ich habe gerade keine Zeit“",
    response:
      "Absolut nachvollziehbar. Darum halten wir das Gespräch kurz und fokussiert. Wenn wir heute in 10 Minuten klären, ob es überhaupt Sinn macht, sparst du dir langfristig viel Zeit.",
  },
  {
    key: "send_info",
    label: "„Schick mir Infos per Mail“",
    response:
      "Sehr gerne – ich kann dir Infos schicken. Erfahrungsgemäß ist ein kurzes Gespräch wertvoller, weil wir direkt auf deine Situation eingehen können. Sollen wir 10 Minuten einplanen?",
  },
  {
    key: "already_have_solution",
    label: "„Wir haben schon eine Lösung“",
    response:
      "Super, dass ihr bereits etwas im Einsatz habt. Genau dann macht ein kurzer Vergleich Sinn: Wenn es nicht besser ist, bleiben wir einfach bei deinem aktuellen Setup – fair?",
  },
];

// --- Timer Komponente (Call-Dauer) ---
function CallTimer({ isRunning, initialSeconds = 0, onTick }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    // Reset, wenn initialSeconds sich ändert (z.B. Session-Wechsel)
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (onTick) onTick(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, onTick]);

  const formatTime = (total) => {
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n) => n.toString().padStart(2, "0");
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>Call Timer</Text>
      <Text style={styles.timerValue}>{formatTime(seconds)}</Text>
    </View>
  );
}

// --- Hauptscreen (verwaltet State für alle Tabs) ---
export default function ColdCallAssistantScreen() {

  // Kontakte
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsRefreshing, setContactsRefreshing] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [search, setSearch] = useState("");

  // Script
  const [goal, setGoal] = useState("book_meeting");
  const [selectedContact, setSelectedContact] = useState(null);
  const [script, setScript] = useState(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(null);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [isCallRunning, setIsCallRunning] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [notes, setNotes] = useState("");

  // UI Feedback
  const [toastMessage, setToastMessage] = useState(null);

  // Einwand-Bottom-Sheet
  const bottomSheetRef = useRef(null);
  const [selectedObjection, setSelectedObjection] = useState(null);
  const [selectedObjectionAnswer, setSelectedObjectionAnswer] = useState("");
  const snapPoints = useMemo(() => ["25%", "50%"], []);

  // --- Snackbar / Toast Light ---
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // --- Kontakte laden ---
  const loadContacts = useCallback(
    async (withLoading = true) => {
      try {
        if (withLoading) setContactsLoading(true);
        setContactsError(null);
        const contacts = await mobileApi.getColdCallContacts();
        setContacts(contacts || []);
      } catch (err) {
        console.error(err);
        setContactsError("Kontakte konnten nicht geladen werden.");
      } finally {
        setContactsLoading(false);
        setContactsRefreshing(false);
      }
    },
    []
  );

  // --- Sessions laden (TODO: Wenn Backend Sessions-Endpoint hat) ---
  const loadSessions = useCallback(
    async (withLoading = true) => {
      try {
        if (withLoading) setSessionsLoading(true);
        setSessionsError(null);
        // TODO: Wenn Backend Sessions-Endpoint hat
        setSessions([]);
      } catch (err) {
        console.error(err);
        setSessionsError("Sessions konnten nicht geladen werden.");
      } finally {
        setSessionsLoading(false);
        setSessionsRefreshing(false);
      }
    },
    []
  );

  // Initial Load
  useEffect(() => {
    loadContacts(true);
    loadSessions(true);
  }, [loadContacts, loadSessions]);

  // --- Script generieren ---
  const generateScript = useCallback(
    async (contactId, callGoal) => {
      if (!contactId) return;
      try {
        setScriptLoading(true);
        setScriptError(null);
        setActiveSectionIndex(null);

        const contact = contacts.find(c => c.id === contactId);
        const data = await mobileApi.generateColdCallScript({
          contact_id: contactId,
          contact_name: contact?.name,
          company_name: contact?.company,
          goal: callGoal,
        });
        setScript(data);
        setToastMessage("Script aktualisiert.");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err) {
        console.error(err);
        setScript(null);
        setScriptError("Script konnte nicht generiert werden.");
      } finally {
        setScriptLoading(false);
      }
    },
    [contacts]
  );

  const handleSelectContact = useCallback(
    (contact) => {
      setSelectedContact(contact);
      setNotes("");
      setCurrentSession(null);
      setIsCallRunning(false);
      setCallSeconds(0);
      setSelectedObjection(null);
      setSelectedObjectionAnswer("");
      generateScript(contact.id, goal);
    },
    [generateScript, goal]
  );

  const handleGoalChange = useCallback(
    (nextGoal) => {
      setGoal(nextGoal);
      if (selectedContact) {
        generateScript(selectedContact.id, nextGoal);
      }
    },
    [selectedContact, generateScript]
  );

  // --- Session / Call Handling ---
  const createSession = useCallback(
    async (mode) => {
      if (!selectedContact) return null;
      try {
        const newSession = await mobileApi.startColdCallSession({
          contact_id: selectedContact.id,
          goal: goal || 'book_meeting',
          mode: mode,
        });
        setSessions((prev) => [newSession, ...prev]);
        return newSession;
      } catch (err) {
        console.error(err);
        setSessionsError("Session konnte nicht erstellt werden.");
        return null;
      }
    },
    [goal, selectedContact]
  );

  const startSessionOnServer = useCallback(
    async (sessionId) => {
      const updated = await mobileApi.updateColdCallSession(sessionId, {
        status: 'in_progress',
      });
      return updated;
    },
    []
  );

  const completeSessionOnServer = useCallback(
    async (sessionId, duration, notesText) => {
      const updated = await mobileApi.updateColdCallSession(sessionId, {
        status: 'completed',
        duration_seconds: duration,
        notes: notesText,
      });
      return updated;
    },
    []
  );

  const handleStartCall = useCallback(
    async (mode) => {
      if (!selectedContact) {
        setToastMessage("Bitte zuerst einen Kontakt wählen.");
        return;
      }
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        let session = currentSession;
        if (!session || session.mode !== mode) {
          session = await createSession(mode);
        }
        if (!session) return;

        const updated = await startSessionOnServer(session.id);
        setCurrentSession(updated);
        setSessions((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setIsCallRunning(true);
        setCallSeconds(updated.duration_seconds || 0);
        setToastMessage(
          mode === "live" ? "Live-Call gestartet." : "Übungsmodus gestartet."
        );
      } catch (err) {
        console.error(err);
        setSessionsError("Session konnte nicht gestartet werden.");
      }
    },
    [selectedContact, createSession, startSessionOnServer, currentSession]
  );

  const handleEndCall = useCallback(async () => {
    if (!currentSession) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = await completeSessionOnServer(
        currentSession.id,
        callSeconds,
        notes
      );
      setCurrentSession(updated);
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setIsCallRunning(false);
      setToastMessage("Session abgeschlossen.");
    } catch (err) {
      console.error(err);
      setSessionsError("Session konnte nicht abgeschlossen werden.");
    }
  }, [currentSession, callSeconds, notes, completeSessionOnServer]);

  // --- Clipboard ---
  const copyToClipboard = useCallback(async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setToastMessage("Script in Zwischenablage kopiert.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // --- Einwand-Logik für Bottom Sheet ---
  const openObjectionSheet = useCallback(
    (objectionKey, labelFromScript) => {
      let answer = "";

      const fromLib = OBJECTION_LIBRARY.find((o) => o.key === objectionKey);
      if (fromLib) {
        answer = fromLib.response;
      } else if (script) {
        const section = (script.sections || []).find(
          (s) => s.section_type === "objection_response"
        );
        if (section) {
          answer = section.script;
        }
      }

      if (!answer && labelFromScript) {
        answer = labelFromScript;
      }

      setSelectedObjection(objectionKey);
      setSelectedObjectionAnswer(
        answer ||
          "Nutze deine Einwandbehandlung: Wiederhole den Einwand, zeige Verständnis und verknüpfe mit einem klaren Nutzen."
      );
      if (bottomSheetRef.current) {
        bottomSheetRef.current.expand();
      }
    },
    [script]
  );

  const renderBottomSheetBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  // --- Gefilterte Kontakte ---
  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => {
      const haystack =
        `${c.name || ""} ${c.company || ""} ${c.phone || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [contacts, search]);

  // --- Tabs: Sub-Komponenten ---

  function ContactsTab() {
    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Kontakt suchen…"
            placeholderTextColor="#7c7c8a"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {contactsError ? (
          <Text style={styles.errorText}>{contactsError}</Text>
        ) : null}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={contactsRefreshing}
              onRefresh={() => {
                setContactsRefreshing(true);
                loadContacts(false);
              }}
              tintColor="#a3e635"
            />
          }
          renderItem={({ item }) => {
            const isSelected = selectedContact?.id === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleSelectContact(item)}
                style={[
                  styles.contactCard,
                  isSelected && styles.contactCardSelected,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>
                    {item.name || "Unbekannter Kontakt"}
                  </Text>
                  <Text style={styles.contactCompany}>
                    {item.company || "—"}
                  </Text>
                  {item.phone ? (
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !contactsLoading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Keine Kontakte gefunden. Ziehe zum Aktualisieren.
                </Text>
              </View>
            )
          }
        />
      </View>
    );
  }

  function ScriptTab() {
    const scriptSections = script?.sections || [];
    const suggested = script?.suggested_objections || [];

    return (
      <View style={styles.tabContainer}>
        {/* Call Header mit Timer & Controls */}
        <View style={styles.callHeader}>
          <CallTimer
            isRunning={isCallRunning}
            initialSeconds={currentSession?.duration_seconds || callSeconds}
            onTick={(sec) => setCallSeconds(sec)}
          />
          <View style={styles.callControls}>
            <TouchableOpacity
              style={[
                styles.callButton,
                !selectedContact && styles.callButtonDisabled,
              ]}
              disabled={!selectedContact || isCallRunning}
              onPress={() => handleStartCall("live")}
            >
              <Text style={styles.callButtonText}>Live-Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.callButtonSecondary,
                !selectedContact && styles.callButtonDisabled,
              ]}
              disabled={!selectedContact || isCallRunning}
              onPress={() => handleStartCall("practice")}
            >
              <Text style={styles.callButtonText}>Üben</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.callButtonEnd,
                !currentSession && styles.callButtonDisabled,
              ]}
              disabled={!currentSession}
              onPress={handleEndCall}
            >
              <Text style={styles.callButtonText}>Ende</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ziel-Selector */}
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>Ziel:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { value: "book_meeting", label: "Termin buchen" },
              { value: "qualify", label: "Qualifizieren" },
              {
                value: "identify_decision_maker",
                label: "Entscheider:in finden",
              },
            ].map((option) => {
              const isActive = goal === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleGoalChange(option.value)}
                  style={[
                    styles.goalChip,
                    isActive && styles.goalChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      isActive && styles.goalChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Script-Body + Notizen */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scriptScrollContent}
        >
          {scriptError ? (
            <Text style={styles.errorText}>{scriptError}</Text>
          ) : null}

          {/* Script Sections */}
          <View style={styles.scriptContainer}>
            <View style={styles.scriptHeaderRow}>
              <Text style={styles.sectionTitle}>Script</Text>
              {selectedContact && (
                <TouchableOpacity
                  style={styles.smallOutlineButton}
                  onPress={() =>
                    generateScript(selectedContact.id, goal)
                  }
                  disabled={scriptLoading}
                >
                  <Text style={styles.smallOutlineButtonText}>
                    {scriptLoading ? "…" : "Neu generieren"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!script && !scriptLoading && (
              <Text style={styles.placeholderText}>
                Wähle einen Kontakt, um ein personalisiertes Script zu
                generieren.
              </Text>
            )}
            {scriptSections.map((section, index) => {
              const isOpen = activeSectionIndex === index;
              return (
                <View key={`${section.title}-${index}`} style={styles.accordion}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() =>
                      setActiveSectionIndex(isOpen ? null : index)
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accordionBadge}>
                        {section.section_type}
                      </Text>
                      <Text style={styles.accordionTitle}>
                        {section.title}
                      </Text>
                    </View>
                    <View style={styles.accordionHeaderRight}>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(section.script)}
                        style={styles.copyChip}
                      >
                        <Text style={styles.copyChipText}>Copy</Text>
                      </TouchableOpacity>
                      <Text style={styles.accordionChevron}>
                        {isOpen ? "▲" : "▼"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Collapsible collapsed={!isOpen}>
                    <View style={styles.accordionBody}>
                      <Text style={styles.scriptText}>
                        {section.script}
                      </Text>
                      {section.tips && section.tips.length > 0 && (
                        <View style={styles.tipsContainer}>
                          {section.tips.map((tip, i) => (
                            <Text key={i} style={styles.tipText}>
                              • {tip}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </Collapsible>
                </View>
              );
            })}
          </View>

          {/* Suggested Objections Buttons */}
          {suggested.length > 0 && (
            <View style={styles.suggestedObjections}>
              <Text style={styles.sectionTitle}>Empfohlene Einwände</Text>
              <View style={styles.objectionChipRow}>
                {suggested.map((obj, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.objectionChip}
                    onPress={() =>
                      openObjectionSheet(`script_${idx}`, obj)
                    }
                  >
                    <Text style={styles.objectionChipText}>{obj}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Notizen */}
          <View style={styles.notesContainer}>
            <Text style={styles.sectionTitle}>Notizen</Text>
            <Text style={styles.notesHint}>
              Deine Notizen werden beim Abschließen der Session gespeichert.
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Wichtige Infos, Einwände, Follow-ups…"
              placeholderTextColor="#6b7280"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </ScrollView>

        {/* Einwand-Bottom-Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBottomSheetBackdrop}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetHandle}
        >
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Einwand-Bibliothek</Text>
            <ScrollView style={{ flex: 1 }}>
              {OBJECTION_LIBRARY.map((obj) => (
                <TouchableOpacity
                  key={obj.key}
                  style={styles.objectionListItem}
                  onPress={() => {
                    openObjectionSheet(obj.key);
                  }}
                >
                  <Text style={styles.objectionListTitle}>{obj.label}</Text>
                  <Text style={styles.objectionListPreview} numberOfLines={2}>
                    {obj.response}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.objectionAnswerBox}>
              <Text style={styles.objectionAnswerLabel}>Antwort:</Text>
              <ScrollView>
                <Text style={styles.objectionAnswerText}>
                  {selectedObjectionAnswer || "Kein Einwand ausgewählt."}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.copyObjectionButton}
                onPress={() =>
                  selectedObjectionAnswer &&
                  copyToClipboard(selectedObjectionAnswer)
                }
              >
                <Text style={styles.copyObjectionButtonText}>
                  Antwort kopieren
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheet>
      </View>
    );
  }

  function SessionsTab() {
    return (
      <View style={styles.tabContainer}>
        {sessionsError ? (
          <Text style={styles.errorText}>{sessionsError}</Text>
        ) : null}
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={sessionsRefreshing}
              onRefresh={() => {
                setSessionsRefreshing(true);
                loadSessions(false);
              }}
              tintColor="#a3e635"
            />
          }
          renderItem={({ item }) => {
            const isCurrent = currentSession?.id === item.id;
            const durationMin = item.duration_seconds
              ? Math.round(item.duration_seconds / 60)
              : 0;
            return (
              <View
                style={[
                  styles.sessionCard,
                  isCurrent && styles.sessionCardCurrent,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>
                    {item.contact_name || "Unbekannter Kontakt"}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    Ziel: {item.goal || "–"} · Mode: {item.mode || "live"}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    Status: {item.status} · Dauer: {durationMin} min
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !sessionsLoading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Noch keine Sessions. Starte einen Call im Script-Tab.
                </Text>
              </View>
            )
          }
        />
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cold Call Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Kontakte, Scripts & Sessions für deine Kaltakquise.
          </Text>
        </View>
        {toastMessage ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: "#020617",
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarIndicatorStyle: { backgroundColor: "#a3e635" },
            tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          }}
        >
          <Tab.Screen name="Kontakte" component={ContactsTab} />
          <Tab.Screen name="Script" component={ScriptTab} />
          <Tab.Screen name="Sessions" component={SessionsTab} />
        </Tab.Navigator>
      </View>
    </BottomSheetModalProvider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#020617", // slate-950
    paddingTop: Platform.OS === "ios" ? 44 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2937", // slate-800
    backgroundColor: "#020617",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5e7eb", // slate-200
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9ca3af", // slate-400
    marginTop: 2,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 12,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#e5e7eb",
  },
  contactCard: {
    backgroundColor: "#020617",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    marginBottom: 8,
  },
  contactCardSelected: {
    borderColor: "#a3e635",
    backgroundColor: "#022c22",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  contactCompany: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#fca5a5",
    marginBottom: 8,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  timerLabel: {
    fontSize: 11,
    color: "#9ca3af",
  },
  timerValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#a3e635",
  },
  callControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  callButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 6,
  },
  callButtonSecondary: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  callButtonEnd: {
    backgroundColor: "#b91c1c",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 6,
  },
  callButtonDisabled: {
    opacity: 0.4,
  },
  callButtonText: {
    fontSize: 11,
    color: "#f9fafb",
    fontWeight: "600",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginRight: 4,
  },
  goalChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 6,
  },
  goalChipActive: {
    backgroundColor: "#022c22",
    borderColor: "#a3e635",
  },
  goalChipText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  goalChipTextActive: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  scriptScrollContent: {
    paddingBottom: 80,
  },
  scriptContainer: {
    marginBottom: 12,
  },
  scriptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  placeholderText: {
    fontSize: 12,
    color: "#6b7280",
  },
  accordion: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    marginBottom: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accordionBadge: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  accordionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionChevron: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scriptText: {
    fontSize: 12,
    color: "#e5e7eb",
    lineHeight: 18,
  },
  tipsContainer: {
    marginTop: 6,
  },
  tipText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  smallOutlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  smallOutlineButtonText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  copyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  copyChipText: {
    fontSize: 10,
    color: "#e5e7eb",
  },
  suggestedObjections: {
    marginBottom: 12,
  },
  objectionChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  objectionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginTop: 6,
    backgroundColor: "#020617",
  },
  objectionChipText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  notesContainer: {
    marginTop: 8,
  },
  notesHint: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 8,
    fontSize: 12,
    color: "#e5e7eb",
    textAlignVertical: "top",
    backgroundColor: "#020617",
  },
  sessionCard: {
    backgroundColor: "#020617",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    marginBottom: 8,
  },
  sessionCardCurrent: {
    borderColor: "#a3e635",
    backgroundColor: "#022c22",
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  sessionMeta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 80 : 60,
    alignSelf: "center",
    backgroundColor: "#064e3b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 20,
  },
  toastText: {
    fontSize: 11,
    color: "#bbf7d0",
  },
  bottomSheetBackground: {
    backgroundColor: "#020617",
  },
  bottomSheetHandle: {
    backgroundColor: "#4b5563",
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 6,
  },
  objectionListItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    backgroundColor: "#020617",
  },
  objectionListTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  objectionListPreview: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  objectionAnswerBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 8,
    marginTop: 8,
    backgroundColor: "#020617",
  },
  objectionAnswerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  objectionAnswerText: {
    fontSize: 12,
    color: "#e5e7eb",
    lineHeight: 18,
  },
  copyObjectionButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-end",
  },
  copyObjectionButtonText: {
    fontSize: 11,
    color: "#f9fafb",
    fontWeight: "600",
  },
});

