# Definition of Done

A feature is complete only when **all** of the following are true:

- [ ] Code is implemented following the layered architecture
- [ ] TypeScript passes with no errors (`tsc --noEmit`)
- [ ] Input validation exists (Zod, server-side, per `security/validation.md`)
- [ ] Authorization checks exist (role + ownership, per `authorization/README.md`)
- [ ] Tenant isolation is verified (`architecture/multi-tenancy.md`)
- [ ] Error handling follows `security/error-handling.md`
- [ ] All user-facing text uses translations (no hardcoded strings)
- [ ] English and Arabic translations both exist and are complete
- [ ] RTL/LTR behavior is verified for any new/changed UI
- [ ] Light/Dark Mode is verified for any new/changed UI
- [ ] Responsive behavior is verified (mobile → desktop)
- [ ] Tests are added where appropriate
- [ ] Relevant documentation under `/docs` is updated
- [ ] The related task in `tasks/` is marked complete
- [ ] Existing functionality is not unnecessarily broken (manual/regression check)
