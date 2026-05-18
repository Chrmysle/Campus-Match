# 校园搭子匹配小程序 - Claude Code 开发上下文与规约

## 1. 项目愿景与学术底座 (Vision & Academic Foundation)
本应用是一款校园内“匹配合适搭子”的微信小程序（核心分类：学习/考研、游戏上分、健身运动、逛街吃饭娱乐）。
作为 AI 开发者，你在设计逻辑和算法时，必须严格参考并体现以下三篇底层学术文献的结论：

- **空间与时间同质性（硬过滤）**：参考 *McPherson et al. (2001) - Birds of a Feather: Homophily in Social Networks*。地理位置和日常作息是人际网络形成的物理边界。在算法层面，必须先通过校区、作息时间段进行“一票否决式”的硬过滤。
- **人格特质系统（软加权模型）**：参考 *Costa & McCrae (2010) - FFM and FFT in Interpersonal Psychology*。大五人格特质决定了双人互动（Dyads）的内在模式。用户性格通过大五简式量表映射为向量。
- **感知相似性优先（视觉呈现）**：参考 *Montoya et al. (2008) - Actual vs. Perceived Similarity*。在已有或正在建立的关系中，主观“感知到的相似性”比客观绝对相似更能带来吸引力。前端匹配成功后，必须高亮提炼并展示两人的“共同高光标签”（如：都爱去校区某食堂、都是DDL战士）。
- **精准匹配与标签可解释性**：匹配结果不仅要有分数，还要显示“共同高光标签”、“共享兴趣”和“作息/校区同步度”，让用户看得懂推荐逻辑。

> 备注：这三篇论文的原文和参考资料已经放在 `prompt` 文件夹内，请直接使用该目录中的材料作为开发依据。

---

## 2. 技术栈约束与平台红线 (Tech Stack & Restrictions)
Claude Code，在编写代码时你**必须严格遵守微信小程序原生开发规范**，严禁引入 Web 开发的惯性思维：

### 云开发 quickstart

这是云开发的快速启动指引，其中演示了如何上手使用云开发的三大基础能力：

- 数据库：一个既可在小程序前端操作，也能在云函数中读写的 JSON 文档型数据库
- 文件存储：在小程序前端直接上传/下载云端文件，在云开发控制台可视化管理
- 云函数：在云端运行的代码，微信私有协议天然鉴权，开发者只需编写业务逻辑代码

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

1. **环境限制**：
   - ❌ 绝对禁止使用 `window`, `document`, `location` 等浏览器 DOM/BOM API。
   - ❌ 绝对禁止在 UI 视图层使用 HTML 标签（如 `<div>`, `<span>`, `<a>`），必须使用小程序原生组件（如 `<view>`, `<text>`, `<scroll-view>`, `<button>`）。
2. **状态更新**：
   - 所有的视图层数据更新必须显式调用 `this.setData({ ... })`，切勿直接对 `this.data` 赋值修改。
3. **样式与响应式 (WXSS)**：
   - 优先使用 `rpx`（微信小程序响应式像素）作为页面尺寸单位。页面底色、卡片圆角请保持统一的精致校园风。
  - 前端风格目标为 **文艺新青年风格 + Liquid Glass（液态玻璃）质感**：强调温暖、自然与质感的视觉语言，具体要求：
    - 视觉基调：柔和暖色系与自然木色、低饱和马卡龙做点缀，整体偏文艺、清新、有温度。
    - 质感表达：采用 iOS26 提倡的 Liquid Glass 风格 —— 半透明磨砂玻璃层、轻微高光反射与柔和景深感（通过图层与 PNG 半透明贴图近似实现，避免使用不可用的浏览器特性）。
    - 边框与阴影：边框改为细腻的细线或轻微粗边（非极端黑色粗边），阴影使用低对比、高柔和度的投影或半透明层叠实现（在小程序中可用图像或多层 view 逼近）。
    - Emoji 使用：保留高密度趣味标签的想法，但改为适度点缀，优先用小徽章与微交互提升节奏感。
    - AI 名片与破冰标签：以对话气泡+玻璃质感卡片呈现，文案直白且富网感；卡片可带圆角、轻微半透明背景与柔和边框。
    - 性能与兼容：所有视觉效果必须在微信小程序原生组件上实现或通过资源贴图近似，禁止使用 `window`/`document` 或依赖浏览器-only API。
    - 示例元素说明：设计稿或参考元素可能包含超出小程序渲染能力的高级效果，实际开发应以“视觉还原”优先，通过图片资源或可用组件近似呈现。 

