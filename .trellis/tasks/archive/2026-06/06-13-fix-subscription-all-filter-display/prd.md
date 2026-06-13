# 修复订阅筛选全部选项显示 __all__

## Goal

修复订阅页面的分类和状态筛选器：用户选择“全部分类”或“全部状态”后，触发器应继续显示对应的翻译文本，而不是内部哨兵值 `__all__`。

## What I Already Know

* 两个筛选器使用 `__all__` 作为菜单中的“全部”选项值。
* `onValueChange` 会把 `__all__` 转换为空字符串，表示不应用筛选。
* 当前 `value={filterX || undefined}` 会让初始值为空的 Base UI Select 被判定为非受控组件；之后外部状态清空不能覆盖其内部保存的 `__all__`。
* `SelectValue` 在无法解析内部值标签时会回退显示原始值，因此界面出现 `__all__`。
* Base UI Select 支持用 `null` 表示受控的未选择状态。

## Requirements

* 分类筛选选择“全部分类”后显示“全部分类”。
* 状态筛选选择“全部状态”后显示“全部状态”。
* 空筛选仍表示不向订阅查询应用对应过滤条件。
* Select 在整个生命周期中保持受控状态。
* 修正项目组件规范中将 `undefined` 用于受控空值的错误示例。

## Acceptance Criteria

* [x] 分类筛选使用受控空值，初始状态和选择“全部分类”后均走翻译后的占位文本。
* [x] 状态筛选使用受控空值，初始状态和选择“全部状态”后均走翻译后的占位文本。
* [x] 受控状态清空后不会保留并显示内部值 `__all__`。
* [x] 选择具体分类或状态的状态值与标签逻辑保持不变。
* [x] 前端 lint 和类型检查通过；项目未配置测试脚本。

## Definition of Done

* 实现仅修改必要的 Select 受控值语义。
* 更新相关前端规范，避免再次引入 `undefined` 导致的非受控状态。
* 完成 lint、类型检查和相关测试。

## Technical Approach

将两个筛选器的空值从 `undefined` 改为 `null`。`null` 会让 Base UI Select 从首次渲染起保持受控，同时其 `SelectValue` 将其识别为未选择状态并显示 `placeholder`。继续保留 `__all__` 菜单项及现有的 `onValueChange` 转换逻辑。

## Decision (ADR-lite)

**Context**: `undefined` 在 Base UI 的 `useControlled` 中表示非受控组件，不能用于受控 Select 的空值。

**Decision**: 使用 `null` 作为 Select 的受控空值，而业务筛选状态继续使用空字符串。

**Consequences**: 修改范围小，筛选状态与 API 行为不变；UI 组件边界负责将空字符串映射为 `null`。

## Out of Scope

* 移除所有 Select 中的哨兵值。
* 重构筛选状态或 API 查询参数。
* 修改订阅表单及其他页面的 Select。

## Technical Notes

* 受影响代码：`frontend/src/pages/SubscriptionsPage.tsx`
* 相关组件：`frontend/src/components/ui/select.tsx`
* 相关规范：`.trellis/spec/frontend/component-guidelines.md`
* 依赖版本：`@base-ui/react` 1.5.0
