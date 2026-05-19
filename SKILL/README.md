# 小事清 - 微信小程序

记录工作中的琐事，保护自己的时间。

## 功能特性

- **快速记录**：支持语音和手动输入，快速记录工作中的琐事
- **标签系统**：预定义标签（#加活、#甩锅、#加班、#顾客无理、#代岗），支持自定义标签
- **证据管理**：支持添加照片和录音作为证据
- **统计分析**：时间小偷分析器，统计各标签耗时占比
- **维权证据包**：一键生成维权证据PDF
- **每日提醒**：定时推送今日记录统计

## 技术栈

- 微信小程序原生开发
- 微信云开发（云函数 + 云数据库 + 云存储）
- Node.js 12+

## 项目结构

```
SKILL/
├── miniprogram/          # 小程序前端代码
│   ├── pages/           # 页面
│   │   ├── index/       # 首页（记录）
│   │   ├── list/        # 清单
│   │   ├── detail/      # 详情
│   │   ├── analytics/   # 分析
│   │   ├── evidence/    # 证据箱
│   │   └── profile/     # 我的
│   ├── utils/           # 工具函数
│   ├── app.js           # 应用入口
│   ├── app.json         # 应用配置
│   └── app.wxss         # 全局样式
├── cloudfunctions/       # 云函数
│   ├── getOpenId/       # 获取openid
│   ├── speechToText/    # 语音识别
│   ├── generateEvidencePDF/  # 生成PDF
│   ├── updateReminder/  # 更新提醒
│   └── sendReminder/    # 发送提醒（定时触发器）
├── requirement.md       # 需求文档
├── spec.md              # 功能规范
├── api.md               # API文档
└── test.md              # 测试文档
```

## 安装运行

1. 使用微信开发者工具打开项目
2. 在开发者工具中创建云开发环境
3. 修改 `miniprogram/app.js` 中的 `env` 为实际环境ID
4. 右键 `cloudfunctions` 目录，选择"创建并部署：云端安装依赖"
5. 在数据库中创建以下集合：
   - tasks（小事记录）
   - settings（用户设置）
6. 编译运行

## 数据库集合说明

### tasks（小事记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| content | String | 内容 |
| minutes | Number | 耗时（分钟）|
| tags | Array | 标签数组 |
| status | Number | 状态（0待处理，1已完成）|
| images | Array | 图片fileID数组 |
| audio | String | 录音fileID |
| openid | String | 用户openid |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |
| isDeleted | Boolean | 是否已删除 |

### settings（用户设置）

| 字段 | 类型 | 说明 |
|------|------|------|
| openid | String | 用户openid |
| reminderTime | String | 提醒时间（HH:mm）|
| customTags | Array | 自定义标签 |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |

## 测试

按照 `test.md` 中的测试用例进行测试。

## 版本

v1.0.0
