# Prompt playbook: customer call to GitHub-ready feature

Reusable prompts for the six steps. Replace the `[PLACEHOLDERS]`, run the steps in order, and keep each output in the repo folder shown. Paste earlier outputs into later prompts, or attach the files.

**Placeholders used throughout**
- `[FEATURE]`: e.g. "plane seat selection"
- `[CUSTOMER]`: the company you are building for
- `[WEBSITE]`: the company website URL
- `[ROLE]`: your role, e.g. "Product Manager"

**Folder map**
```
docs/inputs/    step 1 outputs
docs/BRD.md     step 2
prototype/      step 3
src/, tests/    step 4
README, LICENSE, .gitignore, PROMPT_LOG.md   step 5
docs/REVIEW.md  step 6
```

---

## Step 1: Customer call

### 1a. Prepare for the call
```
I am a [ROLE] preparing a discovery call with [CUSTOMER] about a new
feature: [FEATURE].

Create a call guide with:
1. 5 opening questions on business context and pain points.
2. 10 questions on users, current process, volumes and metrics.
3. 8 questions on constraints, dependencies and integrations.
4. 5 questions to separate must-haves from nice-to-haves.
5. 5 questions on success measures and launch timing.
6. A list of things I must NOT promise on the call.

Keep questions open-ended and in the order I should ask them.
Add a one-line reason after each question.
```

### 1b. Turn my call notes into structured inputs
```
Here are my raw notes from the call with [CUSTOMER] about [FEATURE]:
[PASTE NOTES]

Produce one markdown file with:
- Call metadata (date, attendees, goal)
- Numbered raw notes, unedited, in conversation order
- A table of customer needs (ID, need, source note, priority unknown)
- Constraints and dependencies mentioned
- Baseline figures and targets mentioned
- Open questions the customer did not answer
- Agreed actions with owners and dates

Do not invent facts. If something is unclear, list it as an open question.
```

### 1c. Practice version (fake inputs)
```
Create fictional customer-call inputs for [FEATURE] at an invented company.
Mark everything as fictitious. Include noise, one out-of-scope request,
one conflicting statement, and 5 open questions I must resolve.
Use the same structure as step 1b.
```

---

## Step 2: Business requirements document

```
Act as a senior [ROLE]. Using ONLY the call inputs below, write a business
requirements document in markdown.

Inputs:
[PASTE OR ATTACH docs/inputs file]

Required sections:
1. Business context: problem, goals and KPIs with baseline and target,
   personas.
2. In scope: numbered list of capabilities.
3. Out of scope: items excluded, each with a reason or "phase 2".
4. Business rules: a table with IDs (BR-01, BR-02...), one testable rule per row.
5. Dependencies: systems, teams, approvals, dates.

Also add: acceptance criteria in Given/When/Then, non-functional
requirements, risks and assumptions, open questions, and a traceability
table mapping each customer need to a rule or scope item.

Rules:
- Every statement must trace to an input, or be marked "Assumption".
- Customer requests that are not covered must appear as open questions.
- Keep each business rule short and testable.
Save as docs/BRD.md.
```

---

## Step 3: Low-fidelity clickable HTML prototype

```
Using the BRD below, build a low-fidelity clickable prototype as ONE
self-contained HTML file (no external libraries).

BRD:
[PASTE OR ATTACH docs/BRD.md]

Requirements:
- Grey, dashed-border wireframe style; no brand assets, use a text
  placeholder for the logo.
- Cover every in-scope item, and show each business rule (BR-xx) working,
  including the error messages for rule violations.
- 3 or more screens with navigation between them, and a live summary that
  updates on every action.
- Keyboard accessible, visible focus, non-colour state cues, light and dark
  mode, usable on a mobile width.
- Add a code comment next to the logic for each rule, naming its BR ID.
- Use realistic sample data from the call inputs.

Save as prototype/index.html. Afterwards list which BR IDs are demonstrated
and which are not.
```

*Optional variant: add "Base the layout and wording on [WEBSITE]'s booking flow, but do not copy logos, images or styling."*

---

## Step 4: Code for the feature

```
Read [WEBSITE] and extract what is publicly visible about [FEATURE]:
product wording, user journeys, terminology, constraints, prices or rules.
List what you found, with the page it came from, before writing any code.
Mark everything you could not verify as "Assumption".

Then implement the feature based on the BRD below:
[PASTE OR ATTACH docs/BRD.md]

Requirements:
- Language: [e.g. JavaScript/Node 18+], no external dependencies if possible.
- Separate business logic from UI. Keep state immutable.
- One function or module per business rule, with the BR ID in a comment.
- Mock any external system (API, pricing, inventory) behind an interface.
- Write automated tests: one or more per business rule, with test names
  starting with the BR ID. Include edge cases and failure cases.
- Run the tests and show the results.

Save to src/ and tests/. Do not claim anything works that you have not run.
```

---

## Step 5: GitHub-ready artifacts

```
Prepare this project for GitHub. Use the existing files: [LIST FOLDERS].

Create or update:
1. README.md: problem, approach, folder map with links, how to run the
   tests, how to open the prototype, scope note, and a "mocked vs real"
   section.
2. .gitignore, LICENSE (MIT) and package.json with a test script.
3. docs/PROMPT_LOG.md: table of my prompts, the output summary and my
   judgment, with one row per step.
4. A GitHub Pages note for serving the prototype folder.
5. A suggested commit message and the exact git commands to push.

Then run the tests once more, verify that every link in the README points
to an existing file, and zip the project.
```

---

## Step 6: Missing points and discrepancies

```
Act as a critical reviewer. Compare these artifacts and find gaps:
- Call inputs: [docs/inputs file]
- BRD: [docs/BRD.md]
- Prototype: [prototype/index.html]
- Code and tests: [src/, tests/]

Check and report in a table (ID, finding, severity, where, suggested fix):
1. Customer needs from the call that are missing from the BRD.
2. Business rules in the BRD that are missing or different in the
   prototype or code.
3. Rules with no automated test.
4. Numbers that disagree between documents (prices, limits, dates, KPIs).
5. Contradictions inside the BRD (scope vs rules, rules vs rules).
6. Open questions that were never resolved, and unstated assumptions.
7. Missing non-functional, security, accessibility or error-handling cases.
8. Dependencies with no owner or date.

Finish with a traceability matrix (need -> scope -> rule -> prototype ->
test) and the top 5 fixes to make first. Do not fix anything until I approve.
```

---

## Tips for repeating the process
- Run one step per message, and review each output before moving on.
- Keep the same wording for IDs (N1.., BR-01..) so tracing works across steps.
- Always say "do not invent facts" and "mark assumptions": it is the most useful guard against made-up details.
- After step 6, ask Claude to apply only the fixes you approve, then rerun steps 3 to 5 for the changed parts.
- Note in `PROMPT_LOG.md` what you corrected. That is the evidence of your judgment.