---

## 3. 项目目录结构规划 (Project Structure)
请严格按照以下微信小程序标准原生结构进行代码组织和迭代：
```text
miniprogram
├── app.js               # 全局逻辑
├── app.json             # 全局路由（按需动态分包/配置）
├── app.wxss             # 全局 Liquid Glass 青春校园风格设计系统（注入柔和投影、半透明磨砂、主色调）
│
├── config/              # 【核心配置层：拒绝硬编码】
│   ├── quizConfig.js    # 问卷题目字典（包含大五映射、Emoji映射、跳转分支逻辑）
│   └── vibeThemes.js    # 不同搭子类型的配色矩阵与动态破冰文案模板
│
├── components/          # 【高内聚、低耦合原子组件】
│   ├── ui/              # Liquid Glass 青春校园风格基础UI组件
│   │   ├── glass-button/ # Liquid Glass 按钮组件
│   │   └── vibe-badge/    # 带有 Emoji 的趣味标签组件
│   ├── quiz/            # 问卷核心组件
│   │   └── quiz-swiper/ # 动态卡片切题、多选、滑块组件（承载核心问卷交互）
│   └── match/           # 匹配流组件
│       ├── buddy-card/  # 匹配大厅的个人卡片（内含 AI 气泡名片展示）
│       └── ice-breaker/ # 匹配成功后的动态破冰锦囊组件
│
└── pages/               # 【纯净页面容器，逻辑由组件组装】
    ├── index/           # 匹配大厅（按分类路由，渲染对应的 buddy-card 流）
    ├── quiz/            # 问卷容器页（动态读取 config/quizConfig.js 渲染问卷）
    ├── profile/         # 个人中心（基于大五分数的雷达图/流派标签，支持修改垂直意向）
    └── chat/            # 双向盲选确认与联系方式解锁页（集成 ice-breaker 破冰指引）

```

---

## 4. 灵魂功能实现指引 (Core Engine Specifications)

### A. 配置驱动的 Emoji 趣味问卷 (Gamified Smart Quiz)

* **禁止行为**：禁止在页面 WXML 里写死任何一道题目。
* **要求**：所有题目、选项、对应的 Emoji 符号以及答题完毕后的动态跳转分支（如：选择游戏搭子后进入游戏专属问卷）必须全部抽离在 `config/quizConfig.js` 中。通过 WXML 的 `wx:for` 配合组件动态渲染，确保未来新增“搭子品类”时只需改动配置文件。
  * **问卷形式**：必须支持可滑动刻度选择，不能只做二元是非。问卷应以多档滑杆或分段刻度呈现，让用户从“很不匹配 / 普通 / 非常想要”中选择。

  ### 问卷结果、用户标签与可编辑策略 (Tags, Editable & Conflict Resolution)

  * **展示形式**：问卷完毕后系统将自动生成三类标签并在用户个人资料页与 `buddy-card` 上显示：
    - **Primary Tags（主标签，高置信）**：基于滑杆达到阈值的强关联标签（例如滑杆 ≥ 80），作为主要匹配信号。
    - **Degree Tags（带权重的程度标签）**：对每个兴趣/特质记录一个 0-100 的数值（由滑杆/量表映射），用于算法加权计算，可在匹配解释中展示具体分值。
    - **Suggested Tags（AI 建议）**：由大模型结合用户描述与行为推断出的补充标签，作为编辑建议呈现。

  * **用户可编辑性**：用户在 `profile` 页面可对 Tag 列表进行“增删/微调”操作：
    - 编辑不会直接修改原始问卷回答（滑杆值会保留作为历史证据）。
    - 用户编辑后，系统将生成一条 `tagOverride` 记录，并写入专门的 `user_tag_overrides` 集合，记录结构包含 `userId`, `tag`, `value`, `source`, `timestamp`。
    - 为了加速匹配，可在 `users` 表里额外维护一个可选 `customTags` 子字段作为缓存，内容与 `user_tag_overrides` 一致，优先读取时用作快速呈现。
    - 在后续匹配计算中，必须优先读取 `user_tag_overrides` 集合（或 `users.customTags` 缓存），并将其值作为最终权重。

  * **冲突与一致性策略**：当滑杆程度与用户手动修改发生冲突时：
    - 优先级：`userOverride` > `inferredDegree`（滑杆映射） > `suggestedTag`。
    - 若用户降低某高置信主标签（例如将“夜猫子”从 90 调到 20），系统将在下次即时重算（用户触发“立即更新匹配”或在下周一匹配周期时）使用用户修改的值，并在匹配解释中注明“基于用户手动调整”。
    - 为避免用户滥改导致匹配质量抖动，系统应在 UI 中显示“修改影响预览”（例如预计匹配分变化的即时提示）并记录修改历史，便于回退。

  ### 性别匹配偏好 (Gender Preference)

  * **字段定义**：在用户资料中新增 `genderPreference` 对象，允许以下结构：

