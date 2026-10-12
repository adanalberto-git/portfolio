import React from "react";
import "./Projects.css";
import { MdWeb } from "react-icons/md";
import Footer from "./Footer";

const Projects = () => {
	return (
		<>
			<div className="projects-container">
				<h2>
					<MdWeb /> Interactive Projects
				</h2>
				<div className="projects-container_content">
					<div className="projects_items">
						<h3>Network Studio</h3>
						<p>
							Design a neural network on a canvas, watch its Python code being written in real time, then edit and run that code in the browser.
						</p>
						<a className="project-btn" target="_blank" rel="noreferrer noopener" href="/network-studio/">
							Open Project
						</a>
					</div>
					<div className="projects_items">
						<h3>Semantic Network &amp; Prolog Studio</h3>
						<p>
							Interactive semantic network designer and Prolog environment: model knowledge graphs, generate logic rules visually, and query them directly in the browser.
						</p>
						<a className="project-btn" target="_blank" rel="noreferrer noopener" href="/semnet-studio/">
							Open Project
						</a>
					</div>
					<div className="projects_items">
						<h3>El espejo socrático</h3>
						<p>
							Augmented doctoral research: guides, model, and prompts to use agentic AI without yielding epistemic agency.
						</p>
						<a className="project-btn" target="_blank" rel="noreferrer noopener" href="/espejo-socratico/">
							Open Project
						</a>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
};

export default Projects;
