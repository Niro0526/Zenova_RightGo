# AI Disclosure

This file lists the AI and design tools Team ZENOVA used for RightGo. It states only what the team has confirmed. Items marked **TO CONFIRM** need the team's input before submission.

## Product behaviour

The shipped application contains **no AI or machine-learning model**. Dispatcher planning is a deterministic greedy heuristic plus a rule validator (`Server/app/services/planning_service.py`, `validation_service.py`). The `ml/` folder holds empty placeholders only. Earlier versions of `docs/AI_DISCLOSURE.md` described ML components and bias audits; those statements were not backed by the code and have been removed.

## Tools used during development

| Tool | Confirmed use | Details |
|---|---|---|
| Claude Code (Anthropic) | Used on the submission-preparation pass: repository inspection, local Docker Compose and entrypoint, `.gitignore` and Git-tracking cleanup, README and `docs/architecture.md` / `docs/data-model.md`, and dead-file review. Output was reviewed and verified by running the test suites, builds and a migration/seed run. | **TO CONFIRM:** any earlier use for application code or the `docs/` planning documents, and who reviewed it. |
| ChatGPT (OpenAI) | Used by the team. | **TO CONFIRM:** what it was used for (e.g. ideas, code, copy, research), by whom, and whether any output was copied into the repository. |
| Figma | Used by the team for UI design (the stylesheet references a Figma-based design system). | **TO CONFIRM:** whether Figma AI features were used, and where the design file lives. |

## Human responsibility

The team is responsible for all submitted code, documentation and data handling. AI output was not given access to the confidential competition dataset beyond what is needed to run the local seed. **TO CONFIRM:** that no confidential data was pasted into ChatGPT or any other external AI service.
