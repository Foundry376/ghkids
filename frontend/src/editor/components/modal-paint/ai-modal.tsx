import { Button, Modal, ModalBody, ModalHeader } from "reactstrap";
import React, { useEffect, useRef, useState } from "react";

import { getDataURLFromImageData } from "./helpers";
import { PaintModel } from "./paint-model";
import { PixelImageData } from "./types";

type Step = "prompt" | "loading" | "result";

export type AIMode = "draw" | "edit";

interface AIModalProps {
  model: PaintModel;
  isOpen: boolean;
  mode: AIMode;
  onClose: () => void;
}

const COPY = {
  draw: {
    title: "Draw with AI",
    icon: "fa-paint-brush",
    prompt: "What would you like to draw?",
    placeholder: 'e.g. "a friendly blue robot", "a spooky ghost", "a coin"...',
    action: "Draw",
    loading: "Creating your sprite...",
  },
  edit: {
    title: "Edit with AI",
    icon: "fa-pencil",
    prompt: "What would you like to change?",
    placeholder: 'e.g. "add a hat", "make it glow", "change color to blue"...',
    action: "Edit",
    loading: "Editing your sprite...",
  },
} as const;

const AIModal: React.FC<AIModalProps> = ({ model, isOpen, mode, onClose }) => {
  const copy = COPY[mode];
  const [step, setStep] = useState<Step>("prompt");
  const [description, setDescription] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [resultImageData, setResultImageData] = useState<PixelImageData | null>(null);
  const [resultName, setResultName] = useState<string | undefined>(undefined);
  const [resultImageURL, setResultImageURL] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep("prompt");
      setDescription("");
      setResultImageData(null);
      setResultName(undefined);
      setResultImageURL(null);
    }
  }, [isOpen]);

  // Focus input when on prompt step (delay matches Bootstrap modal fade duration)
  useEffect(() => {
    if (step === "prompt" && isOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(id);
    }
  }, [step, isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleRun = async () => {
    if (!description.trim()) return;
    setLoadingMessage(copy.loading);
    setStep("loading");
    if (mode === "draw") {
      const result = await model.generateSpritePreview(description);
      if (result) {
        setResultImageData(result.imageData);
        setResultName(result.name);
        setResultImageURL(getDataURLFromImageData(result.imageData));
        setStep("result");
      } else {
        setStep("prompt");
        alert("Sorry, something went wrong generating your sprite. Please try again!");
      }
    } else {
      const result = await model.editSpritePreview(description);
      if (result) {
        setResultImageData(result);
        setResultImageURL(getDataURLFromImageData(result));
        setStep("result");
      } else {
        setStep("prompt");
        alert("Sorry, something went wrong editing your sprite. Please try again!");
      }
    }
  };

  const handleUseIt = () => {
    if (resultImageData) {
      model.applyAIResult(resultImageData, resultName, description.trim());
    }
    handleClose();
  };

  const handleTryAgain = () => {
    setResultImageData(null);
    setResultName(undefined);
    setResultImageURL(null);
    setStep("prompt");
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} className="ai-sprite-modal" zIndex={1060}>
      <ModalHeader toggle={handleClose}>
        <i className="fa fa-magic" style={{ color: "#7b5ea7", marginRight: 7 }} />
        {copy.title}
      </ModalHeader>
      <ModalBody>
        {step === "prompt" && (
          <div className="ai-prompt-step">
            <p>{copy.prompt}</p>
            <input
              ref={inputRef}
              type="text"
              className="form-control ai-description-input"
              placeholder={copy.placeholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && description.trim()) {
                  handleRun();
                }
              }}
            />
            <div className="ai-action-buttons">
              <Button
                color="primary"
                size="lg"
                onClick={handleRun}
                disabled={!description.trim()}
              >
                <i className={`fa ${copy.icon}`} style={{ marginRight: 6 }} />
                {copy.action}
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="ai-loading-step">
            <div className="ai-sparkle-animation">
              <div className="sparkle-ring">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`sparkle sparkle-${i}`}>
                    <i className="fa fa-star" />
                  </div>
                ))}
              </div>
              <div className="sparkle-center">
                <i className="fa fa-magic" />
              </div>
            </div>
            <p className="ai-loading-message">{loadingMessage}</p>
            <p className="ai-loading-sub">This may take a moment...</p>
          </div>
        )}

        {step === "result" && resultImageURL && (
          <div className="ai-result-step">
            <p className="ai-result-label">Here&apos;s what I made!</p>
            <div className="ai-result-preview-wrap">
              <img
                src={resultImageURL}
                alt="AI generated sprite preview"
                className="ai-result-preview"
              />
            </div>
            <div className="ai-result-buttons">
              <Button color="success" size="lg" onClick={handleUseIt}>
                <i className="fa fa-check" /> Use it!
              </Button>
              <Button color="secondary" size="lg" onClick={handleTryAgain}>
                <i className="fa fa-refresh" /> Try again
              </Button>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default AIModal;
