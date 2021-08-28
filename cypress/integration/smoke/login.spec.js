describe("Login", () => {
	it("Login as user", () => {
		cy.visit("/");
		cy.get("[data-test=button-get-started]").click();

		cy.get("[data-test=app]").should("be.visible");
	});
});