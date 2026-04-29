import {
  filterMisPrintDocumentsDoctorVisible,
  isMisDocumentForm100,
  misHisCalculationBestIndexInBody,
  misHisForm100FirstIndexInBody,
  parseMisPrintFormDocuments,
} from "@/lib/mis-print-forms/html";
import { runMisPrintFormsPdfAction } from "@/lib/mis-print-forms/pdf";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";

function normalizeAppointmentId(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    const o = (raw as { $oid?: string }).$oid;
    return typeof o === "string" ? o : "";
  }
  try {
    const s = String(raw);
    return s === "[object Object]" ? "" : s;
  } catch {
    return "";
  }
}

function extractDocumentsListFromResponse(res: unknown): any[] {
  if (!res || typeof res !== "object") return [];
  const r = res as { success?: boolean; data?: unknown };
  if (r.success === false) return [];
  const d = r.data;
  if (Array.isArray(d)) return d;
  if (
    d &&
    typeof d === "object" &&
    Array.isArray((d as { data?: unknown[] }).data)
  ) {
    return (d as { data: any[] }).data;
  }
  return [];
}

function dedupeDocumentsByName(docs: any[]): any[] {
  if (!Array.isArray(docs) || docs.length === 0) return [];

  const seen = new Set<string>();
  return docs.filter((doc) => {
    const rawName =
      typeof doc?.name === "string" && doc.name.trim()
        ? doc.name.trim()
        : typeof doc?.originalName === "string" && doc.originalName.trim()
          ? doc.originalName.trim()
          : "";

    let normalizedName = "";
    if (rawName) {
      try {
        normalizedName = decodeURIComponent(rawName).toLowerCase();
      } catch {
        normalizedName = rawName.toLowerCase();
      }
    }
    const fallbackKey = typeof doc?.url === "string" ? doc.url.trim() : "";
    const key = normalizedName || fallbackKey;

    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildVisitDocumentUrl(
  doc: { url?: string },
  baseURL: string,
): string | null {
  const u = doc?.url;
  if (!u || typeof u !== "string") return null;
  const t = u.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const path = t.startsWith("/") ? t.slice(1) : t;
  return `${baseURL.replace(/\/$/, "")}/${path}`;
}

function isVisitDocumentImage(doc: {
  mimeType?: string;
  type?: string;
}): boolean {
  const m = (doc.mimeType || doc.type || "").toLowerCase();
  return m.startsWith("image/");
}

/** ისტორიაში ფორმა 100: ატვირთული PDF ან HIS-ზე დადასტურებული IV–100. */
function historyVisitHasForm100(visit: {
  form100?: { pdfUrl?: string } | null;
  misForm100AvailableAt?: string | null;
}): boolean {
  if (visit.form100?.pdfUrl?.trim()) return true;
  const t = visit.misForm100AvailableAt;
  return (
    typeof t === "string" && t.trim().length > 0 && !Number.isNaN(Date.parse(t))
  );
}

const History = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingResult, setUploadingResult] = useState<string | null>(null);
  const [openingForm100VisitId, setOpeningForm100VisitId] = useState<
    string | null
  >(null);
  const [openingMisCalcVisitId, setOpeningMisCalcVisitId] = useState<
    string | null
  >(null);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  // Diagnosis and Prescription modal states
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("");
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  // Reschedule states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<
    { time: string; available: boolean }[]
  >([]);
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<
    string | null
  >(null);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = useState<
    string | null
  >(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [documentsByVisitId, setDocumentsByVisitId] = useState<
    Record<string, any[]>
  >({});
  const [loadingDocVisitId, setLoadingDocVisitId] = useState<string | null>(
    null,
  );
  const loadedVisitDocIdsRef = useRef<Set<string>>(new Set());
  const inFlightDocVisitIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPastAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const runMisPrintFormsSync = useCallback(() => {
    if (!isAuthenticated || !user?.id || apiService.isMockMode()) return;
    void apiService.syncPatientMisPrintForms().then(
      (r) => {
        if (r.success && r.data) {
          console.log(
            "📄 [History] MIS print forms sync:",
            r.data.processed,
            "processed,",
            r.data.saved,
            "saved",
          );
        }
      },
      (e) => console.warn("[History] MIS print forms sync failed:", e),
    );
  }, [isAuthenticated, user?.id]);

  useFocusEffect(
    useCallback(() => {
      runMisPrintFormsSync();
    }, [runMisPrintFormsSync]),
  );

  const loadPastAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        setVisits([]);
        return;
      }

      const response = await apiService.getPatientAppointments();
      console.log("📋 [History] getPatientAppointments response:", {
        success: response?.success,
        totalRaw: Array.isArray(response?.data) ? response.data.length : 0,
      });

      if (response.success && Array.isArray(response.data)) {
        response.data.forEach((appointment: any, index: number) => {
          const docItems = Array.isArray(appointment?.documents)
            ? appointment.documents
            : [];
          const docSummaries = docItems.map((doc: any, docIndex: number) => ({
            index: docIndex,
            name: doc?.name,
            type: doc?.type || doc?.mimeType,
            url: doc?.url,
            uploadedAt: doc?.uploadedAt,
          }));

          console.log(`📋 [History] Raw appointment [${index}]`, {
            id: appointment?._id || appointment?.id,
            appointmentDate: appointment?.appointmentDate,
            appointmentTime: appointment?.appointmentTime,
            status: appointment?.status,
            type: appointment?.type,
            doctorName: appointment?.doctorId?.name,
            hasDocs: Array.isArray(appointment?.documents)
              ? appointment.documents.length
              : 0,
            hasLabTests: Array.isArray(appointment?.laboratoryTests)
              ? appointment.laboratoryTests.length
              : 0,
            hasInstrumentalTests: Array.isArray(appointment?.instrumentalTests)
              ? appointment.instrumentalTests.length
              : 0,
          });

          if (docSummaries.length > 0) {
            const duplicateDocUrls = docSummaries
              .map((doc) => doc.url)
              .filter(
                (url, i, arr) =>
                  typeof url === "string" && arr.indexOf(url) !== i,
              );

            console.log("📎 [History] Raw appointment documents:", {
              id: appointment?._id || appointment?.id,
              docsCount: docSummaries.length,
              docs: docSummaries,
              duplicateUrls: Array.from(new Set(duplicateDocUrls)),
            });
          }

          if (
            (appointment?._id || appointment?.id) === "69edc2458f2c0c05603bf6c7"
          ) {
            console.log("🎯 [History] Target appointment documents (19:00):", {
              id: appointment?._id || appointment?.id,
              appointmentDate: appointment?.appointmentDate,
              appointmentTime: appointment?.appointmentTime,
              docsCount: docSummaries.length,
              docs: docSummaries,
            });
          }
        });

        const mapped = response.data
          .map((appointment) => {
            const visit = mapAppointmentToVisit(appointment);
            console.log("📋 [History] Mapped visit:", {
              id: visit?.id,
              doctorId: visit?.doctorId,
              doctorIdType: typeof visit?.doctorId,
              doctorIdValue: visit?.doctorId,
              doctorName: visit?.doctorName,
              appointmentDate: visit?.appointmentDate,
              appointmentTime: visit?.appointmentTime,
              status: visit?.status,
              type: visit?.type,
              diagnosis: visit?.diagnosis,
              hasPrescription: Array.isArray(visit?.prescription)
                ? visit.prescription.length
                : 0,
            });
            return visit;
          })
          .filter((visit) => visit && isPastAppointment(visit))
          // Sort by date and time - most recent first (newest at top)
          .sort((a: any, b: any) => {
            const getDateTime = (visit: any) => {
              if (!visit?.appointmentDate) return 0;
              const [year, month, day] = visit.appointmentDate
                .split("-")
                .map(Number);
              const [hours, minutes] = (visit.appointmentTime || "00:00")
                .split(":")
                .map(Number);
              return new Date(
                year,
                month - 1,
                day,
                hours || 0,
                minutes || 0,
              ).getTime();
            };
            return getDateTime(b) - getDateTime(a); // Descending - newest first
          });

        console.log("📋 [History] Final past visits count:", mapped.length);
        setVisits(mapped);
        setDocumentsByVisitId({});
        loadedVisitDocIdsRef.current.clear();
      } else {
        setVisits([]);
      }
    } catch (err: any) {
      console.error("History load failed", err);
      setError(err.message || "ვიზიტების ჩატვირთვა ვერ მოხერხდა");
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadPastAppointments().then(() => {
      runMisPrintFormsSync();
    });
  };

  const filteredVisits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return visits;
    }
    return visits.filter((visit) => {
      const searchable =
        `${visit.doctorName} ${visit.doctorSpecialty} ${visit.diagnosis}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [visits, searchQuery]);

  const loadVisitDocumentsIfNeeded = async (visitCardId: string) => {
    if (loadedVisitDocIdsRef.current.has(visitCardId)) {
      setLoadingDocVisitId((cur) => (cur === visitCardId ? null : cur));
      return;
    }
    if (inFlightDocVisitIdsRef.current.has(visitCardId)) {
      return;
    }
    inFlightDocVisitIdsRef.current.add(visitCardId);
    const vid = normalizeAppointmentId(visitCardId);
    try {
      const list = vid
        ? extractDocumentsListFromResponse(
            await apiService.getAppointmentDocuments(vid),
          )
        : [];
      setDocumentsByVisitId((p) => ({
        ...p,
        [visitCardId]: dedupeDocumentsByName(list),
      }));
    } catch (e) {
      console.error("[History] expand documents:", visitCardId, e);
      setDocumentsByVisitId((p) => ({ ...p, [visitCardId]: [] }));
    } finally {
      inFlightDocVisitIdsRef.current.delete(visitCardId);
      loadedVisitDocIdsRef.current.add(visitCardId);
      setLoadingDocVisitId((cur) => (cur === visitCardId ? null : cur));
    }
  };

  const toggleVisitExpansion = (visit: any) => {
    const id = visit.id;
    const isExpanded = expandedVisits.has(id);
    if (isExpanded) {
      setExpandedVisits((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } else {
      setExpandedVisits((prev) => new Set(prev).add(id));
      if (!loadedVisitDocIdsRef.current.has(id)) {
        setLoadingDocVisitId(id);
      }
      queueMicrotask(() => {
        loadVisitDocumentsIfNeeded(id);
      });
    }
  };

  /** HIS-იდან მიმდინარე ფორმების/კალკულაციის სტატუსის განახლება ერთი ვიზიტისთვის. */
  const refreshVisitMisState = async (visit: any): Promise<any> => {
    const id = visit?.id;
    if (!id) return visit;

    try {
      const mis = await apiService.getMisPrintForms(id, true);
      if (!mis.success || !mis.data) return visit;

      const refreshed = {
        ...visit,
        misGeneratedServiceId:
          mis.data.misGeneratedServiceId ?? visit.misGeneratedServiceId ?? null,
        misPrintFormsByService:
          mis.data.misPrintFormsByService ??
          visit.misPrintFormsByService ??
          null,
        misPrintFormsFetchedAt:
          mis.data.misPrintFormsFetchedAt ??
          visit.misPrintFormsFetchedAt ??
          null,
        misForm100AvailableAt:
          mis.data.misForm100AvailableAt ?? visit.misForm100AvailableAt ?? null,
        misForm100PrintFormIndex:
          mis.data.misForm100PrintFormIndex ??
          visit.misForm100PrintFormIndex ??
          null,
      };

      setVisits((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...refreshed } : item)),
      );
      if (selectedVisit?.id === id) {
        setSelectedVisit((prev: any) => ({ ...(prev || {}), ...refreshed }));
      }
      return refreshed;
    } catch (e) {
      console.warn("[History] refreshVisitMisState failed:", e);
      return visit;
    }
  };

  const openVisitForm100 = async (visit: any) => {
    const id = visit?.id;
    if (!id) return;

    if (visit.form100?.pdfUrl?.trim()) {
      try {
        const url = visit.form100.pdfUrl.trim();
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
        else Alert.alert("შეცდომა", "PDF ფაილის გახსნა ვერ მოხერხდა");
      } catch (e) {
        console.error("Error opening Form 100:", e);
        Alert.alert("შეცდომა", "PDF ფაილის გახსნა ვერ მოხერხდა");
      }
      return;
    }

    const freshVisit = await refreshVisitMisState(visit);

    if (!historyVisitHasForm100(freshVisit)) {
      Alert.alert("ინფორმაცია", "ფორმა 100 ჯერ არ არის ხელმისაწვდომი.");
      return;
    }

    setOpeningForm100VisitId(id);
    try {
      const mis = await apiService.getMisPrintForms(id, true);
      if (!mis.success || !mis.data) {
        Alert.alert("შეცდომა", "HIS ფორმები ვერ ჩაიტვირთა");
        return;
      }
      const d = mis.data;
      const raw = d.misPrintFormsByService;

      /** HIS: მხოლოდ IV–100 (კალკულაცია — ცალკე `openVisitMisCalculation`). */
      if (raw != null) {
        const visible = filterMisPrintDocumentsDoctorVisible(
          parseMisPrintFormDocuments(raw),
        );
        const formDoc = visible.find((doc) => isMisDocumentForm100(doc));
        let htmlForPdf = formDoc?.html?.trim() ?? "";

        if (!htmlForPdf && Array.isArray(raw)) {
          const idx = misHisForm100FirstIndexInBody(raw);
          if (idx != null) {
            const row = raw[idx] as Record<string, unknown>;
            const td = row?.templateData;
            if (typeof td === "string") htmlForPdf = td.trim();
          }
        }

        if (htmlForPdf) {
          await runMisPrintFormsPdfAction({
            appointmentId: id,
            action: "download",
            htmlForPdf,
            shareDialogTitle: "ფორმა 100",
          });
          return;
        }
      }

      let formIndex: number | null = null;
      if (
        typeof d.misForm100PrintFormIndex === "number" &&
        Number.isInteger(d.misForm100PrintFormIndex)
      ) {
        formIndex = d.misForm100PrintFormIndex;
      }
      if (formIndex == null && raw != null) {
        formIndex = misHisForm100FirstIndexInBody(raw);
      }
      if (
        formIndex == null &&
        typeof freshVisit.misForm100PrintFormIndex === "number" &&
        Number.isInteger(freshVisit.misForm100PrintFormIndex)
      ) {
        formIndex = freshVisit.misForm100PrintFormIndex;
      }
      if (formIndex == null) {
        Alert.alert(
          "ინფორმაცია",
          "ფორმა IV–100-ის მონაცემი ვერ მოიძებნა. სთხოვეთ ექიმს ერთხელ მაინც გახსნას ამ ჯავშნის HIS ფორმები აპში, შემდეგ სცადეთ თავიდან.",
        );
        return;
      }
      const dl = await apiService.downloadMisPrintFormPdf(id, {
        index: formIndex,
        refetch: true,
      });
      if (dl.success && dl.uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(dl.uri, {
            mimeType: dl.contentType || "application/pdf",
            dialogTitle: "ფორმა 100",
          });
        } else {
          await Linking.openURL(dl.uri);
        }
      } else {
        Alert.alert("შეცდომა", "PDF-ის ჩამოტვირთვა ვერ მოხერხდა");
      }
    } catch (e: unknown) {
      console.error("[History] Form 100 HIS/PDF:", e);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("შეცდომა", msg || "ფორმა 100 ვერ გაიხსნა");
    } finally {
      setOpeningForm100VisitId(null);
    }
  };

  const openVisitMisCalculation = async (visit: any) => {
    const id = visit?.id;
    if (!id) return;

    const freshVisit = await refreshVisitMisState(visit);

    if (!freshVisit.misForm100AvailableAt?.trim?.()) {
      Alert.alert(
        "ინფორმაცია",
        "კალკულაცია ხელმისაწვდომია მხოლოდ HIS-ზე დადასტურებული ვიზიტისთვის.",
      );
      return;
    }

    setOpeningMisCalcVisitId(id);
    try {
      const mis = await apiService.getMisPrintForms(id, true);
      if (!mis.success || !mis.data) {
        Alert.alert("შეცდომა", "HIS ფორმები ვერ ჩაიტვირთა");
        return;
      }
      const d = mis.data;
      const raw = d.misPrintFormsByService;

      if (raw != null) {
        const visible = filterMisPrintDocumentsDoctorVisible(
          parseMisPrintFormDocuments(raw),
        );
        const calcDoc = visible.find((doc) => !isMisDocumentForm100(doc));
        let htmlForPdf = calcDoc?.html?.trim() ?? "";

        if (!htmlForPdf && Array.isArray(raw)) {
          const idx = misHisCalculationBestIndexInBody(raw);
          if (idx != null) {
            const row = raw[idx] as Record<string, unknown>;
            const td = row?.templateData;
            if (typeof td === "string") htmlForPdf = td.trim();
          }
        }

        if (htmlForPdf) {
          await runMisPrintFormsPdfAction({
            appointmentId: id,
            action: "download",
            htmlForPdf,
            shareDialogTitle: "კალკულაცია",
          });
          return;
        }
      }

      Alert.alert(
        "ინფორმაცია",
        "კალკულაცია ამ ვიზიტისთვის ვერ მოიძებნა ან ჯერ არ არის HIS-ში.",
      );
    } catch (e: unknown) {
      console.error("[History] MIS calculation:", e);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("შეცდომა", msg || "კალკულაცია ვერ გაიხსნა");
    } finally {
      setOpeningMisCalcVisitId(null);
    }
  };

  const handleFollowUpAppointment = async () => {
    if (!selectedVisit?.id) return;

    try {
      const eligibilityResponse = await apiService.checkFollowUpEligibility(
        selectedVisit.id,
      );

      // Check if response indicates eligibility
      const isEligible =
        (eligibilityResponse as any)?.success === true &&
        (eligibilityResponse as any)?.eligible === true;

      if (!isEligible) {
        const errorMessage =
          (eligibilityResponse as any)?.message ||
          "განმეორებითი ვიზიტისთვის უნდა გავიდეს 10 სამუშაო დღე პირველადი ვიზიტიდან";
        Alert.alert("განმეორებითი ვიზიტი", errorMessage);
        return;
      }

      // Navigate to doctor's schedule page with follow-up flag
      console.log("📋 History - handleFollowUpAppointment - selectedVisit:", {
        id: selectedVisit?.id,
        doctorId: selectedVisit?.doctorId,
        doctorIdType: typeof selectedVisit?.doctorId,
        doctorId_id: selectedVisit?.doctorId?._id,
        doctorId_idType: typeof selectedVisit?.doctorId?._id,
        doctorId_idString: selectedVisit?.doctorId?._id?.toString(),
      });

      // Extract doctorId - it can be a string (from mapAppointmentToVisit) or an object
      let doctorId: string | null = null;

      if (typeof selectedVisit.doctorId === "string") {
        doctorId = selectedVisit.doctorId;
      } else if (selectedVisit.doctorId?._id) {
        doctorId =
          typeof selectedVisit.doctorId._id === "string"
            ? selectedVisit.doctorId._id
            : selectedVisit.doctorId._id.toString();
      } else if (selectedVisit.doctorId?.id) {
        doctorId =
          typeof selectedVisit.doctorId.id === "string"
            ? selectedVisit.doctorId.id
            : selectedVisit.doctorId.id.toString();
      } else if (selectedVisit.doctorId) {
        doctorId = String(selectedVisit.doctorId);
      }

      console.log("📋 History - Extracted doctorId:", {
        doctorId,
        doctorIdType: typeof doctorId,
        doctorIdValue: doctorId,
        selectedVisitDoctorId: selectedVisit.doctorId,
        selectedVisitDoctorIdType: typeof selectedVisit.doctorId,
      });

      if (doctorId && doctorId.trim()) {
        const doctorIdString = String(doctorId).trim();
        console.log("📋 History - Navigating with doctorId:", doctorIdString);
        router.push({
          pathname: "/screens/doctors/doctor/[id]",
          params: {
            id: doctorIdString,
            followUpAppointmentId: selectedVisit.id,
            followUp: "true",
          },
        });
      } else {
        console.error("📋 History - Doctor ID not found in visit:", {
          selectedVisit,
          doctorId: selectedVisit.doctorId,
          doctorIdType: typeof selectedVisit.doctorId,
        });
        Alert.alert("შეცდომა", "ექიმის ID ვერ მოიძებნა");
      }
    } catch (err: any) {
      console.error("Error checking follow-up eligibility:", err);
      // Extract error message from backend response
      let errorMessage = "განმეორებითი ვიზიტის შემოწმება ვერ მოხერხდა";

      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      Alert.alert("განმეორებითი ვიზიტი", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06B6D4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ისტორია</Text>
          <Text style={styles.subtitle}>
            დასრულებული ან გასული ვიზიტები ავტომატურად გადმოდის აქ
          </Text>
        </View>

        {/* Search */}

        {/* Visits List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {filteredVisits.length} ვიზიტი
          </Text>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.loadingText}>
                იტვირთება ვიზიტების ისტორია...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={64} color="#F87171" />
              <Text style={styles.emptyStateTitle}>ვერ ჩაიტვირთა</Text>
              <Text style={styles.emptyStateText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadPastAppointments}
              >
                <Text style={styles.retryButtonText}>თავიდან ცდა</Text>
              </TouchableOpacity>
            </View>
          ) : filteredVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>ვიზიტები ვერ მოიძებნა</Text>
              <Text style={styles.emptyStateText}>
                როგორც კი ვიზიტი დასრულდება, ავტომატურად გადმოვა აქ
              </Text>
            </View>
          ) : (
            filteredVisits.map((visit) => {
              const isExpanded = expandedVisits.has(visit.id);
              const visitDocs = documentsByVisitId[visit.id] || [];

              return (
                <View key={visit.id} style={styles.visitCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.visitHeader}>
                      <View style={styles.doctorInfo}>
                        <View style={styles.avatarContainer}>
                          <Ionicons name="medical" size={24} color="#06B6D4" />
                        </View>
                        <View style={styles.doctorDetails}>
                          <View style={styles.doctorNameRow}>
                            <Text style={styles.doctorName}>
                              {visit.doctorName}
                            </Text>
                          </View>
                          <Text style={styles.doctorSpecialty}>
                            {visit.doctorSpecialty || "სპეციალისტი"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              visit.status === "completed"
                                ? "#10B98120"
                                : visit.status === "cancelled"
                                  ? "#EF444420"
                                  : "#6B728020",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                visit.status === "completed"
                                  ? "#10B981"
                                  : visit.status === "cancelled"
                                    ? "#EF4444"
                                    : "#6B7280",
                            },
                          ]}
                        >
                          {visit.statusLabel || "დასრულებული"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => toggleVisitExpansion(visit)}
                      style={styles.expandDetailsRow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandDetailsButtonText}>
                        {isExpanded ? "დეტალების დაფარვა" : "დეტალების ნახვა"}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#06B6D4"
                      />
                    </TouchableOpacity>

                    <View style={styles.visitBody}>
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.infoText}>{visit.date}</Text>
                      </View>
                      {visit.appointmentTime && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.infoText}>
                            {visit.appointmentTime}
                          </Text>
                        </View>
                      )}
                      {visit.consultationType && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="videocam-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.infoText}>
                            {getConsultationTypeLabel(
                              visit.consultationType,
                              (visit as any).isFollowUp,
                            )}
                          </Text>
                        </View>
                      )}
                      {/* Tests Indicator - Always visible */}
                      {(() => {
                        const instrumentalBooked =
                          visit.instrumentalTests?.filter((t: any) => t.booked)
                            .length || 0;
                        const laboratoryBooked =
                          visit.laboratoryTests?.filter((t: any) => t.booked)
                            .length || 0;
                        const totalBooked =
                          instrumentalBooked + laboratoryBooked;

                        const instrumentalTotal =
                          visit.instrumentalTests?.length || 0;
                        const laboratoryTotal =
                          visit.laboratoryTests?.length || 0;
                        const totalAssigned =
                          instrumentalTotal + laboratoryTotal;

                        if (totalAssigned > 0) {
                          return (
                            <View style={styles.infoRow}>
                              <Ionicons
                                name="flask-outline"
                                size={16}
                                color="#10B981"
                              />
                              <Text style={styles.infoText}>
                                დაჯავშნილი:{" "}
                                <Text style={styles.bookedCountText}>
                                  {totalBooked}
                                </Text>
                                {totalAssigned > totalBooked && (
                                  <>
                                    {" "}
                                    • დანიშნული:{" "}
                                    <Text style={styles.assignedCountText}>
                                      {totalAssigned}
                                    </Text>
                                  </>
                                )}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                      {visitDocs.length > 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="document-attach-outline"
                            size={16}
                            color="#0EA5E9"
                          />
                          <Text style={[styles.infoText, { color: "#0EA5E9" }]}>
                            {visitDocs.length} ფაილი ატვირთულია
                          </Text>
                        </View>
                      )}
                      {/* Diagnosis Button - Show only if not requiring follow-up or if it's a follow-up appointment */}
                      {(() => {
                        const isFollowUpAppointment =
                          visit.followUp?.appointmentId;
                        const requiresFollowUp =
                          visit.followUp?.required &&
                          !visit.followUp?.appointmentId;
                        const shouldShow =
                          !requiresFollowUp || isFollowUpAppointment;
                        return (
                          shouldShow &&
                          visit.diagnosis &&
                          visit.diagnosis.trim()
                        );
                      })() && (
                        <View style={styles.diagnosisRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.diagnosisText}>
                            {visit.diagnosis}
                          </Text>
                        </View>
                      )}

                      {/* ფორმა 100 — PDF ან HIS; HIS-ზე კალკულაცია ცალკე ღილაკი */}
                      {historyVisitHasForm100(visit) && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          disabled={
                            openingForm100VisitId === visit.id ||
                            openingMisCalcVisitId === visit.id
                          }
                          onPress={() => void openVisitForm100(visit)}
                        >
                          {openingForm100VisitId === visit.id ? (
                            <ActivityIndicator size="small" color="#10B981" />
                          ) : (
                            <Ionicons
                              name="document-text"
                              size={18}
                              color="#10B981"
                            />
                          )}
                          <Text style={styles.actionButtonText}>ფორმა 100</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      )}
                      {visit.misForm100AvailableAt &&
                        historyVisitHasForm100(visit) && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            disabled={
                              openingForm100VisitId === visit.id ||
                              openingMisCalcVisitId === visit.id
                            }
                            onPress={() => void openVisitMisCalculation(visit)}
                          >
                            {openingMisCalcVisitId === visit.id ? (
                              <ActivityIndicator size="small" color="#0D9488" />
                            ) : (
                              <Ionicons
                                name="calculator-outline"
                                size={18}
                                color="#0D9488"
                              />
                            )}
                            <Text style={styles.actionButtonText}>
                              კალკულაცია
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                        )}

                      {/* Prescription Button */}
                      {visit.medications && visit.medications.length > 0 && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            setSelectedPrescription(visit.medications);
                            setShowPrescriptionModal(true);
                          }}
                        >
                          <Ionicons
                            name="medkit-outline"
                            size={18}
                            color="#8B5CF6"
                          />
                          <Text style={styles.actionButtonText}>
                            დანიშნულება
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      )}

                      {/* Follow-up Required Indicator */}
                      {visit.followUp &&
                        visit.followUp.required &&
                        !visit.followUp.appointmentId && (
                          <TouchableOpacity
                            style={styles.followUpRequiredCard}
                            onPress={async () => {
                              setSelectedVisit(visit);
                              await handleFollowUpAppointment();
                            }}
                          >
                            <Ionicons
                              name="refresh"
                              size={20}
                              color="#06B6D4"
                            />
                            <View style={styles.followUpRequiredContent}>
                              <Text style={styles.followUpRequiredTitle}>
                                საჭიროა განმეორებითი ვიზიტი
                              </Text>
                              {visit.followUp.reason && (
                                <Text style={styles.followUpRequiredReason}>
                                  {visit.followUp.reason}
                                </Text>
                              )}
                            </View>
                            <Ionicons
                              name="arrow-forward"
                              size={20}
                              color="#06B6D4"
                            />
                          </TouchableOpacity>
                        )}
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          დოკუმენტები
                        </Text>
                        {loadingDocVisitId === visit.id ? (
                          <View style={styles.visitDocsLoading}>
                            <ActivityIndicator size="small" color="#0EA5E9" />
                            <Text style={styles.visitDocsLoadingText}>
                              იტვირთება...
                            </Text>
                          </View>
                        ) : visitDocs.length > 0 ? (
                          <View style={styles.uploadedDocList}>
                            {visitDocs.map((doc: any, idx: number) => {
                              const url = buildVisitDocumentUrl(
                                doc,
                                apiService.getBaseURL(),
                              );
                              const isImage = isVisitDocumentImage(doc);
                              return (
                                <TouchableOpacity
                                  key={doc.url || doc.publicId || idx}
                                  style={styles.uploadedDocItem}
                                  onPress={() => {
                                    if (url) {
                                      Linking.openURL(url).catch(() =>
                                        Alert.alert(
                                          "შეცდომა",
                                          "ფაილის გახსნა ვერ მოხერხდა",
                                        ),
                                      );
                                    }
                                  }}
                                  disabled={!url}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons
                                    name={
                                      isImage
                                        ? "image-outline"
                                        : "document-text"
                                    }
                                    size={18}
                                    color="#0EA5E9"
                                  />
                                  <Text
                                    style={styles.uploadedDocName}
                                    numberOfLines={1}
                                  >
                                    {doc.name || "დოკუმენტი"}
                                  </Text>
                                  {url ? (
                                    <Ionicons
                                      name="open-outline"
                                      size={16}
                                      color="#6B7280"
                                    />
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={styles.visitDocsEmpty}>
                            ამ ვიზიტზე დოკუმენტები არ არის
                          </Text>
                        )}
                      </View>

                      {visit.instrumentalTests &&
                        visit.instrumentalTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              დანიშნული ინსტრუმენტული კვლევები
                            </Text>
                            {visit.instrumentalTests.map(
                              (test: any, index: number) => (
                                <View key={index} style={styles.testCard}>
                                  <View style={styles.testHeader}>
                                    <Ionicons
                                      name="pulse-outline"
                                      size={18}
                                      color="#8B5CF6"
                                    />
                                    <View style={styles.testInfo}>
                                      <Text style={styles.testName}>
                                        {test.productName}
                                      </Text>
                                      {test.clinicName && (
                                        <Text style={styles.testNotes}>
                                          კლინიკა: {test.clinicName}
                                        </Text>
                                      )}
                                      {test.notes && (
                                        <Text style={styles.testNotes}>
                                          შენიშვნა: {test.notes}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  {test.booked && (
                                    <View style={styles.bookedBadge}>
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={16}
                                        color="#10B981"
                                      />
                                      <Text style={styles.bookedBadgeText}>
                                        დაჯავშნილია
                                      </Text>
                                    </View>
                                  )}
                                  {test.resultFile && (
                                    <TouchableOpacity
                                      style={styles.viewResultButton}
                                      onPress={async (e) => {
                                        e.stopPropagation();
                                        if (test.resultFile?.url) {
                                          const url = test.resultFile.url;
                                          const isPdf =
                                            test.resultFile.type ===
                                              "application/pdf" ||
                                            url.endsWith(".pdf");

                                          if (isPdf) {
                                            const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=false`;
                                            Linking.openURL(
                                              googleDocsUrl,
                                            ).catch(() =>
                                              Alert.alert(
                                                "შეცდომა",
                                                "ფაილის გახსნა ვერ მოხერხდა",
                                              ),
                                            );
                                          } else {
                                            Linking.openURL(url).catch(() =>
                                              Alert.alert(
                                                "შეცდომა",
                                                "ფაილის გახსნა ვერ მოხერხდა",
                                              ),
                                            );
                                          }
                                        }
                                      }}
                                    >
                                      <Ionicons
                                        name="document-text-outline"
                                        size={16}
                                        color="#8B5CF6"
                                      />
                                      <Text style={styles.viewResultButtonText}>
                                        შედეგის ნახვა
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ),
                            )}
                          </View>
                        )}

                      {/* Laboratory Tests */}
                      {visit.laboratoryTests &&
                        visit.laboratoryTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              დანიშნული ლაბორატორიული კვლევები
                            </Text>
                            {visit.laboratoryTests.map(
                              (test: any, index: number) => (
                                <View key={index} style={styles.testCard}>
                                  <View style={styles.testHeader}>
                                    <Ionicons
                                      name="flask-outline"
                                      size={18}
                                      color="#06B6D4"
                                    />
                                    <View style={styles.testInfo}>
                                      <Text style={styles.testName}>
                                        {test.productName}
                                      </Text>
                                      {test.clinicName && (
                                        <Text style={styles.testNotes}>
                                          კლინიკა: {test.clinicName}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  {test.booked && (
                                    <View style={styles.bookedBadge}>
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={16}
                                        color="#10B981"
                                      />
                                      <Text style={styles.bookedBadgeText}>
                                        დაჯავშნილია
                                      </Text>
                                    </View>
                                  )}
                                  {test.resultFile && (
                                    <TouchableOpacity
                                      style={styles.viewResultButton}
                                      onPress={async (e) => {
                                        e.stopPropagation();
                                        if (test.resultFile?.url) {
                                          const url = test.resultFile.url;
                                          const isPdf =
                                            test.resultFile.type ===
                                              "application/pdf" ||
                                            url.endsWith(".pdf");

                                          if (isPdf) {
                                            const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=false`;
                                            Linking.openURL(
                                              googleDocsUrl,
                                            ).catch(() =>
                                              Alert.alert(
                                                "შეცდომა",
                                                "ფაილის გახსნა ვერ მოხერხდა",
                                              ),
                                            );
                                          } else {
                                            Linking.openURL(url).catch(() =>
                                              Alert.alert(
                                                "შეცდომა",
                                                "ფაილის გახსნა ვერ მოხერხდა",
                                              ),
                                            );
                                          }
                                        }
                                      }}
                                    >
                                      <Ionicons
                                        name="document-text-outline"
                                        size={16}
                                        color="#06B6D4"
                                      />
                                      <Text style={styles.viewResultButtonText}>
                                        შედეგის ნახვა
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ),
                            )}
                          </View>
                        )}
                      {visit.notes && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>
                            შენიშვნები
                          </Text>
                          <View style={styles.notesCard}>
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color="#6B7280"
                            />
                            <Text style={styles.notesTextExpanded}>
                              {visit.notes}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Diagnosis Modal */}
      <Modal
        visible={showDiagnosisModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiagnosisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>დიაგნოზი</Text>
              <TouchableOpacity
                onPress={() => setShowDiagnosisModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailValue}>{selectedDiagnosis}</Text>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDiagnosisModal(false)}
              >
                <Text style={styles.modalButtonText}>დახურვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prescription Modal */}
      <Modal
        visible={showPrescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>დანიშნულება</Text>
              <TouchableOpacity
                onPress={() => setShowPrescriptionModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                {selectedPrescription &&
                Array.isArray(selectedPrescription) &&
                selectedPrescription.length > 0 ? (
                  selectedPrescription.map((med: any, index: number) => (
                    <View key={index} style={styles.medicationDetailCard}>
                      <View style={styles.medicationDetailHeader}>
                        <Ionicons name="medkit" size={20} color="#8B5CF6" />
                        <Text style={styles.medicationDetailName}>
                          {med.name ||
                            med.medicationName ||
                            `მედიკამენტი ${index + 1}`}
                        </Text>
                      </View>
                      {med.dosage && (
                        <Text style={styles.medicationDetailInfo}>
                          <Text style={styles.medicationDetailLabelModal}>
                            დოზა:{" "}
                          </Text>
                          {med.dosage}
                        </Text>
                      )}
                      {med.frequency && (
                        <Text style={styles.medicationDetailInfo}>
                          <Text style={styles.medicationDetailLabelModal}>
                            სიხშირე:{" "}
                          </Text>
                          {med.frequency}
                        </Text>
                      )}
                      {med.duration && (
                        <Text style={styles.medicationDetailInfo}>
                          <Text style={styles.medicationDetailLabelModal}>
                            ხანგრძლივობა:{" "}
                          </Text>
                          {med.duration}
                        </Text>
                      )}
                      {med.instructions && (
                        <Text style={styles.medicationDetailInfo}>
                          <Text style={styles.medicationDetailLabelModal}>
                            ინსტრუქცია:{" "}
                          </Text>
                          {med.instructions}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.detailValue}>
                    დანიშნულება არ არის მითითებული
                  </Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowPrescriptionModal(false)}
              >
                <Text style={styles.modalButtonText}>დახურვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const STATUS_LABELS: Record<string, string> = {
  completed: "დასრულებული",
  cancelled: "გაუქმებული",
  "in-progress": "მიმდინარე",
  scheduled: "დანიშნული",
  pending: "მოლოდინში",
};

const getConsultationTypeLabel = (type: string, isFollowUp?: boolean) => {
  if (isFollowUp === true) return "განმეორებითი";
  switch (type) {
    case "video":
      return "ვიდეო კონსულტაცია";
    case "home-visit":
      return "ბინაზე ვიზიტი";
    case "consultation":
      return "კონსულტაცია";
    case "emergency":
      return "სასწრაფო";
    default:
      return type;
  }
};

const mapAppointmentToVisit = (appointment: any) => {
  if (!appointment) {
    return null;
  }

  const doctor =
    typeof appointment.doctorId === "object" ? appointment.doctorId : {};

  // Extract doctorId - handle both object and string formats
  let doctorId: string | null = null;
  if (appointment.doctorId) {
    if (typeof appointment.doctorId === "string") {
      doctorId = appointment.doctorId;
    } else if (appointment.doctorId._id) {
      doctorId =
        typeof appointment.doctorId._id === "string"
          ? appointment.doctorId._id
          : String(appointment.doctorId._id);
    } else if (appointment.doctorId.id) {
      doctorId =
        typeof appointment.doctorId.id === "string"
          ? appointment.doctorId.id
          : String(appointment.doctorId.id);
    } else {
      doctorId = String(appointment.doctorId);
    }
  }

  // Format date from ISO to YYYY-MM-DD
  // Use LOCAL methods to get the date as it appears in user's timezone
  // This matches the logic in appointment.tsx for consistency
  const appointmentDate = appointment.appointmentDate
    ? (() => {
        const date = new Date(appointment.appointmentDate);
        // Use LOCAL methods to get the date as it appears in user's timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      })()
    : "";

  const rawSymptoms =
    appointment.symptoms || appointment.patientDetails?.problem;
  let symptoms: string[] = [];
  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms.filter(Boolean);
  } else if (typeof rawSymptoms === "string" && rawSymptoms.trim().length) {
    symptoms = rawSymptoms
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  } else if (rawSymptoms) {
    symptoms = [String(rawSymptoms)];
  }

  const summary = appointment.consultationSummary || {};

  if (summary.symptoms) {
    const summarySymptoms = summary.symptoms
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
    symptoms = Array.from(new Set([...symptoms, ...summarySymptoms]));
  }

  let medications: any[] = Array.isArray(appointment.medications)
    ? appointment.medications
    : [];

  if ((!medications || medications.length === 0) && summary.medications) {
    try {
      // Try to parse as JSON first (new format)
      medications = JSON.parse(summary.medications);
    } catch {
      // Fallback to old format (split by newlines)
      medications = summary.medications
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((name: string) => ({ name }));
    }
  }

  const status = appointment.status || "scheduled";

  const visit = {
    id:
      normalizeAppointmentId(appointment._id) ||
      normalizeAppointmentId(appointment.id) ||
      Math.random().toString(36).slice(2),
    doctorId: doctorId,
    doctorName: doctor?.name || "უცნობი ექიმი",
    doctorSpecialty: doctor?.specialization || doctor?.speciality || "",
    date: appointmentDate,
    appointmentDate,
    appointmentTime: appointment.appointmentTime || appointment.time || "",
    consultationType: appointment.type || "video",
    isFollowUp: appointment.isFollowUp === true,
    // მხოლოდ ექიმის შევსებული — არა patientDetails.problem / ჯავშნის notes
    diagnosis: (summary.diagnosis || appointment.diagnosis || "").trim(),
    symptoms,
    medications,
    notes: (summary.notes || "").trim(),
    vitalSigns: appointment.vitalSigns || summary.vitals,
    consultationSummary: summary,
    followUp: appointment.followUp,
    form100: appointment.form100,
    misForm100AvailableAt: (() => {
      const v = appointment.misForm100AvailableAt;
      if (v == null || v === "") return undefined;
      if (typeof v === "string" && v.trim()) return v.trim();
      try {
        return new Date(v as string | number | Date).toISOString();
      } catch {
        return undefined;
      }
    })(),
    misForm100PrintFormIndex:
      typeof appointment.misForm100PrintFormIndex === "number" &&
      Number.isInteger(appointment.misForm100PrintFormIndex)
        ? appointment.misForm100PrintFormIndex
        : undefined,
    laboratoryTests: appointment.laboratoryTests || [],
    instrumentalTests: appointment.instrumentalTests || [],
    status,
    statusLabel: STATUS_LABELS[status],
  };

  console.log("📋 History - mapAppointmentToVisit - returning visit:", {
    id: visit.id,
    doctorId: visit.doctorId,
    doctorIdType: typeof visit.doctorId,
  });

  // Log laboratory tests for debugging
  if (visit.laboratoryTests && visit.laboratoryTests.length > 0) {
    visit.laboratoryTests.forEach((test: any, idx: number) => {
      console.log(`🧪 [History] Test ${idx}:`, {
        productId: test.productId,
        productName: test.productName,
        booked: test.booked,
        clinicName: test.clinicName,
        hasResultFile: !!test.resultFile,
        resultFileUrl: test.resultFile?.url || null,
      });
    });
  }

  return visit;
};

const isPastAppointment = (visit: any) => {
  if (!visit?.appointmentDate) {
    console.log("❌ [isPastAppointment] No date:", visit?.id);
    return false;
  }

  // "in-progress" appointments NEVER go to history - they stay in appointments tab (მიმდინარე)
  // Only when they change to completed/cancelled do they go to history
  if (visit.status === "in-progress") {
    console.log(
      "❌ [isPastAppointment] In-progress -> stay in appointments, not history:",
      visit.id,
      visit.appointmentDate,
    );
    return false;
  }

  // Cancelled appointments ALWAYS go to history, regardless of date
  if (visit.status === "cancelled") {
    console.log(
      "✅ [isPastAppointment] Cancelled -> history:",
      visit.id,
      visit.appointmentDate,
    );
    return true;
  }

  // Completed appointments ALWAYS go to history, regardless of date
  // (doctor has changed status to completed)
  if (visit.status === "completed") {
    console.log(
      "✅ [isPastAppointment] Completed -> history:",
      visit.id,
      visit.appointmentDate,
    );
    return true;
  }

  // Include appointments with laboratory tests or instrumental tests assigned by doctor, even if not completed
  // (doctor has interacted with the appointment)
  if (
    visit.laboratoryTests &&
    Array.isArray(visit.laboratoryTests) &&
    visit.laboratoryTests.length > 0
  ) {
    console.log(
      "✅ [isPastAppointment] Has lab tests -> history:",
      visit.id,
      visit.appointmentDate,
    );
    return true;
  }

  if (
    visit.instrumentalTests &&
    Array.isArray(visit.instrumentalTests) &&
    visit.instrumentalTests.length > 0
  ) {
    console.log(
      "✅ [isPastAppointment] Has instrumental tests -> history:",
      visit.id,
      visit.appointmentDate,
    );
    return true;
  }

  // For other statuses (pending, scheduled), check if date has passed
  // Use local timezone to avoid timezone issues
  const timePart = visit.appointmentTime || "00:00";
  let appointmentDateTime: Date;

  // Parse date in YYYY-MM-DD format and time in HH:MM format in local timezone
  const dateStr = visit.appointmentDate;
  if (!dateStr) {
    return false;
  }

  try {
    const [year, month, day] = dateStr.split("-").map(Number);

    if (timePart && timePart !== "00:00") {
      const [hours, minutes] = timePart.split(":").map(Number);
      appointmentDateTime = new Date(
        year,
        month - 1,
        day,
        hours || 0,
        minutes || 0,
        0,
        0,
      );
    } else {
      appointmentDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (Number.isNaN(appointmentDateTime.getTime())) {
      console.log(
        "❌ [isPastAppointment] Invalid date:",
        visit.id,
        dateStr,
        timePart,
      );
      return false;
    }
  } catch (error) {
    console.error(
      "❌ [isPastAppointment] Error parsing appointment date:",
      error,
    );
    return false;
  }

  // Include past appointments (date/time has passed)
  // Compare with current time in local timezone
  const now = Date.now();
  const isPast = appointmentDateTime.getTime() < now;

  console.log("📅 [isPastAppointment] Check:", {
    visitId: visit.id,
    date: dateStr,
    time: timePart,
    status: visit.status,
    appointmentDateTime: appointmentDateTime.toISOString(),
    now: new Date(now).toISOString(),
    isPast,
    diff: appointmentDateTime.getTime() - now,
    diffHours: (appointmentDateTime.getTime() - now) / (1000 * 60 * 60),
  });

  return isPast;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 16,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#06B6D410",
    justifyContent: "center",
    alignItems: "center",
  },
  doctorDetails: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  bookedCountText: {
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
  },
  assignedCountText: {
    fontFamily: "Poppins-SemiBold",
    color: "#8B5CF6",
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  expandDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  expandDetailsButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailSectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 12,
  },
  notesCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesTextExpanded: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    lineHeight: 20,
  },
  testCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  testNotes: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  uploadedDocList: {
    gap: 8,
  },
  uploadedDocItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  uploadedDocName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#374151",
  },
  visitBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
  },
  diagnosisText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  symptomsContainer: {
    gap: 8,
  },
  symptomsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  symptomsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  symptomTag: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  symptomText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  medicationsContainer: {
    gap: 10,
    marginTop: 4,
  },
  medicationsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  medicationTag: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medicationText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#8B5CF6",
  },
  // Lab Tests Indicator Styles
  labTestsContainer: {
    marginTop: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  labTestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  labTestsLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#7C3AED",
  },
  labTestsBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  labTestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E9D5FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  labTestBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#7C3AED",
  },
  labTestBadgeSuccess: {
    backgroundColor: "#D1FAE5",
  },
  labTestBadgeTextSuccess: {
    color: "#10B981",
  },
  labTestBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  labTestBadgeTextPending: {
    color: "#F59E0B",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#06B6D4",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  detailSubValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  listItemText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalSignCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  vitalSignLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  vitalSignValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationDetails: {
    gap: 4,
  },
  medicationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  medicationDetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationDetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  medicationInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  medicationInstructionsText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  followUpCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  followUpContent: {
    flex: 1,
  },
  followUpTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
    marginBottom: 4,
  },
  followUpDate: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  followUpReason: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Card: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  form100Header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  form100Info: {
    flex: 1,
  },
  form100Title: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
    marginBottom: 2,
  },
  form100Id: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Details: {
    gap: 8,
    marginBottom: 16,
  },
  form100DetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  form100DetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  form100DetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  form100DownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 8,
    padding: 12,
  },
  form100DownloadText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  visitDocsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  visitDocsLoadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  visitDocsEmpty: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  followUpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  followUpButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  followUpButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  followUpButtonTextDisabled: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
    textAlign: "center",
  },
  laboratoryTestCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  laboratoryTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  laboratoryTestInfo: {
    flex: 1,
  },
  laboratoryTestName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  laboratoryTestClinic: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  bookTestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#06B6D4",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  bookTestButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  bookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  bookedBadgeText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  uploadResultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  uploadResultButtonExternal: {
    backgroundColor: "#7C3AED",
  },
  uploadResultButtonDisabled: {
    opacity: 0.6,
  },
  uploadResultButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  viewResultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  viewResultButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  // Action buttons for main page
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginLeft: 10,
  },
  // Follow-up required card
  followUpRequiredCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFEFF",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  followUpRequiredContent: {
    flex: 1,
    marginLeft: 10,
  },
  followUpRequiredTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
    marginBottom: 2,
  },
  followUpRequiredReason: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#0891B2",
  },
  // Medication detail card for prescription modal
  medicationDetailCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  medicationDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  medicationDetailName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
  },
  medicationDetailInfo: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    marginBottom: 6,
  },
  medicationDetailLabelModal: {
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
});

export default History;
