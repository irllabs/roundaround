const crypto = require('crypto');

describe("Can see a round", () => {
	let hash;

	beforeEach(() => {
		hash = crypto.randomBytes(3).toString('hex');
		cy.clearLocalStorage();
		cy.clearCookies();
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

	it("As a registered user", () => {
		cy.login();

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