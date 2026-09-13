import { defineConfig } from 'cypress'

// What cypress.json held through Cypress 8, in the config file Cypress 10+ reads. The base URL is
// the dev site by default and CYPRESS_BASE_URL overrides it (package.json's cypress:* scripts and
// the Checks workflow point it at a local build).
export default defineConfig({
    projectId: 'miag47',
    chromeWebSecurity: false,
    defaultCommandTimeout: 20000,
    viewportWidth: 1300,
    reporter: 'junit',
    reporterOptions: {
        mochaFile: 'cypress/results/cypress-report-[hash].xml'
    },
    e2e: {
        baseUrl: 'https://roundaround-dev.web.app/',
        specPattern: 'cypress/e2e/**/*.cy.js',
        supportFile: 'cypress/support/e2e.js',
        // the tests need no Node-side plugins
        setupNodeEvents() {}
    }
})
