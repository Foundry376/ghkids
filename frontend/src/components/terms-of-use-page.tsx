import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";

const CONTACT_EMAIL = "ben@foundry376.com";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

/** DRAFT, pending legal review. */
const TermsOfUsePage: React.FC = () => {
  usePageTitle("Terms of Use");

  return (
    <Container className="parents-article legal">
      <Row>
        <Col md={12}>
          <h3>Terms of Use</h3>
          {/* TODO: set the effective date once legal has signed off. */}
          <p className="parents-article__credit">Last updated October 28, 2026</p>

          <p>
            Welcome to Codako, a free game construction set for kids made by Foundry376
            (&ldquo;we&rdquo;). By using Codako, you agree to these terms. If your child uses
            Codako, please read these terms with them. A parent or guardian is responsible for a
            child&rsquo;s use of Codako.
          </p>

          <h4>Who can use Codako</h4>
          <p>
            Anyone can make and play games on Codako without an account. Accounts for children must
            be created with a parent or guardian, who provides their own email address and agrees to
            these terms and our <Link to="/privacy-policy">Privacy Policy</Link> on the
            child&rsquo;s behalf.
          </p>

          <h4>Accounts</h4>
          <ul>
            <li>Choose a nickname that isn&rsquo;t your real name.</li>
            <li>Keep your password private, and don&rsquo;t use anyone else&rsquo;s account.</li>
            <li>
              A parent or guardian can ask us to delete an account at any time by emailing <Email />
              .
            </li>
          </ul>

          <h4>Your games</h4>
          <p>
            You own the games you make. Games you haven&rsquo;t published are private. When you
            publish a game, you give us permission to show it on Codako, and you let anyone play it
            and make their own copy (&ldquo;remix&rdquo;) to learn from and change. Remixes link
            back to the original game. You can unpublish a game at any time; copies others have
            already remixed may remain.
          </p>

          <h4>Being a good Codako citizen</h4>
          <p>When you make or publish games on Codako, please don&rsquo;t include:</p>
          <ul>
            <li>
              personal information about yourself or anyone else, like real names, addresses, phone
              numbers, schools, or photos of people;
            </li>
            <li>anything mean, scary, violent, or not right for kids;</li>
            <li>pictures or other work you don&rsquo;t have permission to use; or</li>
            <li>anything that tries to break, slow down, or misuse Codako.</li>
          </ul>
          <p>
            We may remove games, pictures, titles, or descriptions, or close accounts, that break
            these rules. If you see something that shouldn&rsquo;t be on Codako, please tell us at{" "}
            <Email />.
          </p>

          <h4>AI drawing and naming</h4>
          <p>
            Codako&rsquo;s AI tools can draw pictures and suggest names for kids to use in their
            games. AI can make mistakes. Pictures and names it makes are yours to use in Codako, and
            these rules apply to them just like anything else you make.
          </p>

          <h4>Codako is provided as-is</h4>
          <p>
            Codako is free, and we work hard to keep it running well, but we provide it &ldquo;as
            is,&rdquo; without warranties of any kind. We can&rsquo;t promise that Codako will
            always be available or free of errors, or that games will never be lost. To the extent
            the law allows, we aren&rsquo;t liable for any loss or damage that comes from using
            Codako.
          </p>
          {/* TODO (legal): warranty disclaimer, limitation of liability, and governing law. */}

          <h4>Changes</h4>
          <p>
            We may update Codako and these terms from time to time. If we make important changes to
            these terms, we&rsquo;ll update the date at the top of this page and, where appropriate,
            email parents. Continuing to use Codako means you accept the updated terms.
          </p>

          <h4>Contact us</h4>
          <p>
            Questions about these terms? Email us at <Email />.
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default TermsOfUsePage;
