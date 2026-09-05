// Test account credentials are never committed. Provide them through the environment:
//   CYPRESS_TEST_EMAIL=... CYPRESS_TEST_PASSWORD=... yarn cypress:run
// or in an untracked cypress.env.json: { "TEST_EMAIL": "...", "TEST_PASSWORD": "..." }
export const users = {
	EMAIL_USER: {
		description: "default persistent test user",
		username: Cypress.env("TEST_EMAIL"),
		password: Cypress.env("TEST_PASSWORD")
	}
}

export const requireTestUser = () => {
	const user = users.EMAIL_USER
	if (!user.username || !user.password) {
		throw new Error(
			"Missing test credentials: set CYPRESS_TEST_EMAIL and CYPRESS_TEST_PASSWORD (or TEST_EMAIL/TEST_PASSWORD in cypress.env.json)."
		)
	}
	return user
}
