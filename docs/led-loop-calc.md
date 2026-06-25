# LED Loop Compensation Calculator — 计算逻辑文档

## 概述

LED 驱动 Boost 拓扑的环路补偿分析工具。
- 计算功率级传递函数的零极点
- Bode 图（增益 + 相位）频率扫描
- 穿越频率和相位裕度自动搜索
- 支持多参数组叠加对比

## 输入参数

| 参数 | 符号 | 单位 | 默认值 | 说明 |
|------|------|------|--------|------|
| Vin | V_IN | V | 9 | 输入电压 |
| Vo | V_O | V | 24 | 输出电压（LED 串总正向压降） |
| Io | I_O | A | 1 | 输出电流 |
| n_led | n | 颗 | 8 | LED 数量 |
| L_uH | L | µH | 22 | 电感值（输入 µH，内部转 H） |
| Co_uF | C_O | µF | 5 | 输出电容（输入 µF，内部转 F） |
| Resr_mOhm | R_ESR | mΩ | 10 | 电容 ESR（输入 mΩ，内部转 Ω） |
| r_per_ohm | R_PER | Ω/颗 | 0.25 | 每颗 LED 等效电阻 |
| Rs_mOhm | R_S | mΩ | 200 | 采样电阻（输入 mΩ，内部转 Ω） |
| Cs_uF | C_S | µF | 10 | 采样电容（输入 µF，内部转 F） |
| Ri | R_I | V/A | 0.32 | 电流采样增益 |
| gm_uA_V | g_m | µA/V | 265 | EA 跨导（输入 µA/V，内部转 A/V） |
| Rc_kOhm | R_C | kΩ | 1 | 补偿电阻（输入 kΩ，内部转 Ω） |
| Cc_nF | C_C | nF | 10 | 补偿电容（输入 nF，内部转 F） |
| fsw_kHz | F_SW | kHz | 400 | 开关频率 |
| td_ns | t_d | ns | 400 | 等效延迟时间（输入 ns，内部转 s） |

### 单位转换

```
L = L_uH × 1e-6          // H
Co = Co_uF × 1e-6        // F
Resr = Resr_mOhm × 1e-3  // Ω
Rs = Rs_mOhm × 1e-3      // Ω
Cs = Cs_uF × 1e-6        // F
gm = gm_uA_V × 1e-6      // A/V
Rc = Rc_kOhm × 1e3       // Ω
Cc = Cc_nF × 1e-9        // F
td = td_ns × 1e-9        // s
```

## 计算流程

### Step 1: 基本量

```
D = 1 - Vin / Vo                              // 占空比
R_LED = n_led × R_PER                         // LED 串总等效电阻
```

### Step 2: 零极点频率（角频率，rad/s）

**系统增益**:
```
K_sys = g_m × Vin × R_S / (R_I × C_C × (V_o + I_o × R_LED))
```

**零点**:
```
ω_cz = 1 / (R_C × C_C)                       // EA 补偿零点
ω_bz = 1 / (R_LED × C_O)                     // LED 负载零点
ω_RHP = (1 - D)² × V_o / (L × I_o)           // 右半平面零点
ω_del = 2 / t_d                               // 延迟等效零点
```

**极点**:
```
ω_p1 = (V_o + I_o × R_LED) / (V_o × (R_LED + R_ESR) × C_O)  // 负载极点
ω_bp = 1 / (R_S × C_S)                       // 采样极点
ω_del = 2 / t_d                               // 延迟等效极点（与零点共用）
```

### Step 3: 传递函数求值

传递函数模型：

```
T(s) = (K_sys / s) × [(1+s/ω_cz)(1+s/ω_bz)(1−s/ω_RHP)(1−s/ω_del)]
       / [(1+s/ω_p1)(1+s/ω_bp)(1+s/ω_del)]
```

用复数算术求 T(jω)（纯实部 `re` + 纯虚部 `im`）：

```javascript
// 复数乘法: (ar,ai) × (br,bi) = (ar·br − ai·bi, ar·bi + ai·br)
// 复数除法: (ar,ai) / (br,bi) = ((ar·br+ai·bi)/d, (ai·br−ar·bi)/d), d=br²+bi²

s_im = ω  // 因为 s = jω，实部为0

n1 = (1, s_im / ω_cz)      // EA 零点
n2 = (1, s_im / ω_bz)      // LED 零点
n3 = (1, -s_im / ω_RHP)    // RHP 零点（注意负号）
n4 = (1, -s_im / ω_del)    // 延迟零点（注意负号）

d1 = (1, s_im / ω_p1)      // 负载极点
d2 = (1, s_im / ω_bp)      // 采样极点
d3 = (1, s_im / ω_del)     // 延迟极点

numerator = n1 × n2 × n3 × n4
denominator = d1 × d2 × d3

K_factor = (0, -K_sys / s_im)  // 积分器 + 负号

T(jω) = K_factor × numerator / denominator
```

