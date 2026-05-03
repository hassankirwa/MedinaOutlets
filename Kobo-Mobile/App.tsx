import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { apiCreateOutlet, apiForgotPassword, apiMyWardAssignments } from "./src/api/client";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { FieldWorkerNavProvider } from "./src/context/FieldWorkerNavContext";
import {
  NewOutletDraftProvider,
  useNewOutletDraft,
  type SubmittedOutlet,
} from "./src/context/NewOutletDraftContext";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "./src/theme/plusJakartaAssets";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NewOutletCollectionContextScreen } from "./src/screens/NewOutletCollectionContextScreen";
import { NewOutletScreen1 } from "./src/screens/NewOutletScreen1";
import { NewOutletScreen2 } from "./src/screens/NewOutletScreen2";
import { NewOutletScreen3 } from "./src/screens/NewOutletScreen3";
import { NewOutletScreen4 } from "./src/screens/NewOutletScreen4";
import { NewOutletScreen5 } from "./src/screens/NewOutletScreen5";
import { MySubmissionsScreen } from "./src/screens/MySubmissionsScreen";
import { NewOutletSubmitSuccessScreen } from "./src/screens/NewOutletSubmitSuccessScreen";
import { SubmissionDetailsScreen } from "./src/screens/SubmissionDetailsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { ProjectsScreen } from "./src/screens/ProjectsScreen";
import {
  fieldCollectorCanAddOutlets,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
} from "./src/utils/fieldWorkerProjects";
import { flushPendingOutletsForUser } from "./src/sync/flushPendingOutlets";
import type { OfflineOutletSyncRunResult } from "./src/sync/offlineOutletSyncTypes";
import { isLikelyNetworkError, isOnline } from "./src/sync/network";
import { enqueuePendingOutlet, listPendingOutletsForUser } from "./src/sync/pendingOutletsQueue";
import {
  removeIncompleteDraft,
  upsertIncompleteDraft,
  type NewOutletResumeScreen,
} from "./src/sync/outletIncompleteDrafts";
import { isOutletDraftDirty } from "./src/utils/isOutletDraftDirty";
import { randomClientSubmissionKey } from "./src/utils/randomClientSubmissionKey";
import { NewOutletLeaveModal } from "./src/components/NewOutletLeaveModal";
import { MyDraftsScreen } from "./src/screens/MyDraftsScreen";

type AppScreen =
  | "login"
  | "forgotPassword"
  | "dashboard"
  | "myDrafts"
  | "projects"
  | "newOutletPickProject"
  | "newOutlet1"
  | "newOutlet2"
  | "newOutlet3"
  | "newOutlet4"
  | "newOutlet5"
  | "newOutletSuccess"
  | "mySubmissions"
  | "submissionDetails"
  | "profile";

