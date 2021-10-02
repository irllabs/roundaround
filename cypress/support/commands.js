// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import { users } from "./users";

Cypress.Commands.add("logout", () => {
	cy.visit("/");
	cy.get("[data-test=button-sign-in-out]").then(($btn) => {
		if($btn.hasClass("signed-in")) {
			cy.get("[data-test=button-sign-in-out]").click();
			cy.get("[data-test=button-sign-out]").click();
			cy.visit("/");
		}
	});
});

Cypress.Commands.add("login", () => {
	cy.logout();

	cy.get("[data-test=button-sign-in-out]").click();
	cy.get("[data-test=button-email]").click();
	cy.get("[data-test=input-email]").type(users.EMAIL_USER.username);
	cy.get("[data-test=input-password]").type(users.EMAIL_USER.password);
	cy.get("[data-test=button-sign-in]").click();
	cy.wait(1000);
	cy.get("[data-test=button-get-started]").click();
});