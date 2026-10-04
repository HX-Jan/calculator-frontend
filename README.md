# Calculator Frontend

在线体验：[Cloudflare 计算器](https://calculator.hongxiang-jan777.workers.dev)。前端静态资源、Python API 和 D1 数据库已部署到 Cloudflare，更新方法见[后端部署说明](https://github.com/HX-Jan/calculator-backend/blob/main/cloudflare/README.md)。

A responsive calculator interface with keyboard input, light/dark themes, server-provided calculation steps, and searchable paginated history.

The interface uses a restrained monochrome palette, flat keys and a compact two-column layout. Light mode is the default; dark mode remains available. Manrope and JetBrains Mono are bundled locally. See [design decisions](DESIGN.md); font licenses are included in `public/licenses`.

![Calculator local demonstration](docs/preview.png)

配套后端：[calculator-backend](https://github.com/HX-Jan/calculator-backend)。本项目由 AI 辅助实现与测试；请理解交互与接口代码，并按课程要求声明辅助范围。

## Run locally

Requires Node.js 22.12+ (tested with Node 24) and the backend on port 8000.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open http://127.0.0.1:5173. On macOS/Linux use `cp .env.example .env`. For repeatable installation after cloning, use `npm ci`.

`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000` in development and the current website origin in production. Set it in `.env` before starting or building for a separate API host. A separate backend must allow the frontend origin through `ALLOWED_ORIGINS`.

The frontend does not initialize a database. Start the backend; it creates its database table. Calculation results and history are retrieved through HTTP. Theme, calculator mode and angle-unit preferences are stored in localStorage; history and shared formulas come from the backend database.

## Use

- Type an expression or use the keypad. Enter computes; Escape clears the input.
- Supports `+ - * /`, UI `× ÷`, decimal numbers, parentheses and unary signs.
- Expand the steps below the keypad to see backend evaluation order.
- Search expression/result history; use arrows to move through 20-row pages.
- Reuse copies an expression into the input without computing it. Press Enter to compute again.
- Delete asks for confirmation and then sends the record id to the backend.
- The history is shared demo data. This version has no accounts or private histories.

## Architecture

`src/api.js` manages JSON HTTP requests and errors. `src/main.js` manages input, loading states, safe DOM rendering and history interactions. `src/style.css` implements responsive themes. `index.html` uses semantic form controls and accessible names.

The frontend never evaluates expressions or computes final results. Results remain strings, avoiding JavaScript numeric rounding. Server-provided text is inserted with `textContent`, not HTML injection. Pending calculation requests disable conflicting input. Failed history refreshes are explicitly marked as potentially stale.

## Build and verification

```powershell
npm run check
npm run build
npm run preview -- --port 5173
```

Stop the development server before previewing on the same port. Backend tests live in the backend repository. Manual browser acceptance: verify `0.1+0.2`, `(1+2)*3`, `3*-2`, invalid input, zero division, refresh persistence, record deletion, search, pagination, theme persistence and mobile layout. Stop the backend and confirm the UI cannot create a new result.

## Cloudflare deployment

The live frontend is served by Workers Static Assets alongside the Python API. Production requests use the same origin, so a separate API hostname is unnecessary. Build and deploy from the backend repository's `cloudflare` directory; see [deployment instructions](https://github.com/HX-Jan/calculator-backend/blob/main/cloudflare/README.md).

Do not put database passwords or login tokens in `VITE_*` variables, because frontend configuration is public. GitHub Actions checks tests and builds; it does not deploy the site automatically.

## 普通与科学模式

顶部普通／科学按钮切换键盘并记住选择，切换不清空输入或结果。科学模式提供平方、乘方、开方、倒数、阶乘、三角函数、对数与 π/e；DEG 表示角度、RAD 表示弧度，默认 DEG。改变角度单位会清除旧结果，需重新计算。

函数键优先包裹选区，否则包裹光标前的完整操作数；空位置自动插入成对括号。例如 `sin(30)`（DEG）为 `0.5`，`sin(pi/2)`（RAD）为 `1`。倒数键包裹操作数为 `1/(...)`，平方对完整操作数添加 `^2`。乘号必须明确输入。

科学表达式复用时自动展开科学键盘，恢复记录的角度单位。全部运算在后端完成。三角函数为约 15 位有效数字的近似计算；定义域错误不会保存记录。先升级后端，再发布此前端。


## 扩展科学功能

科学键盘使用 2nd 切换两页。新增 asin/acos/atan、sinh/cosh/tanh 及其反函数、abs、exp、cbrt、floor/ceil。反三角函数输出遵循 DEG/RAD；双曲函数及其反函数不使用角度单位。

双参数函数使用逗号分隔：`root(x,n)`（n 次方根）、`logbase(x,b)`（底 b）、`mod(x,y)`（余数符号跟随 x）、`perm(n,r)`、`comb(n,r)`。排列组合仅接受 `0 ≤ r ≤ n ≤ 1000` 的整数，结果仍受范围限制。负数仅支持整数奇次根。

EXP 输入 E，例如 `1.2E-3`；也接受小写 e。常量 e 单独使用，乘法需明确输入。百分号固定表示除以 100，`200+10%` 为 `200.1`，`200*10%` 为 `20`。

Ans 插入上次成功结果；MS 存储当前结果，MR 读取，MC 清除。Ans 和存储仅在当前页面会话保留，AC 不清除存储。所有数值运算仍通过后端。函数键优先包裹选区；双参数函数打开输入窗口，确认后生成完整表达式，按等号计算。

三角、反三角、双曲及反双曲函数为约 15 位有效数字的浮点近似；根和对数也可能产生舍入。仅支持实数。本次不含矩阵、复数、方程和统计模块。


## 连续计算与编辑体验

计算完成后，数字、小数点和常量开始新表达式；运算符接着当前结果计算。点击输入框或用方向键移动光标后，可继续编辑原表达式。未修改表达式时重复等号不重复保存历史。

函数键包裹选区或光标前完整操作数；没有操作数时自动配对括号。平方、立方、倒数、正负号在结果状态下直接提交后端运算。任意根、任意底对数、排列组合和取余通过双参数窗口输入，确认后按等号。取消不改变算式。

结果可复制原始十进制字符串，也可切换科学计数显示；显示切换不使用浮点数，不改变计算值。Ans、存储和连续计算始终复用原始值，长数以等值科学计数输入。网络或计算错误保留输入；所有实际计算仍调用后端。科学键盘适配 1366×768 桌面，手机端保留较大触控目标。

## 错误位置与编辑历史

算式错误会选中相关字符；缺少内容时将光标定位到插入位置。修改或撤销后清除旧错误标记，再次按等号由后端验证。

撤销／重做按钮支持最近 100 步输入修改，包括清空、函数包裹、粘贴和选区替换；快捷键为 Ctrl+Z、Ctrl+Y 或 Ctrl+Shift+Z（macOS 可用 Command）。新修改会清除重做分支，刷新页面会清空编辑栈。撤销仅恢复算式、光标和自动括号，不撤销数据库记录或存储数值，不自动重新计算。

## 历史记录操作

历史按本地日期分组，每条记录支持复制原始算式或完整结果。清除搜索按钮恢复全部记录并回到第一页。

“导出本页”下载当前已加载页（最多 20 条）的 CSV，搜索和分页结果均可导出；空结果、加载中或读取失败时不可导出。包含 ID、表达式、结果、角度单位和 UTC 时间。CSV 为 UTF-8 BOM 编码，表达式及结果带文本前缀单引号，以防表格软件执行公式或舍入长数字；需要原始无前缀文本时使用复制按钮。导出不改变数据库。


## 逐步化简展示

计算步骤默认折叠。展开后显示编号、运算名称和完整算式前后变化，浅灰背景及下划线标记正在运算的部分；三角及反三角步骤标记 DEG/RAD。括号整理可能单列一步，最终一行与主结果一致。步骤区注明数值可能经过舍入。

长算式可在单行内横向滚动，也可通过键盘聚焦。修改输入、切换角度或请求失败会清除旧步骤。前端 `steps-view.js` 只负责安全文本渲染和 UTF-16 范围高亮，不求值；后端缺少轨迹字段时回退到原步骤列表。历史复用仍需按等号生成新步骤。

## 共享公式库

新增“历史／公式”切换，默认历史。公式库提供圆面积、圆周长、勾股定理和二次函数求值；内置项可另存为自定义公式。自定义项可新增、按名称搜索、编辑和确认删除。公式保存在后端数据库，所有访问者共享；本版本没有账号或私有公式。

编辑时填写名称、公式，点击“识别参数”可设置中文名称；保存时也会自动识别。参数是单个小写字母（最多 8 个），e、pi 和函数名保留，乘号不可省略。名称和参数标签最多 40 字，公式最多 500 字。保存仅校验语法，因此 1/x 可以保存；实际定义域在使用时检查。

点击“使用”，参数可填 -3、1/3、sqrt(2) 等，不能互相引用。本次 DEG/RAD 对公式及所有参数生效。后端将参数加括号代入，再用原安全解析器计算，代入总长度仍限制 500 字符。成功后结果、步骤及完整算式回到主计算器，历史中保存代入式。重复等号不新增记录，连续计算和撤销沿用原有行为。

参数错误显示在字段下，公式整体错误显示在窗口底部，失败保留输入。共享公式有更新时间检查；若被他人修改，取消窗口、刷新列表并重新打开。删除公式不删除已有计算历史。请求期间禁止重复提交及关闭窗口，网络恢复后可重试。

界面逻辑集中在 `src/formula-library.js`，前端不识别变量或计算参数；后端先发布并初始化新表，再更新前端。公式库依赖新版后端，普通计算接口保持兼容。


## Current verification / 当前交付状态

功能基线核对于 2026-10-02：后端 CI 220 项通过（含 PostgreSQL），前端 12 项测试、语法及构建通过。[验证摘要](docs/VERIFICATION.md)。支持科学运算、逐步化简与共享公式库。公开 GitHub 仓库不代表已部署公网；公网入口尚待实际部署验收。

[项目结构与功能图 / Project overview](docs/OVERVIEW.md)
