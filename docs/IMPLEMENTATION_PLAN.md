# FitOS 实施计划与数据模型

状态：第一阶段仅完成代码审计、文档、公开训练种子和本地私有初始化数据；没有在应用内启用新功能或生成数据库迁移。

## 来源、Git 与验证约束

- 工作区开始时为空且没有 `.git`。从 GitHub 官方 `skulptapp/skulpt` `main` 源码快照取得文件；审计时 GitHub head 为 `538363e70d8cf5a9832eddf4e9d06a6e931446cb`。快照没有原始提交图，无法证明它与任何 `fitos` Fork 有共同祖先。
- 本地建立了快照基线与 `feat/fitos-foundation` 分支，`upstream` 指向 Skulpt。没有 `origin`；目标 FitOS GitHub 仓库的所有者、存在性、Fork 状态与写权限未验证。正式 PR 前须找到用户的 FitOS 仓库，检出其真实 Git 历史，把本分支改动移植到该历史之上，并核对 diff。当前本地基线不得直接当作可合并 PR 的 base。
- 保留上游 `LICENSE` 和版权声明。公开分发修改版前核查 GPL-3.0 对修改标记、许可文本与对应源码交付的义务。个人记录与密钥不属于要提交的源码。

## 数据模型：复用与新增

现有 `workout`、`workout_group`、`workout_exercise`、`exercise_set`、`exercise`、`measurement`、`user` 保持主干；其定义见 `src/db/schema/`。`exercise_set` 已有 `weight`、`reps`、`rpe`、`rest_time`、时间戳，但没有 RIR。`measurement` 有单位、记录时间、来源平台与外部 ID，可用其去重索引作为 HealthKit 导入的起点。健康来源行目前可能进入可选同步队列，需要单独隐私审计。

拟新增字段/表（列名为设计草案，实施前生成并审阅 Drizzle 迁移）：

| 表或改动 | 关键列与约束 | 用途 |
| --- | --- | --- |
| `exercise_set.rir` | 可空整数 0–10；旧记录为 `NULL` | 明确记录余力，不能把 RPE 直接冒充 RIR |
| `workout_exercise.notes` | 可空文本 | 动作备注，旧记录为 `NULL` |
| `fitos_plan_cycle` | `id`、`user_id`、`template_id`、`template_version`、`start_local_date`、`time_zone`、`rotation_cursor`、`status` | 用户本地周期实例；12 周模板只存公开规则 |
| `fitos_plan_session` | `id`、`cycle_id`、`week_index`、`weekday`、`session_key`、`status`、`workout_id?`；唯一 `(cycle_id, week_index, weekday)` | 周计划与实际 workout 关联；改期不改历史事实 |
| `fitos_plan_exercise` | `id`、`session_id`、`exercise_key`、`exercise_id?`、`sort_order`、`working_sets`、`reps_min/max?`、`seconds_min/max?`、`rest_min/max`、`rir_target?` | 计划处方与完成组分离，保留用户调整 |
| `fitos_progression_suggestion` | `id`、`cycle_id`、`exercise_key`、`basis_workout_ids_json`、`rule_id`、`proposed_change_json`、`status` (`pending/accepted/dismissed`)、`confirmed_at?` | 可解释建议；只在确认事务内修改未来计划 |
| `nutrition_food` | `id`、`user_id?`、`name`、`brand?`、`reference_quantity`、`unit`、`raw_cooked_status`、每参考量 kcal/蛋白/脂肪/碳水、`source_name`、`source_version?`、`estimated`、`updated_at` | 常用/自定义食物与可选数据库条目；保留来源 |
| `nutrition_meal` | `id`、`user_id`、`local_date`、`time_zone`、`meal_type` (`breakfast/lunch/dinner/snack`)、`eaten_at?`、`notes?` | 餐食容器；本地日期与时区可复算 |
| `nutrition_entry` | `id`、`meal_id`、`food_id?`、名称与每参考量营养**快照**、`quantity`、`unit`、`raw_cooked_status`、`estimated`、`source_name` | 后续食品库更新不改变历史餐食统计 |
| `nutrition_goal` | `id`、`user_id`、`effective_local_date`、kcal/蛋白/脂肪/碳水目标、`user_confirmed_at` | 目标版本化；用户授权后才生效 |
| `fitos_health_sample` | `id`、`user_id`、`metric`、`value`、`unit`、`observed_at_utc`、`source_bundle`、`external_id`、`imported_at`；唯一 `(user_id, metric, source_bundle, external_id)` | 仅在用户启用对应类型时保存 HRV、静息心率、睡眠等；缺失值不填零 |
| `fitos_ai_consent` | `user_id`、`scope`、`granted_at?`、`revoked_at?`、`model_mode` | 分析授权状态；云端模型密钥只在受控服务端 |

所有营养质量、体重和腰围数据均属于本地用户记录。若未来需要同步，须逐字段白名单、用户明确授权、传输加密与撤销机制。默认不把 `fitos_*` 或 `nutrition_*` 行加入现有 `sync_queue`。AI 摘要优先设备本地计算；向外部模型发送任何派生数据也需独立授权与可见的数据范围。

## 迁移与导入策略