```json
"genderPreference": {
  "type": "any",        // any | same | opposite | specific
  "targetGenders": [1,2] // 当 type = specific 时使用，推荐存储为数字数组
}
```

    - `any`：无偏好（默认）
    - `same`：优先同性
    - `opposite`：优先异性
    - `specific`：用户可自定义一个或多个目标性别（如对跨性别/非二元友好场景）

  * **前端交互**：在 `profile` 设置页提供显式选项组，默认 `any`，并在新用户引导中说明该设置会影响匹配池的硬过滤规则。

  * **匹配逻辑**：`genderPreference` 作为硬过滤或高优先级约束之一（取决于用户选择）：
    - 若 `type` 为 `same`，匹配云函数返回 `gender === currentUser.gender` 的候选人。
    - 若 `type` 为 `opposite`，返回 `gender !== currentUser.gender` 的候选人。
    - 若 `type` 为 `specific`，返回 `targetGenders` 数组中包含候选人 `gender` 的用户。
    - 若 `type` 为 `any`，则不做性别过滤。

  * **隐私提示**：性别偏好设置仅用于匹配逻辑，不在公开卡片上以可识别方式暴露，除非用户显式开启“显示偏好”开关。

  * **即时生效与回滚**：用户修改偏好后，系统可选择在下一次周一放榜时生效（默认）或允许用户点击“立即重新计算匹配”（触发一次性点对点重算）。

  * **问卷设计可参考以下工业与学术模式**：
    - 本问卷编写时，除了下面这些产品/模型，也要参考本说明开头提到的三篇学术论文，确保问卷既有学术底座，也有工业可用性。
    - 16Personalities：基于 MBTI/大五人格体系，将测试包装成可爱角色、进度条、滑块式答题，适合将结果转为“匹配百分比”。
    - BFI-10 / TIPI-10：短题量表设计，10 题甚至 5 题即可快速勾勒性格轮廓，适合控制小程序问卷篇幅。
    - Holland Codes (RIASEC)：职业兴趣分类可补充学术/竞赛搭子匹配，用“技能互补+角色分工”提高项目合作推荐效果。
    - Soul App：先选粗颗粒度标签，再通过情境题精细匹配，结合“定性标签 + 定量测验”。
    - Tinder / 探探：参考双向确认机制（Double Opt-in）和卡片上的“高光标签”展示方式，保护校园隐私并提升浏览效率。
    - 网易云音乐年度听歌报告 / 社交 H5：参考其网感文案和贴标签方式，将结果做成趣味性强的“社交货币”内容。

### B. AI 驱动的“校友微名片” (AI-Powered Bubble Profile)

* **业务流**：用户提交问卷和主观描述后，由后端/云函数调用大模型，产出一段 50 字以内充满“校园网感”的摘要（如：“✨ 拥有极高自律性的代码修仙党，打瓦稳定开麦不压力...”）。
* **字段规范**：保存在用户信息的 `aiSummary` 字段中。
* **视觉渲染**：在 `buddy-card` 组件的最上方，以 Liquid Glass 青春校园风格的“对话气泡”形式置顶高亮展示。

### C. 动态破冰小锦囊 (Dynamic Ice-breakers)

* **核心逻辑**：盲选成功（Double Opt-in）跳转至 `pages/chat/chat` 时，计算两个用户的 `specificTags` 与爱好的**交集（Intersection）**。
* **文案注入**：根据 `config/vibeThemes.js` 里的破冰模板动态渲染。例如：
  - 交集含 "Valorant" ➡️ 提示：“他也喜欢打瓦且习惯开麦，快用‘今晚进服吗’去轰炸他！”
  - 交集含 "早起鸟" ➡️ 提示：“检测到你们都是早起打卡人，明早不如约个食堂豆浆？”
  - 提取对方最新动态 ➡️ 提示：“他最近正在寻找下周五一起看 F1 的搭子，去聊聊迈阿密站吧！”

