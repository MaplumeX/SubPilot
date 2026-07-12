# 当前代码缺陷排查

## Goal

对当前代码库进行缺陷排查并修复已确认的问题：安全配置、上传安全、货币数据契约、订阅更新校验、令牌续期和前端 lint；产出具备验证证据的修复结果。

## Confirmed Facts

- 仓库包含 FastAPI 后端（`backend/`）和 React/Vite 前端（`frontend/`）。
- 当前位于 `main` 分支，存在用户已有的未提交改动：`README.md`、`docker-compose.yml` 与 `README.zh-CN.md`；排查不得修改或覆盖这些文件。
- 当前没有自动发现到活动任务；本任务由用户明确授权创建。
- 后端项目声明了运行依赖，但未发现项目自有测试目录或测试文件；前端 `package.json` 仅提供 `build` 与 `lint` 脚本，未提供测试脚本。

## Requirements

- 修复审查报告中全部六项已确认问题。
- 为新增/修改的 API 与认证行为建立自动化回归验证。
- 不覆盖或纳入用户已有的未提交改动。

## Acceptance Criteria

- [x] 默认或缺失 `SECRET_KEY` 不得启动服务。
- [x] 上传接口不得接受可执行的 SVG 内容。
- [x] 订阅货币和支付方式字段在 API 边界得到正确校验。
- [x] access token 过期时，前端能使用有效 refresh token 无感续期一次。
- [x] 前端 lint、构建和后端验证通过。
- [x] 不覆盖用户既有未提交改动。

## Out of Scope

- 与六项已确认缺陷无关的重构和功能扩展。
