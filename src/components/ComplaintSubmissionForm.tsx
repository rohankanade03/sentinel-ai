import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  ImagePlus,
  MapPin,
  Mic,
  MicOff,
  SendHorizonal,
  X,
} from "lucide-react";
import type { DashboardLanguage } from "../types/dashboard";

export interface ComplaintDraft {
  complaint: string;
  citizenPhone: string;
  language: string;
  category: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: "browser" | "manual-pin";
  images: File[];
}

interface ComplaintSubmissionFormProps {
  errorMessage?: string | null;
  language: DashboardLanguage;
  onSubmit: (draft: ComplaintDraft) => Promise<void> | void;
}

const categoryRules = [
  { category: "Water Supply", words: ["pani", "water", "leak", "pipeline", "supply"] },
  { category: "Road & Infrastructure", words: ["road", "sadak", "pothole", "toot", "zebra", "footpath"] },
  { category: "Sanitation", words: ["kachra", "garbage", "gutter", "sewage", "overflow", "drain"] },
  { category: "Electricity", words: ["bijli", "electric", "street light", "transformer", "power", "light band"] },
  { category: "Fire & Emergency", words: ["fire", "aag", "blast", "collapse", "danger", "injured"] },
  { category: "Noise Pollution", words: ["noise", "loudspeaker", "dj", "horn"] },
  { category: "Encroachment", words: ["illegal", "encroach", "parking", "vendor"] },
  { category: "Public Safety", words: ["safety", "risk", "crime", "unsafe", "children"] },
  { category: "Public Amenities", words: ["park", "bench", "toilet", "bus stop", "street sign", "public tap"] },
];

function inferCategory(complaint: string) {
  const normalizedComplaint = complaint.toLowerCase();
  return (
    categoryRules.find((rule) =>
      rule.words.some((word) => normalizedComplaint.includes(word)),
    )?.category ?? "Other"
  );
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly [index: number]: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const emptyDraft: ComplaintDraft = {
  complaint: "",
  citizenPhone: "",
  language: "hinglish",
  category: "",
  location: "",
  address: "",
  latitude: undefined,
  longitude: undefined,
  locationSource: undefined,
  images: [],
};

interface ImagePreview {
  id: string;
  file: File;
  url: string;
}

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImages = 5;
const maxImageSize = 5 * 1024 * 1024;

const formLanguageMap: Record<DashboardLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  hinglish: "en-IN",
};

const formCopy: Record<
  DashboardLanguage,
  {
    voiceSupportLoading: string;
    voiceHttpsRequired: string;
    voiceUnsupported: string;
    voiceErrors: Record<string, string>;
    voiceStopped: string;
    maxImages: string;
    imageType: string;
    imageSize: string;
    locationUnavailable: string;
    locationCaptured: string;
    permissionDenied: string;
    locationCaptureFailed: string;
    invalidPin: string;
    manualPinSaved: string;
    noSpeech: string;
    voiceStartFailed: string;
    intakeBadge: string;
    title: string;
    phoneLabel: string;
    phoneHelp: string;
    detailsLabel: string;
    stopVoice: string;
    startVoice: string;
    complaintPlaceholder: string;
    listening: string;
    heard: string;
    speakClearly: string;
    gpsTitle: string;
    gpsHelp: string;
    locating: string;
    useCurrentLocation: string;
    manualPin: string;
    gps: string;
    latitude: string;
    longitude: string;
    setPin: string;
    evidenceTitle: string;
    evidenceHelp: string;
    addImages: string;
    removeImage: (fileName: string) => string;
    submitting: string;
    submit: string;
  }
