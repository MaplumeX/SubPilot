# Add Card View for Subscriptions

## Goal

为订阅管理页面提供卡片视图（card view），作为现有表格视图的替代展示方式，让用户可以通过切换按钮在两种视图间切换。

## Requirements

* 卡片视图作为表格视图的替代，紧凑核心布局：名称+头像、价格（含换算）、状态 Badge、下次账单日期、操作按钮（始终显示）；分类和周期以次要信息小字展示；自动续费用小图标标注
* 视图切换按钮：位于筛选器区域，可在卡片视图和表格视图间切换
* 卡片排列：响应式网格（大屏3-4列，中屏2列，小屏1列）
* 筛选器在两种视图中均可用
* 视图选择持久化至 sessionStorage
* 复用已有组件（Card, Avatar, Badge）

## Acceptance Criteria

* [ ] 卡片视图正确展示订阅信息（名称、头像、价格、状态、下次账单日期、分类、周期、自动续费标记）
* [ ] 切换按钮可在卡片视图和表格视图之间切换
* [ ] 筛选器在两种视图中均可用且行为一致
* [ ] 编辑/删除操作在卡片视图中可用（按钮始终显示）
* [ ] 视图选择在页面刷新后通过 sessionStorage 保留
* [ ] 响应式网格布局适配不同屏幕宽度
* [ ] 空状态和加载状态在卡片视图中正常展示

## Definition of Done

* Lint / typecheck 通过
* 无功能回归（表格视图行为不变）

## Out of Scope

* 拖拽排序 / 收藏置顶
* Dashboard 订阅摘要卡片样式对齐
* 大量订阅的虚拟滚动优化

## Technical Approach

1. 在 `SubscriptionsPage.tsx` 中添加视图状态（`viewMode: "table" | "card"`），默认从 sessionStorage 读取
2. 在筛选器区域添加切换按钮（使用 LayoutGrid / List 图标）
3. 创建 `SubscriptionCard` 组件，使用已有 Card + Avatar + Badge 组件
4. 根据视图状态条件渲染表格或卡片网格
5. 卡片网格使用 Tailwind 响应式类（`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`）

## Technical Notes

* 关键文件：`frontend/src/pages/SubscriptionsPage.tsx`
* 新增组件：`frontend/src/components/SubscriptionCard.tsx`
* 可复用组件：`frontend/src/components/ui/card.tsx`, `avatar.tsx`, `badge.tsx`
* 视图切换图标：lucide-react 的 LayoutGrid / List
