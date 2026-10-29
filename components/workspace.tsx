"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  CloudUpload,
  Download,
  ExternalLink,
  FileJson,
  Focus,
  FolderOpen,
  History,
  ImagePlus,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  X,
  ZoomIn,
  AlertCircle,
  CheckCircle2,
  Server,
  Monitor,
  Terminal,
  Info,
} from "lucide-react";
import {
  crops as initialCrops,
  advice,
  displayName,
  cropDescriptions,
  cropColors,
} from "@/lib/catalog";
import type { Advisory, Assessment, Crop, CropId, View } from "@/lib/types";
import {
  downloadJSON,
  readHistory,
  persistHistory,
  formatDate,
  preparePhoto,
} from "@/lib/client";
import { CropArt, HeroPlant } from "./botanical";
import CameraDialog from "./camera-dialog";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "scan", label: "Leaf scanner", icon: ScanLine },
  { id: "library", label: "Disease library", icon: BookOpen },
  { id: "history", label: "Scan journal", icon: History },
  { id: "models", label: "Model studio", icon: SlidersHorizontal },
] as const;
const views = navigation.map((n) => n.id);
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-top">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function CropIcon({ id }: { id: CropId }) {
  return (
    <span className="mini-crop" style={{ background: cropColors[id] + "18" }}>
      <CropArt crop={id} />
    </span>
  );
}
export default function Workspace() {
  const [view, setView] = useState<View>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [crops, setCrops] = useState<Crop[]>(initialCrops);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [crop, setCrop] = useState<CropId>("potato");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Assessment | null>(null);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [libraryCrop, setLibraryCrop] = useState("all");
  const [journalQuery, setJournalQuery] = useState("");
  const [journalCrop, setJournalCrop] = useState("all");
  const [disease, setDisease] = useState<{
    label: string;
    crop: CropId;
  } | null>(null);
  const [zoom, setZoom] = useState(false);
  const [help, setHelp] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<Assessment | null>(null);
  const [resultTab, setResultTab] = useState<"overview" | "scores" | "details">(
    "overview",
  );
  const inputRef = useRef<HTMLInputElement>(null),
    cameraRef = useRef<HTMLInputElement>(null),
    abortRef = useRef<AbortController | null>(null),
    resultRef = useRef<HTMLDivElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const notify = useCallback((message: string) => setToast(message), []);
  const navigate = useCallback((next: View) => {
    setView(next);
    setMobileMenu(false);
    window.history.pushState(
      null,
      "",
      next === "overview" ? "/" : `/?view=${next}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const refresh = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const response = await fetch("/api/crops", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();
      setCrops(data.crops);
    } catch {
      setStatusError(
        "Could not reach the backend. Check the server and try again.",
      );
    } finally {
      setStatusLoading(false);
    }
  }, []);
  useEffect(() => {
    const readView = () => {
      const value = new URLSearchParams(window.location.search).get("view");
      setView(views.includes(value as View) ? (value as View) : "overview");
    };
    readView();
    window.addEventListener("popstate", readView);
    setHistory(readHistory());
    try {
      const theme = localStorage.getItem("floravision-theme");
      setDark(theme === "dark");
    } catch {}
    void refresh();
    return () => {
      window.removeEventListener("popstate", readView);
      abortRef.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const selectedCrop = crops.find((c) => c.id === crop)!;
  const installed = crops.filter((c) => c.installed).length;
  const saveHistory = (next: Assessment[]) => {
    try {
      persistHistory(next);
      setHistory(next);
      return true;
    } catch {
      notify(
        "Your browser could not save the journal. Download the report instead.",
      );
      return false;
    }
  };
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("floravision-theme", next ? "dark" : "light");
    } catch {}
  };
  async function choosePhoto(file?: File) {
    if (!file || busy) return;
    setError("");
    setResult(null);
    setProcessingPhoto(true);
    try {
      const processed = await preparePhoto(file);
      setPhoto(processed);
      if (processed.size !== file.size)
        notify("Photo resized to fit the upload limit.");
    } catch (err) {
      setPhoto(null);
      setError(
        err instanceof Error ? err.message : "Could not open that photograph.",
      );
    } finally {
      setProcessingPhoto(false);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }
  function changeCrop(id: CropId) {
    if (busy) return;
    setCrop(id);
    setResult(null);
    setError("");
  }
  async function analyze() {
    if (!photo || busy) return;
    setError("");
    setResult(null);
    setBusy(true);
    setResultTab("overview");
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const form = new FormData();
      form.append("crop", crop);
      form.append("image", photo);
      const response = await fetch("/api/predict", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          response.status === 413
            ? "This image is too large for the server. Choose a smaller photo."
            : "The server returned an unreadable response. Please retry.",
        );
      }
      if (!response.ok || !data.ok)
        throw new Error(
          data.error?.message || "Analysis failed. Please retry.",
        );
      setResult(data.assessment);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        100,
      );
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Analysis stopped. Your photo is still selected; you can try again."
          : err instanceof Error
            ? err.message
            : "Analysis failed.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
      abortRef.current = null;
    }
  }
  async function runDemo() {
    if (busy) return;
    navigate("scan");
    setError("");
    setPhoto(null);
    setCrop("potato");
    setResult(null);
    setBusy(true);
    setResultTab("overview");
    try {
      const response = await fetch("/api/demo");
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error("Could not load the walkthrough.");
      setResult(data.assessment);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the example.",
      );
    } finally {
      setBusy(false);
    }
  }
  function saveResult() {
    if (!result || result.demo) return;
    if (history.some((item) => item.id === result.id)) {
      notify("This assessment is already in your journal.");
      return;
    }
    if (saveHistory([result, ...history].slice(0, 100)))
      notify("Assessment saved to your journal on this device.");
  }
  const actualHistory = history.filter((h) => !h.demo);
  const healthy = actualHistory.filter((h) =>
    h.diseaseId.endsWith("___healthy"),
  ).length;
  const filteredDiseases = initialCrops
    .flatMap((c) =>
      c.labels.map((label) => ({ label, crop: c.id, cropName: c.name })),
    )
    .filter(
      (item) =>
        (libraryCrop === "all" || item.crop === libraryCrop) &&
        `${displayName(item.label)} ${item.cropName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const filteredHistory = history.filter(
    (item) =>
      (journalCrop === "all" || item.crop === journalCrop) &&
      `${item.name} ${item.imageName}`
        .toLowerCase()
        .includes(journalQuery.toLowerCase()),
  );
  const currentTitle = navigation.find((n) => n.id === view)!.label;
  const reportButtons = (assessment: Assessment) => (
    <button
      className="button button-ghost"
      onClick={() =>
        downloadJSON(
          assessment,
          `floravision-${assessment.demo ? "example" : assessment.id}.json`,
        )
      }
    >
      <Download size={16} /> Download report
    </button>
  );
  function AssessmentDetails({ assessment }: { assessment: Assessment }) {
    return (
      <>
        <div className="assessment-title">
          <CropIcon id={assessment.crop} />
          <div>
            <span className="eyebrow">
              {initialCrops.find((c) => c.id === assessment.crop)?.name} ·{" "}
              {assessment.demo
                ? "ILLUSTRATIVE EXAMPLE"
                : "PROVISIONAL ASSESSMENT"}
            </span>
            <h2>{assessment.name}</h2>
          </div>
        </div>
        <div className="notice">
          <Info size={18} />
          <span>
            {assessment.demo
              ? "Fixed example scores show how results appear. This is not a prediction."
              : "Image screening is a starting point. Confirm symptoms before treatment; a high score can still be wrong."}
          </span>
        </div>
        <h3>Visible signs</h3>
        <p>{assessment.advisory?.symptoms || "No guidance available."}</p>
        <h3>Care & observation</h3>
        <ul className="care-list">
          {assessment.advisory?.prevention.map((tip, i) => (
            <li key={tip}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {tip}
            </li>
          ))}
        </ul>
        <p>{assessment.advisory?.next_step}</p>
        <div className="metadata-list">
          <div>
            <span>Model version</span>
            <strong>{assessment.modelVersion}</strong>
          </div>
          <div>
            <span>Model score</span>
            <strong>{(assessment.score * 100).toFixed(1)}%</strong>
          </div>
          <div>
            <span>Recorded</span>
            <strong>{formatDate(assessment.createdAt)}</strong>
          </div>
        </div>
        <p className="fine-print">{assessment.advisory?.review_status}</p>
        {reportButtons(assessment)}
      </>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {mobileMenu && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("overview");
          }}
          className="brand"
        >
          <span className="brand-symbol">
            <Leaf size={23} strokeWidth={1.8} />
          </span>
          <span>
            flora<span className="brand-light">vision</span>
            <small>GROW WITH CLARITY</small>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              href={item.id === "overview" ? "/" : `/?view=${item.id}`}
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(item.id);
              }}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "scan" && <span className="nav-new">AI</span>}
              {item.id === "history" && history.length > 0 && (
                <span className="nav-count">{history.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-guide">
          <div className="guide-icon">
            <SproutIcon />
          </div>
          <h3>A little care goes a long way.</h3>
          <p>Good photographs make better starting points.</p>
          <button onClick={() => setHelp(true)}>
            Photo field guide <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Help & field guide
            <ArrowUpRight size={15} />
          </button>
          <div className="workspace-identity">
            <span>FV</span>
            <div>
              <strong>Your field workspace</strong>
              <small>Personal project edition</small>
            </div>
            <Leaf size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="topbar-actions">
            <button className="connection" onClick={() => navigate("models")}>
              <span className={`status-dot ${installed > 0 ? "ready" : ""}`} />
              <span>
                {statusLoading
                  ? "Checking models"
                  : `${installed} of 6 models installed`}
              </span>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              onClick={toggleTheme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="avatar"
              onClick={() => setHelp(true)}
              aria-label="Open field guide"
            >
              FV
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {view === "overview" && (
            <div className="page-enter">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR CROP CARE COMPANION</p>
                  <h1>
                    A little clarity.
                    <br className="mobile-only" /> A healthier harvest.
                  </h1>
                  <p>Observe the small things. Make more informed decisions.</p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => navigate("scan")}
                >
                  <Plus size={18} />
                  New leaf scan
                </button>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <div className="hero-kicker">
                    <span /> FROM LEAF TO INSIGHT
                  </div>
                  <h2>
                    Small leaf.
                    <br />
                    Big <em>insight.</em>
                  </h2>
                  <p>
                    Give your crops a closer look. Screen a leaf, understand the
                    signs, and take the next step with care.
                  </p>
                  <div className="hero-buttons">
                    <button
                      className="button button-dark"
                      onClick={() => navigate("scan")}
                    >
                      Scan a leaf
                      <ArrowUpRight size={17} />
                    </button>
                    <button
                      className="hero-demo"
                      onClick={() => void runDemo()}
                    >
                      Explore a demo <span>↗</span>
                    </button>
                  </div>
                  <div className="hero-footnote">
                    <ShieldCheck size={14} />
                    Photos are processed, never stored on the server.
                  </div>
                </div>
                <div className="hero-art">
                  <HeroPlant />
                  <div className="floating-label">
                    <span className="floating-icon">
                      <ScanLine size={20} />
                    </span>
                    <div>
                      <strong>A fresh perspective</strong>
                      <small>Your crops. Your trained model.</small>
                    </div>
                    <span className="pulse-dot" />
                  </div>
                  <span className="botanical-note">
                    OBSERVE · UNDERSTAND · CARE
                  </span>
                </div>
              </section>
              <section className="stats-grid" aria-label="Workspace statistics">
                {[
                  {
                    label: "Saved assessments",
                    value: actualHistory.length,
                    note: "In your personal journal",
                    icon: ScanLine,
                    color: "green",
                  },
                  {
                    label: "Healthy classifications",
                    value: healthy,
                    note: "Among saved assessments",
                    icon: Leaf,
                    color: "sage",
                  },
                  {
                    label: "Crop families",
                    value: 6,
                    note: "27 reference categories",
                    icon: BookOpen,
                    color: "sand",
                  },
                  {
                    label: "Installed models",
                    value: installed,
                    note: "Ready for validation on scan",
                    icon: Activity,
                    color: "violet",
                  },
                ].map((stat) => (
                  <div className="stat-card" key={stat.label}>
                    <div className={`stat-icon ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                    <span>{stat.label}</span>
                    <strong>{stat.value.toString().padStart(2, "0")}</strong>
                    <small>{stat.note}</small>
                  </div>
                ))}
              </section>
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h2>What are you growing?</h2>
                    <p>Choose a crop to start your next leaf assessment.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate("library")}
                  >
                    Explore library
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="crop-grid">
                  {crops.map((item) => (
                    <button
                      className="crop-tile"
                      key={item.id}
                      onClick={() => {
                        changeCrop(item.id);
                        navigate("scan");
                      }}
                    >
                      <div
                        className="crop-art-backdrop"
                        style={{ background: cropColors[item.id] + "13" }}
                      >
                        <CropArt crop={item.id} />
                      </div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.labels.length} categories
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="overview-bottom">
                <section className="panel recent-panel">
                  <div className="section-heading">
                    <h2>From your journal</h2>
                    <button
                      className="text-link"
                      onClick={() => navigate("history")}
                    >
                      View all
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <Empty
                      icon={<History size={27} />}
                      title="Your growing story starts here"
                      description="Save your first assessment to build a record of what you observe."
                      action={
                        <button
                          className="button button-ghost"
                          onClick={() => navigate("scan")}
                        >
                          Make your first scan
                          <ArrowRight size={16} />
                        </button>
                      }
                    />
                  ) : (
                    <div className="recent-list">
                      {history.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          className="recent-row"
                          onClick={() => setHistoryDetail(item)}
                        >
                          <CropIcon id={item.crop} />
                          <div>
                            <strong>{item.name}</strong>
                            <small>{formatDate(item.createdAt)}</small>
                          </div>
                          <Pill
                            tone={
                              item.diseaseId.endsWith("___healthy")
                                ? "green"
                                : "amber"
                            }
                          >
                            {(item.score * 100).toFixed(0)}% score
                          </Pill>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                <section className="field-note">
                  <p className="eyebrow">FIELD NOTE / 001</p>
                  <h2>
                    The best insight
                    <br />
                    starts with a<br />
                    <em>clear photograph.</em>
                  </h2>
                  <p>
                    One leaf. Natural light. A simple background. A few small
                    choices make a difference.
                  </p>
                  <button className="text-link" onClick={() => setHelp(true)}>
                    Read the photo guide
                    <ArrowUpRight size={16} />
                  </button>
                  <div className="note-decoration">
                    <Focus size={82} strokeWidth={0.8} />
                  </div>
                </section>
              </div>
            </div>
          )}
          {view === "scan" && (
            <div className="page-enter">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">OBSERVE WITH INTENTION</p>
                  <h1>Give your leaf a closer look.</h1>
                  <p>
                    A clear photograph is the first step toward a useful
                    assessment.
                  </p>
                </div>
                <button
                  className="button button-ghost"
                  onClick={() => setHelp(true)}
                >
                  <CircleHelp size={17} />
                  Photo guide
                </button>
              </div>
              <div className="scan-steps">
                {[
                  "Choose your crop",
                  "Add a photograph",
                  "Explore the result",
                ].map((step, i) => (
                  <div
                    key={step}
                    className={
                      i === 0 || (i === 1 && !!photo) || (i === 2 && !!result)
                        ? "complete"
                        : ""
                    }
                  >
                    <span>
                      {i === 0 || (i === 1 && photo) || (i === 2 && result) ? (
                        <Check size={13} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {step}
                    {i < 2 && <i />}
                  </div>
                ))}
              </div>
              <div className="scan-layout">
                <section className="panel scan-input">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">01 / THE LEAF</span>
                      <h2>Start with your crop</h2>
                    </div>
                    <Pill>
                      <ShieldCheck size={12} />
                      Private upload
                    </Pill>
                  </div>
                  <div
                    className="crop-selector"
                    role="group"
                    aria-label="Select crop"
                  >
                    {crops.map((item) => (
                      <button
                        disabled={busy}
                        className={`crop-choice ${crop === item.id ? "selected" : ""}`}
                        key={item.id}
                        aria-pressed={crop === item.id}
                        onClick={() => changeCrop(item.id)}
                      >
                        <CropArt crop={item.id} />
                        <span>{item.name}</span>
                        {crop === item.id && (
                          <span className="choice-check">
                            <Check size={10} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`model-note ${selectedCrop.installed ? "available" : ""}`}
                  >
                    <span
                      className={`status-dot ${selectedCrop.installed ? "ready" : ""}`}
                    />
                    {statusLoading
                      ? "Checking model files…"
                      : selectedCrop.installed
                        ? `${selectedCrop.name} model installed · validated when you scan`
                        : `${selectedCrop.name} model needs to be installed`}
                    <button onClick={() => navigate("models")}>
                      {selectedCrop.installed ? "Details" : "Set up"}
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                  <div
                    className={`upload-zone ${dragging ? "dragging" : ""} ${preview ? "has-photo" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!busy) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      void choosePhoto(event.dataTransfer.files[0]);
                    }}
                  >
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt="Selected leaf for assessment"
                          className="leaf-preview"
                        />
                        {busy && (
                          <div className="scan-overlay">
                            <div className="scan-beam" />
                            <span>
                              <LoaderCircle size={16} className="spin" />
                              Analyzing your leaf
                            </span>
                          </div>
                        )}
                        <button
                          className="zoom-button"
                          onClick={() => setZoom(true)}
                          aria-label="Enlarge leaf photograph"
                        >
                          <ZoomIn size={17} />
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={busy || processingPhoto}
                        className="upload-target"
                        onClick={() => inputRef.current?.click()}
                      >
                        <div className="upload-symbol">
                          {processingPhoto ? (
                            <LoaderCircle className="spin" size={29} />
                          ) : (
                            <CloudUpload size={29} strokeWidth={1.5} />
                          )}
                        </div>
                        <strong>
                          {processingPhoto
                            ? "Preparing your photograph…"
                            : "Drop a leaf photo here"}
                        </strong>
                        <span>
                          or <b>browse your files</b>
                        </span>
                        <small>
                          JPG, PNG or WebP · photos up to 20 MB
                          <br />
                          Large photos are compressed before upload.
                        </small>
                        <span className="upload-corners" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    className="visually-hidden"
                    accept="image/jpeg,image/png,image/webp"
                    tabIndex={-1}
                    onChange={(event) =>
                      void choosePhoto(event.target.files?.[0])
                    }
                  />
                  <input
                    ref={cameraRef}
                    type="file"
                    className="visually-hidden"
                    accept="image/*"
                    capture="environment"
                    tabIndex={-1}
                    onChange={(event) =>
                      void choosePhoto(event.target.files?.[0])
                    }
                  />
                  <div className="photo-actions">
                    {photo ? (
                      <>
                        <span title={photo.name}>
                          {photo.name}
                          <small>
                            {(photo.size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        </span>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label="Remove photograph"
                          onClick={() => {
                            setPhoto(null);
                            setResult(null);
                            setError("");
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                        <button
                          className="button button-small"
                          disabled={busy}
                          onClick={() => inputRef.current?.click()}
                        >
                          Change
                        </button>
                      </>
                    ) : (
                      <>
                        <span>
                          <ImagePlus size={15} />
                          One clear leaf works best
                        </span>
                        <button
                          className="button button-small"
                          disabled={busy}
                          onClick={() => setCameraOpen(true)}
                        >
                          <Camera size={15} />
                          Use camera
                        </button>
                      </>
                    )}
                  </div>
                  {error && (
                    <div className="error-box" role="alert">
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}
                  {busy ? (
                    <button
                      className="button button-primary full-width"
                      onClick={() => abortRef.current?.abort()}
                      disabled={!abortRef.current}
                    >
                      <LoaderCircle size={18} className="spin" />
                      Analyzing… {abortRef.current && <span>Cancel</span>}
                    </button>
                  ) : (
                    <button
                      className="button button-primary full-width"
                      disabled={
                        !photo ||
                        !selectedCrop.installed ||
                        processingPhoto ||
                        statusLoading
                      }
                      onClick={() => void analyze()}
                    >
                      <ScanLine size={18} />
                      Analyze leaf
                      <ArrowRight size={18} />
                    </button>
                  )}
                  <p className="fine-print centered">
                    Your image is sent securely to this app&apos;s backend for
                    analysis.
                    <br />
                    The server does not store your photograph.
                  </p>
                  <div className="demo-divider">
                    <span>Just exploring?</span>
                    <button onClick={() => void runDemo()} disabled={busy}>
                      Try the illustrative demo
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                <section
                  className="panel result-panel"
                  ref={resultRef}
                  aria-live="polite"
                  aria-busy={busy}
                >
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">02 / THE INSIGHT</span>
                      <h2>Your assessment</h2>
                    </div>
                    {result && (
                      <Pill tone={result.demo ? "amber" : "green"}>
                        {result.demo ? "Demo result" : "Analysis complete"}
                      </Pill>
                    )}
                  </div>
                  {!result ? (
                    <div className="result-placeholder">
                      <div
                        className={`result-orbit ${busy ? "is-scanning" : ""}`}
                      >
                        <div />
                        <div />
                        <span>
                          {busy ? (
                            <ScanLine size={38} strokeWidth={1} />
                          ) : (
                            <Leaf size={38} strokeWidth={1} />
                          )}
                        </span>
                      </div>
                      <h3>
                        {busy
                          ? "Looking a little closer…"
                          : "A new perspective awaits."}
                      </h3>
                      <p>
                        {busy
                          ? "Your image is being processed by the crop model. The first scan may take longer while the model loads."
                          : "Add your leaf photograph and start a scan. Your assessment, class scores and care notes will appear here."}
                      </p>
                      <div className="result-promises">
                        <span>
                          <Check size={14} />
                          Crop-specific analysis
                        </span>
                        <span>
                          <Check size={14} />
                          Readable care guidance
                        </span>
                        <span>
                          <Check size={14} />
                          Downloadable report
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="result-summary">
                        <CropIcon id={result.crop} />
                        <div>
                          <span>
                            {
                              initialCrops.find((c) => c.id === result.crop)
                                ?.name
                            }{" "}
                            leaf
                          </span>
                          <h3>{result.name}</h3>
                        </div>
                      </div>
                      <div className="score-block">
                        <div
                          className="score-ring"
                          style={
                            {
                              "--score": `${result.score * 100}%`,
                            } as React.CSSProperties
                          }
                        >
                          <div>
                            <strong>
                              {(result.score * 100).toFixed(1)}
                              <small>%</small>
                            </strong>
                          </div>
                        </div>
                        <div>
                          <strong>Model score</strong>
                          <p>
                            How strongly the model favored this class.
                            <br />
                            Not diagnostic certainty.
                          </p>
                          {result.needsReview && (
                            <span className="review-tag">
                              <Info size={12} />
                              Further review recommended
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="result-tabs"
                        role="tablist"
                        aria-label="Assessment details"
                      >
                        {(["overview", "scores", "details"] as const).map(
                          (tab) => (
                            <button
                              role="tab"
                              aria-selected={resultTab === tab}
                              key={tab}
                              onClick={() => setResultTab(tab)}
                            >
                              {tab === "overview"
                                ? "Care notes"
                                : tab === "scores"
                                  ? "Class scores"
                                  : "Model details"}
                            </button>
                          ),
                        )}
                      </div>
                      <div className="result-tab-content" role="tabpanel">
                        {resultTab === "overview" ? (
                          <>
                            <h4>What to look for</h4>
                            <p>
                              {result.advisory?.symptoms ||
                                "No advisory is available for this class."}
                            </p>
                            <h4>Small steps, better care</h4>
                            <ul className="care-list">
                              {result.advisory?.prevention.map((tip, i) => (
                                <li key={tip}>
                                  <span>{i + 1}</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : resultTab === "scores" ? (
                          <div className="distribution">
                            {[...result.distribution]
                              .sort((a, b) => b.score - a.score)
                              .map((item, i) => (
                                <div
                                  key={item.label}
                                  className={i === 0 ? "highest" : ""}
                                >
                                  <div>
                                    <span>{item.name}</span>
                                    <strong>
                                      {(item.score * 100).toFixed(1)}%
                                    </strong>
                                  </div>
                                  <progress
                                    max={1}
                                    value={item.score}
                                    aria-label={`${item.name} model score`}
                                  />
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="metadata-list">
                            <div>
                              <span>Model</span>
                              <strong>{result.modelVersion}</strong>
                            </div>
                            <div>
                              <span>Preprocessing</span>
                              <strong>{result.preprocessing}</strong>
                            </div>
                            <div>
                              <span>Server time</span>
                              <strong>
                                {result.durationMs === null
                                  ? "Example only"
                                  : `${result.durationMs} ms`}
                              </strong>
                            </div>
                            <div>
                              <span>Advisory revision</span>
                              <strong>
                                {result.advisory?.revision || "Unavailable"}
                              </strong>
                            </div>
                            <p className="fine-print">
                              {result.advisory?.review_status}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="notice">
                        <Info size={17} />
                        <span>
                          {result.demo
                            ? "Illustrative example: these fixed scores do not describe an uploaded image."
                            : "A model can be confidently wrong. Check several leaves and seek local expert advice before treatment."}
                        </span>
                      </div>
                      <div className="result-actions">
                        <button
                          className="button button-primary"
                          disabled={
                            result.demo ||
                            history.some((h) => h.id === result.id)
                          }
                          onClick={saveResult}
                        >
                          {history.some((h) => h.id === result.id) ? (
                            <CheckCheck size={16} />
                          ) : (
                            <Plus size={16} />
                          )}
                          Save to journal
                        </button>
                        {reportButtons(result)}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          )}
          {view === "library" && (
            <div className="page-enter">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">KNOW YOUR LEAVES</p>
                  <h1>A field guide, at your fingertips.</h1>
                  <p>
                    Explore the 27 categories in your crop models. Look for
                    patterns, then investigate.
                  </p>
                </div>
                <Pill tone="green">
                  <BookOpen size={14} />6 crop families
                </Pill>
              </div>
              <div className="library-toolbar">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    placeholder="Search diseases, crops or healthy leaves…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search disease library"
                  />
                  {query && (
                    <button
                      className="icon-button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
                <div
                  className="filter-pills"
                  role="group"
                  aria-label="Filter by crop"
                >
                  {[{ id: "all", name: "All crops" }, ...initialCrops].map(
                    (c) => (
                      <button
                        key={c.id}
                        aria-pressed={libraryCrop === c.id}
                        onClick={() => setLibraryCrop(c.id)}
                      >
                        {c.name}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="library-count">
                <span>{filteredDiseases.length} reference categories</span>
                <span>
                  <Info size={14} />
                  Educational guidance · expert review recommended
                </span>
              </div>
              <div className="disease-grid">
                {filteredDiseases.map((item) => (
                  <button
                    className="disease-card"
                    key={item.label}
                    onClick={() => setDisease(item)}
                  >
                    <div className="disease-card-top">
                      <CropIcon id={item.crop} />
                      <Pill
                        tone={
                          item.label.endsWith("___healthy")
                            ? "green"
                            : "neutral"
                        }
                      >
                        {item.label.endsWith("___healthy")
                          ? "Healthy class"
                          : item.cropName}
                      </Pill>
                    </div>
                    <h3>{displayName(item.label)}</h3>
                    <p>{advice[item.label]?.symptoms}</p>
                    <div className="disease-card-bottom">
                      <span>Signs & care notes</span>
                      <ArrowUpRight size={17} />
                    </div>
                  </button>
                ))}
              </div>
              {filteredDiseases.length === 0 && (
                <Empty
                  icon={<Search size={28} />}
                  title="No matching categories"
                  description="Try a crop name or a different search term."
                  action={
                    <button
                      className="button button-ghost"
                      onClick={() => {
                        setQuery("");
                        setLibraryCrop("all");
                      }}
                    >
                      Reset filters
                    </button>
                  }
                />
              )}
            </div>
          )}
          {view === "history" && (
            <div className="page-enter">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR OBSERVATIONS, TOGETHER</p>
                  <h1>Every leaf has a story.</h1>
                  <p>
                    Your saved assessments, kept in this browser. Photographs
                    are not saved.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => navigate("scan")}
                >
                  <Plus size={18} />
                  New scan
                </button>
              </div>
              <div className="journal-summary">
                <div>
                  <span className="journal-summary-icon">
                    <History size={22} />
                  </span>
                  <div>
                    <strong>{history.length}</strong>
                    <span>saved assessments</span>
                  </div>
                </div>
                <div>
                  <span className="journal-summary-icon sage">
                    <Leaf size={22} />
                  </span>
                  <div>
                    <strong>{healthy}</strong>
                    <span>healthy classifications</span>
                  </div>
                </div>
                <div>
                  <span className="journal-summary-icon amber">
                    <Focus size={22} />
                  </span>
                  <div>
                    <strong>
                      {actualHistory.filter((h) => h.needsReview).length}
                    </strong>
                    <span>flagged for review</span>
                  </div>
                </div>
              </div>
              <section className="panel journal-panel">
                <div className="journal-toolbar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      placeholder="Search your assessments…"
                      aria-label="Search journal"
                      value={journalQuery}
                      onChange={(e) => setJournalQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter journal by crop"
                    value={journalCrop}
                    onChange={(e) => setJournalCrop(e.target.value)}
                  >
                    <option value="all">All crops</option>
                    {initialCrops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button button-ghost"
                    disabled={!history.length}
                    onClick={() =>
                      downloadJSON(history, "floravision-journal.json")
                    }
                  >
                    <Download size={16} />
                    <span>Export</span>
                  </button>
                  <button
                    className="icon-button"
                    disabled={!history.length}
                    onClick={() => setClearConfirm(true)}
                    aria-label="Clear journal"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                {history.length === 0 ? (
                  <Empty
                    icon={<BookOpen size={30} />}
                    title="A blank page, a fresh start."
                    description="Analyze a leaf and choose Save to journal. Your observations will appear here."
                    action={
                      <button
                        className="button button-primary"
                        onClick={() => navigate("scan")}
                      >
                        Start a leaf scan
                        <ArrowRight size={16} />
                      </button>
                    }
                  />
                ) : filteredHistory.length === 0 ? (
                  <Empty
                    icon={<Search size={27} />}
                    title="No matching assessments"
                    description="Try a different search or crop filter."
                  />
                ) : (
                  <div className="journal-table">
                    <div className="journal-table-head">
                      <span>Assessment</span>
                      <span>Model score</span>
                      <span>Date saved</span>
                      <span>Actions</span>
                    </div>
                    {filteredHistory.map((item) => (
                      <div className="journal-table-row" key={item.id}>
                        <button
                          className="journal-record"
                          onClick={() => setHistoryDetail(item)}
                        >
                          <CropIcon id={item.crop} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {
                                initialCrops.find((c) => c.id === item.crop)
                                  ?.name
                              }
                            </small>
                          </span>
                        </button>
                        <span>
                          <Pill tone={item.needsReview ? "amber" : "green"}>
                            {(item.score * 100).toFixed(1)}%
                          </Pill>
                        </span>
                        <span className="record-date">
                          {formatDate(item.createdAt)}
                        </span>
                        <div className="record-actions">
                          <button
                            className="icon-button"
                            aria-label={`Download ${item.name} report`}
                            onClick={() =>
                              downloadJSON(item, `floravision-${item.id}.json`)
                            }
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${item.name} from journal`}
                            onClick={() => {
                              if (
                                saveHistory(
                                  history.filter((h) => h.id !== item.id),
                                )
                              )
                                notify("Assessment removed from this device.");
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="journal-footer">
                  <ShieldCheck size={14} />
                  Stored on this device · up to 100 assessments · clearing
                  browser data removes the journal
                </div>
              </section>
            </div>
          )}
          {view === "models" && (
            <div className="page-enter">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">THE INTELLIGENCE BEHIND THE LEAF</p>
                  <h1>Your models. Ready to grow.</h1>
                  <p>
                    Train in Colab, export your weights, and bring them into
                    this project.
                  </p>
                </div>
                <button
                  className="button button-ghost"
                  onClick={() => void refresh()}
                  disabled={statusLoading}
                >
                  <RefreshCw
                    size={16}
                    className={statusLoading ? "spin" : ""}
                  />
                  Refresh status
                </button>
              </div>
              {statusError && (
                <div className="error-box" role="alert">
                  <AlertCircle size={18} />
                  {statusError}
                </div>
              )}
              <div className="model-studio-banner">
                <span className="studio-icon">
                  <Server size={25} />
                </span>
                <div>
                  <h2>{installed} of 6 crop models installed</h2>
                  <p>
                    Files are checked for presence here. Network structure,
                    weights and Keras reference predictions are validated on
                    first use.
                  </p>
                </div>
                <Pill tone={installed ? "green" : "amber"}>
                  {installed ? "Backend configured" : "Add your trained models"}
                </Pill>
              </div>
              <div className="model-grid">
                {crops.map((c) => (
                  <div className="panel model-card" key={c.id}>
                    <div className="model-card-top">
                      <CropIcon id={c.id} />
                      <Pill tone={c.installed ? "green" : "neutral"}>
                        <span
                          className={`status-dot ${c.installed ? "ready" : ""}`}
                        />
                        {c.installed ? "Installed" : "Not installed"}
                      </Pill>
                    </div>
                    <h3>{c.name}</h3>
                    <p>{cropDescriptions[c.id]}</p>
                    <code>models/{c.id}-browser.json</code>
                    <div className="model-card-bottom">
                      <span>{c.labels.length} output classes</span>
                      <button
                        className="text-link"
                        disabled={!c.installed}
                        onClick={() => {
                          changeCrop(c.id);
                          navigate("scan");
                        }}
                      >
                        Scan
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <section className="panel setup-panel">
                <div>
                  <span className="eyebrow">ONE-TIME SETUP</span>
                  <h2>From Colab to your website.</h2>
                  <p>
                    Your backend runs the compact CNN exported from your own
                    training. No third-party detection API is needed.
                  </p>
                </div>
                <ol className="setup-steps">
                  <li>
                    <span>01</span>
                    <div>
                      <h3>Export the trained weights</h3>
                      <p>
                        Run the export cell in the separate training notebook.
                        Choose your saved crop folder; the script produces a
                        browser-format JSON also used by this Node backend.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h3>Add the file to this project</h3>
                      <p>
                        Put <code>potato-browser.json</code> in{" "}
                        <code>models/</code>. Repeat for each crop. Keep the
                        original filenames.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h3>Check, restart, deploy</h3>
                      <p>
                        Run <code>npm run models:check</code>, then restart the
                        local server. Include the models in your Git repository
                        before deploying to Vercel.
                      </p>
                    </div>
                  </li>
                </ol>
                <div className="setup-note">
                  <Info size={17} />
                  <p>
                    The ZIP includes a walkthrough, not trained disease weights.
                    Missing models never produce invented predictions. See the
                    included README for complete setup and deployment
                    instructions.
                  </p>
                </div>
              </section>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Leaf size={13} /> A little clarity for every leaf.
          </span>
          <span>
            FloraVision <i /> Project edition
          </span>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <button
            key={item.id}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={20} />
            <span>
              {item.id === "overview"
                ? "Home"
                : item.id === "scan"
                  ? "Scan"
                  : item.id === "library"
                    ? "Library"
                    : "Journal"}
            </span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {help && (
        <Modal
          title="A better photograph, a better start."
          onClose={() => setHelp(false)}
        >
          <div className="guide-hero">
            <Focus size={56} strokeWidth={1} />
            <div>
              <span className="eyebrow">THE PHOTO FIELD GUIDE</span>
              <p>Capture the detail your model needs.</p>
            </div>
          </div>
          <div className="guide-tips">
            {[
              {
                icon: Sun,
                title: "Find soft, natural light",
                text: "Avoid hard shadows, flash glare and very dark photographs.",
              },
              {
                icon: Leaf,
                title: "Choose one clear leaf",
                text: "Show the complete leaf, including its edges and visible symptoms.",
              },
              {
                icon: Focus,
                title: "Keep it sharp and simple",
                text: "Hold the camera steady. Use an uncluttered background.",
              },
              {
                icon: CheckCircle2,
                title: "Select the correct crop",
                text: "The classifier only compares categories within your chosen crop. It cannot verify the crop for you.",
              },
            ].map((tip) => (
              <div key={tip.title}>
                <tip.icon size={22} />
                <div>
                  <h3>{tip.title}</h3>
                  <p>{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="notice">
            <Info size={18} />
            <span>
              Screening is educational and provisional. Conditions outside the
              model&apos;s training data can receive misleadingly high scores.
            </span>
          </div>
          <button
            className="button button-primary full-width"
            onClick={() => {
              setHelp(false);
              navigate("scan");
            }}
          >
            Ready to scan
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {zoom && preview && (
        <Modal title="Your leaf photograph" onClose={() => setZoom(false)}>
          <img
            src={preview}
            alt="Enlarged leaf photograph"
            className="zoom-image"
          />
        </Modal>
      )}
      {disease && (
        <Modal
          title={displayName(disease.label)}
          onClose={() => setDisease(null)}
        >
          <div className="disease-modal-art">
            <CropArt crop={disease.crop} />
            <Pill>{initialCrops.find((c) => c.id === disease.crop)?.name}</Pill>
          </div>
          <h3>What to look for</h3>
          <p>{advice[disease.label]?.symptoms}</p>
          <h3>Care & observation</h3>
          <ul className="care-list">
            {advice[disease.label]?.prevention.map((tip, i) => (
              <li key={tip}>
                <span>{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
          <div className="notice">
            <Info size={17} />
            <span>{advice[disease.label]?.next_step}</span>
          </div>
          <p className="fine-print">
            {advice[disease.label]?.review_status} Revision:{" "}
            {advice[disease.label]?.revision}.
          </p>
          <button
            className="button button-primary full-width"
            onClick={() => {
              changeCrop(disease.crop);
              setDisease(null);
              navigate("scan");
            }}
          >
            Screen a{" "}
            {initialCrops
              .find((c) => c.id === disease.crop)
              ?.name.toLowerCase()}{" "}
            leaf
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {historyDetail && (
        <Modal title="Saved assessment" onClose={() => setHistoryDetail(null)}>
          <AssessmentDetails assessment={historyDetail} />
        </Modal>
      )}
      {cameraOpen && (
        <CameraDialog
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => void choosePhoto(file)}
          onPick={() => {
            setCameraOpen(false);
            cameraRef.current?.click();
          }}
        />
      )}
      {clearConfirm && (
        <Modal
          title="Clear your scan journal?"
          onClose={() => setClearConfirm(false)}
        >
          <p>
            This removes the {history.length} saved assessments from this
            browser. Download your journal first if you want to keep a copy.
          </p>
          <div className="dialog-actions">
            <button
              className="button button-ghost"
              onClick={() => setClearConfirm(false)}
            >
              Keep journal
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                if (saveHistory([])) {
                  setClearConfirm(false);
                  notify("Journal cleared from this device.");
                }
              }}
            >
              Clear journal
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SproutIcon() {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 32V18M19 22C6 22 5 11 6 6C16 6 22 13 19 22ZM19 16C20 7 28 5 33 6C32 14 26 20 19 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
