# Implement Plan: Category & Payment Method Entities

## Validation commands

```bash
# Backend
cd backend && ruff check app && python -m mypy app 2>/dev/null || echo "mypy optional"
cd backend && alembic upgrade head   # apply migration locally
cd backend && pytest                  # if tests exist

# Frontend
cd frontend && npm run lint && npm run build
```

(Locate the actual lint/typecheck commands from Makefile / package.json before running — verify, don't assume.)

## Ordered checklist

### Phase A — Backend data layer
1. [ ] `backend/app/models/category.py`: `Category` model (id, user_id FK CASCADE, name String(100), created_at, `UniqueConstraint(user_id, name)`). Import `User` relationship lazily to avoid circular import; mirror the `_utcnow` helper style from `subscription.py`.
2. [ ] `backend/app/models/payment_method.py`: `PaymentMethod` model, same shape.
3. [ ] `backend/app/models/__init__.py`: export both new models so Alembic `env.py` picks them up.
4. [ ] `backend/app/models/subscription.py`: remove `category` / `payment_method` string columns; add `category_id` (nullable FK→categories.id RESTRICT) and `payment_method_id` (NOT NULL FK→payment_methods.id RESTRICT); add `relationship("Category")` / `relationship("PaymentMethod")`.

### Phase B — Backend schemas
5. [ ] `backend/app/schemas/category.py`: `CategoryCreate`, `CategoryUpdate`, `CategoryResponse`, `CategoryBrief{id,name}`.
6. [ ] `backend/app/schemas/payment_method.py`: same set.
7. [ ] `backend/app/schemas/subscription.py`: `SubscriptionCreate`/`Update` switch to `category_id`/`payment_method_id`; `SubscriptionResponse` nests `category: CategoryBrief | None`, `payment_method: PaymentMethodBrief`.

### Phase C — Backend routers
8. [ ] `backend/app/routers/categories.py`: POST / GET list / PATCH /{id} / DELETE /{id} with reference-count 409. Use `_check_ownership`-style helper. Catch `IntegrityError` on create/rename → 409 name collision.
9. [ ] `backend/app/routers/payment_methods.py`: mirror for payment methods; reference-count queries `subscriptions.payment_method_id`.
10. [ ] `backend/app/routers/subscriptions.py`:
    - `create_subscription`: validate referenced `category_id`/`payment_method_id` belong to `current_user.id`; 404 if not.
    - `update_subscription`: same validation when ids present in payload.
    - `list_subscriptions`: `category` query param → `int | None`; `query.options(joinedload(Subscription.category), joinedload(Subscription.payment_method))`.
    - `get_subscription` / `acknowledge_subscription` / `update_subscription` returns: add `joinedload` so response nesting resolves.
    - `get_stats`: `by_category` key from `sub.category.name if sub.category else None`.
    - Remove `GET /categories` and `GET /payment-methods` handlers.
11. [ ] `backend/app/main.py`: `include_router(categories.router)`, `include_router(payment_methods.router)`.

### Phase D — Migration
12. [x] New alembic revision `b8f3a1c2d4e7` (`alembic revision -m "category payment method entities"`); `down_revision = "cd42d415c3bc"` (verified current head via `alembic heads`; the `01213dcc7786` written in design.md was an earlier merge tip). Follow the 11-step sequence in `design.md` → Migration. Docstring notes the empty-`payment_method` dev-stage assumption. Backfill verified end-to-end (seeded Music/Visa/Alipay + NULL category → upgrade → deduped categories & correct FK ids).
13. [ ] `cd backend && alembic upgrade head` locally and verify tables + a sample backfill on existing dev data.

### Phase E — Frontend API + types
14. [ ] `frontend/src/api/types.ts`: add `Category`, `PaymentMethod` interfaces; change `Subscription` nesting; `SubscriptionCreate`/`Update`/`listSubscriptions` param shapes per `design.md`.
15. [ ] `frontend/src/api/categories.ts`, `frontend/src/api/payment_methods.ts`: CRUD helpers.
16. [ ] `frontend/src/api/subscriptions.ts`: remove old `listCategories`/`listPaymentMethods` (from `subscriptions.ts`); update `listSubscriptions` param type.

### Phase F — Frontend UI
17. [ ] `frontend/src/components/EntityManagerCard.tsx`: reusable card (list + add input + inline rename + delete with 409 toast/message). Prop-driven: api fns, i18n labels, entity type.
18. [ ] `frontend/src/pages/SettingsPage.tsx`: add two `EntityManagerCard` instances (categories, payment methods).
19. [ ] `frontend/src/components/SubscriptionForm.tsx`: replace both `Popover`+`Command` comboboxes with `Select`; state holds `number | null`; empty-state hint; submit payload uses `*_id`.
20. [ ] `frontend/src/pages/SubscriptionsPage.tsx`: `filterCategory: number | null`; pass id to `listSubscriptions`; cells show `?.name ?? "-"`.
21. [ ] `frontend/src/components/SubscriptionCard.tsx`: `sub.category?.name`, `sub.payment_method?.name` with null guards.
22. [ ] `StatisticsPage.tsx`: no change expected; verify `by_category` still renders after backend rename.

### Phase G — i18n + final
23. [ ] `frontend/src/i18n/en.json`, `zh-CN.json`: add keys listed in `design.md` → i18n.
24. [ ] Backend: `ruff check`; frontend: `npm run lint && npm run build`; fix type errors (especially `Subscription` type changes rippling through consumers — `grep -rn "\.category\|\.payment_method" frontend/src`).
25. [ ] Manual smoke: settings add/rename/delete (incl. delete-blocked-when-in-use); subscription create/update with entity selection; subscriptions page filter by category; stats page renders.

## Risky files / rollback points

- `backend/app/models/subscription.py` — column swap is the riskiest edit; Alembic migration is the rollback boundary (`alembic downgrade -1`).
- `backend/app/routers/subscriptions.py` — many call sites touched (create/update/list/stats/acknowledge/get); each return path now needs `joinedload`.
- `frontend/src/api/types.ts` — `Subscription` shape change ripples to `SubscriptionCard`, `SubscriptionsPage`, `StatisticsPage`, `SubscriptionForm`. Run the grep in step 24 to catch consumers.
- `frontend/src/components/SubscriptionForm.tsx` — Combobox→Select rewrite touches state shape + submit payload; verify edit mode initializes from `subscription?.category?.id`.

## Follow-up before `task.py start`

- Curation of `implement.jsonl` / `check.jsonl` (spec entries to inject to sub-agents).
- User review of `prd.md` + `design.md` + `implement.md`.