### Step 4: Bode 图数据

对数频率扫描（默认 100 Hz ~ 5 MHz，500 个点）：

```
for i = 0 to pts:
    f = 10^(log10(fMin) + (log10(fMax) - log10(fMin)) × i / pts)
    ω = 2π × f
    (re, im) = evalT(ω, result)
    gain_dB = 20 × log10(√(re² + im²))
    phase_deg = atan2(im, re) × 180 / π
```

### Step 5: 穿越频率和相位裕度

二分搜索（60 次迭代）找到 |T(jω)| = 0 dB 的频率：

```
fLow = 10, fHigh = 1e7

for iter = 1 to 60:
    fMid = √(fLow × fHigh)
    |T(j·2π·fMid)|_dB = ?
    if > 0 dB: fLow = fMid
    else:      fHigh = fMid

fc = √(fLow × fHigh)           // 穿越频率
phase_at_fc = atan2(im, re) × 180 / π
phase_margin = 180 + phase_at_fc
```

## 输出结果

### 标量结果

| 输出 | 说明 |
|------|------|
| D | 占空比 |
| K_sys | 系统增益 |
| R_LED | LED 串总电阻 (Ω) |
| wz_cz | EA 零点角频率 (rad/s) |
| wz_bz | LED 零点角频率 (rad/s) |
| wz_RHP | RHP 零点角频率 (rad/s) |
| wz_del | 延迟零点角频率 (rad/s) |
| wp_p1 | 负载极点角频率 (rad/s) |
| wp_bp | 采样极点角频率 (rad/s) |
| wp_del | 延迟极点角频率 (rad/s) |
| fc | 穿越频率 (Hz) |
| phaseMargin | 相位裕度 (°) |
| phase | 穿越频率处的相位 (°) |

### 零极点频率显示（转 Hz）

```
f = ω / (2π)
显示格式：>= 1MHz → "x.xx MHz"，>= 1kHz → "x.x kHz"，其他 → "x.x Hz"
```

### 波形数据（用于绘图）

Bode 图数据（500 个点，对数频率）：

| 波形 | X轴 | Y轴 | 说明 |
|------|-----|-----|------|
| 增益曲线 | 频率 (Hz) | 增益 (dB) | 100 Hz ~ 5 MHz |
| 相位曲线 | 频率 (Hz) | 相位 (°) | 100 Hz ~ 5 MHz |
| 0 dB 参考线 | 频率 (Hz) | 0 | 水平虚线 |
| -180° 参考线 | 频率 (Hz) | -180 | 水平虚线 |

### 多参数组对比

支持同时计算多组参数，每组独立计算 Bode 和穿越频率。
- 可新增/复制/删除参数组
- 图表中每组用不同颜色绘制
- 零极点表格并排对比

### 图表展示建议

1. **增益 Bode 图**: ScatterChart, X轴对数, Y轴 dB, 各参数组不同颜色 + 0dB 虚线
2. **相位 Bode 图**: ScatterChart, X轴对数, Y轴 -270°~90°, 各参数组不同颜色 + -180° 虚线
3. **零极点表格**: 各参数组的 ω_cz, ω_bz, ω_RHP, ω_p1, K_sys, D, PM
4. **穿越频率卡片**: fc (Hz/kHz/MHz) + 相位裕度 (°)，颜色编码（≥45° 正常，30~45° 警告，<30° 危险）

### 传递函数参考（页面底部显示）

```
T(s) = (K_sys / s) · [(1+s/ω_cz)(1+s/ω_bz)(1−s/ω_RHP)(1−s/ω_del)]
       / [(1+s/ω_p1)(1+s/ω_bp)(1+s/ω_del)]

K_sys = g_m,ea · V_in · R_s / [R_i · C_c · (V_o + I_o · R_LED)]

零点: ω_cz = 1/(R_c·C_c),  ω_bz = 1/(R_LED·C_o),  ω_RHP = (1−D)²·V_o/(L·I_o)
极点: ω_p1 = (V_o + I_o·R_LED) / [V_o·(R_LED+R_esr)·C_o],  ω_bp = 1/(R_s·C_s)
```
