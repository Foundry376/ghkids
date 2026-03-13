import React, { useEffect, useRef, useState } from "react";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalHeader from "reactstrap/lib/ModalHeader";

import { getDataURLFromImageData } from "./helpers";
import { PaintModel } from "./paint-model";
import { PixelImageData } from "./types";

type Step = "prompt" | "loading" | "result";

interface AIModalProps {
  model: PaintModel;
  isOpen: boolean;
  onClose: () => void;
}

const AIModal: React.FC<AIModalProps> = ({ model, isOpen, onClose }) => {
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

  const handleCreate = async () => {
    if (!description.trim()) return;
    setLoadingMessage("Creating your sprite...");
    setStep("loading");
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
  };

  const handleEdit = async () => {
    if (!description.trim()) return;
    setLoadingMessage("Editing your sprite...");
    setStep("loading");
    const result = await model.editSpritePreview(description);
    if (result) {
      setResultImageData(result);
      setResultImageURL(getDataURLFromImageData(result));
      setStep("result");
    } else {
      setStep("prompt");
      alert("Sorry, something went wrong editing your sprite. Please try again!");
    }
  };

  const handleUseIt = () => {
    if (resultImageData) {
      model.applyAIResult(resultImageData, resultName);
    }
    handleClose();
  };

  const handleTryAgain = () => {
    setResultImageData(null);
    setResultName(undefined);
    setResultImageURL(null);
    setStep("prompt");
  };

  const hasExistingImage = !!model.getState().imageData;

  return (
    <Modal isOpen={isOpen} toggle={handleClose} className="ai-sprite-modal" zIndex={1060}>
      <ModalHeader toggle={handleClose}>
        <i className="fa fa-magic" style={{ color: "#7b5ea7", marginRight: 7 }} />
        Draw with AI
      </ModalHeader>
      <ModalBody>
        {step === "prompt" && (
          <div className="ai-prompt-step">
            <p>What would you like to create or change?</p>
            <input
              ref={inputRef}
              type="text"
              className="form-control ai-description-input"
              placeholder='e.g. "a friendly blue robot", "add a hat", "make it glow"...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && description.trim()) {
                  handleCreate();
                }
              }}
            />
            <div className="ai-action-buttons">
              <Button
                className="ai-action-btn ai-action-btn--edit"
                onClick={handleEdit}
                disabled={!description.trim() || !hasExistingImage}
              >
                <i className="fa fa-pencil ai-action-btn__icon" />
                <span className="ai-action-btn__text">
                  <strong>Edit existing picture</strong>
                  <span>Modify the current sprite based on your description</span>
                </span>
              </Button>
              <Button
                className="ai-action-btn ai-action-btn--create"
                onClick={handleCreate}
                disabled={!description.trim()}
              >
                <i className="fa fa-paint-brush ai-action-btn__icon" />
                <span className="ai-action-btn__text">
                  <strong>Create new picture</strong>
                  <span>Generate a brand-new sprite from your description</span>
                </span>
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
