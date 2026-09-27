# Clarity Calculator Frontend

A responsive calculator interface with keyboard input, light/dark themes, server-provided calculation steps, and searchable paginated history.

The interface uses a restrained monochrome palette, flat keys and a compact two-column layout. Light mode is the default; dark mode remains available. Manrope and JetBrains Mono are bundled locally. See [design decisions](DESIGN.md); font licenses are included in `public/licenses`.

![Clarity calculator local demonstration](docs/preview.png)

配套后端：[calculator-backend](https://github.com/HX-Jan/calculator-backend)。本项目由 AI 辅助实现与测试；请理解交互与接口代码，并按课程要求声明辅助范围。

## Run locally

Requires Node.js 22.12+ (tested with Node 24) and the backend on port 8000.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open http://127.0.0.1:5173. On macOS/Linux use `cp .env.example .env`. For repeatable installation after cloning, use `npm ci`.

`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000`. Set it in `.env` before starting or building. The backend must allow the frontend origin through `ALLOWED_ORIGINS`.

The frontend does not initialize a database. Start the backend; it creates its database table. Calculation results and history are retrieved through HTTP. Only theme preference is stored in localStorage.

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

## Deployment by the owner

Create a Render Static Site connected to this repository. Build command: `npm ci && npm run build`; publish directory: `dist`. Set `VITE_API_BASE_URL` to the backend HTTPS origin, then rebuild. Set the backend `ALLOWED_ORIGINS` to this site's origin. Public deployment is not automatically performed by this repository upload.

Do not put database passwords in `VITE_*` variables: they are public client-side configuration. See [Render static sites](https://render.com/docs/static-sites) and [code standards](codestyle.md).


## 普通与科学模式

顶部普通／科学按钮切换键盘并记住选择，切换不清空输入或结果。科学模式提供平方、乘方、开方、倒数、阶乘、三角函数、对数与 π/e；DEG 表示角度、RAD 表示弧度，默认 DEG。改变角度单位会清除旧结果，需重新计算。

函数键优先包裹选区，否则包裹光标前的完整操作数；空位置自动插入成对括号。例如 `sin(30)`（DEG）为 `0.5`，`sin(pi/2)`（RAD）为 `1`。倒数键插入 `1/(`，平方插入 `^2`。乘号必须明确输入。

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