### D. 精准匹配算法要求 (Matching Precision)

* **硬过滤**：先按校区、作息时间段、垂直搭子类型进行严格过滤。
* **软权重**：再按大五人格向量、兴趣标签、行为偏好做加权匹配。
* **向量定义**：实际计算时可选用全部五维 N/E/O/A/C；若业务只需简化，可在算法中保留可选维度配置，避免与数据库 Schema 定义产生冲突。
* **主题一致性**：对“感知相似性”比“客观距离”赋更高权重，优先推送共享标签多、用户自评匹配度高的搭子。
* **可解释打分**：匹配结果必须输出“匹配分 + 解释标签”，例如“85 分 · 共同高光：夜猫子、游戏开黑、10 点后自习”。

---

## 5. 技术红线与平台约束 (Technical Restrictions)

* **微信原生红线**：只能使用原生组件（`view`, `text`, `image` 等），严禁 Web 标签，严禁使用 `window`/`document`。
* **响应式控制**：UI 元素及间距一律使用 `rpx`。
* **视觉风格基线**：本项目视觉方向为 **文艺新青年风格 + Liquid Glass（液态玻璃）质感**，实现时需遵循以下原则：
  - 以温暖、自然的色调为主，适度使用低饱和马卡龙色做点缀。
  - 采用半透明磨砂玻璃层、轻微高光和柔和景深来表达 Liquid Glass 质感；在小程序中优先使用图片资源或多层 view 叠加近似实现，避免依赖浏览器-only 特性。
  - 边框与阴影保持细腻和柔和，避免极端硬边与硬阴影。
  - Emoji 保持趣味点缀作用，但不应喧宾夺主，优先使用小徽章与微交互提升节奏感。
* **样式基线**：全局基础样式（色彩、圆角、玻璃卡片样式）应统一抽离在 `app.wxss`，便于全项目复用。

## 6. Claude Code 协作命令与节奏 (Workflow Vibe)

* **Incremental & Isolated（隔离开发）**：Claude 每次只允许修改或创建一个独立的文件/组件，完成必须附带控制台打桩（`console.log`）或页面预览的测试方案。
* **Git Commit 规范**：完成一个组件的编写后，Claude 需自动或提示进行微小的 Git 提交，保持版本树清晰。

* **说明书定位**：这份说明书主要是构建思路和实现想法，不是不可更改的死板规范。如果你在开发实现过程中发现某一个结构体、字段或业务流程需要补充或修改，可以根据实际需求灵活调整，优先保证功能可行性和架构一致性。

---


## 7 核心业务流程与时序引擎 (Business Workflow & Match Engine)

Claude Code，在编写全局状态管理、云函数定时任务和页面跳转逻辑时，必须严格执行以下闭环业务流程：

```text
[用户进来] ➡️ [校园邮箱验证登录] ➡️ [动态趣味问卷] ➡️ [AI生成微名片/标签落库] 
                                                                    ⬇️
[双向联系方式解锁] ⬅️ [Tinder式三档盲选判定] ⬅️ [周一统一放榜发放候选人] ⬅️ [进入匹配等待池]

```

### A. 校园邮箱登录与身份鉴权 (Campus Authentication)

* **流程要求**：用户首次进入，必须通过学校专属邮箱（如 `@buaa.edu.cn`）进行登录验证。
* **编码规范**：云数据库中用户表必须设立 `isVerified: boolean` 字段。未通过邮箱验证的用户，在路由拦截器中必须重定向至登录页，无法进入问卷和匹配池，确保纯净、安全的校园环境。

### B. “周一见”延迟放榜机制 (The "Monday Reveal" Mechanism)

* **学术依据**：参考社会学延迟满足与群体同步性效应。即时匹配容易导致用户快速挑剔疲劳。通过“按周开榜”，能营造强烈的校园仪式感，并在周一形成自发性的社交话题传播。
* **编码规范**：
* 用户完成问卷后，用户表中保持 `userStatus` 为 `active` 或 `verified`，是否已放榜由本周 `match_pool.revealed` 字段决定。
* **定时触发器（云函数）**：每周一 21:00，云函数自动运行匹配算法。计算完成后，将当前周 `match_pool` 的 `revealed` 字段置为 `true`，并向用户推送微信订阅消息。



