import React from 'react';
import Col from 'reactstrap/lib/Col';
import Row from 'reactstrap/lib/Row';
import Container from 'reactstrap/lib/Container';


export default class FAQPage extends React.Component {
  render() {
    return (
      <Container className="faq">
        <Row>
          <Col md={12}>
            <h3>For Parents</h3>
            <p>
              Codako is a programming environment that aims to teach children and
              young adults (ages 6-12) the basics of programming.
            </p>
            <h4>Frequently Asked Questions</h4>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <h5>Q: Is Codako free?</h5>
            <p>
              Yes! Codako is completely free to play and learn. 20 years ago, I learned to
              program using Apple's <a href="http://acypher.com/Publications/CHI95/KidSimCHI.html">KidSIM</a>, and Codako is my effort to bring back the platform
              that inspired me in my childhood.
            </p>

            <h5>Q: Where did the idea for Codako come from?</h5>
            <p>
              The core concepts behind Codako's "<a href="http://acypher.com/Publications/CHI95/KidSimCHI.html" target="_blank">programming by demonstration</a>"
              environment were developed and extensively tested by Apple's Advanced
              Research Group in the 1990's and published as
              &nbsp;<a href="http://acypher.com/Publications/CHI95/KidSimCHI.html" target="_blank">KidSIM</a>,
              &nbsp;<a href="https://www.macintoshrepository.org/5645-cocoa-dr3">Cocoa DR3</a>, and later
              &nbsp;<a href="https://en.wikipedia.org/wiki/Stagecast_Creator" target="_blank">Stagecast Creator.</a>
              &nbsp;Codako is a modern re-envisioning of KidSIM merged with the "share and remix" concept of Github "Gists".
            </p>
            <h5>Q: Why does my child need an account?</h5>
            <p>
              Creating a free account allows us to save your games and identify which
              features of Codako you've mastered.
            </p>
            <h5>Q: How do children interact on the site?</h5>
            <p>
              Codako allows young learners to publish the games they create, and others
              can ask questions about the games and see how they were created to sharpen
              their skills and build better games themselves. These features will be
              evolving significantly as the platform develops.
            </p>

          </Col>
          <Col md={6}>
            <h5>Q: How does the site work?</h5>
            <p>
              Codako runs in a web browser and all of your game information is stored in
              the cloud. There's nothing to download, and no plugins are required. From
              a technical perspective, Codako is written in ES2016 JavaScript (React, Redux)
              and HTML5. The Codako backend is a NodeJS application.
            </p>
            <h5>Q: Is Codako COPPA complaint?</h5>
            <p>
              COPPA is federal legislation that governs how data about children can be
              collected and stored. Codako does not require any information that might
              identify your child. Sign up requires an email address and nickname, but
              you do not need to reveal you child's identity in any way. Your child
              will never be asked for personally identifying information while they
              play with Codako.
            </p>
            <h5>Q: I'd like to use Codako in my school!</h5>
            <p>
              Great! I'd love for you to use Codako. Reach out to me at <a href="mailto: ben@foundry376.com">ben@foundry376.com</a> so
              we can help get you started!
            </p>
          </Col>
        </Row>
      </Container>
    );
  }
}