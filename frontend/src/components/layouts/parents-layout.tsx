import { Link, NavLink, Outlet } from "react-router-dom";

import { KidButton } from "../kid";

import "./parents-layout.scss";

/**
 * The pages for grown-ups under /parents: what Codako is, the FAQ, the
 * changelog. They keep the plain Bootstrap look of a website, with one big
 * green way into the kid side. There's no sign-in here — kids sign in on the
 * kid side, so there's only ever one place to do it.
 */
const ParentsLayout = () => {
  return (
    <>
      <nav className="navbar navbar-expand parents-nav" aria-label="Pages for parents">
        <div className="container">
          <Link className="navbar-brand parents-nav__brand" to="/parents">
            Codako <span className="parents-nav__for">for parents</span>
          </Link>
          <ul className="nav parents-nav__links">
            <li className="nav-item">
              <NavLink className="nav-link" to="/parents" end>
                Overview
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/parents/faq">
                FAQ
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/parents/changelog">
                Changelog
              </NavLink>
            </li>
          </ul>
          <KidButton variant="primary" to="/" className="parents-nav__open">
            Open Codako <span aria-hidden="true">&rarr;</span>
          </KidButton>
        </div>
      </nav>
      <div className="page-content-flex">
        <Outlet />
      </div>
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              {"Open sourced with love by "}
              <a href="http://www.foundry376.com/">Foundry376.</a>{" "}
              <a href="/terms-of-use">Terms of Use</a> and{" "}
              <a href="/privacy-policy">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default ParentsLayout;