### C. 科学候选人数控制 (Optimal Candidate Count)

* **学术依据**：根据经典的 *Bounded Rationality (有限理性)* 与 *Choice Overload (选择过载)* 心理学研究。当可选项过多时，人类往往会放弃选择或对选择结果极度不满意。
* **算法红线**：Claude Code 在编写匹配云函数时，**每个人每周最多只能发放 3 到 5 个候选人卡片**。
* **数量裁决**：
* **学习/学术搭子**：精准推送 **3人**（追求极致的习惯与时间契合度，防止信息过载）。
* **娱乐/吃饭搭子**：推送 **5人**（适度放宽限制，引入偶发性惊喜）。


### D. Tinder 式“三档意向盲选”机制 (Three-Tier Blind Selection)

* **前端交互（对齐 Liquid Glass 青春校园风格）**：当周一放榜后，用户进入匹配大厅，会看到 3-5 张候选人卡片（以堆叠卡片流呈现）。用户必须对每张卡片做出明确选择，才能解锁下一张：
1. **💚 感兴趣 (Highly Interested)**：极其同频，非常渴望结交。
2. **🤝 可以认识 (Open to Meet)**：觉得还不错，可以先聊聊看。
3. **❌ 不感兴趣 (Pass)**：硬性指标不符，直接滑过。


* **状态机的状态转移逻辑（云数据库设计）**：
* 用户的投票结果保存在 `match_actions` 集合中（包含 `fromUser`, `toUser`, `actionType`）。
* **双向盲选（Double Opt-in）撮合规则**：
* 双方均选择 💚 或 🤝 ➡️ **匹配成功**！
* 一方 💚 一方 🤝 ➡️ **匹配成功**！
* 任意一方选择 ❌ ➡️ 匹配失败，双方互相在列表隐藏。

* **实时判定**：每次用户提交投票后，前端应调用云函数 `checkMatch`，实时检测对方是否也已提交肯定票。若双方已达成双向选择，则立即写入 `relationships` 并推送通知。

### E. 匹配成功后的联系方式解锁与破冰 (Unlock & Ice-Breaking)

* **流程要求**：只有达成上述“双向盲选成功”判定后，两人的状态才会变为 `"matched"`，此时 `pages/chat/chat` 页面解除锁定。
* **视觉展示**：
* 页面显式渲染两人的微信微信号/联系方式。
* 底部**强制置顶注入**文档第 3 节 B 和 C 规定的【AI校友微名片】与【动态破冰小锦囊】，消除加微信第一句聊什么的社交尴尬。


## 8 关系阻断、安全盾与惩罚机制 (Data Isolation & Safe Shield System)

Claude Code，在设计云数据库集合关系（如 `relationships`、`blacklists`、`reports`）以及编写下一轮匹配计算云函数时，必须严格执行以下去重与安全策略：

### A. 历史匹配状态隔离（不重复推送原则）
- **核心逻辑**：只要用户对某张卡片做出了选择，该候选人在未来的周一放榜中**绝对不能**再次出现。
- **状态过滤红线**：在云函数运行周一匹配算法时，计算匹配池的初始查询必须通过 `Not In` 或 `Lookup` 聚合排除掉以下两类人：
  1. **已交互过的人**：在 `match_actions` 中，当前用户已经对其投递过 💚、🤝 或 ❌ 的所有 `toUser`。
  2. **已达成匹配的人**：在 `relationships` 集合中，双方关系状态处于 `"matched"` 或者是历史已解锁状态的人。

### B. 校园黑名单系统 (Blacklist Interruption)
- **业务场景**：即使双方已经盲选成功解锁了联系方式，用户由于后续接触发现不合、或由于现实原因，可以随时在聊天页或个人卡片上选择【解除匹配并拉黑】。
- **数据流转移**：
  - 当用户点击“拉黑”时，系统向云数据库 `blacklists` 集合插入一条记录：`{ blocker: UserA, blocked: UserB, timestamp: Date }`。
  - **即时切断**：一旦拉黑记录生成，两人的 `relationships` 状态立刻置为 `"severed"`（关系断裂），`pages/chat/chat` 中的联系方式和聊天入口对双方**即时关闭、永久隐藏**，确保物理隔离。

