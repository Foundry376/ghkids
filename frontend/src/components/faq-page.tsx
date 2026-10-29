import React from "react";
import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";

import { usePageTitle } from "../hooks/usePageTitle";

const CONTACT_EMAIL = "ben@foundry376.com";

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const FAQPage: React.FC = () => {
  usePageTitle("FAQ for Parents");

  return (
    <Container className="faq">
      <Row>
        <Col lg={9} xl={8} className="mx-auto">
          <h3>Questions from Parents</h3>
          <p>
            Codako is a video game construction set that teaches kids ages 6 and up the basics of
            programming. Here are the questions parents ask us most.
          </p>

          <h4>About Codako</h4>
          <h5>Is Codako free?</h5>
          <p>Yes! Codako is free to play and learn, it has no ads, and it will always be free.</p>

          <h5>How is Codako different from Scratch?</h5>
          <p>
            Scratch has kids snap together code blocks. Codako takes a different approach called
            programming by demonstration: kids show Codako what should happen by moving characters
            around, and Codako records it as a rule. A handful of simple pieces (characters,
            pictures, and rules) are used over and over and combine in lots of ways, so kids can
            build a broad range of games with a small toolkit. In a classroom, Codako can be a great
            complement to Scratch.
          </p>

          <h5>Where did the idea for Codako come from?</h5>
          <p>
            Codako is based on KidSim, a research project at Apple in the 1990s that let kids
            program by showing the computer what to do instead of writing code. Read more in{" "}
            <Link to="/parents/research">The Ideas Behind Codako</Link>.
          </p>

          <h4>Safety and privacy</h4>
          <h5>Can other people contact my child?</h5>
          <p>
            No. There&rsquo;s no chat, commenting, or messaging on Codako, so kids can&rsquo;t send
            each other messages. Other players only see the games your child chooses to publish: the
            game itself, its title and description, and your child&rsquo;s nickname.
          </p>

          <h5>What information do you collect?</h5>
          <p>
            Very little. Kids can play without an account, and we don&rsquo;t ask them for anything.
            A free account asks for a nickname, a password, and a grown-up&rsquo;s email address. We
            store the games your child makes, including any art they upload to use in a game. We ask
            kids not to use their real name as their nickname.
          </p>
          <p>
            We never sell this information, and we don&rsquo;t use ads, tracking pixels, or
            third-party analytics. A few service providers help us run the site, like the company
            that hosts our servers, and our <Link to="/privacy-policy">Privacy Policy</Link> lists
            each one and exactly what it receives.
          </p>

          <h5>Will you email me?</h5>
          <p>
            Occasionally. We email the grown-up on the account to reset a forgotten password, to
            share Codako news, and to tell you how your child&rsquo;s published games are being
            played and remixed. It&rsquo;s a nice way to see what they&rsquo;ve been making. To stop
            these emails, email us at <Email />.
          </p>
          {/* TODO: point to the unsubscribe link once emails have one. */}

          <h5>Does Codako use AI? Is it safe for kids?</h5>
          <p>
            Codako uses AI for two things only: helping kids draw characters and backgrounds, and
            suggesting names for the things they make. Kids with an account can type a description
            like &ldquo;a purple dragon&rdquo; and get back a pixel-art drawing to use and edit.
          </p>
          <p>
            Nothing about your child or their account is sent to the AI: no nickname, no email, and
            nothing that identifies them. The AI only sees the description they typed, the picture
            they&rsquo;re working on, or the names of the characters in a rule. Our AI provider,
            OpenAI, filters requests for inappropriate content, and we instruct it to return only
            pictures and names that are appropriate for kids. AI can still make mistakes; if you see
            something that isn&rsquo;t right, please tell us at <Email />.
          </p>

          <h5>Is Codako COPPA compliant?</h5>
          {/* Keep this in step with the Privacy Policy's "Children's privacy" section. */}
          <p>
            Yes. COPPA is the US law that protects the personal information of children under 13.
            Codako collects only what it needs to work:
          </p>
          <ul>
            <li>
              Signing up asks only for a nickname, which your child needs to take part, a password,
              and a grown-up&rsquo;s email address. We never ask for a child&rsquo;s real name,
              photo, school, or location.
            </li>
            <li>
              We store the games your child makes, and our servers keep short-lived technical logs,
              like most websites, to keep Codako running and secure.
            </li>
            <li>
              Kids can&rsquo;t comment on or message each other, so there&rsquo;s nowhere for them
              to share personal information with other players.
            </li>
            <li>
              Kids can play without an account at all, so the games they make stay on your computer.
            </li>
            <li>
              All information travels over a secure (HTTPS) connection, and we don&rsquo;t use any
              third-party tracking, like ad pixels.
            </li>
            <li>We&rsquo;ll delete your child&rsquo;s account and everything in it on request.</li>
          </ul>

          <h5>What if I see something inappropriate?</h5>
          {/* TODO: describe the in-app report button once it exists. */}
          <p>
            Published games can be reported if their content is inappropriate. Email us at <Email />{" "}
            with a link to the game, and we&rsquo;ll take it down. Everyone who uses Codako agrees
            to our <Link to="/terms-of-use">Terms of Use</Link>, which ask kids to keep games kind,
            kid-friendly, and free of personal information.
          </p>

          <h5>How do I unpublish a game or delete an account?</h5>
          <p>
            To take a game out of Published Games, open it in the editor and choose{" "}
            <em>Unpublish Game</em> from the menu. To delete a game, open My Games and choose{" "}
            <em>Delete</em> from the game&rsquo;s menu. To delete your child&rsquo;s account and
            everything in it, email us at <Email /> from the email address on the account.
          </p>

          <h4>Getting started</h4>
          <h5>Does my child need an account?</h5>
          <p>
            No. Kids can make, save, and play games without signing up. Games made without an
            account are saved in that web browser only, so anyone using the same computer can see
            them, and they&rsquo;re lost if the browser&rsquo;s data is cleared.
          </p>
          <p>
            A free account saves games online, so your child can open them from any computer, and
            lets them publish games for others to play. A grown-up should create the account with
            their own email address. Games made before signing up can be moved into the account from
            My Games.
          </p>

          <h5>Where should my child start?</h5>
          <p>
            With the <Link to="/learn">Learn Codako</Link> lessons. Each one takes about 10 minutes,
            teaches a new idea by building part of a game, and ends with something they can play.
            After that, they can make their own games from scratch, or remix games other kids have
            published.
          </p>

          <h5>Is Codako OK for younger kids?</h5>
          <p>
            Codako is designed for ages 6 and up. The lessons involve some reading, so younger kids
            and kids who are still learning to read do best with a grown-up next to them.
          </p>

          <h5>Do I need to help?</h5>
          <p>
            You don&rsquo;t need to know anything about programming. Sitting with your child for the
            first lesson or two helps, especially if they&rsquo;re still learning to read. After
            that, asking them to show you their game is a great way to see what they&rsquo;ve
            learned.
          </p>

          <h5>What devices does Codako work on?</h5>
          <p>
            Codako runs in any modern web browser on computers and iPads, with nothing to download
            or install. Making games is easiest with a mouse or trackpad and a keyboard. When a game
            is played on a touch screen, Codako shows on-screen buttons for the keys the game uses.
            Codako doesn&rsquo;t support phones.
          </p>

          <h5>I&rsquo;d like to use Codako in my school!</h5>
          <p>
            Great! We&rsquo;d love for you to use Codako. Reach out to us at <Email /> so we can
            help you get started!
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default FAQPage;