1. 在真实 Fork 历史中从现有 `0020` 后创建增量 Drizzle schema 和迁移；先为可空列与新表落地，不改写已有 workout/measurement 数据，不更名 `skulpt.db`。
2. 建立稳定 `exercise_key` 到本地 `exercise.id` 的映射。无系统动作目录的纯离线安装用 `source='user'` 创建中文动作，避免依赖 SyncLayer。种子重复导入必须幂等；升级模板版本不得覆盖用户已编辑的计划。
3. 公开 JSON 只含通用动作处方、周安排和进阶规则。设备本地合并负重、身体测量与营养目标；永不把这些值写进公共种子、日志、测试快照或 Git。
4. 导入 HealthKit 时按需请求类型；保存来源、原始时间与单位，统一 UTC 存储并保留展示时区。用稳定样本 ID 去重，处理删除/撤权、重叠窗口、分页、设备时区变化和部分权限。HealthKit 读权限状态不可仅凭 `requestAuthorization` 返回值判断。
5. 实施 CSV/JSON 导出、加密或设备私有位置备份、恢复前预览/校验、可撤销授权入口与全量本地删除。恢复需幂等、版本兼容并避免重复 HealthKit 样本。
6. 每步先做数据库升级与回滚演练，再做 UI/Watch 桥接；Watch 不推断杠铃重量或组数，用户手动输入为准。

## 可执行测试用例设计

| 层级 | 用例与断言 |
| --- | --- |
| 种子 | 恰好 12 周，阶段为 1–2/3–6/7/8–11/12，四课动作顺序、工作组、次数/秒数、休息范围完全匹配；无私人测量与起始负重。 |
| 排程 | 四天固定周安排；三天模式轮换游标跨周延续，连续四课覆盖 Push/Pull/Legs/Upper，改期与缺课不导致永久跳过 Legs。 |
| 数据迁移 | 从 `0020` 数据库升级后旧 workout/set/measurement 数量和主键不变；新增 RIR/备注为 `NULL`；二次运行无重复表或种子。 |
| 训练进阶 | 仅全部工作组达上限且末组 RIR≥1 才建议加重；连续两次低于下限先给恢复检查；建议不改变计划，接受后才写入且可追溯。 |
| 营养 | g/份等单位换算、食物营养快照、未录入与零摄入区分、四餐和跨时区本地日聚合、估算来源标注。 |
| HealthKit | 重复/缺失 ID、同时间不同来源、睡眠跨夜、时区变化、部分授权、撤权、读取失败、无数据；任何错误不阻断手动训练。 |
| 隐私/导出 | 禁止未授权 AI 外传；关闭同步后新数据不进队列；CSV/JSON 往返与恢复去重；全量删除覆盖新增表及缓存；日志与快照不含个人数据。 |
| Watch 真机 | 电话/手表断连重连后组记录只写一次；重量/次数编辑、计时、训练结束与 HealthKit 授权及写入。需 macOS 构建和设备，Windows 静态测试不能替代。 |

## 下一阶段任务顺序

1. 确认目标 GitHub `fitos` 仓库 URL、Fork 关系与真实基线，再把本分支改动移植到其历史，建立可审阅 PR。
2. 安装 Bun 与锁定依赖，先跑上游 `bun run verify`，修复环境或上游基线问题；在 CI 中保留同一检查。
3. 实现训练种子导入、稳定动作映射、3/4 天排程和 RIR/备注迁移，做数据库升级与规则测试。
4. 实现营养表与录入、趋势和用户确认的目标调整；再实现导出、备份、恢复、删除与隐私设置。
5. 按需扩充 HealthKit 类型与来源模型，完成设备权限测试；接入 Watch 后做断连/重复同步验证。
6. 在明确授权下实现可解释 AI 周总结与确认式建议。最后复核中文默认、GPL、隐私声明和发布配置。

## 第一阶段验收边界

当前可验证：代码结构、静态种子、文档、Git 忽略边界与 Windows 可用的 Node 检查。未验证：FitOS Fork、原生编译、签名、HealthKit 真机读取/撤权、Watch 运行、App Store 发布。普通 Apple ID 是否具备相关签名能力也未核对；这些检查不要求现在购买设备或服务。

### 本机检查记录（2026-11-16，Windows）

| 命令 | 结果 |
| --- | --- |
| `node scripts/validate-fitos-seed.mjs` | 通过：12 周、4 课、23 个动作处方与私人字段缺席检查。 |
| `node --check scripts/validate-fitos-seed.mjs` | 通过：脚本语法检查。 |
| `git diff --check` | 通过：未发现补丁空白错误。 |
| `git check-ignore -v local/fitos/profile.json` | 通过：由 `.gitignore` 中 `/local/fitos/` 忽略。 |
| `npm run lint` | 未执行成功：`bunx` 不在 PATH。 |
| `npm run typecheck` | 未执行成功：未安装依赖，`tsc` 不在 PATH。 |
| `npm run test:ci` | 未执行成功：未安装依赖，`jest` 不在 PATH。 |
| iOS/watchOS 构建、签名、HealthKit 真机测试 | 未执行：本机 Windows，无 Xcode/macOS 构建环境与已确认的开发者签名配置。 |

本机检测到 Node.js 24.14.0、npm 11.9.0、Python 3.11.9；未检测到 Bun 或 `node_modules/`。恢复完整上游检查时先安装 Bun 1.3.14（CI 锁定版本），运行 `bun install --frozen-lockfile`，然后运行 `bun run verify`。这不是本阶段的通过结论。
