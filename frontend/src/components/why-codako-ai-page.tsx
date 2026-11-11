import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookCredit } from "./parents-article";

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
          <p className="parents-article__intro">
            Kids used to make games by learning a computer&rsquo;s language and writing code in it.
            Now an AI can make a game from a sentence in plain English. So why learn to build games
            in Codako?
          </p>
          <p>
            Because both of those are poor ways to learn. Writing code teaches a lot, but it&rsquo;s
            hard to get started, especially at 6 or 8. Asking an AI costs almost nothing, but it
            skips the part where kids figure out how their game works. To solve problems, kids need
            both a goal and an understanding of the tools they have.
          </p>
          <p>
            Programming by demonstration, an idea researchers have been refining since the 1970s,
            sits in between. Kids show what should happen in their own language, and they see how
            the computer understood it in its language: &ldquo;I moved this character to the right,
            and you recorded X=X+1&rdquo; (add 1 to its position across the stage). As they go, they
            learn how the system works and what they can do with it, and that&rsquo;s when their
            creativity takes off.
          </p>
          <blockquote>
            &ldquo;Having a musical instrument that will play the notes for the player doesn&rsquo;t
            help the player get more musical. Having a bat that hits the ball automatically
            doesn&rsquo;t help a kid learn baseball.&rdquo;
            <footer>Alan Kay, computer scientist</footer>
          </blockquote>
          <p>
            When kids build a simulation themselves, they understand it, not just how it behaves.
            After 11-year-old Gregory Miller&rsquo;s team built a simulation of the water cycle in
            Cocoa, the first prototype of KidSim (the project Codako is based on), they knew not
            only how it worked but that they could change it to add acid rain.
          </p>

          <h4>How Codako uses AI</h4>
          <p>
            Codako uses AI for two small jobs: helping kids draw, and suggesting names for what they
            make. Kids with an account can type a description like &ldquo;a purple dragon&rdquo; and
            get back a pixel-art character to use and edit, which helps kids who don&rsquo;t love
            drawing get to the fun part sooner. Nothing about your child or their account is ever
            sent to the AI. The rules, where the learning happens, are always theirs.
          </p>

          {/* TODO: the team's own thoughts. */}

          <p>
            To learn more, read about the thinking skills kids build in{" "}
            <Link to="/parents/research">The Ideas Behind Codako</Link>, or see how programming by
            demonstration works in <Link to="/parents/how-it-works">How Codako Works</Link>.
          </p>
          <BookCredit />
        </Col>
      </Row>
    </Container>
  );
};

export default WhyCodakoAIPage;