### C. 校园垃圾内容与行为投诉系统 (User Report & Safe Sandbox)
- **业务规范**：针对发布违规介绍、虚假邮箱、骚扰、广告等行为，提供 Liquid Glass 青春校园风格的边框【安全盾投诉弹窗】。

### D. 被投诉者的智能限制与惩罚算法 (Behavioral Sanction Engine)
为维护纯净的校园网络，Claude 必须在用户表 users 中加入 violationCount: number（违规次数）和 userStatus: "normal|restricted|banned" 字段。当触发拉黑或投诉时，自动激活以下惩罚逻辑：

高频拉黑警告：若一个用户在单周内被超过 3名 不同的校友“拉黑”，系统自动将其 userStatus 转为 "restricted"（限制态）。

投诉核实惩罚（熔断机制）：一旦管理员在后台将投诉状态改为 "resolved"（核实违规）：

- 🌟 全池熔断：该违规用户在 users 表中的匹配池等待状态永久切断，下周一放榜时，其不会出现在任何人的推荐名单里（彻底隐身）。

- 🌟 全线禁言：清除该用户当前所有已达成的 "matched" 联系方式展示，界面直接弹窗 Liquid Glass 风格警告框："🚨 账户因遭遇多起违规投诉已被冻结，请联系校园管理员核实。"

## 9. 云数据库集合设计 (Cloud Database Schema Specifications)

Claude Code 在编写全栈数据流时，必须严格遵守以下 NoSQL 集合（Collections）的字段命名与类型定义，严禁凭空伪造字段：

### A. `users`（用户主表）
```json
{
  "_id": "string (openid)",
  "userId": "string (student_id / 24373460)",
  "email": "string (*@buaa.edu.cn)",
  "gender": 1,                   // 1:男, 2:女
  "genderPreference": {
    "type": "any",             // any | same | opposite | specific
    "targetGenders": [1, 2]      // 当 type = specific 时使用
  },
  "campus": "string",            // 校区：学院路校区 / 沙河校区
  "schedule": "string",          // 作息：早起鸟 🦅 / 夜猫子 🦉
  "targetVibe": "string",        // 本周意向：学习 / 游戏 / 健身 / 娱乐
  "quantitativeScores": {       // 底层定量向量（锁定，不可前端直改），字段可扩展
    "bigFive": { "N": 0.0, "E": 0.0, "O": 0.0, "A": 0.0, "C": 0.0 },
    "vibeWeights": { "openMic": 0, "tryhard": 0 }
  },
  "customTags": {               // 可选缓存，用于加速展示/匹配
    "tagValues": { "nightOwl": 90 }
  },
  "displayTags": ["string"],    // 表层展示标签（用户完全可见、可随时增删修改）
  "aiSummary": "string",         // AI 气泡微名片内容（50字内）
  "encryptedContact": "string",  // 加密存储的联系方式（微信/手机号）
  "isVerified": false,           // 校园邮箱验证状态
  "violationCount": 0,          // 违规被投诉/拉黑计数
  "userStatus": "normal",        // normal:正常, restricted:风控限制, banned:封禁
  "createdAt": "date",
  "updatedAt": "date"
}
```

### A1. `user_tag_overrides`（用户标签覆盖记录表）
```json
{
  "_id": "string",
  "userId": "string (openid)",
  "tag": "string",
  "value": 90,
  "source": "manual|ai_suggestion",
  "timestamp": "date"
}
```

说明：`user_tag_overrides` 应作为 `users.customTags` 的权威来源，匹配计算时优先读取该集合；`users.customTags` 仅作为可选缓存，方便前端快速渲染。

说明：以上 `users` 模式为推荐字段集合，不必写得过死；团队可根据匹配需求自由添加字段，但请遵循以下原则：

- 命名风格请保持一致（推荐 camelCase）。
- 新增量化字段应在文档中记录映射说明（单位、取值范围、是否参与硬过滤/软权重）。
- 云函数应对新增字段保持兼容性（容错读取与默认值）。

