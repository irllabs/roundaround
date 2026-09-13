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

import { requireTestUser } from "./users";

// Firebase Auth persists sessions in IndexedDB, which clearLocalStorage/clearCookies never touch.
// Drop that database before the app boots so a previous test's session cannot be restored
// mid-test (the restore swaps the "Sign in" button for the avatar button under Cypress' feet).
Cypress.Commands.add("resetAuth", () => {
	cy.visit("/", {
		onBeforeLoad(win) {
			win.indexedDB.deleteDatabase("firebaseLocalStorageDb");
		}
	});
});

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

	requireTestUser().then((user) => {
		cy.get("[data-test=button-sign-in-out]").click();
		cy.get("[data-test=button-email]").click();
		cy.get("[data-test=input-email]").type(user.username);
		cy.get("[data-test=input-password]").type(user.password, { log: false });
		cy.get("[data-test=button-sign-in]").click();
	});
	// Signing in only starts the work: the header's auth listener then loads the profile, the
	// rounds list and the samples before it dispatches the user, which under React 18 and a real
	// network is regularly more than the second this used to wait. Get started reads that user,
	// and reads a null one as "not signed in", so an early click reopens the sign-in dialog on
	// top of the redirect the header is about to make and the test carries on from the wrong
	// screen. The avatar button carries `signed-in` only once the store has the user, so this
	// waits for exactly the state the click needs.
	cy.get("[data-test=button-sign-in-out].signed-in", { timeout: 20000 }).should("exist");
	cy.get("[data-test=button-get-started]").click();
});