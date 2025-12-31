import { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { useEditorSelector } from "../../../hooks/redux";
import { updateWorldMetadata } from "../../actions/world-actions";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS, WORLDS } from "../../constants/constants";
import { EditorContext } from "../../../components/editor-context";

export const PublishContainer = () => {
  const dispatch = useDispatch();
  const { saveWorld } = useContext(EditorContext);

  const open = useEditorSelector((state) => state.ui.modal.openId === MODALS.PUBLISH);
  const metadata = useEditorSelector((state) => state.world.metadata);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle(metadata.name || "");
      setDescription(metadata.description || "");
    }
  }, [open, metadata.name, metadata.description]);

  const _onClose = () => {
    dispatch(dismissModal());
  };

  const _onPublish = () => {
    if (!title.trim()) {
      alert("Please enter a title for your game.");
      return;
    }

    // Update the metadata with the new title, description, and published=true
    dispatch(
      updateWorldMetadata(WORLDS.ROOT, {
        ...metadata,
        name: title.trim(),
        description: description.trim() || null,
        published: true,
      }),
    );

    // Trigger a save to persist the changes
    if (saveWorld) {
      saveWorld();
    }

    dispatch(dismissModal());
  };

  return (
    <Modal isOpen={open} backdrop="static" toggle={() => {}}>
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Publish Your Game</h4>
      </div>
      <ModalBody>
        <p style={{ marginBottom: 16, color: "#666" }}>
          Published games appear on the Explore page for everyone to play and remix!
        </p>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="publish-title"
            style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
          >
            Title <span style={{ color: "#c00" }}>*</span>
          </label>
          <input
            id="publish-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your game"
            maxLength={100}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="publish-description"
            style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
          >
            Description <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="publish-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your game..."
            maxLength={300}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
          <div style={{ fontSize: 12, color: "#999", textAlign: "right" }}>
            {description.length}/300
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={_onClose}>
          Cancel
        </Button>
        <Button color="primary" onClick={_onPublish}>
          Publish
        </Button>
      </ModalFooter>
    </Modal>
  );
};