B. `match_actions`（Tinder式盲选投票记录表）
```json
{
  "_id": "string",
  "fromUser": "string (openid)",
  "toUser": "string (openid)",
  "actionType": "string",        // HEART(💚感兴趣) / MEET(🤝可以认识) / PASS(❌不感兴趣)
  "weekLabel": "string",         // 时间周期标签，格式如: "2026W21"
  "timestamp": "date"
}
```
说明：用户对同一候选人重复投票时，应覆盖之前的 `match_actions` 记录，而不是追加新记录。建议以 `fromUser` + `toUser` + `weekLabel` 作为唯一约束，保证最新投票结果生效。
C. match_pool（每周匹配结果放榜存储表）JSON{
  "_id": "string",
  "weekLabel": "string",         // 格式如: "2026W21"
  "userId": "string (openid)",   // 接收推荐的目标用户
  "candidates": [                // 数量随 targetVibe 动态决定；一般学习/学术类推荐 3 人，娱乐/游戏类推荐 5 人
    {
      "candidateId": "string",   // 候选人 openid
      "score": 85,               // 综合匹配分
      "highlightTags": ["夜猫子 🦉", "Valorant 🎮"], // 共同高光标签（可解释性支持）
      "scheduleSync": true,      // 作息硬过滤同步状态
      "campusSync": true         // 校区硬过滤同步状态
    }
  ],
  "revealed": false,             // 本周卡片是否已开榜曝光给该用户
  "completedSelection": false    // 该用户是否已对本周候选人全部盲选完毕
}
D. relationships（盲选达成或断裂的关系链表）JSON{
  "_id": "string",
  "userA": "string (openid)",
  "userB": "string (openid)",
  "status": "string",            // matched(盲选双向成功解锁) / severed(事后拉黑断裂)
  "matchedAt": "date",           // 解锁时间
  "severedAt": "date"            // 拉黑断裂时间
}
说明：匹配成功时写入 `userA` 和 `userB` 应按 openid 字典序排序，避免出现 `(A,B)` 与 `(B,A)` 两条等价记录，便于后续查询与去重。
E. blacklists（用户主动拉黑关系表）JSON{
  "_id": "string",
  "blocker": "string (openid)",
  "blocked": "string (openid)",
  "timestamp": "date"
}
F. reports（校园沙箱安全投诉表）JSON{
  "_id": "string",
  "reporter": "string",
  "targetUser": "string",
  "reasonType": "string",        // 骚扰 / 广告 / 虚假邮箱 / 其他
  "evidenceText": "string",
  "evidenceImages": ["string"],  // 云存储 FileID 数组
  "status": "pending",           // pending:待处理, resolved:已核实惩罚
  "timestamp": "date"
}
## 10. 云函数清单与触发时机 (Cloud Functions Directory)

Claude Code 必须严格按照以下清单组织云端业务逻辑，杜绝将敏感的撮合与解密写在小程序前端。示例云函数与职责如下：

- `weeklyMatchEngine` — 定时触发（Cron，每周一 21:00）
  1. 将旧周期记录迁移至 `match_pool_history` 集合，然后清空本周池重新生成，避免 `match_pool` 中的历史数据与本周推荐混淆。
  2. 运行学术算法：硬过滤（校区/作息/性别偏好）+ 软权重加权（大五向量、标签权重）。
  3. 该云函数可能处理大量用户，建议部署时将 `timeout` 设置为 60 秒以上，避免在大规模匹配运算时被超时中断。
  4. 自动排除历史交互/已匹配/已拉黑用户。
  4. 计算并写入当前周的 `match_pool`，候选人数量根据 `targetVibe` 动态确定，学习/学术类建议 3 人，娱乐/游戏类建议 5 人。
  5. 若需要保留历史，可额外规划 `match_pool_history` 集合，避免在 `match_pool` 内直接保存过期记录。

- `generateAiSummary` — 用户提交问卷/主观介绍时触发（或由前端调用云函数）
  - 调用云端大模型接口，传入滑杆数值与文本，异步生成 50 字以内的 `aiSummary` 并写入 `users` 表。
  - 推荐使用微信云开发 `cloud.openapi` 或可信第三方 HTTP 服务。示例伪代码：

```javascript
exports.main = async (event) => {
  const payload = {
    model: 'deepseek-v4-flash',
    prompt: `请根据以下用户问卷和自我介绍，生成一段 50 字以内的校园社交摘要：\n${event.quizData}\n${event.bio}`,
    max_tokens: 120,
    temperature: 0.7
  };

  const response = await cloud.openapi.ai.createChatCompletion({
    ...payload,
    timeout: 3000
  });

  const aiSummary = response.choices?.[0]?.message?.content?.trim() || '';
  await db.collection('users').doc(event.userId).update({ aiSummary });
  return { aiSummary };
};
```

