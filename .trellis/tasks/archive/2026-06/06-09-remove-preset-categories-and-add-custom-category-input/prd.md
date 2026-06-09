# Remove Preset Categories and Add Custom Category Input

## Goal

Remove hardcoded preset categories from the frontend and replace with a Combobox that allows users to select from existing categories or type new ones freely. Category suggestions are dynamically derived from existing subscriptions — when no subscription uses a category, it naturally disappears.

## Requirements

* Remove hardcoded `CATEGORIES` arrays from `SubscriptionForm.tsx` and `SubscriptionsPage.tsx`
* Replace the category `<Select>` dropdown in the subscription form with a Combobox (free-text input + dropdown suggestions from existing categories)
* Add a backend endpoint to list unique categories used by existing subscriptions
* Replace the category filter dropdown on SubscriptionsPage with a dynamic `<Select>` populated from backend categories
* Display categories as-is (user input shown verbatim, no i18n translation for custom categories)
* Remove preset category translations from `en.json` and `zh-CN.json`

## Acceptance Criteria

* [ ] No hardcoded preset categories remain in frontend code
* [ ] Users can type any category name when creating/editing a subscription
* [ ] Combobox shows suggestions from existing subscription categories
* [ ] Typing a new category creates it on submit
* [ ] SubscriptionsPage filter dropdown shows all existing categories from backend
* [ ] Existing subscriptions with old preset categories (streaming, etc.) still display correctly
* [ ] Backend endpoint returns unique categories used across all subscriptions
* [ ] No duplicate category constants between files

## Definition of Done

* Lint / typecheck / CI green
* i18n still works for remaining UI labels
* No unused preset category translations left in locale files

## Technical Approach

* **Backend**: Add `GET /subscriptions/categories` endpoint that queries distinct category values
* **Frontend Form**: Replace `<Select>` with shadcn/ui Combobox pattern (Command + Popover) — free-text input that filters existing categories, allows new entry
* **Frontend Filter**: Replace static `<Select>` with dynamic `<Select>` populated from backend categories endpoint
* **Category display**: Show raw string, no translation lookup
* **i18n cleanup**: Remove `subscriptions.categories.*` keys from locale files

## Out of Scope

* Separate categories table with CRUD endpoints
* Explicit category delete/hide functionality
* Category color or icon assignment
* Category translation for user-created categories

## Technical Notes

* `backend/app/models/subscription.py` line 42: `category: Mapped[str | None] = mapped_column(String(100), nullable=True)` — no schema change needed
* `frontend/src/components/SubscriptionForm.tsx` lines 38-48: hardcoded CATEGORIES (to remove)
* `frontend/src/pages/SubscriptionsPage.tsx` lines 31-41: duplicated CATEGORIES (to remove)
* `frontend/src/i18n/en.json` and `zh-CN.json` lines 48-58: category translations (to remove)
* `backend/app/routers/subscriptions.py` line 113: `cat = sub.category or "other"` fallback — review if this should change
* `frontend/src/components/ui/` — check if Combobox/Command components already exist in shadcn setup
