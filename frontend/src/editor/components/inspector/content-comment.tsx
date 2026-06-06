import { useContext } from "react";

import { RuleTreeComment } from "../../../types";
import { CommentTextEditor } from "./comment-editor";
import { RuleActionsContext } from "./container-pane-rules";

/** A free-standing comment that lives as its own element in the rule list. */
export const ContentComment = ({ comment }: { comment: RuleTreeComment }) => {
  const { onRuleChanged, onCommentRemoved } = useContext(RuleActionsContext);

  return (
    <div className="comment-body">
      <i className="fa fa-comment-o comment-icon" aria-hidden="true" />
      <CommentTextEditor
        value={comment.text}
        onCommit={(text) => onRuleChanged(comment.id, { text })}
        onRemove={() => onCommentRemoved(comment.id)}
      />
    </div>
  );
};

/** A comment annotation that rides along on a rule/container. */
export const RuleCommentAnnotation = ({ ruleId, text }: { ruleId: string; text: string }) => {
  const { onRuleChanged } = useContext(RuleActionsContext);

  return (
    <div className="rule-comment-annotation">
      <i className="fa fa-comment-o comment-icon" aria-hidden="true" />
      <CommentTextEditor
        value={text}
        onCommit={(t) => onRuleChanged(ruleId, { comment: t })}
        onRemove={() => onRuleChanged(ruleId, { comment: undefined })}
      />
    </div>
  );
};
