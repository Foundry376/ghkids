import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import React, { useEffect, useRef, useState } from "react";

interface NameModalProps {
  isOpen: boolean;
  proposedName: string;
  isGenerating: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

const NameModal: React.FC<NameModalProps> = ({
  isOpen,
  proposedName,
  isGenerating,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(proposedName), [proposedName]);

  // Select the proposed name once it arrives so it's easy to type over
  useEffect(() => {
    if (isOpen && !isGenerating) {
      const id = setTimeout(() => inputRef.current?.select(), 320);
      return () => clearTimeout(id);
    }
  }, [isOpen, isGenerating]);

  return (
    <Modal isOpen={isOpen} toggle={onCancel} zIndex={1060}>
      <ModalHeader toggle={onCancel}>Name your sprite</ModalHeader>
      <ModalBody>
        <p>What should we call this sprite?</p>
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={isGenerating ? "Thinking of a name..." : "Sprite name"}
          value={name}
          disabled={isGenerating}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSave(name.trim());
            }
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onCancel}>Back to Painting</Button>
        <Button
          color="primary"
          onClick={() => onSave(name.trim())}
          disabled={isGenerating || !name.trim()}
        >
          {isGenerating && <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />}
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NameModal;
