import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

const CHANGELOG_URL =
  "https://raw.githubusercontent.com/Foundry376/ghkids/refs/heads/master/CHANGELOG.md";

const ChangelogPage: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(CHANGELOG_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch changelog: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <Container className="changelog">
      <Row>
        <Col md={12}>
          <h3>Changelog</h3>
          <p>
            See what's new in Codako! This changelog is fetched directly from our{" "}
            <a
              href="https://github.com/Foundry376/ghkids/blob/master/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
            .
          </p>
          <hr />
          {loading && <p>Loading changelog...</p>}
          {error && (
            <div className="alert alert-warning">
              <strong>Could not load changelog:</strong> {error}
              <br />
              <a
                href="https://github.com/Foundry376/ghkids/blob/master/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub instead
              </a>
            </div>
          )}
          {content && (
            <div className="changelog-content">
              <ReactMarkdown>{content.slice(content.indexOf(" -->") + 4)}</ReactMarkdown>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ChangelogPage;
