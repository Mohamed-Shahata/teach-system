# AI Agent Workflow

Any AI agent (or developer) working on this project follows this
sequence **before** writing code:

1. Read the relevant documentation (this `/docs` tree).
2. Understand the current architecture (`architecture/`).
3. Inspect the existing implementation (search the codebase).
4. Search for reusable existing functionality (components, hooks,
   services, repositories, schemas — see `development/coding-rules.md`
   "No Duplicate Functionality").
5. Check the related task in `tasks/` (status, dependencies, acceptance
   criteria).
6. Identify affected modules.
7. Check security implications (`security/README.md`).
8. Check tenant isolation (`architecture/multi-tenancy.md`).
9. Check i18n requirements (`internationalization/README.md`).
10. Check RTL/LTR implications (`internationalization/rtl-ltr.md`).
11. Check light/dark theme implications (`design-system/theming.md`).
12. Implement the smallest clean solution.
13. Test the implementation.
14. Update documentation.
15. Update the task status in `tasks/`.

Do not start coding before completing steps 1–11.

## Feature development workflow

```text
Requirement
    ↓
Understand architecture
    ↓
Read documentation
    ↓
Check existing implementation
    ↓
Design solution
    ↓
Implement
    ↓
Test
    ↓
Verify security
    ↓
Verify tenant isolation
    ↓
Verify i18n
    ↓
Verify RTL/LTR
    ↓
Verify Light/Dark Mode
    ↓
Update documentation
    ↓
Update task status
```

See `development/definition-of-done.md` for the full completion
checklist and `development/coding-rules.md` for code-level rules.
