"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X, FolderOpen } from "lucide-react";

export default function CameraDialog({
  onClose,
  onCapture,
  onPick,
}: {
  onClose: () => void;
  onCapture: (file: File) => void;
  onPick: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    let active = true;
    dialog.current?.showModal();
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Live camera needs HTTPS or localhost. You can still choose a photo below.",
          );
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
          audio: false,
        });
        if (!active) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
      } catch (err) {
        if (!active) return;
        stream.current?.getTracks().forEach((track) => track.stop());
        const name = err instanceof Error ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings or choose a photo."
            : name === "NotFoundError"
              ? "No camera was found. Choose a photo instead."
              : err instanceof Error
                ? err.message
                : "Could not start the camera. Choose a photo instead.",
        );
      }
    }
    void start();
    return () => {
      active = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, []);
  async function capture() {
    const source = video.current;
    if (!source?.videoWidth || capturing) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1600 / Math.max(source.videoWidth, source.videoHeight),
      );
      canvas.width = Math.round(source.videoWidth * scale);
      canvas.height = Math.round(source.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture the photograph.");
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Could not capture the photograph.");
      onCapture(
        new File([blob], `leaf-${Date.now()}.jpg`, { type: "image/jpeg" }),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed.");
      setCapturing(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="camera-dialog"
      aria-labelledby="camera-title"
      onCancel={onClose}
    >
      <div className="camera-heading">
        <div>
          <span className="eyebrow">LEAF PHOTOGRAPH</span>
          <h2 id="camera-title">Find a little clarity.</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close camera"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <p>
        Center one leaf in natural light. Keep it steady and fill the frame.
      </p>
      <div className="camera-view">
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          onLoadedData={() => setReady(true)}
        />
        <span aria-hidden="true" className="camera-guide" />
      </div>
      {error ? (
        <p role="alert" className="error-box">
          {error}
        </p>
      ) : !ready ? (
        <p role="status">Waiting for camera permission…</p>
      ) : null}
      <div className="camera-actions">
        <button className="button button-ghost" onClick={onPick}>
          <FolderOpen size={18} /> Choose photo
        </button>
        <button
          className="button button-primary"
          disabled={!ready || !!error || capturing}
          onClick={() => void capture()}
        >
          <Camera size={18} />
          {capturing ? "Capturing…" : "Capture leaf"}
        </button>
      </div>
    </dialog>
  );
}