function AppContent() {
  const { ready, user, token, signIn, signOut, refreshUser } = useAuth();
  const {
    resetDraft,
    draft,
    setDraft,
    addSubmitted,
    submittedOutlets,
    hydratePendingForUser,
    replaceSubmissionAfterSync,
    removeSubmission,
    clearLocalSubmissions,
  } = useNewOutletDraft();
  const flushMutexRef = useRef(false);
  const [screen, setScreen] = useState<AppScreen>("login");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
  const [resumeIncompleteDraftId, setResumeIncompleteDraftId] = useState<string | null>(null);

  /** Restore session → dashboard; do not reset when navigating e.g. to Projects. */
  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    setScreen((prev) => (prev === "login" || prev === "forgotPassword" ? "dashboard" : prev));
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    void hydratePendingForUser(user.id);
  }, [ready, user?.id, hydratePendingForUser]);

  const runOfflineOutletSync = useCallback(async (): Promise<OfflineOutletSyncRunResult> => {
    if (!token || !user) {
      return { outcome: "no_session" };
    }
    if (flushMutexRef.current) {
      return { outcome: "busy" };
    }
    const connected = await isOnline();
    if (!connected) {
      return { outcome: "offline" };
    }
    const pendingBefore = await listPendingOutletsForUser(user.id);
    flushMutexRef.current = true;
    try {
      const { syncedCount, stoppedForNetwork } = await flushPendingOutletsForUser(
        token,
        user.id,
        replaceSubmissionAfterSync,
        (localId, message) => {
          removeSubmission(localId);
          Alert.alert(
            "Could not upload offline outlet",
            `${message}\n\nThis draft was removed from your queue. You may need to submit it again.`,
          );
        },
      );
      return {
        outcome: "complete",
        syncedCount,
        stoppedForNetwork,
        pendingCountBefore: pendingBefore.length,
      };
    } finally {
      flushMutexRef.current = false;
    }
  }, [token, user, replaceSubmissionAfterSync, removeSubmission]);

  const flushPendingSubmissions = useCallback(async () => {
    const result = await runOfflineOutletSync();
    if (result.outcome === "complete" && result.syncedCount > 0) {
      Alert.alert(
        "Uploaded",
        `${result.syncedCount} offline outlet submission(s) were saved to the server.`,
      );
    }
  }, [runOfflineOutletSync]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushPendingSubmissions();
      }
    });
    return () => unsub();
  }, [token, user?.id, flushPendingSubmissions]);

  useEffect(() => {
    if (screen !== "dashboard" || !token || !user) {
      return;
    }
    void flushPendingSubmissions();
  }, [screen, token, user?.id, flushPendingSubmissions]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signIn(email, password);
      setScreen("dashboard");
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoginLoading(false);
    }
  }, [signIn]);

  const handleLogout = useCallback(async () => {
    await signOut();
    clearLocalSubmissions();
    setScreen("login");
  }, [signOut, clearLocalSubmissions]);

  const resumeScreenFromOutletFlow = useCallback((s: AppScreen): NewOutletResumeScreen => {
    switch (s) {
      case "newOutletPickProject":
      case "newOutlet1":
      case "newOutlet2":
      case "newOutlet3":
      case "newOutlet4":
      case "newOutlet5":
        return s;
      default:
        return "newOutlet1";
    }
  }, []);

  const attemptExitNewOutletFlow = useCallback(
    (continueNavigation: () => void) => {
      if (!isOutletDraftDirty(draft)) {
        resetDraft();
        setResumeIncompleteDraftId(null);
        continueNavigation();
        return;
      }
      pendingLeaveRef.current = continueNavigation;
      setLeaveModalVisible(true);
    },
    [draft, resetDraft],
  );

  const closeLeaveOutletModal = useCallback(() => {
    setLeaveModalVisible(false);
    pendingLeaveRef.current = null;
  }, []);

  const saveOutletDraftAndExit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert("Could not save", "Your session is missing user info. Please sign out and sign in again.");
      return;
    }
    setLeaveSaving(true);
    try {
      const id =
        resumeIncompleteDraftId ?? `inc-draft-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      await upsertIncompleteDraft({
        id,
        userId: user.id,
        draft: { ...draft, photos: draft.photos.map((p) => ({ ...p })) },
        resumeScreen: resumeScreenFromOutletFlow(screen),
        savedAt: new Date().toISOString(),
      });
      resetDraft();
      setResumeIncompleteDraftId(null);
      setLeaveModalVisible(false);
      const next = pendingLeaveRef.current;
      pendingLeaveRef.current = null;
      next?.();
    } catch (e) {
      Alert.alert("Could not save draft", e instanceof Error ? e.message : "Storage failed. Try again.");
    } finally {
      setLeaveSaving(false);
    }
  }, [user, draft, screen, resumeIncompleteDraftId, resetDraft, resumeScreenFromOutletFlow]);

  const discardOutletDraftAndExit = useCallback(async () => {
    if (resumeIncompleteDraftId) {
      await removeIncompleteDraft(resumeIncompleteDraftId);
    }
    resetDraft();
    setResumeIncompleteDraftId(null);
    setLeaveModalVisible(false);
    const next = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    next?.();
  }, [resumeIncompleteDraftId, resetDraft]);

  useEffect(() => {
    const outletScreens: AppScreen[] = [
      "newOutletPickProject",
      "newOutlet1",
      "newOutlet2",
      "newOutlet3",
      "newOutlet4",
      "newOutlet5",
    ];
    if (!outletScreens.includes(screen)) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      switch (screen) {
        case "newOutletPickProject":
          attemptExitNewOutletFlow(() => setScreen("dashboard"));
          return true;
        case "newOutlet1":
          if (user?.role?.slug === "field_collector") {
            setScreen("newOutletPickProject");
          } else {
            attemptExitNewOutletFlow(() => setScreen("dashboard"));
          }
          return true;
        case "newOutlet2":
          setScreen("newOutlet1");
          return true;
        case "newOutlet3":
          setScreen("newOutlet2");
          return true;
        case "newOutlet4":
          setScreen("newOutlet3");
          return true;
        case "newOutlet5":
          setScreen("newOutlet4");
          return true;
        default:
          return false;
      }
    });
    return () => sub.remove();
  }, [screen, user?.role?.slug, attemptExitNewOutletFlow]);

  const requestNewOutlet = useCallback(async () => {
    if (!token) {
      Alert.alert("Session", "Please sign in again.");
      setScreen("login");
      return;
    }
    if (user?.role?.slug === "field_collector") {
      try {
        const projects = await apiMyWardAssignments(token);
        if (!fieldCollectorCanAddOutlets(projects)) {
          Alert.alert("Cannot add outlet", FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE);
          return;
        }
      } catch {
        Alert.alert("Network", "Could not verify your project assignments. Try again.");
        return;
      }
    }
    setResumeIncompleteDraftId(null);
    resetDraft();
    setScreen(user?.role?.slug === "field_collector" ? "newOutletPickProject" : "newOutlet1");
  }, [token, user?.role?.slug, resetDraft]);

  const fieldWorkerNav = useMemo(
    () => ({
      goHome: () => setScreen("dashboard"),
      goProjects: () => setScreen("projects"),
      goSubmissions: () => setScreen("mySubmissions"),
      goProfile: () => setScreen("profile"),
      requestNewOutlet: () => void requestNewOutlet(),
    }),
    [requestNewOutlet],
  );

  const queueOfflineOutlet = useCallback(async (reuseClientSubmissionKey?: string) => {
    if (!token || !user) {
      Alert.alert("Session", "Please sign in again.");
      setScreen("login");
      return;
    }
    if (user.role?.slug === "field_collector" && draft.wardId == null) {
      Alert.alert("Project & ward", "Select a project and ward before submitting.");
      return;
    }
    const localId = `pending-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const clientSubmissionKey = reuseClientSubmissionKey ?? randomClientSubmissionKey();
    const submittedAt = new Date().toISOString();
    const submittedBy = user.name ?? "You";
    const snapshot = { ...draft, photos: draft.photos.map((p) => ({ ...p })) };
    await enqueuePendingOutlet({
      localId,
      userId: user.id,
      draft: snapshot,
      submittedAt,
      submittedBy,
      clientSubmissionKey,
    });
    addSubmitted({
      ...snapshot,
      id: localId,
      submittedAt,
      submittedBy,
      syncStatus: "pending",
    });
    if (resumeIncompleteDraftId) {
      void removeIncompleteDraft(resumeIncompleteDraftId);
    }
    setResumeIncompleteDraftId(null);
    resetDraft();
    setScreen("newOutletSuccess");
  }, [token, user, draft, addSubmitted, resetDraft, resumeIncompleteDraftId]);

  const handleOutletSubmit = useCallback(async () => {
    if (!token || !user) {
      Alert.alert("Session", "Please sign in again.");
      setScreen("login");
      return;
    }

    const connected = await isOnline();
    if (!connected) {
      await queueOfflineOutlet();
      return;
    }

    if (user.role?.slug === "field_collector" && draft.wardId == null) {
      Alert.alert("Project & ward", "Select a project and ward before submitting.");
      return;
    }

    const clientSubmissionKey = randomClientSubmissionKey();
    setSubmitting(true);
    try {
      const created = await apiCreateOutlet(token, draft, clientSubmissionKey);
      const submission: SubmittedOutlet = {
        ...draft,
        id: created.id,
        submittedAt: new Date().toISOString(),
        submittedBy: user.name ?? "You",
        syncStatus: "synced",
      };
      addSubmitted(submission);
      if (resumeIncompleteDraftId) {
        void removeIncompleteDraft(resumeIncompleteDraftId);
      }
      setResumeIncompleteDraftId(null);
      resetDraft();
      setScreen("newOutletSuccess");
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        await queueOfflineOutlet(clientSubmissionKey);
      } else {
        Alert.alert("Submit failed", e instanceof Error ? e.message : "Could not save outlet");
      }
    } finally {
      setSubmitting(false);
    }
  }, [token, user, draft, addSubmitted, resetDraft, queueOfflineOutlet, resumeIncompleteDraftId]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#0F9445" />
      </View>
    );
  }

  const isLoggedIn = screen !== "login" && screen !== "forgotPassword";

  return (
    <SafeAreaProvider>
      <FieldWorkerNavProvider value={fieldWorkerNav}>
      <SafeAreaView style={styles.root} edges={["left", "right"]}>
        <StatusBar style={isLoggedIn ? "dark" : "light"} />
        {screen === "login" ? (
          <LoginScreen
            onSubmit={handleLogin}
            onForgotPassword={() => {
              setForgotError(null);
              setForgotSuccess(null);
              setScreen("forgotPassword");
            }}
            loading={loginLoading}
            error={loginError}
          />
        ) : screen === "forgotPassword" ? (
          <ForgotPasswordScreen
            onBack={() => {
              setForgotError(null);
              setForgotSuccess(null);
              setScreen("login");
            }}
            loading={forgotLoading}
            error={forgotError}
            successMessage={forgotSuccess}
            onSubmit={async (email) => {
              setForgotLoading(true);
              setForgotError(null);
              setForgotSuccess(null);
              try {
                const { message } = await apiForgotPassword(email);
                setForgotSuccess(message);
              } catch (e) {
                setForgotError(e instanceof Error ? e.message : "Request failed");
              } finally {
                setForgotLoading(false);
              }
            }}
          />
        ) : screen === "dashboard" ? (
          <DashboardScreen
            token={token}
            user={user}
            onLogout={handleLogout}
            onOpenNewOutlet={requestNewOutlet}
            onOpenMySubmissions={() => setScreen("mySubmissions")}
            onOpenMyDrafts={() => setScreen("myDrafts")}
            onOpenProjects={() => setScreen("projects")}
            onManualSyncOfflineQueue={runOfflineOutletSync}
          />
        ) : screen === "myDrafts" ? (
          <MyDraftsScreen
            token={token}
            user={user}
            onBack={() => setScreen("dashboard")}
            onResumeDraft={(row) => {
              setDraft({ ...row.draft, photos: row.draft.photos.map((p) => ({ ...p })) });
              setResumeIncompleteDraftId(row.id);
              setScreen(row.resumeScreen);
            }}
          />
        ) : screen === "projects" ? (
          <ProjectsScreen
            token={token}
            user={user}
            onBack={() => setScreen("dashboard")}
            navActive="projects"
          />
        ) : screen === "profile" ? (
          <ProfileScreen
            token={token}
            user={user}
            navActive="profile"
            onBack={() => setScreen("dashboard")}
            refreshUser={refreshUser}
          />
        ) : screen === "mySubmissions" ? (
          <MySubmissionsScreen
            token={token}
            user={user}
            onBack={() => setScreen("dashboard")}
            onAddNewOutlet={() => void requestNewOutlet()}
            onOpenSubmission={(submissionId) => {
              setActiveSubmissionId(submissionId);
              setScreen("submissionDetails");
            }}
          />
        ) : screen === "submissionDetails" ? (
          submittedOutlets.find((x) => x.id === activeSubmissionId) ? (
            <SubmissionDetailsScreen
              submission={submittedOutlets.find((x) => x.id === activeSubmissionId)!}
              token={token}
              onBack={() => setScreen("mySubmissions")}
              onEdit={() => void requestNewOutlet()}
            />
          ) : (
            <MySubmissionsScreen
              token={token}
              user={user}
              onBack={() => setScreen("dashboard")}
              onAddNewOutlet={() => void requestNewOutlet()}
              onOpenSubmission={(submissionId) => {
                setActiveSubmissionId(submissionId);
                setScreen("submissionDetails");
              }}
            />
          )
        ) : screen === "newOutletPickProject" ? (
          <NewOutletCollectionContextScreen
            token={token}
            onBack={() => attemptExitNewOutletFlow(() => setScreen("dashboard"))}
            onNext={() => setScreen("newOutlet1")}
          />
        ) : screen === "newOutlet1" ? (
          <NewOutletScreen1
            onBack={() =>
              user?.role?.slug === "field_collector"
                ? setScreen("newOutletPickProject")
                : attemptExitNewOutletFlow(() => setScreen("dashboard"))
            }
            onNext={() => setScreen("newOutlet2")}
          />
        ) : screen === "newOutlet2" ? (
          <NewOutletScreen2 onBack={() => setScreen("newOutlet1")} onNext={() => setScreen("newOutlet3")} />
        ) : screen === "newOutlet3" ? (
          <NewOutletScreen3 onBack={() => setScreen("newOutlet2")} onNext={() => setScreen("newOutlet4")} />
        ) : screen === "newOutlet4" ? (
          <NewOutletScreen4 onBack={() => setScreen("newOutlet3")} onNext={() => setScreen("newOutlet5")} />
        ) : screen === "newOutletSuccess" ? (
          <NewOutletSubmitSuccessScreen
            onAddAnotherOutlet={() => void requestNewOutlet()}
            onViewAllOutlets={() => setScreen("mySubmissions")}
          />
        ) : (
          <NewOutletScreen5
            onBack={() => setScreen("newOutlet4")}
            onSubmit={handleOutletSubmit}
            submitDisabled={submitting}
          />
        )}
        {isLoggedIn ? (
          <NewOutletLeaveModal
            visible={leaveModalVisible}
            onCancel={closeLeaveOutletModal}
            onSaveDraft={() => void saveOutletDraftAndExit()}
            onDiscard={() => void discardOutletDraftAndExit()}
            saving={leaveSaving}
          />
        ) : null}
      </SafeAreaView>
      </FieldWorkerNavProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#0F9445" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NewOutletDraftProvider>
        <AppContent />
      </NewOutletDraftProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
});
