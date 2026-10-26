import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { lessons } from "../src/demos/indexing-primer/model";
import { transitionPlan } from "../src/demos/indexing-primer/transition";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    base: { type: "string", default: "https://wcygan.localhost" },
    output: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(
    "Usage: bun scripts/verify-indexing-primer.ts [--base URL] [--output DIR]\nChecks six lessons on desktop and three phone sizes; saves screenshots and report.json. Start just dev first.",
  );
  process.exit(0);
}
const output = values.output
  ? resolve(values.output)
  : await mkdtemp(join(tmpdir(), "indexing-primer-"));
await mkdir(output, { recursive: true });
const session = `indexing-check-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
const reports: Record<string, unknown>[] = [];
let context = "browser startup";
async function browser(...args: string[]): Promise<Record<string, unknown>> {
  const command = Bun.spawn(
    ["agent-browser", "--session", session, "--json", ...args],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ]);
  if (code !== 0) throw new Error(`${context}: ${stderr || stdout}`);
  const response = JSON.parse(stdout);
  if (!response.success) throw new Error(`${context}: ${response.error}`);
  return response.data;
}
async function evaluate<T>(expression: string): Promise<T> {
  return (
    await browser("eval", "-b", Buffer.from(expression).toString("base64"))
  ).result as T;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`${context}: ${message}`);
}
const selector = (id: string) => `[data-graphic-key="indexing-${id}"]`;
const button = (id: string, index: number) =>
  `${selector(id)} .ip-controls button:nth-child(${index})`;
async function setStep(id: string, target: number) {
  const count = lessons.find((lesson) => lesson.id === id)!.stepCount;
  await evaluate(
    `document.querySelector(${JSON.stringify(selector(id))}).scrollIntoView({block:'start', behavior:'instant'})`,
  );
  await evaluate(`(async () => {
    const figure = document.querySelector(${JSON.stringify(selector(id))});
    const controls = figure.querySelectorAll('.ip-controls button');
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    if (controls[0].textContent.trim() === 'Pause') controls[0].click();
    await frame();
    for (let clicks = 0; clicks <= ${count}; clicks++) {
      controls[1].click();
      await frame();
      if (Number(figure.dataset.step) === ${target}) return;
    }
    throw new Error('Next step did not reach the requested state');
  })()`);
}
async function inspect(id: string, state: string, viewport: string) {
  context = `${viewport} ${id} ${state}`;
  await evaluate(
    `document.querySelector(${JSON.stringify(selector(id))}).scrollIntoView({block:'start', behavior:'instant'})`,
  );
  const result = await evaluate<{
    failures: string[];
    metric: string;
  }>(`(() => {
    const figure = document.querySelector(${JSON.stringify(selector(id))});
    const failures = [];
    const check = (condition, message) => { if (!condition) failures.push(message); };
    const bounds = figure.getBoundingClientRect();
    const svgBounds = figure.querySelector('svg.ip-tree-svg').getBoundingClientRect();
    check(innerWidth >= 640 || bounds.height <= 768, 'Mobile figure exceeds 768px: ' + bounds.height);
    const stageStyle = getComputedStyle(figure.querySelector('.ip-stage'));
    check(getComputedStyle(figure).colorScheme === 'light', 'Expected an explicit light color scheme');
    check(stageStyle.backgroundColor === 'rgb(247, 246, 243)', 'Expected a light stage');
    check(stageStyle.color === 'rgb(33, 32, 28)', 'Expected dark ink on the light stage');
    for (const page of figure.querySelectorAll('.ip-page-outline')) {
      check(getComputedStyle(page).fill === 'rgb(253, 253, 252)', 'Expected light index pages');
    }
    const palette = [
      ['.ip-page-header', 'fill', 'rgb(229, 242, 252)'],
      ['.ip-svg-page-title', 'fill', 'rgb(7, 94, 152)'],
      ['.ip-tree-page[data-kind="branch"] .ip-svg-entry[data-state="active"] rect', 'fill', 'rgb(255, 241, 232)'],
      ['.ip-tree-page[data-kind="branch"] .ip-svg-entry[data-state="active"] rect', 'stroke', 'rgb(180, 61, 8)'],
      ['.ip-tree-page[data-kind="leaf"] .ip-svg-entry[data-state="active"] rect', 'fill', 'rgb(229, 242, 252)'],
      ['.ip-tree-page[data-kind="leaf"] .ip-svg-entry[data-state="active"] rect', 'stroke', 'rgb(7, 94, 152)'],
      ['.ip-svg-entry[data-state="checked"] rect, .ip-svg-entry[data-state="muted"] rect, .ip-tree-page[data-state="muted"] .ip-svg-entry:not([data-state]) rect', 'fill', 'rgb(222, 220, 213)'],
      ['.ip-svg-entry[data-state="checked"] text, .ip-svg-entry[data-state="muted"] text, .ip-tree-page[data-state="muted"] .ip-svg-entry:not([data-state]) text', 'fill', 'rgb(75, 75, 70)'],
      ['.ip-svg-entry[data-state="found"] rect', 'fill', 'rgb(229, 243, 233)'],
      ['.ip-svg-entry[data-state="new"] rect', 'fill', 'rgb(226, 243, 239)'],
      ['.ip-travel-packet', 'fill', 'rgb(0, 107, 99)'],
    ];
    for (const [selector, property, expected] of palette) {
      for (const element of figure.querySelectorAll(selector)) {
        check(getComputedStyle(element)[property] === expected, 'Unexpected palette: ' + selector);
      }
    }
    const branchInsets = [];
    for (const page of figure.querySelectorAll('.ip-tree-page[data-kind="branch"]')) {
      const outline = page.querySelector('.ip-page-outline');
      const header = page.querySelector('.ip-page-header');
      const entries = [...page.querySelectorAll('.ip-svg-entry')];
      const cellWidth = outline.width.baseVal.value / entries.length;
      const top = header.y.baseVal.value + header.height.baseVal.value;
      for (const [index, entry] of entries.entries()) {
        const rect = entry.querySelector('rect');
        const cellLeft = outline.x.baseVal.value + index * cellWidth;
        const insets = [rect.x.baseVal.value - cellLeft, cellLeft + cellWidth - rect.x.baseVal.value - rect.width.baseVal.value, rect.y.baseVal.value - top, outline.y.baseVal.value + outline.height.baseVal.value - rect.y.baseVal.value - rect.height.baseVal.value];
        branchInsets.push({ page: page.dataset.pageId, key: entry.textContent.trim(), insets });
        check(insets.every(value => Math.abs(value - 3) < 0.05), 'Unequal branch highlight insets: ' + entry.textContent.trim() + ' [' + insets.join(', ') + ']');
      }
    }
    check(document.documentElement.scrollWidth <= innerWidth + 1, 'Page has horizontal overflow');
    check(figure.querySelectorAll('[data-graphic-stage]').length === 1, 'Expected one stage');
    check(figure.querySelectorAll('svg.ip-tree-svg').length === 1, 'Expected one SVG');
    check(figure.querySelectorAll('.ip-controls button').length === 2, 'Expected Play/Pause and Next step only');
    for (const button of figure.querySelectorAll('button')) {
      const rect = button.getBoundingClientRect();
      check(rect.width >= 44 && rect.height >= 44, 'Small touch target: ' + button.textContent);
    }
    check(![...figure.querySelectorAll('button')].some(button => button.textContent.trim() === 'Replay'), 'Replay control should be removed');
    const timer = figure.querySelector('.ip-reset');
    const timerVisible = !!timer && timer.getBoundingClientRect().height > 0;
    const rawReset = figure.getAttribute('data-reset-progress');
    const resetProgress = rawReset === null || rawReset === '' ? null : Number(rawReset);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      check(!timerVisible, 'Reduced motion must hide the auto-reset indicator');
      check(resetProgress === null, 'Reduced motion must not expose reset progress');
    } else if (Number(figure.dataset.step) === ${lessons.find((lesson) => lesson.id === id)!.stepCount - 1}) {
      check(timerVisible && timer.getAttribute('role') === 'timer', 'Final state needs a visible countdown timer');
      check(resetProgress !== null && resetProgress >= 0 && resetProgress <= 1, 'Final countdown has invalid progress');
      if (timerVisible) {
        const rect = timer.getBoundingClientRect();
        check(rect.left >= bounds.left && rect.right <= bounds.right + 1, 'Countdown escapes figure');
        check(parseFloat(getComputedStyle(timer).fontSize) >= 12, 'Countdown text is too small');
        const arc = timer.querySelector('.ip-reset-arc');
        check(!!arc && arc.getAttribute('pathLength') === '1', 'Countdown ring is missing');
        check(!!arc && Math.abs(Number(arc.getAttribute('stroke-dashoffset')) - resetProgress) <= 0.001, 'Countdown arc differs from its clock');
        check(/Paused.*[0-4]s/.test(timer.textContent), 'Paused final state needs its remaining-time label');
      }
    } else {
      check(!timerVisible && resetProgress === null, 'Countdown leaked outside final hold');
    }
    check(figure.querySelector('.ip-controls').getBoundingClientRect().height <= 44.1, 'Countdown added a second control row');
    const texts = [...figure.querySelectorAll('svg.ip-tree-svg text')].map(element => ({ element, rect: element.getBoundingClientRect() }));
    for (const { element, rect } of texts) {
      check(parseFloat(getComputedStyle(element).fontSize) >= 12, 'Small SVG text: ' + element.textContent);
      check(rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1, 'Text escapes figure: ' + element.textContent);
      check(rect.top >= svgBounds.top - 1 && rect.bottom <= svgBounds.bottom + 1, 'Text escapes SVG vertically: ' + element.textContent);
      const page = element.closest('.ip-tree-page');
      const container = element.matches('.ip-svg-page-title')
        ? page?.querySelector('.ip-page-header')
        : element.closest('.ip-svg-entry')?.querySelector('rect');
      if (container) {
        const cell = container.getBoundingClientRect();
        check(rect.top >= cell.top - 1 && rect.bottom <= cell.bottom + 1, 'Text escapes its cell vertically: ' + element.textContent);
      }
    }
    for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
      const x = Math.min(texts[a].rect.right, texts[b].rect.right) - Math.max(texts[a].rect.left, texts[b].rect.left);
      const y = Math.min(texts[a].rect.bottom, texts[b].rect.bottom) - Math.max(texts[a].rect.top, texts[b].rect.top);
      check(x <= 1 || y <= 1, 'Overlapping text: ' + texts[a].element.textContent + ' / ' + texts[b].element.textContent);
    }
    const renderedGaps = [];
    for (const branch of figure.querySelectorAll('.ip-tree-page[data-kind="branch"]')) {
      const root = branch.querySelector('.ip-page-outline').getBoundingClientRect();
      const leaves = [...branch.parentElement.querySelectorAll('.ip-tree-page[data-kind="leaf"] .ip-page-outline')].map(element => element.getBoundingClientRect());
      check(leaves.length > 0, 'Router has no leaf pages');
      const gap = Math.min(...leaves.map(leaf => leaf.top)) - root.bottom;
      renderedGaps.push({ root: branch.dataset.pageId, gap });
      check(Math.abs(gap - 40) < 0.1, 'Expected 40px router-to-leaf gap: ' + branch.dataset.pageId + ' (' + gap + 'px)');
    }
    const pages = [...figure.querySelectorAll('.ip-tree-page')].map(element => ({ element, rect: element.querySelector('.ip-page-outline').getBoundingClientRect() }));
    const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    for (let a = 0; a < pages.length; a++) for (let b = a + 1; b < pages.length; b++) {
      check(!overlaps(pages[a].rect, pages[b].rect), 'Overlapping index pages');
    }
    for (const { element, rect } of texts) for (const page of pages) {
      if (!page.element.contains(element)) check(!overlaps(rect, page.rect), 'Text overlaps another page: ' + element.textContent);
    }
    return { failures, branchInsets, renderedGaps, figureHeight: bounds.height, svgHeight: svgBounds.height, metric: figure.querySelector('.ip-metric')?.textContent.trim() ?? '', width: bounds.width };
  })()`);
  const screenshot = `${viewport}-${id}-${state}.png`;
  await browser("screenshot", join(output, screenshot));
  reports.push({ context, screenshot, ...result });
  assert(result.failures.length === 0, result.failures.join("; "));
  return result;
}

try {
  await browser(
    "open",
    "--ignore-https-errors",
    new URL("/database-indexing", values.base).href,
  );
  await browser("set", "media", "dark", "reduced-motion");
  await browser(
    "wait",
    "--fn",
    "document.querySelectorAll('.ip-demo').length === 6",
  );
  await evaluate("document.fonts.ready");
  for (const [viewport, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
    ["mobile-narrow", 375, 812],
    ["mobile-wide", 639, 726],
  ] as const) {
    await browser("set", "viewport", String(width), String(height));
    for (const lesson of lessons) {
      await setStep(lesson.id, 0);
      await inspect(lesson.id, "first", viewport);
      for (let step = 1; step < lesson.stepCount; step++) {
        await browser("click", button(lesson.id, 2));
        if (step === 1 || step === lesson.stepCount - 1) {
          const state = step === lesson.stepCount - 1 ? "final" : "middle";
          const result = await inspect(lesson.id, state, viewport);
          if (state === "final")
            assert(result.metric.length > 0, "Missing final result");
        }
      }
      assert(
        await evaluate(
          `!document.querySelector(${JSON.stringify(button(lesson.id, 2))}).disabled`,
        ),
        "Next step must stay available at the final state",
      );
      assert(
        await evaluate(
          `document.querySelector(${JSON.stringify(button(lesson.id, 1))}).disabled`,
        ),
        "Reduced motion must keep autoplay disabled",
      );
      await browser("click", button(lesson.id, 2));
      assert(
        await evaluate(
          `document.querySelector(${JSON.stringify(selector(lesson.id))}).dataset.step === '0'`,
        ),
        "Next step did not wrap to the opening state",
      );
    }
  }
  await browser("set", "media", "dark");
  const routes = {
    scan: [1, "primary-leaf-1", "primary-leaf-2"],
    tree: [0, "primary-root", "primary-leaf-3"],
    secondary: [1, "secondary-leaf-3", "primary-root"],
    compound: [0, "compound-root", "compound-leaf-1"],
    cover: [1, "secondary-root", "secondary-leaf-3"],
    writes: [0, "write-primary-root", "write-primary-leaf"],
  } as const;
  for (const [viewport, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ] as const) {
    await browser("set", "viewport", String(width), String(height));
    for (const lesson of lessons) {
      context = `${viewport} ${lesson.id} in flight`;
      const [step, from, to] = routes[lesson.id];
      const figure = selector(lesson.id);
      await evaluate(
        `document.querySelector(${JSON.stringify(figure)}).scrollIntoView({block:'start', behavior:'instant'})`,
      );
      await setStep(lesson.id, step);
      const event = transitionPlan(lesson.id, step).events.find(
        (event) =>
          event.kind === "travel" &&
          event.route.from === from &&
          event.route.to === to,
      );
      assert(event, "Missing planned packet route");
      const timing = await evaluate<{
        firstProgressAfterMs: number;
        packetDurationMs: number;
      }>(`new Promise((resolve, reject) => {
        const figure = document.querySelector(${JSON.stringify(figure)});
        const controls = figure.querySelectorAll('.ip-controls button');
        let started = performance.now();
        let firstProgressAfterMs;
        let sample;
        const watch = now => {
          if (now - started > 6000) return reject(new Error('Expected packet never appeared'));
          if (firstProgressAfterMs === undefined && Number(figure.dataset.motionProgress) > 0) firstProgressAfterMs = now - started;
          const packet = figure.querySelector('.ip-travel-packet[data-route-from="${from}"][data-route-to="${to}"]');
          const progress = Number(packet?.dataset.routeProgress);
          if (packet && progress > 0.1 && progress < 0.8) {
            if (sample && progress > sample.progress) {
              const packetDurationMs = (now - sample.now) / (progress - sample.progress);
              controls[0].click();
              requestAnimationFrame(() => requestAnimationFrame(() => resolve({ firstProgressAfterMs, packetDurationMs })));
              return;
            }
            sample = { now, progress };
          }
          requestAnimationFrame(watch);
        };
        controls[0].click();
        requestAnimationFrame(watch);
      })`);
      reports.push({
        context,
        ...timing,
        expectedPacketDurationMs: event.duration,
      });
      assert(
        timing.firstProgressAfterMs <= 100,
        `Autoplay waited ${timing.firstProgressAfterMs.toFixed(1)}ms before moving`,
      );
      assert(
        event.duration >= 500 && event.duration <= 800,
        "Planned packet duration is outside 500–800ms",
      );
      assert(
        Math.abs(timing.packetDurationMs - event.duration) <= 45,
        `Packet traveled in ${timing.packetDurationMs.toFixed(1)}ms; expected ${event.duration.toFixed(1)}ms`,
      );
      const motion = await evaluate<{
        failures: string[];
        progress: string;
      }>(`new Promise(resolve => {
        const figure = document.querySelector(${JSON.stringify(figure)});
        const packet = figure.querySelector('.ip-travel-packet');
        const progress = figure.dataset.motionProgress;
        const failures = [];
        const check = (condition, message) => { if (!condition) failures.push(message); };
        check(!!packet && Number(packet.dataset.routeProgress) > 0 && Number(packet.dataset.routeProgress) < 1, 'Missing in-flight packet');
        const found = prefix => figure.querySelectorAll('[data-page-id^="' + prefix + '"] .ip-svg-entry[data-state="found"]').length;
        if (${JSON.stringify(lesson.id)} === 'secondary') {
          check(found('secondary') === 1, 'Name should be found before handoff');
          check(found('primary') === 0, 'Primary row changed before arrival');
        }
        if (${JSON.stringify(lesson.id)} === 'cover') {
          check(found('primary') === 0, 'Covering lookup fetched a primary row');
          check(!figure.querySelector('.ip-tree-link[data-traveling="true"]').hasAttribute('marker-end'), 'Covering return kept a forward arrow');
        }
        if (${JSON.stringify(lesson.id)} === 'writes') check(!figure.querySelector('.ip-svg-entry[data-state="new"]'), 'Index entry appeared before arrival');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          check(figure.dataset.motionProgress === progress, 'Paused animation kept advancing');
          resolve({ failures, progress });
        }));
      })`);
      reports.push({ context, ...motion });
      assert(motion.failures.length === 0, motion.failures.join("; "));
      await inspect(lesson.id, "in-flight", viewport);
      await browser("click", button(lesson.id, 2));
      assert(
        await evaluate(
          `!document.querySelector(${JSON.stringify(figure + " .ip-travel-packet")})`,
        ),
        "Next step left a traveling packet",
      );
      await setStep(lesson.id, lesson.stepCount - 1);
      await inspect(lesson.id, "countdown-paused", viewport);
      const looping = await evaluate<{
        finalHolds: number[];
        firstProgressAfterMs: number;
        countdowns: { minimum: number; maximum: number; labels: string[] }[];
      }>(`new Promise((resolve, reject) => {
        const figure = document.querySelector(${JSON.stringify(figure)});
        const control = figure.querySelector('.ip-controls button');
        const lastStep = ${lesson.stepCount - 1};
        const finalMetric = figure.querySelector('.ip-metric').textContent;
        const finalHolds = [];
        const countdowns = [];
        let countdown = { minimum: 1, maximum: 0, labels: [] };
        let previousReset = 0;
        const started = performance.now();
        let finalStarted = started;
        let previousStep = lastStep;
        let resetAt;
        control.click();
        const watch = now => {
          if (now - started > 25000) return reject(new Error('Automatic loop did not repeat'));
          const step = Number(figure.dataset.step);
          if (resetAt !== undefined && Number(figure.dataset.motionProgress) > 0) {
            control.click();
            return resolve({ finalHolds, countdowns, firstProgressAfterMs: now - resetAt });
          }
          const rawReset = figure.getAttribute('data-reset-progress');
          const resetProgress = rawReset === null || rawReset === '' ? null : Number(rawReset);
          const timer = figure.querySelector('.ip-reset');
          if (step === lastStep) {
            if (!timer || timer.getAttribute('role') !== 'timer' || timer.getBoundingClientRect().height === 0) return reject(new Error('Final countdown is not visible'));
            if (resetProgress === null || resetProgress < 0 || resetProgress > 1 || resetProgress + 0.002 < previousReset) return reject(new Error('Countdown progress is invalid or moved backwards'));
            const arc = timer.querySelector('.ip-reset-arc');
            if (!arc || Math.abs(Number(arc.getAttribute('stroke-dashoffset')) - resetProgress) > 0.001) return reject(new Error('Countdown ring does not match its clock'));
            const label = timer.textContent.trim();
            if (!/Reset in [0-4]s/.test(label)) return reject(new Error('Running countdown label is missing'));
            countdown.minimum = Math.min(countdown.minimum, resetProgress);
            countdown.maximum = Math.max(countdown.maximum, resetProgress);
            if (!countdown.labels.includes(label)) countdown.labels.push(label);
            previousReset = resetProgress;
          } else if (timer || resetProgress !== null) return reject(new Error('Countdown did not expire with the reset'));
          if (step === lastStep && figure.querySelector('.ip-metric').textContent !== finalMetric) return reject(new Error('Final result changed during the hold'));
          if (previousStep === lastStep && step === 0) {
            finalHolds.push(now - finalStarted);
            countdowns.push(countdown);
            if (countdown.minimum > 0.02 || countdown.maximum < 0.95) return reject(new Error('Countdown did not span its four-second hold'));
            countdown = { minimum: 1, maximum: 0, labels: [] };
            previousReset = 0;
            if (finalHolds.length === ${lesson.id === "scan" ? 2 : 1}) resetAt = now;
          } else if (step === lastStep && previousStep !== lastStep) finalStarted = now;
          previousStep = step;
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
      })`);
      reports.push({
        context: `${viewport} ${lesson.id} automatic loop`,
        ...looping,
      });
      for (const hold of looping.finalHolds)
        assert(
          hold >= 3950 && hold <= 4200,
          `Final result held for ${hold.toFixed(1)}ms instead of 4 seconds`,
        );
      assert(
        looping.firstProgressAfterMs <= 100,
        "Automatic restart waited before moving",
      );
    }
    context = `${viewport} scan active read`;
    await evaluate(
      `document.querySelector(${JSON.stringify(selector("scan"))}).scrollIntoView({block:'start', behavior:'instant'})`,
    );
    await setStep("scan", 0);
    const reading = await evaluate<{
      intervals: number[];
      capturedRead: boolean;
    }>(`new Promise((resolve, reject) => {
      const figure = document.querySelector(${JSON.stringify(selector("scan"))});
      const controls = figure.querySelectorAll('.ip-controls button');
      const started = performance.now();
      const times = [];
      controls[0].click();
      const watch = now => {
        if (now - started > 6000) return reject(new Error('Expected active scan rows never appeared'));
        const page = figure.querySelector('[data-page-id="primary-leaf-1"]');
        const entries = [...page.querySelectorAll('.ip-svg-entry')];
        const index = entries.findIndex(entry => entry.dataset.state === 'active');
        if (index >= 0 && times[index] === undefined) times[index] = now;
        if (index === 2 && page.querySelectorAll('.ip-svg-entry[data-state="checked"]').length >= 2) {
          controls[0].click();
          requestAnimationFrame(() => resolve({ intervals: [times[1] - times[0], times[2] - times[1]], capturedRead: true }));
        } else requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    })`);
    const plannedReads = transitionPlan("scan", 0)
      .events.filter((event) => event.kind === "read")
      .map((event) => event.duration);
    reports.push({ context, ...reading, expectedReadDurationMs: plannedReads });
    assert(reading.capturedRead, "Could not pause during the active leaf read");
    for (const [index, interval] of reading.intervals.entries()) {
      assert(
        Math.abs(plannedReads[index] - 350 / 1.5 / 0.75) < 0.5,
        "Row read plan must run at 75% speed",
      );
      assert(
        Math.abs(interval - plannedReads[index]) < 55,
        `Row read pace changed: ${interval.toFixed(1)}ms; expected ${plannedReads[index].toFixed(1)}ms`,
      );
    }
    await inspect("scan", "reading", viewport);
    for (const mode of ["pause", "offscreen"]) {
      context = `${viewport} final hold ${mode}`;
      await setStep("scan", 3);
      const frozen = await evaluate<{
        retained: boolean;
        resumedAfterMs: number;
        frozenProgress: number;
        resumedProgress: number;
      }>(`new Promise((resolve, reject) => {
        const figure = document.querySelector(${JSON.stringify(selector("scan"))});
        const control = figure.querySelector('.ip-controls button');
        const started = performance.now();
        let frozenAt;
        let frozenProgress;
        let resumedAt;
        let resumedProgress;
        control.click();
        const watch = now => {
          const step = Number(figure.dataset.step);
          if (now - started > 14000) return reject(new Error('Final hold freeze did not resume'));
          if (frozenAt === undefined && now - started >= 1000) {
            frozenAt = now;
            if (${JSON.stringify(mode)} === 'pause') control.click();
            else document.querySelector(${JSON.stringify(selector("writes"))}).scrollIntoView({block:'start', behavior:'instant'});
          }
          if (frozenAt !== undefined && resumedAt === undefined) {
            if (now - frozenAt > 50) {
              const progress = Number(figure.getAttribute('data-reset-progress'));
              if (frozenProgress === undefined) frozenProgress = progress;
              if (Math.abs(progress - frozenProgress) > 0.002) return reject(new Error('Frozen countdown kept advancing'));
              const timer = figure.querySelector('.ip-reset');
              const label = timer?.textContent ?? '';
              if (!/Paused.*[0-4]s/.test(label)) return reject(new Error('Frozen countdown label is missing'));
              const arc = timer?.querySelector('.ip-reset-arc');
              if (!arc || Math.abs(Number(arc.getAttribute('stroke-dashoffset')) - frozenProgress) > 0.001) return reject(new Error('Frozen countdown ring kept moving'));
            }
            if (step !== 3) return reject(new Error('Final hold reset while frozen'));
            if (now - frozenAt >= 4200) {
              resumedAt = now;
              if (${JSON.stringify(mode)} === 'pause') control.click();
              else figure.scrollIntoView({block:'start', behavior:'instant'});
            }
          }
          if (resumedAt !== undefined && step === 3 && now - resumedAt > 50 && resumedProgress === undefined) {
            resumedProgress = Number(figure.getAttribute('data-reset-progress'));
            if (resumedProgress < frozenProgress - 0.002) return reject(new Error('Countdown restarted instead of resuming'));
            if (!/Reset in [0-4]s/.test(figure.querySelector('.ip-reset')?.textContent ?? '')) return reject(new Error('Resumed countdown label is missing'));
          }
          if (resumedAt !== undefined && step === 0) {
            if (figure.querySelector('.ip-reset')) return reject(new Error('Countdown remained visible after reset'));
            control.click();
            return resolve({ retained: true, resumedAfterMs: now - resumedAt, frozenProgress, resumedProgress });
          }
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
      })`);
      reports.push({ context, ...frozen });
      assert(
        frozen.retained &&
          frozen.resumedAfterMs >= 2800 &&
          frozen.resumedAfterMs <= 3300,
        "Final hold did not preserve its remaining time",
      );
    }
  }
  console.log(
    `Verified ${lessons.length} lessons on desktop/mobile, reduced motion, causal playback, and four-second loops. Evidence: ${output}`,
  );
} finally {
  await writeFile(
    join(output, "report.json"),
    JSON.stringify({ reports }, null, 2),
  );
  await browser("close");
}
