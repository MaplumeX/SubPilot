# Design: Category & Payment Method as Managed Entities

## Architecture

Two near-symmetric per-user entities (`Category`, `PaymentMethod`) replace the free-text string fields on `subscriptions`. Each gets its own model, schema, and CRUD router. Subscription references them by foreign key.

```
users 1───* categories *───1 subscriptions 1───* payment_methods *───1 users
```

### Data model (new)

`backend/app/models/category.py`, `backend/app/models/payment_method.py`:

```python
class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_categories_user_name"),)

class PaymentMethod(Base):
    # same shape, __tablename__ = "payment_methods"
```

`Subscription` model changes (`backend/app/models/subscription.py`):

- remove `category: String(100) nullable`
- remove `payment_method: String(100) not null default ''`
- add `category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True)`  (nullable — category is optional)
- add `payment_method_id: Mapped[int] = mapped_column(Integer, ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=False)`  (NOT NULL — required)
- `relationship("Category")`, `relationship("PaymentMethod")` for eager/joined load on read

`ondelete="RESTRICT"` enforces the "block delete when referenced" rule at the DB layer as a backstop; the API also checks reference count up front to give a 409 with a count before hitting the constraint.

### Schemas (Pydantic)

New `backend/app/schemas/category.py` and `payment_method.py`:

```python
class CategoryCreate(BaseModel): name: str = Field(min_length=1, max_length=100)
class CategoryUpdate(BaseModel): name: str = Field(min_length=1, max_length=100)
class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}
# PaymentMethod schema identical in shape.
```

`SubscriptionCreate` / `SubscriptionUpdate` (`backend/app/schemas/subscription.py`):

- `category: str | None` → `category_id: int | None = None`
- `payment_method: str` (min_length=1) → `payment_method_id: int` (required on create; optional on update)

`SubscriptionResponse`:

- `category: str | None` → `category: CategoryBrief | None` where `CategoryBrief = {id: int, name: str}` (nested, `from_attributes` reads through the relationship)
- `payment_method: str` → `payment_method: PaymentMethodBrief` (`{id, name}`)
- Brief types live in `schemas/category.py`, `schemas/payment_method.py` and are imported by `schemas/subscription.py`.

Nested `{id, name}` lets frontend display `sub.category?.name` and edit `sub.category?.id` without a second fetch; choosing a brief (not the full response) keeps history out of view.

### Routers (new)

`backend/app/routers/categories.py`, prefix `/api/v1/categories`:
- `POST ""` → 201, `CategoryResponse`. Body `CategoryCreate`. 409 if `(user_id, name)` already exists (catch `IntegrityError` → friendly message).
- `GET ""` → `list[CategoryResponse]`. Filter by `current_user.id`, order by name.
- `PATCH "/{id}"` → `CategoryResponse`. Body `CategoryUpdate` (rename). 404 if not owned; 409 on name collision.
- `DELETE "/{id}"` → 204. 404 if not owned. 409 `{detail, count}` if `subscriptions.category_id` count > 0.

`backend/app/routers/payment_methods.py` mirrors the above at `/api/v1/payment-methods`, checking `subscriptions.payment_method_id`.

Both routers use `get_current_user` + `get_db` from `app.deps`, same ownership pattern as `subscriptions.py` (`_check_ownership`-style helper). Register in `app/main.py`.

### Subscription router changes (`backend/app/routers/subscriptions.py`)

- `create_subscription`: accepts `category_id`/`payment_method_id` already in the dumped payload (no special handling beyond schema). Ownership of the referenced entity MUST be validated: load `Category`/`PaymentMethod` by id + `user_id == current_user.id`, 404/400 otherwise. This prevents a user from pointing a subscription at another user's entity id.
- `update_subscription`: same ownership check when `category_id`/`payment_method_id` present in `update_data`.
- `list_subscriptions`:
  - `category` query param: change semantics. Two viable shapes — by `category_id` (int) or by name. We pick **`category_id: int | None`** (concrete identity, not a string the user may have renamed since). Frontend filter UI switches to passing id.
  - eagerly load `Category`/`PaymentMethod` so `SubscriptionResponse` nesting populates without N+1 (`joinedload(Subscription.category)`).
