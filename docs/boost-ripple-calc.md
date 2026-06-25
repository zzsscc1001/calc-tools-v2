# Boost Ripple Calculator — 计算逻辑文档

## 概述

两相交错非同步 Boost 输出纹波的时域仿真。
- 自动判定 CCM/DCM
- 180° 相位交错
- 输出纹波 = 电容纹波 + ESR 纹波

## 输入参数

| 参数 | 符号 | 单位 | 默认值 | 说明 |
|------|------|------|--------|------|
| Vin | V_IN | V | 12 | 输入电压 |
| Vout | V_OUT | V | 24 | 输出电压 |
| Iout | I_OUT | A | 3 | 输出电流 |
| fsw | F_SW | kHz | 300 | 开关频率（输入 kHz，内部转 Hz） |
| eta | η | - | 0.92 | 效率 |
| L | L | µH | 10 | 电感值（输入 µH，内部转 H） |
| Cout | C_OUT | µF | 47 | 输出电容（输入 µF，内部转 F） |
| ESR | ESR | mΩ | 15 | 电容等效串联电阻（输入 mΩ，内部转 Ω） |
| Vd | V_D | V | 0.5 | 二极管正向压降 |
| alpha | α | - | 0.5 | 相1电流占总输入电流的比例（0~1） |

### 单位转换

```
fsw_Hz = fsw_kHz × 1000
L_H = L_uH × 1e-6
Cout_F = Cout_uF × 1e-6
ESR_Ohm = ESR_mOhm × 1e-3
```

## 计算流程

### Step 1: 基本稳态量

```
T = 1 / fsw
D = 1 - (Vin × η) / (Vout + Vd)        // 占空比
Iin_total = (Vout × Iout) / (Vin × η)   // 总输入电流
IL1_avg = Iin_total × α                  // 相1 平均电感电流
IL2_avg = Iin_total × (1 - α)           // 相2 平均电感电流
ΔIL = (Vin × D × T) / L                 // 电感纹波电流（峰峰值）
```

### Step 2: 单相工作模式判定与电流波形

对每相（Phase 1 和 Phase 2），独立判定 CCM/DCM：

**CCM 判定条件**: `IL_avg > ΔIL / 2`

**CCM 模式**:
```
I_peak = IL_avg + ΔIL / 2
I_valley = IL_avg - ΔIL / 2
T_on = D × T
T_off2 = (1 - D) × T
```

**DCM 模式**:
```
k = L × (1/Vin + 1/(Vout + Vd - Vin)) / T
I_peak = √(2 × IL_avg / k)
T_on = I_peak × L / Vin
T_off2 = I_peak × L / (Vout + Vd - Vin)
I_valley = 0
```

**单相二极管电流波形 Id(t)**（一个周期，N=2000 个采样点，dt = T/N）:

CCM:
```
t < T_on:          Id = 0
T_on ≤ t < T:      Id = I_peak - ((t - T_on) / (T - T_on)) × (I_peak - I_valley)
```

DCM:
```
t < T_on:                    Id = 0
T_on ≤ t < T_on + T_off2:   Id = I_peak × (1 - (t - T_on) / T_off2)
t ≥ T_on + T_off2:           Id = 0
```

### Step 3: 两相交错叠加

```
Id1 = Phase1 的 Id 波形
Id2 = Phase2 的 Id 波形，向右平移 N/2 个采样点（180° 相移）
Id_total = Id1 + Id2
```

### Step 4: 电容纹波

```
Ic = Id_total - Iout                    // 电容电流
Vc = (∫Ic·dt) / Cout                    // 电容电压（积分后减去均值，只保留交流分量）
Vesr = Ic × ESR                         // ESR 压降
Vripple = Vc + Vesr                     // 总输出纹波
```

### Step 5: 纹波峰峰值

```
Vpp = max(Vripple) - min(Vripple)       // 总纹波峰峰值
Vc_pp = max(Vc) - min(Vc)              // 电容纹波峰峰值
Vesr_pp = max(Vesr) - min(Vesr)        // ESR 纹波峰峰值
```

## 输出结果

### 标量结果

| 输出 | 说明 | 单位 |
|------|------|------|
| D | 占空比 | - |
| Iin_total | 总输入电流 | A |
| IL1_avg | 相1平均电感电流 | A |
| IL2_avg | 相2平均电感电流 | A |
| Vpp | 总输出纹波峰峰值 | V |
| Vc_pp | 电容纹波峰峰值 | V |
| Vesr_pp | ESR纹波峰峰值 | V |
| ph1.mode / ph2.mode | 各相工作模式 (CCM/DCM) | - |
| ph1.Ipeak / ph2.Ipeak | 各相峰值电流 | A |
| ph1.Ivalley / ph2.Ivalley | 各相谷值电流 | A |
| ph1.Ton / ph2.Ton | 各相导通时间 | s |

### 波形数据（用于绘图）

每个数组长度 = N (2000)，时间单位 µs：

| 波形 | 说明 |
|------|------|
| t[] | 时间轴 (µs) |
| Id1[] | 相1 二极管电流 (A) |
| Id2[] | 相2 二极管电流 (A) |
| Id_total[] | 总二极管电流 (A) |
| Ic[] | 电容电流 (A) |
| Vc[] | 电容电压纹波 (V) |
| Vesr[] | ESR 压降 (V) |
| Vripple[] | 总输出纹波 (V) |

### 图表展示建议

原始代码展示了 5 个周期（NCYCLES=5）的波形，降采样步长=4：

1. **电流交错波形图**: Id1, Id2, Id_total vs 时间(µs)
2. **电压纹波分量图**: Vc(mV), Vesr(mV) vs 时间(µs)
3. **总纹波图**: Vripple(mV) vs 时间(µs) — 跨两列宽
