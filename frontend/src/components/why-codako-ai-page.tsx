import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookCredit, InShort } from "./parents-article";

/**
 * Why learn to build games in Codako when an AI can write one for you?
 * Seeded from the "Codako versus AI" section of the book chapter; the team
 * means to grow it.
 */
const WhyCodakoAIPage: React.FC = () => {
  usePageTitle("Why Codako in the Age of AI");

  return (
    <Container className="parents-article">
      <Row>
        <Col md={12}>
          <h3>Why Codako in the Age of AI?</h3>
          <InShort>
            <li>An AI can make a game from one sentence, but the kid doesn&rsquo;t learn much.</li>
            <li>Writing code teaches a lot, but it&rsquo;s hard to start, especially at 6 or 8.</li>
            <li>
              Codako sits in between: kids show what should happen, and see how the computer
              understood it.
            </li>
          </InShort>

          <h4>Two ways to make a game</h4>
          <p>
            Traditionally, kids would write a game by learning a machine&rsquo;s language and
            writing it in that language (code). With the advent of AI, kids can now make games just
            by expressing what they want in plain English! So why do we even need Codako?
          </p>
          <p>
            Both of these extremes are poor learning environments. Learning to code has a high
            initial cost and a minimum age requirement. Using AI has nearly zero cost but completely
            bypasses the machine&rsquo;s concepts, removing opportunities to build a mental model of
            the system. Problem solving fundamentally requires two things: a goal and an
            understanding of the tools at your disposal.
          </p>

          <h4>The middle ground</h4>
          <p>
            Programming by demonstration, an idea researchers have been refining since the 1970s, is
            an ideal compromise between these two extremes. Kids demonstrate what to do in their
            language, and they see the machine&rsquo;s interpretation in its language: &ldquo;I
            moved this character to the right, and you recorded X=X+1&rdquo; (add 1 to its position
            across the stage). As kids interact with the simulation builder, they gain an
            understanding of the system, the various tools and objects at their disposal, and
            creativity takes hold!
          </p>
          <blockquote>
            &ldquo;Having a musical instrument that will play the notes for the player doesn&rsquo;t
            help the player get more musical. Having a bat that hits the ball automatically
            doesn&rsquo;t help a kid learn baseball.&rdquo;
            <footer>Alan Kay, computer scientist</footer>
          </blockquote>

          <h4>Understanding, not just a finished game</h4>
          <p>
            When kids build a simulation themselves, they learn what it means, not just how it
            behaves. After 11-year-old Gregory Miller&rsquo;s team built a game illustrating the
            life cycle of water in Cocoa, the first prototype of Codako&rsquo;s ancestor KidSim,
            they knew not only how the simulation worked but that they could modify it to introduce
            acid rain.
          </p>

          <h4>How Codako uses AI</h4>
          <p>
            Codako uses AI for two small jobs: helping kids draw, and suggesting names for what they
            make. Kids with an account can type a description like &ldquo;a purple dragon&rdquo; and
            get back a pixel-art character to use and edit, which helps kids who don&rsquo;t love
            drawing get to the fun part sooner. Nothing about your child or their account is ever
            sent to the AI.
          </p>
          <p>
            The rules, where the learning happens, are always theirs. AI never writes a
            child&rsquo;s game for them.
          </p>

          {/* TODO: the team's own thoughts. */}

          <h4>Learn more</h4>
          <p>
            Read about the thinking skills kids build with Codako in{" "}
            <Link to="/parents/research">The Ideas Behind Codako</Link>, and see how programming by
            demonstration works in <Link to="/parents/how-it-works">How Codako Works</Link>.
          </p>
          <BookCredit />
        </Col>
      </Row>
    </Container>
  );
};

export default WhyCodakoAIPage;
