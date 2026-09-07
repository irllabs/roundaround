const crypto = require('crypto');

describe("Can see a round", () => {
	let hash;

	beforeEach(() => {
		hash = crypto.randomBytes(3).toString('hex');
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
		if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
			// No test account configured (see cypress/support/users.js); the guest test above still runs.
			this.skip();
		}
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