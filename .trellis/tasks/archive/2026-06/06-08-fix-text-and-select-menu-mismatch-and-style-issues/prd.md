# Fix Text and Select Menu Mismatch and Style Issues

## Goal

修复前端中 Select 组件的文本/值不匹配问题以及样式不适配问题，确保表单和筛选器中的下拉菜单显示一致、行为正确。

## What I already know

* `SubscriptionsPage.tsx` 中筛选 Select 使用 `__all__` 作为"全部"值，`SubscriptionForm.tsx` 中 category 使用 `__none__` 作为"无"值
* `SelectTrigger` 默认样式为 `w-fit`，在表单 grid 布局中未指定宽度导致宽度不统一
* Currency 字段用普通 Input 文本输入，用户可输入任意内容，无约束
* `SubscriptionForm` 中的 billingCycle/status Select 没有指定宽度，在 grid 中与旁边的 Select 可能宽度不一致

## Requirements

* SelectTrigger 默认宽度改为 `w-full`，使表单中 Select 与 Input 宽度一致
* Currency 字段改为 Select，提供 CNY, USD, EUR, GBP, JPY 五种常用货币
* 确保 `__all__` / `__none__` 的 value 在 Select 中正确显示翻译文本（当前已使用 t()，确认无遗漏）
* 补充 zh-CN.json 中 Currency Select 所需的翻译 key

## Acceptance Criteria

- [ ] SelectTrigger 默认 `w-full`，表单中 Select 与 Input 宽度统一
- [ ] Currency 字段改为 Select，提供常见货币选项
- [ ] 中英文翻译文件包含新增的货币相关翻译 key
- [ ] 所有 Select 组件的显示文本正确走 i18n，无原始值泄漏
- [ ] 筛选器 Select 和表单 Select 样式一致

## Definition of Done

* Lint / typecheck 通过
* 手动验证表单和筛选器中 Select 显示正确

## Out of Scope

* 后端 API 变更
* 新增货币自动转换功能
* 新增其他表单字段

## Technical Notes

* 关键文件：`frontend/src/components/ui/select.tsx`、`frontend/src/components/SubscriptionForm.tsx`、`frontend/src/pages/SubscriptionsPage.tsx`、`frontend/src/i18n/en.json`、`frontend/src/i18n/zh-CN.json`
* Select 组件基于 `@base-ui/react/select`
* PR #3 已修过 `__all__/__none__` 原文显示问题，当前使用 t() 翻译
