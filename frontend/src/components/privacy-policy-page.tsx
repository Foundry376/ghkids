import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";

const CONTACT_EMAIL = "ben@foundry376.com";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

/**
 * DRAFT, pending legal review. Every claim here should match what the code
 * does: if you change what Codako collects or which services it uses, update
 * this page too.
 */
const PrivacyPolicyPage: React.FC = () => {
  usePageTitle("Privacy Policy");

  return (
    <Container className="parents-article legal">
      <Row>
        <Col md={12}>
          <h3>Privacy Policy</h3>
          {/* TODO: set the effective date once legal has signed off. */}
          <p className="parents-article__credit">Last updated October 28, 2026</p>

          <p>
            Codako is a free game construction set for kids, made by Foundry376 (&ldquo;we&rdquo;).
            We built Codako for children, so we collect as little information as we can, we never
            sell it, and we don&rsquo;t share it with anyone except the few service providers that
            help us run the site. This policy explains what we collect, why, and the choices you
            have.
          </p>

          <h4>The short version</h4>
          <ul>
            <li>Kids can use Codako without an account. We don&rsquo;t ask them for anything.</li>
            <li>
              An account needs only a nickname, a password, and a parent or guardian&rsquo;s email
              address. We never ask for a child&rsquo;s real name, age, address, phone number,
              school, or photo.
            </li>
            <li>There are no ads, ad pixels, or third-party analytics or tracking on Codako.</li>
            <li>Kids can&rsquo;t chat with, comment on, or message each other.</li>
            <li>
              AI drawing and naming tools never receive anything about your child or their account.
            </li>
            <li>We&rsquo;ll delete your child&rsquo;s account and everything in it on request.</li>
          </ul>

          <h4>Information we collect</h4>
          <h5>Without an account</h5>
          <p>
            Kids can make and play games without signing up. Those games are saved only in the web
            browser on your device, using the browser&rsquo;s local storage, and are never sent to
            our servers unless your child later moves them into an account. When anyone plays a
            published game, we add one to that game&rsquo;s play count; we don&rsquo;t record who
            played it.
          </p>

          <h5>With an account</h5>
          <p>When a free account is created, we collect:</p>
          <ul>
            <li>
              <strong>A nickname</strong>, which is shown on games your child publishes. We ask kids
              not to use their real name.
            </li>
            <li>
              <strong>A password</strong>, which we store only in a scrambled (hashed) form that
              can&rsquo;t be read back.
            </li>
            <li>
              <strong>A parent or guardian&rsquo;s email address</strong>, used to reset a forgotten
              password and to send the emails described below. It is never shown to other players.
            </li>
          </ul>
          <p>
            We also store the games your child makes: their characters, drawings, rules, titles, and
            descriptions, any art they upload to use in a game, whether each game is published, and
            how many times published games have been played.
          </p>

          <h5>Technical information</h5>
          <p>
            Like most websites, our servers keep short-lived technical logs, such as IP addresses
            and the pages requested, to keep Codako running and secure. When something on the site
            breaks, an error report is sent to our error-tracking service so we can fix it; these
            reports are set up not to include IP addresses or cookies. We don&rsquo;t use cookies
            for advertising or tracking.
          </p>
          {/* TODO: state how long server logs and error reports are kept. */}

          <h4>How we use information</h4>
          <p>We use the information above only to:</p>
          <ul>
            <li>save your child&rsquo;s games and let them sign in from any device,</li>
            <li>show published games, with their nickname, to other players,</li>
            <li>reset forgotten passwords,</li>
            <li>
              email the parent or guardian about the account, such as occasional Codako news and
              summaries of how your child&rsquo;s published games are being played and remixed, and
            </li>
            <li>keep Codako working, secure, and free of abuse.</li>
          </ul>
          <p>
            To stop receiving these emails, email us at <Email />. We never use information to show
            ads, and we never sell or rent it.
          </p>
          {/* TODO: add an unsubscribe link to emails (the per-user notificationSettings already
              exist in the database) and update this sentence. */}

          <h4>What other players can see</h4>
          <p>
            Games your child hasn&rsquo;t published are private. When your child publishes a game,
            anyone can play it and see its title, description, and your child&rsquo;s nickname, and
            can make their own copy (&ldquo;remix&rdquo;) to see how it was made. Your child&rsquo;s
            profile page lists their published games. Email addresses are never shown. There is no
            chat, commenting, or messaging between players.
          </p>

          <h4>AI drawing and naming</h4>
          <p>
            Kids with an account can ask Codako&rsquo;s AI tools to draw a character or background,
            or to suggest a name for something they made. To do this, we send only the description
            your child typed (for example, &ldquo;a purple dragon&rdquo;), the picture they&rsquo;re
            working on, or the names of the characters and actions in a rule to our AI provider,
            OpenAI. We never send your child&rsquo;s nickname, email address, or anything else about
            their account. OpenAI filters these requests for inappropriate content, and our
            instructions ask it to return only pictures and names that are appropriate for children.
          </p>
          {/* TODO (legal): confirm OpenAI's API data retention and no-training terms and
              describe them here. */}

          <h4>Service providers</h4>
          <p>
            We never sell personal information or share it with anyone else. We use a small number
            of service providers that work only on our behalf, to run Codako. Here&rsquo;s each one,
            what it receives, and whether that includes anything that identifies your child or you:
          </p>
          <div className="table-responsive">
            <table className="table table-sm parents-article__table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>What it does</th>
                  <th>What it receives</th>
                  <th>Identifying information?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Web hosting and database</td>
                  <td>Runs the site and stores accounts and games</td>
                  <td>Everything described above, stored on our behalf</td>
                  <td>Yes: the nickname and the grown-up&rsquo;s email address</td>
                </tr>
                <tr>
                  <td>Amazon Web Services (SES)</td>
                  <td>Sends email to the grown-up on the account</td>
                  <td>
                    The grown-up&rsquo;s email address and the email itself, which can mention your
                    child&rsquo;s nickname and game titles
                  </td>
                  <td>Yes: the grown-up&rsquo;s email address and the nickname</td>
                </tr>
                <tr>
                  <td>Supabase</td>
                  <td>Stores art used in games</td>
                  <td>The art file itself</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>OpenAI</td>
                  <td>Powers the AI drawing and naming tools</td>
                  <td>
                    The description your child typed, the picture they&rsquo;re working on, or the
                    names in a rule
                  </td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>Sentry</td>
                  <td>Tells us when something on the site breaks</td>
                  <td>Technical details about the error, like the page and browser</td>
                  <td>No: no account information, IP addresses, or cookies</td>
                </tr>
                <tr>
                  <td>Google reCAPTCHA</td>
                  <td>Blocks automated sign-ups, on the sign-up page only</td>
                  <td>
                    Information about the browser and device, which Google collects directly under
                    its own privacy policy
                  </td>
                  <td>No account information from us</td>
                </tr>
                <tr>
                  <td>Unsplash</td>
                  <td>Lets kids search for a photo to use as a game background</td>
                  <td>
                    The search words; photos then load from Unsplash, so it sees the device&rsquo;s
                    internet address
                  </td>
                  <td>No account information</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* TODO: name the hosting and database providers. */}
          <p>
            We may also disclose information if the law requires it, or to protect the safety of our
            users.
          </p>

          <h4>Children&rsquo;s privacy (COPPA)</h4>
          <p>
            Codako is designed for children, including children under 13, and follows the
            Children&rsquo;s Online Privacy Protection Act (COPPA). We collect only what Codako
            needs to work. The only information an account needs from a child is a nickname, which
            they need to take part in Codako, and we ask them not to use their real name; the email
            address on the account belongs to a parent or guardian. We never ask a child for their
            real name, photo, school, or location. Kids can&rsquo;t chat with, comment on, or
            message each other, and our <Link to="/terms-of-use">Terms of Use</Link> ask them to
            keep personal information out of the games they publish. Kids can also use Codako
            without an account at all, which keeps the information we hold to a minimum.
          </p>

          <h4>Your choices and rights</h4>
          <p>As a parent or guardian, you can at any time:</p>
          <ul>
            <li>see your child&rsquo;s games by signing in to their account,</li>
            <li>unpublish or delete any of their games,</li>
            <li>ask us to stop sending emails, and</li>
            <li>
              ask us to show you the information we hold about your child, or to delete their
              account and everything in it, by emailing us at <Email /> from the email address on
              the account.
            </li>
          </ul>
          <p>When an account is deleted, we remove its information and games from our servers.</p>
          {/* TODO: confirm how long deletion takes, including backups. */}

          <h4>Security</h4>
          <p>
            All information sent between your device and Codako travels over an encrypted (HTTPS)
            connection, and passwords are stored only in hashed form. No system is perfectly secure,
            but we work to protect the information we hold, and we keep as little of it as we can.
          </p>

          <h4>Changes to this policy</h4>
          <p>
            If we make important changes to this policy, we&rsquo;ll update the date at the top of
            this page and, where appropriate, email parents before the changes take effect.
          </p>

          <h4>Contact us</h4>
          <p>
            Questions about this policy or your child&rsquo;s information? Email us at <Email />.
            See also our <Link to="/terms-of-use">Terms of Use</Link>.
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default PrivacyPolicyPage;
