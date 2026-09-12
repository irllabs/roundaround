// Cypress 10+ bundles specs for the browser without Node's core modules, so the random suffix
// comes from the Web Crypto API instead of require('crypto').
import { testUser } from '../../support/users';

const randomHex = (bytes) => Array.from(window.crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');

describe("Can see a round", () => {
	let hash;

	beforeEach(() => {
		hash = randomHex(3);
		cy.clearLocalStorage();
		cy.clearCookies();
		cy.resetAuth();
	});

	it("As a guest", () => {
		cy.logout();

		cy.get("[data-test=button-get-started]").click();
		cy.get("[data-test=app]").should("be.visible");

		cy.get("[data-test=button-guest]").click();
		cy.get("[data-test=app]").should("be.visible");

		cy.get("[data-test=input-name]").type(`test-${hash}`);
		cy.get("[data-test=button-name]").click();

		cy.get("[data-test=app]").should("be.visible");
		cy.get(".round").should("be.visible");

		cy.logout();

		cy.get("[data-test=app]").should("be.visible");
	});

	it("As a registered user", function () {
		testUser().then(function (user) {
			if (!user) {
				// No test account configured (see cypress/support/users.js); the guest test above still runs.
				this.skip();
			}
		});
		cy.login();

		// Get started takes a signed-in user to their rounds list. Wait for that route and for
		// the list's own New round button, which is rendered whether or not the user has any
		// rounds, so the branch below is decided on a list that has rendered rather than on
		// whatever happened to be in the DOM the moment login() returned.
		cy.location("pathname", { timeout: 20000 }).should("include", "/rounds");
		cy.get("[data-test=button-new-round]", { timeout: 20000 }).should("be.visible");

		cy.get('html').then(($html) => {
			if ($html.find("[data-test=list-item-round]").length) {
				cy.get("[data-test=list-item-round]").first().click();
				cy.get("[data-test=app]").should("be.visible");
				cy.get(".round").should("be.visible");
				cy.logout();
				cy.get("[data-test=app]").should("be.visible");
			} else if ($html.find("[data-test=button-new-round]").length) {
				cy.get("[data-test=button-new-round]").click();
				cy.get("[data-test=app]").should("be.visible");
				cy.get(".round").should("be.visible");
				cy.logout();
				cy.get("[data-test=app]").should("be.visible");
			}
			else {
				cy.get("[data-test=button-back-to-rounds]").click();
				cy.get("[data-test=button-new-round]").should("be.visible");
				cy.get("[data-test=button-new-round]").click();
				cy.get("[data-test=app]").should("be.visible");
				cy.get(".round").should("be.visible");
				cy.logout();
				cy.get("[data-test=app]").should("be.visible");
			}
		})
	});
});