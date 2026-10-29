import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookCredit, Citation, Figure, InShort, ReferenceId, References } from "./parents-article";

const LIBRARY_IMG = new URL("../img/book/library.png", import.meta.url).href;

const REFS: ReferenceId[] = ["mcleod", "star", "cocoa", "kidsim"];

const Cite = ({ id }: { id: ReferenceId }) => <Citation refs={REFS} id={id} />;

/**
 * The longer story behind the overview's "Based on research" block: the
 * learning theory, what kids get out of it, and where Codako came from.
 */
const ResearchPage: React.FC = () => {
  usePageTitle("The Ideas Behind Codako");

  return (
    <Container className="parents-article">
      <Row>
        <Col md={12}>
          <h3>The Ideas Behind Codako</h3>
          <InShort>
            <li>Kids learn best by building things themselves, not by watching or reading.</li>
            <li>
              Making a game means planning steps, testing ideas, and fixing what doesn&rsquo;t work:
              the same skills behind science and programming.
            </li>
            <li>
              Codako is based on KidSim, which researchers at Apple tested with kids in real
              classrooms in the 1990s.
            </li>
          </InShort>
          <p>
            Codako is a program that lets children (&ldquo;of all ages&rdquo; as Alan Kay used to
            say) create visual simulations. The goal of Codako is to improve the thinking skills of
            children. Since all video games are simulations, we present it to kids as a video game
            construction set. Yet the real value to kids lies in the nature of simulations, both in
            the simulations that they create and in the process of creating them.
          </p>

          <h4>Learning by building</h4>
          <p>
            Educators call this idea constructivism: learners actively build knowledge on top of
            what they already know, rather than passively absorbing information from a lecture.
            <Cite id="mcleod" /> It works best when teachers provide kids with a solid foundation in
            a topic. But constructivism doesn&rsquo;t stop with the foundation; it begins there.
          </p>
          <p>
            Codako supports constructivism. It encourages kids to learn by building games. Kids
            don&rsquo;t just play games built by others; they design and build the games themselves.
            This is intrinsically motivating for kids. By its nature it is a creative, active
            process. Children can&rsquo;t be passive when they use Codako.
          </p>
          <p>
            Codako is optimized for building visual simulations. Unlike animations, simulations
            don&rsquo;t run the same way every time. They depend on inputs, usually provided by
            users. In a game context, the ability to make inputs is essential to playing the game.
            More broadly though, simulations let learners conduct &ldquo;what if?&rdquo;
            experiments, test ideas, hone critical thinking skills, and achieve a deeper
            understanding of complex topics. They provide a rich learning environment.
          </p>

          <h4>Thinking skills taught by Codako</h4>
          <h5>Visual thinking</h5>
          <p>
            Most schoolwork happens in words and symbols. Codako gives kids a new language in which
            to think, a visual one of before-after pictures. To make a rule, kids picture how part
            of their game should look before and after something happens.
          </p>
          <h5>Sequential thinking</h5>
          <p>
            Designing a game inherently involves planning sequences of steps for the players. In
            order to achieve W, they must first achieve X and Y and Z. This is especially true for a
            game that has multiple levels. Thinking sequentially is inherent in game design.
          </p>
          <h5>Critical thinking</h5>
          <p>
            You can&rsquo;t debug a game without thinking carefully and objectively about
            what&rsquo;s going on and why.
          </p>
          <h5>The scientific method</h5>
          <p>
            When scientists encounter something they don&rsquo;t understand, they form a hypothesis
            about what is happening, then design an experiment to test it. Either their hypothesis
            is confirmed, or it is refuted, and it&rsquo;s back to square one. Kids do the same
            thing every time a rule doesn&rsquo;t work the way they expected: guess why, change
            something, and play again to find out.
          </p>
          <h5>The act of creation</h5>
          <p>
            The activity of programming computers encompasses all of the above thinking skills, plus
            one additional one: the reward of seeing your ideas come to life. This is one of
            humanity&rsquo;s deepest desires and has motivated artists throughout history. It is the
            lure that has led many people—including the people who make Codako—to become
            programmers.
          </p>

          <h4>Bringing programming into the kids&rsquo; world</h4>
          <p>
            Codako&rsquo;s rules deal with objects and concepts that kids make: trains and track and
            intersections and crossing gates. Not machine concepts: bits and bytes and arrays and,
            most of all, syntax.
          </p>
          <Figure
            src={LIBRARY_IMG}
            alt="The Library from a train game: track, engine, tunnels, doors, a tree, a crossing gate, and a coach"
            caption="The characters in a train game"
          />
          <p>
            This idea has a history. When Xerox scientists including David Canfield Smith were
            designing the Xerox Star computer (the ancestor of the Macintosh) in the 1970s, their
            target users — &ldquo;knowledge workers&rdquo; in an office — didn&rsquo;t understand
            computers and were fearful of them. So instead of trying to take office workers into the
            computer&rsquo;s world, they brought the computer into the office world. Smith&rsquo;s
            invention of icons was the perfect vehicle for modeling objects and actions in the
            office, such as documents, folders, printers, wastebaskets. This came to be known as the
            &ldquo;desktop metaphor,&rdquo;
            <Cite id="star" /> and it is still how we use computers today.
          </p>
          <p>
            Codako adopted this approach for programming. Instead of trying to take kids into the
            computer&rsquo;s world, it brings programming into the kids&rsquo; world. To program in
            Codako, kids don&rsquo;t learn an alien language of computer terminology and concepts;
            they simply manipulate the objects they create.
          </p>

          <h4>The history of Codako</h4>
          <h5>Cocoa</h5>
          <p>
            Codako began as a research project in the Advanced Technology Group (ATG) at Apple
            Computer in the 1990s. At the time Apple was actively engaged in assisting education.
            David Canfield Smith, along with Allen Cypher and Alan Kay (a pioneer of personal
            computing), took on the challenge of enabling kids to program computers. The first
            prototype was called Cocoa. Here is{" "}
            <a href="https://www.youtube.com/watch?v=NtmGTrr3R-E" target="_blank" rel="noreferrer">
              11-year-old Gregory Miller demoing Cocoa
            </a>{" "}
            to the Apple community in 1996.
            <Cite id="cocoa" />
          </p>
          <h5>KidSim</h5>
          <p>
            Later the three of them, with help from ATG researchers, produced a more refined and
            capable version called KidSim (for Kids&rsquo; Simulations).
            <Cite id="kidsim" /> They did extensive testing of it with kids in schools, in
            collaboration with several progressive classroom teachers. Kids built many games in it.
            Even teachers built some simulations to illustrate lessons. KidSim worked for
            &ldquo;children of all ages.&rdquo;
          </p>
          <h5>Stagecast Creator</h5>
          <p>
            A group working on KidSim spun off from Apple in the late 90s and founded a startup
            called Stagecast Software, to turn KidSim into a product which could be used by anyone.
            But the market in educational software back then was difficult. There were no tablet
            computers or smartphones or even App Stores. It was a competition for shelf space in
            electronics stores, and Stagecast eventually had to close up shop.
          </p>
          <h5>Codako</h5>
          <p>
            While Stagecast Creator was still available, Ben Gotow used it as a child. He fell in
            love with it, which contributed to his desire to make programming his profession. He
            never forgot Creator, and a few years ago he decided to resurrect it, rebuilding the
            core of it from memory in his free time. That&rsquo;s when David Canfield Smith and
            Joyce Yuan discovered the project and asked to join it. Together they have not only
            reproduced everything that was important in Creator but drastically improved its user
            interface as well, and brought it to the web, where it&rsquo;s free for everyone.
          </p>
          <p>
            Wondering how this compares to having an AI make a game? Read{" "}
            <Link to="/parents/ai">Why Codako in the Age of AI?</Link>
          </p>

          <BookCredit />
          <References refs={REFS} />
        </Col>
      </Row>
    </Container>
  );
};

export default ResearchPage;
