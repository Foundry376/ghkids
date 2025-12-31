import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import { undo, redo } from "../utils/undo-redo";
import { useEditorSelector } from "../../hooks/redux";

const UndoRedoControls = () => {
  const dispatch = useDispatch();
  const undoDepth = useEditorSelector((state) => state.undoStack.length);
  const redoDepth = useEditorSelector((state) => state.redoStack.length);

  const dispatchAction = useCallback(
    (action: ReturnType<typeof undo> | ReturnType<typeof redo>) => {
      dispatch(action);
    },
    [dispatch],
  );

  useEffect(() => {
    const onGlobalKeydown = (event: KeyboardEvent) => {
      if ((event.target as Element)?.closest(".modal")) {
        return;
      }

      if (event.which === 89 && (event.ctrlKey || event.metaKey)) {
        dispatchAction(undo());
        event.preventDefault();
        event.stopPropagation();
      } else if (event.which === 90 && (event.ctrlKey || event.metaKey)) {
        dispatchAction(event.shiftKey ? redo() : undo());
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.body.addEventListener("keydown", onGlobalKeydown);
    return () => {
      document.body.removeEventListener("keydown", onGlobalKeydown);
    };
  }, [dispatchAction]);

  return (
    <div className={`button-group`}>
      <Button
        className="icon"
        data-tutorial-id="undo-button"
        onClick={() => dispatchAction(undo())}
        disabled={undoDepth === 0}
      >
        <img src={new URL("../img/icon_undo.png", import.meta.url).href} />
      </Button>
      <Button className="icon" onClick={() => dispatchAction(redo())} disabled={redoDepth === 0}>
        <img src={new URL("../img/icon_redo.png", import.meta.url).href} />
      </Button>
    </div>
  );
};

export default UndoRedoControls;