- `get_stats`: `by_category` keys stay as **name strings** (used directly by frontend chart). Implementation: `sub.category.name if sub.category else None`. `None`/missing category buckets under a localized "Uncategorized" — but keep current behavior: current code keys by `cat = sub.category` (a possibly-None string). Match: bucket key `sub.category.name` if set else `None`; frontend already handles `name || t("statistics.category")`.
- **Remove** `GET /categories` and `GET /payment-methods` (distinct-derived). Replaced by the new CRUD list endpoints. The frontend's `listCategories()`/`listPaymentMethods()` API helpers are rewritten to hit the new endpoints and return `CategoryResponse[]`/`PaymentMethodResponse[]`.

### Migration (`backend/alembic/versions/xxxx_category_payment_method_entities.py`)

Follows existing style (`op.execute`, `batch_alter_table`). Since dev-stage / no compatibility:

1. `op.create_table("categories", ...)` with `UniqueConstraint("user_id","name")`.
2. `op.create_table("payment_methods", ...)` same shape.
3. `op.add_column("subscriptions", Column("category_id", Integer, nullable=True))`
4. `op.add_column("subscriptions", Column("payment_method_id", Integer, nullable=True))`  (start nullable so backfill can run)
5. Backfill categories (per-user dedup):
   ```sql
   INSERT INTO categories (user_id, name, created_at)
   SELECT DISTINCT user_id, category, NOW() FROM subscriptions
   WHERE category IS NOT NULL AND category <> '';
   ```
6. Backfill `subscriptions.category_id`:
   ```sql
   UPDATE subscriptions s
   SET category_id = (SELECT id FROM categories c
                      WHERE c.user_id = s.user_id AND c.name = s.category)
   WHERE s.category IS NOT NULL AND s.category <> '';
   ```
7. Backfill payment_methods + `subscriptions.payment_method_id` analogously. **Dev-stage assumption**: existing rows have non-empty `payment_method` (nullable=False, default `''` in old schema). Rows where `payment_method = ''` cannot get an id; since the new column will be NOT NULL, the migration will fail loudly on such rows — acceptable in dev stage (operator deletes/cleans the dirty rows before upgrade). Document this assumption in the migration docstring.
8. `op.create_foreign_key(...)` constraints on `subscriptions.category_id`→`categories.id` (ondelete RESTRICT) and `subscriptions.payment_method_id`→`payment_methods.id` (ondelete RESTRICT).
9. `op.alter_column("subscriptions", "payment_method_id", nullable=False)`
10. `op.drop_column("subscriptions", "category")`
11. `op.drop_column("subscriptions", "payment_method")`

`downgrade()` reverses (recreate string columns, best-effort reconstitute from joined name, drop tables). Dev-stage, so downgrade correctness is best-effort.

`down_revision` = current head (`cd42d415c3bc` — verified via `alembic heads`; `01213dcc7786` is an earlier merge but not the tip).

## Frontend changes

### API layer (`frontend/src/api/`)

- New `frontend/src/api/categories.ts` + `payment_methods.ts` with `createCategory`, `listCategories` (returns `CategoryResponse[]`), `renameCategory`, `deleteCategory` (same set for payment methods).
- `frontend/src/api/types.ts`:
  - `Category`, `PaymentMethod`, `CategoryResponse` interfaces (`{id, user_id, name, created_at}`).
  - `Subscription.category: string | null` → `category: {id: number; name: string} | null`
  - `Subscription.payment_method: string` → `payment_method: {id: number; name: string}`
  - `SubscriptionCreate.category_id?: number | null`, `payment_method_id: number`
  - `SubscriptionUpdate.category_id?: number | null`, `payment_method_id?: number`
  - `listSubscriptions` param `category?: number` (id)
