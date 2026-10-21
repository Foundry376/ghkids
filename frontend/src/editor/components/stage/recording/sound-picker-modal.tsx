import { useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { makeRequest } from "../../../../helpers/api";
import { playSound } from "../../../utils/utils";

export type PickedSound = { url: string; name: string };

type LibrarySound = {
  id: string;
  label: string;
  url: string;
  tags: string[];
  featured: boolean;
};

type LibraryResponse = {
  provider: string;
  attribution: { label: string; url: string } | null;
  tags: string[];
  sounds: LibrarySound[];
};

const API_ROOT = window.location.host.includes("codako") ? `` : `http://localhost:8080`;
const ALL_TAG = "__all__";
const MAX_RECORDING_MS = 10 * 1000;

/**
 * Picker for the sound played by a "sound" rule action. Clicking a sound previews
 * and selects it; Done emits the selection through `onPick`.
 */
export const SoundPickerModal = ({
  open,
  value,
  onPick,
  onCancel,
}: {
  open: boolean;
  value: PickedSound | null;
  onPick: (sound: PickedSound) => void;
  onCancel: () => void;
}) => {
  const [local, setLocal] = useState<PickedSound | null>(value);
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG);
  const [isUploading, setUploading] = useState(false);
  const [isRecording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    setLocal(value);
    setRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Closing the modal mid-recording throws the recording away and releases the microphone.
  useEffect(() => {
    if (!open) return;
    return () => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorder.onstop = null;
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || data) return;
    makeRequest<LibraryResponse>(`/sounds/kenney`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [open, data]);

  const _onSelect = (sound: PickedSound) => {
    setLocal(sound);
    playSound(sound.url);
  };

  const _upload = async (file: Blob, filename: string, name: string) => {
    setUploading(true);
    try {
      const me = window.store.getState().me;
      const formData = new FormData();
      formData.append("sound", file, filename);
      const resp = await fetch(`${API_ROOT}/upload-sound`, {
        method: "POST",
        headers: { Authorization: me && `Basic ${btoa(me.username + ":" + me.password)}` },
        body: formData,
      });
      const data = await resp.json();
      if (data.publicUrl) {
        _onSelect({ url: data.publicUrl, name });
      } else {
        alert("Failed to upload sound. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading sound:", error);
      alert("Error uploading sound. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const _onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await _upload(file, file.name, file.name.replace(/\.[^.]+$/, ""));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const _onToggleRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("Codako needs permission to use your microphone to record a sound.");
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      setRecording(false);
      const ext = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
      _upload(new Blob(chunks, { type: recorder.mimeType }), `recording.${ext}`, "Recording");
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_RECORDING_MS);
  };

  const visible = data
    ? [...data.sounds]
        .filter((s) => activeTag === ALL_TAG || s.tags.includes(activeTag))
        .sort((a, b) => Number(b.featured) - Number(a.featured))
    : [];

  return (
    <Modal isOpen={open} toggle={onCancel} size="lg">
      <ModalHeader>Choose a sound</ModalHeader>
      <ModalBody>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {[ALL_TAG, ...(data?.tags ?? [])].map((tag) => {
            const isActive = tag === activeTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: isActive ? "1px solid #7c3aed" : "1px solid #ddd",
                  background: isActive ? "#7c3aed" : "#fff",
                  color: isActive ? "#fff" : "#333",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tag === ALL_TAG ? "All" : tag}
              </button>
            );
          })}
        </div>

        {error ? (
          <div style={{ textAlign: "center", color: "#a00", padding: "32px 0" }}>
            Failed to load sounds.
          </div>
        ) : !data ? (
          <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading sounds...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            {visible.map((sound) => {
              const isSelected = local?.url === sound.url;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => _onSelect({ url: sound.url, name: sound.label })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: isSelected ? "2px solid #7c3aed" : "1px solid #ddd",
                    background: isSelected ? "#f3edff" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                >
                  <i className="fa fa-play" style={{ color: "#7c3aed" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sound.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {data?.attribution && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
            Sounds from{" "}
            <a href={data.attribution.url} target="_blank" rel="noreferrer">
              {data.attribution.label}
            </a>
            .
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={_onUpload}
          />
          <Button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
          >
            <i className={`fa ${isUploading ? "fa-spinner fa-spin" : "fa-upload"}`} />
            {isUploading ? "Uploading..." : "Upload an MP3"}
          </Button>
          {window.MediaRecorder && (
            <Button
              className="btn btn-outline-secondary btn-sm"
              onClick={_onToggleRecording}
              disabled={isUploading}
              title="Record up to 10 seconds from your microphone"
              style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
            >
              <i
                className={`fa ${isRecording ? "fa-stop" : "fa-microphone"}`}
                style={{ color: isRecording ? "#d00" : undefined }}
              />
              {isRecording ? "Stop recording" : "Record a sound"}
            </Button>
          )}
          {local && (
            <div style={{ fontSize: 12, color: "#888" }}>
              Selected: <strong>{local.name}</strong>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onCancel}>Cancel</Button>{" "}
        <Button color="primary" disabled={!local} onClick={() => local && onPick(local)}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};
