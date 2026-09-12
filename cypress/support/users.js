// Test account credentials are never committed. Provide them through the environment:
//   CYPRESS_TEST_EMAIL=... CYPRESS_TEST_PASSWORD=... yarn cypress:run
// or in an untracked cypress.env.json: { "TEST_EMAIL": "...", "TEST_PASSWORD": "..." }
//
// Cypress 16 removed the synchronous Cypress.env(): secrets are read with the cy.env() command,
// inside a test, so they are never baked into the spec bundle. Both helpers therefore yield.
const KEYS = ['TEST_EMAIL', 'TEST_PASSWORD']

/** Yields the default persistent test user, or null when no account is configured. */
export const testUser = () => cy.env(KEYS, { log: false }).then(({ TEST_EMAIL, TEST_PASSWORD }) =>
	TEST_EMAIL && TEST_PASSWORD
		? { description: "default persistent test user", username: TEST_EMAIL, password: TEST_PASSWORD }
		: null
)

/** Yields the test user, failing the test when none is configured. */
export const requireTestUser = () => testUser().then((user) => {
	if (!user) {
		throw new Error(
			"Missing test credentials: set CYPRESS_TEST_EMAIL and CYPRESS_TEST_PASSWORD (or TEST_EMAIL/TEST_PASSWORD in cypress.env.json)."
		)
	}
	return user
})
