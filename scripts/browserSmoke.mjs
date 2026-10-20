import assert from 'node:assert/strict';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findPdfBrowserExecutablePath } from '../src/export/browserDiscovery.ts';

// Start `npm run preview` separately. Uses an installed Chrome/Edge in a
// temporary headless profile; it never opens the user's browser profile.
const fixture = await Bun.file(path.resolve(import.meta.dir, '../examples/catalyst.intent.md')).text();
const edited = fixture.replace('status=done criteria=', 'status=open criteria=');
const browser = await puppeteer.launch({
  executablePath: await findPdfBrowserExecutablePath(),
  headless: true
});
try {
  const page = await browser.newPage();
  let stage = 'mount';
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  page.setDefaultTimeout(10000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewport({ width: 1400, height: 1000 });
  try {
    await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-directive="task"] select');
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);

    stage = 'title editing';
    await page.click('.atomic-ticket-title-row button');
    const titleInput = await page.$('input[aria-label="Intent title"]');
    await titleInput.click({ clickCount: 3 });
    await titleInput.type('Ticket title edited');
    await page.evaluate(() => [...document.querySelectorAll('.atomic-ticket-edit-form button')].find((button) => button.textContent === 'Save').click());
    const retitled = fixture.replace('title: Rename the desktop application to Catalyst', 'title: Ticket title edited');
    await page.waitForFunction((expected) => window.__atomicPreviewSource === expected, {}, retitled);
    await page.focus('.atomic-ticket-title-row button');
    await page.keyboard.down(modifier);
    await page.keyboard.press('z');
    await page.keyboard.up(modifier);
    await page.waitForFunction((expected) => window.__atomicPreviewSource === expected, {}, fixture);
    assert.equal(await page.$$eval('.atomic-ticket-card', (items) => items.length), 2);
    assert.equal(await page.$$eval('.atomic-ticket-file', (items) => items.length), 4);
    assert.equal(await page.$eval('.atomic-ticket', (ticket) => /:::|entry_type:|content_hash:/.test(ticket.innerText)), false);
    assert.equal(await page.$eval('.atomic-ticket-active > .cm-scroller', (scroller) => getComputedStyle(scroller).display), 'none');

    stage = 'status edit';
    await page.select('[data-directive="task"] select', 'open');
    await page.waitForFunction((expected) => window.__atomicPreviewSource === expected, {}, edited);
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), edited);

    stage = 'undo';
    await page.focus('.atomic-ticket-title-row button');
    await page.keyboard.down(modifier);
    await page.keyboard.press('z');
    await page.keyboard.up(modifier);
    await page.waitForFunction((expected) => window.__atomicPreviewSource === expected, {}, fixture);

    stage = 'source switch';
    await page.click('[data-mode="source"]');
    await page.waitForFunction(() => !document.querySelector('.atomic-ticket'));
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);
    stage = 'live switch';
    await page.click('[data-mode="live"]');
    await page.waitForSelector('[data-directive="task"] select');
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);

    stage = 'read-only';
    await page.evaluate(() => window.postMessage({ type: 'readOnlyChanged', enabled: true }, '*'));
    await page.waitForFunction(() => document.querySelector('[data-directive="task"] select')?.disabled);
    await page.evaluate(() => {
      const select = document.querySelector('[data-directive="task"] select');
      select.value = 'open';
      select.dispatchEvent(new Event('change'));
    });
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);
    await page.evaluate(() => window.postMessage({ type: 'readOnlyChanged', enabled: false }, '*'));
    await page.waitForFunction(() => document.querySelector('[data-directive="task"] select')?.disabled === false);

    stage = 'file reference';
    await page.evaluate(() => document.querySelector('[data-directive="file-ref"]').click());
    assert.ok(await page.evaluate(() => window.__atomicPreviewMessages.some((message) =>
      message.type === 'openLink' && message.href === 'atomic-file-ref:prepare_vscode.sh')));

    stage = 'criterion link highlight';
    await page.click('.atomic-ticket-link');
    await page.waitForSelector('.atomic-ticket-acceptance-criterion.atomic-ticket-card-highlighted');
    assert.equal(await page.$eval('.atomic-ticket-card-highlighted', (card) => document.activeElement === card), true);
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);

    stage = 'prose keyboard shortcuts';
    const openTaskEditor = async () => {
      await page.evaluate(() => [...document.querySelectorAll('[data-directive="task"] button')].find((button) => button.textContent === 'Edit').click());
      await page.waitForFunction(() => Boolean(document.activeElement?.closest('.atomic-ticket-prose-editor')));
    };
    const chord = async (key) => { await page.keyboard.down(modifier); await page.keyboard.press(key); await page.keyboard.up(modifier); };
    await openTaskEditor();
    await chord('Enter');
    await page.waitForFunction(() => !document.querySelector('.atomic-ticket-edit-form'));
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture, 'Mod+Enter on an unchanged body must close the editor without inserting a blank line');
    await openTaskEditor();
    await chord('End');
    await page.keyboard.type(' Saved by keyboard.');
    await chord('Enter');
    await page.waitForFunction(() => !document.querySelector('.atomic-ticket-edit-form'));
    assert.ok((await page.evaluate(() => window.__atomicPreviewSource)).includes(' Saved by keyboard.'));
    await page.focus('.atomic-ticket-title-row button');
    await chord('z');
    await page.waitForFunction((expected) => window.__atomicPreviewSource === expected, {}, fixture);
    await page.waitForFunction(() => !document.querySelector('.atomic-ticket-task')?.textContent.includes('Saved by keyboard.'));
    await openTaskEditor();
    await page.keyboard.type('discarded');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.atomic-ticket-edit-form'));
    assert.equal(await page.evaluate(() => window.__atomicPreviewSource), fixture);

    assert.deepEqual(pageErrors, []);
    if (process.env.SCREENSHOT_PATH) {
      await page.screenshot({ path: process.env.SCREENSHOT_PATH });
    }
    console.log('Browser smoke passed: Jira-style layout, hidden source syntax, exact LF fixture, targeted status/title edits, undo, ticket/source switching, read-only protection, file-reference request, criterion highlight/focus, no page errors.');
  } catch (error) {
    console.error(`Browser smoke failed during ${stage}`, await page.evaluate(() => ({
      mode: document.querySelector('#app')?.dataset.mode,
      taskStatus: document.querySelector('[data-directive="task"] select')?.value,
      messages: window.__atomicPreviewMessages?.slice(-5).map((message) => message.type)
    })));
    throw error;
  }
} finally {
  await browser.close();
}