- `sendWeeklyNotify` — 由 `weeklyMatchEngine` 完成后触发
  - 使用微信订阅消息接口向所有当前周 `match_pool` 尚未完成放榜的用户发送周一开榜提醒（模板 ID 从 `miniprogram/config/subscribeConfig.js` 读取）。

- `resolveReport` — 管理员在控制台核实投诉时触发
  - 将被投诉用户状态改为 `restricted` 或 `banned`，并执行熔断与禁言等惩罚逻辑。

- `unlockContact` — 当判定盲选达成双向 Opt-in 时触发，由后端解密并下发联系方式
  - 从 `users` 表读取 `encryptedContact`，在云端解密并仅返回前端即时渲染，禁止前端本地明文缓存。

## 11. 安全机制与架构边界约束 (Security & Interception Constraints)

D. **异常处理策略**
- 云函数操作必须具备重试/幂等保障。对 `weeklyMatchEngine`、`generateAiSummary`、`sendWeeklyNotify` 等关键流程，建议：
  - 只对幂等读写操作重试，避免重复写入候选记录。
  - 对外部订阅消息接口失败时，优先记录失败日志，并在 5 分钟后重试一次；若仍失败，则标记为 `notifyFailed` 并在后台人工补发。
  - 对 AI 接口超时或返回异常，使用 `aiSummary = ''` 作为降级结果，并触发告警以便运维检查。
- 所有云函数应记录 `errorCode`、`errorMessage`、`event` 以及 `timestamp`，便于问题追溯。

A. **敏感联系方式加密存储红线**
- 用户的微信号、手机号等联系方式在数据库中必须处于密文状态。前端提交由云函数在后端加密后写入 `encryptedContact`。
- 只有当 `relationships` 状态为 `matched` 时，调用 `unlockContact` 云函数才能返回解密后的明文。

B. **订阅消息模板配置**
- 禁止在代码中硬编码模板 ID。请使用 `miniprogram/config/subscribeConfig.js`：

```javascript
module.exports = {
  WEEKLY_REVEAL_TEMPLATE_ID: 'WX_TEMPLATE_ID_HERE' // 周一放榜通知模板ID
};
```

C. **小程序路由拦截器实现规约**
- 微信小程序没有 Web 的路由守卫。必须在 `app.js` 的 `globalData` 中维护 `isVerified` 状态，并在关键页面的 `onLoad`/`onShow` 中显式检查，若未验证则使用 `wx.reLaunch` 强制重定向到登录页。小程序虚拟“路由拦截器”实现规约微信小程序没有传统的 Web 路由守卫。为了完美实现“未验证邮箱拦截”，Claude 必须采用以下原生组合方案：在 app.js 的 globalData 中维护 isVerified 状态。抽象一个全局公共检查函数或利用 Behavior。在 pages/index/index（大厅）和 pages/quiz/quiz（问卷）的 onShow 或 onLoad 生命周期中，优先读取全局状态。若 isVerified === false，严格显式调用 wx.reLaunch({ url: '/pages/login/login' }) 强制重定向，拒绝写出 router.beforeEach 等无法在小程序运行的伪代码。
12. 候选人卡片堆叠交互细节 (Card Swiper Interaction Specs)在开发 components/match/buddy-card/ 组件时，由于其是核心交互高光，视觉与手势必须符合以下体验：物理点击驱动：用户对卡片做出的 💚、🤝、❌ 操作，统一由卡片下方的 Liquid Glass 风格按钮点击触发。动效反馈：当用户点击动作按钮后，当前卡片必须触发带有物理方向的“飞出动画”。建议使用小程序原生 `wx.createAnimation` 或 `this.animate()` 实现动画过渡，例如：点击 ❌ 时当前卡片向右平移 `300rpx` 并同时渐隐，动画结束后更新 `candidates` 数组索引；下一张卡片可从下方平滑滑入。

手势辅助（可选）：支持基础的轻微左右滑动手势（使用 `<movable-view>` 组件），但最终判定以按钮点击和卡片飞出动画为核心。剩余卡片计数器：卡片层顶部或底部必须常驻一行大粗体数字（例如："✨ 本周还剩 3 位宝藏校友待解锁..."），利用 `match_pool` 中 `candidates` 数组的索引和未操作剩余数量进行动态渲染，极具通关式趣味。