> = {
  en: {
    voiceSupportLoading: "Voice input is available after the app loads in a browser.",
    voiceHttpsRequired:
      "Voice input needs HTTPS or localhost because browsers block microphone access on insecure pages.",
    voiceUnsupported:
      "Voice input works best in Chrome or Edge on desktop and Android. This browser does not expose Speech Recognition.",
    voiceErrors: {
      "not-allowed": "Microphone permission was blocked. Allow microphone access in browser settings and try again.",
      "service-not-allowed": "Speech recognition is blocked for this browser or site. Use Chrome or Edge on localhost/HTTPS.",
      "audio-capture": "No microphone was detected. Connect or enable a microphone and try again.",
      "no-speech": "No speech was detected. Speak closer to the microphone and try again.",
      network: "Speech recognition needs an active internet connection in this browser. Check the connection and try again.",
      aborted: "Voice input was stopped before speech was captured.",
    },
    voiceStopped: "Voice input stopped. Please try again.",
    maxImages: "You can upload up to 5 evidence images.",
    imageType: "Only JPEG, PNG, and WEBP images are allowed.",
    imageSize: "Each image must be 5 MB or smaller.",
    locationUnavailable: "Location is not available in this browser. Add a map pin below.",
    locationCaptured:
      "Location captured. The backend will resolve the readable address when the complaint is saved.",
    permissionDenied: "Location permission was denied. Add a map pin below instead.",
    locationCaptureFailed: "Location could not be captured. Add a map pin below instead.",
    invalidPin: "Enter a valid latitude and longitude for the map pin.",
    manualPinSaved: "Manual map pin saved for this complaint.",
    noSpeech: "No speech was detected. Check your microphone, speak closer, and try again.",
    voiceStartFailed: "Voice input could not start. Please try again.",
    intakeBadge: "Citizen complaint intake",
    title: "Submit a complaint",
    phoneLabel: "Mobile number for confirmation",
    phoneHelp:
      "Calls and WhatsApp confirmations are sent to this number after the complaint is saved.",
    detailsLabel: "Complaint details",
    stopVoice: "Stop voice",
    startVoice: "Voice to text",
    complaintPlaceholder: "Describe the civic issue, landmark, and urgency...",
    listening: "Listening for complaint details.",
    heard: "Heard:",
    speakClearly: "Speak clearly and the text will appear above.",
    gpsTitle: "GPS location",
    gpsHelp: "Required for submission and dashboard heatmap placement.",
    locating: "Locating...",
    useCurrentLocation: "Use current location",
    manualPin: "manual pin",
    gps: "GPS",
    latitude: "Latitude",
    longitude: "Longitude",
    setPin: "Set pin",
    evidenceTitle: "Evidence images",
    evidenceHelp: "Upload up to 5 JPEG, PNG, or WEBP images.",
    addImages: "Add images",
    removeImage: (fileName) => `Remove ${fileName}`,
    submitting: "Submitting...",
    submit: "Submit complaint",
  },
  hi: {
    voiceSupportLoading: "ऐप ब्राउज़र में लोड होने के बाद वॉइस इनपुट उपलब्ध होगा।",
    voiceHttpsRequired:
      "वॉइस इनपुट के लिए HTTPS या localhost चाहिए क्योंकि ब्राउज़र असुरक्षित पेज पर माइक्रोफोन रोकते हैं।",
    voiceUnsupported:
      "वॉइस इनपुट Chrome या Edge पर सबसे अच्छा काम करता है। इस ब्राउज़र में Speech Recognition उपलब्ध नहीं है।",
    voiceErrors: {
      "not-allowed": "माइक्रोफोन अनुमति ब्लॉक है। ब्राउज़र सेटिंग में अनुमति दें और फिर कोशिश करें।",
      "service-not-allowed": "इस ब्राउज़र या साइट पर स्पीच रिकग्निशन ब्लॉक है। Chrome या Edge का उपयोग करें।",
      "audio-capture": "माइक्रोफोन नहीं मिला। माइक्रोफोन कनेक्ट या चालू करके फिर कोशिश करें।",
      "no-speech": "कोई आवाज़ नहीं मिली। माइक्रोफोन के पास बोलें और फिर कोशिश करें।",
      network: "इस ब्राउज़र में स्पीच रिकग्निशन के लिए इंटरनेट चाहिए। कनेक्शन जांचें और फिर कोशिश करें।",
      aborted: "आवाज कैप्चर होने से पहले वॉइस इनपुट बंद हो गया।",
    },
    voiceStopped: "वॉइस इनपुट बंद हो गया। कृपया फिर कोशिश करें।",
    maxImages: "आप अधिकतम 5 सबूत फोटो अपलोड कर सकते हैं।",
    imageType: "केवल JPEG, PNG और WEBP फोटो मान्य हैं।",
    imageSize: "हर फोटो 5 MB या उससे कम होनी चाहिए।",
    locationUnavailable: "इस ब्राउज़र में लोकेशन उपलब्ध नहीं है। नीचे मैप पिन जोड़ें।",
    locationCaptured: "लोकेशन मिल गई। शिकायत सेव होने पर बैकएंड पता ढूंढेगा।",
    permissionDenied: "लोकेशन अनुमति अस्वीकार हुई। नीचे मैप पिन जोड़ें।",
    locationCaptureFailed: "लोकेशन नहीं मिल सकी। नीचे मैप पिन जोड़ें।",
    invalidPin: "मैप पिन के लिए सही latitude और longitude डालें।",
    manualPinSaved: "इस शिकायत के लिए मैनुअल मैप पिन सेव हो गया।",
    noSpeech: "कोई आवाज़ नहीं मिली। माइक्रोफोन जांचें, पास बोलें और फिर कोशिश करें।",
    voiceStartFailed: "वॉइस इनपुट शुरू नहीं हो सका। कृपया फिर कोशिश करें।",
    intakeBadge: "नागरिक शिकायत दर्ज",
    title: "शिकायत दर्ज करें",
    phoneLabel: "पुष्टि के लिए मोबाइल नंबर",
    phoneHelp: "शिकायत सेव होने के बाद इसी नंबर पर कॉल और WhatsApp पुष्टि भेजी जाएगी।",
    detailsLabel: "शिकायत विवरण",
    stopVoice: "वॉइस रोकें",
    startVoice: "वॉइस से टेक्स्ट",
    complaintPlaceholder: "नागरिक समस्या, लैंडमार्क और तात्कालिकता लिखें...",
    listening: "शिकायत विवरण सुना जा रहा है।",
    heard: "सुना:",
    speakClearly: "साफ बोलें, टेक्स्ट ऊपर दिखाई देगा।",
    gpsTitle: "GPS लोकेशन",
    gpsHelp: "सबमिशन और डैशबोर्ड हीटमैप के लिए जरूरी।",
    locating: "लोकेशन खोज रहे हैं...",
    useCurrentLocation: "वर्तमान लोकेशन उपयोग करें",
    manualPin: "मैनुअल पिन",
    gps: "GPS",
    latitude: "Latitude",
    longitude: "Longitude",
    setPin: "पिन सेट करें",
    evidenceTitle: "सबूत फोटो",
    evidenceHelp: "अधिकतम 5 JPEG, PNG या WEBP फोटो अपलोड करें।",
    addImages: "फोटो जोड़ें",
    removeImage: (fileName) => `${fileName} हटाएं`,
    submitting: "सबमिट हो रहा है...",
    submit: "शिकायत सबमिट करें",
  },
  hinglish: {
    voiceSupportLoading: "App browser mein load hone ke baad voice input available hoga.",
    voiceHttpsRequired:
      "Voice input ke liye HTTPS ya localhost chahiye, kyunki browser insecure page par microphone block karte hain.",
    voiceUnsupported:
      "Voice input Chrome ya Edge par best kaam karta hai. Is browser mein Speech Recognition available nahi hai.",
    voiceErrors: {
      "not-allowed": "Microphone permission blocked hai. Browser settings mein allow karke phir try karein.",
      "service-not-allowed": "Speech recognition is browser ya site par blocked hai. Chrome ya Edge use karein.",
      "audio-capture": "Microphone detect nahi hua. Microphone connect ya enable karke try karein.",
      "no-speech": "Speech detect nahi hui. Microphone ke paas bolkar phir try karein.",
      network: "Speech recognition ke liye internet connection chahiye. Connection check karke try karein.",
      aborted: "Speech capture hone se pehle voice input stop ho gaya.",
    },
    voiceStopped: "Voice input stop ho gaya. Please phir try karein.",
    maxImages: "Aap 5 tak evidence images upload kar sakte hain.",
    imageType: "Sirf JPEG, PNG, aur WEBP images allowed hain.",
    imageSize: "Har image 5 MB ya usse chhoti honi chahiye.",
    locationUnavailable: "Is browser mein location available nahi hai. Neeche map pin add karein.",
    locationCaptured: "Location capture ho gayi. Complaint save hone par backend readable address resolve karega.",
    permissionDenied: "Location permission deny hui. Neeche map pin add karein.",
    locationCaptureFailed: "Location capture nahi ho saki. Neeche map pin add karein.",
    invalidPin: "Map pin ke liye valid latitude aur longitude enter karein.",
    manualPinSaved: "Is complaint ke liye manual map pin save ho gaya.",
    noSpeech: "Speech detect nahi hui. Microphone check karein, paas bolen, aur phir try karein.",
    voiceStartFailed: "Voice input start nahi ho saka. Please phir try karein.",
    intakeBadge: "Citizen complaint intake",
    title: "Complaint submit karein",
    phoneLabel: "Confirmation ke liye mobile number",
    phoneHelp: "Complaint save hone ke baad call aur WhatsApp confirmations is number par bheje jayenge.",
    detailsLabel: "Complaint details",
    stopVoice: "Voice stop",
    startVoice: "Voice to text",
    complaintPlaceholder: "Civic issue, landmark, aur urgency describe karein...",
    listening: "Complaint details sun rahe hain.",
    heard: "Suna:",
    speakClearly: "Clear bolen, text upar appear hoga.",
    gpsTitle: "GPS location",
    gpsHelp: "Submission aur dashboard heatmap placement ke liye required.",
    locating: "Location dhoond rahe hain...",
    useCurrentLocation: "Current location use karein",
    manualPin: "manual pin",
    gps: "GPS",
    latitude: "Latitude",
    longitude: "Longitude",
    setPin: "Pin set karein",
    evidenceTitle: "Evidence images",
    evidenceHelp: "5 tak JPEG, PNG, ya WEBP images upload karein.",
    addImages: "Images add karein",
    removeImage: (fileName) => `${fileName} remove karein`,
    submitting: "Submit ho raha hai...",
    submit: "Complaint submit karein",
  },
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (
    (window as SpeechWindow).SpeechRecognition ||
    (window as SpeechWindow).webkitSpeechRecognition
  );
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function getVoiceSupportMessage(copy: (typeof formCopy)[DashboardLanguage]) {
  if (typeof window === "undefined") {
    return copy.voiceSupportLoading;
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
    window.location.hostname,
  );

  if (!window.isSecureContext && !isLocalhost) {
    return copy.voiceHttpsRequired;
  }

  if (!getSpeechRecognitionConstructor()) {
    return copy.voiceUnsupported;
  }

  return "";
}

function getVoiceErrorMessage(
  error: string,
  copy: (typeof formCopy)[DashboardLanguage],
) {
  return copy.voiceErrors[error] || copy.voiceStopped;
}

export function ComplaintSubmissionForm({
  errorMessage,
  language,
  onSubmit,
}: ComplaintSubmissionFormProps) {
  const copy = formCopy[language];
  const [draft, setDraft] = useState<ComplaintDraft>(emptyDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceSupportMessage, setVoiceSupportMessage] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState("");
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [manualPin, setManualPin] = useState({ lat: "", lng: "" });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const imagePreviewsRef = useRef<ImagePreview[]>([]);
  const voiceBaseTextRef = useRef("");
  const voiceCommittedTextRef = useRef("");
  const voiceInterimTextRef = useRef("");
  const hasVoiceTextRef = useRef(false);
  const hasVoiceErrorRef = useRef(false);

  const hasCoordinates =
    draft.latitude !== undefined && draft.longitude !== undefined;
  const isReady =
    draft.complaint.trim().length > 8 &&
    draft.citizenPhone.replace(/\D/g, "").length >= 10 &&
    hasCoordinates;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      imagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  useEffect(() => {
    setVoiceSupportMessage(getVoiceSupportMessage(copy));
  }, [copy]);

  useEffect(() => {
    setDraft((current) => ({ ...current, language }));
  }, [language]);

  function syncImages(nextPreviews: ImagePreview[]) {
    imagePreviewsRef.current = nextPreviews;
    setImagePreviews(nextPreviews);
    setDraft((current) => ({
      ...current,
      images: nextPreviews.map((preview) => preview.file),
    }));
  }

  function handleImageSelection(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setImageError("");
    const nextPreviews = [...imagePreviews];

    Array.from(files).forEach((file) => {
      if (nextPreviews.length >= maxImages) {
        setImageError(copy.maxImages);
        return;
      }

      if (!allowedImageTypes.has(file.type)) {
        setImageError(copy.imageType);
        return;
      }

      if (file.size > maxImageSize) {
        setImageError(copy.imageSize);
        return;
      }

      nextPreviews.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
      });
    });

    syncImages(nextPreviews);
  }

  function removeImage(id: string) {
    const removed = imagePreviews.find((preview) => preview.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }

    syncImages(imagePreviews.filter((preview) => preview.id !== id));
  }

  function applyCoordinates(
    latitude: number,
    longitude: number,
    source: ComplaintDraft["locationSource"],
  ) {
    setDraft((current) => ({
      ...current,
      latitude,
      longitude,
      locationSource: source,
      location: `Map pin ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    }));
  }

  function requestCurrentLocation() {
    setGeoMessage("");

    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      setGeoMessage(copy.locationUnavailable);
      return;
    }

    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "browser",
        );
        setGeoStatus("granted");
        setGeoMessage(copy.locationCaptured);
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setGeoMessage(
          error.code === error.PERMISSION_DENIED
            ? copy.permissionDenied
            : copy.locationCaptureFailed,
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }

  function applyManualPin() {
    const latitude = Number(manualPin.lat);
    const longitude = Number(manualPin.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setGeoStatus("unavailable");
      setGeoMessage(copy.invalidPin);
      return;
    }

    applyCoordinates(latitude, longitude, "manual-pin");
    setGeoStatus("granted");
    setGeoMessage(copy.manualPinSaved);
  }

  function composeVoiceText(finalText: string, interimText: string) {
    return [voiceBaseTextRef.current, finalText, interimText]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function updateComplaintFromVoice(finalText: string, interimText: string) {
    const nextComplaint = composeVoiceText(finalText, interimText);

    if (!nextComplaint) {
      return;
    }

    hasVoiceTextRef.current = true;
    setDraft((current) => ({ ...current, complaint: nextComplaint }));
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
    voiceInterimTextRef.current = "";
  }

  function startVoiceInput() {
    setVoiceError("");
    hasVoiceErrorRef.current = false;
    setInterimTranscript("");

    const supportMessage = getVoiceSupportMessage(copy);

    if (supportMessage) {
      setVoiceSupportMessage(supportMessage);
      setVoiceError(supportMessage);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    recognitionRef.current?.stop();
    voiceBaseTextRef.current = draft.complaint;
    voiceCommittedTextRef.current = "";
    voiceInterimTextRef.current = "";
    hasVoiceTextRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.continuous = !isMobileBrowser();
    recognition.interimResults = true;
    recognition.lang = formLanguageMap[language];

    recognition.onresult = (event) => {
      let nextFinal = "";
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = (result[0]?.transcript ?? "").replace(/\s+/g, " ").trim();

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          nextFinal = [nextFinal, transcript].filter(Boolean).join(" ");
        } else {
          nextInterim = [nextInterim, transcript].filter(Boolean).join(" ");
        }
      }

      if (nextFinal) {
        voiceCommittedTextRef.current = [
          voiceCommittedTextRef.current,
          nextFinal,
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }

      voiceInterimTextRef.current = nextInterim;
      updateComplaintFromVoice(voiceCommittedTextRef.current, nextInterim);
      setInterimTranscript(nextInterim);
    };

    recognition.onerror = (event) => {
      hasVoiceErrorRef.current = true;
      setVoiceError(getVoiceErrorMessage(event.error, copy));
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!hasVoiceTextRef.current && !hasVoiceErrorRef.current) {
        setVoiceError(
          copy.noSpeech,
        );
      }
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError(copy.voiceStartFailed);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      await onSubmit({
        ...draft,
        citizenPhone: draft.citizenPhone.trim(),
        category: inferCategory(draft.complaint),
        language: draft.language || "hinglish",
        location:
          draft.location ||
          (hasCoordinates
            ? `Map pin ${draft.latitude?.toFixed(5)}, ${draft.longitude?.toFixed(5)}`
            : ""),
      });
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
      syncImages([]);
      setDraft(emptyDraft);
      setGeoStatus("idle");
      setGeoMessage("");
      setManualPin({ lat: "", lng: "" });
    } catch {
      // Parent component owns the visible error state.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div>
        <span className="text-xs font-black uppercase text-teal-700">
          {copy.intakeBadge}
        </span>
        <h2 className="mt-2 text-2xl font-black text-ink">{copy.title}</h2>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-ink">{copy.phoneLabel}</span>
        <input
          className="min-h-12 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
          value={draft.citizenPhone}
          onChange={(event) =>
            setDraft((current) => ({ ...current, citizenPhone: event.target.value }))
          }
          placeholder="+91 98765 43210"
          inputMode="tel"
          autoComplete="tel"
        />
        <span className="text-xs font-semibold text-muted">
          {copy.phoneHelp}
        </span>
      </label>

      <div className="grid gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-bold text-ink">{copy.detailsLabel}</span>
          <button
            className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition sm:w-auto ${
              isListening
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
            }`}
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? copy.stopVoice : copy.startVoice}
          </button>
        </div>
        <textarea
          className="min-h-36 resize-y rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none transition focus:border-teal-500 focus:bg-white"
          value={draft.complaint}
          onChange={(event) => {
            if (isListening) {
              voiceBaseTextRef.current = event.target.value;
              voiceCommittedTextRef.current = "";
              voiceInterimTextRef.current = "";
              setInterimTranscript("");
            }

            setDraft((current) => ({ ...current, complaint: event.target.value }));
          }}
          placeholder={copy.complaintPlaceholder}
        />
        {isListening ? (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-bold leading-5 text-teal-800">
            {copy.listening}
            {interimTranscript
              ? ` ${copy.heard} ${interimTranscript}`
              : ` ${copy.speakClearly}`}
          </p>
        ) : null}
        {voiceError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
            {voiceError}
          </p>
        ) : null}
        {voiceSupportMessage ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
            {voiceSupportMessage}
          </p>
        ) : null}
      </div>

      <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-bold text-ink">{copy.gpsTitle}</span>
            <p className="mt-1 text-xs font-semibold text-muted">
              {copy.gpsHelp}
            </p>
          </div>
          <button
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            type="button"
            onClick={requestCurrentLocation}
            disabled={geoStatus === "locating"}
          >
            <Crosshair size={16} />
            {geoStatus === "locating" ? copy.locating : copy.useCurrentLocation}
          </button>
        </div>

        {hasCoordinates ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-bold text-teal-900">
            <MapPin size={16} />
            <span>
              {draft.latitude?.toFixed(5)}, {draft.longitude?.toFixed(5)}
            </span>
            <span className="text-teal-700">
              {draft.locationSource === "manual-pin" ? copy.manualPin : copy.gps}
            </span>
          </div>
        ) : null}

        {geoMessage ? (
          <p
            className={`rounded-lg border px-4 py-3 text-xs font-bold leading-5 ${
              geoStatus === "denied" || geoStatus === "unavailable"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-teal-200 bg-teal-50 text-teal-900"
            }`}
          >
            {geoMessage}
          </p>
        ) : null}

        {geoStatus === "denied" || geoStatus === "unavailable" ? (
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              className="min-h-11 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
              value={manualPin.lat}
              onChange={(event) =>
                setManualPin((current) => ({ ...current, lat: event.target.value }))
              }
              placeholder={copy.latitude}
              inputMode="decimal"
            />
            <input
              className="min-h-11 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
              value={manualPin.lng}
              onChange={(event) =>
                setManualPin((current) => ({ ...current, lng: event.target.value }))
              }
              placeholder={copy.longitude}
              inputMode="decimal"
            />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-black text-teal-700 transition hover:bg-teal-100 md:w-auto"
              type="button"
              onClick={applyManualPin}
            >
              <MapPin size={16} />
              {copy.setPin}
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-lg border border-dashed border-line bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-bold text-ink">{copy.evidenceTitle}</span>
            <p className="mt-1 text-xs font-semibold text-muted">
              {copy.evidenceHelp}
            </p>
          </div>
          <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-black text-teal-700 transition hover:bg-teal-50 sm:w-auto">
            <ImagePlus size={16} />
            {copy.addImages}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                handleImageSelection(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {imagePreviews.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imagePreviews.map((preview) => (
              <div
                key={preview.id}
                className="group relative overflow-hidden rounded-lg border border-line bg-white"
              >
                <img
                  className="h-28 w-full object-cover"
                  src={preview.url}
                  alt={preview.file.name}
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate text-xs font-bold text-ink">
                    {preview.file.name}
                  </span>
                  <button
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-rose-50 hover:text-rose-700"
                    type="button"
                    onClick={() => removeImage(preview.id)}
                    aria-label={copy.removeImage(preview.file.name)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {imageError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
            {imageError}
          </p>
        ) : null}
      </section>

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={!isReady || isSubmitting}
      >
        <SendHorizonal size={18} />
        {isSubmitting ? copy.submitting : copy.submit}
      </button>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