- Remove old `listCategories()`/`listPaymentMethods()` from `api/subscriptions.ts` (they pointed at the removed distinct endpoints).

### SettingsPage (`frontend/src/pages/SettingsPage.tsx`)

Add two new cards: "分类管理" and "支付方式管理", each a list with inline add/rename/delete. Reusable `<EntityManagerCard>` component (lives in `frontend/src/components/`) parametrized by:
- title/icon
- api functions (list/create/rename/delete) + types
- i18n labels

Operations: add input + button; each row shows name with inline-edit (rename) and delete button. Delete handler catches 409 and shows the localized "被 N 条订阅使用,无法删除" message. Follow existing `Card`/`Input`/`Button`/`Label` patterns; no new shadcn primitives needed.

### SubscriptionForm (`frontend/src/components/SubscriptionForm.tsx`)

- Replace both `Popover`+`Command` (Combobox, free-text) comboboxes with `Select` (only existing entities). Load via `listCategories()`/`listPaymentMethods()` which now return `{id,name}[]`.
- State: `category: number | null` (was `string`), `paymentMethod: number | null` (was `string`). Initialize from `subscription?.category?.id ?? null` / `subscription?.payment_method?.id ?? null`.
- Empty state: if entity list is empty, `Select` shows a disabled/empty state with a hint linking to SettingsPage. For required `payment_method_id`, the submit validation surfaces "请先在设置页添加支付方式".
- Submit payload sends `category_id: category`, `payment_method_id: paymentMethod`.

### SubscriptionsPage (`frontend/src/pages/SubscriptionsPage.tsx`)

- Filter dropdown `filterCategory` switches to holding `number | null` (entity id). `listSubscriptions({category: filterCategory})` passes id.
- Table cells: `sub.category?.name ?? "-"`, `sub.payment_method?.name ?? "-"`.

### SubscriptionCard (`frontend/src/components/SubscriptionCard.tsx`)

- `sub.category && <span>{sub.category.name}</span>` → `sub.category && <span>{sub.category.name}</span>`; payment method similar. Guard null.

### StatisticsPage (`frontend/src/pages/StatisticsPage.tsx`)

- No change — `by_category` stays `Record<string, number>` keyed by name; backend still produces name strings.

## i18n

Add keys to `frontend/src/i18n/en.json` and `zh-CN.json`:
- `settings.categories`, `settings.paymentMethods` (card titles)
- `settings.addCategory`, `settings.addPaymentMethod`, `settings.rename`, `settings.delete`
- `settings.deleteBlockedInUse` (with `{{count}}` interpolation)
- `settings.emptyHint` ("No items yet. Add one below." / "暂无,请在下方添加")
- `subscriptionForm.emptyPaymentMethodHint` ("No payment method yet — add one in Settings" / "暂无支付方式,请先在设置页添加")
- `subscriptionForm.emptyCategoryHint`
- error key "Category already exists" / "Payment method already exists" → `errors.entityNameExists`

## Trade-offs

- **Nested `{id,name}` in `SubscriptionResponse` vs flat `*_id` + separate fetch**: chose nested to avoid N+1 on list views and keep frontend display simple; cost is a `joinedload` on list/get queries.
- **`ondelete=RESTRICT` at DB + API 409 check**: belt-and-suspenders; DB constraint guarantees integrity even if a future code path forgets the count check, while the API check gives an actionable count message.
- **`category_id` query param (not name) for filtering**: concrete identity survives renames; cost is the frontend filter must carry the selected entity's id rather than its label.
- **Removing `/subscriptions/categories` and `/subscriptions/payment-methods`**: breaks the old API surface; acceptable in dev stage. Replaced by the CRUD endpoints.
- **Migration assumes no empty `payment_method` rows**: dev-stage simplification; documented in migration docstring. Operator cleans dirty rows before upgrade if present.

## Rollback

Revert via `alembic downgrade -1` (best-effort reconstitute of string columns) + frontend revert. Dev-stage, so data loss on rollback is acceptable.
