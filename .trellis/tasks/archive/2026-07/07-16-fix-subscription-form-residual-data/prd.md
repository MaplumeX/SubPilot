# Fix SubscriptionForm retaining previous data on reopen

## Goal

每次打开"添加订阅"对话框时，表单字段应显示为初始空白/默认值，而不是上一次添加或编辑留下的数据。

## Background

`SubscriptionForm` 组件的所有字段（name、price、currency、logo、reminder 等）均使用 `useState` 从 `subscription` prop 初始化。组件挂载后 state 不再随 prop 变化同步，且内部没有在 dialog 打开时重置 state 的逻辑。

两个调用点的表现：

- `AppLayout.tsx` 全局添加弹窗：`key="app-create"` 固定，组件实例只挂载一次，添加完成后再次打开会残留上次输入。
- `SubscriptionsPage.tsx` 列表页弹窗：`key={editing?.id ?? "create"}`，编辑→新建会重建（key 变），但连续两次新建（key 始终 "create"）不会重建，同样残留。

## Requirements

- 对话框每次打开为 `true` 时，表单必须根据当前 `subscription` prop（或缺失时的默认值）重新同步所有字段 state。
- 不依赖外部 `key` 变化来强制 remount；修复须在组件内部生效，两个调用点都受益。
- 保留现有编辑场景的行为：打开编辑对话框时仍加载对应 subscription 的数据。
- 不改变现有字段集合、校验逻辑或提交行为。

## Acceptance Criteria

- [ ] 连续两次打开"添加订阅"对话框，第二次不显示第一次输入的数据。
- [ ] 编辑某订阅后打开"添加订阅"对话框，不显示该订阅的数据。
- [ ] 打开"编辑订阅"对话框仍能正确加载该订阅的现有数据。
- [ ] logo 搜索结果、搜索域名、链接 URL、上传状态等辅助 state 也在重新打开时被重置。

## Notes

- 推荐实现：在 `SubscriptionForm` 内增加 `useEffect`，监听 `open` 变为 true 时按 `subscription` 同步全部 state。
- 属轻量级 bug 修复，PRD-only。