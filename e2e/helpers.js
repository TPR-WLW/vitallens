/**
 * Dismiss the onboarding overlay if it appears.
 * Sets localStorage before navigation to skip it entirely.
 */
export async function skipOnboarding(page) {
  await page.addInitScript(() => {
    localStorage.setItem('mirucare_onboarding_complete', 'true');
  });
}
